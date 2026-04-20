#pragma once

#include <node/node.h>
#include <node/v8.h>
#include "../ipc/UnixSocketServer.h"
#include "../ipc/MessageQueue.h"
#include "../ecs/systems/WorldUpdateLoop.h"
#include "../npc/NPCCreationSystem.h"
#include <memory>
#include <iostream>

using namespace node;
using namespace v8;

class NPAddon {
public:
    static void Initialize(v8::Local<v8::Object> exports) {
        Isolate* isolate = Isolate::GetCurrent();
        Local<Context> context = isolate->GetCurrentContext();

        NODE_SET_METHOD(exports, "start", Start);
        NODE_SET_METHOD(exports, "stop", Stop);
        NODE_SET_METHOD(exports, "createNPCs", CreateNPCs);
        NODE_SET_METHOD(exports, "getStats", GetStats);
        NODE_SET_METHOD(exports, "update", Update);
    }

private:
    static void Start(const FunctionCallbackInfo<Value>& args) {
        Isolate* isolate = args.GetIsolate();
        if (args.Length() < 1) {
            isolate->ThrowException(Exception::TypeError(
                String::NewFromUtf8(isolate, "Missing thread count argument").ToLocalChecked()));
            return;
        }

        uint32_t threadCount = args[0].As<Uint32>()->Value();
        WorldUpdateLoop::getInstance().initialize(threadCount);
        WorldUpdateLoop::getInstance().start();

        args.GetReturnValue().Set(True(isolate));
    }

    static void Stop(const FunctionCallbackInfo<Value>& args) {
        Isolate* isolate = args.GetIsolate();
        WorldUpdateLoop::getInstance().stop();
        args.GetReturnValue().Set(True(isolate));
    }

    static void CreateNPCs(const FunctionCallbackInfo<Value>& args) {
        Isolate* isolate = args.GetIsolate();
        if (args.Length() < 2) {
            isolate->ThrowException(Exception::TypeError(
                String::NewFromUtf8(isolate, "Missing arguments").ToLocalChecked()));
            return;
        }

        uint32_t count = args[0].As<Uint32>()->Value();
        uint8_t layer = args[1].As<Uint32>()->Value();

        NPCCreationSystem::getInstance().createBatchNPCs(count, layer);

        Local<Object> result = Object::New(isolate);
        result->Set(context, String::NewFromUtf8(isolate, "count").ToLocalChecked(),
                   Integer::New(isolate, static_cast<int32_t>(count)));
        result->Set(context, String::NewFromUtf8(isolate, "layer").ToLocalChecked(),
                   Integer::New(isolate, layer));
        result->Set(context, String::NewFromUtf8(isolate, "totalNPCs").ToLocalChecked(),
                   Integer::New(isolate, static_cast<int32_t>(NPCCreationSystem::getInstance().getNPCCount())));

        args.GetReturnValue().Set(result);
    }

    static void GetStats(const FunctionCallbackInfo<Value>& args) {
        Isolate* isolate = args.GetIsolate();

        Local<Object> result = Object::New(isolate);
        result->Set(context, String::NewFromUtf8(isolate, "npcCount").ToLocalChecked(),
                   Integer::New(isolate, static_cast<int32_t>(NPCCreationSystem::getInstance().getNPCCount())));
        result->Set(context, String::NewFromUtf8(isolate, "avgFrameTime").ToLocalChecked(),
                   Number::New(isolate, WorldUpdateLoop::getInstance().getAverageFrameTime()));
        result->Set(context, String::NewFromUtf8(isolate, "frameCount").ToLocalChecked(),
                   Integer::NewFromUnsigned(isolate, static_cast<uint32_t>(WorldUpdateLoop::getInstance().getFrameCount())));

        args.GetReturnValue().Set(result);
    }

    static void Update(const FunctionCallbackInfo<Value>& args) {
        Isolate* isolate = args.GetIsolate();
        WorldUpdateLoop::getInstance().updateOnce();
        args.GetReturnValue().Set(True(isolate));
    }

    static v8::Persistent<Context>* context;
};

NODE_MODULE(NODE_GYP_MODULE_NAME, NPAddon::Initialize)
