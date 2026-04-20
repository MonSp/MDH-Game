#pragma once

#include "../../ecs/Registry.h"
#include "../../ecs/components/PositionComponent.h"
#include "../../ecs/components/StatsComponent.h"
#include "../../ecs/components/BehaviorComponent.h"
#include "../../ecs/components/PersonalityComponent.h"
#include "../../ecs/components/IdentityComponent.h"
#include "../../ecs/components/LifecycleComponent.h"
#include "../../ecs/components/ResourcesComponent.h"
#include <string>
#include <vector>
#include <random>
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

        registry.addComponent<IdentityComponent>(entityId, *identity);
        registry.addComponent<PositionComponent>(entityId, *position);
        registry.addComponent<StatsComponent>(entityId, *stats);
        registry.addComponent<BehaviorComponent>(entityId, *behavior);
        registry.addComponent<PersonalityComponent>(entityId, *personality);
        registry.addComponent<LifecycleComponent>(entityId, *lifecycle);
        registry.addComponent<ResourcesComponent>(entityId, *resources);

        delete identity;
        delete position;
        delete stats;
        delete behavior;
        delete personality;
        delete lifecycle;
        delete resources;

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

        std::vector<std::string> nations = {"秦国", "楚国", "齐国", "燕国", "赵国", "魏国", "韩国"};
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
    NPCCreationSystem() = default;

    StatsComponent* createStatsForRealm(RealmLevel realm, uint8_t layer) {
        int32_t basePower = 500 + static_cast<int32_t>(layer) * 100;
        int32_t baseHp = basePower * 10;
        int32_t baseMp = basePower * 5;
        return new StatsComponent(basePower, baseHp, baseMp, realm);
    }

    PersonalityComponent* createPersonalityByNation(const std::string& nation) {
        float amb = 50.0f, cau = 50.0f, loy = 50.0f, gre = 50.0f;

        if (nation == "秦国") {
            amb = 70.0f; loy = 70.0f;
        } else if (nation == "楚国") {
            cau = 70.0f;
        } else if (nation == "燕国") {
            cau = 70.0f; gre = 40.0f;
        } else if (nation == "赵国") {
            amb = 60.0f; gre = 60.0f;
        }

        return new PersonalityComponent(amb, cau, loy, gre);
    }
};
