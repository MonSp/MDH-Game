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
#include <curl/curl.h>

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

        curl_global_init(CURL_GLOBAL_DEFAULT);
        multiHandle_ = curl_multi_init();
        if (!multiHandle_) {
            return false;
        }

        initialized_ = true;
        return true;
    }

    void shutdown() {
        if (!initialized_) return;

        stopWorkerThreads();
        curl_multi_cleanup(multiHandle_);
        curl_global_cleanup();
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
        multiHandle_(nullptr), provider_(LLMProvider::OPENAI),
        temperature_(0.7f), maxTokens_(2000) {}

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

        try {
            std::string url;
            std::string postData;

            if (provider_ == LLMProvider::OPENAI) {
                url = "https://api.openai.com/v1/chat/completions";
                postData = buildOpenAIRequest(request);
            } else {
                url = localEndpoint_ + "/api/generate";
                postData = buildLocalRequest(request);
            }

            CURL* curl = curl_easy_init();
            if (!curl) {
                response.success = false;
                response.error = "Failed to init curl";
                invokeCallback(request, response);
                return;
            }

            std::string responseBody;
            struct curl_slist* headers = nullptr;

            if (provider_ == LLMProvider::OPENAI) {
                headers = curl_slist_append(headers, "Content-Type: application/json");
                headers = curl_slist_append(headers, ("Authorization: Bearer " + openaiApiKey_).c_str());
            }

            curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
            curl_easy_setopt(curl, CURLOPT_POSTFIELDS, postData.c_str());
            curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, writeCallback);
            curl_easy_setopt(curl, CURLOPT_WRITEDATA, &responseBody);
            curl_easy_setopt(curl, CURLOPT_POST, 1L);

            if (headers) {
                curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
            }

            CURLcode res = curl_easy_perform(curl);

            if (headers) {
                curl_slist_free_all(headers);
            }

            auto endTime = std::chrono::high_resolution_clock::now();
            response.latency_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
                endTime - startTime).count();

            if (res == CURLE_OK) {
                response.success = true;
                response.content = parseResponse(responseBody);
            } else {
                response.success = false;
                response.error = curl_easy_strerror(res);
            }

            curl_easy_cleanup(curl);

        } catch (const std::exception& e) {
            response.success = false;
            response.error = e.what();
        }

        invokeCallback(request, response);
    }

    std::string buildOpenAIRequest(const LLMRequest& request) {
        std::string json = "{";
        json += "\"model\":\"" + request.model + "\",";
        json += "\"messages\":[";
        json += "{\"role\":\"system\",\"content\":\"" + escapeJson(request.system_prompt) + "\"},";
        json += "{\"role\":\"user\",\"content\":\"" + escapeJson(request.user_prompt) + "\"}";
        json += "]},";
        json += "\"temperature\":" + std::to_string(request.temperature) + ",";
        json += "\"max_tokens\":" + std::to_string(request.max_tokens);
        json += "}";
        return json;
    }

    std::string buildLocalRequest(const LLMRequest& request) {
        std::string json = "{";
        json += "\"model\":\"" + request.model + "\",";
        json += "\"prompt\":\"" + escapeJson(request.user_prompt) + "\",";
        json += "\"stream\":false";
        json += "}";
        return json;
    }

    std::string parseResponse(const std::string& responseBody) {
        if (provider_ == LLMProvider::OPENAI) {
            return parseOpenAIResponse(responseBody);
        } else {
            return parseLocalResponse(responseBody);
        }
    }

    std::string parseOpenAIResponse(const std::string& body) {
        size_t contentPos = body.find("\"content\":\"");
        if (contentPos == std::string::npos) {
            return body;
        }

        size_t start = contentPos + 10;
        size_t end = body.find("\"", start);
        if (end == std::string::npos) {
            return body.substr(start);
        }

        return body.substr(start, end - start);
    }

    std::string parseLocalResponse(const std::string& body) {
        size_t responsePos = body.find("\"response\":\"");
        if (responsePos == std::string::npos) {
            return body;
        }

        size_t start = responsePos + 11;
        size_t end = body.find("\"", start);
        if (end == std::string::npos) {
            return body.substr(start);
        }

        return body.substr(start, end - start);
    }

    static size_t writeCallback(void* contents, size_t size, size_t nmemb, void* userp) {
        ((std::string*)userp)->append((char*)contents, size * nmemb);
        return size * nmemb;
    }

    std::string escapeJson(const std::string& input) {
        std::string result;
        for (char c : input) {
            switch (c) {
                case '"': result += "\\\""; break;
                case '\\': result += "\\\\"; break;
                case '\n': result += "\\n"; break;
                case '\r': result += "\\r"; break;
                case '\t': result += "\\t"; break;
                default: result += c;
            }
        }
        return result;
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
    CURLM* multiHandle_;
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
