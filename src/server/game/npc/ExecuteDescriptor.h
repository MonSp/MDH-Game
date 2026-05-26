#pragma once
#include "../ecs/components/BehaviorComponent.h"
#include "../ecs/Registry.h"
#include <cstdint>

enum class ActivityCategory : uint8_t {
    Survival = 0,
    Daily = 1,
    Cultivation = 2,
    Social = 3,
    Production = 4,
    Combat = 5,
    Exploration = 6,
    Command = 7
};

constexpr uint8_t REQ_POSITION     = 1 << 0;
constexpr uint8_t REQ_STATS        = 1 << 1;
constexpr uint8_t REQ_RESOURCES    = 1 << 2;
constexpr uint8_t REQ_SOCIAL       = 1 << 3;
constexpr uint8_t REQ_CULT         = 1 << 4;
constexpr uint8_t REQ_RELATIONSHIP = 1 << 5;
constexpr uint8_t REQ_CMD          = 1 << 6;
constexpr uint8_t REQ_IDENTITY     = 1 << 7;

struct ExecuteContext;

struct ExecuteDescriptor {
    NPCActivity activity;
    const char* name;
    ActivityCategory category;
    uint8_t requiredComponents;
    void (*execute)(ExecuteContext& ctx);
};

struct ExecuteContext {
    ECS::EntityId entityId;
    uint64_t currentTime;
    float deltaTime;

private:
    PositionComponent*      m_position;
    StatsComponent*         m_stats;
    ResourcesComponent*     m_resources;
    SocialComponent*        m_social;
    CultivationComponent*   m_cult;
    RelationshipComponent*  m_rel;
    RoleCommandComponent*   m_cmd;
    IdentityComponent*      m_identity;
    ECS::Registry*          m_registry;

public:
    ExecuteContext(ECS::EntityId id, uint64_t time, float dt)
        : entityId(id), currentTime(time), deltaTime(dt)
        , m_position(nullptr), m_stats(nullptr), m_resources(nullptr)
        , m_social(nullptr), m_cult(nullptr), m_rel(nullptr)
        , m_cmd(nullptr), m_identity(nullptr)
        , m_registry(&ECS::Registry::getInstance())
    {}

    ECS::Registry& reg() { return *m_registry; }

    PositionComponent* getPosition() {
        if (!m_position) m_position = m_registry->getComponent<PositionComponent>(entityId);
        return m_position;
    }
    StatsComponent* getStats() {
        if (!m_stats) m_stats = m_registry->getComponent<StatsComponent>(entityId);
        return m_stats;
    }
    ResourcesComponent* getResources() {
        if (!m_resources) m_resources = m_registry->getComponent<ResourcesComponent>(entityId);
        return m_resources;
    }
    SocialComponent* getSocial() {
        if (!m_social) m_social = m_registry->getComponent<SocialComponent>(entityId);
        return m_social;
    }
    CultivationComponent* getCult() {
        if (!m_cult) m_cult = m_registry->getComponent<CultivationComponent>(entityId);
        return m_cult;
    }
    RelationshipComponent* getRelationship() {
        if (!m_rel) m_rel = m_registry->getComponent<RelationshipComponent>(entityId);
        return m_rel;
    }
    RoleCommandComponent* getCmd() {
        if (!m_cmd) m_cmd = m_registry->getComponent<RoleCommandComponent>(entityId);
        return m_cmd;
    }
    IdentityComponent* getIdentity() {
        if (!m_identity) m_identity = m_registry->getComponent<IdentityComponent>(entityId);
        return m_identity;
    }
    BehaviorComponent* getBehavior() {
        return m_registry->getComponent<BehaviorComponent>(entityId);
    }
};

static inline float exec_random01() {
    return static_cast<float>(rand()) / static_cast<float>(RAND_MAX);
}
static inline int exec_randRange(int min, int max) {
    return min + rand() % (max - min + 1);
}
#include <cmath>
static inline float exec_fabs(float v) { return std::fabs(v); }
static inline float exec_sqrt(float v) { return std::sqrt(v); }
