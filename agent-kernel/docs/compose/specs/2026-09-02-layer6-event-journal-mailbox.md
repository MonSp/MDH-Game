# Layer 6: EventJournal + AgentMailbox — Agent Communication Primitives

**Status**: draft
**Date**: 2026-09-02
**Scope**: agent-kernel `src/ecs/systems/`
**Depends on**: L1-L5 (Schema, Dynamic Storage, Ontology, LLM, Agent Tick)

---

## [S1] Problem

The agent-kernel has no mechanism for agent-to-agent communication or event history. When multiple agents operate in the same Registry (e.g., a team simulation), they cannot exchange messages or see each other's events. The DSH architecture analysis showed that durable mailbox and event journal are critical for multi-agent coordination.

Currently:
- Agent decisions and effects are applied but not recorded as queryable events
- No way for Agent A to send a message to Agent B through the kernel
- Company/Game must implement their own persistence and messaging independently
- No event sourcing — state changes are in-place mutations with no history

## [S2] Solution Overview

Add two lightweight primitives to `src/ecs/systems/`:

1. **EventJournal** — append-only event log (in-memory ring buffer)
2. **AgentMailbox** — per-entity message queue (FIFO with delivery tracking)

These are kernel-level primitives (in-memory, no persistence). Application layers (Company/Game) are responsible for persisting events and messages via their own storage (SQLite, files, etc.).

## [S3] EventJournal

### Data Model

```cpp
struct JournalEvent {
    uint64_t id;              // monotonic, auto-incremented
    uint64_t timestamp;       // milliseconds since epoch
    ECS::EntityId entity_id;  // which entity this event belongs to
    std::string event_type;   // "xp_granted", "decision_made", "tick_completed", "message_sent"...
    std::string payload;      // JSON string with event-specific data
};
```

### Interface

```cpp
class EventJournal {
public:
    explicit EventJournal(size_t max_capacity = 10000);

    // Append an event. Returns the assigned event ID.
    uint64_t append(ECS::EntityId entity_id, const std::string& event_type,
                    const std::string& payload);

    // Query events for a specific entity, optionally filtered by minimum event ID.
    std::vector<JournalEvent> query(ECS::EntityId entity_id, uint64_t since_id = 0) const;

    // Query all events, optionally filtered by minimum event ID.
    std::vector<JournalEvent> queryAll(uint64_t since_id = 0) const;

    // Get the latest event ID.
    uint64_t latestId() const;

    // Current number of events stored.
    size_t size() const;

    // Clear all events.
    void clear();
};
```

### Storage

Ring buffer (`std::vector<JournalEvent>` with head/count tracking, same pattern as `MemoryRingComponent`). When full, oldest events are overwritten.

## [S4] AgentMailbox

### Data Model

```cpp
struct MailboxMessage {
    uint64_t id;              // monotonic, auto-incremented
    ECS::EntityId from;       // sender
    ECS::EntityId to;         // recipient
    std::string payload;      // JSON string
    uint64_t timestamp;       // milliseconds since epoch
    bool delivered = false;   // true after receive() returns it
    bool acked = false;       // true after ack() confirms processing
};
```

### Interface

```cpp
class AgentMailbox {
public:
    explicit AgentMailbox(size_t max_per_entity = 1000);

    // Send a message. Returns the assigned message ID.
    uint64_t send(ECS::EntityId from, ECS::EntityId to, const std::string& payload);

    // Receive undelivered messages for an entity (FIFO order). Marks them as delivered.
    std::vector<MailboxMessage> receive(ECS::EntityId to, int limit = 10);

    // Acknowledge a message (marks as acked). Returns false if message not found.
    bool ack(uint64_t message_id);

    // Get pending (undelivered) message count for an entity.
    int pendingCount(ECS::EntityId to) const;

    // Get all messages for an entity (including delivered/acked). For persistence.
    std::vector<MailboxMessage> getAll(ECS::EntityId to) const;

    // Total message count across all entities.
    size_t totalMessages() const;

    // Clear all messages.
    void clear();
};
```

### Storage

`std::unordered_map<ECS::EntityId, std::vector<MailboxMessage>>` — each entity has its own FIFO vector. When an entity's queue exceeds `max_per_entity`, oldest messages are dropped.

## [S5] Integration with Existing Systems

### EventJournal auto-recording

The following kernel operations should automatically append events:
- `ActionExecutor::apply()` → append event for each effect with type "action_effect"
- `TickEngine::tick()` → append event with type "tick_completed" containing TickResult
- `AgentMailbox::send()` → append event with type "message_sent"

### AgentMailbox integration with IPC

The `agentTick` and `runSimulation` handlers can optionally check the mailbox for incoming messages before making a decision, injecting message context into the LLM prompt.

## [S6] IPC Additions

4 new methods in `Protocol.h`:

| Method | Request Params | Response |
|---|---|---|
| `appendEvent` | `{entityId: int, eventType: string, payload: string}` | `{eventId: int}` |
| `getEvents` | `{entityId?: int, sinceId?: int}` | `{events: [{id, timestamp, entityId, eventType, payload}]}` |
| `sendMessage` | `{from: int, to: int, payload: string}` | `{messageId: int}` |
| `getMessages` | `{entityId: int, limit?: int}` | `{messages: [{id, from, to, payload, timestamp, delivered, acked}]}` |

IPC handler stores global `EventJournal` and `AgentMailbox` instances in `AgentKernelBridge`.

## [S7] File Structure

```
src/ecs/systems/
├── EventJournal.h      — JournalEvent struct + EventJournal class (header-only)
├── AgentMailbox.h      — MailboxMessage struct + AgentMailbox class (header-only)
└── (existing: ActionTypes.h, ActionEffect.h, ActionExecutor.h/.cpp, TickEngine.h/.cpp, SimulationRunner.h/.cpp)
```

Both are header-only (no .cpp needed) since they're simple data structures.

## [S8] Testing Strategy

Test files:
- `tests/test_event_journal.cpp` — append, query, ring buffer overflow, clear
- `tests/test_agent_mailbox.cpp` — send, receive, ack, pendingCount, per-entity isolation

Test count estimate: ~20 new tests
- EventJournal: ~10 tests (append, query by entity, query all, since_id, overflow, clear, size, latestId)
- AgentMailbox: ~10 tests (send, receive, ack, pendingCount, getAll, overflow, multi-entity, clear)

## [S9] Implementation Order

1. **EventJournal.h** — header-only, ring buffer implementation
2. **AgentMailbox.h** — header-only, per-entity FIFO
3. **IPC** — add 4 new methods to Protocol.h and AgentKernelBridge.h
4. **Integration** — auto-record events from TickEngine/ActionExecutor
5. **Tests** — alongside each step

## [S10] Success Criteria

- [ ] EventJournal stores events in ring buffer, queries by entity and since_id
- [ ] AgentMailbox sends/receives messages between entities
- [ ] 4 new IPC methods working
- [ ] TickEngine auto-records tick events
- [ ] 20+ new tests passing
- [ ] All existing tests still pass
