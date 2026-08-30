#pragma once

#include "../../ecs/Registry.h"
#include "../../ecs/components/IdentityComponent.h"
#include "../../ecs/components/BehaviorComponent.h"
#include "../../ecs/components/BehaviorTreeComponent.h"
#include "../../ecs/components/SocialComponent.h"
#include "../../ecs/components/StatsComponent.h"
#include "../../ecs/components/CultivationComponent.h"
#include "../../ecs/components/LifecycleComponent.h"
#include "../../ecs/components/PersonalityComponent.h"
#include "../../ecs/components/RelationshipComponent.h"
#include "../../ecs/components/RoleCommandComponent.h"
#include "../../ecs/components/LLMComponent.h"
#include "../../ecs/components/ResourcesComponent.h"
#include "../../ecs/components/PositionComponent.h"
#include "../../bt/BTEvaluator.h"
#include "../../bt/BlackboardCache.h"
#include "../../spatial/SpatialIndexCache.h"
#include "../../job/ThreadPool.h"
#include "../../job/JobDispatcher.h"
#include "../../npc/BehaviorTreeSystem.h"
#include "../../npc/MovementSystem.h"
#include <vector>
#include <chrono>
#include <cmath>

struct LayerConfig {
    uint8_t layer;
    std::string name;
    float spiritMultiplier;
    float resourceMultiplier;
    int32_t npcPowerMin;
    int32_t npcPowerMax;
};

struct ActionRequest {
    uint32_t slot;
    uint8_t actionType;
    uint8_t prevActivity;
};

class NPChunkUpdateSystem {
public:
    static NPChunkUpdateSystem& getInstance() {
        static NPChunkUpdateSystem instance;
        return instance;
    }

    void initialize(ThreadPool* pool) {
        threadPool_ = pool;
        jobDispatcher_ = std::make_unique<JobDispatcher>(pool);
        threadCount_ = pool ? pool->getThreadCount() : 0;
        if (threadCount_ == 0) threadCount_ = 1;
        localRequests_.resize(threadCount_);
        for (auto& lr : localRequests_) lr.reserve(512);
    }

    void updateAllNPCs(float deltaTime, uint64_t currentTime) {
        auto& registry = ECS::Registry::getInstance();
        auto& activeSlots = registry.activeSlots_;
        size_t totalSlots = activeSlots.size();
        if (totalSlots == 0) return;

        frameCounter_++;

        SpatialIndexCache::getInstance().rebuild(
            activeSlots,
            registry.getArray_<PositionComponent>(),
            totalSlots);

        // Fast path: no thread pool — run single-threaded
        if (!threadPool_ || threadCount_ == 0) {
            float deltaHours = deltaTime / (1000.0f * 60.0f * 60.0f);
            for (auto& br : batchRequests_) br.clear();
            for (size_t slot = 0; slot < totalSlots; ++slot) {
                if (!activeSlots[slot]) continue;
                auto* lifecycle = &registry.getArray_<LifecycleComponent>()[slot];
                if (lifecycle->lifeState != NPCLifeState::Active) continue;
                auto* social = &registry.getArray_<SocialComponent>()[slot];
                social->tickDaily(deltaHours);
                auto* bt = &registry.getArray_<BehaviorTreeComponent>()[slot];
                auto* behavior = &registry.getArray_<BehaviorComponent>()[slot];
                auto& bb = registry.getArray_<BlackboardCache>()[slot];
                uint8_t curAct = static_cast<uint8_t>(behavior->currentActivity);
                uint16_t interval = BehaviorTreeComponent::evalIntervalForActivity(curAct);
                bt->updatePhase++;
                bt->evalInterval = interval;
                bool needEvaluate = ((bt->updatePhase % interval) == 0) || bb.isDirty();
                if (social->isHungry()) bb.set(BlackboardCache::IsHungry);
                if (social->isExhausted()) bb.set(BlackboardCache::IsExhausted);
                if (needEvaluate) {
                    uint8_t prev = static_cast<uint8_t>(behavior->currentActivity);
                    BehaviorTreeSystem::getInstance().evaluate(registry.entityIds_[slot], currentTime);
                    uint8_t newAct = static_cast<uint8_t>(behavior->currentActivity);
                    if (newAct != prev) bb.invalidate();
                    uint8_t bucket = newAct < MAX_ACTIVITY_BUCKETS ? newAct : MAX_ACTIVITY_BUCKETS - 1;
                    batchRequests_[bucket].push_back(static_cast<uint32_t>(slot));
                } else {
                    BehaviorTreeSystem::getInstance().execute(registry.entityIds_[slot], currentTime, deltaTime);
                }
                MovementSystem::getInstance().update(registry.entityIds_[slot], deltaTime);
            }
            for (size_t a = 0; a < MAX_ACTIVITY_BUCKETS; ++a) {
                if (batchRequests_[a].empty()) continue;
                batchExecute(registry, a, batchRequests_[a], deltaTime);
            }
            return;
        }

        size_t chunkSize = 1000;
        size_t totalChunks = (totalSlots + chunkSize - 1) / chunkSize;

        for (auto& br : batchRequests_) br.clear();
        for (size_t t = 0; t < threadCount_; ++t) {
            localRequests_[t].clear();
        }

        std::vector<std::shared_ptr<IJob>> jobs;
        jobs.reserve(totalChunks);

        for (size_t c = 0; c < totalChunks; ++c) {
            size_t start = c * chunkSize;
            size_t end = (start + chunkSize < totalSlots) ? start + chunkSize : totalSlots;

            auto job = jobDispatcher_->dispatch([this, start, end, deltaTime, currentTime,
                                                  totalSlots, &registry, &activeSlots,
                                                  chunkIdx = c, chunkEnd = end, chunkStart = start]() {
                size_t workerId = chunkIdx % threadCount_;
                float deltaHours = deltaTime / (1000.0f * 60.0f * 60.0f);
                auto& localReqs = localRequests_[workerId];

                for (size_t slot = chunkStart; slot < chunkEnd; ++slot) {
                    if (!activeSlots[slot]) continue;

                    auto* lifecycle = &registry.getArray_<LifecycleComponent>()[slot];
                    if (lifecycle->lifeState != NPCLifeState::Active) continue;

                    auto* social = &registry.getArray_<SocialComponent>()[slot];
                    social->tickDaily(deltaHours);

                    auto* bt = &registry.getArray_<BehaviorTreeComponent>()[slot];
                    auto* behavior = &registry.getArray_<BehaviorComponent>()[slot];
                    auto& bb = registry.getArray_<BlackboardCache>()[slot];

                    uint8_t curAct = static_cast<uint8_t>(behavior->currentActivity);
                    uint16_t interval = BehaviorTreeComponent::evalIntervalForActivity(curAct);
                    bt->updatePhase++;
                    bt->evalInterval = interval;

                    bool needEvaluate = ((bt->updatePhase % interval) == 0) || bb.isDirty();

                    if (social->isHungry()) bb.set(BlackboardCache::IsHungry);
                    if (social->isExhausted()) bb.set(BlackboardCache::IsExhausted);

                    if (needEvaluate) {
                        uint8_t prev = static_cast<uint8_t>(behavior->currentActivity);
                        BehaviorTreeSystem::getInstance().evaluate(
                            registry.entityIds_[slot], currentTime);

                        uint8_t newAct = static_cast<uint8_t>(behavior->currentActivity);
                        if (newAct != prev) bb.invalidate();

                        ActionRequest req;
                        req.slot = static_cast<uint32_t>(slot);
                        req.actionType = newAct;
                        req.prevActivity = prev;
                        localReqs.push_back(req);
                    } else {
                        BehaviorTreeSystem::getInstance().execute(
                            registry.entityIds_[slot], currentTime, deltaTime);
                    }

                    MovementSystem::getInstance().update(
                        registry.entityIds_[slot], deltaTime);
                }
            }, static_cast<uint32_t>(c % threadCount_));

            jobs.push_back(job);
        }

        jobDispatcher_->waitForAll(jobs);

        for (size_t t = 0; t < threadCount_; ++t) {
            for (auto& req : localRequests_[t]) {
                size_t bucket = (req.actionType < MAX_ACTIVITY_BUCKETS)
                    ? req.actionType : MAX_ACTIVITY_BUCKETS - 1;
                batchRequests_[bucket].push_back(req.slot);
            }
        }

        for (size_t a = 0; a < MAX_ACTIVITY_BUCKETS; ++a) {
            if (batchRequests_[a].empty()) continue;
            batchExecute(registry, a, batchRequests_[a], deltaTime);
        }
    }

private:
    NPChunkUpdateSystem() : frameCounter_(0), threadCount_(1) {
        for (auto& br : batchRequests_) br.reserve(512);
    }

    static constexpr size_t MAX_ACTIVITY_BUCKETS = 128;

    static bool isSimpleActivity(uint8_t act) {
        if (act == 30 || act == 33 || act == 51 || act == 52 ||
            act == 53 || act == 54 || act == 55) return true;
        return act >= 20 && act <= 23;
    }

    void batchExecute(ECS::Registry& registry, size_t activityBucket,
                      const std::vector<uint32_t>& slots, float deltaTime) {
        auto& positions = registry.getArray_<PositionComponent>();
        auto& statsArr = registry.getArray_<StatsComponent>();
        auto& behaviors = registry.getArray_<BehaviorComponent>();
        auto& socials = registry.getArray_<SocialComponent>();
        auto& cults = registry.getArray_<CultivationComponent>();
        auto& resources = registry.getArray_<ResourcesComponent>();
        auto& blackboards = registry.getArray_<BlackboardCache>();
        float hours = deltaTime / (1000.0f * 60.0f * 60.0f);

        for (uint32_t slot : slots) {
            auto* behavior = &behaviors[slot];
            uint8_t act = static_cast<uint8_t>(behavior->currentActivity);

            if (isSimpleActivity(act)) {
                batchExecuteSimple(slot, act, behavior, &statsArr[slot],
                                   &positions[slot], &socials[slot], &cults[slot],
                                   &resources[slot], hours, deltaTime);
                continue;
            }

            switch (act) {
                case 10: execFlee(&positions[slot], &statsArr[slot], deltaTime); break;
                case 11: execHeal(&statsArr[slot]); break;
                case 12: execDefend(&statsArr[slot]); break;
                case 25: if (socials[slot].wantsSocial()) socials[slot].onSocialize(); break;
                case 31: execBreakthrough(&cults[slot], &statsArr[slot], behavior); break;
                case 32: execTribulation(&cults[slot], &statsArr[slot], behavior); break;
                case 34: execAlchemy(&resources[slot], behavior); break;
                case 35: execSeekFortune(&positions[slot], deltaTime); break;
                case 40: case 41: break;
                case 42: case 43: case 44: break;
                case 45: case 46: break;
                case 50: execBuild(&resources[slot], behavior); break;
                case 56: execAttack(&positions[slot], &statsArr[slot], deltaTime); break;
                case 57: execDefendPosition(&statsArr[slot]); break;
                case 58: execPatrol(&positions[slot], behavior); break;
                case 59: execEscort(&positions[slot], deltaTime); break;
                case 60: execScout(&positions[slot], deltaTime); break;
                case 70: execCraft(&resources[slot], behavior); break;
                case 71: execRefine(&resources[slot], behavior); break;
                case 72: execCook(&resources[slot], behavior); break;
                case 74: execConstruct(&resources[slot], behavior); break;
                case 75: execRepair(&resources[slot], behavior); break;
                case 80: execSell(&resources[slot], behavior); break;
                case 81: execBuy(&resources[slot], behavior); break;
                case 90: execDuel(&statsArr[slot]); break;
                case 91: execHunt(&positions[slot], &statsArr[slot]); break;
                case 92: execAmbush(&statsArr[slot]); break;
                case 93: execAssassinate(&statsArr[slot]); break;
                case 100: execExplore(&positions[slot], deltaTime); break;
                case 101: execTreasureHunt(&positions[slot], deltaTime); break;
                case 102: execMapExplore(&positions[slot], deltaTime); break;
                default: break;
            }

            if (act == 10 || act == 11) {
                blackboards[slot].invalidate();
            }
        }
    }

    void batchExecuteSimple(uint32_t slot, uint8_t act,
                            BehaviorComponent* behavior, StatsComponent* stats,
                            PositionComponent* pos, SocialComponent* social,
                            CultivationComponent* cult, ResourcesComponent* resources,
                            float hours, float deltaTime) {
        switch (act) {
            case 20: {
                social->onEat();
                stats->hp = std::min(stats->maxHp, stats->hp + stats->maxHp / 50);
                behavior->changeActivity(NPCActivity::Rest);
                break;
            }
            case 21: {
                social->onRest(hours);
                int32_t hr = static_cast<int32_t>(stats->maxHp * hours * 0.05f);
                int32_t mr = static_cast<int32_t>(stats->maxMp * hours * 0.05f);
                stats->hp = std::min(stats->maxHp, stats->hp + hr);
                stats->mp = std::min(stats->maxMp, stats->mp + mr);
                break;
            }
            case 22: {
                social->onSleep();
                stats->hp = std::min(stats->maxHp, stats->hp + stats->maxHp / 10);
                stats->mp = std::min(stats->maxMp, stats->mp + stats->maxMp / 5);
                break;
            }
            case 23: {
                if (!pos || pos->hasReachedTarget(10.0f)) {
                    if (pos) pos->moveTo(pos->x + static_cast<float>(rand() % 200 - 100),
                                        pos->y + static_cast<float>(rand() % 200 - 100));
                }
                break;
            }
            case 30: {
                cult->addProgress(2.0f * hours);
                cult->bottleneckTimer += static_cast<uint32_t>(hours * 60.0f);
                break;
            }
            case 33: {
                cult->addProgress(1.0f * hours);
                int32_t mr = static_cast<int32_t>(stats->maxMp * hours * 0.1f);
                stats->mp = std::min(stats->maxMp, stats->mp + mr);
                break;
            }
            case 51: {
                resources->addSpiritStones(static_cast<int64_t>(15.0f * hours));
                behavior->activityProgress += hours * 0.02f;
                if (behavior->activityProgress >= 1.0f) {
                    behavior->changeActivity(NPCActivity::Rest);
                }
                break;
            }
            case 52: {
                behavior->activityProgress += hours * 0.1f;
                if (behavior->activityProgress >= 1.0f) {
                    resources->addSpiritStones(static_cast<int64_t>(rand() % 41 + 20));
                    behavior->changeActivity(NPCActivity::Rest);
                }
                break;
            }
            case 53: {
                resources->addSpiritStones(static_cast<int64_t>(10.0f * hours));
                behavior->activityProgress += hours * 0.03f;
                if (behavior->activityProgress >= 1.0f) {
                    behavior->changeActivity(NPCActivity::Rest);
                }
                break;
            }
            case 54: {
                resources->addSpiritStones(static_cast<int64_t>(8.0f * hours));
                break;
            }
            case 55: {
                resources->addSpiritStones(static_cast<int64_t>(5.0f * hours));
                break;
            }
            default: break;
        }
    }

    static float rand01() { return static_cast<float>(rand()) / static_cast<float>(RAND_MAX); }

    void execFlee(PositionComponent* pos, StatsComponent* stats, float dt) {
        if (pos) pos->x -= pos->speed * 1.5f * dt / 1000.0f;
        if (stats) stats->hp = std::min(stats->maxHp, stats->hp + stats->maxHp / 20);
    }
    void execHeal(StatsComponent* stats) {
        if (!stats) return;
        stats->hp = std::min(stats->maxHp, stats->hp + stats->maxHp / 40);
        stats->mp = std::min(stats->maxMp, stats->mp + stats->maxMp / 20);
    }
    void execDefend(StatsComponent* stats) {
        if (!stats) return;
        stats->hp = std::min(stats->maxHp, stats->hp + stats->maxHp / 100);
    }
    void execBreakthrough(CultivationComponent* cult, StatsComponent* stats, BehaviorComponent* b) {
        if (!cult || !stats) return;
        float chance = cult->getBreakthroughChance(stats->realm);
        if (rand01() < chance) {
            uint8_t c = static_cast<uint8_t>(stats->realm);
            if (c < 5) {
                stats->realm = static_cast<RealmLevel>(c + 1);
                stats->power = static_cast<int32_t>(stats->power * 1.5f);
                stats->maxHp = static_cast<int32_t>(stats->maxHp * 1.3f);
                stats->maxMp = static_cast<int32_t>(stats->maxMp * 1.4f);
                stats->hp = stats->maxHp; stats->mp = stats->maxMp;
            }
            cult->resetProgress(); cult->isBreakingThrough = false;
            if (b) b->changeActivity(NPCActivity::Rest);
        } else {
            stats->hp = stats->hp * 2 / 5;
            cult->isBreakingThrough = false;
            if (b) b->changeActivity(NPCActivity::Heal);
        }
    }
    void execTribulation(CultivationComponent* cult, StatsComponent* stats, BehaviorComponent* b) {
        if (!cult || !stats) return;
        cult->tribulationDamage += static_cast<uint32_t>(rand() % 41 + 10);
        stats->takeDamage(static_cast<int32_t>(cult->tribulationDamage));
        if (stats->isDead()) { if (b) b->changeActivity(NPCActivity::Dead); return; }
        if (--cult->tribulationTimer == 0) {
            uint8_t c = static_cast<uint8_t>(stats->realm);
            if (c < 5) { stats->realm = static_cast<RealmLevel>(c + 1); stats->power *= 2; }
            stats->hp = stats->maxHp; stats->mp = stats->maxMp;
            if (b) b->changeActivity(NPCActivity::Rest);
        }
    }
    void execAlchemy(ResourcesComponent* r, BehaviorComponent* b) {
        if (!r || !b) return;
        if (rand01() < 0.6f) r->spiritStones += static_cast<int64_t>(rand() % 151 + 50);
        b->changeActivity(NPCActivity::Rest);
    }
    void execSeekFortune(PositionComponent* p, float dt) {
        if (!p) return;
        if (p->hasReachedTarget(5.0f)) p->moveTo(p->x + rand()%1000-500, p->y + rand()%1000-500);
    }
    void execBuild(ResourcesComponent* r, BehaviorComponent* b) {
        if (!r || !b) return;
        b->activityProgress += 0.05f; r->spiritStones = std::max<int64_t>(0, r->spiritStones - 5);
        if (b->activityProgress >= 1.0f) b->changeActivity(NPCActivity::Rest);
    }
    void execAttack(PositionComponent* p, StatsComponent* s, float dt) {
        if (p) p->x += p->speed * 0.5f * dt / 1000.0f;
        if (s) s->mp = std::max(0, s->mp - 1);
    }
    void execDefendPosition(StatsComponent* s) {
        if (s) s->hp = std::min(s->maxHp, s->hp + s->maxHp / 200);
    }
    void execPatrol(PositionComponent* p, BehaviorComponent* b) {
        if (!p || !b) return;
        float pts[4][2] = {{-50,-50},{50,-50},{50,50},{-50,50}};
        uint32_t idx = b->activityStep % 4;
        p->moveTo(pts[idx][0]+rand()%40-20, pts[idx][1]+rand()%40-20);
        if (p->hasReachedTarget(10.0f)) b->activityStep++;
    }
    void execEscort(PositionComponent* p, float dt) {
        if (p) p->x += p->speed * 0.3f * dt / 1000.0f;
    }
    void execScout(PositionComponent* p, float dt) {
        if (!p) return;
        if (p->hasReachedTarget(5.0f)) p->moveTo(p->x + rand()%600-300, p->y + rand()%600-300);
    }
    void execCraft(ResourcesComponent* r, BehaviorComponent* b) {
        if (!r || !b) return;
        r->spiritStones = std::max<int64_t>(0, r->spiritStones - 8);
        if (rand01() < 0.7f) r->addSpiritStones(rand()%51+30);
        b->changeActivity(NPCActivity::Rest);
    }
    void execRefine(ResourcesComponent* r, BehaviorComponent* b) {
        if (!r || !b) return;
        r->spiritStones = std::max<int64_t>(0, r->spiritStones - 10);
        if (rand01() < 0.5f) r->addSpiritStones(rand()%71+50);
        b->changeActivity(NPCActivity::Rest);
    }
    void execCook(ResourcesComponent* r, BehaviorComponent* b) {
        if (!r || !b) return;
        r->spiritStones = std::max<int64_t>(0, r->spiritStones - 3);
        r->addSpiritStones(rand()%18+8);
        b->changeActivity(NPCActivity::Rest);
    }
    void execConstruct(ResourcesComponent* r, BehaviorComponent* b) {
        if (!r || !b) return;
        b->activityProgress += 0.05f; r->spiritStones = std::max<int64_t>(0, r->spiritStones - 12);
        if (b->activityProgress >= 1.0f) b->changeActivity(NPCActivity::Rest);
    }
    void execRepair(ResourcesComponent* r, BehaviorComponent* b) {
        if (!r || !b) return;
        r->spiritStones = std::max<int64_t>(0, r->spiritStones - 2);
        b->activityProgress += 0.1f;
        if (b->activityProgress >= 1.0f) b->changeActivity(NPCActivity::Rest);
    }
    void execSell(ResourcesComponent* r, BehaviorComponent* b) {
        if (!r || !b) return;
        r->addSpiritStones(rand()%41+10);
        b->changeActivity(NPCActivity::Rest);
    }
    void execBuy(ResourcesComponent* r, BehaviorComponent* b) {
        if (!r || !b) return;
        int64_t cost = rand()%91+10;
        if (r->removeSpiritStones(cost)) r->addSpiritStones(rand()%21);
        b->changeActivity(NPCActivity::Rest);
    }
    void execDuel(StatsComponent* s) {
        if (!s) return;
        s->mp = std::max(0, s->mp - 2);
        if (rand01() < 0.3f) s->takeDamage(s->power / 10);
    }
    void execHunt(PositionComponent* p, StatsComponent* s) {
        if (!p || !s) return;
        p->moveTo(p->x + s->power / 10, p->y + s->power / 10);
        if (rand01() < 0.1f) s->takeDamage(s->power / 20);
    }
    void execAmbush(StatsComponent* s) {
        if (!s) return;
        if (rand01() < 0.4f) s->hp = std::max(1, s->hp / 2);
    }
    void execAssassinate(StatsComponent* s) {
        if (!s) return;
        s->mp = std::max(0, s->mp - 5);
        if (rand01() < 0.15f) s->hp = std::max(1, s->hp / 3);
    }
    void execExplore(PositionComponent* p, float dt) {
        if (!p) return;
        if (p->hasReachedTarget(5.0f)) p->moveTo(p->x+rand()%1000-500, p->y+rand()%1000-500);
    }
    void execTreasureHunt(PositionComponent* p, float dt) {
        if (!p) return;
        if (p->hasReachedTarget(3.0f)) p->moveTo(p->x+rand()%400-200, p->y+rand()%400-200);
    }
    void execMapExplore(PositionComponent* p, float dt) {
        if (!p) return;
        if (p->hasReachedTarget(2.0f)) p->moveTo(p->x+rand()%2000-1000, p->y+rand()%2000-1000);
    }

    ThreadPool* threadPool_;
    std::unique_ptr<JobDispatcher> jobDispatcher_;
    uint16_t frameCounter_;
    size_t threadCount_;
    std::array<std::vector<uint32_t>, MAX_ACTIVITY_BUCKETS> batchRequests_;
    std::vector<std::vector<ActionRequest>> localRequests_;
};
