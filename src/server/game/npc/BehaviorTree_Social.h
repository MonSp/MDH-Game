#pragma once
#include "ExecuteDescriptor.h"
#include "../ecs/components/PositionComponent.h"
#include "../ecs/components/StatsComponent.h"
#include "../ecs/components/ResourcesComponent.h"
#include "../ecs/components/SocialComponent.h"
#include "../ecs/components/CultivationComponent.h"
#include "../ecs/components/RelationshipComponent.h"
#include <cmath>
#include <algorithm>
#include <climits>

static void exec_visitFriend(ExecuteContext& ctx) {
    auto* rel = ctx.getRelationship();
    auto* pos = ctx.getPosition();
    if (!rel || rel->relationCount == 0 || !pos) return;
    uint32_t ts = 0; int8_t ba = -128;
    for (uint8_t i = 0; i < rel->relationCount; ++i) {
        int8_t a = rel->relations[i].affinity;
        if (a > ba) { ba = a; ts = rel->relations[i].targetSlot; }
    }
    if (ts == 0) return;
    auto* tp = ctx.reg().getComponent<PositionComponent>(ctx.reg().entityIds_[ts]);
    if (tp) {
        pos->moveTo(tp->x, tp->y);
        if (pos->distanceTo(*tp) < 5.0f) rel->modifyAffinity(ts, 2);
    }
}
static void exec_date(ExecuteContext& ctx) {
    auto* rel = ctx.getRelationship();
    auto* pos = ctx.getPosition();
    if (!rel || rel->spouseSlot == 0 || !pos) return;
    auto* tp = ctx.reg().getComponent<PositionComponent>(ctx.reg().entityIds_[rel->spouseSlot]);
    if (tp) {
        pos->moveTo(tp->x, tp->y);
        if (pos->distanceTo(*tp) < 3.0f) {
            rel->modifyAffinity(rel->spouseSlot, 3);
        }
    }
}
static void exec_familyGathering(ExecuteContext& ctx) {
    auto* pos = ctx.getPosition();
    if (!pos) return;
    float gx = 0.0f, gy = 0.0f;
    float dx = gx - pos->x, dy = gy - pos->y;
    if (exec_fabs(dx) < 5.0f && exec_fabs(dy) < 5.0f) return;
    float spd = pos->speed * 0.3f * ctx.deltaTime / 1000.0f;
    float d = exec_sqrt(dx*dx + dy*dy);
    if (d > 0) { pos->x += dx/d*spd; pos->y += dy/d*spd; }
}
static void exec_mentorTeach(ExecuteContext& ctx) {
    auto* rel = ctx.getRelationship();
    if (!rel) return;
    auto& reg = ctx.reg();
    uint32_t selfSlot = UINT32_MAX;
    for (size_t i = 0; i < reg.entityIds_.size(); ++i) {
        if (reg.entityIds_[i] == ctx.entityId) { selfSlot = static_cast<uint32_t>(i); break; }
    }
    if (selfSlot == UINT32_MAX) return;
    for (size_t i = 0; i < reg.entityIds_.size(); ++i) {
        if (!reg.activeSlots_[i] || i == selfSlot) continue;
        auto* otherRel = reg.getComponent<RelationshipComponent>(reg.entityIds_[i]);
        if (otherRel && otherRel->mentorSlot == selfSlot) {
            auto* dc = reg.getComponent<CultivationComponent>(reg.entityIds_[i]);
            if (dc) dc->addProgress(0.5f * 0.016f);
        }
    }
    auto* stats = ctx.getStats();
    if (stats) stats->mp = std::max(0, stats->mp - 5);
}
static void exec_discipleAsk(ExecuteContext& ctx) {
    auto* rel = ctx.getRelationship();
    auto* cult = ctx.getCult();
    if (!cult) return;
    if (!rel || rel->mentorSlot == 0) { cult->addProgress(1.0f * 0.016f); return; }
    auto& reg = ctx.reg();
    auto* selfStats = ctx.getStats();
    if (rel->mentorSlot < reg.entityIds_.size()) {
        auto* ms = reg.getComponent<StatsComponent>(reg.entityIds_[rel->mentorSlot]);
        if (ms && selfStats && static_cast<uint8_t>(ms->realm) >= static_cast<uint8_t>(selfStats->realm)) {
            cult->addProgress(1.5f * 0.016f); return;
        }
    }
    cult->addProgress(1.0f * 0.016f);
}
static void exec_trade(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    resources->addSpiritStones(exec_randRange(-20, 50));
    behavior->changeActivity(NPCActivity::Rest);
}
static void exec_gossip(ExecuteContext& ctx) {
    auto* social = ctx.getSocial();
    if (social) social->onSocialize();
}
static void exec_reportTask(ExecuteContext& ctx) {
    auto* pos = ctx.getPosition();
    if (!pos) return;
    if (pos->x > 0) pos->x -= pos->speed * ctx.deltaTime / 1000.0f;
    else pos->x += pos->speed * ctx.deltaTime / 1000.0f;
    if (pos->y > 0) pos->y -= pos->speed * ctx.deltaTime / 1000.0f;
    else pos->y += pos->speed * ctx.deltaTime / 1000.0f;
}

constexpr ExecuteDescriptor kSocialTable[] = {
    {NPCActivity::VisitFriend,     "VisitFriend",     ActivityCategory::Social, REQ_POSITION|REQ_RELATIONSHIP,        exec_visitFriend},
    {NPCActivity::Date,            "Date",             ActivityCategory::Social, REQ_POSITION|REQ_RELATIONSHIP,        exec_date},
    {NPCActivity::FamilyGathering, "FamilyGathering",  ActivityCategory::Social, REQ_POSITION,                         exec_familyGathering},
    {NPCActivity::MentorTeach,     "MentorTeach",      ActivityCategory::Social, REQ_RELATIONSHIP,                     exec_mentorTeach},
    {NPCActivity::DiscipleAsk,     "DiscipleAsk",      ActivityCategory::Social, REQ_RELATIONSHIP|REQ_CULT,            exec_discipleAsk},
    {NPCActivity::Trade,           "Trade",            ActivityCategory::Social, REQ_RESOURCES,                        exec_trade},
    {NPCActivity::Gossip,          "Gossip",           ActivityCategory::Social, REQ_SOCIAL,                           exec_gossip},
    {NPCActivity::ReportTask,      "ReportTask",       ActivityCategory::Social, REQ_POSITION,                         exec_reportTask},
};
