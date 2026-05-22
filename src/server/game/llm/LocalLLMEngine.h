#pragma once

#include <string>
#include <vector>
#include <memory>
#include <functional>
#include <atomic>
#include <cstdint>

// 启用 llama.cpp 后端：编译时需链接 libllama，并在 CMakeLists.txt 中定义 LLAMA_CPP_BACKEND
// 如不启用，引擎将以 NONE 模式编译（不产生任何依赖）
// #define LLAMA_CPP_BACKEND

#ifdef LLAMA_CPP_BACKEND
// #include "llama.h"
// #include "common.h"
#endif

/*
 * ==========================================================================
 * 本地 LLM 推理引擎 —— llama.cpp 后端
 * ==========================================================================
 *
 * 推荐模型（NPC 行为规划场景）：
 *   Qwen2.5-0.5B  Q4_K_M  ~350MB   最低延迟
 *   Gemma 3 1B     Q4_K_M  ~700MB   推荐默认值
 *
 * 启用步骤：
 *   1. git clone https://github.com/ggerganov/llama.cpp.git third_party/llama.cpp
 *   2. cd third_party/llama.cpp && mkdir build && cd build
 *   3. cmake .. -DLLAMA_CURL=OFF && make -j$(nproc)
 *   4. 取消本文件顶部 #define LLAMA_CPP_BACKEND 的注释
 *   5. 在 CMakeLists.txt 中取消 llama.cpp 链接配置注释
 *   6. 重新编译
 */


struct LocalLLMConfig {
    std::string model_path;
    int32_t context_size = 2048;
    int32_t max_tokens = 512;
    float temperature = 0.7f;
    int32_t thread_count = 4;
    int32_t gpu_layers = 0;
    std::string chat_template;
    bool verbose = false;
};

struct LocalLLMResult {
    std::string text;
    int32_t tokens_generated = 0;
    int32_t tokens_total = 0;
    uint64_t inference_time_ms = 0;
};

class LocalLLMEngine {
public:
    static LocalLLMEngine& getInstance() {
        static LocalLLMEngine instance;
        return instance;
    }

    bool initialize(const LocalLLMConfig& config) {
        if (initialized_) return true;

        config_ = config;

#ifdef LLAMA_CPP_BACKEND
        if (!loadModel()) return false;
        modelLoaded_ = true;
#else
        lastError_ = "llama.cpp backend not enabled. "
                     "Uncomment #define LLAMA_CPP_BACKEND in LocalLLMEngine.h "
                     "and link libllama.";
        return false;
#endif

        initialized_ = true;
        return true;
    }

    void shutdown() {
        if (!initialized_) return;
#ifdef LLAMA_CPP_BACKEND
        unloadModel();
#endif
        modelLoaded_ = false;
        initialized_ = false;
    }

    bool isInitialized() const { return initialized_; }
    bool isModelLoaded() const { return modelLoaded_; }
    std::string getLastError() const { return lastError_; }

    LocalLLMResult generate(const std::string& prompt) {
        return generateWithParams(prompt, config_.max_tokens, config_.temperature);
    }

    LocalLLMResult generate(const std::string& system_prompt, const std::string& user_prompt) {
        std::string fullPrompt = formatChatPrompt(system_prompt, user_prompt);
        return generate(fullPrompt);
    }

    LocalLLMResult generateWithParams(const std::string& prompt, int32_t max_tokens,
                                       float temperature) {
        LocalLLMResult result;

        if (!modelLoaded_) {
            lastError_ = "Model not loaded";
            return result;
        }

        auto startTime = std::chrono::high_resolution_clock::now();

#ifdef LLAMA_CPP_BACKEND
        result.text = doInference(prompt, max_tokens, temperature);
#endif

        auto endTime = std::chrono::high_resolution_clock::now();
        result.inference_time_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
            endTime - startTime).count();

        return result;
    }

    using GenerateCallback = std::function<void(const LocalLLMResult& result)>;
    using ErrorCallback = std::function<void(const std::string& error)>;

    void generateAsync(const std::string& prompt, GenerateCallback onResult,
                       ErrorCallback onError) {
        pendingCount_++;
        auto result = generate(prompt);
        pendingCount_--;

        if (result.text.empty() && !lastError_.empty()) {
            if (onError) onError(lastError_);
        } else {
            if (onResult) onResult(result);
        }
    }

    size_t getPendingCount() const { return pendingCount_.load(); }

private:
    LocalLLMEngine() : initialized_(false), modelLoaded_(false), pendingCount_(0) {}
    ~LocalLLMEngine() { shutdown(); }
    LocalLLMEngine(const LocalLLMEngine&) = delete;
    LocalLLMEngine& operator=(const LocalLLMEngine&) = delete;

#ifdef LLAMA_CPP_BACKEND
    bool loadModel() {
        // llama_backend_init();
        //
        // llama_model_params modelParams = llama_model_default_params();
        // modelParams.n_gpu_layers = config_.gpu_layers;
        // llamaModel_ = llama_model_load(config_.model_path.c_str(), modelParams);
        //
        // if (!llamaModel_) {
        //     lastError_ = "Failed to load model: " + config_.model_path;
        //     llama_backend_free();
        //     return false;
        // }
        //
        // llama_context_params ctxParams = llama_context_default_params();
        // ctxParams.n_ctx = config_.context_size;
        // ctxParams.n_threads = config_.thread_count;
        // llamaCtx_ = llama_init_from_model(llamaModel_, ctxParams);
        //
        // if (!llamaCtx_) {
        //     lastError_ = "Failed to create context";
        //     llama_model_free(llamaModel_);
        //     llama_backend_free();
        //     return false;
        // }
        //
        // llamaSpars_ = llama_sampler_chain_init(llama_sampler_chain_default_params());
        // llama_sampler_chain_add(llamaSpars_, llama_sampler_init_greedy());
        // eosToken_ = llama_token_eos(llamaModel_);
        //
        // modelLoaded_ = true;

        lastError_ = "Recompile with llama.cpp library linked";
        return false;
    }

    void unloadModel() {
        // if (llamaSpars_) { llama_sampler_free(llamaSpars_); llamaSpars_ = nullptr; }
        // if (llamaCtx_)   { llama_free(llamaCtx_); llamaCtx_ = nullptr; }
        // if (llamaModel_) { llama_model_free(llamaModel_); llamaModel_ = nullptr; }
        // llama_backend_free();
    }

    std::string doInference(const std::string& prompt, int32_t max_tokens, float temp) {
        // std::vector<llama_token> promptTokens =
        //     llama_tokenize(llamaModel_, prompt, true, true);
        //
        // if ((int)promptTokens.size() >= config_.context_size) {
        //     lastError_ = "Prompt exceeds context window";
        //     return "";
        // }
        //
        // // prefill
        // for (size_t i = 0; i < promptTokens.size(); i += nBatch_) {
        //     int nTokens = std::min(nBatch_, (int)(promptTokens.size() - i));
        //     llama_batch batch = llama_batch_get_one(promptTokens.data() + i, nTokens);
        //     if (llama_decode(llamaCtx_, batch)) { return ""; }
        // }
        //
        // // autoregressive generation
        // std::vector<llama_token> outputTokens;
        // for (int i = 0; i < max_tokens; i++) {
        //     llama_token token = llama_sampler_sample(llamaSpars_, llamaCtx_, -1);
        //     if (token == eosToken_) break;
        //     outputTokens.push_back(token);
        //     llama_batch batch = llama_batch_get_one(&token, 1);
        //     if (llama_decode(llamaCtx_, batch)) break;
        // }
        //
        // // decode
        // std::string result;
        // for (auto token : outputTokens) {
        //     char buf[256];
        //     int len = llama_token_to_piece(llamaModel_, token, buf, sizeof(buf), 0, true);
        //     if (len > 0) result.append(buf, len);
        // }
        // return result;

        return "";
    }

    // llama_model*   llamaModel_  = nullptr;
    // llama_context* llamaCtx_    = nullptr;
    // llama_sampler* llamaSpars_  = nullptr;
    // llama_token    eosToken_;
    // int            nBatch_ = 512;
#endif

    std::string formatChatPrompt(const std::string& system_prompt,
                                  const std::string& user_prompt) const {
        if (!config_.chat_template.empty()) {
            std::string tmpl = config_.chat_template;
            replaceAll(tmpl, "{{system}}", system_prompt);
            replaceAll(tmpl, "{{user}}", user_prompt);
            return tmpl;
        }

        return "<|im_start|>system\n" + system_prompt + "<|im_end|>\n"
               "<|im_start|>user\n" + user_prompt + "<|im_end|>\n"
               "<|im_start|>assistant\n";
    }

    static void replaceAll(std::string& str, const std::string& from,
                           const std::string& to) {
        size_t pos = 0;
        while ((pos = str.find(from, pos)) != std::string::npos) {
            str.replace(pos, from.length(), to);
            pos += to.length();
        }
    }

    bool initialized_;
    bool modelLoaded_;
    LocalLLMConfig config_;
    std::string lastError_;
    std::atomic<size_t> pendingCount_;
};
