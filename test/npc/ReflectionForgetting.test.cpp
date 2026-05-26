#include <gtest/gtest.h>
#include "../../src/server/game/ecs/components/BehaviorComponent.h"

TEST(ReflectionForgetting, HalfLifeRecoveryAfter500Frames) {
    BehaviorComponent behavior;

    behavior.reflection.recordResult(NPCActivity::Mine, -5, 0);
    behavior.reflection.recordResult(NPCActivity::Mine, -5, 0);
    behavior.reflection.recordResult(NPCActivity::Mine, -5, 0);

    float weight0 = behavior.reflection.getWeightWithDecay(NPCActivity::Mine, 0, 50.0f);
    EXPECT_LT(weight0, 1.0f);

    float weight500 = behavior.reflection.getWeightWithDecay(NPCActivity::Mine, 500, 50.0f);
    EXPECT_GT(weight500, weight0);
    EXPECT_LT(weight500, 1.0f);

    float weight1000 = behavior.reflection.getWeightWithDecay(NPCActivity::Mine, 1000, 50.0f);
    EXPECT_GT(weight1000, weight500);
}

TEST(ReflectionForgetting, AlternativeSuccessResetsPenalty) {
    BehaviorComponent behavior;

    behavior.reflection.recordResult(NPCActivity::Mine, -5, 0);
    behavior.reflection.recordResult(NPCActivity::Mine, -5, 0);
    behavior.reflection.recordResult(NPCActivity::Mine, -5, 0);

    float weight1 = behavior.reflection.getWeightWithDecay(NPCActivity::Mine, 10, 50.0f);
    EXPECT_LT(weight1, 1.0f);

    behavior.reflection.recordResult(NPCActivity::Mine, 5, 100);
    behavior.reflection.recordResult(NPCActivity::Mine, 5, 100);
    behavior.reflection.recordResult(NPCActivity::Mine, 5, 100);

    float weight2 = behavior.reflection.getWeightWithDecay(NPCActivity::Mine, 110, 50.0f);
    EXPECT_GT(weight2, 1.0f);
}

TEST(ReflectionForgetting, DiligenceAffectsRecoveryRate) {
    BehaviorComponent diligent;
    BehaviorComponent lazy;

    diligent.reflection.recordResult(NPCActivity::Mine, -5, 0);
    diligent.reflection.recordResult(NPCActivity::Mine, -5, 0);
    diligent.reflection.recordResult(NPCActivity::Mine, -5, 0);

    lazy.reflection.recordResult(NPCActivity::Mine, -5, 0);
    lazy.reflection.recordResult(NPCActivity::Mine, -5, 0);
    lazy.reflection.recordResult(NPCActivity::Mine, -5, 0);

    float dWeight = diligent.reflection.getWeightWithDecay(NPCActivity::Mine, 1000, 80.0f);
    float lWeight = lazy.reflection.getWeightWithDecay(NPCActivity::Mine, 1000, 20.0f);

    EXPECT_GT(dWeight, lWeight);
}

TEST(ReflectionForgetting, SaturationEffectSlowsRepeatedPenalties) {
    BehaviorComponent behavior;

    behavior.reflection.recordResult(NPCActivity::Mine, -5, 10);
    behavior.reflection.recordResult(NPCActivity::Mine, -5, 10);
    behavior.reflection.recordResult(NPCActivity::Mine, -5, 10);

    EXPECT_LT(behavior.reflection.getWeightWithDecay(NPCActivity::Mine, 10, 50.0f), 1.0f);

    for (int p = 1; p < 4; p++) {
        uint64_t t = static_cast<uint64_t>((p + 1) * 10);
        behavior.reflection.recordResult(NPCActivity::Mine, -5, t);
        behavior.reflection.recordResult(NPCActivity::Mine, -5, t);
        behavior.reflection.recordResult(NPCActivity::Mine, -5, t);
        EXPECT_LT(behavior.reflection.getWeightWithDecay(NPCActivity::Mine, t, 50.0f), 1.0f);
    }

    float weightAfter = behavior.reflection.getWeightWithDecay(NPCActivity::Mine, 50, 50.0f);
    EXPECT_GE(weightAfter, 0.4f);
    EXPECT_LT(weightAfter, 1.0f);
}
