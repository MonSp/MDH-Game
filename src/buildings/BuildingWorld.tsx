import React, { useEffect, useRef } from 'react';
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
  const buildings = useBuildingStore((s) => s.buildings);
  const currentBuildingId = useBuildingStore((s) => s.currentBuildingId);
  const enterBuilding = useBuildingStore((s) => s.enterBuilding);
  const exitBuilding = useBuildingStore((s) => s.exitBuilding);

  const buildingRefs = useRef<Map<string, THREE.Group>>(new Map());

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
    const socket = getSocket();
    if (!socket) return;

    const handler = (data: { buildingId: string; updates: Array<{ lx: number; ly: number; lz: number; material: import('./BuildingTypes').MaterialType; health: number }> }) => {
      const store = useBuildingStore.getState();
      store.updateBlockStates(data.buildingId, data.updates);
    };

    socket.on('destruct:state', handler);
    return () => {
      socket.off('destruct:state', handler);
    };
  }, []);

  useEffect(() => {
    if (!currentBuildingId) return;
    const socket = getSocket();
    if (!socket) return;
    socket.emit('destruct:request', { buildingId: currentBuildingId });
  }, [currentBuildingId]);

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
