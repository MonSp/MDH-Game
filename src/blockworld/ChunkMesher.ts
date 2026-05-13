import { BlockType, CHUNK_SIZE } from './BlockTypes';
import { ChunkData } from './ChunkData';
import { getUVOffset } from './TextureAtlas';

export interface MeshData {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
  vertexCount: number;
  indexCount: number;
  waterMesh: MeshData | null;
}

export enum MeshLOD {
  LOD0 = 1,
  LOD1 = 2,
  LOD2 = 4,
}

type NeighborFn = (bx: number, by: number, bz: number) => BlockType;

const NEIGHBOR_OFFSETS: [number, number, number][] = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];

const FACE_NORMALS: [number, number, number][] = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];

function isOccludingForAO(block: BlockType): boolean {
  return block !== BlockType.AIR && block !== BlockType.WATER && block !== BlockType.LEAVES;
}

function aoToShade(ao: number): number {
  return 1.0 - ao * 0.1667;
}

function computeTopColumnAO(
  chunk: ChunkData,
  neighborFn: NeighborFn,
  bx: number, by: number, bz: number,
  scale: number,
): number {
  let occ = 0;
  const oy = by + scale;

  if (isOccludingForAO(getBlockAt(chunk, neighborFn, bx + scale, oy, bz, scale))) occ++;
  if (isOccludingForAO(getBlockAt(chunk, neighborFn, bx - scale, oy, bz, scale))) occ++;
  if (isOccludingForAO(getBlockAt(chunk, neighborFn, bx, oy, bz + scale, scale))) occ++;
  if (isOccludingForAO(getBlockAt(chunk, neighborFn, bx, oy, bz - scale, scale))) occ++;

  if (occ < 3) {
    if (isOccludingForAO(getBlockAt(chunk, neighborFn, bx + scale, oy, bz + scale, scale))) occ++;
    if (occ < 3 && isOccludingForAO(getBlockAt(chunk, neighborFn, bx - scale, oy, bz + scale, scale))) occ++;
    if (occ < 3 && isOccludingForAO(getBlockAt(chunk, neighborFn, bx + scale, oy, bz - scale, scale))) occ++;
    if (occ < 3 && isOccludingForAO(getBlockAt(chunk, neighborFn, bx - scale, oy, bz - scale, scale))) occ++;
  }

  return Math.min(3, occ);
}

function faceQuad(
  face: number,
  bx: number, by: number, bz: number,
  w: number, h: number,
): [number, number, number][] {
  if (face === 0) return [[bx, by, bz + w], [bx, by, bz], [bx, by + h, bz], [bx, by + h, bz + w]];
  if (face === 1) return [[bx, by, bz], [bx, by, bz + w], [bx, by + h, bz + w], [bx, by + h, bz]];
  if (face === 2) return [[bx, by, bz + w], [bx + w, by, bz + w], [bx + w, by, bz], [bx, by, bz]];
  if (face === 3) return [[bx, by, bz], [bx + w, by, bz], [bx + w, by, bz + w], [bx, by, bz + w]];
  if (face === 4) return [[bx + w, by + h, bz], [bx, by + h, bz], [bx, by, bz], [bx + w, by, bz]];
  return [[bx, by + h, bz], [bx + w, by + h, bz], [bx + w, by, bz], [bx, by, bz]];
}

interface GreedyCell {
  type: BlockType;
  ao: number;
  quadStart: number;
}

interface MeshBuffers {
  positions: number[];
  normals: number[];
  uvs: number[];
  colors: number[];
  indices: number[];
  vertexIndex: number;
}

function createBuffers(): MeshBuffers {
  return { positions: [], normals: [], uvs: [], colors: [], indices: [], vertexIndex: 0 };
}

function buildMeshData(buffers: MeshBuffers): MeshData | null {
  if (buffers.vertexIndex === 0) return null;
  return {
    positions: new Float32Array(buffers.positions),
    normals: new Float32Array(buffers.normals),
    uvs: new Float32Array(buffers.uvs),
    colors: new Float32Array(buffers.colors),
    indices: new Uint32Array(buffers.indices),
    vertexCount: buffers.vertexIndex,
    indexCount: buffers.indices.length,
    waterMesh: null,
  };
}

function pushQuad(
  buffers: MeshBuffers,
  quad: [number, number, number][],
  normal: [number, number, number],
  uvQuad: [number, number][],
  aoValues: [number, number, number, number],
): number {
  const vi = buffers.vertexIndex;
  for (let qi = 0; qi < 4; qi++) {
    const [px, py, pz] = quad[qi];
    buffers.positions.push(px, py, pz);
    buffers.normals.push(normal[0], normal[1], normal[2]);
    buffers.uvs.push(uvQuad[qi][0], uvQuad[qi][1]);
    const s = aoToShade(aoValues[qi]);
    buffers.colors.push(s, s, s);
  }
  buffers.indices.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
  buffers.vertexIndex += 4;
  return vi;
}

export function generateChunkMesh(
  chunk: ChunkData,
  neighborFn: NeighborFn,
  lod: MeshLOD = MeshLOD.LOD0,
): MeshData | null {
  const scale = lod as number;
  const dim = CHUNK_SIZE / scale;

  const solidBuf = createBuffers();
  const waterBuf = createBuffers();

  for (let face = 0; face < 6; face++) {
    const [nx, ny, nz] = NEIGHBOR_OFFSETS[face];
    const normal = FACE_NORMALS[face];

    const axis = face >> 1;
    const uAxis = (axis + 1) % 3;
    const vAxis = (axis + 2) % 3;

    const sizes = [dim, dim, dim];
    const uDim = sizes[uAxis];
    const vDim = sizes[vAxis];
    const wDim = sizes[axis];

    for (let w = 0; w < wDim; w++) {
      const mask: (GreedyCell | null)[][] = Array.from({ length: vDim }, () => Array(uDim).fill(null));
      const waterMask: (GreedyCell | null)[][] = Array.from({ length: vDim }, () => Array(uDim).fill(null));

      for (let v = 0; v < vDim; v++) {
        for (let u = 0; u < uDim; u++) {
          const bc: [number, number, number] = [0, 0, 0];
          bc[axis] = w;
          bc[uAxis] = u;
          bc[vAxis] = v;

          const block = getBlockAt(chunk, neighborFn, bc[0] * scale, bc[1] * scale, bc[2] * scale, scale);
          if (block === BlockType.AIR) continue;

          const nb = getBlockAt(
            chunk, neighborFn,
            bc[0] * scale + nx * scale, bc[1] * scale + ny * scale, bc[2] * scale + nz * scale,
            scale,
          );

          const isWater = block === BlockType.WATER;

          if (isWater) {
            if (nb === BlockType.AIR) {
              waterMask[v][u] = { type: BlockType.WATER, ao: 0, quadStart: 0 };
            }
          } else {
            if (nb === BlockType.AIR || nb === BlockType.WATER) {
              const ao = computeTopColumnAO(chunk, neighborFn, bc[0] * scale, bc[1] * scale, bc[2] * scale, scale);
              mask[v][u] = { type: block, ao, quadStart: 0 };
            }
          }
        }
      }

      greedyMerge(solidBuf, mask, face, dim, uDim, vDim, w, axis, uAxis, vAxis, normal as [number, number, number], scale);
      greedyMerge(waterBuf, waterMask, face, dim, uDim, vDim, w, axis, uAxis, vAxis, normal as [number, number, number], scale);
    }
  }

  const solid = buildMeshData(solidBuf);
  if (!solid) return null;

  solid.waterMesh = buildMeshData(waterBuf);
  return solid;
}

function greedyMerge(
  buffers: MeshBuffers,
  mask: (GreedyCell | null)[][],
  face: number,
  dim: number,
  uDim: number,
  vDim: number,
  w: number,
  axis: number,
  uAxis: number,
  vAxis: number,
  normal: [number, number, number],
  scale: number,
): void {
  for (let v = 0; v < vDim; v++) {
    let u = 0;
    while (u < uDim) {
      const cell = mask[v][u];
      if (!cell) { u++; continue; }

      let width = 1;
      while (u + width < uDim && mask[v][u + width] && mask[v][u + width]!.type === cell.type) {
        width++;
      }

      let height = 1;
      outer:
      while (v + height < vDim) {
        for (let du = 0; du < width; du++) {
          const below = mask[v + height][u + du];
          if (!below || below.type !== cell.type) break outer;
        }
        height++;
      }

      const cx: [number, number, number] = [0, 0, 0];
      cx[axis] = w;
      cx[uAxis] = u;
      cx[vAxis] = v;

      const wh: [number, number, number] = [0, 0, 0];
      wh[axis] = 1;
      wh[uAxis] = width;
      wh[vAxis] = height;

      const qx = cx[0] * scale;
      const qy = cx[1] * scale;
      const qz = cx[2] * scale;
      const qw = wh[uAxis] * scale;
      const qh = wh[vAxis] * scale;

      const quad = faceQuad(face, qx, qy, qz, qw, qh);

      const [uMin, uMax, vMin, vMax] = getUVOffset(cell.type);
      const uvQuad: [number, number][] = face === 0 || face === 4
        ? [[uMax, vMin], [uMin, vMin], [uMin, vMax], [uMax, vMax]]
        : [[uMin, vMin], [uMax, vMin], [uMax, vMax], [uMin, vMax]];

      const aoValues: [number, number, number, number] = [
        mask[v][u]!.ao,
        mask[v][u + width - 1]!.ao,
        mask[v + height - 1][u + width - 1]!.ao,
        mask[v + height - 1][u]!.ao,
      ];

      pushQuad(buffers, quad, normal, uvQuad, aoValues);

      for (let dv = 0; dv < height; dv++) {
        for (let du = 0; du < width; du++) {
          mask[v + dv][u + du] = null;
        }
      }

      u += width;
    }
  }
}

function getBlockAt(
  chunk: ChunkData,
  neighborFn: NeighborFn,
  bx: number, by: number, bz: number,
  scale: number,
): BlockType {
  if (bx < 0 || bx >= CHUNK_SIZE || by < 0 || by >= CHUNK_SIZE || bz < 0 || bz >= CHUNK_SIZE) {
    return neighborFn(bx, by, bz);
  }

  if (scale === 1) {
    const idx = by * 256 + bz * 16 + bx;
    return chunk.blocks[idx] as BlockType;
  }

  for (let dy = 0; dy < scale; dy++) {
    for (let dz = 0; dz < scale; dz++) {
      for (let dx = 0; dx < scale; dx++) {
        const sx = bx + dx;
        const sy = by + dy;
        const sz = bz + dz;
        if (sx >= CHUNK_SIZE || sy >= CHUNK_SIZE || sz >= CHUNK_SIZE) continue;
        const idx = sy * 256 + sz * 16 + sx;
        if (chunk.blocks[idx] !== BlockType.AIR) return chunk.blocks[idx] as BlockType;
      }
    }
  }

  for (let dy = 0; dy < scale; dy++) {
    for (let dz = 0; dz < scale; dz++) {
      for (let dx = 0; dx < scale; dx++) {
        const nb = neighborFn(bx + dx, by + dy, bz + dz);
        if (nb !== BlockType.AIR) return nb;
      }
    }
  }

  return BlockType.AIR;
}
