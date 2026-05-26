#pragma once
#include "ExecuteDescriptor.h"
#include <algorithm>

static void exec_eat(ExecuteContext& ctx) {
    auto* social = ctx.getSocial();
    auto* stats = ctx.getStats();
    if (social) social->onEat();
    if (stats) stats->hp = std::min(stats->maxHp, stats->hp + stats->maxHp / 50);
}
static void exec_rest(ExecuteContext& ctx) {
    auto* social = ctx.getSocial();
    auto* stats = ctx.getStats();
    float hours = ctx.deltaTime / (1000.0f * 60.0f * 60.0f);
    if (social) social->onRest(hours);
    if (stats) {
        stats->hp = std::min(stats->maxHp, stats->hp + static_cast<int32_t>(stats->maxHp * hours * 0.05f));
        stats->mp = std::min(stats->maxMp, stats->mp + static_cast<int32_t>(stats->maxMp * hours * 0.05f));
    }
}
static void exec_sleep(ExecuteContext& ctx) {
    auto* social = ctx.getSocial();
    auto* stats = ctx.getStats();
    if (social) social->onSleep();
    if (stats) {
        stats->hp = std::min(stats->maxHp, stats->hp + stats->maxHp / 10);
        stats->mp = std::min(stats->maxMp, stats->mp + stats->maxMp / 5);
    }
}
static void exec_walk(ExecuteContext& ctx) {
    auto* pos = ctx.getPosition();
    if (!pos || pos->hasReachedTarget(10.0f)) {
        if (pos) pos->moveTo(pos->x + exec_randRange(-100, 100), pos->y + exec_randRange(-100, 100));
    }
}
static void exec_awaitOrders(ExecuteContext& ctx) {
    auto* stats = ctx.getStats();
    if (stats) stats->hp = std::min(stats->maxHp, stats->hp + stats->maxHp / 60);
}

constexpr ExecuteDescriptor kDailyTable[] = {
    {NPCActivity::Eat,         "Eat",          ActivityCategory::Daily, REQ_SOCIAL|REQ_STATS, exec_eat},
    {NPCActivity::Rest,        "Rest",         ActivityCategory::Daily, REQ_SOCIAL|REQ_STATS, exec_rest},
    {NPCActivity::Sleep,       "Sleep",        ActivityCategory::Daily, REQ_SOCIAL|REQ_STATS, exec_sleep},
    {NPCActivity::Walk,        "Walk",         ActivityCategory::Daily, REQ_POSITION,         exec_walk},
    {NPCActivity::AwaitOrders, "AwaitOrders",  ActivityCategory::Daily, REQ_STATS,            exec_awaitOrders},
};
