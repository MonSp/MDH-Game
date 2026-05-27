#pragma once
#include "ExecuteDescriptor.h"
#include "../ecs/components/PositionComponent.h"
#include "../ecs/components/ResourcesComponent.h"
#include "../economy/MarketRegistry.h"
#include "../economy/ItemRegistry.h"
#include <algorithm>
#include <cmath>

static bool canExecute_mine(ExecuteContext& ctx) {
    return true;
}
static bool canExecute_farm(ExecuteContext& ctx) {
    auto* pos = ctx.getPosition();
    if (!pos) return false;
    return true;
}
static bool canExecute_fish(ExecuteContext& ctx) {
    return true;
}
static bool canExecute_lumber(ExecuteContext& ctx) {
    return true;
}
static bool canExecute_gather(ExecuteContext& ctx) {
    return true;
}

static void exec_build(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    if (!resources->hasItem(ItemId::MATERIALS, 5)) {
        behavior->changeActivity(NPCActivity::Rest);
        return;
    }
    resources->removeItem(ItemId::MATERIALS, 5);
    behavior->activityProgress += 0.05f;
    MarketRegistry::recordConsumption(ctx.entityId, CommodityType::Materials, 5);
    if (behavior->activityProgress >= 1.0f) behavior->changeActivity(NPCActivity::Rest);
}
static void exec_mine(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* pos = ctx.getPosition();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    if (pos) pos->moveTo(pos->x + exec_randRange(-10,10), pos->y + exec_randRange(-10,10));
    float h = ctx.deltaTime / (1000.0f * 60.0f * 60.0f);
    behavior->activityProgress += h * 0.02f;
    if (behavior->activityProgress >= 1.0f) {
        MarketRegistry::recordProduction(ctx.entityId, CommodityType::Ore, 15);
        resources->addItem(ItemId::ORE, 15);
        float roll = exec_random01();
        int8_t score = (roll > 0.7f) ? 5 : (roll < 0.3f) ? -5 : 0;
        behavior->reflection.recordResult(NPCActivity::Mine, score);
        behavior->changeActivity(NPCActivity::Rest);
    }
}
static void exec_farm(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    float h = ctx.deltaTime / (1000.0f * 60.0f * 60.0f);
    behavior->activityProgress += h * 0.1f;
    if (behavior->activityProgress >= 1.0f) {
        int32_t farmAmount = exec_randRange(30, 60);
        MarketRegistry::recordProduction(ctx.entityId, CommodityType::Food, farmAmount);
        resources->addItem(ItemId::FOOD, farmAmount);
        float roll = exec_random01();
        int8_t score = (roll > 0.7f) ? 5 : (roll < 0.3f) ? -5 : 0;
        behavior->reflection.recordResult(NPCActivity::Farm, score);
        behavior->changeActivity(NPCActivity::Rest);
    }
}
static void exec_fish(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    float h = ctx.deltaTime / (1000.0f * 60.0f * 60.0f);
    behavior->activityProgress += h * 0.03f;
    if (behavior->activityProgress >= 1.0f) {
        MarketRegistry::recordProduction(ctx.entityId, CommodityType::Food, 10);
        resources->addItem(ItemId::FOOD, 10);
        float roll = exec_random01();
        int8_t score = (roll > 0.7f) ? 5 : (roll < 0.3f) ? -5 : 0;
        behavior->reflection.recordResult(NPCActivity::Fish, score);
        behavior->changeActivity(NPCActivity::Rest);
    }
}
static void exec_lumber(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* pos = ctx.getPosition();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    if (pos) pos->moveTo(pos->x + exec_randRange(-10,10), pos->y + exec_randRange(-10,10));
    float h = ctx.deltaTime / (1000.0f * 60.0f * 60.0f);
    behavior->activityProgress += h * 0.02f;
    if (behavior->activityProgress >= 1.0f) {
        MarketRegistry::recordProduction(ctx.entityId, CommodityType::Materials, 8);
        resources->addItem(ItemId::MATERIALS, 8);
        float roll = exec_random01();
        int8_t score = (roll > 0.7f) ? 5 : (roll < 0.3f) ? -5 : 0;
        behavior->reflection.recordResult(NPCActivity::Lumber, score);
        behavior->changeActivity(NPCActivity::Rest);
    }
}
static void exec_gather(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    float h = ctx.deltaTime / (1000.0f * 60.0f * 60.0f);
    behavior->activityProgress += h * 0.02f;
    if (behavior->activityProgress >= 1.0f) {
        MarketRegistry::recordProduction(ctx.entityId, CommodityType::Materials, 5);
        resources->addItem(ItemId::MATERIALS, 5);
        float roll = exec_random01();
        int8_t score = (roll > 0.7f) ? 5 : (roll < 0.3f) ? -5 : 0;
        behavior->reflection.recordResult(NPCActivity::Gather, score);
        behavior->changeActivity(NPCActivity::Rest);
    }
}
static void exec_craft(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    if (!resources->hasItem(ItemId::ORE, 5)) {
        behavior->changeActivity(NPCActivity::Rest);
        return;
    }
    resources->removeItem(ItemId::ORE, 5);
    MarketRegistry::recordConsumption(ctx.entityId, CommodityType::Ore, 5);
    if (exec_random01() < 0.7f) {
        MarketRegistry::recordProduction(ctx.entityId, CommodityType::Equipment, 1);
        resources->addItem(ItemId::EQUIPMENT, 1);
    }
    behavior->changeActivity(NPCActivity::Rest);
}
static void exec_refine(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    if (!resources->hasItem(ItemId::ORE, 8)) {
        behavior->changeActivity(NPCActivity::Rest);
        return;
    }
    resources->removeItem(ItemId::ORE, 8);
    MarketRegistry::recordConsumption(ctx.entityId, CommodityType::Ore, 8);
    if (exec_random01() < 0.5f) {
        MarketRegistry::recordProduction(ctx.entityId, CommodityType::Materials, 2);
        resources->addItem(ItemId::MATERIALS, 2);
    }
    behavior->changeActivity(NPCActivity::Rest);
}
static void exec_cook(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    if (!resources->hasItem(ItemId::FOOD, 2)) {
        behavior->changeActivity(NPCActivity::Rest);
        return;
    }
    resources->removeItem(ItemId::FOOD, 2);
    MarketRegistry::recordConsumption(ctx.entityId, CommodityType::Food, 2);
    int32_t cookAmount = exec_randRange(2, 3);
    MarketRegistry::recordProduction(ctx.entityId, CommodityType::Food, cookAmount);
    resources->addItem(ItemId::FOOD, cookAmount);
    behavior->changeActivity(NPCActivity::Rest);
}
static void exec_construct(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    if (!resources->hasItem(ItemId::MATERIALS, 6) || !resources->hasItem(ItemId::ORE, 6)) {
        behavior->changeActivity(NPCActivity::Rest);
        return;
    }
    resources->removeItem(ItemId::MATERIALS, 6);
    resources->removeItem(ItemId::ORE, 6);
    behavior->activityProgress += 0.05f;
    MarketRegistry::recordConsumption(ctx.entityId, CommodityType::Materials, 6);
    MarketRegistry::recordConsumption(ctx.entityId, CommodityType::Ore, 6);
    if (behavior->activityProgress >= 1.0f) behavior->changeActivity(NPCActivity::Rest);
}
static void exec_repair(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    if (!resources->hasItem(ItemId::MATERIALS, 2)) {
        behavior->changeActivity(NPCActivity::Rest);
        return;
    }
    resources->removeItem(ItemId::MATERIALS, 2);
    MarketRegistry::recordConsumption(ctx.entityId, CommodityType::Materials, 2);
    behavior->activityProgress += 0.1f;
    if (behavior->activityProgress >= 1.0f) behavior->changeActivity(NPCActivity::Rest);
}
static void exec_sell(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    if (!resources->hasItem(ItemId::EQUIPMENT, 1)) {
        behavior->changeActivity(NPCActivity::Rest);
        return;
    }
    resources->removeItem(ItemId::EQUIPMENT, 1);
    MarketRegistry::recordConsumption(ctx.entityId, CommodityType::Equipment, 1);
    resources->addSpiritStones(exec_randRange(10, 50));
    behavior->changeActivity(NPCActivity::Rest);
}
static void exec_buy(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    int64_t cost = exec_randRange(10, 100);
    if (!resources->removeSpiritStones(cost)) {
        behavior->changeActivity(NPCActivity::Rest);
        return;
    }
    MarketRegistry::recordConsumption(ctx.entityId, CommodityType::SpiritStones, cost);
    MarketRegistry::recordProduction(ctx.entityId, CommodityType::Equipment, 1);
    resources->addItem(ItemId::EQUIPMENT, 1);
    behavior->changeActivity(NPCActivity::Rest);
}
static void exec_tailor(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    if (!resources->hasItem(ItemId::MATERIALS, 3)) {
        behavior->changeActivity(NPCActivity::Rest);
        return;
    }
    resources->removeItem(ItemId::MATERIALS, 3);
    MarketRegistry::recordConsumption(ctx.entityId, CommodityType::Materials, 3);
    if (exec_random01() < 0.65f) {
        MarketRegistry::recordProduction(ctx.entityId, CommodityType::Equipment, 1);
        resources->addItem(ItemId::EQUIPMENT, 1);
    }
    float roll = exec_random01();
    int8_t score = (roll > 0.7f) ? 5 : (roll < 0.3f) ? -5 : 0;
    behavior->reflection.recordResult(NPCActivity::Tailor, score);
    behavior->changeActivity(NPCActivity::Rest);
}
static void exec_bargain(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    int64_t basePrice = exec_randRange(10, 50);
    int64_t cost = static_cast<int64_t>(basePrice * 0.7f);
    if (!resources->removeSpiritStones(cost)) {
        behavior->changeActivity(NPCActivity::Rest);
        return;
    }
    float haggleRoll = exec_random01();
    int64_t finalPrice;
    if (haggleRoll < 0.3f) {
        finalPrice = static_cast<int64_t>(basePrice * 1.5f);
    } else if (haggleRoll < 0.7f) {
        finalPrice = basePrice;
    } else {
        finalPrice = static_cast<int64_t>(basePrice * 0.6f);
    }
    resources->addSpiritStones(finalPrice);
    float roll = exec_random01();
    int8_t score = (roll > 0.7f) ? 5 : (roll < 0.3f) ? -5 : 0;
    behavior->reflection.recordResult(NPCActivity::Bargain, score);
    behavior->changeActivity(NPCActivity::Rest);
}
