#include <gtest/gtest.h>
#include "../common/test_utils.h"
#include "../../src/server/game/ecs/components/MemoryRingComponent.h"

TEST(RumorSpread, StartRumor) {
    MemoryRingComponent mem;
    mem.startRumor(42, 100, 5);
    EXPECT_EQ(mem.rumors.size(), 1u);
    EXPECT_EQ(mem.rumors.rawData()[0].originalWitness, 42u);
    EXPECT_EQ(mem.rumors.rawData()[0].hopCount, 0u);
    EXPECT_EQ(mem.rumors.rawData()[0].contentIntegrity, 100);
}

TEST(RumorSpread, RumorMutatesOnReceive) {
    MemoryRingComponent mem;
    RumorPacket original;
    original.timestamp = 1000;
    original.originalEventSlot = 50;
    original.originalWitness = 10;
    original.contentIntegrity = 100;
    original.hopCount = 0;
    original.sensitivity = 5;

    mem.receiveRumor(original, 20);
    EXPECT_EQ(mem.rumors.size(), 1u);

    RumorPacket received = mem.rumors.rawData()[0];
    EXPECT_LT(received.contentIntegrity, 100);
    EXPECT_EQ(received.hopCount, 1u);
}

TEST(RumorSpread, MultipleHopsDegradeContent) {
    MemoryRingComponent mem;
    RumorPacket rumor;
    rumor.originalEventSlot = 50;
    rumor.contentIntegrity = 100;
    rumor.hopCount = 0;
    rumor.sensitivity = 3;

    for (int hop = 0; hop < 3; hop++) {
        mem.receiveRumor(rumor, static_cast<uint32_t>(20 + hop));
        rumor = mem.rumors.rawData()[mem.rumors.size() - 1];
    }

    EXPECT_LT(rumor.contentIntegrity, 60);
}

TEST(RumorSpread, KnowsRumor) {
    MemoryRingComponent mem;
    mem.startRumor(1, 100, 3);
    EXPECT_TRUE(mem.knowsRumor(100));
    EXPECT_FALSE(mem.knowsRumor(200));
}
