#pragma once

// agent-kernel: Reusable C++ ECS engine for MDH-Company and MDH-Game
//
// Core ECS layer:
//   - Registry  — entity management (slot-based, 100K+ entity capacity)
//   - Entity    — lightweight handle (uint64_t)
//   - Component — CRTP base class with auto TypeId
//   - Archetype — component combination signature
//   - EventStringPool — fixed-size event string pool

#include "ecs/Component.h"
#include "ecs/Entity.h"
#include "ecs/Archetype.h"
#include "ecs/Registry.h"
#include "ecs/EventStringPool.h"
