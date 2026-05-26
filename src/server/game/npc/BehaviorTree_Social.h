#pragma once
#include "ExecuteDescriptor.h"
#include "../ecs/components/PositionComponent.h"
#include "../spatial/SpatialIndexCache.h"
#include "../ecs/components/StatsComponent.h"
#include "../ecs/components/ResourcesComponent.h"
#include "../ecs/components/SocialComponent.h"
#include "../ecs/components/CultivationComponent.h"
#include "../ecs/components/RelationshipComponent.h"
#include "../ecs/components/PersonalityComponent.h"
#include "../ecs/components/MemoryRingComponent.h"
#include "../ecs/components/IdentityComponent.h"
#include <cmath>
#include <algorithm>
#include <climits>

static uint32_t findSelfSlot(ECS::Registry& reg, ECS::EntityId entityId) {
    for (size_t i = 0; i < reg.entityIds_.size(); ++i) {
        if (reg.entityIds_[i] == entityId) return static_cast<uint32_t>(i);
    }
    return UINT32_MAX;
}

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

            auto& reg = ctx.reg();
            uint32_t selfSlot = findSelfSlot(reg, ctx.entityId);
            if (selfSlot != UINT32_MAX) {
                auto* myMemory = reg.getComponent<MemoryRingComponent>(ctx.entityId);
                auto* otherMemory = reg.getComponent<MemoryRingComponent>(reg.entityIds_[ts]);
                InteractionSlot slotMine;
                slotMine.timestamp = ctx.currentTime;
                slotMine.otherSlot = ts;
                slotMine.type = 0;
                slotMine.impactScore = 2;
                if (myMemory) myMemory->interactions.push(slotMine);
                InteractionSlot slotOther;
                slotOther.timestamp = ctx.currentTime;
                slotOther.otherSlot = selfSlot;
                slotOther.type = 0;
                slotOther.impactScore = 2;
                if (otherMemory) otherMemory->interactions.push(slotOther);
            }

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

            auto& reg = ctx.reg();
            uint32_t selfSlot = findSelfSlot(reg, ctx.entityId);
            if (selfSlot != UINT32_MAX) {
                auto* myMemory = reg.getComponent<MemoryRingComponent>(ctx.entityId);
                auto* otherMemory = reg.getComponent<MemoryRingComponent>(reg.entityIds_[rel->spouseSlot]);
                InteractionSlot slotMine;
                slotMine.timestamp = ctx.currentTime;
                slotMine.otherSlot = rel->spouseSlot;
                slotMine.type = 0;
                slotMine.impactScore = 3;
                if (myMemory) myMemory->interactions.push(slotMine);
                InteractionSlot slotOther;
                slotOther.timestamp = ctx.currentTime;
                slotOther.otherSlot = selfSlot;
                slotOther.type = 0;
                slotOther.impactScore = 3;
                if (otherMemory) otherMemory->interactions.push(slotOther);
            }

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
    uint32_t selfSlot = findSelfSlot(reg, ctx.entityId);
    if (selfSlot == UINT32_MAX) return;
    int disciplesTaught = 0;
    for (size_t i = 0; i < reg.entityIds_.size(); ++i) {
        if (!reg.activeSlots_[i] || i == selfSlot) continue;
        auto* otherRel = reg.getComponent<RelationshipComponent>(reg.entityIds_[i]);
        if (otherRel && otherRel->mentorSlot == selfSlot) {
            auto* dc = reg.getComponent<CultivationComponent>(reg.entityIds_[i]);
            if (dc) dc->addProgress(0.5f * 0.016f);
            rel->markInteraction(static_cast<uint32_t>(i), ctx.currentTime);

            auto* myMemory = reg.getComponent<MemoryRingComponent>(ctx.entityId);
            auto* otherMemory = reg.getComponent<MemoryRingComponent>(reg.entityIds_[i]);
            InteractionSlot slotMine;
            slotMine.timestamp = ctx.currentTime;
            slotMine.otherSlot = static_cast<uint32_t>(i);
            slotMine.type = 0;
            slotMine.impactScore = 5;
            if (myMemory) myMemory->interactions.push(slotMine);
            InteractionSlot slotOther;
            slotOther.timestamp = ctx.currentTime;
            slotOther.otherSlot = selfSlot;
            slotOther.type = 0;
            slotOther.impactScore = 5;
            if (otherMemory) otherMemory->interactions.push(slotOther);

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

            uint32_t selfSlot = findSelfSlot(reg, ctx.entityId);
            if (selfSlot != UINT32_MAX) {
                auto* myMemory = reg.getComponent<MemoryRingComponent>(ctx.entityId);
                auto* otherMemory = reg.getComponent<MemoryRingComponent>(reg.entityIds_[rel->mentorSlot]);
                InteractionSlot slotMine;
                slotMine.timestamp = ctx.currentTime;
                slotMine.otherSlot = rel->mentorSlot;
                slotMine.type = 0;
                slotMine.impactScore = 5;
                if (myMemory) myMemory->interactions.push(slotMine);
                InteractionSlot slotOther;
                slotOther.timestamp = ctx.currentTime;
                slotOther.otherSlot = selfSlot;
                slotOther.type = 0;
                slotOther.impactScore = 5;
                if (otherMemory) otherMemory->interactions.push(slotOther);
            }

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
static void tryEmotionalContagion(ExecuteContext& ctx, uint32_t listenerSlot) {
    auto& reg = ctx.reg();
    auto* listenerSocial = reg.getComponent<SocialComponent>(reg.entityIds_[listenerSlot]);
    if (!listenerSocial) return;

    auto* selfPos = ECS::Registry::getInstance().getComponent<PositionComponent>(ctx.entityId);
    auto* listenerPos = ECS::Registry::getInstance().getComponent<PositionComponent>(reg.entityIds_[listenerSlot]);
    if (!selfPos || !listenerPos) return;

    int nearbyCount = 0;
    int highFearCount = 0;
    int highAngerCount = 0;
    int highJoyCount = 0;

    float centerX = (selfPos->x + listenerPos->x) * 0.5f;
    float centerY = (selfPos->y + listenerPos->y) * 0.5f;
    const float RADIUS_SQ = 200.0f * 200.0f;

    auto processEntity = [&](uint32_t i) {
        if (!reg.activeSlots_[i]) return;
        auto* pos = reg.getComponent<PositionComponent>(reg.entityIds_[i]);
        if (!pos) return;
        float dx = pos->x - centerX;
        float dy = pos->y - centerY;
        if (dx * dx + dy * dy > RADIUS_SQ) return;

        nearbyCount++;
        auto* soc = reg.getComponent<SocialComponent>(reg.entityIds_[i]);
        if (soc) {
            if (soc->fear >= SocialComponent::HIGH_FEAR_THRESHOLD) highFearCount++;
            if (soc->anger >= SocialComponent::HIGH_ANGER_THRESHOLD) highAngerCount++;
            if (soc->joy >= SocialComponent::HIGH_JOY_THRESHOLD) highJoyCount++;
        }
    };

    auto& spatialIdx = SpatialIndexCache::getInstance();
    auto neighbors = spatialIdx.queryNeighbors(centerX, centerY, 200.0f);
    if (!neighbors.empty()) {
        for (uint32_t i : neighbors) {
            processEntity(i);
        }
    } else {
        for (size_t i = 0; i < reg.entityIds_.size(); i++) {
            processEntity(static_cast<uint32_t>(i));
        }
    }

    if (nearbyCount < 3) return;

    float fearRatio = static_cast<float>(highFearCount) / static_cast<float>(nearbyCount);
    float angerRatio = static_cast<float>(highAngerCount) / static_cast<float>(nearbyCount);
    float joyRatio = static_cast<float>(highJoyCount) / static_cast<float>(nearbyCount);

    if (highFearCount >= SocialComponent::GROUP_EMOTION_ABSOLUTE_MIN && fearRatio > 0.3f)
        listenerSocial->addFear(15.0f * fearRatio);
    if (highAngerCount >= SocialComponent::GROUP_EMOTION_ABSOLUTE_MIN && angerRatio > 0.3f)
        listenerSocial->addAnger(10.0f * angerRatio);
    if (highJoyCount >= SocialComponent::GROUP_EMOTION_ABSOLUTE_MIN && joyRatio > 0.3f)
        listenerSocial->addJoy(10.0f * joyRatio);
}

static void trySpreadRumor(ExecuteContext& ctx, uint32_t listenerSlot) {
    auto& reg = ctx.reg();

    uint32_t selfSlot = findSelfSlot(reg, ctx.entityId);
    if (selfSlot == UINT32_MAX) return;

    auto* myMemory = reg.getComponent<MemoryRingComponent>(ctx.entityId);
    auto* listenerMemory = reg.getComponent<MemoryRingComponent>(reg.entityIds_[listenerSlot]);
    auto* personality = reg.getComponent<PersonalityComponent>(ctx.entityId);
    auto* myRel = reg.getComponent<RelationshipComponent>(ctx.entityId);

    if (!myMemory || !listenerMemory || !personality) return;

    if (personality->caution > 60.0f) return;

    WitnessedSlot witnessed[30];
    size_t n = myMemory->witnessed.getRecent(witnessed, 30);

    struct Candidate {
        WitnessedSlot event;
        float priority;
    };
    Candidate candidates[30];
    size_t candCount = 0;

    for (size_t i = 0; i < n; i++) {
        if (witnessed[i].significance < 2) continue;

        if (listenerMemory->knowsRumor(witnessed[i].slot)) continue;

        uint8_t adjustedSig = witnessed[i].significance;
        uint64_t age = ctx.currentTime - witnessed[i].timestamp;
        if (age > 600) continue;
        if (age > 300) adjustedSig = (adjustedSig < 10) ? adjustedSig + 1 : 10;

        float intimacyFactor = 1.0f;
        if (myRel) {
            int8_t aff = myRel->getAffinity(witnessed[i].slot);
            if (aff > 50 || aff < -50) intimacyFactor = 1.5f;
        }

        float priority = static_cast<float>(adjustedSig) * intimacyFactor;
        candidates[candCount].event = witnessed[i];
        candidates[candCount].priority = priority;
        candCount++;
        if (candCount >= 30) break;
    }

    if (candCount == 0) return;

    for (size_t i = 0; i < candCount - 1; i++) {
        for (size_t j = i + 1; j < candCount; j++) {
            if (candidates[j].priority > candidates[i].priority ||
                (candidates[j].priority == candidates[i].priority &&
                 candidates[j].event.timestamp < candidates[i].event.timestamp)) {
                Candidate tmp = candidates[i];
                candidates[i] = candidates[j];
                candidates[j] = tmp;
            }
        }
    }

    RumorPacket rumor;
    rumor.timestamp = ctx.currentTime;
    rumor.originalEventSlot = candidates[0].event.slot;
    rumor.originalWitness = selfSlot;
    rumor.contentIntegrity = 100;
    rumor.hopCount = 0;
    rumor.sensitivity = candidates[0].event.significance;
    rumor.severity = MemoryRingComponent::significanceToSeverity(
        candidates[0].event.significance);
    rumor.queuedSinceFrame = ctx.currentTime;

    listenerMemory->receiveRumor(rumor, listenerSlot);

    auto* listenerSocial = reg.getComponent<SocialComponent>(reg.entityIds_[listenerSlot]);
    if (listenerSocial) listenerSocial->onSocialSuccess();
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
    uint32_t selfSlot = findSelfSlot(reg, ctx.entityId);
    if (selfSlot == UINT32_MAX) return;

    auto* selfPos = ctx.getPosition();
    size_t candidateCount = 0;
    uint32_t candidates[32];

    if (selfPos) {
        auto& spatialIdx = SpatialIndexCache::getInstance();
        auto neighbors = spatialIdx.queryNeighbors(selfPos->x, selfPos->y, 200.0f);

        for (uint32_t neighborSlot : neighbors) {
            if (candidateCount >= 32) break;
            if (neighborSlot != selfSlot && reg.activeSlots_[neighborSlot]) {
                auto* npos = reg.getComponent<PositionComponent>(reg.entityIds_[neighborSlot]);
                if (npos) {
                    float dx = npos->x - selfPos->x;
                    float dy = npos->y - selfPos->y;
                    if (dx * dx + dy * dy <= 200.0f * 200.0f) {
                        candidates[candidateCount++] = neighborSlot;
                    }
                }
            }
        }
    }

    if (candidateCount == 0) {
        for (size_t i = 0; i < reg.entityIds_.size() && candidateCount < 32; ++i) {
            if (i != selfSlot && reg.activeSlots_[i]) {
                candidates[candidateCount++] = static_cast<uint32_t>(i);
            }
        }
    }
    if (candidateCount == 0) return;

    uint32_t listenerSlot = candidates[exec_randRange(0, static_cast<int>(candidateCount) - 1)];
    trySpreadRumor(ctx, listenerSlot);
    tryEmotionalContagion(ctx, listenerSlot);

    auto* myMemory = reg.getComponent<MemoryRingComponent>(ctx.entityId);
    auto* otherMemory = reg.getComponent<MemoryRingComponent>(reg.entityIds_[listenerSlot]);
    InteractionSlot slotMine;
    slotMine.timestamp = ctx.currentTime;
    slotMine.otherSlot = listenerSlot;
    slotMine.type = 0;
    slotMine.impactScore = 1;
    if (myMemory) myMemory->interactions.push(slotMine);
    InteractionSlot slotOther;
    slotOther.timestamp = ctx.currentTime;
    slotOther.otherSlot = selfSlot;
    slotOther.type = 0;
    slotOther.impactScore = 1;
    if (otherMemory) otherMemory->interactions.push(slotOther);
}
static void exec_reportTask(ExecuteContext& ctx) {
    auto* pos = ctx.getPosition();
    if (!pos) return;
    if (pos->x > 0) pos->x -= pos->speed * ctx.deltaTime / 1000.0f;
    else pos->x += pos->speed * ctx.deltaTime / 1000.0f;
    if (pos->y > 0) pos->y -= pos->speed * ctx.deltaTime / 1000.0f;
    else pos->y += pos->speed * ctx.deltaTime / 1000.0f;
}

static void exec_socialHelp(ExecuteContext& ctx) {
    auto* rel = ctx.getRelationship();
    auto* pos = ctx.getPosition();
    auto* behavior = ctx.getBehavior();
    if (!rel || !pos || !behavior) return;

    auto& reg = ctx.reg();
    uint32_t selfSlot = findSelfSlot(reg, ctx.entityId);
    if (selfSlot == UINT32_MAX) return;

    uint32_t helpTargetSlot = 0;

    if (rel->mentorSlot != 0 && rel->mentorSlot < reg.entityIds_.size() &&
        reg.activeSlots_[rel->mentorSlot]) {
        helpTargetSlot = rel->mentorSlot;
    }

    if (helpTargetSlot == 0) {
        int8_t bestAffinity = 60;
        for (uint8_t i = 0; i < rel->relationCount; i++) {
            if (rel->relations[i].affinity > bestAffinity &&
                rel->relations[i].targetSlot < reg.entityIds_.size() &&
                reg.activeSlots_[rel->relations[i].targetSlot]) {
                bestAffinity = rel->relations[i].affinity;
                helpTargetSlot = rel->relations[i].targetSlot;
            }
        }
    }

    if (helpTargetSlot == 0) {
        auto* identity = ctx.getIdentity();
        if (identity && identity->factionCareerHeritage != 0) {
            for (size_t i = 0; i < reg.entityIds_.size(); i++) {
                if (!reg.activeSlots_[i] || i == selfSlot) continue;
                auto* otherIdent = reg.getComponent<IdentityComponent>(reg.entityIds_[i]);
                if (otherIdent && (otherIdent->role == NPCRole::Elder ||
                    otherIdent->role == NPCRole::FamilyHead)) {
                    auto* otherPos = reg.getComponent<PositionComponent>(reg.entityIds_[i]);
                    if (otherPos) {
                        float dx = otherPos->x - pos->x;
                        float dy = otherPos->y - pos->y;
                        if (dx * dx + dy * dy < 200.0f * 200.0f) {
                            helpTargetSlot = static_cast<uint32_t>(i);
                            break;
                        }
                    }
                }
            }
        }
    }

    if (helpTargetSlot == 0) return;

    auto* tp = reg.getComponent<PositionComponent>(reg.entityIds_[helpTargetSlot]);
    if (!tp) return;

    pos->moveTo(tp->x, tp->y);

    behavior->activityProgress += 0.1f;

    if (pos->distanceTo(*tp) < 5.0f && behavior->activityProgress >= 1.0f) {
        NPCActivity recommendedActivity = NPCActivity::Rest;

        if (helpTargetSlot == rel->mentorSlot) {
            auto* mentorBehavior = reg.getComponent<BehaviorComponent>(reg.entityIds_[helpTargetSlot]);
            if (mentorBehavior) {
                NPCActivity mentorAct = mentorBehavior->currentActivity;
                uint16_t mentorCareerTags = getActivityTagBundle(mentorAct).careerTags;

                auto* myIdentity = ctx.getIdentity();
                float bestBaseline = 0.0f;
                NPCActivity candidateActs[] = {
                    NPCActivity::Mine, NPCActivity::Farm, NPCActivity::Fish,
                    NPCActivity::Lumber, NPCActivity::Gather, NPCActivity::Craft,
                    NPCActivity::Refine, NPCActivity::Cook, NPCActivity::Hunt,
                    NPCActivity::Cultivate, NPCActivity::Meditate, NPCActivity::Alchemy,
                    NPCActivity::Trade, NPCActivity::Patrol, NPCActivity::Explore,
                };
                constexpr int nCands = sizeof(candidateActs) / sizeof(candidateActs[0]);
                for (int i = 0; i < nCands; i++) {
                    uint16_t candCareer = getActivityTagBundle(candidateActs[i]).careerTags;
                    if (candCareer & mentorCareerTags) {
                        float bw = myIdentity ?
                            RoleBaselineWeights::getRoleBaselineWeight(candidateActs[i], myIdentity) : 1.0f;
                        if (bw > bestBaseline) {
                            bestBaseline = bw;
                            recommendedActivity = candidateActs[i];
                        }
                    }
                }
                if (bestBaseline == 0.0f) {
                    recommendedActivity = mentorAct;
                }
            }
        } else {
            auto* friendBehavior = reg.getComponent<BehaviorComponent>(reg.entityIds_[helpTargetSlot]);
            if (friendBehavior) {
                recommendedActivity = friendBehavior->currentActivity;
                if (recommendedActivity == NPCActivity::Idle ||
                    recommendedActivity == NPCActivity::Rest ||
                    recommendedActivity == NPCActivity::Walk) {
                    recommendedActivity = NPCActivity::Mine;
                }
            }
        }

        if (helpTargetSlot != rel->mentorSlot &&
            !(helpTargetSlot != 0 && rel->getAffinity(helpTargetSlot) > 60)) {
            auto* myIdentity = ctx.getIdentity();
            if (myIdentity && myIdentity->factionCareerHeritage != 0 &&
                recommendedActivity == NPCActivity::Rest) {
                float bestBaseline = 0.0f;
                NPCActivity candidateActs[] = {
                    NPCActivity::Mine, NPCActivity::Farm, NPCActivity::Fish,
                    NPCActivity::Lumber, NPCActivity::Gather, NPCActivity::Craft,
                    NPCActivity::Refine, NPCActivity::Cook, NPCActivity::Hunt,
                    NPCActivity::Cultivate, NPCActivity::Meditate, NPCActivity::Alchemy,
                    NPCActivity::Trade, NPCActivity::Patrol, NPCActivity::Explore,
                };
                constexpr int nCands = sizeof(candidateActs) / sizeof(candidateActs[0]);
                for (int i = 0; i < nCands; i++) {
                    uint16_t candCareer = getActivityTagBundle(candidateActs[i]).careerTags;
                    if (candCareer & myIdentity->factionCareerHeritage) {
                        float bw = RoleBaselineWeights::getRoleBaselineWeight(candidateActs[i], myIdentity);
                        if (bw > bestBaseline) {
                            bestBaseline = bw;
                            recommendedActivity = candidateActs[i];
                        }
                    }
                }
                if (bestBaseline == 0.0f) {
                    recommendedActivity = NPCActivity::Mine;
                }
            }
        }

        auto& ref = behavior->reflection;
        ref.microPlanActivity = recommendedActivity;
        ref.microPlanTriggered = 1;
        ref.setTemporaryBoost(recommendedActivity, 0.3f, ctx.currentTime + 300);

        rel->modifyAffinity(helpTargetSlot, 5);
        rel->markInteraction(helpTargetSlot, ctx.currentTime);

        auto* myMemory = reg.getComponent<MemoryRingComponent>(ctx.entityId);
        auto* otherMemory = reg.getComponent<MemoryRingComponent>(reg.entityIds_[helpTargetSlot]);
        InteractionSlot slotMine;
        slotMine.timestamp = ctx.currentTime;
        slotMine.otherSlot = helpTargetSlot;
        slotMine.type = 0;
        slotMine.impactScore = 3;
        if (myMemory) myMemory->interactions.push(slotMine);
        InteractionSlot slotOther;
        slotOther.timestamp = ctx.currentTime;
        slotOther.otherSlot = selfSlot;
        slotOther.type = 0;
        slotOther.impactScore = 3;
        if (otherMemory) otherMemory->interactions.push(slotOther);

        auto* social = ctx.getSocial();
        if (social) {
            social->onSocialSuccess();
        }

        behavior->reflection.recordResult(NPCActivity::SocialHelp, 5);

        behavior->changeActivity(recommendedActivity);
    }
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
    {NPCActivity::SocialHelp,      "SocialHelp",       ActivityCategory::Social, REQ_POSITION|REQ_RELATIONSHIP,         exec_socialHelp},
};
