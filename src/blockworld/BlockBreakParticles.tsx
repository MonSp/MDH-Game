import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BLOCK_COLORS, BlockType } from './BlockTypes';
import { particleQueue } from './InteractionState';
import { getTextureAtlas } from './TextureAtlas';

interface Particle {
  mesh: THREE.Sprite;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

const PARTICLE_COUNT = 12;
const GRAVITY = 15;
const BASE_SPEED = 4;
const MAX_PARTICLES = 300;
const TEX_SIZE = 4;

function generateParticleTexture(blockType: BlockType): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext('2d')!;

  const color = BLOCK_COLORS[blockType] || [0.5, 0.5, 0.5];
  const r = Math.round(color[0] * 200 + Math.random() * 55);
  const g = Math.round(color[1] * 200 + Math.random() * 55);
  const b = Math.round(color[2] * 200 + Math.random() * 55);

  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

  for (let py = 0; py < TEX_SIZE; py++) {
    for (let px = 0; px < TEX_SIZE; px++) {
      if (Math.random() < 0.3) {
        ctx.fillStyle = `rgb(${r+30},${g+30},${b+30})`;
        ctx.fillRect(px, py, 1, 1);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

const texCache = new Map<BlockType, THREE.CanvasTexture>();

function getParticleTexture(blockType: BlockType): THREE.CanvasTexture {
  if (!texCache.has(blockType)) {
    texCache.set(blockType, generateParticleTexture(blockType));
  }
  return texCache.get(blockType)!;
}

export const BlockBreakParticles: React.FC = () => {
  const particlesRef = useRef<Particle[]>([]);
  const poolRef = useRef<THREE.Sprite[]>([]);

  const groupRef = useRef<THREE.Group>(new THREE.Group());

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const list = particlesRef.current;
    const toRemove: number[] = [];

    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        poolRef.current.push(p.mesh);
        toRemove.push(i);
        continue;
      }

      p.velocity.y -= GRAVITY * dt;
      p.mesh.position.addScaledVector(p.velocity, dt);
      const lifeRatio = p.life / p.maxLife;
      p.mesh.material.opacity = lifeRatio;
      p.mesh.scale.setScalar(0.15 * (0.3 + lifeRatio * 0.7));
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      list.splice(toRemove[i], 1);
    }

    while (particleQueue.length > 0) {
      const evt = particleQueue.shift()!;
      const tex = getParticleTexture(evt.blockType);

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const sprite = poolRef.current.pop() || createSprite(tex);
        if (sprite.material instanceof THREE.SpriteMaterial) {
          sprite.material.map = tex;
          sprite.material.needsUpdate = true;
        }
        sprite.position.set(
          evt.worldX + 0.5 + (Math.random() - 0.5) * 0.3,
          evt.worldY + 0.5 + (Math.random() - 0.5) * 0.3,
          evt.worldZ + 0.5 + (Math.random() - 0.5) * 0.3,
        );
        sprite.visible = true;
        sprite.material.opacity = 1;

        if (!sprite.parent) {
          groupRef.current.add(sprite);
        }

        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 0.5;
        const speed = BASE_SPEED * (0.5 + Math.random() * 0.5);

        list.push({
          mesh: sprite,
          velocity: new THREE.Vector3(
            Math.cos(theta) * Math.cos(phi) * speed,
            Math.sin(phi) * speed * 1.5 + 2,
            Math.sin(theta) * Math.cos(phi) * speed,
          ),
          life: 0.4 + Math.random() * 0.3,
          maxLife: 0.4 + Math.random() * 0.3,
        });
      }
    }

    if (list.length > MAX_PARTICLES) {
      const excess = list.splice(0, list.length - MAX_PARTICLES);
      for (const p of excess) {
        p.mesh.visible = false;
        poolRef.current.push(p.mesh);
      }
    }
  });

  return <primitive object={groupRef.current} />;
};

function createSprite(tex: THREE.CanvasTexture): THREE.Sprite {
  const material = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    opacity: 1,
    sizeAttenuation: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.setScalar(0.15);
  sprite.visible = false;
  return sprite;
}
