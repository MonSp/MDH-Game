#pragma once

#include "../ecs/Registry.h"
#include "../ecs/components/PositionComponent.h"
#include "../ecs/components/StatsComponent.h"
#include "../ecs/components/BehaviorComponent.h"
#include "../ecs/components/PersonalityComponent.h"
#include "../ecs/components/IdentityComponent.h"
#include "../ecs/components/LifecycleComponent.h"
#include "../ecs/components/ResourcesComponent.h"
#include "../ecs/components/SocialComponent.h"
#include "../ecs/components/BehaviorTreeComponent.h"
#include "../bt/BehaviorTreeTemplate.h"
#include "../economy/NationEconomyProfile.h"
#include "../economy/MarketRegistry.h"
#include "../ecs/components/CultivationComponent.h"
#include "../ecs/components/RelationshipComponent.h"
#include "../ecs/components/SkillTreeComponent.h"
#include "../ecs/components/CareerComponent.h"
#include "../ecs/components/EvolutionComponent.h"
#include "../skills/SkillMapper.h"
#include "../world/WorldGenerator.h"
#include <string>
#include <vector>
#include <random>
#include <unordered_map>
#include <algorithm>
#include <ctime>
#include <iostream>

class NPCCreationSystem {
public:
    static NPCCreationSystem& getInstance() {
        static NPCCreationSystem instance;
        return instance;
    }

    ECS::EntityId createNPC(const std::string& id, const std::string& name,
                           const std::string& clanId, const std::string& nation,
                           NPCRole role, RealmLevel realm, uint8_t layer,
                           float x, float y) {
        auto& registry = ECS::Registry::getInstance();
        ECS::Entity entity = registry.createEntity();
        ECS::EntityId entityId = entity.getId();

        auto* identity = new IdentityComponent(id, name, clanId, nation, role, layer);
        auto* position = new PositionComponent(x, y, 100.0f);
        auto* stats = createStatsForRealm(realm, layer);
        auto* behavior = new BehaviorComponent();
        auto* personality = createPersonalityByNation(nation, role);
        auto* lifecycle = new LifecycleComponent();
        lifecycle->birthTime = static_cast<uint64_t>(time(nullptr));
        lifecycle->age = 16.0f;
        auto* resources = new ResourcesComponent();
        resources->spiritStones = 100;
        auto* social = new SocialComponent();
        social->homeX = x;
        social->homeY = y;

        registry.addComponent<IdentityComponent>(entityId, *identity);
        registry.addComponent<PositionComponent>(entityId, *position);
        registry.addComponent<StatsComponent>(entityId, *stats);
        registry.addComponent<BehaviorComponent>(entityId, *behavior);
        registry.addComponent<PersonalityComponent>(entityId, *personality);
        registry.addComponent<LifecycleComponent>(entityId, *lifecycle);
        registry.addComponent<ResourcesComponent>(entityId, *resources);
        registry.addComponent<SocialComponent>(entityId, *social);

        // Mount generic agent-kernel components
        SkillTreeComponent skillTree;
        SkillMapper::populateSkills(skillTree, role, realm);
        registry.addComponent<SkillTreeComponent>(entityId, skillTree);

        CareerComponent career;
        SkillMapper::initializeCareer(career, realm);
        registry.addComponent<CareerComponent>(entityId, career);

        registry.addComponent<EvolutionComponent>(entityId, EvolutionComponent());

        delete identity;
        delete position;
        delete stats;
        delete behavior;
        delete personality;
        delete lifecycle;
        delete resources;
        delete social;

        auto* bt = registry.getComponent<BehaviorTreeComponent>(entityId);
        if (bt) {
            bt->tmpl = BehaviorTreePresets::getTemplateForRole(static_cast<uint8_t>(role));
        }

        return entityId;
    }

    void destroyNPC(ECS::EntityId entityId) {
        ECS::Registry::getInstance().destroyEntity(entityId);
    }

    ECS::EntityId createBatchNPCs(size_t count, uint8_t layer) {
        std::random_device rd;
        std::mt19937 gen(rd());
        std::uniform_real_distribution<float> xDist(-500.0f, 500.0f);
        std::uniform_real_distribution<float> yDist(-500.0f, 500.0f);

        std::vector<std::string> nations = {"Qin", "Chu", "Qi", "Yan", "Zhao", "Wei", "Han"};
        std::vector<NPCRole> roles = {NPCRole::BranchDisciple, NPCRole::InnerDisciple,
                                      NPCRole::CoreDisciple, NPCRole::Elder, NPCRole::FamilyHead};

        ECS::EntityId lastCreated = 0;

        for (size_t i = 0; i < count; ++i) {
            std::string id = "npc_" + std::to_string(layer) + "_" + std::to_string(i);
            std::string name = "NPC_" + std::to_string(i);
            std::string nation = nations[i % nations.size()];
            NPCRole role = roles[i % roles.size()];
            RealmLevel realm = RealmLevel::Mortal;

            lastCreated = createNPC(id, name, "clan_0", nation, role, realm, layer,
                                   xDist(gen), yDist(gen));
        }

        return lastCreated;
    }

    void createFamilyNPCs(const WorldGen::ClanInfo& clan, const NationEconomyProfile& profile, uint8_t layer) {
        struct FamilyNPCConfig {
            NPCRole role;
            int count;
            RealmLevel minRealm;
            RealmLevel maxRealm;
        };

        static const FamilyNPCConfig templates[] = {
            {NPCRole::FamilyHead, 1, RealmLevel::GoldenCore, RealmLevel::YuanInfant},
            {NPCRole::Elder, 2, RealmLevel::FoundationBuilding, RealmLevel::GoldenCore},
            {NPCRole::LawEnforcementElder, 1, RealmLevel::FoundationBuilding, RealmLevel::GoldenCore},
            {NPCRole::CoreDisciple, 3, RealmLevel::QiRefining, RealmLevel::FoundationBuilding},
            {NPCRole::InnerDisciple, 8, RealmLevel::QiRefining, RealmLevel::QiRefining},
            {NPCRole::BranchDisciple, 15, RealmLevel::Mortal, RealmLevel::QiRefining},
        };

        std::vector<ECS::EntityId> familyMembers;

        for (const auto& cfg : templates) {
            for (int i = 0; i < cfg.count; ++i) {
                std::string roleStr = roleToString(cfg.role);
                std::string id = clan.id + "_" + roleStr + "_" + std::to_string(i);
                std::string name = generateChineseName();

                int minR = static_cast<int>(cfg.minRealm);
                int maxR = static_cast<int>(cfg.maxRealm);
                std::uniform_int_distribution<int> realmDist(minR, maxR);
                RealmLevel realm = static_cast<RealmLevel>(realmDist(rng_));

                float radius;
                if (cfg.role == NPCRole::FamilyHead) radius = 2.0f;
                else if (cfg.role == NPCRole::Elder) radius = 4.0f;
                else radius = static_cast<float>(clan.territory) * 1.5f;

                std::normal_distribution<float> posDist(0.0f, radius);
                float x = std::clamp(static_cast<float>(clan.centerX) + posDist(rng_), -500.0f, 500.0f);
                float y = std::clamp(static_cast<float>(clan.centerY) + posDist(rng_), -500.0f, 500.0f);

                ECS::EntityId eid = createNPCForFamily(id, name, clan, clan.country, cfg.role, realm, layer, x, y, profile);
                familyMembers.push_back(eid);
            }
        }

        initializeFamilyRelations(familyMembers);

        auto& pool = MarketRegistry::getInstance().getOrCreatePool(clan.id);
        float demandRatios[6];
        for (int i = 0; i < 6; i++) {
            demandRatios[i] = profile.supplyBias[i];
        }
        pool.initWithProfile(static_cast<float>(clan.treasury) * 0.1f, demandRatios);

        float rate = MarketRegistry::getInstance().getClanTaxRate(clan.id);
        if (rate > 0.0f) {
            int64_t amount = static_cast<int64_t>(static_cast<double>(clan.treasury) / rate);
            MarketRegistry::getInstance().collectTax(clan.id, amount);
        }
    }

    size_t getNPCCount() const {
        return ECS::Registry::getInstance().getEntitiesWithComponent<IdentityComponent>().size();
    }

private:
    NPCCreationSystem() : rng_(static_cast<unsigned>(std::time(nullptr))) {}

    StatsComponent* createStatsForRealm(RealmLevel realm, uint8_t layer) {
        int32_t basePower = 100;
        switch (realm) {
            case RealmLevel::Mortal:             basePower = 100; break;
            case RealmLevel::QiRefining:         basePower = 300; break;
            case RealmLevel::FoundationBuilding: basePower = 800; break;
            case RealmLevel::GoldenCore:         basePower = 2000; break;
            case RealmLevel::YuanInfant:         basePower = 5000; break;
            case RealmLevel::Transcension:       basePower = 12000; break;
        }
        basePower += static_cast<int32_t>(layer) * 50;
        basePower = static_cast<int32_t>(basePower * (0.9f + (rng_() % 20) / 100.0f));
        int32_t baseHp = basePower * 10;
        int32_t baseMp = basePower * 5;
        return new StatsComponent(basePower, baseHp, baseMp, realm);
    }

    PersonalityComponent* createPersonalityByNation(const std::string& nation, NPCRole role) {
        struct NationMeans {
            float amb, cau, loy, gre, soc, dil;
        };

        static const std::unordered_map<std::string, NationMeans> nationMeans = {
            {"Qin", {65, 45, 65, 45, 55, 65}},
            {"Chu", {45, 65, 50, 50, 65, 40}},
            {"Qi",  {55, 55, 50, 50, 65, 55}},
            {"Yan", {45, 65, 55, 40, 40, 60}},
            {"Zhao",{55, 45, 50, 55, 50, 50}},
            {"Wei", {50, 50, 65, 45, 50, 55}},
            {"Han", {50, 55, 50, 60, 55, 45}},
        };

        auto it = nationMeans.find(nation);
        float amb = 50.0f, cau = 50.0f, loy = 50.0f, gre = 50.0f, soc = 50.0f, dil = 50.0f;
        if (it != nationMeans.end()) {
            amb = it->second.amb;
            cau = it->second.cau;
            loy = it->second.loy;
            gre = it->second.gre;
            soc = it->second.soc;
            dil = it->second.dil;
        }

        switch (role) {
            case NPCRole::FamilyHead:
                amb += 10; loy += 10; cau += 5;
                break;
            case NPCRole::Elder:
                cau += 10; loy += 10; dil += 5;
                break;
            case NPCRole::LawEnforcementElder:
                cau += 10; loy += 10; dil += 5;
                break;
            case NPCRole::CoreDisciple:
                amb += 10; dil += 10;
                break;
            case NPCRole::InnerDisciple:
                amb += 5; dil += 5;
                break;
            case NPCRole::BranchDisciple:
                gre += 10; loy -= 5;
                break;
            default:
                break;
        }

        std::normal_distribution<float> noise(0.0f, 15.0f);
        amb += noise(rng_);
        cau += noise(rng_);
        loy += noise(rng_);
        gre += noise(rng_);
        soc += noise(rng_);
        dil += noise(rng_);

        amb = std::clamp(amb, 5.0f, 95.0f);
        cau = std::clamp(cau, 5.0f, 95.0f);
        loy = std::clamp(loy, 5.0f, 95.0f);
        gre = std::clamp(gre, 5.0f, 95.0f);
        soc = std::clamp(soc, 5.0f, 95.0f);
        dil = std::clamp(dil, 5.0f, 95.0f);

        return new PersonalityComponent(amb, cau, loy, gre, soc, dil);
    }

    ECS::EntityId createNPCForFamily(const std::string& id, const std::string& name,
                                      const WorldGen::ClanInfo& clan, const std::string& nation,
                                      NPCRole role, RealmLevel realm, uint8_t layer,
                                      float x, float y, const NationEconomyProfile& profile) {
        auto& registry = ECS::Registry::getInstance();
        ECS::Entity entity = registry.createEntity();
        ECS::EntityId entityId = entity.getId();

        auto* identity = new IdentityComponent(id, name, clan.id, nation, role, layer);
        identity->factionCareerHeritage = assignFactionCareerHeritage(nation, role);
        auto* position = new PositionComponent(x, y, 100.0f);
        auto* stats = createStatsForRealm(realm, layer);
        auto* behavior = new BehaviorComponent();
        auto* personality = createPersonalityByNation(nationChineseToEnglish(nation), role);
        auto* lifecycle = new LifecycleComponent();
        lifecycle->birthTime = static_cast<uint64_t>(time(nullptr));
        lifecycle->age = 16.0f;
        auto* resources = new ResourcesComponent();

        int baseStones;
        switch (role) {
            case NPCRole::FamilyHead: baseStones = 500; break;
            case NPCRole::Elder: baseStones = 300; break;
            case NPCRole::LawEnforcementElder: baseStones = 300; break;
            case NPCRole::CoreDisciple: baseStones = 200; break;
            case NPCRole::InnerDisciple: baseStones = 150; break;
            case NPCRole::BranchDisciple: baseStones = 100; break;
            default: baseStones = 100; break;
        }
        float econMul = getEconomyMultiplier(clan.treasury, 50000LL * clan.heavenLevel);
        resources->spiritStones = static_cast<int64_t>(baseStones * econMul);

        auto* social = new SocialComponent();
        social->homeX = x;
        social->homeY = y;

        auto* cultivation = new CultivationComponent();
        initCultivationForRealm(cultivation, realm);

        registry.addComponent<IdentityComponent>(entityId, *identity);
        registry.addComponent<PositionComponent>(entityId, *position);
        registry.addComponent<StatsComponent>(entityId, *stats);
        registry.addComponent<BehaviorComponent>(entityId, *behavior);
        registry.addComponent<PersonalityComponent>(entityId, *personality);
        registry.addComponent<LifecycleComponent>(entityId, *lifecycle);
        registry.addComponent<ResourcesComponent>(entityId, *resources);
        registry.addComponent<SocialComponent>(entityId, *social);
        registry.addComponent<CultivationComponent>(entityId, *cultivation);

        // Mount generic agent-kernel components
        SkillTreeComponent skillTree;
        SkillMapper::populateSkills(skillTree, role, realm);
        registry.addComponent<SkillTreeComponent>(entityId, skillTree);

        CareerComponent career;
        SkillMapper::initializeCareer(career, realm);
        registry.addComponent<CareerComponent>(entityId, career);

        registry.addComponent<EvolutionComponent>(entityId, EvolutionComponent());

        delete identity;
        delete position;
        delete stats;
        delete behavior;
        delete personality;
        delete lifecycle;
        delete resources;
        delete social;
        delete cultivation;

        auto* bt = registry.getComponent<BehaviorTreeComponent>(entityId);
        if (bt) {
            bt->tmpl = BehaviorTreePresets::getTemplateForRole(static_cast<uint8_t>(role));
        }

        ensureNPCDrive(entityId);

        return entityId;
    }

    uint16_t assignFactionCareerHeritage(const std::string& nation, NPCRole role) {
        uint16_t heritage;
        if (nation == "秦") heritage = static_cast<uint16_t>(CareerTag::Miner) | static_cast<uint16_t>(CareerTag::Smith) | static_cast<uint16_t>(CareerTag::Soldier);
        else if (nation == "楚") heritage = static_cast<uint16_t>(CareerTag::Cultivator) | static_cast<uint16_t>(CareerTag::Farmer) | static_cast<uint16_t>(CareerTag::Hunter);
        else if (nation == "齐") heritage = static_cast<uint16_t>(CareerTag::Merchant) | static_cast<uint16_t>(CareerTag::Farmer) | static_cast<uint16_t>(CareerTag::Hunter);
        else if (nation == "燕") heritage = static_cast<uint16_t>(CareerTag::Soldier) | static_cast<uint16_t>(CareerTag::Miner);
        else if (nation == "赵") heritage = static_cast<uint16_t>(CareerTag::Farmer) | static_cast<uint16_t>(CareerTag::Soldier) | static_cast<uint16_t>(CareerTag::Fisher);
        else if (nation == "魏") heritage = static_cast<uint16_t>(CareerTag::Smith) | static_cast<uint16_t>(CareerTag::Merchant) | static_cast<uint16_t>(CareerTag::Farmer);
        else if (nation == "韩") heritage = static_cast<uint16_t>(CareerTag::Merchant) | static_cast<uint16_t>(CareerTag::Cultivator) | static_cast<uint16_t>(CareerTag::Hunter);
        else heritage = 0;

        if (role == NPCRole::BranchDisciple) {
            uint16_t branchMask = static_cast<uint16_t>(CareerTag::Miner)
                                | static_cast<uint16_t>(CareerTag::Fisher)
                                | static_cast<uint16_t>(CareerTag::Farmer)
                                | static_cast<uint16_t>(CareerTag::Hunter);
            heritage &= branchMask;
        }

        return heritage;
    }

    void initCultivationForRealm(CultivationComponent* cult, RealmLevel realm) {
        switch (realm) {
            case RealmLevel::Mortal:
                cult->cultivationProgress = 0.0f;
                break;
            case RealmLevel::QiRefining:
                cult->cultivationProgress = std::uniform_real_distribution<float>(0.0f, 400.0f)(rng_);
                break;
            case RealmLevel::FoundationBuilding:
                cult->cultivationProgress = std::uniform_real_distribution<float>(200.0f, 600.0f)(rng_);
                break;
            case RealmLevel::GoldenCore:
                cult->cultivationProgress = std::uniform_real_distribution<float>(300.0f, 800.0f)(rng_);
                break;
            case RealmLevel::YuanInfant:
                cult->cultivationProgress = std::uniform_real_distribution<float>(100.0f, 500.0f)(rng_);
                break;
            default:
                cult->cultivationProgress = 0.0f;
                break;
        }
    }

    void ensureNPCDrive(ECS::EntityId entityId) {
        auto& registry = ECS::Registry::getInstance();
        auto* personality = registry.getComponent<PersonalityComponent>(entityId);
        if (!personality) return;
        if (personality->sociability < 50.0f && personality->diligence < 50.0f &&
            personality->ambition <= 70.0f && personality->caution >= 30.0f) {
            std::uniform_int_distribution<int> coinFlip(0, 1);
            std::uniform_real_distribution<float> boostRange(50.0f, 70.0f);
            if (coinFlip(rng_)) {
                personality->diligence = boostRange(rng_);
            } else {
                personality->sociability = boostRange(rng_);
            }
        }
    }

    void initializeFamilyRelations(const std::vector<ECS::EntityId>& members) {
        auto& registry = ECS::Registry::getInstance();
        for (size_t i = 0; i < members.size(); ++i) {
            auto* relI = registry.getComponent<RelationshipComponent>(members[i]);
            if (!relI) {
                registry.addComponent<RelationshipComponent>(members[i], RelationshipComponent());
                relI = registry.getComponent<RelationshipComponent>(members[i]);
            }
            if (!relI) continue;

            int added = 0;
            for (size_t j = 0; j < members.size(); ++j) {
                if (i == j) continue;
                if (added >= 15) break;

                auto* identityJ = registry.getComponent<IdentityComponent>(members[j]);
                int8_t affinity = static_cast<int8_t>(20 + std::uniform_int_distribution<int>(0, 30)(rng_));
                if (identityJ && (identityJ->role == NPCRole::FamilyHead || identityJ->role == NPCRole::Elder)) {
                    affinity = static_cast<int8_t>(std::min<int>(affinity + 10, 100));
                }
                relI->setAffinity(static_cast<uint32_t>(members[j]), affinity);
                added++;
            }
        }
    }

    std::string generateChineseName() {
        static const char* surnames[] = {
            "赵", "钱", "孙", "李", "周", "吴", "郑", "王",
            "冯", "陈", "褚", "卫", "蒋", "沈", "韩", "杨",
            "朱", "秦", "尤", "许", "何", "吕", "施", "张",
            "孔", "曹", "严", "华", "金", "魏", "陶", "姜"
        };
        static const char* givenNames[] = {
            "云", "风", "雷", "雨", "霜", "雪", "山", "河",
            "天", "地", "日", "月", "星", "辰", "龙", "凤",
            "虎", "鹤", "松", "竹", "梅", "兰", "菊", "莲",
            "峰", "岩", "泉", "溪", "林", "森", "海", "涛",
            "文", "武", "忠", "义", "仁", "礼", "智", "信",
            "修", "真", "玄", "清", "明", "华", "瑞", "祥"
        };
        std::uniform_int_distribution<int> sDist(0, 31);
        std::uniform_int_distribution<int> gDist(0, 47);
        std::uniform_int_distribution<int> twoChar(0, 1);
        std::string name = surnames[sDist(rng_)];
        name += givenNames[gDist(rng_)];
        if (twoChar(rng_)) {
            name += givenNames[gDist(rng_)];
        }
        return name;
    }

    static std::string roleToString(NPCRole role) {
        switch (role) {
            case NPCRole::FamilyHead: return "FamilyHead";
            case NPCRole::Elder: return "Elder";
            case NPCRole::CoreDisciple: return "CoreDisciple";
            case NPCRole::InnerDisciple: return "InnerDisciple";
            case NPCRole::BranchDisciple: return "BranchDisciple";
            case NPCRole::LawEnforcementElder: return "LawEnforcementElder";
            default: return "Unknown";
        }
    }

    static std::string nationChineseToEnglish(const std::string& nation) {
        if (nation == "秦") return "Qin";
        if (nation == "楚") return "Chu";
        if (nation == "齐") return "Qi";
        if (nation == "燕") return "Yan";
        if (nation == "赵") return "Zhao";
        if (nation == "魏") return "Wei";
        if (nation == "韩") return "Han";
        return nation;
    }

    std::mt19937 rng_;
};
