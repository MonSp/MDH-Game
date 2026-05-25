import { chunkKey } from './BlockTypes';
import { ChunkData } from './ChunkData';

const DB_NAME = 'blockworld_chunks';
const DB_VERSION = 1;
const STORE_NAME = 'chunks';

interface StoredChunk {
  key: string;
  blocks: ArrayBuffer;
  timestamp: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

function writeBatch(db: IDBDatabase, chunks: StoredChunk[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    for (const chunk of chunks) {
      store.put(chunk);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveChunks(chunks: Map<string, ChunkData>): Promise<void> {
  if (chunks.size === 0) return;

  const db = await openDB();
  const batch: StoredChunk[] = [];
  const now = Date.now();

  for (const [key, data] of chunks) {
    batch.push({
      key,
      blocks: data.blocks.buffer.slice(0) as ArrayBuffer,
      timestamp: now,
    });
  }

  await writeBatch(db, batch);
}

export function saveChunksSync(chunks: Map<string, ChunkData>): void {
  if (chunks.size === 0) return;
  saveChunks(chunks).catch(err => {
    console.warn('[ChunkPersistence] Background save failed:', err);
  });
}

export async function loadChunkBlocks(
  cx: number, cy: number, cz: number,
): Promise<Uint8Array | null> {
  const key = chunkKey(cx, cy, cz);
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => {
      const entry = request.result as StoredChunk | undefined;
      if (entry && entry.blocks) {
        resolve(new Uint8Array(entry.blocks));
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteChunks(keys: string[]): Promise<void> {
  if (keys.length === 0) return;

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    for (const key of keys) {
      store.delete(key);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function hasSavedChunks(): Promise<boolean> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.count();

    request.onsuccess = () => resolve(request.result > 0);
    request.onerror = () => reject(request.error);
  });
}

export async function getSavedChunkKeys(): Promise<string[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAllKeys();

    request.onsuccess = () => resolve(request.result as string[]);
    request.onerror = () => reject(request.error);
  });
}
