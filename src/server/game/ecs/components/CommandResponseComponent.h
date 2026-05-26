#pragma once

#include "../../ecs/Component.h"
#include <cstdint>
#include <cstdlib>
#include <algorithm>

enum class ResponseType : uint8_t {
    Accept = 0,
    Refuse = 1,
    Delay = 2,
    Overachieve = 3
};

struct CommandResponseComponent : public ECS::ComponentBase<CommandResponseComponent> {
    uint8_t responseType;
    float acceptProbability;
    float overachieveMult;
    float resourceInterceptRatio;
    uint8_t resolved;

    CommandResponseComponent()
        : responseType(static_cast<uint8_t>(ResponseType::Accept))
        , acceptProbability(100.0f)
        , overachieveMult(1.0f)
        , resourceInterceptRatio(0.0f)
        , resolved(0)
    {}

    static float randomFloat() {
        return static_cast<float>(rand()) / static_cast<float>(RAND_MAX);
    }

    void evaluateResponse(
        uint8_t commandmentStatus,
        float loyalty,
        float ambition,
        float caution,
        float greed,
        float relationshipValue,
        float riskLevel
    ) {
        resolved = 1;
        acceptProbability = 100.0f;
        responseType = static_cast<uint8_t>(ResponseType::Accept);
        overachieveMult = 1.0f;
        resourceInterceptRatio = 0.0f;

        if (loyalty < 40.0f) {
            float rejectChance = (100.0f - loyalty) / 100.0f;
            if (riskLevel > 0.7f && loyalty < 30.0f) {
                rejectChance *= 2.0f;
            }
            if (randomFloat() < rejectChance) {
                responseType = static_cast<uint8_t>(ResponseType::Refuse);
                acceptProbability = 100.0f * (1.0f - rejectChance);
                return;
            }
            acceptProbability = 100.0f * (1.0f - rejectChance);
        } else if (loyalty >= 70.0f) {
            acceptProbability = 100.0f;
        } else {
            acceptProbability = 90.0f;
        }

        if (relationshipValue < 0.0f) {
            acceptProbability = std::max(0.0f, acceptProbability - 20.0f);
        } else if (relationshipValue > 50.0f) {
            acceptProbability = std::min(100.0f, acceptProbability + 10.0f);
        }

        if (ambition > 80.0f) {
            if (randomFloat() < 0.30f) {
                responseType = static_cast<uint8_t>(ResponseType::Overachieve);
                overachieveMult = 1.2f + randomFloat() * 0.3f;
            }
        }

        if (greed > 70.0f) {
            if (randomFloat() < 0.25f) {
                resourceInterceptRatio = 0.1f + randomFloat() * 0.2f;
            }
        }

        if (responseType == static_cast<uint8_t>(ResponseType::Accept)) {
            if (randomFloat() < 0.05f) {
                responseType = static_cast<uint8_t>(ResponseType::Delay);
            }
        }
    }

    bool shouldRetreatInCombat(float currentHpRatio, float caution) const {
        return caution > 70.0f && currentHpRatio < 0.5f;
    }

    bool isAccepting() const {
        return responseType == static_cast<uint8_t>(ResponseType::Accept)
            || responseType == static_cast<uint8_t>(ResponseType::Overachieve)
            || responseType == static_cast<uint8_t>(ResponseType::Delay);
    }

    bool isRefusing() const {
        return responseType == static_cast<uint8_t>(ResponseType::Refuse);
    }
};
