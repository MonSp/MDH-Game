import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { generateDecorationSprite, type DecorationType } from '../utils/pixelSpriteGenerator';

interface PixelDecorationProps {
  type: DecorationType;
  position?: [number, number, number];
  scale?: number;
  sway?: boolean;
}

export const PixelDecoration = ({ type, position = [0, 0, 0], scale = 0.3, sway = false }: PixelDecorationProps) => {
  const texture = useMemo(() => generateDecorationSprite(type), [type]);
  const spriteRef = useRef<THREE.Sprite>(null);
  const offset = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame((state) => {
    if (!spriteRef.current || !sway) return;
    const t = state.clock.getElapsedTime();
    spriteRef.current.position.x = Math.sin(t * 2 + offset) * 0.03;
  });

  return (
    <sprite ref={spriteRef} position={position} scale={[scale, scale, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  );
};
