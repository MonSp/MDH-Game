import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

import {
  PlayerService,
  CountryService,
  FamilyService,
  CultivationService,
  ResourceManager,
  EconomyService,
  ItemService
} from './services';
import { NPCWorldService } from './services/NPCWorldService';
import { LLMIntegrationManager } from './game/services/LLMIntegrationManager';
import { LLMHttpClient, DialogueRequestContext } from './llm/LLMHttpClient';
import { buildDialogueSystemPrompt, buildDialogueUserPrompt } from './llm/DialoguePrompts';
import { buildFactionSystemPrompt, buildFactionUserPrompt, FactionDecision } from './llm/FactionAIPrompts';
import { parseFactionDecision } from './llm/FactionDecisionParser';

import { PlayerState, Country, CultivationRealm, GAME_CONFIG, NPCEvent, EventBus } from '../shared';

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(express.json());

// Rate limiting for dialogue requests
const dialogueRateMap = new Map<string, number>();
const factionRateMap = new Map<string, number>();
const DIALOGUE_RATE_LIMIT_MS = 10000;
const FACTION_AI_RATE_LIMIT_MS = 10000;

// Sanitize user-provided scene context to prevent prompt injection
function sanitizeSceneContext(input: string | undefined): string | undefined {
  if (typeof input !== 'string') return undefined;
  if (!input) return undefined;
  return input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // strip control chars
    .replace(/[<>]/g, '') // strip angle brackets
    .slice(0, MAX_SCENE_CONTEXT_LENGTH); // length limit
}

const MAX_SCENE_CONTEXT_LENGTH = 200;
const MAX_MEMORY_SUMMARY_LENGTH = 60;
const DIALOGUE_IMPACT_SCORE = 2;

// Validate NPC ID format: alphanumeric + underscore, 1-64 chars
function isValidNpcId(id: string): boolean {
  return /^[a-zA-Z0-9_]{1,64}$/.test(id);
}

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: '修仙世界运行中...' });
});

// ============================================================
// NPC API
// ============================================================
app.get('/api/npcs', (req, res) => {
  const npcWorld = NPCWorldService.getInstance();
  res.json(npcWorld.getNPCList());
});

app.post('/api/recruit', (req, res) => {
  const { candidate } = req.body;
  if (!candidate) {
    return res.status(400).json({ error: 'Missing candidate' });
  }
  const npcWorld = NPCWorldService.getInstance();
  const ok = npcWorld.recruit(candidate);
  if (!ok) return res.status(400).json({ error: 'Invalid candidate' });
  res.json({ ok: true, npcs: npcWorld.getNPCList() });
});

app.get('/api/recruit/candidates', (req, res) => {
  const npcWorld = NPCWorldService.getInstance();
  res.json(npcWorld.getCandidates());
});

app.post('/api/assign', (req, res) => {
  const { npcId, task } = req.body;
  if (!npcId || !task) return res.status(400).json({ error: 'Missing npcId or task' });
  const npcWorld = NPCWorldService.getInstance();
  if (!npcWorld.assignTask(npcId, task)) {
    return res.status(404).json({ error: 'NPC not found' });
  }
  res.json({ ok: true });
});

app.post('/api/promote', (req, res) => {
  const { npcId, action } = req.body;
  if (!npcId || !['promote', 'demote'].includes(action)) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  const npcWorld = NPCWorldService.getInstance();
  if (!npcWorld.promote(npcId, action)) {
    return res.status(404).json({ error: 'NPC not found' });
  }
  res.json({ ok: true });
});

app.post('/api/ceremony', (req, res) => {
  const { type } = req.body;
  if (!type) return res.status(400).json({ error: 'Missing type' });
  const npcWorld = NPCWorldService.getInstance();
  npcWorld.ceremony(type);
  res.json({ ok: true });
});

interface PlayerSocket {
  id: string;
  playerId: string;
  socket: any;
}

const playerSockets: Map<string, PlayerSocket> = new Map();

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('player:create', async (data: { name: string }) => {
    try {
      const playerId = uuidv4();
      const player = PlayerService.getInstance().createPlayer(playerId, data.name);
      
      const playerSocket: PlayerSocket = {
        id: socket.id,
        playerId: player.id,
        socket: socket
      };
      playerSockets.set(socket.id, playerSocket);

      const countryConfig = CountryService.getInstance().getCountryConfig(player.country);
      const familyConfig = FamilyService.getInstance().getFamilyConfig(player.familyId);
      const realmConfig = CultivationService.getInstance().getRealmConfig(player.realm);

      socket.emit('player:created', {
        id: player.id,
        name: player.name,
        country: {
          id: player.country,
          name: countryConfig.name,
          trait: countryConfig.trait
        },
        family: {
          id: player.familyId,
          name: familyConfig?.name
        },
        realm: {
          id: player.realm,
          name: realmConfig.name,
          requiredCultivation: realmConfig.requiredCultivation
        },
        cultivation: player.cultivation,
        attributes: {
          health: player.health,
          maxHealth: player.maxHealth,
          spirit: player.spirit,
          maxSpirit: player.maxSpirit,
          attack: player.attack,
          defense: player.defense,
          moveSpeed: player.baseMoveSpeed
        },
        position: player.position,
        spiritStones: player.spiritStones
      });

      console.log(`Player created: ${player.name} (${player.id})`);
    } catch (error) {
      console.error('Error creating player:', error);
      socket.emit('error', { message: '创建角色失败' });
    }
  });

  socket.on('player:login', async (data: { playerId: string }) => {
    try {
      const player = PlayerService.getInstance().getPlayer(data.playerId);
      if (!player) {
        socket.emit('error', { message: '玩家不存在' });
        return;
      }

      const playerSocket: PlayerSocket = {
        id: socket.id,
        playerId: player.id,
        socket: socket
      };
      playerSockets.set(socket.id, playerSocket);

      socket.emit('player:logged_in', {
        id: player.id,
        name: player.name,
        realm: player.realm,
        cultivation: player.cultivation,
        attributes: {
          health: player.health,
          maxHealth: player.maxHealth,
          spirit: player.spirit,
          maxSpirit: player.maxSpirit,
          attack: player.attack,
          defense: player.defense
        },
        position: player.position,
        state: player.state,
        spiritStones: player.spiritStones
      });
    } catch (error) {
      console.error('Error logging in player:', error);
      socket.emit('error', { message: '登录失败' });
    }
  });

  socket.on('player:input', (data: { command: string; x?: number; y?: number; targetId?: string }) => {
    const playerSocket = playerSockets.get(socket.id);
    if (!playerSocket) return;

    const player = PlayerService.getInstance().getPlayer(playerSocket.playerId);
    if (!player) return;

    switch (data.command) {
      case 'move':
        if (data.x !== undefined && data.y !== undefined) {
          player.moveTo(data.x, data.y);
        }
        break;
      case 'sit':
        player.sit();
        break;
      case 'stand':
        player.stand();
        break;
      case 'attack':
        break;
    }
  });

  socket.on('resource:collect', (data: { resourceId: string }) => {
    const playerSocket = playerSockets.get(socket.id);
    if (!playerSocket) return;

    const player = PlayerService.getInstance().getPlayer(playerSocket.playerId);
    if (!player) return;

    const result = ResourceManager.getInstance().collectResource(
      player.id,
      data.resourceId,
      (amount) => player.addCultivation(amount),
      (amount) => player.addSpiritStones(amount),
      (itemId) => ItemService.getInstance().addItem(player.id, itemId)
    );

    socket.emit('resource:collected', result);
  });

  socket.on('cultivation:breakthrough', () => {
    const playerSocket = playerSockets.get(socket.id);
    if (!playerSocket) return;

    const player = PlayerService.getInstance().getPlayer(playerSocket.playerId);
    if (!player) return;

    const result = CultivationService.getInstance().attemptBreakthrough(
      player.realm,
      player.cultivation,
      player.spiritStones
    );

    if (result.success) {
      player.attemptBreakthrough();
    }

    socket.emit('cultivation:breakthrough_result', result);
  });

  socket.on('country:info', () => {
    const countries = CountryService.getInstance().getAllCountries();
    const countryData = countries.map(c => {
      const config = CountryService.getInstance().getCountryConfig(c);
      return {
        id: c,
        name: config.name,
        culture: config.culture,
        trait: config.trait,
        capitalPosition: config.capitalPosition
      };
    });
    socket.emit('country:info_result', { countries: countryData });
  });

  socket.on('items:list', () => {
    const playerSocket = playerSockets.get(socket.id);
    if (!playerSocket) return;

    const items = ItemService.getInstance().getPlayerItems(playerSocket.playerId);
    socket.emit('items:list_result', { items });
  });

  socket.on('scene:npc-dialogue', async (data: { npcId: string; sceneContext?: string }) => {
    // Auth guard: reject unauthenticated sockets
    const playerSocket = playerSockets.get(socket.id);
    if (!playerSocket) return;

    // Validate npcId format
    if (!isValidNpcId(data.npcId)) {
      socket.emit('scene:npc-response', {
        npcId: data.npcId,
        name: '未知',
        role: '',
        text: '……你找我有何事？',
        emotion: '平静',
      });
      return;
    }

    // Rate limiting: 1 request per 10s per socket
    const lastRequest = dialogueRateMap.get(socket.id);
    if (lastRequest && Date.now() - lastRequest < DIALOGUE_RATE_LIMIT_MS) {
      socket.emit('scene:npc-response', {
        npcId: data.npcId,
        name: '系统',
        role: '',
        text: '……你过于急切了，稍等片刻再说吧。',
        emotion: '平静',
      });
      return;
    }
    dialogueRateMap.set(socket.id, Date.now());

    // Sanitize scene context to prevent prompt injection
    const safeSceneContext = sanitizeSceneContext(data.sceneContext);

    const npcWorld = NPCWorldService.getInstance();
    const npc = npcWorld.getNPC(data.npcId);
    if (!npc) {
      socket.emit('scene:npc-response', {
        npcId: data.npcId,
        name: '未知',
        role: '',
        text: '……你找我有何事？',
        emotion: '平静',
      });
      return;
    }

    const name = npc.npc.name;
    const role = npc.npc.role;
    const emotion = npc.emotion || '平静';

    // Build memory context
    const memory = npcWorld.getMemoryStore();
    const memoryCtx = memory.buildMemoryContext(data.npcId, (otherId: string) => {
      const other = npcWorld.getNPC(otherId);
      return other?.npc.name || otherId;
    });

    // Build dialogue prompts
    const systemPrompt = buildDialogueSystemPrompt({
      name,
      identity: role || '未知',
      realm: npc.npc.realm || '凡人',
      background: npcWorld.getBackground(data.npcId) || '一个普通的修仙者',
      personality: npc.npc.personality,
      emotion,
      activity: npc.activity,
    });

    const userPrompt = buildDialogueUserPrompt(
      name,
      safeSceneContext,
      '你',
      memoryCtx || '',
    );

    // Call LLM
    const llmClient = LLMHttpClient.getInstance();
    const llmContext: DialogueRequestContext = {
      npcId: data.npcId,
      npcName: name,
      systemPrompt,
      userPrompt,
    };

    const result = await llmClient.requestDialogue(llmContext);

    if (result.success && result.text) {
      // Record interaction in NPC memory before emitting (fail before client sees success)
      memory.interactions.add(data.npcId, {
        timestamp: Date.now(),
        otherNpcId: 'player',
        type: 'dialogue',
        summary: `与玩家对话：${result.text.slice(0, MAX_MEMORY_SUMMARY_LENGTH)}`,
        impactScore: DIALOGUE_IMPACT_SCORE,
      });

      socket.emit('scene:npc-response', {
        npcId: data.npcId,
        name,
        role,
        text: result.text,
        emotion,
        source: 'llm',
      });
    } else {
      // Fallback: scripted dialogue map
      const dialogueMap: Record<string, string> = {
        'servant_01': '少爷您终于醒了！族长大人已经在正厅等您半天了。\n\n您的衣物已经准备好了，是否需要我为您带路？',
      };

      const text = dialogueMap[data.npcId] ||
        `${name}看了你一眼，缓缓说道：\n\n"修炼之路漫长，${safeSceneContext ? '你说的事我知道了' : '你找我有何事？'}"`;

      socket.emit('scene:npc-response', {
        npcId: data.npcId,
        name,
        role,
        text,
        emotion,
        source: 'fallback',
      });
    }
  });

  socket.on('faction:ai-decision', async (data: {
    clanId: string; clanName: string; clanType: string;
    clanReputation: number; clanTreasury: number;
    otherClans: Array<{ id: string; name: string; reputation: number; treasury: number; type: string; currentStatus: string }>;
  }) => {
    const playerSocket = playerSockets.get(socket.id);
    if (!playerSocket) return;

    // Separate rate limit from dialogue to prevent cross-blocking
    const lastRequest = factionRateMap.get(socket.id);
    if (lastRequest && Date.now() - lastRequest < FACTION_AI_RATE_LIMIT_MS) {
      socket.emit('faction:ai-decision-result', { clanId: data.clanId, decision: null });
      return;
    }
    factionRateMap.set(socket.id, Date.now());

    // Validate client-supplied data to prevent prompt injection
    const safeReputation = Math.max(0, Math.min(data.clanReputation, 100000));
    const safeTreasury = Math.max(0, Math.min(data.clanTreasury, 10000000));
    const safeType = /^(1级|2级|3级|皇族|unknown)$/.test(data.clanType) ? data.clanType : 'unknown';

    const systemPrompt = buildFactionSystemPrompt();
    const userPrompt = buildFactionUserPrompt(
      { name: data.clanName, type: safeType, reputation: safeReputation, treasury: safeTreasury },
      data.otherClans,
    );

    const llmClient = LLMHttpClient.getInstance();
    try {
      const result = await llmClient.requestStructured<FactionDecision>(
        { npcId: `faction_${data.clanId}`, npcName: data.clanName, systemPrompt, userPrompt },
        0.7, 400,
        'FactionAI',
        (text) => {
          const decision = parseFactionDecision(text);
          if (!decision) return { ok: false, result: null as unknown as FactionDecision, error: 'Failed to parse faction decision' };
          return { ok: true, result: decision };
        },
      );

      socket.emit('faction:ai-decision-result', {
        clanId: data.clanId,
        decision: result.success ? result.result : null,
      });
    } catch {
      socket.emit('faction:ai-decision-result', { clanId: data.clanId, decision: null });
    }
  });

  socket.on('disconnect', () => {
    const playerSocket = playerSockets.get(socket.id);
    if (playerSocket) {
      PlayerService.getInstance().savePlayerData(playerSocket.playerId);
      playerSockets.delete(socket.id);
    }
    dialogueRateMap.delete(socket.id); // clean up rate limit state
    factionRateMap.delete(socket.id);
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// --- Chronicle WebSocket for NPC event streaming ---

interface ChronicleEvent {
  timestamp: number;
  npcId: string;
  npcName: string;
  action: string;
  location: string;
  reason: string;
  type: string;
  automated: boolean;
}

const chronicleClients: Set<WebSocket> = new Set();
const eventBuffer: ChronicleEvent[] = [];
const BATCH_INTERVAL_MS = 5000;
const BATCH_MIN_EVENTS = 3;

const wss = new WebSocketServer({ server: httpServer, path: '/chronicle' });

wss.on('connection', (ws: WebSocket) => {
  console.log('[CHRONICLE] client connected');
  chronicleClients.add(ws);

  ws.on('close', () => {
    console.log('[CHRONICLE] client disconnected');
    chronicleClients.delete(ws);
  });

  ws.on('error', () => {
    chronicleClients.delete(ws);
  });

  ws.on('message', (data: Buffer) => {
    try {
      const msg = JSON.parse(data.toString());
      handleChronicleCommand(msg, ws);
    } catch {
      // ignore malformed messages
    }
  });
});

function handleChronicleCommand(msg: any, ws: WebSocket): void {
  switch (msg.type) {
    case 'player:action': {
      const event: ChronicleEvent = {
        timestamp: Date.now(),
        npcId: 'player',
        npcName: '掌门',
        action: msg.action,
        location: '宗门大殿',
        reason: msg.reason || '',
        type: 'player_action',
        automated: false,
      };
      broadcastChronicleEvent(event);
      break;
    }
    default:
      break;
  }
}

function sendChronicleEvents(): void {
  if (eventBuffer.length === 0) return;

  const events = eventBuffer.splice(0);

  for (const event of events) {
    const time = new Date(event.timestamp).toLocaleTimeString('zh-CN', { hour12: false });
    const tag = event.automated ? ' [automated]' : '';
    const line = `[${time}]${tag} ${event.npcName} ${event.action} 在 ${event.location}（${event.reason}）`;
    const payload = JSON.stringify({ type: 'chronicle:event', line, event });

    for (const client of chronicleClients) {
      if (client.readyState === WebSocket.OPEN) {
        try { client.send(payload); } catch { /* socket closed between check and send */ }
      }
    }
  }
}

function broadcastChronicleEvent(event: ChronicleEvent): void {
  eventBuffer.push(event);
  if (eventBuffer.length >= BATCH_MIN_EVENTS) {
    sendChronicleEvents();
  }
}

// Periodic flush: guarantees buffered events are sent even if BATCH_MIN_EVENTS isn't reached
setInterval(sendChronicleEvents, BATCH_INTERVAL_MS);

// NPC event generation — called by the LLM pipeline when NPC actions complete
export function emitNPCEvent(
  npcId: string,
  npcName: string,
  action: string,
  location: string,
  reason: string,
  automated = false
): void {
  broadcastChronicleEvent({
    timestamp: Date.now(),
    npcId,
    npcName,
    action,
    location,
    reason,
    type: reason,
    automated,
  });
}

// --- End Chronicle WebSocket ---

const PORT = process.env.PORT || 3000;

function initializeGame(): void {
  console.log('Initializing game systems...');

  CountryService.getInstance();
  FamilyService.getInstance().initializeFamilies();
  ResourceManager.getInstance().initialize(1000, 1000, 50);

  // Start NPC simulation world
  const npcWorld = NPCWorldService.getInstance();
  npcWorld.setClanIds(npcWorld.generateDefaultClanIds(9));
  npcWorld.initialize();
  npcWorld.start();

  // Bridge NPC world events to chronicle
  npcWorld.on('npc:event', (event: any) => {
    broadcastChronicleEvent({
      timestamp: Date.now(),
      npcId: event.npcId,
      npcName: event.npcName,
      action: event.description,
      location: event.location || '宗门',
      reason: event.type,
      type: event.type,
      automated: true,
    });
  });

  // Start LLM planning scheduler and register high-tier NPCs
  const llmIntegration = LLMIntegrationManager.getInstance();
  llmIntegration.initialize();
  for (const [npcId, state] of npcWorld.getAllNPCs()) {
    llmIntegration.registerHighTierNPC(npcId, {
      id: npcId,
      name: state.npc.name,
      clan_id: state.npc.clanId,
      nation: state.npc.nation,
      role: state.npc.role,
      realm: state.npc.realm,
      power: state.npc.power,
      personality: state.npc.personality,
    });
  }
  console.log(`[LLM] Registered ${npcWorld.getAllNPCs().size} NPCs with planning scheduler`);

  console.log('Game systems initialized.');
}

function startGameLoop(): void {
  setInterval(() => {
    const players = PlayerService.getInstance().getOnlinePlayers();
    for (const player of players) {
      player.update(1000 / 60);
    }
  }, 1000 / 60);

  // Phase 1.1b: LLM planning tick every 5 seconds
  setInterval(() => {
    LLMIntegrationManager.getInstance().tick().catch(err =>
      console.error('[NPC] LLM tick error:', err)
    );
  }, 5000);

  // Phase 1.1c + 1.1d: NPC behavior processing every 2 seconds
  // Evaluates behavior trees, executes actions, updates NPC states before sync
  setInterval(() => {
    const npcWorld = NPCWorldService.getInstance();
    const llmIntegration = LLMIntegrationManager.getInstance();
    for (const [npcId, state] of npcWorld.getAllNPCs()) {
      try {
        // Skip dead NPCs
        if (state.npc.hp <= 0) continue;

        // Respect NPCWorldService planQueue — don't override active plans
        if (state.planQueue.length > 0 && state.activityUntil > Date.now()) continue;

        // Get behavior from LLM planning or fallback
        const oldBehavior = state.activity;
        const behavior = llmIntegration.getBehaviorForNPC(npcId, state.npc);

        // Phase 1.1e: Emit activity change events for memory feedback
        if (behavior !== oldBehavior) {
          EventBus.emit(NPCEvent.ACTIVITY_CHANGED, { npcId, activity: behavior, previous: oldBehavior });
        }

        // Update NPC activity in world state
        state.activity = behavior;

        // Simple behavior execution: move NPC based on activity
        if (behavior === 'patrol' || behavior === 'explore' || behavior === 'logistics' || behavior === 'compete') {
          const dx = Math.floor(Math.random() * 3) - 1;
          const dy = Math.floor(Math.random() * 3) - 1;
          state.npc.position.x = Math.max(0, Math.min(GAME_CONFIG.MAP_WIDTH, state.npc.position.x + dx));
          state.npc.position.y = Math.max(0, Math.min(GAME_CONFIG.MAP_HEIGHT, state.npc.position.y + dy));
          EventBus.emit(NPCEvent.STATE_CHANGED, { npcId, position: { ...state.npc.position }, activity: behavior });
        } else if (behavior === 'trade' || behavior === 'work') {
          if (Math.random() < 0.3) {
            const gained = Math.floor(Math.random() * 5) + 1;
            state.npc.resources.spiritStones += gained;
            EventBus.emit(NPCEvent.TRADE_COMPLETE, { npcId, profit: gained });
          }
        } else if (behavior === 'rest' || behavior === 'retreat') {
          if (state.npc.hp < state.npc.maxHp) {
            const healed = Math.floor(state.npc.maxHp * 0.05);
            state.npc.hp = Math.min(state.npc.maxHp, state.npc.hp + healed);
            EventBus.emit(NPCEvent.STATE_CHANGED, { npcId, hp: state.npc.hp, activity: behavior });
          }
        }
      } catch (err) {
        // Silently skip NPCs that fail behavior processing
      }
    }
  }, 2000);

  // NPCRole → Chinese display string
  function mapRole(role: string): string {
    const map: Record<string, string> = {
      'family_head': '家主', 'elder': '长老',
      'core_disciple': '核心子弟', 'inner_disciple': '内门子弟',
      'branch_disciple': '支脉子弟', 'law_enforcement_elder': '执法堂长老',
    };
    return map[role] || '内门子弟';
  }

  // RealmLevel → Chinese display string
  function mapRealm(realm: string): string {
    const map: Record<string, string> = {
      'mortal': '凡人', 'qi_refining': '练气', 'foundation_building': '筑基',
      'golden_core': '金丹', 'yuan_infant': '元婴', 'transcension': '化神',
    };
    return map[realm] || '练气';
  }

  // NPC state sync to connected clients every 2 seconds
  setInterval(() => {
    const npcWorld = NPCWorldService.getInstance();
    const npcStates: Array<{
      id: string; name: string; activity: string; emotion: string;
      x: number; y: number; hp: number; maxHp: number; power: number;
      clanId: string; role: string; realm: string;
      mp: number; maxMp: number;
      ambition: number; caution: number; loyalty: number; greed: number;
      spiritStone: number;
    }> = [];
    for (const [id, state] of npcWorld.getAllNPCs()) {
      npcStates.push({
        id,
        name: state.npc.name,
        activity: state.activity,
        emotion: state.emotion,
        x: state.npc.position.x,
        y: state.npc.position.y,
        hp: state.npc.hp,
        maxHp: state.npc.maxHp,
        power: state.npc.power,
        clanId: state.npc.clanId,
        role: mapRole(state.npc.role),
        realm: mapRealm(state.npc.realm),
        mp: state.npc.mp,
        maxMp: state.npc.maxMp,
        ambition: state.npc.personality.ambition,
        caution: state.npc.personality.caution,
        loyalty: state.npc.personality.loyalty,
        greed: state.npc.personality.greed,
        spiritStone: state.npc.resources.spiritStones,
      });
    }
    io.emit('npc:state-sync', { npcStates, tick: Date.now() });

    // Phase 1.3: NPC interaction event sync
    const interactions = npcWorld.consumeRecentInteractions();
    if (interactions.length > 0) {
      io.emit('npc:interactions', { interactions, tick: Date.now() });
    }
  }, 2000);
}

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initializeGame();
  startGameLoop();
});

export { app, httpServer, io };