import initModule from './blockworld_wasm.js';

type WasmModule = Record<string, unknown> & {
  HEAPU8: Uint8Array;
};

let bwWasmReady = false;
let bwWasmInit: (() => void) | null = null;
let bwWasmGetTerrainHeight: ((wx: number, wz: number) => number) | null = null;
let bwWasmGenerateChunk: ((cx: number, cy: number, cz: number, blocks: Uint8Array) => void) | null = null;
let bwWasmChunkSize: (() => number) | null = null;
let bwWasmChunkTotal: (() => number) | null = null;
let bwWasmDestroy: (() => void) | null = null;

export function isWasmReady(): boolean {
  return bwWasmReady;
}

export function getWasmGetTerrainHeight(): ((wx: number, wz: number) => number) | null {
  return bwWasmGetTerrainHeight;
}

export function getWasmGenerateChunk(): ((cx: number, cy: number, cz: number, blocks: Uint8Array) => void) | null {
  return bwWasmGenerateChunk;
}

export async function initWasm(): Promise<boolean> {
  if (bwWasmReady) return true;

  try {
    const Module = (await initModule({
      locateFile: (path: string) => '/' + path,
    })) as WasmModule;

    const _bw_init = Module['_bw_init'] as () => void;
    const _bw_getTerrainHeight = Module['_bw_getTerrainHeight'] as (wx: number, wz: number) => number;
    const _bw_generateChunkTerrain = Module['_bw_generateChunkTerrain'] as (cx: number, cy: number, cz: number, ptr: number) => void;
    const _bw_destroy = Module['_bw_destroy'] as () => void;
    const _bw_chunkSize = Module['_bw_chunkSize'] as () => number;
    const _bw_chunkTotal = Module['_bw_chunkTotal'] as () => number;
    const _malloc = Module['_malloc'] as (size: number) => number;
    const HEAPU8 = Module['HEAPU8'];

    const chunkTotal = _bw_chunkSize() * _bw_chunkSize() * _bw_chunkSize();
    const blocksPtr = _malloc(chunkTotal);

    bwWasmInit = _bw_init;
    bwWasmGetTerrainHeight = _bw_getTerrainHeight;
    bwWasmChunkSize = _bw_chunkSize;
    bwWasmChunkTotal = _bw_chunkTotal;
    bwWasmDestroy = _bw_destroy;

    bwWasmGenerateChunk = (cx: number, cy: number, cz: number, outBlocks: Uint8Array) => {
      _bw_generateChunkTerrain(cx, cy, cz, blocksPtr);
      outBlocks.set(HEAPU8.subarray(blocksPtr, blocksPtr + chunkTotal));
    };

    _bw_init();
    bwWasmReady = true;
    console.log('[BlockWorld] WASM terrain generator loaded');
    return true;
  } catch (err) {
    console.warn('[BlockWorld] WASM not available, falling back to JS:', err instanceof Error ? err.message : err);
    bwWasmReady = false;
    return false;
  }
}
