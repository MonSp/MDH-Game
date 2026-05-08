import React, { useEffect, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BuildingGeometry } from './BuildingGeometry';
import { useBuildingStore } from './BuildingStore';

interface BuildingWorldProps {
  playerX: number;
  playerY: number;
  viewRadius: number;
}

function rayHitsAABB(
  ox: number, oz: number,
  minX: number, maxX: number,
  minZ: number, maxZ: number
): boolean {
  const dx = -ox;
  const dz = -oz;
  if (Math.abs(dx) < 0.0001 && Math.abs(dz) < 0.0001) return false;

  let tMin = 0, tMax = 1;

  if (Math.abs(dx) > 0.0001) {
    const t1 = (minX - ox) / dx;
    const t2 = (maxX - ox) / dx;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
  } else if (ox < minX || ox > maxX) {
    return false;
  }

  if (Math.abs(dz) > 0.0001) {
    const t1 = (minZ - oz) / dz;
    const t2 = (maxZ - oz) / dz;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
  } else if (oz < minZ || oz > maxZ) {
    return false;
  }

  return tMin <= tMax && tMax >= 0;
}

export const BuildingWorld = React.memo(({
  playerX,
  playerY,
  viewRadius,
}: BuildingWorldProps) => {
  const { camera } = useThree();
  const buildings = useBuildingStore((s) => s.buildings);
  const currentBuildingId = useBuildingStore((s) => s.currentBuildingId);
  const enterBuilding = useBuildingStore((s) => s.enterBuilding);
  const exitBuilding = useBuildingStore((s) => s.exitBuilding);

  const buildingRefs = useRef<Map<string, THREE.Group>>(new Map());
  const [ghostedIds, setGhostedIds] = useState<Set<string>>(new Set());
  const prevGhostedStr = useRef('');

  useEffect(() => {
    let foundInside = false;
    for (const b of buildings) {
      const hw = b.def.compoundWidth / 2;
      const hd = b.def.compoundDepth / 2;
      const localX = playerX - b.worldX;
      const localY = playerY - b.worldY;
      if (localX >= -hw && localX <= hw && localY >= -hd && localY <= hd) {
        foundInside = true;
        if (currentBuildingId !== b.id) {
          enterBuilding(b.id);
        }
        break;
      }
    }
    if (!foundInside && currentBuildingId) {
      exitBuilding();
    }
  }, [playerX, playerY, buildings, currentBuildingId, enterBuilding, exitBuilding]);

  useFrame(() => {
    const camPos = camera.position;
    const camDist = camPos.length();

    if (camDist > 60) {
      if (ghostedIds.size > 0) {
        setGhostedIds(new Set());
        prevGhostedStr.current = '';
      }
      return;
    }

    const cx = camPos.x;
    const cz = camPos.z;
    const newGhosted = new Set<string>();

    for (const b of buildings) {
      const relX = b.worldX - playerX;
      const relZ = b.worldY - playerY;
      const buildingDist = Math.sqrt(relX * relX + relZ * relZ);
      if (buildingDist > viewRadius + b.def.compoundWidth * 0.5) continue;

      const hw = b.def.compoundWidth / 2;
      const hd = b.def.compoundDepth / 2;
      if (rayHitsAABB(cx, cz, relX - hw, relX + hw, relZ - hd, relZ + hd)) {
        newGhosted.add(b.id);
      }
    }

    const key = [...newGhosted].sort().join(',');
    if (key !== prevGhostedStr.current) {
      prevGhostedStr.current = key;
      setGhostedIds(newGhosted);
    }
  });

  return (
    <group>
      {buildings.map((b) => {
        const inside = currentBuildingId === b.id;
        const relX = b.worldX - playerX;
        const relY = b.worldY - playerY;
        const dist = Math.sqrt(relX * relX + relY * relY);
        if (!inside && dist > viewRadius + b.def.compoundWidth * 0.5) return null;

        return (
          <BuildingGeometry
            key={b.id}
            building={b.def}
            playerInside={inside}
            position={[relX, 0, relY]}
            ghostMode={ghostedIds.has(b.id)}
            ref={(group) => {
              if (group) buildingRefs.current.set(b.id, group);
              else buildingRefs.current.delete(b.id);
            }}
          />
        );
      })}
    </group>
  );
});
