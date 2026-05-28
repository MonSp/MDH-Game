#include "game/ecs/systems/WorldUpdateLoop.h"
#include "game/ecs/Registry.h"
#include "game/ecs/components/IdentityComponent.h"
#include "game/ecs/components/StatsComponent.h"
#include "game/ecs/components/BehaviorComponent.h"
#include "game/ecs/components/PersonalityComponent.h"
#include "game/ecs/components/ResourcesComponent.h"
#include "game/ecs/components/SocialComponent.h"
#include "game/ecs/components/LifecycleComponent.h"
#include "game/ecs/components/PositionComponent.h"
#include "game/ecs/components/RelationshipComponent.h"
#include "game/npc/NPCCreationSystem.h"
#include "game/npc/NPCInteractionSystem.h"
#include "game/economy/MarketRegistry.h"
#include "game/economy/PriceEngine.h"
#include "game/economy/CaravanSystem.h"
#include "game/economy/EconomicDigest.h"
#include <iostream>
#include <iomanip>
#include <chrono>
#include <map>
#include <vector>
#include <string>
#include <algorithm>
#include <cstring>
#include <cmath>
#include <random>

static const char* ACTIVITY_NAMES[] = {
    "Idle", "Dead",
    "Flee", "Heal", "Defend",
    "Eat", "Rest", "Sleep", "Walk", "Chat", "AwaitOrders",
    "Cultivate", "Breakthrough", "Tribulation", "Meditate", "Alchemy", "SeekFortune",
    "VisitFriend", "Date", "FamilyGathering", "MentorTeach", "DiscipleAsk", "Trade",
    "Gossip", "ReportTask", "SocialHelp",
    "Build", "Mine", "Farm", "Fish", "Lumber", "Gather", "Craft", "Refine", "Cook",
    "Tailor", "Construct", "Repair", "Sell", "Buy", "Bargain",
    "Duel", "Hunt", "Ambush", "Assassinate", "Attack", "DefendPosition",
    "Patrol", "Escort", "Scout",
    "Explore", "TreasureHunt", "MapExplore",
    "RefuseCommand", "CoordinateSquad",
    "SetTaxRate", "TradeEmbargo", "StockpileMaterial", "PriceStabilize", "EconomicMobilize",
    "Incapacitated"
};

static const char* COMMODITY_NAMES[] = { "矿石", "食物", "装备", "材料", "丹药", "灵石" };
static const char* POSTURE_NAMES[] = { "盈馀", "平衡", "紧张", "危机" };

struct NationConfig {
    std::string name;
    std::vector<std::string> clanIds;
    float xCenter, yCenter;
    int64_t baseSupply[6];
    int64_t baseDemand[6];
    float taxRate;
};

static std::vector<NationConfig> createWorldConfig() {
    std::vector<NationConfig> nations;

    NationConfig qin;
    qin.name = "Qin";
    qin.clanIds = {"Qin_Royal", "Qin_Military", "Qin_Trade"};
    qin.xCenter = -300.0f; qin.yCenter = -300.0f;
    qin.baseSupply[0] = 200; qin.baseSupply[1] = 150; qin.baseSupply[2] = 100;
    qin.baseSupply[3] = 120; qin.baseSupply[4] = 50; qin.baseSupply[5] = 300;
    qin.baseDemand[0] = 80; qin.baseDemand[1] = 120; qin.baseDemand[2] = 150;
    qin.baseDemand[3] = 90; qin.baseDemand[4] = 120; qin.baseDemand[5] = 100;
    qin.taxRate = 0.06f;
    nations.push_back(qin);

    NationConfig chu;
    chu.name = "Chu";
    chu.clanIds = {"Chu_Royal", "Chu_Spirit", "Chu_Forest"};
    chu.xCenter = 300.0f; chu.yCenter = -300.0f;
    chu.baseSupply[0] = 100; chu.baseSupply[1] = 250; chu.baseSupply[2] = 60;
    chu.baseSupply[3] = 200; chu.baseSupply[4] = 80; chu.baseSupply[5] = 200;
    chu.baseDemand[0] = 150; chu.baseDemand[1] = 80; chu.baseDemand[2] = 130;
    chu.baseDemand[3] = 70; chu.baseDemand[4] = 100; chu.baseDemand[5] = 150;
    chu.taxRate = 0.05f;
    nations.push_back(chu);

    NationConfig qi;
    qi.name = "Qi";
    qi.clanIds = {"Qi_Royal", "Qi_Merchant", "Qi_Craft"};
    qi.xCenter = -300.0f; qi.yCenter = 300.0f;
    qi.baseSupply[0] = 120; qi.baseSupply[1] = 180; qi.baseSupply[2] = 180;
    qi.baseSupply[3] = 100; qi.baseSupply[4] = 70; qi.baseSupply[5] = 250;
    qi.baseDemand[0] = 130; qi.baseDemand[1] = 100; qi.baseDemand[2] = 80;
    qi.baseDemand[3] = 140; qi.baseDemand[4] = 110; qi.baseDemand[5] = 120;
    qi.taxRate = 0.07f;
    nations.push_back(qi);

    NationConfig yan;
    yan.name = "Yan";
    yan.clanIds = {"Yan_Royal", "Yan_Warrior", "Yan_Hermit"};
    yan.xCenter = 300.0f; yan.yCenter = 300.0f;
    yan.baseSupply[0] = 180; yan.baseSupply[1] = 100; yan.baseSupply[2] = 80;
    yan.baseSupply[3] = 150; yan.baseSupply[4] = 90; yan.baseSupply[5] = 180;
    yan.baseDemand[0] = 70; yan.baseDemand[1] = 160; yan.baseDemand[2] = 120;
    yan.baseDemand[3] = 80; yan.baseDemand[4] = 130; yan.baseDemand[5] = 100;
    yan.taxRate = 0.04f;
    nations.push_back(yan);

    return nations;
}

static std::vector<std::string> getAllClanIds(const std::vector<NationConfig>& nations) {
    std::vector<std::string> result;
    for (auto& n : nations) {
        for (auto& c : n.clanIds) {
            result.push_back(c);
        }
    }
    return result;
}

struct SimSnapshot {
    int frame;
    double timeMs;
    int activeNPCs;
    std::map<int, int> activityDist;
    std::map<std::string, std::map<int, float>> prices;
    std::map<std::string, int64_t> treasury;
    std::map<std::string, std::map<int, int64_t>> supply;
    std::map<std::string, std::map<int, int64_t>> demand;
    int caravanTrips;
    double avgAffinity;
};

struct SimReport {
    std::vector<SimSnapshot> snapshots;
    std::vector<std::string> anomalies;
    int totalFrames;
    double totalDurationMs;
};

static const char* activityName(int code) {
    if (code >= 0 && code < (int)(sizeof(ACTIVITY_NAMES)/sizeof(ACTIVITY_NAMES[0])))
        return ACTIVITY_NAMES[code];
    return "Unknown";
}

static void collectSnapshot(SimReport& report, int frame, double timeMs,
                           const std::vector<std::string>& clanIds) {
    auto& reg = ECS::Registry::getInstance();
    auto& mkt = MarketRegistry::getInstance();

    SimSnapshot snap;
    snap.frame = frame;
    snap.timeMs = timeMs;
    snap.activeNPCs = 0;
    snap.caravanTrips = 0;
    snap.avgAffinity = 0.0;

    int affinitySum = 0;
    int affinityCount = 0;

    auto entities = reg.getEntitiesWithComponent<IdentityComponent>();
    for (auto id : entities) {
        auto* lifecycle = reg.getComponent<LifecycleComponent>(id);
        if (!lifecycle || lifecycle->lifeState != NPCLifeState::Active) continue;
        snap.activeNPCs++;

        auto* behavior = reg.getComponent<BehaviorComponent>(id);
        if (behavior) {
            int act = static_cast<int>(behavior->currentActivity);
            snap.activityDist[act]++;
        }

        auto* stats = reg.getComponent<StatsComponent>(id);
        if (stats) {
            if (stats->hp < 0 || !std::isfinite((float)stats->hp)) {
                report.anomalies.push_back("[Frame " + std::to_string(frame) +
                    "] NPC HP异常: " + std::to_string(stats->hp));
            }
        }

        auto* resources = reg.getComponent<ResourcesComponent>(id);
        if (resources && resources->spiritStones < 0) {
            report.anomalies.push_back("[Frame " + std::to_string(frame) +
                "] NPC灵石为负: " + std::to_string(resources->spiritStones));
        }

        auto* rel = reg.getComponent<RelationshipComponent>(id);
        if (rel) {
            uint32_t slots[10];
            int8_t affs[10];
            int n = rel->getTopRelationships(slots, affs, 5);
            for (int i = 0; i < n; i++) {
                affinitySum += affs[i];
                affinityCount++;
            }
        }
    }

    snap.avgAffinity = (affinityCount > 0) ? (double)affinitySum / affinityCount : 0.0;

    for (auto& clanId : clanIds) {
        snap.treasury[clanId] = mkt.getTreasury(clanId);
        for (int ct = 0; ct < 6; ct++) {
            snap.prices[clanId][ct] = mkt.getMarketPrice(clanId, static_cast<CommodityType>(ct));
            const CommodityPool* pool = mkt.getPool(clanId);
            if (pool) {
                snap.supply[clanId][ct] = pool->supply[ct];
                snap.demand[clanId][ct] = pool->demand[ct];
            }
        }
    }

    report.snapshots.push_back(snap);
}

static void printSnapshot(const SimSnapshot& snap, const std::vector<NationConfig>& nations) {
    std::cout << "\n=== Frame " << snap.frame << " | Time: " << std::fixed << std::setprecision(1)
              << snap.timeMs << "ms | Active NPCs: " << snap.activeNPCs << " ===" << std::endl;

    std::cout << "  行为分布: ";
    std::vector<std::pair<int,int>> sorted(snap.activityDist.begin(), snap.activityDist.end());
    std::sort(sorted.begin(), sorted.end(), [](auto& a, auto& b) { return a.second > b.second; });
    for (auto& [act, count] : sorted) {
        std::cout << activityName(act) << "=" << count << " ";
    }
    std::cout << std::endl;

    for (auto& nation : nations) {
        std::cout << "\n  [" << nation.name << "]" << std::endl;

        std::cout << "    国库: ";
        for (auto& clanId : nation.clanIds) {
            std::cout << clanId << "=" << snap.treasury.at(clanId) << " ";
        }
        std::cout << std::endl;

        std::cout << "    价格 (矿/食/装/材/丹/石):" << std::endl;
        for (auto& clanId : nation.clanIds) {
            std::cout << "      " << clanId << ": ";
            for (int ct = 0; ct < 6; ct++) {
                std::cout << std::fixed << std::setprecision(1) << snap.prices.at(clanId).at(ct);
                if (ct < 5) std::cout << "/";
            }
            std::cout << std::endl;
        }

        std::cout << "    供需 (矿石):" << std::endl;
        for (auto& clanId : nation.clanIds) {
            std::cout << "      " << clanId << ": supply=" << snap.supply.at(clanId).at(0)
                      << " demand=" << snap.demand.at(clanId).at(0) << std::endl;
        }
    }
}

int main(int argc, char* argv[]) {
    int npcPerClan = 30;
    int totalFrames = 1000;
    int snapshotInterval = 200;
    uint32_t threadCount = 4;

    if (argc > 1) npcPerClan = std::atoi(argv[1]);
    if (argc > 2) totalFrames = std::atoi(argv[2]);
    if (argc > 3) snapshotInterval = std::atoi(argv[3]);
    if (argc > 4) threadCount = std::atoi(argv[4]);

    auto nations = createWorldConfig();
    auto clanIds = getAllClanIds(nations);
    int totalNPCs = npcPerClan * static_cast<int>(clanIds.size());

    std::cout << "========================================" << std::endl;
    std::cout << "  多国家多家族宏观经济模拟" << std::endl;
    std::cout << "========================================" << std::endl;
    std::cout << "国家数: " << nations.size() << std::endl;
    std::cout << "家族数: " << clanIds.size() << std::endl;
    std::cout << "每家族NPC: " << npcPerClan << std::endl;
    std::cout << "总NPC数: " << totalNPCs << std::endl;
    std::cout << "模拟帧数: " << totalFrames << std::endl;
    std::cout << "线程数: " << threadCount << std::endl;
    std::cout << std::endl;

    std::cout << "[1/4] 初始化 ECS 引擎..." << std::endl;
    WorldUpdateLoop::getInstance().initialize(threadCount);

    std::cout << "[2/4] 创建多国家NPC..." << std::endl;
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_real_distribution<float> posDist(-50.0f, 50.0f);
    std::vector<NPCRole> roles = {
        NPCRole::BranchDisciple, NPCRole::InnerDisciple,
        NPCRole::CoreDisciple, NPCRole::Elder, NPCRole::FamilyHead
    };

    int npcIndex = 0;
    for (auto& nation : nations) {
        for (auto& clanId : nation.clanIds) {
            for (int i = 0; i < npcPerClan; i++) {
                std::string id = "npc_" + clanId + "_" + std::to_string(i);
                std::string name = nation.name + "_" + std::to_string(i);
                NPCRole role = roles[i % roles.size()];
                float x = nation.xCenter + posDist(gen);
                float y = nation.yCenter + posDist(gen);

                NPCCreationSystem::getInstance().createNPC(
                    id, name, clanId, nation.name, role,
                    RealmLevel::Mortal, 9, x, y
                );
                npcIndex++;
            }
            std::cout << "  " << clanId << ": " << npcPerClan << " NPC" << std::endl;
        }
    }
    std::cout << "  总计创建: " << NPCCreationSystem::getInstance().getNPCCount() << " NPC" << std::endl;

    std::cout << "[3/4] 配置差异化经济系统..." << std::endl;
    auto& mkt = MarketRegistry::getInstance();
    for (auto& nation : nations) {
        for (size_t ci = 0; ci < nation.clanIds.size(); ci++) {
            auto& clanId = nation.clanIds[ci];
            auto& pool = mkt.getOrCreatePool(clanId);

            for (int ct = 0; ct < 6; ct++) {
                float clanVariance = 0.8f + (ci * 0.2f);
                pool.supply[ct] = static_cast<int64_t>(nation.baseSupply[ct] * clanVariance);
                pool.demand[ct] = static_cast<int64_t>(nation.baseDemand[ct] * clanVariance);
            }

            mkt.applyTaxRate(clanId, nation.taxRate);
        }
        std::cout << "  " << nation.name << ": " << nation.clanIds.size()
                  << " 家族, 税率=" << std::fixed << std::setprecision(2) << nation.taxRate << std::endl;
    }

    std::cout << "[4/4] 开始模拟..." << std::endl;
    std::cout << "========================================" << std::endl;

    SimReport report;
    report.totalFrames = totalFrames;

    auto simStart = std::chrono::high_resolution_clock::now();

    collectSnapshot(report, 0, 0.0, clanIds);
    printSnapshot(report.snapshots.back(), nations);

    for (int frame = 1; frame <= totalFrames; frame++) {
        WorldUpdateLoop::getInstance().updateOnce();

        if (frame % snapshotInterval == 0 || frame == totalFrames) {
            auto now = std::chrono::high_resolution_clock::now();
            double elapsed = std::chrono::duration<double, std::milli>(now - simStart).count();
            collectSnapshot(report, frame, elapsed, clanIds);
            printSnapshot(report.snapshots.back(), nations);
        }

        if (frame % 100 == 0) {
            auto& caravan = CaravanSystem::getInstance();
            int trips = 0;
            for (auto& clanId : clanIds) {
                auto route = caravan.findBestRoute(clanId, frame);
                if (route.margin > 0.15f) {
                    if (caravan.executeRoute(route, frame)) {
                        trips++;
                    }
                }
            }
            if (!report.snapshots.empty()) {
                report.snapshots.back().caravanTrips += trips;
            }
        }

        if (frame % 300 == 0) {
            mkt.tickDecay(frame);
        }
    }

    auto simEnd = std::chrono::high_resolution_clock::now();
    report.totalDurationMs = std::chrono::duration<double, std::milli>(simEnd - simStart).count();

    std::cout << "\n========================================" << std::endl;
    std::cout << "  模拟完成 — 宏观经济报告" << std::endl;
    std::cout << "========================================" << std::endl;
    std::cout << "总帧数: " << totalFrames << std::endl;
    std::cout << "总耗时: " << std::fixed << std::setprecision(1) << report.totalDurationMs << "ms" << std::endl;
    std::cout << "平均帧时间: " << std::fixed << std::setprecision(2)
              << (report.totalDurationMs / totalFrames) << "ms" << std::endl;

    if (report.snapshots.size() >= 2) {
        auto& first = report.snapshots.front();
        auto& last = report.snapshots.back();

        std::cout << "\n--- 国家间价格对比 (最终) ---" << std::endl;
        std::cout << std::left << std::setw(15) << "国家/家族";
        for (int ct = 0; ct < 6; ct++) {
            std::cout << std::setw(10) << COMMODITY_NAMES[ct];
        }
        std::cout << std::endl;

        for (auto& nation : nations) {
            for (auto& clanId : nation.clanIds) {
                std::cout << std::left << std::setw(15) << clanId;
                for (int ct = 0; ct < 6; ct++) {
                    std::cout << std::fixed << std::setprecision(1) << std::setw(10)
                              << last.prices[clanId][ct];
                }
                std::cout << std::endl;
            }
        }

        std::cout << "\n--- 价格变化趋势 (矿石) ---" << std::endl;
        for (auto& nation : nations) {
            std::cout << "  " << nation.name << ":" << std::endl;
            for (auto& clanId : nation.clanIds) {
                float p0 = first.prices[clanId][0];
                float p1 = last.prices[clanId][0];
                float change = (p1 - p0) / p0 * 100;
                std::cout << "    " << clanId << ": " << std::fixed << std::setprecision(1)
                          << p0 << " -> " << p1
                          << " (" << (change >= 0 ? "+" : "") << change << "%)" << std::endl;
            }
        }

        std::cout << "\n--- 国库变化 ---" << std::endl;
        for (auto& nation : nations) {
            std::cout << "  " << nation.name << ":" << std::endl;
            for (auto& clanId : nation.clanIds) {
                std::cout << "    " << clanId << ": " << first.treasury[clanId]
                          << " -> " << last.treasury[clanId] << std::endl;
            }
        }

        std::cout << "\n--- 经济态势摘要 ---" << std::endl;
        for (auto& clanId : clanIds) {
            const auto& digest = mkt.getEconomicDigest(clanId, totalFrames);
            std::cout << "  " << clanId << ": 态势=" << POSTURE_NAMES[static_cast<int>(digest.posture)]
                      << " 国库=" << digest.treasuryBalance;
            if (digest.alerts[0].desc[0] != '\0') {
                std::cout << " 警报=" << digest.alerts[0].desc;
            }
            std::cout << std::endl;
        }

        std::cout << "\n--- 商队贸易统计 ---" << std::endl;
        int totalCaravans = 0;
        for (auto& snap : report.snapshots) {
            totalCaravans += snap.caravanTrips;
        }
        std::cout << "  总商队次数: " << totalCaravans << std::endl;
    }

    if (!report.anomalies.empty()) {
        std::cout << "\n--- 异常检测 ---" << std::endl;
        for (auto& a : report.anomalies) {
            std::cout << "  ⚠ " << a << std::endl;
        }
    } else {
        std::cout << "\n✓ 无异常检测" << std::endl;
    }

    std::cout << "\n========================================" << std::endl;
    std::cout << "  模拟参数: " << totalNPCs << " NPC, "
              << nations.size() << " 国家, " << clanIds.size() << " 家族" << std::endl;
    std::cout << "========================================" << std::endl;

    WorldUpdateLoop::getInstance().stop();

    return report.anomalies.empty() ? 0 : 1;
}
