#pragma once
#include "ExecuteDescriptor.h"
#include <cmath>

static void exec_refuseCommand(ExecuteContext& ctx) {
    auto* pos = ctx.getPosition();
    if (!pos) return;
    pos->x += (exec_random01() * 2.0f - 1.0f) * pos->speed * 0.3f * ctx.deltaTime / 1000.0f;
    pos->y += (exec_random01() * 2.0f - 1.0f) * pos->speed * 0.3f * ctx.deltaTime / 1000.0f;
}
static void exec_coordinateSquad(ExecuteContext& ctx) {
    auto* pos = ctx.getPosition();
    if (!pos) return;
    pos->x += (exec_random01() * 2.0f - 1.0f) * pos->speed * 0.1f * ctx.deltaTime / 1000.0f;
    pos->y += (exec_random01() * 2.0f - 1.0f) * pos->speed * 0.1f * ctx.deltaTime / 1000.0f;
}

constexpr ExecuteDescriptor kCommandTable[] = {
    {NPCActivity::RefuseCommand,    "RefuseCommand",     ActivityCategory::Command, REQ_POSITION, exec_refuseCommand},
    {NPCActivity::CoordinateSquad,  "CoordinateSquad",   ActivityCategory::Command, REQ_POSITION, exec_coordinateSquad},
};
