import type { OutcomeDefinition, RouteId, SectionDefinition, SectionId } from "./types.ts";

function outcome(id: RouteId, name: string, headline: string, kind: OutcomeDefinition["kind"]): OutcomeDefinition {
  return { id, name, headline, kind };
}

export const OUTCOMES: Record<RouteId, OutcomeDefinition> = {
  "O-U01": outcome("O-U01", "Choose room before document", "Choose the room before the document.", "working"),
  "O-U02": outcome("O-U02", "Verify the ask", "Check what they asked for before building from memory.", "working"),
  "O-U03": outcome("O-U03", "Two recipients, two jobs", "Shared facts. Separate decisions. Two honest versions.", "document"),
  "O-U04": outcome("O-U04", "Material exists; rehearse", "You have enough. Stop adding and rehearse the decision.", "rehearsal"),
  "O-U05": outcome("O-U05", "Access before attachment", "Build the route before the attachment bundle.", "stop"),
  "O-U06": outcome("O-U06", "This tool stops here", "This edition should not pretend expertise it has not earned.", "stop"),
  "O-U07": outcome("O-U07", "Clarify the work before doing more", "Define the process before donating serious labour to it.", "stop"),
  "O-U08": outcome("O-U08", "Keep it private while authority is checked", "Keep the work moving privately; pause the public claim.", "stop"),
  "O-U09": outcome("O-U09", "Protect it before it travels", "Make a safe travelling version before wider circulation.", "working"),
  "O-U10": outcome("O-U10", "Make a working document, not a performance", "Build the document your own team can tell the truth inside.", "working"),
  "O-U11": outcome("O-U11", "Keep the risky claim out; keep the work moving", "Remove the disputed claim, not the whole creative route.", "specialist"),
  "O-F01": outcome("O-F01", "Story before wrapper", "The story needs the next piece of story, not a wrapper.", "stop"),
  "O-F02": outcome("O-F02", "First draft needs right read", "Give the first draft one useful read before expensive packaging.", "stop"),
  "O-F03": outcome("O-F03", "Producer conversation, no material requested", "Prepare the smallest feature overview that can open the right conversation.", "document"),
  "O-F04": outcome("O-F04", "Concise producer-facing feature deck", "Build a concise feature deck around this reader's decision.", "document"),
  "O-F05": outcome("O-F05", "Invite a director, leave room", "Invite directorial authorship; do not pre-direct the collaborator.", "document"),
  "O-F06": outcome("O-F06", "Director-led vision", "Make the screen experience specific because that is your actual role.", "document"),
  "O-F07": outcome("O-F07", "Exact feature application", "Give the programme exactly the feature pack it asks for.", "document"),
  "O-F08": outcome("O-F08", "Finance route needs producer reality", "Build the production basis before the investment argument.", "specialist"),
  "O-F09": outcome("O-F09", "Mature specialist-led feature finance deck", "Organise verified creative and production facts for qualified finance work.", "specialist"),
  "O-F10": outcome("O-F10", "Talent or creative attachment conversation", "Show the role and project honestly; never manufacture attachment.", "document"),
  "O-TV01": outcome("O-TV01", "Premise before pilot", "The pilot is the next proof.", "stop"),
  "O-TV02": outcome("O-TV02", "Pilot works; series remains unclear", "Prove what generates episodes—or what carries the finite arc.", "working"),
  "O-TV03": outcome("O-TV03", "Pilot/sample route, not project sale", "Send the writing sample they are judging, not the sales bible they did not ask for.", "document"),
  "O-TV04": outcome("O-TV04", "Concise producer/representation series overview", "Give them enough series to choose the next conversation.", "document"),
  "O-TV05": outcome("O-TV05", "TV pitch deck / development bible", "Build a form-fit series argument, not an encyclopedia.", "document"),
  "O-TV06": outcome("O-TV06", "Exact TV programme pack", "Follow the current TV brief in its own order and limits.", "document"),
  "O-TV07": outcome("O-TV07", "Commissioner route unavailable", "A broadcaster logo is not an access route.", "stop"),
  "O-TV08": outcome("O-TV08", "Current commissioner proposal", "Answer the current remit through the route that accepts you.", "document"),
};

function section(
  id: SectionId,
  name: string,
  job: string,
  readerQuestion: string,
  leaveOut: string,
  slideRole: SectionDefinition["slideRole"],
  oneSlideJobId?: string,
): SectionDefinition {
  return { id, name, job, readerQuestion, leaveOut, slideRole, oneSlideJobId };
}

export const SECTIONS: Record<SectionId, SectionDefinition> = {
  S00: section("S00", "Identity and format", "Orient the reader truthfully.", "What is this and whose current version is it?", "Tagline theatre and unverified names.", "cover", "film.cover"),
  S01: section("S01", "Logline or series premise", "Make the dramatic proposition graspable.", "Who or what drives this, under what pressure, toward what?", "Themes, empty adjectives, and a tagline posing as a logline.", "statement", "film.logline"),
  S02: section("S02", "Decision and purpose frame", "Tie a working document to one decision.", "Who is this for and what should happen next?", "Vague desire to make it happen.", "question"),
  S03: section("S03", "Feature story synopsis", "Prove a complete story movement.", "What happens through whose choices, including the ending when needed?", "A teaser that hides the decisive movement.", "story", "film.synopsis_short"),
  S04: section("S04", "Series synopsis", "Make the series proposition legible beyond the pilot.", "What changes across the series?", "Pilot recap pretending to be a series.", "story", "film.story_arc"),
  S05: section("S05", "Format and engine / limited-form promise", "Prove the right kind of continuation.", "What keeps generating story, or why does this finite arc need this length?", "Fake endless seasons and episode wallpaper.", "process", "film.series_engine"),
  S06: section("S06", "Main characters and relationships", "Show desire, contradiction, pressure, and relational movement.", "Whose choices create the story?", "Biography, casting shorthand, and equal-weight directories.", "profile", "film.character_ensemble"),
  S07: section("S07", "World / arena", "Show how place and systems generate story.", "Why can this story happen only here?", "Location adjectives detached from pressure.", "overview", "film.world"),
  S08: section("S08", "Genre, tone, and audience experience", "Name the intended viewing experience through choices.", "What should this feel like to watch?", "Adjective fog.", "argument", "film.tone"),
  S09: section("S09", "Theme / North Star / point of view", "Keep meaning tied to dramatic evidence.", "What question or tension does the work keep returning to?", "A moral lesson pasted above the story.", "statement", "film.why_now"),
  S10: section("S10", "Visual language", "Explain how form serves story and point of view.", "What cinematic conditions materially shape the experience?", "Image piles, shot lists, and borrowed taste.", "gallery", "film.director_note"),
  S11: section("S11", "Creator relationship / writer's statement", "Connect authorship and necessity without demanding confession.", "Why are you the person making this?", "Trauma as proof and generic passion language.", "statement", "film.creator_note"),
  S12: section("S12", "Director's interpretation", "Make directorial authorship specific and collaborative.", "What interpretation and method turn the screenplay into this screen experience?", "Instructions copied from somebody else's lookbook.", "argument", "film.director_note"),
  S13: section("S13", "Audience and positioning", "State who may care and why without inventing demand.", "Who is this for and what evidence supports that belief?", "Market-size theatre and demographic certainty.", "argument", "film.audience"),
  S14: section("S14", "Comparable works canvas", "Use comparisons for one declared job.", "What does each comparison clarify, and where does it mislead?", "Famous titles as proof of demand.", "comparison", "film.comps"),
  S15: section("S15", "First-season or limited-series arc", "Show progression through the whole intended form.", "How does the season move and land?", "An event list with no causality.", "timeline", "film.story_arc"),
  S16: section("S16", "Episode examples or breakdowns", "Prove range, repeatability, or finite progression.", "How do different episodes test different story muscles?", "Full synopses and repeated beats.", "case_study", "film.episode_examples"),
  S17: section("S17", "Future runway", "Show honest future story only where the form needs it.", "What remains generative after this movement?", "Invented seasons for a deliberately finite work.", "overview", "film.series_engine"),
  S18: section("S18", "Team and relevant proof", "Name the real people and relevant experience.", "Who can do what today?", "Prestige scent and aspiration presented as commitment.", "profile", "film.team"),
  S19: section("S19", "Project status and attachments", "Make current status inspectable.", "What is actually agreed, requested, interested, planned, or unknown?", "Wishlist names and design-created certainty.", "evidence", "film.production_status"),
  S20: section("S20", "Rights and permissions status", "State only supportable authority facts.", "What can responsibly travel with this version?", "Legal verdicts and confident vagueness.", "evidence", "film.production_status"),
  S21: section("S21", "Production approach and feasibility", "Connect creative choices to truthful practical reality.", "How might this be made, and what remains unverified?", "Numbers invented to calm the room.", "process", "film.production_status"),
  S22: section("S22", "Budget and financing context", "Support qualified diligence with sourced facts.", "What is the producer-led basis and exact finance decision?", "Returns, tax, recoupment, and investor promises from a creative tool.", "data", "film.finance"),
  S23: section("S23", "Distribution, market, and audience pathway", "Name route hypotheses without manufacturing appetite.", "How might this reach people, and what is evidence versus plan?", "Buyer logos and unsourced sales certainty.", "process", "film.audience"),
  S24: section("S24", "The ask and next decision", "Make the next decision unmistakable.", "What exactly should this reader do next?", "A generic dream of support.", "ask", "film.ask"),
  S25: section("S25", "Contact and version information", "Keep the artefact usable and current.", "Who owns this version and how should they be contacted?", "Private or stale information.", "reference"),
  S26: section("S26", "Appendix map", "Separate diligence from the main reading path.", "What may help only if asked?", "The main argument repeated in smaller type.", "reference"),
};

export interface RouteSections {
  main: SectionId[];
  optional?: SectionId[];
  appendix?: SectionId[];
  excluded?: SectionId[];
}

export const ROUTE_SECTIONS: Partial<Record<RouteId, RouteSections>> = {
  "O-U01": { main: ["S02", "S24"], optional: ["S01", "S19"] },
  "O-U03": { main: ["S00", "S01", "S24"], optional: ["S03", "S04", "S05", "S19"] },
  "O-U09": { main: ["S00", "S19", "S20", "S24", "S25"] },
  "O-U10": { main: ["S02", "S01", "S03", "S04", "S05", "S24"], optional: ["S09", "S19"] },
  "O-F03": { main: ["S00", "S01", "S03", "S11", "S19", "S24", "S25"], optional: ["S06", "S08"] },
  "O-F04": { main: ["S00", "S01", "S03", "S06", "S07", "S08", "S11", "S19", "S24", "S25"], optional: ["S09", "S10", "S13", "S14", "S18", "S20"], appendix: ["S21", "S26"] },
  "O-F05": { main: ["S00", "S01", "S03", "S06", "S07", "S08", "S09", "S11", "S24", "S25"], optional: ["S10", "S19"], appendix: ["S26"] },
  "O-F06": { main: ["S00", "S01", "S03", "S07", "S08", "S09", "S10", "S12", "S19", "S24", "S25"], optional: ["S06", "S13", "S14", "S18", "S21"], appendix: ["S26"] },
  "O-F07": { main: ["S00", "S01", "S03", "S11", "S19", "S24", "S25"] },
  "O-F09": { main: ["S00", "S01", "S03", "S08", "S13", "S18", "S19", "S20", "S21", "S22", "S23", "S24", "S25"], appendix: ["S26"] },
  "O-F10": { main: ["S00", "S01", "S03", "S06", "S08", "S18", "S19", "S24", "S25"], optional: ["S07", "S10", "S11"] },
  "O-TV03": { main: ["S00", "S01", "S11", "S18", "S24", "S25"] },
  "O-TV04": { main: ["S00", "S01", "S04", "S05", "S06", "S08", "S11", "S19", "S24", "S25"], optional: ["S07", "S15", "S16"] },
  "O-TV05": { main: ["S00", "S01", "S04", "S05", "S06", "S07", "S08", "S11", "S15", "S16", "S18", "S19", "S24", "S25"], optional: ["S09", "S10", "S13", "S14", "S17", "S20"], appendix: ["S21", "S26"] },
  "O-TV06": { main: ["S00", "S01", "S04", "S05", "S11", "S19", "S24", "S25"] },
  "O-TV08": { main: ["S00", "S01", "S04", "S05", "S13", "S15", "S16", "S18", "S19", "S21", "S24", "S25"], optional: ["S07", "S08", "S11", "S20"], appendix: ["S26"] },
};
