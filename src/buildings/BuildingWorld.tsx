import React, { useEffect, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BuildingGeometry } from './BuildingGeometry';
import { useBuildingStore } from './BuildingStore';
import { getSocket } from '../shared/socket';

interface BuildingWorldProps {
  playerX: number;
  playerY: number;
  viewRadius: number;
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
  const frameCountRef = useRef(0);
  const pendingRef = useRef(false);
  const mountedRef = useRef(true);

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

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

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

    frameCountRef.current++;
    if (frameCountRef.current % 3 !== 0) return;  // throttle every 3 frames
    if (pendingRef.current) return;                // skip if request in flight

    pendingRef.current = true;
    const socket = getSocket();
    console.log('[BldOcclusion] Emit: cam=', camPos.x.toFixed(1), camPos.z.toFixed(1),
      'player=', playerX, playerY, 'viewRadius=', viewRadius);
    socket.emit('occlusion:compute', {
      camX: camPos.x, camZ: camPos.z,
      camY: camPos.y,
      playerX, playerY, viewRadius,
    }, (res: { buildingIds?: string[] }) => {
      if (!mountedRef.current) return;
      pendingRef.current = false;
      console.log('[BldOcclusion] Resp: ids=', res?.buildingIds);
      const ids = res?.buildingIds || [];
      const newGhosted = new Set(ids);
      const key = [...newGhosted].sort().join(',');
      if (key !== prevGhostedStr.current) {
        prevGhostedStr.current = key;
        setGhostedIds(newGhosted);
      }
    });
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
