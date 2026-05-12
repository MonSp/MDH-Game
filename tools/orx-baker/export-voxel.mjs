#!/usr/bin/env node
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

/* ──── Material palette (matches VoxelRenderer.tsx MATERIAL_COLORS) ──── */
const MATERIAL_HEX = {
  stone: '#808080',
  wood: '#8B5E3C',
  earth: '#A0522D',
  metal: '#B0B0B0',
  thatch: '#C4A35A',
};

/* ──── Country wall/roof palette (matches CityRegistry.ts PALETTE) ──── */
const COUNTRY_PALETTE = {
  'qi': { wall: '#6b5b4a', roof: '#1a2a4a' },
  'chu': { wall: '#5a2a4a', roof: '#2a0a2a' },
  'qin': { wall: '#3a3020', roof: '#1a1a2e' },
  'zhao': { wall: '#6a3a2a', roof: '#2a0a0a' },
  'yan': { wall: '#5a5040', roof: '#1a2a2a' },
  'wei': { wall: '#4a5a3a', roof: '#1a2a0a' },
  'han': { wall: '#5a4a2a', roof: '#2a1a0a' },
};

const VOXEL_SIZE = 1 / 3; // 0.333m per block

/* ──── Build palette table and color→index lookup ──── */
function buildPalette(country) {
  const cp = COUNTRY_PALETTE[country] || COUNTRY_PALETTE['qi'];
  const colors = [
    ...Object.values(MATERIAL_HEX),   // 5 material colors
    cp.wall,                           // palette[5] = wall color
    cp.roof,                           // palette[6] = roof color
  ];
  const lookup = {};
  colors.forEach((c, i) => { lookup[c] = i; });
  return { hex: colors, index: lookup };
}

class VoxelBuilder {
  constructor(dimX, dimY, dimZ) {
    this.dimX = dimX;
    this.dimY = dimY;
    this.dimZ = dimZ;
    const total = dimX * dimY * dimZ;
    this.data = new Int32Array(total);
    this.data.fill(-1); // -1 = empty
  }

  idx(x, y, z) {
    return x + y * this.dimX + z * this.dimX * this.dimY;
  }

  fillBox(x0, y0, z0, x1, y1, z1, paletteIdx) {
    for (let z = z0; z <= z1; z++)
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++)
          this.data[this.idx(x, y, z)] = paletteIdx;
  }

  fillHollow(x0, y0, z0, x1, y1, z1, paletteIdx) {
    // floor
    this.fillBox(x0, y0, z0, x1, y0, z1, paletteIdx);
    // walls
    for (let y = y0 + 1; y < y1; y++) {
      this.fillBox(x0, y, z0, x1, y, z0, paletteIdx);
      this.fillBox(x0, y, z1, x1, y, z1, paletteIdx);
      this.fillBox(x0, y, z0 + 1, x0, y, z1 - 1, paletteIdx);
      this.fillBox(x1, y, z0 + 1, x1, y, z1 - 1, paletteIdx);
    }
    // roof
    this.fillBox(x0, y1, z0, x1, y1, z1, paletteIdx);
  }

  toJSON(paletteHex) {
    const data = [];
    for (let i = 0; i < this.data.length; i++) {
      data.push(this.data[i]);
    }
    return {
      dimX: this.dimX,
      dimY: this.dimY,
      dimZ: this.dimZ,
      palette: paletteHex,
      data,
    };
  }
}

/* ──── Build a capital building section ──── */
function buildCapitalSection(country) {
  const palette = buildPalette(country);
  const wi = palette.index;

  // Physical size: 20m x 16m base, 8m walls
  const physW = 20, physD = 16, physH = 8;
  const dimX = Math.ceil(physW / VOXEL_SIZE);   // 60
  const dimY = Math.ceil(physH / VOXEL_SIZE);   // 24
  const dimZ = Math.ceil(physD / VOXEL_SIZE);   // 48

  const builder = new VoxelBuilder(dimX, dimY, dimZ);

  // Outer wall (stone base + country-color top) — boundary perimeter
  const wallIdx = wi[palette.hex[5]];  // country wall color
  builder.fillBox(0, 0, 0, dimX - 1, dimY - 1, 0, wallIdx);
  builder.fillBox(0, 0, dimZ - 1, dimX - 1, dimY - 1, dimZ - 1, wallIdx);
  builder.fillBox(0, 0, 1, 0, dimY - 1, dimZ - 2, wallIdx);
  builder.fillBox(dimX - 1, 0, 1, dimX - 1, dimY - 1, dimZ - 2, wallIdx);

  // Gate opening on south wall (z = dimZ-1)
  const gateX = Math.floor(dimX / 2) - 3;
  const gateH = Math.floor(dimY * 0.5);
  for (let x = gateX; x < gateX + 6; x++)
    for (let y = 0; y < gateH; y++)
      builder.data[builder.idx(x, y, dimZ - 1)] = -1;

  // Gate pillars
  const pillarIdx = wi['#B0B0B0']; // metal gate pillars
  builder.fillBox(gateX - 1, 0, dimZ - 1, gateX - 1, gateH, dimZ - 1, pillarIdx);
  builder.fillBox(gateX + 6, 0, dimZ - 1, gateX + 6, gateH, dimZ - 1, pillarIdx);

  // Inner palace building (hollow box) at center
  const px0 = Math.floor(dimX * 0.25);
  const px1 = Math.floor(dimX * 0.75);
  const pz0 = Math.floor(dimZ * 0.2);
  const pz1 = Math.floor(dimZ * 0.55);
  const ph = Math.floor(dimY * 0.6);
  const woodIdx = wi['#8B5E3C'];
  const roofIdx = wi[palette.hex[6]]; // country roof color
  builder.fillHollow(px0, 1, pz0, px1, ph, pz1, woodIdx);
  // roof (palace roof color)
  builder.fillBox(px0, ph + 1, pz0 - 1, px1 + 1, ph + 2, pz1 + 1, roofIdx);

  // Small courtyard building
  const cx0 = Math.floor(dimX * 0.3);
  const cx1 = Math.floor(dimX * 0.7);
  const cz0 = Math.floor(dimZ * 0.6);
  const cz1 = Math.floor(dimZ * 0.8);
  const ch = Math.floor(dimY * 0.35);
  builder.fillHollow(cx0, 1, cz0, cx1, ch, cz1, woodIdx);
  builder.fillBox(cx0, ch + 1, cz0 - 1, cx1 + 1, ch + 1, cz1 + 1, roofIdx);

  return builder.toJSON(palette.hex);
}

/* ──── Main ──── */
const country = process.argv[2] || 'qi';
const outDir = process.argv[3] || './output_voxel';

mkdirSync(outDir, { recursive: true });

const json = buildCapitalSection(country);
const outPath = join(outDir, `capital_${country}.json`);
writeFileSync(outPath, JSON.stringify(json, null, 2));

console.log(`[OK] Exported ${country} capital voxels:`);
console.log(`     Dimensions: ${json.dimX} x ${json.dimY} x ${json.dimZ}`);
console.log(`     Palette:   ${json.palette.length} colors`);
console.log(`     Voxels:    ${json.data.length} (${json.data.filter(v => v >= 0).length} solid)`);
console.log(`     File:      ${outPath}`);
