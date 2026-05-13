import React from 'react';
import { BakedBuildingField } from './BakedSpriteViewer';
import { COUNTRIES_DATA, COUNTRIES } from '../store/gameConstants';
import { useGameStore } from '../store/gameStore';

interface BakedCapitalFieldProps {
  atlasUrl?: string;
  metadataUrl?: string;
  scale?: number;
  heightOffset?: number;
}

export const BakedCapitalField: React.FC<BakedCapitalFieldProps> = ({
  atlasUrl = '/atlas/buildings.atlas.png',
  metadataUrl = '/atlas/buildings.atlas.json',
  scale = 4,
  heightOffset = 8,
}) => {
  const playerPos = useGameStore((s) => s.player?.position);

  const worldPositions = React.useMemo(() => {
    return COUNTRIES.map((country) => {
      const info = COUNTRIES_DATA[country];
      return {
        x: info.capital.x,
        y: info.capital.y,
        z: 0,
      };
    });
  }, []);

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
