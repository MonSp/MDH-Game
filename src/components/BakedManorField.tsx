import React from 'react';
import { BakedBuildingField } from './BakedSpriteViewer';
import { useGameStore, getClanTerritoryCenter } from '../store/gameStore';

interface BakedManorFieldProps {
  atlasUrl?: string;
  metadataUrl?: string;
  scale?: number;
  heightOffset?: number;
}

export const BakedManorField: React.FC<BakedManorFieldProps> = ({
  atlasUrl = '/atlas/buildings.atlas.png',
  metadataUrl = '/atlas/buildings.atlas.json',
  scale = 4,
  heightOffset = 5,
}) => {
  const playerPos = useGameStore((s) => s.player?.position);
  const clans = useGameStore((s) => s.clans);
  const worldBuildings = useGameStore((s) => (s as any)._worldBuildings);

  const worldPositions = React.useMemo(() => {
    const positions: Array<{ x: number; y: number; z: number }> = [];

    if (worldBuildings && worldBuildings.length > 0) {
      for (const b of worldBuildings) {
        if (b.kind === 'manor') {
          positions.push({ x: b.worldX, y: b.worldY, z: 0 });
        }
      }
    } else {
      for (const clan of clans) {
        if (clan.isAscendingFamily) {
          const center = getClanTerritoryCenter(clan, clans);
          positions.push({ x: center.x, y: center.y, z: 0 });
        }
      }
      positions.push({ x: 315, y: 300, z: 0 });
    }

    return positions;
  }, [clans, worldBuildings]);

  if (worldPositions.length === 0) return null;

  const px = playerPos ?? { x: 0, y: 0 };

  return (
    <BakedBuildingField
      atlasUrl={atlasUrl}
      metadataUrl={metadataUrl}
      worldPositions={worldPositions}
      playerPos={px}
      scale={scale}
      heightOffset={heightOffset}
    />
  );
};
