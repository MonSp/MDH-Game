#include <gtest/gtest.h>
#include "../../src/server/game/ecs/components/MemoryRingComponent.h"

TEST(RumorPriority, HighSeverityIsOrderedFirst) {
    auto sevHigh = static_cast<uint8_t>(RumorSeverity::Tribulation);
    auto sevLow  = static_cast<uint8_t>(RumorSeverity::GossipChatter);

    EXPECT_GT(sevHigh, sevLow);
    EXPECT_EQ(static_cast<uint8_t>(RumorSeverity::Assassination), 9u);
    EXPECT_EQ(static_cast<uint8_t>(RumorSeverity::Embezzlement), 8u);
    EXPECT_EQ(static_cast<uint8_t>(RumorSeverity::ClanWar), 7u);
    EXPECT_EQ(static_cast<uint8_t>(RumorSeverity::DaoBonding), 6u);
    EXPECT_EQ(static_cast<uint8_t>(RumorSeverity::Death), 5u);
    EXPECT_EQ(static_cast<uint8_t>(RumorSeverity::DuelOutcome), 4u);
    EXPECT_EQ(static_cast<uint8_t>(RumorSeverity::ResourceDispute), 3u);
    EXPECT_EQ(static_cast<uint8_t>(RumorSeverity::DailyConflict), 2u);
    EXPECT_EQ(static_cast<uint8_t>(RumorSeverity::GossipChatter), 1u);
}

TEST(RumorPriority, FIFOOrderWithinSameSeverity) {
    MemoryRingComponent mem;

    WitnessedSlot early;
    early.timestamp = 100;
    early.slot = 1;
    early.significance = 5;
    early._pad = 0;

    WitnessedSlot later;
    later.timestamp = 200;
    later.slot = 2;
    later.significance = 5;
    later._pad = 0;

    mem.witnessed.push(later);
    mem.witnessed.push(early);

    WitnessedSlot out[2];
    mem.witnessed.getRecent(out, 2);
    EXPECT_EQ(out[0].timestamp, 100u);
    EXPECT_EQ(out[1].timestamp, 200u);
}

TEST(RumorPriority, SeveritySetOnStartRumor) {
    MemoryRingComponent mem;
    mem.startRumor(42, 100, 10);
    EXPECT_EQ(mem.rumors.size(), 1u);

    const RumorPacket& rumor = mem.rumors.rawData()[0];
    EXPECT_EQ(static_cast<uint8_t>(rumor.severity), 10u);
    EXPECT_EQ(rumor.hopCount, 0u);
    EXPECT_EQ(rumor.contentIntegrity, 100);
    EXPECT_EQ(rumor.sensitivity, 10u);
}

TEST(RumorPriority, SeverityPreservedOnReceive) {
    MemoryRingComponent mem;

    RumorPacket original;
    original.timestamp = 1000;
    original.originalEventSlot = 50;
    original.originalWitness = 10;
    original.contentIntegrity = 100;
    original.hopCount = 0;
    original.sensitivity = 8;
    original.severity = RumorSeverity::Embezzlement;
    original.queuedSinceFrame = 500;

    mem.receiveRumor(original, 20);
    EXPECT_EQ(mem.rumors.size(), 1u);

    RumorPacket received = mem.rumors.rawData()[0];
    EXPECT_EQ(static_cast<uint8_t>(received.severity), static_cast<uint8_t>(RumorSeverity::Embezzlement));
    EXPECT_EQ(received.queuedSinceFrame, 500u);
}
