import type {
  ArtefactKind,
  ClientLane,
  CopyBudget,
  DeliveryMode,
  SlideJobSummary,
  SlideRole,
} from "./types.ts";

export type ResolvedDelivery = Exclude<DeliveryMode, "dual_use">;
type BudgetTuple = readonly [comfortableWords: number, tightWords: number, comfortableBlocks: number, tightBlocks: number];

export interface SlideJobProfile extends SlideJobSummary {
  artefacts: ArtefactKind[];
  job: string;
  watchFor: string[];
  bands?: Partial<Record<ResolvedDelivery, BudgetTuple>>;
}

function profile(value: SlideJobProfile): SlideJobProfile {
  return value;
}

export const SLIDE_JOB_PROFILES: readonly SlideJobProfile[] = [
  profile({
    id: "film.cover", label: "Cover / invitation", clientLane: "film_tv", baseRole: "cover",
    artefacts: ["film_tv_pitch", "feature_or_short_pitch", "episodic_pitch", "documentary_pitch", "unscripted_format_pitch", "show_bible", "lookbook"],
    job: "Name the project and create the first emotional promise.", recipientSensitive: false,
    watchFor: ["A synopsis pretending to be a subtitle", "Unconfirmed awards, attachments, or status"],
    bands: { speaker_led: [8, 18, 1, 2], guided_read: [12, 24, 2, 3], self_read: [18, 32, 2, 4], reference: [24, 45, 3, 5] },
  }),
  profile({
    id: "film.logline", label: "Logline", clientLane: "film_tv", baseRole: "statement",
    artefacts: ["film_tv_pitch", "feature_or_short_pitch", "episodic_pitch", "documentary_pitch", "unscripted_format_pitch", "talent_facing_pack"],
    job: "Express protagonist or subject, destabilising force, pursuit, and stakes without retelling the plot.", recipientSensitive: false,
    watchFor: ["Tagline mistaken for logline", "Character names without orienting information", "Three sentences doing synopsis work"],
    bands: { speaker_led: [18, 35, 2, 3], guided_read: [25, 45, 2, 3], self_read: [30, 60, 3, 4], reference: [45, 80, 4, 6] },
  }),
  profile({
    id: "film.premise_format", label: "Premise and format", clientLane: "film_tv", baseRole: "overview",
    artefacts: ["episodic_pitch", "unscripted_format_pitch", "show_bible", "film_tv_pitch"],
    job: "Let a new reader understand what the thing is, how long it runs, and what repeats or progresses.", recipientSensitive: true,
    watchFor: ["Format metadata buried in prose", "A mood teaser that never explains the show"],
    bands: { speaker_led: [25, 50, 3, 5], guided_read: [40, 70, 4, 6], self_read: [55, 95, 5, 8], reference: [90, 140, 7, 10] },
  }),
  profile({
    id: "film.synopsis_short", label: "Short synopsis", clientLane: "film_tv", baseRole: "story",
    artefacts: ["film_tv_pitch", "feature_or_short_pitch", "documentary_pitch", "talent_facing_pack", "festival_or_grant_pitch"],
    job: "Carry the decisive story movement in a form someone can actually finish.", recipientSensitive: true,
    watchFor: ["Repeating the logline", "Equal detail for every beat", "Hiding the ending when the recipient needs story confidence"],
    bands: { speaker_led: [50, 85, 4, 6], guided_read: [70, 110, 5, 8], self_read: [110, 180, 7, 11], reference: [180, 280, 10, 16] },
  }),
  profile({
    id: "film.story_arc", label: "Story or season arc", clientLane: "film_tv", baseRole: "story",
    artefacts: ["feature_or_short_pitch", "episodic_pitch", "documentary_pitch", "show_bible"],
    job: "Show meaningful progression rather than list events.", recipientSensitive: true,
    watchFor: ["Plot inventory without causality", "Spoiler anxiety overriding recipient needs", "One slide carrying multiple acts or timelines"],
    bands: { speaker_led: [40, 70, 4, 6], guided_read: [60, 100, 5, 8], self_read: [100, 160, 7, 11], reference: [160, 240, 10, 15] },
  }),
  profile({
    id: "film.world", label: "World", clientLane: "film_tv", baseRole: "overview",
    artefacts: ["feature_or_short_pitch", "episodic_pitch", "documentary_pitch", "unscripted_format_pitch", "show_bible", "lookbook"],
    job: "Explain the pressures, rules, textures, or access that make this world story-bearing.", recipientSensitive: false,
    watchFor: ["Adjective fog", "Generic locations", "World-building detached from character and conflict"],
    bands: { speaker_led: [25, 50, 3, 5], guided_read: [40, 70, 4, 6], self_read: [60, 105, 5, 8], reference: [95, 155, 7, 11] },
  }),
  profile({
    id: "film.tone", label: "Tone and viewing experience", clientLane: "film_tv", baseRole: "argument",
    artefacts: ["film_tv_pitch", "feature_or_short_pitch", "episodic_pitch", "documentary_pitch", "unscripted_format_pitch", "lookbook", "directors_treatment"],
    job: "Make the intended emotional and formal experience legible through specific choices.", recipientSensitive: false,
    watchFor: ["A pile of adjectives", "Comps with no explained relationship", "Visual claims the author does not own"],
    bands: { speaker_led: [25, 50, 3, 5], guided_read: [40, 70, 4, 6], self_read: [60, 105, 5, 8], reference: [95, 155, 7, 11] },
  }),
  profile({
    id: "film.character_single", label: "Lead character", clientLane: "film_tv", baseRole: "profile",
    artefacts: ["film_tv_pitch", "feature_or_short_pitch", "episodic_pitch", "show_bible", "talent_facing_pack"],
    job: "Show want, contradiction, pressure, and movement—not a miniature biography.", recipientSensitive: true,
    watchFor: ["Demographic shorthand doing character work", "Backstory with no present pressure", "Actor-facing copy that leaves no interpretive room"],
    bands: { speaker_led: [30, 55, 3, 5], guided_read: [45, 75, 4, 6], self_read: [70, 115, 5, 8], reference: [100, 160, 7, 11] },
  }),
  profile({
    id: "film.character_ensemble", label: "Character ensemble", clientLane: "film_tv", baseRole: "profile",
    artefacts: ["film_tv_pitch", "feature_or_short_pitch", "episodic_pitch", "show_bible", "talent_facing_pack"],
    job: "Orient the ensemble and expose relationships without turning the page into a cast directory.", recipientSensitive: true,
    watchFor: ["Too many equal-weight profiles", "Names before relationships", "Shrinking type to preserve everyone"],
    bands: { speaker_led: [45, 75, 5, 8], guided_read: [60, 95, 6, 9], self_read: [90, 140, 7, 11], reference: [130, 200, 10, 15] },
  }),
  profile({
    id: "film.series_engine", label: "Series engine", clientLane: "film_tv", baseRole: "process",
    artefacts: ["episodic_pitch", "unscripted_format_pitch", "show_bible"],
    job: "Answer why this generates compelling episodes rather than only a strong pilot.", recipientSensitive: true,
    watchFor: ["Season synopsis mistaken for repeatable engine", "Abstract promise without episode evidence", "Future seasons over-specified as settled fact"],
    bands: { speaker_led: [45, 75, 4, 6], guided_read: [65, 105, 5, 8], self_read: [90, 150, 7, 10], reference: [150, 230, 10, 14] },
  }),
  profile({
    id: "film.episode_examples", label: "Episode examples", clientLane: "film_tv", baseRole: "case_study",
    artefacts: ["episodic_pitch", "unscripted_format_pitch", "show_bible"],
    job: "Prove range and repeatability with a few distinct examples.", recipientSensitive: true,
    watchFor: ["Full episode synopses", "Examples that all test the same story muscle", "Tiny type used to keep an arbitrary page count"],
    bands: { speaker_led: [45, 80, 4, 7], guided_read: [70, 110, 5, 8], self_read: [100, 160, 6, 10], reference: [160, 240, 9, 14] },
  }),
  profile({
    id: "film.creator_note", label: "Creator note / why me", clientLane: "film_tv", baseRole: "statement",
    artefacts: ["film_tv_pitch", "feature_or_short_pitch", "episodic_pitch", "documentary_pitch", "unscripted_format_pitch", "festival_or_grant_pitch"],
    job: "Connect authorship, lived relationship, craft, and necessity without demanding trauma as proof.", recipientSensitive: true,
    watchFor: ["Biography repeated from the team page", "Confession mistaken for authority", "Generic passion language"],
    bands: { speaker_led: [45, 80, 3, 6], guided_read: [65, 105, 4, 7], self_read: [100, 165, 6, 10], reference: [150, 230, 9, 14] },
  }),
  profile({
    id: "film.director_note", label: "Director's note", clientLane: "film_tv", baseRole: "statement",
    artefacts: ["directors_treatment", "lookbook", "film_tv_pitch", "feature_or_short_pitch"],
    job: "State the directing idea and how it changes the audience's experience.", recipientSensitive: true,
    watchFor: ["Shot list instead of intent", "Claiming ownership of choices that belong to another collaborator", "Generic cinematic language"],
    bands: { speaker_led: [45, 80, 3, 6], guided_read: [65, 105, 4, 7], self_read: [100, 165, 6, 10], reference: [150, 230, 9, 14] },
  }),
  profile({
    id: "film.why_now", label: "Why this, why now", clientLane: "film_tv", baseRole: "argument",
    artefacts: ["film_tv_pitch", "feature_or_short_pitch", "episodic_pitch", "documentary_pitch", "unscripted_format_pitch", "festival_or_grant_pitch", "financier_or_investor_pack"],
    job: "Name the present cultural, personal, political, or market pressure without manufacturing urgency.", recipientSensitive: true,
    watchFor: ["Trend claims without evidence", "Topicality replacing story value", "Moral blackmail"],
    bands: { speaker_led: [35, 65, 3, 5], guided_read: [55, 90, 4, 7], self_read: [85, 140, 6, 9], reference: [130, 200, 8, 13] },
  }),
  profile({
    id: "film.comps", label: "Comparables", clientLane: "film_tv", baseRole: "comparison",
    artefacts: ["film_tv_pitch", "feature_or_short_pitch", "episodic_pitch", "documentary_pitch", "unscripted_format_pitch", "talent_facing_pack", "financier_or_investor_pack"],
    job: "Orient tone, audience, form, or market through named relationships—not borrowed prestige.", recipientSensitive: true,
    watchFor: ["Logos with no rationale", "Only giant outliers", "Revenue claims without compatible sources"],
    bands: { speaker_led: [30, 55, 3, 6], guided_read: [45, 75, 4, 7], self_read: [60, 105, 5, 9], reference: [100, 160, 8, 12] },
  }),
  profile({
    id: "film.documentary_access", label: "Documentary access", clientLane: "film_tv", baseRole: "evidence",
    artefacts: ["documentary_pitch", "festival_or_grant_pitch", "financier_or_investor_pack"],
    job: "Show what access exists, what remains contingent, and why the team can responsibly make the film.", recipientSensitive: true,
    watchFor: ["Interest described as permission", "Subject risk hidden behind confidence", "Unresolved consent or safety treated as copy polish"],
    bands: { speaker_led: [40, 70, 4, 6], guided_read: [60, 100, 5, 8], self_read: [90, 150, 7, 10], reference: [140, 220, 10, 14] },
  }),
  profile({
    id: "film.documentary_approach", label: "Documentary approach and uncertainty", clientLane: "film_tv", baseRole: "process",
    artefacts: ["documentary_pitch", "festival_or_grant_pitch"],
    job: "Make method, ethical stance, known story, and productive uncertainty legible.", recipientSensitive: true,
    watchFor: ["Pretending an unfolding reality is already scripted", "Aesthetic treatment replacing ethical method", "Risk to subjects omitted"],
    bands: { speaker_led: [45, 75, 4, 6], guided_read: [65, 105, 5, 8], self_read: [100, 165, 7, 10], reference: [155, 235, 10, 14] },
  }),
  profile({
    id: "film.audience", label: "Audience and positioning", clientLane: "film_tv", baseRole: "argument",
    artefacts: ["film_tv_pitch", "feature_or_short_pitch", "episodic_pitch", "documentary_pitch", "unscripted_format_pitch", "financier_or_investor_pack"],
    job: "Describe plausible audiences and relevance with evidence proportional to the claim.", recipientSensitive: true,
    watchFor: ["Everyone as target audience", "Invented market size", "Demographic stereotypes", "Wishful distribution stated as plan"],
    bands: { speaker_led: [30, 60, 3, 6], guided_read: [50, 85, 4, 7], self_read: [70, 120, 6, 9], reference: [120, 190, 9, 13] },
  }),
  profile({
    id: "film.production_status", label: "Production status and proof", clientLane: "film_tv", baseRole: "evidence",
    artefacts: ["film_tv_pitch", "feature_or_short_pitch", "episodic_pitch", "documentary_pitch", "unscripted_format_pitch", "festival_or_grant_pitch", "financier_or_investor_pack"],
    job: "Separate completed, confirmed, in discussion, planned, and unknown work.", recipientSensitive: true,
    watchFor: ["A wishlist presented as attachment", "Soft interest presented as commitment", "Old status"],
    bands: { speaker_led: [30, 55, 4, 7], guided_read: [45, 75, 5, 8], self_read: [65, 110, 7, 10], reference: [105, 170, 10, 14] },
  }),
  profile({
    id: "film.team", label: "Team and credibility", clientLane: "film_tv", baseRole: "profile",
    artefacts: ["film_tv_pitch", "feature_or_short_pitch", "episodic_pitch", "documentary_pitch", "unscripted_format_pitch", "festival_or_grant_pitch", "talent_facing_pack", "financier_or_investor_pack"],
    job: "Show why this team can do this work; use only relevant, verified proof.", recipientSensitive: true,
    watchFor: ["Full biographies", "Prestige by association", "Unverified credits", "Status hierarchy presented as creative value"],
    bands: { speaker_led: [35, 65, 4, 7], guided_read: [55, 90, 5, 8], self_read: [80, 140, 7, 11], reference: [130, 210, 10, 15] },
  }),
  profile({
    id: "film.finance", label: "Budget, finance, and recoupment", clientLane: "film_tv", baseRole: "data",
    artefacts: ["financier_or_investor_pack", "film_tv_pitch", "feature_or_short_pitch", "documentary_pitch"],
    job: "Orient scale, secured versus sought funds, uses, assumptions, and risk at the recipient's required depth.", recipientSensitive: true,
    watchFor: ["Returns promised", "Unsupported comparables", "Legal or securities content compressed to fit", "Detailed finance in a writer-to-director deck"],
    bands: { speaker_led: [35, 65, 4, 7], guided_read: [55, 95, 5, 9], self_read: [90, 150, 8, 12], reference: [180, 300, 12, 20] },
  }),
  profile({
    id: "film.ask", label: "Ask and next step", clientLane: "film_tv", baseRole: "ask",
    artefacts: ["film_tv_pitch", "feature_or_short_pitch", "episodic_pitch", "documentary_pitch", "unscripted_format_pitch", "festival_or_grant_pitch", "talent_facing_pack", "financier_or_investor_pack"],
    job: "Make the requested action, amount, material, role, or next conversation unmistakable.", recipientSensitive: true,
    watchFor: ["Several incompatible asks", "Contact details without a request", "A funding ask with no status or use"],
    bands: { speaker_led: [20, 45, 2, 5], guided_read: [30, 55, 3, 6], self_read: [40, 75, 4, 7], reference: [65, 110, 6, 9] },
  }),

  profile({ id: "advertising.big_idea", label: "The idea", clientLane: "advertising", baseRole: "statement", artefacts: ["commercial_directors_treatment", "brand_or_client_pitch", "directors_treatment"], job: "Make the central creative proposition graspable before execution detail.", recipientSensitive: true, watchFor: ["Strategy repeated as an idea", "A slogan with no dramatic mechanism"] }),
  profile({ id: "advertising.director_note", label: "Director's response", clientLane: "advertising", baseRole: "statement", artefacts: ["commercial_directors_treatment", "directors_treatment"], job: "Show the director's human response and governing point of view.", recipientSensitive: true, watchFor: ["Praise for the brief instead of an interpretation", "Generic craft promises"] }),
  profile({ id: "advertising.story", label: "Narrative walkthrough", clientLane: "advertising", baseRole: "story", artefacts: ["commercial_directors_treatment", "brand_or_client_pitch"], job: "Walk the reader through the film with enough rhythm to imagine it.", recipientSensitive: true, watchFor: ["Script pasted into slides", "Every frame given equal weight"] }),
  profile({ id: "advertising.craft", label: "Craft approach", clientLane: "advertising", baseRole: "process", artefacts: ["commercial_directors_treatment", "agency_or_production_company_pitch"], job: "Explain how performance, camera, production design, edit, sound, or VFX serves the idea.", recipientSensitive: true, watchFor: ["Equipment lists without purpose", "Promising production facts not yet confirmed"] }),
  profile({ id: "advertising.case", label: "Relevant work", clientLane: "advertising", baseRole: "case_study", artefacts: ["agency_or_production_company_pitch", "credentials_deck", "case_study_or_portfolio"], job: "Use proof relevant to this brief, client, or production risk.", recipientSensitive: true, watchFor: ["Showreel inventory", "Unclear personal contribution"] }),

  profile({ id: "business.problem", label: "Problem or change", clientLane: "business", baseRole: "argument", artefacts: ["fundraising_deck", "sales_deck", "partnership_deck", "strategy_or_decision_deck"], job: "Make the costly condition and affected party specific.", recipientSensitive: true, watchFor: ["Vague enormity", "Problem defined only from the seller's view"] }),
  profile({ id: "business.solution", label: "Solution and value", clientLane: "business", baseRole: "overview", artefacts: ["fundraising_deck", "sales_deck", "partnership_deck", "proposal", "product_demo"], job: "Connect capability to a user-visible change.", recipientSensitive: true, watchFor: ["Feature list", "Claims without mechanism"] }),
  profile({ id: "business.traction", label: "Traction or proof", clientLane: "business", baseRole: "evidence", artefacts: ["fundraising_deck", "sales_deck", "partnership_deck", "board_or_investor_update"], job: "Show dated, defined evidence with the denominator and comparison needed to interpret it.", recipientSensitive: true, watchFor: ["Vanity metrics", "Charts without units or dates", "Forecasts styled as actuals"] }),
  profile({ id: "business.market", label: "Market and alternatives", clientLane: "business", baseRole: "comparison", artefacts: ["fundraising_deck", "sales_deck", "strategy_or_decision_deck"], job: "Explain the arena, alternatives, and evidence without fake precision.", recipientSensitive: true, watchFor: ["Top-down market fantasy", "Competitors chosen to flatter the product"] }),
  profile({ id: "business.ask", label: "Decision and ask", clientLane: "business", baseRole: "ask", artefacts: ["fundraising_deck", "sales_deck", "partnership_deck", "proposal", "strategy_or_decision_deck", "board_or_investor_update"], job: "Name the decision, owner, amount or commitment, and next step.", recipientSensitive: true, watchFor: ["Several asks", "A closing slogan instead of an action"] }),

  profile({ id: "civic.claim", label: "Claim or concept", clientLane: "education_civic", baseRole: "argument", artefacts: ["training_or_lecture", "keynote_or_conference_talk", "report_or_leave_behind"], job: "State one teachable or contestable idea with the context needed to understand it.", recipientSensitive: true, watchFor: ["Jargon as proof", "A complex argument reduced past honesty"] }),
  profile({ id: "civic.evidence", label: "Evidence and source", clientLane: "education_civic", baseRole: "evidence", artefacts: ["training_or_lecture", "keynote_or_conference_talk", "report_or_leave_behind"], job: "Let people interpret a claim and recover its source.", recipientSensitive: true, watchFor: ["Citation made unreadable", "Correlation narrated as cause"] }),
  profile({ id: "civic.instructions", label: "Instructions", clientLane: "education_civic", baseRole: "process", artefacts: ["training_or_lecture", "report_or_leave_behind"], job: "Enable an action without requiring the presenter to repair the instructions.", recipientSensitive: true, watchFor: ["Critical steps only spoken", "Timing or prerequisites omitted"] }),
];

const BY_ID = new Map(SLIDE_JOB_PROFILES.map((item) => [item.id, item]));

export function getSlideJobProfile(id: string | undefined): SlideJobProfile | undefined {
  return id ? BY_ID.get(id) : undefined;
}

export function getJobBudget(id: string | undefined, delivery: ResolvedDelivery): CopyBudget | undefined {
  const tuple = getSlideJobProfile(id)?.bands?.[delivery];
  if (!tuple) return undefined;
  return {
    comfortableMaxWords: tuple[0],
    tightMaxWords: tuple[1],
    comfortableMaxBlocks: tuple[2],
    tightMaxBlocks: tuple[3],
    basis: "editorial_judgement",
    status: "provisional",
  };
}

export function listSlideJobs(lane?: ClientLane, artefact?: ArtefactKind): SlideJobProfile[] {
  return SLIDE_JOB_PROFILES.filter((item) =>
    (!lane || item.clientLane === lane) && (!artefact || item.artefacts.includes(artefact)),
  );
}
