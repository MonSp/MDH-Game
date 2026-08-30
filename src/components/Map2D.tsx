import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Html, useCursor, Sparkles, Line } from '@react-three/drei';
import { CameraControls } from '../utils/CameraControls';
import * as THREE from 'three';
import { useGameStore, NPC, WildMonster, type SquadMember, type BuildingType, COUNTRIES_DATA, COUNTRIES, BodyType, getClanTerritoryCenter } from '../store/gameStore';
import { generateCharacterStyle, getRealmAura } from '../utils/appearance';
import { BuildingWorld } from '../buildings/BuildingWorld';
import { useBuildingStore, makeBuildingId } from '../buildings/BuildingStore';
import { getBuildingDef, BuildingKind } from '../buildings/CityRegistry';
import { getTerrainTile } from '../utils/terrain';
import { TerrainType, isWater } from '../shared/types/map';
import { getSceneIdByCoordinate, SCENE_REGISTRY } from '../content/scenes/sceneRegistry';
import { PixelCharacterSprite } from './PixelCharacterSprite';
import { PixelMonsterSprite } from './PixelMonsterSprite';
import { PixelResourceSprite } from './PixelResourceSprite';
import { BakedCapitalField } from './BakedCapitalField';
import { BakedManorField } from './BakedManorField';
import TreeMesh from '../buildings/TreeMesh';
import VoxelRenderer from '../buildings/VoxelRenderer';
import { CombatParticles, BloodParticles, CameraShake, triggerScreenShake, GatheringEffect, BreakthroughEffect, SkillParticles, DebrisParticles } from './PixelParticleEffects';
import { generateTerrainTileTexture, generateEffectTexture, generateDecorationSprite, type DecorationType } from '../utils/pixelSpriteGenerator';
import { PixelDecoration } from './PixelDecoration';
import { SunMoonLight } from './SunMoonLight';
import { TimeControlPanel } from './TimeControlPanel';
import { BuildModeController } from './BuildModeController';
import { BuildModeUI } from './BuildModeUI';
import { useBuildModeStore } from '../buildings/BuildModeStore';
import { BlockWorld } from '../blockworld/BlockWorld';
import { FirstPersonController } from '../blockworld/FirstPersonController';
import { BlockWorldHUD } from '../blockworld/BlockWorldHUD';

// Constants
const VIEW_RADIUS = 12;
const TERRAIN_BORDER = 3; // Extra tile rings beyond VIEW_RADIUS to hide exposed side faces
const TERRAIN_RADIUS = VIEW_RADIUS + TERRAIN_BORDER;

// Block world mode toggle
let _blockWorldMode = false;
export function isBlockWorldMode() { return _blockWorldMode; }

// Weather effect — rain or snow based on player biome
const WeatherEffect = ({ playerPos }: { playerPos: { x: number; y: number } }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const tile = getTerrainTile(playerPos.x, playerPos.y);
  const isSnow = tile.biome === TerrainType.SNOW;
  const isWaterBiome = tile.biome === TerrainType.DEEP_WATER || tile.biome === TerrainType.SHALLOW_WATER;
  const showWeather = isSnow || (isWaterBiome && seededRandom(Math.round(playerPos.x / 10), Math.round(playerPos.y / 10)) < 0.35);
  const count = isSnow ? 200 : 400;
  const range = VIEW_RADIUS;

  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * range * 2;
      pos[i * 3 + 1] = Math.random() * 5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * range * 2;
      vel[i] = 0.5 + Math.random() * 0.5;
    }
    return [pos, vel];
  }, [count, range]);

  useFrame((_, delta) => {
    if (!pointsRef.current || !showWeather) return;
    const geo = pointsRef.current.geometry;
    const pos = geo.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] -= velocities[i] * delta * (isSnow ? 0.5 : 2);
      if (isSnow) {
        pos[i * 3] += Math.sin(Date.now() * 0.001 + i) * delta * 0.3;
        pos[i * 3 + 2] += Math.cos(Date.now() * 0.0013 + i * 0.7) * delta * 0.3;
      }
      if (pos[i * 3 + 1] < -1) {
        pos[i * 3] = (Math.random() - 0.5) * range * 2;
        pos[i * 3 + 1] = 4 + Math.random() * 2;
        pos[i * 3 + 2] = (Math.random() - 0.5) * range * 2;
      }
    }
    geo.attributes.position.needsUpdate = true;
  });

  const particleTexture = useMemo(() => generateEffectTexture(isSnow ? 'star' : 'spark'), [isSnow]);

  if (!showWeather) return null;

  return (
    <points ref={pointsRef}>
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
        size={isSnow ? 0.08 : 0.04}
        color={isSnow ? '#ffffff' : '#94a3b8'}
        transparent
        opacity={isSnow ? 0.7 : 0.35}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};
function seededRandom(x: number, y: number): number {
  const h = (x * 374761393 + y * 668265263) & 0x7fffffff;
  return (h % 1000) / 1000;
}

// Breathing pulse ring for player highlight
const PlayerPulseRing = () => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      const pulse = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
      ref.current.scale.setScalar(1 + pulse * 0.3);
      (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.3 + pulse * 0.15;
    }
  });
  return (
    <mesh ref={ref} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.8, 1.0, 32]} />
      <meshBasicMaterial color="#4ade80" transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
};

// Animated water tile with flowing texture — plane to avoid black side-face stripes
const WaterTile = ({ biome, yPos }: { biome: TerrainType; yPos: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => {
    const t = getTerrainTexture(biome).clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 1);
    return t;
  }, [biome]);

  return (
    <mesh ref={meshRef} position={[0, yPos, 0]}>
      <planeGeometry args={[1.0, 1.0]} />
      <meshStandardMaterial
        map={tex}
        transparent
        opacity={0.85}
        roughness={0.1}
        metalness={0.6}
        emissive={biome === TerrainType.SHALLOW_WATER ? '#0a5a7a' : '#062a4a'}
        emissiveIntensity={0.15}
      />
    </mesh>
  );
};

function getDecorationForTile(x: number, y: number, biome: TerrainType): DecorationType | null {
  const r = seededRandom(x, y);
  switch (biome) {
    case TerrainType.GRASS:
      if (r < 0.12) return 'flower_white';
      if (r < 0.22) return 'flower_red';
      if (r < 0.32) return 'flower_yellow';
      if (r < 0.55) return 'grass_tuft';
      return null;
    case TerrainType.FOREST:
      if (r < 0.15) return 'mushroom';
      if (r < 0.35) return 'bush';
      if (r < 0.50) return 'grass_tuft';
      return null;
    case TerrainType.ROCK:
      if (r < 0.25) return 'rock_small';
      if (r < 0.40) return 'gravel';
      if (r < 0.50) return 'crystal_small';
      return null;
    case TerrainType.SAND:
      if (r < 0.08) return 'cactus';
      if (r < 0.20) return 'dry_grass';
      if (r < 0.30) return 'rock_small';
      return null;
    case TerrainType.MOUNTAIN:
      if (r < 0.10) return 'alpine_grass';
      if (r < 0.20) return 'crystal_small';
      if (r < 0.30) return 'rock_small';
      return null;
    case TerrainType.SNOW:
      if (r < 0.15) return 'snow_mound';
      if (r < 0.25) return 'ice_shard';
      return null;
    case TerrainType.SHALLOW_WATER:
      if (r < 0.10) return 'lilypad';
      if (r < 0.18) return 'reed';
      return null;
    default:
      return null;
  }
}

// 2. Cultivator Pixel Sprite — real-world scale: ~1.8m human height
const CultivatorModel = ({ appearance, isMoving = false, isFloating = false }: { appearance: any, isMoving?: boolean, isFloating?: boolean }) => {
  const { height } = appearance;
  const s = height * 0.6;

  return (
    <group scale={[s * 1.0, s * 1.0, s * 1.0]}>
      <PixelCharacterSprite
        realm={appearance.realm || '凡人'}
        bodyType={appearance.bodyType || '凡体'}
        role={appearance.role || '内门子弟'}
        isMoving={isMoving}
        isFloating={isFloating}
        scale={s}
      />
    </group>
  );
};

// 3. Terrain Component with pixel art textures
const TERRAIN_VARIANTS = 4;
const terrainTextureCache = new Map<string, THREE.CanvasTexture>();
function getTerrainTexture(biome: TerrainType, tileX?: number, tileY?: number): THREE.CanvasTexture {
  const variant = (tileX !== undefined && tileY !== undefined)
    ? Math.floor(seededRandom(tileX * 7.1, tileY * 3.7) * TERRAIN_VARIANTS)
    : 0;
  const key = `${biome}|${variant}`;
  if (!terrainTextureCache.has(key)) {
    terrainTextureCache.set(key, generateTerrainTileTexture(biome, variant));
  }
  return terrainTextureCache.get(key)!;
}

// Build a single large terrain atlas texture covering the visible area
function tileElevationOffset(biome: TerrainType, elevation: number): number {
  if (isWater(biome)) return 0;
  return Math.max(0, elevation) * 0.25;
}

// Renders all tiles sharing the same texture as a single InstancedMesh
const TerrainPlaneGroup = React.memo(({ tiles, biome, variant }: { tiles: Array<{ dx: number; dy: number; elevation: number }>; biome: TerrainType; variant: number }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const texture = useMemo(() => getTerrainTexture(biome, variant), [biome, variant]);

  useEffect(() => {
    if (!ref.current) return;
    const dummy = new THREE.Object3D();
    tiles.forEach((t, i) => {
      const yOff = tileElevationOffset(biome, t.elevation);
      dummy.position.set(t.dx, yOff, t.dy);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  }, [tiles, biome]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, tiles.length]}>
      <planeGeometry args={[1.05, 1.05]} />
      <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
    </instancedMesh>
  );
});

// Renders all terrain box sides (elevation walls) as one InstancedMesh
const TerrainBoxGroup = React.memo(({ tiles }: { tiles: Array<{ dx: number; dy: number; elevation: number; biome: TerrainType }> }) => {
  const ref = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    if (!ref.current) return;
    const dummy = new THREE.Object3D();
    tiles.forEach((t, i) => {
      const yOff = tileElevationOffset(t.biome, t.elevation);
      dummy.position.set(t.dx, yOff * 0.5, t.dy);
      dummy.scale.set(1.01, yOff, 1.01);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  }, [tiles]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, tiles.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#3a3a45" />
    </instancedMesh>
  );
});

const Terrain = ({ playerPos }: { playerPos: { x: number, y: number } }) => {
  const _worldTrees = useGameStore(s => s._worldTrees);
  const treeKeySet = useMemo(() => {
    const set = new Set<string>();
    for (const t of _worldTrees) set.add(`${t.x},${t.y}`);
    return set;
  }, [_worldTrees]);

  const tileData = useMemo(() => {
    const tiles: Array<{ x: number; y: number; dx: number; dy: number; biome: TerrainType; elevation: number; textureVariant: number; hasTree: boolean; isWaterTile: boolean; isMountain: boolean; showPeak: boolean; showSnowCap: boolean }> = [];
    const gridCenterX = Math.round(playerPos.x);
    const gridCenterY = Math.round(playerPos.y);
    for (let dy = -VIEW_RADIUS; dy <= VIEW_RADIUS; dy++) {
      for (let dx = -VIEW_RADIUS; dx <= VIEW_RADIUS; dx++) {
        const gx = gridCenterX + dx;
        const gy = gridCenterY + dy;
        const tile = getTerrainTile(gx, gy);
        const isWaterTile = isWater(tile.biome);
        const isMountain = tile.biome === TerrainType.ROCK || tile.biome === TerrainType.MOUNTAIN;
        tiles.push({
          x: gx, y: gy, dx, dy,
          biome: tile.biome,
          elevation: tile.elevation,
          textureVariant: Math.floor(seededRandom(gx * 7.1, gy * 3.7) * TERRAIN_VARIANTS),
          hasTree: treeKeySet.has(`${gx},${gy}`),
          isWaterTile,
          isMountain,
          showPeak: isMountain && tile.elevation > 0.6,
          showSnowCap: isMountain && tile.elevation > 0.8,
        });
      }
    }
    return tiles;
  }, [Math.round(playerPos.x), Math.round(playerPos.y), treeKeySet]);

  const planeGroups = useMemo(() => {
    const groups = new Map<string, Array<{ dx: number; dy: number; elevation: number }>>();
    for (const t of tileData) {
      const key = `${t.biome}|${t.textureVariant}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push({ dx: t.dx, dy: t.dy, elevation: t.elevation });
    }
    return groups;
  }, [tileData]);

  const boxTiles = useMemo(() =>
    tileData.filter(t => !t.isWaterTile && tileElevationOffset(t.biome, t.elevation) > 0.05),
  [tileData]);

  return (
    <group>
      {Array.from(planeGroups.entries()).map(([key, tiles]) => {
        const [biomeStr, variantStr] = key.split('|');
        return (
          <TerrainPlaneGroup
            key={key}
            tiles={tiles}
            biome={biomeStr as TerrainType}
            variant={Number(variantStr)}
          />
        );
      })}



      {tileData.filter(t => t.showPeak).map(tile => {
        const yOff = tileElevationOffset(tile.biome, tile.elevation);
        return (
          <mesh key={`peak-${tile.x},${tile.y}`} position={[tile.dx, 10 + yOff, tile.dy]}>
            <coneGeometry args={[8, 20, 8]} />
            <meshStandardMaterial color={tile.showSnowCap ? '#f8fafc' : '#78716c'} roughness={0.7} emissive={tile.showSnowCap ? '#ffffff' : '#4a453f'} emissiveIntensity={0.1} />
          </mesh>
        );
      })}

      {tileData.filter(t => t.hasTree && !t.isMountain && !t.isWaterTile).map(tile => {
        const treeVariant = seededRandom(tile.x * 3.7, tile.y * 7.1);
        const treeScale = 2.5 + seededRandom(tile.x * 1.3, tile.y * 2.7) * 2.0;
        const yOff = tileElevationOffset(tile.biome, tile.elevation);
        return (
          <TreeMesh
            key={`tree-${tile.x},${tile.y}`}
            x={tile.dx}
            y={tile.dy + yOff}
            scale={treeScale * 0.5}
            variant={treeVariant}
          />
        );
      })}

      {tileData.map(tile => {
        const decor = getDecorationForTile(tile.x, tile.y, tile.biome);
        if (!decor) return null;
        const decorDensity = seededRandom(tile.x * 23.1, tile.y * 29.7);
        if (decorDensity > 0.55) return null;
        const yOff = tileElevationOffset(tile.biome, tile.elevation);
        const topY = tile.isWaterTile ? 0.05 : yOff;
        const decorScale = (decor === 'bush' || decor === 'cactus') ? 0.8 : 0.5;
        const swayTypes: DecorationType[] = ['grass_tuft', 'flower_white', 'flower_red', 'flower_yellow', 'reed', 'alpine_grass', 'dry_grass'];
        return (
          <PixelDecoration
            key={`decor-${tile.x},${tile.y}-${decor}`}
            type={decor}
            position={[tile.dx, topY, tile.dy]}
            scale={decorScale}
            sway={swayTypes.includes(decor)}
          />
        );
      })}

    </group>
  );
};

// 3c: Camera orbit controller — scroll zoom, middle-drag rotate, Q/E rotate
let _oc: CameraControls | null = null;
const keyRotate = { active: false, dir: 0 };
let _camera: THREE.Camera | null = null;
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _upVec = new THREE.Vector3(0, 1, 0);

const _keysDown = new Set<string>();
let _moveLoopId: number | null = null;
let _moveLastTime = 0;
const MOVEMENT_SPEED = 5;

function _isBlockedByBuildingWall(targetX: number, targetY: number): boolean {
  const blds = useBuildingStore.getState().buildings;
  for (const b of blds) {
    const hw = b.def.compoundWidth / 2;
    const hd = b.def.compoundDepth / 2;
    const lx = targetX - b.worldX;
    const ly = targetY - b.worldY;
    if (lx < -hw - 0.5 || lx > hw + 0.5 || ly < -hd - 0.5 || ly > hd + 0.5) continue;

    const IGNORE_RANGE = 2.5;
    for (const gate of b.def.gates) {
      const gateWX = b.worldX + gate.x - hw + 1.5;
      const gateWY = b.worldY + gate.y - hd + 1.5;
      if (Math.abs(targetX - gateWX) < IGNORE_RANGE && Math.abs(targetY - gateWY) < IGNORE_RANGE) {
        return false;
      }
    }

    if (lx >= -hw && lx <= hw && ly >= -hd && ly <= hd) {
      return true;
    }
  }
  return false;
}

const CameraController = ({ playerPos }: { playerPos: { x: number; y: number } }) => {
  const { camera, gl } = useThree();
  const isInside = useBuildingStore(s => s.isInside);
  const interiorDistance = 8;
  const baseDistance = 18;
  const prevInside = useRef<boolean | null>(null);
  const distTarget = useRef<number | null>(null);
  useEffect(() => {
    if (_oc) {
      _oc.dispose();
      _oc = null;
    }
    _oc = new CameraControls(camera, gl.domElement, {
      enableDamping: true,
      dampingFactor: 0.08,
      rotateSpeed: 0.8,
      zoomSpeed: 1.0,
      minDistance: 6,
      maxDistance: 50,
      minPolarAngle: 0.1,
      maxPolarAngle: Math.PI / 2.2,
      mouseButtons: { LEFT: 0, MIDDLE: 0, RIGHT: 1 },
    });
    _oc.setTarget(0, 0, 0);
    _camera = camera;
    return () => {
      _oc?.dispose();
      _oc = null;
      _camera = null;
    };
  }, [camera, gl]);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.key === 'q' || e.key === 'Q') { keyRotate.dir = -1; keyRotate.active = true; }
      if (e.key === 'e' || e.key === 'E') { keyRotate.dir = 1; keyRotate.active = true; }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === 'q' || e.key === 'Q' || e.key === 'e' || e.key === 'E') { keyRotate.active = false; keyRotate.dir = 0; }
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, []);

  useEffect(() => {
    if (prevInside.current !== null && prevInside.current !== isInside) {
      distTarget.current = isInside ? interiorDistance : baseDistance;
    }
    prevInside.current = isInside;
  }, [isInside]);

  useFrame((_, delta) => {
    const ctrl = _oc;
    if (!ctrl) {
      camera.lookAt(0, 0, 0);
      return;
    }

    if (keyRotate.active) {
      const angle = keyRotate.dir * delta * 2.5;
      const { x, y, z } = camera.position;
      const cos = Math.cos(angle), sin = Math.sin(angle);
      camera.position.set(x * cos - z * sin, y, x * sin + z * cos);
    }

    if (distTarget.current !== null) {
      const dist = camera.position.distanceTo(ctrl.target);
      const diff = distTarget.current - dist;
      if (Math.abs(diff) < 0.05) {
        distTarget.current = null;
      } else {
        ctrl.spherical.radius += diff * Math.min(1, delta * 5) * 0.08;
      }
    }

    ctrl.update();
  });

  return null;
};

const PlayerBuildVoxels = () => {
  const currentBuild = useBuildModeStore(s => s.currentBuild);
  const playerPos = useGameStore(s => s.player?.position);

  if (!currentBuild || !playerPos) return null;

  return (
    <VoxelRenderer
      voxels={currentBuild.voxels}
      position={[currentBuild.worldX - playerPos.x, 0, currentBuild.worldY - playerPos.y]}
      scale={0.333}
    />
  );
};

// 4. Resource Point with pixel art sprite
const ResourceMesh = ({ res, dx, dy }: { res: any, dx: number, dy: number }) => {
  const interactWithResource = useGameStore(state => state.interactWithResource);
  const clans = useGameStore(state => state.clans);
  const [hovered, setHovered] = useState(false);
  const [gathering, setGathering] = useState(false);
  useCursor(hovered);

  const tile = getTerrainTile(res.position.x, res.position.y);
  const baseHeight = tileElevationOffset(tile.biome, tile.elevation);

  const owner = res.ownerClanId ? clans.find(c => c.id === res.ownerClanId) : null;
  const ownerColor = '#fbbf24';

  const handleGather = (e: any) => {
    e.stopPropagation();
    if (useBuildModeStore.getState().active) return;
    interactWithResource(res.id);
    setGathering(true);
    setTimeout(() => setGathering(false), 1200);
  };

  return (
    <group position={[dx, baseHeight + 0.4, dy]}>
      {/* Gathering effect */}
      {gathering && <GatheringEffect position={[0, 0.5, 0]} resourceType={res.type} duration={1000} />}

      {/* Owner indicator flag */}
      {owner && (
        <mesh position={[0, 0.8, 0]}>
          <planeGeometry args={[0.2, 0.3]} />
          <meshStandardMaterial color={ownerColor} side={THREE.DoubleSide} />
        </mesh>
      )}
      {/* Pixel art sprite */}
      <group
        onClick={handleGather}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <PixelResourceSprite type={res.type} scale={0.8} />
      </group>
      {hovered && (
        <Html position={[0, 1, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="bg-zinc-900/90 border border-zinc-700 px-2 py-1 rounded text-xs whitespace-nowrap shadow-lg">
            <div className="text-emerald-400 font-bold">{res.type}</div>
            {owner ? (
              <div className="text-amber-400">{owner.name} 占领</div>
            ) : (
              <div className="text-zinc-400">点击采集</div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};

// 5. NPC Mesh
const NPCMesh = ({ npc, dx, dy, onClick, showNameTag = true, compact = false }: { npc: NPC, dx: number, dy: number, onClick: () => void, showNameTag?: boolean; compact?: boolean }) => {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const appearance = useMemo(() => generateCharacterStyle(npc.realm, '凡体', npc.role), [npc]);

  const tile = getTerrainTile(npc.position.x, npc.position.y);
  const baseHeight = tileElevationOffset(tile.biome, tile.elevation);

  const [isMoving, setIsMoving] = useState(false);
  const prevPos = useRef(npc.position);

  const realmIndex = useMemo(() => ['凡人','练气','筑基','金丹','元婴','化神','炼虚','合体','大乘','渡劫'].indexOf(npc.realm), [npc.realm]);

  useEffect(() => {
    if (prevPos.current.x !== npc.position.x || prevPos.current.y !== npc.position.y) {
      setIsMoving(true);
      const timer = setTimeout(() => setIsMoving(false), 500); // 移动状态保持0.5秒
      prevPos.current = npc.position;
      return () => clearTimeout(timer);
    }
  }, [npc.position]);

  return (
    <group position={[dx, baseHeight, dy]}>
      {/* Aura */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[appearance.auraSize, 32]} />
        <meshBasicMaterial color={appearance.auraColor} transparent opacity={appearance.auraOpacity} />
      </mesh>

      {/* Body */}
      <group
        onClick={(e) => { e.stopPropagation(); if (useBuildModeStore.getState().active) return; onClick(); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <CultivatorModel appearance={appearance} isMoving={isMoving} isFloating={tile.biome === 'DEEP_WATER' || tile.biome === 'SHALLOW_WATER'} />
      </group>

      {/* Sparkles for high-realm NPCs (金丹+) */}
      {realmIndex >= 3 && (
        <Sparkles
          count={realmIndex >= 6 ? 15 : 8}
          scale={[1.2, 0.8, 1.2]}
          size={0.05}
          speed={0.3}
          color={appearance.auraColor}
          opacity={0.4}
        />
      )}

      {/* Tags — LOD: compact = name only at low opacity, full = activity + name + hover */}
      <Html position={[0, appearance.height * 0.6 + 0.15, 0]} center style={{ pointerEvents: 'none' }}>
        <div className="flex flex-col items-center">
          {compact ? (
            <div className="bg-black/40 px-1 py-0.5 rounded text-[9px] text-white/50 whitespace-nowrap">
              {npc.name}
            </div>
          ) : (
            <>
              {showNameTag && (
                <div className="bg-black/50 px-1.5 py-0.5 rounded text-[10px] text-white/80 whitespace-nowrap shadow-sm mb-1">
                  {npc.activity}
                </div>
              )}
            </>
          )}
          {hovered && (
            <div className="bg-black/70 border border-zinc-700 px-2 py-1 rounded text-xs whitespace-nowrap shadow-lg">
              <div className="text-emerald-400 font-bold">{npc.name} <span className="text-zinc-500 font-normal">[{npc.realm}]</span></div>
              <div className="text-zinc-400 flex items-center space-x-2">
                <span>{npc.role}</span>
                <span className="text-amber-500">💰 {npc.resources.spiritStone}</span>
              </div>
            </div>
          )}
        </div>
      </Html>
    </group>
  );
};

// 3b. Squad Member Mesh
const SquadMemberMesh = ({ member, dx, dy }: { member: SquadMember; dx: number; dy: number }) => {
  const appearance = useMemo(() => generateCharacterStyle(member.realm, '凡体', '核心子弟'), [member]);

  const tile = getTerrainTile(member.position.x, member.position.y);
  const baseHeight = tileElevationOffset(tile.biome, tile.elevation);

  return (
    <group position={[dx, baseHeight, dy]}>
      {/* Golden aura to distinguish squad members */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.6, 32]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.25} />
      </mesh>
      {/* Body */}
      <group>
        <CultivatorModel appearance={appearance} isMoving={false} isFloating={tile.biome === 'DEEP_WATER' || tile.biome === 'SHALLOW_WATER'} />
      </group>
      {/* Tags */}
      <Html position={[0, appearance.height * 0.6 + 0.15, 0]} center style={{ pointerEvents: 'none' }}>
        <div className="flex flex-col items-center">
          <div className="bg-black/50 px-1.5 py-0.5 rounded text-[10px] text-amber-300 whitespace-nowrap shadow-sm mb-1">
            {member.role}
          </div>
          <div className="bg-black/50 px-1 py-0.5 rounded text-[10px] text-white/80 whitespace-nowrap">
            {member.name}
          </div>
        </div>
      </Html>
    </group>
  );
};

// 3b. NPC Interaction Effect
interface ActiveEffect {
  id: string;
  type: 'trade' | 'duel' | 'alliance' | 'conflict' | 'greet';
  position: [number, number, number];
  startTime: number;
  duration: number;
  npcNameA: string;
  npcNameB: string;
}

const INTERACTION_EFFECT_COLORS: Record<string, string> = {
  trade: '#fbbf24',
  duel: '#ef4444',
  conflict: '#f97316',
  alliance: '#22c55e',
  greet: '#a1a1aa',
};

const InteractionEffectParticles = ({ effect }: { effect: ActiveEffect }) => {
  const particleCount = effect.type === 'duel' || effect.type === 'conflict' ? 12 : 8;
  const color = INTERACTION_EFFECT_COLORS[effect.type];
  const sparkTexture = useMemo(() => generateEffectTexture('spark'), []);
  const [particles] = useState(() =>
    Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      offsetX: (Math.random() - 0.5) * 0.6,
      offsetZ: (Math.random() - 0.5) * 0.6,
      offsetY: Math.random() * 0.8 + 0.3,
      delay: Math.random() * 0.3,
      spread: effect.type === 'duel' || effect.type === 'conflict' ? 1.0 : 0.5,
    }))
  );

  const groupRef = useRef<THREE.Group>(null);
  const elapsed = useRef(0);

  useFrame((state, delta) => {
    elapsed.current += delta;
    if (!groupRef.current) return;
    const t = elapsed.current;
    const life = 1 - t / (effect.duration / 1000);
    groupRef.current.children.forEach((child, i) => {
      const p = particles[i];
      if (!p) return;
      const dt = Math.max(0, t - p.delay);
      const fadeOut = Math.max(0, 1 - dt * 1.5);
      child.position.x = p.offsetX + Math.sin(dt * 4 + p.id) * p.spread * dt;
      child.position.z = p.offsetZ + Math.cos(dt * 3 + p.id) * p.spread * dt;
      child.position.y = p.offsetY + dt * 0.5;
      child.scale.setScalar(fadeOut);
      const mat = (child as THREE.Sprite).material as THREE.SpriteMaterial;
      if (mat) mat.opacity = fadeOut * life;
    });
  });

  // Expand ring for alliance
  const ringRef = useRef<THREE.Mesh>(null);
  useFrame((state, delta) => {
    if (!ringRef.current) return;
    elapsed.current += delta;
    const t = elapsed.current;
    const life = 1 - t / (effect.duration / 1000);
    if (effect.type === 'alliance') {
      ringRef.current.scale.setScalar(1 + t * 2);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      if (mat) mat.opacity = Math.max(0, life * 0.6);
    }
  });

  return (
    <group position={effect.position} ref={groupRef}>
      {particles.map((p) => (
        <sprite key={p.id} position={[p.offsetX, p.offsetY, p.offsetZ]} scale={[0.15, 0.15, 1]}>
          <spriteMaterial map={sparkTexture} color={color} transparent opacity={0.9} depthWrite={false} />
        </sprite>
      ))}
      {/* Ground ring for alliance */}
      {effect.type === 'alliance' && (
        <mesh ref={ringRef} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.8, 24]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
      {/* Flash circle for duel/conflict */}
      {(effect.type === 'duel' || effect.type === 'conflict') && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.8, 24]} />
          <meshBasicMaterial color={color} transparent opacity={0.2} />
        </mesh>
      )}
      {/* Sparkle ring for trade */}
      {effect.type === 'trade' && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.6, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

// 4. Monster Mesh with pixel art sprite
const MonsterMesh = ({ monster, dx, dy }: { monster: WildMonster; dx: number; dy: number }) => {
  const tile = getTerrainTile(monster.position.x, monster.position.y);
  const baseHeight = tileElevationOffset(tile.biome, tile.elevation);

  // Realm-based aura
  const realmAura = useMemo(() => getRealmAura(monster.realm), [monster.realm]);
  const monsterRealmIndex = useMemo(() => ['凡人','练气','筑基','金丹','元婴','化神','炼虚','合体','大乘','渡劫'].indexOf(monster.realm), [monster.realm]);

  // Floating damage numbers
  const [damageNumbers, setDamageNumbers] = useState<{ id: number; value: number; color: string }[]>([]);
  const prevHpRef = useRef(monster.hp);
  const damageIdRef = useRef(0);
  const mountedRef = useRef(true);

  // Combat particles trigger
  const [showCombat, setShowCombat] = useState(false);
  const [combatPos, setCombatPos] = useState<[number, number, number]>([0, 0.5, 0]);

  useEffect(() => {
    mountedRef.current = true;
    const prevHp = prevHpRef.current;
    if (monster.hp < prevHp) {
      const dmg = prevHp - monster.hp;
      const id = damageIdRef.current++;
      const color = dmg > monster.attack ? '#ffffff' : '#ff6666';
      setDamageNumbers(prev => [...prev, { id, value: dmg, color }]);
      // Trigger combat particles + screen shake
      setCombatPos([(Math.random() - 0.5) * 0.3, 0.5, (Math.random() - 0.5) * 0.3]);
      setShowCombat(true);
      triggerScreenShake(0.5);
      setTimeout(() => {
        if (mountedRef.current) setShowCombat(false);
      }, 800);
      setTimeout(() => {
        if (mountedRef.current) {
          setDamageNumbers(prev => prev.filter(n => n.id !== id));
        }
      }, 1200);
    }
    prevHpRef.current = monster.hp;
    return () => { mountedRef.current = false; };
  }, [monster.hp, monster.attack]);

  // HP bar color
  const hpRatio = monster.hp / monster.maxHp;
  const hpColor = hpRatio > 0.6 ? '#22c55e' : hpRatio > 0.3 ? '#eab308' : '#ef4444';

  return (
    <group position={[dx, baseHeight, dy]}>
      {/* Realm-based aura */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[realmAura.auraSize, 32]} />
        <meshBasicMaterial color={realmAura.auraColor} transparent opacity={realmAura.auraOpacity} />
      </mesh>

      {/* Combat spark particles */}
      {showCombat && <CombatParticles position={combatPos} count={8} color="#ff6b35" duration={800} />}
      {/* P2: Screen shake on hit */}
      {showCombat && <BloodParticles position={combatPos} count={12} duration={600} />}
      {/* P2: Element-colored skill particles (30% chance, cycle through elements) */}
      {showCombat && (() => {
        const elements = ['fire', 'ice', 'lightning'] as const;
        const el = elements[Math.floor(Math.random() * 3)];
        return Math.random() < 0.3 ? <SkillParticles position={[combatPos[0], combatPos[1] + 0.3, combatPos[2]]} element={el} duration={500} /> : null;
      })()}

      {/* Sparkles for high-realm monsters (金丹+) */}
      {monsterRealmIndex >= 3 && (
        <Sparkles
          count={monsterRealmIndex >= 6 ? 12 : 6}
          scale={1.2}
          size={0.08}
          speed={0.4}
          color={realmAura.auraColor}
        />
      )}

      {/* Pixel art monster sprite */}
      <mesh position={[0, 0.5, 0]}>
        <PixelMonsterSprite type={monster.name} realm={monster.realm} scale={1.1} />
      </mesh>

      {/* HP Bar */}
      <Html position={[0, 1.2, 0]} center style={{ pointerEvents: 'none' }}>
        <div className="flex flex-col items-center">
          {/* Name + Realm */}
          <div className="text-red-300 text-[10px] font-bold mb-0.5 whitespace-nowrap drop-shadow-lg">
            {monster.name}
          </div>
          {/* HP bar */}
          <div className="w-12 h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.max(0, hpRatio * 100)}%`, backgroundColor: hpColor }}
            />
          </div>
        </div>
      </Html>

      {/* Floating damage numbers */}
      {damageNumbers.map(n => (
        <Html key={n.id} position={[0, 1.5, 0]} center style={{ pointerEvents: 'none' }}>
          <div
            className="font-bold text-sm pointer-events-none animate-fade-up"
            style={{ color: n.color }}
          >
            -{n.value}
          </div>
        </Html>
      ))}
    </group>
  );
};

// 5. Player Mesh
const PlayerMesh = ({ player }: { player: any }) => {
  const appearance = useMemo(() => generateCharacterStyle(player.realm, player.bodyType, '玩家'), [player]);

  const tile = getTerrainTile(player.position.x, player.position.y);
  const baseHeight = tileElevationOffset(tile.biome, tile.elevation);

  const [isMoving, setIsMoving] = useState(false);
  const prevPos = useRef(player.position);

  useEffect(() => {
    if (prevPos.current.x !== player.position.x || prevPos.current.y !== player.position.y) {
      setIsMoving(true);
      const timer = setTimeout(() => setIsMoving(false), 200); // 玩家移动动画更干脆
      prevPos.current = player.position;
      return () => clearTimeout(timer);
    }
  }, [player.position]);

  return (
    <group position={[0, baseHeight, 0]}>
      {/* Aura */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[appearance.auraSize, 32]} />
        <meshBasicMaterial color={appearance.auraColor} transparent opacity={appearance.auraOpacity} />
      </mesh>

      {/* Body */}
      <CultivatorModel appearance={appearance} isMoving={isMoving} isFloating={tile.biome === 'DEEP_WATER' || tile.biome === 'SHALLOW_WATER'} />

      {/* Pulse ring — breathing highlight for player */}
      <PlayerPulseRing />

      {/* Player cultivation aura sparkles */}
      <Sparkles
        count={20}
        scale={[1.5, 1, 1.5]}
        size={0.06}
        speed={0.4}
        color={appearance.auraColor}
        opacity={0.5}
      />

      <Html position={[0, appearance.height * 0.6 + 0.3, 0]} center style={{ pointerEvents: 'none' }}>
        <div className="bg-zinc-900 border border-emerald-500 px-2 py-1 rounded text-xs whitespace-nowrap shadow-lg flex flex-col items-center">
          <div className="text-emerald-400 font-bold">{player.name}</div>
          <div className="text-zinc-400">[{player.realm}] · {player.bodyType}</div>
        </div>
      </Html>
    </group>
  );
};

// 6. Faction Base Mesh
const COUNTRY_COLORS: Record<string, string> = {
  '秦': '#e11d48', '楚': '#a855f7', '齐': '#3b82f6',
  '燕': '#06b6d4', '赵': '#f97316', '魏': '#22c55e', '韩': '#eab308',
};

const FactionBaseMesh = ({ faction, country, territory, playerPos, isAtWar, garrison, fortification }: { faction: { name: string; buildings?: Array<{ type: BuildingType; level: number }> }; country: string; territory: number; playerPos: { x: number; y: number }; isAtWar?: boolean; garrison?: number; fortification?: number; }) => {
  const tile = getTerrainTile(playerPos.x, playerPos.y);
  const baseHeight = tileElevationOffset(tile.biome, tile.elevation);
  const warRingRef = useRef<THREE.Mesh>(null);
  // P2: Siege debris — periodic debris bursts when at war
  const [showDebris, setShowDebris] = useState(false);
  const [debrisKey, setDebrisKey] = useState(0);

  useEffect(() => {
    if (!isAtWar) return;
    const interval = setInterval(() => {
      setDebrisKey(k => k + 1);
      setShowDebris(true);
      setTimeout(() => setShowDebris(false), 800);
    }, 3000 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, [isAtWar]);

  useFrame((state) => {
    if (warRingRef.current && isAtWar) {
      const pulse = Math.sin(state.clock.getElapsedTime() * 3) * 0.5 + 0.5;
      const mat = warRingRef.current.material;
      if (!Array.isArray(mat)) mat.opacity = 0.3 + pulse * 0.4;
    }
  });

  return (
    <group position={[0, baseHeight, 0]}>
      {/* Phase 1.4b: Territory overlay — colored disc sized by territory value */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4 + territory * 2.5, 48]} />
        <meshBasicMaterial color={COUNTRY_COLORS[country] || '#787878'} transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* Territory border ring */}
      <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4 + territory * 2.5 - 0.15, 4 + territory * 2.5, 48]} />
        <meshBasicMaterial color={COUNTRY_COLORS[country] || '#787878'} transparent opacity={0.25} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Territory ring */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[6.5, 9.5, 32]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>

      {/* War indicator: pulsing red ring */}
      {isAtWar && (
        <mesh ref={warRingRef} position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[8, 10.5, 32]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
      {/* P2: Siege debris particles when at war */}
      {showDebris && <DebrisParticles key={debrisKey} position={[0, 2.0, 0]} count={8} duration={700} />}

      {/* Small building indicators */}
      {(faction.buildings || []).map((b, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const radius = 5.5;
        const bx = Math.cos(angle) * radius;
        const bz = Math.sin(angle) * radius;
        const BUILDING_COLORS_MAP: Record<string, string> = {
          '议事厅': '#fbbf24', '练功房': '#fb7185', '丹房': '#4ade80',
          '藏经阁': '#c084fc', '库房': '#facc15', '哨塔': '#22d3ee', '炼器房': '#f59e0b',
        };
        return (
          <mesh key={b.type} position={[bx, 0.15, bz]} castShadow>
            <boxGeometry args={[0.8, 0.3 + b.level * 0.15, 0.8]} />
            <meshStandardMaterial color={BUILDING_COLORS_MAP[b.type] || '#f59e0b'} />
          </mesh>
        );
      })}

      {/* Garrison HP bar */}
      {(garrison ?? 0) > 0 && (
        <Html position={[0, 6.3, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="flex items-center gap-1">
            <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-zinc-600">
              <div className="h-full bg-cyan-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, garrison || 0)}%` }} />
            </div>
            <span className="text-[10px] text-cyan-400 font-mono">守{garrison}</span>
          </div>
        </Html>
      )}
      {/* Fortification HP bar */}
      {(fortification ?? 0) > 0 && (
        <Html position={[0, 5.9, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="flex items-center gap-1">
            <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-zinc-600">
              <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, fortification || 0)}%` }} />
            </div>
            <span className="text-[10px] text-amber-400 font-mono">墙{fortification}</span>
          </div>
        </Html>
      )}
      {/* Faction name label */}
      <Html position={[0, 6.7, 0]} center style={{ pointerEvents: 'none' }}>
        <div className="text-amber-300 text-[11px] font-bold whitespace-nowrap drop-shadow-lg">
          {faction.name}
        </div>
      </Html>
    </group>
  );
};

// 7. Scene Trigger Zone Marker (for points of interest on the map)
const SceneTriggerMarker = ({ marker, playerPos }: { marker: { id: string; x: number; y: number; label: string }; playerPos: { x: number; y: number } }) => {
  const dx = marker.x - playerPos.x;
  const dy = marker.y - playerPos.y;
  if (Math.abs(dx) > VIEW_RADIUS || Math.abs(dy) > VIEW_RADIUS) return null;

  const tile = getTerrainTile(marker.x, marker.y);
  const baseHeight = tileElevationOffset(tile.biome, tile.elevation);

  return (
    <group position={[dx, baseHeight + 0.05, dy]}>
      {/* Glowing circle marker on ground */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1.2, 32]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.8, 32]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.15} />
      </mesh>
      {/* Label */}
      <Html position={[0, 0.8, 0]} center style={{ pointerEvents: 'none' }}>
        <div className="bg-amber-900/80 border border-amber-500/60 px-2 py-0.5 rounded text-xs whitespace-nowrap shadow-lg text-amber-300 font-medium backdrop-blur-sm">
          {marker.label}
        </div>
      </Html>
    </group>
  );
};

// --- Global noise overlay to break up tile boundaries ---
// Random phase offset so noise never aligns with world grid
const noisePhaseX = Math.random() * 100;
const noisePhaseY = Math.random() * 100;
const noiseOverlayTexture = (() => {
  const SIZE = 128;
  const c = document.createElement('canvas');
  c.width = SIZE;
  c.height = SIZE;
  const ctx = c.getContext('2d')!;
  // Generate smooth tileable noise using sine-based value noise at 3 octaves
  // Using sin/cos ensures seamless tiling at any repeat
  const imgData = ctx.createImageData(SIZE, SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const fx = x / SIZE, fy = y / SIZE;
      const n1 = (Math.sin(fx * 6.0 + fy * 8.0 + 0.5) * Math.cos(fy * 5.0 - fx * 7.0) * 0.5 + 0.5) * 0.5;
      const n2 = (Math.sin(fx * 13.0 + fy * 11.0 + 1.3) * 0.5 + 0.5) * 0.3;
      const n3 = (Math.sin(fx * 25.0 + fy * 30.0 + 0.7) * Math.cos(fx * 20.0 - fy * 22.0) * 0.5 + 0.5) * 0.2;
      const v = (n1 + n2 + n3) * 255;
      const idx = (y * SIZE + x) * 4;
      imgData.data[idx] = v;
      imgData.data[idx + 1] = v * 0.92;
      imgData.data[idx + 2] = v * 0.85;
      imgData.data[idx + 3] = v * 0.5; // alpha channel variation
    }
  }
  ctx.putImageData(imgData, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(8.3, 8.3); // non-integer frequency to avoid grid resonance
  t.offset.set(noisePhaseX, noisePhaseY); // random phase shift per session
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  return t;
})();

const GlobalNoiseOverlay = () => {
  return (
    <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[33, 33]} />
      <meshBasicMaterial
        map={noiseOverlayTexture}
        transparent
        opacity={0.18}
        depthWrite={false}
        blending={THREE.MultiplyBlending}
      />
    </mesh>
  );
};

interface Map2DProps {
  onProximityTrigger?: (sceneId: string) => void;
  triggerVersion?: number;
  onBlockWorldToggle?: (active: boolean) => void;
}

// Module-level scene trigger cooldown (persists across re-renders)
const sceneTriggerCooldowns: Record<string, { lastTriggerAt: number; wasOutside: boolean }> = {};
const TRIGGER_COOLDOWN_MS = 30000;

export const Map2D = ({ onProximityTrigger, triggerVersion = 0, onBlockWorldToggle }: Map2DProps) => {
  const { player, nearbyNPCs, wildMonsters, resourcePoints, squadMembers, playerFactionId, clans, _worldBuildings, movePlayer, addWorldEvent, gameTime } = useGameStore();
  const [selectedNPC, setSelectedNPC] = useState<NPC | null>(null);
  const [blockWorldMode, setBlockWorldMode] = useState(false);
  const onBlockWorldToggleRef = useRef(onBlockWorldToggle);
  onBlockWorldToggleRef.current = onBlockWorldToggle;

  useEffect(() => {
    if (blockWorldMode && selectedNPC) {
      document.exitPointerLock();
    }
  }, [blockWorldMode, selectedNPC]);

  // Breakthrough effect
  const prevRealmRef = useRef(player?.realm);
  const [breakthroughEffect, setBreakthroughEffect] = useState<{ pos: [number, number, number]; ts: number } | null>(null);

  useEffect(() => {
    if (!player) return;
    if (prevRealmRef.current && prevRealmRef.current !== player.realm) {
      // Player broke through! Show effect at player position (center of map)
      setBreakthroughEffect({ pos: [0, 0.2, 0], ts: Date.now() });
      setTimeout(() => setBreakthroughEffect(null), 2500);
    }
    prevRealmRef.current = player.realm;
  }, [player?.realm]);

  // Register buildings: capitals + faction bases
  useEffect(() => {
    if (!player) return;
    const { registerBuilding, removeBuilding } = useBuildingStore.getState();
    const registered = new Set<string>();

    // Use C++ generated buildings if available
    if (_worldBuildings.length > 0) {
      for (const b of _worldBuildings) {
        registered.add(b.id);
        registerBuilding({
          id: b.id,
          def: getBuildingDef(b.kind as BuildingKind, b.country),
          worldX: b.worldX,
          worldY: b.worldY,
          country: b.country,
          label: b.label,
        });
      }
    } else {
      for (const country of COUNTRIES) {
        const capital = COUNTRIES_DATA[country].capital;
        const id = makeBuildingId('capital', capital.x, capital.y);
        registered.add(id);
        registerBuilding({
          id,
          def: getBuildingDef('capital', country),
          worldX: capital.x,
          worldY: capital.y,
          country,
          label: `${country}都`,
        });
      }

      for (const clan of clans) {
        const center = getClanTerritoryCenter(clan, clans);
        const kind: BuildingKind = clan.isAscendingFamily ? 'manor' : 'city';
        const id = makeBuildingId(kind, center.x, center.y);
        registered.add(id);
        registerBuilding({
          id,
          def: getBuildingDef(kind, clan.country),
          worldX: center.x,
          worldY: center.y,
          country: clan.country,
          label: clan.name,
        });
      }

      // Test island building
      const testBuildingId = makeBuildingId('manor', 315, 300);
      registered.add(testBuildingId);
      registerBuilding({
        id: testBuildingId,
        def: getBuildingDef('manor', '齐'),
        worldX: 315,
        worldY: 300,
        country: '齐',
        label: '测试岛·别院',
      });
    }

    // Remove stale buildings
    const all = useBuildingStore.getState().buildings;
    for (const b of all) {
      if (!registered.has(b.id)) {
        removeBuilding(b.id);
      }
    }
  }, [player, clans, _worldBuildings]);

  // Phase 1.3: NPC interaction visual effects
  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([]);
  const effectIdCounter = useRef(0);
  const lastNpcProximityCheck = useRef<Record<string, number>>({});

  // Detect NPC-to-NPC proximity and trigger visual effects
  useEffect(() => {
    const now = Date.now();
    const newEffects: ActiveEffect[] = [];

    for (let i = 0; i < nearbyNPCs.length; i++) {
      for (let j = i + 1; j < nearbyNPCs.length; j++) {
        const a = nearbyNPCs[i];
        const b = nearbyNPCs[j];
        const dist = Math.abs(a.position.x - b.position.x) + Math.abs(a.position.y - b.position.y);
        if (dist > 1) continue;

        const pairKey = a.id < b.id ? `${a.id}:${b.id}` : `${b.id}:${a.id}`;
        if (now - (lastNpcProximityCheck.current[pairKey] ?? 0) < 15000) continue;
        lastNpcProximityCheck.current[pairKey] = now;

        // Determine effect type based on personality compatibility
        const affinity = (100 - Math.abs(a.personality.ambition - b.personality.ambition) * 0.3
          + (100 - Math.abs(a.personality.loyalty - b.personality.loyalty)) * 0.4
          - Math.abs(a.personality.greed - b.personality.greed) * 0.3);
        const roll = Math.random();

        let type: ActiveEffect['type'];
        if (affinity > 60 && roll < 0.35) type = 'alliance';
        else if (affinity > 40 && roll < 0.2) type = 'trade';
        else if (affinity < 20 && roll < 0.25) type = 'conflict';
        else if (affinity < 0 && roll < 0.12) type = 'duel';
        else type = 'greet';

        const midX = (a.position.x + b.position.x) / 2 - player.position.x;
        const midZ = (a.position.y + b.position.y) / 2 - player.position.y;
        const tile = getTerrainTile(Math.round((a.position.x + b.position.x) / 2), Math.round((a.position.y + b.position.y) / 2));
        const baseHeight = tileElevationOffset(tile.biome, tile.elevation);

        newEffects.push({
          id: `fx-${effectIdCounter.current++}`,
          type,
          position: [midX, baseHeight + 0.1, midZ],
          startTime: now,
          duration: 2500,
          npcNameA: a.name,
          npcNameB: b.name,
        });

        // Add significant interactions to world event log
        if (type !== 'greet') {
          const desc: Record<string, string> = {
            trade: `${a.name} 与 ${b.name} 交换了修炼资源`,
            duel: `${a.name} 与 ${b.name} 一言不合，拔剑相向！`,
            alliance: `${a.name} 与 ${b.name} 相谈甚欢，结为道友`,
            conflict: `${a.name} 与 ${b.name} 发生了争执`,
            greet: '',
          };
          addWorldEvent({ type, npcNameA: a.name, npcNameB: b.name, description: desc[type] || '', timestamp: now });
        }
      }
    }

    if (newEffects.length > 0) {
      setActiveEffects(prev => [...prev, ...newEffects]);
    }
  }, [nearbyNPCs, player.position]);

  // Clean up expired effects
  useEffect(() => {
    if (activeEffects.length === 0) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setActiveEffects(prev => prev.filter(e => now - e.startTime < e.duration));
    }, 500);
    return () => clearInterval(timer);
  }, [activeEffects.length > 0]);

  // Keyboard Movement — continuous 360° smooth movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;

      if (key === 'b' || key === 'B') {
        e.preventDefault();
        const player = useGameStore.getState().player;
        useBuildModeStore.getState().toggleBuildMode(player.position.x, player.position.y);
        return;
      }

      if (key === 'm' || key === 'M') {
        e.preventDefault();
        _blockWorldMode = !_blockWorldMode;
        setBlockWorldMode(_blockWorldMode);
        onBlockWorldToggleRef.current?.(_blockWorldMode);
        return;
      }

      if (_blockWorldMode) {
        if (key === 'e' || key === 'E') {
          e.preventDefault();
          const state = useGameStore.getState();
          const p = state.player;
          if (!p) return;
          let closest: NPC | null = null;
          let closestDist = 5;
          for (const npc of state.nearbyNPCs) {
            const dx = npc.position.x - p.position.x;
            const dy = npc.position.y - p.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < closestDist) {
              closestDist = dist;
              closest = npc;
            }
          }
          if (closest) {
            setSelectedNPC(closest);
          }
        }
        return;
      }

      const inBuildMode = useBuildModeStore.getState().active;

      if (key === '[' || key === ']') {
        if (inBuildMode) {
          e.preventDefault();
          const store = useBuildModeStore.getState();
          const next = key === ']' ? store.currentLayer + 1 : store.currentLayer - 1;
          if (next >= 0 && next <= 15) store.setLayer(next);
        }
        return;
      }

      if (inBuildMode) return;

      switch(key) {
        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight':
        case 'w': case 'W':
        case 's': case 'S':
        case 'a': case 'A':
        case 'd': case 'D':
          break;
        default: return;
      }
      e.preventDefault();
      const k = key.toLowerCase();
      if (!_keysDown.has(k)) {
        _keysDown.add(k);
        if (_moveLoopId === null) {
          _moveLastTime = performance.now();
          _moveLoopId = requestAnimationFrame(moveLoop);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      _keysDown.delete(k);
      if (e.key === 'ArrowUp') _keysDown.delete('arrowup');
      if (e.key === 'ArrowDown') _keysDown.delete('arrowdown');
      if (e.key === 'ArrowLeft') _keysDown.delete('arrowleft');
      if (e.key === 'ArrowRight') _keysDown.delete('arrowright');
    };

    function moveLoop(time: number) {
      const rawDelta = (time - _moveLastTime) / 1000;
      _moveLastTime = time;
      const delta = Math.min(rawDelta, 0.05);

      let rawDx = 0, rawDy = 0;
      if (_keysDown.has('w') || _keysDown.has('arrowup')) rawDy = -1;
      if (_keysDown.has('s') || _keysDown.has('arrowdown')) rawDy = 1;
      if (_keysDown.has('a') || _keysDown.has('arrowleft')) rawDx = -1;
      if (_keysDown.has('d') || _keysDown.has('arrowright')) rawDx = 1;

      if (rawDx !== 0 || rawDy !== 0) {
        const len = Math.sqrt(rawDx * rawDx + rawDy * rawDy);
        rawDx /= len;
        rawDy /= len;

        if (_camera) {
          _camera.getWorldDirection(_forward);
          _forward.y = 0;
          if (_forward.lengthSq() > 0.0001) {
            _forward.normalize();
          } else {
            _forward.set(0, 0, -1);
          }
          _right.crossVectors(_forward, _upVec).normalize();
          const moveX = rawDx * _right.x + (-rawDy) * _forward.x;
          const moveZ = rawDx * _right.z + (-rawDy) * _forward.z;
          rawDx = moveX;
          rawDy = moveZ;
        }

        const speed = MOVEMENT_SPEED;
        const dx = rawDx * speed * delta;
        const dy = rawDy * speed * delta;

        const p = useGameStore.getState().player;
        if (p) {
          const gridCheckX = Math.round(p.position.x + dx);
          const gridCheckY = Math.round(p.position.y + dy);
          if (_isBlockedByBuildingWall(gridCheckX, gridCheckY)) {
            if (_keysDown.size > 0) {
              _moveLoopId = requestAnimationFrame(moveLoop);
            } else {
              _moveLoopId = null;
            }
            return;
          }
        }

        useGameStore.getState().movePlayer(dx, dy);
      }

      if (_keysDown.size > 0) {
        _moveLoopId = requestAnimationFrame(moveLoop);
      } else {
        _moveLoopId = null;
      }
    }

    const handleBlur = () => {
      _keysDown.clear();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      if (_moveLoopId !== null) {
        cancelAnimationFrame(_moveLoopId);
        _moveLoopId = null;
      }
      _keysDown.clear();
    };
  }, [movePlayer]);

  // Proximity trigger with anti-spam: requires player to leave the zone AND wait 30s
  // before the same scene can re-trigger
  useEffect(() => {
    if (!player || !onProximityTrigger) return;
    const now = Date.now();

    // Track which zone the player is currently inside
    for (const [id, entry] of Object.entries(SCENE_REGISTRY)) {
      if (!entry.triggerAt) continue;
      const state = sceneTriggerCooldowns[id] || { lastTriggerAt: 0, wasOutside: true };
      const dx = player.position.x - entry.triggerAt.x;
      const dy = player.position.y - entry.triggerAt.y;
      const inZone = (dx * dx + dy * dy) <= entry.triggerAt.radius * entry.triggerAt.radius;
      if (!inZone) state.wasOutside = true;
      sceneTriggerCooldowns[id] = state;
    }

    // Check if player entered a trigger zone
    const sceneId = getSceneIdByCoordinate(player.position.x, player.position.y);
    if (sceneId) {
      const state = sceneTriggerCooldowns[sceneId]!;
      if (state.wasOutside && (now - state.lastTriggerAt) >= TRIGGER_COOLDOWN_MS) {
        state.lastTriggerAt = now;
        state.wasOutside = false;
        onProximityTrigger(sceneId);
      }
    }
  }, [player?.position.x, player?.position.y, onProximityTrigger]);

  if (!player) return null;

  // Render city/nation labels (buildings are 3D via BuildingWorld)
  const cityLabels = COUNTRIES.map(country => {
    const capital = COUNTRIES_DATA[country].capital;
    const dx = capital.x - player.position.x;
    const dy = capital.y - player.position.y;
    if (Math.abs(dx) <= VIEW_RADIUS && Math.abs(dy) <= VIEW_RADIUS) {
      return (
        <Html key={`capital-label-${country}`} position={[dx, 14, dy]} center style={{ pointerEvents: 'none' }}>
          <div className="text-amber-400 text-xs font-bold whitespace-nowrap drop-shadow-lg bg-black/50 px-2 py-1 rounded">
            {country}都
          </div>
        </Html>
      );
    }
    return null;
  });

  return (
    <div
      className="w-full h-full bg-zinc-950 relative overflow-hidden"
      style={{ width: '100vw', height: '100vh', userSelect: 'none', WebkitUserSelect: 'none' as any }}
    >
      <Canvas style={{ width: '100%', height: '100%' }} gl={{ antialias: true, powerPreference: 'high-performance' }}>

        <PerspectiveCamera
          makeDefault
          position={[25, 18, 25]}
          fov={45}
          near={0.1}
          far={200}
        />

        {/* Orbit camera controller: right-drag rotate, scroll zoom */}
        {!blockWorldMode && <CameraController playerPos={player.position} />}
        {blockWorldMode && <FirstPersonController />}
        {blockWorldMode && <BlockWorld />}
        {blockWorldMode && <CameraShake />}

        <SunMoonLight />

        {!blockWorldMode && (
          <>
        {/* Ground plane — fills sub-pixel gaps between edge tiles at bottom. */}
        <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2000, 2000]} />
          <meshBasicMaterial color="#2a2a35" depthWrite={false} />
        </mesh>
        {/* Terrain — single heightfield plane with atlas texture */}
        <Terrain playerPos={player.position} />
        <BuildingWorld playerX={player.position.x} playerY={player.position.y} viewRadius={VIEW_RADIUS} />
        {/* Baked voxel capital sprites — camera-aware angle selection */}
        <BakedCapitalField scale={4} />
        {/* Baked voxel manor sprites — clan estates + test island */}
        <BakedManorField scale={4} />
        {/* GlobalNoiseOverlay — disabled; was creating moiré standing wave with tile grid */}
        {/* <GlobalNoiseOverlay /> */}
        <WeatherEffect playerPos={player.position} />
        <CameraShake />

        {cityLabels}

        {/* Scene trigger zone markers (points of interest) */}
        {Object.entries(SCENE_REGISTRY)
          .filter(([_, entry]) => entry.triggerAt)
          .map(([id, entry]) => (
            <SceneTriggerMarker
              key={`trigger-${id}`}
              marker={{
                id,
                x: entry.triggerAt!.x,
                y: entry.triggerAt!.y,
                label: id === 'family_corridor' ? '🏯 家族大院' :
                       id === 'grudge_village_gate' ? '🏘️ 荒村' :
                       id === 'grudge_reunion_router' ? '⛰️ 山道' :
                       id === 'grudge_ignore_death_router' ? '🍵 茶肆' : id,
              }}
              playerPos={player.position}
            />
          ))}

        {resourcePoints.map(res => {
          const dx = res.position.x - player.position.x;
          const dy = res.position.y - player.position.y;
          if (Math.abs(dx) > VIEW_RADIUS || Math.abs(dy) > VIEW_RADIUS) return null;
          return <ResourceMesh key={res.id} res={res} dx={dx} dy={dy} />;
        })}

        {(() => {
          const npcsInRange = nearbyNPCs.map(npc => {
            const dx = npc.position.x - player.position.x;
            const dy = npc.position.y - player.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            return { npc, dx, dy, dist };
          }).filter(({ dx, dy }) => Math.abs(dx) <= VIEW_RADIUS && Math.abs(dy) <= VIEW_RADIUS);

          // If >15 NPCs on screen, only show name tags for the nearest important ones
          const tagThreshold = 8;
          const nearbyCount = npcsInRange.filter(({ dist }) => dist <= tagThreshold).length;
          const showAllTags = nearbyCount <= 15;

          return npcsInRange.map(({ npc, dx, dy, dist }) => {
            const isClose = dist <= 5;
            const isMid = dist <= 12;
            if (!isMid) return <NPCMesh key={npc.id} npc={npc} dx={dx} dy={dy} showNameTag={false} onClick={() => setSelectedNPC(npc)} />;
            const isImportant = dist <= tagThreshold;
            const showTag = showAllTags ? isImportant : (isImportant && (npc.clanId === player.clanId || dist <= 4));
            return (
              <NPCMesh key={npc.id} npc={npc} dx={dx} dy={dy} showNameTag={showTag} compact={!isClose} onClick={() => setSelectedNPC(npc)} />
            );
          });
        })()}

        {/* Phase 1.3: NPC interaction visual effects */}
        {activeEffects.map(effect => (
          <InteractionEffectParticles key={effect.id} effect={effect} />
        ))}

        {squadMembers.filter(m => m.isAlive).map(member => {
          const dx = member.position.x - player.position.x;
          const dy = member.position.y - player.position.y;
          if (Math.abs(dx) > VIEW_RADIUS || Math.abs(dy) > VIEW_RADIUS) return null;
          return <SquadMemberMesh key={member.id} member={member} dx={dx} dy={dy} />;
        })}

        {wildMonsters.map(monster => {
          const dx = monster.position.x - player.position.x;
          const dy = monster.position.y - player.position.y;
          if (Math.abs(dx) > VIEW_RADIUS || Math.abs(dy) > VIEW_RADIUS) return null;
          return <MonsterMesh key={monster.id} monster={monster} dx={dx} dy={dy} />;
        })}

        {clans.map(faction => {
          const center = getClanTerritoryCenter(faction, clans);
          const dx = center.x - player.position.x;
          const dy = center.y - player.position.y;
          if (Math.abs(dx) > VIEW_RADIUS || Math.abs(dy) > VIEW_RADIUS) return null;
          const tile = getTerrainTile(center.x, center.y);
          const baseHeight = tileElevationOffset(tile.biome, tile.elevation);
          const atWar = faction.diplomacy
            ? Object.values(faction.diplomacy).some(d => d.status === '战争')
            : false;
          return (
            <group key={faction.id} position={[dx, baseHeight, dy]}>
              <FactionBaseMesh faction={faction} country={faction.country} territory={faction.territory || 1} playerPos={player.position} isAtWar={atWar} garrison={faction.garrison} fortification={faction.fortification} />
            </group>
          );
        })}
        <PlayerMesh player={player} />
        {breakthroughEffect && (
          <BreakthroughEffect
            key={breakthroughEffect.ts}
            position={breakthroughEffect.pos}
            color="#ffd700"
          />
        )}
        <BuildModeController />
        <PlayerBuildVoxels />
        </>
        )}
      </Canvas>

      <BuildModeUI />
      {blockWorldMode && <BlockWorldHUD />}

      {/* 时间控制面板 — 右上角 */}
      <TimeControlPanel />

      {/* 坐标 + 时间 + 控制提示 — 左下角 */}
      <div className="absolute bottom-4 left-4 text-zinc-500 text-xs flex space-x-3 bg-zinc-900/60 px-3 py-1.5 rounded-md backdrop-blur pointer-events-none items-center">
        <span className={gameTime >= 5 && gameTime < 19 ? 'text-amber-400' : 'text-blue-400'}>
          {gameTime >= 5 && gameTime < 19 ? '☀' : '☾'}{' '}
          {String(Math.floor(gameTime)).padStart(2, '0')}:{String(Math.floor((gameTime % 1) * 60)).padStart(2, '0')}
        </span>
        <span className="text-zinc-600">|</span>
        <span className="text-emerald-400 font-mono font-bold">({player.position.x}, {player.position.y})</span>
        <span className="text-zinc-600">|</span>
        <span>WASD/方向键 移动</span>
        <span className="text-zinc-600">|</span>
        <span>Q/E 旋转视角</span>
        <span className="text-zinc-600">|</span>
        <span>中键旋转</span>
        <span className="text-zinc-600">|</span>
        <span>滚轮缩放</span>
        <span className="text-zinc-600">|</span>
        <span>左键交互</span>
        <span className="text-zinc-600">|</span>
        <span>B 建造模式</span>
      </div>

      {/* 指南针 — 指向视口外的场景触发点和都城 */}
      {(() => {
        const pois: { label: string; x: number; y: number }[] = [];

        // Add scene trigger zones
        for (const [id, entry] of Object.entries(SCENE_REGISTRY)) {
          if (entry.triggerAt) {
            const dx = entry.triggerAt.x - player.position.x;
            const dy = entry.triggerAt.y - player.position.y;
            if (Math.abs(dx) > VIEW_RADIUS || Math.abs(dy) > VIEW_RADIUS) {
              pois.push({
                label: id === 'family_corridor' ? '家族' : id === 'grudge_village_gate' ? '荒村' : id === 'grudge_reunion_router' ? '山道' : id === 'grudge_ignore_death_router' ? '茶肆' : id,
                x: entry.triggerAt.x,
                y: entry.triggerAt.y,
              });
            }
          }
        }

        // Add capitals outside view
        for (const country of COUNTRIES) {
          const capital = COUNTRIES_DATA[country].capital;
          const dx = capital.x - player.position.x;
          const dy = capital.y - player.position.y;
          if (Math.abs(dx) > VIEW_RADIUS || Math.abs(dy) > VIEW_RADIUS) {
            pois.push({ label: `${country}都`, x: capital.x, y: capital.y });
          }
        }

        if (pois.length === 0) return null;

        return (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 flex space-x-3 bg-zinc-900/70 px-4 py-2 rounded-full backdrop-blur border border-zinc-800/50 pointer-events-none z-20">
            {pois.slice(0, 6).map(poi => {
              const dx = poi.x - player.position.x;
              const dy = poi.y - player.position.y;
              const angle = Math.atan2(-dx, -dy) * (180 / Math.PI); // degrees, top=0
              const arrow = angle > 22.5 ? (angle < 67.5 ? '↗' : angle < 112.5 ? '→' : angle < 157.5 ? '↘' : angle < 202.5 ? '↓' : angle < 247.5 ? '↙' : angle < 292.5 ? '←' : angle < 337.5 ? '↖' : '↑') : '↑';
              return (
                <span key={poi.label} className="text-xs text-zinc-400 flex items-center space-x-1">
                  <span className="text-amber-400 font-mono">{arrow}</span>
                  <span>{poi.label}</span>
                </span>
              );
            })}
            {pois.length > 6 && <span className="text-xs text-zinc-600">+{pois.length - 6}</span>}
          </div>
        );
      })()}

      {/* 交互菜单层 */}
      {selectedNPC && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center pointer-events-auto" onClick={() => setSelectedNPC(null)}>
          <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-lg max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-emerald-400">{selectedNPC.name}</h3>
              <span className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400">{selectedNPC.role}</span>
            </div>
            <div className="text-zinc-300 text-sm mb-6 space-y-2">
              <p>战力：<span className="text-amber-400">{selectedNPC.power}</span></p>
              <p>状态：<span className="text-blue-400">{selectedNPC.activity}</span></p>
              <p>生命：<span className="text-rose-400">{Math.floor(selectedNPC.hp)}/{selectedNPC.maxHp}</span></p>
              <p>性格：<span className="text-purple-400">野心 {selectedNPC.personality.ambition} | 谨慎 {selectedNPC.personality.caution} | 忠诚 {selectedNPC.personality.loyalty} | 贪婪 {selectedNPC.personality.greed}</span></p>
              <p className="text-zinc-500 italic mt-2 text-xs">“修仙之路，逆天而行，你找我有何事？”</p>
            </div>
            {(() => {
              const recruitCost = useGameStore.getState().getRecruitCost(selectedNPC);
              return (
                <div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    className="py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded transition-colors text-sm"
                    onClick={() => { useGameStore.getState().interactWithNPC(selectedNPC.id, '交谈'); setSelectedNPC(null); }}
                  >
                    交谈
                  </button>
                  <button
                    className="py-2 bg-zinc-800 hover:bg-zinc-700 text-blue-400 rounded transition-colors text-sm"
                    onClick={() => { useGameStore.getState().interactWithNPC(selectedNPC.id, '交易'); setSelectedNPC(null); }}
                  >
                    交易
                  </button>
                  <button
                    className={`py-2 rounded transition-colors text-sm ${
                      recruitCost.canRecruit
                        ? 'bg-amber-900/50 hover:bg-amber-800 text-amber-400 border border-amber-900'
                        : 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
                    }`}
                    onClick={() => {
                      if (recruitCost.canRecruit) {
                        useGameStore.getState().recruitToSquad(selectedNPC.id);
                        setSelectedNPC(null);
                      }
                    }}
                    title={recruitCost.reason || `需要${recruitCost.reputationRequired}声望 + ${recruitCost.spiritStoneCost}灵石`}
                  >
                    招募
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <button
                    className="py-2 bg-rose-900/50 hover:bg-rose-800 text-rose-400 rounded transition-colors border border-rose-900 text-sm"
                    onClick={() => { useGameStore.getState().interactWithNPC(selectedNPC.id, '攻击'); setSelectedNPC(null); }}
                  >
                    攻击
                  </button>
                  <button
                    className="py-2 bg-orange-900/50 hover:bg-orange-800 text-orange-400 rounded transition-colors border border-orange-900 text-sm"
                    onClick={() => { useGameStore.getState().duelNPC(selectedNPC.id); setSelectedNPC(null); }}
                    title="高风险高回报的1v1决斗，胜利获得更多奖励，失败损失更多生命"
                  >
                    决斗
                  </button>
                  <button
                    className="py-2 bg-purple-900/50 hover:bg-purple-800 text-purple-400 rounded transition-colors border border-purple-900 text-sm"
                    onClick={() => { useGameStore.getState().robNPC(selectedNPC.id); setSelectedNPC(null); }}
                    title="窃取灵石，有失败风险，会大幅降低声望"
                  >
                    掠夺
                  </button>
                </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
