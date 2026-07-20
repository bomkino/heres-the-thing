import test from "node:test";
import assert from "node:assert/strict";
import {
  analyseText,
  assessIntakeDraft,
  assessSlide,
  countWords,
  findSplitCandidates,
  getJobBudget,
  getIntakeQuestions,
  listSlideJobs,
  SLIDE_JOB_PROFILES,
  type SlideAssessmentInput,
} from "../src/one-slide-or-three/index.ts";

function words(count: number, prefix = "word"): string {
  return Array.from({ length: count }, (_, index) => `${prefix}${index + 1}`).join(" ");
}

function paragraphs(counts: number[]): string {
  return counts.map((count, index) => words(count, `p${index + 1}w`)).join("\n\n");
}

function base(overrides: Partial<SlideAssessmentInput> = {}): SlideAssessmentInput {
  return {
    clientLane: "business",
    artefact: "fundraising_deck",
    purpose: "persuade",
    delivery: "speaker_led",
    role: "argument",
    layout: "title_body",
    audience: {
      setting: "small_room",
      tasks: ["glance", "decide"],
      familiarity: "mixed",
    },
    language: { tag: "en-IN" },
    relation: "supports_speech",
    content: { title: "Why now", body: words(20) },
    preview: { fit: "fits", typePressure: "comfortable" },
    ...overrides,
  };
}

test("comfortable speaker-led slide stays one slide", () => {
  const result = assessSlide(base());
  assert.equal(result.recommendation, "keep_one");
  assert.equal(result.checks.copyBand, "pass");
  assert.equal(result.checks.physicalFit, "pass");
});

test("live copy above tight band with clean boundary suggests two slides", () => {
  const result = assessSlide(base({ content: { title: "Argument", body: paragraphs([35, 35]) } }));
  assert.equal(result.recommendation, "split_two");
  assert.equal(result.checks.copyBand, "fail");
  assert.ok(result.splitPlans.some((plan) => plan.slideCount === 2));
});

test("very high live load with three clean sections suggests three slides", () => {
  const result = assessSlide(base({ content: { title: "Argument", body: paragraphs([44, 44, 44]) } }));
  assert.equal(result.recommendation, "split_three");
  assert.ok(result.splitPlans.some((plan) => plan.slideCount === 3));
});

test("same copy can fit a self-read deck", () => {
  const result = assessSlide(base({
    delivery: "self_read",
    relation: "no_speaker",
    audience: { setting: "laptop", tasks: ["read", "decide"], familiarity: "mixed" },
    content: { title: "Argument", body: words(85) },
  }));
  assert.equal(result.recommendation, "keep_one");
  assert.equal(result.checks.channelCompetition, "not_applicable");
});

test("dual-use conflict recommends separate versions", () => {
  const result = assessSlide(base({
    delivery: "dual_use",
    content: { title: "Argument", body: words(95) },
  }));
  assert.equal(result.recommendation, "make_separate_live_and_read_versions");
});

test("physical overflow is decisive", () => {
  const result = assessSlide(base({
    content: { title: "Argument", body: paragraphs([20, 20]) },
    preview: { fit: "overflows", typePressure: "comfortable" },
  }));
  assert.equal(result.checks.physicalFit, "fail");
  assert.equal(result.recommendation, "split_two");
});

test("type pressure never passes because copy was shrunk", () => {
  const result = assessSlide(base({
    content: { title: "Argument", body: paragraphs([20, 20]) },
    preview: { fit: "fits", typePressure: "below_selected_minimum" },
  }));
  assert.equal(result.checks.typePressure, "fail");
  assert.equal(result.recommendation, "split_two");
});

test("type pressure is not trusted when preview fit is invalidated", () => {
  const result = assessSlide(base({
    preview: { fit: "not_measured", typePressure: "comfortable" },
  }));
  assert.equal(result.checks.typePressure, "not_measured");
  assert.equal(result.recommendation, "cannot_call_yet");
});

test("exact required text moves outside rather than being cut", () => {
  const result = assessSlide(base({
    role: "legal_or_required_text",
    constraints: { exactTextRequired: true },
    content: { title: "Required notice", body: words(100) },
    preview: { fit: "overflows", typePressure: "below_selected_minimum" },
  }));
  assert.equal(result.recommendation, "move_detail_outside_slide");
});

test("exact text that physically fits is not evicted by a provisional band", () => {
  const result = assessSlide(base({
    role: "legal_or_required_text",
    delivery: "self_read",
    relation: "no_speaker",
    constraints: { exactTextRequired: true },
    content: { title: "Required notice", body: words(230) },
    preview: { fit: "fits", typePressure: "comfortable" },
  }));
  assert.equal(result.checks.copyBand, "fail");
  assert.equal(result.recommendation, "keep_one_tight");
});

test("exact text without a preview is not told to stay on one slide", () => {
  const result = assessSlide(base({
    role: "legal_or_required_text",
    delivery: "self_read",
    relation: "no_speaker",
    constraints: { exactTextRequired: true },
    content: { title: "Required notice", body: words(230) },
    preview: undefined,
  }));
  assert.equal(result.recommendation, "cannot_call_yet");
});

test("a required citation cannot pass while absent", () => {
  const result = assessSlide(base({
    constraints: { citationRequired: true },
    content: { title: "Evidence", body: words(20) },
  }));
  assert.equal(result.checks.requiredContent, "fail");
  assert.equal(result.recommendation, "add_required_source");
  assert.ok(result.reasons.some((reason) => reason.code === "required_source_missing"));
});

test("a present required citation clears the requirement check", () => {
  const result = assessSlide(base({
    constraints: { citationRequired: true },
    content: { title: "Evidence", body: words(20), source: "Sundance Institute, 2026" },
  }));
  assert.equal(result.checks.requiredContent, "pass");
  assert.notEqual(result.recommendation, "add_required_source");
});

test("source-only input is not mistaken for a complete text slide", () => {
  const result = assessSlide(base({
    content: { source: "Frame source: BFI National Archive" },
  }));
  assert.equal(result.recommendation, "confirm_visual_only");
  assert.match(result.strengthMessage, /no main copy/iu);
});

test("cannot-split constraint results in editing, not invented boundaries", () => {
  const result = assessSlide(base({
    constraints: { cannotSplit: true },
    content: { title: "Statement", body: words(90) },
    preview: { fit: "overflows", typePressure: "comfortable" },
  }));
  assert.equal(result.recommendation, "edit_before_splitting");
});

test("missing physical and time context refuses false certainty", () => {
  const input = base();
  delete input.preview;
  const result = assessSlide(input);
  assert.equal(result.recommendation, "cannot_call_yet");
  assert.equal(result.checks.physicalFit, "not_measured");
});

test("irrelevant exposure time cannot replace a missing physical preview", () => {
  const result = assessSlide(base({
    relation: "supports_speech",
    timing: { exposureSeconds: 30 },
    preview: undefined,
  }));
  assert.equal(result.checks.timeFit, "not_applicable");
  assert.equal(result.recommendation, "cannot_call_yet");
});

test("guided reading fails when estimated reading exceeds exposure", () => {
  const result = assessSlide(base({
    delivery: "guided_read",
    relation: "silent_read",
    audience: { setting: "large_room", tasks: ["read"], familiarity: "new" },
    timing: { exposureSeconds: 10 },
    content: { title: "Read this", body: paragraphs([40, 40]) },
  }));
  assert.equal(result.checks.timeFit, "fail");
  assert.equal(result.recommendation, "split_two");
});

test("actual rehearsal outranks estimated speaking time", () => {
  const result = assessSlide(base({
    relation: "same_words",
    timing: { exposureSeconds: 20, actualRehearsalSeconds: 31 },
    content: { title: "Pitch", body: paragraphs([20, 20]) },
  }));
  assert.equal(result.checks.timeFit, "fail");
  assert.equal(result.reasons.find((reason) => reason.code === "time_over")?.basis, "user_observed");
});

test("a fast actual rehearsal also overrides a slower estimate", () => {
  const result = assessSlide(base({
    relation: "same_words",
    timing: { exposureSeconds: 20, actualRehearsalSeconds: 10 },
    content: { title: "Pitch", body: words(70) },
  }));
  assert.equal(result.checks.timeFit, "pass");
});

test("near-budget rehearsal stays tight while duplicate delivery gets the action", () => {
  const result = assessSlide(base({
    relation: "same_words",
    timing: { exposureSeconds: 20, actualRehearsalSeconds: 18 },
  }));
  assert.equal(result.checks.timeFit, "tight");
  assert.equal(result.recommendation, "rework_delivery_or_copy");
});

test("duplicate spoken and visible text raises channel warning", () => {
  const result = assessSlide(base({ relation: "same_words", timing: { exposureSeconds: 30 } }));
  assert.equal(result.checks.channelCompetition, "fail");
  assert.equal(result.recommendation, "rework_delivery_or_copy");
  assert.ok(result.reasons.some((reason) => reason.code === "duplicate_channels"));
});

test("different spoken words use exposure to test the reading burden", () => {
  const result = assessSlide(base({
    relation: "different_words",
    timing: { exposureSeconds: 5 },
    content: { title: "Read this", body: words(50) },
  }));
  assert.equal(result.checks.timeFit, "fail");
  assert.match(result.reasons.find((reason) => reason.code === "time_over")?.message ?? "", /reading time/iu);
});

test("a required readable source contributes to live reading time", () => {
  const result = assessSlide(base({
    relation: "supports_speech",
    timing: { exposureSeconds: 8 },
    constraints: { sourceMustBeRead: true },
    content: { title: "Claim", body: words(10), source: words(40, "source") },
  }));
  assert.equal(result.checks.timeFit, "fail");
  assert.match(result.reasons.find((reason) => reason.code === "time_over")?.message ?? "", /reading time/iu);
});

test("text-support need preserves useful visible text exception", () => {
  const result = assessSlide(base({
    relation: "same_words",
    timing: { exposureSeconds: 30 },
    audience: {
      setting: "video_call",
      tasks: ["read", "remember"],
      familiarity: "new",
      textSupportUseful: true,
      secondLanguageLikely: true,
    },
  }));
  assert.equal(result.checks.channelCompetition, "tight");
  assert.ok(result.reasons.some((reason) => reason.code === "text_support_exception"));
});

test("non-English timing stays unmeasured without local calibration", () => {
  const result = assessSlide(base({ language: { tag: "hi-IN" }, relation: "same_words" }));
  assert.equal(result.readingTime.state, "not_measured");
  assert.equal(result.speakingTime.state, "not_measured");
});

test("relevant non-English exposure stays unmeasured rather than becoming not applicable", () => {
  const result = assessSlide(base({
    delivery: "guided_read",
    relation: "silent_read",
    language: { tag: "hi-IN" },
    timing: { exposureSeconds: 20 },
  }));
  assert.equal(result.checks.timeFit, "not_measured");
});

test("user calibration enables non-English timing", () => {
  const result = assessSlide(base({
    relation: "same_words",
    language: {
      tag: "hi-IN",
      userCalibratedReadingWordsPerMinute: 170,
      userCalibratedSpeakingWordsPerMinute: 125,
    },
  }));
  assert.equal(result.readingTime.state, "user_calibrated");
  assert.equal(result.speakingTime.state, "user_calibrated");
});

test("visible copy does not pretend to be a talk track", () => {
  const result = assessSlide(base({ relation: "supports_speech" }));
  assert.equal(result.speakingTime.state, "not_applicable");
});

test("irrelevant non-English reading limits stay out of a support-text result", () => {
  const result = assessSlide(base({
    relation: "supports_speech",
    language: { tag: "hi-IN" },
  }));
  assert.ok(!result.reasons.some((reason) => reason.code === "reading_rate_missing"));
});

test("locale-aware segmentation handles Japanese without spaces", () => {
  assert.ok(countWords("吾輩は猫である。名前はまだ無い。", "ja-JP") > 1);
});

test("source is counted separately and only joins time budget when required", () => {
  const content = { title: "Claim", body: words(10), source: words(20, "source") };
  const optional = analyseText(content, "en", false);
  const required = analyseText(content, "en", true);
  assert.equal(optional.sourceWordCount, 20);
  assert.equal(required.visibleWordCount, optional.visibleWordCount);
  assert.equal(required.timedWordCount - optional.timedWordCount, 20);
});

test("a three-line title is treated as physically tight", () => {
  const result = assessSlide(base({
    preview: { fit: "fits", typePressure: "comfortable", titleLines: 3 },
  }));
  assert.equal(result.checks.physicalFit, "tight");
  assert.equal(result.recommendation, "keep_one_tight");
});

test("wrapped source lines remain visible even when they are not timed", () => {
  const result = assessSlide(base({
    content: { title: "Claim", body: words(30), source: words(40, "source") },
  }));
  assert.equal(result.metrics.visibleWordCount, 71);
  assert.equal(result.metrics.timedWordCount, 31);
  assert.equal(result.checks.copyBand, "fail");
});

test("multiline paragraphs still expose a safe blank-line boundary", () => {
  const candidates = findSplitCandidates(
    "First paragraph wraps\nonto another source line.\n\nSecond paragraph begins here.",
    "en",
  );
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.kind, "paragraph");
});

test("split indices map to the exact returned normalised source", () => {
  const result = assessSlide(base({
    content: { body: "  First block.\r\n\r\nSecond block.  " },
  }));
  assert.equal(result.splitSource, "First block.\n\nSecond block.");
  const boundary = result.splitCandidates[0]?.boundaryIndex;
  assert.equal(result.splitSource.slice(0, boundary), "First block.");
});

test("paragraph and bullet groups expose boundaries without blank lines", () => {
  const candidates = findSplitCandidates(
    "Short introduction\n- First point\n- Second point\nClosing paragraph",
    "en",
  );
  assert.equal(candidates.length, 2);
  assert.equal(candidates[0]?.kind, "paragraph");
  assert.equal(candidates[1]?.kind, "bullet_group");
});

test("reference slide can be dense when audience controls reading time", () => {
  const result = assessSlide(base({
    role: "reference",
    delivery: "reference",
    relation: "no_speaker",
    audience: { setting: "laptop", tasks: ["inspect"], familiarity: "expert" },
    content: { title: "Methods", body: words(190) },
  }));
  assert.equal(result.recommendation, "reference_density_allowed");
});

test("physical tightness is named without forcing a split", () => {
  const result = assessSlide(base({ preview: { fit: "fits_tightly", typePressure: "comfortable" } }));
  assert.equal(result.recommendation, "keep_one_tight");
  assert.equal(result.resultStrength, "measured");
  assert.equal(result.reasons.find((reason) => reason.code === "physical_tight")?.basis, "measured");
});

test("paragraph boundaries outrank sentence guesses", () => {
  const candidates = findSplitCandidates("First paragraph. More.\n\nSecond paragraph. More.", "en");
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.kind, "paragraph");
  assert.equal(candidates[0]?.strength, "strong");
});

test("sentence boundaries appear only when stronger boundaries do not", () => {
  const candidates = findSplitCandidates("First sentence. Second sentence. Third sentence.", "en");
  assert.equal(candidates.length, 2);
  assert.ok(candidates.every((candidate) => candidate.kind === "sentence"));
});

test("engine is deterministic", () => {
  const input = base({ content: { title: "Argument", body: paragraphs([35, 35]) } });
  assert.deepEqual(assessSlide(input), assessSlide(input));
});

test("invalid locale falls back instead of crashing", () => {
  const result = assessSlide(base({ language: { tag: "not_a_locale" } }));
  assert.equal(result.metrics.locale, "und");
  assert.ok(result.reasons.some((reason) => reason.code === "locale_fallback"));
});

test("valid locale casing is canonicalised without a false fallback warning", () => {
  const result = assessSlide(base({ language: { tag: "EN" } }));
  assert.equal(result.metrics.locale, "en");
  assert.ok(!result.reasons.some((reason) => reason.code === "locale_fallback"));
});

test("empty copy asks whether the page is intentionally visual", () => {
  const result = assessSlide(base({ content: {}, preview: undefined }));
  assert.equal(result.recommendation, "confirm_visual_only");
  assert.equal(result.resultStrength, "context_limited");
  assert.equal(result.nextQuestions.length, 0);
  assert.ok(!/next question/iu.test(result.strengthMessage));
});

test("missing required source does not promise a follow-up question", () => {
  const result = assessSlide(base({
    constraints: { citationRequired: true },
    content: { title: "Evidence", body: words(20) },
  }));
  assert.equal(result.nextQuestions.length, 0);
  assert.ok(!/next question/iu.test(result.strengthMessage));
});

test("physical failure is measured while copy-band-only advice is directional", () => {
  const measured = assessSlide(base({
    content: { body: paragraphs([20, 20]) },
    preview: { fit: "overflows", typePressure: "comfortable" },
    constraints: { exactTextRequired: false },
  }));
  const directional = assessSlide(base({
    content: { body: paragraphs([35, 35]) },
    preview: { fit: "fits", typePressure: "comfortable" },
    constraints: { exactTextRequired: false },
  }));
  assert.equal(measured.resultStrength, "measured");
  assert.equal(directional.resultStrength, "directional");
});

test("pressure asks about text flexibility only after it matters", () => {
  const pressured = assessSlide(base({ content: { body: words(90) } }));
  const comfortable = assessSlide(base());
  assert.ok(pressured.nextQuestions.some((question) => question.id === "text_flexibility"));
  assert.ok(!comfortable.nextQuestions.some((question) => question.id === "text_flexibility"));
});

test("intake asks the two decisive questions before route detail", () => {
  const questions = getIntakeQuestions({ content: { body: "A real slide." } });
  assert.deepEqual(questions.slice(0, 2).map((question) => question.id), ["delivery", "slide_job"]);
  assert.ok(questions.slice(0, 2).every((question) => question.neededFor === "first_result"));
});

test("draft assessment waits only for the two first-result answers", () => {
  const result = assessIntakeDraft({ content: { body: "A real slide." } });
  assert.equal(result.state, "needs_input");
  assert.deepEqual(result.questions.slice(0, 2).map((question) => question.id), ["delivery", "slide_job"]);
  assert.equal(result.nextQuestion?.id, "delivery");
  assert.equal(result.assessment, undefined);
});

test("draft assessment makes live uncertainty explicit instead of inventing speech context", () => {
  const result = assessIntakeDraft({
    content: { title: "The world", body: words(28) },
    delivery: "speaker_led",
    jobId: "film.logline",
  });
  assert.equal(result.state, "assessed");
  assert.equal(result.assessment?.resolvedJob?.id, "film.logline");
  assert.equal(result.assessment?.checks.channelCompetition, "not_measured");
  assert.ok(result.assumptions.some((assumption) => /speech/iu.test(assumption)));
  assert.ok(result.questions.some((question) => question.id === "speech_relation"));
  assert.equal(result.nextQuestion?.id, "speech_relation");
  assert.ok(!result.assessment?.reasons.some((reason) => reason.code === "job_lane_mismatch"));
});

test("draft assessment derives no-speaker context for a page read alone", () => {
  const result = assessIntakeDraft({
    content: { body: words(60) },
    delivery: "self_read",
    role: "argument",
    audienceSetting: "laptop",
  });
  assert.equal(result.state, "assessed");
  assert.equal(result.assessment?.checks.channelCompetition, "not_applicable");
  assert.equal(result.nextQuestion?.id, "preview_context");
  assert.ok(!result.assumptions.some((assumption) => /speech/iu.test(assumption)));
});

test("draft intake strengthens mechanics before asking route detail", () => {
  const questions = getIntakeQuestions({
    content: { body: "A series engine." },
    delivery: "speaker_led",
    jobId: "film.series_engine",
  });
  assert.deepEqual(questions.slice(0, 3).map((question) => question.id), [
    "speech_relation",
    "smallest_view",
    "recipient",
  ]);
});

test("an invalidated preview does not suppress the smallest-view question", () => {
  const draft = {
    content: { body: "A series engine." },
    delivery: "self_read" as const,
    role: "process" as const,
    preview: { fit: "not_measured", typePressure: "not_measured" },
  };
  const questions = getIntakeQuestions(draft);
  const result = assessIntakeDraft(draft);
  assert.ok(questions.some((question) => question.id === "smallest_view"));
  assert.ok(result.assumptions.some((assumption) => /physical fit/iu.test(assumption)));
});

test("intake asks recipient only for a recipient-sensitive job", () => {
  const questions = getIntakeQuestions({
    content: { body: "A series engine." },
    delivery: "self_read",
    role: "process",
    jobId: "film.series_engine",
    audienceSetting: "laptop",
  });
  assert.ok(questions.some((question) => question.id === "recipient"));
  assert.ok(!questions.some((question) => question.id === "speech_relation"));
});

test("guided intake asks for exposure even when copy supports speech", () => {
  const questions = getIntakeQuestions({
    content: { body: "Read with me." },
    delivery: "guided_read",
    role: "argument",
    relation: "supports_speech",
    audienceSetting: "large_room",
  });
  assert.ok(questions.some((question) => question.id === "exposure_time"));
});

test("invalid exposure time remains unanswered", () => {
  const questions = getIntakeQuestions({
    content: { body: "Read with me." },
    delivery: "guided_read",
    role: "argument",
    relation: "supports_speech",
    audienceSetting: "large_room",
    exposureSeconds: -4,
  });
  assert.ok(questions.some((question) => question.id === "exposure_time"));
});

test("Film and TV job pack is the deepest route", () => {
  assert.ok(listSlideJobs("film_tv").length >= 20);
  assert.ok(listSlideJobs("film_tv").length > listSlideJobs("advertising").length);
  assert.ok(listSlideJobs("film_tv").length > listSlideJobs("business").length);
});

test("Film logline uses its narrower route-specific band", () => {
  const result = assessSlide(base({
    clientLane: "film_tv",
    artefact: "feature_or_short_pitch",
    role: "statement",
    jobId: "film.logline",
    audience: {
      setting: "small_room",
      tasks: ["glance", "decide"],
      familiarity: "mixed",
      recipient: "producer_or_development",
    },
    content: { title: "Logline", body: words(30) },
  }));
  assert.equal(result.resolvedJob?.id, "film.logline");
  assert.equal(result.budget.tightMaxWords, 35);
  assert.equal(result.checks.copyBand, "tight");
});

test("recipient-sensitive Film advice admits when recipient is missing", () => {
  const result = assessSlide(base({
    clientLane: "film_tv",
    artefact: "episodic_pitch",
    role: "process",
    jobId: "film.series_engine",
  }));
  assert.ok(result.reasons.some((reason) => reason.code === "recipient_missing"));
});

test("unknown job ID falls back transparently", () => {
  const result = assessSlide(base({ jobId: "film.not_real" }));
  assert.equal(result.resolvedJob, undefined);
  assert.ok(result.reasons.some((reason) => reason.code === "job_unknown"));
});

test("job profile IDs are unique and structurally usable", () => {
  const ids = SLIDE_JOB_PROFILES.map((profile) => profile.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(SLIDE_JOB_PROFILES.every((profile) => profile.artefacts.length > 0));
  assert.ok(SLIDE_JOB_PROFILES.every((profile) => profile.watchFor.length > 0));
});

test("every Film and TV job has coherent bands for every resolved mode", () => {
  for (const profile of listSlideJobs("film_tv")) {
    for (const mode of ["speaker_led", "guided_read", "self_read", "reference"] as const) {
      const band = getJobBudget(profile.id, mode);
      assert.ok(band, `${profile.id} is missing ${mode}`);
      assert.ok(band.comfortableMaxWords <= band.tightMaxWords);
      assert.ok(band.comfortableMaxBlocks <= band.tightMaxBlocks);
      assert.ok(band.comfortableMaxWords > 0);
      assert.ok(band.comfortableMaxBlocks > 0);
    }
  }
});

test("adding visible copy cannot improve copy pressure under unchanged context", () => {
  const states = { pass: 0, tight: 1, fail: 2 } as const;
  let previous = -1;
  for (const count of [0, 20, 40, 60, 80, 120]) {
    const result = assessSlide(base({ content: { title: "Argument", body: words(count) } }));
    const state = result.checks.copyBand;
    assert.notEqual(state, "not_measured");
    assert.notEqual(state, "not_applicable");
    const current = states[state as keyof typeof states];
    assert.ok(current >= previous, `${count} words unexpectedly improved from ${previous} to ${current}`);
    previous = current;
  }
});

test("Film job used in another lane is never silently accepted", () => {
  const result = assessSlide(base({
    jobId: "film.logline",
    role: "statement",
  }));
  assert.ok(result.reasons.some((reason) => reason.code === "job_lane_mismatch"));
});

test("route job used in the wrong artefact is visible", () => {
  const result = assessSlide(base({
    clientLane: "film_tv",
    artefact: "talent_facing_pack",
    role: "process",
    jobId: "film.series_engine",
  }));
  assert.ok(result.reasons.some((reason) => reason.code === "job_artefact_mismatch"));
});

test("route job and generic role cannot disagree silently", () => {
  const result = assessSlide(base({
    clientLane: "film_tv",
    artefact: "feature_or_short_pitch",
    role: "data",
    jobId: "film.logline",
  }));
  assert.ok(result.reasons.some((reason) => reason.code === "job_role_mismatch"));
});

test("finance route names specialist limits and recipient mismatch", () => {
  const result = assessSlide(base({
    clientLane: "film_tv",
    artefact: "financier_or_investor_pack",
    role: "data",
    jobId: "film.finance",
    audience: {
      setting: "laptop",
      tasks: ["inspect", "decide"],
      familiarity: "expert",
      recipient: "actor_or_talent_rep",
    },
  }));
  assert.ok(result.reasons.some((reason) => reason.code === "finance_specialist_review"));
  assert.ok(result.reasons.some((reason) => reason.code === "finance_recipient_mismatch"));
});

test("documentary access route preserves human review boundary", () => {
  const result = assessSlide(base({
    clientLane: "film_tv",
    artefact: "documentary_pitch",
    role: "evidence",
    jobId: "film.documentary_access",
    audience: {
      setting: "laptop",
      tasks: ["inspect", "decide"],
      familiarity: "mixed",
      recipient: "grant_or_fund",
    },
  }));
  assert.ok(result.reasons.some((reason) => reason.code === "documentary_human_review"));
});
