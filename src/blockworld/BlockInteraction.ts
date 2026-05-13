import { CHUNK_SIZE, BlockType, worldToChunk, worldToBlockLocal, chunkKey } from './BlockTypes';
import { ChunkData } from './ChunkData';

export interface BlockRayResult {
  hitChunkX: number;
  hitChunkY: number;
  hitChunkZ: number;
  hitBlockX: number;
  hitBlockY: number;
  hitBlockZ: number;
  hitType: BlockType;
  hitFace: number;
  placeChunkX: number;
  placeChunkY: number;
  placeChunkZ: number;
  placeBlockX: number;
  placeBlockY: number;
  placeBlockZ: number;
}

const EPSILON = 0.0001;

export function raycastBlock(
  originX: number,
  originY: number,
  originZ: number,
  dirX: number,
  dirY: number,
  dirZ: number,
  maxDist: number,
  getChunk: (cx: number, cy: number, cz: number) => ChunkData | undefined,
): BlockRayResult | null {
  let stepX = dirX > 0 ? 1 : -1;
  let stepY = dirY > 0 ? 1 : -1;
  let stepZ = dirZ > 0 ? 1 : -1;

  let tDeltaX = Math.abs(dirX) < EPSILON ? Infinity : Math.abs(1 / dirX);
  let tDeltaY = Math.abs(dirY) < EPSILON ? Infinity : Math.abs(1 / dirY);
  let tDeltaZ = Math.abs(dirZ) < EPSILON ? Infinity : Math.abs(1 / dirZ);

  let currentX = Math.floor(originX);
  let currentY = Math.floor(originY);
  let currentZ = Math.floor(originZ);

  let tMaxX = stepX > 0
    ? (currentX + 1 - originX) * tDeltaX
    : (originX - currentX) * tDeltaX;
  let tMaxY = stepY > 0
    ? (currentY + 1 - originY) * tDeltaY
    : (originY - currentY) * tDeltaY;
  let tMaxZ = stepZ > 0
    ? (currentZ + 1 - originZ) * tDeltaZ
    : (originZ - currentZ) * tDeltaZ;

  let prevX = currentX;
  let prevY = currentY;
  let prevZ = currentZ;
  let hitFace = 0;
  let t = 0;

  for (let i = 0; i < Math.ceil(maxDist * 3); i++) {
    if (tMaxX < tMaxY) {
      if (tMaxX < tMaxZ) {
        prevX = currentX;
        prevY = currentY;
        prevZ = currentZ;
        currentX += stepX;
        hitFace = stepX > 0 ? 0 : 1;
        t = tMaxX;
        tMaxX += tDeltaX;
      } else {
        prevX = currentX;
        prevY = currentY;
        prevZ = currentZ;
        currentZ += stepZ;
        hitFace = stepZ > 0 ? 4 : 5;
        t = tMaxZ;
        tMaxZ += tDeltaZ;
      }
    } else {
      if (tMaxY < tMaxZ) {
        prevX = currentX;
        prevY = currentY;
        prevZ = currentZ;
        currentY += stepY;
        hitFace = stepY > 0 ? 2 : 3;
        t = tMaxY;
        tMaxY += tDeltaY;
      } else {
        prevX = currentX;
        prevY = currentY;
        prevZ = currentZ;
        currentZ += stepZ;
        hitFace = stepZ > 0 ? 4 : 5;
        t = tMaxZ;
        tMaxZ += tDeltaZ;
      }
    }

    if (t > maxDist) return null;

    const { cx, cy, cz } = worldToChunk(currentX, currentY, currentZ);
    const chunk = getChunk(cx, cy, cz);
    if (!chunk) continue;

    const { bx, by, bz } = worldToBlockLocal(currentX, currentY, currentZ);
    const blockType = chunk.getBlock(bx, by, bz);

    if (blockType !== BlockType.AIR) {
      const { cx: pcx, cy: pcy, cz: pcz } = worldToChunk(prevX, prevY, prevZ);
      const { bx: pbx, by: pby, bz: pbz } = worldToBlockLocal(prevX, prevY, prevZ);

      return {
        hitChunkX: cx,
        hitChunkY: cy,
        hitChunkZ: cz,
        hitBlockX: bx,
        hitBlockY: by,
        hitBlockZ: bz,
        hitType: blockType,
        hitFace,
        placeChunkX: pcx,
        placeChunkY: pcy,
        placeChunkZ: pcz,
        placeBlockX: pbx,
        placeBlockY: pby,
        placeBlockZ: pbz,
      };
    }
  }

  return null;
}
