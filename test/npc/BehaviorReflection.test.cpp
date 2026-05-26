#include <gtest/gtest.h>
#include "../../src/server/game/ecs/components/BehaviorComponent.h"

TEST(BehaviorReflection, ConsistentFailureReducesWeight) {
    BehaviorComponent behavior;

    behavior.reflection.recordResult(NPCActivity::Mine, -5);
    behavior.reflection.recordResult(NPCActivity::Mine, -5);
    behavior.reflection.recordResult(NPCActivity::Mine, -5);

    float weight = behavior.reflection.getWeight(NPCActivity::Mine);
    EXPECT_LT(weight, 1.0f);
    EXPECT_GE(weight, 0.4f);
}

TEST(BehaviorReflection, ConsistentSuccessIncreasesWeight) {
    BehaviorComponent behavior;

    behavior.reflection.recordResult(NPCActivity::Cultivate, 5);
    behavior.reflection.recordResult(NPCActivity::Cultivate, 5);
    behavior.reflection.recordResult(NPCActivity::Cultivate, 5);

    float weight = behavior.reflection.getWeight(NPCActivity::Cultivate);
    EXPECT_GT(weight, 1.0f);
}

TEST(BehaviorReflection, MixedResultsStayNeutral) {
    BehaviorComponent behavior;

    behavior.reflection.recordResult(NPCActivity::Mine, 5);
    behavior.reflection.recordResult(NPCActivity::Mine, -5);
    behavior.reflection.recordResult(NPCActivity::Mine, 0);

    float weight = behavior.reflection.getWeight(NPCActivity::Mine);
    EXPECT_FLOAT_EQ(weight, 1.0f);
}

TEST(BehaviorReflection, UntrackedActivityReturnsNeutral) {
    BehaviorComponent behavior;
    float weight = behavior.reflection.getWeight(NPCActivity::Explore);
    EXPECT_FLOAT_EQ(weight, 1.0f);
}
