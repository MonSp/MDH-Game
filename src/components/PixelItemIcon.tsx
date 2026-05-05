import { useMemo } from 'react';
import { getItemIconDataURL } from '../utils/pixelSpriteGenerator';

interface PixelItemIconProps {
  itemName: string;
  size?: number;
  className?: string;
}

export const PixelItemIcon = ({ itemName, size = 16, className = '' }: PixelItemIconProps) => {
  const dataUrl = useMemo(() => getItemIconDataURL(itemName), [itemName]);

  if (!dataUrl) return null;

  return (
    <img
      src={dataUrl}
      alt={itemName}
      className={`inline-block pixel-art ${className}`}
      style={{
        width: size,
        height: size,
        imageRendering: 'pixelated',
        verticalAlign: 'middle',
      }}
    />
  );
};
