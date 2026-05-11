import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

const ORBIT_RADIUS = 30;

function getTimePeriod(gameTime: number): 'dawn' | 'day' | 'dusk' | 'night' {
  if (gameTime >= 5 && gameTime < 7) return 'dawn';
  if (gameTime >= 7 && gameTime < 17) return 'day';
  if (gameTime >= 17 && gameTime < 19) return 'dusk';
  return 'night';
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(c1: THREE.Color, c2: THREE.Color, t: number): THREE.Color {
  return new THREE.Color(
    lerp(c1.r, c2.r, t),
    lerp(c1.g, c2.g, t),
    lerp(c1.b, c2.b, t),
  );
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function getSunPosition(gameTime: number): THREE.Vector3 {
  const timeAngle = ((gameTime - 6) / 24) * Math.PI * 2;
  const x = Math.cos(timeAngle) * ORBIT_RADIUS;
  const y = Math.sin(timeAngle) * ORBIT_RADIUS;
  const z = 10;
  return new THREE.Vector3(x, y, z);
}

function getMoonPosition(gameTime: number): THREE.Vector3 {
  const timeAngle = ((gameTime - 6) / 24) * Math.PI * 2 + Math.PI;
  const x = Math.cos(timeAngle) * ORBIT_RADIUS;
  const y = Math.sin(timeAngle) * ORBIT_RADIUS;
  const z = -10;
  return new THREE.Vector3(x, y, z);
}

const SunGlow = ({ position }: { position: THREE.Vector3 }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowTex = useMemo(() => {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 220, 100, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 180, 50, 0.8)');
    gradient.addColorStop(0.5, 'rgba(255, 140, 30, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 100, 20, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  return (
    <mesh ref={meshRef} position={position}>
      <planeGeometry args={[8, 8]} />
      <meshBasicMaterial
        map={glowTex}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

const MoonGlow = ({ position }: { position: THREE.Vector3 }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowTex = useMemo(() => {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(200, 210, 255, 0.9)');
    gradient.addColorStop(0.3, 'rgba(160, 180, 240, 0.5)');
    gradient.addColorStop(0.7, 'rgba(100, 130, 220, 0.1)');
    gradient.addColorStop(1, 'rgba(60, 80, 180, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  return (
    <mesh ref={meshRef} position={position}>
      <planeGeometry args={[6, 6]} />
      <meshBasicMaterial
        map={glowTex}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

export const SunMoonLight = () => {
  const gameTime = useGameStore(s => s.gameTime);
  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight>(null);

  const period = getTimePeriod(gameTime);
  const sunPos = useMemo(() => getSunPosition(gameTime), [gameTime]);
  const moonPos = useMemo(() => getMoonPosition(gameTime), [gameTime]);
  const sunVisible = sunPos.y > -2;
  const moonVisible = moonPos.y > -2;

  const sunIntensity = useMemo(() => {
    if (sunPos.y <= 0) return 0;
    return Math.max(0, Math.min(1.8, sunPos.y / ORBIT_RADIUS * 1.8));
  }, [sunPos]);

  const sunColor = useMemo(() => {
    const dawn = new THREE.Color('#ff8c42');
    const day = new THREE.Color('#fff8e7');
    const dusk = new THREE.Color('#ff6b35');
    if (period === 'dawn') {
      const t = smoothstep(5, 7, gameTime);
      return lerpColor(dawn, day, t);
    }
    if (period === 'dusk') {
      const t = smoothstep(17, 19, gameTime);
      return lerpColor(day, dusk, t);
    }
    if (period === 'day') return day;
    return new THREE.Color('#4a5a8a');
  }, [gameTime, period]);

  const ambientIntensity = useMemo(() => {
    if (period === 'night') return lerp(0.35, 1.0, smoothstep(19, 23, gameTime) * 0.15 + smoothstep(0, 5, gameTime) * 0.15);
    if (period === 'dawn') return lerp(0.35, 2.0, smoothstep(5, 7, gameTime));
    if (period === 'dusk') return lerp(2.0, 0.35, smoothstep(17, 19, gameTime));
    return 2.0;
  }, [gameTime, period]);

  const ambientColor = useMemo(() => {
    const night = new THREE.Color('#1a2a4a');
    const day = new THREE.Color('#f0f4ff');
    if (period === 'dawn') return lerpColor(night, day, smoothstep(5, 7, gameTime));
    if (period === 'dusk') return lerpColor(day, night, smoothstep(17, 19, gameTime));
    if (period === 'day') return day;
    return night;
  }, [gameTime, period]);

  const hemiSkyColor = useMemo(() => {
    const night = new THREE.Color('#1a2a4a');
    const day = new THREE.Color('#b0c4ff');
    if (period === 'dawn') return lerpColor(night, day, smoothstep(5, 7, gameTime));
    if (period === 'dusk') return lerpColor(day, night, smoothstep(17, 19, gameTime));
    return period === 'night' ? night : day;
  }, [gameTime, period]);

  const hemiGroundColor = useMemo(() => {
    const night = new THREE.Color('#0a0a15');
    const day = new THREE.Color('#3a3a50');
    if (period === 'dawn') return lerpColor(night, day, smoothstep(5, 7, gameTime));
    if (period === 'dusk') return lerpColor(day, night, smoothstep(17, 19, gameTime));
    return period === 'night' ? night : day;
  }, [gameTime, period]);

  const hemiIntensity = useMemo(() => {
    if (period === 'night') return 0.12;
    if (period === 'dawn') return lerp(0.12, 0.4, smoothstep(5, 7, gameTime));
    if (period === 'dusk') return lerp(0.4, 0.12, smoothstep(17, 19, gameTime));
    return 0.4;
  }, [gameTime, period]);

  useFrame(() => {
    if (dirLightRef.current) {
      dirLightRef.current.position.copy(sunPos);
    }
  });

  const moonlightIntensity = useMemo(() => {
    if (!moonVisible) return 0;
    if (period === 'day' && moonPos.y > 0) return 0.05;
    return Math.max(0, Math.min(0.3, moonPos.y / ORBIT_RADIUS * 0.3));
  }, [moonPos, moonVisible, period]);

  return (
    <>
      <ambientLight intensity={ambientIntensity} color={ambientColor} />
      <directionalLight
        ref={dirLightRef}
        position={sunPos}
        intensity={sunIntensity}
        color={sunColor}
        castShadow={false}
      />
      {moonlightIntensity > 0.01 && (
        <directionalLight
          position={moonPos}
          intensity={moonlightIntensity}
          color="#7a8ab8"
        />
      )}
      <hemisphereLight
        ref={hemiLightRef}
        args={[hemiSkyColor, hemiGroundColor, hemiIntensity]}
      />
      {sunVisible && (
        <>
          <mesh position={sunPos}>
            <sphereGeometry args={[0.6, 16, 16]} />
            <meshBasicMaterial color="#fff8dc" />
          </mesh>
          <SunGlow position={sunPos} />
        </>
      )}
      {moonVisible && (
        <>
          <mesh position={moonPos}>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshBasicMaterial color="#d0d8f0" />
          </mesh>
          <MoonGlow position={moonPos} />
        </>
      )}
    </>
  );
};
