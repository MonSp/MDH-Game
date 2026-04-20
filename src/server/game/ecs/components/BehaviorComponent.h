#pragma once

#include "../../ecs/Component.h"
#include <string>
#include <cstdint>
#include <unordered_map>

enum class NPCActivity : uint8_t {
    Patrol = 0,
    Retreat = 1,
    Logistics = 2,
    Compete = 3,
    Work = 4,
    Rest = 5,
    Trade = 6,
    Flee = 7,
    Chase = 8,
    Dead = 9
};

enum class BehaviorPriority : uint8_t {
    Survival = 1,
    FamilyDuty = 2,
    Opportunism = 3,
    Daily = 4
};

struct BehaviorWeight {
    uint32_t patrol;
    uint32_t retreat;
    uint32_t logistics;
    uint32_t compete;
    uint32_t work;
    uint32_t rest;
    uint32_t trade;

    BehaviorWeight() : patrol(10), retreat(10), logistics(10), compete(10), work(10), rest(10), trade(0) {}
};

struct BehaviorComponent : public ECS::ComponentBase<BehaviorComponent> {
    NPCActivity currentActivity;
    NPCActivity previousActivity;
    BehaviorWeight weights;
    std::unordered_map<std::string, float> activityData;
    uint64_t activityStartTime;
    uint32_t currentPatrolIndex;

    BehaviorComponent() : currentActivity(NPCActivity::Rest), previousActivity(NPCActivity::Rest),
        activityStartTime(0), currentPatrolIndex(0) {}

    void changeActivity(NPCActivity newActivity) {
        previousActivity = currentActivity;
        currentActivity = newActivity;
        activityStartTime = 0;
    }

    void setActivityData(const std::string& key, float value) {
        activityData[key] = value;
    }

    float getActivityData(const std::string& key, float defaultValue = 0.0f) const {
        auto it = activityData.find(key);
        return (it != activityData.end()) ? it->second : defaultValue;
    }
};
