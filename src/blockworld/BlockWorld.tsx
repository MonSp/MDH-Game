import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { CHUNK_SIZE, chunkKey, worldToChunk, BlockType } from './BlockTypes';
import { ChunkData } from './ChunkData';
import { generateChunk } from './ChunkGenerator';
import { MeshData, MeshLOD } from './ChunkMesher';
import { ChunkMesh } from './ChunkMesh';
import { blockWorldPlayer } from './PlayerState';
import { setChunkDataMap } from './FirstPersonController';
import { ChunkWorkerManager } from './ChunkWorkerManager';
import { BlockSelectionHelper } from './BlockSelectionHelper';
import { BlockMiningOverlay } from './BlockMiningOverlay';
import { BlockBreakParticles } from './BlockBreakParticles';
import { PostProcessing } from './PostProcessing';

const HORIZONTAL_VIEW_CHUNKS = 6;
const VERTICAL_VIEW_CHUNKS = 2;
const LOD0_DIST = 3;
const LOD1_DIST = 5;

interface LoadedChunk {
  data: ChunkData;
  meshData: MeshData | null;
  lod: MeshLOD;
  loading: boolean;
}

function chunkDist(cx: number, cy: number, cz: number, pcx: number, pcy: number, pcz: number): number {
  const dx = Math.abs(cx - pcx);
  const dy = Math.abs(cy - pcy);
  const dz = Math.abs(cz - pcz);
  return Math.max(dx, dy, dz);
}

function getLOD(dist: number): MeshLOD {
  if (dist <= LOD0_DIST) return MeshLOD.LOD0;
  if (dist <= LOD1_DIST) return MeshLOD.LOD1;
  return MeshLOD.LOD2;
}

export const blockWorldActions: {
  setBlock: ((wx: number, wy: number, wz: number, type: BlockType) => void) | null;
  getChunkData: ((cx: number, cy: number, cz: number) => ChunkData | undefined) | null;
} = {
  setBlock: null,
  getChunkData: null,
};

export const BlockWorld: React.FC = () => {
  const [chunks, setChunks] = useState<Map<string, LoadedChunk>>(new Map());
  const chunksRef = useRef(chunks);
  chunksRef.current = chunks;

  const chunkDataMap = useRef(new Map<string, ChunkData>());
  const workerRef = useRef<ChunkWorkerManager | null>(null);
  const loadingSet = useRef(new Set<string>());
  const chunkGenRef = useRef(new Map<string, number>());
  const remeshChunkRef = useRef<(cx: number, cy: number, cz: number) => void>(() => {});

  useEffect(() => {
    setChunkDataMap(chunkDataMap.current);
    workerRef.current = new ChunkWorkerManager(4);

    blockWorldActions.getChunkData = (cx, cy, cz) => chunkDataMap.current.get(chunkKey(cx, cy, cz));

    blockWorldActions.setBlock = (wx, wy, wz, type) => {
      setBlockAt(wx, wy, wz, type);
    };

    return () => {
      workerRef.current?.destroy();
      blockWorldActions.setBlock = null;
      blockWorldActions.getChunkData = null;
    };
  }, []);

  const buildNeighbors = useCallback((cx: number, cy: number, cz: number): Map<string, Uint8Array> => {
    const offsets = [[-1,0,0],[1,0,0],[0,-1,0],[0,1,0],[0,0,-1],[0,0,1]];
    const result = new Map<string, Uint8Array>();
    for (const [dx, dy, dz] of offsets) {
      const nk = chunkKey(cx + dx, cy + dy, cz + dz);
      const nd = chunkDataMap.current.get(nk);
      if (nd) result.set(`${dx},${dy},${dz}`, nd.blocks);
    }
    return result;
  }, []);

  const remeshChunk = useCallback((cx: number, cy: number, cz: number) => {
    const key = chunkKey(cx, cy, cz);
    const entry = chunksRef.current.get(key);
    if (!entry) {
      chunkGenRef.current.set(key, (chunkGenRef.current.get(key) || 0) + 1);
      return;
    }
    const gen = (chunkGenRef.current.get(key) || 0) + 1;
    chunkGenRef.current.set(key, gen);

    loadingSet.current.add(key);

    setChunks(prev => {
      const next = new Map(prev);
      const e = next.get(key);
      if (e) next.set(key, { ...e, loading: true });
      return next;
    });

    const data = chunkDataMap.current.get(key) || entry.data;
    workerRef.current!.enqueue(data, buildNeighbors(cx, cy, cz), entry.lod).then(meshData => {
      loadingSet.current.delete(key);
      if (chunkGenRef.current.get(key) !== gen) return;
      setChunks(prev => {
        const next = new Map(prev);
        const e = next.get(key);
        if (e) {
          next.set(key, { ...e, meshData, loading: false });
        }
        return next;
      });
    });
  }, [buildNeighbors]);

  remeshChunkRef.current = remeshChunk;

  const setBlockAt = useCallback((wx: number, wy: number, wz: number, type: BlockType) => {
    const { cx, cy, cz } = worldToChunk(wx, wy, wz);
    const key = chunkKey(cx, cy, cz);
    const data = chunkDataMap.current.get(key);
    if (!data) return;

    const mod = (n: number, d: number) => ((n % d) + d) % d;
    const bx = Math.floor(mod(wx, CHUNK_SIZE));
    const by = Math.floor(mod(wy, CHUNK_SIZE));
    const bz = Math.floor(mod(wz, CHUNK_SIZE));

    if (data.getBlock(bx, by, bz) === type) return;

    data.setBlock(bx, by, bz, type);

    const chunksToRemesh = new Set<string>();
    chunksToRemesh.add(key);

    if (bx === 0) chunksToRemesh.add(chunkKey(cx - 1, cy, cz));
    if (bx === CHUNK_SIZE - 1) chunksToRemesh.add(chunkKey(cx + 1, cy, cz));
    if (by === 0) chunksToRemesh.add(chunkKey(cx, cy - 1, cz));
    if (by === CHUNK_SIZE - 1) chunksToRemesh.add(chunkKey(cx, cy + 1, cz));
    if (bz === 0) chunksToRemesh.add(chunkKey(cx, cy, cz - 1));
    if (bz === CHUNK_SIZE - 1) chunksToRemesh.add(chunkKey(cx, cy, cz + 1));

    for (const k of chunksToRemesh) {
      if (chunkDataMap.current.has(k)) {
        const [cxStr, cyStr, czStr] = k.split(',');
        remeshChunk(Number(cxStr), Number(cyStr), Number(czStr));
      }
    }
  }, [remeshChunk]);

  const loadChunk = useCallback((cx: number, cy: number, cz: number, lod: MeshLOD) => {
    const key = chunkKey(cx, cy, cz);
    if (chunksRef.current.has(key)) {
      const existing = chunksRef.current.get(key)!;
      if (existing.lod <= lod) return;
      if (loadingSet.current.has(key)) return;
      const gen = (chunkGenRef.current.get(key) || 0) + 1;
      chunkGenRef.current.set(key, gen);
      loadingSet.current.add(key);
      setChunks(prev => {
        const next = new Map(prev);
        const e = next.get(key);
        if (e) next.set(key, { ...e, lod, loading: true });
        return next;
      });
      const data = chunkDataMap.current.get(key) || existing.data;
      workerRef.current!.enqueue(data, buildNeighbors(cx, cy, cz), lod).then(meshData => {
        loadingSet.current.delete(key);
        if (chunkGenRef.current.get(key) !== gen) return;
        setChunks(prev => {
          const next = new Map(prev);
          const e = next.get(key);
          if (e) next.set(key, { ...e, meshData, lod, loading: false });
          return next;
        });
      });
      return;
    }
    if (loadingSet.current.has(key)) return;

    const gen = (chunkGenRef.current.get(key) || 0) + 1;
    chunkGenRef.current.set(key, gen);
    loadingSet.current.add(key);

    const data = generateChunk(cx, cy, cz);
    chunkDataMap.current.set(key, data);

    setChunks(prev => {
      const next = new Map(prev);
      next.set(key, { data, meshData: null, lod, loading: true });
      return next;
    });

    workerRef.current!.enqueue(data, buildNeighbors(cx, cy, cz), lod).then(meshData => {
      loadingSet.current.delete(key);
      if (chunkGenRef.current.get(key) !== gen) return;
      setChunks(prev => {
        const next = new Map(prev);
        const entry = next.get(key);
        if (entry) {
          next.set(key, { ...entry, meshData, loading: false });
        }
        return next;
      });

      const offsets = [[-1,0,0],[1,0,0],[0,-1,0],[0,1,0],[0,0,-1],[0,0,1]];
      for (const [dx, dy, dz] of offsets) {
        const nk = chunkKey(cx + dx, cy + dy, cz + dz);
        if (chunkDataMap.current.has(nk) && !loadingSet.current.has(nk)) {
          remeshChunkRef.current(cx + dx, cy + dy, cz + dz);
        }
      }
    });
  }, [buildNeighbors]);

  const unloadChunk = useCallback((cx: number, cy: number, cz: number) => {
    const key = chunkKey(cx, cy, cz);
    if (!chunksRef.current.has(key)) return;
    if (loadingSet.current.has(key)) {
      loadingSet.current.delete(key);
    }
    chunkGenRef.current.delete(key);
    chunkDataMap.current.delete(key);
    setChunks(prev => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const frameRef = useRef(0);
  useFrame((_, delta) => {
    frameRef.current += delta;
    const waterMat = (ChunkMesh as any).__waterMaterial;
    if (waterMat) {
      waterMat.opacity = 0.6 + Math.sin(frameRef.current * 1.5) * 0.05;
    }

    const { cx, cy, cz } = worldToChunk(
      blockWorldPlayer.position.x,
      blockWorldPlayer.position.y,
      blockWorldPlayer.position.z,
    );

    const currentKeys = new Set(chunksRef.current.keys());
    const desiredKeys = new Map<string, number>();

    for (let dcx = -HORIZONTAL_VIEW_CHUNKS; dcx <= HORIZONTAL_VIEW_CHUNKS; dcx++) {
      for (let dcz = -HORIZONTAL_VIEW_CHUNKS; dcz <= HORIZONTAL_VIEW_CHUNKS; dcz++) {
        for (let dcy = -VERTICAL_VIEW_CHUNKS; dcy <= VERTICAL_VIEW_CHUNKS; dcy++) {
          const tcx = cx + dcx;
          const tcy = cy + dcy;
          const tcz = cz + dcz;
          desiredKeys.set(chunkKey(tcx, tcy, tcz), chunkDist(tcx, tcy, tcz, cx, cy, cz));
        }
      }
    }

    for (const key of currentKeys) {
      if (!desiredKeys.has(key)) {
        const [cxStr, cyStr, czStr] = key.split(',');
        unloadChunk(Number(cxStr), Number(cyStr), Number(czStr));
      }
    }

    for (const [key, dist] of desiredKeys) {
      if (!loadingSet.current.has(key)) {
        const [cxStr, cyStr, czStr] = key.split(',');
        loadChunk(Number(cxStr), Number(cyStr), Number(czStr), getLOD(dist));
      }
    }
  });

  const chunkEntries = Array.from(chunks.entries());

  return (
    <>
      <group>
        {chunkEntries.map(([key, entry]) => {
          if (!entry.meshData) return null;
          const [cxStr, cyStr, czStr] = key.split(',');
          return (
            <ChunkMesh
              key={key}
              cx={Number(cxStr)}
              cy={Number(cyStr)}
              cz={Number(czStr)}
              meshData={entry.meshData}
            />
          );
        })}
        <BlockSelectionHelper />
        <BlockMiningOverlay />
        <BlockBreakParticles />
      </group>
      <PostProcessing />
    </>
  );
};
