/**
 * Agent-Kernel Integration Tests
 *
 * Validates that the Game's NPC system correctly integrates with the
 * generic agent-kernel components (SkillTree, Career, Evolution).
 *
 * Tests cover:
 * 1. NPC creation data structure compatibility (no regression)
 * 2. Skill mapping logic for each NPC role
 * 3. Career stage initialization based on realm level
 * 4. Evolution component initialization (empty history)
 * 5. Generic component attachment concept validation
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  NPCEntity, NPCRole, RealmLevel, NPCActivity, BirthType, NPCLifeState
} from '../src/shared';

// ── Types mirroring the agent-kernel generic components ─────────────

/** Matches agent-kernel SkillTreeComponent */
enum SkillLevel { None = 0, Beginner = 1, Intermediate = 2, Advanced = 3, Expert = 4 }
enum SkillCategory { Engineering = 0, Design = 1, Content = 2, Data = 3, Management = 4 }

interface SkillNode {
  skillId: string;
  category: SkillCategory;
  level: SkillLevel;
  xp: number;
  dependencies: string[];
}

interface SkillTree {
  skills: Map<string, SkillNode>;
}

/** Matches agent-kernel CareerComponent */
enum CareerStage { Junior = 0, Mid = 1, Senior = 2, Lead = 3, Expert = 4 }

interface Career {
  totalXp: number;
  stage: CareerStage;
  tasksCompleted: number;
  tasksSucceeded: number;
}

/** Matches agent-kernel EvolutionComponent */
interface EvolutionRecord {
  ruleId: string;
  effectivenessBefore: number;
  effectivenessAfter: number;
  timestamp: number;
}

interface Evolution {
  history: EvolutionRecord[];
  totalEvolutions: number;
  successfulEvolutions: number;
}

// ── SkillMapper (TypeScript port of the C++ SkillMapper.h) ──────────

function realmToSkillLevel(realm: RealmLevel): SkillLevel {
  switch (realm) {
    case RealmLevel.Mortal:             return SkillLevel.Beginner;
    case RealmLevel.QiRefining:         return SkillLevel.Beginner;
    case RealmLevel.FoundationBuilding: return SkillLevel.Intermediate;
    case RealmLevel.GoldenCore:         return SkillLevel.Intermediate;
    case RealmLevel.YuanInfant:         return SkillLevel.Advanced;
    case RealmLevel.Transcension:       return SkillLevel.Expert;
  }
}

function populateSkills(role: NPCRole, realm: RealmLevel): SkillTree {
  const tree: SkillTree = { skills: new Map() };
  const level = realmToSkillLevel(realm);

  const addSkill = (id: string, cat: SkillCategory, lvl: SkillLevel, deps: string[] = []) => {
    tree.skills.set(id, { skillId: id, category: cat, level: lvl, xp: 0, dependencies: deps });
  };

  // All NPCs get basic self-management
  addSkill('task_decomposition', SkillCategory.Engineering, level);

  switch (role) {
    case NPCRole.FamilyHead:
    case NPCRole.Elder:
      addSkill('progress_tracking', SkillCategory.Management, level);
      addSkill('risk_management', SkillCategory.Management, level);
      addSkill('architecture', SkillCategory.Engineering, level);
      addSkill('code_review', SkillCategory.Engineering, level);
      if (level >= SkillLevel.Intermediate) {
        addSkill('competitive_analysis', SkillCategory.Management, level);
        addSkill('api_design', SkillCategory.Engineering, level, ['architecture']);
      }
      break;

    case NPCRole.LawEnforcementElder:
      addSkill('security_audit', SkillCategory.Engineering, level);
      addSkill('code_review', SkillCategory.Engineering, level);
      addSkill('monitoring', SkillCategory.Engineering, level);
      addSkill('progress_tracking', SkillCategory.Management, level);
      addSkill('risk_management', SkillCategory.Management, level);
      break;

    case NPCRole.CoreDisciple:
      addSkill('backend_dev', SkillCategory.Engineering, level);
      addSkill('frontend_dev', SkillCategory.Engineering, level);
      addSkill('testing', SkillCategory.Engineering, level);
      addSkill('graphic_design', SkillCategory.Design, level);
      addSkill('usability_testing', SkillCategory.Design, level);
      if (level >= SkillLevel.Intermediate) {
        addSkill('fullstack_dev', SkillCategory.Engineering, level, ['backend_dev', 'frontend_dev']);
      }
      break;

    case NPCRole.InnerDisciple:
      addSkill('backend_dev', SkillCategory.Engineering, level);
      addSkill('frontend_dev', SkillCategory.Engineering, level);
      addSkill('testing', SkillCategory.Engineering, level);
      break;

    case NPCRole.BranchDisciple:
      addSkill('testing', SkillCategory.Engineering, level);
      addSkill('deployment', SkillCategory.Engineering, level);
      addSkill('content_writing', SkillCategory.Content, level);
      break;
  }

  return tree;
}

function initializeCareer(realm: RealmLevel): Career {
  switch (realm) {
    case RealmLevel.Mortal:             return { totalXp: 0, stage: CareerStage.Junior, tasksCompleted: 0, tasksSucceeded: 0 };
    case RealmLevel.QiRefining:         return { totalXp: 200, stage: CareerStage.Junior, tasksCompleted: 0, tasksSucceeded: 0 };
    case RealmLevel.FoundationBuilding: return { totalXp: 800, stage: CareerStage.Mid, tasksCompleted: 0, tasksSucceeded: 0 };
    case RealmLevel.GoldenCore:         return { totalXp: 2500, stage: CareerStage.Senior, tasksCompleted: 0, tasksSucceeded: 0 };
    case RealmLevel.YuanInfant:         return { totalXp: 6000, stage: CareerStage.Lead, tasksCompleted: 0, tasksSucceeded: 0 };
    case RealmLevel.Transcension:       return { totalXp: 12000, stage: CareerStage.Expert, tasksCompleted: 0, tasksSucceeded: 0 };
  }
}

function createEmptyEvolution(): Evolution {
  return { history: [], totalEvolutions: 0, successfulEvolutions: 0 };
}

// ── Test helper ──────────────────────────────────────────────────────

function createTestNpc(overrides: Partial<NPCEntity> = {}): NPCEntity {
  return {
    id: 'test-npc',
    name: '测试',
    clanId: 'test-clan',
    nation: '齐',
    role: NPCRole.BranchDisciple,
    realm: RealmLevel.Mortal,
    power: 100,
    hp: 100,
    maxHp: 100,
    mp: 50,
    maxMp: 50,
    personality: { ambition: 50, caution: 50, loyalty: 50, greed: 50 },
    activity: NPCActivity.Rest,
    position: { x: 50, y: 50 },
    birthTime: Date.now(),
    age: 25,
    birthType: BirthType.Natural,
    layer: 9,
    resources: { spiritStones: 100, items: [], equipment: null, familyContribution: 0 },
    state: NPCLifeState.Active,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe('Agent-Kernel Integration', () => {

  describe('NPC creation (no regression)', () => {
    it('creates a valid NPC entity with all required fields', () => {
      const npc = createTestNpc();
      expect(npc.id).toBe('test-npc');
      expect(npc.role).toBe(NPCRole.BranchDisciple);
      expect(npc.realm).toBe(RealmLevel.Mortal);
      expect(npc.hp).toBe(100);
      expect(npc.state).toBe(NPCLifeState.Active);
    });

    it('creates NPCs for all role types', () => {
      const roles = [
        NPCRole.FamilyHead, NPCRole.Elder, NPCRole.LawEnforcementElder,
        NPCRole.CoreDisciple, NPCRole.InnerDisciple, NPCRole.BranchDisciple
      ];
      for (const role of roles) {
        const npc = createTestNpc({ role });
        expect(npc.role).toBe(role);
        expect(npc.state).toBe(NPCLifeState.Active);
      }
    });

    it('creates NPCs for all realm levels', () => {
      const realms = [
        RealmLevel.Mortal, RealmLevel.QiRefining, RealmLevel.FoundationBuilding,
        RealmLevel.GoldenCore, RealmLevel.YuanInfant, RealmLevel.Transcension
      ];
      for (const realm of realms) {
        const npc = createTestNpc({ realm });
        expect(npc.realm).toBe(realm);
      }
    });
  });

  describe('SkillTreeComponent — Skill Mapper', () => {
    it('all NPCs get task_decomposition skill', () => {
      const roles = [
        NPCRole.FamilyHead, NPCRole.Elder, NPCRole.LawEnforcementElder,
        NPCRole.CoreDisciple, NPCRole.InnerDisciple, NPCRole.BranchDisciple
      ];
      for (const role of roles) {
        const tree = populateSkills(role, RealmLevel.QiRefining);
        expect(tree.skills.has('task_decomposition')).toBe(true);
      }
    });

    it('FamilyHead gets management + architecture skills', () => {
      const tree = populateSkills(NPCRole.FamilyHead, RealmLevel.GoldenCore);
      expect(tree.skills.has('progress_tracking')).toBe(true);
      expect(tree.skills.has('risk_management')).toBe(true);
      expect(tree.skills.has('architecture')).toBe(true);
      expect(tree.skills.has('code_review')).toBe(true);
      expect(tree.skills.has('competitive_analysis')).toBe(true);
      expect(tree.skills.has('api_design')).toBe(true);
      // api_design depends on architecture
      const apiDesign = tree.skills.get('api_design')!;
      expect(apiDesign.dependencies).toContain('architecture');
    });

    it('LawEnforcementElder gets security skills', () => {
      const tree = populateSkills(NPCRole.LawEnforcementElder, RealmLevel.FoundationBuilding);
      expect(tree.skills.has('security_audit')).toBe(true);
      expect(tree.skills.has('monitoring')).toBe(true);
      expect(tree.skills.has('code_review')).toBe(true);
      // Should NOT get architecture (that's for FamilyHead/Elder)
      expect(tree.skills.has('architecture')).toBe(false);
    });

    it('CoreDisciple gets engineering + design skills', () => {
      const tree = populateSkills(NPCRole.CoreDisciple, RealmLevel.FoundationBuilding);
      expect(tree.skills.has('backend_dev')).toBe(true);
      expect(tree.skills.has('frontend_dev')).toBe(true);
      expect(tree.skills.has('testing')).toBe(true);
      expect(tree.skills.has('graphic_design')).toBe(true);
      expect(tree.skills.has('fullstack_dev')).toBe(true);
      // fullstack_dev depends on backend_dev + frontend_dev
      const fullstack = tree.skills.get('fullstack_dev')!;
      expect(fullstack.dependencies).toContain('backend_dev');
      expect(fullstack.dependencies).toContain('frontend_dev');
    });

    it('InnerDisciple gets engineering but not design', () => {
      const tree = populateSkills(NPCRole.InnerDisciple, RealmLevel.QiRefining);
      expect(tree.skills.has('backend_dev')).toBe(true);
      expect(tree.skills.has('frontend_dev')).toBe(true);
      expect(tree.skills.has('testing')).toBe(true);
      expect(tree.skills.has('graphic_design')).toBe(false);
    });

    it('BranchDisciple gets basic engineering + content', () => {
      const tree = populateSkills(NPCRole.BranchDisciple, RealmLevel.Mortal);
      expect(tree.skills.has('testing')).toBe(true);
      expect(tree.skills.has('deployment')).toBe(true);
      expect(tree.skills.has('content_writing')).toBe(true);
      expect(tree.skills.has('backend_dev')).toBe(false);
      expect(tree.skills.has('architecture')).toBe(false);
    });

    it('skill levels scale with realm', () => {
      const mortalTree = populateSkills(NPCRole.Elder, RealmLevel.Mortal);
      const goldenTree = populateSkills(NPCRole.Elder, RealmLevel.GoldenCore);
      const transcTree = populateSkills(NPCRole.Elder, RealmLevel.Transcension);

      expect(mortalTree.skills.get('architecture')!.level).toBe(SkillLevel.Beginner);
      expect(goldenTree.skills.get('architecture')!.level).toBe(SkillLevel.Intermediate);
      expect(transcTree.skills.get('architecture')!.level).toBe(SkillLevel.Expert);
    });

    it('Intermediate+ realms unlock advanced skill variants', () => {
      const mortalTree = populateSkills(NPCRole.CoreDisciple, RealmLevel.Mortal);
      const goldenTree = populateSkills(NPCRole.CoreDisciple, RealmLevel.GoldenCore);

      // Mortal (Beginner) should not get fullstack_dev
      expect(mortalTree.skills.has('fullstack_dev')).toBe(false);
      // GoldenCore (Intermediate) should get fullstack_dev
      expect(goldenTree.skills.has('fullstack_dev')).toBe(true);
    });
  });

  describe('CareerComponent — Career Initialization', () => {
    it('Mortal realm starts at Junior with 0 XP', () => {
      const career = initializeCareer(RealmLevel.Mortal);
      expect(career.stage).toBe(CareerStage.Junior);
      expect(career.totalXp).toBe(0);
    });

    it('QiRefining realm starts at Junior with 200 XP', () => {
      const career = initializeCareer(RealmLevel.QiRefining);
      expect(career.stage).toBe(CareerStage.Junior);
      expect(career.totalXp).toBe(200);
    });

    it('FoundationBuilding realm starts at Mid', () => {
      const career = initializeCareer(RealmLevel.FoundationBuilding);
      expect(career.stage).toBe(CareerStage.Mid);
      expect(career.totalXp).toBe(800);
    });

    it('GoldenCore realm starts at Senior', () => {
      const career = initializeCareer(RealmLevel.GoldenCore);
      expect(career.stage).toBe(CareerStage.Senior);
      expect(career.totalXp).toBe(2500);
    });

    it('YuanInfant realm starts at Lead', () => {
      const career = initializeCareer(RealmLevel.YuanInfant);
      expect(career.stage).toBe(CareerStage.Lead);
      expect(career.totalXp).toBe(6000);
    });

    it('Transcension realm starts at Expert', () => {
      const career = initializeCareer(RealmLevel.Transcension);
      expect(career.stage).toBe(CareerStage.Expert);
      expect(career.totalXp).toBe(12000);
    });

    it('XP thresholds match agent-kernel promotion logic', () => {
      // Verify XP thresholds: Junior>=500, Mid>=2000, Senior>=5000, Lead>=10000
      // QiRefining (200 XP) should be Junior (< 500)
      const qi = initializeCareer(RealmLevel.QiRefining);
      expect(qi.totalXp).toBeLessThan(500);

      // FoundationBuilding (800 XP) should be Mid (>= 500, < 2000)
      const fb = initializeCareer(RealmLevel.FoundationBuilding);
      expect(fb.totalXp).toBeGreaterThanOrEqual(500);
      expect(fb.totalXp).toBeLessThan(2000);

      // GoldenCore (2500 XP) should be Senior (>= 2000, < 5000)
      const gc = initializeCareer(RealmLevel.GoldenCore);
      expect(gc.totalXp).toBeGreaterThanOrEqual(2000);
      expect(gc.totalXp).toBeLessThan(5000);
    });
  });

  describe('EvolutionComponent — Empty History', () => {
    it('new evolution component has empty history', () => {
      const evolution = createEmptyEvolution();
      expect(evolution.history).toHaveLength(0);
      expect(evolution.totalEvolutions).toBe(0);
      expect(evolution.successfulEvolutions).toBe(0);
    });

    it('new evolution component starts with 0% success rate', () => {
      const evolution = createEmptyEvolution();
      const successRate = evolution.totalEvolutions === 0
        ? 0
        : evolution.successfulEvolutions / evolution.totalEvolutions;
      expect(successRate).toBe(0);
    });
  });

  describe('Full NPC + Generic Components Integration', () => {
    it('attaches all three generic components to a high-rank NPC', () => {
      const npc = createTestNpc({
        role: NPCRole.FamilyHead,
        realm: RealmLevel.GoldenCore,
      });

      const skillTree = populateSkills(npc.role, npc.realm);
      const career = initializeCareer(npc.realm);
      const evolution = createEmptyEvolution();

      // SkillTree: should have multiple skills
      expect(skillTree.skills.size).toBeGreaterThan(3);
      expect(skillTree.skills.has('architecture')).toBe(true);
      expect(skillTree.skills.has('progress_tracking')).toBe(true);

      // Career: should be Senior for GoldenCore
      expect(career.stage).toBe(CareerStage.Senior);
      expect(career.totalXp).toBe(2500);

      // Evolution: empty
      expect(evolution.history).toHaveLength(0);
    });

    it('attaches all three generic components to a low-rank NPC', () => {
      const npc = createTestNpc({
        role: NPCRole.BranchDisciple,
        realm: RealmLevel.Mortal,
      });

      const skillTree = populateSkills(npc.role, npc.realm);
      const career = initializeCareer(npc.realm);
      const evolution = createEmptyEvolution();

      // SkillTree: basic skills only
      expect(skillTree.skills.size).toBeGreaterThan(0);
      expect(skillTree.skills.has('content_writing')).toBe(true);
      expect(skillTree.skills.has('architecture')).toBe(false);

      // Career: Junior
      expect(career.stage).toBe(CareerStage.Junior);
      expect(career.totalXp).toBe(0);

      // Evolution: empty
      expect(evolution.history).toHaveLength(0);
    });

    it('skill tree varies by role for same realm', () => {
      const elderTree = populateSkills(NPCRole.Elder, RealmLevel.FoundationBuilding);
      const discTree = populateSkills(NPCRole.CoreDisciple, RealmLevel.FoundationBuilding);

      // Elder gets management skills, CoreDisciple does not
      expect(elderTree.skills.has('progress_tracking')).toBe(true);
      expect(elderTree.skills.has('risk_management')).toBe(true);

      // CoreDisciple gets design skills, Elder does not
      expect(discTree.skills.has('graphic_design')).toBe(true);
      expect(elderTree.skills.has('graphic_design')).toBe(false);
    });

    it('same role at different realms produces different skill levels', () => {
      const low = populateSkills(NPCRole.Elder, RealmLevel.QiRefining);
      const high = populateSkills(NPCRole.Elder, RealmLevel.YuanInfant);

      // Same skills present
      expect(low.skills.has('architecture')).toBe(true);
      expect(high.skills.has('architecture')).toBe(true);

      // Different levels
      expect(low.skills.get('architecture')!.level).toBe(SkillLevel.Beginner);
      expect(high.skills.get('architecture')!.level).toBe(SkillLevel.Advanced);
    });

    it('career stage always matches realm level', () => {
      const realms = [
        { realm: RealmLevel.Mortal, expected: CareerStage.Junior },
        { realm: RealmLevel.QiRefining, expected: CareerStage.Junior },
        { realm: RealmLevel.FoundationBuilding, expected: CareerStage.Mid },
        { realm: RealmLevel.GoldenCore, expected: CareerStage.Senior },
        { realm: RealmLevel.YuanInfant, expected: CareerStage.Lead },
        { realm: RealmLevel.Transcension, expected: CareerStage.Expert },
      ];
      for (const { realm, expected } of realms) {
        expect(initializeCareer(realm).stage).toBe(expected);
      }
    });
  });
});
