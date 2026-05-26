#pragma once
#include "ExecuteDescriptor.h"

static void exec_explore(ExecuteContext& ctx) {
    auto* pos = ctx.getPosition();
    if (!pos) return;
    if (pos->hasReachedTarget(5.0f)) pos->moveTo(pos->x + exec_randRange(-500,500), pos->y + exec_randRange(-500,500));
}
static void exec_treasureHunt(ExecuteContext& ctx) {
    auto* pos = ctx.getPosition();
    if (!pos) return;
    if (pos->hasReachedTarget(3.0f)) pos->moveTo(pos->x + exec_randRange(-200,200), pos->y + exec_randRange(-200,200));
}
static void exec_mapExplore(ExecuteContext& ctx) {
    auto* pos = ctx.getPosition();
    if (!pos) return;
    if (pos->hasReachedTarget(2.0f)) pos->moveTo(pos->x + exec_randRange(-1000,1000), pos->y + exec_randRange(-1000,1000));
}

constexpr ExecuteDescriptor kExplorationTable[] = {
    {NPCActivity::Explore,      "Explore",       ActivityCategory::Exploration, REQ_POSITION, exec_explore},
    {NPCActivity::TreasureHunt, "TreasureHunt",  ActivityCategory::Exploration, REQ_POSITION, exec_treasureHunt},
    {NPCActivity::MapExplore,   "MapExplore",    ActivityCategory::Exploration, REQ_POSITION, exec_mapExplore},
};
