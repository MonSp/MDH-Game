import Database from 'better-sqlite3';
import path from 'path';

export class DataService {
  private static instance: DataService;
  private db: Database.Database;

  private constructor() {
    const dbPath = path.join(process.cwd(), 'data', 'game.db');
    this.db = new Database(dbPath);
    this.initializeTables();
  }

  static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  private initializeTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS countries (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        culture TEXT,
        trait_type TEXT,
        trait_value INTEGER,
        capital_x INTEGER,
        capital_y INTEGER
      );

      CREATE TABLE IF NOT EXISTS player_country (
        player_id TEXT PRIMARY KEY,
        country_id TEXT NOT NULL,
        joined_at INTEGER NOT NULL,
        FOREIGN KEY (country_id) REFERENCES countries(id)
      );

      CREATE TABLE IF NOT EXISTS families (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        level INTEGER NOT NULL,
        country TEXT NOT NULL,
        member_count INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS player_family (
        player_id TEXT PRIMARY KEY,
        family_id TEXT NOT NULL,
        is_main_branch INTEGER DEFAULT 0,
        joined_at INTEGER NOT NULL,
        FOREIGN KEY (family_id) REFERENCES families(id)
      );

      CREATE TABLE IF NOT EXISTS family_favorability (
        player_id TEXT NOT NULL,
        family_id TEXT NOT NULL,
        favorability INTEGER DEFAULT 50,
        PRIMARY KEY (player_id, family_id),
        FOREIGN KEY (player_id) REFERENCES players(id),
        FOREIGN KEY (family_id) REFERENCES families(id)
      );

      CREATE TABLE IF NOT EXISTS realms (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        required_cultivation INTEGER NOT NULL,
        spirit_stone_cost INTEGER NOT NULL,
        health_multiplier REAL DEFAULT 1.0,
        spirit_multiplier REAL DEFAULT 1.0,
        power_multiplier REAL DEFAULT 1.0
      );

      CREATE TABLE IF NOT EXISTS player_realm (
        player_id TEXT PRIMARY KEY,
        realm INTEGER NOT NULL DEFAULT 1,
        cultivation INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (player_id) REFERENCES players(id),
        FOREIGN KEY (realm) REFERENCES realms(id)
      );

      CREATE TABLE IF NOT EXISTS resource_nodes (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        last_collected_at INTEGER,
        respawn_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS collection_records (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        collected_at INTEGER NOT NULL,
        rewards_cultivation INTEGER DEFAULT 0,
        rewards_spirit_stones INTEGER DEFAULT 0,
        special_drop TEXT,
        FOREIGN KEY (player_id) REFERENCES players(id),
        FOREIGN KEY (resource_id) REFERENCES resource_nodes(id)
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        type TEXT NOT NULL,
        currency_type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        target_player_id TEXT,
        timestamp INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_player ON transactions(player_id);

      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        quality INTEGER NOT NULL,
        price INTEGER NOT NULL,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS player_items (
        player_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY (player_id, item_id)
      );

      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        country TEXT NOT NULL,
        family_id TEXT NOT NULL,
        realm INTEGER NOT NULL DEFAULT 1,
        cultivation INTEGER NOT NULL DEFAULT 0,
        health INTEGER NOT NULL DEFAULT 100,
        max_health INTEGER NOT NULL DEFAULT 100,
        spirit INTEGER NOT NULL DEFAULT 100,
        max_spirit INTEGER NOT NULL DEFAULT 100,
        attack INTEGER NOT NULL DEFAULT 10,
        defense INTEGER NOT NULL DEFAULT 5,
        move_speed REAL NOT NULL DEFAULT 100,
        spirit_stones INTEGER NOT NULL DEFAULT 0,
        pos_x INTEGER NOT NULL DEFAULT 0,
        pos_y INTEGER NOT NULL DEFAULT 0,
        state TEXT NOT NULL DEFAULT 'idle',
        created_at INTEGER NOT NULL,
        last_login_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_players_name ON players(name);
      CREATE INDEX IF NOT EXISTS idx_players_family ON players(family_id);

      CREATE TABLE IF NOT EXISTS player_states (
        player_id TEXT NOT NULL,
        state TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        PRIMARY KEY (player_id, started_at)
      );

      CREATE TABLE IF NOT EXISTS npcs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        clan_id TEXT NOT NULL,
        nation TEXT NOT NULL,
        role TEXT NOT NULL,
        realm TEXT NOT NULL,
        power INTEGER NOT NULL,
        hp INTEGER NOT NULL,
        max_hp INTEGER NOT NULL,
        mp INTEGER NOT NULL,
        max_mp INTEGER NOT NULL,
        activity TEXT NOT NULL,
        position_x INTEGER NOT NULL,
        position_y INTEGER NOT NULL,
        personality_ambition REAL DEFAULT 50,
        personality_caution REAL DEFAULT 50,
        personality_loyalty REAL DEFAULT 50,
        personality_greed REAL DEFAULT 50,
        birth_time INTEGER NOT NULL,
        birth_type TEXT NOT NULL,
        layer_id INTEGER NOT NULL,
        state TEXT NOT NULL,
        resources_json TEXT,
        FOREIGN KEY (clan_id) REFERENCES clans(id)
      );

      CREATE TABLE IF NOT EXISTS npc_souls (
        id TEXT PRIMARY KEY,
        original_npc_id TEXT NOT NULL,
        original_clan_id TEXT NOT NULL,
        original_nation TEXT NOT NULL,
        original_realm TEXT NOT NULL,
        death_cause TEXT NOT NULL,
        death_time INTEGER NOT NULL,
        pool_entry_time INTEGER,
        inherited_resources INTEGER
      );

      CREATE TABLE IF NOT EXISTS npc_death_records (
        id TEXT PRIMARY KEY,
        npc_id TEXT NOT NULL,
        death_cause TEXT NOT NULL,
        death_time INTEGER NOT NULL,
        killer_type TEXT,
        killer_id TEXT,
        dropped_resources_json TEXT,
        family_favorability_change INTEGER,
        FOREIGN KEY (npc_id) REFERENCES npcs(id)
      );

      CREATE INDEX IF NOT EXISTS idx_npcs_clan ON npcs(clan_id);
      CREATE INDEX IF NOT EXISTS idx_npcs_nation ON npcs(nation);
      CREATE INDEX IF NOT EXISTS idx_npcs_realm ON npcs(realm);
      CREATE INDEX IF NOT EXISTS idx_npc_souls_pool ON npc_souls(pool_entry_time);
      CREATE INDEX IF NOT EXISTS idx_npc_death_records_time ON npc_death_records(death_time);

      CREATE TABLE IF NOT EXISTS death_records (
        id TEXT PRIMARY KEY,
        npc_id TEXT NOT NULL,
        npc_name TEXT NOT NULL,
        clan_id TEXT NOT NULL,
        nation TEXT NOT NULL,
        realm TEXT NOT NULL,
        death_cause TEXT NOT NULL,
        death_time INTEGER NOT NULL,
        killer_id TEXT,
        killer_type TEXT,
        dropped_spirit_stones INTEGER,
        dropped_items_json TEXT,
        dropped_equipment_json TEXT,
        world_recovery_spirit_stones INTEGER,
        family_favorability_change INTEGER,
        layer_id INTEGER NOT NULL,
        FOREIGN KEY (npc_id) REFERENCES npcs(id)
      );

      CREATE TABLE IF NOT EXISTS soul_pool (
        id TEXT PRIMARY KEY,
        original_npc_id TEXT NOT NULL,
        original_clan_id TEXT NOT NULL,
        original_nation TEXT NOT NULL,
        original_realm TEXT NOT NULL,
        death_cause TEXT NOT NULL,
        death_time INTEGER NOT NULL,
        pool_entry_time INTEGER NOT NULL,
        inherited_resources INTEGER,
        status TEXT DEFAULT 'waiting'
      );

      CREATE TABLE IF NOT EXISTS population_history (
        id TEXT PRIMARY KEY,
        layer_id INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        total_npc_count INTEGER NOT NULL,
        nation_counts_json TEXT,
        family_counts_json TEXT,
        birth_count INTEGER DEFAULT 0,
        death_count INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_death_records_time ON death_records(death_time);
      CREATE INDEX IF NOT EXISTS idx_death_records_clan ON death_records(clan_id);
      CREATE INDEX IF NOT EXISTS idx_soul_pool_status ON soul_pool(status);
      CREATE INDEX IF NOT EXISTS idx_soul_pool_entry_time ON soul_pool(pool_entry_time);
      CREATE INDEX IF NOT EXISTS idx_population_history_layer ON population_history(layer_id, timestamp);

      CREATE TABLE IF NOT EXISTS clans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        nation TEXT NOT NULL,
        level INTEGER DEFAULT 1,
        territory_x INTEGER DEFAULT 0,
        territory_y INTEGER DEFAULT 0,
        storage_spirit_stones INTEGER DEFAULT 0,
        grudges_json TEXT,
        active_bounties_json TEXT
      );
    `);
  }

  getDatabase(): Database.Database {
    return this.db;
  }

  async savePlayer(data: any): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO players 
      (id, name, country, family_id, realm, cultivation, health, max_health, spirit, max_spirit, 
       attack, defense, move_speed, spirit_stones, pos_x, pos_y, state, created_at, last_login_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      data.id, data.name, data.country, data.familyId, data.realm, data.cultivation,
      data.attributes.health, data.attributes.maxHealth, data.attributes.spirit, data.attributes.maxSpirit,
      data.attributes.attack, data.attributes.defense, data.attributes.moveSpeed, data.attributes.spiritStone,
      data.position.x, data.position.y, data.state, data.createdAt, data.lastLoginAt
    );
  }

  async loadPlayer(playerId: string): Promise<any | null> {
    const stmt = this.db.prepare('SELECT * FROM players WHERE id = ?');
    const row = stmt.get(playerId) as any;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      country: row.country,
      familyId: row.family_id,
      realm: row.realm,
      cultivation: row.cultivation,
      attributes: {
        health: row.health,
        maxHealth: row.max_health,
        spirit: row.spirit,
        maxSpirit: row.max_spirit,
        attack: row.attack,
        defense: row.defense,
        moveSpeed: row.move_speed,
        spiritStone: row.spirit_stones
      },
      position: { x: row.pos_x, y: row.pos_y },
      state: row.state,
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at
    };
  }

  async saveNPC(data: any): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO npcs 
      (id, name, clan_id, nation, role, realm, power, hp, max_hp, mp, max_mp, activity, 
       position_x, position_y, personality_ambition, personality_caution, personality_loyalty, 
       personality_greed, birth_time, birth_type, layer_id, state, resources_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      data.id, data.name, data.clanId, data.nation, data.role, data.realm, data.power,
      data.hp, data.maxHp, data.mp, data.maxMp, data.activity, data.position.x, data.position.y,
      data.personality.ambition, data.personality.caution, data.personality.loyalty, data.personality.greed,
      data.birthTime, data.birthType, data.layer, data.state, JSON.stringify(data.resources)
    );
  }

  async loadNPCs(): Promise<any[]> {
    const stmt = this.db.prepare('SELECT * FROM npcs');
    const rows = stmt.all() as any[];
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      clanId: row.clan_id,
      nation: row.nation,
      role: row.role,
      realm: row.realm,
      power: row.power,
      hp: row.hp,
      maxHp: row.max_hp,
      mp: row.mp,
      maxMp: row.max_mp,
      activity: row.activity,
      position: { x: row.position_x, y: row.position_y },
      personality: {
        ambition: row.personality_ambition,
        caution: row.personality_caution,
        loyalty: row.personality_loyalty,
        greed: row.personality_greed
      },
      birthTime: row.birth_time,
      birthType: row.birth_type,
      layer: row.layer_id,
      state: row.state,
      resources: JSON.parse(row.resources_json || '{}')
    }));
  }

  async saveSoul(data: any): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO soul_pool 
      (id, original_npc_id, original_clan_id, original_nation, original_realm, death_cause, death_time, pool_entry_time, inherited_resources, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(data.id, data.originalNpcId, data.originalClanId, data.originalNation, data.originalRealm,
      data.deathCause, data.deathTime, data.poolEntryTime, data.inheritedResources, 'waiting');
  }

  async getSoulPoolStatus(): Promise<any> {
    const stmt = this.db.prepare('SELECT * FROM soul_pool WHERE status = ?');
    const souls = stmt.all('waiting') as any[];
    const byRealm: Record<string, number> = {};
    const byNation: Record<string, number> = {};
    const byDeathCause: Record<string, number> = {};
    
    for (const soul of souls) {
      byRealm[soul.original_realm] = (byRealm[soul.original_realm] || 0) + 1;
      byNation[soul.original_nation] = (byNation[soul.original_nation] || 0) + 1;
      byDeathCause[soul.death_cause] = (byDeathCause[soul.death_cause] || 0) + 1;
    }
    
    return {
      totalCount: souls.length,
      byRealm,
      byNation,
      byDeathCause
    };
  }
}