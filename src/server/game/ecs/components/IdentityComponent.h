#pragma once

#include "../../ecs/Component.h"
#include <string>
#include "StatsComponent.h"

struct IdentityComponent : public ECS::ComponentBase<IdentityComponent> {
    std::string id;
    std::string name;
    std::string clanId;
    std::string nation;
    NPCRole role;
    uint8_t layer;

    IdentityComponent() : role(NPCRole::BranchDisciple), layer(9) {}

    IdentityComponent(const std::string& nid, const std::string& nname,
                      const std::string& clid, const std::string& nat,
                      NPCRole r, uint8_t lyr)
        : id(nid), name(nname), clanId(clid), nation(nat), role(r), layer(lyr) {}

    bool isImportant() const {
        return role == NPCRole::FamilyHead ||
               role == NPCRole::Elder ||
               role == NPCRole::CoreDisciple;
    }

    bool isLawEnforcement() const {
        return role == NPCRole::LawEnforcementElder;
    }
};
