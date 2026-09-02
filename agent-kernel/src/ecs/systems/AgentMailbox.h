#pragma once
// AgentMailbox — per-entity FIFO message queue for agent-to-agent communication.
// Messages are sent between ECS entities, with delivery tracking and acknowledgment.

#include "../Entity.h"
#include <string>
#include <vector>
#include <unordered_map>
#include <cstdint>
#include <chrono>
#include <algorithm>

namespace Systems {

struct MailboxMessage {
    uint64_t id = 0;
    ECS::EntityId from = 0;
    ECS::EntityId to = 0;
    std::string payload;  // JSON string
    uint64_t timestamp = 0;
    bool delivered = false;
    bool acked = false;

    MailboxMessage() = default;
    MailboxMessage(uint64_t id, ECS::EntityId from, ECS::EntityId to,
                   const std::string& payload, uint64_t ts)
        : id(id), from(from), to(to), payload(payload), timestamp(ts),
          delivered(false), acked(false) {}
};

class AgentMailbox {
public:
    explicit AgentMailbox(size_t max_per_entity = 1000)
        : max_per_entity_(max_per_entity), next_id_(1) {}

    // Send a message from one entity to another. Returns the message ID.
    uint64_t send(ECS::EntityId from, ECS::EntityId to, const std::string& payload) {
        auto now = std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()).count();

        uint64_t id = next_id_++;
        MailboxMessage msg(id, from, to, payload, static_cast<uint64_t>(now));

        auto& queue = queues_[to];
        if (queue.size() >= max_per_entity_) {
            // Drop oldest message
            queue.erase(queue.begin());
        }
        queue.push_back(std::move(msg));
        return id;
    }

    // Receive undelivered messages for an entity (FIFO order). Marks as delivered.
    std::vector<MailboxMessage> receive(ECS::EntityId to, int limit = 10) {
        std::vector<MailboxMessage> result;
        auto it = queues_.find(to);
        if (it == queues_.end()) return result;

        for (auto& msg : it->second) {
            if (!msg.delivered && static_cast<int>(result.size()) < limit) {
                msg.delivered = true;
                result.push_back(msg);
            }
        }
        return result;
    }

    // Acknowledge a message. Returns false if not found.
    bool ack(uint64_t message_id) {
        for (auto& [eid, queue] : queues_) {
            for (auto& msg : queue) {
                if (msg.id == message_id) {
                    msg.acked = true;
                    return true;
                }
            }
        }
        return false;
    }

    // Pending (undelivered) message count for an entity.
    int pendingCount(ECS::EntityId to) const {
        int count = 0;
        auto it = queues_.find(to);
        if (it != queues_.end()) {
            for (const auto& msg : it->second) {
                if (!msg.delivered) count++;
            }
        }
        return count;
    }

    // Get all messages for an entity (including delivered/acked). For persistence.
    std::vector<MailboxMessage> getAll(ECS::EntityId to) const {
        auto it = queues_.find(to);
        if (it == queues_.end()) return {};
        return it->second;
    }

    size_t totalMessages() const {
        size_t total = 0;
        for (const auto& [eid, queue] : queues_) {
            total += queue.size();
        }
        return total;
    }

    void clear() {
        queues_.clear();
        // Don't reset next_id_ — IDs are monotonic across clears
    }

private:
    size_t max_per_entity_;
    uint64_t next_id_;
    std::unordered_map<ECS::EntityId, std::vector<MailboxMessage>> queues_;
};

} // namespace Systems
