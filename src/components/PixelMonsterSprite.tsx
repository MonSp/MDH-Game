import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { generateMonsterSprite } from '../utils/pixelSpriteGenerator';
import type { MonsterType, Realm } from '../store/gameConstants';

interface PixelMonsterSpriteProps {
  type: MonsterType;
  realm: Realm;
  isDead?: boolean;
  scale?: number;
}

export const PixelMonsterSprite = ({ type, realm, isDead = false, scale = 1 }: PixelMonsterSpriteProps) => {
  const texture = useMemo(() => generateMonsterSprite(type, realm), [type, realm]);
  const spriteRef = useRef<THREE.Sprite>(null);
  const deadRef = useRef(isDead);

  // Track death for fade-out
  if (isDead && !deadRef.current) {
    deadRef.current = true;
  }

  useFrame((state) => {
    if (!spriteRef.current) return;
    const t = state.clock.getElapsedTime();

    if (isDead) {
      // Fade out over 500ms
      spriteRef.current.material.opacity = Math.max(0, spriteRef.current.material.opacity - 0.02);
      return;
    }

    // Idle floating
    spriteRef.current.position.y = Math.sin(t * 2) * 0.05;
    // Subtle scale pulse
    spriteRef.current.scale.setScalar(scale * (0.98 + Math.sin(t * 3) * 0.02));
  });

  return (
    <sprite
      ref={spriteRef}
      scale={[scale * 0.7, scale * 0.7, 1]}
    >
      <spriteMaterial
        map={texture}
        transparent
        depthWrite={false}
        opacity={1}
      />
    </sprite>
  );
};
