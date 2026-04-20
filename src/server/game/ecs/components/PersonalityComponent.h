#pragma once

#include "../../ecs/Component.h"

struct PersonalityComponent : public ECS::ComponentBase<PersonalityComponent> {
    float ambition;
    float caution;
    float loyalty;
    float greed;

    PersonalityComponent() : ambition(50.0f), caution(50.0f), loyalty(50.0f), greed(50.0f) {}

    PersonalityComponent(float amb, float cau, float loy, float gre)
        : ambition(amb), caution(cau), loyalty(loy), greed(gre) {}

    float getOverall() const {
        return (ambition + caution + loyalty + greed) / 4.0f;
    }

    bool isAggressive() const {
        return ambition > 70.0f && greed > 50.0f;
    }

    bool isCautious() const {
        return caution > 70.0f;
    }

    bool isLoyal() const {
        return loyalty > 70.0f;
    }
};
