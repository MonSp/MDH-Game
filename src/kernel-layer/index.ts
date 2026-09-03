/**
 * kernel-layer — game integration layer on top of agent-kernel.
 *
 * Provides KernelDaemonService (daemon lifecycle + IPC client + event stream)
 * and helper types for bridging kernel events to the game world.
 */
export { KernelDaemonService } from './KernelDaemonService';
export type { StreamEvent } from '@agent-kernel/types';
