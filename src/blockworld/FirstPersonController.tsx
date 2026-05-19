import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CHUNK_SIZE, BlockType, worldToChunk, isCollidable } from './BlockTypes';
import { blockWorldPlayer, selectedBlock, CameraMode } from './PlayerState';
import { ChunkData } from './ChunkData';
import { raycastBlock } from './BlockInteraction';
import { blockWorldActions } from './BlockWorld';
import { interactionState, particleQueue } from './InteractionState';
import { damp } from './CameraMath';

const MOVE_SPEED = 8;
const JUMP_SPEED = 10;
const GRAVITY = 20;
const PITCH_LIMIT = Math.PI / 2 - 0.05;
const MOUSE_SENSITIVITY = 0.002;
const MAX_MOUSE_DELTA = 50;

const _yawAxis = new THREE.Vector3(0, 1, 0);
const _forwardVec = new THREE.Vector3();
let _accumMX = 0;
let _accumMY = 0;

function computeForward(yaw: number, pitch: number): THREE.Vector3 {
  if (!Number.isFinite(yaw) || !Number.isFinite(pitch)) {
    return _forwardVec.set(0, 0, -1);
  }
  const clamped = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch));
  const c = Math.cos(clamped);
  return _forwardVec.set(
    -Math.sin(yaw) * c,
    Math.sin(clamped),
    -Math.cos(yaw) * c,
  );
}

function normalizeAngle(a: number): number {
  if (!Number.isFinite(a)) return 0;
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

function yawQuat(yaw: number): THREE.Quaternion {
  return new THREE.Quaternion().setFromAxisAngle(_yawAxis, yaw);
}

const PLAYER_HEIGHT = 1.7;
const PLAYER_RADIUS = 0.3;
const REACH_DIST = 8;
const MINING_TIME = 0.4;

const TPS_PITCH_MIN = -Math.PI / 3;
const TPS_PITCH_MAX = Math.PI / 3;
const TPS_DISTANCE_MIN = 2;
const TPS_DISTANCE_MAX = 12;
const TPS_ZOOM_SENSITIVITY = 0.05;

const BOBBING_ENABLED = true;
const BOBBING_VERTICAL_FREQ = 4.0;
const BOBBING_VERTICAL_AMP = 0.025;
const BOBBING_HORIZONTAL_FREQ = 4.0;
const BOBBING_HORIZONTAL_AMP = 0.015;
const BOBBING_ROLL_FREQ = 4.0;
const BOBBING_ROLL_AMP = 0.005;
const BOBBING_SPEED_THRESHOLD = 3.5;
const BREATHING_FREQ = 0.7;
const BREATHING_AMP = 0.015;

const FOV_BASE = 70;
const FOV_MAX = 85;
const FOV_SPEED_THRESHOLD = 3.0;
const FOV_DAMP_LAMBDA = 6;

const FRICTION_LAMBDA = 14;
const TPS_DISTANCE_DAMP_LAMBDA = 12;
const CAVE_BLEND_LAMBDA = 8;

const CAVE_CHECK_HEIGHT_MIN = 2;
const CAVE_CHECK_HEIGHT_MAX = 4;
const CAVE_BLOCK_THRESHOLD = 2;

const _tempVec3a = new THREE.Vector3();
const _tempVec3b = new THREE.Vector3();
const _bobOffset = new THREE.Vector3();

let _loadedChunks: Map<string, ChunkData> = new Map();

export function setChunkDataMap(map: Map<string, ChunkData>) {
  _loadedChunks = map;
}

function getChunkWrapped(cx: number, cy: number, cz: number): ChunkData | undefined {
  return _loadedChunks.get(`${cx},${cy},${cz}`);
}

function computeBobbing(speed: number, isMoving: boolean, elapsed: number) {
  _bobOffset.set(0, 0, 0);
  let roll = 0;

  if (!BOBBING_ENABLED) return { offset: _bobOffset, roll };

  if (isMoving && speed > 0.1) {
    const speedFactor = Math.min(speed / BOBBING_SPEED_THRESHOLD, 1.0);
    _bobOffset.y = Math.sin(elapsed * BOBBING_VERTICAL_FREQ * Math.PI * 2)
      * BOBBING_VERTICAL_AMP * speedFactor;
    _bobOffset.x = Math.sin(elapsed * BOBBING_HORIZONTAL_FREQ * Math.PI * 2)
      * BOBBING_HORIZONTAL_AMP * speedFactor;
    roll = Math.sin(elapsed * BOBBING_ROLL_FREQ * Math.PI * 2)
      * BOBBING_ROLL_AMP * speedFactor;
  } else {
    _bobOffset.y = Math.sin(elapsed * BREATHING_FREQ * Math.PI * 2) * BREATHING_AMP;
  }

  return { offset: _bobOffset, roll };
}

function checkCave(playerPos: THREE.Vector3): boolean {
  const px = Math.floor(playerPos.x);
  const py = Math.floor(playerPos.y);
  const pz = Math.floor(playerPos.z);

  let blocked = 0;
  for (let dy = CAVE_CHECK_HEIGHT_MIN; dy <= CAVE_CHECK_HEIGHT_MAX; dy++) {
    const wy = py + dy;
    const { cx, cy, cz } = worldToChunk(px, wy, pz);
    const chunk = getChunkWrapped(cx, cy, cz);
    if (!chunk) continue;

    const lbx = ((px % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lby = ((wy % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lbz = ((pz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

    if (isCollidable(chunk.getBlock(lbx, lby, lbz) as BlockType)) {
      blocked++;
    }
  }

  return blocked >= CAVE_BLOCK_THRESHOLD;
}

function checkBlockAt(wx: number, wy: number, wz: number): boolean {
  const { cx, cy, cz } = worldToChunk(
    Math.floor(wx), Math.floor(wy), Math.floor(wz)
  );
  const chunk = getChunkWrapped(cx, cy, cz);
  if (!chunk) return false;

  const lbx = ((Math.floor(wx) % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  const lby = ((Math.floor(wy) % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  const lbz = ((Math.floor(wz) % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

  return isCollidable(chunk.getBlock(lbx, lby, lbz) as BlockType);
}

function resolveCameraBlocked(camPos: THREE.Vector3, playerHead: THREE.Vector3): THREE.Vector3 {
  if (!checkBlockAt(camPos.x, camPos.y, camPos.z)) return camPos;

  const dir = playerHead.clone().sub(camPos).normalize();
  const result = camPos.clone();
  for (let i = 0; i < 20; i++) {
    result.addScaledVector(dir, 0.25);
    if (!checkBlockAt(result.x, result.y, result.z)) return result;
  }
  return playerHead.clone();
}

export const FirstPersonController: React.FC = () => {
  const { camera: cam, gl } = useThree();
  const camera = cam as THREE.PerspectiveCamera;
  const keys = useRef(new Set<string>());
  const isLocked = useRef(false);
  const mouseDown = useRef<{ button: number; time: number } | null>(null);
  const lastHoverKey = useRef('');

  const smoothState = useRef({
    tpsDistance: blockWorldPlayer.tpsDistance,
    fov: FOV_BASE,
    caveBlend: 0,
  });

  useEffect(() => {
    const canvas = gl.domElement;

    const onKeyDown = (e: KeyboardEvent) => {
      keys.current.add(e.code);
      if (e.code === 'Escape') {
        document.exitPointerLock();
      }
      if (e.code === 'KeyV') {
        const next: CameraMode = blockWorldPlayer.cameraMode === 'fps' ? 'tps' : 'fps';
        blockWorldPlayer.cameraMode = next;
        if (next === 'tps') {
          blockWorldPlayer.pitch = Math.max(TPS_PITCH_MIN, Math.min(TPS_PITCH_MAX, blockWorldPlayer.pitch));
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { keys.current.delete(e.code); };

    const onMouseMove = (e: MouseEvent) => {
      if (!isLocked.current) return;
      const mx = Number.isFinite(e.movementX) ? e.movementX : 0;
      const my = Number.isFinite(e.movementY) ? e.movementY : 0;
      _accumMX += Math.max(-MAX_MOUSE_DELTA, Math.min(MAX_MOUSE_DELTA, mx));
      _accumMY += Math.max(-MAX_MOUSE_DELTA, Math.min(MAX_MOUSE_DELTA, my));
    };

    const onWheel = (e: WheelEvent) => {
      if (!isLocked.current) return;
      if (blockWorldPlayer.cameraMode === 'tps') {
        blockWorldPlayer.tpsDistance += e.deltaY * TPS_ZOOM_SENSITIVITY;
        blockWorldPlayer.tpsDistance = Math.max(TPS_DISTANCE_MIN, Math.min(TPS_DISTANCE_MAX, blockWorldPlayer.tpsDistance));
      }
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
    canvas.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      document.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [gl]);

  useFrame((state, delta) => {
    if (!isLocked.current) {
      if (interactionState.hoverTarget) {
        interactionState.hoverTarget = null;
      }
      return;
    }

    const dt = Math.min(delta, 0.1);
    const elapsed = state.clock.elapsedTime;
    const mode = blockWorldPlayer.cameraMode;

    const pitchLimit = mode === 'fps' ? PITCH_LIMIT : TPS_PITCH_MAX;
    if (!Number.isFinite(blockWorldPlayer.pitch)
      || blockWorldPlayer.pitch > pitchLimit
      || blockWorldPlayer.pitch < -pitchLimit) {
      console.warn('[FPC] pitch anomaly corrected', {
        pitch: blockWorldPlayer.pitch, yaw: blockWorldPlayer.yaw, mode,
      });
      blockWorldPlayer.pitch = Math.max(-pitchLimit, Math.min(pitchLimit, blockWorldPlayer.pitch || 0));
    }
    if (!Number.isFinite(blockWorldPlayer.yaw)) {
      console.warn('[FPC] yaw NaN corrected');
      blockWorldPlayer.yaw = 0;
    }

    const mx = Math.max(-MAX_MOUSE_DELTA, Math.min(MAX_MOUSE_DELTA, _accumMX));
    const my = Math.max(-MAX_MOUSE_DELTA, Math.min(MAX_MOUSE_DELTA, _accumMY));
    _accumMX = 0;
    _accumMY = 0;
    blockWorldPlayer.yaw = normalizeAngle(blockWorldPlayer.yaw - mx * MOUSE_SENSITIVITY);
    blockWorldPlayer.pitch -= my * MOUSE_SENSITIVITY;
    blockWorldPlayer.pitch = Math.max(-pitchLimit, Math.min(pitchLimit, blockWorldPlayer.pitch));

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
      const st = interactionState;
      if (st.miningActive) {
        st.miningProgress += dt / MINING_TIME;
        if (st.miningProgress >= 1) {
          if (blockWorldActions.setBlock) {
            blockWorldActions.setBlock(
              st.miningWorldX,
              st.miningWorldY,
              st.miningWorldZ,
              BlockType.AIR,
            );
            particleQueue.push({
              worldX: st.miningWorldX,
              worldY: st.miningWorldY,
              worldZ: st.miningWorldZ,
              blockType: st.miningBlockType,
            });
          }
          mouseDown.current = null;
          st.miningActive = false;
          st.miningProgress = 0;
          lastHoverKey.current = '';
        }
      }
    }

    const forward = computeForward(blockWorldPlayer.yaw, blockWorldPlayer.pitch);
    let camForward: THREE.Vector3;
    let camRight: THREE.Vector3;
    if (mode === 'fps') {
      camForward = forward.clone();
      camRight = new THREE.Vector3().crossVectors(forward, _yawAxis).normalize();
    } else {
      const yawFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(yawQuat(blockWorldPlayer.yaw));
      camForward = yawFwd;
      camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(yawQuat(blockWorldPlayer.yaw));
    }

    const moveDir = new THREE.Vector3();
    if (keys.current.has('KeyW')) moveDir.add(camForward);
    if (keys.current.has('KeyS')) moveDir.sub(camForward);
    if (keys.current.has('KeyA')) moveDir.sub(camRight);
    if (keys.current.has('KeyD')) moveDir.add(camRight);

    if (moveDir.length() > 0) {
      moveDir.normalize();
      blockWorldPlayer.velocity.x = moveDir.x * MOVE_SPEED;
      blockWorldPlayer.velocity.z = moveDir.z * MOVE_SPEED;
    } else {
      blockWorldPlayer.velocity.x = damp(blockWorldPlayer.velocity.x, 0, FRICTION_LAMBDA, dt);
      blockWorldPlayer.velocity.z = damp(blockWorldPlayer.velocity.z, 0, FRICTION_LAMBDA, dt);
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

    const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
    const isMoving = speed > 0.2;

    const isCave = checkCave(pos);
    smoothState.current.caveBlend = damp(smoothState.current.caveBlend, isCave ? 1 : 0, CAVE_BLEND_LAMBDA, dt);

    const { offset: bobOffset, roll: bobRoll } = computeBobbing(speed, isMoving, elapsed);

    if (mode === 'fps') {
      camera.position.copy(pos);
      camera.position.y += PLAYER_HEIGHT;
      camera.lookAt(
        camera.position.x + forward.x,
        camera.position.y + forward.y,
        camera.position.z + forward.z,
      );

      if (bobOffset.x !== 0 || bobOffset.y !== 0 || bobOffset.z !== 0) {
        if (Number.isFinite(bobOffset.x) && Number.isFinite(bobOffset.y) && Number.isFinite(bobOffset.z)) {
          camera.position.add(bobOffset);
        }
      }
      if (bobRoll !== 0 && Number.isFinite(bobRoll)) {
        camera.rotateZ(bobRoll);
      }
    } else {
      smoothState.current.tpsDistance = damp(
        smoothState.current.tpsDistance,
        blockWorldPlayer.tpsDistance,
        TPS_DISTANCE_DAMP_LAMBDA,
        dt,
      );

      const dist = smoothState.current.tpsDistance;
      const tpsPitch = blockWorldPlayer.pitch;
      const tpsYaw = blockWorldPlayer.yaw;
      const orbitY = pos.y + PLAYER_HEIGHT;

      const hDist = dist * Math.cos(tpsPitch);
      const ox = Math.sin(tpsYaw) * hDist;
      const oy = Math.sin(tpsPitch) * dist;
      const oz = Math.cos(tpsYaw) * hDist;

      const rawCamPos = _tempVec3a.set(pos.x + ox, orbitY + oy, pos.z + oz);

      const playerEye = _tempVec3b.set(pos.x, pos.y + PLAYER_HEIGHT, pos.z);
      const resolvedPos = resolveCameraBlocked(rawCamPos, playerEye);

      camera.position.copy(resolvedPos);
      camera.position.add(bobOffset);

      const caveTightness = smoothState.current.caveBlend;
      const lookY = pos.y + PLAYER_HEIGHT * 0.7 - caveTightness * 0.3;

      camera.lookAt(pos.x, lookY, pos.z);

      if (bobRoll !== 0 && Number.isFinite(bobRoll)) {
        camera.rotateZ(bobRoll);
      }
    }

    let targetFov = FOV_BASE;
    const speedRatio = Math.min(speed / FOV_SPEED_THRESHOLD, 1.0);
    targetFov = FOV_BASE + (FOV_MAX - FOV_BASE) * speedRatio;

    smoothState.current.fov = damp(smoothState.current.fov, targetFov, FOV_DAMP_LAMBDA, dt);
    camera.fov = smoothState.current.fov;
    camera.updateProjectionMatrix();
  });

  return null;
};

function doRaycast(): ReturnType<typeof raycastBlock> {
  const mode = blockWorldPlayer.cameraMode;
  let originX: number, originY: number, originZ: number;
  let dirX: number, dirY: number, dirZ: number;
  let reachDist = REACH_DIST;

  if (mode === 'fps') {
    originX = blockWorldPlayer.position.x;
    originY = blockWorldPlayer.position.y + PLAYER_HEIGHT;
    originZ = blockWorldPlayer.position.z;

    const fwd = computeForward(blockWorldPlayer.yaw, blockWorldPlayer.pitch);
    dirX = fwd.x;
    dirY = fwd.y;
    dirZ = fwd.z;
  } else {
    originX = blockWorldPlayer.position.x;
    originY = blockWorldPlayer.position.y + PLAYER_HEIGHT;
    originZ = blockWorldPlayer.position.z;

    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(yawQuat(blockWorldPlayer.yaw));
    fwd.normalize();
    dirX = fwd.x;
    dirY = 0;
    dirZ = fwd.z;
    reachDist = REACH_DIST + blockWorldPlayer.tpsDistance * 0.5;
  }

  return raycastBlock(
    originX, originY, originZ,
    dirX, dirY, dirZ,
    reachDist,
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
