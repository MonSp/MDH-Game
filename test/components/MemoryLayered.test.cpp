#include <gtest/gtest.h>
#include "../common/test_utils.h"
#include "../../src/server/game/ecs/components/MemoryRingComponent.h"

static constexpr uint8_t kCompleted = 0;
static constexpr uint8_t kFailed    = 2;
static constexpr uint8_t kEmotionOverachieve = 1;

TEST(MemoryLayered, RecentMemoryOverflowCompressesToMidTerm) {
    MemoryRingComponent mem;
    for (int i = 0; i < 25; i++) {
        InteractionSlot slot;
        slot.timestamp = i * 1000;
        slot.otherSlot = (i % 3) + 1;
        slot.type = 1;
        slot.impactScore = i % 2 == 0 ? 5 : -3;
        mem.interactions.push(slot);
    }
    mem.compressToMidTerm();
    EXPECT_GT(mem.midTerm.size(), 0u);
}

TEST(MemoryLayered, MilestoneEntersLongTerm) {
    MemoryRingComponent mem;
    mem.recordMilestone(MilestoneType::BreakthroughRealm, 42, 100);
    EXPECT_EQ(mem.longTerm.size(), 1u);
    EXPECT_EQ(mem.longTerm.rawData()[0].type, MilestoneType::BreakthroughRealm);
}

TEST(MemoryLayered, TopMidTermReturnsSorted) {
    MemoryRingComponent mem;
    MidTermSummary s1 = {10, 30, 8, 1000, 5000, 0};
    MidTermSummary s2 = {20, 5, -5, 2000, 6000, 0};
    MidTermSummary s3 = {30, 15, 10, 3000, 7000, 0};
    mem.midTerm.push(s1);
    mem.midTerm.push(s2);
    mem.midTerm.push(s3);

    MidTermSummary out[3];
    int n = mem.getTopMidTerm(out, 2);
    EXPECT_EQ(n, 2);
    EXPECT_EQ(out[0].targetSlot, 10u);
}

TEST(MemoryLayered, AllMilestoneTypesCanBeRecorded) {
    MemoryRingComponent mem;
    mem.recordMilestone(MilestoneType::DaoCompanionBond, 1, 50);
    mem.recordMilestone(MilestoneType::LifeDeathBattle, 2, 90);
    mem.recordMilestone(MilestoneType::ClanWar, 3, 80);
    mem.recordMilestone(MilestoneType::MajorCommand, 4, 60);
    mem.recordMilestone(MilestoneType::ExpelledFromSect, 5, 100);

    EXPECT_EQ(mem.longTerm.size(), 5u);
    const LongTermMilestone* data = mem.longTerm.rawData();
    EXPECT_EQ(data[0].type, MilestoneType::DaoCompanionBond);
    EXPECT_EQ(data[4].type, MilestoneType::ExpelledFromSect);
}

TEST(MemoryLayered, EmptyMidTermReturnsZero) {
    MemoryRingComponent mem;
    MidTermSummary out[10];
    int n = mem.getTopMidTerm(out, 5);
    EXPECT_EQ(n, 0);
}

TEST(MemoryLayered, CompressMultipleInteractionSources) {
    MemoryRingComponent mem;
    InteractionSlot slotA = {100, 10, 0, 5};
    InteractionSlot slotB = {200, 20, 0, -3};
    InteractionSlot slotC = {300, 10, 0, 7};
    mem.interactions.push(slotA);
    mem.interactions.push(slotB);
    mem.interactions.push(slotC);
    mem.compressToMidTerm();
    EXPECT_GE(mem.midTerm.size(), 2u);
}

TEST(MemoryLayered, LongTermOverflowWraps) {
    MemoryRingComponent mem;
    for (int i = 0; i < 60; i++) {
        mem.recordMilestone(MilestoneType::MajorCommand, static_cast<uint32_t>(i), 50);
    }
    EXPECT_EQ(mem.longTerm.size(), 50u);
}

TEST(MemoryLayered, ExistingMethodsStillWork) {
    MemoryRingComponent mem;
    for (int i = 0; i < 4; i++) {
        mem.commandMemory.push({static_cast<uint64_t>(i), 5, 0, kFailed, 0, 0, 0});
    }
    EXPECT_EQ(mem.getConsecutiveFailures(5), 4);

    mem.commandMemory.push({100, 1, 0, kCompleted, kEmotionOverachieve, 0, 0});
    mem.commandMemory.push({200, 1, 0, kCompleted, kEmotionOverachieve, 0, 0});
    EXPECT_EQ(mem.getOverachieveCount(1), 2);
}

TEST(MemoryLayered, CompressWitnessedToMidTerm) {
    MemoryRingComponent mem;
    WitnessedSlot w1 = {1000, 5, 3, 0};
    WitnessedSlot w2 = {2000, 5, 5, 0};
    WitnessedSlot w3 = {3000, 10, 7, 0};
    mem.witnessed.push(w1);
    mem.witnessed.push(w2);
    mem.witnessed.push(w3);
    mem.compressToMidTerm();
    EXPECT_GT(mem.midTerm.size(), 0u);
}

TEST(MemoryLayered, CompressCommandsToMidTerm) {
    MemoryRingComponent mem;
    CommandMemorySlot c1 = {1000, 7, 1, 0, 0, 10, 0};
    CommandMemorySlot c2 = {2000, 7, 2, 0, 0, -5, 0};
    mem.commandMemory.push(c1);
    mem.commandMemory.push(c2);
    mem.compressToMidTerm();
    EXPECT_GT(mem.midTerm.size(), 0u);
}
