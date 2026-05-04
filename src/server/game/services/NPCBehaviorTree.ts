import {
  LLMTier,
  ActionType,
  LLMPlan,
  PlanStatus
} from '../../../shared/types/LLMPlanning';
import { LLMPlanningService } from './LLMPlanningService';
import { determineTier, getFallbackBehavior, shouldRequestPlanning } from '../../config/LLMConfig';

export interface BTNode {
  execute(npcId: string): ActionType;
}

export class SelectorNode implements BTNode {
  constructor(private children: BTNode[]) {}

  execute(npcId: string): ActionType {
    for (const child of this.children) {
      const result = child.execute(npcId);
      if (result !== ActionType.IDLE) {
        return result;
      }
    }
    return ActionType.IDLE;
  }
}

export class SequenceNode implements BTNode {
  constructor(private children: BTNode[]) {}

  execute(npcId: string): ActionType {
    for (const child of this.children) {
      const result = child.execute(npcId);
      if (result === ActionType.IDLE) {
        return ActionType.IDLE;
      }
    }
    return ActionType.IDLE;
  }
}

export class LLMPlanNode implements BTNode {
  private planningService: LLMPlanningService;

  constructor() {
    this.planningService = LLMPlanningService.getInstance();
  }

  execute(npcId: string): ActionType {
    const plan = this.planningService.getPlan(npcId);
    if (!plan || plan.status !== PlanStatus.ACTIVE) {
      return ActionType.IDLE;
    }

    const currentTaskInfo = this.planningService.getCurrentTask(npcId);
    if (!currentTaskInfo) {
      return ActionType.IDLE;
    }

    return currentTaskInfo.task.action_type;
  }
}

export class SurvivalNode implements BTNode {
  execute(npcId: string): ActionType {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { NPCWorldService } = require('../../services/NPCWorldService');
    const state = NPCWorldService.getInstance().getNPC(npcId);
    if (!state || state.npc.hp <= 0) return ActionType.IDLE;

    // Low HP — prioritise recovery
    if (state.npc.hp < state.npc.maxHp * 0.3) {
      return ActionType.REST;
    }

    return ActionType.IDLE;
  }
}

export class NPCBehaviorTree {
  private npcId: string;
  private rootNode: BTNode;
  private llmNode: LLMPlanNode;
  private survivalNode: SurvivalNode;
  private currentPlan: LLMPlan | null = null;

  constructor(npcId: string) {
    this.npcId = npcId;
    this.llmNode = new LLMPlanNode();
    this.survivalNode = new SurvivalNode();
    this.rootNode = new SelectorNode([
      this.survivalNode,
      this.llmNode
    ]);
  }

  evaluate(): ActionType {
    return this.rootNode.execute(this.npcId);
  }

  setLLMPlan(plan: LLMPlan): void {
    LLMPlanningService.getInstance();
    this.currentPlan = plan;
  }
}

export class NPCBehaviorTreeManager {
  private static instance: NPCBehaviorTreeManager;
  private trees: Map<string, NPCBehaviorTree> = new Map();

  private constructor() {}

  static getInstance(): NPCBehaviorTreeManager {
    if (!NPCBehaviorTreeManager.instance) {
      NPCBehaviorTreeManager.instance = new NPCBehaviorTreeManager();
    }
    return NPCBehaviorTreeManager.instance;
  }

  getOrCreateTree(npcId: string): NPCBehaviorTree {
    let tree = this.trees.get(npcId);
    if (!tree) {
      tree = new NPCBehaviorTree(npcId);
      this.trees.set(npcId, tree);
    }
    return tree;
  }

  evaluateNPC(npcId: string): ActionType {
    const tree = this.getOrCreateTree(npcId);
    return tree.evaluate();
  }

  removeTree(npcId: string): void {
    this.trees.delete(npcId);
  }

  getActiveTreeCount(): number {
    return this.trees.size;
  }
}

export function translateActionToActivity(actionType: ActionType): string {
  const mapping: Record<ActionType, string> = {
    [ActionType.IDLE]: 'idle',
    [ActionType.REST]: 'rest',
    [ActionType.PATROL]: 'patrol',
    [ActionType.EXPLORE]: 'compete',
    [ActionType.CULTIVATE]: 'retreat',
    [ActionType.TRADE]: 'trade',
    [ActionType.LOGISTICS]: 'logistics',
    [ActionType.MILITARY_ORDER]: 'patrol',
    [ActionType.DIPLOMACY]: 'work',
    [ActionType.INTELLIGENCE]: 'explore',
    [ActionType.RESOURCE_ALLOCATION]: 'logistics',
    [ActionType.RESOURCE_PURCHASE]: 'trade',
    [ActionType.RESOURCE_RAID]: 'compete',
    [ActionType.CAPTURE_RESOURCE_POINT]: 'compete',
    [ActionType.DOMAIN_WAR]: 'patrol',
    [ActionType.ALLIANCE_FORMATION]: 'work',
    [ActionType.CULTIVATE_BREAKTHROUGH]: 'retreat'
  };
  return mapping[actionType] || 'rest';
}
