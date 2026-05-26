#pragma once
#include "ExecuteDescriptor.h"
#include "../ecs/components/SocialComponent.h"
#include "../ecs/components/PersonalityComponent.h"
#include <algorithm>

static void exec_duel(ExecuteContext& ctx) {
    auto* stats = ctx.getStats();
    if (!stats) return;
    stats->mp = std::max(0, stats->mp - 2);
    if (exec_random01() < 0.3f) {
        int32_t dmg = stats->power / 10;
        stats->takeDamage(dmg);
        auto* social = ctx.reg().getComponent<SocialComponent>(ctx.entityId);
        auto* personality = ctx.reg().getComponent<PersonalityComponent>(ctx.entityId);
        if (social && personality) social->onAttacked(static_cast<float>(dmg), personality->caution);
    }
}
static void exec_hunt(ExecuteContext& ctx) {
    auto* pos = ctx.getPosition();
    auto* stats = ctx.getStats();
    if (!pos || !stats) return;
    pos->moveTo(pos->x + stats->power / 10, pos->y + stats->power / 10);
    if (exec_random01() < 0.1f) {
        int32_t dmg = stats->power / 20;
        stats->takeDamage(dmg);
        auto* social = ctx.reg().getComponent<SocialComponent>(ctx.entityId);
        auto* personality = ctx.reg().getComponent<PersonalityComponent>(ctx.entityId);
        if (social && personality) social->onAttacked(static_cast<float>(dmg), personality->caution);
    }
    if (exec_random01() < 0.05f) stats->hp = std::min(stats->maxHp, stats->hp + stats->maxHp / 30);
}
static void exec_ambush(ExecuteContext& ctx) {
    auto* stats = ctx.getStats();
    if (!stats) return;
    if (exec_random01() < 0.4f) {
        int32_t beforeHp = stats->hp;
        stats->hp = std::max(1, stats->hp / 2);
        int32_t dmg = beforeHp - stats->hp;
        auto* social = ctx.reg().getComponent<SocialComponent>(ctx.entityId);
        auto* personality = ctx.reg().getComponent<PersonalityComponent>(ctx.entityId);
        if (social && personality && dmg > 0) social->onAttacked(static_cast<float>(dmg), personality->caution);
    }
}
static void exec_assassinate(ExecuteContext& ctx) {
    auto* stats = ctx.getStats();
    if (!stats) return;
    stats->mp = std::max(0, stats->mp - 5);
    if (exec_random01() < 0.15f) {
        int32_t beforeHp = stats->hp;
        stats->hp = std::max(1, stats->hp / 3);
        int32_t dmg = beforeHp - stats->hp;
        auto* social = ctx.reg().getComponent<SocialComponent>(ctx.entityId);
        auto* personality = ctx.reg().getComponent<PersonalityComponent>(ctx.entityId);
        if (social && personality && dmg > 0) social->onAttacked(static_cast<float>(dmg), personality->caution);
    }
}
static void exec_attack(ExecuteContext& ctx) {
    auto* pos = ctx.getPosition();
    auto* stats = ctx.getStats();
    if (pos) pos->x += pos->speed * 0.5f * ctx.deltaTime / 1000.0f;
    if (stats) stats->mp = std::max(0, stats->mp - 1);
}
static void exec_defendPosition(ExecuteContext& ctx) {
    auto* stats = ctx.getStats();
    if (!stats) return;
    stats->hp = std::min(stats->maxHp, stats->hp + static_cast<int32_t>(stats->maxHp * 0.005f));
}
static void exec_patrol(ExecuteContext& ctx) {
    auto* pos = ctx.getPosition();
    auto* behavior = ctx.getBehavior();
    if (!pos || !behavior) return;
    float pts[4][2] = {{-50,-50},{50,-50},{50,50},{-50,50}};
    uint32_t i = behavior->activityStep % 4;
    pos->moveTo(pts[i][0] + exec_randRange(-20,20), pts[i][1] + exec_randRange(-20,20));
    if (pos->hasReachedTarget(10.0f)) behavior->activityStep++;
}
static void exec_escort(ExecuteContext& ctx) {
    auto* pos = ctx.getPosition();
    if (!pos) return;
    pos->x += pos->speed * 0.3f * ctx.deltaTime / 1000.0f;
}
static void exec_scout(ExecuteContext& ctx) {
    auto* pos = ctx.getPosition();
    if (!pos) return;
    if (pos->hasReachedTarget(5.0f)) pos->moveTo(pos->x + exec_randRange(-300,300), pos->y + exec_randRange(-300,300));
}

constexpr ExecuteDescriptor kCombatTable[] = {
    {NPCActivity::Duel,           "Duel",            ActivityCategory::Combat, REQ_STATS, exec_duel},
    {NPCActivity::Hunt,           "Hunt",            ActivityCategory::Combat, REQ_POSITION|REQ_STATS, exec_hunt},
    {NPCActivity::Ambush,         "Ambush",          ActivityCategory::Combat, REQ_STATS, exec_ambush},
    {NPCActivity::Assassinate,    "Assassinate",     ActivityCategory::Combat, REQ_STATS, exec_assassinate},
    {NPCActivity::Attack,         "Attack",          ActivityCategory::Combat, REQ_POSITION|REQ_STATS, exec_attack},
    {NPCActivity::DefendPosition, "DefendPosition",  ActivityCategory::Combat, REQ_STATS, exec_defendPosition},
    {NPCActivity::Patrol,         "Patrol",          ActivityCategory::Combat, REQ_POSITION, exec_patrol},
    {NPCActivity::Escort,         "Escort",          ActivityCategory::Combat, REQ_POSITION, exec_escort},
    {NPCActivity::Scout,          "Scout",           ActivityCategory::Combat, REQ_POSITION, exec_scout},
};
