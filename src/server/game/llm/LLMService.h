#pragma once

#include "LLMHttpClient.h"
#include "../ecs/components/LLMComponent.h"
#include <unordered_map>
#include <atomic>

class LLMService {
public:
    static LLMService& getInstance() {
        static LLMService instance;
        return instance;
    }

    bool initialize(const std::string& provider, const std::string& apiKey,
                   const std::string& model, const std::string& localEndpoint = "",
                   bool startWorkers = true) {
        if (!httpClient_->initialize()) {
            return false;
        }

        if (provider == "openai") {
            httpClient_->setProvider(LLMProvider::OPENAI);
            httpClient_->setOpenAIKey(apiKey);
        } else {
            httpClient_->setProvider(LLMProvider::LOCAL);
            httpClient_->setLocalEndpoint(localEndpoint.empty() ? "http://localhost:11434" : localEndpoint);
        }

        httpClient_->setModel(model);
        httpClient_->setConcurrencyLimit(maxConcurrentRequests_);

        if (startWorkers) {
            size_t threadCount = std::thread::hardware_concurrency();
            if (threadCount > maxConcurrentRequests_) {
                threadCount = maxConcurrentRequests_;
            }
            httpClient_->startWorkerThreads(threadCount);
        }

        initialized_ = true;
        return true;
    }

    void shutdown() {
        if (!initialized_) return;
        httpClient_->shutdown();
        initialized_ = false;
    }

    void requestPlan(const std::string& npcId, const std::string& systemPrompt,
                     const std::string& userPrompt, const std::string& model = "") {
        LLMRequest request;
        request.request_id = generateRequestId();
        request.npc_id = npcId;
        request.system_prompt = systemPrompt;
        request.user_prompt = userPrompt;
        request.model = model.empty() ? "gpt-4" : model;
        request.temperature = 0.7f;
        request.max_tokens = 2000;
        request.timestamp = getCurrentTimeMs();

        request.callback = [this, npcId](const std::string& response) {
            handlePlanResponse(npcId, response);
        };

        request.error_callback = [this, npcId](const std::string& error) {
            handlePlanError(npcId, error);
        };

        httpClient_->submitRequest(std::move(request));
        activeRequests_[npcId] = request.request_id;
    }

    void cancelRequest(const std::string& npcId) {
        activeRequests_.erase(npcId);
    }

    bool hasActiveRequest(const std::string& npcId) const {
        return activeRequests_.find(npcId) != activeRequests_.end();
    }

    size_t getPendingRequestCount() const {
        return httpClient_->getPendingRequestCount();
    }

    size_t getActiveRequestCount() const {
        return activeRequests_.size();
    }

    void setMaxConcurrentRequests(size_t limit) {
        maxConcurrentRequests_ = limit;
        httpClient_->setConcurrencyLimit(limit);
    }

    void configureLocalEngine(const LocalLLMConfig& config) {
        httpClient_->configureLocalEngine(config);
    }

    std::string getLocalLLMStatus() const {
        auto& engine = LocalLLMEngine::getInstance();
        if (!engine.isInitialized()) return "not_initialized";
        if (!engine.isModelLoaded()) return "model_not_loaded";
        return "running";
    }

private:
    LLMService() : initialized_(false), maxConcurrentRequests_(8), httpClient_(nullptr) {
        httpClient_ = &LLMHttpClient::getInstance();
    }

    void handlePlanResponse(const std::string& npcId, const std::string& response) {
        activeRequests_.erase(npcId);
        lastResponse_[npcId] = response;

        if (responseCallback_) {
            responseCallback_(npcId, response);
        }
    }

    void handlePlanError(const std::string& npcId, const std::string& error) {
        activeRequests_.erase(npcId);
        lastError_[npcId] = error;

        if (errorCallback_) {
            errorCallback_(npcId, error);
        }
    }

    std::string generateRequestId() {
        return "req_" + std::to_string(getCurrentTimeMs()) + "_" +
               std::to_string(requestIdCounter_++);
    }

    uint64_t getCurrentTimeMs() const {
        auto now = std::chrono::system_clock::now();
        return static_cast<uint64_t>(std::chrono::duration_cast<std::chrono::milliseconds>(
            now.time_since_epoch()).count());
    }

public:
    std::function<void(const std::string& npcId, const std::string& response)> responseCallback_;
    std::function<void(const std::string& npcId, const std::string& error)> errorCallback_;

private:
    bool initialized_;
    size_t maxConcurrentRequests_;
    std::atomic<uint64_t> requestIdCounter_{0};
    LLMHttpClient* httpClient_;
    std::unordered_map<std::string, std::string> activeRequests_;
    std::unordered_map<std::string, std::string> lastResponse_;
    std::unordered_map<std::string, std::string> lastError_;
};
