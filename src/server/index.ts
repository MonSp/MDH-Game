import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
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

const PORT = process.env.PORT || 3000;

function initializeGame(): void {
  console.log('Initializing game systems...');
  
  CountryService.getInstance();
  FamilyService.getInstance().initializeFamilies();
  ResourceManager.getInstance().initialize(1000, 1000, 50);
  
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