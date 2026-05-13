import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface AtlasEntry {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface AtlasMetadata {
  atlasWidth: number;
  atlasHeight: number;
  entries: AtlasEntry[];
}

interface BakedSpriteViewerProps {
  atlasUrl: string;
  metadataUrl: string;
  position?: [number, number, number];
  scale?: number;
}

function loadAtlasMetadata(url: string): Promise<AtlasMetadata> {
  return fetch(url).then((r) => r.json());
}

function loadAtlasTexture(url: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (texture) => {
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.colorSpace = THREE.SRGBColorSpace;
        resolve(texture);
      },
      undefined,
      reject,
    );
  });
}

export const BakedSpriteViewer: React.FC<BakedSpriteViewerProps> = ({
  atlasUrl,
  metadataUrl,
  position = [0, 0, 0],
  scale = 4,
}) => {
  const spriteRef = useRef<THREE.Sprite>(null);
  const materialRef = useRef<THREE.SpriteMaterial | null>(null);
  const metadataRef = useRef<AtlasMetadata | null>(null);
  const { camera } = useThree();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([loadAtlasMetadata(metadataUrl), loadAtlasTexture(atlasUrl)])
      .then(([meta, tex]) => {
        if (cancelled) return;
        metadataRef.current = meta;
        const mat = new THREE.SpriteMaterial({
          map: tex,
          transparent: true,
          depthWrite: false,
        });
        materialRef.current = mat;
        if (spriteRef.current) {
          spriteRef.current.material = mat;
        }
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      if (materialRef.current) {
        materialRef.current.map?.dispose();
        materialRef.current.dispose();
        materialRef.current = null;
      }
    };
  }, [atlasUrl, metadataUrl]);

  useFrame(() => {
    const mat = materialRef.current;
    const meta = metadataRef.current;
    if (!mat || !meta || !mat.map) return;

    const atlasW = meta.atlasWidth;
    const atlasH = meta.atlasHeight;

    const camPos = camera.position.clone();
    const angle = Math.atan2(camPos.x - position[0], camPos.z - position[2]);
    const totalAngles = meta.entries.length;
    const normalizedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const angleIndex = Math.round((normalizedAngle / (Math.PI * 2)) * totalAngles) % totalAngles;

    const entry = meta.entries[angleIndex];
    if (!entry) return;

    const uvOffsetX = entry.x / atlasW;
    const uvScaleX = entry.w / atlasW;
    const uvScaleY = entry.h / atlasH;
    const uvOffsetY = 1.0 - (entry.y + entry.h) / atlasH;

    mat.map.offset.set(uvOffsetX, uvOffsetY);
    mat.map.repeat.set(uvScaleX, uvScaleY);
    mat.map.needsUpdate = true;
  });

  if (loading) return null;
  if (error) {
    console.error('[BakedSpriteViewer]', error);
    return null;
  }

  return (
    <sprite ref={spriteRef} position={position} scale={[scale, scale, 1]}>
      <spriteMaterial
        map={materialRef.current?.map ?? undefined}
        transparent
        depthWrite={false}
      />
    </sprite>
  );
};

interface BakedBuildingFieldProps {
  atlasUrl: string;
  metadataUrl: string;
  worldPositions: Array<{
    x: number;
    y: number;
    z?: number;
  }>;
  playerPos?: { x: number; y: number };
  scale?: number;
  heightOffset?: number;
}

export const BakedBuildingField: React.FC<BakedBuildingFieldProps> = ({
  atlasUrl,
  metadataUrl,
  worldPositions,
  playerPos = { x: 0, y: 0 },
  scale = 4,
  heightOffset = 0,
}) => {
  const { camera } = useThree();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const metadataRef = useRef<AtlasMetadata | null>(null);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const instancedCount = worldPositions.length;

  useEffect(() => {
    let cancelled = false;

    Promise.all([loadAtlasMetadata(metadataUrl), loadAtlasTexture(atlasUrl)])
      .then(([meta, tex]) => {
        if (cancelled) return;
        metadataRef.current = meta;
        const mat = new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        materialRef.current = mat;
        if (meshRef.current) {
          meshRef.current.material = mat;
        }
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      if (materialRef.current) {
        materialRef.current.map?.dispose();
        materialRef.current.dispose();
        materialRef.current = null;
      }
    };
  }, [atlasUrl, metadataUrl]);

  useFrame(() => {
    const mat = materialRef.current;
    const meta = metadataRef.current;
    if (!mat || !meta || !mat.map || !meshRef.current) return;

    const atlasW = meta.atlasWidth;
    const atlasH = meta.atlasHeight;

    const dummy = new THREE.Object3D();
    const px = playerPos.x;
    const py = playerPos.y;

    for (let i = 0; i < worldPositions.length; i++) {
      const wp = worldPositions[i];
      dummy.position.set(wp.x - px, (wp.z ?? 0) + heightOffset, wp.y - py);
      dummy.scale.set(scale, scale, 1);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;

    const camPos = camera.position.clone();
    const angle = Math.atan2(camPos.x - (worldPositions[0].x - px), camPos.z - (worldPositions[0].y - py));
    const totalAngles = meta.entries.length;
    const normalizedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const angleIndex = Math.round((normalizedAngle / (Math.PI * 2)) * totalAngles) % totalAngles;

    const entry = meta.entries[angleIndex];
    if (!entry) return;

    mat.map.offset.set(entry.x / atlasW, 1.0 - (entry.y + entry.h) / atlasH);
    mat.map.repeat.set(entry.w / atlasW, entry.h / atlasH);
    mat.map.needsUpdate = true;
    meshRef.current.visible = true;
  });

  if (loading || error) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, instancedCount]}
    >
      <planeGeometry args={[1, 1]} />
    </instancedMesh>
  );
};

export { loadAtlasMetadata, loadAtlasTexture };
export type { AtlasEntry, AtlasMetadata };
