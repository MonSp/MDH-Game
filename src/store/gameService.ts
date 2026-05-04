import type { NPC } from './gameConstants';

export enum InitiativeType {
  GREETING = 'greeting',
  TRADE_OFFER = 'trade_offer',
  CHALLENGE = 'challenge',
  PLEA = 'plea',
  ENCOUNTER = 'encounter',
}

export interface InitiativeEvent {
  id: string;
  type: InitiativeType;
  npcId?: string;
  npcName: string;
  npcRole?: string;
  message: string;
  timestamp: number;
  expiresAt: number;
  /** Encounter choices — only set for ENCOUNTER type */
  encounterChoices?: EncounterChoice[];
}

export interface EncounterChoice {
  text: string;
  log: string;
  stonesDelta?: number;
  expDelta?: number;
}

interface EncounterTemplate {
  message: string;
  choices: EncounterChoice[];
}

const ENCOUNTER_EVENTS: EncounterTemplate[] = [
  {
    message: '你在路边发现了一个破损的储物袋，似乎是某位修士遗落的。',
    choices: [
      { text: '打开看看', log: '你打开了储物袋，获得了 50 块灵石！', stonesDelta: 50 },
      { text: '留在原地', log: '你决定不动他人的遗物。' },
    ],
  },
  {
    message: '一只受伤的灵兽幼崽蜷缩在灌木丛中，瑟瑟发抖。',
    choices: [
      { text: '救治它', log: '你消耗了一些灵力为灵兽疗伤，它感激地舔了舔你的手。', expDelta: 30 },
      { text: '绕道而行', log: '你不愿多管闲事，继续赶路。' },
    ],
  },
  {
    message: '你听到路边的散修在低声交谈：「听说了吗？东边的遗迹里出土了一件上古法器！」',
    choices: [
      { text: '凑近打听', log: '你从散修口中套出了更多消息。' },
      { text: '不感兴趣', log: '你对这种传言不以为意。' },
    ],
  },
  {
    message: '两个黑衣蒙面人从树后跳出来：「此山是我开，此树是我栽！留下灵石，饶你不死！」',
    choices: [
      { text: '拔剑迎战', log: '你击退了两个毛贼！', expDelta: 50 },
      { text: '破财消灾', log: '你交出 30 块灵石，他们满意地离开了。', stonesDelta: -30 },
    ],
  },
  {
    message: '一位白发老翁正在悬崖边采药，见到你后招手：「小友，能否帮老朽一个小忙？」',
    choices: [
      { text: '帮忙', log: '你帮老人采集了几味稀有药材，他感激地赠予你一枚丹药。', expDelta: 40 },
      { text: '婉拒', log: '你表示自己还有要事在身，老人有些失望。' },
    ],
  },
];

export class InitiativeService {
  private static instance: InitiativeService;
  private pendingEvents: InitiativeEvent[] = [];
  private lastActivationTime: Map<string, number> = new Map();
  private encounterCooldown = 0;

  private readonly PROXIMITY_RANGE = 4;
  private readonly NPC_COOLDOWN_MS = 25000;
  private readonly NPC_CHANCE_PER_TICK = 0.06;
  private readonly ENCOUNTER_COOLDOWN_MS = 45000;

  private constructor() {}

  static getInstance(): InitiativeService {
    if (!InitiativeService.instance) {
      InitiativeService.instance = new InitiativeService();
    }
    return InitiativeService.instance;
  }

  getPendingEvents(): InitiativeEvent[] {
    const now = Date.now();
    this.pendingEvents = this.pendingEvents.filter(e => now < e.expiresAt);
    return [...this.pendingEvents];
  }

  dismissEvent(id: string): void {
    this.pendingEvents = this.pendingEvents.filter(e => e.id !== id);
  }

  /** Called each game tick. Checks proximity and generates events. */
  tick(playerPos: { x: number; y: number }, nearbyNPCs: NPC[]): InitiativeEvent[] {
    const now = Date.now();
    const newEvents: InitiativeEvent[] = [];

    for (const npc of nearbyNPCs) {
      const dist = Math.abs(npc.position.x - playerPos.x) + Math.abs(npc.position.y - playerPos.y);
      if (dist > this.PROXIMITY_RANGE) continue;

      const lastTime = this.lastActivationTime.get(npc.id) ?? 0;
      if (now - lastTime < this.NPC_COOLDOWN_MS) continue;

      let chance = this.NPC_CHANCE_PER_TICK;
      if (npc.personality.ambition > 70) chance += 0.02;
      if (npc.personality.caution < 30) chance += 0.02;
      if (npc.personality.loyalty > 80) chance += 0.01;

      if (Math.random() > chance) continue;

      const event = this.generateInteraction(npc, dist, now);
      if (event) {
        this.lastActivationTime.set(npc.id, now);
        this.pendingEvents.push(event);
        newEvents.push(event);
      }
    }

    if (now > this.encounterCooldown && Math.random() < 0.03) {
      const event = this.generateEncounter(now);
      if (event) {
        this.encounterCooldown = now + this.ENCOUNTER_COOLDOWN_MS;
        this.pendingEvents.push(event);
        newEvents.push(event);
      }
    }

    return newEvents;
  }

  private generateInteraction(npc: NPC, dist: number, now: number): InitiativeEvent | null {
    const hpRatio = npc.hp / npc.maxHp;
    const { ambition, caution, loyalty, greed } = npc.personality;
    const roll = Math.random();

    if (hpRatio < 0.3 && roll < 0.35) {
      return {
        id: `plea-${npc.id}-${now}`,
        type: InitiativeType.PLEA,
        npcId: npc.id,
        npcName: npc.name,
        npcRole: npc.role,
        message: `${npc.name}面色苍白，虚弱地对你说：「道友…我受了重伤，能否赐予一些丹药或灵石？」`,
        timestamp: now,
        expiresAt: now + 15000,
      };
    }

    if (ambition > 60 && caution < 50 && roll < 0.3) {
      return {
        id: `challenge-${npc.id}-${now}`,
        type: InitiativeType.CHALLENGE,
        npcId: npc.id,
        npcName: npc.name,
        npcRole: npc.role,
        message: `${npc.name}拦住了你的去路，冷声道：「我${npc.role}${npc.name}，想领教一下道友的高招！」`,
        timestamp: now,
        expiresAt: now + 20000,
      };
    }

    if (greed > 55 && dist <= 2 && roll < 0.35) {
      return {
        id: `trade-${npc.id}-${now}`,
        type: InitiativeType.TRADE_OFFER,
        npcId: npc.id,
        npcName: npc.name,
        npcRole: npc.role,
        message: `${npc.name}走近你，低声道：「道友可需要上好的丹药？价格公道，童叟无欺。」`,
        timestamp: now,
        expiresAt: now + 15000,
      };
    }

    const greetings = loyalty > 70
      ? [
          `${npc.name}热情地招呼你：「道友！又见面了，近来可好？」`,
          `${npc.name}关切地问：「道友面色红润，修为又有精进了吧？」`,
          `${npc.name}笑道：「道友来得正好，我刚得了些好茶。」`,
        ]
      : [
          `${npc.name}向你点头致意：「${npc.role}${npc.name}，有礼了。」`,
          `${npc.name}看了你一眼：「这位道友面生得很，可是新来的？」`,
          `${npc.name}微笑道：「${npc.role}${npc.name}，在此巡值，道友请便。」`,
        ];

    return {
      id: `greeting-${npc.id}-${now}`,
      type: InitiativeType.GREETING,
      npcId: npc.id,
      npcName: npc.name,
      npcRole: npc.role,
      message: greetings[Math.floor(Math.random() * greetings.length)],
      timestamp: now,
      expiresAt: now + 12000,
    };
  }

  private generateEncounter(now: number): InitiativeEvent | null {
    const template = ENCOUNTER_EVENTS[Math.floor(Math.random() * ENCOUNTER_EVENTS.length)];
    return {
      id: `encounter-${now}`,
      type: InitiativeType.ENCOUNTER,
      npcName: '',
      message: template.message,
      timestamp: now,
      expiresAt: now + 30000,
      encounterChoices: template.choices,
    };
  }

  /** Resolve an encounter choice — returns the log message and resource changes. */
  resolveEncounter(eventId: string, choiceIndex: number): { log: string; stonesDelta: number; expDelta: number } | null {
    const event = this.pendingEvents.find(e => e.id === eventId && e.type === InitiativeType.ENCOUNTER);
    if (!event) return null;

    const template = ENCOUNTER_EVENTS.find(t => t.message === event.message);
    if (!template || choiceIndex < 0 || choiceIndex >= template.choices.length) return null;

    this.dismissEvent(eventId);
    const choice = template.choices[choiceIndex];
    return { log: choice.log, stonesDelta: choice.stonesDelta ?? 0, expDelta: choice.expDelta ?? 0 };
  }

  reset(): void {
    this.pendingEvents = [];
    this.lastActivationTime.clear();
    this.encounterCooldown = 0;
  }
}
