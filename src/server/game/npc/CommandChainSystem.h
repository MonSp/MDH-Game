#pragma once

#include "../ecs/components/RoleCommandComponent.h"
#include "../ecs/components/CommandDelegationComponent.h"
#include "../ecs/components/IdentityComponent.h"
#include "../ecs/components/PersonalityComponent.h"
#include "../ecs/components/StatsComponent.h"
#include "../ecs/components/PositionComponent.h"
#include <cstring>
#include <algorithm>

namespace ECS { class Registry; }

class CommandChainSystem {
public:
    static constexpr uint32_t MAX_COMMAND_META = 256;
    static constexpr uint32_t MAX_NPC_SLOTS = 4096;
    static constexpr uint32_t MAX_SQUAD_MEMBERS = 32;
    static constexpr uint32_t MAX_EMERGENCY_DESC = 256;
    static constexpr float FORMATION_SPACING = 2.5f;
    static constexpr float LEADER_FRONT_OFFSET = 4.0f;
    static constexpr float HP_RETREAT_THRESHOLD = 0.30f;

    static CommandChainSystem& getInstance() {
        static CommandChainSystem s;
        return s;
    }

    void routeCommand(uint32_t commandId, uint32_t issuerSlot, uint8_t issuerTier, const char* targetRole) {
        auto& reg = ECS::Registry::getInstance();
        NPCRole role = roleFromString(targetRole);
        if (issuerSlot >= reg.identity_.size()) return;

        for (size_t i = 0; i < reg.entityIds_.size(); ++i) {
            if (!reg.activeSlots_[i]) continue;
            if (i == issuerSlot) continue;
            if (reg.identity_[i].role != role) continue;

            auto& cmd = reg.roleCommand_[i];
            uint8_t prio = issuerTier;
            if (!cmd.pushCommand(commandId, prio)) continue;

            cmd.updateStatus(commandId, CommandLifecycle::Issued);
            cmd.parentCommandId = commandId;
            cmd.issuerId = reg.entityIds_[issuerSlot];
            cmd.issuerTier = issuerTier;
        }
    }

    void processDelegation(uint32_t npcSlot) {
        auto& reg = ECS::Registry::getInstance();
        if (npcSlot >= reg.entityIds_.size()) return;
        if (!reg.activeSlots_[npcSlot]) return;

        auto& cmd = reg.roleCommand_[npcSlot];
        const CommandSlot* current = cmd.peekCommand();
        if (!current) return;

        uint8_t st = current->status;
        if (st == static_cast<uint8_t>(CommandLifecycle::Delegated)
            || st == static_cast<uint8_t>(CommandLifecycle::Executing)
            || st >= static_cast<uint8_t>(CommandLifecycle::Completed)) {
            return;
        }

        CommandDelegationComponent* del = getOrCreateDelegationComp(npcSlot);
        DelegationSlot* slot = del->findSlot(current->commandId);
        if (!slot) return;

        for (uint16_t t = 0; t < slot->targetCount; ++t) {
            uint32_t targetSlot = slot->targetSlots[t];
            if (targetSlot >= reg.entityIds_.size()) continue;
            if (!reg.activeSlots_[targetSlot]) continue;

            uint32_t subCmdId = generateCommandId();
            auto& targetCmd = reg.roleCommand_[targetSlot];
            if (!targetCmd.pushCommand(subCmdId, current->priority)) {
                releaseCommandId(subCmdId);
                continue;
            }

            targetCmd.parentCommandId = current->commandId;
            targetCmd.issuerId = reg.entityIds_[npcSlot];
            targetCmd.issuerTier = cmd.issuerTier + 1;

            registerCommandMeta(subCmdId, 0, npcSlot);
            del->addChildCommand(slot, subCmdId);
        }

        cmd.updateStatus(current->commandId, CommandLifecycle::Delegated);
    }

    void processFeedback(uint32_t commandId, uint8_t resultStatus) {
        uint32_t parentSlot = UINT32_MAX;
        uint32_t parentCommandId = 0;
        DelegationSlot* targetSlot = nullptr;

        if (!findDelegationParent(commandId, parentSlot, parentCommandId, targetSlot)) return;
        if (!targetSlot) return;

        auto& reg = ECS::Registry::getInstance();
        CommandDelegationComponent* del = getDelegationComp(parentSlot);
        if (!del) return;

        del->collectFeedback(targetSlot, resultStatus);

        if (targetSlot->feedbackAggregated) {
            uint8_t aggregated = del->getAggregatedStatus(parentCommandId);
            auto& parentCmd = reg.roleCommand_[parentSlot];
            parentCmd.updateStatus(parentCommandId, static_cast<CommandLifecycle>(aggregated));

            if (parentCmd.parentCommandId != 0) {
                processFeedback(parentCommandId, aggregated);
            }
        }
    }

    void processEmergencyReport(uint32_t npcSlot, const char* eventDescription) {
        auto& reg = ECS::Registry::getInstance();
        if (npcSlot >= reg.entityIds_.size()) return;
        if (!reg.activeSlots_[npcSlot]) return;

        if (eventDescription) {
            size_t len = std::strlen(eventDescription);
            size_t copyLen = len < MAX_EMERGENCY_DESC - 1 ? len : MAX_EMERGENCY_DESC - 1;
            std::memcpy(m_emergencyDesc, eventDescription, copyLen);
            m_emergencyDesc[copyLen] = '\0';
        } else {
            m_emergencyDesc[0] = '\0';
        }

        uint32_t currentSlot = npcSlot;
        uint32_t currentCommandId = reg.roleCommand_[npcSlot].parentCommandId;
        uint8_t chainDepth = 0;
        static constexpr uint8_t MAX_CHAIN_DEPTH = 16;

        while (currentCommandId != 0 && chainDepth < MAX_CHAIN_DEPTH) {
            uint32_t issuerSlot = getCommandIssuerSlot(currentCommandId);
            if (issuerSlot == UINT32_MAX || issuerSlot >= reg.entityIds_.size()) break;
            if (!reg.activeSlots_[issuerSlot]) break;

            m_emergencyFlag = true;

            currentCommandId = reg.roleCommand_[issuerSlot].parentCommandId;
            chainDepth++;
        }

        if (chainDepth == 0 && currentCommandId == 0) {
            m_emergencyFlag = true;
        }
    }

    void updateCommandChain(uint64_t currentTimeMs, uint64_t frameCounter = 0) {
        auto& reg = ECS::Registry::getInstance();

        bool processNonCritical = (frameCounter % 5) == 0;

        for (size_t i = 0; i < reg.entityIds_.size(); ++i) {
            if (!reg.activeSlots_[i]) continue;
            auto& cmd = reg.roleCommand_[i];
            if (!cmd.hasActiveCommand()) continue;

            for (uint8_t j = 0; j < cmd.queueCount; ++j) {
                size_t idx = (cmd.queueHead + j) % RoleCommandComponent::MAX_QUEUE;
                uint32_t cid = cmd.queue[idx].commandId;
                uint64_t deadline = getCommandDeadline(cid);
                if (deadline > 0 && currentTimeMs > deadline) {
                    cmd.expireCommand(cid);
                    if (cmd.parentCommandId != 0) {
                        processFeedback(cid, static_cast<uint8_t>(CommandLifecycle::Expired));
                    }
                }
            }

            if (cmd.isPending() && processNonCritical) {
                processDelegation(static_cast<uint32_t>(i));
            }

            if (processNonCritical) {
                checkStaleDelegationFeedback(static_cast<uint32_t>(i));
            }
        }

        if (processNonCritical) {
            checkAndDisbandCompletedSquads();
        }
    }

    void setCommandDeadline(uint32_t commandId, uint64_t deadlineMs, uint32_t issuerSlot) {
        registerCommandMeta(commandId, deadlineMs, issuerSlot);
    }

    uint64_t getCommandDeadline(uint32_t commandId) const {
        for (uint32_t i = 0; i < m_commandMetaCount; ++i) {
            if (m_commandMeta[i].commandId == commandId) {
                return m_commandMeta[i].deadlineMs;
            }
        }
        return 0;
    }

    void formSquad(uint32_t commandId, const uint32_t* memberSlots, uint8_t memberCount) {
        if (memberCount < 3 || !memberSlots) return;
        if (memberCount > MAX_SQUAD_MEMBERS) memberCount = MAX_SQUAD_MEMBERS;

        auto& reg = ECS::Registry::getInstance();

        uint32_t leaderIdx = 0;
        int32_t maxPower = -1;
        float maxLoyalty = -1.0f;

        for (uint8_t i = 0; i < memberCount; ++i) {
            uint32_t slot = memberSlots[i];
            if (slot >= reg.entityIds_.size()) continue;
            if (!reg.activeSlots_[slot]) continue;

            int32_t power = reg.stats_[slot].power;
            float loyalty = reg.personality_[slot].loyalty;

            if (power > maxPower || (power == maxPower && loyalty > maxLoyalty)) {
                maxPower = power;
                maxLoyalty = loyalty;
                leaderIdx = i;
            }
        }

        uint32_t squadId = generateSquadId();

        for (uint8_t i = 0; i < memberCount; ++i) {
            uint32_t slot = memberSlots[i];
            if (slot >= reg.roleCommand_.size()) continue;

            auto& cmd = reg.roleCommand_[slot];
            cmd.squadId = squadId;
            cmd.squadRole = (i == leaderIdx) ? 0 : 1;
        }
    }

    void updateSquadTactics(uint32_t squadId) {
        auto& reg = ECS::Registry::getInstance();

        uint32_t memberSlots[MAX_SQUAD_MEMBERS];
        uint8_t memberCount = 0;
        uint32_t leaderSlot = UINT32_MAX;
        float centerX = 0.0f;
        float centerY = 0.0f;

        for (size_t i = 0; i < reg.entityIds_.size() && memberCount < MAX_SQUAD_MEMBERS; ++i) {
            if (!reg.activeSlots_[i]) continue;
            if (reg.roleCommand_[i].squadId != squadId) continue;

            memberSlots[memberCount] = static_cast<uint32_t>(i);
            centerX += reg.position_[i].x;
            centerY += reg.position_[i].y;

            if (reg.roleCommand_[i].squadRole == 0) {
                leaderSlot = static_cast<uint32_t>(i);
            }
            memberCount++;
        }

        if (memberCount == 0) return;
        centerX /= memberCount;
        centerY /= memberCount;

        bool retreat = false;
        for (uint8_t i = 0; i < memberCount; ++i) {
            uint32_t slot = memberSlots[i];
            if (reg.stats_[slot].hpPercent() < HP_RETREAT_THRESHOLD) {
                retreat = true;
                break;
            }
        }

        if (retreat && leaderSlot != UINT32_MAX) {
            auto& leaderCmd = reg.roleCommand_[leaderSlot];
            if (leaderCmd.hasActiveCommand()) {
                const CommandSlot* current = leaderCmd.peekCommand();
                if (current) {
                    leaderCmd.updateStatus(current->commandId, CommandLifecycle::Expired);
                }
            }
        }

        if (leaderSlot != UINT32_MAX) {
            reg.position_[leaderSlot].moveTo(centerX + LEADER_FRONT_OFFSET, centerY);
        }

        uint8_t nonLeaderIdx = 0;
        for (uint8_t i = 0; i < memberCount; ++i) {
            uint32_t slot = memberSlots[i];
            if (slot == leaderSlot) continue;

            float offset = (nonLeaderIdx % 2 == 0)
                ? FORMATION_SPACING * ((nonLeaderIdx / 2) + 1)
                : -FORMATION_SPACING * ((nonLeaderIdx / 2) + 1);
            float sideOffset = FORMATION_SPACING * 0.5f * nonLeaderIdx;

            reg.position_[slot].moveTo(
                centerX - LEADER_FRONT_OFFSET * 0.5f,
                centerY + offset
            );
            nonLeaderIdx++;
        }
    }

    void disbandSquad(uint32_t squadId) {
        auto& reg = ECS::Registry::getInstance();
        for (size_t i = 0; i < reg.entityIds_.size(); ++i) {
            if (!reg.activeSlots_[i]) continue;
            if (reg.roleCommand_[i].squadId != squadId) continue;
            reg.roleCommand_[i].squadId = 0;
            reg.roleCommand_[i].squadRole = 0;
        }
    }

    bool hasEmergency() const { return m_emergencyFlag; }
    void clearEmergency() { m_emergencyFlag = false; }
    const char* getEmergencyDesc() const { return m_emergencyDesc; }

    CommandDelegationComponent* getDelegationComp(uint32_t slot) {
        if (slot < MAX_NPC_SLOTS && m_hasDelegation[slot]) {
            return &m_delegationComps[slot];
        }
        return nullptr;
    }

    CommandDelegationComponent* getOrCreateDelegationComp(uint32_t slot) {
        if (slot >= MAX_NPC_SLOTS) return nullptr;
        if (!m_hasDelegation[slot]) {
            m_delegationComps[slot] = CommandDelegationComponent();
            m_hasDelegation[slot] = true;
        }
        return &m_delegationComps[slot];
    }

private:
    CommandChainSystem()
        : m_commandMetaCount(0)
        , m_nextSquadId(1)
        , m_nextCommandId(0x80000000)
        , m_emergencyFlag(false)
    {
        m_emergencyDesc[0] = '\0';
        for (size_t i = 0; i < MAX_NPC_SLOTS; ++i) {
            m_hasDelegation[i] = false;
        }
        for (size_t i = 0; i < MAX_COMMAND_META; ++i) {
            m_commandMeta[i] = {0, 0, UINT32_MAX};
        }
    }

    struct CommandMeta {
        uint32_t commandId;
        uint64_t deadlineMs;
        uint32_t issuerSlot;
    };

    void registerCommandMeta(uint32_t commandId, uint64_t deadlineMs, uint32_t issuerSlot) {
        for (uint32_t i = 0; i < m_commandMetaCount; ++i) {
            if (m_commandMeta[i].commandId == commandId) {
                m_commandMeta[i].deadlineMs = deadlineMs;
                m_commandMeta[i].issuerSlot = issuerSlot;
                return;
            }
        }
        if (m_commandMetaCount < MAX_COMMAND_META) {
            m_commandMeta[m_commandMetaCount] = {commandId, deadlineMs, issuerSlot};
            m_commandMetaCount++;
        }
    }

    uint32_t getCommandIssuerSlot(uint32_t commandId) const {
        for (uint32_t i = 0; i < m_commandMetaCount; ++i) {
            if (m_commandMeta[i].commandId == commandId) {
                return m_commandMeta[i].issuerSlot;
            }
        }
        return UINT32_MAX;
    }

    uint32_t generateCommandId() {
        return m_nextCommandId++;
    }

    void releaseCommandId(uint32_t) {
    }

    uint32_t generateSquadId() {
        return m_nextSquadId++;
    }

    bool findDelegationParent(uint32_t childCommandId, uint32_t& outParentSlot,
                              uint32_t& outParentCommandId, DelegationSlot*& outSlot) {
        auto& reg = ECS::Registry::getInstance();
        for (size_t i = 0; i < reg.entityIds_.size(); ++i) {
            if (!reg.activeSlots_[i]) continue;
            CommandDelegationComponent* del = getDelegationComp(static_cast<uint32_t>(i));
            if (!del) continue;
            for (uint8_t j = 0; j < del->slotCount; ++j) {
                DelegationSlot* s = &del->slots[j];
                for (uint8_t k = 0; k < s->childCount; ++k) {
                    if (s->childCommandIds[k] == childCommandId) {
                        outParentSlot = static_cast<uint32_t>(i);
                        outParentCommandId = s->parentCommandId;
                        outSlot = s;
                        return true;
                    }
                }
            }
        }
        outParentSlot = UINT32_MAX;
        outParentCommandId = 0;
        outSlot = nullptr;
        return false;
    }

    void checkStaleDelegationFeedback(uint32_t npcSlot) {
        auto& reg = ECS::Registry::getInstance();
        CommandDelegationComponent* del = getDelegationComp(npcSlot);
        if (!del) return;

        auto& cmd = reg.roleCommand_[npcSlot];
        for (uint8_t j = 0; j < del->slotCount; ++j) {
            DelegationSlot& slot = del->slots[j];
            if (slot.feedbackAggregated && slot.childCount > 0) {
                uint8_t currentStatus = static_cast<uint8_t>(CommandLifecycle::Executing);
                const CommandSlot* peeked = cmd.peekCommand();
                if (peeked && peeked->commandId == slot.parentCommandId) {
                    currentStatus = peeked->status;
                }
                if (currentStatus == static_cast<uint8_t>(CommandLifecycle::Delegated)
                    || currentStatus == static_cast<uint8_t>(CommandLifecycle::Executing)) {
                    uint8_t aggregated = del->getAggregatedStatus(slot.parentCommandId);
                    cmd.updateStatus(slot.parentCommandId, static_cast<CommandLifecycle>(aggregated));
                    if (cmd.parentCommandId != 0) {
                        processFeedback(slot.parentCommandId, aggregated);
                    }
                }
            }
        }
    }

    static NPCRole roleFromString(const char* str) {
        if (!str) return NPCRole::BranchDisciple;
        if (std::strcmp(str, "FamilyHead") == 0)            return NPCRole::FamilyHead;
        if (std::strcmp(str, "Elder") == 0)                 return NPCRole::Elder;
        if (std::strcmp(str, "CoreDisciple") == 0)          return NPCRole::CoreDisciple;
        if (std::strcmp(str, "InnerDisciple") == 0)         return NPCRole::InnerDisciple;
        if (std::strcmp(str, "BranchDisciple") == 0)        return NPCRole::BranchDisciple;
        if (std::strcmp(str, "LawEnforcementElder") == 0)   return NPCRole::LawEnforcementElder;
        return NPCRole::BranchDisciple;
    }

    void checkAndDisbandCompletedSquads() {
        auto& reg = ECS::Registry::getInstance();

        bool squadActive[MAX_SQUAD_MEMBERS * 8] = {};
        uint32_t trackedSquads[MAX_SQUAD_MEMBERS * 8];
        uint32_t trackedCount = 0;

        for (size_t i = 0; i < reg.entityIds_.size() && trackedCount < sizeof(trackedSquads)/sizeof(trackedSquads[0]); ++i) {
            if (!reg.activeSlots_[i]) continue;
            uint32_t sid = reg.roleCommand_[i].squadId;
            if (sid == 0) continue;

            bool found = false;
            for (uint32_t k = 0; k < trackedCount; ++k) {
                if (trackedSquads[k] == sid) { found = true; break; }
            }
            if (found) continue;

            trackedSquads[trackedCount] = sid;
            trackedCount++;
        }

        for (uint32_t k = 0; k < trackedCount; ++k) {
            uint32_t sid = trackedSquads[k];
            bool allInactive = true;
            for (size_t i = 0; i < reg.entityIds_.size(); ++i) {
                if (!reg.activeSlots_[i]) continue;
                if (reg.roleCommand_[i].squadId != sid) continue;
                if (reg.roleCommand_[i].hasActiveCommand()) {
                    allInactive = false;
                    break;
                }
            }
            if (allInactive) {
                disbandSquad(sid);
            }
        }
    }

    CommandMeta m_commandMeta[MAX_COMMAND_META];
    uint32_t m_commandMetaCount;

    CommandDelegationComponent m_delegationComps[MAX_NPC_SLOTS];
    bool m_hasDelegation[MAX_NPC_SLOTS];

    uint32_t m_nextSquadId;
    uint32_t m_nextCommandId;

    bool m_emergencyFlag;
    char m_emergencyDesc[MAX_EMERGENCY_DESC];
};
