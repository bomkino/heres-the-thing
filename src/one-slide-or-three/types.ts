export const ENGINE_VERSION = "0.2.0" as const;

export type EvidenceBasis =
  | "measured"
  | "user_observed"
  | "source_backed"
  | "practitioner_reviewed"
  | "editorial_judgement"
  | "needs_review";

export type ClientLane =
  | "film_tv"
  | "advertising"
  | "business"
  | "education_civic"
  | "personal_other";

export type ArtefactKind =
  | "film_tv_pitch"
  | "feature_or_short_pitch"
  | "episodic_pitch"
  | "documentary_pitch"
  | "unscripted_format_pitch"
  | "show_bible"
  | "lookbook"
  | "directors_treatment"
  | "talent_facing_pack"
  | "financier_or_investor_pack"
  | "festival_or_grant_pitch"
  | "commercial_directors_treatment"
  | "agency_or_production_company_pitch"
  | "brand_or_client_pitch"
  | "fundraising_deck"
  | "sales_deck"
  | "partnership_deck"
  | "credentials_deck"
  | "company_profile"
  | "strategy_or_decision_deck"
  | "board_or_investor_update"
  | "report_or_leave_behind"
  | "training_or_lecture"
  | "keynote_or_conference_talk"
  | "product_demo"
  | "proposal"
  | "case_study_or_portfolio"
  | "other";

export type Purpose =
  | "persuade"
  | "secure_decision"
  | "inform"
  | "teach"
  | "explain"
  | "report"
  | "demonstrate"
  | "inspire"
  | "facilitate";

export type DeliveryMode =
  | "speaker_led"
  | "guided_read"
  | "self_read"
  | "dual_use"
  | "reference";

export type SlideRole =
  | "cover"
  | "section"
  | "statement"
  | "question"
  | "overview"
  | "argument"
  | "story"
  | "evidence"
  | "data"
  | "comparison"
  | "process"
  | "timeline"
  | "quote"
  | "case_study"
  | "profile"
  | "gallery"
  | "ask"
  | "summary"
  | "reference"
  | "legal_or_required_text";

export type LayoutKind =
  | "title_body"
  | "statement"
  | "two_column"
  | "quote"
  | "data_chart"
  | "cards"
  | "timeline"
  | "image_caption"
  | "table"
  | "custom"
  | "unknown";

export type AudienceSetting =
  | "large_room"
  | "small_room"
  | "video_call"
  | "laptop"
  | "phone"
  | "print"
  | "mixed_unknown";

export type AudienceTask =
  | "glance"
  | "read"
  | "compare"
  | "inspect"
  | "remember"
  | "decide";

export type RecipientKind =
  | "director"
  | "producer_or_development"
  | "production_company"
  | "commissioner_or_buyer"
  | "financier_or_investor"
  | "grant_or_fund"
  | "festival_or_lab"
  | "actor_or_talent_rep"
  | "agency_creative"
  | "brand_or_client"
  | "founder_or_operator"
  | "business_investor"
  | "customer_or_buyer"
  | "partner"
  | "board_or_executive"
  | "internal_team"
  | "learner_or_attendee"
  | "public_audience"
  | "mixed_or_unknown";

export type SpeechTextRelation =
  | "supports_speech"
  | "same_words"
  | "different_words"
  | "silent_read"
  | "no_speaker"
  | "unknown";

export type PreviewFit = "fits" | "fits_tightly" | "overflows" | "not_measured";
export type TypePressure = "comfortable" | "below_selected_minimum" | "not_measured";
export type CheckState = "pass" | "tight" | "fail" | "not_measured" | "not_applicable";

export interface SlideContent {
  title?: string;
  body?: string;
  quote?: string;
  labels?: string[];
  source?: string;
}

export interface AudienceContext {
  setting?: AudienceSetting;
  tasks?: AudienceTask[];
  familiarity?: "new" | "mixed" | "expert";
  recipient?: RecipientKind;
  textSupportUseful?: boolean;
  secondLanguageLikely?: boolean;
}

export interface TimingContext {
  exposureSeconds?: number;
  readingWordsPerMinute?: number;
  speakingWordsPerMinute?: number;
  actualRehearsalSeconds?: number;
}

export interface LanguageContext {
  tag: string;
  userCalibratedReadingWordsPerMinute?: number;
  userCalibratedSpeakingWordsPerMinute?: number;
}

export interface PreviewMeasurement {
  fit: PreviewFit;
  typePressure: TypePressure;
  titleLines?: number;
  bodyLines?: number;
  scrollWidth?: number;
  clientWidth?: number;
  scrollHeight?: number;
  clientHeight?: number;
}

export interface ContentConstraints {
  exactTextRequired?: boolean;
  cannotSplit?: boolean;
  citationRequired?: boolean;
  sourceMustBeRead?: boolean;
}

export interface SlideAssessmentInput {
  clientLane?: ClientLane;
  artefact?: ArtefactKind;
  purpose?: Purpose;
  delivery: DeliveryMode;
  role: SlideRole;
  /** Optional route-specific job. Unknown IDs safely fall back to `role`. */
  jobId?: string;
  layout?: LayoutKind;
  audience: AudienceContext;
  language: LanguageContext;
  relation: SpeechTextRelation;
  content: SlideContent;
  timing?: TimingContext;
  preview?: PreviewMeasurement;
  constraints?: ContentConstraints;
}

export interface TextMetrics {
  visibleText: string;
  mainWordCount: number;
  sourceWordCount: number;
  visibleWordCount: number;
  timedWordCount: number;
  graphemeCount: number;
  sentenceCount: number;
  paragraphCount: number;
  bulletCount: number;
  bulletGroupCount: number;
  explicitBlockCount: number;
  longestSentenceWords: number;
  locale: string;
}

export interface TimeEstimate {
  state: "estimated" | "user_calibrated" | "not_measured" | "not_applicable";
  seconds?: number;
  rate?: number;
  unit?: "words_per_minute";
  reason?: string;
}

export interface CopyBudget {
  comfortableMaxWords: number;
  tightMaxWords: number;
  comfortableMaxBlocks: number;
  tightMaxBlocks: number;
  basis: EvidenceBasis;
  status: "provisional" | "calibrated";
}

export interface SlideJobSummary {
  id: string;
  label: string;
  clientLane: ClientLane;
  baseRole: SlideRole;
  recipientSensitive: boolean;
  job: string;
  watchFor: string[];
}

export interface SplitCandidate {
  boundaryIndex: number;
  kind: "paragraph" | "bullet_group" | "sentence";
  strength: "strong" | "usable";
  wordsBefore: number;
  wordsAfter: number;
  previewBefore: string;
  previewAfter: string;
}

export interface SplitPlan {
  slideCount: 2 | 3;
  boundaryIndices: number[];
  balance: number;
  basis: "mechanical_boundaries_only";
}

export type ResultStrength = "measured" | "directional" | "context_limited";

export type AssessmentQuestionId =
  | "preview_context"
  | "text_flexibility"
  | "exposure_time"
  | "recipient"
  | "language_calibration";

export interface AssessmentQuestion {
  id: AssessmentQuestionId;
  priority: number;
  neededFor: "honest_verdict" | "stronger_advice";
  prompt: string;
  why: string;
}

export interface AssessmentReason {
  code: string;
  priority: number;
  state: "fact" | "warning" | "limit" | "action";
  basis: EvidenceBasis;
  message: string;
  nextAction?: string;
}

export type Recommendation =
  | "confirm_visual_only"
  | "add_required_source"
  | "keep_one"
  | "keep_one_tight"
  | "split_two"
  | "split_three"
  | "edit_before_splitting"
  | "make_separate_live_and_read_versions"
  | "move_detail_outside_slide"
  | "rework_delivery_or_copy"
  | "reference_density_allowed"
  | "cannot_call_yet";

export interface AssessmentChecks {
  requiredContent: CheckState;
  physicalFit: CheckState;
  timeFit: CheckState;
  structuralLoad: CheckState;
  typePressure: CheckState;
  copyBand: CheckState;
  channelCompetition: CheckState;
}

export interface SlideAssessment {
  engineVersion: string;
  recommendation: Recommendation;
  resultStrength: ResultStrength;
  strengthMessage: string;
  checks: AssessmentChecks;
  metrics: TextMetrics;
  readingTime: TimeEstimate;
  speakingTime: TimeEstimate;
  budget: CopyBudget;
  resolvedJob?: SlideJobSummary;
  reasons: AssessmentReason[];
  splitCandidates: SplitCandidate[];
  splitPlans: SplitPlan[];
  /** Exact normalised body string used by every returned split boundary. */
  splitSource: string;
  nextQuestions: AssessmentQuestion[];
  limitations: string[];
}

/** Minimal, progressive-disclosure state used before a complete assessment is ready. */
export interface IntakeDraft {
  content: SlideContent;
  clientLane?: ClientLane;
  artefact?: ArtefactKind;
  delivery?: DeliveryMode;
  role?: SlideRole;
  jobId?: string;
  recipient?: RecipientKind;
  relation?: SpeechTextRelation;
  audienceSetting?: AudienceSetting;
  exposureSeconds?: number;
  languageTag?: string;
  preview?: PreviewMeasurement;
  constraints?: ContentConstraints;
}

export type IntakeQuestionId =
  | "delivery"
  | "slide_job"
  | "recipient"
  | "speech_relation"
  | "smallest_view"
  | "exposure_time"
  | "language_calibration";

export interface IntakeQuestion {
  id: IntakeQuestionId;
  priority: number;
  neededFor: "first_result" | "stronger_result" | "route_advice";
  prompt: string;
  why: string;
}

export type ProgressiveQuestion = IntakeQuestion | AssessmentQuestion;

export interface IntakeAssessment {
  state: "needs_input" | "assessed";
  questions: IntakeQuestion[];
  /** Single highest-value question across intake and post-assessment queues. */
  nextQuestion?: ProgressiveQuestion;
  assumptions: string[];
  assessment?: SlideAssessment;
}
