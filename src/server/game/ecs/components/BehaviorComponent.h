#pragma once

#include "../../ecs/Component.h"
#include <cstdint>

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

struct BehaviorComponent : public ECS::ComponentBase<BehaviorComponent> {
    NPCActivity currentActivity;
    NPCActivity previousActivity;
    uint64_t activityStartTime;
    uint32_t activityStep;
    float activityProgress;

    BehaviorComponent() : currentActivity(NPCActivity::Rest), previousActivity(NPCActivity::Rest),
        activityStartTime(0), activityStep(0), activityProgress(0.0f) {}

    void changeActivity(NPCActivity newActivity) {
        previousActivity = currentActivity;
        currentActivity = newActivity;
        activityStartTime = 0;
        activityStep = 0;
        activityProgress = 0.0f;
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
