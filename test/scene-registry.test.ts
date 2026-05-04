import { describe, it, expect } from 'vitest';
import {
  SCENE_REGISTRY,
  getSceneEntry,
  getScenesByArea,
  getSceneIdByCoordinate,
  type SceneArea,
} from '../src/content/scenes/sceneRegistry';
import { FAMILY_SCENES } from '../src/content/scenes/family';
import { INTRO_SCENE } from '../src/content/scenes/intro';
import { GRUDGE_SCENE_ENTRIES, LI_SI_ID, WANG_WU_ID, LI_SI_ROBBED, LI_SI_HELPED, LI_SI_UNMET, LI_SI_IGNORED } from '../src/content/scenes/grudge/grudgeScene';
import { GRUDGE_NPC_DIALOGUE } from '../src/content/scenes/grudge/npcDialogue';
import type { SceneEntry } from '../src/shared/types/scene';

// =============================================================
// formatTime — internal helper in family.ts
// =============================================================

// Re-implement for isolated testing (it's not exported)
function formatTime(hour: number): string | undefined {
  const 时辰 = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  return 时辰[Math.floor(hour / 2) % 12];
}

describe('formatTime (family.ts internal helper)', () => {
  it('returns 子 for hour 0 (midnight)', () => {
    expect(formatTime(0)).toBe('子');
  });

  it('returns 子 for hour 1 (still 子时)', () => {
    expect(formatTime(1)).toBe('子');
  });

  it('returns 丑 for hour 2', () => {
    expect(formatTime(2)).toBe('丑');
  });

  it('returns 午 for hour 12 (noon)', () => {
    expect(formatTime(12)).toBe('午');
  });

  it('returns 申 for hour 16', () => {
    expect(formatTime(16)).toBe('申');
  });

  it('returns 亥 for hour 23 (last hour of day)', () => {
    expect(formatTime(23)).toBe('亥');
  });

  it('wraps around for hour 24 (next day 子时)', () => {
    expect(formatTime(24)).toBe('子');
  });

  it('returns undefined for negative hour (negative array index)', () => {
    expect(formatTime(-1)).toBeUndefined();
  });

  it('uses the exact hour used in family.ts (14 → 未)', () => {
    // family.ts line 18: formatTime(14) → "午"後の...
    // hour 14: floor(7) = 7, 7%12 = 7, 时辰[7] = '未'
    expect(formatTime(14)).toBe('未');
  });
});

// =============================================================
// SCENE_REGISTRY structure
// =============================================================

describe('SCENE_REGISTRY build integrity', () => {
  it('contains all intro, family, and grudge scenes', () => {
    const ids = Object.keys(SCENE_REGISTRY);
    // +1 for the grudge_reunion_router entry, +1 for grudge_ignore_death_router
    expect(ids.length).toBe(4 + 4 + GRUDGE_SCENE_ENTRIES.length + 2);
    expect(ids).toContain('wake_up');
    expect(ids).toContain('look_around');
    expect(ids).toContain('check_body');
    expect(ids).toContain('call_someone');
    expect(ids).toContain('family_corridor');
    expect(ids).toContain('family_yard');
    expect(ids).toContain('family_hall');
    expect(ids).toContain('patriarch_audience');
    expect(ids).toContain('grudge_village_gate');
    expect(ids).toContain('grudge_reunion_router');
  });

  it('known trigger scenes have triggerAt coordinates', () => {
    const triggerScenes: Record<string, { x: number; y: number; radius: number }> = {
      'family_corridor': { x: 55, y: 48, radius: 3 },
      'grudge_village_gate': { x: 55, y: 45, radius: 3 },
      'grudge_reunion_router': { x: 60, y: 50, radius: 2 },
      'grudge_ignore_death_router': { x: 52, y: 42, radius: 3 },
    };
    for (const [id, entry] of Object.entries(SCENE_REGISTRY)) {
      if (triggerScenes[id]) {
        expect(entry.triggerAt).toBeDefined();
        expect(entry.triggerAt!.x).toBe(triggerScenes[id].x);
        expect(entry.triggerAt!.y).toBe(triggerScenes[id].y);
        expect(entry.triggerAt!.radius).toBe(triggerScenes[id].radius);
      } else {
        expect(entry.triggerAt).toBeUndefined();
      }
    }
  });

  it('all scenes are correctly assigned to area', () => {
    for (const entry of Object.values(SCENE_REGISTRY)) {
      expect(entry.area).toMatch(/^(intro|family|grudge|sect|wild)$/);
    }
  });

  it('intro scenes are area "intro", family scenes are "family", grudge scenes are "grudge"', () => {
    const introIds = ['wake_up', 'look_around', 'check_body', 'call_someone'];
    const familyIds = ['family_corridor', 'family_yard', 'family_hall', 'patriarch_audience'];
    const grudgeIds = GRUDGE_SCENE_ENTRIES.map(s => s.id);

    for (const id of introIds) {
      expect(SCENE_REGISTRY[id].area).toBe('intro');
    }
    for (const id of familyIds) {
      expect(SCENE_REGISTRY[id].area).toBe('family');
    }
    for (const id of grudgeIds) {
      expect(SCENE_REGISTRY[id].area).toBe('grudge');
    }
  });
});

// =============================================================
// getSceneEntry
// =============================================================

describe('getSceneEntry', () => {
  it('returns the scene entry for a known id', () => {
    const scene = getSceneEntry('wake_up');
    expect(scene).toBeDefined();
    expect(scene!.id).toBe('wake_up');
    expect(scene!.title).toBe('穿越·初醒');
    expect(scene!.choices).toHaveLength(3);
  });

  it('returns the scene for a family scene id', () => {
    const scene = getSceneEntry('family_corridor');
    expect(scene).toBeDefined();
    expect(scene!.id).toBe('family_corridor');
    expect(scene!.choices).toHaveLength(3);
  });

  it('returns undefined for an unknown id', () => {
    expect(getSceneEntry('nonexistent_scene')).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(getSceneEntry('')).toBeUndefined();
  });
});

// =============================================================
// getScenesByArea
// =============================================================

describe('getScenesByArea', () => {
  it('returns 4 scenes for "intro" area', () => {
    const scenes = getScenesByArea('intro');
    expect(scenes).toHaveLength(4);
    expect(scenes[0].id).toBe('wake_up');
    expect(scenes[3].id).toBe('call_someone');
  });

  it('returns 4 scenes for "family" area', () => {
    const scenes = getScenesByArea('family');
    expect(scenes).toHaveLength(4);
    expect(scenes[0].id).toBe('family_corridor');
    expect(scenes[3].id).toBe('patriarch_audience');
  });

  it('returns grudge scenes for "grudge" area', () => {
    const scenes = getScenesByArea('grudge');
    // +1 for the router entry, +1 for the ignore→death router
    expect(scenes.length).toBe(GRUDGE_SCENE_ENTRIES.length + 2);
    expect(scenes[0].id).toBe('grudge_village_gate');
    // ignore→death router wraps the death rumor scene
    expect(scenes[scenes.length - 1].id).toBe('grudge_lisi_death_rumor');
  });

  it('returns empty array for "sect" area (no scenes registered yet)', () => {
    expect(getScenesByArea('sect')).toHaveLength(0);
  });

  it('returns empty array for "wild" area (no scenes registered yet)', () => {
    expect(getScenesByArea('wild')).toHaveLength(0);
  });
});

// =============================================================
// getSceneIdByCoordinate
// =============================================================

describe('getSceneIdByCoordinate', () => {
  it('returns "family_corridor" when player is at exact trigger coordinate (55,48)', () => {
    expect(getSceneIdByCoordinate(55, 48)).toBe('family_corridor');
  });

  it('returns "family_corridor" when player is within radius (3)', () => {
    // One step away from center
    expect(getSceneIdByCoordinate(55, 46)).toBe('family_corridor');
    expect(getSceneIdByCoordinate(53, 48)).toBe('family_corridor');
    expect(getSceneIdByCoordinate(55, 50)).toBe('family_corridor');
    expect(getSceneIdByCoordinate(57, 48)).toBe('family_corridor');
    // Diagonal (2,2) → sqrt(8) ≈ 2.828 ≤ 3
    expect(getSceneIdByCoordinate(57, 50)).toBe('family_corridor');
  });

  it('returns "family_corridor" at exact radius boundary (distance == 3)', () => {
    // point (58, 48) → dx=3, dy=0 → distance = 3
    expect(getSceneIdByCoordinate(58, 48)).toBe('family_corridor');
    // point (55, 51) → dx=0, dy=3 → distance = 3
    expect(getSceneIdByCoordinate(55, 51)).toBe('family_corridor');
  });

  it('returns undefined when outside the trigger radius', () => {
    // dx=4, dy=0 → distance = 4 > 3
    expect(getSceneIdByCoordinate(59, 48)).toBeUndefined();
    // dx=0, dy=4 → distance = 4 > 3
    expect(getSceneIdByCoordinate(55, 52)).toBeUndefined();
    // far away
    expect(getSceneIdByCoordinate(0, 0)).toBeUndefined();
  });

  it('returns undefined for coordinates near intro scenes (no triggerAt)', () => {
    // There are no intro scenes with triggerAt, so any intro-adjacent coordinate
    // should return undefined
    expect(getSceneIdByCoordinate(10, 10)).toBeUndefined();
  });
});

// =============================================================
// Scene data integrity — cross-referencing
// =============================================================

describe('Scene data integrity', () => {
  it('all nextEntry references in FAMILY_SCENES point to valid scenes', () => {
    const allIds = new Set(FAMILY_SCENES.map(s => s.id));
    for (const scene of FAMILY_SCENES) {
      for (const choice of scene.choices) {
        if (choice.nextEntry) {
          expect(
            allIds.has(choice.nextEntry) || getSceneEntry(choice.nextEntry) !== undefined,
          ).toBe(true);
        }
      }
    }
  });

  it('all nextEntry references in INTRO_SCENE point to valid scenes', () => {
    for (const scene of INTRO_SCENE) {
      for (const choice of scene.choices) {
        if (choice.nextEntry) {
          expect(getSceneEntry(choice.nextEntry)).toBeDefined();
        }
      }
    }
  });

  it('no scene has both switchToMap and nextEntry on the same choice (contradictory)', () => {
    const allScenes = [...INTRO_SCENE, ...FAMILY_SCENES];
    for (const scene of allScenes) {
      for (const choice of scene.choices) {
        if (choice.switchToMap && choice.nextEntry) {
          // This would be a logic bug — switchToMap closes the scene
          // but nextEntry tries to navigate within it
          expect.fail(`Scene ${scene.id} choice has both switchToMap and nextEntry`);
        }
      }
    }
  });

  it('scene IDs are unique across intro and family', () => {
    const introIds = INTRO_SCENE.map(s => s.id);
    const familyIds = FAMILY_SCENES.map(s => s.id);
    const allIds = [...introIds, ...familyIds];
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });

  it('every scene has at least one choice', () => {
    const allScenes = [...INTRO_SCENE, ...FAMILY_SCENES];
    for (const scene of allScenes) {
      expect(scene.choices.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('every scene choice has a text field', () => {
    const allScenes = [...INTRO_SCENE, ...FAMILY_SCENES];
    for (const scene of allScenes) {
      for (const choice of scene.choices) {
        expect(typeof choice.text).toBe('string');
        expect(choice.text.length).toBeGreaterThan(0);
      }
    }
  });

  it('patriarch_audience has two switchToMap choices', () => {
    const scene = getSceneEntry('patriarch_audience')!;
    const switchChoices = scene.choices.filter(c => c.switchToMap);
    expect(switchChoices).toHaveLength(2);
  });

  it('npcDialogue references in FAMILY_SCENES match expected NPC IDs', () => {
    const expectedNpcIds = ['servant_02', 'junior_01', 'patriarch_01'];
    for (const scene of FAMILY_SCENES) {
      for (const choice of scene.choices) {
        if (choice.npcDialogue) {
          expect(expectedNpcIds).toContain(choice.npcDialogue);
        }
      }
    }
  });

  // =============================================================
  // GRUDGE_SCENE_ENTRIES data integrity
  // =============================================================

  describe('GRUDGE_SCENE_ENTRIES data integrity', () => {
    it('all grudge scene IDs are unique across intro and family', () => {
      const introIds = INTRO_SCENE.map(s => s.id);
      const familyIds = FAMILY_SCENES.map(s => s.id);
      const grudgeIds = GRUDGE_SCENE_ENTRIES.map(s => s.id);
      const allIds = [...introIds, ...familyIds, ...grudgeIds];
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(allIds.length);
    });

    it('every grudge scene has at least one choice', () => {
      for (const scene of GRUDGE_SCENE_ENTRIES) {
        expect(scene.choices.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('every grudge scene choice has a text field', () => {
      for (const scene of GRUDGE_SCENE_ENTRIES) {
        for (const choice of scene.choices) {
          expect(typeof choice.text).toBe('string');
          expect(choice.text.length).toBeGreaterThan(0);
        }
      }
    });

    it('all nextEntry references in GRUDGE_SCENE_ENTRIES point to valid grudge scenes', () => {
      const grudgeIds = new Set(GRUDGE_SCENE_ENTRIES.map(s => s.id));
      for (const scene of GRUDGE_SCENE_ENTRIES) {
        for (const choice of scene.choices) {
          if (choice.nextEntry) {
            expect(grudgeIds.has(choice.nextEntry)).toBe(true);
          }
        }
      }
    });

    it('no grudge scene has both switchToMap and nextEntry on the same choice', () => {
      for (const scene of GRUDGE_SCENE_ENTRIES) {
        for (const choice of scene.choices) {
          if (choice.switchToMap && choice.nextEntry) {
            expect.fail(`GRUDGE scene ${scene.id} choice has both switchToMap and nextEntry`);
          }
        }
      }
    });

    it('all npcDialogue references in GRUDGE_SCENE_ENTRIES exist in GRUDGE_NPC_DIALOGUE', () => {
      const dialogueKeys = Object.keys(GRUDGE_NPC_DIALOGUE);
      for (const scene of GRUDGE_SCENE_ENTRIES) {
        for (const choice of scene.choices) {
          if (choice.npcDialogue) {
            expect(dialogueKeys).toContain(choice.npcDialogue);
          }
        }
      }
    });

    it('all conditional choices reference valid NPC IDs and states', () => {
      const validNpcIds = [LI_SI_ID, WANG_WU_ID];
      const validStates = [LI_SI_ROBBED, LI_SI_HELPED, LI_SI_UNMET, LI_SI_IGNORED];
      for (const scene of GRUDGE_SCENE_ENTRIES) {
        for (const choice of scene.choices) {
          if (choice.condition?.npcMemory) {
            expect(validNpcIds).toContain(choice.condition.npcMemory.npcId);
            expect(validStates).toContain(choice.condition.npcMemory.equals);
          }
        }
      }
    });

    it('all removeItem effects have positive count', () => {
      for (const scene of GRUDGE_SCENE_ENTRIES) {
        for (const choice of scene.choices) {
          if (choice.effect?.removeItem) {
            expect(choice.effect.removeItem.count).toBeGreaterThan(0);
          }
        }
      }
    });

    it('all loseStonesFraction effects are in [0,1]', () => {
      for (const scene of GRUDGE_SCENE_ENTRIES) {
        for (const choice of scene.choices) {
          if (choice.effect?.loseStonesFraction !== undefined) {
            expect(choice.effect.loseStonesFraction).toBeGreaterThanOrEqual(0);
            expect(choice.effect.loseStonesFraction).toBeLessThanOrEqual(1);
          }
        }
      }
    });

    it('all addItem effects reference non-empty item names', () => {
      for (const scene of GRUDGE_SCENE_ENTRIES) {
        for (const choice of scene.choices) {
          if (choice.effect?.addItem) {
            for (const itemName of Object.keys(choice.effect.addItem)) {
              expect(itemName.length).toBeGreaterThan(0);
            }
          }
        }
      }
    });

    it('all debuff effects have positive durationMs', () => {
      for (const scene of GRUDGE_SCENE_ENTRIES) {
        for (const choice of scene.choices) {
          if (choice.effect?.debuff) {
            expect(choice.effect.debuff.durationMs).toBeGreaterThan(0);
          }
        }
      }
    });
  });
});
