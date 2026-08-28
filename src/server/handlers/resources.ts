import type { Socket } from 'socket.io';
import type { SocketResult } from '../../shared/types/socket-events';
import { RESOURCE_DROPS, rollDrops } from '../game/GameEngine';

export interface ResourceGatherRequest {
  resourceType: '灵田' | '矿脉' | '遗迹';
}

export interface ResourceGatherResponse {
  resourceType: string;
  spiritStonesGained: number;
  expGained: number;
  materials: Array<{ itemId: string; name: string; count: number }>;
}

export function registerResourceHandlers(
  socket: Socket,
  getPlayerId: () => string | undefined,
  addSpiritStones: (playerId: string, amount: number) => void,
  addCultivation: (playerId: string, amount: number) => void,
) {
  socket.on('resource:gather', (req: ResourceGatherRequest) => {
    const pid = getPlayerId();
    if (!pid) {
      socket.emit('resource:gather:result', { success: false, error: '未登录' } satisfies SocketResult<ResourceGatherResponse>);
      return;
    }

    const drops = RESOURCE_DROPS[req.resourceType];
    if (!drops) {
      socket.emit('resource:gather:result', { success: false, error: '未知资源类型' } satisfies SocketResult<ResourceGatherResponse>);
      return;
    }

    const materials = rollDrops(drops);

    let spiritStonesGained = 0;
    let expGained = 0;

    if (req.resourceType === '灵田') {
      expGained = 30;
      addCultivation(pid, expGained);
    } else if (req.resourceType === '矿脉') {
      spiritStonesGained = 50;
      addSpiritStones(pid, spiritStonesGained);
    } else if (req.resourceType === '遗迹') {
      spiritStonesGained = 100;
      addSpiritStones(pid, spiritStonesGained);
    }

    socket.emit('resource:gather:result', {
      success: true,
      data: { resourceType: req.resourceType, spiritStonesGained, expGained, materials },
    } satisfies SocketResult<ResourceGatherResponse>);
  });
}
