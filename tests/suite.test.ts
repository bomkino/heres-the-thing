import test from "node:test";
import assert from "node:assert/strict";
import { createSession, deserializeSession, saveLocal, serializeSession } from "../src/shared/session.ts";
import { exportSessionMarkdown } from "../src/export.ts";
import { returnToDeckBones, runDeckBones, runOneSlide, runYouAreHere } from "../src/suite.ts";

const NOW = "2026-07-19T12:00:00.000Z";

test("full clinic carries facts forward without asking twice", () => {
  let session = createSession({ now: NOW, idSeed: "full-clinic" });
  const here = runYouAreHere(session, {
    entryContext: "deck",
    lane: "scripted_feature",
    role: "writer",
    trigger: "material_requested",
    desiredDecision: "consider producing the feature",
    recipient: { kind: "producer", named: true },
    accessRoute: "direct_request",
    delivery: "read_alone",
    requirementStatus: "current",
    requirements: [{ id: "r1", name: "Pitch deck", status: "mandatory" }],
    authority: "owns_controls",
    featureStage: "tested",
    endingClear: true,
    deckIntent: "requested",
    protectThis: { selectedLine: "The violence remains off-screen." },
  }, NOW);
  session = here.session;
  assert.equal(session.shared.recipient.status, "known");

  const bones = runDeckBones(session, undefined, NOW);
  session = bones.session;
  assert.equal(bones.result.primary.routeId, "O-F07");
  assert.equal(session.activeTool, "deck_bones");

  const section = bones.result.sections[0];
  assert.ok(section);
  const slide = runOneSlide(session, section, { title: "The film", body: "A concise page with a real job." }, undefined, NOW);
  session = slide.session;
  assert.equal(slide.result.state, "assessed");
  assert.equal(session.activeTool, "one_slide_or_three");
  assert.ok(session.history.some((item) => item.type === "handed_off"));
});

test("default JSON export excludes Protect This", () => {
  const session = { ...createSession({ now: NOW, idSeed: "privacy" }), protectThis: { selectedLine: "Private line." } };
  assert.doesNotMatch(serializeSession(session), /Private line/);
  assert.match(serializeSession(session, true), /Private line/);
});

test("default JSON export removes Protect This from nested tool envelopes", () => {
  const run = runYouAreHere(createSession({ now: NOW, idSeed: "deep-privacy" }), {
    lane: "scripted_feature",
    featureStage: "tested",
    desiredDecision: "read the screenplay",
    recipient: { kind: "producer", named: true },
    accessRoute: "direct_request",
    protectThis: { selectedLine: "The private ending stays private." },
  }, NOW);
  const safe = serializeSession(run.session);
  assert.doesNotMatch(safe, /private ending|protectThis/iu);
  assert.match(serializeSession(run.session, true), /private ending/iu);
});

test("local save keeps Protect This out unless freshly included", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
  const session = { ...createSession({ now: NOW, idSeed: "local-private" }), protectThis: { selectedLine: "Private line." } };
  saveLocal(storage, session);
  assert.doesNotMatch(values.values().next().value ?? "", /Private line/);
  saveLocal(storage, session, "with-private", { includeProtectThis: true });
  assert.match(values.get("with-private") ?? "", /Private line/);
});

test("session round-trip preserves schema and tool envelopes", () => {
  const session = createSession({ now: NOW, idSeed: "roundtrip" });
  assert.deepEqual(deserializeSession(serializeSession(session)), session);
});

test("corrupt imported dictionary state is rejected", () => {
  const raw = JSON.parse(serializeSession(createSession({ now: NOW, idSeed: "corrupt" }))) as Record<string, unknown>;
  raw.dictionary = { pinnedTermIds: "not-an-array", recentTermIds: [] };
  assert.throws(() => deserializeSession(JSON.stringify(raw)), /dictionary state is invalid/iu);
});

test("Markdown export includes result chain but omits private line by default", () => {
  const initial = createSession({ now: NOW, idSeed: "markdown" });
  const run = runYouAreHere(initial, {
    lane: "scripted_feature",
    desiredDecision: "read the screenplay",
    recipient: { kind: "producer", named: false },
    accessRoute: "existing_relationship",
    featureStage: "tested",
    protectThis: { selectedLine: "Private soul line." },
  }, NOW);
  const markdown = exportSessionMarkdown(run.session);
  assert.match(markdown, /You Are Here!/);
  assert.doesNotMatch(markdown, /Private soul line/);
});

test("direct Deck Bones entry is recorded as direct, not a fictional handoff", () => {
  const run = runDeckBones(createSession({ now: NOW, idSeed: "direct-deck" }), {
    projectKind: "scripted-feature",
    featureStage: "tested",
    desiredDecision: "consider producing",
    recipientKind: "producer",
    accessRoute: "direct_request",
    delivery: "read_alone",
  }, NOW);
  assert.ok(run.session.history.some((item) => item.summary === "Started directly in Deck Bones. No upstream facts were invented."));
  assert.equal(run.session.history.some((item) => item.type === "handed_off"), false);
});

test("a closed You Are Here! deck gate cannot be bypassed by implicit handoff", () => {
  const here = runYouAreHere(createSession({ now: NOW, idSeed: "closed-deck" }), {
    lane: "scripted_feature",
    featureStage: "partial",
    deckIntent: "considering",
  }, NOW);
  assert.throws(() => runDeckBones(here.session, undefined, NOW), /has not opened Deck Bones/iu);
});

test("One Slide bridge does not invent an English locale", () => {
  const deck = runDeckBones(createSession({ now: NOW, idSeed: "no-language" }), {
    projectKind: "scripted-feature",
    featureStage: "tested",
    desiredDecision: "consider producing",
    recipientKind: "producer",
    accessRoute: "direct_request",
    delivery: "read_alone",
  }, NOW);
  const section = deck.result.sections[0];
  assert.ok(section);
  const slide = runOneSlide(deck.session, section, { title: "頁", body: "物語" }, undefined, NOW);
  const storedInput = slide.session.tools.one_slide_or_three.input as { languageTag?: string };
  assert.equal(storedInput.languageTag, undefined);
  assert.ok(slide.result.assumptions.some((line) => /language is not confirmed/iu.test(line)));
});

test("unfinished page assessment exports without crashing", () => {
  const deck = runDeckBones(createSession({ now: NOW, idSeed: "unfinished-page" }), {
    projectKind: "scripted-feature",
    featureStage: "tested",
    desiredDecision: "consider producing",
    recipientKind: "producer",
    accessRoute: "direct_request",
  }, NOW);
  const section = deck.result.sections[0];
  assert.ok(section);
  const slide = runOneSlide(deck.session, section, { title: "A page" }, undefined, NOW);
  const markdown = exportSessionMarkdown(slide.session);
  assert.match(markdown, /One more fact is needed/iu);
});

test("page evidence can return upstream without losing either result", () => {
  const deck = runDeckBones(createSession({ now: NOW, idSeed: "return-path" }), {
    projectKind: "scripted-feature",
    featureStage: "tested",
    desiredDecision: "consider producing",
    recipientKind: "producer",
    accessRoute: "direct_request",
  }, NOW);
  const section = deck.result.sections[0];
  assert.ok(section);
  const slide = runOneSlide(deck.session, section, { title: "The film", body: "A page with a job." }, undefined, NOW);
  const returned = returnToDeckBones(slide.session, undefined, NOW);
  assert.equal(returned.activeTool, "deck_bones");
  assert.ok(returned.tools.deck_bones.result);
  assert.ok(returned.tools.one_slide_or_three.result);
});

test("changed shared facts become visible conflicts instead of silent overwrites", () => {
  const first = runYouAreHere(createSession({ now: NOW, idSeed: "fact-conflict" }), {
    lane: "scripted_feature",
    featureStage: "tested",
    desiredDecision: "read the screenplay",
    recipient: { kind: "producer", named: true },
    accessRoute: "direct_request",
  }, NOW);
  const second = runYouAreHere(first.session, {
    lane: "scripted_feature",
    featureStage: "tested",
    desiredDecision: "finance the film",
    recipient: { kind: "producer", named: true },
    accessRoute: "direct_request",
  }, NOW);
  assert.equal(second.session.shared.desiredDecision.status, "conflicted");
});

test("current written requirements retain source and checked date", () => {
  const run = runYouAreHere(createSession({ now: NOW, idSeed: "requirement-provenance" }), {
    lane: "scripted_feature",
    featureStage: "tested",
    desiredDecision: "assess the application",
    recipient: { kind: "film lab", named: true },
    accessRoute: "open_process",
    requirementStatus: "current",
    requirements: [{ id: "r1", name: "Feature synopsis", status: "mandatory", checkedOn: "2026-07-19" }],
  }, NOW);
  assert.deepEqual(run.session.shared.requirements, {
    status: "known",
    value: [{ id: "r1", name: "Feature synopsis", status: "mandatory", checkedOn: "2026-07-19" }],
    source: "current_written_requirement",
    checkedOn: "2026-07-19",
  });
});
