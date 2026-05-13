import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CHUNK_SIZE, BlockType, worldToChunk, isCollidable } from './BlockTypes';
import { blockWorldPlayer, selectedBlock } from './PlayerState';
import { ChunkData } from './ChunkData';
import { raycastBlock } from './BlockInteraction';
import { blockWorldActions } from './BlockWorld';
import { interactionState, particleQueue } from './InteractionState';

const MOVE_SPEED = 8;
const JUMP_SPEED = 10;
const GRAVITY = 20;
const MOUSE_SENSITIVITY = 0.002;
const PLAYER_HEIGHT = 1.7;
const PLAYER_RADIUS = 0.3;
const REACH_DIST = 8;
const MINING_TIME = 0.4;

let _loadedChunks: Map<string, ChunkData> = new Map();

export function setChunkDataMap(map: Map<string, ChunkData>) {
  _loadedChunks = map;
}

function getChunkWrapped(cx: number, cy: number, cz: number): ChunkData | undefined {
  return _loadedChunks.get(`${cx},${cy},${cz}`);
}

export const FirstPersonController: React.FC = () => {
  const { camera, gl } = useThree();
  const keys = useRef(new Set<string>());
  const isLocked = useRef(false);
  const mouseDown = useRef<{ button: number; time: number } | null>(null);
  const lastHoverKey = useRef('');

  useEffect(() => {
    const canvas = gl.domElement;

    const onKeyDown = (e: KeyboardEvent) => {
      keys.current.add(e.code);
      if (e.code === 'Escape') {
        document.exitPointerLock();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { keys.current.delete(e.code); };

    const onMouseMove = (e: MouseEvent) => {
      if (!isLocked.current) return;
      blockWorldPlayer.euler.y -= e.movementX * MOUSE_SENSITIVITY;
      blockWorldPlayer.euler.x -= e.movementY * MOUSE_SENSITIVITY;
      blockWorldPlayer.euler.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, blockWorldPlayer.euler.x));
    };

    const onPointerLockChange = () => {
      isLocked.current = document.pointerLockElement === canvas;
      blockWorldPlayer.isLocked = isLocked.current;
    };

    const onClick = () => {
      if (!isLocked.current) {
        canvas.requestPointerLock();
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (!isLocked.current || (e.button !== 0 && e.button !== 2)) return;
      e.preventDefault();

      const result = doRaycast();
      if (!result) return;

      if (e.button === 2) {
        if (!blockWorldActions.setBlock) return;
        const px = result.placeChunkX * CHUNK_SIZE + result.placeBlockX;
        const py = result.placeChunkY * CHUNK_SIZE + result.placeBlockY;
        const pz = result.placeChunkZ * CHUNK_SIZE + result.placeBlockZ;

        const originX = blockWorldPlayer.position.x;
        const originY = blockWorldPlayer.position.y + PLAYER_HEIGHT;
        const originZ = blockWorldPlayer.position.z;
        const dx = px - originX;
        const dy = py - originY;
        const dz = pz - originZ;
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq > 0.01) {
          blockWorldActions.setBlock(px, py, pz, selectedBlock.type);
        }
        return;
      }

      if (e.button === 0) {
        mouseDown.current = { button: 0, time: performance.now() };
        interactionState.miningActive = true;
        const wx = result.hitChunkX * CHUNK_SIZE + result.hitBlockX;
        const wy = result.hitChunkY * CHUNK_SIZE + result.hitBlockY;
        const wz = result.hitChunkZ * CHUNK_SIZE + result.hitBlockZ;
        interactionState.miningWorldX = wx;
        interactionState.miningWorldY = wy;
        interactionState.miningWorldZ = wz;
        interactionState.miningBlockType = result.hitType;
        interactionState.miningFace = result.hitFace;
        interactionState.miningProgress = 0;
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0 && mouseDown.current) {
        mouseDown.current = null;
        interactionState.miningActive = false;
        interactionState.miningProgress = 0;
      }
    };

    const onContextMenu = (e: Event) => {
      if (isLocked.current) {
        e.preventDefault();
      }
    };

    canvas.addEventListener('click', onClick);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('mousemove', onMouseMove);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      document.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [gl]);

  useFrame((_, delta) => {
    if (!isLocked.current) {
      if (interactionState.hoverTarget) {
        interactionState.hoverTarget = null;
      }
      return;
    }

    const dt = Math.min(delta, 0.1);

    const result = doRaycast();
    if (result && isCollidable(result.hitType as BlockType)) {
      const wx = result.hitChunkX * CHUNK_SIZE + result.hitBlockX;
      const wy = result.hitChunkY * CHUNK_SIZE + result.hitBlockY;
      const wz = result.hitChunkZ * CHUNK_SIZE + result.hitBlockZ;
      const key = `${wx},${wy},${wz}`;
      if (lastHoverKey.current !== key) {
        lastHoverKey.current = key;
        interactionState.hoverTarget = {
          worldX: wx,
          worldY: wy,
          worldZ: wz,
          face: result.hitFace,
          blockType: result.hitType,
        };
      }
    } else {
      if (lastHoverKey.current !== '') {
        lastHoverKey.current = '';
        interactionState.hoverTarget = null;
      }
    }

    if (mouseDown.current) {
      const state = interactionState;
      if (state.miningActive) {
        state.miningProgress += dt / MINING_TIME;
        if (state.miningProgress >= 1) {
          if (blockWorldActions.setBlock) {
            blockWorldActions.setBlock(
              state.miningWorldX,
              state.miningWorldY,
              state.miningWorldZ,
              BlockType.AIR,
            );
            particleQueue.push({
              worldX: state.miningWorldX,
              worldY: state.miningWorldY,
              worldZ: state.miningWorldZ,
              blockType: state.miningBlockType,
            });
          }
          mouseDown.current = null;
          state.miningActive = false;
          state.miningProgress = 0;
          lastHoverKey.current = '';
        }
      }
    }

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
      new THREE.Quaternion().setFromEuler(blockWorldPlayer.euler)
    );
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(
      new THREE.Quaternion().setFromEuler(blockWorldPlayer.euler)
    );

    const moveDir = new THREE.Vector3();
    if (keys.current.has('KeyW')) moveDir.add(forward);
    if (keys.current.has('KeyS')) moveDir.sub(forward);
    if (keys.current.has('KeyA')) moveDir.sub(right);
    if (keys.current.has('KeyD')) moveDir.add(right);

    if (moveDir.length() > 0) {
      moveDir.normalize();
      blockWorldPlayer.velocity.x = moveDir.x * MOVE_SPEED;
      blockWorldPlayer.velocity.z = moveDir.z * MOVE_SPEED;
    } else {
      blockWorldPlayer.velocity.x *= 0.8;
      blockWorldPlayer.velocity.z *= 0.8;
    }

    if (keys.current.has('Space') && blockWorldPlayer.onGround) {
      blockWorldPlayer.velocity.y = JUMP_SPEED;
    }

    blockWorldPlayer.velocity.y -= GRAVITY * dt;
    blockWorldPlayer.onGround = false;

    const pos = blockWorldPlayer.position;
    const vel = blockWorldPlayer.velocity;

    pos.y += vel.y * dt;
    if (checkCollision(pos.x, pos.y, pos.z)) {
      if (vel.y < 0) {
        blockWorldPlayer.onGround = true;
      }
      pos.y -= vel.y * dt;
      vel.y = 0;
    }

    pos.x += vel.x * dt;
    if (checkCollision(pos.x, pos.y, pos.z)) {
      pos.x -= vel.x * dt;
      vel.x = 0;
    }

    pos.z += vel.z * dt;
    if (checkCollision(pos.x, pos.y, pos.z)) {
      pos.z -= vel.z * dt;
      vel.z = 0;
    }

    camera.position.copy(pos);
    camera.position.y += PLAYER_HEIGHT;
    camera.quaternion.setFromEuler(blockWorldPlayer.euler);
  });

  return null;
};

function doRaycast(): ReturnType<typeof raycastBlock> {
  const originX = blockWorldPlayer.position.x;
  const originY = blockWorldPlayer.position.y + PLAYER_HEIGHT;
  const originZ = blockWorldPlayer.position.z;

  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
    new THREE.Quaternion().setFromEuler(blockWorldPlayer.euler)
  );
  forward.normalize();

  return raycastBlock(
    originX, originY, originZ,
    forward.x, forward.y, forward.z,
    REACH_DIST,
    getChunkWrapped,
  );
}

function checkCollision(px: number, py: number, pz: number): boolean {
  const R = PLAYER_RADIUS;
  const minX = Math.floor(px - R);
  const maxX = Math.floor(px + R);
  const minY = Math.floor(py);
  const maxY = Math.floor(py + PLAYER_HEIGHT);
  const minZ = Math.floor(pz - R);
  const maxZ = Math.floor(pz + R);

  for (let y = minY; y <= maxY; y++) {
    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        const { cx, cy, cz } = worldToChunk(x, y, z);
        const cKey = `${cx},${cy},${cz}`;
        const chunk = _loadedChunks.get(cKey);
        if (!chunk) continue;

        const lbx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const lby = ((y % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const lbz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

        if (isCollidable(chunk.getBlock(lbx, lby, lbz) as BlockType)) {
          return true;
        }
      }
    }
  }
  return false;
}
