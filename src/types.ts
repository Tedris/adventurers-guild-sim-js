// Adventurers Guild Simulator — Shared TypeScript Interfaces
// ===========================================================
// All type definitions extracted from the monolithic entities.js, store.js,
// render.js, and save-load.js files.

// ─── Adventurer Types ──────────────────────────────────

export interface Adventurer {
  id: string;
  name: string;
  class: string;
  stats: Stats;
  equipment: Equipment;
  morale: number;
  origin: string;
  personality: Personality;
  level: number;
  experience: number;
  rank: string;
  aptitudes: Record<string, number>;
  evolved: boolean;
  evolutionDate: string | null;
  isGuildMaster?: boolean;
}

export type Stats = {
  str: number;
  dex: number;
  int: number;
  vit: number;
  lck: number;
};

export type Equipment = {
  weapon: EquipmentItem | null;
  armor: EquipmentItem | null;
  accessory: EquipmentItem | null;
};

export type EquipmentItem = {
  name: string;
  rarity: string;
  slot?: string;
};

export type Personality = {
  traits: string[];
};

export type PersonalityTraitDef = {
  morale: number;
  quest_success: number;
  aptitude_bonus?: Record<string, number>;
  description: string;
};

// ─── Quest Types ───────────────────────────────────────

export interface Quest {
  id: string;
  name: string;
  difficulty: number;
  requirements: QuestRequirements;
  rewards: QuestRewards;
  description: string;
}

export interface QuestRequirements {
  minStats: Stats;
  preferredClasses: string[];
  minPartySize: number;
  maxPartySize: number;
}

export interface QuestRewards {
  gold: number;
  experience: number;
}

// QuestTemplate extends Quest but without the generated id
export type QuestTemplate = Omit<Quest, 'id'>;

// ─── Party Types ───────────────────────────────────────

export interface Party {
  id: string;
  adventurerIds: string[];
  synergyScore: number;
  aptitudeBonus: number;
}

// ─── Event Types ───────────────────────────────────────

export interface EventTemplate {
  id: string;
  category: string;
  weight: number;
  title: string;
  description: string;
  choices: EventChoice[];
}

export interface EventChoice {
  label: string;
  effect: (state: Record<string, unknown>) => EventDelta;
}

export interface EventDelta {
  gold?: number;
  moraleAdjustment?: number;
  departureCount?: number;
  retirementTriggered?: boolean;
  fameDelta?: number;
  reputation?: number;
  favorDebt?: number;
  questRisk?: number;
  temporaryUnavailability?: number;
  retentionBonus?: number;
  trainingBonus?: number;
  [key: string]: unknown;
}

export interface GameEvent {
  eventId: string;
  title: string;
  description: string;
  category: string;
  choices: Array<{ label: string; index: number }>;
  timestamp: number;
  resolved: boolean;
}

// ─── Economy Types ─────────────────────────────────────

export type UpgradeType = 'office' | 'equipment' | 'job_postings';

export interface UpgradeDef {
  type: UpgradeType;
  name: string;
  currentLevel: number;
  nextCost: number;
  description: string;
}

export interface UpgradeEffects {
  perLevel: Record<string, number>;
  description: string;
}

// ─── Legacy Perk Types ─────────────────────────────────

export interface LegacyPerk {
  id: string;
  templateId: string;
  name: string;
  description: string;
  effects: Stats;
  appliedAt: number;
}

export interface LegacyPerkTemplate {
  id: string;
  name: string;
  description: string;
  effects: Partial<Stats>;
  allowedClasses: string[];
  minRank: string;
}

// ─── Evolution Types ───────────────────────────────────

export interface ClassEvolution {
  requires: { weapon?: string; armor?: string; accessory?: string };
  result: string;
  description: string;
  aptitudes: Record<string, number>;
  minRank: string;
}

export interface EvolutionStatus {
  matching: ClassEvolution[];
  unmet: Array<ClassEvolution & { missing: Array<[string, string]> }>;
  canEvolve: boolean;
}

// ─── Office Level Types ────────────────────────────────

export interface OfficeLevelThreshold {
  level: number;
  quests: number;
  roster: number;
}

export interface OfficeLevelResult {
  level: number;
  nextLevel: number | null;
  progress: number;
  label: string;
}

// ─── Fame Types ────────────────────────────────────────

export interface FameLevelResult {
  name: string;
  currentFame: number;
  progress: number;
  nextLevel: string | null;
  bonus: number;
}

export interface FameMilestone {
  fame: number;
  name: string;
}

export interface FameTier {
  min: number;
  name: string;
  bonus: number;
  description: string;
}

// ─── Milestone Arrival Types ───────────────────────────

export interface MilestoneArrivalConfig {
  type: 'raw' | 'equipped';
  equipment?: string[];
}

export interface FameMilestoneArrival {
  fame: number;
  arrivals: MilestoneArrivalConfig[];
}

// ─── Active Quest Types ────────────────────────────────

export interface ActiveQuest {
  questId: string;
  questData: Quest;
  partyId: string;
  status: 'active' | 'complete' | 'failed';
  tickCount: number;
  startTime: number;
  result?: QuestOutcome;
}

export interface QuestOutcome {
  success: boolean;
  gold: number;
  experience: number;
  moraleAdjustment: number;
}

// ─── Notification Types ────────────────────────────────

export interface Notification {
  id: string;
  message: string;
  timestamp: number;
}

// ─── Game State Type ───────────────────────────────────

export interface GameState {
  day: number;
  gold: number;
  fame: number;
  fameMilestonesReached: number[];
  officeLevel: number;
  officeVisualBonus: number;
  adventurers: Adventurer[];
  party: Party;
  quests: Quest[];
  activeQuest: ActiveQuest | null;
  questTickCount: number;
  questCount: number;
  recruitmentPool: Adventurer[];
  events: GameEvent[];
  eventCooldowns: Record<string, number>;
  upgrades: Record<string, number>;
  equipmentBonus: number;
  fameMultiplier: number;
  legacyPerks: LegacyPerk[];
  lastRetirement: { adventurerId: string; perk: LegacyPerk } | null;
  lastEvolution: { adventurerId: string; class: string } | null;
  notifications: Notification[];
  _currentView?: string;
  questRisk?: number;
  reputation?: number;
  favorDebt?: number;
}

// ─── Store Action Types ────────────────────────────────

export type ActionType =
  | 'GOLD'
  | 'MERGE_STATE'
  | 'CLEAR_NOTIFICATION'
  | 'CLEAR_ALL_NOTIFICATIONS'
  | 'HIRE'
  | 'RESTOCK'
  | 'RESTOCK_QUESTS'
  | 'ASSIGN_PARTY'
  | 'REORDER_PARTY'
  | 'UPDATE_ADVENTURER'
  | 'SEND_QUEST'
  | 'COMPLETE_QUEST'
  | 'UPGRADE_GUILD'
  | 'RETIRE'
  | 'EVOLVE_CLASS'
  | 'CLEAR_EVOLUTION'
  | 'TICK'
  | 'EVENT_FIRED'
  | 'EVENT_RESOLVED';

// Action payload types
export interface GoldAction { type: 'GOLD'; payload: number }
export interface MergeStateAction { type: 'MERGE_STATE'; payload: GameState }
export interface ClearNotificationAction { type: 'CLEAR_NOTIFICATION'; payload: { notificationId: string } }
export interface ClearAllNotificationsAction { type: 'CLEAR_ALL_NOTIFICATIONS'; payload: void }
export interface HireAction { type: 'HIRE'; payload: { adventurerId: string } }
export interface RestockAction { type: 'RESTOCK'; payload: { count: number; adventurers?: Adventurer[] } }
export interface RestockQuestsAction { type: 'RESTOCK_QUESTS'; payload: { quests: Quest[] } }
export interface AssignPartyAction { type: 'ASSIGN_PARTY'; payload: { partyId?: string; adventurerIds: string[]; quest?: Quest } }
export interface ReorderPartyAction { type: 'REORDER_PARTY'; payload: { adventurerIds: string[] } }
export interface UpdateAdventurerAction { type: 'UPDATE_ADVENTURER'; payload: { adventurerId: string; updates: Partial<Adventurer> } }
export interface SendQuestAction { type: 'SEND_QUEST'; payload: { questId: string; partyId?: string } }
export interface CompleteQuestAction { type: 'COMPLETE_QUEST'; payload: { questId: string } }
export interface UpgradeGuildAction { type: 'UPGRADE_GUILD'; payload: { upgradeType: UpgradeType; gold: number } }
export interface RetireAction { type: 'RETIRE'; payload: { adventurerId: string } }
export interface EvolveClassAction { type: 'EVOLVE_CLASS'; payload: { adventurerId: string } }
export interface ClearEvolutionAction { type: 'CLEAR_EVOLUTION'; payload: void }
export interface TickAction { type: 'TICK'; payload?: { tickCount?: number } }
export interface EventFiredAction { type: 'EVENT_FIRED'; payload: { eventId: string; title: string; description: string; category: string; choices?: Array<{ label: string }> } }
export interface EventResolvedAction { type: 'EVENT_RESOLVED'; payload: { eventId: string; choiceIndex: number } }

export type StoreAction =
  | GoldAction
  | MergeStateAction
  | ClearNotificationAction
  | ClearAllNotificationsAction
  | HireAction
  | RestockAction
  | RestockQuestsAction
  | AssignPartyAction
  | ReorderPartyAction
  | UpdateAdventurerAction
  | SendQuestAction
  | CompleteQuestAction
  | UpgradeGuildAction
  | RetireAction
  | EvolveClassAction
  | ClearEvolutionAction
  | TickAction
  | EventFiredAction
  | EventResolvedAction;

// ─── Validation Result Types ───────────────────────────

export type ValidationResult = { valid: true } | { valid: false; reason: string };

// ─── Tick Result Types ─────────────────────────────────

export interface MoraleResult {
  adjustedAdventurers: Adventurer[];
  moraleEvents: string[];
}

export interface DepartureResult {
  departed: Adventurer[];
  remaining: Adventurer[];
}

export interface QuestProgressResult {
  updatedQuests: Quest[];
  completedQuests: Quest[];
  failedQuests: Quest[];
}

// ─── Diversity Result Types ────────────────────────────

export interface DiversityResult {
  uniqueClasses: number;
  bonus: number;
}

export interface SynergyResult {
  synergyScore: number;
  diversityBonus: number;
  aptitudeBonus: number;
}

// ─── Evolution Result Types ────────────────────────────

export interface EvolutionResult {
  evolved: boolean;
  newClass: string | null;
  newAptitudes: Record<string, number> | null;
  description: string | null;
}

// ─── Event Resolution Result ───────────────────────────

export interface EventResolution {
  delta: EventDelta;
  eventId: string;
  resolvedAt: number;
  moraleAdjustment: number;
}

// ─── IndexedDB Types ───────────────────────────────────

export interface IndexedDBStateRecord {
  key: string;
  value: unknown;
}
