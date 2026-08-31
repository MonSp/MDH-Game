#pragma once

#include "../ecs/components/SkillTreeComponent.h"
#include "../ecs/components/CareerComponent.h"
#include "../ecs/components/StatsComponent.h"
#include "../ecs/components/IdentityComponent.h"
#include <string>
#include <vector>
#include <functional>

// Maps NPC roles and realm levels to initial skill trees and career state.
// This is the C++ equivalent of the agent-kernel's skill-mapping.json.
class SkillMapper {
public:
    // Populate a SkillTreeComponent based on the NPC's role and realm.
    static void populateSkills(SkillTreeComponent& skills, NPCRole role, RealmLevel realm) {
        SkillLevel baseLevel = realmToSkillLevel(realm);

        // All NPCs get basic self-management
        skills.addSkill("task_decomposition", SkillCategory::Engineering, baseLevel);

        switch (role) {
            case NPCRole::FamilyHead:
                addManagementSkills(skills, baseLevel);
                addArchitectureSkills(skills, baseLevel);
                break;

            case NPCRole::Elder:
                addManagementSkills(skills, baseLevel);
                addArchitectureSkills(skills, baseLevel);
                break;

            case NPCRole::LawEnforcementElder:
                addSecuritySkills(skills, baseLevel);
                addManagementSkills(skills, baseLevel);
                break;

            case NPCRole::CoreDisciple:
                addEngineeringSkills(skills, baseLevel);
                addDesignSkills(skills, baseLevel);
                break;

            case NPCRole::InnerDisciple:
                addEngineeringSkills(skills, baseLevel);
                break;

            case NPCRole::BranchDisciple:
                addBasicEngineeringSkills(skills, baseLevel);
                addContentSkills(skills, baseLevel);
                break;

            default:
                addBasicEngineeringSkills(skills, baseLevel);
                break;
        }
    }

    // Initialize a CareerComponent based on the NPC's realm level.
    static void initializeCareer(CareerComponent& career, RealmLevel realm) {
        switch (realm) {
            case RealmLevel::Mortal:
                career.totalXp = 0;
                career.stage = CareerStage::Junior;
                break;
            case RealmLevel::QiRefining:
                career.totalXp = 200;
                career.stage = CareerStage::Junior;
                break;
            case RealmLevel::FoundationBuilding:
                career.totalXp = 800;
                career.stage = CareerStage::Mid;
                break;
            case RealmLevel::GoldenCore:
                career.totalXp = 2500;
                career.stage = CareerStage::Senior;
                break;
            case RealmLevel::YuanInfant:
                career.totalXp = 6000;
                career.stage = CareerStage::Lead;
                break;
            case RealmLevel::Transcension:
                career.totalXp = 12000;
                career.stage = CareerStage::Expert;
                break;
            default:
                career.totalXp = 0;
                career.stage = CareerStage::Junior;
                break;
        }
    }

private:
    // Map realm to a baseline skill level
    static SkillLevel realmToSkillLevel(RealmLevel realm) {
        switch (realm) {
            case RealmLevel::Mortal:             return SkillLevel::Beginner;
            case RealmLevel::QiRefining:         return SkillLevel::Beginner;
            case RealmLevel::FoundationBuilding: return SkillLevel::Intermediate;
            case RealmLevel::GoldenCore:         return SkillLevel::Intermediate;
            case RealmLevel::YuanInfant:         return SkillLevel::Advanced;
            case RealmLevel::Transcension:       return SkillLevel::Expert;
            default:                             return SkillLevel::Beginner;
        }
    }

    // Management skills for leaders (FamilyHead, Elder)
    static void addManagementSkills(SkillTreeComponent& skills, SkillLevel level) {
        skills.addSkill("progress_tracking", SkillCategory::Management, level);
        skills.addSkill("risk_management", SkillCategory::Management, level);
        if (level >= SkillLevel::Intermediate) {
            skills.addSkill("competitive_analysis", SkillCategory::Management, level);
        }
    }

    // Architecture / system-level engineering for high-ranking NPCs
    static void addArchitectureSkills(SkillTreeComponent& skills, SkillLevel level) {
        skills.addSkill("architecture", SkillCategory::Engineering, level);
        skills.addSkill("code_review", SkillCategory::Engineering, level);
        if (level >= SkillLevel::Intermediate) {
            skills.addSkill("api_design", SkillCategory::Engineering, level,
                           {"architecture"});
        }
    }

    // Security / enforcement skills
    static void addSecuritySkills(SkillTreeComponent& skills, SkillLevel level) {
        skills.addSkill("security_audit", SkillCategory::Engineering, level);
        skills.addSkill("code_review", SkillCategory::Engineering, level);
        skills.addSkill("monitoring", SkillCategory::Engineering, level);
    }

    // Core engineering skills for disciples
    static void addEngineeringSkills(SkillTreeComponent& skills, SkillLevel level) {
        skills.addSkill("backend_dev", SkillCategory::Engineering, level);
        skills.addSkill("frontend_dev", SkillCategory::Engineering, level);
        skills.addSkill("testing", SkillCategory::Engineering, level);
        if (level >= SkillLevel::Intermediate) {
            skills.addSkill("fullstack_dev", SkillCategory::Engineering, level,
                           {"backend_dev", "frontend_dev"});
        }
    }

    // Basic engineering for lower-ranking NPCs
    static void addBasicEngineeringSkills(SkillTreeComponent& skills, SkillLevel level) {
        skills.addSkill("testing", SkillCategory::Engineering, level);
        skills.addSkill("deployment", SkillCategory::Engineering, level);
    }

    // Design skills (for CoreDisciple+)
    static void addDesignSkills(SkillTreeComponent& skills, SkillLevel level) {
        skills.addSkill("graphic_design", SkillCategory::Design, level);
        skills.addSkill("usability_testing", SkillCategory::Design, level);
    }

    // Content skills (for BranchDisciple)
    static void addContentSkills(SkillTreeComponent& skills, SkillLevel level) {
        skills.addSkill("content_writing", SkillCategory::Content, level);
    }
};
