import React, { useRef, useCallback } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { useBuildModeStore } from '../buildings/BuildModeStore';
import { useGameStore } from '../store/gameStore';
import { MaterialType } from '../buildings/BuildingTypes';

const VOXEL_SIZE = 0.333;
const HALF_VOXEL = VOXEL_SIZE / 2;
const GRID_X = 32;
const GRID_Y = 16;
const GRID_Z = 32;

const WORLD_X = GRID_X * VOXEL_SIZE;
const WORLD_Z = GRID_Z * VOXEL_SIZE;
const HALF_WORLD_X = WORLD_X / 2;
const HALF_WORLD_Z = WORLD_Z / 2;

const MATERIAL_COLORS: Record<MaterialType, string> = {
  stone: '#808080',
  wood: '#8B5E3C',
  earth: '#A0522D',
  metal: '#B0B0B0',
  thatch: '#C4A35A',
};

const gridLinesGeo = new THREE.BufferGeometry();
{
  const vertices: number[] = [];
  for (let i = 0; i <= GRID_X; i++) {
    const x = i * VOXEL_SIZE;
    vertices.push(x, 0, 0, x, 0, WORLD_Z);
  }
  for (let i = 0; i <= GRID_Z; i++) {
    const z = i * VOXEL_SIZE;
    vertices.push(0, 0, z, WORLD_X, 0, z);
  }
  gridLinesGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
}

const BuildModeController: React.FC = React.memo(() => {
  const { camera, gl } = useThree();

  const gridGroupRef = useRef<THREE.Group>(null!);
  const groundRef = useRef<THREE.Mesh>(null!);
  const ghostRef = useRef<THREE.Mesh>(null!);
  const raycaster = useRef(new THREE.Raycaster());
  const pointerRef = useRef(new THREE.Vector2(999, 999));

  const handlePointerMove = useCallback((e: any) => {
    pointerRef.current.set(e.pointer.x, e.pointer.y);
  }, []);

  const handlePointerLeave = useCallback(() => {
    pointerRef.current.set(999, 999);
    useBuildModeStore.getState().setMouseGridPos(null);
    if (ghostRef.current) ghostRef.current.visible = false;
  }, []);

  const handlePointerDown = useCallback((e: any) => {
    const store = useBuildModeStore.getState();
    if (!store.mouseGridPos) return;

    if (e.button === 0) {
      if (e.nativeEvent.shiftKey) {
        store.removeBlock(store.mouseGridPos.lx, store.mouseGridPos.ly, store.mouseGridPos.lz);
      } else {
        store.placeBlock(store.mouseGridPos.lx, store.mouseGridPos.ly, store.mouseGridPos.lz);
      }
    }
  }, []);

  useFrame(() => {
    const store = useBuildModeStore.getState();
    if (!store.active) return;

    const player = useGameStore.getState().player;
    if (!player || !store.currentBuild) return;

    const offsetX = store.currentBuild.worldX - player.position.x;
    const offsetZ = store.currentBuild.worldY - player.position.y;

    if (gridGroupRef.current) {
      gridGroupRef.current.position.set(offsetX, 0, offsetZ);
    }

    const ndc = pointerRef.current;
    if (ndc.x === 999 && ndc.y === 999) {
      if (ghostRef.current) ghostRef.current.visible = false;
      return;
    }

    raycaster.current.setFromCamera(ndc, camera);
    const intersects = raycaster.current.intersectObject(groundRef.current, false);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      const lx = Math.floor((point.x - offsetX) / VOXEL_SIZE);
      const ly = store.currentLayer;
      const lz = Math.floor((point.z - offsetZ) / VOXEL_SIZE);

      if (lx >= 0 && lx < GRID_X && ly >= 0 && ly < GRID_Y && lz >= 0 && lz < GRID_Z) {
        store.setMouseGridPos({ lx, ly, lz });

        const wx = lx * VOXEL_SIZE + HALF_VOXEL;
        const wy = ly * VOXEL_SIZE + HALF_VOXEL;
        const wz = lz * VOXEL_SIZE + HALF_VOXEL;

        if (ghostRef.current) {
          ghostRef.current.position.set(wx, wy, wz);
          ghostRef.current.visible = true;
          (ghostRef.current.material as THREE.MeshStandardMaterial).color.set(
            MATERIAL_COLORS[store.selectedMaterial]
          );
        }
        return;
      }
    }

    store.setMouseGridPos(null);
    if (ghostRef.current) ghostRef.current.visible = false;
  });

  const active = useBuildModeStore((s) => s.active);

  if (!active) return null;

  return (
    <group ref={gridGroupRef}>
      <mesh
        ref={groundRef}
        position={[HALF_WORLD_X, 0, HALF_WORLD_Z]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
      >
        <planeGeometry args={[WORLD_X, WORLD_Z]} />
        <meshStandardMaterial transparent opacity={0.15} color="#888888" side={THREE.DoubleSide} />
      </mesh>

      <lineSegments geometry={gridLinesGeo}>
        <lineBasicMaterial color="#666666" transparent opacity={0.25} />
      </lineSegments>

      <mesh ref={ghostRef} visible={false}>
        <boxGeometry args={[VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE]} />
        <meshStandardMaterial transparent opacity={0.5} color="#808080" depthWrite={false} />
      </mesh>
    </group>
  );
});

export { BuildModeController };
