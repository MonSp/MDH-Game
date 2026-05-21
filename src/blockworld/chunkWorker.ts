import { BlockType, CHUNK_SIZE, isSlab, isStairs, isFence, isPane, isNonCubeBlock, getNonCubeParent } from './BlockTypes';
import { MeshLOD } from './ChunkMesher';

const ATLAS_COLS = 8;

function getUVOffset(blockType: BlockType): [number, number, number, number] {
  const parentType = isNonCubeBlock(blockType) ? getNonCubeParent(blockType) : blockType;
  const i = parentType as number;
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
    && block !== BlockType.DOOR
    && block !== BlockType.SPIRIT_FIELD && block !== BlockType.FISH_SPOT && block !== BlockType.LUMBER_FIELD
    && !isSlab(block) && !isStairs(block) && !isFence(block) && !isPane(block);
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

function addSlabGeometry(
  buffers: MeshBuffers,
  bx: number, by: number, bz: number,
  type: BlockType,
  scale: number,
): void {
  const halfH = 0.5 * scale;
  const w = scale;
  const d = scale;
  const x = bx * scale;
  const y = by * scale;
  const z = bz * scale;
  const [uMin, uMax, vMin, vMax] = getUVOffset(type);

  const faces: { quad: [number,number,number][]; normal: [number,number,number]; uv: [number,number][] }[] = [
    { quad: [[x+w,y+halfH,z],[x+w,y+halfH,z+d],[x+w,y,z+d],[x+w,y,z]], normal: [1,0,0], uv: [[uMax,vMax],[uMin,vMax],[uMin,vMin],[uMax,vMin]] },
    { quad: [[x,y,z],[x,y,z+d],[x,y+halfH,z+d],[x,y+halfH,z]], normal: [-1,0,0], uv: [[uMax,vMax],[uMin,vMax],[uMin,vMin],[uMax,vMin]] },
    { quad: [[x,y+halfH,z],[x,y+halfH,z+d],[x+w,y+halfH,z+d],[x+w,y+halfH,z]], normal: [0,1,0], uv: [[uMin,vMax],[uMax,vMax],[uMax,vMin],[uMin,vMin]] },
    { quad: [[x,y,z],[x+w,y,z],[x+w,y,z+d],[x,y,z+d]], normal: [0,-1,0], uv: [[uMin,vMax],[uMax,vMax],[uMax,vMin],[uMin,vMin]] },
    { quad: [[x,y+halfH,z+d],[x,y,z+d],[x+w,y,z+d],[x+w,y+halfH,z+d]], normal: [0,0,1], uv: [[uMax,vMin],[uMin,vMin],[uMin,vMax],[uMax,vMax]] },
    { quad: [[x,y,z],[x,y+halfH,z],[x+w,y+halfH,z],[x+w,y,z]], normal: [0,0,-1], uv: [[uMin,vMax],[uMax,vMax],[uMax,vMin],[uMin,vMin]] },
  ];

  for (const face of faces) {
    const vi = buffers.vertexIndex;
    for (let qi = 0; qi < 4; qi++) {
      buffers.positions.push(face.quad[qi][0], face.quad[qi][1], face.quad[qi][2]);
      buffers.normals.push(face.normal[0], face.normal[1], face.normal[2]);
      buffers.uvs.push(face.uv[qi][0], face.uv[qi][1]);
      buffers.colors.push(1, 1, 1);
    }
    buffers.indices.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
    buffers.vertexIndex += 4;
  }
}

function addStairGeometry(
  buffers: MeshBuffers,
  bx: number, by: number, bz: number,
  type: BlockType,
  scale: number,
): void {
  const s = scale;
  const hs = s * 0.5;
  const x = bx * s;
  const y = by * s;
  const z = bz * s;
  const [uMin, uMax, vMin, vMax] = getUVOffset(type);

  const uMid = (uMin + uMax) * 0.5;
  const vMid = (vMin + vMax) * 0.5;

  const baseUV: [number, number][] = [[uMin, vMax], [uMax, vMax], [uMax, vMin], [uMin, vMin]];
  const halfUV: [number, number][] = [[uMin, vMax], [uMid, vMax], [uMid, vMin], [uMin, vMin]];

  type F = { q: [number,number,number][]; n: [number,number,number]; uv: [number,number][] };
  const faces: F[] = [];

  faces.push({ q: [[x+s,y+hs,z],[x+s,y+hs,z+s],[x+s,y,z+s],[x+s,y,z]], n: [1,0,0], uv: baseUV });
  faces.push({ q: [[x+hs,y+hs,z+s],[x+hs,y+hs,z],[x+hs,y,z],[x+hs,y,z+s]], n: [-1,0,0], uv: halfUV });
  faces.push({ q: [[x+hs,y+hs,z],[x+s,y+hs,z],[x+s,y+hs,z+s],[x+hs,y+hs,z+s]], n: [0,1,0], uv: [[uMid,vMax],[uMax,vMax],[uMax,vMin],[uMid,vMin]] });
  faces.push({ q: [[x,y+hs,z],[x+hs,y+hs,z],[x+hs,y,z],[x,y,z]], n: [0,1,0], uv: halfUV });
  faces.push({ q: [[x+hs,y,z],[x+hs,y+hs,z],[x+s,y+hs,z],[x+s,y,z]], n: [0,1,0], uv: halfUV });
  faces.push({ q: [[x,y,z],[x+s,y,z],[x+s,y,z+s],[x,y,z+s]], n: [0,-1,0], uv: baseUV });
  faces.push({ q: [[x+hs,y+hs,z+s],[x+s,y+hs,z+s],[x+s,y,z+s],[x+hs,y,z+s]], n: [0,0,1], uv: [[uMid,vMax],[uMax,vMax],[uMax,vMin],[uMid,vMin]] });
  faces.push({ q: [[x,y,z+s],[x+hs,y,z+s],[x+hs,y+hs,z+s],[x,y+hs,z+s]], n: [0,0,1], uv: halfUV });
  faces.push({ q: [[x,y,z],[x,y+hs,z],[x+hs,y+hs,z],[x+hs,y,z]], n: [0,0,-1], uv: baseUV });
  faces.push({ q: [[x+hs,y,z],[x+s,y,z],[x+s,y+hs,z],[x+hs,y+hs,z]], n: [0,0,-1], uv: baseUV });

  for (const face of faces) {
    const vi = buffers.vertexIndex;
    for (let qi = 0; qi < 4; qi++) {
      buffers.positions.push(face.q[qi][0], face.q[qi][1], face.q[qi][2]);
      buffers.normals.push(face.n[0], face.n[1], face.n[2]);
      buffers.uvs.push(face.uv[qi][0], face.uv[qi][1]);
      buffers.colors.push(1, 1, 1);
    }
    buffers.indices.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
    buffers.vertexIndex += 4;
  }
}

function addFenceGeometry(
  buffers: MeshBuffers,
  blocks: Uint8Array,
  neighbors: Map<string, Uint8Array>,
  bx: number, by: number, bz: number,
  type: BlockType,
  scale: number,
): void {
  const s = scale;
  const x = bx * s;
  const y = by * s;
  const z = bz * s;
  const pw = s * 0.125;
  const ph = s * 1.5;
  const cx = x + s * 0.5;
  const cz = z + s * 0.5;
  const [uMin, uMax, vMin, vMax] = getUVOffset(type);
  const uMid = (uMin + uMax) * 0.5;
  const vMid = (vMin + vMax) * 0.5;

  const p = (a: number, b: number, c: number): [number, number, number] => [a, b, c];

  type F = { q: [number,number,number][]; n: [number,number,number]; uv: [number,number][] };

  const postFaces: F[] = [
    { q: [p(cx+pw,y+ph,cz+pw),p(cx+pw,y+ph,cz-pw),p(cx+pw,y,cz-pw),p(cx+pw,y,cz+pw)], n: [1,0,0], uv: [[uMax,vMax],[uMin,vMax],[uMin,vMin],[uMax,vMin]] },
    { q: [p(cx-pw,y+ph,cz-pw),p(cx-pw,y+ph,cz+pw),p(cx-pw,y,cz+pw),p(cx-pw,y,cz-pw)], n: [-1,0,0], uv: [[uMax,vMax],[uMin,vMax],[uMin,vMin],[uMax,vMin]] },
    { q: [p(cx-pw,y+ph,cz-pw),p(cx+pw,y+ph,cz-pw),p(cx+pw,y+ph,cz+pw),p(cx-pw,y+ph,cz+pw)], n: [0,1,0], uv: [[uMin,vMax],[uMax,vMax],[uMax,vMin],[uMin,vMin]] },
    { q: [p(cx-pw,y,cz+pw),p(cx+pw,y,cz+pw),p(cx+pw,y,cz-pw),p(cx-pw,y,cz-pw)], n: [0,-1,0], uv: [[uMin,vMax],[uMax,vMax],[uMax,vMin],[uMin,vMin]] },
    { q: [p(cx+pw,y+ph,cz+pw),p(cx-pw,y+ph,cz+pw),p(cx-pw,y,cz+pw),p(cx+pw,y,cz+pw)], n: [0,0,1], uv: [[uMax,vMin],[uMin,vMin],[uMin,vMax],[uMax,vMax]] },
    { q: [p(cx-pw,y+ph,cz-pw),p(cx+pw,y+ph,cz-pw),p(cx+pw,y,cz-pw),p(cx-pw,y,cz-pw)], n: [0,0,-1], uv: [[uMin,vMax],[uMax,vMax],[uMax,vMin],[uMin,vMin]] },
  ];

  for (const face of postFaces) {
    const vi = buffers.vertexIndex;
    for (let qi = 0; qi < 4; qi++) {
      buffers.positions.push(face.q[qi][0], face.q[qi][1], face.q[qi][2]);
      buffers.normals.push(face.n[0], face.n[1], face.n[2]);
      buffers.uvs.push(face.uv[qi][0], face.uv[qi][1]);
      buffers.colors.push(1, 1, 1);
    }
    buffers.indices.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
    buffers.vertexIndex += 4;
  }

  const dirs: [number, number, [number,number,number], [number,number,number]][] = [
    [1, 0, p(cx+pw, y+s*0.8, cz-pw), p(cx+pw, y+s*0.8, cz+pw)],
    [-1, 0, p(cx-pw, y+s*0.8, cz+pw), p(cx-pw, y+s*0.8, cz-pw)],
    [0, 1, p(cx-pw, y+s*0.8, cz+pw), p(cx+pw, y+s*0.8, cz+pw)],
    [0, -1, p(cx+pw, y+s*0.8, cz-pw), p(cx-pw, y+s*0.8, cz-pw)],
  ];

  for (const [dx, dz, p1, p2] of dirs) {
    const barH = pw;
    const barType = readBlock(blocks, neighbors, bx + dx, by, bz + dz, scale);
    if (isFence(barType) || (!isNonCubeBlock(barType) && barType !== BlockType.AIR && barType !== BlockType.WATER)) {
      const barFaces: F[] = [
        { q: [p(p1[0],p1[1]+barH,p1[2]),p(p2[0],p2[1]+barH,p2[2]),p(p2[0],p2[1]-barH,p2[2]),p(p1[0],p1[1]-barH,p1[2])],
          n: dx !== 0 ? [dx,0,0] : [0,0,dz],
          uv: [[uMid,vMid],[uMid,vMid],[uMid,vMid],[uMid,vMid]] },
        { q: [p(p2[0],p2[1]+barH,p2[2]),p(p1[0],p1[1]+barH,p1[2]),p(p1[0],p1[1]-barH,p1[2]),p(p2[0],p2[1]-barH,p2[2])],
          n: dx !== 0 ? [-dx,0,0] : [0,0,-dz],
          uv: [[uMid,vMid],[uMid,vMid],[uMid,vMid],[uMid,vMid]] },
        { q: [p(p1[0],p1[1]+barH,p1[2]),p(p2[0],p2[1]+barH,p2[2]),p(p2[0],p2[1]+barH,p2[2]),p(p1[0],p1[1]+barH,p1[2])],
          n: [0,1,0], uv: [[uMid,vMid],[uMid,vMid],[uMid,vMid],[uMid,vMid]] },
        { q: [p(p2[0],p2[1]-barH,p2[2]),p(p1[0],p1[1]-barH,p1[2]),p(p1[0],p1[1]-barH,p1[2]),p(p2[0],p2[1]-barH,p2[2])],
          n: [0,-1,0], uv: [[uMid,vMid],[uMid,vMid],[uMid,vMid],[uMid,vMid]] },
      ];
      for (const face of barFaces) {
        const vi = buffers.vertexIndex;
        for (let qi = 0; qi < 4; qi++) {
          buffers.positions.push(face.q[qi][0], face.q[qi][1], face.q[qi][2]);
          buffers.normals.push(face.n[0], face.n[1], face.n[2]);
          buffers.uvs.push(face.uv[qi][0], face.uv[qi][1]);
          buffers.colors.push(1, 1, 1);
        }
        buffers.indices.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
        buffers.vertexIndex += 4;
      }
    }
  }
}

function addPaneGeometry(
  buffers: MeshBuffers,
  blocks: Uint8Array,
  neighbors: Map<string, Uint8Array>,
  bx: number, by: number, bz: number,
  type: BlockType,
  scale: number,
): void {
  const s = scale;
  const x = bx * s;
  const y = by * s;
  const z = bz * s;
  const pw = s * 0.0625;
  const [uMin, uMax, vMin, vMax] = getUVOffset(type);
  const uMid = (uMin + uMax) * 0.5;
  const vMid = (vMin + vMax) * 0.5;

  type F = { q: [number,number,number][]; n: [number,number,number]; uv: [number,number][] };

  const paneUV: [number, number][] = [[uMid, vMax], [uMid, vMax], [uMid, vMin], [uMid, vMin]];

  const dirs: [number, number, number, number][] = [
    [1, 0, x + s, x + s],
    [-1, 0, x, x],
    [0, 1, z + s, z + s],
    [0, -1, z, z],
  ];

  for (const [dx, dz, edgeX, edgeZ] of dirs) {
    const adjType = readBlock(blocks, neighbors, bx + dx, by, bz + dz, scale);
    if (isPane(adjType) || (!isNonCubeBlock(adjType) && adjType !== BlockType.AIR && adjType !== BlockType.WATER)) {
      const isX = dx !== 0;
      if (isX) {
        const qx = edgeX - pw;
        const faces: F[] = [
          { q: [[qx, y + s, z + s], [qx, y + s, z], [qx, y, z], [qx, y, z + s]], n: dx > 0 ? [1, 0, 0] : [-1, 0, 0], uv: paneUV },
          { q: [[qx, y + s, z], [qx + pw * 2, y + s, z], [qx + pw * 2, y + s, z + s], [qx, y + s, z + s]], n: dx > 0 ? [-1, 0, 0] : [1, 0, 0], uv: paneUV },
        ];
        for (const face of faces) {
          const vi = buffers.vertexIndex;
          for (let qi = 0; qi < 4; qi++) {
            buffers.positions.push(face.q[qi][0], face.q[qi][1], face.q[qi][2]);
            buffers.normals.push(face.n[0], face.n[1], face.n[2]);
            buffers.uvs.push(face.uv[qi][0], face.uv[qi][1]);
            buffers.colors.push(1, 1, 1);
          }
          buffers.indices.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
          buffers.vertexIndex += 4;
        }
      } else {
        const qz = edgeZ - pw;
        const faces: F[] = [
          { q: [[x, y + s, qz], [x + s, y + s, qz], [x + s, y, qz], [x, y, qz]], n: dz > 0 ? [0, 0, 1] : [0, 0, -1], uv: paneUV },
          { q: [[x + s, y + s, qz + pw * 2], [x, y + s, qz + pw * 2], [x, y + s, qz], [x + s, y + s, qz]], n: dz > 0 ? [0, 0, -1] : [0, 0, 1], uv: paneUV },
        ];
        for (const face of faces) {
          const vi = buffers.vertexIndex;
          for (let qi = 0; qi < 4; qi++) {
            buffers.positions.push(face.q[qi][0], face.q[qi][1], face.q[qi][2]);
            buffers.normals.push(face.n[0], face.n[1], face.n[2]);
            buffers.uvs.push(face.uv[qi][0], face.uv[qi][1]);
            buffers.colors.push(1, 1, 1);
          }
          buffers.indices.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
          buffers.vertexIndex += 4;
        }
      }
    }
  }

  const postFaces: F[] = [
    { q: [[x + s - pw, y + s, z + s - pw], [x + s - pw, y + s, z + pw], [x + s - pw, y, z + pw], [x + s - pw, y, z + s - pw]], n: [1, 0, 0], uv: paneUV },
    { q: [[x + pw, y + s, z + pw], [x + pw, y + s, z + s - pw], [x + pw, y, z + s - pw], [x + pw, y, z + pw]], n: [-1, 0, 0], uv: paneUV },
    { q: [[x + s, y + s, z + pw], [x, y + s, z + pw], [x, y, z + pw], [x + s, y, z + pw]], n: [0, 0, 1], uv: paneUV },
    { q: [[x, y + s, z + s - pw], [x + s, y + s, z + s - pw], [x + s, y, z + s - pw], [x, y, z + s - pw]], n: [0, 0, -1], uv: paneUV },
  ];
  for (const face of postFaces) {
    const vi = buffers.vertexIndex;
    for (let qi = 0; qi < 4; qi++) {
      buffers.positions.push(face.q[qi][0], face.q[qi][1], face.q[qi][2]);
      buffers.normals.push(face.n[0], face.n[1], face.n[2]);
      buffers.uvs.push(face.uv[qi][0], face.uv[qi][1]);
      buffers.colors.push(1, 1, 1);
    }
    buffers.indices.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
    buffers.vertexIndex += 4;
  }
}

function generateNonCubeGeometry(
  buffers: MeshBuffers,
  blocks: Uint8Array,
  neighbors: Map<string, Uint8Array>,
  lod: MeshLOD,
): void {
  const scale = lod as number;
  const dim = CHUNK_SIZE / scale;

  for (let by = 0; by < dim; by++) {
    for (let bz = 0; bz < dim; bz++) {
      for (let bx = 0; bx < dim; bx++) {
        const block = readBlock(blocks, neighbors, bx * scale, by * scale, bz * scale, scale);
        if (!isNonCubeBlock(block)) continue;

        if (isSlab(block)) {
          addSlabGeometry(buffers, bx, by, bz, block, scale);
        } else if (isStairs(block)) {
          addStairGeometry(buffers, bx, by, bz, block, scale);
        } else if (isFence(block)) {
          addFenceGeometry(buffers, blocks, neighbors, bx, by, bz, block, scale);
        } else if (isPane(block)) {
          addPaneGeometry(buffers, blocks, neighbors, bx, by, bz, block, scale);
        }
      }
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
            if (isNonCubeBlock(block)) continue;

            if (nb === BlockType.AIR || nb === BlockType.WATER || isNonCubeBlock(nb)) {
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

  generateNonCubeGeometry(solidBuf, blocks, neighbors, lod);

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
