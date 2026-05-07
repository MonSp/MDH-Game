import { BuildingDef, BuildingKind } from './BuildingTypes';

export type { BuildingKind };

/* ══════════════════════════════════════════
   七国配色
   ══════════════════════════════════════════ */
const PALETTE: Record<string, { wall: string; roof: string }> = {
  '秦': { wall: '#3a3020', roof: '#1a1a2e' },
  '楚': { wall: '#5a2a4a', roof: '#2a0a2a' },
  '齐': { wall: '#6b5b4a', roof: '#1a2a4a' },
  '燕': { wall: '#5a5040', roof: '#1a2a2a' },
  '赵': { wall: '#6a3a2a', roof: '#2a0a0a' },
  '魏': { wall: '#4a5a3a', roof: '#1a2a0a' },
  '韩': { wall: '#5a4a2a', roof: '#2a1a0a' },
};

/* ══════════════════════════════════════════
   七国都城
   ══════════════════════════════════════════ */

const QI_LINZI: BuildingDef = {
  kind: 'capital', label: '齐都·临淄', country: '齐', isCapital: true,
  compoundWidth: 48, compoundDepth: 40, wallHeight: 6, wallColor: PALETTE['齐'].wall,
  gates: [
    { x: 22, y: 0, direction: 'north', label: '北门' },
    { x: 22, y: 40, direction: 'south', label: '雍门' },
    { x: 0, y: 19, direction: 'west', label: '申门' },
    { x: 48, y: 19, direction: 'east', label: '东门' },
  ],
  roads: [
    { x: 14, y: 0, width: 3, depth: 40, color: '#b8956a' },
    { x: 32, y: 0, width: 3, depth: 40, color: '#b8956a' },
    { x: 0, y: 22, width: 48, depth: 3, color: '#b8956a' },
    { x: 0, y: 12, width: 48, depth: 2, color: '#c4a37a' },
    { x: 24, y: 0, width: 1.5, depth: 12, color: '#a08060' },
  ],
  guoBlocks: [
    { startX: 0, startY: 0, cols: 5, rows: 5, cellSize: 2.8, wallColor: PALETTE['齐'].wall, roofColor: PALETTE['齐'].roof },
    { startX: 35, startY: 0, cols: 4, rows: 5, cellSize: 3.0, wallColor: PALETTE['齐'].wall, roofColor: PALETTE['齐'].roof },
    { startX: 35, startY: 25, cols: 4, rows: 4, cellSize: 3.0, wallColor: PALETTE['齐'].wall, roofColor: PALETTE['齐'].roof },
    { startX: 0, startY: 25, cols: 5, rows: 4, cellSize: 2.8, wallColor: PALETTE['齐'].wall, roofColor: PALETTE['齐'].roof },
  ],
  palaceQuarter: {
    x: 16, y: 1, width: 16, depth: 11, wallHeight: 4, wallColor: '#c4a35a',
    gateX: 24, gateY: 12, gateDir: 'south', gateLabel: '宫门',
    floorColor: '#c4a35a',
    buildings: [
      { label: '桓公台大殿', x: 3, y: 1, width: 10, depth: 5, height: 8, roofType: 'pagoda', color: '#c4a35a', roofColor: '#1a2a4a' },
      { label: '宗庙', x: 1, y: 7, width: 5, depth: 3, height: 5, roofType: 'pagoda', color: '#b8956a', roofColor: '#1a2a4a' },
      { label: '社稷坛', x: 9, y: 7, width: 4, depth: 4, height: 3, roofType: 'flat', color: '#8a7a5a', roofColor: '#3a3a2a' },
    ],
  },
};

const CHU_YINGDU: BuildingDef = {
  kind: 'capital', label: '楚都·郢都', country: '楚', isCapital: true,
  compoundWidth: 46, compoundDepth: 38, wallHeight: 6, wallColor: PALETTE['楚'].wall,
  gates: [
    { x: 21, y: 0, direction: 'north', label: '北门' },
    { x: 21, y: 38, direction: 'south', label: '南门' },
    { x: 0, y: 18, direction: 'west', label: '西门' },
    { x: 46, y: 18, direction: 'east', label: '龙门' },
  ],
  roads: [
    { x: 15, y: 0, width: 3, depth: 38, color: '#b8956a' },
    { x: 31, y: 0, width: 3, depth: 38, color: '#b8956a' },
    { x: 0, y: 20, width: 46, depth: 3, color: '#b8956a' },
    { x: 0, y: 10, width: 46, depth: 2, color: '#c4a37a' },
  ],
  guoBlocks: [
    { startX: 0, startY: 0, cols: 5, rows: 5, cellSize: 3.0, wallColor: PALETTE['楚'].wall, roofColor: PALETTE['楚'].roof },
    { startX: 33, startY: 0, cols: 4, rows: 5, cellSize: 3.0, wallColor: PALETTE['楚'].wall, roofColor: PALETTE['楚'].roof },
    { startX: 0, startY: 22, cols: 5, rows: 4, cellSize: 3.0, wallColor: PALETTE['楚'].wall, roofColor: PALETTE['楚'].roof },
    { startX: 33, startY: 22, cols: 4, rows: 4, cellSize: 3.0, wallColor: PALETTE['楚'].wall, roofColor: PALETTE['楚'].roof },
  ],
  palaceQuarter: {
    x: 16, y: 1, width: 14, depth: 9, wallHeight: 4, wallColor: '#8a5a3a',
    gateX: 23, gateY: 10, gateDir: 'south', gateLabel: '宫门',
    buildings: [
      { label: '章华台', x: 2, y: 1, width: 10, depth: 5, height: 10, roofType: 'pagoda', color: '#6b21a8', roofColor: '#2a0a2a' },
      { label: '太庙', x: 1, y: 7, width: 5, depth: 2, height: 5, roofType: 'pagoda', color: '#7b31b8', roofColor: '#2a0a2a' },
      { label: '巫祝台', x: 7, y: 7, width: 5, depth: 2, height: 5, roofType: 'sloped', color: '#5a1a3a', roofColor: '#2a0a2a' },
    ],
  },
};

const QIN_XIANYANG: BuildingDef = {
  kind: 'capital', label: '秦都·咸阳', country: '秦', isCapital: true,
  compoundWidth: 46, compoundDepth: 38, wallHeight: 0, wallColor: PALETTE['秦'].wall,
  noWall: true,
  gates: [
    { x: 22, y: 0, direction: 'north', label: '' },
    { x: 22, y: 38, direction: 'south', label: '' },
    { x: 0, y: 18, direction: 'west', label: '' },
    { x: 46, y: 18, direction: 'east', label: '' },
  ],
  roads: [
    { x: 22, y: 0, width: 3, depth: 38, color: '#b8956a' },
    { x: 0, y: 18, width: 46, depth: 3, color: '#b8956a' },
    { x: 0, y: 10, width: 46, depth: 2, color: '#c4a37a' },
  ],
  guoBlocks: [
    { startX: 0, startY: 0, cols: 7, rows: 5, cellSize: 3.0, wallColor: PALETTE['秦'].wall, roofColor: PALETTE['秦'].roof },
    { startX: 0, startY: 20, cols: 7, rows: 5, cellSize: 3.0, wallColor: PALETTE['秦'].wall, roofColor: PALETTE['秦'].roof },
  ],
  palaceQuarter: {
    x: 14, y: 2, width: 18, depth: 8, wallHeight: 3, wallColor: '#8a6a4a',
    gateX: 23, gateY: 10, gateDir: 'south', gateLabel: '冀阙',
    floorColor: '#8a6a4a',
    buildings: [
      { label: '咸阳宫正殿', x: 3, y: 1, width: 12, depth: 4, height: 9, roofType: 'pagoda', color: '#8b4513', roofColor: '#1a1a2e' },
      { label: '兴乐宫', x: 1, y: 6, width: 6, depth: 2, height: 5, roofType: 'pagoda', color: '#7a3a1a', roofColor: '#1a1a2e' },
      { label: '章台宫', x: 9, y: 6, width: 6, depth: 2, height: 5, roofType: 'pagoda', color: '#7a3a1a', roofColor: '#1a1a2e' },
    ],
  },
};

const ZHAO_HANDAN: BuildingDef = {
  kind: 'capital', label: '赵都·邯郸', country: '赵', isCapital: true,
  compoundWidth: 46, compoundDepth: 38, wallHeight: 6, wallColor: PALETTE['赵'].wall,
  gates: [
    { x: 10, y: 0, direction: 'north', label: '北门' },
    { x: 35, y: 0, direction: 'north', label: '丛台门' },
    { x: 22, y: 38, direction: 'south', label: '南门' },
    { x: 0, y: 18, direction: 'west', label: '西门' },
    { x: 46, y: 18, direction: 'east', label: '东门' },
  ],
  roads: [
    { x: 13, y: 0, width: 3, depth: 38, color: '#b8956a' },
    { x: 32, y: 0, width: 3, depth: 38, color: '#b8956a' },
    { x: 0, y: 20, width: 46, depth: 3, color: '#b8956a' },
    { x: 0, y: 11, width: 46, depth: 2, color: '#c4a37a' },
  ],
  guoBlocks: [
    { startX: 0, startY: 0, cols: 4, rows: 5, cellSize: 3.2, wallColor: PALETTE['赵'].wall, roofColor: PALETTE['赵'].roof },
    { startX: 35, startY: 0, cols: 3, rows: 5, cellSize: 3.2, wallColor: PALETTE['赵'].wall, roofColor: PALETTE['赵'].roof },
    { startX: 0, startY: 22, cols: 4, rows: 4, cellSize: 3.2, wallColor: PALETTE['赵'].wall, roofColor: PALETTE['赵'].roof },
    { startX: 35, startY: 22, cols: 3, rows: 4, cellSize: 3.2, wallColor: PALETTE['赵'].wall, roofColor: PALETTE['赵'].roof },
  ],
  palaceQuarter: {
    x: 13, y: 1, width: 19, depth: 9, wallHeight: 5, wallColor: '#8b4513',
    gateX: 22, gateY: 10, gateDir: 'south', gateLabel: '宫门',
    buildings: [
      { label: '龙台大殿', x: 3, y: 1, width: 12, depth: 4, height: 12, roofType: 'pagoda', color: '#8b4513', roofColor: '#2a0a0a' },
      { label: '赵王寝宫', x: 1, y: 7, width: 7, depth: 2, height: 5, roofType: 'pagoda', color: '#9a3412', roofColor: '#2a0a0a' },
      { label: '宗庙', x: 10, y: 7, width: 5, depth: 2, height: 4, roofType: 'pagoda', color: '#9a3412', roofColor: '#2a0a0a' },
    ],
  },
};

const YAN_JICHENG: BuildingDef = {
  kind: 'capital', label: '燕都·蓟城', country: '燕', isCapital: true,
  compoundWidth: 40, compoundDepth: 32, wallHeight: 5, wallColor: PALETTE['燕'].wall,
  gates: [
    { x: 19, y: 0, direction: 'north', label: '北门' },
    { x: 19, y: 32, direction: 'south', label: '南门' },
    { x: 0, y: 15, direction: 'west', label: '西门' },
    { x: 40, y: 15, direction: 'east', label: '东门' },
  ],
  roads: [
    { x: 19, y: 0, width: 3, depth: 32, color: '#b8956a' },
    { x: 0, y: 15, width: 40, depth: 3, color: '#b8956a' },
  ],
  guoBlocks: [
    { startX: 0, startY: 0, cols: 6, rows: 5, cellSize: 3.0, wallColor: PALETTE['燕'].wall, roofColor: PALETTE['燕'].roof },
    { startX: 0, startY: 17, cols: 6, rows: 4, cellSize: 3.0, wallColor: PALETTE['燕'].wall, roofColor: PALETTE['燕'].roof },
  ],
  palaceQuarter: {
    x: 12, y: 2, width: 16, depth: 8, wallHeight: 4, wallColor: '#9a8070',
    gateX: 20, gateY: 10, gateDir: 'south', gateLabel: '宫门',
    buildings: [
      { label: '燕王宫', x: 3, y: 1, width: 10, depth: 4, height: 7, roofType: 'pagoda', color: '#8a7060', roofColor: '#1a2a2a' },
      { label: '宗庙', x: 1, y: 6, width: 5, depth: 2, height: 4, roofType: 'pagoda', color: '#9a8070', roofColor: '#1a2a2a' },
      { label: '社稷坛', x: 8, y: 6, width: 4, depth: 2, height: 3, roofType: 'flat', color: '#8a7a5a', roofColor: '#3a3a2a' },
    ],
  },
};

const WEI_DALIANG: BuildingDef = {
  kind: 'capital', label: '魏都·大梁', country: '魏', isCapital: true,
  compoundWidth: 46, compoundDepth: 38, wallHeight: 7, wallColor: PALETTE['魏'].wall,
  gates: [
    { x: 22, y: 0, direction: 'north', label: '北门' },
    { x: 22, y: 38, direction: 'south', label: '南门' },
    { x: 0, y: 18, direction: 'west', label: '西门' },
    { x: 46, y: 18, direction: 'east', label: '东门' },
  ],
  roads: [
    { x: 15, y: 0, width: 3, depth: 38, color: '#b8956a' },
    { x: 31, y: 0, width: 3, depth: 38, color: '#b8956a' },
    { x: 0, y: 20, width: 46, depth: 3, color: '#b8956a' },
    { x: 0, y: 11, width: 46, depth: 2, color: '#c4a37a' },
    { x: 23, y: 0, width: 2, depth: 38, color: '#0ea5e9' },
  ],
  guoBlocks: [
    { startX: 0, startY: 0, cols: 5, rows: 5, cellSize: 3.0, wallColor: PALETTE['魏'].wall, roofColor: PALETTE['魏'].roof },
    { startX: 33, startY: 0, cols: 4, rows: 5, cellSize: 3.0, wallColor: PALETTE['魏'].wall, roofColor: PALETTE['魏'].roof },
    { startX: 0, startY: 22, cols: 5, rows: 4, cellSize: 3.0, wallColor: PALETTE['魏'].wall, roofColor: PALETTE['魏'].roof },
    { startX: 33, startY: 22, cols: 4, rows: 4, cellSize: 3.0, wallColor: PALETTE['魏'].wall, roofColor: PALETTE['魏'].roof },
  ],
  palaceQuarter: {
    x: 14, y: 1, width: 15, depth: 9, wallHeight: 5, wallColor: '#4a5a3a',
    gateX: 21, gateY: 10, gateDir: 'south', gateLabel: '宫门',
    floorColor: '#5a6a4a',
    buildings: [
      { label: '魏王宫', x: 2, y: 1, width: 11, depth: 4, height: 8, roofType: 'pagoda', color: '#4a5a3a', roofColor: '#1a2a0a' },
      { label: '宗庙', x: 1, y: 7, width: 5, depth: 2, height: 5, roofType: 'pagoda', color: '#8a9a7a', roofColor: '#1a2a0a' },
      { label: '武库', x: 7, y: 7, width: 4, depth: 2, height: 4, roofType: 'flat', color: '#7a6a5a', roofColor: '#2a2a2a' },
    ],
  },
};

const HAN_XINZHENG: BuildingDef = {
  kind: 'capital', label: '韩都·新郑', country: '韩', isCapital: true,
  compoundWidth: 36, compoundDepth: 30, wallHeight: 5, wallColor: PALETTE['韩'].wall,
  gates: [
    { x: 17, y: 0, direction: 'north', label: '北门' },
    { x: 17, y: 30, direction: 'south', label: '南门' },
    { x: 0, y: 14, direction: 'west', label: '西门' },
    { x: 36, y: 14, direction: 'east', label: '东门' },
  ],
  roads: [
    { x: 17, y: 0, width: 3, depth: 30, color: '#b8956a' },
    { x: 0, y: 14, width: 36, depth: 3, color: '#b8956a' },
  ],
  guoBlocks: [
    { startX: 0, startY: 0, cols: 5, rows: 4, cellSize: 3.2, wallColor: PALETTE['韩'].wall, roofColor: PALETTE['韩'].roof },
    { startX: 0, startY: 16, cols: 5, rows: 4, cellSize: 3.2, wallColor: PALETTE['韩'].wall, roofColor: PALETTE['韩'].roof },
  ],
  palaceQuarter: {
    x: 10, y: 1, width: 16, depth: 8, wallHeight: 4, wallColor: '#8a6a40',
    gateX: 18, gateY: 9, gateDir: 'south', gateLabel: '宫门',
    buildings: [
      { label: '韩王宫', x: 3, y: 1, width: 10, depth: 4, height: 7, roofType: 'pagoda', color: '#8a6a4a', roofColor: '#2a1a0a' },
      { label: '宗庙', x: 1, y: 6, width: 5, depth: 2, height: 4, roofType: 'pagoda', color: '#9a7a5a', roofColor: '#2a1a0a' },
      { label: '兵器坊', x: 8, y: 6, width: 5, depth: 2, height: 3, roofType: 'sloped', color: '#6a5a4a', roofColor: '#3a2a1a' },
    ],
  },
};

/** 七国都城字典 */
export const COUNTRY_CAPITALS: Record<string, BuildingDef> = {
  '齐': QI_LINZI, '楚': CHU_YINGDU, '秦': QIN_XIANYANG,
  '赵': ZHAO_HANDAN, '燕': YAN_JICHENG, '魏': WEI_DALIANG,
  '韩': HAN_XINZHENG,
};

/* ══════════════════════════════════════════
   工厂函数
   ══════════════════════════════════════════ */

/** 族地：缩小版都城 */
export function makeManorDef(country: string): BuildingDef {
  const p = PALETTE[country] || PALETTE['齐'];
  return {
    kind: 'manor', label: '族地', country, isCapital: false,
    compoundWidth: 24, compoundDepth: 18, wallHeight: 3, wallColor: p.wall,
    gates: [
      { x: 11, y: 0, direction: 'north', label: '正门' },
      { x: 11, y: 18, direction: 'south', label: '后门' },
    ],
    roads: [{ x: 11, y: 0, width: 2, depth: 18, color: '#b8956a' }],
    guoBlocks: [
      { startX: 0, startY: 10, cols: 5, rows: 3, cellSize: 2.2, wallColor: p.wall, roofColor: p.roof },
      { startX: 13, startY: 10, cols: 4, rows: 3, cellSize: 2.5, wallColor: p.wall, roofColor: p.roof },
    ],
    palaceQuarter: {
      x: 3, y: 1, width: 18, depth: 8, wallHeight: 2, wallColor: '#c4a35a',
      gateX: 12, gateY: 9, gateDir: 'south', gateLabel: '正门',
      floorColor: '#c4a35a',
      buildings: [
        { label: '议事厅', x: 5, y: 1, width: 8, depth: 3, height: 4, roofType: 'pagoda', color: '#c4a35a', roofColor: p.roof },
        { label: '练功房', x: 1, y: 5, width: 4, depth: 2, height: 3, roofType: 'sloped', color: '#9a8a6a', roofColor: '#4a3a2a' },
        { label: '丹房', x: 7, y: 5, width: 4, depth: 2, height: 3, roofType: 'sloped', color: '#8a9a7a', roofColor: '#3a4a2a' },
        { label: '藏经阁', x: 12, y: 5, width: 3, depth: 2, height: 4, roofType: 'pagoda', color: '#a080c0', roofColor: '#3a2a4a' },
      ],
    },
  };
}

/** 城池：中型城市 */
export function makeCityDef(country: string, label: string): BuildingDef {
  const p = PALETTE[country] || PALETTE['齐'];
  return {
    kind: 'city', label, country, isCapital: false,
    compoundWidth: 22, compoundDepth: 18, wallHeight: 4, wallColor: p.wall,
    gates: [
      { x: 10, y: 0, direction: 'north', label: '正门' },
      { x: 10, y: 18, direction: 'south', label: '南门' },
    ],
    roads: [
      { x: 10, y: 0, width: 2, depth: 18, color: '#b8956a' },
      { x: 0, y: 9, width: 22, depth: 2, color: '#b8956a' },
    ],
    guoBlocks: [
      { startX: 0, startY: 0, cols: 4, rows: 3, cellSize: 2.5, wallColor: p.wall, roofColor: p.roof },
      { startX: 13, startY: 0, cols: 3, rows: 3, cellSize: 2.5, wallColor: p.wall, roofColor: p.roof },
      { startX: 0, startY: 10, cols: 4, rows: 3, cellSize: 2.5, wallColor: p.wall, roofColor: p.roof },
      { startX: 13, startY: 10, cols: 3, rows: 3, cellSize: 2.5, wallColor: p.wall, roofColor: p.roof },
    ],
    palaceQuarter: {
      x: 4, y: 2, width: 14, depth: 6, wallHeight: 3, wallColor: '#c4a35a',
      gateX: 11, gateY: 8, gateDir: 'south', gateLabel: '府门',
      buildings: [
        { label: '城主府', x: 3, y: 1, width: 8, depth: 3, height: 4, roofType: 'pagoda', color: '#c4a35a', roofColor: p.roof },
        { label: '练功房', x: 1, y: 5, width: 4, depth: 1, height: 3, roofType: 'sloped', color: '#9a8a6a', roofColor: '#4a3a2a' },
        { label: '库房', x: 9, y: 5, width: 4, depth: 1, height: 3, roofType: 'flat', color: '#7a6a5a', roofColor: '#2a2a2a' },
      ],
    },
  };
}

/* ══════════════════════════════════════════
   API
   ══════════════════════════════════════════ */

export function getBuildingDef(kind: BuildingKind, country?: string): BuildingDef {
  if (kind === 'capital' && country) {
    return COUNTRY_CAPITALS[country] || WEI_DALIANG;
  }
  if (kind === 'manor') return makeManorDef(country || '齐');
  if (kind === 'city') return makeCityDef(country || '齐', '城池');
  return makeCityDef(country || '齐', kind);
}

export function getCountryCapital(country: string): BuildingDef {
  return COUNTRY_CAPITALS[country] || WEI_DALIANG;
}
