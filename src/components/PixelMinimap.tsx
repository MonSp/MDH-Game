import { useRef, useEffect } from 'react';
import { getTerrainTile } from '../utils/terrain';
import { TerrainType } from '../shared/types/map';

interface PixelMinimapProps {
  /** Player position in world coords */
  playerX: number;
  playerY: number;
  /** Array of {x, y, color?} for nearby NPCs */
  npcs?: { x: number; y: number; color?: string }[];
  /** Array of {x, y, color?} for wild monsters */
  monsters?: { x: number; y: number; color?: string }[];
  /** Array of {x, y, color?} for resource points */
  resources?: { x: number; y: number; color?: string }[];
  /** Array of {x, y, color?} for faction/city points */
  points?: { x: number; y: number; color?: string; label?: string }[];
  /** Explored tile set ("x,y" strings) */
  exploredTiles?: Set<string>;
  /** Width/height in pixels */
  size?: number;
  /** How many world tiles per minimap pixel */
  scale?: number;
  /** Extra classes */
  className?: string;
}

const TERRAIN_COLORS: Record<string, string> = {
  [TerrainType.DEEP_WATER]: '#075985',
  [TerrainType.SHALLOW_WATER]: '#0ea5e9',
  [TerrainType.SAND]: '#eab308',
  [TerrainType.GRASS]: '#4ade80',
  [TerrainType.FOREST]: '#15803d',
  [TerrainType.ROCK]: '#78716c',
  [TerrainType.MOUNTAIN]: '#44403c',
  [TerrainType.SNOW]: '#f8fafc',
  [TerrainType.ROAD]: '#a8a29e',
};

export const PixelMinimap = ({
  playerX,
  playerY,
  npcs = [],
  monsters = [],
  resources = [],
  points = [],
  exploredTiles: _exploredTiles,
  size = 160,
  scale = 20,
  className = '',
}: PixelMinimapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const halfWorld = size / 2;
    const halfScale = scale / 2;
    const worldOffsetX = playerX - halfWorld * scale;
    const worldOffsetY = playerY - halfWorld * scale;

    // Clear
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, size, size);

    // Draw terrain tiles
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const wx = Math.round(worldOffsetX + px * scale + halfScale);
        const wy = Math.round(worldOffsetY + py * scale + halfScale);
        const tile = getTerrainTile(wx, wy);
        ctx.fillStyle = TERRAIN_COLORS[tile.biome] || '#18181b';
        ctx.fillRect(px, py, 1, 1);
      }
    }

    // Draw points of interest (cities, faction bases)
    for (const pt of points) {
      const sx = (pt.x - worldOffsetX) / scale;
      const sy = (pt.y - worldOffsetY) / scale;
      if (sx < 0 || sx >= size || sy < 0 || sy >= size) continue;
      ctx.fillStyle = pt.color || '#fbbf24';
      ctx.fillRect(Math.round(sx) - 1, Math.round(sy) - 1, 3, 3);
      if (pt.label) {
        ctx.fillStyle = '#e4e4e7';
        ctx.font = '6px monospace';
        ctx.fillText(pt.label, Math.round(sx) + 2, Math.round(sy) + 3);
      }
    }

    // Draw resources
    for (const res of resources) {
      const sx = (res.x - worldOffsetX) / scale;
      const sy = (res.y - worldOffsetY) / scale;
      if (sx < 0 || sx >= size || sy < 0 || sy >= size) continue;
      ctx.fillStyle = res.color || '#a78bfa';
      ctx.fillRect(Math.round(sx), Math.round(sy), 2, 2);
    }

    // Draw NPCs
    for (const npc of npcs) {
      const sx = (npc.x - worldOffsetX) / scale;
      const sy = (npc.y - worldOffsetY) / scale;
      if (sx < 0 || sx >= size || sy < 0 || sy >= size) continue;
      ctx.fillStyle = npc.color || '#22d3ee';
      ctx.fillRect(Math.round(sx), Math.round(sy), 2, 2);
    }

    // Draw monsters
    for (const mon of monsters) {
      const sx = (mon.x - worldOffsetX) / scale;
      const sy = (mon.y - worldOffsetY) / scale;
      if (sx < 0 || sx >= size || sy < 0 || sy >= size) continue;
      ctx.fillStyle = mon.color || '#ef4444';
      ctx.fillRect(Math.round(sx), Math.round(sy), 2, 2);
    }

    // Draw player (bright white dot)
    const playerSx = size / 2;
    const playerSy = size / 2;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(playerSx) - 1, Math.round(playerSy) - 1, 3, 3);
    // Player pulse ring
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(playerSx) - 3, Math.round(playerSy) - 3, 7, 7);

    // Border frame
    ctx.strokeStyle = '#52525b';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);

    // Pixel corner ornaments
    ctx.fillStyle = '#f59e0b';
    const cs = 3;
    // top-left
    ctx.fillRect(2, 2, cs, 1);
    ctx.fillRect(2, 2, 1, cs);
    // top-right
    ctx.fillRect(size - 2 - cs, 2, cs, 1);
    ctx.fillRect(size - 3, 2, 1, cs);
    // bottom-left
    ctx.fillRect(2, size - 3, cs, 1);
    ctx.fillRect(2, size - 2 - cs, 1, cs);
    // bottom-right
    ctx.fillRect(size - 2 - cs, size - 3, cs, 1);
    ctx.fillRect(size - 3, size - 2 - cs, 1, cs);

  }, [playerX, playerY, npcs, monsters, resources, points, size, scale]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`rounded border border-zinc-700 ${className}`}
      style={{ imageRendering: 'pixelated', width: size, height: size }}
    />
  );
};
