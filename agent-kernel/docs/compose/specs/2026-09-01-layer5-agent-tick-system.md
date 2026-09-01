# Layer 5: Agent Tick & Action Effects System

**Status**: draft
**Date**: 2026-09-01
**Scope**: agent-kernel `src/ecs/systems/`
**Depends on**: L1 (Schema), L2 (Dynamic Storage), L3 (Ontology), L4 (LLM)

---

## [S1] Problem

Layers 1-4 provide the foundation for agent intelligence:
- L1: Schema introspection (entities describe themselves)
- L2: Dynamic component storage (runtime component registration)
- L3: Ontology reasoning (archetypes, validation)
- L4: LLM reasoning engine (PromptBuilder + DecisionEngine = observe → decide)

**The gap**: There is no execution layer. `DecisionEngine::decide()` returns a `Decision` struct but nothing acts on it. The `src/ecs/systems/` directory is empty. Agents can *think* but cannot *act*, *evolve*, or *live* in the world.

The agent-kernel needs an **Agent Autonomy Loop**: an ECS system layer that runs agent ticks, executes action effects on components, and enables multi-agent simulation.

## [S2] Solution Overview

Build 6 files in `src/ecs/systems/` implementing a deterministic action-effect pipeline:

```
Perceive (entity state) → Decide (LLM) → Map (Decision → ActionType)
  → Generate (ActionEffects) → Execute (apply to components) → Record (TickResult)
```

**Key design decisions**:
- Effect generation is **deterministic rule-based** — no extra LLM calls beyond the initial decide
- One tick processes **one entity** — multi-agent orchestration is a separate SimulationRunner layer
- Effects are **field-level deltas** applied atomically to components
- 7 concrete **ActionType** variants covering all L4 `Decision::action` cases

## [S3] Action Types

7 concrete action types, each mapped from L4's `Decision::action`:

| ActionType | L4 Action | Primary Effects |
|---|---|---|
| `ExecuteTask` | Execute | SkillTree XP +50~200, Career XP +10~50, Memory entry |
| `PracticeSkill` | Execute (skill focus) | SkillTree XP +100 for specific skill, Social.energy -10 |
| `Delegate` | Delegate | Memory entry (subtask), no direct state change |
| `Rest` | Execute (low energy) | Social.energy +30, Social.mood +10 |
| `Socialize` | Execute (social) | Social.socialDesire -25, Social.mood +15, Personality.sociability drift |
| `Study` | Reflect | SkillTree XP +80, Social.energy -15 |
| `Reflect` | Reflect | Memory entry + Personality trait drift (±3 on random trait) |

ActionType selection logic:
1. If `Decision::action == Delegate` → `Delegate`
2. If `Decision::action == Reflect` → `Reflect` or `Study` (based on details keywords)
3. If energy < 30 → `Rest`
4. If Decision details mention a skill → `PracticeSkill`
5. If Decision details mention social/collaborate → `Socialize`
6. Default → `ExecuteTask`

## [S4] ActionEffect Structure

```cpp
enum class TargetComponent : uint8_t {
    Social,      // energy, mood, socialDesire (SocialComponent)
    SkillTree,   // skill XP (by skill name)
    Career,      // career XP, success rate
    Personality, // trait drift (6 dimensions)
    Memory,      // add milestone/interaction entry
};

struct ActionEffect {
    TargetComponent target;
    std::string fieldName;   // e.g. "energy", "programming", "ambition"
    float delta = 0.0f;      // numeric change (positive = gain, negative = cost)
    std::string stringValue; // for Memory entries
    std::string description; // human-readable reason
};
```

### Effect generation rules by ActionType:

**ExecuteTask**: confidence-based XP scaling
- `{SkillTree, random_top_skill, 50 + confidence*150, "", "task completion"}`
- `{Career, "xp", 10 + confidence*40, "", "career progress"}`
- `{Memory, "milestone", 0, "Completed task: <details>", "experience recorded"}`

**PracticeSkill**:
- `{SkillTree, <skill_name>, 100, "", "focused practice"}`
- `{Social, "energy", -10, "", "practice fatigue"}`

**Delegate**:
- `{Memory, "interaction", 0, "Delegated task to: <delegateTo>", "delegation"}`

**Rest**:
- `{Social, "energy", 30, "", "rest recovery"}`
- `{Social, "mood", 10, "", "rest relaxation"}`

**Socialize**:
- `{Social, "socialDesire", -25, "", "social interaction"}`
- `{Social, "mood", 15, "", "social bonding"}`
- `{Personality, "sociability", 2, "", "social growth"}` (clamped 0-100)

**Study**:
- `{SkillTree, <random_skill>, 80, "", "study session"}`
- `{Social, "energy", -15, "", "study fatigue"}`

**Reflect**:
- `{Personality, <random_trait>, ±3, "", "self-reflection"}` (random direction)
- `{Memory, "milestone", 0, "Reflected on: <reasoning>", "introspection"}`

## [S5] File Structure

```
src/ecs/systems/
├── ActionTypes.h        — ActionType enum + mapDecisionToAction()
├── ActionEffect.h       — TargetComponent + ActionEffect struct + generateEffects()
├── ActionExecutor.h/.cpp — Apply effect list to entity in Registry
├── TickEngine.h/.cpp    — Single-agent tick: perceive → decide → act
└── SimulationRunner.h/.cpp — Multi-agent N-tick orchestration
```

### ActionTypes.h
- `enum class ActionType` (7 values)
- `ActionType actionTypeToString(ActionType)` / `fromString()`
- `ActionType mapDecisionToAction(const LLM::Decision& d, const ECS::Registry& reg, ECS::EntityId id)` — the selection logic from S3, reads SocialComponent to check energy threshold

### ActionEffect.h
- `TargetComponent` enum
- `ActionEffect` struct
- `std::vector<ActionEffect> generateEffects(ActionType type, const LLM::Decision& d, ECS::Registry& reg, ECS::EntityId id)` — deterministic effect generation per S4 rules

### ActionExecutor.h/.cpp
- `class ActionExecutor` — holds no state, pure function-like
- `void apply(ECS::Registry& reg, ECS::EntityId id, const std::vector<ActionEffect>& effects)`
- Dispatches by `TargetComponent`:
  - Social: modifies `SocialComponent` fields (energy, mood, socialDesire) by delta (clamped 0-100)
  - SkillTree: calls `addXp()` for named skill (auto-creates if new)
  - Career: calls `CareerComponent::addXp()` (auto-promotion built-in)
  - Personality: drifts named trait by delta (clamped 0-100)
  - Memory: appends to `MemoryRingComponent` via `recordMilestone()`

### TickEngine.h/.cpp
- `class TickEngine(LLM::LLMClient* client)`
- `TickResult tick(Registry& reg, EntityId id, const std::string& task)`
  1. Call `DecisionEngine::decide()` (L4)
  2. `mapDecisionToAction()` → ActionType
  3. `generateEffects()` → effect list
  4. `ActionExecutor::apply()` → mutate components
  5. Return `TickResult{action, decision, effects, timestamp, tickNumber}`
- `int nextTickNumber()` — monotonic counter

### SimulationRunner.h/.cpp
- `class SimulationRunner(TickEngine* engine)`
- `std::vector<TickResult> run(Registry& reg, const std::vector<EntityId>& entities, int ticks, const std::vector<std::string>& tasks)`
  - For each tick round: iterate entities, call `engine->tick()` with task (round-robin)
  - Collect all TickResults
- `SimulationSummary summarize(const std::vector<TickResult>& results)` — action distribution, avg confidence, total ticks

## [S6] TickResult Structure

```cpp
struct TickResult {
    ActionType action;
    LLM::Decision decision;
    std::vector<ActionEffect> effects;
    uint64_t timestamp;   // milliseconds since epoch
    int tickNumber;

    std::string toJson() const;  // for IPC
};

struct SimulationSummary {
    int totalTicks = 0;
    std::unordered_map<ActionType, int> actionCounts;
    float averageConfidence = 0.0f;

    std::string toJson() const;
};
```

## [S7] IPC Additions

Two new methods in `Protocol.h`:

| Method | Request Params | Response |
|---|---|---|
| `agentTick` | `{entityId: int, task: string}` | `{tick: TickResult JSON}` |
| `runSimulation` | `{entityIds: int[], ticks: int, tasks: string[]}` | `{results: TickResult[], summary: SimulationSummary JSON}` |

Added to `AgentKernelBridge.h`:
- `handleAgentTick(params)` — validates entityId exists, runs TickEngine::tick(), returns TickResult JSON
- `handleRunSimulation(params)` — validates all entityIds, runs SimulationRunner::run(), returns results + summary

## [S8] Testing Strategy

Test files:
- `tests/test_action_types.cpp` — ActionType enum, mapDecisionToAction logic
- `tests/test_action_effects.cpp` — generateEffects for each ActionType
- `tests/test_action_executor.cpp` — Apply effects to mock entities, verify component changes
- `tests/test_tick_engine.cpp` — Full tick cycle with mock LLMClient
- `tests/test_simulation_runner.cpp` — Multi-entity multi-tick simulation
- `tests/test_ipc_tick.cpp` — IPC endpoint tests for agentTick + runSimulation

Test count estimate: ~40-50 new tests
- Action types: ~8 tests (enum, mapping, edge cases)
- Action effects: ~10 tests (each action type + combinations)
- Action executor: ~8 tests (each TargetComponent + clamping + auto-create)
- Tick engine: ~8 tests (happy path, LLM failure, edge cases)
- Simulation runner: ~6 tests (single entity, multi entity, summary)
- IPC: ~6 tests (valid/invalid params, multi-entity)

## [S9] Implementation Order

1. **ActionTypes.h** — enum + mapDecisionToAction() (no deps beyond L4 Decision)
2. **ActionEffect.h** — struct + generateEffects() (depends on ActionTypes)
3. **ActionExecutor.h/.cpp** — apply() (depends on ActionEffect + all ECS components)
4. **TickEngine.h/.cpp** — ties L4 + effects + executor together
5. **SimulationRunner.h/.cpp** — wraps TickEngine for batch
6. **IPC** — add agentTick + runSimulation to Protocol.h and AgentKernelBridge.h
7. **Tests** — write alongside each step

## [S10] Success Criteria

- [ ] 7 ActionTypes defined with deterministic mapping from Decision
- [ ] ActionEffect struct covers all 6 TargetComponent types
- [ ] ActionExecutor correctly modifies ECS components (XP, Stats, Personality, Memory, Career, Social)
- [ ] TickEngine runs full perceive→decide→act cycle for one entity
- [ ] SimulationRunner runs N entities through M ticks
- [ ] 2 new IPC methods (agentTick, runSimulation) working
- [ ] 40+ tests passing
- [ ] All existing tests still pass (no regressions)
