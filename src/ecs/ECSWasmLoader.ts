import initModule from './ecs_wasm.js';

type WasmModule = Record<string, unknown> & {
  HEAPU8: Uint8Array;
};

const NPC_STATE_SIZE = 128;

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
  0: 'patrol',
  1: 'retreat',
  2: 'logistics',
  3: 'compete',
  4: 'work',
  5: 'rest',
  6: 'trade',
  7: 'flee',
  8: 'chase',
  9: 'dead',
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
  ambition: number;
  caution: number;
  loyalty: number;
  greed: number;
  spiritStones: number;
  name: string;
}

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

let ecsWasmReady = false;
let HEAPU8: Uint8Array | null = null;
let _statesBufferPtr = 0;
let _statsBufferPtr = 0;
let _statesBufferSize = 0;
let _maxNPC = 0;

let _init: CInitFn | null = null;
let _createNPCs: CCreateNPCsFn | null = null;
let _updateFrame: CVoidFn | null = null;
let _getNPCStateCount: (() => number) | null = null;
let _getNPCStates: CGetStatesFn | null = null;
let _getStats: CGetStatsFn | null = null;
let _destroy: CVoidFn | null = null;

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

export function readNPCStates(): NPCState[] {
  if (!_getNPCStates || !_getNPCStateCount || !HEAPU8) {
    return [];
  }

  const count = _getNPCStateCount();
  if (count === 0) return [];

  const readCount = Math.min(count, _maxNPC);
  _getNPCStates(_statesBufferPtr, readCount);

  const view = new DataView(HEAPU8.buffer, HEAPU8.byteOffset);
  const decoder = new TextDecoder();
  const result: NPCState[] = [];

  for (let i = 0; i < readCount; i++) {
    const offset = _statesBufferPtr + i * NPC_STATE_SIZE;

    const entityId = view.getUint32(offset, true);
    const x = view.getFloat32(offset + 4, true);
    const y = view.getFloat32(offset + 8, true);
    const hp = view.getInt32(offset + 12, true);
    const maxHp = view.getInt32(offset + 16, true);
    const mp = view.getInt32(offset + 20, true);
    const maxMp = view.getInt32(offset + 24, true);
    const power = view.getInt32(offset + 28, true);
    const realm = view.getInt32(offset + 32, true);
    const role = view.getInt32(offset + 36, true);
    const activity = view.getInt32(offset + 40, true);
    const layer = view.getInt32(offset + 44, true);
    const ambition = view.getFloat32(offset + 48, true);
    const caution = view.getFloat32(offset + 52, true);
    const loyalty = view.getFloat32(offset + 56, true);
    const greed = view.getFloat32(offset + 60, true);
    const spiritStonesLo = view.getInt32(offset + 64, true);
    const spiritStonesHi = view.getInt32(offset + 68, true);
    const spiritStones = spiritStonesLo + spiritStonesHi * 0x100000000;

    const nameEnd = HEAPU8.subarray(offset + 72, offset + 72 + 56).indexOf(0);
    const nameBytes = HEAPU8.subarray(offset + 72, offset + 72 + (nameEnd >= 0 ? nameEnd : 56));
    const name = decoder.decode(nameBytes);

    result.push({
      entityId, x, y, hp, maxHp, mp, maxMp, power,
      realm,
      realmName: RealmLevel[realm] ?? '练气',
      role,
      roleName: NPCRole[role] ?? '内门子弟',
      activity,
      activityName: NPCActivity[activity] ?? 'rest',
      layer, ambition, caution, loyalty, greed, spiritStones, name,
    });
  }

  return result;
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
    const malloc = Module['_malloc'] as (size: number) => number;
    HEAPU8 = Module['HEAPU8'];

    _maxNPC = maxNPC;

    _statsBufferPtr = malloc(12);
    _statesBufferSize = maxNPC * NPC_STATE_SIZE;
    _statesBufferPtr = malloc(_statesBufferSize);

    ecsWasmReady = true;
    console.log('[ECS] WASM engine loaded');
    return true;
  } catch (err) {
    console.warn('[ECS] WASM not available:', err instanceof Error ? err.message : err);
    ecsWasmReady = false;
    return false;
  }
}
