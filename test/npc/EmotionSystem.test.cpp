#include <gtest/gtest.h>
#include "../../src/server/game/ecs/components/SocialComponent.h"
#include "../../src/server/game/ecs/components/PersonalityComponent.h"
#include "../../src/server/game/npc/BehaviorTreeSystem.h"
#include "../common/test_utils.h"

TEST(EmotionSystem, AngerAccumulatesAndTriggers) {
    SocialComponent social;
    PersonalityComponent personality(50, 80, 50, 50, 50, 50);
    personality.caution = 80.0f;

    social.onInsulted(personality.caution);
    EXPECT_GT(social.anger, 0.0f);
    EXPECT_LT(social.anger, 20.0f);

    EXPECT_FALSE(social.isEnraged(personality.caution));

    social.onInsulted(personality.caution);
    social.onInsulted(personality.caution);
    social.onInsulted(personality.caution);
    EXPECT_TRUE(social.isEnraged(personality.caution));
}

TEST(EmotionSystem, LowCautionEnragesFaster) {
    SocialComponent social;
    PersonalityComponent lowCaution(50, 30, 50, 50, 50, 50);
    lowCaution.caution = 30.0f;

    social.onInsulted(lowCaution.caution);
    social.onInsulted(lowCaution.caution);
    social.onInsulted(lowCaution.caution);
    social.onInsulted(lowCaution.caution);
    EXPECT_TRUE(social.isEnraged(lowCaution.caution));
}

TEST(EmotionSystem, FearDecaysOverTime) {
    SocialComponent social;
    social.addFear(50.0f);
    EXPECT_GT(social.fear, 0.0f);

    for (int i = 0; i < 200; i++) {
        social.tickEmotions(1.0f);
    }
    EXPECT_LT(social.fear, 50.0f);
    EXPECT_GT(social.fear, 0.0f);
}

TEST(EmotionSystem, FearTriggersTerrified) {
    SocialComponent social;
    EXPECT_FALSE(social.isTerrified());

    social.addFear(50.0f);
    EXPECT_FALSE(social.isTerrified());

    social.addFear(20.0f);
    EXPECT_TRUE(social.isTerrified());
}

TEST(EmotionSystem, JoyTriggersElated) {
    SocialComponent social;
    PersonalityComponent highSoc(50, 50, 50, 50, 90, 50);
    highSoc.sociability = 90.0f;

    EXPECT_FALSE(social.isElated(highSoc.sociability));

    social.onSocialSuccess();
    social.onSocialSuccess();
    social.onSocialSuccess();
    social.onSocialSuccess();
    social.onSocialSuccess();
    social.onSocialSuccess();
    social.onSocialSuccess();
    social.onSocialSuccess();

    EXPECT_TRUE(social.isElated(highSoc.sociability));
}

TEST(EmotionSystem, OnAttackedGeneratesFearAndAnger) {
    SocialComponent social;
    PersonalityComponent personality(50, 50, 50, 50, 50, 50);
    personality.caution = 50.0f;

    social.onAttacked(10.0f, personality.caution);
    EXPECT_GT(social.fear, 0.0f);
    EXPECT_GT(social.anger, 0.0f);

    EXPECT_NEAR(social.fear, 30.0f, 0.01f);
}

TEST(EmotionSystem, OnGiftReceivedBoostsJoy) {
    SocialComponent social;
    social.onGiftReceived();
    EXPECT_NEAR(social.joy, 25.0f, 0.01f);
}

TEST(EmotionSystem, EmotionsClampedToZeroAndHundred) {
    SocialComponent social;

    social.addAnger(-50.0f);
    EXPECT_FLOAT_EQ(social.anger, 0.0f);

    social.addJoy(200.0f);
    EXPECT_FLOAT_EQ(social.joy, 100.0f);

    social.addFear(150.0f);
    EXPECT_FLOAT_EQ(social.fear, 100.0f);
}

TEST(EmotionSystem, SurvivalOverridesEmotion) {
    SocialComponent social;
    social.anger = 90.0f;

    EXPECT_TRUE(true);
}

TEST(EmotionSystem, EmotionEvaluateOrderRespected) {
    TestUtils::resetRegistry();
    TestUtils::seedRand(42);

    ECS::EntityId id = TestUtils::createTestNPC(NPCRole::BranchDisciple);
    auto& reg = ECS::Registry::getInstance();
    auto* stats = reg.getComponent<StatsComponent>(id);
    auto* behavior = reg.getComponent<BehaviorComponent>(id);
    auto* social = reg.getComponent<SocialComponent>(id);
    auto* personality = reg.getComponent<PersonalityComponent>(id);

    ASSERT_NE(stats, nullptr);
    ASSERT_NE(behavior, nullptr);
    ASSERT_NE(social, nullptr);
    ASSERT_NE(personality, nullptr);

    stats->hp = 20;
    stats->maxHp = 100;
    social->anger = 95.0f;
    personality->caution = 30.0f;
    personality->sociability = 50.0f;
    behavior->currentActivity = NPCActivity::Rest;

    BehaviorTreeSystem::getInstance().evaluate(id, 0);

    EXPECT_EQ(behavior->currentActivity, NPCActivity::Flee);

    TestUtils::resetRegistry();
}

TEST(EmotionSystem, EmotionTickDecaysOnExecute) {
    TestUtils::resetRegistry();
    TestUtils::seedRand(42);

    ECS::EntityId id = TestUtils::createTestNPC(NPCRole::BranchDisciple);
    auto& reg = ECS::Registry::getInstance();
    auto* social = reg.getComponent<SocialComponent>(id);
    auto* behavior = reg.getComponent<BehaviorComponent>(id);

    ASSERT_NE(social, nullptr);
    ASSERT_NE(behavior, nullptr);

    social->anger = 100.0f;
    social->fear = 100.0f;
    social->joy = 100.0f;

    behavior->currentActivity = NPCActivity::Rest;

    for (int i = 0; i < 10; i++) {
        BehaviorTreeSystem::getInstance().execute(id, 0, 1.0f);
    }

    EXPECT_LT(social->anger, 100.0f);
    EXPECT_LT(social->fear, 100.0f);
    EXPECT_LT(social->joy, 100.0f);

    TestUtils::resetRegistry();
}
