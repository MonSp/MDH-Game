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
  // grudge_village_gate has 3 unconditional choices + 1 conditional on LI_SI_HELPED
  const villageGateScene = GRUDGE_SCENE_ENTRIES.find(s => s.id === 'grudge_village_gate')!;

  it('shows all choices when no NPC memory conditions exist', () => {
    // Scene with no conditions at all
    const simpleScene = GRUDGE_SCENE_ENTRIES.find(s => s.id === 'grudge_leave_village')!;
    const visible = getVisibleChoices(simpleScene, {});
    expect(visible).toHaveLength(simpleScene.choices.length);
  });

  it('shows the HELPED conditional choice + 3 unconditional when npcMemory has LI_SI_HELPED', () => {
    const visible = getVisibleChoices(villageGateScene, { [LI_SI_ID]: LI_SI_HELPED });
    // village_gate: 3 unconditional + 1 conditional (LI_SI_HELPED)
    expect(visible).toHaveLength(4);
    expect(visible[3].text).toContain('灵石');
  });

  it('hides the HELPED conditional choice when npcMemory has LI_SI_ROBBED', () => {
    const visible = getVisibleChoices(villageGateScene, { [LI_SI_ID]: LI_SI_ROBBED });
    expect(visible).toHaveLength(3);
    expect(visible.every(c => !c.text.includes('灵石'))).toBe(true);
  });

  it('hides the conditional choice when npcMemory is empty', () => {
    const visible = getVisibleChoices(villageGateScene, {});
    expect(visible).toHaveLength(3);
  });

  it('hides the conditional choice when npcMemory has an unknown state', () => {
    const visible = getVisibleChoices(villageGateScene, { [LI_SI_ID]: 'UNKNOWN_STATE' });
    expect(visible).toHaveLength(3);
  });

  it('handles multiple NPC memories correctly — HELPED + unrelated NPC state', () => {
    const visible = getVisibleChoices(villageGateScene, {
      [LI_SI_ID]: LI_SI_HELPED,
      some_other_npc: 'SOME_STATE',
    });
    expect(visible).toHaveLength(4);
    expect(visible[3].text).toContain('灵石');
  });

  it('maps filtered index back to original index correctly', () => {
    // villageGateScene has 4 choices: [0]=ignore, [1]=help_ask, [2]=rob, [3]=give_stones (conditional)
    // When npcMemory has HELPED, visible choices are [0, 1, 2, 3] (all 4)
    // Filtered index 3 should map to original index 3
    const originalIdx = mapFilteredToOriginal(villageGateScene, { [LI_SI_ID]: LI_SI_HELPED }, 3);
    expect(originalIdx).toBe(3);
    expect(villageGateScene.choices[originalIdx].text).toContain('灵石');
  });

  it('returns -1 for out-of-bounds filtered index', () => {
    const originalIdx = mapFilteredToOriginal(villageGateScene, { [LI_SI_ID]: LI_SI_HELPED }, 5);
    expect(originalIdx).toBe(-1);
  });
});
