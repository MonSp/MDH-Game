import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { interactionState } from './InteractionState';

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vUv;

void main() {
  float edgeX = 1.0 - smoothstep(0.0, 0.04, min(vUv.x, 1.0 - vUv.x));
  float edgeY = 1.0 - smoothstep(0.0, 0.04, min(vUv.y, 1.0 - vUv.y));
  float edge = max(edgeX, edgeY);
  if (edge < 0.05) discard;
  gl_FragColor = vec4(uColor, edge * uOpacity);
}
`;

export const BlockSelectionHelper: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const visibleRef = useRef(false);

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uColor: { value: new THREE.Color(1, 1, 1) },
      uOpacity: { value: 0.7 },
    },
    transparent: true,
    depthTest: true,
    depthWrite: false,
    side: THREE.FrontSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  }), []);

  useFrame(() => {
    const target = interactionState.hoverTarget;
    if (!target) {
      if (visibleRef.current) {
        visibleRef.current = false;
        meshRef.current!.visible = false;
      }
      return;
    }

    const mesh = meshRef.current!;
    mesh.position.set(target.worldX + 0.5, target.worldY + 0.5, target.worldZ + 0.5);

    if (!visibleRef.current) {
      visibleRef.current = true;
      mesh.visible = true;
    }
  });

  return (
    <mesh ref={meshRef} material={material} visible={false}>
      <boxGeometry args={[1.005, 1.005, 1.005]} />
    </mesh>
  );
};
