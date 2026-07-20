import {
  assessDeckBones,
  OneSlideOrThree,
  SECTIONS,
  type DeckBonesInput,
  type ExistingMaterial,
  type SectionId,
} from "../../src/index.ts";
import type { PreviewMeasurement } from "../../src/one-slide-or-three/index.ts";
import type {
  DeckAnswers,
  DeckGoal,
  DeckPlanView,
  CraftObservation,
  NextAdvice,
  NextAnswers,
  SlideDraft,
  SlideResultView,
} from "./types.ts";

const DECISIONS: Record<NonNullable<DeckAnswers["goal"]>, string> = {
  read: "read the project and decide whether to continue",
  meeting: "take a meeting about the project",
  producer: "consider joining the project as a producing or development partner",
  creative: "consider a creative attachment conversation",
  funding: "consider development support or financing",
  team: "choose the next internal direction",
  specific: "review the specifically requested material",
  unsure: "choose whether to keep talking",
};

const RECIPIENTS: Record<NonNullable<DeckAnswers["recipient"]>, string> = {
  producer: "producer or development executive",
  director: "director",
  company: "production company",
  buyer: "commissioner or buyer",
  financier: "financier or investor",
  fund: "grant or fund",
  talent: "actor or talent representative",
  team: "internal team",
};

const ASK_NAMES: Record<NonNullable<DeckAnswers["specificAsk"]>, string> = {
  "pitch-deck": "Pitch deck",
  "one-pager": "One-page overview",
  lookbook: "Lookbook",
  "series-bible": "Series bible",
  treatment: "Treatment",
  application: "Application pack",
  unsure: "Requested film or TV material",
};

const PLAN_HEADLINES: Record<NonNullable<DeckAnswers["goal"]>, string> = {
  read: "Make them want the script.",
  meeting: "Earn the conversation.",
  producer: "Give them a reason to lean in.",
  creative: "Make room for a real creative conversation.",
  funding: "Make the creative case. Mark the real unknowns.",
  team: "Make the decision visible.",
  specific: "Give them exactly what they asked for.",
  unsure: "Start with the smallest useful deck.",
};

const DELIVERY_PHRASES: Record<NonNullable<DeckAnswers["delivery"]>, string> = {
  live: "in a live presentation",
  read: "reading without you",
  both: "in the room and later on their own",
  internal: "inside your team",
};

const SECTION_COPY: Record<SectionId, { name: string; job: string }> = {
  S00: { name: "Project at a glance", job: "Name the project, format, and current version." },
  S01: { name: "Logline or series premise", job: "Make the central dramatic promise easy to grasp." },
  S02: { name: "The decision", job: "Name the reader and what should happen next." },
  S03: { name: "The feature story", job: "Show the story from beginning to end without retelling every scene." },
  S04: { name: "The series", job: "Show what changes beyond the pilot." },
  S05: { name: "How the series keeps going", job: "Explain the repeatable engine—or why the finite form is the right length." },
  S06: { name: "Characters and relationships", job: "Show what people want, what presses on them, and what changes between them." },
  S07: { name: "The world", job: "Show how this place and its rules create story." },
  S08: { name: "Tone and audience experience", job: "Make the intended viewing experience tangible." },
  S09: { name: "Point of view", job: "Name the tension or question the story keeps returning to." },
  S10: { name: "Visual language", job: "Show how the form serves the story—not just what looks nice." },
  S11: { name: "Why you", job: "Explain your real connection to the work without turning pain into proof." },
  S12: { name: "The director’s take", job: "Show the interpretation and method that make this version distinct." },
  S13: { name: "The audience", job: "Say who may care and what supports that belief." },
  S14: { name: "Comparables", job: "Use each comparison to clarify one useful relationship." },
  S15: { name: "The season arc", job: "Show how the season moves, changes, and lands." },
  S16: { name: "Episode examples", job: "Prove range with a few genuinely different episodes." },
  S17: { name: "Future seasons", job: "Show honest future story only when the form needs it." },
  S18: { name: "The team", job: "Name the real people and the experience that matters here." },
  S19: { name: "What exists now", job: "Separate what is done, agreed, interested, planned, and still unknown." },
  S20: { name: "Rights and permissions", job: "State only what has actually been checked." },
  S21: { name: "Production approach", job: "Connect creative choices to a practical plan and mark the unknowns." },
  S22: { name: "Budget and financing", job: "Use sourced, producer-led facts. Do not invent certainty." },
  S23: { name: "Route to the audience", job: "Separate real evidence from the plan for reaching people." },
  S24: { name: "The ask", job: "Say exactly what this reader should do next." },
  S25: { name: "Contact and version", job: "Keep the right name, date, contact, and version attached." },
  S26: { name: "Appendix", job: "Keep useful backup material out of the main story until it is needed." },
};

function existingMaterials(answers: DeckAnswers): ExistingMaterial[] {
  if (answers.materials === "fresh" || !answers.materials) return [];
  const story = answers.format === "series" ? "S04" : "S03";
  if (answers.materials === "notes") return [
    { sectionId: "S01", kind: "premise notes", state: "rough" },
    { sectionId: story, kind: "story notes", state: "rough" },
  ];
  if (answers.materials === "core") return [
    { sectionId: "S01", kind: "logline or premise", state: "usable" },
    { sectionId: story, kind: "synopsis", state: "usable" },
  ];
  const reusable: SectionId[] = ["S00", "S01", story, "S06", "S08", "S19", "S24", "S25"];
  return reusable.map((sectionId) => ({
    sectionId,
    kind: "existing deck section",
    state: "usable" as const,
  }));
}

function deckInput(answers: DeckAnswers): DeckBonesInput {
  const featureStage = answers.format === "feature"
    ? ({ idea: "idea", outline: "outline", draft: "first_draft", revised: "revised", tested: "tested", packaged: "packaged" } as const)[answers.stage ?? "revised"]
    : undefined;
  const episodicStage = answers.format === "series"
    ? ({ idea: "premise", outline: "outline", draft: "complete_pilot", revised: "tested_pilot", tested: "overview", packaged: "pitch_document" } as const)[answers.stage ?? "tested"]
    : undefined;
  const delivery = ({ live: "live", read: "read_alone", both: "leave_behind", internal: "internal" } as const)[answers.delivery ?? "read"];
  const exact = answers.goal === "specific" && answers.specificAsk
    ? [{ id: `ask-${answers.specificAsk}`, name: ASK_NAMES[answers.specificAsk], status: "mandatory" as const }]
    : undefined;
  return {
    projectKind: answers.format === "series" ? "scripted-episodic" : "scripted-feature",
    role: answers.role ?? (answers.recipient === "team" ? "team" : "writer"),
    desiredDecision: DECISIONS[answers.goal ?? "unsure"],
    recipientKind: RECIPIENTS[answers.recipient ?? "producer"],
    recipientCount: answers.recipientShape ?? "one",
    accessRoute: answers.access,
    delivery,
    exactRequirementStatus: exact ? "current" : answers.requirementStatus ?? "none",
    exactRequirements: exact,
    featureStage,
    episodicStage,
    seriesShape: answers.format === "series" && ["tested", "packaged"].includes(answers.stage ?? "") ? "returning" : undefined,
    deckRequested: answers.goal === "specific" || answers.materials === "deck",
    visualCaseMatters: true,
    privateOrInternal: answers.goal === "team" || answers.recipient === "team",
    liveMeeting: answers.delivery === "live",
    existingDeck: answers.materials === "deck",
    financeDecision: answers.goal === "funding" && answers.recipient === "financier",
    financeBasis: answers.boundaries?.includes("finance_unchecked") ? "missing" : answers.materials === "deck" ? "partial" : "missing",
    talentDecision: answers.recipient === "talent",
    speculativeWork: answers.boundaries?.includes("substantial_unpaid") ? "substantial_terms_unclear" : "none",
    confidentiality: answers.boundaries?.includes("sensitive") ? "sensitive" : "ordinary",
    imageRights: answers.boundaries?.includes("images_unclear") ? "uncertain" : "owned_or_licensed",
    deadlineBand: answers.deadline ?? "unknown",
    existingMaterials: existingMaterials(answers),
  };
}

export function buildDeckPlan(answers: DeckAnswers): DeckPlanView {
  const input = deckInput(answers);
  const raw = assessDeckBones(input);
  const imageBoundaryOnly = answers.boundaries?.includes("images_unclear") && raw.outcome.id === "O-U11";
  const structural = imageBoundaryOnly ? assessDeckBones({ ...input, imageRights: "owned_or_licensed" }) : raw;
  const routedCore = structural.sections.filter((section) => !["excluded", "optional", "appendix"].includes(section.state));
  const smallestGoals: DeckGoal[] = ["meeting", "read", "unsure"];
  const smallestIds: SectionId[] = ["S00", "S01", answers.format === "series" ? "S04" : "S03", "S08", "S11", "S24", "S25"];
  const sections = smallestGoals.includes(answers.goal ?? "unsure")
    ? routedCore.filter((section) => smallestIds.includes(section.sectionId))
    : routedCore;
  const deferredCore = routedCore.filter((section) => !sections.includes(section));
  const optionalSections = [...deferredCore, ...structural.sections.filter((section) => ["optional", "appendix"].includes(section.state))];
  const noPlanPages = sections.length === 0;
  const isRehearsal = noPlanPages && raw.outcome.kind === "rehearsal";
  const headline = noPlanPages && answers.goal === "funding"
    ? "Do not invent the money slide."
    : isRehearsal
      ? "Stop adding. Rehearse the decision."
    : raw.outcome.kind === "stop"
      ? "The deck can wait. Do this first."
    : noPlanPages
      ? raw.outcome.headline
    : PLAN_HEADLINES[answers.goal ?? "unsure"];
  const intro = imageBoundaryOnly && !noPlanPages
    ? `Keep building the structure for a ${RECIPIENTS[answers.recipient ?? "producer"]} ${DELIVERY_PHRASES[answers.delivery ?? "read"]}. Use a marked placeholder or an owned image in the travelling version; the uncertain image does not get to freeze the rest of the work.`
    : noPlanPages && answers.goal === "funding"
    ? "The creative case can travel. Financial claims need a real, qualified basis first."
    : isRehearsal
      ? `The deck already exists. Rehearse it for a ${RECIPIENTS[answers.recipient ?? "producer"]} ${DELIVERY_PHRASES[answers.delivery ?? "read"]}. Add a page only if the run exposes a decision-critical gap.`
    : raw.outcome.kind === "stop"
      ? "One smaller piece of work will help more than another deck right now."
    : noPlanPages
      ? raw.explanation.because[0] ?? "One piece of work needs to become clearer before the deck can help."
    : `For a ${RECIPIENTS[answers.recipient ?? "producer"]} ${DELIVERY_PHRASES[answers.delivery ?? "read"]}. ${sections.length} ${sections.length === 1 ? "page" : "pages"}. Each one has one job.`;
  const ask = answers.specificAsk ? ASK_NAMES[answers.specificAsk].toLowerCase() : "Film and TV deck";
  const reasons = imageBoundaryOnly && !noPlanPages
    ? [
      "The deck structure can continue without laundering image availability into permission.",
      "Use a marked placeholder privately, or replace the asset with work you can support before circulation.",
      `This version still has one job: help a ${RECIPIENTS[answers.recipient ?? "producer"]} ${DECISIONS[answers.goal ?? "unsure"]}.`,
    ]
    : noPlanPages && answers.goal === "funding"
    ? ["A creative tool cannot responsibly manufacture budgets, returns, tax claims, or recoupment logic."]
    : isRehearsal
    ? [
      raw.explanation.because[0] ?? "The usable material already exists; rehearsal now creates more value than expansion.",
      `This version has one job: help a ${RECIPIENTS[answers.recipient ?? "producer"]} ${DECISIONS[answers.goal ?? "unsure"]}.`,
      "Add a page only when rehearsal exposes one gap that matters to that decision.",
    ]
    : raw.outcome.kind === "stop"
    ? ["A smaller piece of work needs to become real before a deck can help."]
    : noPlanPages
    ? [
      raw.explanation.because[0] ?? "One piece of work needs to become clearer before the deck can help.",
      ...(raw.tasks[0]?.doneWhen.slice(0, 1) ?? []),
    ]
    : [
      answers.goal === "specific"
        ? `You chose a ${ask}. The requested item sets the boundary; useful extras do not outrank it.`
        : `This version has one job: help a ${RECIPIENTS[answers.recipient ?? "producer"]} ${DECISIONS[answers.goal ?? "unsure"]}.`,
      answers.format === "series"
        ? "The series must prove life beyond the pilot."
        : "The feature must make the complete story movement easy to understand.",
      answers.materials === "fresh"
        ? "You are starting fresh, so every page must earn the work it creates."
        : "You already have useful material. Reuse it before inventing more work.",
    ];
  const leaveOut = [
    "Taglines pretending to be loglines.",
    "Trauma presented as proof that a creator deserves to tell the story.",
    "Names, rights, budgets, attachments, or interest that are not confirmed.",
    "Any extra page that does not help this reader make this decision.",
  ];
  const preDeckAction = noPlanPages && answers.goal === "funding"
    ? "Use the current fund, grant, or investor requirements. Get qualified producing or finance input before claims enter the deck."
    : noPlanPages ? raw.tasks[0]?.action ?? "Complete the next piece of work, then return to the deck." : undefined;
  return { raw, headline, intro, sections, optionalSections, reasons, leaveOut, preDeckAction };
}

const RECOMMENDATIONS: Record<OneSlideOrThree.Recommendation, { headline: string; body: string }> = {
  confirm_visual_only: { headline: "Keep it visual—on purpose.", body: "There is almost no readable copy here. Make sure that is a deliberate page job, not missing context." },
  add_required_source: { headline: "Add the source before judging the slide.", body: "The page needs a required citation or source before the rest of the check means much." },
  keep_one: { headline: "Keep it on one slide.", body: "The copy has room to breathe in this use. Resist the urge to decorate the empty space." },
  keep_one_tight: { headline: "Keep it on one slide.", body: "It fits. Give it a clear hierarchy and enough time to be read." },
  split_two: { headline: "Make it two slides.", body: "Two thoughts are fighting for the same page. Give each one a clean job." },
  split_three: { headline: "Make it three slides.", body: "The copy already contains three reviewable beats. Let the sequence do the work." },
  edit_before_splitting: { headline: "Edit before you split.", body: "The page is carrying too much, but the honest boundary is not clear yet." },
  make_separate_live_and_read_versions: { headline: "Make a live version and a read-alone version.", body: "One file is being asked to whisper and explain at the same time." },
  move_detail_outside_slide: { headline: "Move the detail outside the slide.", body: "The exact wording matters, but the page is not the right home for all of it." },
  rework_delivery_or_copy: { headline: "Let people read or listen—not wrestle with both.", body: "The spoken and visible channels are competing." },
  reference_density_allowed: { headline: "The density is doing a real job.", body: "This is a reference page people control. It may carry more detail than a live slide." },
  cannot_call_yet: { headline: "One more fact before we call it.", body: "The copy has been measured, but its real use still changes the answer." },
};

export function buildSlideResult(draft: SlideDraft, preview: PreviewMeasurement): SlideResultView {
  const delivery = ({ live: "speaker_led", read: "self_read", both: "dual_use" } as const)[draft.mode];
  const relation = draft.mode === "read" ? "no_speaker" : "supports_speech";
  const role = ({ compare: "comparison", process: "process", gallery: "gallery" } as const)[draft.job as "compare" | "process" | "gallery"] ?? draft.job;
  const setting = ({ room: "large_room", laptop: "laptop", phone: "phone", print: "print" } as const)[draft.viewport];
  const tasks = draft.job === "compare" ? ["compare", "decide"] as const
    : draft.job === "evidence" ? ["inspect", "remember"] as const
    : draft.job === "ask" ? ["glance", "decide"] as const
    : ["glance", "remember"] as const;
  const exposureSeconds = ({ controlled: undefined, five: 5, ten: 10, twenty: 20, thirty: 30 } as const)[draft.time];
  const raw = OneSlideOrThree.assessSlide({
    clientLane: "film_tv",
    artefact: "film_tv_pitch",
    purpose: "secure_decision",
    delivery,
    role,
    layout: "title_body",
    audience: { setting, tasks: [...tasks], familiarity: "new" },
    language: { tag: document.documentElement.lang || navigator.language || "en-US" },
    relation,
    content: { title: draft.title || undefined, body: draft.copy },
    timing: exposureSeconds ? { exposureSeconds } : undefined,
    preview,
  });
  return { raw, ...RECOMMENDATIONS[raw.recommendation], craft: draft.craft ? craftCheck(draft) : [] };
}

function craftCheck(draft: SlideDraft): CraftObservation[] {
  const body = draft.copy.trim();
  const words = body.split(/\s+/u).filter(Boolean);
  const blocks = body.split(/\n\s*\n|\n(?=[•*\-–—])/u).filter((part) => part.trim());
  const sentences = body.split(/(?<=[.!?])\s+/u).filter(Boolean);
  const title = draft.title.trim().toLocaleLowerCase("en");
  const lowerBody = body.toLocaleLowerCase("en");
  const observations: CraftObservation[] = [
    {
      state: blocks.length <= 3 ? "good" : "watch",
      label: blocks.length <= 3 ? "The hierarchy has a chance" : "Too many equal-looking blocks",
      detail: `${blocks.length} visible ${blocks.length === 1 ? "block" : "blocks"}. This counts structure; it does not judge the writing.`,
    },
    {
      state: sentences.some((sentence) => sentence.split(/\s+/u).length > 32) ? "watch" : "good",
      label: sentences.some((sentence) => sentence.split(/\s+/u).length > 32) ? "One sentence may be doing two jobs" : "No sentence is mechanically overloaded",
      detail: "We flag sentences over 32 words as a review cue—not as a law.",
    },
  ];
  if (title) observations.push({
    state: lowerBody.startsWith(title) ? "watch" : "good",
    label: lowerBody.startsWith(title) ? "The body repeats the title" : "Title and body are not mechanically duplicated",
    detail: lowerBody.startsWith(title) ? "If repetition is not the beat, spend those words elsewhere." : "They may still say the same thing in different words; only a person can judge that.",
  });
  if (draft.job === "ask") observations.push({
    state: /\b(choose|approve|read|reply|meet|fund|join|decide|send|book|start|support)\b/iu.test(body) ? "good" : "watch",
    label: /\b(choose|approve|read|reply|meet|fund|join|decide|send|book|start|support)\b/iu.test(body) ? "The ask contains a visible action" : "The ask may be missing an action",
    detail: "This is a verb check, not a persuasion score.",
  });
  if (draft.job === "evidence") observations.push({
    state: /\b(source|according|survey|study|report|data|20\d{2})\b|%/iu.test(body) ? "good" : "watch",
    label: /\b(source|according|survey|study|report|data|20\d{2})\b|%/iu.test(body) ? "A source cue is visible" : "Evidence without a visible source cue",
    detail: "The cue may still be wrong or incomplete. The tool cannot verify the claim.",
  });
  if (!words.length) observations.push({ state: "unknown", label: "No copy to inspect", detail: "Paste the visible words first." });
  return observations;
}

export function buildNextAdvice(answers: NextAnswers): NextAdvice {
  const lane = answers.lane === "film" ? "film or TV project" : answers.lane === "advertising" ? "advertising pitch" : answers.lane === "startup" ? "startup or business deck" : answers.lane === "education" ? "teaching or public-facing deck" : "project";
  const base: Record<NonNullable<NextAnswers["situation"]>, Omit<NextAdvice, "eyebrow">> = {
    exploring: {
      headline: "Choose the decision before the document.",
      body: `Your ${lane} does not need a bigger deck yet. It needs one real person and one bounded thing they might do next.`,
      doNow: ["Name one reader or room.", "Choose one decision they can actually make.", "Make only the material that helps that decision."],
      doNot: ["Do not build a universal deck for imaginary readers."],
    },
    outreach: {
      headline: "Start smaller than the whole deck.",
      body: `The first job is to earn attention for the ${lane}, not transfer your entire archive.`,
      doNow: ["Use one clear project line.", "Name why this person is the right person.", "Offer the smallest useful next item."],
      doNot: ["Do not attach everything because silence feels frightening."],
    },
    requested: {
      headline: "Give them exactly what they asked for.",
      body: "The request controls the package. Give them the named item first. Useful extras come later.",
      doNow: ["Choose the requested item from the current wording.", "Respect format and limits.", "Put optional context after the required material."],
      doNot: ["Do not make them excavate the requested item from a larger deck."],
      nextTool: answers.lane === "film" ? "deck" : "slide",
      nextToolLabel: answers.lane === "film" ? "Plan the Film & TV deck" : "Check the first slide",
    },
    meeting: {
      headline: "Stop adding. Rehearse the decision.",
      body: "A meeting is not improved by twelve more backup slides nobody can remember.",
      doNow: ["Rehearse the opening in one minute.", "Keep three ideas the room must retain.", "End with one unmistakable ask."],
      doNot: ["Do not make the deck your teleprompter."],
      nextTool: "slide",
      nextToolLabel: "Check the opening slide",
    },
    waiting: {
      headline: "Leave the deck alone for a minute.",
      body: "The material is already in the room. More packaging will not make waiting less like waiting.",
      doNow: ["Set one reasonable follow-up date.", "Write down what was actually sent.", "Return to other work until the date arrives."],
      doNot: ["Do not send a replacement deck to soothe yourself."],
    },
    followup: {
      headline: "Send one short follow-up.",
      body: "This is a communication task, not a new-document task.",
      doNow: ["Use the same legitimate thread.", "Reference the earlier exchange.", "Ask one clear, low-pressure question."],
      doNot: ["Do not resend attachments unless something materially changed."],
    },
    passed: {
      headline: "Record the fact. Do not invent the diagnosis.",
      body: "One route closed. Unless they gave a reason, the reason is unknown.",
      doNow: ["Record who, what, and when.", "Separate their actual words from your theory.", "Choose the next test from evidence, not panic."],
      doNot: ["Do not rebuild the whole identity around an imagined post-mortem."],
    },
    stuck: {
      headline: "Make one page answer one question.",
      body: "The whole deck has become too large to think about. Shrink the problem, not the type.",
      doNow: ["Pick the page creating the most doubt.", "Name its one job.", "Check whether it should be one slide, two, or three."],
      doNot: ["Do not redesign every page at once."],
      nextTool: "slide",
      nextToolLabel: "Check that page",
    },
  };
  const advice = { eyebrow: "Your next useful move", ...base[answers.situation ?? "exploring"] };
  const move = ({ read: "earn a serious read", meet: "earn a conversation", approve: "help someone choose", fund: "support a funding decision", align: "create shared understanding", unsure: "name the decision first" } as const)[answers.move ?? "unsure"];
  const delivery = answers.delivery === "live" ? "in a room" : answers.delivery === "read" ? "without you there" : answers.delivery === "both" ? "in the room and afterwards" : undefined;
  return {
    ...advice,
    body: `${advice.body} Your stated job is to ${move}${delivery ? `, ${delivery}` : ""}.`,
  };
}

export function sectionName(sectionId: SectionId): string {
  return SECTION_COPY[sectionId]?.name ?? SECTIONS[sectionId]?.name ?? sectionId;
}

export function sectionJob(sectionId: SectionId): string {
  return SECTION_COPY[sectionId]?.job ?? SECTIONS[sectionId]?.job ?? "Give this page one clear job.";
}
