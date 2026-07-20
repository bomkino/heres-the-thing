export { assessSlide } from "./engine.ts";
export { getCopyBudget, getDualUseBudgets, ROLE_FAMILY, RULE_VERSION } from "./config.ts";
export { getJobBudget, getSlideJobProfile, listSlideJobs, SLIDE_JOB_PROFILES } from "./jobs.ts";
export type { ResolvedDelivery, SlideJobProfile } from "./jobs.ts";
export { assessIntakeDraft, getIntakeQuestions } from "./intake.ts";
export { analyseText, bodyBlocks, countGraphemes, countSentences, countWords, resolveSegmenterLocale } from "./text-analysis.ts";
export { buildSplitPlans, findSplitCandidates, normaliseSplitSource } from "./splits.ts";
export { estimateReadingTime, estimateSpeakingTime } from "./time.ts";
export * from "./types.ts";
