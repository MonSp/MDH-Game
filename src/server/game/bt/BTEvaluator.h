#pragma once

#include "../ecs/Registry.h"
#include "../ecs/components/BehaviorComponent.h"
#include "../ecs/components/BehaviorTreeComponent.h"
#include "BehaviorTreeTemplate.h"
#include "BlackboardCache.h"
#include <cstdint>

class BTEvaluator {
public:
    static bool evaluate(ECS::EntityId id, uint64_t currentTime) {
        auto& registry = ECS::Registry::getInstance();
        auto* bt = registry.getComponent<BehaviorTreeComponent>(id);
        auto* bb = registry.getComponent<BlackboardCache>(id);
        auto* behavior = registry.getComponent<BehaviorComponent>(id);
        auto* identity = registry.getComponent<IdentityComponent>(id);

        if (!bt || !bt->tmpl || !bb || !behavior) return false;

        const auto& tmpl = *bt->tmpl;
        if (tmpl.nodeCount == 0) return false;

        uint16_t nodeIdx = bt->currentNode;
        if (nodeIdx >= tmpl.nodeCount) nodeIdx = tmpl.rootIndex;

        if (!bb->isDirty()) {
            uint16_t cursor = nodeIdx;
            int safety = 0;
            while (cursor < tmpl.nodeCount && safety < 32) {
                if (tmpl.nodes[cursor].type == 2) {
                    behavior->changeActivity(static_cast<NPCActivity>(tmpl.nodes[cursor].actionId));
                    bt->currentNode = tmpl.nodes[cursor].next;
                    return true;
                }
                safety++;
                uint16_t next = tmpl.nodes[cursor].next;
                if (next == cursor || next >= tmpl.nodeCount) break;
                cursor = next;
            }
            bb->invalidate();
        }

        uint16_t stack[16];
        int sp = -1;

        for (int iter = 0; iter < 64; ++iter) {
            if (nodeIdx >= tmpl.nodeCount) break;
            const auto& node = tmpl.nodes[nodeIdx];

            switch (node.type) {
                case 1: {
                    bool cond = evaluateCondition(bb, registry, id, identity, static_cast<uint8_t>(node.actionId), currentTime);
                    nodeIdx = cond ? node.next : node.fail;
                    break;
                }
                case 2: {
                    uint16_t actId = node.actionId;
                    if (actId == 0 && bb->check(BlackboardCache::HasCommand)) {
                        auto* cmd = registry.getComponent<RoleCommandComponent>(id);
                        if (cmd && cmd->isActive()) actId = static_cast<uint16_t>(cmd->commandType);
                    }
                    if (actId != 0 && actId < 200) {
                        behavior->changeActivity(static_cast<NPCActivity>(actId));
                    }
                    bt->currentNode = node.next;
                    bb->markClean();
                    return true;
                }
                case 3: {
                    if (sp >= 15) break;
                    stack[++sp] = node.fail;
                    nodeIdx = node.next;
                    break;
                }
                case 4: {
                    if (sp >= 15) break;
                    stack[++sp] = node.fail;
                    nodeIdx = node.next;
                    break;
                }
                default: return false;
            }

            if (nodeIdx >= tmpl.nodeCount && sp >= 0) {
                nodeIdx = stack[sp--];
            }
        }

        return false;
    }

private:
    static bool evaluateCondition(BlackboardCache* bb, ECS::Registry& registry,
                                  ECS::EntityId id, IdentityComponent* identity,
                                  uint8_t condId, uint64_t currentTime) {
        switch (condId) {
            case 0: {
                auto* stats = registry.getComponent<StatsComponent>(id);
                bool threat = stats && stats->hpPercent() < 0.5f;
                if (threat) bb->set(BlackboardCache::HasThreatNearby);
                else bb->clear(BlackboardCache::HasThreatNearby);
                return threat;
            }
            case 1: {
                auto* social = registry.getComponent<SocialComponent>(id);
                bool hungry = social && social->isHungry();
                if (hungry) bb->set(BlackboardCache::IsHungry);
                else bb->clear(BlackboardCache::IsHungry);
                return hungry;
            }
            case 2: {
                auto* social = registry.getComponent<SocialComponent>(id);
                bool exhausted = social && social->isExhausted();
                if (exhausted) bb->set(BlackboardCache::IsExhausted);
                else bb->clear(BlackboardCache::IsExhausted);
                return exhausted;
            }
            case 3: {
                auto* rel = registry.getComponent<RelationshipComponent>(id);
                auto* social = registry.getComponent<SocialComponent>(id);
                auto* personality = registry.getComponent<PersonalityComponent>(id);
                bool hasSocial = rel && social && personality &&
                    social->wantsSocial() && personality->isSocial() &&
                    rel->getRelationCount() > 0;
                if (hasSocial) bb->set(BlackboardCache::HasSocialTarget);
                else bb->clear(BlackboardCache::HasSocialTarget);
                return hasSocial;
            }
            case 4: {
                auto* cmd = registry.getComponent<RoleCommandComponent>(id);
                bool hasCmd = cmd && cmd->isActive() && !cmd->isExpired(currentTime);
                if (hasCmd) bb->set(BlackboardCache::HasCommand);
                else bb->clear(BlackboardCache::HasCommand);
                return hasCmd;
            }
            case 5: {
                auto* cult = registry.getComponent<CultivationComponent>(id);
                auto* personality = registry.getComponent<PersonalityComponent>(id);
                bool shouldCultivate = cult && personality &&
                    (cult->isReadyForBreakthrough() || (personality->isDiligent() && (rand() % 100) < 40));
                if (shouldCultivate) bb->set(BlackboardCache::ShouldCultivate);
                else bb->clear(BlackboardCache::ShouldCultivate);
                return shouldCultivate;
            }
            default: return false;
        }
    }
};
