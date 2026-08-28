import type { Socket } from 'socket.io';
import { PlayerService } from '../services';
import { NPCWorldService } from '../services/NPCWorldService';
import { calculateDamage, MONSTER_MATERIAL_DROPS, rollDrops } from '../game/GameEngine';
import type {
  CombatAttackRequest, CombatSkillRequest,
  SocketResult, CombatAttackResponse, CombatSkillResponse, CombatEvent
} from '../../shared/types/socket-events';

export function registerCombatHandlers(
  socket: Socket,
  getPlayerId: () => string | undefined,
  broadcastCombatEvent: (event: CombatEvent) => void
) {
  const playerService = PlayerService.getInstance();
  const npcWorld = NPCWorldService.getInstance();

  socket.on('combat:attack', (req: CombatAttackRequest) => {
    const pid = getPlayerId();
    if (!pid) { socket.emit('combat:attack:result', { success: false, error: '未登录' } satisfies SocketResult<CombatAttackResponse>); return; }

    const player = playerService.getPlayer(pid);
    if (!player) { socket.emit('combat:attack:result', { success: false, error: '玩家不存在' } satisfies SocketResult<CombatAttackResponse>); return; }

    if (req.targetKind === 'npc') {
      const npcState = npcWorld.getNPC(req.targetId);
      if (!npcState) { socket.emit('combat:attack:result', { success: false, error: '目标NPC不存在' } satisfies SocketResult<CombatAttackResponse>); return; }

      const npc = npcState.npc;
      const npcDefense = Math.floor(npc.power / 2);
      const damage = calculateDamage(player.attack, npcDefense);
      npc.hp = Math.max(0, npc.hp - damage);
      const killed = npc.hp <= 0;

      const loot: Array<{ itemId: string; name: string; count: number }> = [];
      if (killed) {
        const stoneDrop = Math.floor(Math.random() * 20 + 5);
        loot.push({ itemId: 'spirit_stone', name: '灵石', count: stoneDrop });
        player.addSpiritStones(stoneDrop);
        // Material drops from NPC kills
        const matDrops = rollDrops(MONSTER_MATERIAL_DROPS);
        loot.push(...matDrops);
      }

      const expGained = killed ? Math.floor(Math.random() * 10 + 5) : Math.floor(damage * 0.1);
      player.addCultivation(expGained);

      broadcastCombatEvent({
        type: 'player_attack',
        attackerId: pid,
        defenderId: req.targetId,
        damage,
        timestamp: Date.now()
      });

      socket.emit('combat:attack:result', {
        success: true,
        data: {
          damage,
          targetHp: npc.hp,
          targetMaxHp: npc.maxHp || 100,
          killed,
          playerHp: player.health,
          loot,
          expGained
        }
      } satisfies SocketResult<CombatAttackResponse>);

      if (killed) {
        broadcastCombatEvent({
          type: 'death',
          attackerId: pid,
          defenderId: req.targetId,
          damage: 0,
          timestamp: Date.now()
        });
      }
    } else if (req.targetKind === 'monster') {
      const { damageMonster } = require('../game/ServerGameLoop');
      const monster = damageMonster(req.targetId, player.attack);
      if (!monster) {
        socket.emit('combat:attack:result', { success: false, error: '怪物不存在' } satisfies SocketResult<CombatAttackResponse>);
        return;
      }

      const damage = calculateDamage(player.attack, monster.template.defense);
      const killed = monster.hp <= 0;

      const loot: Array<{ itemId: string; name: string; count: number }> = [];
      let expGained = 0;
      if (killed) {
        loot.push({ itemId: 'spirit_stone', name: '灵石', count: monster.template.spiritStoneDrop });
        player.addSpiritStones(monster.template.spiritStoneDrop);
        expGained = monster.template.expReward;
        player.addCultivation(expGained);
        const matDrops = rollDrops(MONSTER_MATERIAL_DROPS);
        loot.push(...matDrops);
      }

      broadcastCombatEvent({ type: 'player_attack', attackerId: pid, defenderId: req.targetId, damage, timestamp: Date.now() });
      if (killed) broadcastCombatEvent({ type: 'death', attackerId: pid, defenderId: req.targetId, damage: 0, timestamp: Date.now() });

      socket.emit('combat:attack:result', {
        success: true,
        data: { damage, targetHp: monster.hp, targetMaxHp: monster.maxHp, killed, playerHp: player.health, loot, expGained },
      } satisfies SocketResult<CombatAttackResponse>);
    } else {
      socket.emit('combat:attack:result', { success: false, error: '暂不支持该目标类型' } satisfies SocketResult<CombatAttackResponse>);
    }
  });

  socket.on('combat:skill', (req: CombatSkillRequest) => {
    const pid = getPlayerId();
    if (!pid) { socket.emit('combat:skill:result', { success: false, error: '未登录' } satisfies SocketResult<CombatSkillResponse>); return; }

    const player = playerService.getPlayer(pid);
    if (!player) { socket.emit('combat:skill:result', { success: false, error: '玩家不存在' } satisfies SocketResult<CombatSkillResponse>); return; }

    // Basic skill: 1.5x damage multiplier, costs 10 spirit
    const spiritCost = 10;
    if (player.spirit < spiritCost) {
      socket.emit('combat:skill:result', { success: false, error: '灵力不足' } satisfies SocketResult<CombatSkillResponse>);
      return;
    }

    const npcState = npcWorld.getNPC(req.targetId);
    if (!npcState) { socket.emit('combat:skill:result', { success: false, error: '目标不存在' } satisfies SocketResult<CombatSkillResponse>); return; }

    const npc = npcState.npc;
    const npcDefense = Math.floor(npc.power / 2);
    const baseDmg = calculateDamage(player.attack, npcDefense);
    const damage = Math.floor(baseDmg * 1.5);
    npc.hp = Math.max(0, npc.hp - damage);
    const killed = npc.hp <= 0;

    const loot = killed ? [{ itemId: 'spirit_stone', name: '灵石', count: Math.floor(Math.random() * 30 + 10) }] : undefined;
    if (loot) player.addSpiritStones(loot[0].count);

    broadcastCombatEvent({
      type: 'player_attack',
      attackerId: pid,
      defenderId: req.targetId,
      damage,
      timestamp: Date.now()
    });

    socket.emit('combat:skill:result', {
      success: true,
      data: {
        damage,
        targetHp: npc.hp,
        killed,
        spiritCost,
        loot
      }
    } satisfies SocketResult<CombatSkillResponse>);
  });
}
