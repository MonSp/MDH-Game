#pragma once
// EventJournal — append-only event log with ring buffer storage.
// Records agent lifecycle events (decisions, effects, messages) for
// query and persistence by application layers.

#include "../Entity.h"
#include <string>
#include <vector>
#include <functional>
#include <cstdint>
#include <chrono>
#include <algorithm>

namespace Systems {

struct JournalEvent {
    uint64_t id = 0;
    uint64_t timestamp = 0;
    ECS::EntityId entity_id = 0;
    std::string event_type;
    std::string payload;  // JSON string

    JournalEvent() = default;
    JournalEvent(uint64_t id, uint64_t ts, ECS::EntityId eid,
                 const std::string& type, const std::string& data)
        : id(id), timestamp(ts), entity_id(eid), event_type(type), payload(data) {}
};

class EventJournal {
public:
    using Listener = std::function<void(const JournalEvent&)>;

    explicit EventJournal(size_t max_capacity = 10000)
        : capacity_(max_capacity), next_id_(1), head_(0), count_(0) {
        buffer_.resize(capacity_);
    }

    void addListener(Listener listener) {
        listeners_.push_back(std::move(listener));
    }

    // Append an event. Returns the assigned event ID.
    uint64_t append(ECS::EntityId entity_id, const std::string& event_type,
                    const std::string& payload) {
        auto now = std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()).count();

        uint64_t id = next_id_++;
        buffer_[head_] = JournalEvent(id, static_cast<uint64_t>(now),
                                       entity_id, event_type, payload);
        head_ = (head_ + 1) % capacity_;
        if (count_ < capacity_) count_++;

        for (auto& listener : listeners_) {
            listener(buffer_[(head_ + capacity_ - 1) % capacity_]);
        }
        return id;
    }

    // Query events for a specific entity, filtered by minimum event ID.
    std::vector<JournalEvent> query(ECS::EntityId entity_id, uint64_t since_id = 0) const {
        std::vector<JournalEvent> result;
        forEach([&](const JournalEvent& e) {
            if (e.entity_id == entity_id && e.id >= since_id) {
                result.push_back(e);
            }
        });
        return result;
    }

    // Query all events, filtered by minimum event ID.
    std::vector<JournalEvent> queryAll(uint64_t since_id = 0) const {
        std::vector<JournalEvent> result;
        forEach([&](const JournalEvent& e) {
            if (e.id >= since_id) {
                result.push_back(e);
            }
        });
        return result;
    }

    // Get the latest event ID (0 if no events).
    uint64_t latestId() const {
        return next_id_ - 1;
    }

    size_t size() const { return count_; }
    size_t capacity() const { return capacity_; }
    bool empty() const { return count_ == 0; }

    void clear() {
        head_ = 0;
        count_ = 0;
        // Don't reset next_id_ — IDs are monotonic across clears
    }

private:
    template<typename Fn>
    void forEach(Fn&& fn) const {
        if (count_ == 0) return;
        // Iterate from oldest to newest
        size_t start = (count_ < capacity_) ? 0 : head_;
        for (size_t i = 0; i < count_; ++i) {
            size_t idx = (start + i) % capacity_;
            fn(buffer_[idx]);
        }
    }

    size_t capacity_;
    uint64_t next_id_;
    size_t head_;
    size_t count_;
    std::vector<JournalEvent> buffer_;
    std::vector<Listener> listeners_;
};

} // namespace Systems
