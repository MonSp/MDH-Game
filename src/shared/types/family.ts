export enum FamilyLevel {
  Imperial = 1,
  First = 2,
  Second = 3,
  Third = 4
}

export interface FamilyConfig {
  id: string;
  name: string;
  level: FamilyLevel;
  country: string;
  memberCount: number;
}

export interface PlayerFamilyInfo {
  familyId: string;
  isMainBranch: boolean;
  familyName: string;
}

export const FAMILY_CONFIG = {
  INITIAL_FAVORABILITY: 50,
  HOSTILE_THRESHOLD: 0,
  NPC_KILL_PENALTY: -30,
  MERCHANT_KILL_PENALTY: -50,
  ELDER_HUNT_THRESHOLD: 0
};