export enum Country {
  Qin = 'qin',
  Chu = 'chu',
  Qi = 'qi',
  Yan = 'yan',
  Zhao = 'zhao',
  Wei = 'wei',
  Han = 'han'
}

export interface Position {
  x: number;
  y: number;
}

export interface CountryConfig {
  id: Country;
  name: string;
  culture: string;
  trait: CountryTrait;
  capitalPosition: Position;
}

export interface CountryTrait {
  type: 'battle_exp' | 'alchemy' | 'comprehension' | 'spirit_absorption' | 'move_speed' | 'spirit_cap' | 'craft_cost';
  value: number;
}

export const COUNTRY_CONFIGS: Record<Country, CountryConfig> = {
  [Country.Qin]: {
    id: Country.Qin,
    name: '秦国',
    culture: '法家、重农战',
    trait: { type: 'battle_exp', value: 10 },
    capitalPosition: { x: 20, y: 50 }
  },
  [Country.Chu]: {
    id: Country.Chu,
    name: '楚国',
    culture: '道家、浪漫',
    trait: { type: 'alchemy', value: 10 },
    capitalPosition: { x: 80, y: 70 }
  },
  [Country.Qi]: {
    id: Country.Qi,
    name: '齐国',
    culture: '儒家、学术',
    trait: { type: 'comprehension', value: 10 },
    capitalPosition: { x: 120, y: 50 }
  },
  [Country.Yan]: {
    id: Country.Yan,
    name: '燕国',
    culture: '务实、尚武',
    trait: { type: 'spirit_absorption', value: 10 },
    capitalPosition: { x: 140, y: 30 }
  },
  [Country.Zhao]: {
    id: Country.Zhao,
    name: '赵国',
    culture: '骑射、开放',
    trait: { type: 'move_speed', value: 10 },
    capitalPosition: { x: 100, y: 20 }
  },
  [Country.Wei]: {
    id: Country.Wei,
    name: '魏国',
    culture: '法家、改革',
    trait: { type: 'spirit_cap', value: 10 },
    capitalPosition: { x: 80, y: 40 }
  },
  [Country.Han]: {
    id: Country.Han,
    name: '韩国',
    culture: '权谋、工商',
    trait: { type: 'craft_cost', value: 10 },
    capitalPosition: { x: 60, y: 60 }
  }
};