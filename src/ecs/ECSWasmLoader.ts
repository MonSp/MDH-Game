import initModule from './ecs_wasm.js';

type WasmModule = Record<string, unknown> & {
  HEAPU8: Uint8Array;
};

const NPC_STATE_SIZE = 140;

export const RealmLevel: Record<number, string> = {
  0: '凡人',
  1: '练气',
  2: '筑基',
  3: '金丹',
  4: '元婴',
  5: '化神',
};

export const NPCRole: Record<number, string> = {
  0: '家主',
  1: '长老',
  2: '核心子弟',
  3: '内门子弟',
  4: '支脉子弟',
  5: '执法堂长老',
};

export const NPCActivity: Record<number, string> = {
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
  83: 'SocialHelp',
  103: 'SetTaxRate',
  104: 'TradeEmbargo',
  105: 'StockpileMaterial',
  106: 'PriceStabilize',
  107: 'EconomicMobilize',
  200: 'Incapacitated',
};

export interface NPCState {
  entityId: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  power: number;
  realm: number;
  realmName: string;
  role: number;
  roleName: string;
  activity: number;
  activityName: string;
  layer: number;
  cultivationProgress: number;
  hunger: number;
  fatigue: number;
  socialDesire: number;
  spiritStones: number;
  itemCount: number;
  equipmentItemId: number;
  name: string;
  activeCommandId: number;
  commandStatus: number;
  squadId: number;
  anger: number;
  fear: number;
  joy: number;
  sociability: number;
  diligence: number;
  spouseSlot: number;
  mentorSlot: number;
  relationCount: number;
  lastDecisionSnippet: string;
  energy: number;
  mood: number;
}

export interface RelationEntry {
  targetSlot: number;
  affinity: number;
}

export interface InteractionEntry {
  timestamp: number;
  otherSlot: number;
  type: number;
  typeName: string;
  impactScore: number;
}

export interface CommandMemoryEntryWasm {
  timestamp: number;
  issuerSlot: number;
  commandId: number;
  result: number;
  emotionTag: number;
  influence: number;
}

export interface WitnessedEventEntry {
  timestamp: number;
  eventIndex: number;
  significance: number;
  description?: string;
}

export interface InteractionEventWasm {
  slotA: number;
  slotB: number;
  type: number;
}

export const InteractionType: Record<number, string> = {
  0: 'socialize',
  1: 'trade',
  2: 'conflict',
  3: 'duel',
};

export interface ECSStats {
  npcCount: number;
  avgFrameTime: number;
  frameCount: number;
}

type CVoidFn = () => void;
type CInitFn = (threadCount: number) => void;
type CCreateNPCsFn = (count: number, layer: number) => number;
type CGetStatesFn = (ptr: number, maxCount: number) => void;
type CGetStatsFn = (npcPtr: number, timePtr: number, framesPtr: number) => void;
type CGetAffinityFn = (slotA: number, slotB: number) => number;
type CModifyAffinityFn = (slotA: number, slotB: number, delta: number) => void;
type CGetTopRelationshipsFn = (slot: number, count: number, ptr: number) => void;
type CGetRecentInteractionsFn = (slot: number, count: number, ptr: number) => void;
type CGetRecentCommandMemoryFn = (slot: number, count: number, ptr: number) => void;
type CGetWitnessedEventsFn = (slot: number, count: number, ptr: number) => void;
type CGetEventStringFn = (index: number, ptr: number, maxLen: number) => void;
type CConsumeInteractionEventsFn = (ptr: number, maxCount: number) => void;
type CRecordWitnessedEventFn = (eventSlot: number, descPtr: number, significance: number) => void;
type CDumpMemoryFn = (ptr: number, maxSize: number) => number;
type CLoadMemoryFn = (ptr: number, size: number) => void;
type CGetMarketPriceFn = (clanIdPtr: number, commodityType: number) => number;
type CGetCommodityPoolFn = (clanIdPtr: number, commodityType: number, supplyPtr: number, demandPtr: number) => void;
type CRecordMarketTransactionFn = (clanIdPtr: number, commodityType: number, amount: number, isBuy: number) => void;
type CGetNPCItemsFn = (entityId: number, ptr: number, maxSlots: number) => void;
type CGetEconomicDigestFn = (clanIdPtr: number, digestPtr: number) => number;

let ecsWasmReady = false;
let HEAPU8: Uint8Array | null = null;
let _statesBufferPtr = 0;
let _statsBufferPtr = 0;
let _statesBufferSize = 0;
let _maxNPC = 0;
let _memBufPtr = 0;

let _init: CInitFn | null = null;
let _createNPCs: CCreateNPCsFn | null = null;
let _updateFrame: CVoidFn | null = null;
let _getNPCStateCount: (() => number) | null = null;
let _getNPCStates: CGetStatesFn | null = null;
let _getStats: CGetStatsFn | null = null;
let _destroy: CVoidFn | null = null;
let _getAffinity: CGetAffinityFn | null = null;
let _modifyAffinity: CModifyAffinityFn | null = null;
let _getTopRelationships: CGetTopRelationshipsFn | null = null;
let _getRecentInteractions: CGetRecentInteractionsFn | null = null;
let _getRecentCommandMemory: CGetRecentCommandMemoryFn | null = null;
let _getWitnessedEvents: CGetWitnessedEventsFn | null = null;
let _getEventString: CGetEventStringFn | null = null;
let _consumeInteractionEvents: CConsumeInteractionEventsFn | null = null;
let _recordWitnessedEvent: CRecordWitnessedEventFn | null = null;
let _dumpMemory: CDumpMemoryFn | null = null;
let _loadMemory: CLoadMemoryFn | null = null;
let _getMarketPrice: CGetMarketPriceFn | null = null;
let _getCommodityPool: CGetCommodityPoolFn | null = null;
let _recordMarketTransaction: CRecordMarketTransactionFn | null = null;
let _getNPCItems: CGetNPCItemsFn | null = null;
let _getEconomicDigest: CGetEconomicDigestFn | null = null;

const _decoder = new TextDecoder();

export function isECSWasmReady(): boolean {
  return ecsWasmReady;
}

export function ecsInit(threadCount: number = 0): void {
  if (_init) _init(threadCount);
}

export function ecsCreateNPCs(count: number, layer: number): number {
  return _createNPCs ? _createNPCs(count, layer) : 0;
}

export function ecsUpdateFrame(): void {
  if (_updateFrame) _updateFrame();
}

export function ecsGetNPCStateCount(): number {
  return _getNPCStateCount ? _getNPCStateCount() : 0;
}

export function ecsDestroy(): void {
  if (_destroy) _destroy();
}

export function readECSStats(): ECSStats {
  if (!_getStats || !HEAPU8) {
    return { npcCount: 0, avgFrameTime: 0, frameCount: 0 };
  }

  _getStats(_statsBufferPtr, _statsBufferPtr + 4, _statsBufferPtr + 8);

  const view = new DataView(HEAPU8.buffer, HEAPU8.byteOffset);
  return {
    npcCount: view.getInt32(_statsBufferPtr, true),
    avgFrameTime: view.getFloat32(_statsBufferPtr + 4, true),
    frameCount: view.getInt32(_statsBufferPtr + 8, true),
  };
}

export function wasmGetAffinity(slotA: number, slotB: number): number {
  return _getAffinity ? _getAffinity(slotA, slotB) : 0;
}

export function wasmModifyAffinity(slotA: number, slotB: number, delta: number): void {
  if (_modifyAffinity) _modifyAffinity(slotA, slotB, delta);
}

export function wasmGetTopRelationships(slot: number, count: number): RelationEntry[] {
  if (!_getTopRelationships || !HEAPU8) return [];
  _getTopRelationships(slot, count, _memBufPtr);
  const view = new DataView(HEAPU8.buffer, HEAPU8.byteOffset);
  const result: RelationEntry[] = [];
  for (let i = 0; i < count; i++) {
    const targetSlot = view.getInt32(_memBufPtr + i * 8, true);
    const affinity = view.getInt32(_memBufPtr + i * 8 + 4, true);
    if (targetSlot === 0) break;
    result.push({ targetSlot, affinity });
  }
  return result;
}

export function wasmGetRecentInteractions(slot: number, count: number): InteractionEntry[] {
  if (!_getRecentInteractions || !HEAPU8) return [];
  _getRecentInteractions(slot, count, _memBufPtr);
  const view = new DataView(HEAPU8.buffer, HEAPU8.byteOffset);
  const n = view.getInt32(_memBufPtr, true);
  const result: InteractionEntry[] = [];
  for (let i = 0; i < n && i < count; i++) {
    const off = _memBufPtr + 4 + i * 16;
    const tsLo = view.getUint32(off, true);
    const tsHi = view.getUint32(off + 4, true);
    const timestamp = tsLo + tsHi * 0x100000000;
    const otherSlot = view.getUint32(off + 8, true);
    const packed = view.getInt32(off + 12, true);
    const type = packed & 0xFFFF;
    const impactScore = (packed >> 16) & 0xFF;
    result.push({ timestamp, otherSlot, type, typeName: InteractionType[type] ?? 'unknown', impactScore });
  }
  return result;
}

export function wasmGetCommandMemory(slot: number, count: number): CommandMemoryEntryWasm[] {
  if (!_getRecentCommandMemory || !HEAPU8) return [];
  _getRecentCommandMemory(slot, count, _memBufPtr);
  const view = new DataView(HEAPU8.buffer, HEAPU8.byteOffset);
  const n = view.getInt32(_memBufPtr, true);
  const result: CommandMemoryEntryWasm[] = [];
  for (let i = 0; i < n && i < count; i++) {
    const off = _memBufPtr + 4 + i * 24;
    const tsLo = view.getUint32(off, true);
    const tsHi = view.getUint32(off + 4, true);
    result.push({
      timestamp: tsLo + tsHi * 0x100000000,
      issuerSlot: view.getUint32(off + 8, true),
      commandId: view.getUint32(off + 12, true),
      result: view.getInt32(off + 16, true) & 0xFF,
      emotionTag: (view.getInt32(off + 16, true) >> 8) & 0xFF,
      influence: view.getInt32(off + 20, true),
    });
  }
  return result;
}

export function wasmGetWitnessedEvents(slot: number, count: number): WitnessedEventEntry[] {
  if (!_getWitnessedEvents || !HEAPU8) return [];
  _getWitnessedEvents(slot, count, _memBufPtr);
  const view = new DataView(HEAPU8.buffer, HEAPU8.byteOffset);
  const n = view.getInt32(_memBufPtr, true);
  const result: WitnessedEventEntry[] = [];
  for (let i = 0; i < n && i < count; i++) {
    const off = _memBufPtr + 4 + i * 12;
    const tsLo = view.getUint32(off, true);
    const tsHi = view.getUint32(off + 4, true);
    const packed = view.getInt32(off + 8, true);
    const eventIndex = packed & 0xFFFF;
    const significance = (packed >> 16) & 0xFF;
    result.push({
      timestamp: tsLo + tsHi * 0x100000000,
      eventIndex,
      significance,
    });
  }
  return result;
}

export function wasmGetEventString(index: number): string {
  if (!_getEventString || !HEAPU8) return '';
  const tmpBuf = _memBufPtr + 8192;
  _getEventString(index, tmpBuf, 256);
  const end = HEAPU8.subarray(tmpBuf, tmpBuf + 256).indexOf(0);
  return end === 0 ? '' : _decoder.decode(HEAPU8.subarray(tmpBuf, tmpBuf + (end >= 0 ? end : 256)));
}

export function wasmConsumeInteractionEvents(): InteractionEventWasm[] {
  if (!_consumeInteractionEvents || !HEAPU8) return [];
  _consumeInteractionEvents(_memBufPtr, 256);
  const view = new DataView(HEAPU8.buffer, HEAPU8.byteOffset);
  const n = view.getInt32(_memBufPtr, true);
  const result: InteractionEventWasm[] = [];
  for (let i = 0; i < n; i++) {
    result.push({
      slotA: view.getInt32(_memBufPtr + 4 + i * 12, true),
      slotB: view.getInt32(_memBufPtr + 4 + i * 12 + 4, true),
      type: view.getInt32(_memBufPtr + 4 + i * 12 + 8, true),
    });
  }
  return result;
}

export function wasmRecordWitnessedEvent(slot: number, desc: string, significance: number): void {
  if (!_recordWitnessedEvent || !HEAPU8) return;
  const strBuf = _memBufPtr + 14000;
  const bytes = new TextEncoder().encode(desc);
  HEAPU8.set(bytes.slice(0, 200), strBuf);
  _recordWitnessedEvent(slot, strBuf, significance);
}

export function ecsDumpMemory(): ArrayBuffer | null {
  if (!_dumpMemory || !HEAPU8) return null;
  const maxSize = 1024 * 1024;
  const bufPtr = _memBufPtr;
  const written = _dumpMemory(bufPtr, maxSize);
  if (written <= 0) return null;
  return HEAPU8.slice(bufPtr, bufPtr + written).buffer;
}

export function ecsLoadMemory(data: ArrayBuffer): boolean {
  if (!_loadMemory || !HEAPU8 || !data) return false;
  const bytes = new Uint8Array(data);
  const bufPtr = _memBufPtr + 12000;
  HEAPU8.set(bytes.slice(0, 4000), bufPtr);
  _loadMemory(bufPtr, bytes.byteLength);
  return true;
}

export function readNPCStates(): NPCState[] {
  if (!_getNPCStates || !_getNPCStateCount || !HEAPU8) {
    return [];
  }

  const count = _getNPCStateCount();
  if (count === 0) return [];

  const readCount = Math.min(count, _maxNPC);
  _getNPCStates(_statesBufferPtr, readCount);

  const view = new DataView(HEAPU8.buffer, HEAPU8.byteOffset);
  const result: NPCState[] = [];

  for (let i = 0; i < readCount; i++) {
    const offset = _statesBufferPtr + i * NPC_STATE_SIZE;

    const spiritStonesLo = view.getInt32(offset, true);
    const spiritStonesHi = view.getInt32(offset + 4, true);
    const spiritStones = spiritStonesLo + spiritStonesHi * 0x100000000;

    const entityIdLo = view.getUint32(offset + 8, true);
    const entityIdHi = view.getUint32(offset + 12, true);
    const entityId = entityIdLo + entityIdHi * 0x100000000;

    const x = view.getFloat32(offset + 16, true);
    const y = view.getFloat32(offset + 20, true);
    const hp = view.getInt32(offset + 24, true);
    const maxHp = view.getInt32(offset + 28, true);
    const mp = view.getInt32(offset + 32, true);
    const maxMp = view.getInt32(offset + 36, true);
    const power = view.getInt32(offset + 40, true);
    const realm = view.getInt32(offset + 44, true);
    const role = view.getInt32(offset + 48, true);
    const activity = view.getInt32(offset + 52, true);
    const layer = view.getInt32(offset + 56, true);
    const cultivationProgress = view.getFloat32(offset + 60, true);
    const hunger = view.getFloat32(offset + 64, true);
    const fatigue = view.getFloat32(offset + 68, true);
    const socialDesire = view.getFloat32(offset + 72, true);

    const nameEnd = HEAPU8.subarray(offset + 76, offset + 76 + 52).indexOf(0);
    const nameBytes = HEAPU8.subarray(offset + 76, offset + 76 + (nameEnd >= 0 ? nameEnd : 52));
    const name = nameEnd === 0 ? '' : _decoder.decode(nameBytes);

    const activeCommandId = view.getUint32(offset + 128, true);
    const commandStatus = HEAPU8[offset + 132];
    const itemCount = view.getUint8(offset + 133);
    const equipmentItemId = view.getUint8(offset + 134);
    const squadId = view.getUint32(offset + 136, true);

    result.push({
      entityId, x, y, hp, maxHp, mp, maxMp, power,
      realm,
      realmName: RealmLevel[realm] ?? '练气',
      role,
      roleName: NPCRole[role] ?? '内门子弟',
      activity,
      activityName: NPCActivity[activity] ?? 'Rest',
      layer, cultivationProgress, hunger, fatigue, socialDesire, spiritStones, itemCount, equipmentItemId, name,
      activeCommandId, commandStatus, squadId,
      anger: 0,
      fear: 0,
      joy: 0,
      sociability: 0,
      diligence: 0,
      spouseSlot: 0,
      mentorSlot: 0,
      relationCount: 0,
      lastDecisionSnippet: '',
      energy: 0,
      mood: 0,
    });
  }

  return result;
}

export interface NPCDetailFromState {
  anger: number;
  fear: number;
  joy: number;
  energy: number;
  mood: number;
  sociability: number;
  diligence: number;
  spouseSlot: number;
  mentorSlot: number;
  relationCount: number;
  lastDecisionSnippet: string;
}

export function wasmGetNPCDetailFromState(state: NPCState): NPCDetailFromState {
  return {
    anger: state.anger,
    fear: state.fear,
    joy: state.joy,
    energy: state.energy,
    mood: state.mood,
    sociability: state.sociability,
    diligence: state.diligence,
    spouseSlot: state.spouseSlot,
    mentorSlot: state.mentorSlot,
    relationCount: state.relationCount,
    lastDecisionSnippet: state.lastDecisionSnippet,
  };
}

export async function initECSWasm(maxNPC: number = 2000): Promise<boolean> {
  if (ecsWasmReady) return true;

  try {
    const Module = (await initModule({
      locateFile: (path: string) => '/' + path,
    })) as WasmModule;

    _init = Module['_ecs_init'] as CInitFn;
    _createNPCs = Module['_ecs_createNPCs'] as CCreateNPCsFn;
    _updateFrame = Module['_ecs_updateFrame'] as CVoidFn;
    _getNPCStateCount = Module['_ecs_getNPCStateCount'] as () => number;
    _getNPCStates = Module['_ecs_getNPCStates'] as CGetStatesFn;
    _getStats = Module['_ecs_getStats'] as CGetStatsFn;
    _destroy = Module['_ecs_destroy'] as CVoidFn;
    _getAffinity = Module['_ecs_getAffinity'] as CGetAffinityFn;
    _modifyAffinity = Module['_ecs_modifyAffinity'] as CModifyAffinityFn;
    _getTopRelationships = Module['_ecs_getTopRelationships'] as CGetTopRelationshipsFn;
    _getRecentInteractions = Module['_ecs_getRecentInteractions'] as CGetRecentInteractionsFn;
    _getRecentCommandMemory = Module['_ecs_getRecentCommandMemory'] as CGetRecentCommandMemoryFn;
    _getWitnessedEvents = Module['_ecs_getWitnessedEvents'] as CGetWitnessedEventsFn;
    _getEventString = Module['_ecs_getEventString'] as CGetEventStringFn;
    _consumeInteractionEvents = Module['_ecs_consumeInteractionEvents'] as CConsumeInteractionEventsFn;
    _recordWitnessedEvent = Module['_ecs_recordWitnessedEvent'] as CRecordWitnessedEventFn;
    _dumpMemory = Module['_ecs_dumpMemory'] as CDumpMemoryFn;
    _loadMemory = Module['_ecs_loadMemory'] as CLoadMemoryFn;
    _getMarketPrice = Module['_ecs_getMarketPrice'] as CGetMarketPriceFn;
    _getCommodityPool = Module['_ecs_getCommodityPool'] as CGetCommodityPoolFn;
    _recordMarketTransaction = Module['_ecs_recordMarketTransaction'] as CRecordMarketTransactionFn;
    _getNPCItems = Module['_ecs_getNPCItems'] as CGetNPCItemsFn;
    _getEconomicDigest = Module['_ecs_getEconomicDigest'] as CGetEconomicDigestFn;
    const malloc = Module['_malloc'] as (size: number) => number;
    HEAPU8 = Module['HEAPU8'];

    _maxNPC = maxNPC;

    _statsBufferPtr = malloc(12);
    _statesBufferSize = maxNPC * NPC_STATE_SIZE;
    _statesBufferPtr = malloc(_statesBufferSize);
    _memBufPtr = malloc(16384); // 16KB buffer for memory queries

    ecsWasmReady = true;
    console.log('[ECS] WASM engine loaded');
    return true;
  } catch (err) {
    console.warn('[ECS] WASM not available:', err instanceof Error ? err.message : err);
    ecsWasmReady = false;
    return false;
  }
}

export function wasmGetMarketPrice(clanId: string, commodityType: number): number {
  if (!_getMarketPrice || !HEAPU8) return -1;
  const tmpBuf = _memBufPtr + 12000;
  const bytes = new TextEncoder().encode(clanId);
  HEAPU8.set(bytes.slice(0, 64), tmpBuf);
  HEAPU8[tmpBuf + bytes.length] = 0;
  return _getMarketPrice(tmpBuf, commodityType);
}

export function wasmGetCommodityPool(clanId: string, commodityType: number): { supply: number; demand: number } | null {
  if (!_getCommodityPool || !HEAPU8) return null;
  const tmpBuf = _memBufPtr + 12000;
  const bytes = new TextEncoder().encode(clanId);
  HEAPU8.set(bytes.slice(0, 64), tmpBuf);
  HEAPU8[tmpBuf + bytes.length] = 0;

  const supplyPtr = _memBufPtr + 12100;
  const demandPtr = _memBufPtr + 12108;
  _getCommodityPool(tmpBuf, commodityType, supplyPtr, demandPtr);

  const view = new DataView(HEAPU8.buffer, HEAPU8.byteOffset);
  const supplyLo = view.getInt32(supplyPtr, true);
  const supplyHi = view.getInt32(supplyPtr + 4, true);
  const demandLo = view.getInt32(demandPtr, true);
  const demandHi = view.getInt32(demandPtr + 4, true);
  return {
    supply: supplyLo + supplyHi * 0x100000000,
    demand: demandLo + demandHi * 0x100000000,
  };
}

export function wasmRecordMarketTransaction(clanId: string, commodityType: number, amount: number, isBuy: boolean): void {
  if (!_recordMarketTransaction || !HEAPU8) return;
  const tmpBuf = _memBufPtr + 12000;
  const bytes = new TextEncoder().encode(clanId);
  HEAPU8.set(bytes.slice(0, 64), tmpBuf);
  HEAPU8[tmpBuf + bytes.length] = 0;
  _recordMarketTransaction(tmpBuf, commodityType, amount, isBuy ? 1 : 0);
}

export interface NPCItemSlot {
  itemId: number;
  count: number;
}

export interface NPCItemDetail {
  spiritStones: number;
  familyContribution: number;
  items: NPCItemSlot[];
}

export interface EconomicAlertWasm {
  commodityType: number;
  supply: number;
  demand: number;
  priceRatio: number;
}

export interface EconomicOpportunityWasm {
  fromClanId: number;
  toClanId: number;
  commodityType: number;
  profitRate: number;
}

export interface EconomicWeaknessWasm {
  clanId: number;
  weaknessType: number;
}

export interface EconomicDigestWasm {
  posture: number;
  treasuryBalance: number;
  weeklyIncomeRate: number;
  weeklyExpenseRate: number;
  alertCount: number;
  alerts: EconomicAlertWasm[];
  opportunityCount: number;
  opportunities: EconomicOpportunityWasm[];
  weaknessCount: number;
  enemyWeaknesses: EconomicWeaknessWasm[];
}

export const ECONOMIC_POSTURE_LABELS: Record<number, string> = {
  0: '盈馀',
  1: '平衡',
  2: '紧张',
  3: '危机',
};

export function wasmGetNPCItems(entityId: number, maxSlots: number): NPCItemDetail | null {
  if (!_getNPCItems || !HEAPU8) return null;
  const tmpBuf = _memBufPtr + 12200;
  _getNPCItems(entityId, tmpBuf, maxSlots);

  const view = new DataView(HEAPU8.buffer, HEAPU8.byteOffset);
  const spiritStonesLo = view.getInt32(tmpBuf, true);
  const spiritStonesHi = view.getInt32(tmpBuf + 4, true);
  const spiritStones = spiritStonesLo + spiritStonesHi * 0x100000000;
  const familyContribution = view.getInt32(tmpBuf + 8, true);

  const items: NPCItemSlot[] = [];
  const slotCount = Math.min(maxSlots, 32);
  for (let i = 0; i < slotCount; i++) {
    const itemId = view.getInt32(tmpBuf + 12 + i * 8, true);
    const count = view.getInt32(tmpBuf + 16 + i * 8, true);
    if (itemId === 0) break;
    items.push({ itemId, count });
  }

  return { spiritStones, familyContribution, items };
}

export function wasmGetEconomicDigest(clanId: string): EconomicDigestWasm | null {
  if (!_getEconomicDigest || !HEAPU8) return null;
  const tmpBuf = _memBufPtr + 12300;
  const bytes = new TextEncoder().encode(clanId);
  HEAPU8.set(bytes.slice(0, 64), tmpBuf);
  HEAPU8[tmpBuf + bytes.length] = 0;

  const digestPtr = _memBufPtr + 12400;
  const result = _getEconomicDigest(tmpBuf, digestPtr);
  if (result === 0) return null;

  const view = new DataView(HEAPU8.buffer, HEAPU8.byteOffset);
  const posture = HEAPU8[digestPtr];
  const treasuryLo = view.getInt32(digestPtr + 1, true);
  const treasuryHi = view.getInt32(digestPtr + 5, true);
  const treasuryBalance = treasuryLo + treasuryHi * 0x100000000;
  const weeklyIncomeRate = view.getFloat32(digestPtr + 9, true);
  const weeklyExpenseRate = view.getFloat32(digestPtr + 13, true);
  const alertCount = HEAPU8[digestPtr + 17];
  const opportunityCount = HEAPU8[digestPtr + 18];
  const weaknessCount = HEAPU8[digestPtr + 19];

  const alerts: EconomicAlertWasm[] = [];
  let offset = digestPtr + 21;
  for (let i = 0; i < 3; i++) {
    const commodityType = HEAPU8[offset];
    const supply = view.getInt32(offset + 1, true);
    const demand = view.getInt32(offset + 5, true);
    const priceRatio = view.getFloat32(offset + 9, true);
    offset += 13;
    if (i < alertCount) {
      alerts.push({ commodityType, supply, demand, priceRatio });
    }
  }

  const opportunities: EconomicOpportunityWasm[] = [];
  for (let i = 0; i < 2; i++) {
    const fromClanId = view.getUint32(offset, true);
    const toClanId = view.getUint32(offset + 4, true);
    const commodityType = HEAPU8[offset + 8];
    const profitRate = view.getFloat32(offset + 9, true);
    offset += 13;
    if (i < opportunityCount) {
      opportunities.push({ fromClanId, toClanId, commodityType, profitRate });
    }
  }

  const enemyWeaknesses: EconomicWeaknessWasm[] = [];
  for (let i = 0; i < 2; i++) {
    const clanId = view.getUint32(offset, true);
    const weaknessType = HEAPU8[offset + 4];
    offset += 5;
    if (i < weaknessCount) {
      enemyWeaknesses.push({ clanId, weaknessType });
    }
  }

  return {
    posture, treasuryBalance, weeklyIncomeRate, weeklyExpenseRate,
    alertCount, alerts, opportunityCount, opportunities, weaknessCount, enemyWeaknesses,
  };
}
