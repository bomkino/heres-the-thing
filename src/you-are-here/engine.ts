import type { ExactRequirement } from "../shared/types.ts";
import { YOU_ARE_HERE_QUESTIONS } from "./questions.ts";
import {
  YOU_ARE_HERE_VERSION,
  type DeckHandoffSeed,
  type RouteAction,
  type YouAreHereInput,
  type YouAreHereQuestion,
  type YouAreHereResult,
} from "./types.ts";

interface RouteDraft {
  kind?: YouAreHereResult["kind"];
  footing?: YouAreHereResult["footing"];
  routeId: string;
  action: RouteAction;
  rules: string[];
  question?: YouAreHereQuestion;
  where: string;
  move: string;
  park: string[];
  approach: string;
  after: string;
  depends: string[];
  limitations?: string[];
  deckEligible?: boolean;
  deckReason?: string;
}

const ACTIONS: Record<string, RouteAction> = {
  "A-S01": { id: "A-S01", family: "clarify", label: "Name the next decision", finishLine: "One recipient category and one bounded decision fit in a sentence." },
  "A-S02": { id: "A-S02", family: "clarify", label: "Verify the current request", finishLine: "Current item, limits, status, source, and checked date are recorded." },
  "A-S03": { id: "A-S03", family: "clarify", label: "Resolve conflicting instructions", finishLine: "The route owner confirms one instruction, or two conditional paths remain explicit." },
  "A-S04": { id: "A-S04", family: "rights_permission", label: "Clarify authority and consent", finishLine: "The authorised next use is known, or external circulation stays paused." },
  "A-S06": { id: "A-S06", family: "research_fit", label: "Define the legitimate access route", finishLine: "An accepted route is verified, or another recipient category is chosen." },
  "A-S08": { id: "A-S08", family: "write", label: "Make the exact required item", finishLine: "Every mandatory item is present; every prohibited or unaccepted extra is absent." },
  "A-S10": { id: "A-S10", family: "rehearse", label: "Rehearse the live decision", finishLine: "The run fits time, the ask is explicit, and slides may fail without sinking the conversation." },
  "A-S11": { id: "A-S11", family: "pause_decline", label: "Wait with a follow-up date", finishLine: "One date or condition is recorded; no anxiety work is scheduled before it." },
  "A-S12": { id: "A-S12", family: "follow_up", label: "Send one bounded follow-up", finishLine: "One concise follow-up uses the existing route; no unasked attachment is resent." },
  "A-S14": { id: "A-S14", family: "read_feedback", label: "Debrief the pass without inventing a cause", finishLine: "Known facts, actual reason if any, and the next decision are separated." },
  "A-S15": { id: "A-S15", family: "clarify", label: "Split incompatible routes", finishLine: "Each recipient and decision has its own route; shared facts remain shared." },
  "A-S16": { id: "A-S16", family: "clarify", label: "Scope speculative work before accepting", finishLine: "Scope, stage, deadline, pay, competition, use, and coverage are clear enough to decide." },
  "A-S22": { id: "A-S22", family: "pause_decline", label: "Pause for safety and support", finishLine: "Ordinary pitch work stops; the user can leave quietly and use an appropriate current support route." },
  "A-S24": { id: "A-S24", family: "pause_decline", label: "Return an honest scope boundary", finishLine: "The unsupported lane is named without importing scripted Film and TV certainty." },
  "A-S30": { id: "A-S30", family: "read_feedback", label: "Replace polishing with a learning loop", finishLine: "One reader, rehearsal, or route check has a named question and stop point." },
  "A-F01": { id: "A-F01", family: "write", label: "Complete the next screenplay unit", finishLine: "The agreed unit or a complete readable draft exists." },
  "A-F03": { id: "A-F03", family: "read_feedback", label: "Get a bounded feature read", finishLine: "A relevant reader returns observations against one or two clear questions." },
  "A-F07": { id: "A-F07", family: "contact", label: "Prepare a producer introduction packet", finishLine: "The introducer has only the clean, truthful material they want to carry." },
  "A-E01": { id: "A-E01", family: "write", label: "Complete the next pilot unit", finishLine: "The agreed unit or a complete readable pilot exists." },
  "A-E04": { id: "A-E04", family: "write", label: "Articulate the returning engine", finishLine: "Repeatable pressure and distinct episode evidence are legible." },
  "A-E05": { id: "A-E05", family: "write", label: "Articulate the finite arc", finishLine: "Launch, progression, ending, and why this duration fits are legible." },
  "A-E12": { id: "A-E12", family: "write", label: "Make a form-fit series overview", finishLine: "Premise, pilot, honest series shape, future story, creator, and ask fit the real limit." },
  "A-D01": { id: "A-D01", family: "clarify", label: "Decide whether a deck should exist", finishLine: "Deck is required, useful, ask-first, parked, avoided, or blocked—with a reason." },
};

function deckSeed(input: YouAreHereInput, eligible: boolean, reason: string): DeckHandoffSeed {
  return {
    eligible,
    reason,
    projectKind: input.lane === "scripted_feature" ? "scripted-feature" : input.lane === "scripted_episodic" ? "scripted-episodic" : undefined,
    desiredDecision: input.desiredDecision,
    recipientKind: input.recipient?.kind,
    delivery: input.delivery,
    exactRequirements: input.requirements ?? [],
  };
}

function protectLine(input: YouAreHereInput): string {
  if (input.protectThis?.selectedLine) return input.protectThis.selectedLine;
  return "Nothing added here. This route works without asking you to perform a private truth.";
}

function makeResult(input: YouAreHereInput, draft: RouteDraft): YouAreHereResult {
  return {
    engineVersion: YOU_ARE_HERE_VERSION,
    kind: draft.kind ?? "result",
    footing: draft.footing ?? "best_route_with_known_facts",
    routeId: draft.routeId,
    primaryAction: draft.action,
    appliedRuleIds: draft.rules,
    nextQuestion: draft.question,
    youAreHere: draft.where,
    nextMove: draft.move,
    protectThis: protectLine(input),
    parkThis: draft.park.slice(0, 2),
    approach: draft.approach,
    afterThat: draft.after,
    dependsOn: draft.depends,
    limitations: draft.limitations ?? [
      "This guide does not judge quality, rights, legality, finance, access, or likelihood of success.",
      "Rules remain validation-pending until practitioner and creator review is complete.",
    ],
    deckHandoff: deckSeed(input, draft.deckEligible ?? false, draft.deckReason ?? "A deck is not the next useful move."),
  };
}

function currentRequirements(input: YouAreHereInput): ExactRequirement[] {
  return input.requirements?.filter((item) => item.status === "mandatory") ?? [];
}

export function assessYouAreHere(input: YouAreHereInput): YouAreHereResult {
  if (input.safety === "immediate_danger" || input.safety === "pressure_or_threat") {
    return makeResult(input, {
      kind: "redirect", footing: "specific", routeId: "safety_support", action: ACTIONS["A-S22"]!,
      rules: input.safety === "immediate_danger" ? ["S-001", "S-044", "S-045"] : ["S-002", "S-044", "S-045"],
      where: "This is not an ordinary pitch decision. Pressure or danger changes the problem; a shared device may change what is safe to leave behind.",
      move: "Stop the pitch route. Use a safer device if available and contact a trusted, current support channel that fits your situation and location.",
      park: ["Park the deck route. You do not need to describe the project or the pressure here."],
      approach: "Choose a trusted person, union or guild, representative, workplace or industry body, advocacy service, qualified legal support, or emergency service when danger is immediate.",
      after: "There is no required return. Clear this local session if that is safer.",
      depends: ["The user identifying pressure, threat, or immediate danger."],
    });
  }

  if (!input.lane) {
    return makeResult(input, {
      kind: "clarifier", footing: "private_working_plan", routeId: "clarify_lane", action: ACTIONS["A-S01"]!, rules: ["S-028"],
      question: YOU_ARE_HERE_QUESTIONS["Q-LANE"],
      where: "You have something to move, but this edition does not yet know which route can speak honestly about it.",
      move: "Name what you are moving. No title, synopsis, or private detail needed.",
      park: ["Park document names until the lane is clear."],
      approach: "Nobody yet. This is an orientation question, not outreach advice.",
      after: "Feature and episodic routes continue here. Other forms receive a clean scope boundary.",
      depends: ["Project lane is unknown."],
    });
  }

  if (input.lane === "unsupported") {
    return makeResult(input, {
      kind: "redirect", footing: "private_working_plan", routeId: "unsupported_lane", action: ACTIONS["A-S24"]!, rules: ["S-046"],
      where: "This release has deep reviewed logic only for scripted features and scripted episodic work.",
      move: "Use current recipient instructions first. Keep decision, access, permission, privacy, and smallest-useful-work principles; do not import fiction-specific advice.",
      park: ["Park any structure presented as universal for this form."],
      approach: "A practitioner in this exact form, or the current programme or recipient when one exists.",
      after: "One Slide or Three? remains available for page mechanics across broader lanes.",
      depends: ["Lane falls outside the first reviewed release."],
    });
  }

  if (input.authority === "shared_unclear" || input.authority === "third_party_unclear") {
    return makeResult(input, {
      kind: "redirect", footing: "specific", routeId: "authority_first", action: ACTIONS["A-S04"]!, rules: ["S-003", "S-004", "DK-002"],
      where: "The creative work may be moving, but authority to submit, adapt, commission, or disclose it is unclear.",
      move: "Clarify who controls the material and which next use is authorised before public packaging or consequential outreach.",
      park: ["Park public deck circulation.", "Park attachment, rights, or permission claims."],
      approach: "The relevant collaborator, rights holder, producer, or qualified rights professional. Ask one precise question about the intended use.",
      after: "When authority is clear, return to the recipient and decision. Private development may continue within the real permission boundary.",
      depends: ["Authority or consent remains unclear."],
    });
  }

  if (input.speculativeWork === "substantial_terms_unclear") {
    return makeResult(input, {
      kind: "redirect", footing: "specific", routeId: "scope_free_work", action: ACTIONS["A-S16"]!, rules: ["S-039", "S-040"],
      where: "Substantial custom work has been requested, but the process does not yet say what happens to the work, who else is competing, or what protections apply.",
      move: "Clarify scope, decision stage, deliverable, deadline, compensation, competition, use, leave-behind, recording, and applicable agreement before starting.",
      park: ["Park the treatment, deck, or take until the process is clear."],
      approach: "The requester first; then a representative, current guild or union, or qualified adviser where the exact scope needs it.",
      after: "Accept, reduce, negotiate, or decline from material facts—not prestige or manufactured urgency.",
      depends: ["Substantial speculative work and unclear terms."],
    });
  }

  if (input.requirementStatus === "conflicted") {
    return makeResult(input, {
      kind: "clarifier", footing: "check_before_sending", routeId: "requirements_conflict", action: ACTIONS["A-S03"]!, rules: ["S-012"],
      question: YOU_ARE_HERE_QUESTIONS["Q-REQUIREMENT"],
      where: "Two current-looking instructions point to different packs. Averaging them would invent a third request nobody made.",
      move: "Ask the route owner which instruction controls this stage. Keep both facts visible until then.",
      park: ["Park the guessed hybrid pack."],
      approach: "The programme, portal owner, sender, or process contact. Ask which dated instruction controls this exact stage.",
      after: "Build only the confirmed requirement, or keep two conditional paths if confirmation is impossible before the deadline.",
      depends: ["Conflicting instructions remain unresolved."],
    });
  }

  if (input.requirementStatus === "remembered" || input.requirementStatus === "stale") {
    return makeResult(input, {
      kind: "clarifier", footing: "check_before_sending", routeId: "verify_request", action: ACTIONS["A-S02"]!, rules: ["S-011", "S-012"],
      question: YOU_ARE_HERE_QUESTIONS["Q-REQUIREMENT"],
      where: "A remembered or old request may be right, but it is not strong enough to order expensive work.",
      move: "Check the current message, official page, portal, or process owner. Record only item, status, limits, source, and date.",
      park: ["Park rebuilding from memory."],
      approach: "The current official route or the person who made the request.",
      after: "Current instructions become the spine. Generic advice steps aside.",
      depends: ["The instruction is remembered, old, or unverifiable."],
    });
  }

  if (input.trigger === "sent_waiting") {
    return makeResult(input, {
      footing: "specific", routeId: "wait", action: ACTIONS["A-S11"]!, rules: ["S-021"],
      where: "The material is already in the room and the response window is still alive. More packaging will not make waiting less like waiting.",
      move: "Record one follow-up date or condition. Do no replacement work before it arrives.",
      park: ["Park the new deck.", "Park the apology disguised as an update."],
      approach: "Nobody before the agreed or reasonable follow-up point.",
      after: "If the point passes, send one concise follow-up through the existing route. If they reply, answer the new fact.",
      depends: ["Material was sent and the response window remains active."],
    });
  }

  if (input.trigger === "sent_followup_due") {
    return makeResult(input, {
      footing: "specific", routeId: "follow_up", action: ACTIONS["A-S12"]!, rules: ["S-022"],
      where: "The follow-up point has arrived. This is a communication task, not a new-document task.",
      move: "Send one brief follow-up tied to the prior exchange. Do not resend attachments unless asked or materially corrected.",
      park: ["Park the new package."],
      approach: "The person already in the exchange, through the same legitimate route.",
      after: "If they ask for something, scope that exact request. If not, close or reschedule the route without inventing a verdict on the work.",
      depends: ["The follow-up point is genuinely due."],
    });
  }

  if (input.trigger === "rejected_passed") {
    return makeResult(input, {
      footing: "specific", routeId: "debrief_pass", action: ACTIONS["A-S14"]!, rules: ["S-023", "S-024"],
      where: "A route closed. Unless the recipient gave a reason, the cause remains unknown; one pass cannot diagnose an entire project or person.",
      move: "Record recipient, decision, material, timing, and any actual reason. Choose the next test only from known evidence.",
      park: ["Park the total rebrand.", "Park the imaginary post-mortem."],
      approach: "A trusted reader only when a specific question remains. Do not demand unpaid diagnosis from the recipient.",
      after: "A credible repeated reason can justify a bounded revision. No reason means route fit and next recipient stay separate from craft guesses.",
      depends: ["The route passed or rejected the material."],
    });
  }

  if (input.accessRoute === "no_unsolicited" || input.accessRoute === "none") {
    return makeResult(input, {
      footing: "specific", routeId: "access_first", action: ACTIONS["A-S06"]!, rules: ["S-016", "S-029"],
      where: "The target has no accepted route for this material. That is an access fact, not a quality verdict.",
      move: "Verify a legitimate route or choose another recipient category that can own the next decision.",
      park: ["Park the platform-branded deck.", "Park private-email hunting and policy bypasses."],
      approach: "A legitimate intermediary, representative or producer, open programme, or another compatible recipient.",
      after: "When access is real, confirm what the route accepts before making the artefact.",
      depends: ["No accepted route exists."],
    });
  }

  if (!input.desiredDecision || !input.recipient) {
    return makeResult(input, {
      kind: "clarifier", footing: "private_working_plan", routeId: "name_decision", action: ACTIONS["A-S01"]!, rules: ["S-028", "S-029", "DK-005", "DK-012"],
      question: !input.desiredDecision ? YOU_ARE_HERE_QUESTIONS["Q-DECISION"] : YOU_ARE_HERE_QUESTIONS["Q-RECIPIENT"],
      where: input.entryContext === "deck" ? "The deck instinct makes sense: you want something solid. Right now, it has no defined reader or decision job." : "You are moving, but the next decision does not yet have an owner.",
      move: "Complete one sentence: I want [recipient category] to [bounded decision or action] about [project or writer].",
      park: ["Park document categories.", "Park contact lists."],
      approach: "Nobody until the recipient category and decision are legible.",
      after: "Once one person or group can own the decision, choose the smallest material that helps them make it.",
      depends: ["Desired decision or recipient is unknown."],
    });
  }

  if (input.recipientCount === "several_different_decisions") {
    return makeResult(input, {
      footing: "specific", routeId: "split_routes", action: ACTIONS["A-S15"]!, rules: ["S-027", "S-031"],
      where: "Several people are being asked to make different decisions. One universal deck would hide those differences inside a handsome compromise.",
      move: "Create one route per decision and recipient. Share verified facts; split asks, emphasis, requirements, delivery, and disclosure.",
      park: ["Park the omnibus deck."],
      approach: "Choose the first decision owner. Finish that route before expanding the family.",
      after: "Reuse the core packet where facts truly match. Never let representation, creative attachment, finance, and programme eligibility collapse into one ask.",
      depends: ["Recipients seek materially different decisions."],
      deckEligible: true,
      deckReason: "Deck Bones can produce separate briefs from one shared fact source.",
    });
  }

  if (input.lane === "scripted_feature" && (!input.featureStage || ["idea", "outline", "partial"].includes(input.featureStage))) {
    return makeResult(input, {
      footing: "specific", routeId: "feature_core_first", action: ACTIONS["A-F01"]!, rules: ["F-001", "F-002", "DK-001"],
      question: !input.featureStage ? YOU_ARE_HERE_QUESTIONS["Q-FEATURE-STAGE"] : undefined,
      where: "The screenplay still holds the next decisive work. A deck would decorate a promise the pages have not yet had a chance to carry.",
      move: "Complete the next screenplay unit or readable draft. Define the unit and stop when it exists.",
      park: ["Park the designed deck.", "Park broad outreach."],
      approach: "A trusted story reader only when there is a bounded unit ready to read.",
      after: "Once a complete draft exists, freeze a clean read and ask one or two route-relevant questions.",
      depends: ["Feature core is incomplete and no exact early-development exception is known."],
    });
  }

  if (input.lane === "scripted_feature" && input.featureStage === "first_draft" && (!input.outsideRead || input.outsideRead === "none")) {
    return makeResult(input, {
      footing: "specific", routeId: "feature_read_first", action: ACTIONS["A-F03"]!, rules: ["F-003", "F-004", "DK-001"],
      where: "A complete first draft exists. The next useful evidence comes from a real read, not a wrapper polished in isolation.",
      move: "Freeze a clean dated draft and ask one relevant reader for observed moments against one or two bounded questions.",
      park: ["Park expensive packaging.", "Park coverage scores as truth."],
      approach: "A reader suited to the next question, not necessarily the most prestigious person available.",
      after: "Sort observations from proposed fixes, revise the evidenced problem, then reopen the route.",
      depends: ["Complete first draft has not had a useful outside read."],
    });
  }

  if (input.lane === "scripted_episodic" && (!input.episodicStage || ["premise", "outline", "partial_pilot"].includes(input.episodicStage))) {
    return makeResult(input, {
      footing: "specific", routeId: "pilot_first", action: ACTIONS["A-E01"]!, rules: ["E-001", "E-002", "DK-001"],
      question: !input.episodicStage ? YOU_ARE_HERE_QUESTIONS["Q-EPISODIC-STAGE"] : undefined,
      where: "The pilot is still the next proof. A large bible cannot quietly do the pages' job.",
      move: "Complete the next pilot unit or readable pilot. Keep future-world notes private unless they help the writing.",
      park: ["Park the sales bible.", "Park the commissioner deck."],
      approach: "A bounded pilot reader when a complete unit exists.",
      after: "Test whether the pilot demonstrates the series promise, then articulate the honest series form.",
      depends: ["Pilot is incomplete and no exact concept-stage exception is known."],
    });
  }

  if (input.lane === "scripted_episodic" && (!input.seriesShape || input.seriesShape === "unknown" || input.seriesShape === "forming")) {
    return makeResult(input, {
      kind: "clarifier", footing: "best_route_with_known_facts", routeId: "series_shape", action: ACTIONS["A-E04"]!, rules: ["E-003", "E-004", "DK-003"],
      question: YOU_ARE_HERE_QUESTIONS["Q-SERIES-SHAPE"],
      where: "A pilot or series proposition exists, but the future-story promise is still forming.",
      move: "Name what keeps generating story, or map how each part moves irreversibly toward the ending. Do not fake renewability for a finite story.",
      park: ["Park decorative episode lists.", "Park invented future seasons."],
      approach: "A reader who can test whether the pilot demonstrates the form you claim.",
      after: "If the form is returning, prove distinct episodes from one pressure system. If limited, prove the progression and ending.",
      depends: ["Series form or movement remains unclear."],
    });
  }

  if (input.trigger === "meeting") {
    return makeResult(input, {
      footing: "specific", routeId: "rehearse", action: ACTIONS["A-S10"]!, rules: ["S-020", "S-032", "DK-009"],
      where: "A real meeting exists. The work now is to make the decision path speakable, memorable, and honest in the room.",
      move: "Freeze the structure. Rehearse the opening, three retained ideas, explicit ask, likely questions, and close against the real time.",
      park: ["Park optional slides.", "Park paragraphs you plan to read aloud."],
      approach: "The meeting owner only when delivery, recording, circulation, or accommodations need clarification.",
      after: "Run One Slide or Three? on any page that competes with the speaker or must survive alone. If circulation is requested, give Deck Bones a separate read-alone job.",
      depends: ["A legitimate live meeting is scheduled."],
      deckEligible: input.deckIntent === "exists" || input.deckIntent === "requested",
      deckReason: "Existing live material may need a deck brief or separate leave-behind.",
    });
  }

  if (input.trigger === "offered_introduction") {
    return makeResult(input, {
      footing: "specific", routeId: "offered_introduction", action: ACTIONS["A-F07"]!, rules: ["S-019", "S-031", "F-014"],
      where: "A real introduction exists, but the recipient has not yet requested a bundle. The route is valuable because it can open a conversation.",
      move: "Ask the introducer what they want to send and how this recipient prefers to meet new work. Prepare only that clean packet.",
      park: ["Park the all-assets bundle.", "Park aspiration presented as attachment."],
      approach: "The person offering the introduction. Ask what they want to carry and whether permission should precede connection.",
      after: "A script request gets the script. A deck request goes to Deck Bones with the decision and reader already carried forward.",
      depends: ["An introduction is offered but no recipient request exists."],
      deckEligible: input.deckIntent === "requested",
      deckReason: input.deckIntent === "requested" ? "The introducer or recipient named a deck." : "Do not build a maximal deck by reflex.",
    });
  }

  if (input.requirementStatus === "current" && currentRequirements(input).length > 0) {
    const requiredDeck = currentRequirements(input).some((item) => /deck|bible|lookbook|presentation/iu.test(item.name));
    return makeResult(input, {
      footing: "specific", routeId: "exact_request", action: ACTIONS["A-S08"]!, rules: ["S-008", "S-010", "S-018"],
      where: "A current instruction controls this route. It is stronger than folklore, famous examples, and our own preferences.",
      move: "Make exactly the mandatory item in the stated form and limits. Remove prohibited and unaccepted extras.",
      park: ["Park optional extras until the required pack is secure."],
      approach: "The process owner only when a term, limit, or conflict remains unclear.",
      after: "Run a compliance check. If the item is a deck, Deck Bones builds its argument and One Slide or Three? checks each page without overruling the requirement.",
      depends: ["Current written or directly clarified requirements remain current for this stage."],
      deckEligible: requiredDeck,
      deckReason: requiredDeck ? "A deck-like artefact is explicitly mandatory." : "The exact request does not require a deck.",
    });
  }

  if (input.trigger === "stuck_polishing") {
    return makeResult(input, {
      footing: "specific", routeId: "learning_loop", action: ACTIONS["A-S30"]!, rules: ["S-048", "S-052"],
      where: "The work has entered a polish loop without a new decision or new evidence. More sheen is now hiding the question.",
      move: "Choose one learning loop: a bounded reader question, a timed rehearsal, or a route check. Name the stop point before starting.",
      park: ["Park the ecosystem-wide redesign."],
      approach: "One person suited to the named question, or nobody if a private rehearsal can answer it.",
      after: "Use the result to revise one evidenced problem. If nothing material changes, stop polishing and move the route.",
      depends: ["No live requirement changed; repeated cosmetic work continues."],
    });
  }

  const deckUseful = input.deckIntent === "requested" || input.deckIntent === "considering" || input.deckIntent === "exists";
  if (deckUseful) {
    return makeResult(input, {
      footing: input.deckIntent === "requested" ? "specific" : "best_route_with_known_facts",
      routeId: "deck_gate", action: ACTIONS["A-D01"]!, rules: ["DK-001", "DK-005", "DK-006", "DK-012"],
      where: `A real recipient and decision exist: ${input.recipient.kind} needs to ${input.desiredDecision}. The deck now has enough context to earn or lose its job honestly.`,
      move: "Run the deck gate. If useful, write one decision sentence, map the reader's questions, and select only evidence that helps this decision.",
      park: ["Park page-count folklore.", "Park image hunting before the argument exists."],
      approach: "The current recipient or route owner only for ambiguity that would change content, delivery, or disclosure.",
      after: "Deck Bones creates the smallest truthful structure. One Slide or Three? tests each page in its real delivery mode.",
      depends: ["Recipient, decision, access, and core material remain as stated."],
      deckEligible: true,
      deckReason: "Recipient and decision are known; deck intent exists; higher gates are clear.",
    });
  }

  if (input.lane === "scripted_episodic") {
    return makeResult(input, {
      footing: "best_route_with_known_facts", routeId: "series_overview", action: ACTIONS["A-E12"]!, rules: ["E-023", "E-024", "E-028"],
      where: "The pilot and series shape can support a bounded conversation. Nobody has established that a full pitch document is the next useful item.",
      move: "Prepare the smallest form-fit series overview the recipient can use, with the pilot ready only through the accepted route.",
      park: ["Park the encyclopaedic bible.", "Park production and finance claims nobody requested."],
      approach: `${input.recipient.kind}. Ask for the bounded decision: ${input.desiredDecision}.`,
      after: "If they request a full pitch document, carry these facts into Deck Bones. If they request the pilot only, do not smuggle the project-sales package into a sample route.",
      depends: ["Pilot, series form, recipient, and access remain supportable."],
    });
  }

  return makeResult(input, {
    footing: "best_route_with_known_facts", routeId: "smallest_feature_packet", action: ACTIONS["A-F07"]!, rules: ["F-014", "S-031", "S-052"],
    where: "The feature has enough core material for a bounded next conversation. A maximal package is not yet the price of seriousness.",
    move: "Prepare the smallest truthful packet this recipient and decision need. Keep the clean screenplay ready only through the accepted route.",
    park: ["Park the finance deck.", "Park fantasy attachments and universal versions."],
    approach: `${input.recipient.kind}. Ask for the bounded decision: ${input.desiredDecision}.`,
    after: "If they ask for a deck, carry the decision, reader, delivery, and current request into Deck Bones. If they ask for pages, send pages.",
    depends: ["Feature core, recipient, decision, and access remain supportable."],
  });
}
