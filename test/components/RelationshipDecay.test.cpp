#include <gtest/gtest.h>
#include "../../src/server/game/ecs/components/RelationshipComponent.h"

TEST(RelationshipDecay, DecayAfterInactivity) {
    RelationshipComponent rel;
    rel.setAffinity(100, 60);
    rel.markInteraction(100, 0);

    int changes = rel.applyDecay(51);
    EXPECT_GT(changes, 0);
    EXPECT_LT(rel.getAffinity(100), 60);
}

TEST(RelationshipDecay, NoDecayForRecentInteraction) {
    RelationshipComponent rel;
    rel.setAffinity(100, 60);
    rel.markInteraction(100, 90);

    int changes = rel.applyDecay(100);
    EXPECT_EQ(changes, 0);
    EXPECT_EQ(rel.getAffinity(100), 60);
}

TEST(RelationshipDecay, PersonalityAffectsRate) {
    uint8_t loyalRate = RelationshipComponent::computeDecayRate(80.0f, 50.0f);
    uint8_t disloyalRate = RelationshipComponent::computeDecayRate(20.0f, 50.0f);
    EXPECT_LT(loyalRate, disloyalRate);
}

TEST(RelationshipDecay, DoesNotGoBelowZero) {
    RelationshipComponent rel;
    rel.setAffinity(100, 5);
    rel.markInteraction(100, 0);

    for (int i = 0; i < 100; i++) {
        rel.applyDecay(100 + i);
    }
    EXPECT_GE(rel.getAffinity(100), 0);
}
