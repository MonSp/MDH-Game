import { io, Socket } from 'socket.io-client';

const SOCKET_RECONNECT_ATTEMPTS = 5;
const SOCKET_RECONNECT_DELAY_MS = 2000;
const SERVER_URL = 'http://localhost:3000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SERVER_URL, {
      reconnectionAttempts: SOCKET_RECONNECT_ATTEMPTS,
      reconnectionDelay: SOCKET_RECONNECT_DELAY_MS,
      transports: ['polling', 'websocket'],
    });
  }
  return socket;
}

export function connectSocketAsync(timeoutMs: number = 15000): Promise<Socket> {
  const s = getSocket();
  if (s.connected) return Promise.resolve(s);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      s.off('connect', onConnect);
      reject(new Error('socket connect timeout'));
    }, timeoutMs);
    const onConnect = () => {
      clearTimeout(timer);
      resolve(s);
    };
    s.once('connect', onConnect);
  });
}
