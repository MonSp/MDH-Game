#pragma once

#include "../../ecs/Component.h"
#include <cstdint>
#include <cstring>

constexpr uint8_t HYSTERESIS_SURVIVAL_ENTER = 0;
constexpr uint8_t HYSTERESIS_SURVIVAL_EXIT = 5;
constexpr uint8_t HYSTERESIS_LEVEL_DOWNGRADE = 3;
constexpr uint8_t HYSTERESIS_LEVEL_UPGRADE = 0;
constexpr uint8_t HYSTERESIS_SAME_LEVEL = 2;

enum class NPCActivity : uint8_t {
    Idle = 0,
    Dead = 1,

    Flee = 10,
    Heal = 11,
    Defend = 12,

    Eat = 20,
    Rest = 21,
    Sleep = 22,
    Walk = 23,
    Chat = 24,
    AwaitOrders = 25,

    Cultivate = 30,
    Breakthrough = 31,
    Tribulation = 32,
    Meditate = 33,
    Alchemy = 34,
    SeekFortune = 35,

    VisitFriend = 40,
    Date = 41,
    FamilyGathering = 42,
    MentorTeach = 43,
    DiscipleAsk = 44,
    Trade = 45,
    Gossip = 46,
    ReportTask = 47,
    RefuseCommand = 48,
    CoordinateSquad = 49,

    Build = 50,
    Mine = 51,
    Farm = 52,
    Fish = 53,
    Lumber = 54,
    Gather = 55,
    Attack = 56,
    DefendPosition = 57,
    Patrol = 58,
    Escort = 59,
    Scout = 60,

    Craft = 70,
    Refine = 71,
    Cook = 72,
    Tailor = 73,
    Construct = 74,
    Repair = 75,

    Buy = 80,
    Sell = 81,
    Bargain = 82,

    Duel = 90,
    Hunt = 91,
    Ambush = 92,
    Assassinate = 93,

    Explore = 100,
    TreasureHunt = 101,
    MapExplore = 102,

    Incapacitated = 200
};

enum class CommandStatus : uint8_t {
    Pending = 0,
    Executing = 1,
    Completed = 2,
    Failed = 3,
    Rejected = 4
};

#pragma pack(push, 1)
struct ActivityOutcome {
    NPCActivity activity;
    int8_t resultScore;
    uint8_t _pad;
};
#pragma pack(pop)

struct ReflectionData {
    static constexpr int MAX_TRACKED = 8;

    NPCActivity trackedTypes[MAX_TRACKED];
    int8_t recentResults[MAX_TRACKED][3];
    float weightMultiplier[MAX_TRACKED];
    uint8_t trackedCount;

    ReflectionData() : trackedCount(0) {
        memset(trackedTypes, 0, sizeof(trackedTypes));
        memset(recentResults, 0, sizeof(recentResults));
        for (int i = 0; i < MAX_TRACKED; i++) weightMultiplier[i] = 1.0f;
    }

    int findOrCreate(NPCActivity act) {
        for (uint8_t i = 0; i < trackedCount; i++) {
            if (trackedTypes[i] == act) return i;
        }
        if (trackedCount >= MAX_TRACKED) return -1;
        trackedTypes[trackedCount] = act;
        return trackedCount++;
    }

    void recordResult(NPCActivity act, int8_t score) {
        int idx = findOrCreate(act);
        if (idx < 0) return;
        recentResults[idx][0] = recentResults[idx][1];
        recentResults[idx][1] = recentResults[idx][2];
        recentResults[idx][2] = score;

        int8_t sum = recentResults[idx][0] + recentResults[idx][1] + recentResults[idx][2];
        if (sum <= -9) weightMultiplier[idx] = 0.5f;
        else if (sum <= -3) weightMultiplier[idx] = 0.7f;
        else if (sum >= 9) weightMultiplier[idx] = 1.5f;
        else if (sum >= 3) weightMultiplier[idx] = 1.2f;
        else weightMultiplier[idx] = 1.0f;
    }

    float getWeight(NPCActivity act) const {
        for (uint8_t i = 0; i < trackedCount; i++) {
            if (trackedTypes[i] == act) return weightMultiplier[i];
        }
        return 1.0f;
    }
};

struct BehaviorComponent : public ECS::ComponentBase<BehaviorComponent> {
    NPCActivity currentActivity;
    NPCActivity previousActivity;
    uint64_t activityStartTime;
    uint32_t activityStep;
    float activityProgress;

    uint64_t activityStartFrame;
    uint8_t hysteresisFrames;
    uint8_t hysteresisLocked;
    uint8_t lastInterruptSource;

    ReflectionData reflection;

    BehaviorComponent() : currentActivity(NPCActivity::Rest), previousActivity(NPCActivity::Rest),
        activityStartTime(0), activityStep(0), activityProgress(0.0f),
        activityStartFrame(0), hysteresisFrames(0), hysteresisLocked(0), lastInterruptSource(0) {}

    void changeActivity(NPCActivity newActivity) {
        previousActivity = currentActivity;
        currentActivity = newActivity;
        activityStartTime = 0;
        activityStep = 0;
        activityProgress = 0.0f;
        hysteresisFrames = 0;
        hysteresisLocked = 0;
    }

    bool isIdle() const {
        return currentActivity == NPCActivity::Idle ||
               currentActivity == NPCActivity::Rest;
    }

    bool isBusy() const {
        return !isIdle() && currentActivity != NPCActivity::Dead &&
               currentActivity != NPCActivity::Incapacitated;
    }
};
