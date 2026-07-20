import type { IntakeDraft, RecipientKind } from "./one-slide-or-three/types.ts";
import type { DeckBonesInput, EvaluatedSection } from "./deck-bones/types.ts";
import type { YouAreHereInput, YouAreHereResult } from "./you-are-here/types.ts";

function recipientKind(value?: string): RecipientKind | undefined {
  if (!value) return undefined;
  const text = value.toLowerCase();
  if (/director/.test(text)) return "director";
  if (/producer|development/.test(text)) return "producer_or_development";
  if (/production company/.test(text)) return "production_company";
  if (/commission|buyer|broadcaster|platform|studio/.test(text)) return "commissioner_or_buyer";
  if (/financ|invest/.test(text)) return "financier_or_investor";
  if (/grant|fund/.test(text)) return "grant_or_fund";
  if (/festival|lab|programme|program|market/.test(text)) return "festival_or_lab";
  if (/actor|talent/.test(text)) return "actor_or_talent_rep";
  if (/internal|team|collaborator/.test(text)) return "internal_team";
  return "mixed_or_unknown";
}

export function seedDeckBones(
  input: YouAreHereInput,
  result: YouAreHereResult,
): DeckBonesInput {
  return {
    projectKind: result.deckHandoff.projectKind,
    role: input.role === "writer_director" ? "writer-director" : input.role === "creator_showrunner" ? "creator-showrunner" : input.role as DeckBonesInput["role"],
    desiredDecision: input.desiredDecision,
    recipientKind: input.recipient?.kind,
    recipientCount: input.recipientCount,
    accessRoute: input.accessRoute,
    delivery: input.delivery,
    exactRequirementStatus: input.requirementStatus === "remembered" ? "stale" : input.requirementStatus === "conflicted" ? "conflicted" : input.requirementStatus,
    exactRequirements: input.requirements,
    authority: input.authority,
    featureStage: input.featureStage,
    endingClear: input.endingClear,
    outsideRead: input.outsideRead,
    episodicStage: input.episodicStage,
    seriesShape: input.seriesShape,
    distinctEpisodeEvidence: input.distinctEpisodeEvidence,
    deckRequested: input.deckIntent === "requested",
    existingDeck: input.deckIntent === "exists",
    liveMeeting: input.trigger === "meeting",
    speculativeWork: input.speculativeWork,
    confidentiality: input.confidentiality,
  };
}

function deliveryMode(value: DeckBonesInput["delivery"]): IntakeDraft["delivery"] {
  if (value === "live") return "speaker_led";
  if (value === "before_meeting") return "guided_read";
  if (value === "informal") return "guided_read";
  if (value === "read_alone" || value === "leave_behind" || value === "after_conversation" || value === "portal") return "self_read";
  if (value === "internal") return "reference";
  return undefined;
}

export function seedOneSlide(
  deckInput: DeckBonesInput,
  section: EvaluatedSection,
  content: IntakeDraft["content"],
  options: { languageTag?: string } = {},
): IntakeDraft {
  return {
    content,
    clientLane: "film_tv",
    artefact: deckInput.projectKind === "scripted-episodic" ? "episodic_pitch" : "feature_or_short_pitch",
    delivery: deliveryMode(deckInput.delivery),
    role: section.oneSlideSeed.role,
    jobId: section.oneSlideSeed.jobId,
    recipient: recipientKind(deckInput.recipientKind),
    languageTag: options.languageTag,
  };
}
