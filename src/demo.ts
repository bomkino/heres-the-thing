import { createSession } from "./shared/session.ts";
import { runDeckBones, runOneSlide, runYouAreHere } from "./suite.ts";

let session = createSession({ idSeed: "demo" });
const here = runYouAreHere(session, {
  entryContext: "deck",
  lane: "scripted_episodic",
  role: "creator_showrunner",
  trigger: "material_requested",
  desiredDecision: "consider developing the series",
  recipient: { kind: "producer", named: true },
  accessRoute: "direct_request",
  delivery: "read_alone",
  requirementStatus: "current",
  requirements: [{ id: "demo-deck", name: "Pitch deck", status: "mandatory" }],
  authority: "owns_controls",
  episodicStage: "tested_pilot",
  seriesShape: "returning",
  distinctEpisodeEvidence: true,
  deckIntent: "requested",
});
session = here.session;
const bones = runDeckBones(session);
session = bones.session;
const section = bones.result.sections[0];
if (!section) throw new Error("Demo route produced no section.");
const slide = runOneSlide(session, section, { title: "The series", body: "A neighbourhood keeps reinventing the same old bargain." });

console.log(JSON.stringify({
  nextMove: here.result.nextMove,
  deckRoute: bones.result.primary.routeId,
  firstSection: section.sectionId,
  pageState: slide.result.state,
  pageRecommendation: slide.result.assessment?.recommendation,
}, null, 2));
