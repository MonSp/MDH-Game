import { describe, it, expect } from 'vitest';
import { computeTalentGrade, TALENT_GRADE_TABLE } from '../src/store/gameStore';

describe('computeTalentGrade', () => {
  it('returns 废灵根 for value 0', () => {
    expect(computeTalentGrade(0, 'spiritual')).toBe('废灵根');
  });

  it('returns 废灵根 for value 20 (top of first band)', () => {
    expect(computeTalentGrade(20, 'spiritual')).toBe('废灵根');
  });

  it('returns 下品灵根 for value 21', () => {
    expect(computeTalentGrade(21, 'spiritual')).toBe('下品灵根');
  });

  it('returns 中品灵根 for value 41', () => {
    expect(computeTalentGrade(41, 'spiritual')).toBe('中品灵根');
  });

  it('returns 上品灵根 for value 61', () => {
    expect(computeTalentGrade(61, 'spiritual')).toBe('上品灵根');
  });

  it('returns 天灵根 for value 81', () => {
    expect(computeTalentGrade(81, 'spiritual')).toBe('天灵根');
  });

  it('returns 天灵根 for value 100', () => {
    expect(computeTalentGrade(100, 'spiritual')).toBe('天灵根');
  });

  // Bone grade keys
  it('returns 凡骨 for bone key at value 15', () => {
    expect(computeTalentGrade(15, 'bone')).toBe('凡骨');
  });

  it('returns 仙骨 for bone key at value 90', () => {
    expect(computeTalentGrade(90, 'bone')).toBe('仙骨');
  });

  // Comprehension grade keys
  it('returns 愚钝 for comprehension key at value 5', () => {
    expect(computeTalentGrade(5, 'comprehension')).toBe('愚钝');
  });

  it('returns 天慧 for comprehension key at value 95', () => {
    expect(computeTalentGrade(95, 'comprehension')).toBe('天慧');
  });

  // Fortune grade keys
  it('returns 霉运 for fortune key at value 0', () => {
    expect(computeTalentGrade(0, 'fortune')).toBe('霉运');
  });

  it('returns 天眷 for fortune key at value 100', () => {
    expect(computeTalentGrade(100, 'fortune')).toBe('天眷');
  });
});

describe('computeTalentGrade — clamping', () => {
  it('clamps negative value to 0 (最低级)', () => {
    expect(computeTalentGrade(-5, 'spiritual')).toBe('废灵根');
  });

  it('clamps value > 100 to 100 (最高级)', () => {
    expect(computeTalentGrade(150, 'spiritual')).toBe('天灵根');
  });

  it('clamps very negative value', () => {
    expect(computeTalentGrade(-999, 'spiritual')).toBe('废灵根');
  });
});

describe('computeTalentGrade — edge cases', () => {
  it('returns 未知 for invalid gradeKey', () => {
    // @ts-expect-error testing invalid key
    expect(computeTalentGrade(50, 'invalid' as any)).toBe('未知');
  });

  it('handles all grade bands for spiritual key', () => {
    const bands = [
      { value: 0, expected: '废灵根' },
      { value: 10, expected: '废灵根' },
      { value: 20, expected: '废灵根' },
      { value: 21, expected: '下品灵根' },
      { value: 30, expected: '下品灵根' },
      { value: 40, expected: '下品灵根' },
      { value: 41, expected: '中品灵根' },
      { value: 50, expected: '中品灵根' },
      { value: 60, expected: '中品灵根' },
      { value: 61, expected: '上品灵根' },
      { value: 70, expected: '上品灵根' },
      { value: 80, expected: '上品灵根' },
      { value: 81, expected: '天灵根' },
      { value: 90, expected: '天灵根' },
      { value: 100, expected: '天灵根' },
    ];
    for (const { value, expected } of bands) {
      expect(computeTalentGrade(value, 'spiritual')).toBe(expected);
    }
  });
});

describe('TALENT_GRADE_TABLE structure', () => {
  it('has 5 grade bands', () => {
    expect(TALENT_GRADE_TABLE).toHaveLength(5);
  });

  it('covers all keys in each band', () => {
    for (const band of TALENT_GRADE_TABLE) {
      expect(band).toHaveProperty('spiritual');
      expect(band).toHaveProperty('bone');
      expect(band).toHaveProperty('comprehension');
      expect(band).toHaveProperty('fortune');
    }
  });

  it('has contiguous bands without gaps', () => {
    for (let i = 0; i < TALENT_GRADE_TABLE.length - 1; i++) {
      expect(TALENT_GRADE_TABLE[i].max + 1).toBe(TALENT_GRADE_TABLE[i + 1].min);
    }
  });

  it('starts at 0 and ends at 100', () => {
    expect(TALENT_GRADE_TABLE[0].min).toBe(0);
    expect(TALENT_GRADE_TABLE[TALENT_GRADE_TABLE.length - 1].max).toBe(100);
  });
});
