import { getCopyBudget, getDualUseBudgets } from "./config.ts";
import { getSlideJobProfile } from "./jobs.ts";
import { buildSplitPlans, findSplitCandidates, normaliseSplitSource } from "./splits.ts";
import { analyseText, countWords } from "./text-analysis.ts";
import { estimateReadingTime, estimateSpeakingTime } from "./time.ts";
import {
  ENGINE_VERSION,
  type AssessmentQuestion,
  type AssessmentChecks,
  type AssessmentReason,
  type CheckState,
  type Recommendation,
  type ResultStrength,
  type SlideAssessment,
  type SlideAssessmentInput,
  type TimeEstimate,
} from "./types.ts";

export function assessSlide(input: SlideAssessmentInput): SlideAssessment {
  const locale = input.language.tag || "und";
  const metrics = analyseText(input.content, locale, input.constraints?.sourceMustBeRead ?? false);
  const readingTime = estimateReadingTime(metrics.timedWordCount, input.language, input.timing);
  const speakingTime: TimeEstimate = input.relation === "same_words"
    ? estimateSpeakingTime(metrics.mainWordCount, input.language, input.timing)
    : {
        state: "not_applicable",
        reason: "Visible copy is not the spoken script, so a spoken-time estimate would be misleading.",
      };
  const job = getSlideJobProfile(input.jobId);
  const budget = getCopyBudget(input.role, input.delivery, input.jobId);
  const splitSource = normaliseSplitSource(input.content.body ?? "");
  const candidates = findSplitCandidates(splitSource, locale);
  const splitPlans = buildSplitPlans(candidates, Math.max(1, countWords(splitSource, locale)));
  const reasons: AssessmentReason[] = [];

  const checks: AssessmentChecks = {
    requiredContent: requiredContentCheck(input, metrics.sourceWordCount),
    physicalFit: physicalCheck(input),
    timeFit: timeCheck(input, readingTime.seconds, speakingTime.seconds),
    structuralLoad: bandCheck(metrics.explicitBlockCount, budget.comfortableMaxBlocks, budget.tightMaxBlocks),
    typePressure: typeCheck(input),
    copyBand: bandCheck(metrics.visibleWordCount, budget.comfortableMaxWords, budget.tightMaxWords),
    channelCompetition: channelCheck(input),
  };

  addMeasuredReasons(reasons, input, checks, metrics, readingTime.seconds, speakingTime.seconds, budget);
  addLimitReasons(reasons, input, readingTime.state, speakingTime.state);
  if (metrics.locale === "und" && !/^und$/iu.test(locale)) reasons.push({
    code: "locale_fallback",
    priority: 36,
    state: "limit",
    basis: "measured",
    message: "The supplied language tag was not valid, so locale-neutral segmentation was used.",
    nextAction: "Confirm the copy language for more reliable segmentation.",
  });
  addRouteReasons(reasons, input, job);

  const recommendation = chooseRecommendation(
    input,
    checks,
    metrics.visibleWordCount,
    metrics.mainWordCount,
    splitPlans.length > 0,
  );
  addRecommendationReason(reasons, recommendation, splitPlans.length > 0);
  const nextQuestions = buildNextQuestions(
    input,
    checks,
    job,
    readingTime.state,
    speakingTime.state,
    recommendation,
  );
  const resultStrength = resolveResultStrength(input, checks, recommendation, nextQuestions);

  return {
    engineVersion: ENGINE_VERSION,
    recommendation,
    resultStrength,
    strengthMessage: strengthMessage(resultStrength, recommendation),
    checks,
    metrics,
    readingTime,
    speakingTime,
    budget,
    resolvedJob: job ? {
      id: job.id,
      label: job.label,
      clientLane: job.clientLane,
      baseRole: job.baseRole,
      recipientSensitive: job.recipientSensitive,
      job: job.job,
      watchFor: [...job.watchFor],
    } : undefined,
    reasons: reasons.sort((a, b) => a.priority - b.priority || a.code.localeCompare(b.code)),
    splitCandidates: candidates,
    splitPlans,
    splitSource,
    nextQuestions,
    limitations: [
      "This measures copy load and the supplied preview. It does not judge truth, clarity, originality, persuasion, or creative quality.",
      "Copy bands are provisional editorial starting points, not universal presentation laws.",
      "Split plans use explicit mechanical boundaries only. A person must judge whether each resulting slide is coherent.",
      "Physical fit is exact only for the rendered preview after the intended fonts load.",
    ],
  };
}

function physicalCheck(input: SlideAssessmentInput): CheckState {
  const fit = input.preview?.fit ?? "not_measured";
  if (fit === "overflows") return "fail";
  if (fit === "fits_tightly") return "tight";
  if (fit === "fits" && (input.preview?.titleLines ?? 0) >= 3) return "tight";
  if (fit === "fits") return "pass";
  return "not_measured";
}

function requiredContentCheck(input: SlideAssessmentInput, sourceWordCount: number): CheckState {
  const sourceRequired = input.constraints?.citationRequired || input.constraints?.sourceMustBeRead;
  if (!sourceRequired) return "not_applicable";
  return sourceWordCount > 0 ? "pass" : "fail";
}

function typeCheck(input: SlideAssessmentInput): CheckState {
  if (!input.preview || input.preview.fit === "not_measured") return "not_measured";
  const pressure = input.preview?.typePressure ?? "not_measured";
  if (pressure === "below_selected_minimum") return "fail";
  if (pressure === "comfortable") return "pass";
  return "not_measured";
}

function channelCheck(input: SlideAssessmentInput): CheckState {
  if (input.relation === "unknown") return "not_measured";
  if (["self_read", "reference"].includes(input.delivery) || input.relation === "no_speaker") {
    return "not_applicable";
  }
  if (input.relation === "same_words") return input.audience.textSupportUseful ? "tight" : "fail";
  if (input.relation === "different_words") return "tight";
  return "pass";
}

function timeCheck(input: SlideAssessmentInput, readingSeconds?: number, speakingSeconds?: number): CheckState {
  const exposure = input.timing?.exposureSeconds;
  const rehearsal = input.timing?.actualRehearsalSeconds;
  if (!isPositiveFinite(exposure)) return "not_measured";

  if (isPositiveFinite(rehearsal) && rehearsal > exposure) return "fail";
  if (isPositiveFinite(rehearsal) && rehearsal >= exposure * 0.9) return "tight";
  if (isPositiveFinite(rehearsal)) return "pass";

  const audienceReads = input.delivery === "guided_read"
    || input.relation === "silent_read"
    || input.relation === "different_words"
    || input.constraints?.sourceMustBeRead;
  if (audienceReads && typeof readingSeconds === "number") {
    if (readingSeconds > exposure) return "fail";
    if (readingSeconds >= exposure * 0.8) return "tight";
    return "pass";
  }
  if (audienceReads) return "not_measured";

  if (input.relation === "same_words" && typeof speakingSeconds === "number") {
    if (speakingSeconds > exposure) return "fail";
    if (speakingSeconds >= exposure * 0.9) return "tight";
    return "pass";
  }
  if (input.relation === "same_words" || input.relation === "unknown") return "not_measured";
  return "not_applicable";
}

function bandCheck(value: number, comfortable: number, tight: number): CheckState {
  if (value > tight) return "fail";
  if (value > comfortable) return "tight";
  return "pass";
}

function chooseRecommendation(
  input: SlideAssessmentInput,
  checks: AssessmentChecks,
  totalWords: number,
  mainWords: number,
  hasSplitPlan: boolean,
): Recommendation {
  const hardFailure = checks.physicalFit === "fail" || checks.typePressure === "fail" || checks.timeFit === "fail";
  const loadFailure = checks.copyBand === "fail" || checks.structuralLoad === "fail";
  const contextMissing = checks.physicalFit === "not_measured"
    && ["not_measured", "not_applicable"].includes(checks.timeFit);
  const constraints = input.constraints ?? {};

  if (checks.requiredContent === "fail") return "add_required_source";
  if (mainWords === 0) return "confirm_visual_only";

  if (input.delivery === "dual_use") {
    const { live, read } = getDualUseBudgets(input.role, input.jobId);
    if (totalWords > live.tightMaxWords && totalWords <= read.tightMaxWords) {
      return "make_separate_live_and_read_versions";
    }
  }

  if (hardFailure && constraints.exactTextRequired) return "move_detail_outside_slide";
  if (loadFailure && constraints.exactTextRequired) {
    return contextMissing ? "cannot_call_yet" : "keep_one_tight";
  }
  if ((hardFailure || loadFailure) && constraints.cannotSplit) return "edit_before_splitting";

  if (hardFailure || loadFailure) {
    if (!hasSplitPlan) return "edit_before_splitting";
    const threePlanExists = findPlan(input, 3);
    const budget = getCopyBudget(input.role, input.delivery, input.jobId);
    const pressureRatio = totalWords / Math.max(1, budget.tightMaxWords);
    if (threePlanExists && pressureRatio >= 1.8) return "split_three";
    return "split_two";
  }

  if (checks.channelCompetition === "fail") return "rework_delivery_or_copy";
  if (input.delivery === "reference" && checks.physicalFit === "pass") return "reference_density_allowed";
  if (contextMissing) return "cannot_call_yet";
  if (Object.values(checks).includes("tight")) return "keep_one_tight";
  return "keep_one";
}

function addRouteReasons(
  reasons: AssessmentReason[],
  input: SlideAssessmentInput,
  job: ReturnType<typeof getSlideJobProfile>,
): void {
  if (input.jobId && !job) reasons.push({
    code: "job_unknown",
    priority: 38,
    state: "limit",
    basis: "measured",
    message: `This page type is not in the current route pack, so generic ${input.role.replaceAll("_", " ")} guidance was used.`,
  });
  if (job && input.clientLane && job.clientLane !== input.clientLane) reasons.push({
    code: "job_lane_mismatch",
    priority: 12,
    state: "warning",
    basis: "measured",
    message: `${job.label} belongs to the ${job.clientLane.replaceAll("_", " & ")} route, but this assessment is marked ${input.clientLane.replaceAll("_", " & ")}.`,
    nextAction: "Confirm the route. Do not silently apply another audience's conventions.",
  });
  if (job && job.baseRole !== input.role) reasons.push({
    code: "job_role_mismatch",
    priority: 13,
    state: "warning",
    basis: "measured",
    message: `${job.label} uses ${job.baseRole.replaceAll("_", " ")} logic, but the page is also marked ${input.role.replaceAll("_", " ")}.`,
    nextAction: "Use the page job as the source of truth, or correct the generic role.",
  });
  if (job && input.artefact && !job.artefacts.includes(input.artefact)) reasons.push({
    code: "job_artefact_mismatch",
    priority: 13,
    state: "warning",
    basis: "editorial_judgement",
    message: `${job.label} is not part of the selected ${input.artefact.replaceAll("_", " ")} route pack.`,
    nextAction: "Confirm the page's job or the artifact. Keep an intentional exception if it serves the real recipient.",
  });
  if (job?.recipientSensitive && !input.audience.recipient) reasons.push({
    code: "recipient_missing",
    priority: 14,
    state: "limit",
    basis: "practitioner_reviewed",
    message: `${job.label} changes materially by recipient, but no recipient is selected. Copy load is measured; relevance is not yet judged.`,
    nextAction: "Choose the real first recipient or mixed/unknown.",
  });
  if (job?.id === "film.finance") reasons.push({
    code: "finance_specialist_review",
    priority: 34,
    state: "limit",
    basis: "practitioner_reviewed",
    message: "The tool can check visible load and status language here; it cannot validate finance, recoupment, securities, tax, legal terms, or returns.",
    nextAction: "Use qualified finance and legal review before circulation.",
  });
  if (
    job?.id === "film.finance"
    && ["director", "actor_or_talent_rep"].includes(input.audience.recipient ?? "")
  ) reasons.push({
    code: "finance_recipient_mismatch",
    priority: 11,
    state: "warning",
    basis: "practitioner_reviewed",
    message: `Detailed finance rarely serves a first ${input.audience.recipient?.replaceAll("_", " ")} read.`,
    nextAction: "Move it to a producer/financier version unless this recipient explicitly asked for it.",
  });
  if (["film.documentary_access", "film.documentary_approach"].includes(job?.id ?? "")) reasons.push({
    code: "documentary_human_review",
    priority: 35,
    state: "limit",
    basis: "source_backed",
    message: "Copy fit cannot resolve access, consent, participant safety, cultural authority, or editorial ethics.",
    nextAction: "Keep uncertainty explicit and use appropriate human review.",
  });
}

function findPlan(input: SlideAssessmentInput, count: 2 | 3): boolean {
  const source = normaliseSplitSource(input.content.body ?? "");
  const candidates = findSplitCandidates(source, input.language.tag || "und");
  const words = countWords(source, input.language.tag || "und");
  return buildSplitPlans(candidates, Math.max(1, words)).some((plan) => plan.slideCount === count);
}

function addMeasuredReasons(
  reasons: AssessmentReason[],
  input: SlideAssessmentInput,
  checks: AssessmentChecks,
  metrics: ReturnType<typeof analyseText>,
  readingSeconds: number | undefined,
  speakingSeconds: number | undefined,
  budget: ReturnType<typeof getCopyBudget>,
): void {
  reasons.push({
    code: "observed_copy",
    priority: 20,
    state: "fact",
    basis: "measured",
    message: measuredCopyMessage(metrics),
  });

  if (checks.physicalFit === "fail") reasons.push({
    code: "physical_overflow",
    priority: 1,
    state: "fact",
    basis: "measured",
    message: "Copy overflows the selected preview.",
    nextAction: "Split, edit, or choose a different layout. Do not shrink type below the selected minimum.",
  });
  if (checks.physicalFit === "tight") reasons.push({
    code: "physical_tight",
    priority: 4,
    state: "warning",
    basis: input.preview?.fit === "fits_tightly" ? "measured" : "editorial_judgement",
    message: (input.preview?.titleLines ?? 0) >= 3
      ? `The title wraps to ${input.preview?.titleLines} lines and is beginning to do body-copy work.`
      : "Copy fits the preview with little spare room.",
  });
  if (checks.typePressure === "fail") reasons.push({
    code: "type_pressure",
    priority: 2,
    state: "fact",
    basis: "measured",
    message: "Preview only fits after going below the text size the user selected.",
    nextAction: "Restore selected type size, then split or edit.",
  });
  if (checks.requiredContent === "fail") reasons.push({
    code: "required_source_missing",
    priority: 1,
    state: "warning",
    basis: "measured",
    message: "This page is marked as needing a source, but no source text is present.",
    nextAction: "Add a recoverable source before treating the page as ready.",
  });
  if (checks.copyBand === "fail") reasons.push({
    code: "copy_band_over",
    priority: 8,
    state: "warning",
    basis: budget.basis,
    message: `${metrics.visibleWordCount} visible words exceed the provisional ${input.delivery.replaceAll("_", " ")} review band of ${budget.tightMaxWords}.`,
    nextAction: "Treat this as a review trigger, not proof the slide is bad.",
  });
  if (checks.copyBand === "tight") reasons.push({
    code: "copy_band_tight",
    priority: 10,
    state: "warning",
    basis: budget.basis,
    message: `${metrics.visibleWordCount} visible words sit in the provisional tight band for this role and delivery mode.`,
  });
  if (checks.structuralLoad === "fail") reasons.push({
    code: "block_load_over",
    priority: 7,
    state: "warning",
    basis: budget.basis,
    message: `${metrics.explicitBlockCount} visible blocks compete in a mode whose provisional review band ends at ${budget.tightMaxBlocks}.`,
  });
  if (checks.channelCompetition === "fail") reasons.push({
    code: "duplicate_channels",
    priority: 5,
    state: "warning",
    basis: "source_backed",
    message: "Audience is asked to read the same full text while listening to it.",
    nextAction: "Use shorter support text, planned silence, or keep full text when access needs make it useful.",
  });
  if (checks.channelCompetition === "tight" && input.audience.textSupportUseful) reasons.push({
    code: "text_support_exception",
    priority: 6,
    state: "limit",
    basis: "source_backed",
    message: "Visible text may aid access or decoding here; do not remove it merely to satisfy a minimal-text rule.",
  });
  if (checks.timeFit === "fail") reasons.push({
    code: "time_over",
    priority: 3,
    state: "fact",
    basis: isPositiveFinite(input.timing?.actualRehearsalSeconds) ? "user_observed" : "editorial_judgement",
    message: timeMessage(input, readingSeconds, speakingSeconds, "exceeds"),
    nextAction: "Add time, pause for reading, edit, or split.",
  });
  if (checks.timeFit === "tight") reasons.push({
    code: "time_tight",
    priority: 9,
    state: "warning",
    basis: isPositiveFinite(input.timing?.actualRehearsalSeconds) ? "user_observed" : "editorial_judgement",
    message: timeMessage(input, readingSeconds, speakingSeconds, "nearly fills"),
  });
}

function timeMessage(
  input: SlideAssessmentInput,
  readingSeconds: number | undefined,
  speakingSeconds: number | undefined,
  verb: string,
): string {
  const exposure = input.timing?.exposureSeconds;
  const rehearsal = input.timing?.actualRehearsalSeconds;
  if (isPositiveFinite(rehearsal)) return `Actual rehearsal took ${rehearsal}s and ${verb} the ${exposure}s slide budget.`;
  if (
    input.delivery === "guided_read"
    || input.constraints?.sourceMustBeRead
    || ["silent_read", "different_words"].includes(input.relation)
  ) {
    return `Estimated reading time of ${readingSeconds}s ${verb} the ${exposure}s slide budget.`;
  }
  return `Estimated spoken time of ${speakingSeconds}s ${verb} the ${exposure}s slide budget.`;
}

function addLimitReasons(
  reasons: AssessmentReason[],
  input: SlideAssessmentInput,
  readingState: string,
  speakingState: string,
): void {
  const readingRelevant = ["guided_read", "self_read", "reference"].includes(input.delivery)
    || input.constraints?.sourceMustBeRead
    || ["different_words", "silent_read"].includes(input.relation);
  if (!input.preview || input.preview.fit === "not_measured") reasons.push({
    code: "preview_missing",
    priority: 40,
    state: "limit",
    basis: "measured",
    message: "Physical fit was not measured in a rendered preview.",
    nextAction: "Choose a layout, dimensions, type preset, and wait for fonts before measuring.",
  });
  if (readingState === "not_measured" && readingRelevant) reasons.push({
    code: "reading_rate_missing",
    priority: 41,
    state: "limit",
    basis: "source_backed",
    message: "Reading time was not estimated because no reviewed or user-calibrated rate applies.",
  });
  if (speakingState === "not_measured" && input.relation === "same_words") reasons.push({
    code: "speaking_rate_missing",
    priority: 42,
    state: "limit",
    basis: "source_backed",
    message: "Speaking time was not estimated because no reviewed or user-calibrated rate applies.",
  });
}

function addRecommendationReason(
  reasons: AssessmentReason[],
  recommendation: Recommendation,
  hasSplitPlan: boolean,
): void {
  const messages: Record<Recommendation, string> = {
    confirm_visual_only: "There is no main copy to assess. If this is intentionally visual or source-only, check that its meaning is available to people who cannot see the image; otherwise add the words the page needs.",
    add_required_source: "Add the required source before deciding whether the rest of the page is finished.",
    keep_one: "Keep one. The mechanical checks we could run pass.",
    keep_one_tight: "Keep one if the named compromise is intentional; this slide is tight, not automatically wrong.",
    split_two: "Two slides are worth previewing. This is the smallest mechanical split that relieves the named pressure.",
    split_three: "Three slides are worth previewing. The copy already contains three reviewable sections.",
    edit_before_splitting: "Pressure is real, but the copy has no safe mechanical split or splitting is disallowed. Edit first.",
    make_separate_live_and_read_versions: "One file is doing two incompatible jobs. Make a lean live version and a complete reading version.",
    move_detail_outside_slide: "Exact required text should move to notes, appendix, handout, or an accessible companion instead of being shrunk or silently cut.",
    rework_delivery_or_copy: "The page fits, but the audience is being asked to read the same full copy while listening. Shorten the support text, plan silent reading time, or keep it when access needs make it useful.",
    reference_density_allowed: "Dense reference content can stay when it fits and the audience controls reading time.",
    cannot_call_yet: "We can see the copy, but an honest verdict needs a real layout or meaningful time context.",
  };
  reasons.push({
    code: `recommend_${recommendation}`,
    priority: 15,
    state: "action",
    basis: "editorial_judgement",
    message: messages[recommendation],
    nextAction: hasSplitPlan && recommendation.startsWith("split_")
      ? "Review the proposed divider in both resulting previews; move or reject it if meaning breaks."
      : undefined,
  });
}

function measuredCopyMessage(metrics: ReturnType<typeof analyseText>): string {
  const source = metrics.sourceWordCount > 0 ? `, including ${metrics.sourceWordCount} in the source` : "";
  return `${metrics.visibleWordCount} visible words${source}; ${metrics.explicitBlockCount} visible blocks; ${metrics.sentenceCount} main-copy sentences.`;
}

function buildNextQuestions(
  input: SlideAssessmentInput,
  checks: AssessmentChecks,
  job: ReturnType<typeof getSlideJobProfile>,
  readingState: TimeEstimate["state"],
  speakingState: TimeEstimate["state"],
  recommendation: Recommendation,
): AssessmentQuestion[] {
  const questions: AssessmentQuestion[] = [];
  if (["add_required_source", "confirm_visual_only"].includes(recommendation)) return questions;
  const pressure = [checks.physicalFit, checks.typePressure, checks.timeFit, checks.copyBand, checks.structuralLoad]
    .some((state) => state === "fail");

  if (!input.preview || input.preview.fit === "not_measured") questions.push({
    id: "preview_context",
    priority: 1,
    neededFor: "honest_verdict",
    prompt: input.audience.setting
      ? `Can we measure this in a real ${input.audience.setting.replaceAll("_", " ")} preview?`
      : "Where does this page need to work at its smallest?",
    why: input.audience.setting
      ? "The setting is known; a rendered preview can now confirm whether the copy actually fits."
      : "A rendered phone, laptop, print, or room preview can confirm whether the copy actually fits.",
  });
  if (pressure && typeof input.constraints?.exactTextRequired !== "boolean") questions.push({
    id: "text_flexibility",
    priority: 2,
    neededFor: "stronger_advice",
    prompt: "Can these words be edited or moved?",
    why: "Required, quoted, safety, access, or legal text needs another home before it is cut.",
  });
  const timeRelevant = ["speaker_led", "guided_read", "dual_use"].includes(input.delivery)
    && (
      input.delivery === "guided_read"
      || input.constraints?.sourceMustBeRead
      || ["same_words", "silent_read", "different_words"].includes(input.relation)
    );
  if (timeRelevant && !input.timing?.exposureSeconds) questions.push({
    id: "exposure_time",
    priority: 3,
    neededFor: "stronger_advice",
    prompt: "Roughly how long will this page stay up?",
    why: "A rough budget gives a directional check; a rehearsal can replace it later.",
  });
  if (job?.recipientSensitive && !input.audience.recipient) questions.push({
    id: "recipient",
    priority: 4,
    neededFor: "stronger_advice",
    prompt: "Who sees this version first?",
    why: "Recipient changes relevance even when the copy physically fits.",
  });
  const requiredTimeEstimateMissing = input.constraints?.sourceMustBeRead || input.relation !== "same_words"
    ? readingState === "not_measured"
    : speakingState === "not_measured";
  if (timeRelevant && requiredTimeEstimateMissing) questions.push({
    id: "language_calibration",
    priority: 5,
    neededFor: "stronger_advice",
    prompt: "Want to time one short reading in this language?",
    why: "The tool will not borrow an English reading rate and pretend it applies.",
  });
  return questions.sort((a, b) => a.priority - b.priority);
}

function resolveResultStrength(
  input: SlideAssessmentInput,
  checks: AssessmentChecks,
  recommendation: Recommendation,
  questions: AssessmentQuestion[],
): ResultStrength {
  if (["cannot_call_yet", "confirm_visual_only", "add_required_source"].includes(recommendation)) return "context_limited";
  if (questions.some((question) => question.neededFor === "honest_verdict")) return "context_limited";
  const observedTime = isPositiveFinite(input.timing?.actualRehearsalSeconds);
  const directMeasurement = checks.physicalFit === "fail"
    || checks.physicalFit === "tight"
    || checks.typePressure === "fail"
    || (observedTime && ["tight", "fail"].includes(checks.timeFit))
    || (recommendation === "reference_density_allowed" && checks.physicalFit === "pass");
  return directMeasurement ? "measured" : "directional";
}

function strengthMessage(strength: ResultStrength, recommendation: Recommendation): string {
  if (strength === "measured") return "A direct preview or rehearsal observation drives this result.";
  if (strength === "directional") return "A reviewed rule, provisional band, or estimate drives this result; preview or rehearse before treating it as settled.";
  if (recommendation === "add_required_source") return "The required source is missing, so density advice would be premature.";
  if (recommendation === "confirm_visual_only") return "There is no main copy to assess; confirm the page's visual purpose and accessible meaning.";
  return "A decisive piece of context is still missing. Use the next question before acting on the result.";
}

function isPositiveFinite(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
