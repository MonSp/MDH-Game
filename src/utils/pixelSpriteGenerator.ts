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

// --- Decorations (16×16) ---

const decorCache = new Map<string, THREE.CanvasTexture>();

export type DecorationType =
  | 'grass_tuft' | 'flower_white' | 'flower_red' | 'flower_yellow'
  | 'mushroom' | 'bush'
  | 'rock_small' | 'cactus' | 'dry_grass'
  | 'snow_mound' | 'ice_shard'
  | 'lilypad' | 'reed'
  | 'alpine_grass' | 'crystal_small'
  | 'gravel';

export function generateDecorationSprite(type: DecorationType): THREE.CanvasTexture {
  const cached = decorCache.get(type);
  if (cached) return cached;

  const [c, ctx] = createCanvas(16, 16);

  switch (type) {
    case 'grass_tuft':
      for (let i = 0; i < 4; i++) {
        const gx = 4 + i * 3;
        drawPixel(ctx, gx, 8, '#22c55e');
        drawPixel(ctx, gx, 7, '#16a34a');
        drawPixel(ctx, gx, 6, '#15803d');
      }
      break;
    case 'flower_white':
      drawPixel(ctx, 8, 6, '#ffffff');
      drawPixel(ctx, 7, 7, '#ffffff'); drawPixel(ctx, 9, 7, '#ffffff');
      drawPixel(ctx, 8, 8, '#fef08a');
      drawPixel(ctx, 8, 9, '#22c55e');
      break;
    case 'flower_red':
      drawPixel(ctx, 8, 6, '#ef4444');
      drawPixel(ctx, 7, 7, '#ef4444'); drawPixel(ctx, 9, 7, '#ef4444');
      drawPixel(ctx, 8, 8, '#fef08a');
      drawPixel(ctx, 8, 9, '#22c55e');
      break;
    case 'flower_yellow':
      drawPixel(ctx, 8, 6, '#fbbf24');
      drawPixel(ctx, 7, 7, '#fbbf24'); drawPixel(ctx, 9, 7, '#fbbf24');
      drawPixel(ctx, 8, 8, '#f59e0b');
      drawPixel(ctx, 8, 9, '#22c55e');
      break;
    case 'mushroom':
      // stem
      drawRect(ctx, 7, 9, 2, 5, '#f5f5f4');
      // cap
      for (let dx = -2; dx <= 2; dx++) {
        drawPixel(ctx, 8 + dx, 8, '#92400e');
        drawPixel(ctx, 8 + dx, 7, '#b45309');
      }
      drawPixel(ctx, 8, 6, '#d97706');
      // spots
      drawPixel(ctx, 7, 7, '#f5f5f4');
      drawPixel(ctx, 9, 8, '#f5f5f4');
      break;
    case 'bush':
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          if (dx * dx + dy * dy <= 6 && Math.random() > 0.2) {
            drawPixel(ctx, 8 + dx, 10 + dy, ['#065f46', '#166534', '#15803d'][Math.floor(Math.random() * 3)]);
          }
        }
      }
      break;
    case 'rock_small':
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -1; dy <= 2; dy++) {
          if (Math.abs(dx) + Math.abs(dy) <= 3) {
            drawPixel(ctx, 8 + dx, 10 + dy, Math.random() > 0.4 ? '#78716c' : '#a8a29e');
          }
        }
      }
      break;
    case 'cactus':
      // body
      drawRect(ctx, 7, 5, 2, 8, '#16a34a');
      // arms
      drawRect(ctx, 4, 7, 3, 1, '#16a34a');
      drawRect(ctx, 9, 9, 3, 1, '#16a34a');
      drawRect(ctx, 4, 6, 1, 2, '#16a34a');
      drawRect(ctx, 12, 8, 1, 2, '#16a34a');
      // spine
      drawPixel(ctx, 6, 5, '#22c55e');
      drawPixel(ctx, 8, 6, '#22c55e');
      break;
    case 'dry_grass':
      for (let i = 0; i < 3; i++) {
        const gx = 5 + i * 3;
        drawPixel(ctx, gx, 8, '#a16207');
        drawPixel(ctx, gx, 7, '#854d0e');
        drawPixel(ctx, gx, 6, '#713f12');
      }
      break;
    case 'snow_mound':
      for (let dy = 0; dy <= 4; dy++) {
        for (let dx = -dy; dx <= dy; dx++) {
          drawPixel(ctx, 8 + dx, 10 + dy, Math.random() > 0.2 ? '#f8fafc' : '#e2e8f0');
        }
      }
      break;
    case 'ice_shard':
      // crystal shape
      const icePoints = [[8, 2], [11, 6], [13, 8], [11, 12], [8, 14], [5, 12], [3, 8], [5, 6]];
      ctx.fillStyle = '#bae6fd';
      ctx.beginPath();
      ctx.moveTo(icePoints[0][0], icePoints[0][1]);
      for (let i = 1; i < icePoints.length; i++) ctx.lineTo(icePoints[i][0], icePoints[i][1]);
      ctx.closePath();
      ctx.fill();
      // highlight
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.moveTo(8, 3);
      ctx.lineTo(10, 7);
      ctx.lineTo(8, 12);
      ctx.fill();
      break;
    case 'lilypad':
      // pad
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.ellipse(8, 11, 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      // flower
      drawPixel(ctx, 8, 8, '#f472b6');
      drawPixel(ctx, 7, 9, '#ec4899'); drawPixel(ctx, 9, 9, '#ec4899');
      drawPixel(ctx, 8, 7, '#fce7f3');
      break;
    case 'reed':
      drawRect(ctx, 7, 4, 1, 10, '#a16207');
      // top
      drawRect(ctx, 6, 3, 3, 2, '#92400e');
      drawPixel(ctx, 8, 2, '#713f12');
      break;
    case 'alpine_grass':
      for (let i = 0; i < 3; i++) {
        const gx = 5 + i * 3;
        drawPixel(ctx, gx, 8, '#4d7c0f');
        drawPixel(ctx, gx, 7, '#3f6212');
      }
      break;
    case 'crystal_small':
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.moveTo(8, 2);
      ctx.lineTo(11, 6);
      ctx.lineTo(9, 10);
      ctx.lineTo(7, 10);
      ctx.lineTo(5, 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#d8b4fe';
      ctx.beginPath();
      ctx.moveTo(8, 3);
      ctx.lineTo(10, 6);
      ctx.lineTo(8, 9);
      ctx.fill();
      break;
    case 'gravel':
      for (let i = 0; i < 8; i++) {
        const gx = Math.floor(Math.random() * 12) + 2;
        const gy = Math.floor(Math.random() * 10) + 4;
        drawPixel(ctx, gx, gy, '#78716c');
        drawPixel(ctx, gx + 1, gy, '#57534e');
      }
      break;
  }

  const tex = canvasToTexture(c);
  decorCache.set(type, tex);
  return tex;
}

// --- Building Sprites (48×48) ---

const buildingCache = new Map<string, THREE.CanvasTexture>();

export type BuildingSpriteType = 'capital' | 'city' | 'fortress' | 'watchtower' | 'camp';

export function generateBuildingSprite(type: BuildingSpriteType, country?: string): THREE.CanvasTexture {
  const key = `${type}|${country || 'default'}`;
  const cached = buildingCache.get(key);
  if (cached) return cached;

  const [c, ctx] = createCanvas(48, 48);

  // Country color
  const countryColors: Record<string, string> = {
    '秦': '#e11d48', '楚': '#a855f7', '齐': '#3b82f6',
    '燕': '#06b6d4', '赵': '#f97316', '魏': '#22c55e', '韩': '#eab308',
  };
  const accent = country ? (countryColors[country] || '#b45309') : '#b45309';
  const darkAccent = darkenColor(accent, 0.3);
  const lightAccent = (() => {
    const num = parseInt(accent.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + 60);
    const g = Math.min(255, ((num >> 8) & 0xFF) + 60);
    const b = Math.min(255, (num & 0xFF) + 60);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  })();

  switch (type) {
    case 'capital': {
      // Ground base
      drawRect(ctx, 4, 34, 40, 12, '#57534e');
      drawRect(ctx, 2, 36, 44, 4, '#44403c');
      // Outer walls
      drawRect(ctx, 4, 24, 40, 12, darkAccent);
      // Wall top crenellations
      for (let x = 4; x < 44; x += 5) {
        drawRect(ctx, x, 22, 3, 2, accent);
      }
      // Gate
      drawRect(ctx, 18, 30, 12, 16, '#451a03');
      drawRect(ctx, 20, 32, 8, 14, '#27272a');
      // Gate arch
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(24, 32, 6, Math.PI, 0);
      ctx.fill();
      // Inner palace building
      drawRect(ctx, 14, 12, 20, 14, accent);
      // Roof
      ctx.fillStyle = darkAccent;
      ctx.beginPath();
      ctx.moveTo(8, 12);
      ctx.lineTo(24, 2);
      ctx.lineTo(40, 12);
      ctx.closePath();
      ctx.fill();
      // Roof ridge
      drawRect(ctx, 22, 1, 4, 2, lightAccent);
      // Palace pillars
      drawRect(ctx, 16, 16, 2, 10, '#78350f');
      drawRect(ctx, 30, 16, 2, 10, '#78350f');
      // Windows
      drawPixel(ctx, 20, 18, lightAccent);
      drawPixel(ctx, 28, 18, lightAccent);
      // Corner towers
      drawRect(ctx, 2, 16, 6, 8, darkAccent);
      drawRect(ctx, 40, 16, 6, 8, darkAccent);
      // Tower roofs
      ctx.fillStyle = darkAccent;
      ctx.beginPath();
      ctx.moveTo(1, 16);
      ctx.lineTo(5, 10);
      ctx.lineTo(9, 16);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(39, 16);
      ctx.lineTo(43, 10);
      ctx.lineTo(47, 16);
      ctx.closePath();
      ctx.fill();
      // Country flag
      drawRect(ctx, 22, 0, 4, 3, accent);
      drawPixel(ctx, 22, 0, lightAccent);
      break;
    }
    case 'city': {
      // Ground
      drawRect(ctx, 4, 36, 40, 10, '#57534e');
      // Walls
      drawRect(ctx, 4, 28, 40, 10, darkAccent);
      // Wall crenellations
      for (let x = 4; x < 44; x += 6) {
        drawRect(ctx, x, 26, 4, 2, accent);
      }
      // Gate
      drawRect(ctx, 18, 32, 12, 14, '#451a03');
      drawRect(ctx, 20, 34, 8, 12, '#27272a');
      // Main building
      drawRect(ctx, 16, 16, 16, 12, accent);
      // Roof
      ctx.fillStyle = darkAccent;
      ctx.beginPath();
      ctx.moveTo(12, 16);
      ctx.lineTo(24, 6);
      ctx.lineTo(36, 16);
      ctx.closePath();
      ctx.fill();
      // Roof detail
      drawRect(ctx, 22, 5, 4, 2, lightAccent);
      // Windows
      drawPixel(ctx, 20, 20, lightAccent);
      drawPixel(ctx, 28, 20, lightAccent);
      drawPixel(ctx, 24, 20, lightAccent);
      break;
    }
    case 'fortress': {
      // Thick walls
      drawRect(ctx, 2, 28, 44, 16, '#44403c');
      drawRect(ctx, 4, 26, 40, 4, darkAccent);
      // Battlements (thicker)
      for (let x = 2; x < 46; x += 4) {
        drawRect(ctx, x, 22, 3, 4, '#57534e');
      }
      // Inner keep
      drawRect(ctx, 14, 12, 20, 16, darkAccent);
      // Keep roof
      ctx.fillStyle = '#44403c';
      ctx.beginPath();
      ctx.moveTo(10, 12);
      ctx.lineTo(24, 2);
      ctx.lineTo(38, 12);
      ctx.closePath();
      ctx.fill();
      // Gate
      drawRect(ctx, 20, 30, 8, 14, '#18181b');
      drawRect(ctx, 22, 32, 4, 12, '#27272a');
      // Arrow slits
      drawPixel(ctx, 16, 18, lightAccent);
      drawPixel(ctx, 32, 18, lightAccent);
      drawPixel(ctx, 24, 18, lightAccent);
      // Corner bastions
      drawRect(ctx, 0, 30, 6, 8, '#52525b');
      drawRect(ctx, 42, 30, 6, 8, '#52525b');
      break;
    }
    case 'watchtower': {
      // Base
      drawRect(ctx, 14, 28, 20, 16, '#57534e');
      // Tapered tower body
      drawRect(ctx, 16, 16, 16, 14, darkAccent);
      drawRect(ctx, 18, 8, 12, 10, accent);
      // Top platform
      drawRect(ctx, 14, 6, 20, 3, '#78716c');
      // Roof cone
      ctx.fillStyle = darkAccent;
      ctx.beginPath();
      ctx.moveTo(14, 6);
      ctx.lineTo(24, -2);
      ctx.lineTo(34, 6);
      ctx.closePath();
      ctx.fill();
      // Roof tip
      drawRect(ctx, 22, -3, 4, 2, '#fbbf24');
      // Windows (arrow slits)
      drawPixel(ctx, 22, 12, lightAccent);
      drawPixel(ctx, 26, 12, lightAccent);
      drawPixel(ctx, 24, 18, lightAccent);
      drawPixel(ctx, 24, 24, lightAccent);
      // Door
      drawRect(ctx, 22, 32, 4, 8, '#27272a');
      drawRect(ctx, 22, 32, 4, 6, '#451a03');
      break;
    }
    case 'camp': {
      // Ground
      drawRect(ctx, 2, 38, 44, 8, '#57534e');
      // Tent 1 (center)
      ctx.fillStyle = '#a16207';
      ctx.beginPath();
      ctx.moveTo(14, 38);
      ctx.lineTo(24, 22);
      ctx.lineTo(34, 38);
      ctx.closePath();
      ctx.fill();
      // Tent 1 flap
      ctx.fillStyle = '#713f12';
      ctx.beginPath();
      ctx.moveTo(22, 30);
      ctx.lineTo(24, 22);
      ctx.lineTo(26, 30);
      ctx.closePath();
      ctx.fill();
      // Tent 2 (left, smaller)
      ctx.fillStyle = '#854d0e';
      ctx.beginPath();
      ctx.moveTo(4, 38);
      ctx.lineTo(12, 28);
      ctx.lineTo(20, 38);
      ctx.closePath();
      ctx.fill();
      // Tent 3 (right, smaller)
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.moveTo(28, 38);
      ctx.lineTo(36, 28);
      ctx.lineTo(44, 38);
      ctx.closePath();
      ctx.fill();
      // Campfire
      drawRect(ctx, 22, 36, 4, 3, '#78350f');
      drawPixel(ctx, 23, 35, '#f97316');
      drawPixel(ctx, 25, 35, '#ea580c');
      drawPixel(ctx, 24, 34, '#fbbf24');
      // Flag pole
      drawRect(ctx, 23, 18, 2, 6, '#78350f');
      drawPixel(ctx, 24, 17, accent);
      drawPixel(ctx, 25, 17, accent);
      drawPixel(ctx, 26, 17, accent);
      break;
    }
  }

  const tex = canvasToTexture(c);
  buildingCache.set(key, tex);
  return tex;
}

// --- Item Icons (16×16) ---

const iconCache = new Map<string, THREE.CanvasTexture>();

export type ItemIconType =
  | 'pill_red' | 'pill_green' | 'pill_blue' | 'pill_gold'
  | 'sword' | 'axe' | 'staff'
  | 'shield' | 'helmet' | 'robe'
  | 'ring' | 'necklace'
  | 'herb' | 'ore' | 'bone' | 'scale'
  | 'spirit_stone' | 'scroll' | 'token'
  | 'potion' | 'meat' | 'wood' | 'flower'
  | 'crystal_blue' | 'crystal_purple'
  | 'mushroom_icon' | 'feather';

export function getItemIcon(itemName: string): THREE.CanvasTexture | null {
  // Map item name to icon type
  let icon: ItemIconType = 'spirit_stone';
  if (itemName.includes('丹') || itemName.includes('丸')) {
    if (itemName.includes('回血') || itemName.includes('续命')) icon = 'pill_red';
    else if (itemName.includes('聚气') || itemName.includes('培元')) icon = 'pill_green';
    else if (itemName.includes('筑基') || itemName.includes('凝婴')) icon = 'pill_blue';
    else if (itemName.includes('洗髓') || itemName.includes('破境')) icon = 'pill_gold';
    else icon = 'pill_red';
  } else if (itemName.includes('剑')) icon = 'sword';
  else if (itemName.includes('斧') || itemName.includes('锤')) icon = 'axe';
  else if (itemName.includes('杖') || itemName.includes('拂尘')) icon = 'staff';
  else if (itemName.includes('甲') || itemName.includes('铠') || itemName.includes('袍')) icon = 'robe';
  else if (itemName.includes('盾')) icon = 'shield';
  else if (itemName.includes('盔') || itemName.includes('冠')) icon = 'helmet';
  else if (itemName.includes('戒')) icon = 'ring';
  else if (itemName.includes('链') || itemName.includes('佩')) icon = 'necklace';
  else if (itemName.includes('草') || itemName.includes('药') || itemName ===('草药')) icon = 'herb';
  else if (itemName.includes('矿') || itemName.includes('石') || itemName.includes('铁')) icon = 'ore';
  else if (itemName.includes('骨') || itemName.includes('牙') || itemName.includes('角')) icon = 'bone';
  else if (itemName.includes('鳞') || itemName.includes('皮') || itemName.includes('毛')) icon = 'scale';
  else if (itemName.includes('灵石')) icon = 'spirit_stone';
  else if (itemName.includes('令') || itemName.includes('符')) icon = 'scroll';
  else if (itemName.includes('印') || itemName.includes('牌')) icon = 'token';
  else if (itemName.includes('花')) icon = 'flower';
  else if (itemName.includes('木') || itemName.includes('藤')) icon = 'wood';
  else if (itemName.includes('羽') || itemName.includes('翅')) icon = 'feather';
  else if (itemName.includes('菇') || itemName ===('灵芝')) icon = 'mushroom_icon';
  else if (itemName.includes('兽肉') || itemName.includes('肉')) icon = 'meat';
  else if (itemName.includes('晶')) icon = 'crystal_blue';
  else if (itemName.includes('液') || itemName.includes('露')) icon = 'potion';
  else return null;

  return generateItemIcon(icon);
}

export function generateItemIcon(type: ItemIconType): THREE.CanvasTexture {
  const cached = iconCache.get(type);
  if (cached) return cached;

  const [c, ctx] = createCanvas(16, 16);

  switch (type) {
    case 'pill_red':
      drawCircle(ctx, 8, 8, 5, '#dc2626');
      drawCircle(ctx, 7, 7, 2, '#fca5a5', 0.6);
      break;
    case 'pill_green':
      drawCircle(ctx, 8, 8, 5, '#16a34a');
      drawCircle(ctx, 7, 7, 2, '#86efac', 0.6);
      break;
    case 'pill_blue':
      drawCircle(ctx, 8, 8, 5, '#2563eb');
      drawCircle(ctx, 7, 7, 2, '#93c5fd', 0.6);
      break;
    case 'pill_gold':
      drawCircle(ctx, 8, 8, 5, '#d97706');
      drawCircle(ctx, 7, 7, 2, '#fde68a', 0.6);
      break;
    case 'sword':
      // Blade
      drawRect(ctx, 7, 1, 2, 9, '#94a3b8');
      drawPixel(ctx, 7, 0, '#e2e8f0');
      // Guard
      drawRect(ctx, 4, 10, 8, 1, '#78350f');
      // Handle
      drawRect(ctx, 7, 11, 2, 3, '#451a03');
      // Pommel
      drawPixel(ctx, 7, 14, '#fbbf24');
      drawPixel(ctx, 8, 14, '#fbbf24');
      break;
    case 'axe': {
      // Handle
      drawRect(ctx, 7, 4, 2, 10, '#78350f');
      // Blade head
      const axePts = [[2, 3], [2, 8], [7, 10], [14, 8], [14, 3], [7, 2]];
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(axePts[0][0], axePts[0][1]);
      for (let i = 1; i < axePts.length; i++) ctx.lineTo(axePts[i][0], axePts[i][1]);
      ctx.closePath();
      ctx.fill();
      // Edge highlight
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(3, 4, 11, 1);
      break;
    }
    case 'staff': {
      drawRect(ctx, 7, 0, 2, 14, '#78350f');
      // Crystal top
      const staffPts = [[5, 0], [8, -3], [11, 0], [8, 5]];
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.moveTo(staffPts[0][0], staffPts[0][1]);
      for (let i = 1; i < staffPts.length; i++) ctx.lineTo(staffPts[i][0], staffPts[i][1]);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'shield':
      drawRect(ctx, 4, 2, 8, 10, '#475569');
      drawRect(ctx, 5, 3, 6, 8, '#64748b');
      // Shield emblem
      drawPixel(ctx, 8, 5, '#fbbf24');
      drawPixel(ctx, 8, 6, '#fbbf24');
      drawPixel(ctx, 7, 6, '#fbbf24');
      drawPixel(ctx, 9, 6, '#fbbf24');
      break;
    case 'helmet':
      // Dome
      for (let dy = 0; dy <= 6; dy++) {
        for (let dx = -dy; dx <= dy; dx++) {
          drawPixel(ctx, 8 + dx, 6 + dy, '#475569');
        }
      }
      // Visor slit
      drawRect(ctx, 5, 8, 6, 1, '#fbbf24');
      // Plume
      drawRect(ctx, 8, 2, 2, 4, '#dc2626');
      drawPixel(ctx, 9, 1, '#ef4444');
      break;
    case 'robe':
      drawRect(ctx, 4, 3, 8, 11, '#1d4ed8');
      drawRect(ctx, 5, 3, 6, 3, '#3b82f6');
      // Belt
      drawRect(ctx, 4, 9, 8, 1, '#fbbf24');
      // Collar
      drawRect(ctx, 6, 3, 4, 3, '#93c5fd');
      break;
    case 'ring':
      drawCircle(ctx, 8, 8, 5, '#fbbf24');
      drawCircle(ctx, 8, 8, 3, '#fef08a');
      // Gem
      drawPixel(ctx, 8, 6, '#ef4444');
      drawPixel(ctx, 7, 7, '#ef4444'); drawPixel(ctx, 9, 7, '#ef4444');
      drawPixel(ctx, 8, 8, '#dc2626');
      break;
    case 'necklace':
      // Chain
      for (let x = 4; x <= 12; x += 2) {
        drawPixel(ctx, x, 2, '#fbbf24');
        drawPixel(ctx, x, 3, '#fbbf24');
      }
      // Pendant
      drawCircle(ctx, 8, 8, 4, '#a855f7');
      drawPixel(ctx, 8, 7, '#d8b4fe');
      drawPixel(ctx, 8, 8, '#c084fc');
      break;
    case 'herb':
      // Stem
      drawRect(ctx, 7, 6, 2, 8, '#16a34a');
      // Leaves
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(4, 8, 3, 2, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(12, 6, 3, 2, -0.3, 0, Math.PI * 2);
      ctx.fill();
      // Flower top
      drawPixel(ctx, 7, 4, '#fbbf24');
      drawPixel(ctx, 9, 4, '#fbbf24');
      drawPixel(ctx, 8, 3, '#f59e0b');
      drawPixel(ctx, 8, 5, '#f59e0b');
      break;
    case 'ore':
      // Rock
      ctx.fillStyle = '#57534e';
      ctx.beginPath();
      ctx.moveTo(2, 12);
      ctx.lineTo(2, 6);
      ctx.lineTo(7, 2);
      ctx.lineTo(12, 4);
      ctx.lineTo(14, 8);
      ctx.lineTo(13, 13);
      ctx.closePath();
      ctx.fill();
      // Ore veins
      drawPixel(ctx, 5, 6, '#fbbf24');
      drawPixel(ctx, 7, 5, '#fbbf24');
      drawPixel(ctx, 9, 7, '#fbbf24');
      drawPixel(ctx, 8, 9, '#fbbf24');
      drawPixel(ctx, 5, 9, '#fbbf24');
      break;
    case 'bone':
      drawRect(ctx, 2, 6, 12, 3, '#e2e8f0');
      // Knobs
      drawCircle(ctx, 3, 7, 2, '#cbd5e1');
      drawCircle(ctx, 13, 7, 2, '#cbd5e1');
      drawCircle(ctx, 3, 7, 1, '#f1f5f9');
      drawCircle(ctx, 13, 7, 1, '#f1f5f9');
      break;
    case 'scale':
      drawRect(ctx, 4, 2, 8, 10, '#0ea5e9');
      for (let y = 3; y <= 10; y += 3) {
        for (let x = 5; x <= 10; x += 3) {
          drawPixel(ctx, x, y, '#7dd3fc');
        }
      }
      break;
    case 'spirit_stone':
      // Hexagonal gem shape
      const gemPts = [[8, 0], [14, 4], [14, 11], [8, 15], [2, 11], [2, 4]];
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.moveTo(gemPts[0][0], gemPts[0][1]);
      for (let i = 1; i < gemPts.length; i++) ctx.lineTo(gemPts[i][0], gemPts[i][1]);
      ctx.closePath();
      ctx.fill();
      // Shine
      ctx.fillStyle = '#6ee7b7';
      ctx.beginPath();
      ctx.moveTo(8, 2);
      ctx.lineTo(12, 5);
      ctx.lineTo(8, 12);
      ctx.lineTo(4, 5);
      ctx.closePath();
      ctx.fill();
      // Highlight
      drawPixel(ctx, 8, 4, '#a7f3d0');
      break;
    case 'scroll':
      drawRect(ctx, 3, 2, 10, 12, '#fef3c7');
      // Rolled top/bottom
      drawRect(ctx, 3, 2, 10, 2, '#d97706');
      drawRect(ctx, 3, 12, 10, 2, '#d97706');
      // Script lines
      drawPixel(ctx, 6, 6, '#92400e');
      drawPixel(ctx, 6, 7, '#92400e');
      drawPixel(ctx, 6, 8, '#92400e');
      drawPixel(ctx, 9, 6, '#92400e');
      drawPixel(ctx, 9, 8, '#92400e');
      // Seal
      drawRect(ctx, 9, 9, 3, 2, '#dc2626');
      break;
    case 'token':
      drawCircle(ctx, 8, 8, 6, '#a855f7');
      drawCircle(ctx, 8, 8, 4, '#c084fc');
      // Center symbol
      drawPixel(ctx, 8, 6, '#fef08a');
      drawPixel(ctx, 7, 7, '#fef08a'); drawPixel(ctx, 9, 7, '#fef08a');
      drawPixel(ctx, 8, 8, '#fef08a');
      break;
    case 'potion':
      // Bottle body
      drawRect(ctx, 5, 5, 6, 9, '#10b981');
      // Bottle neck
      drawRect(ctx, 6, 2, 4, 3, '#10b981');
      // Cork
      drawRect(ctx, 6, 1, 4, 1, '#78350f');
      // Liquid
      drawRect(ctx, 6, 8, 4, 5, '#6ee7b7');
      // Highlight
      drawPixel(ctx, 6, 6, '#a7f3d0');
      break;
    case 'meat':
      drawRect(ctx, 4, 3, 8, 8, '#dc2626');
      drawRect(ctx, 5, 4, 6, 6, '#ef4444');
      // Bone in center
      drawRect(ctx, 7, 6, 2, 4, '#f1f5f9');
      drawRect(ctx, 6, 7, 4, 1, '#e2e8f0');
      // Marbling
      drawPixel(ctx, 5, 6, '#fca5a5');
      drawPixel(ctx, 9, 5, '#fca5a5');
      break;
    case 'wood':
      // Log
      drawRect(ctx, 2, 6, 12, 6, '#78350f');
      // Rings
      drawRect(ctx, 3, 7, 10, 4, '#92400e');
      drawRect(ctx, 5, 8, 6, 2, '#a16207');
      break;
    case 'flower':
      drawCircle(ctx, 8, 6, 3, '#ec4899');
      drawCircle(ctx, 5, 8, 2, '#f472b6');
      drawCircle(ctx, 11, 8, 2, '#f472b6');
      drawCircle(ctx, 8, 5, 2, '#fce7f3');
      // Center
      drawPixel(ctx, 8, 6, '#fbbf24');
      break;
    case 'crystal_blue':
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(14, 5);
      ctx.lineTo(12, 12);
      ctx.lineTo(8, 15);
      ctx.lineTo(4, 12);
      ctx.lineTo(2, 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#67e8f9';
      ctx.beginPath();
      ctx.moveTo(8, 2);
      ctx.lineTo(12, 6);
      ctx.lineTo(8, 12);
      ctx.fill();
      break;
    case 'crystal_purple':
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(14, 5);
      ctx.lineTo(12, 12);
      ctx.lineTo(8, 15);
      ctx.lineTo(4, 12);
      ctx.lineTo(2, 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#d8b4fe';
      ctx.beginPath();
      ctx.moveTo(8, 2);
      ctx.lineTo(12, 6);
      ctx.lineTo(8, 12);
      ctx.fill();
      break;
    case 'mushroom_icon':
      // Stem
      drawRect(ctx, 7, 8, 2, 5, '#f5f5f4');
      // Cap
      for (let dx = -3; dx <= 3; dx++) {
        drawPixel(ctx, 8 + dx, 7, '#d97706');
        drawPixel(ctx, 8 + dx, 6, '#b45309');
      }
      drawPixel(ctx, 8, 5, '#92400e');
      // Spots
      drawPixel(ctx, 7, 6, '#f5f5f4');
      drawPixel(ctx, 10, 7, '#f5f5f4');
      break;
    case 'feather':
      // Quill
      drawRect(ctx, 7, 8, 2, 6, '#e2e8f0');
      // Vanes
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(7, 8);
      ctx.lineTo(2, 4);
      ctx.lineTo(7, 2);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(9, 8);
      ctx.lineTo(14, 4);
      ctx.lineTo(9, 2);
      ctx.closePath();
      ctx.fill();
      // Tip
      drawPixel(ctx, 4, 2, '#94a3b8');
      drawPixel(ctx, 12, 2, '#94a3b8');
      break;
  }

  const tex = canvasToTexture(c);
  iconCache.set(type, tex);
  return tex;
}

// --- Data URL helpers for HTML React components ---

const iconDataURLCache = new Map<string, string>();

export function getItemIconDataURL(itemName: string): string | null {
  const cached = iconDataURLCache.get(itemName);
  if (cached) return cached;

  const tex = getItemIcon(itemName);
  if (!tex) return null;

  const canvas = tex.image as HTMLCanvasElement;
  const url = canvas.toDataURL();
  iconDataURLCache.set(itemName, url);
  return url;
}

// --- Character portrait data URL (for HUD avatar) ---

const portraitCache = new Map<string, string>();

export function getCharacterPortraitDataURL(realm: string, bodyType: string, role: string): string | null {
  const key = `${realm}|${bodyType}|${role}`;
  const cached = portraitCache.get(key);
  if (cached) return cached;

  const tex = generateCharacterSprite(realm as any, bodyType as any, role);
  const canvas = tex.image as HTMLCanvasElement;
  const url = canvas.toDataURL();
  portraitCache.set(key, url);
  return url;
}

// --- Technique icons ---

const techniqueIconCache = new Map<string, string>();

function drawFireIcon(ctx: CanvasRenderingContext2D) {
  drawPixel(ctx, 7, 2, '#f97316');
  drawRect(ctx, 6, 3, 4, 2, '#f97316');
  drawRect(ctx, 5, 5, 6, 2, '#fbbf24');
  drawRect(ctx, 4, 7, 8, 3, '#ef4444');
  drawRect(ctx, 5, 10, 6, 2, '#dc2626');
  drawRect(ctx, 6, 12, 4, 2, '#ef4444');
  drawPixel(ctx, 7, 14, '#f97316');
  drawPixel(ctx, 6, 6, '#fef3c7');
  drawPixel(ctx, 7, 7, '#fef3c7');
}

function drawEarthIcon(ctx: CanvasRenderingContext2D) {
  drawRect(ctx, 6, 2, 4, 2, '#92400e');
  drawRect(ctx, 5, 4, 6, 2, '#a16207');
  drawRect(ctx, 4, 6, 8, 2, '#854d0e');
  drawRect(ctx, 3, 8, 10, 2, '#713f12');
  drawRect(ctx, 2, 10, 12, 2, '#92400e');
  drawRect(ctx, 3, 12, 10, 2, '#a16207');
  drawRect(ctx, 4, 14, 8, 2, '#854d0e');
  drawPixel(ctx, 5, 7, '#fef3c7');
}

function drawWindIcon(ctx: CanvasRenderingContext2D) {
  drawRect(ctx, 5, 1, 6, 2, '#0d9488');
  drawRect(ctx, 4, 3, 8, 2, '#14b8a6');
  drawRect(ctx, 6, 5, 5, 2, '#5eead4');
  drawRect(ctx, 8, 7, 4, 2, '#14b8a6');
  drawRect(ctx, 6, 9, 5, 2, '#0d9488');
  drawRect(ctx, 4, 11, 8, 2, '#14b8a6');
  drawRect(ctx, 5, 13, 6, 2, '#0d9488');
  drawPixel(ctx, 9, 2, '#ccfbf1');
  drawPixel(ctx, 5, 10, '#ccfbf1');
}

function drawWaterIcon(ctx: CanvasRenderingContext2D) {
  drawRect(ctx, 4, 2, 8, 2, '#1d4ed8');
  drawRect(ctx, 2, 4, 12, 2, '#2563eb');
  drawRect(ctx, 3, 6, 10, 2, '#3b82f6');
  drawRect(ctx, 4, 8, 8, 2, '#60a5fa');
  drawRect(ctx, 2, 10, 12, 2, '#2563eb');
  drawRect(ctx, 3, 12, 10, 2, '#1d4ed8');
  drawRect(ctx, 4, 14, 8, 2, '#3b82f6');
  drawPixel(ctx, 5, 5, '#bfdbfe');
  drawPixel(ctx, 9, 9, '#bfdbfe');
}

function drawLightIcon(ctx: CanvasRenderingContext2D) {
  drawPixel(ctx, 7, 0, '#fbbf24');
  drawRect(ctx, 7, 1, 2, 3, '#f59e0b');
  drawRect(ctx, 5, 4, 6, 2, '#fbbf24');
  drawRect(ctx, 3, 5, 10, 3, '#f59e0b');
  drawRect(ctx, 4, 8, 8, 2, '#fbbf24');
  drawRect(ctx, 5, 10, 6, 2, '#f59e0b');
  drawRect(ctx, 6, 12, 4, 2, '#fbbf24');
  drawPixel(ctx, 7, 14, '#f59e0b');
  drawPixel(ctx, 6, 6, '#fef3c7');
  drawPixel(ctx, 8, 7, '#fef3c7');
}

function drawChaosIcon(ctx: CanvasRenderingContext2D) {
  drawRect(ctx, 5, 1, 6, 2, '#7c3aed');
  drawRect(ctx, 3, 3, 10, 2, '#8b5cf6');
  drawRect(ctx, 2, 5, 12, 2, '#7c3aed');
  drawRect(ctx, 2, 7, 12, 3, '#6d28d9');
  drawRect(ctx, 3, 10, 10, 2, '#7c3aed');
  drawRect(ctx, 4, 12, 8, 2, '#8b5cf6');
  drawRect(ctx, 5, 14, 6, 2, '#7c3aed');
  drawPixel(ctx, 6, 6, '#c4b5fd');
  drawPixel(ctx, 8, 7, '#a78bfa');
  drawPixel(ctx, 7, 8, '#c4b5fd');
}

function drawShieldIcon(ctx: CanvasRenderingContext2D) {
  drawRect(ctx, 6, 1, 4, 2, '#2563eb');
  drawRect(ctx, 5, 3, 6, 2, '#3b82f6');
  drawRect(ctx, 4, 5, 8, 3, '#3b82f6');
  drawRect(ctx, 4, 8, 8, 2, '#2563eb');
  drawRect(ctx, 5, 10, 6, 2, '#1d4ed8');
  drawRect(ctx, 6, 12, 4, 2, '#2563eb');
  drawPixel(ctx, 7, 14, '#1d4ed8');
  drawPixel(ctx, 7, 5, '#93c5fd');
  drawPixel(ctx, 6, 6, '#93c5fd');
  drawPixel(ctx, 8, 6, '#93c5fd');
  drawPixel(ctx, 7, 7, '#93c5fd');
}

function drawMeditationIcon(ctx: CanvasRenderingContext2D) {
  drawPixel(ctx, 7, 2, '#60a5fa');
  drawRect(ctx, 6, 3, 4, 2, '#60a5fa');
  drawRect(ctx, 5, 5, 6, 3, '#3b82f6');
  drawRect(ctx, 6, 8, 4, 2, '#3b82f6');
  drawRect(ctx, 5, 10, 6, 2, '#2563eb');
  drawRect(ctx, 6, 12, 4, 2, '#3b82f6');
  drawPixel(ctx, 7, 14, '#2563eb');
  drawPixel(ctx, 5, 4, '#93c5fd');
  drawPixel(ctx, 9, 4, '#93c5fd');
}

function drawFistIcon(ctx: CanvasRenderingContext2D) {
  drawRect(ctx, 5, 1, 6, 2, '#d97706');
  drawRect(ctx, 4, 3, 8, 3, '#f59e0b');
  drawRect(ctx, 3, 6, 10, 2, '#d97706');
  drawRect(ctx, 4, 8, 8, 2, '#b45309');
  drawRect(ctx, 5, 10, 6, 2, '#d97706');
  drawRect(ctx, 6, 12, 4, 2, '#f59e0b');
  drawPixel(ctx, 7, 14, '#d97706');
  drawPixel(ctx, 1, 5, '#fef3c7');
  drawPixel(ctx, 14, 5, '#fef3c7');
  drawPixel(ctx, 3, 2, '#fef3c7');
  drawPixel(ctx, 12, 2, '#fef3c7');
}

function drawLifeIcon(ctx: CanvasRenderingContext2D) {
  drawPixel(ctx, 7, 0, '#22c55e');
  drawRect(ctx, 7, 1, 2, 3, '#16a34a');
  drawRect(ctx, 5, 3, 6, 2, '#22c55e');
  drawRect(ctx, 4, 5, 8, 3, '#16a34a');
  drawRect(ctx, 5, 8, 6, 2, '#22c55e');
  drawRect(ctx, 6, 10, 4, 2, '#16a34a');
  drawRect(ctx, 5, 12, 6, 2, '#22c55e');
  drawPixel(ctx, 7, 14, '#16a34a');
  drawPixel(ctx, 7, 4, '#86efac');
  drawPixel(ctx, 7, 6, '#86efac');
}

function drawVoidIcon(ctx: CanvasRenderingContext2D) {
  drawRect(ctx, 4, 0, 8, 2, '#4c1d95');
  drawRect(ctx, 2, 2, 12, 2, '#5b21b6');
  drawRect(ctx, 1, 4, 14, 2, '#4c1d95');
  drawRect(ctx, 1, 6, 14, 4, '#3b0764');
  drawRect(ctx, 2, 10, 12, 2, '#4c1d95');
  drawRect(ctx, 3, 12, 10, 2, '#5b21b6');
  drawRect(ctx, 4, 14, 8, 2, '#4c1d95');
  drawPixel(ctx, 3, 5, '#a78bfa');
  drawPixel(ctx, 12, 5, '#a78bfa');
  drawPixel(ctx, 4, 7, '#8b5cf6');
  drawPixel(ctx, 11, 7, '#8b5cf6');
  drawPixel(ctx, 7, 8, '#c4b5fd');
}

export function getTechniqueIconDataURL(techniqueId: string): string | null {
  const cached = techniqueIconCache.get(techniqueId);
  if (cached) return cached;

  const [c, ctx] = createCanvas(16, 16);
  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, 0, 16, 16);

  const fire = ['flame_slash', 'soul_fire', 'phoenix_rebirth'];
  const earth = ['earth_shaker', 'stone_skin', 'iron_body'];
  const wind = ['swift_wind', 'qi_gathering'];
  const water = ['flowing_water'];
  const light = ['heavenly_blade', 'immortal_palm'];
  const chaos = ['chaos_orb'];
  const shield = ['spirit_shield'];
  const meditation = ['meditation'];
  const fist = ['vital_strike'];
  const life = ['eternal_life'];
  const voidTechs = ['void_step'];

  if (fire.includes(techniqueId)) drawFireIcon(ctx);
  else if (earth.includes(techniqueId)) drawEarthIcon(ctx);
  else if (wind.includes(techniqueId)) drawWindIcon(ctx);
  else if (water.includes(techniqueId)) drawWaterIcon(ctx);
  else if (light.includes(techniqueId)) drawLightIcon(ctx);
  else if (chaos.includes(techniqueId)) drawChaosIcon(ctx);
  else if (shield.includes(techniqueId)) drawShieldIcon(ctx);
  else if (meditation.includes(techniqueId)) drawMeditationIcon(ctx);
  else if (fist.includes(techniqueId)) drawFistIcon(ctx);
  else if (life.includes(techniqueId)) drawLifeIcon(ctx);
  else if (voidTechs.includes(techniqueId)) drawVoidIcon(ctx);
  else drawMeditationIcon(ctx);

  const url = c.toDataURL();
  techniqueIconCache.set(techniqueId, url);
  return url;
}

// --- Cache clearing (for realm changes etc.) ---

export function clearCharacterCache() { charCache.clear(); }
export function clearAllCaches() {
  charCache.clear();
  monsterCache.clear();
  terrainCache.clear();
  effectCache.clear();
  decorCache.clear();
  buildingCache.clear();
  iconCache.clear();
  iconDataURLCache.clear();
  portraitCache.clear();
  techniqueIconCache.clear();
}
