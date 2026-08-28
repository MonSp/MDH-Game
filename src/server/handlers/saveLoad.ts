import type { Socket } from 'socket.io';
import type { SocketResult } from '../../shared/types/socket-events';
import * as fs from 'fs';
import * as path from 'path';

const SAVE_DIR = path.join(process.cwd(), 'data', 'saves');

function ensureSaveDir() {
  if (!fs.existsSync(SAVE_DIR)) {
    fs.mkdirSync(SAVE_DIR, { recursive: true });
  }
}

function savePath(playerId: string, slot: number): string {
  return path.join(SAVE_DIR, `${playerId}_${slot}.json`);
}

export interface SaveData {
  meta: {
    slot: number;
    version: string;
    timestamp: number;
    playerName: string;
    playerRealm: string;
    heavenLevel: number;
  };
  gameState: unknown;
}

export interface SaveSlotInfo {
  slot: number;
  meta: SaveData['meta'] | null;
}

function loadSlotMeta(playerId: string, slot: number): SaveSlotInfo {
  const p = savePath(playerId, slot);
  try {
    if (fs.existsSync(p)) {
      const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
      return { slot, meta: raw.meta ?? null };
    }
  } catch { /* ignore */ }
  return { slot, meta: null };
}

export function registerSaveLoadHandlers(
  socket: Socket,
  getPlayerId: () => string | undefined,
) {
  socket.on('save:list', () => {
    const pid = getPlayerId();
    if (!pid) { socket.emit('save:list:result', { success: false, error: '未登录' } satisfies SocketResult<SaveSlotInfo[]>); return; }

    ensureSaveDir();
    const slots: SaveSlotInfo[] = [];
    for (let i = 1; i <= 5; i++) {
      slots.push(loadSlotMeta(pid, i));
    }
    socket.emit('save:list:result', { success: true, data: slots } satisfies SocketResult<SaveSlotInfo[]>);
  });

  socket.on('save:save', (data: { slot: number; gameState: unknown; playerName: string; playerRealm: string; heavenLevel: number }) => {
    const pid = getPlayerId();
    if (!pid) { socket.emit('save:save:result', { success: false, error: '未登录' } satisfies SocketResult<{ slot: number }>); return; }

    ensureSaveDir();
    const saveData: SaveData = {
      meta: {
        slot: data.slot,
        version: '1.0.0',
        timestamp: Date.now(),
        playerName: data.playerName,
        playerRealm: data.playerRealm,
        heavenLevel: data.heavenLevel,
      },
      gameState: data.gameState,
    };

    try {
      fs.writeFileSync(savePath(pid, data.slot), JSON.stringify(saveData), 'utf-8');
      socket.emit('save:save:result', { success: true, data: { slot: data.slot } } satisfies SocketResult<{ slot: number }>);
    } catch (e) {
      socket.emit('save:save:result', { success: false, error: `存档失败: ${(e as Error).message}` } satisfies SocketResult<{ slot: number }>);
    }
  });

  socket.on('save:load', (data: { slot: number }) => {
    const pid = getPlayerId();
    if (!pid) { socket.emit('save:load:result', { success: false, error: '未登录' } satisfies SocketResult<SaveData>); return; }

    const p = savePath(pid, data.slot);
    try {
      if (!fs.existsSync(p)) {
        socket.emit('save:load:result', { success: false, error: '存档不存在' } satisfies SocketResult<SaveData>);
        return;
      }
      const saveData: SaveData = JSON.parse(fs.readFileSync(p, 'utf-8'));
      socket.emit('save:load:result', { success: true, data: saveData } satisfies SocketResult<SaveData>);
    } catch (e) {
      socket.emit('save:load:result', { success: false, error: `读档失败: ${(e as Error).message}` } satisfies SocketResult<SaveData>);
    }
  });

  socket.on('save:delete', (data: { slot: number }) => {
    const pid = getPlayerId();
    if (!pid) { socket.emit('save:delete:result', { success: false, error: '未登录' } satisfies SocketResult<null>); return; }

    const p = savePath(pid, data.slot);
    try {
      if (fs.existsSync(p)) fs.unlinkSync(p);
      socket.emit('save:delete:result', { success: true } satisfies SocketResult<null>);
    } catch (e) {
      socket.emit('save:delete:result', { success: false, error: `删除失败: ${(e as Error).message}` } satisfies SocketResult<null>);
    }
  });
}
