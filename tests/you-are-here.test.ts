import test from "node:test";
import assert from "node:assert/strict";
import { assessYouAreHere } from "../src/you-are-here/index.ts";

test("safety route outranks a requested deck", () => {
  const result = assessYouAreHere({
    lane: "scripted_feature",
    safety: "pressure_or_threat",
    deckIntent: "requested",
  });
  assert.equal(result.routeId, "safety_support");
  assert.equal(result.primaryAction.id, "A-S22");
  assert.equal(result.deckHandoff.eligible, false);
});

test("current deck requirement becomes exact work and carries to Deck Bones", () => {
  const result = assessYouAreHere({
    lane: "scripted_feature",
    desiredDecision: "consider producing the feature",
    recipient: { kind: "producer", named: true },
    accessRoute: "direct_request",
    requirementStatus: "current",
    requirements: [{ id: "req-1", name: "10-page pitch deck", status: "mandatory", checkedOn: "2026-07-19" }],
    featureStage: "revised",
  });
  assert.equal(result.primaryAction.id, "A-S08");
  assert.equal(result.deckHandoff.eligible, true);
});

test("incomplete feature cannot be outvoted by deck intent", () => {
  const result = assessYouAreHere({
    lane: "scripted_feature",
    desiredDecision: "consider producing the feature",
    recipient: { kind: "producer", named: true },
    accessRoute: "existing_relationship",
    featureStage: "partial",
    deckIntent: "considering",
  });
  assert.equal(result.primaryAction.id, "A-F01");
  assert.equal(result.deckHandoff.eligible, false);
});

test("live meeting converts expansion into rehearsal", () => {
  const result = assessYouAreHere({
    lane: "scripted_episodic",
    desiredDecision: "keep developing the series",
    recipient: { kind: "producer", named: true },
    accessRoute: "direct_request",
    trigger: "meeting",
    episodicStage: "tested_pilot",
    seriesShape: "limited",
    deckIntent: "exists",
  });
  assert.equal(result.primaryAction.id, "A-S10");
  assert.equal(result.deckHandoff.eligible, true);
});

test("same input stays deterministic", () => {
  const input = {
    lane: "scripted_feature" as const,
    desiredDecision: "read the screenplay",
    recipient: { kind: "producer", named: false },
    accessRoute: "offered_introduction" as const,
    trigger: "offered_introduction" as const,
    featureStage: "tested" as const,
  };
  assert.deepEqual(assessYouAreHere(input), assessYouAreHere(input));
});
