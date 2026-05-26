#include <gtest/gtest.h>
#include "../../src/server/game/ecs/components/RelationshipComponent.h"

TEST(FactionBias, SetAndGetFactionAffinity) {
    RelationshipComponent::factionPairCount = 0;
    RelationshipComponent::setFactionAffinity(0xAAAA, 0xBBBB, -40);
    int8_t aff = RelationshipComponent::getFactionAffinity(0xAAAA, 0xBBBB);
    EXPECT_EQ(aff, -40);

    int8_t affReverse = RelationshipComponent::getFactionAffinity(0xBBBB, 0xAAAA);
    EXPECT_EQ(affReverse, -40);
}

TEST(FactionBias, SmoothTransitionOnAffinityChange) {
    RelationshipComponent::factionPairCount = 0;
    RelationshipComponent::setFactionAffinity(0x1111, 0x2222, -40);

    RelationshipComponent::setFactionAffinity(0x1111, 0x2222, 0);
    int8_t aff1 = RelationshipComponent::getFactionAffinity(0x1111, 0x2222);
    EXPECT_EQ(aff1, -39);

    RelationshipComponent::setFactionAffinity(0x1111, 0x2222, 0);
    int8_t aff2 = RelationshipComponent::getFactionAffinity(0x1111, 0x2222);
    EXPECT_EQ(aff2, -38);
}

TEST(FactionBias, NoFactionAffinityReturnsZero) {
    int8_t aff = RelationshipComponent::getFactionAffinity(0xDEAD, 0xBEEF);
    EXPECT_EQ(aff, 0);

    int8_t affSame = RelationshipComponent::getFactionAffinity(0xCAFE, 0xCAFE);
    EXPECT_EQ(affSame, 0);
}

TEST(FactionBias, GetFactionBiasFloor) {
    RelationshipComponent::factionPairCount = 0;
    RelationshipComponent::setFactionAffinity(0xAAAA, 0xBBBB, -40);

    RelationshipComponent rel;
    int8_t floor1 = rel.getFactionBiasFloor(0xAAAA, 0xBBBB);
    EXPECT_EQ(floor1, -10);

    int8_t floor2 = rel.getFactionBiasFloor(0xAAAA, 0xCCCC);
    EXPECT_EQ(floor2, 0);

    int8_t floor3 = rel.getFactionBiasFloor(0, 0xBBBB);
    EXPECT_EQ(floor3, 0);
}
