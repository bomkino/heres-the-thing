import type { DeliveryContext, ExactRequirement, ProductLane, ProtectThis } from "../shared/types.ts";

export const YOU_ARE_HERE_VERSION = "0.2.1-candidate" as const;

export type YouAreHereLane = Extract<ProductLane, "scripted_feature" | "scripted_episodic"> | "unsupported";

export type Trigger =
  | "exploring"
  | "starting_outreach"
  | "offered_introduction"
  | "material_requested"
  | "meeting"
  | "formal_process"
  | "sent_waiting"
  | "sent_followup_due"
  | "rejected_passed"
  | "stuck_polishing";

export type AccessRoute =
  | "direct_request"
  | "existing_relationship"
  | "offered_introduction"
  | "representative_producer"
  | "open_process"
  | "accepted_cold"
  | "no_unsolicited"
  | "none"
  | "unknown";

export type RequirementStatus = "none" | "current" | "remembered" | "stale" | "conflicted";
export type AuthorityState = "owns_controls" | "authorised" | "shared_unclear" | "third_party_unclear";

export type FeatureStage = "idea" | "outline" | "partial" | "first_draft" | "revised" | "tested" | "packaged";
export type EpisodicStage = "premise" | "outline" | "partial_pilot" | "complete_pilot" | "tested_pilot" | "overview" | "pitch_document" | "packaged";
export type SeriesShape = "returning" | "limited" | "serial" | "anthology" | "forming" | "unknown";

export interface YouAreHereInput {
  entryContext?: "general" | "deck";
  lane?: YouAreHereLane;
  role?: string;
  trigger?: Trigger;
  desiredDecision?: string;
  recipient?: { kind: string; named: boolean };
  recipientCount?: "one" | "several_same_decision" | "several_different_decisions";
  accessRoute?: AccessRoute;
  delivery?: DeliveryContext;
  requirementStatus?: RequirementStatus;
  requirements?: ExactRequirement[];
  authority?: AuthorityState;
  featureStage?: FeatureStage;
  endingClear?: boolean;
  outsideRead?: "none" | "received_not_revised" | "revised_once" | "revised_more" | "recipient_read";
  episodicStage?: EpisodicStage;
  seriesShape?: SeriesShape;
  distinctEpisodeEvidence?: boolean;
  deckIntent?: "none" | "considering" | "requested" | "exists";
  speculativeWork?: "none" | "small" | "substantial_terms_clear" | "substantial_terms_unclear";
  confidentiality?: "ordinary" | "sensitive" | "highly_sensitive" | "unknown";
  sharedDevice?: boolean;
  safety?: "ordinary" | "pressure_or_threat" | "immediate_danger";
  protectThis?: ProtectThis;
}

export type YouAreHereQuestionId =
  | "Q-SHARED-DEVICE"
  | "Q-LANE"
  | "Q-TRIGGER"
  | "Q-REQUIREMENT"
  | "Q-DECISION"
  | "Q-RECIPIENT"
  | "Q-ACCESS"
  | "Q-FEATURE-STAGE"
  | "Q-EPISODIC-STAGE"
  | "Q-SERIES-SHAPE"
  | "Q-DELIVERY";

export interface YouAreHereQuestion {
  id: YouAreHereQuestionId;
  prompt: string;
  why: string;
  allowsUnknown: boolean;
}

export interface RouteAction {
  id: string;
  family: string;
  label: string;
  finishLine: string;
}

export interface DeckHandoffSeed {
  eligible: boolean;
  reason: string;
  projectKind?: "scripted-feature" | "scripted-episodic";
  desiredDecision?: string;
  recipientKind?: string;
  delivery?: DeliveryContext;
  exactRequirements: ExactRequirement[];
}

export interface YouAreHereResult {
  engineVersion: typeof YOU_ARE_HERE_VERSION;
  kind: "result" | "clarifier" | "redirect";
  footing: "specific" | "best_route_with_known_facts" | "private_working_plan" | "check_before_sending";
  routeId: string;
  primaryAction: RouteAction;
  appliedRuleIds: string[];
  nextQuestion?: YouAreHereQuestion;
  youAreHere: string;
  nextMove: string;
  protectThis: string;
  parkThis: string[];
  approach: string;
  afterThat: string;
  dependsOn: string[];
  limitations: string[];
  deckHandoff: DeckHandoffSeed;
}
