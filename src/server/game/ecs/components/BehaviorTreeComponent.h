#pragma once

#include "../../ecs/Component.h"
#include "../../bt/BehaviorTreeTemplate.h"
#include <cstdint>

struct BehaviorTreeComponent : public ECS::ComponentBase<BehaviorTreeComponent> {
    const BehaviorTreeTemplate* tmpl;
    uint16_t currentNode;
    uint16_t updatePhase;
    uint16_t evalInterval;

    BehaviorTreeComponent() : tmpl(nullptr), currentNode(0),
        updatePhase(0), evalInterval(30) {}

    bool shouldEvaluate(uint16_t frameCounter, uint8_t currentActivity) const {
        if (tmpl == nullptr) return true;
        uint16_t interval = evalIntervalForActivity(currentActivity);
        return (frameCounter % interval) == 0;
    }

    void setActivityInterval(uint8_t activity) {
        evalInterval = evalIntervalForActivity(activity);
    }

    static uint16_t evalIntervalForActivity(uint8_t activity) {
        switch (activity) {
            case 30: case 31: case 32: case 33: return 30;
            case 21: case 22: return 30;
            case 25: case 48: return 30;
            case 51: case 52: case 53: case 54: case 55: return 10;
            case 23: case 40: case 41: case 100: case 101: case 102: return 5;
            case 47: case 49: return 5;
            case 10: case 11: case 12: case 58: case 90: case 91: case 92: case 93: return 1;
            default:
                if (activity >= 50 && activity <= 60) return 1;
                return 30;
        }
    }

    static const BehaviorTreeTemplate* combatTemplate() {
        return &BehaviorTreePresets::kCombat;
    }

    static const BehaviorTreeTemplate* commandTemplate() {
        return &BehaviorTreePresets::kCommand;
    }
};
