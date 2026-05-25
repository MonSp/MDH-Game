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
#include <string>
#include <vector>
#include <random>
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
        auto* personality = createPersonalityByNation(nation);
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

    size_t getNPCCount() const {
        return ECS::Registry::getInstance().getEntitiesWithComponent<IdentityComponent>().size();
    }

private:
    NPCCreationSystem() : rng_(static_cast<unsigned>(std::time(nullptr))) {}

    StatsComponent* createStatsForRealm(RealmLevel realm, uint8_t layer) {
        int32_t basePower = 500 + static_cast<int32_t>(layer) * 100;
        int32_t baseHp = basePower * 10;
        int32_t baseMp = basePower * 5;
        return new StatsComponent(basePower, baseHp, baseMp, realm);
    }

    PersonalityComponent* createPersonalityByNation(const std::string& nation) {
        float amb = 50.0f, cau = 50.0f, loy = 50.0f, gre = 50.0f;
        std::uniform_real_distribution<float> dist(30.0f, 70.0f);
        float soc = dist(rng_);
        float dil = dist(rng_);

        if (nation == "Qin") {
            amb = 70.0f; loy = 70.0f;
            soc += 10.0f; dil += 15.0f;
        } else if (nation == "Chu") {
            cau = 70.0f;
            soc += 15.0f; dil -= 10.0f;
        } else if (nation == "Qi") {
            amb += 10.0f; cau += 10.0f;
            soc += 15.0f; dil += 5.0f;
        } else if (nation == "Yan") {
            cau = 70.0f; gre = 40.0f;
            soc -= 10.0f; dil += 10.0f;
        } else if (nation == "Zhao") {
            amb = 60.0f; gre = 60.0f;
            soc += 5.0f;
        } else if (nation == "Wei") {
            loy += 20.0f;
            dil += 10.0f;
        } else if (nation == "Han") {
            gre += 20.0f; cau += 10.0f;
            soc += 5.0f; dil -= 5.0f;
        }

        soc = std::max(0.0f, std::min(100.0f, soc));
        dil = std::max(0.0f, std::min(100.0f, dil));

        return new PersonalityComponent(amb, cau, loy, gre, soc, dil);
    }

    std::mt19937 rng_;
};
