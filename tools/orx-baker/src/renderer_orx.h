#ifndef RENDERER_ORX_H
#define RENDERER_ORX_H

#ifdef __orxHEADLESS__

#include "orx.h"
#include "baker_types.h"
#include <string>

struct OrxRenderer {
    int frameW, frameH;
    orxVIEWPORT* bakeViewport;
    orxBITMAP* bakeTarget;
    orxCAMERA* bakeCamera;
    orxOBJECT* currentObject;
    std::string outputDir;

    OrxRenderer(int w, int h, const char* outDir)
        : frameW(w), frameH(h)
        , bakeViewport(nullptr)
        , bakeTarget(nullptr)
        , bakeCamera(nullptr)
        , currentObject(nullptr)
        , outputDir(outDir)
    {}

    bool init() {
        bakeTarget = orxDisplay_CreateBitmap(
            orx2F((float)frameW),
            orx2F((float)frameH),
            orxBITMAP_FLAG_NONE
        );
        if (!bakeTarget) return false;

        bakeCamera = orxCamera_CreateFromConfig("BakeCamera");
        if (!bakeCamera) {
            bakeCamera = orxCamera_Create();
            orxCamera_SetFrustum(bakeCamera, frameW, frameH, 0.1f, 100.0f);
            orxCamera_SetPosition(bakeCamera, orxVECTOR_0);
        }

        orxVIEWPORT* bakeViewport = orxViewport_CreateFromConfig("BakeViewport");
        if (!bakeViewport) {
            bakeViewport = orxViewport_Create("BakeViewport");
            orxViewport_SetCamera(bakeViewport, bakeCamera);
            orxViewport_SetSize(bakeViewport, orx2F((float)frameW), orx2F((float)frameH));
            orxViewport_AddRenderTarget(bakeViewport, bakeTarget);
            orxViewport_SetBackgroundColor(bakeViewport, orxCOLOR_0);
        }

        return true;
    }

    bool loadObjectFromVoxels(const char* configName, const VoxelGrid& grid) {
        currentObject = orxObject_CreateFromConfig(configName);
        if (!currentObject) {
            currentObject = orxObject_Create();
            orxObject_SetName(currentObject, configName);
        }

        return currentObject != nullptr;
    }

    void setObjectTransform(float posX, float posY, float posZ,
                             float rotX, float rotY, float rotZ,
                             float scale) {
        if (!currentObject) return;

        orxVECTOR pos = {orx2F(posX), orx2F(posY), orx2F(posZ)};
        orxObject_SetPosition(currentObject, &pos);

        orxVECTOR rot = {orx2F(rotX), orx2F(rotY), orx2F(rotZ)};
        orxObject_SetRotation(currentObject, &rot);

        orxVECTOR scl = {orx2F(scale), orx2F(scale), orx2F(0)};
        orxObject_SetScale(currentObject, &scl);
    }

    void setCameraIsometric(float angle, float pitch, float distance, float centerX, float centerY, float centerZ) {
        if (!bakeCamera) return;

        float radA = angle * orxMATH_KF_PI / 180.0f;
        float radP = pitch * orxMATH_KF_PI / 180.0f;

        float camX = centerX + distance * orxMath_Cos(radP) * orxMath_Sin(radA);
        float camY = centerY + distance * orxMath_Cos(radP) * orxMath_Cos(radA);
        float camZ = centerZ + distance * orxMath_Sin(radP);

        orxVECTOR camPos = {orx2F(camX), orx2F(camY), orx2F(camZ)};
        orxCamera_SetPosition(bakeCamera, &camPos);

        orxVECTOR center = {orx2F(centerX), orx2F(centerY), orx2F(centerZ)};
        orxCamera_LookAt(bakeCamera, &center);
    }

    bool captureFrame(const char* outputPath) {
        orxRender_Flush();
        return orxDisplay_SaveBitmap(bakeTarget, outputPath) != orxSTATUS_FAILURE;
    }

    bool bakeDirections(const char* configName, const VoxelGrid& grid,
                         int numAngles, float pitch, float distance,
                         const char* outputPrefix) {
        if (!loadObjectFromVoxels(configName, grid)) return false;

        float centerX = grid.dimX * 0.5f;
        float centerY = grid.dimY * 0.5f;
        float centerZ = grid.dimZ * 0.5f;

        float scale = std::min(
            (float)frameW / (float)(grid.dimX * 2),
            (float)frameH / (float)(grid.dimZ * 2)
        );

        for (int a = 0; a < numAngles; a++) {
            float angle = 360.0f * (float)a / (float)numAngles;
            setObjectTransform(0, 0, 0, 0, 0, 0, scale);
            setCameraIsometric(angle, pitch, distance + std::max(grid.dimX, grid.dimY), centerX, centerY, centerZ);

            char path[512];
            snprintf(path, sizeof(path), "%s/%s_%03d.png", outputDir.c_str(), outputPrefix, a);
            if (!captureFrame(path)) return false;
        }

        return true;
    }

    void cleanup() {
        if (currentObject) {
            orxObject_Delete(currentObject);
            currentObject = nullptr;
        }
        if (bakeViewport) {
            orxViewport_Delete(bakeViewport);
            bakeViewport = nullptr;
        }
        if (bakeCamera) {
            orxCamera_Delete(bakeCamera);
            bakeCamera = nullptr;
        }
        if (bakeTarget) {
            orxDisplay_DeleteBitmap(bakeTarget);
            bakeTarget = nullptr;
        }
    }
};

#else

#warning "ORX Headless mode not enabled - ORX renderer unavailable"
#include "baker_types.h"

struct OrxRenderer {
    int frameW, frameH;
    OrxRenderer(int w, int h, const char*) : frameW(w), frameH(h) {}
    bool init() { return false; }
    bool loadObjectFromVoxels(const char*, const VoxelGrid&) { return false; }
    void setObjectTransform(float, float, float, float, float, float, float) {}
    void setCameraIsometric(float, float, float, float, float, float) {}
    bool captureFrame(const char*) { return false; }
    bool bakeDirections(const char*, const VoxelGrid&, int, float, float, const char*) { return false; }
    void cleanup() {}
};

#endif
#endif
