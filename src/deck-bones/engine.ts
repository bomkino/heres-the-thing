import { fingerprint } from "../shared/session.ts";
import { OUTCOMES, ROUTE_SECTIONS, SECTIONS, type RouteSections } from "./data.ts";
import {
  DECK_BONES_VERSION,
  type DeckBonesExplanation,
  type DeckBonesInput,
  type DeckBonesResult,
  type EvaluatedSection,
  type GateResult,
  type RequirementState,
  type RouteId,
  type SectionId,
  type TaskCard,
} from "./types.ts";

interface RouteChoice {
  routeId: RouteId;
  certainty: DeckBonesResult["primary"]["certainty"];
  reasonCodes: string[];
  reasons: string[];
  gates: GateResult[];
  nextQuestion?: DeckBonesResult["nextQuestion"];
  changeTriggers: string[];
}

const QUESTION = {
  project: { id: "S01", prompt: "What are you making?", why: "Feature and episodic routes depend on different core evidence." },
  decision: { id: "P01", prompt: "What do you want to happen next?", why: "Document shape follows the decision, not the document's fashionable name." },
  recipient: { id: "R01", prompt: "Who needs to say yes—or at least keep talking?", why: "Same project needs different emphasis for different decision-makers." },
  access: { id: "R03", prompt: "How can this honestly reach them?", why: "A closed inbox is a route problem, not a judgement on the work." },
  feature: { id: "F01", prompt: "How far is the screenplay?", why: "A deck cannot do the screenplay's job." },
  episodic: { id: "TV01", prompt: "How far is the pilot?", why: "A large bible cannot substitute for the core pages." },
  series: { id: "TV02", prompt: "What makes another episode—or the next part—happen?", why: "Returning and limited forms need different evidence." },
  requirement: { id: "R04", prompt: "What did they actually ask you to send?", why: "Current requirements outrank generic structure." },
} as const;

function gate(code: string, state: GateResult["state"], reason: string): GateResult {
  return { code, state, reason };
}

function chooseRoute(input: DeckBonesInput): RouteChoice {
  if (input.unsupportedForm) {
    return {
      routeId: "O-U06", certainty: "confirmed", reasonCodes: ["G-SCOPE"],
      reasons: ["This foundation has deep structure only for scripted features and scripted episodic projects."],
      gates: [gate("G-SCOPE", "blocked", "Detailed structure would import certainty from the wrong form.")],
      changeTriggers: ["Use a future reviewed edition for this exact form, or a current recipient's own requirements."],
    };
  }

  if (!input.projectKind) {
    return {
      routeId: "O-U01", certainty: "exploratory", reasonCodes: ["R-PRIVATE"],
      reasons: ["Project form is unknown, so no external deck structure can yet be specific."],
      gates: [], nextQuestion: QUESTION.project,
      changeTriggers: ["Name the project form."],
    };
  }

  if (input.authority === "shared_unclear" || input.authority === "third_party_unclear") {
    return {
      routeId: "O-U08", certainty: "confirmed", reasonCodes: ["G-AUTHORITY"],
      reasons: ["Authority or permission is unclear for public or commercial circulation."],
      gates: [gate("G-AUTHORITY", "blocked", "Private creative work may continue; external claims and sending stay paused.")],
      changeTriggers: ["Authority and permitted next use become supportable."],
    };
  }

  if (input.speculativeWork === "substantial_terms_unclear") {
    return {
      routeId: "O-U07", certainty: "confirmed", reasonCodes: ["G-LABOUR"],
      reasons: ["Substantial custom work is requested without a clear process, use, or compensation basis."],
      gates: [gate("G-LABOUR", "blocked", "Clarify terms before producing the requested treatment, deck, or take.")],
      changeTriggers: ["Scope, decision stage, deadline, pay, competition, use, and applicable coverage are clear."],
    };
  }

  if (input.exactRequirementStatus === "stale" || input.exactRequirementStatus === "ambiguous" || input.exactRequirementStatus === "conflicted") {
    return {
      routeId: "O-U02", certainty: "conditional", reasonCodes: ["G-REQUIREMENT", "R-VERIFY"],
      reasons: ["The remembered, old, ambiguous, or conflicting request is not strong enough to control substantial work."],
      gates: [gate("G-REQUIREMENT", "conditional", "Current stage-specific instruction must be verified.")],
      nextQuestion: QUESTION.requirement,
      changeTriggers: ["The route owner or current source confirms the item and limits."],
    };
  }

  if (input.exactRequirementStatus === "current" && (input.exactRequirements?.length ?? 0) > 0) {
    return {
      routeId: input.projectKind === "scripted-feature" ? "O-F07" : "O-TV06",
      certainty: "confirmed", reasonCodes: ["G-REQUIREMENT", "R-EXACT-PACK"],
      reasons: ["A current stage-specific requirement controls the artefact, limits, and accepted extras."],
      gates: [gate("G-REQUIREMENT", "clear", "Mandatory, optional, prohibited, format, and limit states remain distinct.")],
      changeTriggers: ["The requirement changes, expires, or a new stage opens."],
    };
  }

  if (input.accessRoute === "no_unsolicited" || input.accessRoute === "none") {
    return {
      routeId: "O-U05", certainty: "confirmed", reasonCodes: ["G-ACCESS"],
      reasons: ["The intended recipient has no accepted route for this material."],
      gates: [gate("G-ACCESS", "blocked", "No send recommendation is responsible without a legitimate route.")],
      nextQuestion: QUESTION.access,
      changeTriggers: ["A legitimate intermediary, open route, or compatible recipient exists."],
    };
  }

  if (input.projectKind === "scripted-feature") {
    if (!input.featureStage) {
      return {
        routeId: "O-U01", certainty: "exploratory", reasonCodes: ["R-PRIVATE"],
        reasons: ["Screenplay state is needed before packaging can be separated from core work."],
        gates: [], nextQuestion: QUESTION.feature,
        changeTriggers: ["Name the current screenplay state."],
      };
    }
    if (["idea", "outline", "partial"].includes(input.featureStage) || input.endingClear === false) {
      return {
        routeId: "O-F01", certainty: "confirmed", reasonCodes: ["G-FEATURE-CORE", "R-NO-DECK"],
        reasons: ["The external story claim depends on core work that does not yet exist or cannot yet include the ending."],
        gates: [gate("G-FEATURE-CORE", "blocked", "Core story work precedes a public-facing deck unless a current early-development route says otherwise.")],
        changeTriggers: ["A complete route-appropriate story unit exists, or an exact early-development exception applies."],
      };
    }
    if (input.featureStage === "first_draft" && (!input.outsideRead || input.outsideRead === "none")) {
      return {
        routeId: "O-F02", certainty: "confirmed", reasonCodes: ["G-FEATURE-CORE", "R-NO-DECK"],
        reasons: ["A complete first draft exists; one bounded outside read creates more useful evidence than packaging."],
        gates: [gate("G-FEATURE-CORE", "conditional", "The story exists, but packaging is premature for this route.")],
        changeTriggers: ["A useful outside read is understood and a bounded revision is complete."],
      };
    }
  }

  if (input.projectKind === "scripted-episodic") {
    if (!input.episodicStage) {
      return {
        routeId: "O-U01", certainty: "exploratory", reasonCodes: ["R-PRIVATE"],
        reasons: ["Pilot state is needed before a sample, overview, and project pitch can be separated."],
        gates: [], nextQuestion: QUESTION.episodic,
        changeTriggers: ["Name the current pilot state."],
      };
    }
    if (["premise", "outline", "partial_pilot"].includes(input.episodicStage)) {
      return {
        routeId: "O-TV01", certainty: "confirmed", reasonCodes: ["G-TV-CORE", "R-NO-DECK"],
        reasons: ["The pilot is the next proof; a large project deck would substitute explanation for pages."],
        gates: [gate("G-TV-CORE", "blocked", "Complete the route-appropriate pilot unit unless a current concept-stage process says otherwise.")],
        changeTriggers: ["A complete pilot exists or a verified concept-stage exception applies."],
      };
    }
    if (!input.seriesShape || input.seriesShape === "unknown" || input.seriesShape === "forming") {
      return {
        routeId: "O-TV02", certainty: "confirmed", reasonCodes: ["G-TV-CORE"],
        reasons: ["The pilot may exist, but the form beyond it is not yet legible."],
        gates: [gate("G-TV-CORE", "blocked", "Returning work needs repeatable pressure; limited work needs complete progression.")],
        nextQuestion: QUESTION.series,
        changeTriggers: ["A reader can explain the engine or finite progression without inventing future seasons."],
      };
    }
  }

  if (input.financeDecision) {
    if (input.financeBasis !== "qualified") {
      return {
        routeId: "O-F08", certainty: "confirmed", reasonCodes: ["G-FINANCE"],
        reasons: ["The requested finance argument lacks a qualified producer-led budget, rights, production, or legal basis."],
        gates: [gate("G-FINANCE", "blocked", "Creative material may continue, but investment claims and finance structure do not.")],
        changeTriggers: ["A qualified producing route and current diligence basis exist."],
      };
    }
    return {
      routeId: "O-F09", certainty: "conditional", reasonCodes: ["R-FEATURE-FINANCE"],
      reasons: ["A mature producer-led finance basis exists; the tool may organise facts but cannot draft or validate investment terms."],
      gates: [gate("G-FINANCE", "clear", "Qualified finance and legal work remains outside this engine.")],
      changeTriggers: ["Any rights, budget, financing, team, or route fact becomes stale."],
    };
  }

  if (input.confidentiality === "highly_sensitive" && ["read_alone", "leave_behind", "after_conversation"].includes(input.delivery ?? "unknown")) {
    return {
      routeId: "O-U09", certainty: "confirmed", reasonCodes: ["G-CONFIDENTIAL"],
      reasons: ["The intended travelling version could expose nonessential private or unannounced material."],
      gates: [gate("G-CONFIDENTIAL", "conditional", "Redaction and recipient/channel verification precede wider circulation.")],
      changeTriggers: ["A safe disclosure scope and verified circulation route exist."],
    };
  }

  if (input.imageRights === "uncertain" && input.visualCaseMatters) {
    return {
      routeId: "O-U11", certainty: "confirmed", reasonCodes: ["G-SPECIALIST-CHECK"],
      reasons: ["The visual route depends on assets whose permission or status is uncertain."],
      gates: [gate("G-SPECIALIST-CHECK", "blocked", "Keep the disputed asset out; continue the rest of the brief safely.")],
      changeTriggers: ["Assets are owned, licensed, public-domain, or otherwise cleared for the intended use."],
    };
  }

  if (input.recipientCount === "several_different_decisions") {
    return {
      routeId: "O-U03", certainty: "confirmed", reasonCodes: ["R-SPLIT-VERSIONS"],
      reasons: ["Recipients are making materially different decisions; one omnibus deck would blur asks, proof, and disclosure."],
      gates: [],
      changeTriggers: ["Choose which decision happens first; reuse only facts that remain true across versions."],
    };
  }

  if (input.privateOrInternal || !input.desiredDecision || !input.recipientKind) {
    return {
      routeId: input.privateOrInternal ? "O-U10" : "O-U01", certainty: "exploratory",
      reasonCodes: [input.privateOrInternal ? "R-INTERNAL" : "R-PRIVATE"],
      reasons: [input.privateOrInternal ? "The document serves a private or team decision, so uncertainty should remain visible." : "No single external recipient and decision are yet defined."],
      gates: [],
      nextQuestion: !input.desiredDecision ? QUESTION.decision : !input.recipientKind ? QUESTION.recipient : undefined,
      changeTriggers: ["A real external recipient and bounded decision appear."],
    };
  }

  if (input.liveMeeting && input.existingDeck) {
    return {
      routeId: "O-U04", certainty: "confirmed", reasonCodes: ["R-REHEARSE"],
      reasons: ["A live meeting and usable material exist; rehearsal now creates more value than expansion."],
      gates: [],
      changeTriggers: ["Rehearsal exposes one decision-critical gap or the recipient requests a separate leave-behind."],
    };
  }

  if (input.projectKind === "scripted-episodic" && input.staffingSampleDecision) {
    return {
      routeId: "O-TV03", certainty: "confirmed", reasonCodes: ["R-STAFFING-SAMPLE"],
      reasons: ["The recipient is assessing the writer or sample, not deciding whether to buy the series."],
      gates: [],
      changeTriggers: ["The recipient separately expresses project interest or requests project material."],
    };
  }

  if (input.projectKind === "scripted-episodic" && input.commissionerDecision) {
    if (!input.accessRoute || input.accessRoute === "unknown") {
      return {
        routeId: "O-TV07", certainty: "confirmed", reasonCodes: ["G-ACCESS", "R-COMMISSIONER"],
        reasons: ["A commissioner route is named, but eligibility and accepted access are not supportable."],
        gates: [gate("G-ACCESS", "blocked", "A broadcaster or platform name does not itself create access.")],
        changeTriggers: ["Current remit, eligibility, and an accepted route are verified."],
      };
    }
    return {
      routeId: "O-TV08", certainty: "conditional", reasonCodes: ["R-COMMISSIONER"],
      reasons: ["A current commissioner decision and accepted route exist; remit-specific facts must remain current."],
      gates: [],
      changeTriggers: ["The remit, route, eligibility, stage, or requirements change."],
    };
  }

  if (input.projectKind === "scripted-feature" && input.talentDecision) {
    return {
      routeId: "O-F10", certainty: "conditional", reasonCodes: ["R-TALENT"],
      reasons: ["A legitimate talent or creative attachment conversation exists; role relevance and truthful status control the pack."],
      gates: [],
      changeTriggers: ["The role, requested material, commitment, schedule, or route changes."],
    };
  }

  if (input.projectKind === "scripted-feature") {
    if (input.role === "director" || input.role === "writer-director") {
      return {
        routeId: "O-F06", certainty: input.deckRequested ? "confirmed" : "conditional", reasonCodes: ["R-DIRECTOR-VISION"],
        reasons: ["The next decision depends on an authorised directorial interpretation of the screen experience."],
        gates: [],
        changeTriggers: ["The recipient asks for a different first item or practical claims outgrow current production knowledge."],
      };
    }
    if (input.recipientKind === "director") {
      return {
        routeId: "O-F05", certainty: input.deckRequested ? "confirmed" : "conditional", reasonCodes: ["R-WRITER-DIRECTOR-INVITE"],
        reasons: ["The director is deciding whether the project offers meaningful collaboration, not whether to execute somebody else's locked film."],
        gates: [],
        changeTriggers: ["A director joins and authorship, roles, and the shared visual process are agreed."],
      };
    }
    if (input.deckRequested || input.visualCaseMatters) {
      return {
        routeId: "O-F04", certainty: input.deckRequested ? "confirmed" : "conditional", reasonCodes: ["R-FEATURE-CREATIVE", "R-SMALLEST-USEFUL", "R-REUSE-FIRST"],
        reasons: [input.deckRequested ? "The recipient asked for a deck." : "The feature's visual, world, or production proposition materially helps this decision."],
        gates: [],
        changeTriggers: ["The recipient asks for a smaller first item or the visual case stops being decision-critical."],
      };
    }
    return {
      routeId: "O-F03", certainty: "conditional", reasonCodes: ["R-FEATURE-OVERVIEW", "R-SMALLEST-USEFUL", "R-REUSE-FIRST"],
      reasons: ["A complete feature and real conversation exist, but no larger visual document is required for the first decision."],
      gates: [],
      changeTriggers: ["The recipient requests a deck or the visual proposition becomes decisive."],
    };
  }

  if (input.deckRequested || input.visualCaseMatters) {
    return {
      routeId: "O-TV05", certainty: input.deckRequested ? "confirmed" : "conditional", reasonCodes: ["R-TV-PITCH", "R-SMALLEST-USEFUL", "R-REUSE-FIRST"],
      reasons: [input.deckRequested ? "The recipient asked for a project pitch document." : "Series mechanics and screen experience need a fuller, form-fit argument for this decision."],
      gates: [],
      changeTriggers: ["The recipient asks for only a pilot or one-page overview, or the series form changes."],
    };
  }

  return {
    routeId: "O-TV04", certainty: "conditional", reasonCodes: ["R-TV-OVERVIEW", "R-SMALLEST-USEFUL", "R-REUSE-FIRST"],
    reasons: ["A pilot and honest series shape exist; the next conversation does not yet require a full pitch document."],
    gates: [],
    changeTriggers: ["A full project proposition is requested or becomes decision-critical."],
  };
}

function sectionForRequirement(name: string): SectionId | undefined {
  const value = name.toLowerCase();
  if (/title|cover|identity/.test(value)) return "S00";
  if (/logline|premise/.test(value)) return "S01";
  if (/series synopsis/.test(value)) return "S04";
  if (/feature synopsis|story synopsis|synopsis/.test(value)) return "S03";
  if (/engine|series format|limited/.test(value)) return "S05";
  if (/character/.test(value)) return "S06";
  if (/world/.test(value)) return "S07";
  if (/tone|genre/.test(value)) return "S08";
  if (/theme|north star|point of view/.test(value)) return "S09";
  if (/visual|lookbook/.test(value)) return "S10";
  if (/creator|writer statement/.test(value)) return "S11";
  if (/director/.test(value)) return "S12";
  if (/audience|position/.test(value)) return "S13";
  if (/comp/.test(value)) return "S14";
  if (/season arc|limited arc/.test(value)) return "S15";
  if (/episode/.test(value)) return "S16";
  if (/future|season/.test(value)) return "S17";
  if (/team|bio/.test(value)) return "S18";
  if (/status|attachment/.test(value)) return "S19";
  if (/rights|permission/.test(value)) return "S20";
  if (/production|feasibility/.test(value)) return "S21";
  if (/budget|financ/.test(value)) return "S22";
  if (/distribution|market/.test(value)) return "S23";
  if (/ask|next decision/.test(value)) return "S24";
  if (/contact|version/.test(value)) return "S25";
  if (/appendix/.test(value)) return "S26";
  return undefined;
}

function exactRouteSections(input: DeckBonesInput): RouteSections | undefined {
  if (input.exactRequirementStatus !== "current" || !input.exactRequirements?.length) return undefined;
  const main: SectionId[] = [];
  const optional: SectionId[] = [];
  const excluded: SectionId[] = [];
  for (const requirement of input.exactRequirements) {
    const sectionId = sectionForRequirement(requirement.name);
    if (!sectionId) continue;
    if (requirement.status === "mandatory" && !main.includes(sectionId)) main.push(sectionId);
    if (requirement.status === "optional" && !main.includes(sectionId) && !optional.includes(sectionId)) optional.push(sectionId);
    if (requirement.status === "prohibited" && !main.includes(sectionId) && !optional.includes(sectionId) && !excluded.includes(sectionId)) excluded.push(sectionId);
  }
  return main.length || optional.length || excluded.length ? { main, optional, excluded } : undefined;
}

function materialState(input: DeckBonesInput, sectionId: SectionId): EvaluatedSection["materialState"] {
  const found = input.existingMaterials?.find((material) => material.sectionId === sectionId);
  if (!found) return "missing";
  if (found.state === "outdated") return "check-first";
  if (found.state === "rough") return "revise";
  return "reuse";
}

function evaluateSections(input: DeckBonesInput, routeId: RouteId): EvaluatedSection[] {
  const plan = exactRouteSections(input) ?? ROUTE_SECTIONS[routeId];
  if (!plan) return [];
  const entries: Array<{ id: SectionId; state: RequirementState }> = [
    ...plan.main.map((id) => ({ id, state: input.exactRequirementStatus === "current" ? "required" as const : "recommended" as const })),
    ...(plan.optional ?? []).map((id) => ({ id, state: "optional" as const })),
    ...(plan.appendix ?? []).map((id) => ({ id, state: "appendix" as const })),
    ...(plan.excluded ?? []).map((id) => ({ id, state: "excluded" as const })),
  ];
  return entries.map(({ id, state }) => {
    const definition = SECTIONS[id];
    const existing = state === "excluded" ? "not-this-version" : materialState(input, id);
    return {
      sectionId: id,
      state: existing === "missing" && (state === "required" || state === "recommended") ? "missing" : state,
      materialState: existing,
      reason: definition.job,
      doneWhen: `A new reader can answer: ${definition.readerQuestion}`,
      oneSlideSeed: { role: definition.slideRole, jobId: definition.oneSlideJobId },
    };
  });
}

function taskForOutcome(choice: RouteChoice): TaskCard | undefined {
  const routes: Partial<Record<RouteId, TaskCard>> = {
    "O-U01": { id: "TASK-ROOM", title: "Name the room", action: "Write one recipient category and one bounded next decision.", doneWhen: ["One person or group can own the decision.", "A yes, no, request, or next step is recognisable."], blocks: ["O-U01"] },
    "O-U02": { id: "TASK-VERIFY", title: "Verify the current ask", action: "Check the current message, portal, official page, or process owner.", doneWhen: ["Mandatory, optional, prohibited, limits, source, and date are recorded."], blocks: ["O-U02"] },
    "O-U04": { id: "TASK-REHEARSE", title: "Rehearse the decision", action: "Run the opening, three retained ideas, questions, ask, and close against real time.", doneWhen: ["The pitch fits without rushing.", "The presenter can continue if slides fail."], blocks: [] },
    "O-U05": { id: "TASK-ACCESS", title: "Find a legitimate route", action: "Verify an accepted path or choose a compatible recipient category.", doneWhen: ["The route accepts this kind of material.", "The first ask is bounded."], blocks: ["O-U05"] },
    "O-U07": { id: "TASK-SCOPE", title: "Clarify the process", action: "Get scope, stage, deadline, pay, competition, use, and applicable agreement in writing.", doneWhen: ["You can accept, reduce, negotiate, or decline from material facts."], blocks: ["O-U07"] },
    "O-U08": { id: "TASK-AUTHORITY", title: "Clarify authority and permitted use", action: "Resolve who controls the material and what may travel.", doneWhen: ["The authorised next use is supportable, or the external route remains paused."], blocks: ["O-U08"] },
    "O-U11": { id: "TASK-ASSET", title: "Repair the asset route", action: "Remove the uncertain asset and identify the exact permission or provenance question.", doneWhen: ["The safe version works without the disputed claim or image."], blocks: ["O-U11"] },
    "O-F01": { id: "TASK-STORY", title: "Complete the next story unit", action: "Define and finish the missing screenplay unit.", doneWhen: ["The agreed unit exists in readable form."], blocks: ["O-F01"] },
    "O-F02": { id: "TASK-READ", title: "Get one bounded feature read", action: "Freeze a clean draft and ask one or two route-relevant questions.", doneWhen: ["Observed problems are separated from proposed fixes."], blocks: ["O-F02"] },
    "O-F08": { id: "TASK-FINANCE-BASIS", title: "Build the producing basis", action: "Name missing budget, rights, production, team, legal, and finance inputs with appropriate qualified owners.", doneWhen: ["Creative claims and diligence facts stay separate."], blocks: ["O-F08"] },
    "O-TV01": { id: "TASK-PILOT", title: "Complete the next pilot unit", action: "Define and finish the missing pilot unit.", doneWhen: ["The agreed unit exists in readable form."], blocks: ["O-TV01"] },
    "O-TV02": { id: "TASK-SERIES", title: "Test the series form", action: "Write the repeatable pressure or finite progression and test it against distinct future story.", doneWhen: ["Another reader can explain why the next episode or part exists."], blocks: ["O-TV02"] },
  };
  return routes[choice.routeId];
}

function buildTasks(choice: RouteChoice, sections: EvaluatedSection[]): TaskCard[] {
  const routeTask = taskForOutcome(choice);
  const tasks = routeTask ? [routeTask] : [];
  for (const item of sections.filter((section) => section.state === "missing").slice(0, 3)) {
    const definition = SECTIONS[item.sectionId];
    tasks.push({
      id: `TASK-${item.sectionId}`,
      title: definition.name,
      action: definition.job,
      doneWhen: [item.doneWhen],
      blocks: [item.sectionId],
    });
  }
  return tasks;
}

function buildExplanation(input: DeckBonesInput, choice: RouteChoice, sections: EvaluatedSection[]): DeckBonesExplanation {
  const outcome = OUTCOMES[choice.routeId];
  const reusable = sections.filter((section) => section.state !== "excluded" && section.materialState === "reuse").map((section) => `Reuse ${SECTIONS[section.sectionId].name}.`);
  const revise = sections.filter((section) => section.state !== "excluded" && section.materialState === "revise").map((section) => `Revise ${SECTIONS[section.sectionId].name}; the material is relevant but has a different job here.`);
  const missing = sections.filter((section) => section.state === "missing").map((section) => `Build ${SECTIONS[section.sectionId].name}: ${SECTIONS[section.sectionId].job}`);
  const prohibited = sections.filter((section) => section.state === "excluded").map((section) => `Do not include ${SECTIONS[section.sectionId].name}; the current requirement prohibits it.`);
  const leaveOut = [
    ...prohibited,
    ...sections.filter((section) => section.state !== "excluded").slice(0, 6).map((section) => `${SECTIONS[section.sectionId].name}: leave out ${SECTIONS[section.sectionId].leaveOut}`),
  ];
  const cautions: string[] = [];
  if (input.confidentiality && input.confidentiality !== "ordinary") cautions.push("Private or sensitive notes stay out of default export and circulation.");
  if (input.imageRights === "unknown" || input.imageRights === "uncertain") cautions.push("Image availability is not permission. Verify the intended use before public circulation.");
  if (input.financeDecision) cautions.push("This tool organises section jobs; it does not create or validate legal, tax, investment, recoupment, or return claims.");
  if (input.deadlineBand === "within_72_hours") cautions.push("Protect compliance and the main decision path. Cut optional work before shrinking type or inventing claims.");
  return {
    headline: outcome.headline,
    thisVersionIsFor: input.recipientKind && input.desiredDecision
      ? `${input.recipientKind}, deciding whether to ${input.desiredDecision}.`
      : "A private working decision until recipient and ask are known.",
    because: choice.reasons,
    reuse: [...reusable, ...revise],
    buildNow: missing,
    bringFirst: sections.filter((section) => section.state === "required" || section.state === "recommended").slice(0, 3).map((section) => SECTIONS[section.sectionId].name),
    leaveOut,
    cautions,
    changeTriggers: choice.changeTriggers,
  };
}

export function assessDeckBones(input: DeckBonesInput): DeckBonesResult {
  const choice = chooseRoute(input);
  const sections = evaluateSections(input, choice.routeId);
  const outcome = OUTCOMES[choice.routeId];
  return {
    engineVersion: DECK_BONES_VERSION,
    inputFingerprint: fingerprint(input),
    primary: {
      routeId: choice.routeId,
      certainty: choice.certainty,
      reasonCodes: choice.reasonCodes,
    },
    outcome,
    nextQuestion: choice.nextQuestion,
    sections,
    tasks: buildTasks(choice, sections),
    gates: choice.gates,
    explanation: buildExplanation(input, choice, sections),
    exactRequirements: input.exactRequirements ?? [],
    limitations: [
      "Deck Bones does not write the creator's story, intention, politics, lived experience, or Protect This line.",
      "It does not judge quality, predict success, verify law or finance, or manufacture access.",
      "Route and section logic remain validation-pending until practitioner and creator review is complete.",
    ],
  };
}
