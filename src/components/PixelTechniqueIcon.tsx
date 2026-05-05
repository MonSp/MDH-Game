import { useMemo } from 'react';
import { getTechniqueIconDataURL } from '../utils/pixelSpriteGenerator';

interface PixelTechniqueIconProps {
  techniqueId: string;
  size?: number;
  className?: string;
}

export const PixelTechniqueIcon = ({ techniqueId, size = 16, className = '' }: PixelTechniqueIconProps) => {
  const dataUrl = useMemo(() => getTechniqueIconDataURL(techniqueId), [techniqueId]);
  if (!dataUrl) return null;
  return (
    <img src={dataUrl} alt={techniqueId}
      className={`inline-block pixel-art rounded ${className}`}
      style={{ width: size, height: size, imageRendering: 'pixelated', verticalAlign: 'middle' }} />
  );
};
