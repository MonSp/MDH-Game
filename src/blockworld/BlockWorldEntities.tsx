import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Html } from '@react-three/drei';
import { Sparkles } from '@react-three/drei';
import { useGameStore, NPC, WildMonster, SquadMember } from '../store/gameStore';
import { generateCharacterStyle, getRealmAura } from '../utils/appearance';
import { getTerrainHeight } from './ChunkGenerator';
import { PixelCharacterSprite } from '../components/PixelCharacterSprite';
import { PixelMonsterSprite } from '../components/PixelMonsterSprite';
import { PixelResourceSprite } from '../components/PixelResourceSprite';
import { CombatParticles, BloodParticles, SkillParticles, triggerScreenShake } from '../components/PixelParticleEffects';

let _selectedNpcId: string | null = null;
let _setSelectedNpcId: ((id: string | null) => void) | null = null;

export function getSelectedNpcId(): string | null {
  return _selectedNpcId;
}

export function setSelectedNpcId(id: string | null) {
  _selectedNpcId = id;
  _setSelectedNpcId?.(id);
}

export function getSelectedNpc(): NPC | null {
  if (!_selectedNpcId) return null;
  return useGameStore.getState().nearbyNPCs.find(n => n.id === _selectedNpcId) || null;
}

const VIEW_RADIUS = 12;

const CultivatorModel = ({ appearance, isMoving = false, isFloating = false }: { appearance: any; isMoving?: boolean; isFloating?: boolean }) => {
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

const REALM_LIST = ['凡人', '练气', '筑基', '金丹', '元婴', '化神', '炼虚', '合体', '大乘', '渡劫'];

const NPC_MESH = ({ npc }: { npc: NPC }) => {
  const [hovered, setHovered] = useState(false);
  const appearance = useMemo(() => generateCharacterStyle(npc.realm, '凡体', npc.role), [npc]);

  const terrainY = getTerrainHeight(npc.position.x, npc.position.y);
  const realmIndex = useMemo(() => REALM_LIST.indexOf(npc.realm), [npc.realm]);

  const [isMoving, setIsMoving] = useState(false);
  const prevPos = useRef(npc.position);

  useEffect(() => {
    if (prevPos.current.x !== npc.position.x || prevPos.current.y !== npc.position.y) {
      setIsMoving(true);
      const timer = setTimeout(() => setIsMoving(false), 500);
      prevPos.current = npc.position;
      return () => clearTimeout(timer);
    }
  }, [npc.position]);

  return (
    <group position={[npc.position.x, terrainY, npc.position.y]}>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[appearance.auraSize, 32]} />
        <meshBasicMaterial color={appearance.auraColor} transparent opacity={appearance.auraOpacity} />
      </mesh>

      <group
        onClick={(e) => {
          e.stopPropagation();
          setSelectedNpcId(npc.id);
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <CultivatorModel appearance={appearance} isMoving={isMoving} />
      </group>

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

      <Html position={[0, appearance.height * 0.6 + 0.15, 0]} center style={{ pointerEvents: 'none' }}>
        <div className="flex flex-col items-center">
          <div className="bg-black/50 px-1.5 py-0.5 rounded text-[10px] text-white/80 whitespace-nowrap shadow-sm mb-1">
            {npc.activity}
          </div>
          {hovered && (
            <div className="bg-black/70 border border-zinc-700 px-2 py-1 rounded text-xs whitespace-nowrap shadow-lg">
              <div className="text-emerald-400 font-bold">{npc.name} <span className="text-zinc-500 font-normal">[{npc.realm}]</span></div>
              <div className="text-zinc-400 flex items-center space-x-2">
                <span>{npc.role}</span>
                <span className="text-amber-500">{npc.resources.spiritStone}灵石</span>
              </div>
            </div>
          )}
        </div>
      </Html>
    </group>
  );
};

const MONSTER_MESH = ({ monster }: { monster: WildMonster }) => {
  const realmAura = useMemo(() => getRealmAura(monster.realm), [monster.realm]);
  const monsterRealmIndex = useMemo(() => REALM_LIST.indexOf(monster.realm), [monster.realm]);
  const terrainY = getTerrainHeight(monster.position.x, monster.position.y);

  const [damageNumbers, setDamageNumbers] = useState<{ id: number; value: number; color: string }[]>([]);
  const [showCombat, setShowCombat] = useState(false);
  const [combatPos, setCombatPos] = useState<[number, number, number]>([0, 0, 0]);
  const prevHpRef = useRef(monster.hp);
  const damageIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const prevHp = prevHpRef.current;
    if (monster.hp < prevHp) {
      const dmg = prevHp - monster.hp;
      const id = damageIdRef.current++;
      const color = dmg > monster.attack ? '#ffffff' : '#ff6666';
      setDamageNumbers(prev => [...prev, { id, value: dmg, color }]);
      setCombatPos([(Math.random() - 0.5) * 0.3, 0.5, (Math.random() - 0.5) * 0.3]);
      setShowCombat(true);
      triggerScreenShake(0.5);
      setTimeout(() => { if (mountedRef.current) setShowCombat(false); }, 800);
      setTimeout(() => { if (mountedRef.current) setDamageNumbers(prev => prev.filter(n => n.id !== id)); }, 1200);
    }
    prevHpRef.current = monster.hp;
    return () => { mountedRef.current = false; };
  }, [monster.hp, monster.attack]);

  return (
    <group position={[monster.position.x, terrainY, monster.position.y]}>
      {realmAura && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.7, 32]} />
          <meshBasicMaterial color={realmAura.auraColor} transparent opacity={0.3} />
        </mesh>
      )}

      <PixelMonsterSprite type={monster.name} realm={monster.realm} scale={1.1} />

      {showCombat && <CombatParticles position={combatPos} count={8} color="#ff6b35" duration={800} />}
      {showCombat && <BloodParticles position={combatPos} count={12} duration={600} />}
      {showCombat && (Math.random() < 0.3 ? <SkillParticles position={[combatPos[0], combatPos[1] + 0.3, combatPos[2]]} element={['fire', 'ice', 'lightning'][Math.floor(Math.random() * 3)] as 'fire' | 'ice' | 'lightning'} duration={500} /> : null)}

      {monsterRealmIndex >= 3 && (
        <Sparkles
          count={monsterRealmIndex >= 6 ? 10 : 5}
          scale={[1.0, 0.6, 1.0]}
          size={0.04}
          speed={0.3}
          color={realmAura?.auraColor || '#ff4444'}
          opacity={0.3}
        />
      )}

      <Html position={[0, 1.5, 0]} center style={{ pointerEvents: 'none' }}>
        <div className="flex flex-col items-center relative">
          {damageNumbers.map(dn => (
            <div key={dn.id} className="absolute -top-4 left-1/2 -translate-x-1/2 text-xs font-bold animate-float-up pointer-events-none whitespace-nowrap"
              style={{ color: dn.color }}>
              -{dn.value}
            </div>
          ))}
          <div className="text-rose-400 font-bold text-[10px] whitespace-nowrap bg-black/60 px-1.5 py-0.5 rounded mb-1">
            {monster.name}
          </div>
          <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(0, (monster.hp / monster.maxHp) * 100)}%`,
                backgroundColor: monster.hp / monster.maxHp > 0.6 ? '#22c55e' : monster.hp / monster.maxHp > 0.3 ? '#eab308' : '#ef4444',
              }}
            />
          </div>
        </div>
      </Html>
    </group>
  );
};

const RESOURCE_MESH = ({ res }: { res: any }) => {
  const interactWithResource = useGameStore(state => state.interactWithResource);
  const [hovered, setHovered] = useState(false);
  const [gathering, setGathering] = useState(false);
  const terrainY = getTerrainHeight(res.position.x, res.position.y);

  const handleGather = (e: any) => {
    e.stopPropagation();
    interactWithResource(res.id);
    setGathering(true);
    setTimeout(() => setGathering(false), 1200);
  };

  return (
    <group position={[res.position.x, terrainY + 0.4, res.position.y]}>
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
            <div className="text-zinc-400">点击采集</div>
          </div>
        </Html>
      )}
    </group>
  );
};

const SQUAD_MEMBER_MESH = ({ member }: { member: SquadMember }) => {
  const appearance = useMemo(() => {
    const style = generateCharacterStyle(member.realm || '凡人', '凡体', '核心子弟');
    style.auraColor = '#fbbf24';
    style.auraOpacity = 0.25;
    return style;
  }, [member.realm]);

  const terrainY = getTerrainHeight(member.position.x, member.position.y);

  return (
    <group position={[member.position.x, terrainY, member.position.y]}>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[appearance.auraSize, 32]} />
        <meshBasicMaterial color={appearance.auraColor} transparent opacity={appearance.auraOpacity} />
      </mesh>

      <CultivatorModel appearance={appearance} />

      <Html position={[0, appearance.height * 0.6 + 0.15, 0]} center style={{ pointerEvents: 'none' }}>
        <div className="bg-black/50 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap shadow-sm flex items-center space-x-1">
          <span className="text-amber-400">{member.role}</span>
          <span className="text-white/80">{member.name}</span>
        </div>
      </Html>
    </group>
  );
};

export const BlockWorldEntities: React.FC = () => {
  const { player, nearbyNPCs, wildMonsters, resourcePoints, squadMembers } = useGameStore();

  useEffect(() => {
    _setSelectedNpcId = () => {};
    return () => { _setSelectedNpcId = null; };
  }, []);

  if (!player) return null;

  const px = player.position.x;
  const py = player.position.y;

  return (
    <group>
      {resourcePoints.map(res => {
        const dx = res.position.x - px;
        const dz = res.position.y - py;
        if (Math.abs(dx) > VIEW_RADIUS || Math.abs(dz) > VIEW_RADIUS) return null;
        return <RESOURCE_MESH key={res.id} res={res} />;
      })}

      {nearbyNPCs.map(npc => {
        const dx = npc.position.x - px;
        const dz = npc.position.y - py;
        if (Math.abs(dx) > VIEW_RADIUS || Math.abs(dz) > VIEW_RADIUS) return null;
        return <NPC_MESH key={npc.id} npc={npc} />;
      })}

      {squadMembers.filter(m => m.isAlive).map(member => {
        const dx = member.position.x - px;
        const dz = member.position.y - py;
        if (Math.abs(dx) > VIEW_RADIUS || Math.abs(dz) > VIEW_RADIUS) return null;
        return <SQUAD_MEMBER_MESH key={member.id} member={member} />;
      })}

      {wildMonsters.map(monster => {
        const dx = monster.position.x - px;
        const dz = monster.position.y - py;
        if (Math.abs(dx) > VIEW_RADIUS || Math.abs(dz) > VIEW_RADIUS) return null;
        return <MONSTER_MESH key={monster.id} monster={monster} />;
      })}
    </group>
  );
};
