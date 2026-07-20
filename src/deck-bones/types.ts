import type { DeliveryContext, ExactRequirement } from "../shared/types.ts";
import type { AccessRoute, AuthorityState, EpisodicStage, FeatureStage, SeriesShape } from "../you-are-here/types.ts";
import type { SlideRole } from "../one-slide-or-three/types.ts";

export const DECK_BONES_VERSION = "0.2.1-candidate-runtime" as const;

export type ProjectKind = "scripted-feature" | "scripted-episodic";
export type RouteId = `O-${string}`;
export type SectionId = `S${number}`;

export type KnowledgeState = "current" | "planned" | "unknown" | "unverified" | "not-applicable";
export type Certainty = "confirmed" | "conditional" | "exploratory";
export type RequirementState = "required" | "recommended" | "optional" | "appendix" | "missing" | "blocked" | "excluded";
export type ReuseState = "reuse" | "revise" | "missing" | "not-this-version" | "check-first";

export interface ExistingMaterial {
  sectionId?: SectionId;
  kind: string;
  state: "rough" | "usable" | "reviewed" | "recipient_used" | "outdated";
}

export interface DeckBonesInput {
  unsupportedForm?: boolean;
  projectKind?: ProjectKind;
  role?: "writer" | "writer-director" | "director" | "producer" | "creator-showrunner" | "team" | "other";
  desiredDecision?: string;
  recipientKind?: string;
  recipientCount?: "one" | "several_same_decision" | "several_different_decisions";
  accessRoute?: AccessRoute;
  delivery?: DeliveryContext;
  exactRequirementStatus?: "none" | "current" | "stale" | "ambiguous" | "conflicted";
  exactRequirements?: ExactRequirement[];
  authority?: AuthorityState;
  featureStage?: FeatureStage;
  endingClear?: boolean;
  outsideRead?: "none" | "received_not_revised" | "revised_once" | "revised_more" | "recipient_read";
  episodicStage?: EpisodicStage;
  seriesShape?: SeriesShape;
  distinctEpisodeEvidence?: boolean;
  deckRequested?: boolean;
  visualCaseMatters?: boolean;
  privateOrInternal?: boolean;
  liveMeeting?: boolean;
  existingDeck?: boolean;
  staffingSampleDecision?: boolean;
  commissionerDecision?: boolean;
  financeDecision?: boolean;
  financeBasis?: "missing" | "partial" | "qualified";
  talentDecision?: boolean;
  speculativeWork?: "none" | "small" | "substantial_terms_clear" | "substantial_terms_unclear";
  confidentiality?: "ordinary" | "sensitive" | "highly_sensitive" | "unknown";
  imageRights?: "owned_or_licensed" | "uncertain" | "none" | "unknown";
  deadlineBand?: "within_72_hours" | "within_week" | "two_to_four_weeks" | "later" | "none" | "unknown";
  existingMaterials?: ExistingMaterial[];
  recipientDoubt?: string;
}

export interface OutcomeDefinition {
  id: RouteId;
  name: string;
  headline: string;
  kind: "stop" | "working" | "document" | "rehearsal" | "specialist";
}

export interface SectionDefinition {
  id: SectionId;
  name: string;
  job: string;
  readerQuestion: string;
  leaveOut: string;
  slideRole: SlideRole;
  oneSlideJobId?: string;
}

export interface EvaluatedSection {
  sectionId: SectionId;
  state: RequirementState;
  materialState: ReuseState;
  reason: string;
  doneWhen: string;
  oneSlideSeed: {
    role: SlideRole;
    jobId?: string;
  };
}

export interface TaskCard {
  id: string;
  title: string;
  action: string;
  doneWhen: string[];
  blocks: Array<RouteId | SectionId>;
}

export interface GateResult {
  code: string;
  state: "clear" | "conditional" | "blocked";
  reason: string;
}

export interface DeckBonesExplanation {
  headline: string;
  thisVersionIsFor: string;
  because: string[];
  reuse: string[];
  buildNow: string[];
  bringFirst: string[];
  leaveOut: string[];
  cautions: string[];
  changeTriggers: string[];
}

export interface DeckBonesResult {
  engineVersion: typeof DECK_BONES_VERSION;
  inputFingerprint: string;
  primary: {
    routeId: RouteId;
    certainty: Certainty;
    reasonCodes: string[];
  };
  outcome: OutcomeDefinition;
  nextQuestion?: { id: string; prompt: string; why: string };
  sections: EvaluatedSection[];
  tasks: TaskCard[];
  gates: GateResult[];
  explanation: DeckBonesExplanation;
  exactRequirements: ExactRequirement[];
  limitations: string[];
}
