import type {
  BroadDelivery,
  BroadLane,
  DeckDelivery,
  DeckBoundary,
  DeckFormat,
  DeckGoal,
  DeckMaterials,
  DeckRecipient,
  DeckRole,
  DeckStage,
  DeadlineBand,
  DesiredMove,
  Situation,
  AccessRouteChoice,
  RecipientShape,
  RequirementStatusChoice,
  SlideTime,
  SlideViewport,
  SlideJob,
  SlideMode,
  SpecificAsk,
} from "./types.ts";

export interface Choice<T extends string> {
  value: T;
  label: string;
  detail: string;
}

export const DECK_FORMATS: Choice<DeckFormat>[] = [
  { value: "feature", label: "A feature film", detail: "One complete story, built for the screen." },
  { value: "series", label: "A TV or streaming series", detail: "A pilot plus a repeatable engine or finite arc." },
];

export const DECK_GOALS: Choice<DeckGoal>[] = [
  { value: "read", label: "Get them to read it", detail: "Earn the next serious read without making a suitcase of a deck." },
  { value: "meeting", label: "Get a meeting", detail: "Give them enough to want the conversation—not every answer." },
  { value: "producer", label: "Interest a producer or creative partner", detail: "Show the project, leave room for collaboration, and name the next step." },
  { value: "funding", label: "Seek funding or approval", detail: "Make the creative case. Mark financial claims that still need real evidence." },
  { value: "team", label: "Help my team decide", detail: "A working document can be honest where a sales deck cannot." },
  { value: "specific", label: "They asked for something specific", detail: "Pick the item from a list. No guessing from a blank box." },
  { value: "unsure", label: "I’m not sure—help me choose", detail: "We’ll build the smallest useful version first." },
];

export const SPECIFIC_ASKS: Choice<SpecificAsk>[] = [
  { value: "pitch-deck", label: "Pitch deck", detail: "A visual project argument for a specific reader." },
  { value: "one-pager", label: "One-page overview", detail: "A concise first read that can open the next conversation." },
  { value: "lookbook", label: "Lookbook or visual deck", detail: "A visual articulation of world, tone, and screen experience." },
  { value: "series-bible", label: "Series or project bible", detail: "Project, characters, form, and future story." },
  { value: "treatment", label: "Treatment", detail: "A prose-led story or directorial approach document." },
  { value: "application", label: "Application or submission pack", detail: "A program’s named set of materials." },
  { value: "unsure", label: "I’m not sure what they call it", detail: "We’ll use the safest film-and-TV structure and flag the name." },
];

export const DECK_RECIPIENTS: Choice<DeckRecipient>[] = [
  { value: "producer", label: "Producer, development executive, or production company", detail: "They decide whether the project deserves a deeper conversation." },
  { value: "director", label: "Director, creative partner, or talent", detail: "They decide whether there is meaningful room for them." },
  { value: "buyer", label: "Studio, buyer, broadcaster, or platform", detail: "They decide against their remit, slate, and route." },
  { value: "financier", label: "Investor, fund, grant, lab, or market", detail: "Their current requirements outrank any template." },
  { value: "team", label: "My own team", detail: "They need a truthful working decision, not a performance." },
];

export const DECK_DELIVERIES: Choice<DeckDelivery>[] = [
  { value: "live", label: "I’ll present it live", detail: "The room listens to you; slides create rhythm and memory." },
  { value: "read", label: "They’ll read it without me", detail: "The deck must orient, explain, and travel on its own." },
  { value: "both", label: "It needs to do both", detail: "We’ll protect against one compromised, overstuffed version." },
  { value: "internal", label: "It stays inside the team", detail: "Clarity beats sales polish." },
];

export const FEATURE_STAGES: Choice<DeckStage>[] = [
  { value: "idea", label: "Idea or early premise", detail: "The core story is still forming." },
  { value: "outline", label: "Outline or treatment", detail: "The story exists in structure, not yet as a complete script." },
  { value: "draft", label: "Complete first draft", detail: "There is a full screenplay, but it may need its first real read." },
  { value: "revised", label: "Revised screenplay", detail: "The script has changed through feedback and intention." },
  { value: "tested", label: "Tested, working draft", detail: "The core pages have survived useful outside reads." },
  { value: "packaged", label: "Already in active conversations", detail: "There is material, context, and some route evidence." },
];

export const SERIES_STAGES: Choice<DeckStage>[] = [
  { value: "idea", label: "Premise or early idea", detail: "The series promise is still forming." },
  { value: "outline", label: "Pilot outline", detail: "The first episode exists in structure." },
  { value: "draft", label: "Complete pilot", detail: "The launch exists; the wider series may still need proof." },
  { value: "revised", label: "Revised pilot", detail: "The pilot has changed through useful feedback." },
  { value: "tested", label: "Pilot plus clear series shape", detail: "The form beyond episode one is legible." },
  { value: "packaged", label: "Pitch material already exists", detail: "There is a deck, overview, or bible to assess and reuse." },
];

export const DECK_MATERIALS: Choice<DeckMaterials>[] = [
  { value: "fresh", label: "Starting fresh", detail: "Good. We’ll only ask for pages that earn their place." },
  { value: "notes", label: "Loose notes and fragments", detail: "We’ll turn useful pieces into jobs, not discard them." },
  { value: "core", label: "Logline, synopsis, or core writing", detail: "Reuse the real material before inventing new work." },
  { value: "deck", label: "A deck already exists", detail: "We’ll cut, reuse, and repair before expanding." },
];

export const DECK_ROLES: Choice<DeckRole>[] = [
  { value: "writer", label: "Writer", detail: "You own the writing and are shaping how it travels." },
  { value: "writer-director", label: "Writer-director", detail: "Story and screen interpretation are both genuinely yours." },
  { value: "director", label: "Director", detail: "You are arguing for a distinct screen interpretation." },
  { value: "producer", label: "Producer", detail: "You are packaging the project and its current route." },
  { value: "creator-showrunner", label: "Creator or showrunner", detail: "You are carrying the series promise and its life beyond the pilot." },
  { value: "team", label: "A team making a working decision", detail: "This can be frank, unfinished, and useful." },
];

export const RECIPIENT_SHAPES: Choice<RecipientShape>[] = [
  { value: "one", label: "One reader or one room", detail: "One decision can control this version." },
  { value: "several_same_decision", label: "Several people, same decision", detail: "The proof can stay coherent across the group." },
  { value: "several_different_decisions", label: "Several people, different decisions", detail: "That may require more than one version. We will not hide the conflict." },
];

export const ACCESS_ROUTES: Choice<AccessRouteChoice>[] = [
  { value: "direct_request", label: "They asked for it directly", detail: "The request and current wording control." },
  { value: "existing_relationship", label: "An existing relationship", detail: "There is a legitimate path and useful context." },
  { value: "offered_introduction", label: "A real introduction is being offered", detail: "Build for the introduction that actually exists." },
  { value: "representative_producer", label: "Through a representative or producer", detail: "The route has an owner who can clarify what travels." },
  { value: "open_process", label: "An open call, fund, lab, or market", detail: "Current published requirements come first." },
  { value: "accepted_cold", label: "They explicitly accept cold material", detail: "Accepted does not mean unlimited; make the first item small." },
  { value: "no_unsolicited", label: "They do not accept unsolicited material", detail: "A prettier deck will not open a closed route." },
  { value: "none", label: "No legitimate route yet", detail: "The next job is route-building, not packaging." },
  { value: "unknown", label: "I have not checked", detail: "We can plan privately, but sending stays conditional." },
];

export const REQUIREMENT_STATES: Choice<RequirementStatusChoice>[] = [
  { value: "none", label: "No exact request", detail: "Use a fit-for-purpose structure, not folklore." },
  { value: "current", label: "A current written request", detail: "It outranks templates and famous examples." },
  { value: "stale", label: "An old instruction", detail: "Re-check it before treating it as binding." },
  { value: "ambiguous", label: "The wording is ambiguous", detail: "Plan the safe core and flag the one thing to clarify." },
  { value: "conflicted", label: "Two instructions disagree", detail: "Do not guess which one wins." },
];

export const DECK_BOUNDARIES: Choice<DeckBoundary>[] = [
  { value: "ordinary", label: "Nothing unusual", detail: "The ordinary creative and factual boundaries still apply." },
  { value: "images_unclear", label: "Some image permissions are unclear", detail: "References can help privately without pretending they can travel." },
  { value: "finance_unchecked", label: "Money claims are not qualified yet", detail: "Do not invent budget, returns, finance, or recoupment certainty." },
  { value: "substantial_unpaid", label: "This is substantial custom unpaid work", detail: "Scope, ownership, use, and terms deserve daylight first." },
  { value: "sensitive", label: "The material is sensitive", detail: "Circulation and leave-behind choices need restraint." },
];

export const DEADLINES: Choice<DeadlineBand>[] = [
  { value: "within_72_hours", label: "Within 72 hours", detail: "Protect the decision path. Cut optional work first." },
  { value: "within_week", label: "Within a week", detail: "Enough time for a tight, deliberate version." },
  { value: "two_to_four_weeks", label: "Two to four weeks", detail: "Enough time to build and test the core." },
  { value: "later", label: "Later", detail: "Sequence the work; do not manufacture urgency." },
  { value: "none", label: "No deadline yet", detail: "Use readiness, not anxiety, to decide what comes next." },
];

export const BROAD_LANES: Choice<BroadLane>[] = [
  { value: "film", label: "Film or TV", detail: "A project, treatment, lookbook, pitch deck, or series bible." },
  { value: "advertising", label: "Advertising or agency", detail: "A treatment, campaign, credentials deck, or client pitch." },
  { value: "startup", label: "Startup or business", detail: "A sales, fundraising, partnership, product, or strategy deck." },
  { value: "education", label: "Education or public work", detail: "A lecture, training, civic, report, or conference deck." },
  { value: "other", label: "Something else", detail: "The same next-decision logic still helps." },
];

export const SITUATIONS: Choice<Situation>[] = [
  { value: "exploring", label: "I’m figuring out what to make", detail: "No fixed recipient or request yet." },
  { value: "outreach", label: "I’m about to reach out", detail: "The first contact needs the smallest useful proof." },
  { value: "requested", label: "Someone asked for material", detail: "The request should control the package." },
  { value: "meeting", label: "I have a meeting", detail: "Rehearsal may be worth more than another slide." },
  { value: "waiting", label: "I sent it and I’m waiting", detail: "More packaging will not make waiting less like waiting." },
  { value: "followup", label: "A follow-up is due", detail: "This may be a message task, not a deck task." },
  { value: "passed", label: "They passed", detail: "One closed route is not a diagnosis of the whole project." },
  { value: "stuck", label: "I’m stuck polishing", detail: "We’ll find the smallest useful test." },
];

export const DESIRED_MOVES: Choice<DesiredMove>[] = [
  { value: "read", label: "Read or review it", detail: "Earn attention and a considered response." },
  { value: "meet", label: "Take a meeting", detail: "Move from material to conversation." },
  { value: "approve", label: "Approve or choose a direction", detail: "Help a team or client make a bounded decision." },
  { value: "fund", label: "Fund or support it", detail: "Make the decision and evidence needs explicit." },
  { value: "align", label: "Get everyone aligned", detail: "Create shared understanding without sales theatre." },
  { value: "unsure", label: "I’m not sure yet", detail: "Then the next job is choosing the decision—not making more slides." },
];

export const BROAD_DELIVERIES: Choice<BroadDelivery>[] = [
  { value: "live", label: "I’ll present it", detail: "The deck supports a voice and a room." },
  { value: "read", label: "They’ll read it alone", detail: "The pages must carry context themselves." },
  { value: "both", label: "Both", detail: "The two versions may need different amounts of copy." },
];

export const SLIDE_MODES: Choice<SlideMode>[] = [
  { value: "live", label: "Presenting live", detail: "People listen and glance." },
  { value: "read", label: "Sent to read", detail: "The page carries its own context." },
  { value: "both", label: "Both", detail: "Live and read-alone needs may conflict." },
];

export const SLIDE_JOBS: Choice<SlideJob>[] = [
  { value: "statement", label: "Make one point", detail: "A premise, claim, theme, or north-star thought." },
  { value: "overview", label: "Orient the reader", detail: "What this is and how to understand it." },
  { value: "story", label: "Tell part of a story", detail: "A synopsis, arc, case, or narrative beat." },
  { value: "evidence", label: "Show evidence", detail: "Proof, data, examples, or a comparison." },
  { value: "compare", label: "Help people compare", detail: "Options, before and after, trade-offs, or a useful relationship." },
  { value: "process", label: "Explain a process", detail: "A sequence, system, plan, or way of working." },
  { value: "gallery", label: "Create a visual beat", detail: "A pause, gallery, reveal, or image-led moment." },
  { value: "ask", label: "Make the ask", detail: "The decision or action this page should create." },
];

export const SLIDE_VIEWPORTS: Choice<SlideViewport>[] = [
  { value: "room", label: "Across a room", detail: "People glance while somebody speaks." },
  { value: "laptop", label: "On a laptop", detail: "A realistic read-alone pitch setting." },
  { value: "phone", label: "On a phone", detail: "The smallest common accidental viewing condition." },
  { value: "print", label: "Printed or reference use", detail: "People control pace and may inspect more detail." },
];

export const SLIDE_TIMES: Choice<SlideTime>[] = [
  { value: "controlled", label: "They control the time", detail: "A read-alone or reference page." },
  { value: "five", label: "About 5 seconds", detail: "One sharp beat. Very little reading." },
  { value: "ten", label: "About 10 seconds", detail: "A headline plus a small amount of support." },
  { value: "twenty", label: "About 20 seconds", detail: "Enough for a deliberate read if speech is not competing." },
  { value: "thirty", label: "30 seconds or more", detail: "People can inspect, but hierarchy still matters." },
];
