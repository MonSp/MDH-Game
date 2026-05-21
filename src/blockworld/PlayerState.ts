import * as THREE from 'three';
import { BlockType } from './BlockTypes';

export type CameraMode = 'fps' | 'tps';

export const blockWorldPlayer = {
  position: new THREE.Vector3(2200, 48, 5100),
  yaw: 0,
  pitch: 0,
  velocity: new THREE.Vector3(),
  onGround: false,
  isLocked: false,
  cameraMode: 'fps' as CameraMode,
  tpsDistance: 5,
};

export const selectedBlock = { type: BlockType.STONE };
