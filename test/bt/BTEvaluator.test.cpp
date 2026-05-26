#include <gtest/gtest.h>
#include "../common/test_utils.h"
#include "game/bt/BTEvaluator.h"
#include "game/ecs/components/StatsComponent.h"
#include "game/ecs/components/BehaviorComponent.h"
#include "game/ecs/components/BehaviorTreeComponent.h"
#include "game/ecs/components/SocialComponent.h"
#include "game/ecs/components/RelationshipComponent.h"
#include "game/ecs/components/PersonalityComponent.h"
#include "game/ecs/components/RoleCommandComponent.h"
#include "game/ecs/components/CultivationComponent.h"
#include "game/bt/BlackboardCache.h"
#include "game/bt/BehaviorTreeTemplate.h"

class BTEvaluatorTest : public ::testing::Test {
protected:
    void SetUp() override {
        TestUtils::resetRegistry();
        TestUtils::seedRand(12345);
    }
};

TEST_F(BTEvaluatorTest, SelectorNodeTrueReturnsImmediately) {
    constexpr FlatBTNode kSelectorNodes[] = {
        { 4, 1, 5, 0 },
        { 1, 2, 3, 0 },
        { 2, 0, 2, 58 },
        { 1, 4, 5, 1 },
        { 2, 0, 4, 21 },
    };
    const BehaviorTreeTemplate kSelectorTmpl{"SelectorTest", kSelectorNodes, 5, 0};

    auto& reg = ECS::Registry::getInstance();
    ECS::EntityId id = reg.createEntity().getId();

    auto* stats = reg.getComponent<StatsComponent>(id);
    ASSERT_NE(stats, nullptr);
    stats->hp = 10;
    stats->maxHp = 100;

    auto* bt = reg.getComponent<BehaviorTreeComponent>(id);
    ASSERT_NE(bt, nullptr);
    bt->tmpl = &kSelectorTmpl;
    bt->currentNode = 0;

    auto* bb = reg.getComponent<BlackboardCache>(id);
    ASSERT_NE(bb, nullptr);
    bb->invalidate();

    auto* behavior = reg.getComponent<BehaviorComponent>(id);
    ASSERT_NE(behavior, nullptr);
    behavior->currentActivity = NPCActivity::Rest;

    auto* identity = reg.getComponent<IdentityComponent>(id);
    ASSERT_NE(identity, nullptr);

    bool result = BTEvaluator::evaluate(id, 0);

    EXPECT_TRUE(result);
    EXPECT_EQ(static_cast<uint8_t>(behavior->currentActivity), static_cast<uint8_t>(NPCActivity::Patrol));
}

TEST_F(BTEvaluatorTest, SequenceNodeFailsOnFirstFalse) {
    constexpr FlatBTNode kSequenceNodes[] = {
        { 3, 1, 3, 0 },
        { 1, 2, 3, 1 },
        { 2, 3, 2, 20 },
    };
    const BehaviorTreeTemplate kSequenceTmpl{"SequenceTest", kSequenceNodes, 3, 0};

    auto& reg = ECS::Registry::getInstance();
    ECS::EntityId id = reg.createEntity().getId();

    auto* social = reg.getComponent<SocialComponent>(id);
    ASSERT_NE(social, nullptr);
    social->hunger = 0.0f;

    auto* bt = reg.getComponent<BehaviorTreeComponent>(id);
    ASSERT_NE(bt, nullptr);
    bt->tmpl = &kSequenceTmpl;
    bt->currentNode = 0;

    auto* bb = reg.getComponent<BlackboardCache>(id);
    ASSERT_NE(bb, nullptr);
    bb->invalidate();

    auto* behavior = reg.getComponent<BehaviorComponent>(id);
    ASSERT_NE(behavior, nullptr);
    behavior->currentActivity = NPCActivity::Rest;

    auto* identity = reg.getComponent<IdentityComponent>(id);
    ASSERT_NE(identity, nullptr);

    bool result = BTEvaluator::evaluate(id, 0);

    EXPECT_FALSE(result);
    EXPECT_NE(static_cast<uint8_t>(behavior->currentActivity), static_cast<uint8_t>(NPCActivity::Eat));
}

TEST_F(BTEvaluatorTest, BlackboardCacheDirtyFlag) {
    constexpr FlatBTNode kCacheNodes[] = {
        { 3, 1, 3, 0 },
        { 1, 2, 3, 1 },
        { 2, 0, 2, 21 },
    };
    const BehaviorTreeTemplate kCacheTmpl{"CacheTest", kCacheNodes, 3, 0};

    auto& reg = ECS::Registry::getInstance();
    ECS::EntityId id = reg.createEntity().getId();

    auto* bt = reg.getComponent<BehaviorTreeComponent>(id);
    ASSERT_NE(bt, nullptr);
    bt->tmpl = &kCacheTmpl;
    bt->currentNode = 0;

    auto* bb = reg.getComponent<BlackboardCache>(id);
    ASSERT_NE(bb, nullptr);
    bb->flags = 0;

    auto* behavior = reg.getComponent<BehaviorComponent>(id);
    ASSERT_NE(behavior, nullptr);
    behavior->currentActivity = NPCActivity::Idle;

    auto* identity = reg.getComponent<IdentityComponent>(id);
    ASSERT_NE(identity, nullptr);

    bool result = BTEvaluator::evaluate(id, 0);

    EXPECT_TRUE(result);
    EXPECT_EQ(static_cast<uint8_t>(behavior->currentActivity), static_cast<uint8_t>(NPCActivity::Rest));
    EXPECT_EQ(bt->currentNode, 0u);
}

TEST_F(BTEvaluatorTest, ConditionEvaluation) {
    FlatBTNode nodes[] = {
        { 4, 1, 3, 0 },
        { 1, 2, 3, 0 },
        { 2, 0, 2, 58 },
    };

    auto& reg = ECS::Registry::getInstance();

    {
        ECS::EntityId id = reg.createEntity().getId();
        auto* stats = reg.getComponent<StatsComponent>(id);
        stats->hp = 10;
        stats->maxHp = 100;
        auto* bt = reg.getComponent<BehaviorTreeComponent>(id);
        nodes[1].actionId = 0;
        BehaviorTreeTemplate tmpl{"CondHasThreat", nodes, 3, 0};
        bt->tmpl = &tmpl;
        bt->currentNode = 0;
        auto* bb = reg.getComponent<BlackboardCache>(id);
        bb->invalidate();
        bool result = BTEvaluator::evaluate(id, 0);
        EXPECT_TRUE(result);

        reg.destroyEntity(id);
    }

    {
        ECS::EntityId id = reg.createEntity().getId();
        auto* social = reg.getComponent<SocialComponent>(id);
        social->hunger = 90.0f;
        auto* bt = reg.getComponent<BehaviorTreeComponent>(id);
        nodes[1].actionId = 1;
        BehaviorTreeTemplate tmpl{"CondIsHungry", nodes, 3, 0};
        bt->tmpl = &tmpl;
        bt->currentNode = 0;
        auto* bb = reg.getComponent<BlackboardCache>(id);
        bb->invalidate();
        bool result = BTEvaluator::evaluate(id, 0);
        EXPECT_TRUE(result);

        reg.destroyEntity(id);
    }

    {
        ECS::EntityId id = reg.createEntity().getId();
        auto* social = reg.getComponent<SocialComponent>(id);
        social->fatigue = 90.0f;
        auto* bt = reg.getComponent<BehaviorTreeComponent>(id);
        nodes[1].actionId = 2;
        BehaviorTreeTemplate tmpl{"CondIsExhausted", nodes, 3, 0};
        bt->tmpl = &tmpl;
        bt->currentNode = 0;
        auto* bb = reg.getComponent<BlackboardCache>(id);
        bb->invalidate();
        bool result = BTEvaluator::evaluate(id, 0);
        EXPECT_TRUE(result);

        reg.destroyEntity(id);
    }

    {
        ECS::EntityId id = reg.createEntity().getId();
        auto* social = reg.getComponent<SocialComponent>(id);
        social->socialDesire = 80.0f;
        auto* personality = reg.getComponent<PersonalityComponent>(id);
        personality->sociability = 80.0f;
        auto* rel = reg.getComponent<RelationshipComponent>(id);
        rel->relationCount = 1;
        auto* bt = reg.getComponent<BehaviorTreeComponent>(id);
        nodes[1].actionId = 3;
        BehaviorTreeTemplate tmpl{"CondHasSocial", nodes, 3, 0};
        bt->tmpl = &tmpl;
        bt->currentNode = 0;
        auto* bb = reg.getComponent<BlackboardCache>(id);
        bb->invalidate();
        bool result = BTEvaluator::evaluate(id, 0);
        EXPECT_TRUE(result);

        reg.destroyEntity(id);
    }

    {
        ECS::EntityId id = reg.createEntity().getId();
        auto* cmd = reg.getComponent<RoleCommandComponent>(id);
        cmd->pushCommand(1, 5);
        auto* bt = reg.getComponent<BehaviorTreeComponent>(id);
        nodes[1].actionId = 4;
        BehaviorTreeTemplate tmpl{"CondHasCommand", nodes, 3, 0};
        bt->tmpl = &tmpl;
        bt->currentNode = 0;
        auto* bb = reg.getComponent<BlackboardCache>(id);
        bb->invalidate();
        bool result = BTEvaluator::evaluate(id, 0);
        EXPECT_TRUE(result);

        reg.destroyEntity(id);
    }

    {
        ECS::EntityId id = reg.createEntity().getId();
        auto* cult = reg.getComponent<CultivationComponent>(id);
        cult->cultivationProgress = 1000.0f;
        auto* bt = reg.getComponent<BehaviorTreeComponent>(id);
        nodes[1].actionId = 5;
        BehaviorTreeTemplate tmpl{"CondShouldCultivate", nodes, 3, 0};
        bt->tmpl = &tmpl;
        bt->currentNode = 0;
        auto* bb = reg.getComponent<BlackboardCache>(id);
        bb->invalidate();
        bool result = BTEvaluator::evaluate(id, 0);
        EXPECT_TRUE(result);

        reg.destroyEntity(id);
    }
}

TEST_F(BTEvaluatorTest, TemplateRootEntry) {
    auto& reg = ECS::Registry::getInstance();
    ECS::EntityId id = reg.createEntity().getId();

    auto* identity = reg.getComponent<IdentityComponent>(id);
    ASSERT_NE(identity, nullptr);
    identity->role = NPCRole::FamilyHead;

    auto* bt = reg.getComponent<BehaviorTreeComponent>(id);
    ASSERT_NE(bt, nullptr);
    bt->tmpl = &BehaviorTreePresets::kLeader;
    bt->currentNode = 0;

    EXPECT_EQ(bt->tmpl, &BehaviorTreePresets::kLeader);
    EXPECT_EQ(bt->currentNode, 0u);
    EXPECT_EQ(bt->tmpl->rootIndex, 0u);
    EXPECT_EQ(bt->tmpl->nodeCount, 7u);
}
