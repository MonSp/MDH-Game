import { EventEmitter } from 'events';
import * as net from 'net';
import * as path from 'path';
import * as fs from 'fs';
import { ChildProcess, spawn } from 'child_process';
import { AgentKernelClient } from '@agent-kernel/AgentKernelClient';
import type { StreamEvent } from '@agent-kernel/types';

const DEFAULT_SOCKET = '/tmp/agent-kernel.sock';
const DEFAULT_EVENTS_SOCKET = '/tmp/agent-kernel.sock.events';
const DAEMON_BIN = path.resolve(__dirname, '..', '..', '..', 'agent-kernel', 'build', 'agent-kernel-daemon');

/**
 * KernelDaemonService — manages the C++ agent-kernel daemon lifecycle,
 * IPC client, and event stream subscription.
 *
 * Usage:
 *   const daemon = KernelDaemonService.getInstance();
 *   await daemon.start();
 *   daemon.client.sendMessage(from, to, payload);
 *   daemon.on('event', (event: StreamEvent) => { ... });
 *   daemon.stop();
 */
export class KernelDaemonService extends EventEmitter {
  private static instance: KernelDaemonService;

  private socketPath: string;
  private eventsSocketPath: string;
  private daemonProcess: ChildProcess | null = null;
  private eventSocket: net.Socket | null = null;
  private eventBuffer: string = '';

  private _client: AgentKernelClient | null = null;
  private _running: boolean = false;
  private _eventsConnected: boolean = false;

  private constructor(
    socketPath: string = DEFAULT_SOCKET,
    eventsSocketPath: string = DEFAULT_EVENTS_SOCKET,
  ) {
    super();
    this.socketPath = socketPath;
    this.eventsSocketPath = eventsSocketPath;
  }

  static getInstance(
    socketPath?: string,
    eventsSocketPath?: string,
  ): KernelDaemonService {
    if (!KernelDaemonService.instance) {
      KernelDaemonService.instance = new KernelDaemonService(
        socketPath ?? DEFAULT_SOCKET,
        eventsSocketPath ?? DEFAULT_EVENTS_SOCKET,
      );
    }
    return KernelDaemonService.instance;
  }

  /** Whether the daemon is running and the IPC client is connected. */
  get running(): boolean {
    return this._running;
  }

  /** Whether the event stream is connected. */
  get eventsConnected(): boolean {
    return this._eventsConnected;
  }

  /** The IPC client for sending requests to the daemon. */
  get client(): AgentKernelClient | null {
    return this._client;
  }

  /**
   * Start the daemon process and connect the IPC client + event stream.
   * If the daemon is already running (e.g., started externally), just connect.
   */
  async start(): Promise<void> {
    // Clean up stale sockets
    this.cleanStaleSocket(this.socketPath);
    this.cleanStaleSocket(this.eventsSocketPath);

    // Try to connect to existing daemon first
    const connected = await this.tryConnect();
    if (!connected) {
      // Start daemon process
      await this.spawnDaemon();
    }

    // Connect IPC client
    this._client = new AgentKernelClient(this.socketPath);
    await this._client.connect();
    this._running = true;
    console.log('[KernelDaemon] IPC client connected at', this.socketPath);

    // Connect event stream
    this.connectEventStream();
  }

  /**
   * Stop the daemon process and disconnect all connections.
   */
  stop(): void {
    this._running = false;
    this._eventsConnected = false;

    // Disconnect event stream
    if (this.eventSocket) {
      this.eventSocket.destroy();
      this.eventSocket = null;
    }

    // Disconnect IPC client
    if (this._client) {
      this._client.disconnect();
      this._client = null;
    }

    // Kill daemon process if we started it
    if (this.daemonProcess) {
      this.daemonProcess.kill('SIGTERM');
      this.daemonProcess = null;
    }
  }

  // ── Private ─────────────────────────────────────────────────

  private async spawnDaemon(): Promise<void> {
    if (!fs.existsSync(DAEMON_BIN)) {
      throw new Error(`Daemon binary not found at ${DAEMON_BIN}. Run: cd agent-kernel/build && cmake .. && make`);
    }

    this.daemonProcess = spawn(DAEMON_BIN, [
      '--socket', this.socketPath,
      '--events-socket', this.eventsSocketPath,
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        LD_LIBRARY_PATH: [
          path.resolve(__dirname, '..', '..', '..', 'miniconda3', 'lib'),
          process.env.LD_LIBRARY_PATH ?? '',
        ].join(':'),
      },
    });

    this.daemonProcess.stdout?.on('data', (data: Buffer) => {
      console.log('[KernelDaemon]', data.toString().trim());
    });

    this.daemonProcess.stderr?.on('data', (data: Buffer) => {
      console.error('[KernelDaemon:err]', data.toString().trim());
    });

    this.daemonProcess.on('exit', (code) => {
      console.log('[KernelDaemon] Process exited with code', code);
      this._running = false;
      this.daemonProcess = null;
    });

    // Wait for socket to appear
    await this.waitForSocket(this.socketPath, 5000);
    console.log('[KernelDaemon] Daemon started (PID', this.daemonProcess.pid, ')');
  }

  private async tryConnect(): Promise<boolean> {
    return new Promise((resolve) => {
      const sock = net.createConnection(this.socketPath);
      sock.on('connect', () => {
        sock.destroy();
        resolve(true);
      });
      sock.on('error', () => {
        resolve(false);
      });
      setTimeout(() => {
        sock.destroy();
        resolve(false);
      }, 1000);
    });
  }

  private connectEventStream(): void {
    try {
      this.eventSocket = net.createConnection(this.eventsSocketPath);

      this.eventSocket.on('connect', () => {
        this._eventsConnected = true;
        console.log('[KernelDaemon] Event stream connected at', this.eventsSocketPath);
      });

      this.eventSocket.on('data', (data: Buffer) => {
        this.eventBuffer += data.toString('utf-8');
        let newlineIdx: number;
        while ((newlineIdx = this.eventBuffer.indexOf('\n')) !== -1) {
          const line = this.eventBuffer.slice(0, newlineIdx).trim();
          this.eventBuffer = this.eventBuffer.slice(newlineIdx + 1);
          if (line) {
            try {
              const event: StreamEvent = JSON.parse(line);
              this.emit('event', event);
              // Also emit typed events
              if (event.type === 'journal_event') {
                this.emit('journal', event);
              } else if (event.type === 'message_received') {
                this.emit('message', event);
              }
            } catch (err) {
              console.warn('[KernelDaemon] Failed to parse event:', line, err);
            }
          }
        }
      });

      this.eventSocket.on('error', (err) => {
        console.warn('[KernelDaemon] Event stream error:', err.message);
        this._eventsConnected = false;
      });

      this.eventSocket.on('close', () => {
        this._eventsConnected = false;
        // Auto-reconnect if daemon is still running
        if (this._running) {
          setTimeout(() => {
            if (this._running) {
              console.log('[KernelDaemon] Reconnecting event stream...');
              this.connectEventStream();
            }
          }, 2000);
        }
      });
    } catch {
      // Event stream is optional — daemon works without it
      console.warn('[KernelDaemon] Event stream not available (daemon started without --events-socket?)');
    }
  }

  private waitForSocket(socketPath: string, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + timeoutMs;
      const check = () => {
        if (fs.existsSync(socketPath)) {
          const sock = net.createConnection(socketPath);
          sock.on('connect', () => {
            sock.destroy();
            resolve();
          });
          sock.on('error', () => {
            if (Date.now() > deadline) {
              reject(new Error(`Socket ${socketPath} did not appear within ${timeoutMs}ms`));
            } else {
              setTimeout(check, 200);
            }
          });
        } else if (Date.now() > deadline) {
          reject(new Error(`Socket ${socketPath} did not appear within ${timeoutMs}ms`));
        } else {
          setTimeout(check, 200);
        }
      };
      check();
    });
  }

  private cleanStaleSocket(socketPath: string): void {
    try {
      if (fs.existsSync(socketPath)) {
        fs.unlinkSync(socketPath);
      }
    } catch {
      // ignore
    }
  }
}
