#pragma once
#include "ExecuteDescriptor.h"
#include "../ecs/components/StatsComponent.h"
#include <algorithm>

static void exec_cultivate(ExecuteContext& ctx) {
    auto* cult = ctx.getCult();
    if (!cult) return;
    float hours = ctx.deltaTime / (1000.0f * 60.0f * 60.0f);
    cult->addProgress(2.0f * hours);
    cult->bottleneckTimer += static_cast<uint32_t>(hours * 60.0f);
}
static void exec_breakthrough(ExecuteContext& ctx) {
    auto* cult = ctx.getCult();
    auto* stats = ctx.getStats();
    auto* behavior = ctx.getBehavior();
    if (!cult || !stats || !behavior) return;
    float chance = cult->getBreakthroughChance(stats->realm);
    if (exec_random01() < chance) {
        uint8_t cur = static_cast<uint8_t>(stats->realm);
        if (cur < static_cast<uint8_t>(RealmLevel::Transcension)) {
            stats->realm = static_cast<RealmLevel>(cur + 1);
            stats->power = static_cast<int32_t>(stats->power * 1.5f);
            stats->maxHp = static_cast<int32_t>(stats->maxHp * 1.3f);
            stats->maxMp = static_cast<int32_t>(stats->maxMp * 1.4f);
            stats->hp = stats->maxHp;
            stats->mp = stats->maxMp;
        }
        cult->resetProgress();
        cult->isBreakingThrough = false;
        behavior->changeActivity(NPCActivity::Rest);
    } else {
        stats->hp = static_cast<int32_t>(stats->hp * 0.4f);
        cult->isBreakingThrough = false;
        behavior->changeActivity(NPCActivity::Heal);
    }
}
static void exec_tribulation(ExecuteContext& ctx) {
    auto* cult = ctx.getCult();
    auto* stats = ctx.getStats();
    auto* behavior = ctx.getBehavior();
    if (!cult || !stats || !behavior) return;
    cult->tribulationDamage += exec_randRange(10, 50);
    stats->takeDamage(cult->tribulationDamage);
    if (stats->isDead()) { behavior->changeActivity(NPCActivity::Dead); return; }
    cult->tribulationTimer--;
    if (cult->tribulationTimer == 0) {
        uint8_t cur = static_cast<uint8_t>(stats->realm);
        if (cur < static_cast<uint8_t>(RealmLevel::Transcension)) {
            stats->realm = static_cast<RealmLevel>(cur + 1);
            stats->power = static_cast<int32_t>(stats->power * 2.0f);
            stats->hp = stats->maxHp;
            stats->mp = stats->maxMp;
        }
        behavior->changeActivity(NPCActivity::Rest);
    }
}
static void exec_meditate(ExecuteContext& ctx) {
    auto* cult = ctx.getCult();
    auto* stats = ctx.getStats();
    if (!cult || !stats) return;
    float hours = ctx.deltaTime / (1000.0f * 60.0f * 60.0f);
    cult->addProgress(1.0f * hours);
    stats->mp = std::min(stats->maxMp, stats->mp + static_cast<int32_t>(stats->maxMp * hours * 0.1f));
}
static void exec_alchemy(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    if (exec_random01() < 0.6f) resources->spiritStones += exec_randRange(50, 200);
    behavior->changeActivity(NPCActivity::Rest);
}
static void exec_seekFortune(ExecuteContext& ctx) {
    auto* pos = ctx.getPosition();
    if (!pos) return;
    if (pos->hasReachedTarget(5.0f)) pos->moveTo(pos->x + exec_randRange(-500,500), pos->y + exec_randRange(-500,500));
}

constexpr ExecuteDescriptor kCultivationTable[] = {
    {NPCActivity::Cultivate,    "Cultivate",    ActivityCategory::Cultivation, REQ_CULT,                              exec_cultivate},
    {NPCActivity::Breakthrough, "Breakthrough", ActivityCategory::Cultivation, REQ_CULT|REQ_STATS,                    exec_breakthrough},
    {NPCActivity::Tribulation,  "Tribulation",  ActivityCategory::Cultivation, REQ_CULT|REQ_STATS,                    exec_tribulation},
    {NPCActivity::Meditate,     "Meditate",     ActivityCategory::Cultivation, REQ_CULT|REQ_STATS,                    exec_meditate},
    {NPCActivity::Alchemy,      "Alchemy",      ActivityCategory::Cultivation, REQ_RESOURCES,                         exec_alchemy},
    {NPCActivity::SeekFortune,  "SeekFortune",  ActivityCategory::Cultivation, REQ_POSITION,                          exec_seekFortune},
};
