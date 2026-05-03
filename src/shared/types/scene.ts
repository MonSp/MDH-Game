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
  /** HP change (negative = damage) */
  hp?: number;
  /** Add items to inventory */
  addItem?: Record<string, number>;
  /** Remove random items from inventory */
  removeItem?: { count: number };
  /** Set NPC memory key-value */
  setMemory?: { npcId: string; value: string };
  /** Apply a temporary stat debuff */
  debuff?: { name: string; durationMs: number; statPenalty: number };
  /** Lose a fraction (0-1) of current spirit stones */
  loseStonesFraction?: number;
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
