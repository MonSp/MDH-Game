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

import { PlayerState, Country, CultivationRealm } from '../shared';

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(express.json());

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

  socket.on('disconnect', () => {
    const playerSocket = playerSockets.get(socket.id);
    if (playerSocket) {
      PlayerService.getInstance().savePlayerData(playerSocket.playerId);
      playerSockets.delete(socket.id);
    }
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

  console.log('Game systems initialized.');
}

function startGameLoop(): void {
  setInterval(() => {
    const players = PlayerService.getInstance().getOnlinePlayers();
    for (const player of players) {
      player.update(1000 / 60);
    }
  }, 1000 / 60);
}

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initializeGame();
  startGameLoop();
});

export { app, httpServer, io };