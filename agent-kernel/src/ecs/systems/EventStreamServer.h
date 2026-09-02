#pragma once
// EventStreamServer — Unix socket server that pushes kernel events to subscribers.
// Clients connect to the event socket and receive newline-delimited JSON events.
// Events are pushed from EventJournal and AgentMailbox listeners.

#include "EventJournal.h"
#include "AgentMailbox.h"
#include <string>
#include <vector>
#include <mutex>
#include <memory>
#include <thread>
#include <atomic>
#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>
#include <cstring>
#include <cstdio>

namespace Systems {

class EventStreamServer {
public:
    explicit EventStreamServer(const std::string& socketPath,
                                EventJournal& journal,
                                AgentMailbox& mailbox)
        : socketPath_(socketPath), serverFd_(-1), running_(false) {

        // Register listeners on journal and mailbox
        journal.addListener([this](const JournalEvent& e) {
            pushEvent(journalEventToJson(e));
        });

        mailbox.addListener([this](const MailboxMessage& m) {
            pushEvent(mailboxMessageToJson(m));
        });
    }

    ~EventStreamServer() { stop(); }

    bool start() {
        serverFd_ = socket(AF_UNIX, SOCK_STREAM, 0);
        if (serverFd_ < 0) return false;

        unlink(socketPath_.c_str());

        struct sockaddr_un addr;
        memset(&addr, 0, sizeof(addr));
        addr.sun_family = AF_UNIX;
        strncpy(addr.sun_path, socketPath_.c_str(), sizeof(addr.sun_path) - 1);

        if (bind(serverFd_, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
            close(serverFd_);
            serverFd_ = -1;
            return false;
        }

        if (listen(serverFd_, 8) < 0) {
            close(serverFd_);
            unlink(socketPath_.c_str());
            serverFd_ = -1;
            return false;
        }

        running_ = true;
        acceptThread_ = std::make_unique<std::thread>([this]() { acceptLoop(); });
        return true;
    }

    void stop() {
        running_ = false;
        if (serverFd_ >= 0) {
            ::shutdown(serverFd_, SHUT_RDWR);
            close(serverFd_);
            serverFd_ = -1;
        }
        if (acceptThread_ && acceptThread_->joinable()) {
            acceptThread_->join();
        }
        // Close all subscriber connections
        {
            std::lock_guard<std::mutex> lock(mutex_);
            for (int fd : subscribers_) {
                ::shutdown(fd, SHUT_RDWR);
                close(fd);
            }
            subscribers_.clear();
        }
        unlink(socketPath_.c_str());
    }

    int subscriberCount() const {
        std::lock_guard<std::mutex> lock(mutex_);
        return static_cast<int>(subscribers_.size());
    }

private:
    void acceptLoop() {
        while (running_) {
            int clientFd = accept(serverFd_, nullptr, nullptr);
            if (clientFd < 0) {
                if (!running_) break;
                continue;
            }
            {
                std::lock_guard<std::mutex> lock(mutex_);
                subscribers_.push_back(clientFd);
            }
            // Detached thread to handle client disconnect detection
            std::thread([this, clientFd]() { handleClient(clientFd); }).detach();
        }
    }

    void handleClient(int clientFd) {
        // Read from client — we only care about detecting disconnect
        char buf[64];
        while (running_) {
            ssize_t n = recv(clientFd, buf, sizeof(buf), 0);
            if (n <= 0) break; // client disconnected
        }
        // Remove from subscribers
        {
            std::lock_guard<std::mutex> lock(mutex_);
            auto it = std::find(subscribers_.begin(), subscribers_.end(), clientFd);
            if (it != subscribers_.end()) {
                subscribers_.erase(it);
            }
        }
        close(clientFd);
    }

    void pushEvent(const std::string& jsonLine) {
        std::string data = jsonLine + "\n";
        std::lock_guard<std::mutex> lock(mutex_);
        std::vector<int> dead;
        for (int fd : subscribers_) {
            ssize_t n = send(fd, data.c_str(), data.size(), MSG_NOSIGNAL);
            if (n <= 0) {
                dead.push_back(fd);
            }
        }
        // Clean up dead connections
        for (int fd : dead) {
            auto it = std::find(subscribers_.begin(), subscribers_.end(), fd);
            if (it != subscribers_.end()) {
                subscribers_.erase(it);
            }
            close(fd);
        }
    }

    static std::string journalEventToJson(const JournalEvent& e) {
        std::string json = "{\"type\":\"journal_event\"";
        json += ",\"id\":" + std::to_string(e.id);
        json += ",\"timestamp\":" + std::to_string(e.timestamp);
        json += ",\"entityId\":" + std::to_string(e.entity_id);
        json += ",\"eventType\":\"" + escapeStr(e.event_type) + "\"";
        json += ",\"payload\":\"" + escapeStr(e.payload) + "\"}";
        return json;
    }

    static std::string mailboxMessageToJson(const MailboxMessage& m) {
        std::string json = "{\"type\":\"message_received\"";
        json += ",\"id\":" + std::to_string(m.id);
        json += ",\"from\":" + std::to_string(m.from);
        json += ",\"to\":" + std::to_string(m.to);
        json += ",\"payload\":\"" + escapeStr(m.payload) + "\"";
        json += ",\"timestamp\":" + std::to_string(m.timestamp) + "}";
        return json;
    }

    static std::string escapeStr(const std::string& s) {
        std::string out;
        for (char c : s) {
            switch (c) {
                case '"':  out += "\\\""; break;
                case '\\': out += "\\\\"; break;
                case '\n': out += "\\n";  break;
                case '\r': out += "\\r";  break;
                default:   out += c;      break;
            }
        }
        return out;
    }

    std::string socketPath_;
    int serverFd_;
    std::atomic<bool> running_;
    std::unique_ptr<std::thread> acceptThread_;
    std::vector<int> subscribers_;
    mutable std::mutex mutex_;
};

} // namespace Systems
