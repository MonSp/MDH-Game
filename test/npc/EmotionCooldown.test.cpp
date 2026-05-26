#include <gtest/gtest.h>
#include "../../src/server/game/ecs/components/SocialComponent.h"
#include "../../src/server/game/ecs/components/PersonalityComponent.h"

TEST(EmotionCooldown, CooldownPreventsRepeatDuel) {
    SocialComponent social;
    social.addCooldown(100, EmotionType::Anger, NPCActivity::Duel, 0);

    EXPECT_TRUE(social.isInCooldown(100, EmotionType::Anger, NPCActivity::Duel, 50));
    EXPECT_TRUE(social.isInCooldown(100, EmotionType::Anger, NPCActivity::Duel, 71));

    EXPECT_FALSE(social.isInCooldown(100, EmotionType::Anger, NPCActivity::Duel, 72));
    EXPECT_FALSE(social.isInCooldown(100, EmotionType::Anger, NPCActivity::Duel, 100));
}

TEST(EmotionCooldown, CooldownAllowsDifferentTarget) {
    SocialComponent social;
    social.addCooldown(100, EmotionType::Anger, NPCActivity::Duel, 0);

    EXPECT_TRUE(social.isInCooldown(100, EmotionType::Anger, NPCActivity::Duel, 10));
    EXPECT_FALSE(social.isInCooldown(200, EmotionType::Anger, NPCActivity::Duel, 10));
    EXPECT_FALSE(social.isInCooldown(300, EmotionType::Anger, NPCActivity::Duel, 10));
}

TEST(EmotionCooldown, CooldownExpiresAndRestores) {
    SocialComponent social;
    social.addCooldown(100, EmotionType::Anger, NPCActivity::Duel, 0);

    EXPECT_TRUE(social.isInCooldown(100, EmotionType::Anger, NPCActivity::Duel, 71));
    EXPECT_FALSE(social.isInCooldown(100, EmotionType::Anger, NPCActivity::Duel, 72));
    EXPECT_FALSE(social.isInCooldown(100, EmotionType::Anger, NPCActivity::Duel, 200));
}

TEST(EmotionCooldown, FearAndAngerCooldownsAreIndependent) {
    SocialComponent social;
    social.addCooldown(100, EmotionType::Anger, NPCActivity::Duel, 0);
    social.addCooldown(100, EmotionType::Fear, NPCActivity::Flee, 0);

    EXPECT_TRUE(social.isInCooldown(100, EmotionType::Anger, NPCActivity::Duel, 10));
    EXPECT_TRUE(social.isInCooldown(100, EmotionType::Fear, NPCActivity::Flee, 10));

    EXPECT_FALSE(social.isInCooldown(100, EmotionType::Anger, NPCActivity::Flee, 10));
    EXPECT_FALSE(social.isInCooldown(100, EmotionType::Fear, NPCActivity::Duel, 10));

    EXPECT_FALSE(social.isInCooldown(100, EmotionType::Anger, NPCActivity::Duel, 72));
    EXPECT_FALSE(social.isInCooldown(100, EmotionType::Fear, NPCActivity::Flee, 72));
}
