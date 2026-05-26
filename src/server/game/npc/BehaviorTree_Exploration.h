#pragma once
#include "ExecuteDescriptor.h"

static bool canExecute_explore(ExecuteContext& ctx) {
    auto* pos = ctx.getPosition();
    return pos != nullptr;
}
static bool canExecute_treasureHunt(ExecuteContext& ctx) {
    auto* pos = ctx.getPosition();
    return pos != nullptr;
}
static bool canExecute_mapExplore(ExecuteContext& ctx) {
    auto* pos = ctx.getPosition();
    return pos != nullptr;
}

static void exec_explore(ExecuteContext& ctx) {
    auto* pos = ctx.getPosition();
    auto* behavior = ctx.getBehavior();
    if (!pos) return;
    if (pos->hasReachedTarget(5.0f)) {
        pos->moveTo(pos->x + exec_randRange(-500,500), pos->y + exec_randRange(-500,500));
        if (behavior) {
            bool found = (exec_random01() < 0.3f);
            int8_t score = found ? 5 : -3;
            behavior->reflection.recordResult(NPCActivity::Explore, score);
        }
    }
}
static void exec_treasureHunt(ExecuteContext& ctx) {
    auto* pos = ctx.getPosition();
    auto* behavior = ctx.getBehavior();
    if (!pos) return;
    if (pos->hasReachedTarget(3.0f)) {
        pos->moveTo(pos->x + exec_randRange(-200,200), pos->y + exec_randRange(-200,200));
        if (behavior) {
            bool found = (exec_random01() < 0.3f);
            int8_t score = found ? 5 : -3;
            behavior->reflection.recordResult(NPCActivity::TreasureHunt, score);
        }
    }
}
static void exec_mapExplore(ExecuteContext& ctx) {
    auto* pos = ctx.getPosition();
    auto* behavior = ctx.getBehavior();
    if (!pos) return;
    if (pos->hasReachedTarget(2.0f)) {
        pos->moveTo(pos->x + exec_randRange(-1000,1000), pos->y + exec_randRange(-1000,1000));
        if (behavior) {
            bool found = (exec_random01() < 0.3f);
            int8_t score = found ? 5 : -3;
            behavior->reflection.recordResult(NPCActivity::MapExplore, score);
        }
    }
}

constexpr ExecuteDescriptor kExplorationTable[] = {
    {NPCActivity::Explore,      "Explore",       ActivityCategory::Exploration, REQ_POSITION, exec_explore, canExecute_explore},
    {NPCActivity::TreasureHunt, "TreasureHunt",  ActivityCategory::Exploration, REQ_POSITION, exec_treasureHunt, canExecute_treasureHunt},
    {NPCActivity::MapExplore,   "MapExplore",    ActivityCategory::Exploration, REQ_POSITION, exec_mapExplore, canExecute_mapExplore},
};
