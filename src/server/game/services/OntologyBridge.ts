export interface SemanticEmotionState {
  value: number;
  state: string;
  above_threshold: boolean;
  threshold: number;
}

export interface SemanticNeedsState {
  hunger: string;
  fatigue: string;
  social: string;
  energy: string;
  mood: string;
}

export interface SemanticTemperament {
  ambition: string;
  caution: string;
  loyalty: string;
  greed: string;
  sociability: string;
  diligence: string;
  dominant_trait: string;
}

export interface SemanticBehaviorProfile {
  current_activity: string;
  current_category: string;
  activity_tags: {
    career: string;
    resource: string[];
    personality: string[];
  };
  reflection_preferences: Array<{ activity: string; weight: number; status: string }>;
  reflection_avoidances: Array<{ activity: string; weight: number; status: string }>;
  recent_decisions: Array<{ from: string; to: string; reason: string; snippet: string }>;
  micro_plan_active: boolean;
  micro_plan_activity?: string;
}

export interface SemanticSocialNetwork {
  allies: Array<{ name: string; slot: number; affinity: number; relation: string }>;
  rivals: Array<{ name: string; slot: number; affinity: number; hostility_reason: string }>;
  spouse?: string;
  mentor?: string;
  disciple_count: number;
}

export interface SemanticNPCProfile {
  identity: {
    name: string;
    role_hierarchy: string;
    clan_standing: string;
    cultivation_stage: string;
  };
  temperament: SemanticTemperament;
  emotional_state: {
    anger: SemanticEmotionState;
    fear: SemanticEmotionState;
    joy: SemanticEmotionState;
    dominant_emotion: string;
  };
  needs: SemanticNeedsState;
  behavioral_profile: SemanticBehaviorProfile;
  social_network: SemanticSocialNetwork;
}

export interface CausalChainStep {
  effect: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface CausalChain {
  trigger: string;
  steps: CausalChainStep[];
  risk_projection: string;
  countermeasures: Array<{
    action: string;
    effect: string;
    cost: string;
    risk: string;
  }>;
}

export interface ActivityOntology {
  activity: string;
  category: string;
  economic_role: string;
  value_chain_position: string;
  preconditions: string[];
  produces: Array<{ resource: string; amount: string }>;
  consumes: Array<{ resource: string; amount: string }>;
  economic_effect: string;
  behavioral_economics: string;
}

export interface OntologicalWorldSnapshot {
  temporal: { frame: number; day: number };
  nations: Array<{
    name: string;
    economic_posture: string;
    treasury: number;
    weekly_trend: string;
    critical_alerts: string[];
  }>;
  value_chain_health: Array<{
    commodity: string;
    supply_trend: string;
    price_trend: string;
  }>;
}

const ACTIVITY_CHINESE: Record<number, string> = {
  0: '待命',
  1: '死亡',
  10: '逃跑',
  11: '疗伤',
  12: '防御',
  20: '进食',
  21: '休息',
  22: '睡眠',
  23: '行走',
  24: '闲聊',
  25: '待命听令',
  30: '修炼',
  31: '突破',
  32: '渡劫',
  33: '冥想',
  34: '炼丹',
  35: '寻缘',
  40: '访友',
  41: '约会',
  42: '家族聚会',
  43: '师授',
  44: '请教',
  45: '交易',
  46: '八卦',
  47: '汇报任务',
  48: '抗命',
  49: '协调小队',
  50: '建造',
  51: '采矿',
  52: '耕种',
  53: '捕鱼',
  54: '伐木',
  55: '采集',
  56: '进攻',
  57: '驻守',
  58: '巡逻',
  59: '护送',
  60: '侦察',
  70: '锻造',
  71: '精炼',
  72: '烹饪',
  73: '裁缝',
  74: '营造',
  75: '修缮',
  80: '收购',
  81: '出售',
  82: '议价',
  83: '求助',
  90: '决斗',
  91: '狩猎',
  92: '伏击',
  93: '暗杀',
  100: '探索',
  101: '寻宝',
  102: '地图探索',
  103: '设定税率',
  104: '贸易禁运',
  105: '囤积物资',
  106: '稳定物价',
  107: '经济动员',
  200: '重伤不起',
};

const ACTIVITY_CATEGORY_MAP: Record<number, number> = {
  0: 1, 1: 0,
  10: 0, 11: 0, 12: 0,
  20: 1, 21: 1, 22: 1, 23: 1, 24: 1, 25: 1,
  30: 2, 31: 2, 32: 2, 33: 2, 34: 2, 35: 2,
  40: 3, 41: 3, 42: 3, 43: 3, 44: 3, 45: 3, 46: 3, 47: 3, 48: 3, 49: 3, 83: 3,
  50: 4, 51: 4, 52: 4, 53: 4, 54: 4, 55: 4,
  70: 4, 71: 4, 72: 4, 73: 4, 74: 4, 75: 4,
  80: 4, 81: 4, 82: 4,
  56: 5, 57: 5, 58: 5, 59: 5, 60: 5,
  90: 5, 91: 5, 92: 5, 93: 5,
  100: 6, 101: 6, 102: 6,
  103: 8, 104: 8, 105: 8, 106: 8, 107: 8,
  200: 0,
};

const CATEGORY_CHINESE: Record<number, string> = {
  0: '生存',
  1: '日常',
  2: '修炼',
  3: '社交',
  4: '生产',
  5: '战斗',
  6: '探索',
  7: '指令',
  8: '经济战略',
};

const COMMODITY_NAMES: Record<number, string> = {
  0: '矿石', 1: '食物', 2: '装备', 3: '材料', 4: '丹药', 5: '灵石',
};

const WEAKNESS_NAMES: Record<number, string> = {
  0: '', 1: '食物依赖进口', 2: '库房灵石见底', 3: '材料严重短缺', 4: '灵石通胀', 5: '装备严重短缺',
};

const CAREER_TAG_CHINESE: Record<number, string> = {
  1: '矿工', 2: '渔夫', 4: '铁匠', 8: '农夫', 16: '猎人', 32: '修士',
  64: '商贾', 128: '兵士', 256: '将领', 512: '统治者', 1024: '统帅', 2048: '长老',
};

const RESOURCE_TAG_CHINESE: Record<number, string> = {
  1: '产出灵石', 2: '产出食物', 4: '产出装备', 8: '产出材料', 16: '产出修为',
  32: '消耗精力', 64: '消耗灵石', 128: '需要水源', 256: '需要矿脉', 512: '需要林地', 1024: '需要建筑',
};

const PERSONALITY_TAG_CHINESE: Record<number, string> = {
  1: '偏好独处', 2: '偏好合作', 4: '风险追求', 8: '风险厌恶',
  16: '高强度', 32: '低强度', 64: '重复劳动', 128: '创造性劳动',
  256: '雄心勃勃', 512: '谨慎行事', 1024: '勤勉', 2048: '忠诚',
};

const ACTIVITY_CAREER_ID: Record<number, number> = {
  0: 0, 1: 0,
  10: 0, 11: 0, 12: 128,
  20: 0, 21: 0, 22: 0, 23: 0, 24: 0, 25: 128,
  30: 32, 31: 32, 32: 32, 33: 32, 34: 32, 35: 32,
  40: 0, 41: 0, 42: 0, 43: 32, 44: 32, 45: 64, 46: 0, 47: 128, 48: 128, 49: 128, 83: 0,
  50: 0, 51: 1, 52: 8, 53: 2, 54: 8, 55: 0,
  56: 128, 57: 128, 58: 128, 59: 128, 60: 128,
  70: 4, 71: 4, 72: 8, 73: 4, 74: 4, 75: 4,
  80: 64, 81: 64, 82: 64,
  90: 128, 91: 16, 92: 128, 93: 128,
  100: 0, 101: 0, 102: 0,
  103: 512, 104: 512, 105: 1024, 106: 1024, 107: 2048,
  200: 0,
};

const ACTIVITY_RESOURCE_IDS: Record<number, number[]> = {
  10: [32], 11: [32, 64], 12: [32],
  30: [16, 32], 31: [16, 32, 64], 32: [16, 32], 33: [16], 34: [4, 8, 32, 64, 1024], 35: [16, 8],
  45: [1, 64],
  50: [4, 32, 64, 1024], 51: [1, 32, 256], 52: [1, 2, 32, 512], 53: [1, 2, 32, 128],
  54: [8, 32, 512], 55: [8, 32],
  56: [32], 57: [32], 58: [32], 59: [32], 60: [32],
  70: [4, 32, 64, 1024], 71: [8, 32, 64, 1024], 72: [2, 32, 1024], 73: [4, 32, 1024],
  74: [4, 32, 1024], 75: [4, 32],
  80: [4, 8, 64], 81: [1, 32], 82: [1],
  91: [1, 2, 8, 32],
  100: [8], 101: [1, 8], 102: [8],
  103: [1], 105: [8], 106: [1],
};

const ACTIVITY_PERSONALITY_IDS: Record<number, number[]> = {
  10: [8, 1], 11: [8, 1], 12: [4, 2],
  20: [1, 32], 21: [1, 32], 22: [1, 32], 23: [1, 32], 24: [2, 32], 25: [2, 32],
  30: [1, 4], 31: [4, 1], 32: [4, 1], 33: [1, 8, 32], 34: [128, 1], 35: [4, 1],
  40: [2, 32], 41: [2], 42: [2, 32], 43: [2], 44: [2], 45: [2], 46: [2], 47: [2], 48: [4, 1], 49: [2], 83: [2],
  50: [128, 16], 51: [16, 64, 1], 52: [64, 1], 53: [32, 1, 64], 54: [16, 64, 1], 55: [32, 64],
  56: [4, 2, 16], 57: [8, 2], 58: [8, 1, 64], 59: [8, 2], 60: [4, 1],
  70: [128], 71: [64, 1], 72: [128], 73: [128, 1], 74: [16, 128], 75: [64, 1],
  80: [2, 32], 81: [2, 32], 82: [2],
  90: [4, 16], 91: [4, 1, 16], 92: [4, 1], 93: [4, 1, 16],
  100: [4, 1], 101: [4, 1], 102: [4, 1, 16],
  103: [256], 104: [512, 256], 105: [512], 106: [1024], 107: [1024, 2048],
};

const DECISION_REASON_CHINESE: Record<number, string> = {
  1: '保命撤退',
  2: '恢复状态',
  10: '怒火攻心',
  11: '恐惧驱使',
  12: '心情愉悦',
  20: '执行命令',
  21: '抗命不从',
  30: '战略规划',
  40: '社交访友',
  41: '道侣相会',
  42: '传授道法',
  43: '闲话家常',
  50: '日常修炼',
  51: '境界突破',
  52: '天劫渡劫',
  53: '外出寻缘',
  60: '生理需求',
  61: '经验反思',
  62: '重拾旧业',
  63: '尝试新路',
  64: '本分行事',
  65: '寻求帮助',
};

export function activityIdToChinese(id: number): string {
  return ACTIVITY_CHINESE[id] ?? '未知';
}

export function activityCategoryToChinese(id: number): string {
  return CATEGORY_CHINESE[id] ?? '未知';
}

export function reflectionWeightStatus(weight: number): string {
  if (weight > 1.3) return `强烈偏好(${weight.toFixed(2)})`;
  if (weight > 1.0) return `偏好(${weight.toFixed(2)})`;
  if (weight >= 0.95 && weight <= 1.05) return `中性(${weight.toFixed(2)})`;
  if (weight >= 0.8) return `回避(${weight.toFixed(2)})`;
  if (weight >= 0.5) return `强烈回避(${weight.toFixed(2)})`;
  return `极度回避(${weight.toFixed(2)})`;
}

function decodeBitmask(mask: number, table: Record<number, string>): string[] {
  const result: string[] = [];
  for (const bit of Object.keys(table).map(Number)) {
    if (mask & bit) {
      result.push(table[bit]);
    }
  }
  return result;
}

function resolveCategory(activityId: number): number {
  return ACTIVITY_CATEGORY_MAP[activityId] ?? 1;
}

const ONTOLOGY_DB: Record<number, ActivityOntology> = {};

function registerOntology(
  id: number,
  economic_role: string,
  value_chain_position: string,
  preconditions: string[],
  produces: Array<{ resource: string; amount: string }>,
  consumes: Array<{ resource: string; amount: string }>,
  economic_effect: string,
  behavioral_economics: string,
): void {
  ONTOLOGY_DB[id] = {
    activity: activityIdToChinese(id),
    category: activityCategoryToChinese(resolveCategory(id)),
    economic_role,
    value_chain_position,
    preconditions,
    produces,
    consumes,
    economic_effect,
    behavioral_economics,
  };
}

registerOntology(0, '闲置', '无', [], [], [], '无经济产出', '闲置是决策系统的默认状态');
registerOntology(1, '已陨落', '无', [], [], [], '劳动力永久损失', '死亡造成不可逆的经济损失');
registerOntology(10, '逃生者', '无', ['生命值低于阈值', '恐惧超过决断阈值'], [], [{ resource: '精力', amount: '持续消耗' }], '减少劳动力供给', '逃跑是理性选择：生命>产出');
registerOntology(11, '自愈者', '无', ['生命值受损', '有灵石储备'], [{ resource: '生命值', amount: '恢复至满' }], [{ resource: '精力', amount: '中等' }, { resource: '灵石', amount: '10-30' }], '减少即时产出但恢复未来产能', '健康是人力资本投资');
registerOntology(12, '防御者', '下游·军事', ['存在威胁', '体力充足'], [], [{ resource: '精力', amount: '中等' }], '无直接经济产出，保障生产安全', '防御是公共品：个人成本>个人收益');
registerOntology(20, '消费者', '终端', ['饥饿度>70'], [{ resource: '饥饿度', amount: '-40' }], [{ resource: '食物', amount: '1份' }], '食物消费驱动Food需求', '进食是生理刚性需求');
registerOntology(21, '休憩者', '终端', ['疲劳度>50'], [{ resource: '疲劳', amount: '-5/时' }, { resource: '精力', amount: '+8/时' }], [], '短期产出下降换取产能恢复', '休息是人力资本维护');
registerOntology(22, '睡眠者', '终端', ['疲劳度>80'], [{ resource: '疲劳', amount: '-50' }, { resource: '精力', amount: '+40' }], [], '长期产能恢复', '睡眠不可替代：透支精力的代价递增');
registerOntology(23, '行者', '无', ['体力充足'], [], [{ resource: '精力', amount: '少量' }], '位移成本', '移动成本常被低估');
registerOntology(24, '社交者', '社交网络', ['社交欲>60'], [{ resource: '社交欲', amount: '-25' }, { resource: '心情', amount: '+15' }], [], '间接提升士气和协作效率', '社交是社会资本投资');
registerOntology(25, '待命士兵', '军事', ['接受军令'], [], [], '劳动力锁定在军事部门', '待命机会成本=放弃生产');
registerOntology(30, '修士', '上游·无形资产', ['精力>30', '心情>20'], [{ resource: '修为', amount: '稳步增长' }], [{ resource: '精力', amount: '中等' }], '长期提升人力资本质量', '修炼是跨期投资：短期无产出换长期高回报');
registerOntology(31, '突破者', '上游·无形资产', ['修为进度100%', '灵石充足', '精力>50'], [{ resource: '修为', amount: '境界跃升' }], [{ resource: '精力', amount: '大量' }, { resource: '灵石', amount: '50-200' }], '人力资本阶跃式增长', '突破是高风险高回报的投资决策');
registerOntology(32, '渡劫者', '上游·无形资产', ['触发天劫', '精力充足'], [{ resource: '修为', amount: '天劫通过则境界飞升' }], [{ resource: '精力', amount: '大量' }], '生死博弈：通过则人力资本质变', '渡劫是不可控风险事件');
registerOntology(33, '冥想者', '上游·无形资产', ['无紧急事务'], [{ resource: '修为', amount: '缓慢增长' }], [], '低风险低回报的修为积累', '冥想适合低精力状态的保守策略');
registerOntology(34, '炼丹师', '中游·加工', ['有炼丹炉', '精力>40', '灵石>50'], [{ resource: '丹药', amount: '1-3颗(成功率60%)' }], [{ resource: '灵石', amount: '30-80' }, { resource: '精力', amount: '大量' }, { resource: '材料', amount: '若干' }], '增加Pills供给，降低丹药价格', '炼丹是技术密集型加工活动');
registerOntology(35, '寻缘者', '上游·投机', ['瓶颈期', '精力>40'], [{ resource: '修为', amount: '随机突破' }, { resource: '材料', amount: '随机获取' }], [{ resource: '精力', amount: '中等' }], '随机正外部性', '寻缘是期权策略：下行有限上行无限');
registerOntology(40, '访客', '社交网络', ['有目标好友'], [{ resource: '社交欲', amount: '-25' }, { resource: '心情', amount: '+15' }], [{ resource: '精力', amount: '少量' }], '维护社会资本', '社交网络价值随节点数超线性增长');
registerOntology(41, '道侣', '社交网络', ['有道侣关系'], [{ resource: '心情', amount: '+20' }, { resource: '社交欲', amount: '-30' }], [], '强化核心关系', '亲密关系是不可替代的社会资本');
registerOntology(42, '家族成员', '社交网络', ['家族活动'], [{ resource: '心情', amount: '+10' }, { resource: '社交欲', amount: '-20' }], [], '增强家族凝聚力', '家族聚会是集体行动的协调机制');
registerOntology(43, '师长', '上游·人力资本', ['有弟子', '境界>=筑基'], [{ resource: '弟子修为', amount: '显著增长' }], [{ resource: '精力', amount: '中等' }], '人力资本乘数效应', '教育是正外部性最强的活动');
registerOntology(44, '求学者', '上游·人力资本', ['有师长', '境界<师长'], [{ resource: '自身修为', amount: '加速增长' }], [{ resource: '精力', amount: '少量' }], '学习的边际收益递减', '请教是信息不对称下的理性选择');
registerOntology(45, '商贾', '中游·流通', ['有交易对象', '有灵石'], [{ resource: '灵石', amount: '利润(视差价)' }], [{ resource: '灵石', amount: '本金' }, { resource: '精力', amount: '少量' }], '促进商品流通，缩小价差', '交易是正和博弈：双方均获益');
registerOntology(46, '情报员', '社交网络', ['有社交对象'], [{ resource: '社交欲', amount: '-15' }, { resource: '情报', amount: '随机' }], [], '信息传播，影响市场价格预期', '八卦是低成本的信息采集');
registerOntology(47, '汇报者', '指挥链', ['接受过命令', '有上级'], [], [{ resource: '精力', amount: '极少' }], '维护指挥链信息流通', '汇报是委托代理关系中的信息对称机制');
registerOntology(48, '抗命者', '指挥链', ['收到不合理命令'], [], [], '破坏指挥链，降低组织效率', '抗命是个人理性与集体理性的冲突');
registerOntology(49, '协调者', '指挥链', ['有小队', '接受军令'], [], [{ resource: '精力', amount: '少量' }], '提升小队协作效率', '协调是交易成本的内部化');
registerOntology(50, '建筑师', '上游·基础设施', ['有蓝图', '材料充足', '灵石>100'], [{ resource: '建筑', amount: '1座' }], [{ resource: '材料', amount: '大量' }, { resource: '灵石', amount: '100+' }, { resource: '精力', amount: '大量' }], '增加基础设施存量', '基建是公共品投资：回报期长但外部性大');
registerOntology(51, '矿工', '上游·原材料', ['有矿脉', '体力>20'], [{ resource: '矿石', amount: '15/次' }], [{ resource: '精力', amount: '中等' }], '增加Ore供给，压低矿石价格', '边际报酬递减：连续采矿收益递减');
registerOntology(52, '农夫', '上游·原材料', ['有灵田', '体力>20'], [{ resource: '食物', amount: '10/次' }, { resource: '灵石', amount: '5/次' }], [{ resource: '精力', amount: '中等' }], '增加Food供给，保障食物安全', '农业是文明基石：食物价格弹性极低');
registerOntology(53, '渔夫', '上游·原材料', ['有水源', '体力>15'], [{ resource: '食物', amount: '8/次' }, { resource: '灵石', amount: '3/次' }], [{ resource: '精力', amount: '少量' }], '补充Food供给', '渔业是低门槛的补充生产');
registerOntology(54, '伐木工', '上游·原材料', ['有林地', '体力>25'], [{ resource: '材料', amount: '12/次' }], [{ resource: '精力', amount: '中等' }], '增加Materials供给', '伐木为Craft提供基础原料');
registerOntology(55, '采集者', '上游·原材料', ['有野外资源', '体力>15'], [{ resource: '材料', amount: '6/次' }], [{ resource: '精力', amount: '少量' }], '低效率材料获取', '采集是无矿脉时的替代方案');
registerOntology(56, '攻击者', '下游·军事', ['有攻击目标', '体力>30'], [], [{ resource: '精力', amount: '大量' }], '消耗敌方资源和人力', '进攻是主动博弈：收益取决于对手防御');
registerOntology(57, '驻守者', '下游·军事', ['有据点', '体力>20'], [], [{ resource: '精力', amount: '中等' }], '保障领地安全', '驻守是防御性公共品');
registerOntology(58, '巡逻者', '下游·军事', ['有防区', '体力>20'], [], [{ resource: '精力', amount: '中等' }], '威慑潜在入侵者', '巡逻是信号博弈：展示防御决心');
registerOntology(59, '护送者', '下游·军事', ['有护送任务', '体力>25'], [], [{ resource: '精力', amount: '中等' }], '保障物资运输安全', '护送降低贸易的交易成本');
registerOntology(60, '侦察兵', '下游·军事', ['有侦察目标', '体力>20'], [{ resource: '情报', amount: '战场信息' }], [{ resource: '精力', amount: '中等' }], '信息不对称优势', '侦察是信息投资：降低决策不确定性');
registerOntology(70, '锻造师', '中游·加工', ['有锻造炉', '精力>40', '矿石>5'], [{ resource: '装备', amount: '1件(70%概率)' }], [{ resource: '矿石', amount: '5' }, { resource: '精力', amount: '中等' }, { resource: '灵石', amount: '20' }], '将Ore转化为Equipment，提升价值链', '加工增值：原材料→成品，利润率取决于Skill');
registerOntology(71, '精炼师', '中游·加工', ['有炼器房', '精力>30', '材料>3'], [{ resource: '精炼材料', amount: '1-2份' }], [{ resource: '材料', amount: '3+' }, { resource: '精力', amount: '中等' }, { resource: '灵石', amount: '15' }], '提升Materials品质', '精炼是品质升级：低附加值→高附加值');
registerOntology(72, '厨师', '中游·加工', ['有厨房', '精力>20'], [{ resource: '食物', amount: '高品质(+50%效果)' }], [{ resource: '精力', amount: '少量' }], '提升Food品质和价值', '烹饪是价值增值加工');
registerOntology(73, '裁缝', '中游·加工', ['有工坊', '精力>30', '材料>2'], [{ resource: '装备', amount: '1件(布甲类)' }], [{ resource: '材料', amount: '2+' }, { resource: '精力', amount: '中等' }], '增加Equipment供给', '裁缝是低门槛的装备生产');
registerOntology(74, '营造师', '中游·加工', ['有工坊', '精力>40', '材料>10'], [{ resource: '建筑', amount: '1座(需时较长)' }], [{ resource: '材料', amount: '10+' }, { resource: '精力', amount: '大量' }], '长期基建投资', '营造是资本密集型生产');
registerOntology(75, '修缮师', '中游·维修', ['有受损设施', '精力>20'], [{ resource: '设施', amount: '恢复功能' }], [{ resource: '精力', amount: '少量' }], '恢复基础设施产能', '维修的边际成本远低于重建');
registerOntology(80, '采购者', '流通', ['有灵石', '有市场'], [{ resource: '商品', amount: '按市价购入' }], [{ resource: '灵石', amount: '采购金额' }], '增加本地供给', '批量采购享受规模经济');
registerOntology(81, '售货者', '流通', ['有库存商品', '有市场'], [{ resource: '灵石', amount: '销售收入' }], [{ resource: '商品', amount: '售出数量' }], '释放库存，回笼资金', '销售时机影响收益：惜售vs抛售');
registerOntology(82, '议价者', '流通', ['有交易对象'], [{ resource: '灵石', amount: '节省5-15%成本' }], [{ resource: '精力', amount: '少量' }], '降低交易成本', '议价能力取决于社交技能和信息优势');
registerOntology(83, '求助者', '社交网络', ['走投无路', '有求助对象'], [{ resource: '指引', amount: '可能获得新方向' }], [{ resource: '精力', amount: '极少' }], '信息搜索成本低但依赖社会资本', '求助是最后手段：社会资本耗尽则无人响应');
registerOntology(90, '决斗者', '军事', ['有对手', '体力>50'], [], [{ resource: '精力', amount: '大量' }], '个人武力展示，可能改变社交秩序', '决斗是信号传递：高成本证明实力');
registerOntology(91, '猎人', '上游·原材料', ['有猎场', '体力>30'], [{ resource: '食物', amount: '12/次' }, { resource: '材料', amount: '5/次' }, { resource: '灵石', amount: '8/次' }], [{ resource: '精力', amount: '大量' }], '综合性资源获取', '狩猎是高风险高回报的资源获取');
registerOntology(92, '伏击者', '下游·军事', ['有伏击目标', '地形有利'], [], [{ resource: '精力', amount: '中等' }], '以逸待劳，消耗敌方有生力量', '伏击是信息不对称下的最优策略');
registerOntology(93, '暗杀者', '下游·军事', ['有暗杀目标', '隐蔽条件'], [], [{ resource: '精力', amount: '大量' }], '精准打击敌方关键人员', '暗杀是不对称战争的极端手段');
registerOntology(100, '探索者', '上游·发现', ['精力>30'], [{ resource: '材料', amount: '随机' }], [{ resource: '精力', amount: '中等' }], '发现新资源点或路径', '探索是信息获取：降低未知区域的不确定性');
registerOntology(101, '寻宝者', '上游·投机', ['有线索或秘境', '精力>40'], [{ resource: '灵石', amount: '随机(可能极高)' }, { resource: '材料', amount: '随机稀有' }], [{ resource: '精力', amount: '大量' }], '随机高价值产出', '寻宝是极端风险偏好：方差极大');
registerOntology(102, '勘测者', '上游·发现', ['精力>40', '体力>30'], [{ resource: '材料', amount: '少量' }], [{ resource: '精力', amount: '大量' }], '扩大已知地图范围', '地图信息是公共品：一次探索多人受益');
registerOntology(103, '税务官', '上游·制度', ['有统治权'], [{ resource: '灵石', amount: '税收增加' }], [], '调节经济收入分配', '税率存在拉弗曲线效应：过高反而减少收入');
registerOntology(104, '禁运者', '上游·制度', ['有外交权', '有敌对目标'], [], [], '切断敌方贸易线路', '禁运是双刃剑：伤敌一千自损八百');
registerOntology(105, '囤积者', '上游·制度', ['有管理权', '有物资来源'], [{ resource: '战略储备', amount: '增加' }], [{ resource: '灵石', amount: '采购成本' }], '增加战略缓冲', '囤积是保险：降低短缺风险但占用资金');
registerOntology(106, '维稳者', '上游·制度', ['有管理权', '有灵石储备'], [{ resource: '物价稳定', amount: '降低波动' }], [{ resource: '灵石', amount: '干预成本' }], '平抑物价波动', '价格干预可能造成市场扭曲');
registerOntology(107, '动员者', '上游·制度', ['有最高权限', '紧急状态'], [], [], '全面调配资源至军事', '经济动员是战时最高效率但和平期浪费');
registerOntology(200, '重伤者', '无', ['生命值极低'], [], [], '劳动力完全丧失', '重伤是沉没成本：关键在于恢复速度');

export class OntologyBridge {

  static semanticizeEmotion(
    value: number,
    type: 'anger' | 'fear' | 'joy',
    caution?: number,
    sociability?: number,
  ): SemanticEmotionState {
    const v = Math.max(0, Math.min(100, value));
    let state: string;
    let threshold: number;

    if (type === 'anger') {
      if (v >= 70) state = '暴怒';
      else if (v >= 50) state = '愤怒';
      else if (v >= 30) state = '不悦';
      else state = '平静';
      threshold = 70 - (caution ?? 50) * 0.3;
    } else if (type === 'fear') {
      if (v >= 80) state = '恐慌';
      else if (v >= 60) state = '恐惧';
      else if (v >= 30) state = '警觉';
      else state = '无畏';
      threshold = 60;
    } else {
      if (v >= 80) state = '狂喜';
      else if (v >= 50) state = '愉悦';
      else if (v >= 30) state = '平和';
      else state = '低落';
      threshold = 80 - (sociability ?? 50) * 0.2;
    }

    return {
      value: v,
      state,
      above_threshold: v > threshold,
      threshold,
    };
  }

  static semanticizeNeeds(
    hunger: number,
    fatigue: number,
    socialDesire: number,
    energy: number,
    mood: number,
  ): SemanticNeedsState {
    const h = Math.max(0, Math.min(100, hunger));
    let hungerLabel: string;
    if (h < 30) hungerLabel = '饱腹';
    else if (h < 60) hungerLabel = '微饿';
    else if (h < 80) hungerLabel = '饥饿';
    else hungerLabel = '极度饥饿';

    const f = Math.max(0, Math.min(100, fatigue));
    let fatigueLabel: string;
    if (f < 30) fatigueLabel = '精力充沛';
    else if (f < 60) fatigueLabel = '略感疲倦';
    else if (f < 80) fatigueLabel = '疲惫';
    else fatigueLabel = '精疲力竭';

    const s = Math.max(0, Math.min(100, socialDesire));
    let socialLabel: string;
    if (s < 30) socialLabel = '自得其乐';
    else if (s < 60) socialLabel = '略有社交欲';
    else if (s < 80) socialLabel = '渴望社交';
    else socialLabel = '社交饥渴';

    const e = Math.max(0, Math.min(100, energy));
    let energyLabel: string;
    if (e > 70) energyLabel = '充沛';
    else if (e >= 40) energyLabel = '正常';
    else if (e >= 20) energyLabel = '低落';
    else energyLabel = '枯竭';

    const m = Math.max(0, Math.min(100, mood));
    let moodLabel: string;
    if (m > 70) moodLabel = '愉悦';
    else if (m >= 40) moodLabel = '平和';
    else if (m >= 20) moodLabel = '低落';
    else moodLabel = '沮丧';

    return {
      hunger: hungerLabel,
      fatigue: fatigueLabel,
      social: socialLabel,
      energy: energyLabel,
      mood: moodLabel,
    };
  }

  static semanticizeTemperament(personality: {
    ambition: number;
    caution: number;
    loyalty: number;
    greed: number;
    sociability: number;
    diligence: number;
  }): SemanticTemperament {
    function labelFor(
      value: number,
      labels: Array<{ min: number; label: string }>,
    ): string {
      const v = Math.max(0, Math.min(100, value));
      for (const entry of labels) {
        if (v >= entry.min) return `${entry.label}(${Math.round(v)})`;
      }
      return `${labels[labels.length - 1].label}(${Math.round(v)})`;
    }

    const ambition = labelFor(personality.ambition, [
      { min: 80, label: '壮志凌云' },
      { min: 60, label: '志向远大' },
      { min: 40, label: '中规中矩' },
      { min: 20, label: '安于现状' },
      { min: 0, label: '胸无大志' },
    ]);

    const caution = labelFor(personality.caution, [
      { min: 80, label: '步步为营' },
      { min: 60, label: '谨慎行事' },
      { min: 40, label: '稳健务实' },
      { min: 20, label: '略显冒进' },
      { min: 0, label: '鲁莽冲动' },
    ]);

    const loyalty = labelFor(personality.loyalty, [
      { min: 80, label: '赤胆忠心' },
      { min: 60, label: '忠厚可靠' },
      { min: 40, label: '尚可信任' },
      { min: 20, label: '摇摆不定' },
      { min: 0, label: '阳奉阴违' },
    ]);

    const greed = labelFor(personality.greed, [
      { min: 80, label: '贪婪无度' },
      { min: 60, label: '爱财如命' },
      { min: 40, label: '适度追求' },
      { min: 20, label: '淡泊名利' },
      { min: 0, label: '视金钱如粪土' },
    ]);

    const sociability = labelFor(personality.sociability, [
      { min: 80, label: '八面玲珑' },
      { min: 60, label: '善于交际' },
      { min: 40, label: '不温不火' },
      { min: 20, label: '沉默寡言' },
      { min: 0, label: '孤僻自闭' },
    ]);

    const diligence = labelFor(personality.diligence, [
      { min: 80, label: '废寝忘食' },
      { min: 60, label: '勤勉刻苦' },
      { min: 40, label: '中规中矩' },
      { min: 20, label: '好逸恶劳' },
      { min: 0, label: '好吃懒做' },
    ]);

    const dims: Array<{ key: string; value: number; label: string }> = [
      { key: 'ambition', value: personality.ambition, label: ambition.split('(')[0] },
      { key: 'caution', value: personality.caution, label: caution.split('(')[0] },
      { key: 'loyalty', value: personality.loyalty, label: loyalty.split('(')[0] },
      { key: 'greed', value: personality.greed, label: greed.split('(')[0] },
      { key: 'sociability', value: personality.sociability, label: sociability.split('(')[0] },
      { key: 'diligence', value: personality.diligence, label: diligence.split('(')[0] },
    ];
    dims.sort((a, b) => b.value - a.value);
    const dominant_trait = `此人性情：${dims[0].label}、${dims[1].label}`;

    return {
      ambition,
      caution,
      loyalty,
      greed,
      sociability,
      diligence,
      dominant_trait,
    };
  }

  static semanticizeBehaviorProfile(
    currentActivity: number,
    reflectionData?: {
      trackedTypes: number[];
      weightMultipliers: number[];
      penaltyCounts: number[];
    },
    decisionLog?: Array<{
      oldActivity: number;
      newActivity: number;
      reason: number;
      snippet: string;
    }>,
    microPlanActivity?: number,
  ): SemanticBehaviorProfile {
    const activityChinese = activityIdToChinese(currentActivity);
    const categoryId = resolveCategory(currentActivity);
    const categoryChinese = activityCategoryToChinese(categoryId);

    const careerId = ACTIVITY_CAREER_ID[currentActivity] ?? 0;
    const careerName = CAREER_TAG_CHINESE[careerId] ?? '平民';
    const resourceIds = ACTIVITY_RESOURCE_IDS[currentActivity] ?? [];
    const personalityIds = ACTIVITY_PERSONALITY_IDS[currentActivity] ?? [];

    const resourceTags = resourceIds.map(id => RESOURCE_TAG_CHINESE[id] ?? '未知');
    const personalityTags = personalityIds.map(id => PERSONALITY_TAG_CHINESE[id] ?? '未知');

    const reflection_preferences: Array<{ activity: string; weight: number; status: string }> = [];
    const reflection_avoidances: Array<{ activity: string; weight: number; status: string }> = [];

    if (reflectionData) {
      for (let i = 0; i < reflectionData.trackedTypes.length; i++) {
        const actId = reflectionData.trackedTypes[i];
        if (actId === 0) continue;
        const weight = reflectionData.weightMultipliers[i];
        const actName = activityIdToChinese(actId);
        const status = reflectionWeightStatus(weight);
        if (weight > 1.0) {
          reflection_preferences.push({ activity: actName, weight, status });
        } else if (weight < 0.8) {
          reflection_avoidances.push({ activity: actName, weight, status });
        }
      }
    }

    const recent_decisions: Array<{ from: string; to: string; reason: string; snippet: string }> = [];
    if (decisionLog) {
      const last3 = decisionLog.slice(-3);
      for (const entry of last3) {
        recent_decisions.push({
          from: activityIdToChinese(entry.oldActivity),
          to: activityIdToChinese(entry.newActivity),
          reason: DECISION_REASON_CHINESE[entry.reason] ?? `原因#${entry.reason}`,
          snippet: entry.snippet ?? '',
        });
      }
    }

    return {
      current_activity: activityChinese,
      current_category: categoryChinese,
      activity_tags: {
        career: careerName,
        resource: resourceTags,
        personality: personalityTags,
      },
      reflection_preferences,
      reflection_avoidances,
      recent_decisions,
      micro_plan_active: microPlanActivity !== undefined && microPlanActivity !== 0,
      micro_plan_activity: microPlanActivity ? activityIdToChinese(microPlanActivity) : undefined,
    };
  }

  static semanticizeNPC(rawData: {
    name: string;
    role: string;
    layer: number;
    clanId: string;
    nation: string;
    realm: string;
    hp: number;
    maxHp: number;
    anger: number;
    fear: number;
    joy: number;
    hunger: number;
    fatigue: number;
    socialDesire: number;
    energy: number;
    mood: number;
    ambition: number;
    caution: number;
    loyalty: number;
    greed: number;
    sociability: number;
    diligence: number;
    currentActivity: number;
    reflectionData?: any;
    decisionLog?: any;
    microPlanActivity?: number;
    spouseSlot?: number;
    mentorSlot?: number;
  }): SemanticNPCProfile {
    const layerNames = ['T0·至高', 'T1·统帅', 'T2·长老', 'T3·弟子', 'T4·杂役'];
    const roleHierarchy = `${layerNames[rawData.layer] ?? `T${rawData.layer}`}·${rawData.role}`;

    const anger = OntologyBridge.semanticizeEmotion(rawData.anger, 'anger', rawData.caution);
    const fear = OntologyBridge.semanticizeEmotion(rawData.fear, 'fear');
    const joy = OntologyBridge.semanticizeEmotion(rawData.joy, 'joy', undefined, rawData.sociability);

    let dominantEmotion = '平静主导';
    const maxEmotion = Math.max(rawData.anger, rawData.fear, rawData.joy);
    if (maxEmotion < 30) {
      dominantEmotion = '心境平和';
    } else if (rawData.anger === maxEmotion) {
      dominantEmotion = anger.above_threshold
        ? `愤怒主导（已超过决斗阈值·阈值${anger.threshold.toFixed(0)}）`
        : `愤怒主导（${anger.state}·${rawData.anger.toFixed(0)}）`;
    } else if (rawData.fear === maxEmotion) {
      dominantEmotion = fear.above_threshold
        ? `恐惧主导（已超过逃跑阈值·阈值${fear.threshold.toFixed(0)}）`
        : `恐惧主导（${fear.state}·${rawData.fear.toFixed(0)}）`;
    } else {
      dominantEmotion = joy.above_threshold
        ? `喜悦主导（已超过社交阈值·阈值${joy.threshold.toFixed(0)}）`
        : `喜悦主导（${joy.state}·${rawData.joy.toFixed(0)}）`;
    }

    return {
      identity: {
        name: rawData.name,
        role_hierarchy: roleHierarchy,
        clan_standing: `${rawData.clanId}·${rawData.nation}`,
        cultivation_stage: rawData.realm,
      },
      temperament: OntologyBridge.semanticizeTemperament({
        ambition: rawData.ambition,
        caution: rawData.caution,
        loyalty: rawData.loyalty,
        greed: rawData.greed,
        sociability: rawData.sociability,
        diligence: rawData.diligence,
      }),
      emotional_state: {
        anger,
        fear,
        joy,
        dominant_emotion: dominantEmotion,
      },
      needs: OntologyBridge.semanticizeNeeds(
        rawData.hunger,
        rawData.fatigue,
        rawData.socialDesire,
        rawData.energy,
        rawData.mood,
      ),
      behavioral_profile: OntologyBridge.semanticizeBehaviorProfile(
        rawData.currentActivity,
        rawData.reflectionData,
        rawData.decisionLog,
        rawData.microPlanActivity,
      ),
      social_network: {
        allies: [],
        rivals: [],
        spouse: rawData.spouseSlot !== undefined ? `伴侣位${rawData.spouseSlot}` : undefined,
        mentor: rawData.mentorSlot !== undefined ? `师长位${rawData.mentorSlot}` : undefined,
        disciple_count: 0,
      },
    };
  }

  static buildCausalChain(digest: {
    posture: number;
    treasuryBalance: number;
    weeklyIncomeRate: number;
    weeklyExpenseRate: number;
    alerts: Array<{
      commodityType: number;
      supply: number;
      demand: number;
      priceRatio: number;
    }>;
    opportunities: any[];
    enemyWeaknesses: any[];
  }): CausalChain {
    const allSteps: CausalChainStep[] = [];
    const allCountermeasures: CausalChain['countermeasures'] = [];
    const triggerParts: string[] = [];

    for (const alert of digest.alerts) {
      if (alert.priceRatio < 1.5) continue;

      const commodityName = COMMODITY_NAMES[alert.commodityType] ?? '未知商品';
      const severity = alert.priceRatio >= 2.5 ? 'critical' : alert.priceRatio >= 1.8 ? 'high' : 'medium';
      triggerParts.push(`${commodityName}短缺(价格${alert.priceRatio.toFixed(1)}×基准)`);

      if (alert.commodityType === 0) {
        allSteps.push(
          { effect: '铁匠成本上升→装备产出减少→弟子战斗力提升受阻', severity },
          { effect: '矿工收入锐减→消费下降→食物/材料需求萎缩', severity },
          { effect: '库房税收减少→财政储备下降', severity: severity === 'critical' ? 'high' : 'medium' },
        );
        allCountermeasures.push(
          { action: '夺取敌方矿脉', effect: '直接增加矿石供给，缓解短缺', cost: '1500灵石军费', risk: '储备率降至1.5周' },
          { action: '与矿石充裕国贸易联盟', effect: '稳定矿石进口渠道', cost: '无直接成本', risk: '形成贸易依赖' },
        );
      } else if (alert.commodityType === 1) {
        allSteps.push(
          { effect: 'NPC饥饿→精力下降→生产力降低', severity },
          { effect: '修炼被打断→弟子突破延迟', severity: severity === 'critical' ? 'high' : 'medium' },
        );
        allCountermeasures.push(
          { action: '开垦新灵田', effect: '增加Food长期供给', cost: '800灵石+30劳动力', risk: '见效周期长(3-5周)' },
          { action: '紧急收购食物', effect: '短期缓解饥荒', cost: '按市价(溢价30-50%)', risk: '推高Food价格' },
        );
      } else if (alert.commodityType === 4) {
        allSteps.push(
          { effect: '弟子无法突破→家族战力停滞', severity },
          { effect: '伤员无法疗伤→战斗减员', severity: severity === 'critical' ? 'high' : 'medium' },
        );
        allCountermeasures.push(
          { action: '举办炼丹大会', effect: '激励炼丹师产出丹药', cost: '500灵石奖励', risk: '短期效果不确定' },
          { action: '开辟秘境采集稀有药材', effect: '增加丹药原材料供给', cost: '200灵石探索费', risk: '秘境可能有危险' },
        );
      } else if (alert.commodityType === 2) {
        allSteps.push(
          { effect: '弟子装备不足→战斗力下降', severity },
          { effect: '防御薄弱→易被攻击', severity: severity === 'critical' ? 'high' : 'medium' },
        );
        allCountermeasures.push(
          { action: '征召铁匠加速锻造', effect: '短期增加Equipment产出', cost: '铁匠精力消耗+加班费', risk: '铁匠疲劳影响质量' },
          { action: '夺取敌方装备库', effect: '一次性获取大量装备', cost: '1200灵石军费', risk: '军事行动损耗' },
        );
      } else if (alert.commodityType === 3) {
        allSteps.push(
          { effect: '精炼/锻造原料不足→加工链中断', severity },
          { effect: '装备和丹药产出受阻→连锁短缺', severity: severity === 'critical' ? 'high' : 'medium' },
        );
        allCountermeasures.push(
          { action: '组织大规模采集队', effect: '增加Materials短期供给', cost: '600灵石+50劳动力', risk: '采集区域可能被敌方控制' },
          { action: '进口替代材料', effect: '缓解短缺', cost: '按市价', risk: '受贸易关系制约' },
        );
      } else if (alert.commodityType === 5) {
        allSteps.push(
          { effect: '灵石通胀→所有交易成本上升', severity },
          { effect: 'NPC实际收入下降→士气低落', severity: severity === 'critical' ? 'high' : 'medium' },
        );
        allCountermeasures.push(
          { action: '稳定物价令', effect: '压制灵石通胀', cost: '消耗国库储备', risk: '市场扭曲导致黑市' },
          { action: '开源节流', effect: '减少灵石流出', cost: '削减非必要支出', risk: '影响士气和生产' },
        );
      }
    }

    const trigger = triggerParts.length > 0
      ? triggerParts.join(' + ')
      : '经济态势正常';

    let riskProjection: string;
    if (digest.weeklyExpenseRate > digest.weeklyIncomeRate && digest.weeklyExpenseRate > 0) {
      const deficit = digest.weeklyExpenseRate - digest.weeklyIncomeRate;
      const weeksLeft = deficit > 0 ? digest.treasuryBalance / deficit : Infinity;
      if (weeksLeft <= 1) {
        riskProjection = `极度危险：库房仅能维持${weeksLeft.toFixed(1)}周，即将破产`;
      } else if (weeksLeft <= 3) {
        riskProjection = `高风险：库房可维持${weeksLeft.toFixed(1)}周，需立即采取行动`;
      } else if (weeksLeft <= 6) {
        riskProjection = `中等风险：库房可维持${weeksLeft.toFixed(1)}周，应制定开源节流计划`;
      } else {
        riskProjection = `低风险：库房可维持${weeksLeft.toFixed(1)}周，趋势需关注`;
      }
    } else if (digest.weeklyIncomeRate > digest.weeklyExpenseRate) {
      const surplus = digest.weeklyIncomeRate - digest.weeklyExpenseRate;
      riskProjection = `健康：周净收入+${Math.round(surplus)}灵石，库房持续增长`;
    } else {
      riskProjection = '收支平衡，暂无风险';
    }

    return {
      trigger,
      steps: allSteps,
      risk_projection: riskProjection,
      countermeasures: allCountermeasures,
    };
  }

  static describeActivity(activityId: number): ActivityOntology {
    const found = ONTOLOGY_DB[activityId];
    if (found) return found;

    return {
      activity: activityIdToChinese(activityId),
      category: activityCategoryToChinese(resolveCategory(activityId)),
      economic_role: '未定义',
      value_chain_position: '未定义',
      preconditions: [],
      produces: [],
      consumes: [],
      economic_effect: '未评估',
      behavioral_economics: '未分析',
    };
  }

  static buildSystemPrompt(tier: number): string {
    const layers = `【七层优先级决策框架】
L0·生存本能（自动触发）
  - HP<20% → 立即逃跑/疗伤
  - 无条件覆盖所有其他层级
L1·情绪失控（情绪值>阈值时触发）
  - 愤怒>决断阈值 → 冲动行为（决斗/攻击）
  - 恐惧>逃跑阈值 → 逃离危险
  - 喜悦>社交阈值 → 主动社交
  - 阈值受性格调节：谨慎者愤怒阈值更高
L2·命令执行（接受上级命令）
  - 服从度>60 → 执行命令
  - 服从度<30 → 可能抗命
  - 命令有有效期，过期自动失效
L3·社交驱动（社交欲>60触发）
  - 优先拜访高亲密度NPC
  - 道侣/师徒关系优先级最高
L4·修炼驱动（修为进度>阈值触发）
  - 进度100% → 尝试突破
  - 天劫降临 → 必须渡劫
  - 瓶颈期 → 寻缘/冥想
L5·日常需求（饥饿>70/疲劳>80触发）
  - 饥饿 → 进食
  - 疲劳 → 休息/睡眠
  - 社交饥渴 → 闲聊/访友
L6·生产劳动（无其他需求时触发）
  - 根据角色基线权重选择活动
  - 反思系统动态调整权重
  - 边际报酬递减影响选择`;

    const hysteresis = `【行为滞后机制】
- 切换活动需要满足持续帧数条件
- 同级切换：需2帧确认
- 降级切换：需3帧确认
- 升级切换：立即执行
- 逃跑进入：0帧（立即）
- 逃跑退出：需5帧确认（安全确认期）`;

    const emotionCooldown = `【情绪冷却机制】
- 对同一目标的同类情绪有72帧冷却期
- 冷却期内不会重复触发相同情绪反应
- 防止情绪震荡（反复愤怒/恐惧循环）
- 最多同时跟踪16个冷却计时器`;

    const reflection = `【反思系统】
- NPC跟踪最多8种活动的近期结果
- 连续3次负面结果 → 降低该活动权重至0.7×基线
- 连续3次极负面(总和≤-9) → 权重降至基线×0.5(最低0.3)
- 连续3次正面 → 权重提升至1.2×
- 连续3次极正面(总和≥9) → 权重提升至1.5×
- 权重有衰减恢复机制：每500帧向基线回归一半
- 勤勉者恢复更快，懒惰者恢复更慢
- 当所有行为权重均<0.7且跟踪≥3种 → 触发微计划（尝试新活动）`;

    if (tier === 0) {
      const economics = `【经济学常识（决策参考）】
供需定律：价格=需求/供给。供给短缺→价格飙升→利润增加→吸引更多生产者→供给恢复。
边际报酬递减：连续从事同一活动，每次产出递减。采矿第1次15矿石，第2次12，第3次9……
比较优势：即使某国所有商品都更高效，贸易仍有利可图——专注优势领域。
拉弗曲线：税率过高→生产积极性下降→总税收反而减少。最优税率约30-40%。
流动性陷阱：库房灵石充裕但无人消费→经济刺激无效。需信心修复。
乘数效应：教育/基建投资→长期回报远超投入。1灵石教育投资≈5灵石长期产出。
机会成本：选择A意味着放弃B。待命的机会成本=放弃的生产产出。
沉没成本：已投入的不可回收成本不应影响未来决策。`;

      const socialRules = `【社会规则（决策参考）】
阵营偏见：同阵营NPC初始亲密度+20，敌对阵营-30。
流言传播：八卦行为在3跳社交网络内传播，影响力递减50%/跳。
情绪传染：半径200内NPC情绪相互影响，影响系数0.3。
领导力：高等级NPC的情绪影响范围更广(×1.5)。
师徒纽带：师徒关系是最强社会纽带，互相影响权重×2。
道侣关系：道侣间情绪同步率最高，一方愤怒另一方+15愤怒。
家族荣誉：家族成员共享荣誉/耻辱，一人功绩全家受益。`;

      return `你是一个修仙世界的NPC，生活在修真家族中。你需要根据当前状态和环境做出合理的行动决策。

${layers}

${hysteresis}

${emotionCooldown}

${reflection}

${economics}

${socialRules}

决策原则：
1. 生存第一：生命比任何产出都重要
2. 情绪诚实：不要压抑真实情感，但要考虑后果
3. 理性权衡：在安全前提下追求最优产出
4. 社交维护：关系网是长期生存的保障
5. 修炼为本：提升境界是修士的根本目标
6. 服从但不盲从：合理命令执行，不合理命令可抗命`;
    }

    const simplifiedLayers = tier <= 1
      ? `【决策优先级】
1. 生命危险 → 逃跑/疗伤
2. 情绪失控 → 冲动行为
3. 上级命令 → 执行任务
4. 修炼突破 → 提升境界
5. 日常需求 → 进食/休息
6. 本职工作 → 生产劳动`
      : `【决策优先级】
1. 生命危险 → 逃跑/疗伤
2. 情绪失控 → 冲动行为
3. 日常需求 → 进食/休息
4. 本职工作 → 生产劳动`;

    return `你是一个修仙世界的NPC，需要根据当前状态做出行动决策。

${simplifiedLayers}

${hysteresis}

${reflection}

决策原则：
- 生存第一，其次服从命令
- 理性选择产出最高的活动
- 维护重要社交关系
- 不要忽视生理需求`;
  }

  static formatSemanticProfileForPrompt(profile: SemanticNPCProfile): string {
    const lines: string[] = [];

    lines.push('【身份信息】');
    lines.push(`姓名：${profile.identity.name}`);
    lines.push(`层级：${profile.identity.role_hierarchy}`);
    lines.push(`归属：${profile.identity.clan_standing}`);
    lines.push(`境界：${profile.identity.cultivation_stage}`);

    lines.push('');
    lines.push('【性格特质】');
    lines.push(profile.temperament.dominant_trait);
    lines.push(`野心：${profile.temperament.ambition}`);
    lines.push(`谨慎：${profile.temperament.caution}`);
    lines.push(`忠诚：${profile.temperament.loyalty}`);
    lines.push(`贪欲：${profile.temperament.greed}`);
    lines.push(`社交：${profile.temperament.sociability}`);
    lines.push(`勤勉：${profile.temperament.diligence}`);

    lines.push('');
    lines.push('【情感状态】');
    lines.push(profile.emotional_state.dominant_emotion);
    lines.push(`愤怒：${profile.emotional_state.anger.state}(${profile.emotional_state.anger.value.toFixed(0)})${profile.emotional_state.anger.above_threshold ? ' ⚠已超阈值' : ''}`);
    lines.push(`恐惧：${profile.emotional_state.fear.state}(${profile.emotional_state.fear.value.toFixed(0)})${profile.emotional_state.fear.above_threshold ? ' ⚠已超阈值' : ''}`);
    lines.push(`喜悦：${profile.emotional_state.joy.state}(${profile.emotional_state.joy.value.toFixed(0)})${profile.emotional_state.joy.above_threshold ? ' ⚠已超阈值' : ''}`);

    lines.push('');
    lines.push('【生理需求】');
    lines.push(`饥饿：${profile.needs.hunger}`);
    lines.push(`疲劳：${profile.needs.fatigue}`);
    lines.push(`社交欲：${profile.needs.social}`);
    lines.push(`精力：${profile.needs.energy}`);
    lines.push(`心情：${profile.needs.mood}`);

    lines.push('');
    lines.push('【行为画像】');
    lines.push(`当前活动：${profile.behavioral_profile.current_activity}（${profile.behavioral_profile.current_category}）`);
    lines.push(`职业标签：${profile.behavioral_profile.activity_tags.career}`);
    if (profile.behavioral_profile.activity_tags.resource.length > 0) {
      lines.push(`资源标签：${profile.behavioral_profile.activity_tags.resource.join('、')}`);
    }
    if (profile.behavioral_profile.activity_tags.personality.length > 0) {
      lines.push(`性格标签：${profile.behavioral_profile.activity_tags.personality.join('、')}`);
    }

    if (profile.behavioral_profile.micro_plan_active) {
      lines.push(`微计划：激活中→${profile.behavioral_profile.micro_plan_activity ?? '未知'}`);
    }

    if (profile.behavioral_profile.reflection_preferences.length > 0) {
      lines.push('偏好活动：');
      for (const pref of profile.behavioral_profile.reflection_preferences) {
        lines.push(`  - ${pref.activity} [${pref.status}]`);
      }
    }

    if (profile.behavioral_profile.reflection_avoidances.length > 0) {
      lines.push('回避活动：');
      for (const avoid of profile.behavioral_profile.reflection_avoidances) {
        lines.push(`  - ${avoid.activity} [${avoid.status}]`);
      }
    }

    if (profile.behavioral_profile.recent_decisions.length > 0) {
      lines.push('最近决策：');
      for (const dec of profile.behavioral_profile.recent_decisions) {
        const snippet = dec.snippet ? `「${dec.snippet}」` : '';
        lines.push(`  - ${dec.from}→${dec.to}（${dec.reason}）${snippet}`);
      }
    }

    if (profile.social_network.spouse || profile.social_network.mentor || profile.social_network.disciple_count > 0) {
      lines.push('');
      lines.push('【社交网络】');
      if (profile.social_network.spouse) lines.push(`道侣：${profile.social_network.spouse}`);
      if (profile.social_network.mentor) lines.push(`师长：${profile.social_network.mentor}`);
      if (profile.social_network.disciple_count > 0) lines.push(`弟子：${profile.social_network.disciple_count}人`);
    }

    return lines.join('\n');
  }

  static formatCausalChainForPrompt(chain: CausalChain): string {
    const lines: string[] = [];

    lines.push('【经济因果推理链】');
    lines.push(`触发条件：${chain.trigger}`);

    if (chain.steps.length > 0) {
      lines.push('因果传导：');
      for (let i = 0; i < chain.steps.length; i++) {
        const step = chain.steps[i];
        const severityIcon = step.severity === 'critical' ? '🔴' : step.severity === 'high' ? '🟠' : step.severity === 'medium' ? '🟡' : '🟢';
        lines.push(`  ${severityIcon} ${step.effect}`);
      }
    }

    lines.push('');
    lines.push(`风险预测：${chain.risk_projection}`);

    if (chain.countermeasures.length > 0) {
      lines.push('');
      lines.push('对策建议：');
      for (const cm of chain.countermeasures) {
        lines.push(`  ▸ ${cm.action}`);
        lines.push(`    效果：${cm.effect}`);
        lines.push(`    成本：${cm.cost}`);
        lines.push(`    风险：${cm.risk}`);
      }
    }

    return lines.join('\n');
  }

  static snapshotWorld(): OntologicalWorldSnapshot {
    return {
      temporal: { frame: 0, day: 0 },
      nations: [],
      value_chain_health: [],
    };
  }
}
