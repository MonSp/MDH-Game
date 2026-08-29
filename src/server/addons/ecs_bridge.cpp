#include <node_api.h>
#include <string>
#include <vector>
#include <cstring>
#include "game/ecs/Registry.h"
#include "game/ecs/systems/WorldUpdateLoop.h"
#include "game/ecs/components/IdentityComponent.h"
#include "game/ecs/components/StatsComponent.h"
#include "game/ecs/components/PositionComponent.h"
#include "game/ecs/components/BehaviorComponent.h"
#include "game/ecs/components/PersonalityComponent.h"
#include "game/ecs/components/ResourcesComponent.h"
#include "game/ecs/components/LifecycleComponent.h"
#include "game/ecs/components/SocialComponent.h"
#include "game/ecs/components/RelationshipComponent.h"
#include "game/npc/NPCCreationSystem.h"
#include "game/ecs/systems/LLMPlanningSystem.h"
#include "game/llm/LLMHttpClient.h"

static napi_status setStr(napi_env env, napi_value obj, const char* key, const std::string& val) {
    napi_value jsStr;
    napi_status s = napi_create_string_utf8(env, val.c_str(), val.length(), &jsStr);
    if (s != napi_ok) return s;
    return napi_set_named_property(env, obj, key, jsStr);
}

static napi_status setInt(napi_env env, napi_value obj, const char* key, int32_t val) {
    napi_value jsNum;
    napi_status s = napi_create_int32(env, val, &jsNum);
    if (s != napi_ok) return s;
    return napi_set_named_property(env, obj, key, jsNum);
}

static napi_status setInt64ToDouble(napi_env env, napi_value obj, const char* key, int64_t val) {
    napi_value jsNum;
    napi_status s = napi_create_double(env, static_cast<double>(val), &jsNum);
    if (s != napi_ok) return s;
    return napi_set_named_property(env, obj, key, jsNum);
}

static napi_status setFloat(napi_env env, napi_value obj, const char* key, float val) {
    napi_value jsNum;
    napi_status s = napi_create_double(env, static_cast<double>(val), &jsNum);
    if (s != napi_ok) return s;
    return napi_set_named_property(env, obj, key, jsNum);
}

static const char* realmToString(RealmLevel r) {
    switch (r) {
        case RealmLevel::Mortal: return "凡人";
        case RealmLevel::QiRefining: return "练气";
        case RealmLevel::FoundationBuilding: return "筑基";
        case RealmLevel::GoldenCore: return "金丹";
        case RealmLevel::YuanInfant: return "元婴";
        case RealmLevel::Transcension: return "化神";
        default: return "练气";
    }
}

static const char* roleToString(NPCRole r) {
    switch (r) {
        case NPCRole::FamilyHead: return "家主";
        case NPCRole::Elder: return "长老";
        case NPCRole::CoreDisciple: return "核心子弟";
        case NPCRole::InnerDisciple: return "内门子弟";
        case NPCRole::BranchDisciple: return "支脉子弟";
        case NPCRole::LawEnforcementElder: return "执法堂长老";
        default: return "内门子弟";
    }
}

static const char* activityToString(NPCActivity a) {
    switch (a) {
        // Combat / safety
        case NPCActivity::Flee:          return "retreat";
        case NPCActivity::Defend:        return "retreat";
        case NPCActivity::DefendPosition: return "retreat";
        case NPCActivity::Attack:        return "patrol";
        case NPCActivity::Hunt:          return "patrol";
        case NPCActivity::Duel:          return "compete";
        case NPCActivity::Ambush:        return "patrol";
        case NPCActivity::Assassinate:   return "patrol";
        case NPCActivity::Patrol:        return "patrol";
        case NPCActivity::Escort:        return "patrol";
        case NPCActivity::Scout:         return "patrol";
        // Production / logistics
        case NPCActivity::Mine:          return "work";
        case NPCActivity::Farm:          return "work";
        case NPCActivity::Fish:          return "work";
        case NPCActivity::Lumber:        return "work";
        case NPCActivity::Gather:        return "work";
        case NPCActivity::Build:         return "work";
        case NPCActivity::Craft:         return "work";
        case NPCActivity::Refine:        return "work";
        case NPCActivity::Cook:          return "work";
        case NPCActivity::Tailor:        return "work";
        case NPCActivity::Construct:     return "work";
        case NPCActivity::Repair:        return "work";
        // Trade
        case NPCActivity::Trade:         return "trade";
        case NPCActivity::Buy:           return "trade";
        case NPCActivity::Sell:          return "trade";
        case NPCActivity::Bargain:       return "trade";
        // Cultivation
        case NPCActivity::Cultivate:     return "retreat";
        case NPCActivity::Breakthrough:  return "retreat";
        case NPCActivity::Tribulation:   return "retreat";
        case NPCActivity::Meditate:      return "retreat";
        case NPCActivity::Alchemy:       return "retreat";
        case NPCActivity::SeekFortune:   return "compete";
        // Social
        case NPCActivity::Chat:          return "rest";
        case NPCActivity::VisitFriend:   return "rest";
        case NPCActivity::Date:          return "rest";
        case NPCActivity::FamilyGathering: return "rest";
        case NPCActivity::MentorTeach:   return "logistics";
        case NPCActivity::DiscipleAsk:   return "rest";
        case NPCActivity::Gossip:        return "rest";
        case NPCActivity::SocialHelp:    return "logistics";
        case NPCActivity::CoordinateSquad: return "logistics";
        case NPCActivity::ReportTask:    return "logistics";
        case NPCActivity::RefuseCommand: return "rest";
        // Economy
        case NPCActivity::SetTaxRate:        return "logistics";
        case NPCActivity::TradeEmbargo:      return "logistics";
        case NPCActivity::StockpileMaterial:  return "logistics";
        case NPCActivity::PriceStabilize:    return "logistics";
        case NPCActivity::EconomicMobilize:  return "logistics";
        // Exploration
        case NPCActivity::Explore:       return "compete";
        case NPCActivity::TreasureHunt:  return "compete";
        case NPCActivity::MapExplore:    return "patrol";
        // Basic
        case NPCActivity::Rest:          return "rest";
        case NPCActivity::Eat:           return "rest";
        case NPCActivity::Sleep:         return "rest";
        case NPCActivity::Walk:          return "patrol";
        case NPCActivity::AwaitOrders:   return "rest";
        case NPCActivity::Idle:          return "rest";
        case NPCActivity::Dead:          return "dead";
        case NPCActivity::Incapacitated: return "dead";
        default:                         return "rest";
    }
}

static napi_value Initialize(napi_env env, napi_callback_info info) {
    size_t argc = 1;
    napi_value args[1];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    uint32_t threadCount = 8;
    if (argc >= 1) napi_get_value_uint32(env, args[0], &threadCount);

    WorldUpdateLoop::getInstance().initialize(threadCount);

    napi_value result;
    napi_get_boolean(env, true, &result);
    return result;
}

static napi_value CreateNPCs(napi_env env, napi_callback_info info) {
    size_t argc = 2;
    napi_value args[2];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    uint32_t count = 1000;
    uint32_t layer = 9;
    if (argc >= 1) napi_get_value_uint32(env, args[0], &count);
    if (argc >= 2) napi_get_value_uint32(env, args[1], &layer);

    NPCCreationSystem::getInstance().createBatchNPCs(count, static_cast<uint8_t>(layer));

    napi_value result;
    napi_create_object(env, &result);
    setInt(env, result, "created", static_cast<int32_t>(count));
    setInt(env, result, "layer", static_cast<int32_t>(layer));
    setInt(env, result, "totalNPCs", static_cast<int32_t>(NPCCreationSystem::getInstance().getNPCCount()));
    return result;
}

static napi_value GetAllNPCStates(napi_env env, napi_callback_info info) {
    napi_get_cb_info(env, info, nullptr, nullptr, nullptr, nullptr);

    auto& registry = ECS::Registry::getInstance();
    auto entities = registry.getEntitiesWithComponent<IdentityComponent>();

    std::vector<ECS::EntityId> activeEntities;
    activeEntities.reserve(entities.size());
    for (auto id : entities) {
        auto* lifecycle = registry.getComponent<LifecycleComponent>(id);
        if (lifecycle && lifecycle->lifeState == NPCLifeState::Active) {
            activeEntities.push_back(id);
        }
    }

    napi_value arr;
    napi_create_array_with_length(env, activeEntities.size(), &arr);

    for (size_t i = 0; i < activeEntities.size(); i++) {
        auto entityId = activeEntities[i];
        napi_value obj;
        napi_create_object(env, &obj);

        auto* identity = registry.getComponent<IdentityComponent>(entityId);
        auto* stats = registry.getComponent<StatsComponent>(entityId);
        auto* position = registry.getComponent<PositionComponent>(entityId);
        auto* behavior = registry.getComponent<BehaviorComponent>(entityId);
        auto* personality = registry.getComponent<PersonalityComponent>(entityId);
        auto* resources = registry.getComponent<ResourcesComponent>(entityId);

        if (identity) {
            setStr(env, obj, "id", identity->id);
            setStr(env, obj, "name", identity->name);
            setStr(env, obj, "clanId", identity->clanId);
            setStr(env, obj, "nation", identity->nation);
            setStr(env, obj, "role", roleToString(identity->role));
            setInt(env, obj, "layer", static_cast<int32_t>(identity->layer));
        }

        if (stats) {
            setStr(env, obj, "realm", realmToString(stats->realm));
            setInt(env, obj, "hp", stats->hp);
            setInt(env, obj, "maxHp", stats->maxHp);
            setInt(env, obj, "mp", stats->mp);
            setInt(env, obj, "maxMp", stats->maxMp);
            setInt(env, obj, "power", stats->power);
        }

        if (position) {
            setFloat(env, obj, "x", position->x);
            setFloat(env, obj, "y", position->y);
        }

        if (behavior) {
            setStr(env, obj, "activity", activityToString(behavior->currentActivity));

#ifdef NPC_DECISION_LOG_ENABLED
            const char* snippet = behavior->getReadableDecisionSummary();
            if (snippet && snippet[0] != '\0') {
                setStr(env, obj, "lastDecisionSnippet", std::string(snippet));
            } else {
                setStr(env, obj, "lastDecisionSnippet", std::string(""));
            }
#else
            setStr(env, obj, "lastDecisionSnippet", std::string(""));
#endif

            napi_value refWeights;
            napi_create_array_with_length(env, behavior->reflection.trackedCount, &refWeights);
            for (uint8_t ri = 0; ri < behavior->reflection.trackedCount && ri < 8; ri++) {
                napi_value rw;
                napi_create_object(env, &rw);
                setInt(env, rw, "activity", static_cast<int32_t>(behavior->reflection.trackedTypes[ri]));
                setFloat(env, rw, "weight", behavior->reflection.weightMultiplier[ri]);
                setInt(env, rw, "penalties", behavior->reflection.penaltyCount[ri]);
                napi_set_element(env, refWeights, ri, rw);
            }
            napi_set_named_property(env, obj, "reflectionWeights", refWeights);
        }

        if (personality) {
            setFloat(env, obj, "ambition", personality->ambition);
            setFloat(env, obj, "caution", personality->caution);
            setFloat(env, obj, "loyalty", personality->loyalty);
            setFloat(env, obj, "greed", personality->greed);
            setFloat(env, obj, "sociability", personality->sociability);
            setFloat(env, obj, "diligence", personality->diligence);
        }

        auto* social = registry.getComponent<SocialComponent>(entityId);
        if (social) {
            setFloat(env, obj, "anger", social->anger);
            setFloat(env, obj, "fear", social->fear);
            setFloat(env, obj, "joy", social->joy);
            setFloat(env, obj, "hunger", social->hunger);
            setFloat(env, obj, "fatigue", social->fatigue);
            setFloat(env, obj, "socialDesire", social->socialDesire);
            setFloat(env, obj, "energy", social->energy);
            setFloat(env, obj, "mood", social->mood);
        }

        auto* relationship = registry.getComponent<RelationshipComponent>(entityId);
        if (relationship) {
            setInt(env, obj, "spouseSlot", static_cast<int32_t>(relationship->spouseSlot));
            setInt(env, obj, "mentorSlot", static_cast<int32_t>(relationship->mentorSlot));
            setInt(env, obj, "relationCount", static_cast<int32_t>(relationship->relationCount));
        }

        if (resources) {
            setInt64ToDouble(env, obj, "spiritStones", resources->spiritStones);
        }

        napi_set_element(env, arr, i, obj);
    }

    return arr;
}

static napi_value GetNearbyNPCStates(napi_env env, napi_callback_info info) {
    size_t argc = 3;
    napi_value args[3];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    double centerX = 0, centerY = 0, radius = 500;
    if (argc >= 1) napi_get_value_double(env, args[0], &centerX);
    if (argc >= 2) napi_get_value_double(env, args[1], &centerY);
    if (argc >= 3) napi_get_value_double(env, args[2], &radius);

    auto& registry = ECS::Registry::getInstance();
    auto entities = registry.getEntitiesWithComponent<IdentityComponent>();

    float radiusSq = static_cast<float>(radius * radius);

    napi_value arr;
    napi_create_array(env, &arr);
    uint32_t count = 0;

    for (auto id : entities) {
        auto* lifecycle = registry.getComponent<LifecycleComponent>(id);
        if (!lifecycle || lifecycle->lifeState != NPCLifeState::Active) continue;

        auto* position = registry.getComponent<PositionComponent>(id);
        if (position) {
            float dx = position->x - static_cast<float>(centerX);
            float dy = position->y - static_cast<float>(centerY);
            if (dx * dx + dy * dy > radiusSq) continue;
        }

        napi_value obj;
        napi_create_object(env, &obj);

        auto* identity = registry.getComponent<IdentityComponent>(id);
        auto* stats = registry.getComponent<StatsComponent>(id);
        auto* behavior = registry.getComponent<BehaviorComponent>(id);
        auto* personality = registry.getComponent<PersonalityComponent>(id);
        auto* resources = registry.getComponent<ResourcesComponent>(id);
        auto* social = registry.getComponent<SocialComponent>(id);
        auto* relationship = registry.getComponent<RelationshipComponent>(id);

        if (identity) {
            setStr(env, obj, "id", identity->id);
            setStr(env, obj, "name", identity->name);
            setStr(env, obj, "clanId", identity->clanId);
            setStr(env, obj, "nation", identity->nation);
            setStr(env, obj, "role", roleToString(identity->role));
            setInt(env, obj, "layer", static_cast<int32_t>(identity->layer));
        }

        if (stats) {
            setStr(env, obj, "realm", realmToString(stats->realm));
            setInt(env, obj, "hp", stats->hp);
            setInt(env, obj, "maxHp", stats->maxHp);
            setInt(env, obj, "mp", stats->mp);
            setInt(env, obj, "maxMp", stats->maxMp);
            setInt(env, obj, "power", stats->power);
        }

        if (position) {
            setFloat(env, obj, "x", position->x);
            setFloat(env, obj, "y", position->y);
        }

        if (behavior) {
            setStr(env, obj, "activity", activityToString(behavior->currentActivity));
#ifdef NPC_DECISION_LOG_ENABLED
            const char* snippet = behavior->getReadableDecisionSummary();
            if (snippet && snippet[0] != '\0') {
                setStr(env, obj, "lastDecisionSnippet", std::string(snippet));
            } else {
                setStr(env, obj, "lastDecisionSnippet", std::string(""));
            }
#else
            setStr(env, obj, "lastDecisionSnippet", std::string(""));
#endif
        }

        if (personality) {
            setFloat(env, obj, "ambition", personality->ambition);
            setFloat(env, obj, "caution", personality->caution);
            setFloat(env, obj, "loyalty", personality->loyalty);
            setFloat(env, obj, "greed", personality->greed);
            setFloat(env, obj, "sociability", personality->sociability);
            setFloat(env, obj, "diligence", personality->diligence);
        }

        if (social) {
            setFloat(env, obj, "anger", social->anger);
            setFloat(env, obj, "fear", social->fear);
            setFloat(env, obj, "joy", social->joy);
            setFloat(env, obj, "hunger", social->hunger);
            setFloat(env, obj, "fatigue", social->fatigue);
            setFloat(env, obj, "socialDesire", social->socialDesire);
            setFloat(env, obj, "energy", social->energy);
            setFloat(env, obj, "mood", social->mood);
        }

        if (relationship) {
            setInt(env, obj, "spouseSlot", static_cast<int32_t>(relationship->spouseSlot));
            setInt(env, obj, "mentorSlot", static_cast<int32_t>(relationship->mentorSlot));
            setInt(env, obj, "relationCount", static_cast<int32_t>(relationship->relationCount));
        }

        if (resources) {
            setInt64ToDouble(env, obj, "spiritStones", resources->spiritStones);
        }

        napi_set_element(env, arr, count, obj);
        count++;
    }

    return arr;
}

static napi_value UpdateFrame(napi_env env, napi_callback_info info) {
    napi_get_cb_info(env, info, nullptr, nullptr, nullptr, nullptr);

    WorldUpdateLoop::getInstance().updateOnce();

    napi_value result;
    napi_get_boolean(env, true, &result);
    return result;
}

static napi_value GetStats(napi_env env, napi_callback_info info) {
    napi_get_cb_info(env, info, nullptr, nullptr, nullptr, nullptr);

    napi_value result;
    napi_create_object(env, &result);

    setInt(env, result, "npcCount",
        static_cast<int32_t>(NPCCreationSystem::getInstance().getNPCCount()));
    setFloat(env, result, "avgFrameTime",
        WorldUpdateLoop::getInstance().getAverageFrameTime());
    setInt(env, result, "frameCount",
        static_cast<int32_t>(WorldUpdateLoop::getInstance().getFrameCount()));

    return result;
}

static napi_value Stop(napi_env env, napi_callback_info info) {
    napi_get_cb_info(env, info, nullptr, nullptr, nullptr, nullptr);

    LLMPlanningSystem::getInstance().shutdown();
    WorldUpdateLoop::getInstance().stop();

    napi_value result;
    napi_get_boolean(env, true, &result);
    return result;
}

static napi_value Init(napi_env env, napi_value exports) {
    napi_value fn;

    napi_create_function(env, "initialize", NAPI_AUTO_LENGTH, Initialize, nullptr, &fn);
    napi_set_named_property(env, exports, "initialize", fn);

    napi_create_function(env, "createNPCs", NAPI_AUTO_LENGTH, CreateNPCs, nullptr, &fn);
    napi_set_named_property(env, exports, "createNPCs", fn);

    napi_create_function(env, "updateFrame", NAPI_AUTO_LENGTH, UpdateFrame, nullptr, &fn);
    napi_set_named_property(env, exports, "updateFrame", fn);

    napi_create_function(env, "getAllNPCStates", NAPI_AUTO_LENGTH, GetAllNPCStates, nullptr, &fn);
    napi_set_named_property(env, exports, "getAllNPCStates", fn);

    napi_create_function(env, "getNearbyNPCStates", NAPI_AUTO_LENGTH, GetNearbyNPCStates, nullptr, &fn);
    napi_set_named_property(env, exports, "getNearbyNPCStates", fn);

    napi_create_function(env, "getStats", NAPI_AUTO_LENGTH, GetStats, nullptr, &fn);
    napi_set_named_property(env, exports, "getStats", fn);

    napi_create_function(env, "stop", NAPI_AUTO_LENGTH, Stop, nullptr, &fn);
    napi_set_named_property(env, exports, "stop", fn);

    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
