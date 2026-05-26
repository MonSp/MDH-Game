#include <gtest/gtest.h>
#include "../common/test_utils.h"
#include "../../src/server/game/npc/BehaviorTreeSystem.h"
#include "../../src/server/game/ecs/components/RoleCommandComponent.h"

class BehaviorInertiaTest : public ::testing::Test {
protected:
    void SetUp() override {
        TestUtils::resetRegistry();
    }
};

TEST_F(BehaviorInertiaTest, HP临界抖动消除) {
    TestUtils::seedRand(42);
    ECS::EntityId id = TestUtils::createTestNPC(NPCRole::CoreDisciple);
    auto& reg = ECS::Registry::getInstance();
    auto* stats = reg.getComponent<StatsComponent>(id);
    auto* behavior = reg.getComponent<BehaviorComponent>(id);
    auto* personality = reg.getComponent<PersonalityComponent>(id);
    ASSERT_NE(stats, nullptr);
    ASSERT_NE(behavior, nullptr);
    ASSERT_NE(personality, nullptr);

    stats->hp = 100;
    stats->maxHp = 100;
    behavior->currentActivity = NPCActivity::Cultivate;
    personality->diligence = 30.0f;

    for (int i = 0; i < 4; i++) {
        BehaviorTreeSystem::getInstance().evaluate(id, 0);
        EXPECT_EQ(behavior->currentActivity, NPCActivity::Cultivate)
            << "Frame " << i << ": should stay in Cultivate due to downgrade hysteresis";
    }

    BehaviorTreeSystem::getInstance().evaluate(id, 0);
    EXPECT_NE(behavior->currentActivity, NPCActivity::Cultivate)
        << "After hysteresis expires, should exit Cultivate";
}

TEST_F(BehaviorInertiaTest, 高优打断低优立即生效) {
    TestUtils::seedRand(42);
    ECS::EntityId id = TestUtils::createTestNPC(NPCRole::BranchDisciple);
    auto& reg = ECS::Registry::getInstance();
    auto* stats = reg.getComponent<StatsComponent>(id);
    auto* behavior = reg.getComponent<BehaviorComponent>(id);
    ASSERT_NE(stats, nullptr);
    ASSERT_NE(behavior, nullptr);

    stats->hp = 25;
    stats->maxHp = 100;
    behavior->currentActivity = NPCActivity::Mine;

    BehaviorTreeSystem::getInstance().evaluate(id, 0);

    EXPECT_EQ(behavior->currentActivity, NPCActivity::Flee)
        << "Low priority Mine should be immediately interrupted by high priority Flee";
}

TEST_F(BehaviorInertiaTest, 外部事件强制打断惯性) {
    TestUtils::seedRand(42);
    ECS::EntityId id = TestUtils::createTestNPC(NPCRole::CoreDisciple);
    auto& reg = ECS::Registry::getInstance();
    auto* stats = reg.getComponent<StatsComponent>(id);
    auto* behavior = reg.getComponent<BehaviorComponent>(id);
    ASSERT_NE(stats, nullptr);
    ASSERT_NE(behavior, nullptr);

    stats->hp = 100;
    stats->maxHp = 100;
    behavior->currentActivity = NPCActivity::Mine;
    behavior->hysteresisLocked = 1;
    behavior->hysteresisFrames = 3;

    auto* cmd = reg.getComponent<RoleCommandComponent>(id);
    ASSERT_NE(cmd, nullptr);
    cmd->pushCommand(1, 1);
    cmd->issuerId = 1;
    cmd->issuerTier = 2;

    BehaviorTreeSystem::getInstance().evaluate(id, 0);

    EXPECT_NE(behavior->currentActivity, NPCActivity::Mine)
        << "Command should break through hysteresis lock and change activity";
}
