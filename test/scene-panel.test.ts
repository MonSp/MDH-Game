import { describe, it, expect } from 'vitest';
import type { SceneEntry, ScenePanelState } from '../src/shared/types/scene';
import { GRUDGE_SCENE_ENTRIES, LI_SI_ID, LI_SI_ROBBED, LI_SI_HELPED, LI_SI_UNMET } from '../src/content/scenes/grudge/grudgeScene';

// Re-implement the ScenePanel filtering logic as a pure function for testing
// (same algorithm as ScenePanel.tsx visibleChoices useMemo)
function getVisibleChoices(scene: SceneEntry, npcMemory: Record<string, string>) {
  return scene.choices.filter(choice => {
    if (!choice.condition?.npcMemory) return true;
    const { npcId, equals } = choice.condition.npcMemory;
    return npcMemory[npcId] === equals;
  });
}

// Re-implement the index remapping logic
function mapFilteredToOriginal(scene: SceneEntry, npcMemory: Record<string, string>, filteredIndex: number): number {
  const visibleChoices = getVisibleChoices(scene, npcMemory);
  const filteredChoice = visibleChoices[filteredIndex];
  if (!filteredChoice) return -1;
  return scene.choices.indexOf(filteredChoice);
}

describe('ScenePanel choice filtering logic', () => {
  const reunionScene = GRUDGE_SCENE_ENTRIES.find(s => s.id === 'grudge_act3_reunion')!;

  it('shows all choices when no NPC memory conditions exist', () => {
    // Scene with no conditions at all
    const simpleScene = GRUDGE_SCENE_ENTRIES.find(s => s.id === 'grudge_tavern')!;
    const visible = getVisibleChoices(simpleScene, {});
    expect(visible).toHaveLength(simpleScene.choices.length);
  });

  it('shows the ROBBED choice (+ unconditional fallback) when npcMemory has LI_SI_ROBBED', () => {
    const visible = getVisibleChoices(reunionScene, { [LI_SI_ID]: LI_SI_ROBBED });
    // reunion scene: 2 conditional + 1 unconditional fallback
    // ROBBED state matches the first conditional choice + fallback always shows
    expect(visible).toHaveLength(2);
    expect(visible[0].text).toContain('握紧武器');
    expect(visible[1].text).toContain('警惕');
  });

  it('shows the HELPED choice (+ unconditional fallback) when npcMemory has LI_SI_HELPED', () => {
    const visible = getVisibleChoices(reunionScene, { [LI_SI_ID]: LI_SI_HELPED });
    expect(visible).toHaveLength(2);
    expect(visible[0].text).toContain('拱手打招呼');
    expect(visible[1].text).toContain('警惕');
  });

  it('shows only the unconditional fallback when npcMemory condition does not match any conditional choice', () => {
    const visible = getVisibleChoices(reunionScene, { [LI_SI_ID]: LI_SI_UNMET });
    expect(visible).toHaveLength(1);
    expect(visible[0].text).toContain('警惕');
  });

  it('shows only the unconditional fallback when npcMemory is empty', () => {
    const visible = getVisibleChoices(reunionScene, {});
    expect(visible).toHaveLength(1);
    expect(visible[0].text).toContain('警惕');
  });

  it('shows only the unconditional fallback when npcMemory has an unknown state', () => {
    const visible = getVisibleChoices(reunionScene, { [LI_SI_ID]: 'UNKNOWN_STATE' });
    expect(visible).toHaveLength(1);
    expect(visible[0].text).toContain('警惕');
  });

  it('handles multiple NPC memories correctly — HELPED + unrelated NPC state', () => {
    const visible = getVisibleChoices(reunionScene, {
      [LI_SI_ID]: LI_SI_HELPED,
      some_other_npc: 'SOME_STATE',
    });
    expect(visible).toHaveLength(2);
    expect(visible[0].text).toContain('拱手打招呼');
  });

  it('maps filtered index back to original index correctly', () => {
    // reunionScene has 3 choices: [0]=ROBBED, [1]=HELPED, [2]=fallback
    // When npcMemory has HELPED, visible choices are [HELPED(idx=1), fallback(idx=2)]
    // Filtered index 0 should map to original index 1
    const originalIdx = mapFilteredToOriginal(reunionScene, { [LI_SI_ID]: LI_SI_HELPED }, 0);
    expect(originalIdx).toBe(1);
    expect(reunionScene.choices[originalIdx].text).toContain('拱手打招呼');
  });

  it('returns -1 for out-of-bounds filtered index', () => {
    const originalIdx = mapFilteredToOriginal(reunionScene, { [LI_SI_ID]: LI_SI_HELPED }, 5);
    expect(originalIdx).toBe(-1);
  });
});
