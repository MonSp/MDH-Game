#pragma once

#include <cstdint>
#include <array>
#include <vector>

enum class BTNodeType : uint8_t {
    Condition = 1,
    Action    = 2,
    Sequence  = 3,
    Selector  = 4
};

struct FlatBTNode {
    uint8_t  type;
    uint16_t next;
    uint16_t fail;
    uint16_t actionId;
};

struct BehaviorTreeTemplate {
    const char* name;
    const FlatBTNode* nodes;
    uint16_t nodeCount;
    uint16_t rootIndex;
};

enum class BBCondition : uint8_t {
    HasThreatNearby = 0,
    IsHungry        = 1,
    IsExhausted     = 2,
    HasSocialTarget = 3,
    HasCommand      = 4,
    ShouldCultivate = 5,
    COUNT           = 6
};

namespace BehaviorTreePresets {

inline constexpr FlatBTNode kLeaderNodes[] = {
    {1, 1, 7, 4},
    {2, 7, 2, 58},
    {3, 3, 5, 0},
    {1, 0, 5, 1},
    {1, 0, 6, 2},
    {2, 7, 7, 33},
    {2, 7, 7, 21},
};

inline constexpr BehaviorTreeTemplate kLeader = {
    "Leader",
    kLeaderNodes,
    7,
    0
};

inline constexpr FlatBTNode kGuardNodes[] = {
    {1, 1, 3, 4},
    {2, 3, 2, 58},
    {1, 0, 3, 1},
    {2, 3, 3, 21},
};

inline constexpr BehaviorTreeTemplate kGuard = {
    "Guard",
    kGuardNodes,
    4,
    0
};

inline constexpr FlatBTNode kDiscipleNodes[] = {
    {1, 1, 6, 5},
    {2, 6, 2, 30},
    {3, 3, 5, 0},
    {1, 0, 5, 1},
    {1, 0, 6, 2},
    {2, 6, 6, 21},
};

inline constexpr BehaviorTreeTemplate kDisciple = {
    "Disciple",
    kDiscipleNodes,
    6,
    0
};

inline constexpr FlatBTNode kWorkerNodes[] = {
    {1, 1, 6, 1},
    {2, 6, 2, 51},
    {3, 3, 5, 0},
    {1, 0, 5, 1},
    {1, 0, 6, 2},
    {2, 6, 6, 21},
};

inline constexpr BehaviorTreeTemplate kWorker = {
    "Worker",
    kWorkerNodes,
    6,
    0
};

inline constexpr FlatBTNode kCombatNodes[] = {
    {1, 1, 4, 0},
    {2, 4, 2, 10},
    {3, 3, 4, 0},
    {1, 0, 4, 1},
    {2, 4, 4, 58},
};

inline constexpr BehaviorTreeTemplate kCombat = {
    "Combat",
    kCombatNodes,
    5,
    0
};

inline constexpr FlatBTNode kCommandNodes[] = {
    {1, 1, 3, 4},
    {2, 3, 2, 0},
    {1, 0, 3, 1},
    {2, 3, 3, 0},
};

inline constexpr BehaviorTreeTemplate kCommand = {
    "Command",
    kCommandNodes,
    4,
    0
};

inline const BehaviorTreeTemplate* getTemplateForRole(uint8_t role) {
    switch (static_cast<int>(role)) {
        case 0: return &kLeader;
        case 1: return &kDisciple;
        case 5: return &kGuard;
        case 2: return &kDisciple;
        case 3: return &kDisciple;
        case 4: return &kWorker;
        default: return &kWorker;
    }
}

}
