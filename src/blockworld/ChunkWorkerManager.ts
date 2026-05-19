import { MeshData, MeshLOD } from './ChunkMesher';
import { ChunkData } from './ChunkData';

interface MeshJob {
  id: number;
  resolve: (data: MeshData | null) => void;
}

type NeighborBlocks = Map<string, Uint8Array>;

export class ChunkWorkerManager {
  private workers: Worker[] = [];
  private busy: boolean[] = [];
  private queue: {
    id: number;
    blocks: ArrayBuffer;
    cx: number;
    cy: number;
    cz: number;
    neighbors: Record<string, ArrayBuffer>;
    lod: number;
    resolve: (data: MeshData | null) => void;
  }[] = [];
  private nextId = 0;
  private maxWorkers: number;

  constructor(maxWorkers = navigator.hardwareConcurrency || 4) {
    this.maxWorkers = Math.min(maxWorkers, 8);
    for (let i = 0; i < this.maxWorkers; i++) {
      this.addWorker(i);
    }
  }

  private addWorker(index: number) {
    // @ts-ignore - import.meta requires ESM, but Vite handles this at build time
    const worker = new Worker(new URL('./chunkWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      const { id, meshData, waterMeshData } = e.data;
      this.busy[index] = false;

      const job = this.queue.find(j => j.id === id);
      if (!job) return;

      this.queue = this.queue.filter(j => j.id !== id);

      if (!meshData) {
        job.resolve(null);
      } else {
        const waterMesh = waterMeshData ? {
          positions: new Float32Array(waterMeshData.positions),
          normals: new Float32Array(waterMeshData.normals),
          uvs: new Float32Array(waterMeshData.uvs),
          colors: new Float32Array(waterMeshData.colors),
          indices: new Uint32Array(waterMeshData.indices),
          vertexCount: waterMeshData.vertexCount,
          indexCount: waterMeshData.indexCount,
          waterMesh: null,
        } : null;

        job.resolve({
          positions: new Float32Array(meshData.positions),
          normals: new Float32Array(meshData.normals),
          uvs: new Float32Array(meshData.uvs),
          colors: new Float32Array(meshData.colors),
          indices: new Uint32Array(meshData.indices),
          vertexCount: meshData.vertexCount,
          indexCount: meshData.indexCount,
          waterMesh,
        });
      }

      this.flush();
    };

    worker.onerror = (err) => {
      console.error('[Worker] error:', err);
      this.busy[index] = false;
      for (const job of this.queue) {
        if (job.id === this.nextId - 1) {
          this.queue = this.queue.filter(j => j.id !== job.id);
          job.resolve(null);
          break;
        }
      }
      this.flush();
    };

    this.workers[index] = worker;
    this.busy[index] = false;
  }

  private flush() {
    for (const job of this.queue) {
      const freeIdx = this.busy.indexOf(false);
      if (freeIdx === -1) break;

      this.busy[freeIdx] = true;
      this.workers[freeIdx].postMessage({
        id: job.id,
        type: 'mesh',
        blocks: job.blocks,
        cx: job.cx,
        cy: job.cy,
        cz: job.cz,
        neighbors: job.neighbors,
        lod: job.lod,
      }, Object.values(job.neighbors).concat([job.blocks]));
    }
  }

  enqueue(
    chunk: ChunkData,
    neighbors: NeighborBlocks,
    lod: MeshLOD,
  ): Promise<MeshData | null> {
    const id = this.nextId++;

    const neighborsObj: Record<string, ArrayBuffer> = {};
    for (const [key, buf] of neighbors) {
      neighborsObj[key] = (buf.buffer as ArrayBuffer).slice(0);
    }

    return new Promise((resolve) => {
      this.queue.push({
        id,
        blocks: (chunk.blocks.buffer as ArrayBuffer).slice(0),
        cx: chunk.cx,
        cy: chunk.cy,
        cz: chunk.cz,
        neighbors: neighborsObj,
        lod: lod as number,
        resolve,
      });
      this.flush();
    });
  }

  destroy() {
    for (const w of this.workers) w.terminate();
    this.workers = [];
    this.queue = [];
  }
}
