#pragma once
#include "ExecuteDescriptor.h"
#include "../economy/MarketRegistry.h"
#include "../ecs/components/IdentityComponent.h"
#include "../ecs/components/ResourcesComponent.h"
#include "../ecs/components/BehaviorComponent.h"
#include "../ecs/components/PersonalityComponent.h"
#include "../ecs/Registry.h"
#include <cmath>

static bool canExecute_setTaxRate(ExecuteContext& ctx) {
    auto* identity = ctx.getIdentity();
    return identity && identity->layer <= 0;
}

static bool canExecute_tradeEmbargo(ExecuteContext& ctx) {
    auto* identity = ctx.getIdentity();
    return identity && identity->layer <= 0;
}

static bool canExecute_stockpileMaterial(ExecuteContext& ctx) {
    auto* identity = ctx.getIdentity();
    return identity && identity->layer <= 1;
}

static bool canExecute_priceStabilize(ExecuteContext& ctx) {
    auto* identity = ctx.getIdentity();
    return identity && identity->layer <= 1;
}

static bool canExecute_economicMobilize(ExecuteContext& ctx) {
    auto* identity = ctx.getIdentity();
    return identity && identity->layer <= 2;
}

static void exec_setTaxRate(ExecuteContext& ctx) {
    auto* identity = ctx.getIdentity();
    if (!identity || identity->clanId.empty()) return;

    auto& mkt = MarketRegistry::getInstance();
    const EconomicDigest& digest = mkt.getEconomicDigest(identity->clanId, ctx.currentTime);

    float baseRate = 0.05f;
    switch (digest.posture) {
        case EconomicPosture::Crisis:   baseRate = 0.12f; break;
        case EconomicPosture::Tight:    baseRate = 0.08f; break;
        case EconomicPosture::Balanced: baseRate = 0.05f; break;
        case EconomicPosture::Surplus:  baseRate = 0.03f; break;
    }

    auto* personality = ctx.getBehavior();
    (void)personality;

    auto* reg = &ctx.reg();
    auto* persComp = reg->getComponent<PersonalityComponent>(ctx.entityId);
    if (persComp) {
        if (persComp->greed > 70.0f) baseRate += 0.03f;
        if (persComp->ambition > 70.0f) baseRate += 0.02f;
    }

    if (baseRate < 0.01f) baseRate = 0.01f;
    if (baseRate > 0.15f) baseRate = 0.15f;

    mkt.applyTaxRate(identity->clanId, baseRate);
}

static void exec_tradeEmbargo(ExecuteContext& ctx) {
    auto* identity = ctx.getIdentity();
    if (!identity || identity->clanId.empty()) return;

    auto& mkt = MarketRegistry::getInstance();
    const auto& allPools = mkt.allPools();
    for (const auto& pair : allPools) {
        if (pair.first != identity->clanId && !mkt.isEmbargoed(identity->clanId, pair.first)) {
            mkt.applyEmbargo(identity->clanId, pair.first, true);
            break;
        }
    }
}

static void exec_stockpileMaterial(ExecuteContext& ctx) {
    auto* identity = ctx.getIdentity();
    if (!identity || identity->clanId.empty()) return;

    auto& mkt = MarketRegistry::getInstance();
    const EconomicDigest& digest = mkt.getEconomicDigest(identity->clanId, ctx.currentTime);

    CommodityType targetType = CommodityType::Ore;
    float maxRatio = 0.0f;
    for (int i = 0; i < 3; i++) {
        if (digest.alerts[i].priceRatio > maxRatio) {
            maxRatio = digest.alerts[i].priceRatio;
            targetType = digest.alerts[i].commodityType;
        }
    }

    mkt.applyStockpile(identity->clanId, targetType, 0.3f);
}

static void exec_priceStabilize(ExecuteContext& ctx) {
    auto* identity = ctx.getIdentity();
    if (!identity || identity->clanId.empty()) return;

    auto& mkt = MarketRegistry::getInstance();
    const EconomicDigest& digest = mkt.getEconomicDigest(identity->clanId, ctx.currentTime);

    CommodityType targetType = CommodityType::Ore;
    float maxRatio = 0.0f;
    for (int i = 0; i < 3; i++) {
        if (digest.alerts[i].priceRatio > maxRatio) {
            maxRatio = digest.alerts[i].priceRatio;
            targetType = digest.alerts[i].commodityType;
        }
    }

    int64_t treasury = mkt.getTreasury(identity->clanId);
    int64_t maxSpend = treasury / 3;
    if (maxSpend > 300) maxSpend = 300;
    if (maxSpend <= 0) return;

    auto& pool = mkt.getOrCreatePool(identity->clanId);
    float price = PriceEngine::getPrice(pool, targetType);
    float basePrice = CommodityBasePrice[static_cast<uint8_t>(targetType)];

    if (price > basePrice) {
        int64_t buyAmount = static_cast<int64_t>(maxSpend / (price * 1.2f));
        if (buyAmount > 0) {
            mkt.spendTreasury(identity->clanId, static_cast<int64_t>(buyAmount * price * 1.2f));
            pool.addSupply(targetType, buyAmount);
        }
    } else if (price < basePrice * 0.8f) {
        int64_t sellAmount = static_cast<int64_t>(maxSpend / price);
        if (sellAmount > 0) {
            int64_t income = static_cast<int64_t>(sellAmount * price * 0.8f);
            mkt.collectTax(identity->clanId, income);
            pool.addDemand(targetType, sellAmount);
        }
    }
}

static void exec_economicMobilize(ExecuteContext& ctx) {
    auto* identity = ctx.getIdentity();
    if (!identity || identity->clanId.empty()) return;

    auto& mkt = MarketRegistry::getInstance();
    const EconomicDigest& digest = mkt.getEconomicDigest(identity->clanId, ctx.currentTime);

    CommodityType targetType = CommodityType::Ore;
    float maxRatio = 0.0f;
    for (int i = 0; i < 3; i++) {
        if (digest.alerts[i].priceRatio > maxRatio) {
            maxRatio = digest.alerts[i].priceRatio;
            targetType = digest.alerts[i].commodityType;
        }
    }

    NPCActivity mobilizeActivity = NPCActivity::Mine;
    switch (targetType) {
        case CommodityType::Ore:          mobilizeActivity = NPCActivity::Mine; break;
        case CommodityType::Food:         mobilizeActivity = NPCActivity::Farm; break;
        case CommodityType::Equipment:    mobilizeActivity = NPCActivity::Craft; break;
        case CommodityType::Materials:    mobilizeActivity = NPCActivity::Lumber; break;
        case CommodityType::Pills:        mobilizeActivity = NPCActivity::Alchemy; break;
        case CommodityType::SpiritStones: mobilizeActivity = NPCActivity::Mine; break;
        default: break;
    }

    auto& registry = ECS::Registry::getInstance();
    auto entities = registry.getEntitiesWithComponent<IdentityComponent>();
    uint64_t expireFrame = ctx.currentTime + 300;

    for (auto id : entities) {
        auto* otherIdentity = registry.getComponent<IdentityComponent>(id);
        if (!otherIdentity || otherIdentity->clanId != identity->clanId) continue;

        auto* behavior = registry.getComponent<BehaviorComponent>(id);
        if (behavior) {
            behavior->reflection.setTemporaryBoost(mobilizeActivity, 0.5f, expireFrame);
        }
    }
}
