import * as THREE from 'three';
import { BlockType } from './BlockTypes';

export const blockWorldPlayer = {
  position: new THREE.Vector3(0, 50, 0),
  euler: new THREE.Euler(0, 0, 0, 'YXZ'),
  velocity: new THREE.Vector3(),
  onGround: false,
  isLocked: false,
};

export const selectedBlock = { type: BlockType.STONE };
