import { assessSlide } from "./engine.ts";
import { getSlideJobProfile } from "./jobs.ts";
import type {
  AssessmentQuestion,
  IntakeAssessment,
  IntakeDraft,
  IntakeQuestion,
  ProgressiveQuestion,
  SpeechTextRelation,
} from "./types.ts";

/**
 * Returns only questions that can strengthen the current result, in the order
 * the interface should ask them. The UI should normally show one at a time.
 */
export function getIntakeQuestions(draft: IntakeDraft): IntakeQuestion[] {
  const questions: IntakeQuestion[] = [];
  const job = getSlideJobProfile(draft.jobId);

  if (!draft.delivery) questions.push({
    id: "delivery",
    priority: 1,
    neededFor: "first_result",
    prompt: "Will you be there when people see this page?",
    why: "A live slide and a page read alone can carry very different amounts of copy.",
  });

  if (!draft.role && !job) questions.push({
    id: "slide_job",
    priority: 2,
    neededFor: "first_result",
    prompt: "What does this page need to do?",
    why: "A logline, synopsis, character page, evidence page, and appendix have different jobs.",
  });

  if (job?.recipientSensitive && !draft.recipient) questions.push({
    id: "recipient",
    priority: 6,
    neededFor: "route_advice",
    prompt: "Who sees this version first?",
    why: "The same project needs different emphasis for a director, actor, producer, funder, buyer, or financier.",
  });

  const hasPresenter = ["speaker_led", "guided_read", "dual_use"].includes(draft.delivery ?? "");
  if (hasPresenter && (!draft.relation || draft.relation === "unknown")) questions.push({
    id: "speech_relation",
    priority: 3,
    neededFor: "stronger_result",
    prompt: "Will you say these words, support them, or give people time to read?",
    why: "Reading and listening can support each other or compete.",
  });

  const hasUsablePreview = draft.preview && draft.preview.fit !== "not_measured";
  if (!hasUsablePreview && !draft.audienceSetting) questions.push({
    id: "smallest_view",
    priority: 4,
    neededFor: "stronger_result",
    prompt: "What is the smallest place this page must work?",
    why: "Phone, laptop, video call, print, and a room create different physical limits.",
  });

  const timeCanChangeResult = hasPresenter
    && (
      draft.delivery === "guided_read"
      || draft.constraints?.sourceMustBeRead
      || ["same_words", "silent_read", "different_words"].includes(draft.relation ?? "")
    );
  if (timeCanChangeResult && !isPositiveFinite(draft.exposureSeconds)) questions.push({
    id: "exposure_time",
    priority: 5,
    neededFor: "stronger_result",
    prompt: "Roughly how long will this page stay up?",
    why: "An approximate time gives a directional check; a rehearsal can replace it later.",
  });

  if (timeCanChangeResult && draft.languageTag && !/^en(?:-|$)/iu.test(draft.languageTag)) questions.push({
    id: "language_calibration",
    priority: 7,
    neededFor: "stronger_result",
    prompt: "Want to time one short reading in this language?",
    why: "The tool will not borrow an English reading rate and pretend it applies.",
  });

  return questions.sort((a, b) => a.priority - b.priority);
}

/**
 * Produces a safe directional assessment as soon as delivery and page job are
 * known. Any derived context is returned as an explicit assumption.
 */
export function assessIntakeDraft(draft: IntakeDraft): IntakeAssessment {
  const questions = getIntakeQuestions(draft);
  if (questions.some((question) => question.neededFor === "first_result")) {
    return { state: "needs_input", questions, nextQuestion: questions[0], assumptions: [] };
  }

  const job = getSlideJobProfile(draft.jobId);
  const assumptions: string[] = [];
  const relation = resolveDraftRelation(draft, assumptions);
  const languageTag = draft.languageTag || "und";
  if (!draft.languageTag) assumptions.push("Copy language is not confirmed; locale-neutral segmentation is used.");
  if (!draft.preview || draft.preview.fit === "not_measured") {
    assumptions.push("Physical fit has not been measured in a rendered preview.");
  }
  if (!job && !draft.clientLane) assumptions.push("No industry route is applied; generic page-job guidance is used.");

  const assessment = assessSlide({
    clientLane: draft.clientLane,
    artefact: draft.artefact,
    delivery: draft.delivery!,
    role: job?.baseRole ?? draft.role!,
    jobId: draft.jobId,
    audience: {
      setting: draft.audienceSetting,
      recipient: draft.recipient,
    },
    language: { tag: languageTag },
    relation,
    content: draft.content,
    timing: isPositiveFinite(draft.exposureSeconds) ? { exposureSeconds: draft.exposureSeconds } : undefined,
    preview: draft.preview,
    constraints: draft.constraints,
  });

  return {
    state: "assessed",
    questions,
    nextQuestion: selectNextQuestion(questions, assessment.nextQuestions),
    assumptions,
    assessment,
  };
}

function selectNextQuestion(
  intakeQuestions: IntakeQuestion[],
  assessmentQuestions: AssessmentQuestion[],
): ProgressiveQuestion | undefined {
  const intakeIds = new Set<string>(intakeQuestions.map((question) => question.id));
  const mechanics = intakeQuestions.filter((question) => question.neededFor !== "route_advice");
  const uniqueAssessment = assessmentQuestions.filter((question) => !intakeIds.has(question.id));
  const route = intakeQuestions.filter((question) => question.neededFor === "route_advice");
  return mechanics[0] ?? uniqueAssessment[0] ?? route[0];
}

function resolveDraftRelation(draft: IntakeDraft, assumptions: string[]): SpeechTextRelation {
  if (draft.relation && draft.relation !== "unknown") return draft.relation;
  if (["self_read", "reference"].includes(draft.delivery ?? "")) return "no_speaker";
  assumptions.push("The relationship between visible copy and speech is not confirmed.");
  return "unknown";
}

function isPositiveFinite(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
