#include <gtest/gtest.h>
#include "../common/test_utils.h"
#include "../../src/server/game/ecs/components/CommandResponseComponent.h"

class CommandResponseComponentTest : public ::testing::Test {
protected:
    void SetUp() override {
        TestUtils::seedRand(12345);
    }
};

TEST_F(CommandResponseComponentTest, LoyaltyAbove70AlwaysAccepts) {
    CommandResponseComponent crc;
    crc.evaluateResponse(0, 80.0f, 50.0f, 50.0f, 50.0f, 0.0f, 0.0f);
    EXPECT_TRUE(crc.isAccepting());
    EXPECT_FALSE(crc.isRefusing());
}

TEST_F(CommandResponseComponentTest, LowLoyaltyHighRiskRefuses) {
    CommandResponseComponent crc;
    crc.evaluateResponse(0, 25.0f, 50.0f, 50.0f, 50.0f, 0.0f, 0.9f);
    EXPECT_TRUE(crc.isRefusing());
}

TEST_F(CommandResponseComponentTest, AmbitionOverachievement) {
    TestUtils::seedRand(42);
    int overachieveCount = 0;
    for (int i = 0; i < 200; ++i) {
        CommandResponseComponent crc;
        crc.evaluateResponse(0, 80.0f, 90.0f, 50.0f, 50.0f, 0.0f, 0.0f);
        if (crc.responseType == static_cast<uint8_t>(ResponseType::Overachieve)) {
            ++overachieveCount;
            EXPECT_GE(crc.overachieveMult, 1.2f);
            EXPECT_LE(crc.overachieveMult, 1.5f);
        }
    }
    EXPECT_NEAR(overachieveCount, 200 * 0.30f, 30);
}

TEST_F(CommandResponseComponentTest, GreedInterceptRatio) {
    TestUtils::seedRand(42);
    int interceptCount = 0;
    for (int i = 0; i < 200; ++i) {
        CommandResponseComponent crc;
        crc.evaluateResponse(0, 80.0f, 50.0f, 50.0f, 85.0f, 0.0f, 0.0f);
        if (crc.resourceInterceptRatio > 0.0f) {
            ++interceptCount;
            EXPECT_GE(crc.resourceInterceptRatio, 0.1f);
            EXPECT_LE(crc.resourceInterceptRatio, 0.3f);
        }
    }
    EXPECT_NEAR(interceptCount, 200 * 0.25f, 30);
}

TEST_F(CommandResponseComponentTest, RelationshipModifiesProbability) {
    CommandResponseComponent crc;
    crc.evaluateResponse(0, 50.0f, 50.0f, 50.0f, 50.0f, -30.0f, 0.0f);
    EXPECT_FLOAT_EQ(crc.acceptProbability, 70.0f);
    crc.evaluateResponse(0, 50.0f, 50.0f, 50.0f, 50.0f, 60.0f, 0.0f);
    EXPECT_FLOAT_EQ(crc.acceptProbability, 100.0f);
}
