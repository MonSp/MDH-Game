#pragma once

#include <string>
#include <vector>
#include <queue>
#include <mutex>
#include <thread>
#include <future>
#include <memory>
#include <functional>
#include <atomic>

#ifdef USE_CURL
#include <curl/curl.h>
#endif

enum class LLMProvider {
    OPENAI,
    LOCAL
};

struct LLMRequest {
    std::string request_id;
    std::string npc_id;
    std::string system_prompt;
    std::string user_prompt;
    std::string model;
    float temperature;
    int max_tokens;
    uint64_t timestamp;
    std::function<void(const std::string& response)> callback;
    std::function<void(const std::string& error)> error_callback;
};

struct LLMResponse {
    std::string request_id;
    bool success;
    std::string content;
    std::string error;
    uint64_t latency_ms;
};

class LLMHttpClient {
public:
    static LLMHttpClient& getInstance() {
        static LLMHttpClient instance;
        return instance;
    }

    bool initialize() {
        if (initialized_) return true;
        initialized_ = true;
        return true;
    }

    void shutdown() {
        if (!initialized_) return;
        stopWorkerThreads();
        initialized_ = false;
    }

    void setOpenAIKey(const std::string& apiKey) {
        openaiApiKey_ = apiKey;
    }

    void setProvider(LLMProvider provider) {
        provider_ = provider;
    }

    void setLocalEndpoint(const std::string& endpoint) {
        localEndpoint_ = endpoint;
    }

    void setModel(const std::string& model) {
        defaultModel_ = model;
    }

    void setConcurrencyLimit(size_t limit) {
        maxConcurrentRequests_ = limit;
    }

    size_t getPendingRequestCount() const {
        return pendingRequests_.load();
    }

    void submitRequest(LLMRequest&& request) {
        std::lock_guard<std::mutex> lock(queueMutex_);
        requestQueue_.push(std::move(request));
        queueCV_.notify_one();
    }

    void submitRequest(const LLMRequest& request) {
        std::lock_guard<std::mutex> lock(queueMutex_);
        requestQueue_.push(request);
        queueCV_.notify_one();
    }

    void startWorkerThreads(size_t threadCount) {
        for (size_t i = 0; i < threadCount; ++i) {
            workerThreads_.emplace_back([this]() { workerLoop(); });
        }
    }

private:
    LLMHttpClient() : initialized_(false), pendingRequests_(0),
        provider_(LLMProvider::OPENAI),
        temperature_(0.7f), maxTokens_(2000), maxConcurrentRequests_(10) {}

    ~LLMHttpClient() {
        shutdown();
    }

    LLMHttpClient(const LLMHttpClient&) = delete;
    LLMHttpClient& operator=(const LLMHttpClient&) = delete;

    void workerLoop() {
        while (!stopWorkers_) {
            LLMRequest request;
            {
                std::unique_lock<std::mutex> lock(queueMutex_);
                queueCV_.wait_for(lock, std::chrono::milliseconds(100), [this]() {
                    return !requestQueue_.empty() || stopWorkers_;
                });

                if (stopWorkers_ || requestQueue_.empty()) {
                    continue;
                }

                if (pendingRequests_.load() >= maxConcurrentRequests_) {
                    continue;
                }

                request = std::move(requestQueue_.front());
                requestQueue_.pop();
            }

            pendingRequests_++;
            executeRequest(std::move(request));
            pendingRequests_--;
        }
    }

    void executeRequest(LLMRequest&& request) {
        LLMResponse response;
        response.request_id = request.request_id;
        auto startTime = std::chrono::high_resolution_clock::now();

        response.success = false;
        response.error = "HTTP client not available - curl library not installed";

        auto endTime = std::chrono::high_resolution_clock::now();
        response.latency_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
            endTime - startTime).count();

        invokeCallback(request, response);
    }

    void invokeCallback(const LLMRequest& request, const LLMResponse& response) {
        if (response.success && request.callback) {
            request.callback(response.content);
        } else if (!response.success && request.error_callback) {
            request.error_callback(response.error);
        }
    }

    void stopWorkerThreads() {
        stopWorkers_ = true;
        queueCV_.notify_all();
        for (auto& t : workerThreads_) {
            if (t.joinable()) {
                t.join();
            }
        }
        workerThreads_.clear();
    }

    bool initialized_;
    std::atomic<size_t> pendingRequests_;

    LLMProvider provider_;
    std::string openaiApiKey_;
    std::string localEndpoint_;
    std::string defaultModel_;
    float temperature_;
    int maxTokens_;
    size_t maxConcurrentRequests_;

    std::atomic<bool> stopWorkers_;
    std::vector<std::thread> workerThreads_;

    std::queue<LLMRequest> requestQueue_;
    std::mutex queueMutex_;
    std::condition_variable queueCV_;
};
