import { BlockType, CHUNK_SIZE } from './BlockTypes';
import { MeshLOD } from './ChunkMesher';

const ATLAS_COLS = 8;

function getUVOffset(blockType: BlockType): [number, number, number, number] {
  const i = blockType as number;
  const col = i % ATLAS_COLS;
  const row = Math.floor(i / ATLAS_COLS);
  const uMin = col / ATLAS_COLS;
  const uMax = (col + 1) / ATLAS_COLS;
  const vMin = 1 - (row + 1) / ATLAS_COLS;
  const vMax = 1 - row / ATLAS_COLS;
  return [uMin, uMax, vMin, vMax];
}

const NEIGHBOR_OFFSETS: [number, number, number][] = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];

const FACE_NORMALS: [number, number, number][] = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];

interface WorkerMessage {
  id: number;
  type: 'mesh';
  blocks: ArrayBuffer;
  cx: number;
  cy: number;
  cz: number;
  neighbors: Record<string, ArrayBuffer>;
  lod: number;
}

interface WorkerMeshPayload {
  positions: ArrayBuffer;
  normals: ArrayBuffer;
  uvs: ArrayBuffer;
  colors: ArrayBuffer;
  indices: ArrayBuffer;
  vertexCount: number;
  indexCount: number;
}

interface WorkerResponse {
  id: number;
  meshData: WorkerMeshPayload | null;
  waterMeshData: WorkerMeshPayload | null;
}

function faceQuad(
  face: number,
  bx: number, by: number, bz: number,
  w: number, h: number,
): [number, number, number][] {
  if (face === 0) return [[bx, by, bz], [bx, by + w, bz], [bx, by + w, bz + h], [bx, by, bz + h]];
  if (face === 1) return [[bx, by, bz], [bx, by, bz + h], [bx, by + w, bz + h], [bx, by + w, bz]];
  if (face === 2) return [[bx, by, bz], [bx, by, bz + w], [bx + h, by, bz + w], [bx + h, by, bz]];
  if (face === 3) return [[bx, by, bz + w], [bx, by, bz], [bx + h, by, bz], [bx + h, by, bz + w]];
  if (face === 4) return [[bx, by, bz], [bx + w, by, bz], [bx + w, by + h, bz], [bx, by + h, bz]];
  return [[bx, by + h, bz], [bx + w, by + h, bz], [bx + w, by, bz], [bx, by, bz]];
}

function readBlock(blocks: Uint8Array, neighbors: Map<string, Uint8Array>, bx: number, by: number, bz: number, scale: number): BlockType {
  if (bx >= 0 && bx < CHUNK_SIZE && by >= 0 && by < CHUNK_SIZE && bz >= 0 && bz < CHUNK_SIZE) {
    if (scale === 1) {
      return blocks[by * 256 + bz * 16 + bx] as BlockType;
    }
    for (let dy = 0; dy < scale; dy++) {
      for (let dz = 0; dz < scale; dz++) {
        for (let dx = 0; dx < scale; dx++) {
          const sx = bx + dx, sy = by + dy, sz = bz + dz;
          if (sx >= CHUNK_SIZE || sy >= CHUNK_SIZE || sz >= CHUNK_SIZE) continue;
          if (blocks[sy * 256 + sz * 16 + sx] !== BlockType.AIR) {
            return blocks[sy * 256 + sz * 16 + sx] as BlockType;
          }
        }
      }
    }
    return BlockType.AIR;
  }

  const chunkX = Math.floor(bx / CHUNK_SIZE);
  const chunkY = Math.floor(by / CHUNK_SIZE);
  const chunkZ = Math.floor(bz / CHUNK_SIZE);
  const nKey = `${chunkX},${chunkY},${chunkZ}`;
  const nBlocks = neighbors.get(nKey);
  if (!nBlocks) return BlockType.AIR;

  const lx = ((bx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  const ly = ((by % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  const lz = ((bz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

  if (scale === 1) {
    return nBlocks[ly * 256 + lz * 16 + lx] as BlockType;
  }

  for (let dy = 0; dy < scale; dy++) {
    for (let dz = 0; dz < scale; dz++) {
      for (let dx = 0; dx < scale; dx++) {
        const sx = lx + dx, sy = ly + dy, sz = lz + dz;
        if (sx >= CHUNK_SIZE || sy >= CHUNK_SIZE || sz >= CHUNK_SIZE) continue;
        if (nBlocks[sy * 256 + sz * 16 + sx] !== BlockType.AIR) {
          return nBlocks[sy * 256 + sz * 16 + sx] as BlockType;
        }
      }
    }
  }
  return BlockType.AIR;
}

function isOccludingForAO(block: BlockType): boolean {
  return block !== BlockType.AIR && block !== BlockType.WATER
    && block !== BlockType.LEAVES && block !== BlockType.OAK_LEAVES
    && block !== BlockType.SPRUCE_LEAVES && block !== BlockType.BIRCH_LEAVES
    && block !== BlockType.CHERRY_LEAVES
    && block !== BlockType.WINDOW && block !== BlockType.FENCE && block !== BlockType.LANTERN
    && block !== BlockType.SPIRIT_FIELD && block !== BlockType.FISH_SPOT && block !== BlockType.LUMBER_FIELD;
}

function aoToShade(ao: number): number {
  return 1.0 - ao * 0.1667;
}

function computeTopColumnAO(
  blocks: Uint8Array,
  neighbors: Map<string, Uint8Array>,
  bx: number, by: number, bz: number,
  scale: number,
): number {
  let occ = 0;
  const oy = by + scale;

  if (isOccludingForAO(readBlock(blocks, neighbors, bx + scale, oy, bz, scale))) occ++;
  if (isOccludingForAO(readBlock(blocks, neighbors, bx - scale, oy, bz, scale))) occ++;
  if (isOccludingForAO(readBlock(blocks, neighbors, bx, oy, bz + scale, scale))) occ++;
  if (isOccludingForAO(readBlock(blocks, neighbors, bx, oy, bz - scale, scale))) occ++;

  if (occ < 3) {
    if (isOccludingForAO(readBlock(blocks, neighbors, bx + scale, oy, bz + scale, scale))) occ++;
    if (occ < 3 && isOccludingForAO(readBlock(blocks, neighbors, bx - scale, oy, bz + scale, scale))) occ++;
    if (occ < 3 && isOccludingForAO(readBlock(blocks, neighbors, bx + scale, oy, bz - scale, scale))) occ++;
    if (occ < 3 && isOccludingForAO(readBlock(blocks, neighbors, bx - scale, oy, bz - scale, scale))) occ++;
  }

  return Math.min(3, occ);
}

interface GreedyCell {
  type: BlockType;
  ao: number;
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

function buildMeshPayload(buffers: MeshBuffers): WorkerMeshPayload | null {
  if (buffers.vertexIndex === 0) return null;
  const positions = new Float32Array(buffers.positions);
  const normals = new Float32Array(buffers.normals);
  const uvs = new Float32Array(buffers.uvs);
  const colors = new Float32Array(buffers.colors);
  const indices = new Uint32Array(buffers.indices);
  return {
    positions: positions.buffer,
    normals: normals.buffer,
    uvs: uvs.buffer,
    colors: colors.buffer,
    indices: indices.buffer,
    vertexCount: buffers.vertexIndex,
    indexCount: indices.length,
  };
}

function pushQuad(
  buffers: MeshBuffers,
  quad: [number, number, number][],
  normal: [number, number, number],
  uvQuad: [number, number][],
  aoValues: [number, number, number, number],
): void {
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
}

function greedyMerge(
  buffers: MeshBuffers,
  mask: (GreedyCell | null)[][],
  face: number,
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
      while (u + width < uDim && mask[v][u + width]?.type === cell.type) width++;

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
      cx[axis] = w; cx[uAxis] = u; cx[vAxis] = v;

      const wh: [number, number, number] = [0, 0, 0];
      wh[axis] = 1; wh[uAxis] = width; wh[vAxis] = height;

      let qx = cx[0] * scale; let qy = cx[1] * scale; let qz = cx[2] * scale;
      if (face === 0) { qx += scale; }
      else if (face === 2) { qy += scale; }
      else if (face === 4) { qz += scale; }
      const qw = wh[uAxis] * scale; const qh = wh[vAxis] * scale;
      const quad = faceQuad(face, qx, qy, qz, qw, qh);

      const [uMin, uMax, vMin, vMax] = getUVOffset(cell.type);
      const uvQuad: [number, number][] = [[uMin, vMin], [uMax, vMin], [uMax, vMax], [uMin, vMax]];

      const aoValues: [number, number, number, number] = [
        mask[v][u]!.ao,
        mask[v][u + width - 1]!.ao,
        mask[v + height - 1][u + width - 1]!.ao,
        mask[v + height - 1][u]!.ao,
      ];

      pushQuad(buffers, quad, normal, uvQuad, aoValues);

      for (let dv = 0; dv < height; dv++)
        for (let du = 0; du < width; du++)
          mask[v + dv][u + du] = null;

      u += width;
    }
  }
}

function doMesh(
  blocks: Uint8Array,
  neighbors: Map<string, Uint8Array>,
  lod: MeshLOD,
): { solid: WorkerMeshPayload | null; water: WorkerMeshPayload | null } {
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
          bc[axis] = w; bc[uAxis] = u; bc[vAxis] = v;

          const block = readBlock(blocks, neighbors, bc[0] * scale, bc[1] * scale, bc[2] * scale, scale);
          if (block === BlockType.AIR) continue;

          const nb = readBlock(
            blocks, neighbors,
            bc[0] * scale + nx * scale, bc[1] * scale + ny * scale, bc[2] * scale + nz * scale,
            scale,
          );

          const isWater = block === BlockType.WATER;

          if (isWater) {
            if (nb === BlockType.AIR) {
              waterMask[v][u] = { type: BlockType.WATER, ao: 0 };
            }
          } else {
            if (nb === BlockType.AIR || nb === BlockType.WATER) {
              const ao = computeTopColumnAO(blocks, neighbors, bc[0] * scale, bc[1] * scale, bc[2] * scale, scale);
              mask[v][u] = { type: block, ao };
            }
          }
        }
      }

      greedyMerge(solidBuf, mask, face, uDim, vDim, w, axis, uAxis, vAxis, normal as [number, number, number], scale);
      greedyMerge(waterBuf, waterMask, face, uDim, vDim, w, axis, uAxis, vAxis, normal as [number, number, number], scale);
    }
  }

  return { solid: buildMeshPayload(solidBuf), water: buildMeshPayload(waterBuf) };
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { id, blocks, neighbors, lod } = e.data;
  const blockArray = new Uint8Array(blocks);

  const neighborMap = new Map<string, Uint8Array>();
  for (const [key, buf] of Object.entries(neighbors)) {
    neighborMap.set(key, new Uint8Array(buf));
  }

  const { solid, water } = doMesh(blockArray, neighborMap, lod as MeshLOD);

  if (!solid) {
    self.postMessage({ id, meshData: null, waterMeshData: null } satisfies WorkerResponse);
    return;
  }

  const buffers: ArrayBuffer[] = [
    solid.positions, solid.normals, solid.uvs, solid.colors, solid.indices,
  ];
  if (water) {
    buffers.push(water.positions, water.normals, water.uvs, water.colors, water.indices);
  }

  const response: WorkerResponse = { id, meshData: solid, waterMeshData: water };
  (self as any).postMessage(response, buffers);
};
