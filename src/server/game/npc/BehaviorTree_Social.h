#pragma once
#include "ExecuteDescriptor.h"
#include "../ecs/components/PositionComponent.h"
#include "../ecs/components/StatsComponent.h"
#include "../ecs/components/ResourcesComponent.h"
#include "../ecs/components/SocialComponent.h"
#include "../ecs/components/CultivationComponent.h"
#include "../ecs/components/RelationshipComponent.h"
#include "../ecs/components/PersonalityComponent.h"
#include "../ecs/components/MemoryRingComponent.h"
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
        if (pos->distanceTo(*tp) < 5.0f) {
            int8_t affinityChange = 2;
            rel->modifyAffinity(ts, affinityChange);
            rel->markInteraction(ts, ctx.currentTime);
            auto* social = ctx.getSocial();
            if (social) social->onSocialSuccess();
            auto* behavior = ctx.getBehavior();
            if (behavior) {
                int8_t score = (affinityChange >= 0) ? 3 : -5;
                behavior->reflection.recordResult(NPCActivity::VisitFriend, score);
            }
        }
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
            int8_t affinityChange = 3;
            rel->modifyAffinity(rel->spouseSlot, affinityChange);
            rel->markInteraction(rel->spouseSlot, ctx.currentTime);
            auto* social = ctx.getSocial();
            if (social) social->onSocialSuccess();
            auto* behavior = ctx.getBehavior();
            if (behavior) {
                int8_t score = (affinityChange >= 0) ? 3 : -5;
                behavior->reflection.recordResult(NPCActivity::Date, score);
            }
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
    int disciplesTaught = 0;
    for (size_t i = 0; i < reg.entityIds_.size(); ++i) {
        if (!reg.activeSlots_[i] || i == selfSlot) continue;
        auto* otherRel = reg.getComponent<RelationshipComponent>(reg.entityIds_[i]);
        if (otherRel && otherRel->mentorSlot == selfSlot) {
            auto* dc = reg.getComponent<CultivationComponent>(reg.entityIds_[i]);
            if (dc) dc->addProgress(0.5f * 0.016f);
            rel->markInteraction(static_cast<uint32_t>(i), ctx.currentTime);
            disciplesTaught++;
        }
    }
    auto* stats = ctx.getStats();
    if (stats) stats->mp = std::max(0, stats->mp - 5);
    auto* behavior = ctx.getBehavior();
    if (behavior) {
        int8_t score = (disciplesTaught > 0) ? 5 : -3;
        behavior->reflection.recordResult(NPCActivity::MentorTeach, score);
    }
}
static void exec_discipleAsk(ExecuteContext& ctx) {
    auto* rel = ctx.getRelationship();
    auto* cult = ctx.getCult();
    if (!cult) return;
    if (!rel || rel->mentorSlot == 0) { cult->addProgress(1.0f * 0.016f); return; }
    auto& reg = ctx.reg();
    auto* selfStats = ctx.getStats();
    int8_t score = -3;
    if (rel->mentorSlot < reg.entityIds_.size()) {
        auto* ms = reg.getComponent<StatsComponent>(reg.entityIds_[rel->mentorSlot]);
        if (ms && selfStats && static_cast<uint8_t>(ms->realm) >= static_cast<uint8_t>(selfStats->realm)) {
            cult->addProgress(1.5f * 0.016f);
            rel->markInteraction(rel->mentorSlot, ctx.currentTime);
            score = 5;
        }
    }
    if (score != 5) cult->addProgress(1.0f * 0.016f);
    auto* behavior = ctx.getBehavior();
    if (behavior) behavior->reflection.recordResult(NPCActivity::DiscipleAsk, score);
}
static void exec_trade(ExecuteContext& ctx) {
    auto* resources = ctx.getResources();
    auto* behavior = ctx.getBehavior();
    if (!resources || !behavior) return;
    int64_t tradeResult = exec_randRange(-20, 50);
    resources->addSpiritStones(tradeResult);
    int8_t score = (tradeResult > 0) ? 5 : (tradeResult == 0) ? 0 : -5;
    behavior->reflection.recordResult(NPCActivity::Trade, score);
    behavior->changeActivity(NPCActivity::Rest);
}
static void trySpreadRumor(ExecuteContext& ctx, uint32_t listenerSlot) {
    auto& reg = ctx.reg();

    uint32_t selfSlot = UINT32_MAX;
    for (size_t i = 0; i < reg.entityIds_.size(); ++i) {
        if (reg.entityIds_[i] == ctx.entityId) { selfSlot = static_cast<uint32_t>(i); break; }
    }
    if (selfSlot == UINT32_MAX) return;

    auto* myMemory = reg.getComponent<MemoryRingComponent>(ctx.entityId);
    auto* listenerMemory = reg.getComponent<MemoryRingComponent>(reg.entityIds_[listenerSlot]);
    auto* personality = reg.getComponent<PersonalityComponent>(ctx.entityId);

    if (!myMemory || !listenerMemory || !personality) return;

    if (personality->caution > 60.0f) return;

    WitnessedSlot witnessed[30];
    size_t n = myMemory->witnessed.getRecent(witnessed, 30);

    for (size_t i = 0; i < n && i < 3; i++) {
        if (witnessed[i].significance < 2) continue;

        if (listenerMemory->knowsRumor(witnessed[i].slot)) continue;

        if (exec_random01() < 0.4f) {
            RumorPacket rumor;
            rumor.timestamp = ctx.currentTime;
            rumor.originalEventSlot = witnessed[i].slot;
            rumor.originalWitness = selfSlot;
            rumor.contentIntegrity = 100;
            rumor.hopCount = 0;
            rumor.sensitivity = witnessed[i].significance;

            listenerMemory->receiveRumor(rumor, listenerSlot);

            auto* listenerSocial = reg.getComponent<SocialComponent>(reg.entityIds_[listenerSlot]);
            if (listenerSocial) listenerSocial->onSocialSuccess();
        }
    }
}

static void exec_gossip(ExecuteContext& ctx) {
    auto* social = ctx.getSocial();
    if (social) {
        social->onSocialize();
        social->onSocialSuccess();
        if (exec_random01() < 0.15f) {
            auto* personality = ctx.reg().getComponent<PersonalityComponent>(ctx.entityId);
            if (personality) social->onInsulted(personality->caution);
        }
    }

    auto& reg = ctx.reg();
    uint32_t selfSlot = UINT32_MAX;
    for (size_t i = 0; i < reg.entityIds_.size(); ++i) {
        if (reg.entityIds_[i] == ctx.entityId) { selfSlot = static_cast<uint32_t>(i); break; }
    }
    if (selfSlot == UINT32_MAX) return;

    size_t candidateCount = 0;
    uint32_t candidates[32];
    for (size_t i = 0; i < reg.entityIds_.size() && candidateCount < 32; ++i) {
        if (i != selfSlot && reg.activeSlots_[i]) {
            candidates[candidateCount++] = static_cast<uint32_t>(i);
        }
    }
    if (candidateCount == 0) return;

    uint32_t listenerSlot = candidates[exec_randRange(0, static_cast<int>(candidateCount) - 1)];
    trySpreadRumor(ctx, listenerSlot);
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
