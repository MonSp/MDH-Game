import React, { useMemo, useRef, forwardRef } from 'react';
import * as THREE from 'three';
import { BuildingDef, InnerBuilding, GuoGridBlock, PalaceQuarter, CityRoad, MaterialType, generateBuildingVoxels, generateWallVoxels } from './BuildingTypes';
import VoxelRenderer from './VoxelRenderer';

export interface BuildingGeometryProps {
  building: BuildingDef;
  playerInside?: boolean;
  position?: [number, number, number];
}

function RoadStrip({ road, offsetX, offsetY }: { road: CityRoad; offsetX: number; offsetY: number }) {
  return (
    <mesh position={[offsetX + road.x + road.width / 2, 0.01, offsetY + road.y + road.depth / 2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[road.width - 0.05, road.depth - 0.05]} />
      <meshStandardMaterial color={road.color} roughness={0.9} depthWrite={false} transparent opacity={0.35} />
    </mesh>
  );
}

function WallSegment({ cx, cz, w, d, h, color }: { cx: number; cz: number; w: number; d: number; h: number; color: string; }) {
  const geo = useMemo(() => new THREE.BoxGeometry(w, h, d), [w, h, d]);
  return <mesh geometry={geo} position={[cx, h / 2, cz]}>
    <meshStandardMaterial color={color} roughness={0.8} />
  </mesh>;
}

function GatePillars({ cx, cz, direction, wh }: { cx: number; cz: number; direction: 'north' | 'south' | 'east' | 'west'; wh: number; }) {
  const isHoriz = direction === 'north' || direction === 'south';
  const gapW = 3;
  const pillarW = 0.4;
  const pillarH = wh * 1.15;
  const doorW = isHoriz ? gapW : 0.4;
  const doorD = isHoriz ? 0.4 : gapW;
  const lintelGeo = useMemo(() => new THREE.BoxGeometry(doorW, 0.4, doorD), [doorW, doorD]);
  const pillarGeo = useMemo(() => new THREE.BoxGeometry(pillarW, pillarH, pillarW), [pillarH]);
  return (
    <group position={[cx, 0, cz]}>
      <mesh geometry={pillarGeo} position={[isHoriz ? -gapW / 2 + 0.2 : 0, pillarH / 2, isHoriz ? 0 : -gapW / 2 + 0.2]}>
        <meshStandardMaterial color="#4a3020" roughness={0.7} />
      </mesh>
      <mesh geometry={pillarGeo} position={[isHoriz ? gapW / 2 - 0.2 : 0, pillarH / 2, isHoriz ? 0 : gapW / 2 - 0.2]}>
        <meshStandardMaterial color="#4a3020" roughness={0.7} />
      </mesh>
      <mesh geometry={lintelGeo} position={[0, pillarH + 0.1, 0]}>
        <meshStandardMaterial color="#5a4030" roughness={0.6} />
      </mesh>
    </group>
  );
}

function CompoundWalls({ def }: { def: BuildingDef }) {
  const hw = def.compoundWidth / 2;
  const hd = def.compoundDepth / 2;
  const wh = def.wallHeight;
  const gapW = 3;

  const wallVoxels = useMemo(() => {
    const results: Array<{ voxels: ReturnType<typeof generateWallVoxels>; cx: number; cz: number; side: string }> = [];

    const hWall = (side: 'north' | 'south') => {
      const z = side === 'north' ? -hd : hd;
      const gs = def.gates.filter(g => g.direction === side).sort((a, b) => a.x - b.x);
      let nx = -hw;
      for (const g of gs) {
        const gx = g.x - hw;
        if (gx - nx > 0.5) {
          const ww = gx - nx;
          const voxels = generateWallVoxels(ww, wh, 0.5, 'wood');
          results.push({ voxels, cx: nx + ww / 2, cz: z, side });
        }
        nx = gx + gapW;
      }
      if (hw - nx > 0.5) {
        const ww = hw - nx;
        const voxels = generateWallVoxels(ww, wh, 0.5, 'wood');
        results.push({ voxels, cx: nx + ww / 2, cz: z, side });
      }
    };

    const vWall = (side: 'west' | 'east') => {
      const x = side === 'west' ? -hw : hw;
      const gs = def.gates.filter(g => g.direction === side).sort((a, b) => a.y - b.y);
      let ny = -hd;
      for (const g of gs) {
        const gy = g.y - hd;
        if (gy - ny > 0.5) {
          const dd = gy - ny;
          const voxels = generateWallVoxels(0.5, wh, dd, 'wood');
          results.push({ voxels, cx: x, cz: ny + dd / 2, side });
        }
        ny = gy + gapW;
      }
      if (hd - ny > 0.5) {
        const dd = hd - ny;
        const voxels = generateWallVoxels(0.5, wh, dd, 'wood');
        results.push({ voxels, cx: x, cz: ny + dd / 2, side });
      }
    };

    hWall('north'); hWall('south'); vWall('west'); vWall('east');
    return results;
  }, [def, hw, hd, wh, gapW]);

  return (
    <group>
      {wallVoxels.map((wv, i) => (
        <VoxelRenderer
          key={`vw-${i}`}
          voxels={wv.voxels}
          position={[wv.cx, 0, wv.cz]}
          scale={0.333}
        />
      ))}
      {def.gates.map((gate, i) => (
        <GatePillars key={`ogate-${i}`} cx={gate.x - hw} cz={gate.y - hd} direction={gate.direction} wh={wh} />
      ))}
    </group>
  );
}

function PalaceWalls({ pq, offsetX, offsetY }: { pq: PalaceQuarter; offsetX: number; offsetY: number; }) {
  const x = offsetX + pq.x;
  const y = offsetY + pq.y;
  const w = pq.width;
  const d = pq.depth;
  const wh = pq.wallHeight;
  const gapW = 3;
  const segs = useMemo(() => {
    const s: Array<{ cx: number; cz: number; w: number; d: number; h: number }> = [];
    const gx = pq.gateX - pq.x;
    if (gx > 0.5) s.push({ cx: x + gx / 2, cz: y, w: gx, d: 0.4, h: wh });
    const rightStart = gx + gapW;
    if (rightStart < w - 0.5) { const rw = w - rightStart; s.push({ cx: x + rightStart + rw / 2, cz: y, w: rw, d: 0.4, h: wh }); }
    if (pq.gateDir === 'south') {
      const sgx = pq.gateX - pq.x;
      if (sgx > 0.5) s.push({ cx: x + sgx / 2, cz: y + d, w: sgx, d: 0.4, h: wh });
      const sRight = sgx + gapW;
      if (sRight < w - 0.5) { const rw = w - sRight; s.push({ cx: x + sRight + rw / 2, cz: y + d, w: rw, d: 0.4, h: wh }); }
    }
    s.push({ cx: x, cz: y + d / 2, w: 0.4, d: d, h: wh });
    s.push({ cx: x + w, cz: y + d / 2, w: 0.4, d: d, h: wh });
    return s;
  }, [x, y, w, d, wh, pq.gateX, pq.gateDir, gapW, pq.x]);
  return (
    <group>
      {segs.map((seg, i) => <WallSegment key={`pw-${i}`} {...seg} color={pq.wallColor} />)}
      {pq.gateDir === 'south' && <GatePillars cx={pq.gateX} cz={y + d} direction="south" wh={wh} />}
      <GatePillars cx={pq.gateX} cz={y} direction="north" wh={wh} />
    </group>
  );
}

function PalaceFloor({ pq, offsetX, offsetY }: { pq: PalaceQuarter; offsetX: number; offsetY: number; }) {
  return (
    <mesh position={[offsetX + pq.x + pq.width / 2, 0.02, offsetY + pq.y + pq.depth / 2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[pq.width, pq.depth]} />
      <meshStandardMaterial color={pq.floorColor || '#8a7a5a'} roughness={0.95} depthWrite={false} />
    </mesh>
  );
}

function InnerBuildingMesh({ ib, offsetX, offsetY }: { ib: InnerBuilding; offsetX: number; offsetY: number; }) {
  const bodyGeo = useMemo(() => new THREE.BoxGeometry(ib.width, ib.height, ib.depth), [ib.width, ib.height, ib.depth]);
  const roofGeo = useMemo(() => {
    if (ib.roofType === 'pagoda') { const g2 = new THREE.ConeGeometry(Math.max(ib.width, ib.depth) * 0.75, ib.height * 0.35, 4); g2.rotateY(Math.PI / 4); return g2; }
    if (ib.roofType === 'sloped') { const g2 = new THREE.ConeGeometry(Math.max(ib.width, ib.depth) * 0.7, ib.height * 0.3, 4); g2.rotateY(Math.PI / 4); return g2; }
    return new THREE.BoxGeometry(ib.width * 0.95, 0.3, ib.depth * 0.95);
  }, [ib]);
  const cx = offsetX + ib.x + ib.width / 2;
  const cz = offsetY + ib.y + ib.depth / 2;
  return (
    <group position={[cx, 0, cz]}>
      <mesh geometry={bodyGeo} position={[0, ib.height / 2, 0]}>
        <meshStandardMaterial color={ib.color} roughness={0.75} />
      </mesh>
      <mesh geometry={roofGeo} position={[0, ib.height + ib.height * 0.15, 0]}>
        <meshStandardMaterial color={ib.roofColor} roughness={0.6} />
      </mesh>
    </group>
  );
}

function seededRand(seed: number): number { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
const HOUSE_COLORS = ['#8a7a5a', '#7a6a4a', '#9a8a6a', '#6a5a4a', '#7a6a3a'];
const SHOP_COLORS = ['#b8955a', '#c4a35a', '#a0804a'];
const WORKSHOP_COLORS = ['#5a5040', '#4a4030', '#6a5a4a'];

function GuoGridBuildings({ block, offsetX, offsetY }: { block: GuoGridBlock; offsetX: number; offsetY: number; }) {
  const meshes = useMemo(() => {
    const result: Array<{ key: string; cx: number; cz: number; w: number; d: number; h: number; color: string; roofColor: string; roofType: 'flat' | 'sloped' | 'pagoda'; voxels: ReturnType<typeof generateBuildingVoxels> }> = [];
    
    for (let row = 0; row < block.rows; row++) {
      for (let col = 0; col < block.cols; col++) {
        if (seededRand(row * 17.3 + col * 31.7 + block.startX * 0.1) < 0.15) continue;
        
        const cellX = offsetX + block.startX + col * block.cellSize;
        const cellY = offsetY + block.startY + row * block.cellSize;
        const rnd = seededRand(row * 100 + col + block.startY);
        let colors: string[]; let h: number; let roofT: 'flat' | 'sloped' | 'pagoda';
        let wallMat: MaterialType; let roofMat: MaterialType;
        
        if (rnd < 0.6) {
          colors = HOUSE_COLORS; h = 0.8 + seededRand(row * 3 + col * 7) * 0.8;
          roofT = 'sloped'; wallMat = 'wood'; roofMat = 'thatch';
        } else if (rnd < 0.85) {
          colors = SHOP_COLORS; h = 1.0 + seededRand(col * 5 + row * 9) * 0.6;
          roofT = 'flat'; wallMat = 'wood'; roofMat = 'thatch';
        } else {
          colors = WORKSHOP_COLORS; h = 1.2 + seededRand(col * 11 + row * 13) * 0.8;
          roofT = 'sloped'; wallMat = 'earth'; roofMat = 'thatch';
        }
        
        const w = 0.6 + seededRand(row * 13 + col) * (block.cellSize - 0.6 - 0.6);
        const d = 0.6 + seededRand(col * 7 + row * 3) * (block.cellSize - 0.6 - 0.6);
        const color = colors[Math.floor(seededRand(row * 19 + col * 23) * colors.length)];
        
        const voxels = generateBuildingVoxels(w, d, h, wallMat, roofMat);
        
        result.push({
          key: `gb-${row}-${col}`,
          cx: cellX + block.cellSize / 2,
          cz: cellY + block.cellSize / 2,
          w, d, h, color, roofColor: block.roofColor, roofType: roofT,
          voxels,
        });
      }
    }
    return result;
  }, [block, offsetX, offsetY]);

  return (
    <group>
      {meshes.map(m => (
        <VoxelRenderer
          key={m.key}
          voxels={m.voxels}
          position={[m.cx, 0, m.cz]}
          scale={0.333}
        />
      ))}
    </group>
  );
}

export const BuildingGeometry = forwardRef<THREE.Group, BuildingGeometryProps>(({
  building,
  position = [0, 0, 0],
}, ref) => {
  const hw = building.compoundWidth / 2;
  const hd = building.compoundDepth / 2;
  const offsetX = -hw;
  const offsetY = -hd;

  const groupRef = useRef<THREE.Group>(null);
  const setRef = (node: THREE.Group | null) => {
    (groupRef as any).current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as any).current = node;
  };

  return (
    <group ref={setRef} position={position}>
      <mesh position={[0, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[building.compoundWidth + 2, building.compoundDepth + 2]} />
        <meshBasicMaterial color="#111" transparent opacity={0.2} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[building.compoundWidth, building.compoundDepth]} />
        <meshStandardMaterial color="#3a3028" roughness={0.95} depthWrite={false} />
      </mesh>
      {building.roads.map((road, i) => <RoadStrip key={`road-${i}`} road={road} offsetX={offsetX} offsetY={offsetY} />)}
      {building.guoBlocks.map((block, i) => <GuoGridBuildings key={`guob-${i}`} block={block} offsetX={offsetX} offsetY={offsetY} />)}
      {building.palaceQuarter && <>
        <PalaceFloor pq={building.palaceQuarter} offsetX={offsetX} offsetY={offsetY} />
        <PalaceWalls pq={building.palaceQuarter} offsetX={offsetX} offsetY={offsetY} />
        {building.palaceQuarter.buildings.map((ib, i) => <InnerBuildingMesh key={`pal-${i}`} ib={ib} offsetX={offsetX + building.palaceQuarter!.x} offsetY={offsetY + building.palaceQuarter!.y} />)}
      </>}
      {!building.noWall && <CompoundWalls def={building} />}
    </group>
  );
});
