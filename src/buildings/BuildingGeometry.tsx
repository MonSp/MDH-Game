import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BuildingDef } from './BuildingTypes';

export interface BuildingGeometryProps {
  building: BuildingDef;
  /** Player is inside this building (camera inside bounds) */
  playerInside?: boolean;
  /** Center position in world */
  position?: [number, number, number];
  onClick?: () => void;
}

const WallSegment = React.memo(({ x, y, w, h: _h, wallColor, offsetX, offsetZ, def }: {
  wallColor: string;
  offsetX: number;
  offsetZ: number;
  def: BuildingDef;
}) => {
  const geo = useMemo(() => new THREE.BoxGeometry(w, def.height, 0.4), [w, def.height]);
  return (
    <mesh
      geometry={geo}
      position={[offsetX + x + w / 2 - def.width / 2, def.height / 2, offsetZ + y - def.depth / 2 + 0.5]}
    >
      <meshStandardMaterial color={wallColor} roughness={0.8} />
    </mesh>
  );
});

const RoofMesh = React.memo(({ def, visible }: { def: BuildingDef; visible: boolean }) => {
  const roofY = def.height;

  const roofGeo = useMemo(() => {
    if (def.roofType === 'pagoda') {
      const g = new THREE.ConeGeometry(
        Math.max(def.width, def.depth) * 0.75,
        def.roofHeight * 2,
        4,
      );
      g.rotateY(Math.PI / 4);
      return g;
    } else if (def.roofType === 'sloped') {
      const g = new THREE.ConeGeometry(
        Math.max(def.width, def.depth) * 0.7,
        def.roofHeight * 2,
        4,
      );
      g.rotateY(Math.PI / 4);
      return g;
    }
    return new THREE.BoxGeometry(def.width * 0.95, 0.3, def.depth * 0.95);
  }, [def]);

  return (
    <mesh
      geometry={roofGeo}
      position={[0, roofY + def.roofHeight * 0.5, 0]}
    >
      <meshStandardMaterial
        color={def.roofColor}
        roughness={0.6}
        transparent={!visible}
        opacity={visible ? 1 : 0.15}
        depthWrite={visible}
      />
    </mesh>
  );
});

const FloorTile = React.memo(({ x, y, def }: { x: number; y: number; def: BuildingDef }) => {
  return (
    <mesh position={[x - def.width / 2 + 0.5, 0.01, y - def.depth / 2 + 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial color="#3a3028" roughness={0.9} />
    </mesh>
  );
});

const InteriorWall = React.memo(({ rect, def }: { rect: { x: number; y: number; w: number; h: number }; def: BuildingDef }) => {
  const geo = useMemo(() => new THREE.BoxGeometry(rect.w, def.height * 0.9, 0.2), [rect.w, def.height]);
  return (
    <mesh
      geometry={geo}
      position={[
        rect.x - def.width / 2 + rect.w / 2,
        def.height * 0.45,
        rect.y - def.depth / 2 + rect.h / 2,
      ]}
    >
      <meshStandardMaterial color="#8a7a6a" roughness={0.9} />
    </mesh>
  );
});

export const BuildingGeometry = React.memo(({
  building,
  playerInside = false,
  position = [0, 0, 0],
  onClick,
}: BuildingGeometryProps) => {
  const groupRef = useRef<THREE.Group>(null);

  const borderGeo = useMemo(() => {
    const shape = new THREE.Shape();
    const hw = building.width / 2;
    const hd = building.depth / 2;
    shape.moveTo(-hw, -hd);
    shape.lineTo(hw, -hd);
    shape.lineTo(hw, hd);
    shape.lineTo(-hw, hd);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, [building.width, building.depth]);

  const outerWalls = useMemo(() => {
    const doors = building.interior.doors;
    const segments: Array<{ x: number; y: number; w: number; h: number }> = [];

    building.interior.outer.forEach(({ x, y, w, h }) => {
      const absX = x;
      const absY = y;
      const absW = w;
      const absH = Math.abs(h);

      const isHorizontal = absW > absH;

      for (const door of doors) {
        if (isHorizontal && absY === door.y) {
          const doorX = door.x;
          if (doorX > absX && doorX < absX + absW) {
            if (doorX - absX > 0.5) {
              segments.push({ x: absX, y: absY, w: doorX - absX - 0.5, h: 1 });
            }
            if (absX + absW - doorX - 1.5 > 0) {
              segments.push({ x: doorX + 1.5, y: absY, w: absX + absW - doorX - 1.5, h: 1 });
            }
            return;
          }
        }
      }
      segments.push({ x: absX, y: absY, w: absW, h: absH });
    });

    return segments;
  }, [building]);

  return (
    <group ref={groupRef} position={position} onClick={onClick}>
      {/* Foundation shadow */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <primitive object={borderGeo} />
        <meshBasicMaterial color="#111" transparent opacity={0.3} depthWrite={false} />
      </mesh>

      {/* Floor */}
      {playerInside && (
        <>
          {Array.from({ length: building.width }, (_, x) =>
            Array.from({ length: building.depth }, (_, y) => (
              <FloorTile key={`floor-${x}-${y}`} x={x} y={y} def={building} />
            ))
          )}
          {/* Interior walls */}
          {building.interior.inner.map((rect, i) => (
            <InteriorWall key={`inner-${i}`} rect={rect} def={building} />
          ))}
        </>
      )}

      {/* Outer walls */}
      {outerWalls.map((seg, i) => (
        <WallSegment
          key={`wall-${i}`}
          x={seg.x}
          y={seg.y}
          w={seg.w}
          h={seg.h}
          wallColor={building.wallColor}
          offsetX={0}
          offsetZ={0}
          def={building}
        />
      ))}

      {/* Roof */}
      <RoofMesh def={building} visible={!playerInside} />
    </group>
  );
});
