#pragma once
#include "ExecuteDescriptor.h"
#include "../ecs/components/PositionComponent.h"
#include "../ecs/components/ResourcesComponent.h"
#include <algorithm>
#include <cmath>

static void exec_build(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    behavior->activityProgress += 0.05f;
    resources->spiritStones = std::max<int64_t>(0, resources->spiritStones - 5);
    if (behavior->activityProgress >= 1.0f) behavior->changeActivity(NPCActivity::Rest);
}
static void exec_mine(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* pos = ctx.getPosition();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    if (pos) pos->moveTo(pos->x + exec_randRange(-10,10), pos->y + exec_randRange(-10,10));
    float h = ctx.deltaTime / (1000.0f * 60.0f * 60.0f);
    resources->addSpiritStones(static_cast<int64_t>(15.0f * h));
    behavior->activityProgress += h * 0.02f;
    if (behavior->activityProgress >= 1.0f) behavior->changeActivity(NPCActivity::Rest);
}
static void exec_farm(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    float h = ctx.deltaTime / (1000.0f * 60.0f * 60.0f);
    behavior->activityProgress += h * 0.1f;
    if (behavior->activityProgress >= 1.0f) {
        resources->addSpiritStones(exec_randRange(20, 60));
        behavior->changeActivity(NPCActivity::Rest);
    }
}
static void exec_fish(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    float h = ctx.deltaTime / (1000.0f * 60.0f * 60.0f);
    resources->addSpiritStones(static_cast<int64_t>(10.0f * h));
    behavior->activityProgress += h * 0.03f;
    if (behavior->activityProgress >= 1.0f) behavior->changeActivity(NPCActivity::Rest);
}
static void exec_lumber(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* pos = ctx.getPosition();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    if (pos) pos->moveTo(pos->x + exec_randRange(-10,10), pos->y + exec_randRange(-10,10));
    float h = ctx.deltaTime / (1000.0f * 60.0f * 60.0f);
    resources->addSpiritStones(static_cast<int64_t>(8.0f * h));
}
static void exec_gather(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    if (!resources) return;
    float h = ctx.deltaTime / (1000.0f * 60.0f * 60.0f);
    resources->addSpiritStones(static_cast<int64_t>(5.0f * h));
}
static void exec_craft(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    resources->spiritStones = std::max<int64_t>(0, resources->spiritStones - 8);
    if (exec_random01() < 0.7f) resources->addSpiritStones(exec_randRange(30, 80));
    behavior->changeActivity(NPCActivity::Rest);
}
static void exec_refine(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    resources->spiritStones = std::max<int64_t>(0, resources->spiritStones - 10);
    if (exec_random01() < 0.5f) resources->addSpiritStones(exec_randRange(50, 120));
    behavior->changeActivity(NPCActivity::Rest);
}
static void exec_cook(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    resources->spiritStones = std::max<int64_t>(0, resources->spiritStones - 3);
    resources->addSpiritStones(exec_randRange(8, 25));
    behavior->changeActivity(NPCActivity::Rest);
}
static void exec_construct(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    behavior->activityProgress += 0.05f;
    resources->spiritStones = std::max<int64_t>(0, resources->spiritStones - 12);
    if (behavior->activityProgress >= 1.0f) behavior->changeActivity(NPCActivity::Rest);
}
static void exec_repair(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    resources->spiritStones = std::max<int64_t>(0, resources->spiritStones - 2);
    behavior->activityProgress += 0.1f;
    if (behavior->activityProgress >= 1.0f) behavior->changeActivity(NPCActivity::Rest);
}
static void exec_sell(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    resources->addSpiritStones(exec_randRange(10, 50));
    behavior->changeActivity(NPCActivity::Rest);
}
static void exec_buy(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    int64_t cost = exec_randRange(10, 100);
    if (resources->removeSpiritStones(cost)) resources->addSpiritStones(exec_randRange(0, 20));
    behavior->changeActivity(NPCActivity::Rest);
}

constexpr ExecuteDescriptor kProductionTable[] = {
    {NPCActivity::Build,     "Build",      ActivityCategory::Production, REQ_RESOURCES, exec_build},
    {NPCActivity::Mine,      "Mine",       ActivityCategory::Production, REQ_RESOURCES|REQ_POSITION, exec_mine},
    {NPCActivity::Farm,      "Farm",       ActivityCategory::Production, REQ_RESOURCES, exec_farm},
    {NPCActivity::Fish,      "Fish",       ActivityCategory::Production, REQ_RESOURCES, exec_fish},
    {NPCActivity::Lumber,    "Lumber",     ActivityCategory::Production, REQ_RESOURCES|REQ_POSITION, exec_lumber},
    {NPCActivity::Gather,    "Gather",     ActivityCategory::Production, REQ_RESOURCES, exec_gather},
    {NPCActivity::Craft,     "Craft",      ActivityCategory::Production, REQ_RESOURCES, exec_craft},
    {NPCActivity::Refine,    "Refine",     ActivityCategory::Production, REQ_RESOURCES, exec_refine},
    {NPCActivity::Cook,      "Cook",       ActivityCategory::Production, REQ_RESOURCES, exec_cook},
    {NPCActivity::Construct, "Construct",  ActivityCategory::Production, REQ_RESOURCES, exec_construct},
    {NPCActivity::Repair,    "Repair",     ActivityCategory::Production, REQ_RESOURCES, exec_repair},
    {NPCActivity::Sell,      "Sell",       ActivityCategory::Production, REQ_RESOURCES, exec_sell},
    {NPCActivity::Buy,       "Buy",        ActivityCategory::Production, REQ_RESOURCES, exec_buy},
};
