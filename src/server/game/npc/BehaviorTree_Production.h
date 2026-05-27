#pragma once
#include "ExecuteDescriptor.h"
#include "../ecs/components/PositionComponent.h"
#include "../ecs/components/ResourcesComponent.h"
#include "../economy/MarketRegistry.h"
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
        MarketRegistry::recordProduction(ctx.entityId, CommodityType::Food, exec_randRange(20, 60));
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
    MarketRegistry::recordConsumption(ctx.entityId, CommodityType::Ore, 5);
    if (exec_random01() < 0.7f) MarketRegistry::recordProduction(ctx.entityId, CommodityType::Equipment, 1);
    behavior->changeActivity(NPCActivity::Rest);
}
static void exec_refine(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    MarketRegistry::recordConsumption(ctx.entityId, CommodityType::Ore, 8);
    if (exec_random01() < 0.5f) MarketRegistry::recordProduction(ctx.entityId, CommodityType::Materials, 2);
    behavior->changeActivity(NPCActivity::Rest);
}
static void exec_cook(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    MarketRegistry::recordConsumption(ctx.entityId, CommodityType::Food, 2);
    MarketRegistry::recordProduction(ctx.entityId, CommodityType::Food, 1);
    behavior->changeActivity(NPCActivity::Rest);
}
static void exec_construct(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    behavior->activityProgress += 0.05f;
    MarketRegistry::recordConsumption(ctx.entityId, CommodityType::Materials, 6);
    MarketRegistry::recordConsumption(ctx.entityId, CommodityType::Ore, 6);
    if (behavior->activityProgress >= 1.0f) behavior->changeActivity(NPCActivity::Rest);
}
static void exec_repair(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    MarketRegistry::recordConsumption(ctx.entityId, CommodityType::Materials, 2);
    behavior->activityProgress += 0.1f;
    if (behavior->activityProgress >= 1.0f) behavior->changeActivity(NPCActivity::Rest);
}
static void exec_sell(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    MarketRegistry::recordConsumption(ctx.entityId, CommodityType::Equipment, 1);
    MarketRegistry::recordProduction(ctx.entityId, CommodityType::SpiritStones, exec_randRange(10, 50));
    behavior->changeActivity(NPCActivity::Rest);
}
static void exec_buy(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    int64_t cost = exec_randRange(10, 100);
    MarketRegistry::recordConsumption(ctx.entityId, CommodityType::SpiritStones, cost);
    MarketRegistry::recordProduction(ctx.entityId, CommodityType::Equipment, 1);
    behavior->changeActivity(NPCActivity::Rest);
}
static void exec_tailor(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    MarketRegistry::recordConsumption(ctx.entityId, CommodityType::Materials, 3);
    if (exec_random01() < 0.65f) MarketRegistry::recordProduction(ctx.entityId, CommodityType::Equipment, 1);
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
    MarketRegistry::recordConsumption(ctx.entityId, CommodityType::SpiritStones, static_cast<int64_t>(basePrice * 0.7f));
    float haggleRoll = exec_random01();
    int64_t finalPrice;
    if (haggleRoll < 0.3f) {
        finalPrice = static_cast<int64_t>(basePrice * 1.5f);
    } else if (haggleRoll < 0.7f) {
        finalPrice = basePrice;
    } else {
        finalPrice = static_cast<int64_t>(basePrice * 0.6f);
    }
    MarketRegistry::recordProduction(ctx.entityId, CommodityType::SpiritStones, finalPrice);
    float roll = exec_random01();
    int8_t score = (roll > 0.7f) ? 5 : (roll < 0.3f) ? -5 : 0;
    behavior->reflection.recordResult(NPCActivity::Bargain, score);
    behavior->changeActivity(NPCActivity::Rest);
}

constexpr ExecuteDescriptor kProductionTable[] = {
    {NPCActivity::Build,     "Build",      ActivityCategory::Production, REQ_RESOURCES, exec_build, nullptr},
    {NPCActivity::Mine,      "Mine",       ActivityCategory::Production, REQ_RESOURCES|REQ_POSITION, exec_mine, canExecute_mine},
    {NPCActivity::Farm,      "Farm",       ActivityCategory::Production, REQ_RESOURCES, exec_farm, canExecute_farm},
    {NPCActivity::Fish,      "Fish",       ActivityCategory::Production, REQ_RESOURCES, exec_fish, canExecute_fish},
    {NPCActivity::Lumber,    "Lumber",     ActivityCategory::Production, REQ_RESOURCES|REQ_POSITION, exec_lumber, canExecute_lumber},
    {NPCActivity::Gather,    "Gather",     ActivityCategory::Production, REQ_RESOURCES, exec_gather, canExecute_gather},
    {NPCActivity::Craft,     "Craft",      ActivityCategory::Production, REQ_RESOURCES, exec_craft, nullptr},
    {NPCActivity::Refine,    "Refine",     ActivityCategory::Production, REQ_RESOURCES, exec_refine, nullptr},
    {NPCActivity::Cook,      "Cook",       ActivityCategory::Production, REQ_RESOURCES, exec_cook, nullptr},
    {NPCActivity::Construct, "Construct",  ActivityCategory::Production, REQ_RESOURCES, exec_construct, nullptr},
    {NPCActivity::Repair,    "Repair",     ActivityCategory::Production, REQ_RESOURCES, exec_repair, nullptr},
    {NPCActivity::Sell,      "Sell",       ActivityCategory::Production, REQ_RESOURCES, exec_sell, nullptr},
    {NPCActivity::Buy,       "Buy",        ActivityCategory::Production, REQ_RESOURCES, exec_buy, nullptr},
    {NPCActivity::Tailor,    "Tailor",     ActivityCategory::Production, REQ_RESOURCES, exec_tailor, nullptr},
    {NPCActivity::Bargain,   "Bargain",    ActivityCategory::Production, REQ_RESOURCES, exec_bargain, nullptr},
};
