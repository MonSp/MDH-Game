export type BuildingKind = 'capital' | 'city' | 'fortress' | 'watchtower' | 'camp' | 'temple' | 'manor';

export interface BuildingWalls {
  outer: Array<{ x: number; y: number; w: number; h: number }>;
  inner: Array<{ x: number; y: number; w: number; h: number }>;
  doors: Array<{ x: number; y: number; direction: 'north' | 'south' | 'east' | 'west' }>;
}

export interface BuildingDef {
  kind: BuildingKind;
  label: string;
  width: number;
  depth: number;
  height: number;
  roofHeight: number;
  wallColor: string;
  roofColor: string;
  roofType: 'flat' | 'sloped' | 'pagoda';
  interior: BuildingWalls;
}

const PAGODA_ROOF_COLORS: Record<string, { wall: string; roof: string }> = {
  '秦': { wall: '#8b4513', roof: '#1a1a2e' },
  '楚': { wall: '#6b21a8', roof: '#3b0764' },
  '齐': { wall: '#1e40af', roof: '#172554' },
  '燕': { wall: '#155e75', roof: '#0e3847' },
  '赵': { wall: '#9a3412', roof: '#5c1a07' },
  '魏': { wall: '#166534', roof: '#0a3214' },
  '韩': { wall: '#a16207', roof: '#4a2e02' },
};

function makeRec(x: number, y: number, w: number, h: number) {
  return { x, y, w: w > 0 ? w : -w, h: h > 0 ? h : -h };
}

export function getBuildingDef(kind: BuildingKind, country?: string): BuildingDef {
  const palette = country ? PAGODA_ROOF_COLORS[country] : undefined;

  switch (kind) {
    case 'capital':
      return {
        kind: 'capital', label: '都城', width: 10, depth: 8, height: 7, roofHeight: 3,
        wallColor: palette?.wall ?? '#8b7355',
        roofColor: palette?.roof ?? '#2d1f0e',
        roofType: 'pagoda',
        interior: {
          doors: [{ x: 4, y: 7, direction: 'north' }],
          outer: [
            makeRec(0, 0, 10, 1), makeRec(0, 7, 10, 1),
            makeRec(0, 1, 1, 6), makeRec(9, 1, 1, 6),
          ],
          inner: [
            makeRec(4, 3, 2, 1),
            makeRec(1, 1, 3, 1), makeRec(6, 1, 3, 1),
            makeRec(1, 6, 3, 1), makeRec(6, 6, 3, 1),
          ],
        },
      };

    case 'city':
      return {
        kind: 'city', label: '城池', width: 8, depth: 6, height: 6, roofHeight: 2.5,
        wallColor: palette?.wall ?? '#8b7355',
        roofColor: palette?.roof ?? '#2d1f0e',
        roofType: 'pagoda',
        interior: {
          doors: [{ x: 3, y: 5, direction: 'north' }],
          outer: [
            makeRec(0, 0, 8, 1), makeRec(0, 5, 8, 1),
            makeRec(0, 1, 1, 4), makeRec(7, 1, 1, 4),
          ],
          inner: [
            makeRec(2, 2, 4, 1),
            makeRec(1, 1, 2, 1), makeRec(5, 1, 2, 1),
          ],
        },
      };

    case 'fortress':
      return {
        kind: 'fortress', label: '要塞', width: 8, depth: 6, height: 5, roofHeight: 2,
        wallColor: '#4a4a4a',
        roofColor: '#1a1a1a',
        roofType: 'flat',
        interior: {
          doors: [{ x: 3, y: 5, direction: 'north' }],
          outer: [
            makeRec(0, 0, 8, 1), makeRec(0, 5, 8, 1),
            makeRec(0, 1, 1, 4), makeRec(7, 1, 1, 4),
          ],
          inner: [
            makeRec(2, 2, 4, 1),
            makeRec(0, 1, 2, 1), makeRec(6, 1, 2, 1),
            makeRec(0, 4, 2, 1), makeRec(6, 4, 2, 1),
          ],
        },
      };

    case 'watchtower':
      return {
        kind: 'watchtower', label: '哨塔', width: 4, depth: 4, height: 6, roofHeight: 1.5,
        wallColor: '#6b5b4a',
        roofColor: '#3a2a1a',
        roofType: 'sloped',
        interior: {
          doors: [{ x: 1, y: 3, direction: 'north' }],
          outer: [
            makeRec(0, 0, 4, 1), makeRec(0, 3, 4, 1),
            makeRec(0, 1, 1, 2), makeRec(3, 1, 1, 2),
          ],
          inner: [],
        },
      };

    case 'camp':
      return {
        kind: 'camp', label: '营地', width: 6, depth: 5, height: 2, roofHeight: 0.5,
        wallColor: '#7a6a4a',
        roofColor: '#5a4a2a',
        roofType: 'sloped',
        interior: {
          doors: [{ x: 2, y: 4, direction: 'north' }, { x: 4, y: 4, direction: 'north' }],
          outer: [
            makeRec(0, 0, 6, 1), makeRec(0, 4, 2, 1),
            makeRec(3, 4, 3, 1),
            makeRec(0, 1, 1, 3), makeRec(5, 1, 1, 3),
          ],
          inner: [
            makeRec(2, 2, 3, 1),
            makeRec(2, 1, 1, 1), makeRec(4, 1, 1, 1),
          ],
        },
      };

    case 'temple':
      return {
        kind: 'temple', label: '大殿', width: 9, depth: 7, height: 6, roofHeight: 2.5,
        wallColor: '#c4a35a',
        roofColor: '#4a2800',
        roofType: 'pagoda',
        interior: {
          doors: [{ x: 4, y: 6, direction: 'north' }],
          outer: [
            makeRec(0, 0, 9, 1), makeRec(0, 6, 9, 1),
            makeRec(0, 1, 1, 5), makeRec(8, 1, 1, 5),
          ],
          inner: [
            makeRec(3, 2, 3, 1),
            makeRec(1, 1, 2, 1), makeRec(6, 1, 2, 1),
            makeRec(0, 4, 9, 1),
          ],
        },
      };

    case 'manor':
      return {
        kind: 'manor', label: '庄园', width: 7, depth: 6, height: 3, roofHeight: 1.5,
        wallColor: '#a09080',
        roofColor: '#4a3a2a',
        roofType: 'sloped',
        interior: {
          doors: [{ x: 3, y: 5, direction: 'north' }],
          outer: [
            makeRec(0, 0, 7, 1), makeRec(0, 5, 7, 1),
            makeRec(0, 1, 1, 4), makeRec(6, 1, 1, 4),
          ],
          inner: [
            makeRec(2, 1, 3, 1),
            makeRec(1, 4, 5, 1),
            makeRec(2, 2, 1, 2),
          ],
        },
      };

    default:
      return getBuildingDef('city', country);
  }
}
