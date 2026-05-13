import * as THREE from 'three';

const TEX_SIZE = 64;
const STAGES = 10;

let cachedTextures: THREE.CanvasTexture[] | null = null;

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function generateCrackCanvas(stage: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

  const intensity = (stage + 1) / STAGES;
  const rng = seededRandom(stage * 7919 + 1);
  const centerX = TEX_SIZE / 2;
  const centerY = TEX_SIZE / 2;

  ctx.strokeStyle = `rgba(0, 0, 0, ${0.3 + intensity * 0.7})`;
  ctx.lineWidth = 1 + intensity * 2;

  const numLines = 3 + Math.floor(intensity * 8);

  for (let i = 0; i < numLines; i++) {
    const angle = rng() * Math.PI * 2;
    const startDist = rng() * TEX_SIZE * 0.3;
    const sx = centerX + Math.cos(angle) * startDist;
    const sy = centerY + Math.sin(angle) * startDist;

    ctx.beginPath();
    ctx.moveTo(sx, sy);

    let px = sx;
    let py = sy;
    const segments = 2 + Math.floor(intensity * 5);

    for (let j = 0; j < segments; j++) {
      const segAngle = angle + (rng() - 0.5) * 1.2;
      const segLen = TEX_SIZE * 0.08 * (0.5 + rng() * 0.5) * (0.5 + intensity * 0.5);
      px += Math.cos(segAngle) * segLen;
      py += Math.sin(segAngle) * segLen;
      ctx.lineTo(px, py);
    }

    ctx.stroke();
  }

  for (let i = 0; i < Math.floor(intensity * 6); i++) {
    const cx = rng() * TEX_SIZE;
    const cy = rng() * TEX_SIZE;
    const cr = 1 + rng() * intensity * 3;
    ctx.fillStyle = `rgba(0, 0, 0, ${0.2 + intensity * 0.5})`;
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

export function getCrackTextures(): THREE.CanvasTexture[] {
  if (cachedTextures) return cachedTextures;

  cachedTextures = [];
  for (let stage = 0; stage < STAGES; stage++) {
    const canvas = generateCrackCanvas(stage);
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestMipmapNearestFilter;
    tex.generateMipmaps = true;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    cachedTextures.push(tex);
  }

  return cachedTextures;
}
