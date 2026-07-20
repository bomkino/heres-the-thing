import type { LanguageContext, TimeEstimate, TimingContext } from "./types.ts";

const ENGLISH_SILENT_READING_WPM = 238;
const WORKING_SPEAKING_WPM = 150;

export function estimateReadingTime(
  words: number,
  language: LanguageContext,
  timing?: TimingContext,
): TimeEstimate {
  const userRate = language.userCalibratedReadingWordsPerMinute ?? timing?.readingWordsPerMinute;
  if (validRate(userRate)) return estimate(words, userRate, "user_calibrated");
  if (isEnglish(language.tag)) return estimate(words, ENGLISH_SILENT_READING_WPM, "estimated");
  return {
    state: "not_measured",
    reason: "No reviewed default reading rate exists for this language and audience. Use a short local calibration.",
  };
}

export function estimateSpeakingTime(
  words: number,
  language: LanguageContext,
  timing?: TimingContext,
): TimeEstimate {
  const userRate = language.userCalibratedSpeakingWordsPerMinute ?? timing?.speakingWordsPerMinute;
  if (validRate(userRate)) return estimate(words, userRate, "user_calibrated");
  if (isEnglish(language.tag)) return estimate(words, WORKING_SPEAKING_WPM, "estimated");
  return {
    state: "not_measured",
    reason: "No reviewed default speaking rate exists for this language and speaker. Rehearse or calibrate locally.",
  };
}

function estimate(words: number, rate: number, state: "estimated" | "user_calibrated"): TimeEstimate {
  return {
    state,
    seconds: Number(((words / rate) * 60).toFixed(1)),
    rate,
    unit: "words_per_minute",
  };
}

function isEnglish(tag: string): boolean {
  return /^en(?:-|$)/iu.test(tag);
}

function validRate(rate: number | undefined): rate is number {
  return typeof rate === "number" && Number.isFinite(rate) && rate > 0;
}
