export interface DecisionLogEntry {
  frame: number;
  oldActivity: string;
  newActivity: string;
  reason: string;
  triggerLayer: number;
  weightDelta: number;
  tagSimilarityScore: number;
  narrativeSnippet: string;
}

export const DECISION_REVEAL_WINDOW_FRAMES = 86400;

const NPCActivityNames: Record<number, string> = {
  0: 'Idle',
  1: 'Dead',
  10: 'Flee',
  11: 'Heal',
  12: 'Defend',
  20: 'Eat',
  21: 'Rest',
  22: 'Sleep',
  23: 'Walk',
  24: 'Chat',
  25: 'AwaitOrders',
  30: 'Cultivate',
  31: 'Breakthrough',
  32: 'Tribulation',
  33: 'Meditate',
  34: 'Alchemy',
  35: 'SeekFortune',
  40: 'VisitFriend',
  41: 'Date',
  42: 'FamilyGathering',
  43: 'MentorTeach',
  44: 'DiscipleAsk',
  45: 'Trade',
  46: 'Gossip',
  47: 'ReportTask',
  48: 'RefuseCommand',
  49: 'CoordinateSquad',
  50: 'Build',
  51: 'Mine',
  52: 'Farm',
  53: 'Fish',
  54: 'Lumber',
  55: 'Gather',
  56: 'Attack',
  57: 'DefendPosition',
  58: 'Patrol',
  59: 'Escort',
  60: 'Scout',
  70: 'Craft',
  71: 'Refine',
  72: 'Cook',
  73: 'Tailor',
  74: 'Construct',
  75: 'Repair',
  80: 'Buy',
  81: 'Sell',
  82: 'Bargain',
  90: 'Duel',
  91: 'Hunt',
  92: 'Ambush',
  93: 'Assassinate',
  100: 'Explore',
  101: 'TreasureHunt',
  102: 'MapExplore',
  200: 'Incapacitated',
};

const DecisionReasonNames: Record<number, string> = {
  1: 'SurvivalLowHP',
  2: 'SurvivalRecovery',
  10: 'EmotionAnger',
  11: 'EmotionFear',
  12: 'EmotionJoy',
  20: 'CommandExecute',
  21: 'CommandRefuse',
  30: 'LLMPlanStep',
  40: 'SocialVisit',
  41: 'SocialDate',
  42: 'SocialTeach',
  43: 'SocialGossip',
  50: 'CultivationDaily',
  51: 'CultivationBreakthrough',
  52: 'CultivationTribulation',
  53: 'CultivationSeekFortune',
  60: 'DailyNeed',
  61: 'DailyReflection',
  62: 'DailyReflectionRecover',
  63: 'DailyMicroPlan',
  64: 'DailyRoleDefault',
};

export const MoodQualifierMap: Record<string, string> = {
  SurvivalLowHP: '受重伤',
  EmotionAnger: '愤怒中',
  EmotionFear: '恐惧中',
  DailyReflection: '沮丧中',
  DailyReflectionRecover: '重拾信心',
  DailyMicroPlan: '思变中',
  DailyRoleDefault: '如常',
  CommandExecute: '执行命令中',
  SocialVisit: '社交中',
  CultivationDaily: '修炼中',
};

export const CareerChineseNameMap: Record<string, string> = {
  Miner: '矿工',
  Farmer: '农夫',
  Fisher: '渔夫',
  Smith: '铁匠',
  Cultivator: '修士',
  Merchant: '商贾',
  Soldier: '兵士',
  General: '通用',
};

const ActivityCareerMap: Record<number, string> = {
  0: '通用',
  1: '通用',
  10: '通用',
  11: '通用',
  12: '兵士',
  20: '通用',
  21: '通用',
  22: '通用',
  23: '通用',
  24: '通用',
  25: '兵士',
  30: '修士',
  31: '修士',
  32: '修士',
  33: '修士',
  34: '修士',
  35: '修士',
  40: '通用',
  41: '通用',
  42: '通用',
  43: '修士',
  44: '修士',
  45: '商贾',
  46: '通用',
  47: '兵士',
  48: '兵士',
  49: '兵士',
  50: '通用',
  51: '矿工',
  52: '农夫',
  53: '渔夫',
  54: '农夫',
  55: '通用',
  56: '兵士',
  57: '兵士',
  58: '兵士',
  59: '兵士',
  60: '兵士',
  70: '铁匠',
  71: '铁匠',
  72: '农夫',
  73: '铁匠',
  74: '铁匠',
  75: '铁匠',
  80: '商贾',
  81: '商贾',
  82: '商贾',
  90: '兵士',
  91: '平民',
  92: '兵士',
  93: '兵士',
  100: '通用',
  101: '通用',
  102: '通用',
  200: '通用',
};

function getCareerForActivity(activityName: string): string {
  for (const [id, name] of Object.entries(NPCActivityNames)) {
    if (name === activityName) {
      return ActivityCareerMap[Number(id)] ?? '平民';
    }
  }
  return '平民';
}

interface WasmBehaviorComponent {
  decisionLogWriteIndex: number;
  decisionLogCount: number;
  decisionLog: {
    get: (index: number) => {
      frame: number;
      oldActivity: number;
      newActivity: number;
      reason: number;
      triggerLayer: number;
      weightDelta: number;
      tagSimilarityScore: number;
      narrativeSnippet: string;
    };
  };
}

interface WasmPersonalityComponent {
  caution: number;
  diligence: number;
  ambition: number;
  sociability: number;
}

interface WasmModule {
  getBehaviorComponent(npcId: number): WasmBehaviorComponent | null;
  getPersonalityComponent(npcId: number): WasmPersonalityComponent | null;
}

function getWasmModule(): WasmModule | null {
  try {
    const { NPCWorldService } = require('../../services/NPCWorldService');
    const wasm = NPCWorldService.getInstance().getWasm?.();
    return wasm ?? null;
  } catch {
    return null;
  }
}

export class DecisionLogService {
  private static instance: DecisionLogService;

  private constructor() {}

  static getInstance(): DecisionLogService {
    if (!DecisionLogService.instance) {
      DecisionLogService.instance = new DecisionLogService();
    }
    return DecisionLogService.instance;
  }

  getDecisionLog(npcId: number, count?: number): DecisionLogEntry[] {
    const wasm = getWasmModule();
    if (!wasm) return [];

    const behaviorComp = wasm.getBehaviorComponent(npcId);
    if (!behaviorComp) return [];

    const totalEntries = behaviorComp.decisionLogCount;
    if (totalEntries === 0) return [];

    const resultCount = count && count < totalEntries ? count : totalEntries;

    const entries: DecisionLogEntry[] = [];
    const writeIdx = behaviorComp.decisionLogWriteIndex;
    const capacity = 500;
    const startIdx = totalEntries < capacity
      ? 0
      : writeIdx;

    for (let i = 0; i < resultCount; i++) {
      let rawIdx: number;
      if (totalEntries < capacity) {
        rawIdx = (startIdx + i) % capacity;
      } else {
        rawIdx = (startIdx + i) % capacity;
        if (rawIdx === writeIdx && i < resultCount - 1) {
          rawIdx = (rawIdx + 1) % capacity;
        }
      }

      try {
        const raw = behaviorComp.decisionLog.get(rawIdx);
        if (!raw) continue;

        entries.push({
          frame: typeof raw.frame === 'number' ? raw.frame : Number(raw.frame),
          oldActivity: NPCActivityNames[raw.oldActivity] ?? `Unknown(${raw.oldActivity})`,
          newActivity: NPCActivityNames[raw.newActivity] ?? `Unknown(${raw.newActivity})`,
          reason: DecisionReasonNames[raw.reason] ?? `Unknown(${raw.reason})`,
          triggerLayer: raw.triggerLayer,
          weightDelta: raw.weightDelta,
          tagSimilarityScore: raw.tagSimilarityScore,
          narrativeSnippet: raw.narrativeSnippet ?? '',
        });
      } catch {
        continue;
      }
    }

    return entries;
  }

  getRecentDecisions(npcId: number, frameRange: number): DecisionLogEntry[] {
    const allEntries = this.getDecisionLog(npcId);
    if (allEntries.length === 0) return [];

    const latestFrame = allEntries[allEntries.length - 1].frame;
    const minFrame = latestFrame - frameRange;

    return allEntries.filter((entry) => entry.frame >= minFrame);
  }

  getPlayerFacingSummary(npcId: number): string | null {
    const entries = this.getDecisionLog(npcId, 1);
    if (entries.length === 0) return null;

    const entry = entries[0];
    const career = getCareerForActivity(entry.oldActivity);
    const mood = MoodQualifierMap[entry.reason] ?? '';
    const snippet = entry.narrativeSnippet || '';

    if (mood) {
      return `(${career}·${mood}) ${snippet}`;
    }
    return `(${career}) ${snippet}`;
  }

  buildBehaviorAwareDialogue(npcId: number, playerId: number): string | null {
    const entries = this.getDecisionLog(npcId, 3);
    if (entries.length === 0) return null;

    const wasm = getWasmModule();
    let caution = 50;
    if (wasm) {
      const personality = wasm.getPersonalityComponent(npcId);
      if (personality) {
        caution = personality.caution;
      }
    }

    let revealProbability: number;
    if (caution >= 70) {
      revealProbability = 0.3;
    } else if (caution < 30) {
      revealProbability = 0.8;
    } else {
      revealProbability = 0.5;
    }

    const roll = Math.random();
    if (roll >= revealProbability) return null;

    const latestEntry = entries[0];
    const latestFrame = latestEntry.frame;
    const windowStart = latestFrame - DECISION_REVEAL_WINDOW_FRAMES;

    const recentEntries = entries.filter((e) => e.frame >= windowStart);

    for (const entry of recentEntries) {
      const dialogue = this.generateDialogueForReason(entry.reason, entry.narrativeSnippet);
      if (dialogue) return dialogue;
    }

    return null;
  }

  private generateDialogueForReason(reason: string, snippet: string): string | null {
    switch (reason) {
      case 'DailyReflection':
        return snippet || '最近这行当不太顺利啊……';
      case 'EmotionFear':
        return snippet || '最近这里不太平，我得小心点……';
      case 'EmotionAnger':
        return snippet || '欺人太甚！这口气我咽不下……';
      case 'DailyMicroPlan':
        return snippet || '这路子走不通了，得想个新门路……';
      case 'DailyReflectionRecover':
        return snippet || '说起来，好久没做那事了，再去试试？';
      case 'CommandExecute':
        return snippet || '上头有令，不得不去办啊……';
      case 'SurvivalLowHP':
        return snippet || '伤得不轻，得缓缓……';
      case 'DailyRoleDefault':
        return snippet || '按本分过日子吧……';
      case 'SocialVisit':
        return snippet || '该去看看老朋友了……';
      case 'CultivationDaily':
        return snippet || '修行不可荒废啊……';
      default:
        return null;
    }
  }
}
