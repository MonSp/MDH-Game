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
  ItemService,
  WorldGenService,
  ECSEngineService,
  DataService
} from './services';
import { NPCWorldService } from './services/NPCWorldService';
import { MapGeneratorService } from './services/MapGeneratorService';
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
  },
  transports: ['polling', 'websocket']
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
const prevNpcIds: Map<string, Set<string>> = new Map();
const LLM_ENABLED = false; // Disabled until a working endpoint is configured

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

  socket.on('world:generate', (data: { seed?: number; width?: number; height?: number; heavenLevel?: number }, callback?: Function) => {
    try {
      const wgen = WorldGenService.getInstance();
      const world = wgen.generateWorld(data?.seed, data?.width, data?.height, data?.heavenLevel);
      if (typeof callback === 'function') {
        callback({ success: true, world });
      } else {
        socket.emit('world:generated', { success: true, world });
      }
    } catch (error) {
      console.error('[WorldGen] Error generating world:', error);
      const errMsg = { success: false, error: String(error) };
      if (typeof callback === 'function') {
        callback(errMsg);
      } else {
        socket.emit('world:generated', errMsg);
      }
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
      const playerService = PlayerService.getInstance();
      playerService.savePlayerData(playerSocket.playerId);
      playerService.removePlayer(playerSocket.playerId);
      prevNpcIds.delete(playerSocket.playerId);
      playerSockets.delete(socket.id);
    }
    dialogueRateMap.delete(socket.id);
    factionRateMap.delete(socket.id);
    console.log(`Client disconnected: ${socket.id}`);
  });

  // Server-side save/load
  socket.on('game:save', (data: { slot: number; meta: any; state: any }) => {
    const ps = playerSockets.get(socket.id);
    if (!ps) { socket.emit('game:save-result', { ok: false, error: '未登录' }); return; }
    try {
      DataService.getInstance().saveGameSlot(ps.playerId, data.slot, data.meta, data.state);
      socket.emit('game:save-result', { ok: true, slot: data.slot });
    } catch (e) {
      socket.emit('game:save-result', { ok: false, error: String(e) });
    }
  });

  socket.on('game:load', (data: { slot: number }) => {
    const ps = playerSockets.get(socket.id);
    if (!ps) { socket.emit('game:load-result', { ok: false, error: '未登录' }); return; }
    const result = DataService.getInstance().loadGameSlot(ps.playerId, data.slot);
    if (result) {
      socket.emit('game:load-result', { ok: true, slot: data.slot, meta: result.meta, state: result.state });
    } else {
      socket.emit('game:load-result', { ok: false, slot: data.slot, error: '存档不存在' });
    }
  });

  socket.on('game:save-slots', () => {
    const ps = playerSockets.get(socket.id);
    if (!ps) { socket.emit('game:save-slots-result', { ok: false }); return; }
    const slots = DataService.getInstance().getSaveSlots(ps.playerId);
    socket.emit('game:save-slots-result', { ok: true, slots });
  });

  socket.on('game:delete-save', (data: { slot: number }) => {
    const ps = playerSockets.get(socket.id);
    if (!ps) return;
    DataService.getInstance().deleteSaveSlot(ps.playerId, data.slot);
    socket.emit('game:delete-save-result', { ok: true, slot: data.slot });
  });

  // Diplomacy actions — server validates and logs
  socket.on('diplomacy:action', (data: { action: string; fromClanId: string; toClanId: string; params?: any }) => {
    const ps = playerSockets.get(socket.id);
    if (!ps) { socket.emit('diplomacy:result', { ok: false, error: '未登录' }); return; }

    const { action, fromClanId, toClanId, params } = data;
    if (!fromClanId || !toClanId || fromClanId === toClanId) {
      socket.emit('diplomacy:result', { ok: false, error: '无效的外交参数' });
      return;
    }

    // Apply the diplomacy change to server clan state
    applyDiplomacyChange(action, fromClanId, toClanId, params);

    // Log the action for audit
    console.log(`[Diplomacy] ${ps.playerId}: ${action} ${fromClanId} -> ${toClanId}`);

    // Broadcast to all clients so server is aware of the state change
    io.emit('diplomacy:broadcast', {
      action,
      fromClanId,
      toClanId,
      params,
      timestamp: Date.now(),
      sourcePlayerId: ps.playerId,
    });

    socket.emit('diplomacy:result', { ok: true, action, fromClanId, toClanId });
  });

  // Client sends clan data for server-side AI
  socket.on('diplomacy:sync-clans', (data: { clans: ServerClan[]; playerFactionId?: string }) => {
    for (const clan of data.clans) {
      const existing = serverClans.get(clan.id);
      serverClans.set(clan.id, {
        ...clan,
        diplomacy: existing?.diplomacy || clan.diplomacy || {},
        playerFactionId: data.playerFactionId === clan.id ? data.playerFactionId : existing?.playerFactionId,
      });
    }
  });

  // Squad actions — server validates and logs
  socket.on('squad:action', (data: { action: string; params: any }) => {
    const ps = playerSockets.get(socket.id);
    if (!ps) { socket.emit('squad:result', { ok: false, error: '未登录' }); return; }

    const { action, params } = data;
    console.log(`[Squad] ${ps.playerId}: ${action}`, JSON.stringify(params).slice(0, 100));

    // Broadcast to other clients for multiplayer sync
    socket.broadcast.emit('squad:broadcast', {
      action, params, playerId: ps.playerId, timestamp: Date.now(),
    });

    socket.emit('squad:result', { ok: true, action });
  });

  // Captive actions — server validates and logs
  socket.on('captive:action', (data: { action: string; params: any }) => {
    const ps = playerSockets.get(socket.id);
    if (!ps) return;

    const { action, params } = data;
    console.log(`[Captive] ${ps.playerId}: ${action}`, JSON.stringify(params).slice(0, 100));

    socket.emit('captive:result', { ok: true, action });
  });

  // Market trading — server validates
  socket.on('market:buy', (data: { itemName: string; amount: number }) => {
    const ps = playerSockets.get(socket.id);
    if (!ps) { socket.emit('market:buy-result', { ok: false, error: '未登录' }); return; }
    console.log(`[Market] ${ps.playerId}: buy ${data.amount}x ${data.itemName}`);
    socket.emit('market:buy-result', { ok: true, itemName: data.itemName, amount: data.amount });
  });

  socket.on('market:sell', (data: { itemName: string; amount: number }) => {
    const ps = playerSockets.get(socket.id);
    if (!ps) { socket.emit('market:sell-result', { ok: false, error: '未登录' }); return; }
    console.log(`[Market] ${ps.playerId}: sell ${data.amount}x ${data.itemName}`);
    socket.emit('market:sell-result', { ok: true, itemName: data.itemName, amount: data.amount });
  });

  // Combat: player attacks NPC — server-authoritative
  socket.on('combat:attack-npc', (data: {
    npcId: string; npcName: string; npcPower: number; npcClanId: string;
    npcRealm: string; npcActivity: string; npcSpiritStone: number;
    playerAttack: number; playerCountry: string; playerRealm: string; playerPosition: { x: number; y: number };
  }) => {
    const ps = playerSockets.get(socket.id);
    if (!ps) return;

    const { npcName, npcPower, npcClanId, npcActivity, npcSpiritStone, playerAttack, playerCountry, playerPosition } = data;

    // Server-authoritative combat calculation
    const effectiveAttack = playerCountry === '秦' ? playerAttack * 1.1 : playerAttack;
    const winChance = effectiveAttack / (effectiveAttack + (npcPower / 10));
    const win = Math.random() < Math.max(0.1, Math.min(0.9, winChance));

    if (win) {
      const expGain = playerCountry === '秦' ? Math.floor(50 * 1.1) : 50;
      let dropStones = npcSpiritStone;
      const isMerchant = npcActivity === '坊市跑商';
      if (isMerchant) dropStones += Math.floor(Math.random() * 200) + 100;

      let droppedItem = '';
      if (Math.random() < 0.2) droppedItem = '洗髓丹';

      const repLoss = isMerchant ? 20 : 10;
      // Update server clan state
      const clan = serverClans.get(npcClanId);
      const clanRepAfter = clan ? clan.reputation - repLoss : -repLoss;
      if (clan) clan.reputation = clanRepAfter;

      // Enforcer spawning
      let enforcerSpawned = false;
      let enforcer: any = null;
      if (clanRepAfter < 0 && Math.random() > 0.3) {
        enforcerSpawned = true;
        const enforcerPower = playerAttack * 3;
        enforcer = {
          id: `enforcer-${Date.now()}`, clanId: npcClanId, name: `${clan?.name?.charAt(0) || '宗'}执法长老`,
          role: '执法堂长老', realm: '化神', power: enforcerPower,
          hp: enforcerPower * 10, maxHp: enforcerPower * 10, mp: enforcerPower * 5, maxMp: enforcerPower * 5,
          personality: { ambition: 50, caution: 50, loyalty: 100, greed: 10 },
          resources: { spiritStone: 500 }, activity: '追杀中',
          position: { x: playerPosition.x + (Math.random() > 0.5 ? 10 : -10), y: playerPosition.y + (Math.random() > 0.5 ? 10 : -10) },
        };
      }

      // Capture attempt
      const realmIndex = ['凡人','练气','筑基','金丹','元婴','化神','炼虚','合体','大乘','渡劫'].indexOf(data.playerRealm);
      const npcRealmIndex = ['凡人','练气','筑基','金丹','元婴','化神','炼虚','合体','大乘','渡劫'].indexOf(data.npcRealm);
      const realmDiff = npcRealmIndex >= 0 && realmIndex >= 0 ? (realmIndex - npcRealmIndex) : 0;
      const captureChance = Math.min(0.9, Math.max(0.1, 0.5 + realmDiff * 0.1));
      const captureSuccess = Math.random() < captureChance;
      const captiveLoyalty = Math.max(10, Math.min(90, 50 + Math.floor(Math.random() * 30) - 15));
      const reputationGain = Math.floor((npcPower / 1000) + 5);

      console.log(`[Combat] ${ps.playerId}: defeated ${npcName}, +${expGain}exp, +${dropStones} stones${droppedItem ? ', got ' + droppedItem : ''}`);

      socket.emit('combat:attack-npc-result', {
        win: true, expGain, dropStones, droppedItem, repLoss, clanRepAfter,
        enforcerSpawned, enforcer, captureChance, captureSuccess, captiveLoyalty, reputationGain,
      });
    } else {
      console.log(`[Combat] ${ps.playerId}: lost to ${npcName}`);
      socket.emit('combat:attack-npc-result', {
        win: false, expGain: 0, dropStones: 0, droppedItem: '', repLoss: 0, clanRepAfter: 0,
        enforcerSpawned: false, captureChance: 0, captureSuccess: false, captiveLoyalty: 0, reputationGain: 0,
      });
    }
  });

  // Monster combat notifications
  socket.on('combat:monster-kill', (data: { monsterName: string; expGain: number; stonesGain: number; reputationGain: number }) => {
    const ps = playerSockets.get(socket.id);
    if (!ps) return;
    console.log(`[Combat] ${ps.playerId}: killed ${data.monsterName}, +${data.expGain}exp, +${data.stonesGain} stones`);
  });

  // Siege warfare — server-authoritative resolution
  socket.on('siege:resolve', (data: {
    attackerClanId: string; targetClanId: string; attackPower: number;
    targetFortification: number; targetGarrison: number; targetTreasury: number;
    targetMorale: number; targetTerritory: number;
  }) => {
    const ps = playerSockets.get(socket.id);
    if (!ps) return;

    const { attackerClanId, targetClanId, attackPower, targetFortification, targetGarrison, targetTreasury } = data;

    // Server-authoritative siege calculation
    let fortDmg = 0, garrisonDmg = 0, counterDmg = 0, loot = 0;
    let captured = false;

    if (targetFortification > 0) {
      fortDmg = Math.max(1, Math.floor(attackPower * 0.05));
    } else if (targetGarrison > 0) {
      garrisonDmg = Math.max(1, Math.floor(attackPower * 0.08));
      counterDmg = Math.max(1, Math.floor(targetGarrison * 0.03));
    }

    const newFort = Math.max(0, targetFortification - fortDmg);
    const newGarrison = Math.max(0, targetGarrison - garrisonDmg);

    if (newFort <= 0 && newGarrison <= 0) {
      captured = true;
      loot = Math.floor(targetTreasury * 0.2);
    }

    // Update server clan state
    const targetClan = serverClans.get(targetClanId);
    if (targetClan) {
      targetClan.treasury = Math.max(0, targetClan.treasury - loot);
      if (captured) {
        // Update server diplomacy
        const attackerClan = serverClans.get(attackerClanId);
        if (attackerClan) attackerClan.treasury += loot;
      }
    }

    console.log(`[Siege] ${ps.playerId}: ${attackerClanId} vs ${targetClanId}, fortDmg=${fortDmg}, garrisonDmg=${garrisonDmg}, captured=${captured}, loot=${loot}`);

    // Broadcast siege result to all clients
    io.emit('siege:result', {
      attackerClanId, targetClanId, fortDmg, garrisonDmg, counterDmg, loot, captured,
      timestamp: Date.now(),
    });
  });

  // Siege equipment building notification
  socket.on('siege:build-equipment', (data: { clanId: string }) => {
    const ps = playerSockets.get(socket.id);
    if (!ps) return;
    console.log(`[Siege] ${ps.playerId}: building siege equipment for ${data.clanId}`);
    socket.emit('siege:build-equipment-result', { ok: true });
  });

  // Resource point operations
  socket.on('resource:gather', (data: {
    resourceId: string; resourceType: string; playerPosition: { x: number; y: number };
    fortune: number; heavenLevel: number;
  }) => {
    const ps = playerSockets.get(socket.id);
    if (!ps) return;

    const { resourceId, resourceType, fortune } = data;
    const fortuneProc = Math.random() < (fortune / 100);
    const fortuneMult = fortuneProc ? 2 : 1;

    let expGain = 0;
    let stonesGain = 0;
    let itemDrop = '';
    let resultMsg = '';

    if (resourceType === '灵田') {
      expGain = Math.floor(30 * fortuneMult);
      resultMsg = `你在灵田采摘了仙草，获得了 ${expGain} 点修为${fortuneProc ? '（双倍）' : ''}。`;
    } else if (resourceType === '矿脉') {
      stonesGain = Math.floor(50 * fortuneMult);
      resultMsg = `你在矿脉开采了 ${stonesGain} 块灵石${fortuneProc ? '（双倍）' : ''}。`;
    } else if (resourceType === '遗迹') {
      stonesGain = Math.floor(100 * fortuneMult);
      if (Math.random() < 0.3 * fortuneMult) itemDrop = '洗髓丹';
      resultMsg = `你在遗迹中探索，发现了 ${stonesGain} 块灵石${fortuneProc ? '（双倍）' : ''}${itemDrop ? '，以及一枚珍贵的【洗髓丹】！' : '。'}`;
    }

    console.log(`[Resource] ${ps.playerId}: gather ${resourceType}, +${expGain}exp, +${stonesGain} stones${itemDrop ? ', got ' + itemDrop : ''}`);

    socket.emit('resource:gather-result', {
      ok: true, resourceId, expGain, stonesGain, itemDrop, message: resultMsg, fortuneProc,
    });
  });

  // Resource point sync from client
  socket.on('resource:sync-points', (data: { points: ServerResourcePoint[] }) => {
    syncResourcePoints(data.points);
  });

  socket.on('destruct:hit', (data: { buildingId: string; lx: number; ly: number; lz: number; damage: number; playerId: string }) => {
    const { buildingId, lx, ly, lz, damage, playerId } = data;
    
    const updates = [{
      lx, ly, lz,
      material: 'wood' as const,
      health: Math.max(0, 40 - damage),
    }];
    
    // Broadcast destruction state to all clients
    io.emit('destruct:state', {
      buildingId,
      updates,
      sourcePlayerId: playerId,
    });
    
    console.log(`[Destruct] ${playerId} hit ${buildingId} at [${lx},${ly},${lz}] damage=${damage}`);
  });

  socket.on('destruct:request', (data: { buildingId: string }) => {
    // For now, return empty state — full persistence can be added later
    socket.emit('destruct:state', {
      buildingId: data.buildingId,
      updates: [],
    });
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
  ResourceManager.getInstance().initialize(GAME_CONFIG.MAP_WIDTH, GAME_CONFIG.MAP_HEIGHT, 50);
  WorldGenService.getInstance().initialize();

  const ecsEngine = ECSEngineService.getInstance();
  ecsEngine.initialize(0);

  if (ecsEngine.isAvailable) {
    const totalNPCs = 3000;
    for (let layer = 9; layer >= 1; layer--) {
      const count = Math.floor(totalNPCs / 9);
      const result = ecsEngine.createNPCs(count, layer);
      if (result) {
        console.log(`[ECS Engine] Layer ${layer}: created ${result.created} NPCs, total = ${result.totalNPCs}`);
      }
    }
    const stats = ecsEngine.getStats();
    if (stats) {
      console.log(`[ECS Engine] ${stats.npcCount} NPCs ready`);
    }
  }

  // Start NPC simulation world (fallback / LLM dialogue layer)
  const npcWorld = NPCWorldService.getInstance();
  npcWorld.setClanIds(npcWorld.generateDefaultClanIds(9));
  npcWorld.initialize();
  npcWorld.start();
  npcWorld.setLlmMode(false); // Disabled until a working LLM endpoint is configured

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

  // LLM planning — disabled until a working endpoint is configured
  if (LLM_ENABLED) {
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
  } else {
    console.log('[LLM] Planning disabled — no working endpoint configured');
  }

  console.log('Game systems initialized.');
}

// ============================================================
// Server-side clan state & AI diplomacy
// ============================================================

interface ServerClan {
  id: string;
  name: string;
  reputation: number;
  treasury: number;
  diplomacy: Record<string, { status: string; conflictLevel: string; declaredBy: string; truceUntil?: number; allianceDate?: number; vassalTribute?: number }>;
  playerFactionId?: string; // which player controls this clan
}

const serverClans: Map<string, ServerClan> = new Map();

function applyDiplomacyChange(action: string, fromClanId: string, toClanId: string, params?: any): void {
  const from = serverClans.get(fromClanId);
  const to = serverClans.get(toClanId);
  if (!from || !to) return;

  const now = Date.now();

  switch (action) {
    case 'declare-war':
      from.diplomacy[toClanId] = { status: '战争', conflictLevel: '局部冲突', declaredBy: fromClanId };
      to.diplomacy[fromClanId] = { status: '战争', conflictLevel: '局部冲突', declaredBy: fromClanId };
      break;
    case 'propose-alliance':
      from.diplomacy[toClanId] = { status: '同盟', conflictLevel: '和平', declaredBy: fromClanId, allianceDate: now };
      to.diplomacy[fromClanId] = { status: '同盟', conflictLevel: '和平', declaredBy: fromClanId, allianceDate: now };
      break;
    case 'propose-truce':
      from.diplomacy[toClanId] = { status: '停战', conflictLevel: '和平', declaredBy: fromClanId, truceUntil: now + 120000 };
      to.diplomacy[fromClanId] = { status: '停战', conflictLevel: '和平', declaredBy: fromClanId, truceUntil: now + 120000 };
      break;
    case 'surrender':
      from.diplomacy[toClanId] = { status: '臣服', conflictLevel: '和平', declaredBy: fromClanId, vassalTribute: Math.floor((from.treasury || 0) * 0.1) };
      to.diplomacy[fromClanId] = { status: '皇族', conflictLevel: '和平', declaredBy: fromClanId, vassalTribute: Math.floor((from.treasury || 0) * 0.1) };
      break;
    case 'break-alliance':
      delete from.diplomacy[toClanId];
      delete to.diplomacy[fromClanId];
      break;
  }
}

function runDiplomacyAI(): void {
  const now = Date.now();
  const decisions: Array<{ action: string; fromClanId: string; toClanId: string; description: string }> = [];

  // 1. Truce expiry
  for (const clan of serverClans.values()) {
    for (const [targetId, entry] of Object.entries(clan.diplomacy)) {
      if (entry.status === '停战' && entry.truceUntil && now > entry.truceUntil) {
        delete clan.diplomacy[targetId];
        const target = serverClans.get(targetId);
        if (target) delete target.diplomacy[clan.id];
        decisions.push({ action: 'truce-expired', fromClanId: clan.id, toClanId: targetId, description: `【${clan.name}】与【${target?.name || targetId}】的停战协议到期` });
      }
    }
  }

  // 2. AI diplomatic decisions
  const aiClans = [...serverClans.values()].filter(c => !c.playerFactionId && c.treasury >= 100);

  for (const clan of aiClans) {
    for (const other of serverClans.values()) {
      if (other.id === clan.id) continue;

      const currentStatus = clan.diplomacy[other.id]?.status || '中立';
      const powerRatio = (clan.reputation + 10) / (other.reputation + 10);

      // Alliance: similar power, neutral
      if (currentStatus === '中立' && powerRatio > 0.5 && powerRatio < 2.0 && Math.random() < 0.02) {
        applyDiplomacyChange('propose-alliance', clan.id, other.id);
        decisions.push({ action: 'alliance', fromClanId: clan.id, toClanId: other.id, description: `【${clan.name}】与【${other.name}】缔结同盟！` });
      }

      // War: much stronger, neutral
      if (currentStatus === '中立' && powerRatio > 1.8 && Math.random() < 0.015) {
        applyDiplomacyChange('declare-war', clan.id, other.id);
        decisions.push({ action: 'war', fromClanId: clan.id, toClanId: other.id, description: `【${clan.name}】向【${other.name}】宣战！` });
      }

      // Truce: at war, random chance
      if (currentStatus === '战争' && Math.random() < 0.03) {
        applyDiplomacyChange('propose-truce', clan.id, other.id);
        decisions.push({ action: 'truce', fromClanId: clan.id, toClanId: other.id, description: `【${clan.name}】与【${other.name}】达成停战。` });
      }
    }

    // Vassal tribute
    for (const [vassalId, entry] of Object.entries(clan.diplomacy)) {
      if (entry.status === '臣服' && entry.vassalTribute && entry.vassalTribute > 0) {
        const vassal = serverClans.get(vassalId);
        if (vassal && vassal.treasury >= entry.vassalTribute) {
          const tribute = Math.min(entry.vassalTribute, vassal.treasury);
          vassal.treasury -= tribute;
          clan.treasury += tribute;
        }
      }
    }
  }

  // 3. Broadcast decisions to all clients
  if (decisions.length > 0) {
    io.emit('diplomacy:ai-decisions', { decisions, timestamp: now });
  }
}

// ============================================================
// Server-side resource point management
// ============================================================

interface ServerResourcePoint {
  id: string;
  type: '灵田' | '矿脉' | '遗迹';
  amount: number;
  position: { x: number; y: number };
  ownerClanId?: string;
  heavenLevel: number;
}

const serverResourcePoints: Map<string, ServerResourcePoint> = new Map();

function runResourceTick(): void {
  const now = Date.now();
  const updates: Array<{ clanId: string; income: number; claimed: boolean; resourceType?: string }> = [];

  // AI resource claiming + passive income
  for (const clan of serverClans.values()) {
    if (clan.playerFactionId) continue; // Skip player-controlled clans

    // Passive income from owned resources
    let totalIncome = 0;
    for (const rp of serverResourcePoints.values()) {
      if (rp.ownerClanId === clan.id) {
        totalIncome += Math.max(1, Math.floor(rp.amount * 0.02));
      }
    }
    if (totalIncome > 0) {
      clan.treasury += totalIncome;
      updates.push({ clanId: clan.id, income: totalIncome, claimed: false });
    }
  }

  // Broadcast resource updates to all clients
  if (updates.length > 0) {
    io.emit('resource:tick', { updates, timestamp: now });
  }
}

// Sync resource points from client
function syncResourcePoints(points: ServerResourcePoint[]): void {
  for (const p of points) {
    if (!serverResourcePoints.has(p.id)) {
      serverResourcePoints.set(p.id, { ...p });
    }
  }
}

function startGameLoop(): void {
  setInterval(() => {
    const players = PlayerService.getInstance().getOnlinePlayers();
    for (const player of players) {
      player.update(1000 / 60);
    }
  }, 1000 / 60);

  // LLM planning tick — only runs when LLM_ENABLED
  if (LLM_ENABLED) {
    setInterval(() => {
      LLMIntegrationManager.getInstance().tick().catch(err =>
        console.error('[NPC] LLM tick error:', err)
      );
    }, 5000);
  }

  // Diplomacy AI tick: truce expiry + AI decisions every 30s
  setInterval(() => {
    runDiplomacyAI();
    runResourceTick();
  }, 30000);

  // NPC behavior processing via C++ ECS engine (every 100ms = ~10 FPS simulation)
  // Falls back to TS-based processing if C++ addon is unavailable
  setInterval(() => {
    const ecsEngine = ECSEngineService.getInstance();
    if (ecsEngine.isAvailable) {
      ecsEngine.updateFrame();
    } else {
      const npcWorld = NPCWorldService.getInstance();
      const llmIntegration = LLMIntegrationManager.getInstance();
      for (const [npcId, state] of npcWorld.getAllNPCs()) {
        try {
          if (state.npc.hp <= 0) continue;
          if (state.planQueue.length > 0 && state.activityUntil > Date.now()) continue;
          const oldBehavior = state.activity;
          const behavior = llmIntegration.getBehaviorForNPC(npcId, state.npc);
          if (behavior !== oldBehavior) {
            EventBus.emit(NPCEvent.ACTIVITY_CHANGED, { npcId, activity: behavior, previous: oldBehavior });
          }
          state.activity = behavior;
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
    }
  }, 100);

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

  // NPC state sync to connected clients — driven by C++ ECS engine
  // Per-player viewport culling when ECS is available, broadcast fallback otherwise
  setInterval(() => {
    const ecsEngine = ECSEngineService.getInstance();

    if (ecsEngine.isAvailable) {
      const players = PlayerService.getInstance().getOnlinePlayers();
      if (players.length > 0) {
        const socketByPlayerId = new Map<string, PlayerSocket>();
        for (const ps of playerSockets.values()) {
          socketByPlayerId.set(ps.playerId, ps);
        }

        for (const player of players) {
          const px = player.position.x;
          const py = player.position.y;
          const nearbyNpcs = ecsEngine.getNearbyNPCStates(px, py, 800);
          const playerNpcStates = nearbyNpcs.map(n => ({
            id: n.id,
            name: n.name,
            activity: n.activity,
            emotion: '平静',
            x: n.x,
            y: n.y,
            hp: n.hp,
            maxHp: n.maxHp,
            power: n.power,
            clanId: n.clanId,
            role: n.role,
            realm: n.realm,
            mp: n.mp,
            maxMp: n.maxMp,
            ambition: n.ambition,
            caution: n.caution,
            loyalty: n.loyalty,
            greed: n.greed,
            spiritStone: n.spiritStones,
          }));

          const ps = socketByPlayerId.get(player.id);
          if (ps) {
            ps.socket.emit('npc:state-sync', { npcStates: playerNpcStates, tick: Date.now() });
          }

          const currentIds = new Set(playerNpcStates.map(n => n.id));
          const prevIds = prevNpcIds.get(player.id) ?? new Set<string>();
          const removedIds: string[] = [];
          for (const id of prevIds) {
            if (!currentIds.has(id)) removedIds.push(id);
          }
          if (removedIds.length > 0 && ps) {
            ps.socket.emit('npc:removed', { ids: removedIds, tick: Date.now() });
          }
          prevNpcIds.set(player.id, currentIds);
        }
      }
    } else {
      const npcWorld = NPCWorldService.getInstance();
      let npcStates: Array<{
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

      const currentIds = new Set(npcStates.map(n => n.id));
      const prevIds = prevNpcIds.get('__broadcast__') ?? new Set<string>();
      const removedIds: string[] = [];
      for (const id of prevIds) {
        if (!currentIds.has(id)) removedIds.push(id);
      }
      if (removedIds.length > 0) {
        io.emit('npc:removed', { ids: removedIds, tick: Date.now() });
      }
      prevNpcIds.set('__broadcast__', currentIds);
    }

    // Phase 1.3: NPC interaction event sync (from NPCWorldService)
    const npcWorld = NPCWorldService.getInstance();
    const interactions = npcWorld.consumeRecentInteractions();
    if (interactions.length > 0) {
      io.emit('npc:interactions', { interactions, tick: Date.now() });
    }
  }, 500);
}

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initializeGame();
  startGameLoop();
});

export { app, httpServer, io };