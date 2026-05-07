export type BuildingKind = 'capital' | 'city' | 'fortress' | 'watchtower' | 'camp' | 'palace' | 'manor';

/* ──── 道路 ──── */
export interface CityRoad {
  x: number; y: number;
  width: number; depth: number;
  color: string;
}

/* ──── 单体建筑（宫城/族地手摆） ──── */
export interface InnerBuilding {
  label: string;
  x: number; y: number;
  width: number; depth: number;
  height: number;
  roofType: 'pagoda' | 'sloped' | 'flat';
  color: string;
  roofColor: string;
}

/* ──── 城门 ──── */
export interface CityGate {
  x: number; y: number;
  direction: 'north' | 'south' | 'east' | 'west';
  label: string;
}

/* ──── 郭城网格街区（程序化生成平民建筑） ──── */
export interface GuoGridBlock {
  startX: number; startY: number;
  cols: number; rows: number;
  cellSize: number;
  wallColor: string;
  roofColor: string;
}

/* ──── 宫城区域（围墙+手摆大殿） ──── */
export interface PalaceQuarter {
  x: number; y: number;
  width: number; depth: number;
  wallHeight: number;
  wallColor: string;
  gateX: number; gateY: number;
  gateDir: 'north' | 'south';
  gateLabel: string;
  buildings: InnerBuilding[];
  floorColor?: string;
}

/* ──── 顶层：建筑复合体定义 ──── */
export interface BuildingDef {
  kind: BuildingKind;
  label: string;
  country?: string;
  isCapital: boolean;
  compoundWidth: number;
  compoundDepth: number;
  wallHeight: number;
  wallColor: string;
  gates: CityGate[];
  roads: CityRoad[];
  guoBlocks: GuoGridBlock[];
  palaceQuarter: PalaceQuarter | null;
  noWall?: boolean;
}
