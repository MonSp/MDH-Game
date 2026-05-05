import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrthographicCamera, Html, useCursor, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, NPC, WildMonster, type SquadMember, type BuildingType, COUNTRIES_DATA, COUNTRIES, BodyType, BUILDING_VISION_BONUS, getClanTerritoryCenter } from '../store/gameStore';
import { generateCharacterStyle, getRealmAura } from '../utils/appearance';
import { getTerrainTile, getVisionRadius, SCOUT_VISION_MULTIPLIER } from '../utils/terrain';
import { TerrainType, isWater } from '../shared/types/map';
import { getSceneIdByCoordinate, SCENE_REGISTRY } from '../content/scenes/sceneRegistry';
import { PixelCharacterSprite } from './PixelCharacterSprite';
import { PixelMonsterSprite } from './PixelMonsterSprite';
import { PixelResourceSprite } from './PixelResourceSprite';
import { CombatParticles, GatheringEffect, BreakthroughEffect } from './PixelParticleEffects';
import { generateTerrainTileTexture, generateEffectTexture, generateDecorationSprite, type DecorationType } from '../utils/pixelSpriteGenerator';
import { PixelDecoration } from './PixelDecoration';
import { PixelBuildingSprite } from './PixelBuildingSprite';

// Constants
const VIEW_RADIUS = 15;

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

// Animated water tile with flowing texture
const WaterTile = ({ biome, height, yPos }: { biome: TerrainType; height: number; yPos: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => {
    const t = getTerrainTexture(biome).clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 1);
    return t;
  }, [biome]);

  useFrame((_, delta) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      if (mat.map) {
        mat.map.offset.x += delta * 0.08;
        mat.map.offset.y += delta * 0.03;
      }
    }
  });

  return (
    <mesh ref={meshRef} position={[0, yPos, 0]} receiveShadow>
      <boxGeometry args={[1, height, 1]} />
      <meshStandardMaterial
        map={tex}
        transparent
        opacity={0.7}
        roughness={0.1}
        metalness={0.6}
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

// 1. Tree Component
const Tree = ({ position }: { position: [number, number, number] }) => (
  <group position={position}>
    {/* Trunk */}
    <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.1, 0.15, 0.8, 6]} />
      <meshStandardMaterial color="#78350f" /> {/* amber-900 */}
    </mesh>
    {/* Leaves */}
    <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
      <coneGeometry args={[0.5, 1.2, 6]} />
      <meshStandardMaterial color="#065f46" /> {/* emerald-800 */}
    </mesh>
  </group>
);

// 2. Cultivator Pixel Sprite (replaces old voxel model)
const CultivatorModel = ({ appearance, isMoving = false, isFloating = false }: { appearance: any, isMoving?: boolean, isFloating?: boolean }) => {
  const { height } = appearance;
  const s = height / 1.0;

  return (
    <group scale={[s, s, s]}>
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
const terrainTextureCache = new Map<TerrainType, THREE.CanvasTexture>();
function getTerrainTexture(biome: TerrainType): THREE.CanvasTexture {
  if (!terrainTextureCache.has(biome)) {
    terrainTextureCache.set(biome, generateTerrainTileTexture(biome));
  }
  return terrainTextureCache.get(biome)!;
}

const Terrain = ({ playerPos }: { playerPos: { x: number, y: number } }) => {
  const tiles = useMemo(() => {
    const t = [];
    for (let dx = -VIEW_RADIUS; dx <= VIEW_RADIUS; dx++) {
      for (let dy = -VIEW_RADIUS; dy <= VIEW_RADIUS; dy++) {
        const x = playerPos.x + dx;
        const y = playerPos.y + dy;

        const tile = getTerrainTile(x, y);
        t.push({ ...tile, dx, dy });
      }
    }
    return t;
  }, [playerPos.x, playerPos.y]);

  return (
    <group>
      {tiles.map(tile => {
        const isWaterTile = isWater(tile.biome);
        const isMountain = tile.biome === TerrainType.ROCK || tile.biome === TerrainType.MOUNTAIN;

        // Dramatic height for mountains, flat for water, varied for others
        let height: number;
        if (isWaterTile) {
          height = 0.2;
        } else if (isMountain) {
          height = Math.max(0.5, (tile.elevation + 0.5) * 2.5);
        } else {
          height = Math.max(0.1, tile.elevation + 0.5);
        }

        const yPos = isWaterTile ? -0.15 : (height / 2 - 0.5);

        // Mountain peak cap for dramatic effect
        const showPeak = isMountain && height > 1.5;

        // Snow cap on high mountains
        const showSnowCap = isMountain && height > 1.8;

        // Pixel terrain texture
        const tex = getTerrainTexture(tile.biome);

        return (
          <group key={`${tile.x},${tile.y}`} position={[tile.dx, 0, tile.dy]}>
            {/* Main terrain block with pixel texture */}
            {isWaterTile ? (
              <WaterTile biome={tile.biome} height={height} yPos={yPos} />
            ) : (
              <mesh position={[0, yPos, 0]} castShadow receiveShadow>
                <boxGeometry args={[1, height, 1]} />
                <meshStandardMaterial
                  map={tex}
                  roughness={0.9}
                  metalness={0.0}
                />
              </mesh>
            )}
            {/* Mountain peak extra block */}
            {showPeak && (
              <mesh position={[0, yPos + height / 2, 0]}>
                <coneGeometry args={[0.3, 0.4, 4]} />
                <meshStandardMaterial color={showSnowCap ? '#f8fafc' : '#57534e'} roughness={0.8} />
              </mesh>
            )}
            {/* Trees */}
            {tile.hasTree && (
              isMountain ? null : <Tree position={[0, yPos + height / 2, 0]} />
            )}
            {/* Terrain decorations */}
            {(() => {
              const decor = getDecorationForTile(tile.x, tile.y, tile.biome);
              if (!decor) return null;
              const topY = isWaterTile ? 0.05 : yPos + height / 2;
              const decorScale = (decor === 'bush' || decor === 'cactus') ? 0.35 : 0.25;
              const swayTypes: DecorationType[] = ['grass_tuft', 'flower_white', 'flower_red', 'flower_yellow', 'reed', 'alpine_grass', 'dry_grass'];
              return (
                <PixelDecoration
                  type={decor}
                  position={[0, topY, 0]}
                  scale={decorScale}
                  sway={swayTypes.includes(decor)}
                />
              );
            })()}
          </group>
        );
      })}
    </group>
  );
};

// 3b. Fog of War overlay
const FogOfWar = ({ playerPos, exploredTiles, visionRadius }: { playerPos: { x: number, y: number }; exploredTiles: string[]; visionRadius: number }) => {
  const tiles = useMemo(() => {
    const t = [];
    for (let dx = -VIEW_RADIUS; dx <= VIEW_RADIUS; dx++) {
      for (let dy = -VIEW_RADIUS; dy <= VIEW_RADIUS; dy++) {
        const x = playerPos.x + dx;
        const y = playerPos.y + dy;
        const explored = exploredTiles.includes(`${x},${y}`);
        // Currently in sight (within realm-based vision radius)
        const inSight = Math.abs(dx) <= visionRadius && Math.abs(dy) <= visionRadius;
        t.push({ dx, dy, explored, inSight, x, y });
      }
    }
    return t;
  }, [playerPos.x, playerPos.y, exploredTiles]);

  return (
    <group>
      {tiles.map(tile => {
        // Unexplored: full dark fog | Explored but out of sight: light fog | In sight: clear
        let opacity: number;
        if (tile.inSight) {
          opacity = 0;
        } else if (tile.explored) {
          opacity = 0.35;
        } else {
          opacity = 0.88;
        }
        return (
          <mesh key={`fog-${tile.x},${tile.y}`} position={[tile.dx, 0.01, tile.dy]}>
            <planeGeometry args={[1.02, 1.02]} />
            <meshBasicMaterial
              color="#0f0f11"
              transparent
              opacity={opacity}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
};// 4. Resource Point with pixel art sprite
const ResourceMesh = ({ res, dx, dy }: { res: any, dx: number, dy: number }) => {
  const interactWithResource = useGameStore(state => state.interactWithResource);
  const clans = useGameStore(state => state.clans);
  const [hovered, setHovered] = useState(false);
  const [gathering, setGathering] = useState(false);
  useCursor(hovered);

  const tile = getTerrainTile(res.position.x, res.position.y);
  const baseHeight = tile.biome === 'DEEP_WATER' || tile.biome === 'SHALLOW_WATER' ? 0 : Math.max(0.1, tile.elevation + 0.5) - 0.5;

  const owner = res.ownerClanId ? clans.find(c => c.id === res.ownerClanId) : null;
  const ownerColor = '#fbbf24';

  const handleGather = (e: any) => {
    e.stopPropagation();
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
const NPCMesh = ({ npc, dx, dy, onClick }: { npc: NPC, dx: number, dy: number, onClick: () => void }) => {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const appearance = useMemo(() => generateCharacterStyle(npc.realm, '凡体', npc.role), [npc]);
  
  const tile = getTerrainTile(npc.position.x, npc.position.y);
  const baseHeight = tile.biome === 'DEEP_WATER' || tile.biome === 'SHALLOW_WATER' ? 0 : Math.max(0.1, tile.elevation + 0.5) - 0.5;

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
        onClick={(e) => { e.stopPropagation(); onClick(); }}
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

      {/* Tags */}
      <Html position={[0, appearance.height + 0.2, 0]} center style={{ pointerEvents: 'none' }}>
        <div className="flex flex-col items-center">
          <div className="bg-zinc-900/80 px-1.5 py-0.5 rounded text-[10px] text-emerald-300 border border-emerald-900/50 whitespace-nowrap shadow-sm mb-1">
            {npc.activity}
          </div>
          {hovered && (
            <div className="bg-zinc-900/90 border border-zinc-700 px-2 py-1 rounded text-xs whitespace-nowrap shadow-lg">
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
  const baseHeight = tile.biome === 'DEEP_WATER' || tile.biome === 'SHALLOW_WATER' ? 0 : Math.max(0.1, tile.elevation + 0.5) - 0.5;

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
      <Html position={[0, appearance.height + 0.2, 0]} center style={{ pointerEvents: 'none' }}>
        <div className="flex flex-col items-center">
          <div className="bg-amber-900/80 px-1.5 py-0.5 rounded text-[10px] text-amber-300 border border-amber-700/50 whitespace-nowrap shadow-sm mb-1">
            {member.role}
          </div>
          <div className="bg-zinc-900/80 px-1 py-0.5 rounded text-[10px] text-zinc-400 border border-zinc-800 whitespace-nowrap">
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
  const baseHeight = tile.biome === 'DEEP_WATER' || tile.biome === 'SHALLOW_WATER' ? 0 : Math.max(0.1, tile.elevation + 0.5) - 0.5;

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
      // Trigger combat particles
      setCombatPos([(Math.random() - 0.5) * 0.3, 0.5, (Math.random() - 0.5) * 0.3]);
      setShowCombat(true);
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
        <PixelMonsterSprite type={monster.name} realm={monster.realm} scale={0.7} />
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
  const baseHeight = tile.biome === 'DEEP_WATER' || tile.biome === 'SHALLOW_WATER' ? 0 : Math.max(0.1, tile.elevation + 0.5) - 0.5;

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

      {/* Player cultivation aura sparkles */}
      <Sparkles
        count={20}
        scale={[1.5, 1, 1.5]}
        size={0.06}
        speed={0.4}
        color={appearance.auraColor}
        opacity={0.5}
      />

      <Html position={[0, appearance.height + 0.5, 0]} center style={{ pointerEvents: 'none' }}>
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
  const baseHeight = tile.biome === 'DEEP_WATER' || tile.biome === 'SHALLOW_WATER' ? 0 : Math.max(0.1, tile.elevation + 0.5) - 0.5;
  const warRingRef = useRef<THREE.Mesh>(null);

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
        <circleGeometry args={[1 + territory * 0.6, 48]} />
        <meshBasicMaterial color={COUNTRY_COLORS[country] || '#787878'} transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* Territory border ring */}
      <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1 + territory * 0.6 - 0.08, 1 + territory * 0.6, 48]} />
        <meshBasicMaterial color={COUNTRY_COLORS[country] || '#787878'} transparent opacity={0.25} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Territory ring */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 2.5, 32]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>

      {/* War indicator: pulsing red ring */}
      {isAtWar && (
        <mesh ref={warRingRef} position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.0, 2.8, 32]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Small building indicators */}
      {(faction.buildings || []).map((b, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const radius = 1.2;
        const bx = Math.cos(angle) * radius;
        const bz = Math.sin(angle) * radius;
        const BUILDING_COLORS_MAP: Record<string, string> = {
          '议事厅': '#fbbf24', '练功房': '#fb7185', '丹房': '#4ade80',
          '藏经阁': '#c084fc', '库房': '#facc15', '哨塔': '#22d3ee', '炼器房': '#f59e0b',
        };
        return (
          <mesh key={b.type} position={[bx, 0.1, bz]} castShadow>
            <boxGeometry args={[0.2, 0.1 + b.level * 0.05, 0.2]} />
            <meshStandardMaterial color={BUILDING_COLORS_MAP[b.type] || '#f59e0b'} />
          </mesh>
        );
      })}

      {/* Faction building sprite */}
      <group position={[0, 0.45, 0]}>
        <PixelBuildingSprite type="city" country={country} scale={0.45} />
      </group>
      {/* Garrison HP bar */}
      {(garrison ?? 0) > 0 && (
        <Html position={[0, 1.2, 0]} center style={{ pointerEvents: 'none' }}>
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
        <Html position={[0, 1.0, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="flex items-center gap-1">
            <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-zinc-600">
              <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, fortification || 0)}%` }} />
            </div>
            <span className="text-[10px] text-amber-400 font-mono">墙{fortification}</span>
          </div>
        </Html>
      )}
      {/* Faction name label */}
      <Html position={[0, 1.3, 0]} center style={{ pointerEvents: 'none' }}>
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
  const baseHeight = tile.biome === 'DEEP_WATER' || tile.biome === 'SHALLOW_WATER' ? 0 : Math.max(0.1, tile.elevation + 0.5) - 0.5;

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

interface Map2DProps {
  onProximityTrigger?: (sceneId: string) => void;
  triggerVersion?: number;
}

// Module-level scene trigger cooldown (persists across re-renders)
const sceneTriggerCooldowns: Record<string, { lastTriggerAt: number; wasOutside: boolean }> = {};
const TRIGGER_COOLDOWN_MS = 30000;

export const Map2D = ({ onProximityTrigger, triggerVersion = 0 }: Map2DProps) => {
  const { player, nearbyNPCs, wildMonsters, resourcePoints, squadMembers, playerFactionId, clans, movePlayer, addWorldEvent, exploredTiles } = useGameStore();
  const [selectedNPC, setSelectedNPC] = useState<NPC | null>(null);

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
        const baseHeight = tile.biome === 'DEEP_WATER' || tile.biome === 'SHALLOW_WATER' ? 0 : Math.max(0.1, tile.elevation + 0.5) - 0.5;

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

  // 哨塔 vision bonus for fog and zoom
  const watchtowerLevel = playerFactionId
    ? (clans.find(c => c.id === playerFactionId)?.buildings?.find(b => b.type === '哨塔')?.level || 0)
    : 0;
  const visionBonus = watchtowerLevel > 0 ? BUILDING_VISION_BONUS[watchtowerLevel] || 0 : 0;
  // Realm-based vision radius for fog of war
  const baseVision = player ? getVisionRadius(player.realm, visionBonus) : 12;
  const hasScout = squadMembers.some(m => m.isAlive && m.role === '斥候型');
  const visionRadius = hasScout ? Math.round(baseVision * SCOUT_VISION_MULTIPLIER) : baseVision;

  // Keyboard Movement + proximity trigger
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch(e.key) {
        case 'ArrowUp':
        case 'w': movePlayer(0, -1); break;
        case 'ArrowDown':
        case 's': movePlayer(0, 1); break;
        case 'ArrowLeft':
        case 'a': movePlayer(-1, 0); break;
        case 'ArrowRight':
        case 'd': movePlayer(1, 0); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  // Render Capitals
  const capitals = COUNTRIES.map(country => {
    const capital = COUNTRIES_DATA[country].capital;
    const dx = capital.x - player.position.x;
    const dy = capital.y - player.position.y;
    if (Math.abs(dx) <= VIEW_RADIUS && Math.abs(dy) <= VIEW_RADIUS) {
      const tile = getTerrainTile(capital.x, capital.y);
      const baseHeight = tile.biome === 'DEEP_WATER' || tile.biome === 'SHALLOW_WATER' ? 0 : Math.max(0.1, tile.elevation + 0.5) - 0.5;
      
      return (
        <group key={`capital-${country}`} position={[dx, baseHeight, dy]}>
          {/* Capital building sprite */}
          <PixelBuildingSprite type="capital" country={country} scale={0.7} />
          {/* Capital glow ring */}
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.0, 1.3, 32]} />
            <meshBasicMaterial color={COUNTRY_COLORS[country] || '#b45309'} transparent opacity={0.4} side={THREE.DoubleSide} />
          </mesh>
          <Html position={[0, 0.9, 0]} center style={{ pointerEvents: 'none' }}>
            <div className="text-amber-400 text-[10px] font-bold whitespace-nowrap drop-shadow-lg">
              {country}都
            </div>
          </Html>
        </group>
      );
    }
    return null;
  });

  return (
    <div className="w-full h-full bg-zinc-950 relative overflow-hidden" style={{ width: '100vw', height: '100vh' }}>
      <Canvas shadows style={{ width: '100%', height: '100%' }} gl={{ antialias: false, powerPreference: 'high-performance' }}>
        {/* 迷雾参数调整：颜色调亮，范围大幅推远，减少压抑感 */}
        <fog attach="fog" args={['#18181b', 25 - visionBonus * 2, 60 + visionBonus * 10]} />

        <OrthographicCamera
          makeDefault
          position={[25, 25, 25]}
          zoom={35 - visionBonus * 1.5}
          near={-100}
          far={200}
          onUpdate={c => c.lookAt(0, 0, 0)}
        />
        
        {/* 环境光大幅调亮，模拟明亮的白天天光 */}
        <ambientLight intensity={1.5} color="#f8fafc" /> 
        
        {/* 主平行光模拟太阳，强度提升，颜色调白亮 */}
        <directionalLight 
          position={[15, 25, 10]} 
          intensity={2.0} 
          color="#fef9c3"
          castShadow 
          shadow-mapSize={[2048, 2048]} 
          shadow-camera-left={-30}
          shadow-camera-right={30}
          shadow-camera-top={30}
          shadow-camera-bottom={-30}
          shadow-bias={-0.001}
        />

        <Terrain playerPos={player.position} />
        <FogOfWar playerPos={player.position} exploredTiles={exploredTiles} visionRadius={visionRadius} />
        <WeatherEffect playerPos={player.position} />

        {capitals}

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

        {nearbyNPCs.map(npc => {
          const dx = npc.position.x - player.position.x;
          const dy = npc.position.y - player.position.y;
          if (Math.abs(dx) > VIEW_RADIUS || Math.abs(dy) > VIEW_RADIUS) return null;
          return <NPCMesh key={npc.id} npc={npc} dx={dx} dy={dy} onClick={() => setSelectedNPC(npc)} />;
        })}

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
          const baseHeight = tile.biome === 'DEEP_WATER' || tile.biome === 'SHALLOW_WATER' ? 0 : Math.max(0.1, tile.elevation + 0.5) - 0.5;
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
      </Canvas>

      {/* 坐标 + 控制提示 */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-zinc-500 text-sm flex space-x-4 bg-zinc-900/50 px-4 py-2 rounded-full backdrop-blur pointer-events-none">
        <span className="text-emerald-400 font-mono font-bold">({player.position.x}, {player.position.y})</span>
        <span className="text-zinc-500">|</span>
        <span>[W A S D] 或 [方向键] 移动</span>
        <span>点击 NPC/资源点 交互</span>
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
                <div className="grid grid-cols-4 gap-2">
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
                    className="py-2 bg-rose-900/50 hover:bg-rose-800 text-rose-400 rounded transition-colors border border-rose-900 text-sm"
                    onClick={() => { useGameStore.getState().interactWithNPC(selectedNPC.id, '攻击'); setSelectedNPC(null); }}
                  >
                    攻击
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
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
