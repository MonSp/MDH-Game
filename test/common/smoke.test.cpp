#include <gtest/gtest.h>
#include "test_utils.h"

TEST(SmokeTest, RegistryInitAndClear) {
    TestUtils::resetRegistry();
    auto id = TestUtils::createTestNPC();
    auto* stats = ECS::Registry::getInstance().getComponent<StatsComponent>(id);
    ASSERT_NE(stats, nullptr);
    EXPECT_EQ(stats->hp, 100);
    TestUtils::resetRegistry();
}

TEST(SmokeTest, CreateMultipleNPCs) {
    TestUtils::resetRegistry();
    auto id1 = TestUtils::createTestNPC();
    auto id2 = TestUtils::createTestNPC();
    EXPECT_NE(id1, id2);
}
