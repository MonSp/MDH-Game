// Pixel art sprite generator — Canvas2D → THREE.CanvasTexture
// All sprites are procedurally generated, zero external assets.

import * as THREE from 'three';
import { TerrainType } from '../shared/types/map';
import type { Realm, BodyType, MonsterType } from '../store/gameConstants';
import { getRealmAura, getBodyTypeGlow, getRoleAppearance } from './appearance';

// --- Helpers ---

function createCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

function canvasToTexture(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}

// --- Caches ---

const charCache = new Map<string, THREE.CanvasTexture>();
const monsterCache = new Map<string, THREE.CanvasTexture>();
const terrainCache = new Map<TerrainType, THREE.CanvasTexture>();
const effectCache = new Map<string, THREE.CanvasTexture>();

// --- 2.3a: Character Sprites (48×48) ---

function drawCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, alpha: number = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawPixel(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

export function generateCharacterSprite(realm: Realm, bodyType: BodyType, role: string): THREE.CanvasTexture {
  const key = `${realm}|${bodyType}|${role}`;
  const cached = charCache.get(key);
  if (cached) return cached;

  const [c, ctx] = createCanvas(48, 48);
  const { auraColor, auraOpacity } = getRealmAura(realm);
  const { glowColor } = getBodyTypeGlow(bodyType);
  const { bodyHexColor, hairHexColor, skinHexColor, hasBun } = getRoleAppearance(role);
  const isGlowing = glowColor !== 'transparent';

  // LAYER 1: realm aura glow (background circle)
  const auraRadius = 10 + ['凡人','练气','筑基','金丹','元婴','化神','炼虚','合体','大乘','渡劫'].indexOf(realm) * 1.5;
  drawCircle(ctx, 24, 32, auraRadius, auraColor, auraOpacity);

  // LAYER 2: robe skirt (道袍下摆)
  drawRect(ctx, 15, 28, 18, 12, bodyHexColor);
  // skirt shadow (left side)
  drawRect(ctx, 15, 28, 4, 12, darkenColor(bodyHexColor, 0.2));

  // LAYER 3: robe body (道袍躯干)
  drawRect(ctx, 14, 16, 20, 14, bodyHexColor);
  // collar V-shape
  ctx.fillStyle = darkenColor(bodyHexColor, 0.3);
  ctx.beginPath();
  ctx.moveTo(18, 16);
  ctx.lineTo(24, 22);
  ctx.lineTo(30, 16);
  ctx.fill();
  // belt
  const beltColor = role === '家主' || role === '长老' || role === '执法堂长老' ? '#fbbf24' : darkenColor(bodyHexColor, 0.1);
  drawRect(ctx, 14, 26, 20, 2, beltColor);

  // LAYER 4: wide sleeves
  const sleeveColor = darkenColor(bodyHexColor, 0.1);
  drawRect(ctx, 8, 20, 6, 10, sleeveColor);   // left sleeve
  drawRect(ctx, 34, 20, 6, 10, sleeveColor);  // right sleeve

  // LAYER 5: head
  drawRect(ctx, 18, 8, 12, 10, skinHexColor);
  // eyes (2 pixels)
  drawPixel(ctx, 21, 12, '#000000');
  drawPixel(ctx, 27, 12, '#000000');
  // mouth
  drawRect(ctx, 22, 15, 4, 1, darkenColor(skinHexColor, 0.3));

  // LAYER 6: hair
  drawRect(ctx, 17, 4, 14, 5, hairHexColor);
  // hair bun (古风)
  if (hasBun) {
    drawRect(ctx, 21, 0, 6, 6, hairHexColor);
    // hair ornament
    const ornamentColor = role === '家主' ? '#fbbf24' : role === '长老' ? '#a855f7' : '#ffffff';
    drawPixel(ctx, 24, 1, ornamentColor);
  }
  // side hair
  drawRect(ctx, 17, 8, 3, 4, hairHexColor);
  drawRect(ctx, 28, 8, 3, 4, hairHexColor);

  // LAYER 7: body type glow overlay
  if (isGlowing) {
    ctx.save();
    const grad = ctx.createRadialGradient(24, 24, 2, 24, 24, 16);
    grad.addColorStop(0, glowColor + '40');
    grad.addColorStop(1, glowColor + '00');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 48, 48);
    ctx.restore();
  }

  // LAYER 8: realm-specific overlay
  const realmIdx = ['凡人','练气','筑基','金丹','元婴','化神','炼虚','合体','大乘','渡劫'].indexOf(realm);
  if (realmIdx >= 8) {
    // red glow overlay for high realm
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(6, 2, 36, 36);
    ctx.restore();
  } else if (realmIdx >= 6) {
    // gold shimmer
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(6, 2, 36, 36);
    ctx.restore();
  }

  const tex = canvasToTexture(c);
  charCache.set(key, tex);
  return tex;
}

function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - Math.round(amount * 255));
  const g = Math.max(0, ((num >> 8) & 0xFF) - Math.round(amount * 255));
  const b = Math.max(0, (num & 0xFF) - Math.round(amount * 255));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// --- 2.3a: Monster Sprites (32×32) ---

function drawMonsterBody(ctx: CanvasRenderingContext2D, pixels: [number, number, string][]) {
  for (const [x, y, color] of pixels) {
    drawPixel(ctx, x, y, color);
  }
}

export function generateMonsterSprite(type: MonsterType, realm: Realm): THREE.CanvasTexture {
  const key = `${type}|${realm}`;
  const cached = monsterCache.get(key);
  if (cached) return cached;

  const [c, ctx] = createCanvas(32, 32);

  // background aura
  const { auraColor, auraOpacity } = getRealmAura(realm);
  drawCircle(ctx, 16, 20, 12, auraColor, auraOpacity);

  // Draw monster-specific body
  const pixels = getMonsterPixels(type);
  for (const [x, y, color] of pixels) {
    drawPixel(ctx, x + 8, y + 6, color);
  }

  // Eyes (white dots)
  const eyeY = type === '金翅大鹏' ? 10 : 14;
  drawPixel(ctx, 13, eyeY, '#ffffff');
  drawPixel(ctx, 19, eyeY, '#ffffff');

  const tex = canvasToTexture(c);
  monsterCache.set(key, tex);
  return tex;
}

function getMonsterPixels(type: MonsterType): [number, number, string][] {
  const pixels: [number, number, string][] = [];
  switch (type) {
    case '赤焰蛇': {
      // serpent body — wavy line
      const snakeColors = ['#dc2626', '#ea580c', '#dc2626'];
      for (let i = 0; i < 16; i++) {
        const yOff = Math.sin(i * 0.8) * 3;
        for (let dy = -1; dy <= 1; dy++) {
          pixels.push([i, 8 + Math.round(yOff) + dy, snakeColors[(i + dy + 12) % 3]]);
        }
      }
      // flame tips
      for (let i = 0; i < 4; i++) {
        pixels.push([15 + i, 8 + Math.round(Math.sin(i * 1.5) * 2), '#f97316']);
      }
      break;
    }
    case '冰晶蝎': {
      // body
      for (let y = 6; y <= 14; y++) {
        for (let x = 4; x <= 10; x++) {
          if ((x + y) % 3 !== 0) pixels.push([x, y, '#06b6d4']);
        }
      }
      // pincers (left/right)
      for (let i = 0; i < 4; i++) {
        pixels.push([2, 8 + i, '#0891b2']);
        pixels.push([14, 8 + i, '#0891b2']);
      }
      // tail (curling up)
      for (let i = 0; i < 6; i++) {
        pixels.push([9 + Math.round(Math.sin(i * 0.5) * 1.5), 4 - i, '#0284c7']);
      }
      // tail stinger
      pixels.push([10, -2, '#fef08a']);
      break;
    }
    case '幽冥狼': {
      // body
      for (let y = 8; y <= 14; y++) {
        for (let x = 4; x <= 12; x++) {
          if (Math.random() > 0.2) pixels.push([x, y, '#581c87']);
        }
      }
      // head
      for (let y = 4; y <= 8; y++) {
        for (let x = 10; x <= 14; x++) {
          pixels.push([x, y, '#6b21a8']);
        }
      }
      // ears
      pixels.push([11, 2, '#6b21a8']); pixels.push([12, 1, '#6b21a8']);
      pixels.push([13, 2, '#6b21a8']); pixels.push([14, 1, '#6b21a8']);
      // ghostly tail
      for (let i = 0; i < 5; i++) {
        pixels.push([3 + i, 10 + Math.round(Math.sin(i) * 1.5), '#a855f7']);
      }
      break;
    }
    case '雷纹虎': {
      // body
      for (let y = 8; y <= 14; y++) {
        for (let x = 3; x <= 12; x++) {
          pixels.push([x, y, '#d97706']);
        }
      }
      // stripes (dark)
      for (let i = 0; i < 5; i++) {
        for (let dy = 0; dy < 4; dy++) {
          pixels.push([5 + i * 2, 9 + dy, '#451a03']);
        }
      }
      // head
      for (let y = 4; y <= 8; y++) {
        for (let x = 10; x <= 14; x++) {
          pixels.push([x, y, '#d97706']);
        }
      }
      // mane
      for (let i = 0; i < 3; i++) {
        pixels.push([10 + i, 2, '#f59e0b']);
        pixels.push([10 + i, 3, '#f59e0b']);
      }
      break;
    }
    case '血玉蛛': {
      // round body
      for (let y = 6; y <= 16; y++) {
        for (let x = 5; x <= 15; x++) {
          const dx = x - 10, dy = y - 11;
          if (dx * dx + dy * dy <= 25) pixels.push([x, y, '#991b1b']);
        }
      }
      // red jewel highlight
      for (let y = 8; y <= 12; y++) {
        for (let x = 8; x <= 12; x++) {
          if ((x + y) % 2 === 0) pixels.push([x, y, '#dc2626']);
        }
      }
      // 8 legs
      for (let leg = 0; leg < 4; leg++) {
        const angle = leg * 0.6 + 0.3;
        for (let i = 0; i < 5; i++) {
          pixels.push([5 - i, 10 + Math.round(Math.sin(angle) * i * 1.2), '#7f1d1d']);
          pixels.push([15 + i, 10 + Math.round(Math.cos(angle) * i * 1.2), '#7f1d1d']);
        }
      }
      break;
    }
    case '玄冰蟒': {
      // thick python body
      const iceColors = ['#0ea5e9', '#0284c7', '#7dd3fc'];
      for (let i = 0; i < 16; i++) {
        for (let dy = -2; dy <= 2; dy++) {
          const color = iceColors[(i + dy + 6) % 3];
          pixels.push([i, 9 + dy, color]);
        }
      }
      // ice scales (highlight)
      for (let i = 0; i < 16; i += 2) {
        pixels.push([i, 8, '#bae6fd']);
        pixels.push([i, 10, '#bae6fd']);
      }
      // head
      for (let y = 4; y <= 7; y++) {
        for (let x = 14; x <= 16; x++) {
          pixels.push([x, y, '#0ea5e9']);
        }
      }
      break;
    }
    case '金翅大鹏': {
      // body
      for (let y = 8; y <= 12; y++) {
        for (let x = 6; x <= 12; x++) {
          pixels.push([x, y, '#d97706']);
        }
      }
      // wings (spread)
      for (let i = 0; i < 6; i++) {
        for (let dy = 0; dy < 4; dy++) {
          pixels.push([4 - i, 6 + dy + Math.round(Math.sin(i * 0.5) * 2), '#f59e0b']);
          pixels.push([14 + i, 6 + dy + Math.round(Math.cos(i * 0.5) * 2), '#f59e0b']);
        }
      }
      // wingtips (gold)
      pixels.push([-2, 7, '#fef08a']); pixels.push([-1, 6, '#fef08a']);
      pixels.push([18, 7, '#fef08a']); pixels.push([17, 6, '#fef08a']);
      // head
      pixels.push([7, 6, '#d97706']); pixels.push([8, 5, '#d97706']);
      pixels.push([9, 5, '#d97706']); pixels.push([10, 5, '#d97706']);
      pixels.push([11, 6, '#d97706']);
      // beak
      pixels.push([9, 3, '#fbbf24']); pixels.push([9, 4, '#fbbf24']);
      break;
    }
  }
  return pixels;
}

// --- 2.3b: Terrain Tiles (32×32) ---

export function generateTerrainTileTexture(type: TerrainType): THREE.CanvasTexture {
  const cached = terrainCache.get(type);
  if (cached) return cached;

  const [c, ctx] = createCanvas(32, 32);

  switch (type) {
    case TerrainType.DEEP_WATER:
      drawWater(ctx, '#0369a1', '#0ea5e9', 3);
      break;
    case TerrainType.SHALLOW_WATER:
      drawWater(ctx, '#0ea5e9', '#7dd3fc', 2);
      // foam dots
      for (let i = 0; i < 8; i++) {
        drawPixel(ctx, Math.floor(Math.random() * 32), Math.floor(Math.random() * 32), '#ffffff');
      }
      break;
    case TerrainType.SAND:
      ctx.fillStyle = '#fcd34d';
      ctx.fillRect(0, 0, 32, 32);
      // speckles
      for (let i = 0; i < 20; i++) {
        drawPixel(ctx, Math.floor(Math.random() * 32), Math.floor(Math.random() * 32),
          Math.random() > 0.5 ? '#d97706' : '#92400e');
      }
      // horizontal banding
      for (let y = 0; y < 32; y += 4) {
        ctx.fillStyle = '#fbbf24';
        ctx.globalAlpha = 0.15;
        ctx.fillRect(0, y, 32, 1);
        ctx.globalAlpha = 1;
      }
      break;
    case TerrainType.GRASS:
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(0, 0, 32, 32);
      // grass blades
      for (let i = 0; i < 30; i++) {
        const gx = Math.floor(Math.random() * 32);
        const gy = Math.floor(Math.random() * 32);
        ctx.fillStyle = ['#16a34a', '#22c55e', '#15803d'][Math.floor(Math.random() * 3)];
        ctx.fillRect(gx, gy, 1, 2 - Math.floor(Math.random() * 1));
      }
      // occasional flower
      for (let i = 0; i < 3; i++) {
        const fx = Math.floor(Math.random() * 32);
        const fy = Math.floor(Math.random() * 32);
        drawPixel(ctx, fx, fy, '#ffffff');
        drawPixel(ctx, fx, fy - 1, '#fef08a');
      }
      break;
    case TerrainType.FOREST:
      ctx.fillStyle = '#15803d';
      ctx.fillRect(0, 0, 32, 32);
      // dark canopy clusters
      for (let i = 0; i < 6; i++) {
        const cx = Math.floor(Math.random() * 28) + 2;
        const cy = Math.floor(Math.random() * 28) + 2;
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            if (dx * dx + dy * dy <= 9 && Math.random() > 0.3) {
              drawPixel(ctx, cx + dx, cy + dy,
                ['#065f46', '#166534', '#14532d'][Math.floor(Math.random() * 3)]);
            }
          }
        }
      }
      // trunk hints
      for (let i = 0; i < 3; i++) {
        const tx = Math.floor(Math.random() * 32);
        drawPixel(ctx, tx, 28, '#78350f');
        drawPixel(ctx, tx, 29, '#78350f');
        drawPixel(ctx, tx, 30, '#78350f');
      }
      break;
    case TerrainType.ROCK:
      ctx.fillStyle = '#78716c';
      ctx.fillRect(0, 0, 32, 32);
      // crack lines
      for (let i = 0; i < 4; i++) {
        let cx = Math.floor(Math.random() * 32);
        let cy = Math.floor(Math.random() * 32);
        for (let j = 0; j < 6; j++) {
          drawPixel(ctx, cx, cy, '#52525b');
          cx += Math.floor(Math.random() * 3) - 1;
          cy += Math.floor(Math.random() * 3) - 1;
          cx = Math.max(0, Math.min(31, cx));
          cy = Math.max(0, Math.min(31, cy));
        }
      }
      // facets
      for (let i = 0; i < 8; i++) {
        drawRect(ctx, Math.floor(Math.random() * 28), Math.floor(Math.random() * 28), 3, 3, '#a8a29e');
      }
      break;
    case TerrainType.MOUNTAIN:
      // stepped diagonal shading
      for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
          const distFromCenter = Math.abs(x - 16);
          const heightAtX = 16 - distFromCenter * 0.8;
          if (y < 32 - heightAtX * 2) {
            drawPixel(ctx, x, y, '#f8fafc'); // snow cap
          } else if (y < 32 - heightAtX * 1.5) {
            drawPixel(ctx, x, y, '#78716c'); // rock
          } else {
            drawPixel(ctx, x, y, '#57534e'); // base
          }
        }
      }
      break;
    case TerrainType.SNOW:
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 32, 32);
      // ice crystal highlights
      for (let i = 0; i < 15; i++) {
        drawPixel(ctx, Math.floor(Math.random() * 32), Math.floor(Math.random() * 32), '#bae6fd');
      }
      // subtle gradient
      for (let y = 0; y < 32; y++) {
        ctx.fillStyle = `rgba(186, 230, 253, ${0.01 + (y / 32) * 0.06})`;
        ctx.fillRect(0, y, 32, 1);
      }
      break;
    case TerrainType.ROAD:
      ctx.fillStyle = '#a8a29e';
      ctx.fillRect(0, 0, 32, 32);
      // cobblestone pattern
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const px = x * 4;
          const py = y * 4;
          ctx.fillStyle = (x + y) % 2 === 0 ? '#78716c' : '#a8a29e';
          ctx.fillRect(px, py, 3, 3);
          // grout
          ctx.fillStyle = '#57534e';
          drawPixel(ctx, px + 3, py, '#57534e');
          drawPixel(ctx, px, py + 3, '#57534e');
        }
      }
      break;
  }

  const tex = canvasToTexture(c);
  terrainCache.set(type, tex);
  return tex;
}

function drawWater(ctx: CanvasRenderingContext2D, baseColor: string, waveColor: string, waveCount: number) {
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 32, 32);
  // wave lines
  ctx.strokeStyle = waveColor;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 1;
  for (let w = 0; w < waveCount; w++) {
    ctx.beginPath();
    const wy = 8 + w * 10 + Math.random() * 2;
    for (let x = 0; x <= 32; x++) {
      ctx.lineTo(x, wy + Math.sin(x * 0.4 + w * 2) * 2);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// --- 2.3c: Effect Textures (16×16) ---

export function generateEffectTexture(type: 'spark' | 'star' | 'glow' | 'leaf' | 'crystal' | 'ember'): THREE.CanvasTexture {
  const cached = effectCache.get(type);
  if (cached) return cached;

  const [c, ctx] = createCanvas(16, 16);

  switch (type) {
    case 'spark':
      // 4-pointed star
      ctx.fillStyle = '#ffffff';
      drawRect(ctx, 6, 0, 4, 16, '#ffffff');
      drawRect(ctx, 0, 6, 16, 4, '#ffffff');
      // center glow
      drawRect(ctx, 4, 4, 8, 8, '#fef08a');
      break;
    case 'star':
      // diamond
      ctx.fillStyle = '#fef08a';
      const points: [number, number][] = [
        [8, 0], [11, 5], [16, 8], [11, 11], [8, 16],
        [5, 11], [0, 8], [5, 5]
      ];
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
      ctx.closePath();
      ctx.fill();
      break;
    case 'glow':
      // radial gradient circle
      const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#fef08a');
      grad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(8, 8, 8, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'leaf':
      ctx.fillStyle = '#22c55e';
      // leaf shape
      ctx.beginPath();
      ctx.moveTo(0, 16);
      ctx.quadraticCurveTo(8, 8, 16, 0);
      ctx.quadraticCurveTo(8, 4, 0, 16);
      ctx.fill();
      // vein
      ctx.strokeStyle = '#166534';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(1, 14);
      ctx.lineTo(12, 3);
      ctx.stroke();
      break;
    case 'crystal':
      ctx.fillStyle = '#06b6d4';
      // crystal shape
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(14, 10);
      ctx.lineTo(10, 16);
      ctx.lineTo(6, 16);
      ctx.lineTo(2, 10);
      ctx.closePath();
      ctx.fill();
      // highlight
      ctx.fillStyle = '#67e8f9';
      ctx.beginPath();
      ctx.moveTo(8, 2);
      ctx.lineTo(12, 9);
      ctx.lineTo(8, 13);
      ctx.fill();
      break;
    case 'ember':
      ctx.fillStyle = '#ea580c';
      drawCircle(ctx, 8, 8, 6, '#ea580c');
      drawCircle(ctx, 8, 6, 3, '#f97316');
      drawCircle(ctx, 8, 5, 1, '#fef08a');
      break;
  }

  const tex = canvasToTexture(c);
  effectCache.set(type, tex);
  return tex;
}

// --- Resource Sprites ---

export function generateResourceSprite(type: string): THREE.CanvasTexture {
  const cached = effectCache.get(`res_${type}`);
  if (cached) return cached;

  const [c, ctx] = createCanvas(32, 32);

  if (type === '灵田') {
    // field with rows
    ctx.fillStyle = '#15803d';
    ctx.fillRect(0, 0, 32, 32);
    for (let y = 4; y < 32; y += 6) {
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(0, y, 32, 2);
      // sprouts
      for (let x = 2; x < 32; x += 6) {
        drawPixel(ctx, x, y - 3, '#22c55e');
        drawPixel(ctx, x, y - 4, '#a3e635');
      }
    }
  } else if (type === '矿脉') {
    // rock with ore veins
    ctx.fillStyle = '#57534e';
    ctx.fillRect(0, 0, 32, 32);
    // ore veins
    for (let i = 0; i < 5; i++) {
      let ox = Math.floor(Math.random() * 28) + 2;
      let oy = Math.floor(Math.random() * 28) + 2;
      for (let j = 0; j < 4; j++) {
        drawPixel(ctx, ox, oy, '#fbbf24');
        ox += Math.floor(Math.random() * 3) - 1;
        oy += Math.floor(Math.random() * 3) - 1;
      }
    }
    // crystal highlights
    for (let i = 0; i < 3; i++) {
      drawCircle(ctx, Math.floor(Math.random() * 28) + 2, Math.floor(Math.random() * 28) + 2, 2, '#a3e635', 0.5);
    }
  } else {
    // ruins (遗迹)
    ctx.fillStyle = '#78716c';
    ctx.fillRect(0, 0, 32, 32);
    // broken pillars
    drawRect(ctx, 6, 6, 4, 12, '#a8a29e');
    drawRect(ctx, 20, 10, 4, 10, '#a8a29e');
    // rubble
    for (let i = 0; i < 6; i++) {
      drawRect(ctx, Math.floor(Math.random() * 28) + 2, Math.floor(Math.random() * 28) + 2, 2, 2, '#57534e');
    }
    // glowing rune
    drawCircle(ctx, 14, 14, 3, '#c084fc', 0.6);
    drawPixel(ctx, 14, 14, '#fef08a');
  }

  const tex = canvasToTexture(c);
  effectCache.set(`res_${type}`, tex);
  return tex;
}

// --- Cache clearing (for realm changes etc.) ---

export function clearCharacterCache() { charCache.clear(); }
export function clearAllCaches() {
  charCache.clear();
  monsterCache.clear();
  terrainCache.clear();
  effectCache.clear();
}
