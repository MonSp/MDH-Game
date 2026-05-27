#pragma once
#include "CommodityPool.h"
#include <cstdint>

namespace ItemId {
    static constexpr uint32_t NONE            = 0;
    static constexpr uint32_t ORE             = 1;
    static constexpr uint32_t FOOD            = 2;
    static constexpr uint32_t MATERIALS       = 3;
    static constexpr uint32_t PILLS           = 4;
    static constexpr uint32_t EQUIPMENT       = 5;
    static constexpr uint32_t QI_REFINING_PILL = 6;
    static constexpr uint32_t FOUNDATION_PILL = 7;
    static constexpr uint32_t WASH_MARROW_PILL = 8;
    static constexpr uint32_t LOW_GRADE_ARTIFACT = 9;
    static constexpr uint32_t MID_GRADE_ARTIFACT = 10;
    static constexpr uint32_t SPIRIT_GATHERING_POWDER = 11;
    static constexpr uint32_t ASCENSION_TOKEN = 12;
    static constexpr uint32_t SPIRIT_HERB     = 13;
    static constexpr uint32_t SPIRIT_STONE_FRAGMENT = 14;
    static constexpr uint32_t MONSTER_MATERIAL = 15;
    static constexpr uint32_t COUNT           = 16;
};

static constexpr const char* ItemNames[] = {
    "无",
    "矿石",
    "食物",
    "材料",
    "丹药",
    "装备",
    "练气丹",
    "筑基丹",
    "洗髓丹",
    "低级法器",
    "中级法器",
    "聚气散",
    "飞升令",
    "灵草",
    "灵石碎片",
    "妖兽材料",
};

static constexpr int32_t ItemBaseValues[] = {
    0,      // 无
    5,      // 矿石
    3,      // 食物
    4,      // 材料
    80,     // 丹药
    40,     // 装备
    100,    // 练气丹
    1000,   // 筑基丹
    500,    // 洗髓丹
    200,    // 低级法器
    800,    // 中级法器
    100,    // 聚气散
    10000,  // 飞升令
    50,     // 灵草
    10,     // 灵石碎片
    150,    // 妖兽材料
};

static_assert(sizeof(ItemNames) / sizeof(ItemNames[0]) == ItemId::COUNT,
    "ItemNames count must match ItemId::COUNT");
static_assert(sizeof(ItemBaseValues) / sizeof(ItemBaseValues[0]) == ItemId::COUNT,
    "ItemBaseValues count must match ItemId::COUNT");

class ItemRegistry {
public:
    static const char* getName(uint32_t itemId) {
        if (itemId < ItemId::COUNT) return ItemNames[itemId];
        return "未知";
    }

    static int32_t getBaseValue(uint32_t itemId) {
        if (itemId < ItemId::COUNT) return ItemBaseValues[itemId];
        return 0;
    }

    static uint32_t commodityToItem(CommodityType ct) {
        switch (ct) {
            case CommodityType::Ore:          return ItemId::ORE;
            case CommodityType::Food:         return ItemId::FOOD;
            case CommodityType::Equipment:    return ItemId::EQUIPMENT;
            case CommodityType::Materials:    return ItemId::MATERIALS;
            case CommodityType::Pills:        return ItemId::PILLS;
            case CommodityType::SpiritStones: return ItemId::NONE;
            default: return ItemId::NONE;
        }
    }
};
