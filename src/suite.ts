import { assessDeckBones, DECK_BONES_VERSION, type DeckBonesInput, type DeckBonesResult, type EvaluatedSection } from "./deck-bones/index.ts";
import { assessIntakeDraft, ENGINE_VERSION, type IntakeAssessment, type IntakeDraft } from "./one-slide-or-three/index.ts";
import { enterTool, handOff, mergeSharedFact, recordToolResult } from "./shared/session.ts";
import { known, type Known, type SharedFacts, type SuiteSession } from "./shared/types.ts";
import { assessYouAreHere, YOU_ARE_HERE_VERSION, type YouAreHereInput, type YouAreHereResult } from "./you-are-here/index.ts";
import { seedDeckBones, seedOneSlide } from "./bridges.ts";

export interface SuiteRun<T> {
  session: SuiteSession;
  result: T;
}

function carryHereFacts(session: SuiteSession, input: YouAreHereInput, now: string): SuiteSession {
  let next = session;
  if (input.lane && input.lane !== "unsupported") next = mergeSharedFact(next, "lane", known(input.lane, "user"), now);
  if (input.role) next = mergeSharedFact(next, "role", known(input.role, "user"), now);
  if (input.desiredDecision) next = mergeSharedFact(next, "desiredDecision", known(input.desiredDecision, "user"), now);
  if (input.recipient) next = mergeSharedFact(next, "recipient", known(input.recipient, "user"), now);
  if (input.delivery) next = mergeSharedFact(next, "delivery", known(input.delivery, "user"), now);
  if (input.requirements) {
    const checkedOn = input.requirements.map((item) => item.checkedOn).filter((value): value is string => Boolean(value)).sort().at(-1);
    const requirementFact: Known<NonNullable<SharedFacts["requirements"] extends Known<infer T> ? T : never>> =
      input.requirementStatus === "current"
        ? { status: "known", value: input.requirements, source: "current_written_requirement", checkedOn }
        : input.requirementStatus === "remembered" || input.requirementStatus === "stale"
          ? { status: "stale", previousValue: input.requirements, source: "user", checkedOn }
          : known(input.requirements, "user");
    next = mergeSharedFact(next, "requirements", requirementFact, now);
  }
  if (typeof input.sharedDevice === "boolean") next = mergeSharedFact(next, "sharedDevice", known(input.sharedDevice, "user"), now);
  return { ...next, protectThis: input.protectThis ?? next.protectThis };
}

export function runYouAreHere(
  session: SuiteSession,
  input: YouAreHereInput,
  now = new Date().toISOString(),
): SuiteRun<YouAreHereResult> {
  const result = assessYouAreHere(input);
  const withFacts = carryHereFacts(session, input, now);
  return {
    result,
    session: recordToolResult(withFacts, "you_are_here", input, result, YOU_ARE_HERE_VERSION, result.primaryAction.label, now),
  };
}

export function runDeckBones(
  session: SuiteSession,
  input?: DeckBonesInput,
  now = new Date().toISOString(),
): SuiteRun<DeckBonesResult> {
  let resolved = input;
  const seededFromHere = !resolved;
  if (!resolved) {
    const hereInput = session.tools.you_are_here.input as YouAreHereInput | undefined;
    const hereResult = session.tools.you_are_here.result as YouAreHereResult | undefined;
    if (!hereInput || !hereResult) throw new Error("Deck Bones needs input or a completed You Are Here! result.");
    if (!hereResult.deckHandoff.eligible) throw new Error(`You Are Here! has not opened Deck Bones: ${hereResult.deckHandoff.reason}`);
    resolved = seedDeckBones(hereInput, hereResult);
  }
  const result = assessDeckBones(resolved);
  let next = session;
  if (session.activeTool !== "deck_bones") {
    next = seededFromHere
      ? handOff(session, session.activeTool, "deck_bones", "Carried decision, recipient, route, requirements, and delivery into Deck Bones.", now)
      : enterTool(session, "deck_bones", "Started directly in Deck Bones. No upstream facts were invented.", now);
  }
  next = recordToolResult(next, "deck_bones", resolved, result, DECK_BONES_VERSION, result.outcome.name, now);
  return { session: next, result };
}

export function runOneSlide(
  session: SuiteSession,
  section: EvaluatedSection,
  content: IntakeDraft["content"],
  input?: DeckBonesInput,
  now = new Date().toISOString(),
): SuiteRun<IntakeAssessment> {
  const deckInput = input ?? session.tools.deck_bones.input as DeckBonesInput | undefined;
  if (!deckInput) throw new Error("One Slide or Three? needs Deck Bones context or explicit deck input.");
  const languageTag = session.shared.language.status === "known" ? session.shared.language.value.workingLanguage : undefined;
  const draft = seedOneSlide(deckInput, section, content, { languageTag });
  const result = assessIntakeDraft(draft);
  let next = session.activeTool === "one_slide_or_three" ? session : handOff(session, session.activeTool, "one_slide_or_three", "Carried page job, reader, artefact, and delivery into One Slide or Three?.", now);
  next = recordToolResult(next, "one_slide_or_three", draft, result, ENGINE_VERSION, result.assessment?.recommendation ?? "Needs one more fact", now);
  return { session: next, result };
}

export function returnToDeckBones(
  session: SuiteSession,
  summary = "Returned with page evidence. Copy, context, and the prior deck result remain intact.",
  now = new Date().toISOString(),
): SuiteSession {
  if (session.activeTool !== "one_slide_or_three") throw new Error("Return to Deck Bones is available after a One Slide or Three? review.");
  if (!session.tools.deck_bones.result) throw new Error("No Deck Bones result exists to return to.");
  return handOff(session, "one_slide_or_three", "deck_bones", summary, now);
}
