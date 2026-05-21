import { ChunkData } from './ChunkData';
import { MeshData, MeshLOD } from './ChunkMesher';

export interface CachedChunk {
  data: ChunkData;
  meshData: MeshData | null;
  lod: MeshLOD;
}

export class ChunkCache {
  private cache = new Map<string, CachedChunk>();
  private order: string[] = [];
  private maxSize: number;

  constructor(maxSize: number = 5000) {
    this.maxSize = maxSize;
  }

  get(key: string): CachedChunk | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      const idx = this.order.indexOf(key);
      if (idx !== -1) {
        this.order.splice(idx, 1);
        this.order.push(key);
      }
    }
    return entry;
  }

  set(key: string, entry: CachedChunk): void {
    if (this.cache.has(key)) {
      this.cache.set(key, entry);
      const idx = this.order.indexOf(key);
      if (idx !== -1) {
        this.order.splice(idx, 1);
        this.order.push(key);
      }
      return;
    }
    while (this.cache.size >= this.maxSize) {
      const oldest = this.order.shift();
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(key, entry);
    this.order.push(key);
  }

  delete(key: string): void {
    this.cache.delete(key);
    const idx = this.order.indexOf(key);
    if (idx !== -1) this.order.splice(idx, 1);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  get size(): number {
    return this.cache.size;
  }
}
