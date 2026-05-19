import React, { useState, useEffect, useCallback } from 'react';
import { BlockType, BLOCK_COLORS } from './BlockTypes';
import { selectedBlock } from './PlayerState';

const HOTBAR_BLOCKS: BlockType[] = [
  BlockType.GRASS,
  BlockType.DIRT,
  BlockType.STONE,
  BlockType.SAND,
  BlockType.OAK_LOG,
  BlockType.OAK_LEAVES,
  BlockType.STONE_BRICK,
  BlockType.PLANK,
  BlockType.COBBLESTONE,
  BlockType.BRICK,
  BlockType.ROOF_TILE,
  BlockType.PILLAR,
  BlockType.STONE_PATH,
  BlockType.WINDOW,
  BlockType.LANTERN,
  BlockType.SMOOTH_SANDSTONE,
];

const BLOCK_NAMES: Record<number, string> = {
  [BlockType.AIR]: 'Air',
  [BlockType.GRASS]: 'Grass',
  [BlockType.DIRT]: 'Dirt',
  [BlockType.STONE]: 'Stone',
  [BlockType.SAND]: 'Sand',
  [BlockType.WATER]: 'Water',
  [BlockType.WOOD]: 'Wood',
  [BlockType.LEAVES]: 'Leaves',
  [BlockType.SNOW]: 'Snow',
  [BlockType.STONE_BRICK]: 'Stone Brick',
  [BlockType.PLANK]: 'Plank',
  [BlockType.COBBLESTONE]: 'Cobblestone',
  [BlockType.SMOOTH_STONE]: 'Smooth Stone',
  [BlockType.BRICK]: 'Brick',
  [BlockType.OAK_LOG]: 'Oak Log',
  [BlockType.SPRUCE_LOG]: 'Spruce Log',
  [BlockType.BIRCH_LOG]: 'Birch Log',
  [BlockType.OAK_LEAVES]: 'Oak Leaves',
  [BlockType.SPRUCE_LEAVES]: 'Spruce Leaves',
  [BlockType.BIRCH_LEAVES]: 'Birch Leaves',
  [BlockType.CHERRY_LEAVES]: 'Cherry Leaves',
  [BlockType.ROOF_TILE]: 'Roof Tile',
  [BlockType.PILLAR]: 'Pillar',
  [BlockType.FENCE]: 'Fence',
  [BlockType.STONE_PATH]: 'Stone Path',
  [BlockType.WINDOW]: 'Window',
  [BlockType.DOOR]: 'Door',
  [BlockType.LANTERN]: 'Lantern',
  [BlockType.SMOOTH_SANDSTONE]: 'Sandstone',
  [BlockType.NETHERRACK]: 'Netherrack',
  [BlockType.OBSIDIAN]: 'Obsidian',
  [BlockType.SPIRIT_FIELD]: 'Spirit Field',
  [BlockType.SPIRIT_ORE]: 'Spirit Ore',
  [BlockType.FISH_SPOT]: 'Fish Spot',
  [BlockType.LUMBER_FIELD]: 'Lumber',
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '4px',
    padding: '6px',
    background: 'rgba(0,0,0,0.5)',
    borderRadius: '8px',
    zIndex: 100,
    userSelect: 'none',
  },
  slot: {
    width: '48px',
    height: '48px',
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: '2px solid transparent',
    position: 'relative',
    transition: 'border-color 0.1s, transform 0.1s',
    boxSizing: 'border-box',
  },
  slotSelected: {
    borderColor: '#fff',
    transform: 'scale(1.1)',
  },
  swatch: {
    width: '24px',
    height: '24px',
    borderRadius: '3px',
  },
  label: {
    color: '#ccc',
    fontSize: '9px',
    marginTop: '2px',
    lineHeight: '1',
  },
  hint: {
    position: 'fixed',
    bottom: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '12px',
    fontFamily: 'monospace',
    pointerEvents: 'none',
    zIndex: 100,
  },
};

export const BlockWorldHUD: React.FC = () => {
  const [selected, setSelected] = useState<BlockType>(selectedBlock.type);

  const selectSlot = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, HOTBAR_BLOCKS.length - 1));
    const bt = HOTBAR_BLOCKS[clamped];
    selectedBlock.type = bt;
    setSelected(bt);
  }, []);

  useEffect(() => {
    selectedBlock.type = selected;
  }, [selected]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const num = parseInt(e.key);
      if (num >= 1 && num <= HOTBAR_BLOCKS.length) {
        selectSlot(num - 1);
      }
    };

    const onWheel = (e: WheelEvent) => {
      const idx = HOTBAR_BLOCKS.indexOf(selected);
      selectSlot(e.deltaY > 0 ? idx + 1 : idx - 1);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('wheel', onWheel);
    };
  }, [selected, selectSlot]);

  const toCssColor = (bt: BlockType): string => {
    const c = BLOCK_COLORS[bt] || [0.5, 0.5, 0.5];
    return `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;
  };

  return (
    <>
      <div style={styles.hint}>
        Left-click: break &nbsp;|&nbsp; Right-click: place &nbsp;|&nbsp; 1-9 / scroll: select block &nbsp;|&nbsp; E: interact NPC
      </div>
      <div style={styles.container}>
        {HOTBAR_BLOCKS.map((bt, i) => {
          const isSel = bt === selected;
          const slotStyle: React.CSSProperties = {
            ...styles.slot,
            ...(isSel ? styles.slotSelected : {}),
          };
          return (
            <div
              key={bt}
              style={slotStyle}
              onClick={() => selectSlot(i)}
            >
              <div style={{ ...styles.swatch, background: toCssColor(bt) }} />
              <div style={styles.label}>{i + 1}</div>
            </div>
          );
        })}
      </div>
    </>
  );
};
