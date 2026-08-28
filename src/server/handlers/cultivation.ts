import type { Socket } from 'socket.io';
import { CultivationService, PlayerService } from '../services';
import type {
  SocketResult, CultivationCultivateResponse,
  CultivationBreakthroughResponse, CultivationStatusResponse
} from '../../shared/types/socket-events';

const CULTIVATE_BASE_EXP = 10;

export function registerCultivationHandlers(socket: Socket, getPlayerId: () => string | undefined) {
  const cultivation = CultivationService.getInstance();
  const playerService = PlayerService.getInstance();

  socket.on('cultivation:cultivate', () => {
    const pid = getPlayerId();
    if (!pid) { socket.emit('cultivation:cultivate:result', { success: false, error: '未登录' } satisfies SocketResult<CultivationCultivateResponse>); return; }

    const player = playerService.getPlayer(pid);
    if (!player) { socket.emit('cultivation:cultivate:result', { success: false, error: '玩家不存在' } satisfies SocketResult<CultivationCultivateResponse>); return; }

    const realmConfig = cultivation.getRealmConfig(player.realm);
    const bonus = cultivation.applyRealmBonus(player.realm);
    const expGained = Math.floor(CULTIVATE_BASE_EXP * bonus.spiritMultiplier);

    player.addCultivation(expGained);

    socket.emit('cultivation:cultivate:result', {
      success: true,
      data: {
        cultivation: player.cultivation,
        maxCultivation: realmConfig.requiredCultivation,
        realm: player.realm,
        spiritStones: player.spiritStones,
        expGained
      }
    } satisfies SocketResult<CultivationCultivateResponse>);
  });

  socket.on('cultivation:breakthrough', () => {
    const pid = getPlayerId();
    if (!pid) { socket.emit('cultivation:breakthrough:result', { success: false, error: '未登录' } satisfies SocketResult<CultivationBreakthroughResponse>); return; }

    const player = playerService.getPlayer(pid);
    if (!player) { socket.emit('cultivation:breakthrough:result', { success: false, error: '玩家不存在' } satisfies SocketResult<CultivationBreakthroughResponse>); return; }

    const result = cultivation.attemptBreakthrough(player.realm, player.cultivation, player.spiritStones);

    if (result.success && result.newRealm) {
      player.realm = result.newRealm;
      player.cultivation = 0;
      const bonus = cultivation.applyRealmBonus(result.newRealm);
      player.maxHealth = Math.floor(player.maxHealth * bonus.healthMultiplier);
      player.health = player.maxHealth;
      player.maxSpirit = Math.floor(player.maxSpirit * bonus.spiritMultiplier);
      player.spirit = player.maxSpirit;
      player.attack = Math.floor(player.attack * bonus.powerMultiplier);
      player.defense = Math.floor(player.defense * bonus.powerMultiplier);

      const realmConfig = cultivation.getRealmConfig(result.newRealm);

      socket.emit('cultivation:breakthrough:result', {
        success: true,
        data: {
          success: true,
          newRealm: result.newRealm,
          newRealmName: realmConfig.name,
          stats: {
            maxHealth: player.maxHealth,
            maxSpirit: player.maxSpirit,
            attack: player.attack,
            defense: player.defense
          }
        }
      } satisfies SocketResult<CultivationBreakthroughResponse>);
    } else {
      socket.emit('cultivation:breakthrough:result', {
        success: true,
        data: {
          success: false,
          reason: result.reason
        }
      } satisfies SocketResult<CultivationBreakthroughResponse>);
    }
  });

  socket.on('cultivation:status', () => {
    const pid = getPlayerId();
    if (!pid) { socket.emit('cultivation:status:result', { success: false, error: '未登录' } satisfies SocketResult<CultivationStatusResponse>); return; }

    const player = playerService.getPlayer(pid);
    if (!player) { socket.emit('cultivation:status:result', { success: false, error: '玩家不存在' } satisfies SocketResult<CultivationStatusResponse>); return; }

    const realmConfig = cultivation.getRealmConfig(player.realm);

    socket.emit('cultivation:status:result', {
      success: true,
      data: {
        realm: player.realm,
        realmName: realmConfig.name,
        cultivation: player.cultivation,
        maxCultivation: realmConfig.requiredCultivation,
        spiritStones: player.spiritStones,
        stats: {
          health: player.health,
          maxHealth: player.maxHealth,
          spirit: player.spirit,
          maxSpirit: player.maxSpirit,
          attack: player.attack,
          defense: player.defense
        }
      }
    } satisfies SocketResult<CultivationStatusResponse>);
  });
}
