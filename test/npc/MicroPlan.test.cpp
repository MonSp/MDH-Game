#include <gtest/gtest.h>
#include "../../src/server/game/ecs/components/BehaviorComponent.h"

TEST(MicroPlan, AllBehaviorsLowDetectsStuckState) {
    BehaviorComponent behavior;

    behavior.reflection.recordResult(NPCActivity::Mine, -5);
    behavior.reflection.recordResult(NPCActivity::Mine, -5);
    behavior.reflection.recordResult(NPCActivity::Mine, -5);

    behavior.reflection.recordResult(NPCActivity::Farm, -5);
    behavior.reflection.recordResult(NPCActivity::Farm, -5);
    behavior.reflection.recordResult(NPCActivity::Farm, -5);

    behavior.reflection.recordResult(NPCActivity::Fish, -5);
    behavior.reflection.recordResult(NPCActivity::Fish, -5);
    behavior.reflection.recordResult(NPCActivity::Fish, -5);

    EXPECT_TRUE(behavior.reflection.allBehaviorsLow());
}

TEST(MicroPlan, AllBehaviorsLowFalseWhenOneIsHigh) {
    BehaviorComponent behavior;

    behavior.reflection.recordResult(NPCActivity::Mine, -5);
    behavior.reflection.recordResult(NPCActivity::Mine, -5);
    behavior.reflection.recordResult(NPCActivity::Mine, -5);

    behavior.reflection.recordResult(NPCActivity::Farm, 5);
    behavior.reflection.recordResult(NPCActivity::Farm, 5);
    behavior.reflection.recordResult(NPCActivity::Farm, 5);

    EXPECT_FALSE(behavior.reflection.allBehaviorsLow());
}

TEST(MicroPlan, AllBehaviorsLowFalseWhenTooFew) {
    BehaviorComponent behavior;

    behavior.reflection.recordResult(NPCActivity::Mine, -5);
    behavior.reflection.recordResult(NPCActivity::Mine, -5);
    behavior.reflection.recordResult(NPCActivity::Mine, -5);

    EXPECT_FALSE(behavior.reflection.allBehaviorsLow());
}

TEST(MicroPlan, GetHighestWeightedFindsBest) {
    BehaviorComponent behavior;

    behavior.reflection.recordResult(NPCActivity::Mine, -5);
    behavior.reflection.recordResult(NPCActivity::Mine, -5);
    behavior.reflection.recordResult(NPCActivity::Mine, -5);

    behavior.reflection.recordResult(NPCActivity::Farm, -3);
    behavior.reflection.recordResult(NPCActivity::Farm, -2);
    behavior.reflection.recordResult(NPCActivity::Farm, -1);

    NPCActivity best = behavior.reflection.getHighestWeightedActivity();
    EXPECT_EQ(best, NPCActivity::Farm);
}
