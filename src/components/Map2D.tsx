import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrthographicCamera, Html, useCursor } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, NPC, COUNTRIES_DATA, COUNTRIES, BodyType } from '../store/gameStore';
import { generateCharacterStyle } from '../utils/appearance';
import { getTerrainTile } from '../utils/terrain';
import { getSceneIdByCoordinate } from '../content/scenes/sceneRegistry';

// Constants
const VIEW_RADIUS = 15;

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

// 2. Cultivator Voxel Model
const CultivatorModel = ({ appearance, isMoving = false, isFloating = false }: { appearance: any, isMoving?: boolean, isFloating?: boolean }) => {
  const { bodyHexColor, hairHexColor, skinHexColor, hasBun, height, glowColor } = appearance;
  const isGlowing = glowColor !== 'transparent';
  
  const groupRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);

  // 动画随机偏移，避免所有人动作完全同步
  const animOffset = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    if (groupRef.current) {
      if (isMoving) {
        // 移动状态：跳跃动画 (使用绝对值的正弦波模拟蹦跳)
        const bounceFreq = 15; // 跳跃频率
        const bounceAmp = 0.15; // 跳跃高度
        groupRef.current.position.y = Math.abs(Math.sin(time * bounceFreq)) * bounceAmp;

        // 移动状态：手臂前后摆动
        const swingFreq = 15;
        const swingAmp = 0.5; // 摆动幅度
        if (leftArmRef.current && rightArmRef.current) {
          leftArmRef.current.rotation.x = Math.sin(time * swingFreq) * swingAmp;
          rightArmRef.current.rotation.x = -Math.sin(time * swingFreq) * swingAmp;
        }
      } else {
        // 闲置状态：根据是否在水面/闭关决定是漂浮还是呼吸
        if (isFloating) {
          // 水面上漂浮/御剑悬浮感
          groupRef.current.position.y = Math.sin(time * 2 + animOffset) * 0.05;
        } else {
          // 陆地上的呼吸感 (极其微弱的缩放或Y轴位移)
          groupRef.current.position.y = Math.sin(time * 3 + animOffset) * 0.02;
        }

        // 闲置状态：手臂自然下垂
        if (leftArmRef.current && rightArmRef.current) {
          leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, 0, 0.1);
          rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, 0, 0.1);
        }
      }
    }
  });

  // 基准缩放比例，适应不同的身高等级
  const s = height / 1.0; 

  return (
    <group scale={[s, s, s]} ref={groupRef}>
      {/* 头部 (Head) */}
      <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial color={skinHexColor} />
      </mesh>
      
      {/* 头发基座 (Hair Base) */}
      <mesh position={[0, 0.86, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.32, 0.05, 0.32]} />
        <meshStandardMaterial color={hairHexColor} />
      </mesh>

      {/* 发髻 (Hair Bun - 古风特征) */}
      {hasBun && (
        <mesh position={[0, 0.92, -0.05]} castShadow receiveShadow>
          <boxGeometry args={[0.12, 0.15, 0.12]} />
          <meshStandardMaterial color={hairHexColor} />
        </mesh>
      )}

      {/* 飘逸后发 (Back Hair) */}
      <mesh position={[0, 0.65, -0.16]} castShadow receiveShadow>
        <boxGeometry args={[0.32, 0.4, 0.05]} />
        <meshStandardMaterial color={hairHexColor} />
      </mesh>

      {/* 道袍躯干 (Robe Body) */}
      <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.35, 0.4, 0.2]} />
        <meshStandardMaterial color={bodyHexColor} emissive={isGlowing ? glowColor : '#000000'} emissiveIntensity={0.5} />
      </mesh>

      {/* 道袍下摆 (Robe Skirt) */}
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.4, 0.2, 0.25]} />
        <meshStandardMaterial color={bodyHexColor} emissive={isGlowing ? glowColor : '#000000'} emissiveIntensity={0.5} />
      </mesh>

      {/* 左臂大袖 (Left Arm) */}
      <group position={[-0.25, 0.55, 0]} ref={leftArmRef}>
        <mesh position={[0, -0.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.15, 0.35, 0.2]} />
          <meshStandardMaterial color={bodyHexColor} emissive={isGlowing ? glowColor : '#000000'} emissiveIntensity={0.5} />
        </mesh>
      </group>

      {/* 右臂大袖 (Right Arm) */}
      <group position={[0.25, 0.55, 0]} ref={rightArmRef}>
        <mesh position={[0, -0.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.15, 0.35, 0.2]} />
          <meshStandardMaterial color={bodyHexColor} emissive={isGlowing ? glowColor : '#000000'} emissiveIntensity={0.5} />
        </mesh>
      </group>
    </group>
  );
};

// 3. Terrain Component
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
        // 水面下降并稍微透明
        const isWater = tile.biome === 'DEEP_WATER' || tile.biome === 'SHALLOW_WATER';
        const height = isWater ? 0.3 : Math.max(0.1, tile.elevation + 0.5); 
        const yPos = isWater ? -0.15 : (height / 2 - 0.5); // 基准面

        return (
          <group key={`${tile.x},${tile.y}`} position={[tile.dx, 0, tile.dy]}>
            <mesh position={[0, yPos, 0]} castShadow={!isWater} receiveShadow>
              <boxGeometry args={[1, height, 1]} />
              <meshStandardMaterial 
                color={tile.color} 
                transparent={isWater} 
                opacity={isWater ? 0.8 : 1}
                roughness={isWater ? 0.1 : 0.8}
                metalness={isWater ? 0.8 : 0.1}
              />
            </mesh>
            {/* 渲染树木 */}
            {tile.hasTree && <Tree position={[0, yPos + height / 2, 0]} />}
          </group>
        );
      })}
    </group>
  );
};// 4. Resource Mesh
const ResourceMesh = ({ res, dx, dy }: { res: any, dx: number, dy: number }) => {
  const interactWithResource = useGameStore(state => state.interactWithResource);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  const tile = getTerrainTile(res.position.x, res.position.y);
  const baseHeight = tile.biome === 'DEEP_WATER' || tile.biome === 'SHALLOW_WATER' ? 0 : Math.max(0.1, tile.elevation + 0.5) - 0.5;

  const color = res.type === '灵田' ? '#16a34a' : res.type === '矿脉' ? '#78716c' : '#ca8a04';

  return (
    <group position={[dx, baseHeight + 0.5, dy]}>
      <mesh 
        rotation={[Math.PI / 4, Math.PI / 4, 0]} 
        onClick={(e) => { e.stopPropagation(); interactWithResource(res.id); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
      >
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {hovered && (
        <Html position={[0, 1, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="bg-zinc-900/90 border border-zinc-700 px-2 py-1 rounded text-xs whitespace-nowrap shadow-lg">
            <div className="text-emerald-400 font-bold">{res.type}</div>
            <div className="text-zinc-400">点击采集</div>
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

// 4. Player Mesh
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

      <Html position={[0, appearance.height + 0.5, 0]} center style={{ pointerEvents: 'none' }}>
        <div className="bg-zinc-900 border border-emerald-500 px-2 py-1 rounded text-xs whitespace-nowrap shadow-lg flex flex-col items-center">
          <div className="text-emerald-400 font-bold">{player.name}</div>
          <div className="text-zinc-400">[{player.realm}] · {player.bodyType}</div>
        </div>
      </Html>
    </group>
  );
};

interface Map2DProps {
  onProximityTrigger?: (sceneId: string) => void;
}

export const Map2D = ({ onProximityTrigger }: Map2DProps) => {
  const { player, nearbyNPCs, resourcePoints, movePlayer } = useGameStore();
  const [selectedNPC, setSelectedNPC] = useState<NPC | null>(null);
  const triggeredRef = useRef<Set<string>>(new Set());

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

  // Check coordinate proximity for scene triggers
  useEffect(() => {
    if (!player || !onProximityTrigger) return;
    const sceneId = getSceneIdByCoordinate(player.position.x, player.position.y);
    if (sceneId && !triggeredRef.current.has(sceneId)) {
      triggeredRef.current.add(sceneId);
      onProximityTrigger(sceneId);
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
          <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.6, 0.8, 1, 8]} />
            <meshStandardMaterial color="#b45309" /> {/* amber-700 */}
          </mesh>
          <Html position={[0, 1.2, 0]} center style={{ pointerEvents: 'none' }}>
            <div className="flex flex-col items-center">
              <div className="bg-amber-900/80 border border-amber-500/50 px-2 py-1 rounded text-xs whitespace-nowrap shadow-lg text-amber-400 font-bold backdrop-blur-sm">
                {country}国都城坊市
              </div>
            </div>
          </Html>
        </group>
      );
    }
    return null;
  });

  return (
    <div className="w-full h-full bg-zinc-950 relative overflow-hidden" style={{ width: '100vw', height: '100vh' }}>
      <Canvas shadows style={{ width: '100%', height: '100%' }}>
        {/* 迷雾参数调整：颜色调亮，范围大幅推远，减少压抑感 */}
        <fog attach="fog" args={['#18181b', 25, 60]} />

        <OrthographicCamera 
          makeDefault 
          position={[25, 25, 25]} 
          zoom={35} 
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

        {capitals}

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

        <PlayerMesh player={player} />
      </Canvas>

      {/* 控制提示 */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-zinc-500 text-sm flex space-x-4 bg-zinc-900/50 px-4 py-2 rounded-full backdrop-blur pointer-events-none">
        <span>[W A S D] 或 [方向键] 移动</span>
        <span>点击 NPC/资源点 交互</span>
      </div>

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
            <div className="grid grid-cols-3 gap-3">
              <button 
                className="py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded transition-colors"
                onClick={() => { useGameStore.getState().interactWithNPC(selectedNPC.id, '交谈'); setSelectedNPC(null); }}
              >
                交谈
              </button>
              <button 
                className="py-2 bg-zinc-800 hover:bg-zinc-700 text-blue-400 rounded transition-colors"
                onClick={() => { useGameStore.getState().interactWithNPC(selectedNPC.id, '交易'); setSelectedNPC(null); }}
              >
                交易
              </button>
              <button 
                className="py-2 bg-rose-900/50 hover:bg-rose-800 text-rose-400 rounded transition-colors border border-rose-900"
                onClick={() => { useGameStore.getState().interactWithNPC(selectedNPC.id, '攻击'); setSelectedNPC(null); }}
              >
                攻击
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
