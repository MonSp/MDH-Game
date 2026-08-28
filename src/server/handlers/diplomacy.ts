import type { Socket } from 'socket.io';
import type {
  DiplomacyWarRequest, DiplomacyAllianceRequest, DiplomacyTruceRequest,
  DiplomacySurrenderRequest, DiplomacyBreakRequest,
  SocketResult, DiplomacyWarResponse, DiplomacyAllianceResponse,
  DiplomacyStatusResponse, DiplomacyRelationship, DiplomaticStatus
} from '../../shared/types/socket-events';
import { PlayerService } from '../services';

// Server-side faction relationship store
const factionRelationships = new Map<string, DiplomacyRelationship>();

function getRelKey(a: string, b: string) {
  return [a, b].sort().join(':');
}

function getOrCreateRel(a: string, b: string): DiplomacyRelationship {
  const key = getRelKey(a, b);
  if (!factionRelationships.has(key)) {
    factionRelationships.set(key, {
      clanA: a,
      clanB: b,
      status: 'neutral',
      hostility: 0
    });
  }
  return factionRelationships.get(key)!;
}

function getPlayerClan(getPlayerId: () => string | undefined): string | null {
  const pid = getPlayerId();
  if (!pid) return null;
  const player = PlayerService.getInstance().getPlayer(pid);
  return player?.familyId || null;
}

function getAllRelationships(clanId: string): DiplomacyRelationship[] {
  const rels: DiplomacyRelationship[] = [];
  for (const rel of factionRelationships.values()) {
    if (rel.clanA === clanId || rel.clanB === clanId) {
      rels.push(rel);
    }
  }
  return rels;
}

export function registerDiplomacyHandlers(socket: Socket, getPlayerId: () => string | undefined) {
  socket.on('diplomacy:declare-war', (req: DiplomacyWarRequest) => {
    const clanId = getPlayerClan(getPlayerId);
    if (!clanId) { socket.emit('diplomacy:declare-war:result', { success: false, error: '未登录' } satisfies SocketResult<DiplomacyWarResponse>); return; }
    if (clanId === req.targetClanId) { socket.emit('diplomacy:declare-war:result', { success: false, error: '不能对自己宣战' } satisfies SocketResult<DiplomacyWarResponse>); return; }

    const rel = getOrCreateRel(clanId, req.targetClanId);
    if (rel.status === 'war') {
      socket.emit('diplomacy:declare-war:result', { success: false, error: '已经处于战争状态' } satisfies SocketResult<DiplomacyWarResponse>);
      return;
    }

    rel.status = 'war';
    rel.hostility = 100;
    rel.lastAction = 'declare_war';
    rel.lastActionTime = Date.now();

    socket.emit('diplomacy:declare-war:result', {
      success: true,
      data: {
        relationships: getAllRelationships(clanId),
        warTarget: req.targetClanId
      }
    } satisfies SocketResult<DiplomacyWarResponse>);
  });

  socket.on('diplomacy:propose-alliance', (req: DiplomacyAllianceRequest) => {
    const clanId = getPlayerClan(getPlayerId);
    if (!clanId) { socket.emit('diplomacy:propose-alliance:result', { success: false, error: '未登录' } satisfies SocketResult<DiplomacyAllianceResponse>); return; }

    const rel = getOrCreateRel(clanId, req.targetClanId);
    if (rel.status === 'war') {
      socket.emit('diplomacy:propose-alliance:result', { success: false, error: '战争中无法结盟' } satisfies SocketResult<DiplomacyAllianceResponse>);
      return;
    }

    rel.status = 'allied';
    rel.hostility = Math.max(0, rel.hostility - 50);
    rel.lastAction = 'alliance';
    rel.lastActionTime = Date.now();

    socket.emit('diplomacy:propose-alliance:result', {
      success: true,
      data: {
        relationships: getAllRelationships(clanId),
        alliedWith: req.targetClanId
      }
    } satisfies SocketResult<DiplomacyAllianceResponse>);
  });

  socket.on('diplomacy:propose-truce', (req: DiplomacyTruceRequest) => {
    const clanId = getPlayerClan(getPlayerId);
    if (!clanId) { socket.emit('diplomacy:propose-truce:result', { success: false, error: '未登录' } satisfies SocketResult<DiplomacyStatusResponse>); return; }

    const rel = getOrCreateRel(clanId, req.targetClanId);
    if (rel.status !== 'war') {
      socket.emit('diplomacy:propose-truce:result', { success: false, error: '未处于战争状态' } satisfies SocketResult<DiplomacyStatusResponse>);
      return;
    }

    rel.status = 'truce';
    rel.hostility = Math.max(0, rel.hostility - 30);
    rel.lastAction = 'truce';
    rel.lastActionTime = Date.now();

    socket.emit('diplomacy:propose-truce:result', {
      success: true,
      data: { relationships: getAllRelationships(clanId), currentClan: clanId }
    } satisfies SocketResult<DiplomacyStatusResponse>);
  });

  socket.on('diplomacy:surrender', (req: DiplomacySurrenderRequest) => {
    const clanId = getPlayerClan(getPlayerId);
    if (!clanId) { socket.emit('diplomacy:surrender:result', { success: false, error: '未登录' } satisfies SocketResult<DiplomacyStatusResponse>); return; }

    const rel = getOrCreateRel(clanId, req.targetClanId);
    if (rel.status !== 'war') {
      socket.emit('diplomacy:surrender:result', { success: false, error: '未处于战争状态' } satisfies SocketResult<DiplomacyStatusResponse>);
      return;
    }

    rel.status = 'neutral';
    rel.hostility = Math.max(0, rel.hostility - 60);
    rel.lastAction = 'surrender';
    rel.lastActionTime = Date.now();

    socket.emit('diplomacy:surrender:result', {
      success: true,
      data: { relationships: getAllRelationships(clanId), currentClan: clanId }
    } satisfies SocketResult<DiplomacyStatusResponse>);
  });

  socket.on('diplomacy:break-alliance', (req: DiplomacyBreakRequest) => {
    const clanId = getPlayerClan(getPlayerId);
    if (!clanId) { socket.emit('diplomacy:break-alliance:result', { success: false, error: '未登录' } satisfies SocketResult<DiplomacyStatusResponse>); return; }

    const rel = getOrCreateRel(clanId, req.targetClanId);
    if (rel.status !== 'allied') {
      socket.emit('diplomacy:break-alliance:result', { success: false, error: '未处于同盟状态' } satisfies SocketResult<DiplomacyStatusResponse>);
      return;
    }

    rel.status = 'neutral';
    rel.hostility += 20;
    rel.lastAction = 'break_alliance';
    rel.lastActionTime = Date.now();

    socket.emit('diplomacy:break-alliance:result', {
      success: true,
      data: { relationships: getAllRelationships(clanId), currentClan: clanId }
    } satisfies SocketResult<DiplomacyStatusResponse>);
  });

  socket.on('diplomacy:status', () => {
    const clanId = getPlayerClan(getPlayerId);
    if (!clanId) { socket.emit('diplomacy:status:result', { success: false, error: '未登录' } satisfies SocketResult<DiplomacyStatusResponse>); return; }

    socket.emit('diplomacy:status:result', {
      success: true,
      data: {
        relationships: getAllRelationships(clanId),
        currentClan: clanId
      }
    } satisfies SocketResult<DiplomacyStatusResponse>);
  });
}
