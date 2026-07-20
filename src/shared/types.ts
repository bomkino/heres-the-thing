export const SUITE_VERSION = "0.1.1" as const;
export const SESSION_SCHEMA_VERSION = "0.1.0" as const;

export type ToolId = "you_are_here" | "deck_bones" | "one_slide_or_three";

export type ProductLane =
  | "scripted_feature"
  | "scripted_episodic"
  | "documentary_unscripted"
  | "advertising"
  | "business"
  | "education_civic"
  | "personal_other"
  | "unknown";

export type FactSource =
  | "user"
  | "current_written_requirement"
  | "current_direct_clarification"
  | "current_official_source"
  | "reviewed_lane_default"
  | "declared_editorial_judgement"
  | "tool_handoff";

export type Known<T> =
  | { status: "known"; value: T; source: FactSource; checkedOn?: string }
  | { status: "unknown" }
  | { status: "conflicted"; values: Array<{ value: T; source: FactSource }> }
  | { status: "stale"; previousValue: T; source: FactSource; checkedOn?: string }
  | { status: "not_applicable" };

export type DeliveryContext =
  | "read_alone"
  | "before_meeting"
  | "live"
  | "after_conversation"
  | "portal"
  | "leave_behind"
  | "informal"
  | "internal"
  | "unknown";

export interface ExactRequirement {
  id: string;
  name: string;
  status: "mandatory" | "optional" | "prohibited" | "unclear";
  format?: string;
  lengthLimit?: string;
  fileLimit?: string;
  language?: string;
  checkedOn?: string;
}

export interface SharedFacts {
  lane: Known<ProductLane>;
  role: Known<string>;
  desiredDecision: Known<string>;
  recipient: Known<{ kind: string; named: boolean }>;
  delivery: Known<DeliveryContext>;
  requirements: Known<ExactRequirement[]>;
  language: Known<{ workingLanguage: string; recipientLanguage?: string }>;
  sharedDevice: Known<boolean>;
  accessibilityNeeds: string[];
}

export interface ProtectThis {
  selectedLine?: string;
  boundaries?: string[];
  openToChange?: string[];
  responsibility?: string[];
}

export interface JourneyEvent {
  id: string;
  at: string;
  tool: ToolId;
  type: "entered" | "assessed" | "corrected" | "handed_off" | "exported" | "cleared";
  summary: string;
}

export interface ToolEnvelope {
  input?: unknown;
  result?: unknown;
  version?: string;
  updatedAt?: string;
}

export interface SuiteSession {
  schemaVersion: typeof SESSION_SCHEMA_VERSION;
  suiteVersion: typeof SUITE_VERSION;
  id: string;
  createdAt: string;
  updatedAt: string;
  activeTool: ToolId;
  shared: SharedFacts;
  protectThis?: ProtectThis;
  dictionary: {
    pinnedTermIds: string[];
    recentTermIds: string[];
  };
  tools: Record<ToolId, ToolEnvelope>;
  history: JourneyEvent[];
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function unknown<T>(): Known<T> {
  return { status: "unknown" };
}

export function known<T>(value: T, source: FactSource = "user"): Known<T> {
  return { status: "known", value, source };
}
