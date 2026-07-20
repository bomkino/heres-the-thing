import type { DeckBonesResult, EvaluatedSection, OneSlideOrThree } from "../../src/index.ts";

export type Route = "home" | "slide" | "deck" | "next" | "words" | "plan";
export type DeckRide = "quick" | "deep";
export type DeckFormat = "feature" | "series";
export type DeckGoal = "read" | "meeting" | "producer" | "creative" | "funding" | "team" | "specific" | "unsure";
export type DeckRecipient = "producer" | "director" | "company" | "buyer" | "financier" | "fund" | "talent" | "team";
export type DeckDelivery = "live" | "read" | "both" | "internal";
export type DeckStage = "idea" | "outline" | "draft" | "revised" | "tested" | "packaged";
export type DeckMaterials = "fresh" | "notes" | "core" | "deck";
export type SpecificAsk = "pitch-deck" | "one-pager" | "lookbook" | "series-bible" | "treatment" | "application" | "unsure";
export type DeckRole = "writer" | "writer-director" | "director" | "producer" | "creator-showrunner" | "team";
export type RecipientShape = "one" | "several_same_decision" | "several_different_decisions";
export type AccessRouteChoice = "direct_request" | "existing_relationship" | "offered_introduction" | "representative_producer" | "open_process" | "accepted_cold" | "no_unsolicited" | "none" | "unknown";
export type RequirementStatusChoice = "none" | "current" | "stale" | "ambiguous" | "conflicted";
export type DeckBoundary = "ordinary" | "images_unclear" | "finance_unchecked" | "substantial_unpaid" | "sensitive";
export type DeadlineBand = "within_72_hours" | "within_week" | "two_to_four_weeks" | "later" | "none";

export interface DeckAnswers {
  format?: DeckFormat;
  goal?: DeckGoal;
  specificAsk?: SpecificAsk;
  recipient?: DeckRecipient;
  delivery?: DeckDelivery;
  stage?: DeckStage;
  materials?: DeckMaterials;
  ride?: DeckRide;
  role?: DeckRole;
  recipientShape?: RecipientShape;
  access?: AccessRouteChoice;
  requirementStatus?: RequirementStatusChoice;
  boundaries?: DeckBoundary[];
  deadline?: DeadlineBand;
}

export type BroadLane = "film" | "advertising" | "startup" | "education" | "other";
export type Situation = "exploring" | "outreach" | "requested" | "meeting" | "waiting" | "followup" | "passed" | "stuck";
export type DesiredMove = "read" | "meet" | "approve" | "fund" | "align" | "unsure";
export type BroadDelivery = "live" | "read" | "both";

export interface NextAnswers {
  lane?: BroadLane;
  situation?: Situation;
  move?: DesiredMove;
  delivery?: BroadDelivery;
}

export interface NextAdvice {
  eyebrow: string;
  headline: string;
  body: string;
  doNow: string[];
  doNot: string[];
  nextTool?: Route;
  nextToolLabel?: string;
}

export type SlideMode = "live" | "read" | "both";
export type SlideJob = "statement" | "overview" | "story" | "evidence" | "compare" | "process" | "gallery" | "ask";
export type SlideViewport = "room" | "laptop" | "phone" | "print";
export type SlideTime = "controlled" | "five" | "ten" | "twenty" | "thirty";

export interface SlideDraft {
  copy: string;
  title: string;
  mode: SlideMode;
  job: SlideJob;
  viewport: SlideViewport;
  time: SlideTime;
  craft: boolean;
}

export interface CraftObservation {
  state: "good" | "watch" | "unknown";
  label: string;
  detail: string;
}

export interface SlideResultView {
  raw: OneSlideOrThree.SlideAssessment;
  headline: string;
  body: string;
  craft: CraftObservation[];
}

export interface DeckPlanView {
  raw: DeckBonesResult;
  headline: string;
  intro: string;
  sections: EvaluatedSection[];
  optionalSections: EvaluatedSection[];
  reasons: string[];
  leaveOut: string[];
  preDeckAction?: string;
}

export interface AppState {
  route: Route;
  deckStep: number;
  deck: DeckAnswers;
  deckRide?: DeckRide;
  deckPlan?: DeckPlanView;
  nextStep: number;
  next: NextAnswers;
  nextAdvice?: NextAdvice;
  quick: SlideDraft;
  quickResult?: SlideResultView;
  slide: SlideDraft;
  slideResult?: SlideResultView;
  lastSlideOrigin?: "quick" | "full";
  dictionaryOpen: boolean;
  dictionaryQuery: string;
  selectedTermId?: string;
  dictionaryCategory: string;
}
