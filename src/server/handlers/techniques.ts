import type { Socket } from 'socket.io';
import type { SocketResult } from '../../shared/types/socket-events';
import { TECHNIQUES, getTechniqueById, computeTechniqueEffects, type TechniqueDef } from '../game/GameEngine';

export interface TechniqueStatusResponse {
  learned: Array<{ techniqueId: string; name: string; level: number; maxLevel: number; grade: string; type: string }>;
  effects: Record<string, number>;
  available: Array<{ techniqueId: string; name: string; grade: string; learnCost: number; requiredRealm: number }>;
}

export interface TechniqueLearnRequest {
  techniqueId: string;
}

export interface TechniqueLevelUpRequest {
  techniqueId: string;
}

export interface TechniqueLearnResponse {
  techniqueId: string;
  name: string;
  level: number;
  effects: Record<string, number>;
  spiritStonesSpent: number;
}

export interface TechniqueLevelUpResponse {
  techniqueId: string;
  name: string;
  newLevel: number;
  effects: Record<string, number>;
  spiritStonesSpent: number;
}

export function registerTechniqueHandlers(
  socket: Socket,
  getPlayerId: () => string | undefined,
  getPlayerData: (playerId: string) => { realm: string; spiritStones: number; learnedTechniques: Array<{ techniqueId: string; level: number }> } | null,
  updatePlayerData: (playerId: string, updates: { spiritStones?: number; learnedTechniques?: Array<{ techniqueId: string; level: number }> }) => void,
) {
  socket.on('technique:status', () => {
    const pid = getPlayerId();
    if (!pid) { socket.emit('technique:status:result', { success: false, error: '未登录' } satisfies SocketResult<TechniqueStatusResponse>); return; }

    const data = getPlayerData(pid);
    if (!data) { socket.emit('technique:status:result', { success: false, error: '玩家不存在' } satisfies SocketResult<TechniqueStatusResponse>); return; }

    const learned = data.learnedTechniques.map(l => {
      const def = getTechniqueById(l.techniqueId);
      return {
        techniqueId: l.techniqueId,
        name: def?.name ?? l.techniqueId,
        level: l.level,
        maxLevel: def?.maxLevel ?? 5,
        grade: def?.grade ?? '凡品',
        type: def?.type ?? 'passive',
      };
    });

    const effects = computeTechniqueEffects(data.learnedTechniques);

    const realmIdx = ['凡人', '练气', '筑基', '金丹', '元婴', '化神', '炼虚', '合体', '大乘', '渡劫'].indexOf(data.realm);
    const available = TECHNIQUES
      .filter(t => t.requiredRealm <= realmIdx + 1 && !data.learnedTechniques.some(l => l.techniqueId === t.id))
      .map(t => ({ techniqueId: t.id, name: t.name, grade: t.grade, learnCost: t.learnCost, requiredRealm: t.requiredRealm }));

    socket.emit('technique:status:result', {
      success: true,
      data: { learned, effects, available },
    } satisfies SocketResult<TechniqueStatusResponse>);
  });

  socket.on('technique:learn', (req: TechniqueLearnRequest) => {
    const pid = getPlayerId();
    if (!pid) { socket.emit('technique:learn:result', { success: false, error: '未登录' } satisfies SocketResult<TechniqueLearnResponse>); return; }

    const data = getPlayerData(pid);
    if (!data) { socket.emit('technique:learn:result', { success: false, error: '玩家不存在' } satisfies SocketResult<TechniqueLearnResponse>); return; }

    const def = getTechniqueById(req.techniqueId);
    if (!def) { socket.emit('technique:learn:result', { success: false, error: '心法不存在' } satisfies SocketResult<TechniqueLearnResponse>); return; }

    if (data.learnedTechniques.some(l => l.techniqueId === req.techniqueId)) {
      socket.emit('technique:learn:result', { success: false, error: '已学会该心法' } satisfies SocketResult<TechniqueLearnResponse>);
      return;
    }

    if (data.spiritStones < def.learnCost) {
      socket.emit('technique:learn:result', { success: false, error: `灵石不足，需要 ${def.learnCost}` } satisfies SocketResult<TechniqueLearnResponse>);
      return;
    }

    const newLearned = [...data.learnedTechniques, { techniqueId: req.techniqueId, level: 1 }];
    updatePlayerData(pid, {
      spiritStones: data.spiritStones - def.learnCost,
      learnedTechniques: newLearned,
    });

    const effects = computeTechniqueEffects(newLearned);

    socket.emit('technique:learn:result', {
      success: true,
      data: {
        techniqueId: req.techniqueId,
        name: def.name,
        level: 1,
        effects,
        spiritStonesSpent: def.learnCost,
      },
    } satisfies SocketResult<TechniqueLearnResponse>);
  });

  socket.on('technique:levelup', (req: TechniqueLevelUpRequest) => {
    const pid = getPlayerId();
    if (!pid) { socket.emit('technique:levelup:result', { success: false, error: '未登录' } satisfies SocketResult<TechniqueLevelUpResponse>); return; }

    const data = getPlayerData(pid);
    if (!data) { socket.emit('technique:levelup:result', { success: false, error: '玩家不存在' } satisfies SocketResult<TechniqueLevelUpResponse>); return; }

    const def = getTechniqueById(req.techniqueId);
    if (!def) { socket.emit('technique:levelup:result', { success: false, error: '心法不存在' } satisfies SocketResult<TechniqueLevelUpResponse>); return; }

    const idx = data.learnedTechniques.findIndex(l => l.techniqueId === req.techniqueId);
    if (idx === -1) { socket.emit('technique:levelup:result', { success: false, error: '未学会该心法' } satisfies SocketResult<TechniqueLevelUpResponse>); return; }

    const current = data.learnedTechniques[idx];
    if (current.level >= def.maxLevel) { socket.emit('technique:levelup:result', { success: false, error: '已达最高等级' } satisfies SocketResult<TechniqueLevelUpResponse>); return; }

    const cost = def.levelUpCost * current.level;
    if (data.spiritStones < cost) {
      socket.emit('technique:levelup:result', { success: false, error: `灵石不足，需要 ${cost}` } satisfies SocketResult<TechniqueLevelUpResponse>);
      return;
    }

    const newLearned = [...data.learnedTechniques];
    newLearned[idx] = { ...current, level: current.level + 1 };
    updatePlayerData(pid, {
      spiritStones: data.spiritStones - cost,
      learnedTechniques: newLearned,
    });

    const effects = computeTechniqueEffects(newLearned);

    socket.emit('technique:levelup:result', {
      success: true,
      data: {
        techniqueId: req.techniqueId,
        name: def.name,
        newLevel: current.level + 1,
        effects,
        spiritStonesSpent: cost,
      },
    } satisfies SocketResult<TechniqueLevelUpResponse>);
  });
}
