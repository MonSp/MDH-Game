export type ScenePanelState = 'CHOOSING' | 'LOADING' | 'DIALOGUE';

export interface SceneEffect {
  talent?: {
    spiritualRoot?: number;
    boneConstitution?: number;
    comprehension?: number;
    fortune?: number;
  };
  cultivation?: number;
  spiritStone?: number;
  reputation?: Record<string, number>;
}

export interface Choice {
  text: string;
  nextEntry?: string;
  effect?: SceneEffect;
  switchToMap?: boolean;
  npcDialogue?: string;
  sceneContext?: string;
  /** Show this choice only when npcMemory matches */
  condition?: {
    npcMemory: { npcId: string; equals: string };
  };
}

export interface SceneEntry {
  id: string;
  title: string;
  description: string;
  choices: Choice[];
  backgroundImage?: string;
  npcPresent?: string[];
  fallbackDialogue?: string;
}
