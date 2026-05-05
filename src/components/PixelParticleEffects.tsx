import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { generateEffectTexture } from '../utils/pixelSpriteGenerator';

// --- Combat spark particles ---
interface CombatParticlesProps {
  position: [number, number, number];
  count?: number;
  color?: string;
  duration?: number;
  onComplete?: () => void;
}

export const CombatParticles = ({ position, count = 12, color = '#ef4444', duration = 800, onComplete }: CombatParticlesProps) => {
  const pointsRef = useRef<THREE.Points>(null);
  const startRef = useRef(Date.now());
  const sparkTexture = useMemo(() => generateEffectTexture('spark'), []);

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 0.2;
      pos[i * 3 + 1] = Math.random() * 0.3;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
      vel[i * 3] = (Math.random() - 0.5) * 2;
      vel[i * 3 + 1] = Math.random() * 2;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }
    return { positions: pos, velocities: vel };
  }, [count]);

  useFrame(() => {
    if (!pointsRef.current) return;
    const elapsed = Date.now() - startRef.current;
    const life = Math.max(0, 1 - elapsed / duration);
    const geo = pointsRef.current.geometry;
    const pos = geo.attributes.position.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const t = elapsed / 1000;
      pos[i * 3] += velocities[i * 3] * 0.02;
      pos[i * 3 + 1] += velocities[i * 3 + 1] * 0.02 - 0.01; // gravity
      pos[i * 3 + 2] += velocities[i * 3 + 2] * 0.02;
    }
    geo.attributes.position.needsUpdate = true;
    (pointsRef.current.material as THREE.PointsMaterial).opacity = life;
    pointsRef.current.scale.setScalar(life);
  });

  useEffect(() => {
    const timer = setTimeout(() => onComplete?.(), duration);
    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <points ref={pointsRef} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        map={sparkTexture}
        size={0.15}
        color={color}
        blending={THREE.AdditiveBlending}
        transparent
        depthWrite={false}
        opacity={1}
      />
    </points>
  );
};

// --- Blood hit particles ---
interface BloodParticlesProps {
  position: [number, number, number];
  count?: number;
  duration?: number;
  onComplete?: () => void;
}

export const BloodParticles = ({ position, count = 16, duration = 600, onComplete }: BloodParticlesProps) => {
  const pointsRef = useRef<THREE.Points>(null);
  const startRef = useRef(Date.now());
  const bloodTexture = useMemo(() => generateEffectTexture('spark'), []);

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      pos[i * 3] = (Math.random() - 0.5) * 0.1;
      pos[i * 3 + 1] = Math.random() * 0.2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
      vel[i * 3] = Math.cos(angle) * speed * 0.02;
      vel[i * 3 + 1] = 1 + Math.random() * 2;
      vel[i * 3 + 2] = Math.sin(angle) * speed * 0.02;
    }
    return { positions: pos, velocities: vel };
  }, [count]);

  useFrame(() => {
    if (!pointsRef.current) return;
    const elapsed = Date.now() - startRef.current;
    const life = Math.max(0, 1 - elapsed / duration);
    const geo = pointsRef.current.geometry;
    const pos = geo.attributes.position.array as Float32Array;

    for (let i = 0; i < count; i++) {
      pos[i * 3] += velocities[i * 3];
      pos[i * 3 + 1] += velocities[i * 3 + 1] * 0.02 - 0.03;
      pos[i * 3 + 2] += velocities[i * 3 + 2];
    }
    geo.attributes.position.needsUpdate = true;
    (pointsRef.current.material as THREE.PointsMaterial).opacity = life;
    pointsRef.current.scale.setScalar(0.5 + life * 0.5);
  });

  useEffect(() => {
    const timer = setTimeout(() => onComplete?.(), duration);
    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <points ref={pointsRef} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        map={bloodTexture}
        size={0.12}
        color="#dc2626"
        blending={THREE.AdditiveBlending}
        transparent
        depthWrite={false}
        opacity={1}
      />
    </points>
  );
};

// --- Element-colored skill release particles ---
type ElementType = 'fire' | 'ice' | 'lightning';

interface SkillParticlesProps {
  position: [number, number, number];
  element: ElementType;
  duration?: number;
  onComplete?: () => void;
}

const ELEMENT_COLORS: Record<ElementType, string> = {
  fire: '#ff6b35',
  ice: '#67e8f9',
  lightning: '#a855f7',
};

export const SkillParticles = ({ position, element, duration = 1000, onComplete }: SkillParticlesProps) => {
  const pointsRef = useRef<THREE.Points>(null);
  const startRef = useRef(Date.now());
  const sparkTexture = useMemo(() => generateEffectTexture('spark'), []);
  const count = 20;
  const color = ELEMENT_COLORS[element] || '#ffffff';

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 0.5 + Math.random() * 1.5;
      pos[i * 3] = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = 0;
      vel[i * 3] = Math.sin(phi) * Math.cos(theta) * speed * 0.03;
      vel[i * 3 + 1] = Math.cos(phi) * speed * 0.03;
      vel[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed * 0.03;
    }
    return { positions: pos, velocities: vel };
  }, []);

  useFrame(() => {
    if (!pointsRef.current) return;
    const elapsed = Date.now() - startRef.current;
    const life = Math.max(0, 1 - elapsed / duration);
    const geo = pointsRef.current.geometry;
    const pos = geo.attributes.position.array as Float32Array;

    for (let i = 0; i < count; i++) {
      pos[i * 3] += velocities[i * 3];
      pos[i * 3 + 1] += velocities[i * 3 + 1];
      pos[i * 3 + 2] += velocities[i * 3 + 2];
    }
    geo.attributes.position.needsUpdate = true;
    (pointsRef.current.material as THREE.PointsMaterial).opacity = life * 0.8;
    if (element === 'lightning') {
      pointsRef.current.scale.setScalar(0.8 + Math.random() * 0.4);
    }
  });

  useEffect(() => {
    const timer = setTimeout(() => onComplete?.(), duration);
    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <points ref={pointsRef} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        map={sparkTexture}
        size={0.2}
        color={color}
        blending={THREE.AdditiveBlending}
        transparent
        depthWrite={false}
        opacity={1}
      />
    </points>
  );
};

// --- Siege debris particles ---
interface DebrisParticlesProps {
  position: [number, number, number];
  count?: number;
  duration?: number;
  onComplete?: () => void;
}

export const DebrisParticles = ({ position, count = 12, duration = 700, onComplete }: DebrisParticlesProps) => {
  const pointsRef = useRef<THREE.Points>(null);
  const startRef = useRef(Date.now());
  const debTexture = useMemo(() => generateEffectTexture('spark'), []);

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2;
      pos[i * 3] = (Math.random() - 0.5) * 0.3;
      pos[i * 3 + 1] = Math.random() * 0.2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
      vel[i * 3] = Math.cos(angle) * speed * 0.03;
      vel[i * 3 + 1] = 0.5 + Math.random() * 1.5;
      vel[i * 3 + 2] = Math.sin(angle) * speed * 0.03;
    }
    return { positions: pos, velocities: vel };
  }, [count]);

  useFrame(() => {
    if (!pointsRef.current) return;
    const elapsed = Date.now() - startRef.current;
    const life = Math.max(0, 1 - elapsed / duration);
    const geo = pointsRef.current.geometry;
    const pos = geo.attributes.position.array as Float32Array;

    for (let i = 0; i < count; i++) {
      pos[i * 3] += velocities[i * 3];
      pos[i * 3 + 1] += velocities[i * 3 + 1] * 0.02 - 0.025;
      pos[i * 3 + 2] += velocities[i * 3 + 2];
    }
    geo.attributes.position.needsUpdate = true;
    (pointsRef.current.material as THREE.PointsMaterial).opacity = life;
  });

  useEffect(() => {
    const timer = setTimeout(() => onComplete?.(), duration);
    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <points ref={pointsRef} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        map={debTexture}
        size={0.18}
        color="#a16207"
        blending={THREE.AdditiveBlending}
        transparent
        depthWrite={false}
        opacity={1}
      />
    </points>
  );
};

// --- Camera shake trigger utility ---
export const triggerScreenShake = (intensity = 1) => {
  window.dispatchEvent(new CustomEvent('camshake', { detail: intensity }));
};

// --- CameraShake R3F component (place inside Canvas) ---
export const CameraShake = () => {
  const shakeRef = useRef(0);
  const { camera } = useThree();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail || 1;
      shakeRef.current = Math.min(shakeRef.current + detail, 5);
    };
    window.addEventListener('camshake', handler);
    return () => window.removeEventListener('camshake', handler);
  }, []);

  useFrame(() => {
    if (shakeRef.current > 0.01) {
      const intensity = shakeRef.current;
      camera.position.x = 25 + (Math.random() - 0.5) * intensity * 0.2;
      camera.position.z = 25 + (Math.random() - 0.5) * intensity * 0.2;
      camera.lookAt(0, 0, 0);
      shakeRef.current *= 0.85;
    }
  });

  return null;
};

// --- Gathering effect ---
interface GatheringEffectProps {
  position: [number, number, number];
  resourceType: string;
  duration?: number;
  onComplete?: () => void;
}

export const GatheringEffect = ({ position, resourceType, duration = 1000, onComplete }: GatheringEffectProps) => {
  const pointsRef = useRef<THREE.Points>(null);
  const startRef = useRef(Date.now());
  const count = 8;
  const textureType = resourceType === '矿脉' ? 'crystal' : 'leaf';
  const particleTexture = useMemo(() => generateEffectTexture(textureType as any), [textureType]);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 0.4;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }
    return pos;
  }, []);

  useFrame(() => {
    if (!pointsRef.current) return;
    const elapsed = Date.now() - startRef.current;
    const life = Math.max(0, 1 - elapsed / duration);
    const geo = pointsRef.current.geometry;
    const pos = geo.attributes.position.array as Float32Array;

    const t = elapsed / 1000;
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] = t * 0.8 + Math.sin(t * 3 + i) * 0.1;
    }
    geo.attributes.position.needsUpdate = true;
    (pointsRef.current.material as THREE.PointsMaterial).opacity = life;
  });

  useEffect(() => {
    const timer = setTimeout(() => onComplete?.(), duration);
    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <points ref={pointsRef} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        map={particleTexture}
        size={0.15}
        blending={THREE.AdditiveBlending}
        transparent
        depthWrite={false}
        opacity={1}
      />
    </points>
  );
};

// --- Breakthrough effect ---
interface BreakthroughEffectProps {
  position: [number, number, number];
  color?: string;
}

export const BreakthroughEffect = ({ position, color = '#ffd700' }: BreakthroughEffectProps) => {
  const ringRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Sprite>(null);
  const glowTexture = useMemo(() => generateEffectTexture('glow'), []);

  useFrame((state) => {
    if (!ringRef.current || !glowRef.current) return;
    const t = state.clock.getElapsedTime();
    const pulse = Math.sin(t * 4) * 0.5 + 0.5;

    ringRef.current.scale.setScalar(1 + t * 3);
    const ringMat = ringRef.current.material as THREE.MeshBasicMaterial;
    ringMat.opacity = Math.max(0, 1 - t * 0.5);

    glowRef.current.scale.setScalar(2 + pulse);
    const glowMat = glowRef.current.material as THREE.SpriteMaterial;
    glowMat.opacity = Math.max(0, 1 - t * 0.3);
  });

  return (
    <group position={position}>
      <mesh ref={ringRef} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.8, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
      <sprite ref={glowRef} scale={[2, 2, 1]}>
        <spriteMaterial map={glowTexture} color={color} transparent opacity={0.6} depthWrite={false} />
      </sprite>
    </group>
  );
};
