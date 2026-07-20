import test from "node:test";
import assert from "node:assert/strict";
import { assessDeckBones, OUTCOMES, SECTIONS } from "../src/deck-bones/index.ts";

test("complete Deck Bones catalog survives the merge", () => {
  assert.equal(Object.keys(OUTCOMES).length, 29);
  assert.equal(Object.keys(SECTIONS).length, 27);
});

test("current exact requirement overrides generic route and section defaults", () => {
  const result = assessDeckBones({
    projectKind: "scripted-feature",
    role: "writer",
    desiredDecision: "assess the application",
    recipientKind: "film lab",
    accessRoute: "open_process",
    featureStage: "revised",
    exactRequirementStatus: "current",
    exactRequirements: [
      { id: "r1", name: "Logline", status: "mandatory" },
      { id: "r2", name: "Feature synopsis", status: "mandatory" },
      { id: "r3", name: "Visual lookbook", status: "prohibited" },
    ],
  });
  assert.equal(result.primary.routeId, "O-F07");
  assert.deepEqual(result.sections.map((section) => section.sectionId), ["S01", "S03", "S10"]);
  assert.deepEqual(result.sections.map((section) => section.state), ["missing", "missing", "excluded"]);
  assert.equal(result.sections[2]?.materialState, "not-this-version");
  assert.ok(result.explanation.leaveOut.some((line) => /current requirement prohibits it/iu.test(line)));
});

test("series synopsis maps to series movement, not feature synopsis", () => {
  const result = assessDeckBones({
    projectKind: "scripted-episodic",
    episodicStage: "tested_pilot",
    seriesShape: "returning",
    exactRequirementStatus: "current",
    exactRequirements: [{ id: "series", name: "Series synopsis", status: "mandatory" }],
  });
  assert.deepEqual(result.sections.map((section) => section.sectionId), ["S04"]);
});

test("a prohibition-only requirement does not quietly restore the prohibited section", () => {
  const result = assessDeckBones({
    projectKind: "scripted-feature",
    featureStage: "revised",
    exactRequirementStatus: "current",
    exactRequirements: [{ id: "no-lookbook", name: "Visual lookbook", status: "prohibited" }],
  });
  assert.deepEqual(result.sections.map((section) => section.sectionId), ["S10"]);
  assert.equal(result.sections[0]?.state, "excluded");
});

test("different decisions split routes instead of averaging", () => {
  const result = assessDeckBones({
    projectKind: "scripted-feature",
    role: "producer",
    desiredDecision: "consider joining",
    recipientKind: "producer and financier",
    recipientCount: "several_different_decisions",
    accessRoute: "existing_relationship",
    featureStage: "packaged",
  });
  assert.equal(result.primary.routeId, "O-U03");
});

test("writer inviting a director receives collaboration route", () => {
  const result = assessDeckBones({
    projectKind: "scripted-feature",
    role: "writer",
    desiredDecision: "consider directing",
    recipientKind: "director",
    accessRoute: "existing_relationship",
    featureStage: "tested",
    endingClear: true,
    deckRequested: true,
  });
  assert.equal(result.primary.routeId, "O-F05");
  assert.ok(result.sections.some((section) => section.sectionId === "S09"));
  assert.ok(!result.sections.some((section) => section.sectionId === "S22"));
});

test("first feature draft gets a read, not packaging", () => {
  const result = assessDeckBones({
    projectKind: "scripted-feature",
    desiredDecision: "consider producing",
    recipientKind: "producer",
    accessRoute: "existing_relationship",
    featureStage: "first_draft",
    outsideRead: "none",
  });
  assert.equal(result.primary.routeId, "O-F02");
  assert.equal(result.sections.length, 0);
});

test("finance route cannot bypass missing producer reality", () => {
  const result = assessDeckBones({
    projectKind: "scripted-feature",
    desiredDecision: "finance the project",
    recipientKind: "financier",
    accessRoute: "existing_relationship",
    featureStage: "packaged",
    financeDecision: true,
    financeBasis: "partial",
  });
  assert.equal(result.primary.routeId, "O-F08");
  assert.equal(result.gates[0]?.state, "blocked");
});

test("existing material is reused before missing work is assigned", () => {
  const result = assessDeckBones({
    projectKind: "scripted-episodic",
    role: "creator-showrunner",
    desiredDecision: "consider developing the series",
    recipientKind: "producer",
    accessRoute: "direct_request",
    episodicStage: "tested_pilot",
    seriesShape: "returning",
    deckRequested: true,
    existingMaterials: [{ sectionId: "S01", kind: "series premise", state: "reviewed" }],
  });
  const premise = result.sections.find((section) => section.sectionId === "S01");
  assert.equal(result.primary.routeId, "O-TV05");
  assert.equal(premise?.materialState, "reuse");
  assert.ok(result.explanation.reuse.some((line) => /premise/iu.test(line)));
});
