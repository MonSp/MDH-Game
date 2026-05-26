#include <gtest/gtest.h>
#include "../common/test_utils.h"
#include "../../src/server/game/ecs/components/MemoryRingComponent.h"
#include "../../src/server/game/ecs/components/RoleCommandComponent.h"

static constexpr uint8_t kCompleted = 0;
static constexpr uint8_t kFailed    = 2;
static constexpr uint8_t kEmotionOverachieve = 1;

class MemoryRingComponentTest : public ::testing::Test {
protected:
    void SetUp() override {}
};

TEST_F(MemoryRingComponentTest, PushGetRecentOrder) {
    MemoryRingComponent comp;
    for (uint64_t ts = 100; ts <= 500; ts += 100) {
        comp.interactions.push({ts, 0, 0, 0});
    }
    InteractionSlot out[5];
    size_t n = comp.interactions.getRecent(out, 3);
    ASSERT_EQ(n, 3u);
    EXPECT_EQ(out[0].timestamp, 500u);
    EXPECT_EQ(out[1].timestamp, 400u);
    EXPECT_EQ(out[2].timestamp, 300u);
}

TEST_F(MemoryRingComponentTest, OverflowOverwrites) {
    MemoryRingComponent comp;
    for (int i = 0; i < 25; i++) {
        comp.commandMemory.push({static_cast<uint64_t>(i), 0, 0, 0, 0, 0, 0});
    }
    EXPECT_EQ(comp.commandMemory.size(), 25u);
    for (int i = 0; i < 25; i++) {
        comp.interactions.push({static_cast<uint64_t>(i), 0, 0, 0});
    }
    EXPECT_EQ(comp.interactions.size(), 20u);
}

TEST_F(MemoryRingComponentTest, ConsecutiveFailuresCount) {
    MemoryRingComponent comp;
    for (int i = 0; i < 4; i++) {
        comp.commandMemory.push({static_cast<uint64_t>(i), 5, 0, kFailed, 0, 0, 0});
    }
    comp.commandMemory.push({500, 6, 0, kCompleted, 0, 0, 0});
    EXPECT_EQ(comp.getConsecutiveFailures(5), 4);
    EXPECT_EQ(comp.getConsecutiveFailures(6), 0);
}

TEST_F(MemoryRingComponentTest, OverachieveCount) {
    MemoryRingComponent comp;
    comp.commandMemory.push({100, 1, 0, kCompleted, kEmotionOverachieve, 0, 0});
    comp.commandMemory.push({200, 1, 0, kCompleted, kEmotionOverachieve, 0, 0});
    comp.commandMemory.push({300, 1, 0, kFailed, 0, 0, 0});
    EXPECT_EQ(comp.getOverachieveCount(1), 2);
    comp.commandMemory.push({400, 1, 0, kCompleted, 0, 0, 0});
    EXPECT_EQ(comp.getOverachieveCount(1), 2);
}

TEST_F(MemoryRingComponentTest, WitnessedSlotEncoding) {
    WitnessedSlot slot{};
    slot.timestamp  = 12345;
    slot.slot       = 7;
    slot.significance = 3;
    EXPECT_EQ(slot.timestamp, 12345u);
    EXPECT_EQ(slot.slot, 7u);
    EXPECT_EQ(slot.significance, 3u);
}
