#include <gtest/gtest.h>
#include "../common/test_utils.h"
#include "../../src/server/game/npc/ExecuteDescriptor.h"
#include "../../src/server/game/npc/BehaviorTreeSystem.h"
#include <cstring>

class ExecuteDescriptorTest : public ::testing::Test {
protected:
    void SetUp() override {
        TestUtils::resetRegistry();
    }
};

TEST_F(ExecuteDescriptorTest, TableSizeIsCorrect) {
    EXPECT_EQ(kExecuteTableSize, 50u);
}

TEST_F(ExecuteDescriptorTest, AllActivitiesHaveName) {
    for (size_t i = 0; i < kExecuteTableSize; ++i) {
        EXPECT_NE(kExecuteTable[i].name, nullptr);
        EXPECT_GT(std::strlen(kExecuteTable[i].name), 0u);
    }
}

TEST_F(ExecuteDescriptorTest, NoDuplicateActivities) {
    for (size_t i = 0; i < kExecuteTableSize; ++i) {
        for (size_t j = i + 1; j < kExecuteTableSize; ++j) {
            EXPECT_NE(kExecuteTable[i].activity, kExecuteTable[j].activity);
        }
    }
}

TEST_F(ExecuteDescriptorTest, AllHaveValidFunction) {
    for (size_t i = 0; i < kExecuteTableSize; ++i) {
        EXPECT_NE(kExecuteTable[i].execute, nullptr);
    }
}

TEST_F(ExecuteDescriptorTest, CategoryCoverage) {
    bool hasCategory[8] = {};
    for (size_t i = 0; i < kExecuteTableSize; ++i) {
        hasCategory[static_cast<uint8_t>(kExecuteTable[i].category)] = true;
    }
    for (int c = 0; c < 8; ++c) {
        EXPECT_TRUE(hasCategory[c]) << "Missing category " << c;
    }
}

TEST_F(ExecuteDescriptorTest, RequiredComponentsValid) {
    for (size_t i = 0; i < kExecuteTableSize; ++i) {
        EXPECT_GT(kExecuteTable[i].requiredComponents, 0u);
    }
}

TEST_F(ExecuteDescriptorTest, ContextLazyLoading) {
    TestUtils::seedRand(42);
    ECS::EntityId id = TestUtils::createTestNPC();
    auto* behavior = ECS::Registry::getInstance().getComponent<BehaviorComponent>(id);
    ASSERT_NE(behavior, nullptr);
    
    ExecuteContext ctx(id, 0, 3600000.0f);
    auto* s = ctx.getStats();
    EXPECT_NE(s, nullptr);
    EXPECT_EQ(s->hp, 100);
    
    auto* s2 = ctx.getStats();
    EXPECT_EQ(s, s2);
}

TEST_F(ExecuteDescriptorTest, DispatchFleeActivity) {
    TestUtils::seedRand(42);
    ECS::EntityId id = TestUtils::createTestNPC();
    auto* behavior = ECS::Registry::getInstance().getComponent<BehaviorComponent>(id);
    ASSERT_NE(behavior, nullptr);
    auto* stats = ECS::Registry::getInstance().getComponent<StatsComponent>(id);
    stats->hp = 50;
    behavior->changeActivity(NPCActivity::Flee);
    
    ExecuteContext ctx(id, 0, 1000.0f);
    
    bool found = false;
    for (size_t i = 0; i < kExecuteTableSize; ++i) {
        if (kExecuteTable[i].activity == NPCActivity::Flee) {
            kExecuteTable[i].execute(ctx);
            found = true;
            break;
        }
    }
    EXPECT_TRUE(found);
    
    EXPECT_GT(stats->hp, 50);
}

TEST_F(ExecuteDescriptorTest, DispatchRestActivity) {
    TestUtils::seedRand(42);
    ECS::EntityId id = TestUtils::createTestNPC();
    auto* behavior = ECS::Registry::getInstance().getComponent<BehaviorComponent>(id);
    ASSERT_NE(behavior, nullptr);
    behavior->changeActivity(NPCActivity::Rest);
    
    auto* stats = ECS::Registry::getInstance().getComponent<StatsComponent>(id);
    stats->hp = 50;
    
    ExecuteContext ctx(id, 0, 3600000.0f);
    
    bool found = false;
    for (size_t i = 0; i < kExecuteTableSize; ++i) {
        if (kExecuteTable[i].activity == NPCActivity::Rest) {
            kExecuteTable[i].execute(ctx);
            found = true;
            break;
        }
    }
    EXPECT_TRUE(found);
    
    EXPECT_GT(stats->hp, 50);
}
