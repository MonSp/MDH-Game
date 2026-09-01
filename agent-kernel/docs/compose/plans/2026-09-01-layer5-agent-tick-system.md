# Layer 5: Agent Tick & Action Effects — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Agent Autonomy Loop — ECS systems that run agent ticks (perceive → LLM decide → execute action → apply effects → update state).

**Architecture:** 6 new files in `src/ecs/systems/`: ActionTypes (action enum + mapping), ActionEffect (field deltas), ActionExecutor (apply effects to components), TickEngine (single-agent tick), SimulationRunner (multi-agent batch). 2 new IPC methods. ~45 new tests.

**Tech Stack:** C++17, ECS component system (L1-L4), gtest-style assert tests (matching existing `kernel_tests` pattern).

## Global Constraints

- Follow existing test pattern: `assert()` + `printf("  PASS: testName\n")` (no gtest framework)
- Components use `ECS::ComponentBase<T>` CRTP pattern
- `SocialComponent` has `energy`, `mood`, `socialDesire` (NOT StatsComponent)
- `CareerComponent::addXp()` has built-in auto-promotion
- `SkillTreeComponent::addXp()` has built-in auto level-up (every 1000 XP)
- `MemoryRingComponent` uses packed structs (`LongTermMilestone`, `InteractionSlot`) + `RingBuffer`
- `HttpClient::setMockResponse()` for mocking LLM in tests
- All IPC JSON must be compacted (no embedded `\n`)

---

### Task 1: ActionTypes — Action Type Enum & Decision Mapping

**Covers:** [S3], [S5]

**Files:**
- Create: `src/ecs/systems/ActionTypes.h`
- Test: `tests/test_action_types.cpp`

**Interfaces:**
- Consumes: `LLM::Decision` (from L4), `ECS::Registry`, `ECS::EntityId`
- Produces: `Systems::ActionType` enum, `Systems::mapDecisionToAction()`, `Systems::actionTypeToString()`

- [ ] **Step 1: Create the header file**

```cpp
// src/ecs/systems/ActionTypes.h
#pragma once
// ActionTypes — 7 concrete agent action types + Decision → ActionType mapping.

#include "../llm/DecisionEngine.h"
#include "../ecs/Registry.h"
#include "../ecs/components/SocialComponent.h"
#include <string>
#include <algorithm>
#include <cctype>

namespace Systems {

enum class ActionType : uint8_t {
    ExecuteTask = 0,
    PracticeSkill,
    Delegate,
    Rest,
    Socialize,
    Study,
    Reflect
};

inline std::string actionTypeToString(ActionType t) {
    switch (t) {
        case ActionType::ExecuteTask:  return "executeTask";
        case ActionType::PracticeSkill: return "practiceSkill";
        case ActionType::Delegate:     return "delegate";
        case ActionType::Rest:         return "rest";
        case ActionType::Socialize:    return "socialize";
        case ActionType::Study:        return "study";
        case ActionType::Reflect:      return "reflect";
        default:                       return "executeTask";
    }
}

inline ActionType actionTypeFromString(const std::string& s) {
    std::string lower = s;
    std::transform(lower.begin(), lower.end(), lower.begin(),
                   [](unsigned char c) { return std::tolower(c); });
    if (lower == "executetask")   return ActionType::ExecuteTask;
    if (lower == "practiceskill") return ActionType::PracticeSkill;
    if (lower == "delegate")      return ActionType::Delegate;
    if (lower == "rest")          return ActionType::Rest;
    if (lower == "socialize")     return ActionType::Socialize;
    if (lower == "study")         return ActionType::Study;
    if (lower == "reflect")       return ActionType::Reflect;
    return ActionType::ExecuteTask;
}

// Map a Decision + entity state → ActionType.
// Logic from spec [S3]:
// 1. Delegate action → Delegate
// 2. Reflect action → Reflect or Study
// 3. Energy < 30 → Rest
// 4. Details mention skill → PracticeSkill
// 5. Details mention social → Socialize
// 6. Default → ExecuteTask
inline ActionType mapDecisionToAction(const LLM::Decision& d,
                                      const ECS::Registry& reg,
                                      ECS::EntityId id) {
    // Rule 1: Delegate
    if (d.action == LLM::Action::Delegate) {
        return ActionType::Delegate;
    }

    // Rule 2: Reflect → Study or Reflect
    if (d.action == LLM::Action::Reflect) {
        std::string lower = d.details + " " + d.reasoning;
        std::transform(lower.begin(), lower.end(), lower.begin(),
                       [](unsigned char c) { return std::tolower(c); });
        if (lower.find("study") != std::string::npos ||
            lower.find("learn") != std::string::npos ||
            lower.find("research") != std::string::npos) {
            return ActionType::Study;
        }
        return ActionType::Reflect;
    }

    // Rule 3: Low energy → Rest (check SocialComponent)
    auto* social = reg.getComponent<SocialComponent>(id);
    if (social && social->energy < 30.0f) {
        return ActionType::Rest;
    }

    // Rule 4: Details mention skill → PracticeSkill
    {
        std::string lower = d.details + " " + d.reasoning;
        std::transform(lower.begin(), lower.end(), lower.begin(),
                       [](unsigned char c) { return std::tolower(c); });
        if (lower.find("skill") != std::string::npos ||
            lower.find("practice") != std::string::npos ||
            lower.find("train") != std::string::npos) {
            return ActionType::PracticeSkill;
        }
    }

    // Rule 5: Details mention social → Socialize
    {
        std::string lower = d.details + " " + d.reasoning;
        std::transform(lower.begin(), lower.end(), lower.begin(),
                       [](unsigned char c) { return std::tolower(c); });
        if (lower.find("social") != std::string::npos ||
            lower.find("collaborate") != std::string::npos ||
            lower.find("team") != std::string::npos) {
            return ActionType::Socialize;
        }
    }

    // Rule 6: Default
    return ActionType::ExecuteTask;
}

} // namespace Systems
```

- [ ] **Step 2: Write the test file**

```cpp
// tests/test_action_types.cpp
// Tests for ActionTypes — action type enum + Decision mapping.
#include "ecs/systems/ActionTypes.h"
#include "ecs/Registry.h"
#include "ecs/components/IdentityComponent.h"
#include "ecs/components/SocialComponent.h"
#include "ecs/components/PersonalityComponent.h"
#include <cassert>
#include <cstdio>
#include <string>
#include <cmath>

using namespace Systems;
using namespace ECS;

// Helper: create test entity with SocialComponent
static EntityId createEntityWithSocial(Registry& reg, float energy) {
    Entity e = reg.createEntity();
    EntityId id = e.getId();
    reg.addComponent<IdentityComponent>(id, "a" + std::to_string(id), "Test", AgentRole::Specialist);
    auto& social = reg.addComponent<SocialComponent>(id);
    social.energy = energy;
    return id;
}

static void testActionTypeRoundtrip() {
    ActionType types[] = {
        ActionType::ExecuteTask, ActionType::PracticeSkill,
        ActionType::Delegate, ActionType::Rest,
        ActionType::Socialize, ActionType::Study, ActionType::Reflect
    };
    for (auto t : types) {
        std::string s = actionTypeToString(t);
        ActionType back = actionTypeFromString(s);
        assert(back == t);
    }
    printf("  PASS: testActionTypeRoundtrip\n");
}

static void testActionTypeFromStringUnknown() {
    assert(actionTypeFromString("unknown") == ActionType::ExecuteTask);
    assert(actionTypeFromString("") == ActionType::ExecuteTask);
    printf("  PASS: testActionTypeFromStringUnknown\n");
}

static void testMapDelegateAction() {
    Registry reg;
    EntityId id = createEntityWithSocial(reg, 80.0f);
    LLM::Decision d;
    d.action = LLM::Action::Delegate;
    d.delegateTo = "frontend-team";
    assert(mapDecisionToAction(d, reg, id) == ActionType::Delegate);
    printf("  PASS: testMapDelegateAction\n");
}

static void testMapReflectAction() {
    Registry reg;
    EntityId id = createEntityWithSocial(reg, 80.0f);
    LLM::Decision d;
    d.action = LLM::Action::Reflect;
    d.reasoning = "Need to think about this";
    assert(mapDecisionToAction(d, reg, id) == ActionType::Reflect);
    printf("  PASS: testMapReflectAction\n");
}

static void testMapReflectStudyKeywords() {
    Registry reg;
    EntityId id = createEntityWithSocial(reg, 80.0f);
    LLM::Decision d;
    d.action = LLM::Action::Reflect;
    d.details = "I should study the architecture";
    assert(mapDecisionToAction(d, reg, id) == ActionType::Study);
    printf("  PASS: testMapReflectStudyKeywords\n");
}

static void testMapLowEnergyRest() {
    Registry reg;
    EntityId id = createEntityWithSocial(reg, 20.0f); // < 30
    LLM::Decision d;
    d.action = LLM::Action::Execute;
    d.reasoning = "I'll work on this";
    assert(mapDecisionToAction(d, reg, id) == ActionType::Rest);
    printf("  PASS: testMapLowEnergyRest\n");
}

static void testMapSkillPractice() {
    Registry reg;
    EntityId id = createEntityWithSocial(reg, 80.0f);
    LLM::Decision d;
    d.action = LLM::Action::Execute;
    d.details = "practice my programming skills";
    assert(mapDecisionToAction(d, reg, id) == ActionType::PracticeSkill);
    printf("  PASS: testMapSkillPractice\n");
}

static void testMapSocialAction() {
    Registry reg;
    EntityId id = createEntityWithSocial(reg, 80.0f);
    LLM::Decision d;
    d.action = LLM::Action::Execute;
    d.details = "collaborate with team members";
    assert(mapDecisionToAction(d, reg, id) == ActionType::Socialize);
    printf("  PASS: testMapSocialAction\n");
}

static void testMapDefaultExecuteTask() {
    Registry reg;
    EntityId id = createEntityWithSocial(reg, 80.0f);
    LLM::Decision d;
    d.action = LLM::Action::Execute;
    d.reasoning = "Implement the feature";
    assert(mapDecisionToAction(d, reg, id) == ActionType::ExecuteTask);
    printf("  PASS: testMapDefaultExecuteTask\n");
}

int main() {
    printf("=== test_action_types ===\n");
    testActionTypeRoundtrip();
    testActionTypeFromStringUnknown();
    testMapDelegateAction();
    testMapReflectAction();
    testMapReflectStudyKeywords();
    testMapLowEnergyRest();
    testMapSkillPractice();
    testMapSocialAction();
    testMapDefaultExecuteTask();
    printf("All action type tests passed.\n");
    return 0;
}
```

- [ ] **Step 3: Add test to CMakeLists.txt**

Add `tests/test_action_types.cpp` to the `kernel_tests` target in `CMakeLists.txt`.

- [ ] **Step 4: Build and run**

```bash
cd /home/test/MyGame/agent-kernel/build && cmake .. && make -j$(nproc) && ./kernel_tests
```

Expected: All existing tests + 9 new action type tests pass.

- [ ] **Step 5: Commit**

```bash
cd /home/test/MyGame && git add agent-kernel/ && git commit -m "feat(agent-kernel): Layer 5 Task 1 — ActionTypes enum + Decision mapping (9 tests)"
```

---

### Task 2: ActionEffect — Field-Level Mutation Struct & Effect Generation

**Covers:** [S4], [S5]

**Files:**
- Create: `src/ecs/systems/ActionEffect.h`
- Test: `tests/test_action_effects.cpp`

**Interfaces:**
- Consumes: `Systems::ActionType` (from Task 1), `LLM::Decision`, `ECS::Registry`, `ECS::EntityId`
- Produces: `Systems::TargetComponent`, `Systems::ActionEffect`, `Systems::generateEffects()`

- [ ] **Step 1: Create the header file**

```cpp
// src/ecs/systems/ActionEffect.h
#pragma once
// ActionEffect — field-level component mutations generated from ActionTypes.

#include "ActionTypes.h"
#include "../ecs/Registry.h"
#include "../ecs/components/SkillTreeComponent.h"
#include <string>
#include <vector>
#include <cstdint>
#include <cstdlib>

namespace Systems {

enum class TargetComponent : uint8_t {
    Social = 0,    // SocialComponent: energy, mood, socialDesire
    SkillTree,     // SkillTreeComponent: skill XP
    Career,        // CareerComponent: career XP
    Personality,   // PersonalityComponent: trait drift
    Memory         // MemoryRingComponent: milestone entry
};

struct ActionEffect {
    TargetComponent target;
    std::string fieldName;   // e.g. "energy", "programming", "ambition"
    float delta = 0.0f;      // numeric change
    std::string stringValue; // for Memory entries
    std::string description; // human-readable reason
};

// Helper: pick a random skill name from the entity's SkillTreeComponent.
// Returns empty string if no skills.
inline std::string pickRandomSkill(const ECS::Registry& reg, ECS::EntityId id) {
    auto* skills = reg.getComponent<SkillTreeComponent>(id);
    if (!skills || skills->skills.empty()) return "";
    size_t idx = static_cast<size_t>(std::rand()) % skills->skills.size();
    auto it = skills->skills.begin();
    std::advance(it, idx);
    return it->first;
}

// Helper: pick a random personality trait name.
inline std::string pickRandomTrait() {
    static const char* traits[] = {"ambition", "caution", "loyalty", "greed", "sociability", "diligence"};
    return traits[static_cast<size_t>(std::rand()) % 6];
}

// Generate deterministic effects for a given action type.
inline std::vector<ActionEffect> generateEffects(ActionType type,
                                                  const LLM::Decision& d,
                                                  const ECS::Registry& reg,
                                                  ECS::EntityId id) {
    std::vector<ActionEffect> effects;

    switch (type) {
        case ActionType::ExecuteTask: {
            float xp = 50.0f + d.confidence * 150.0f;
            float careerXp = 10.0f + d.confidence * 40.0f;
            std::string skill = pickRandomSkill(reg, id);
            if (!skill.empty()) {
                effects.push_back({TargetComponent::SkillTree, skill, xp, "", "task completion"});
            }
            effects.push_back({TargetComponent::Career, "totalXp", careerXp, "", "career progress"});
            effects.push_back({TargetComponent::Memory, "milestone", 0.0f,
                               "Completed task: " + d.details.empty() ? d.reasoning : d.details,
                               "experience recorded"});
            break;
        }
        case ActionType::PracticeSkill: {
            std::string skill = pickRandomSkill(reg, id);
            if (!skill.empty()) {
                effects.push_back({TargetComponent::SkillTree, skill, 100.0f, "", "focused practice"});
            }
            effects.push_back({TargetComponent::Social, "energy", -10.0f, "", "practice fatigue"});
            break;
        }
        case ActionType::Delegate: {
            effects.push_back({TargetComponent::Memory, "interaction", 0.0f,
                               "Delegated task to: " + d.delegateTo, "delegation"});
            break;
        }
        case ActionType::Rest: {
            effects.push_back({TargetComponent::Social, "energy", 30.0f, "", "rest recovery"});
            effects.push_back({TargetComponent::Social, "mood", 10.0f, "", "rest relaxation"});
            break;
        }
        case ActionType::Socialize: {
            effects.push_back({TargetComponent::Social, "socialDesire", -25.0f, "", "social interaction"});
            effects.push_back({TargetComponent::Social, "mood", 15.0f, "", "social bonding"});
            effects.push_back({TargetComponent::Personality, "sociability", 2.0f, "", "social growth"});
            break;
        }
        case ActionType::Study: {
            std::string skill = pickRandomSkill(reg, id);
            if (!skill.empty()) {
                effects.push_back({TargetComponent::SkillTree, skill, 80.0f, "", "study session"});
            }
            effects.push_back({TargetComponent::Social, "energy", -15.0f, "", "study fatigue"});
            break;
        }
        case ActionType::Reflect: {
            std::string trait = pickRandomTrait();
            float direction = (std::rand() % 2 == 0) ? 3.0f : -3.0f;
            effects.push_back({TargetComponent::Personality, trait, direction, "", "self-reflection"});
            effects.push_back({TargetComponent::Memory, "milestone", 0.0f,
                               "Reflected on: " + d.reasoning, "introspection"});
            break;
        }
    }

    return effects;
}

} // namespace Systems
```

- [ ] **Step 2: Write the test file**

```cpp
// tests/test_action_effects.cpp
// Tests for ActionEffect — effect generation for all ActionTypes.
#include "ecs/systems/ActionEffect.h"
#include "ecs/Registry.h"
#include "ecs/components/IdentityComponent.h"
#include "ecs/components/SocialComponent.h"
#include "ecs/components/SkillTreeComponent.h"
#include "ecs/components/PersonalityComponent.h"
#include "ecs/components/CareerComponent.h"
#include "ecs/components/MemoryRingComponent.h"
#include <cassert>
#include <cstdio>
#include <string>

using namespace Systems;
using namespace ECS;

static EntityId createFullEntity(Registry& reg) {
    Entity e = reg.createEntity();
    EntityId id = e.getId();
    reg.addComponent<IdentityComponent>(id, "a" + std::to_string(id), "Test", AgentRole::Specialist);
    reg.addComponent<SocialComponent>(id);
    reg.addComponent<PersonalityComponent>(id, 50, 50, 50, 50, 50, 50);
    auto& skills = reg.addComponent<SkillTreeComponent>(id);
    skills.addSkill("backend_dev", SkillCategory::Engineering, SkillLevel::Advanced);
    reg.addComponent<CareerComponent>(id);
    reg.addComponent<MemoryRingComponent>(id);
    return id;
}

static LLM::Decision makeDecision(LLM::Action action, const std::string& details = "",
                                   const std::string& delegateTo = "") {
    LLM::Decision d;
    d.action = action;
    d.confidence = 0.8f;
    d.reasoning = "test reasoning";
    d.details = details;
    d.delegateTo = delegateTo;
    return d;
}

static void testExecuteTaskEffects() {
    Registry reg;
    EntityId id = createFullEntity(reg);
    auto effects = generateEffects(ActionType::ExecuteTask, makeDecision(LLM::Action::Execute), reg, id);
    assert(effects.size() == 3); // skill + career + memory
    assert(effects[0].target == TargetComponent::SkillTree);
    assert(effects[0].fieldName == "backend_dev");
    assert(effects[0].delta > 0.0f);
    assert(effects[1].target == TargetComponent::Career);
    assert(effects[2].target == TargetComponent::Memory);
    printf("  PASS: testExecuteTaskEffects\n");
}

static void testPracticeSkillEffects() {
    Registry reg;
    EntityId id = createFullEntity(reg);
    auto effects = generateEffects(ActionType::PracticeSkill, makeDecision(LLM::Action::Execute), reg, id);
    assert(effects.size() == 2); // skill + energy
    assert(effects[0].target == TargetComponent::SkillTree);
    assert(effects[0].delta == 100.0f);
    assert(effects[1].target == TargetComponent::Social);
    assert(effects[1].fieldName == "energy");
    assert(effects[1].delta == -10.0f);
    printf("  PASS: testPracticeSkillEffects\n");
}

static void testDelegateEffects() {
    Registry reg;
    EntityId id = createFullEntity(reg);
    auto effects = generateEffects(ActionType::Delegate, makeDecision(LLM::Action::Delegate, "", "frontend"), reg, id);
    assert(effects.size() == 1);
    assert(effects[0].target == TargetComponent::Memory);
    assert(effects[0].stringValue.find("frontend") != std::string::npos);
    printf("  PASS: testDelegateEffects\n");
}

static void testRestEffects() {
    Registry reg;
    EntityId id = createFullEntity(reg);
    auto effects = generateEffects(ActionType::Rest, makeDecision(LLM::Action::Execute), reg, id);
    assert(effects.size() == 2);
    assert(effects[0].fieldName == "energy" && effects[0].delta == 30.0f);
    assert(effects[1].fieldName == "mood" && effects[1].delta == 10.0f);
    printf("  PASS: testRestEffects\n");
}

static void testSocializeEffects() {
    Registry reg;
    EntityId id = createFullEntity(reg);
    auto effects = generateEffects(ActionType::Socialize, makeDecision(LLM::Action::Execute), reg, id);
    assert(effects.size() == 3);
    assert(effects[0].fieldName == "socialDesire" && effects[0].delta == -25.0f);
    assert(effects[1].fieldName == "mood" && effects[1].delta == 15.0f);
    assert(effects[2].fieldName == "sociability" && effects[2].delta == 2.0f);
    printf("  PASS: testSocializeEffects\n");
}

static void testStudyEffects() {
    Registry reg;
    EntityId id = createFullEntity(reg);
    auto effects = generateEffects(ActionType::Study, makeDecision(LLM::Action::Reflect), reg, id);
    assert(effects.size() == 2);
    assert(effects[0].target == TargetComponent::SkillTree);
    assert(effects[0].delta == 80.0f);
    assert(effects[1].fieldName == "energy" && effects[1].delta == -15.0f);
    printf("  PASS: testStudyEffects\n");
}

static void testReflectEffects() {
    Registry reg;
    EntityId id = createFullEntity(reg);
    auto effects = generateEffects(ActionType::Reflect, makeDecision(LLM::Action::Reflect), reg, id);
    assert(effects.size() == 2);
    assert(effects[0].target == TargetComponent::Personality);
    assert(std::abs(effects[0].delta) == 3.0f);
    assert(effects[1].target == TargetComponent::Memory);
    printf("  PASS: testReflectEffects\n");
}

static void testExecuteTaskConfidenceScaling() {
    Registry reg;
    EntityId id = createFullEntity(reg);
    LLM::Decision dLow = makeDecision(LLM::Action::Execute);
    dLow.confidence = 0.1f;
    LLM::Decision dHigh = makeDecision(LLM::Action::Execute);
    dHigh.confidence = 0.9f;
    auto effLow = generateEffects(ActionType::ExecuteTask, dLow, reg, id);
    auto effHigh = generateEffects(ActionType::ExecuteTask, dHigh, reg, id);
    // Higher confidence → more XP
    assert(effHigh[0].delta > effLow[0].delta);
    printf("  PASS: testExecuteTaskConfidenceScaling\n");
}

int main() {
    printf("=== test_action_effects ===\n");
    std::srand(42); // deterministic for tests
    testExecuteTaskEffects();
    testPracticeSkillEffects();
    testDelegateEffects();
    testRestEffects();
    testSocializeEffects();
    testStudyEffects();
    testReflectEffects();
    testExecuteTaskConfidenceScaling();
    printf("All action effect tests passed.\n");
    return 0;
}
```

- [ ] **Step 3: Add test to CMakeLists.txt**

Add `tests/test_action_effects.cpp` to the `kernel_tests` target.

- [ ] **Step 4: Build and run**

```bash
cd /home/test/MyGame/agent-kernel/build && cmake .. && make -j$(nproc) && ./kernel_tests
```

Expected: All existing + 8 new effect tests pass.

- [ ] **Step 5: Commit**

```bash
cd /home/test/MyGame && git add agent-kernel/ && git commit -m "feat(agent-kernel): Layer 5 Task 2 — ActionEffect struct + generateEffects (8 tests)"
```

---

### Task 3: ActionExecutor — Apply Effects to ECS Components

**Covers:** [S4], [S5]

**Files:**
- Create: `src/ecs/systems/ActionExecutor.h`, `src/ecs/systems/ActionExecutor.cpp`
- Test: `tests/test_action_executor.cpp`

**Interfaces:**
- Consumes: `Systems::ActionEffect` (from Task 2), `ECS::Registry`, `ECS::EntityId`
- Produces: `Systems::ActionExecutor::apply()` — mutates entity components in-place

- [ ] **Step 1: Create the header file**

```cpp
// src/ecs/systems/ActionExecutor.h
#pragma once
// ActionExecutor — applies ActionEffect lists to ECS entities.

#include "ActionEffect.h"
#include "../ecs/Registry.h"
#include <vector>

namespace Systems {

class ActionExecutor {
public:
    // Apply a list of effects to an entity. Effects applied in order.
    static void apply(ECS::Registry& reg, ECS::EntityId id,
                      const std::vector<ActionEffect>& effects);
};

} // namespace Systems
```

- [ ] **Step 2: Create the implementation file**

```cpp
// src/ecs/systems/ActionExecutor.cpp
#include "ActionExecutor.h"
#include "../ecs/components/SocialComponent.h"
#include "../ecs/components/SkillTreeComponent.h"
#include "../ecs/components/CareerComponent.h"
#include "../ecs/components/PersonalityComponent.h"
#include "../ecs/components/MemoryRingComponent.h"
#include <algorithm>
#include <cstring>

namespace Systems {

namespace {

float clamp01(float v, float lo, float hi) {
    return std::max(lo, std::min(hi, v));
}

void applySocial(ECS::Registry& reg, ECS::EntityId id, const ActionEffect& eff) {
    auto* social = reg.getComponent<SocialComponent>(id);
    if (!social) return;
    if (eff.fieldName == "energy") {
        social->energy = clamp01(social->energy + eff.delta, 0.0f, 100.0f);
    } else if (eff.fieldName == "mood") {
        social->mood = clamp01(social->mood + eff.delta, 0.0f, 100.0f);
    } else if (eff.fieldName == "socialDesire") {
        social->socialDesire = clamp01(social->socialDesire + eff.delta, 0.0f, 100.0f);
    } else if (eff.fieldName == "fatigue") {
        social->fatigue = clamp01(social->fatigue + eff.delta, 0.0f, 100.0f);
    } else if (eff.fieldName == "hunger") {
        social->hunger = clamp01(social->hunger + eff.delta, 0.0f, 100.0f);
    }
}

void applySkillTree(ECS::Registry& reg, ECS::EntityId id, const ActionEffect& eff) {
    auto* skills = reg.getComponent<SkillTreeComponent>(id);
    if (!skills) return;
    uint32_t amount = static_cast<uint32_t>(std::max(0.0f, eff.delta));
    if (skills->hasSkill(eff.fieldName)) {
        skills->addXp(eff.fieldName, amount);
    } else {
        // Auto-create skill with default category
        skills->addSkill(eff.fieldName, SkillCategory::Engineering, SkillLevel::Beginner);
        skills->addXp(eff.fieldName, amount);
    }
}

void applyCareer(ECS::Registry& reg, ECS::EntityId id, const ActionEffect& eff) {
    auto* career = reg.getComponent<CareerComponent>(id);
    if (!career) return;
    if (eff.fieldName == "totalXp") {
        uint32_t amount = static_cast<uint32_t>(std::max(0.0f, eff.delta));
        career->addXp(amount);
    }
}

void applyPersonality(ECS::Registry& reg, ECS::EntityId id, const ActionEffect& eff) {
    auto* personality = reg.getComponent<PersonalityComponent>(id);
    if (!personality) return;
    // Map field name to trait
    float* trait = nullptr;
    if (eff.fieldName == "ambition") trait = &personality->ambition;
    else if (eff.fieldName == "caution") trait = &personality->caution;
    else if (eff.fieldName == "loyalty") trait = &personality->loyalty;
    else if (eff.fieldName == "greed") trait = &personality->greed;
    else if (eff.fieldName == "sociability") trait = &personality->sociability;
    else if (eff.fieldName == "diligence") trait = &personality->diligence;
    if (trait) {
        *trait = clamp01(*trait + eff.delta, 0.0f, 100.0f);
    }
}

void applyMemory(ECS::Registry& reg, ECS::EntityId id, const ActionEffect& eff) {
    auto* memory = reg.getComponent<MemoryRingComponent>(id);
    if (!memory) return;
    // Record as a long-term milestone with type based on field name
    MilestoneType type = MilestoneType::MajorCommand;
    if (eff.fieldName == "interaction") {
        type = MilestoneType::DaoCompanionBond;
    }
    memory->recordMilestone(type, 0, 5);
}

} // anonymous namespace

void ActionExecutor::apply(ECS::Registry& reg, ECS::EntityId id,
                           const std::vector<ActionEffect>& effects) {
    for (const auto& eff : effects) {
        switch (eff.target) {
            case TargetComponent::Social:      applySocial(reg, id, eff); break;
            case TargetComponent::SkillTree:   applySkillTree(reg, id, eff); break;
            case TargetComponent::Career:      applyCareer(reg, id, eff); break;
            case TargetComponent::Personality: applyPersonality(reg, id, eff); break;
            case TargetComponent::Memory:      applyMemory(reg, id, eff); break;
        }
    }
}

} // namespace Systems
```

- [ ] **Step 3: Write the test file**

```cpp
// tests/test_action_executor.cpp
// Tests for ActionExecutor — applying effects to ECS entities.
#include "ecs/systems/ActionExecutor.h"
#include "ecs/Registry.h"
#include "ecs/components/IdentityComponent.h"
#include "ecs/components/SocialComponent.h"
#include "ecs/components/SkillTreeComponent.h"
#include "ecs/components/CareerComponent.h"
#include "ecs/components/PersonalityComponent.h"
#include "ecs/components/MemoryRingComponent.h"
#include <cassert>
#include <cstdio>
#include <cmath>

using namespace Systems;
using namespace ECS;

static EntityId createFullEntity(Registry& reg) {
    Entity e = reg.createEntity();
    EntityId id = e.getId();
    reg.addComponent<IdentityComponent>(id, "a" + std::to_string(id), "Test", AgentRole::Specialist);
    auto& social = reg.addComponent<SocialComponent>(id);
    social.energy = 50.0f;
    social.mood = 60.0f;
    social.socialDesire = 40.0f;
    auto& skills = reg.addComponent<SkillTreeComponent>(id);
    skills.addSkill("backend_dev", SkillCategory::Engineering, SkillLevel::Advanced);
    reg.addComponent<CareerComponent>(id);
    reg.addComponent<PersonalityComponent>(id, 50, 50, 50, 50, 50, 50);
    reg.addComponent<MemoryRingComponent>(id);
    return id;
}

static void testApplySocialEnergy() {
    Registry reg;
    EntityId id = createFullEntity(reg);
    std::vector<ActionEffect> effs = {{TargetComponent::Social, "energy", 30.0f, "", "rest"}};
    ActionExecutor::apply(reg, id, effs);
    auto* social = reg.getComponent<SocialComponent>(id);
    assert(std::abs(social->energy - 80.0f) < 0.01f);
    printf("  PASS: testApplySocialEnergy\n");
}

static void testApplySocialClamping() {
    Registry reg;
    EntityId id = createFullEntity(reg);
    // Energy at 50, subtract 80 → should clamp to 0
    std::vector<ActionEffect> effs = {{TargetComponent::Social, "energy", -80.0f, "", "drain"}};
    ActionExecutor::apply(reg, id, effs);
    auto* social = reg.getComponent<SocialComponent>(id);
    assert(std::abs(social->energy - 0.0f) < 0.01f);
    printf("  PASS: testApplySocialClamping\n");
}

static void testApplySkillTreeXp() {
    Registry reg;
    EntityId id = createFullEntity(reg);
    std::vector<ActionEffect> effs = {{TargetComponent::SkillTree, "backend_dev", 200.0f, "", "task"}};
    ActionExecutor::apply(reg, id, effs);
    auto* skills = reg.getComponent<SkillTreeComponent>(id);
    assert(skills->getSkill("backend_dev")->xp == 200);
    printf("  PASS: testApplySkillTreeXp\n");
}

static void testApplySkillTreeAutoCreate() {
    Registry reg;
    EntityId id = createFullEntity(reg);
    std::vector<ActionEffect> effs = {{TargetComponent::SkillTree, "new_skill", 50.0f, "", "learn"}};
    ActionExecutor::apply(reg, id, effs);
    auto* skills = reg.getComponent<SkillTreeComponent>(id);
    assert(skills->hasSkill("new_skill"));
    assert(skills->getSkill("new_skill")->xp == 50);
    printf("  PASS: testApplySkillTreeAutoCreate\n");
}

static void testApplyCareerXp() {
    Registry reg;
    EntityId id = createFullEntity(reg);
    std::vector<ActionEffect> effs = {{TargetComponent::Career, "totalXp", 100.0f, "", "work"}};
    ActionExecutor::apply(reg, id, effs);
    auto* career = reg.getComponent<CareerComponent>(id);
    assert(career->totalXp == 100);
    printf("  PASS: testApplyCareerXp\n");
}

static void testApplyPersonalityDrift() {
    Registry reg;
    EntityId id = createFullEntity(reg);
    std::vector<ActionEffect> effs = {{TargetComponent::Personality, "sociability", 5.0f, "", "social"}};
    ActionExecutor::apply(reg, id, effs);
    auto* personality = reg.getComponent<PersonalityComponent>(id);
    assert(std::abs(personality->sociability - 55.0f) < 0.01f);
    printf("  PASS: testApplyPersonalityDrift\n");
}

static void testApplyPersonalityClamping() {
    Registry reg;
    EntityId id = createFullEntity(reg);
    std::vector<ActionEffect> effs = {{TargetComponent::Personality, "ambition", 80.0f, "", "boost"}};
    ActionExecutor::apply(reg, id, effs);
    auto* personality = reg.getComponent<PersonalityComponent>(id);
    assert(std::abs(personality->ambition - 100.0f) < 0.01f); // clamped
    printf("  PASS: testApplyPersonalityClamping\n");
}

static void testApplyMemoryEntry() {
    Registry reg;
    EntityId id = createFullEntity(reg);
    std::vector<ActionEffect> effs = {{TargetComponent::Memory, "milestone", 0.0f, "did something", "record"}};
    ActionExecutor::apply(reg, id, effs);
    auto* memory = reg.getComponent<MemoryRingComponent>(id);
    assert(memory->longTerm.size() == 1);
    printf("  PASS: testApplyMemoryEntry\n");
}

static void testApplyMultipleEffects() {
    Registry reg;
    EntityId id = createFullEntity(reg);
    std::vector<ActionEffect> effs = {
        {TargetComponent::Social, "energy", -10.0f, "", "work"},
        {TargetComponent::SkillTree, "backend_dev", 100.0f, "", "task"},
        {TargetComponent::Career, "totalXp", 30.0f, "", "progress"},
        {TargetComponent::Memory, "milestone", 0.0f, "completed task", "record"}
    };
    ActionExecutor::apply(reg, id, effs);
    auto* social = reg.getComponent<SocialComponent>(id);
    auto* skills = reg.getComponent<SkillTreeComponent>(id);
    auto* career = reg.getComponent<CareerComponent>(id);
    auto* memory = reg.getComponent<MemoryRingComponent>(id);
    assert(std::abs(social->energy - 40.0f) < 0.01f);
    assert(skills->getSkill("backend_dev")->xp == 100);
    assert(career->totalXp == 30);
    assert(memory->longTerm.size() == 1);
    printf("  PASS: testApplyMultipleEffects\n");
}

int main() {
    printf("=== test_action_executor ===\n");
    testApplySocialEnergy();
    testApplySocialClamping();
    testApplySkillTreeXp();
    testApplySkillTreeAutoCreate();
    testApplyCareerXp();
    testApplyPersonalityDrift();
    testApplyPersonalityClamping();
    testApplyMemoryEntry();
    testApplyMultipleEffects();
    printf("All action executor tests passed.\n");
    return 0;
}
```

- [ ] **Step 4: Update CMakeLists.txt**

Add `src/ecs/systems/ActionExecutor.cpp` to the `agent-kernel` library sources and `tests/test_action_executor.cpp` to `kernel_tests`.

- [ ] **Step 5: Build and run**

```bash
cd /home/test/MyGame/agent-kernel/build && cmake .. && make -j$(nproc) && ./kernel_tests
```

Expected: All existing + 9 new executor tests pass.

- [ ] **Step 6: Commit**

```bash
cd /home/test/MyGame && git add agent-kernel/ && git commit -m "feat(agent-kernel): Layer 5 Task 3 — ActionExecutor applies effects to ECS components (9 tests)"
```

---

### Task 4: TickEngine — Single-Agent Tick Loop

**Covers:** [S5], [S6]

**Files:**
- Create: `src/ecs/systems/TickEngine.h`, `src/ecs/systems/TickEngine.cpp`
- Test: `tests/test_tick_engine.cpp`

**Interfaces:**
- Consumes: `LLM::LLMClient` (L4), `Systems::mapDecisionToAction()` (Task 1), `Systems::generateEffects()` (Task 2), `Systems::ActionExecutor::apply()` (Task 3)
- Produces: `Systems::TickEngine::tick()`, `Systems::TickResult`, `Systems::TickEngine::nextTickNumber()`

- [ ] **Step 1: Create the header file**

```cpp
// src/ecs/systems/TickEngine.h
#pragma once
// TickEngine — single-agent tick: perceive → decide → act → record.

#include "ActionTypes.h"
#include "ActionEffect.h"
#include "ActionExecutor.h"
#include "../llm/DecisionEngine.h"
#include "../llm/LLMClient.h"
#include "../ecs/Registry.h"
#include <string>
#include <vector>
#include <cstdint>

namespace Systems {

struct TickResult {
    ActionType action = ActionType::ExecuteTask;
    LLM::Decision decision;
    std::vector<ActionEffect> effects;
    uint64_t timestamp = 0;
    int tickNumber = 0;

    std::string toJson() const;
};

class TickEngine {
public:
    explicit TickEngine(LLM::LLMClient* client);

    // Run one tick for an entity on a given task.
    TickResult tick(ECS::Registry& reg, ECS::EntityId id, const std::string& task);

    // Monotonic tick counter.
    int nextTickNumber();

private:
    LLM::DecisionEngine engine_;
    int tickCounter_ = 0;
};

} // namespace Systems
```

- [ ] **Step 2: Create the implementation file**

```cpp
// src/ecs/systems/TickEngine.cpp
#include "TickEngine.h"
#include <chrono>
#include <sstream>

namespace Systems {

TickEngine::TickEngine(LLM::LLMClient* client) : engine_(client) {}

int TickEngine::nextTickNumber() {
    return tickCounter_++;
}

TickResult TickEngine::tick(ECS::Registry& reg, ECS::EntityId id, const std::string& task) {
    TickResult result;
    result.tickNumber = nextTickNumber();

    // Timestamp
    auto now = std::chrono::system_clock::now();
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
        now.time_since_epoch()).count();
    result.timestamp = static_cast<uint64_t>(ms);

    // 1. Decide (uses L4 DecisionEngine)
    result.decision = engine_.decide(reg, id, task);

    // 2. Map Decision → ActionType
    result.action = mapDecisionToAction(result.decision, reg, id);

    // 3. Generate effects
    result.effects = generateEffects(result.action, result.decision, reg, id);

    // 4. Apply effects to entity
    ActionExecutor::apply(reg, id, result.effects);

    return result;
}

std::string TickResult::toJson() const {
    std::ostringstream oss;
    oss << "{\"action\":\"" << actionTypeToString(action) << "\"";
    oss << ",\"tickNumber\":" << tickNumber;
    oss << ",\"timestamp\":" << timestamp;
    oss << ",\"decision\":" << decision.toJson();
    oss << ",\"effects\":[";
    for (size_t i = 0; i < effects.size(); ++i) {
        if (i > 0) oss << ",";
        oss << "{\"target\":" << static_cast<int>(effects[i].target);
        oss << ",\"fieldName\":\"" << effects[i].fieldName << "\"";
        oss << ",\"delta\":" << effects[i].delta;
        oss << ",\"description\":\"" << effects[i].description << "\"}";
    }
    oss << "]}";
    return oss.str();
}

} // namespace Systems
```

- [ ] **Step 3: Write the test file**

```cpp
// tests/test_tick_engine.cpp
// Tests for TickEngine — full agent tick cycle with mock LLM.
#include "ecs/systems/TickEngine.h"
#include "llm/HttpClient.h"
#include "ecs/Registry.h"
#include "ecs/components/IdentityComponent.h"
#include "ecs/components/SocialComponent.h"
#include "ecs/components/SkillTreeComponent.h"
#include "ecs/components/CareerComponent.h"
#include "ecs/components/PersonalityComponent.h"
#include "ecs/components/MemoryRingComponent.h"
#include <cassert>
#include <cstdio>
#include <string>
#include <cmath>

using namespace Systems;
using namespace ECS;

static std::string escapeJson(const std::string& s) {
    std::string out;
    for (char c : s) {
        switch (c) {
            case '"':  out += "\\\""; break;
            case '\\': out += "\\\\"; break;
            case '\n': out += "\\n";  break;
            default:   out += c;      break;
        }
    }
    return out;
}

static void mockLLM(const std::string& assistantContent) {
    std::string escaped = escapeJson(assistantContent);
    std::string body = R"({"choices":[{"message":{"role":"assistant","content":")" + escaped + R"("}}],"usage":{"prompt_tokens":10,"completion_tokens":5}})";
    LLM::HttpClient::setMockResponse(200, body);
}

static EntityId createFullEntity(Registry& reg) {
    Entity e = reg.createEntity();
    EntityId id = e.getId();
    reg.addComponent<IdentityComponent>(id, "a" + std::to_string(id), "TestAgent", AgentRole::Specialist);
    auto& social = reg.addComponent<SocialComponent>(id);
    social.energy = 70.0f;
    social.mood = 60.0f;
    auto& skills = reg.addComponent<SkillTreeComponent>(id);
    skills.addSkill("backend_dev", SkillCategory::Engineering, SkillLevel::Advanced);
    reg.addComponent<CareerComponent>(id);
    reg.addComponent<PersonalityComponent>(id, 50, 50, 50, 50, 50, 50);
    reg.addComponent<MemoryRingComponent>(id);
    return id;
}

static void testTickExecuteTask() {
    mockLLM(R"({"action":"execute","reasoning":"I can handle this","confidence":0.9,"details":"Implement feature X"})");
    LLM::LLMClient client(LLM::LLMConfig{});
    TickEngine engine(&client);
    Registry reg;
    EntityId id = createFullEntity(reg);

    TickResult result = engine.tick(reg, id, "Implement feature X");

    assert(result.action == ActionType::ExecuteTask);
    assert(result.tickNumber == 0);
    assert(result.timestamp > 0);
    assert(!result.effects.empty());
    // Verify effects were applied
    auto* career = reg.getComponent<CareerComponent>(id);
    assert(career->totalXp > 0);
    printf("  PASS: testTickExecuteTask\n");
}

static void testTickDelegate() {
    mockLLM(R"({"action":"delegate","reasoning":"Not my domain","confidence":0.7,"delegateTo":"frontend-team","details":"CSS work"})");
    LLM::LLMClient client(LLM::LLMConfig{});
    TickEngine engine(&client);
    Registry reg;
    EntityId id = createFullEntity(reg);

    TickResult result = engine.tick(reg, id, "Fix CSS layout");

    assert(result.action == ActionType::Delegate);
    assert(result.effects.size() == 1);
    assert(result.effects[0].target == TargetComponent::Memory);
    printf("  PASS: testTickDelegate\n");
}

static void testTickLowEnergyRest() {
    mockLLM(R"({"action":"execute","reasoning":"Working","confidence":0.5})");
    LLM::LLMClient client(LLM::LLMConfig{});
    TickEngine engine(&client);
    Registry reg;
    EntityId id = createFullEntity(reg);
    reg.getComponent<SocialComponent>(id)->energy = 15.0f; // low

    TickResult result = engine.tick(reg, id, "Some task");

    assert(result.action == ActionType::Rest);
    // Energy should have been restored
    auto* social = reg.getComponent<SocialComponent>(id);
    assert(social->energy > 15.0f);
    printf("  PASS: testTickLowEnergyRest\n");
}

static void testTickCounter() {
    mockLLM(R"({"action":"execute","reasoning":"ok","confidence":0.5})");
    LLM::LLMClient client(LLM::LLMConfig{});
    TickEngine engine(&client);
    Registry reg;
    EntityId id = createFullEntity(reg);

    TickResult r1 = engine.tick(reg, id, "task1");
    TickResult r2 = engine.tick(reg, id, "task2");
    assert(r1.tickNumber == 0);
    assert(r2.tickNumber == 1);
    printf("  PASS: testTickCounter\n");
}

static void testTickResultToJson() {
    mockLLM(R"({"action":"execute","reasoning":"test","confidence":0.8})");
    LLM::LLMClient client(LLM::LLMConfig{});
    TickEngine engine(&client);
    Registry reg;
    EntityId id = createFullEntity(reg);

    TickResult result = engine.tick(reg, id, "task");
    std::string json = result.toJson();
    // Should contain the action type
    assert(json.find("executeTask") != std::string::npos);
    assert(json.find("tickNumber") != std::string::npos);
    printf("  PASS: testTickResultToJson\n");
}

int main() {
    printf("=== test_tick_engine ===\n");
    testTickExecuteTask();
    testTickDelegate();
    testTickLowEnergyRest();
    testTickCounter();
    testTickResultToJson();
    printf("All tick engine tests passed.\n");
    return 0;
}
```

- [ ] **Step 4: Update CMakeLists.txt**

Add `src/ecs/systems/TickEngine.cpp` to `agent-kernel` library and `tests/test_tick_engine.cpp` to `kernel_tests`.

- [ ] **Step 5: Build and run**

```bash
cd /home/test/MyGame/agent-kernel/build && cmake .. && make -j$(nproc) && ./kernel_tests
```

Expected: All existing + 5 new tick engine tests pass.

- [ ] **Step 6: Commit**

```bash
cd /home/test/MyGame && git add agent-kernel/ && git commit -m "feat(agent-kernel): Layer 5 Task 4 — TickEngine single-agent tick loop (5 tests)"
```

---

### Task 5: SimulationRunner — Multi-Agent Batch Simulation

**Covers:** [S5], [S6]

**Files:**
- Create: `src/ecs/systems/SimulationRunner.h`, `src/ecs/systems/SimulationRunner.cpp`
- Test: `tests/test_simulation_runner.cpp`

**Interfaces:**
- Consumes: `Systems::TickEngine` (from Task 4), `Systems::TickResult`
- Produces: `Systems::SimulationRunner::run()`, `Systems::SimulationSummary`, `Systems::SimulationRunner::summarize()`

- [ ] **Step 1: Create the header file**

```cpp
// src/ecs/systems/SimulationRunner.h
#pragma once
// SimulationRunner — multi-agent N-tick batch simulation.

#include "TickEngine.h"
#include "../ecs/Registry.h"
#include <vector>
#include <unordered_map>
#include <cstdint>

namespace Systems {

struct SimulationSummary {
    int totalTicks = 0;
    std::unordered_map<std::string, int> actionCounts; // actionType string → count
    float averageConfidence = 0.0f;

    std::string toJson() const;
};

class SimulationRunner {
public:
    explicit SimulationRunner(TickEngine* engine);

    // Run `ticks` rounds for each entity, using tasks round-robin.
    std::vector<TickResult> run(ECS::Registry& reg,
                                const std::vector<ECS::EntityId>& entities,
                                int ticks,
                                const std::vector<std::string>& tasks);

    // Summarize a set of TickResults.
    static SimulationSummary summarize(const std::vector<TickResult>& results);

private:
    TickEngine* engine_;
};

} // namespace Systems
```

- [ ] **Step 2: Create the implementation file**

```cpp
// src/ecs/systems/SimulationRunner.cpp
#include "SimulationRunner.h"
#include <sstream>

namespace Systems {

SimulationRunner::SimulationRunner(TickEngine* engine) : engine_(engine) {}

std::vector<TickResult> SimulationRunner::run(
    ECS::Registry& reg,
    const std::vector<ECS::EntityId>& entities,
    int ticks,
    const std::vector<std::string>& tasks) {

    std::vector<TickResult> allResults;
    allResults.reserve(entities.size() * static_cast<size_t>(ticks));

    for (int t = 0; t < ticks; ++t) {
        for (size_t i = 0; i < entities.size(); ++i) {
            const std::string& task = tasks.empty() ? "default task" : tasks[i % tasks.size()];
            TickResult result = engine_->tick(reg, entities[i], task);
            allResults.push_back(std::move(result));
        }
    }

    return allResults;
}

SimulationSummary SimulationRunner::summarize(const std::vector<TickResult>& results) {
    SimulationSummary summary;
    summary.totalTicks = static_cast<int>(results.size());
    float totalConfidence = 0.0f;

    for (const auto& r : results) {
        std::string key = actionTypeToString(r.action);
        summary.actionCounts[key]++;
        totalConfidence += r.decision.confidence;
    }

    if (!results.empty()) {
        summary.averageConfidence = totalConfidence / static_cast<float>(results.size());
    }

    return summary;
}

std::string SimulationSummary::toJson() const {
    std::ostringstream oss;
    oss << "{\"totalTicks\":" << totalTicks;
    oss << ",\"averageConfidence\":" << averageConfidence;
    oss << ",\"actionCounts\":{";
    bool first = true;
    for (const auto& [key, count] : actionCounts) {
        if (!first) oss << ",";
        oss << "\"" << key << "\":" << count;
        first = false;
    }
    oss << "}}";
    return oss.str();
}

} // namespace Systems
```

- [ ] **Step 3: Write the test file**

```cpp
// tests/test_simulation_runner.cpp
// Tests for SimulationRunner — multi-agent batch simulation.
#include "ecs/systems/SimulationRunner.h"
#include "llm/HttpClient.h"
#include "ecs/Registry.h"
#include "ecs/components/IdentityComponent.h"
#include "ecs/components/SocialComponent.h"
#include "ecs/components/SkillTreeComponent.h"
#include "ecs/components/CareerComponent.h"
#include "ecs/components/PersonalityComponent.h"
#include "ecs/components/MemoryRingComponent.h"
#include <cassert>
#include <cstdio>
#include <string>

using namespace Systems;
using namespace ECS;

static std::string escapeJson(const std::string& s) {
    std::string out;
    for (char c : s) {
        switch (c) {
            case '"':  out += "\\\""; break;
            case '\\': out += "\\\\"; break;
            case '\n': out += "\\n";  break;
            default:   out += c;      break;
        }
    }
    return out;
}

static void mockLLM(const std::string& content) {
    std::string escaped = escapeJson(content);
    std::string body = R"({"choices":[{"message":{"role":"assistant","content":")" + escaped + R"("}}],"usage":{"prompt_tokens":10,"completion_tokens":5}})";
    LLM::HttpClient::setMockResponse(200, body);
}

static EntityId createAgent(Registry& reg, const std::string& name, float energy) {
    Entity e = reg.createEntity();
    EntityId id = e.getId();
    reg.addComponent<IdentityComponent>(id, "a" + std::to_string(id), name, AgentRole::Specialist);
    auto& social = reg.addComponent<SocialComponent>(id);
    social.energy = energy;
    auto& skills = reg.addComponent<SkillTreeComponent>(id);
    skills.addSkill("backend_dev", SkillCategory::Engineering, SkillLevel::Advanced);
    reg.addComponent<CareerComponent>(id);
    reg.addComponent<PersonalityComponent>(id, 50, 50, 50, 50, 50, 50);
    reg.addComponent<MemoryRingComponent>(id);
    return id;
}

static void testRunSingleEntity() {
    mockLLM(R"({"action":"execute","reasoning":"ok","confidence":0.7})");
    LLM::LLMClient client(LLM::LLMConfig{});
    TickEngine engine(&client);
    SimulationRunner runner(&engine);
    Registry reg;
    EntityId id = createAgent(reg, "Agent1", 80.0f);

    auto results = runner.run(reg, {id}, 3, {"task A"});
    assert(results.size() == 3);
    assert(results[0].tickNumber == 0);
    assert(results[2].tickNumber == 2);
    printf("  PASS: testRunSingleEntity\n");
}

static void testRunMultipleEntities() {
    mockLLM(R"({"action":"execute","reasoning":"ok","confidence":0.6})");
    LLM::LLMClient client(LLM::LLMConfig{});
    TickEngine engine(&client);
    SimulationRunner runner(&engine);
    Registry reg;
    EntityId id1 = createAgent(reg, "Agent1", 80.0f);
    EntityId id2 = createAgent(reg, "Agent2", 70.0f);

    auto results = runner.run(reg, {id1, id2}, 2, {"task A", "task B"});
    // 2 entities × 2 ticks = 4 results
    assert(results.size() == 4);
    printf("  PASS: testRunMultipleEntities\n");
}

static void testSummarize() {
    mockLLM(R"({"action":"execute","reasoning":"ok","confidence":0.8})");
    LLM::LLMClient client(LLM::LLMConfig{});
    TickEngine engine(&client);
    SimulationRunner runner(&engine);
    Registry reg;
    EntityId id = createAgent(reg, "Agent1", 80.0f);

    auto results = runner.run(reg, {id}, 5, {"task"});
    auto summary = SimulationRunner::summarize(results);
    assert(summary.totalTicks == 5);
    assert(summary.averageConfidence > 0.0f);
    assert(!summary.actionCounts.empty());
    printf("  PASS: testSummarize\n");
}

static void testSummaryToJson() {
    SimulationSummary summary;
    summary.totalTicks = 10;
    summary.averageConfidence = 0.75f;
    summary.actionCounts["executeTask"] = 8;
    summary.actionCounts["rest"] = 2;
    std::string json = summary.toJson();
    assert(json.find("10") != std::string::npos);
    assert(json.find("executeTask") != std::string::npos);
    printf("  PASS: testSummaryToJson\n");
}

static void testRunDefaultTask() {
    mockLLM(R"({"action":"execute","reasoning":"ok","confidence":0.5})");
    LLM::LLMClient client(LLM::LLMConfig{});
    TickEngine engine(&client);
    SimulationRunner runner(&engine);
    Registry reg;
    EntityId id = createAgent(reg, "Agent1", 80.0f);

    // Empty tasks vector → uses "default task"
    auto results = runner.run(reg, {id}, 2, {});
    assert(results.size() == 2);
    printf("  PASS: testRunDefaultTask\n");
}

int main() {
    printf("=== test_simulation_runner ===\n");
    testRunSingleEntity();
    testRunMultipleEntities();
    testSummarize();
    testSummaryToJson();
    testRunDefaultTask();
    printf("All simulation runner tests passed.\n");
    return 0;
}
```

- [ ] **Step 4: Update CMakeLists.txt**

Add `src/ecs/systems/SimulationRunner.cpp` to `agent-kernel` library and `tests/test_simulation_runner.cpp` to `kernel_tests`.

- [ ] **Step 5: Build and run**

```bash
cd /home/test/MyGame/agent-kernel/build && cmake .. && make -j$(nproc) && ./kernel_tests
```

Expected: All existing + 5 new simulation runner tests pass.

- [ ] **Step 6: Commit**

```bash
cd /home/test/MyGame && git add agent-kernel/ && git commit -m "feat(agent-kernel): Layer 5 Task 5 — SimulationRunner multi-agent batch (5 tests)"
```

---

### Task 6: IPC — agentTick + runSimulation Endpoints

**Covers:** [S7]

**Files:**
- Modify: `src/ipc/Protocol.h` (add 2 method constants)
- Modify: `src/ipc/AgentKernelBridge.h` (add 2 handler methods)
- Test: `tests/test_ipc_tick.cpp`

**Interfaces:**
- Consumes: `Systems::TickEngine` (Task 4), `Systems::SimulationRunner` (Task 5), existing IPC infrastructure
- Produces: 2 new IPC methods: `agentTick`, `runSimulation`

- [ ] **Step 1: Add method constants to Protocol.h**

Add to the `Method` namespace:
```cpp
inline const std::string agentTick     = "agentTick";
inline const std::string runSimulation = "runSimulation";
```

- [ ] **Step 2: Add handlers to AgentKernelBridge.h**

Add includes at top:
```cpp
#include "../ecs/systems/TickEngine.h"
#include "../ecs/systems/SimulationRunner.h"
```

Add members to `AgentKernelBridge`:
```cpp
std::unique_ptr<LLM::LLMClient> tickLlmClient_;
std::unique_ptr<Systems::TickEngine> tickEngine_;
std::unique_ptr<Systems::SimulationRunner> simRunner_;
```

Add handler methods (following existing pattern in AgentKernelBridge.h):
```cpp
std::string handleAgentTick(const json::JsonValue& params);
std::string handleRunSimulation(const json::JsonValue& params);
```

Implement `handleAgentTick`:
- Extract `entityId` (int) and `task` (string) from params
- Validate entity exists
- Initialize tick engine if needed (lazy init with stub LLM config)
- Call `tickEngine_->tick(registry_, entityId, task)`
- Return `TickResult::toJson()`

Implement `handleRunSimulation`:
- Extract `entityIds` (array), `ticks` (int), `tasks` (array) from params
- Validate all entity IDs exist
- Call `simRunner_->run(registry_, entityIds, ticks, tasks)`
- Return JSON with `results` array + `summary`

Add method dispatch in `handle()` method:
```cpp
if (method == Method::agentTick) return handleAgentTick(params);
if (method == Method::runSimulation) return handleRunSimulation(params);
```

- [ ] **Step 3: Write the test file**

```cpp
// tests/test_ipc_tick.cpp
// Tests for IPC agentTick + runSimulation endpoints.
#include "ipc/AgentKernelBridge.h"
#include "ipc/UnixSocketServer.h"
#include "llm/HttpClient.h"
#include <cassert>
#include <cstdio>
#include <string>
#include <thread>
#include <chrono>
#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>

static std::string escapeJson(const std::string& s) {
    std::string out;
    for (char c : s) {
        switch (c) {
            case '"':  out += "\\\""; break;
            case '\\': out += "\\\\"; break;
            case '\n': out += "\\n";  break;
            default:   out += c;      break;
        }
    }
    return out;
}

static void mockLLM(const std::string& content) {
    std::string escaped = escapeJson(content);
    std::string body = R"({"choices":[{"message":{"role":"assistant","content":")" + escaped + R"("}}],"usage":{"prompt_tokens":10,"completion_tokens":5}})";
    LLM::HttpClient::setMockResponse(200, body);
}

static std::string sendIPC(const std::string& socketPath, const std::string& request) {
    int sock = socket(AF_UNIX, SOCK_STREAM, 0);
    if (sock < 0) return "";

    struct sockaddr_un addr;
    memset(&addr, 0, sizeof(addr));
    addr.sun_family = AF_UNIX;
    strncpy(addr.sun_path, socketPath.c_str(), sizeof(addr.sun_path) - 1);

    if (connect(sock, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
        close(sock);
        return "";
    }

    std::string req = request + "\n";
    send(sock, req.c_str(), req.size(), 0);

    char buf[8192] = {0};
    std::string response;
    ssize_t n;
    while ((n = recv(sock, buf, sizeof(buf) - 1, 0)) > 0) {
        response += std::string(buf, n);
        if (response.find('\n') != std::string::npos) break;
    }

    close(sock);
    return response;
}

static void testAgentTickValid() {
    mockLLM(R"({"action":"execute","reasoning":"ok","confidence":0.8})");

    const char* sockPath = "/tmp/test_ipc_tick_valid.sock";
    ECS::Registry registry;
    IPC::AgentKernelBridge bridge(registry);

    // Create entity
    auto e = registry.createEntity();
    auto id = e.getId();
    registry.addComponent<IdentityComponent>(id, "a1", "Test", AgentRole::Specialist);
    registry.addComponent<SocialComponent>(id);
    registry.addComponent<SkillTreeComponent>(id);
    registry.addComponent<CareerComponent>(id);
    registry.addComponent<PersonalityComponent>(id);
    registry.addComponent<MemoryRingComponent>(id);

    IPC::UnixSocketServer server(sockPath);
    server.start([&bridge](const std::string& msg) { return bridge.handle(msg); });
    std::this_thread::sleep_for(std::chrono::milliseconds(50));

    std::string req = R"({"method":"agentTick","params":{"entityId":)" + std::to_string(id) + R"(,"task":"test task"}})";
    std::string resp = sendIPC(sockPath, req);

    assert(resp.find("executeTask") != std::string::npos || resp.find("execute") != std::string::npos);
    assert(resp.find("tickNumber") != std::string::npos);

    server.stop();
    unlink(sockPath);
    printf("  PASS: testAgentTickValid\n");
}

static void testAgentTickInvalidEntity() {
    const char* sockPath = "/tmp/test_ipc_tick_invalid.sock";
    ECS::Registry registry;
    IPC::AgentKernelBridge bridge(registry);

    IPC::UnixSocketServer server(sockPath);
    server.start([&bridge](const std::string& msg) { return bridge.handle(msg); });
    std::this_thread::sleep_for(std::chrono::milliseconds(50));

    std::string req = R"({"method":"agentTick","params":{"entityId":99999,"task":"test"}})";
    std::string resp = sendIPC(sockPath, req);

    assert(resp.find("error") != std::string::npos);

    server.stop();
    unlink(sockPath);
    printf("  PASS: testAgentTickInvalidEntity\n");
}

int main() {
    printf("=== test_ipc_tick ===\n");
    testAgentTickValid();
    testAgentTickInvalidEntity();
    printf("All IPC tick tests passed.\n");
    return 0;
}
```

- [ ] **Step 4: Update CMakeLists.txt**

Add `tests/test_ipc_tick.cpp` to `kernel_tests`.

- [ ] **Step 5: Build and run**

```bash
cd /home/test/MyGame/agent-kernel/build && cmake .. && make -j$(nproc) && ./kernel_tests
```

Expected: All existing + 2 new IPC tests pass.

- [ ] **Step 6: Commit**

```bash
cd /home/test/MyGame && git add agent-kernel/ && git commit -m "feat(agent-kernel): Layer 5 Task 6 — IPC agentTick + runSimulation endpoints (2 tests)"
```

- [ ] **Step 7: Full test run and final commit**

```bash
cd /home/test/MyGame/agent-kernel/build && cmake .. && make -j$(nproc) && ./kernel_tests
```

Expected: ~127 existing + ~38 new = ~165 total tests passing.

```bash
cd /home/test/MyGame && git log --oneline -8
```

Verify 6 Layer 5 commits visible.

---

### Task 7: Push to GitHub

**Covers:** N/A (deployment)

- [ ] **Step 1: Push Game repo**

```bash
cd /home/test/MyGame && git push origin main
```

(Use SSH if HTTPS times out: `git remote set-url origin git@github.com:MonSp/MDH-Game.git && git push origin main`)

- [ ] **Step 2: Sync to standalone kernel repo**

```bash
cd /home/test/agent-kernel && git pull --rebase origin main  # or manual sync
```

- [ ] **Step 3: Update MatrixDahuang umbrella**

```bash
cd /home/test/MatrixDahuang && git submodule update --remote && git add . && git commit -m "chore: update kernel submodule (Layer 5)" && git push origin main
```
