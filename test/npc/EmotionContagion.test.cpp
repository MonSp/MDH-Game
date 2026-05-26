#include <gtest/gtest.h>
#include "../../src/server/game/ecs/components/SocialComponent.h"

TEST(EmotionContagion, FearRatioAboveThreshold) {
    SocialComponent social;
    social.fear = 30.0f;

    float fearRatio = 0.4f;
    social.addFear(15.0f * fearRatio);

    EXPECT_GT(social.fear, 30.0f);
    EXPECT_LT(social.fear, 80.0f);
}

TEST(EmotionContagion, AngerRatioAboveThreshold) {
    SocialComponent social;
    social.anger = 20.0f;

    float angerRatio = 0.35f;
    social.addAnger(10.0f * angerRatio);

    EXPECT_GT(social.anger, 20.0f);
    EXPECT_LT(social.anger, 60.0f);
}

TEST(EmotionContagion, JoyRatioAboveThreshold) {
    SocialComponent social;
    social.joy = 15.0f;

    float joyRatio = 0.5f;
    social.addJoy(10.0f * joyRatio);

    EXPECT_GT(social.joy, 15.0f);
    EXPECT_LT(social.joy, 80.0f);
}

TEST(EmotionContagion, LowRatioCausesSmallChange) {
    SocialComponent social;
    social.fear = 50.0f;

    float lowRatio = 0.35f;
    social.addFear(15.0f * lowRatio);

    float lowAdded = 15.0f * 0.35f;
    EXPECT_NEAR(social.fear, 50.0f + lowAdded, 0.01f);

    float highRatio = 0.8f;
    social.addFear(15.0f * highRatio);
    float highAdded = 15.0f * 0.8f;
    EXPECT_GT(15.0f * highRatio, 15.0f * lowRatio);
}
