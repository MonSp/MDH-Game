#include <gtest/gtest.h>
#include "../common/test_utils.h"
#include "../../src/server/game/ecs/components/RelationshipComponent.h"

class RelationshipComponentTest : public ::testing::Test {
protected:
    void SetUp() override {
        TestUtils::resetRegistry();
    }
};

TEST_F(RelationshipComponentTest, SetAffinityBounded) {
    RelationshipComponent comp;
    comp.setAffinity(10, 100);
    comp.modifyAffinity(10, 50);
    EXPECT_EQ(comp.getAffinity(10), 100);
    comp.setAffinity(10, -100);
    comp.modifyAffinity(10, -50);
    EXPECT_EQ(comp.getAffinity(10), -100);
}

TEST_F(RelationshipComponentTest, ModifyAffinityClamped) {
    RelationshipComponent comp;
    comp.setAffinity(10, 95);
    comp.modifyAffinity(10, 10);
    EXPECT_EQ(comp.getAffinity(10), 100);
    comp.setAffinity(10, -95);
    comp.modifyAffinity(10, -10);
    EXPECT_EQ(comp.getAffinity(10), -100);
}

TEST_F(RelationshipComponentTest, TopRelationshipsSorted) {
    RelationshipComponent comp;
    comp.setAffinity(1, -5);
    comp.setAffinity(2, 20);
    comp.setAffinity(3, -90);
    comp.setAffinity(4, 40);
    comp.setAffinity(5, 10);
    uint32_t outSlots[3];
    int8_t outAffinities[3];
    int count = comp.getTopRelationships(outSlots, outAffinities, 3);
    EXPECT_EQ(count, 3);
    EXPECT_EQ(std::abs(static_cast<int>(outAffinities[0])), 90);
    EXPECT_EQ(std::abs(static_cast<int>(outAffinities[1])), 40);
    EXPECT_EQ(std::abs(static_cast<int>(outAffinities[2])), 20);
}

TEST_F(RelationshipComponentTest, CapacityLimit) {
    RelationshipComponent comp;
    for (int i = 0; i < 60; i++) {
        comp.setAffinity(static_cast<uint32_t>(i), 10);
    }
    EXPECT_EQ(comp.relationCount, 50);
}

TEST_F(RelationshipComponentTest, HasDisciplesTrue) {
    auto idA = TestUtils::createTestNPC();
    auto idB = TestUtils::createTestNPC();
    auto& reg = ECS::Registry::getInstance();
    auto* compA = reg.getComponent<RelationshipComponent>(idA);
    auto* compB = reg.getComponent<RelationshipComponent>(idB);
    ASSERT_NE(compA, nullptr);
    ASSERT_NE(compB, nullptr);
    auto& allRels = reg.getArray_<RelationshipComponent>();
    uint32_t slotA = static_cast<uint32_t>(compA - &allRels[0]);
    compB->mentorSlot = slotA;
    EXPECT_TRUE(compA->hasDisciples());
}

TEST_F(RelationshipComponentTest, HasDisciplesFalse) {
    auto idA = TestUtils::createTestNPC();
    auto& reg = ECS::Registry::getInstance();
    auto* compA = reg.getComponent<RelationshipComponent>(idA);
    ASSERT_NE(compA, nullptr);
    EXPECT_FALSE(compA->hasDisciples());
}
