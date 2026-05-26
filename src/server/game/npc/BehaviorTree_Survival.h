#pragma once
#include "ExecuteDescriptor.h"
#include <algorithm>

static void exec_flee(ExecuteContext& ctx) {
    auto* pos = ctx.getPosition();
    auto* stats = ctx.getStats();
    if (pos) pos->x -= pos->speed * 1.5f * ctx.deltaTime / 1000.0f;
    if (stats) stats->hp = std::min(stats->maxHp, stats->hp + stats->maxHp / 20);
}
static void exec_heal(ExecuteContext& ctx) {
    auto* stats = ctx.getStats();
    if (!stats) return;
    int32_t hpR = stats->maxHp / 40;
    int32_t mpR = stats->maxMp / 20;
    stats->hp = std::min(stats->maxHp, stats->hp + hpR);
    stats->mp = std::min(stats->maxMp, stats->mp + mpR);
}
static void exec_defend(ExecuteContext& ctx) {
    auto* stats = ctx.getStats();
    if (!stats) return;
    int32_t r = static_cast<int32_t>(stats->maxHp * 0.01f);
    stats->hp = std::min(stats->maxHp, stats->hp + r);
}

constexpr ExecuteDescriptor kSurvivalTable[] = {
    {NPCActivity::Flee,   "Flee",   ActivityCategory::Survival, REQ_POSITION|REQ_STATS, exec_flee},
    {NPCActivity::Heal,   "Heal",   ActivityCategory::Survival, REQ_STATS,              exec_heal},
    {NPCActivity::Defend, "Defend", ActivityCategory::Survival, REQ_STATS,              exec_defend},
};
