import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildDeckPlan, buildNextAdvice, sectionJob, sectionName } from "../src/adapters.ts";
import { DICTIONARY_TERMS, SECTIONS } from "../../src/index.ts";
import {
  ACCESS_ROUTES,
  BROAD_LANES,
  DEADLINES,
  DECK_BOUNDARIES,
  DECK_DELIVERIES,
  DECK_FORMATS,
  DECK_GOALS,
  DECK_MATERIALS,
  DECK_RECIPIENTS,
  DECK_ROLES,
  FEATURE_STAGES,
  RECIPIENT_SHAPES,
  REQUIREMENT_STATES,
  SERIES_STAGES,
  SITUATIONS,
  SLIDE_JOBS,
  SPECIFIC_ASKS,
} from "../src/content.ts";

test("Deck Bones accepts only structured choices", () => {
  const values = [DECK_FORMATS, DECK_GOALS, DECK_RECIPIENTS, SPECIFIC_ASKS].flat();
  assert.ok(values.length >= 20);
  for (const choice of values) {
    assert.ok(choice.value);
    assert.ok(choice.label);
    assert.ok(choice.detail);
  }
});

test("the consent-led Deck Bones ride restores useful depth without prose entry", () => {
  const deepChoices = [DECK_ROLES, RECIPIENT_SHAPES, ACCESS_ROUTES, REQUIREMENT_STATES, DECK_BOUNDARIES, DEADLINES].flat();
  assert.ok(deepChoices.length >= 30);
  for (const choice of deepChoices) {
    assert.ok(choice.value);
    assert.ok(choice.label);
    assert.ok(choice.detail);
  }
});

test("a requested Film and TV pitch deck produces a human plan", () => {
  const plan = buildDeckPlan({
    format: "feature",
    goal: "specific",
    specificAsk: "pitch-deck",
    recipient: "producer",
    delivery: "read",
    stage: "revised",
    materials: "core",
  });

  assert.equal(plan.headline, "Give them exactly what they asked for.");
  assert.match(plan.intro, /reading without you/i);
  assert.match(plan.intro, /Each one has one job/);
  assert.ok(plan.sections.length > 0);
  assert.equal(plan.optionalSections.length, 0);
  assert.doesNotMatch(`${plan.headline} ${plan.intro}`, /programme|route|context_limited/i);
});

test("a meeting deck stays small and keeps optional pages out of the core rail", () => {
  const plan = buildDeckPlan({ format: "feature", goal: "meeting", recipient: "producer", delivery: "live", stage: "revised", materials: "core" });
  assert.ok(plan.sections.length <= 7);
  assert.ok(plan.optionalSections.length > 0);
  assert.equal(plan.headline, "Earn the conversation.");
});

test("an existing live deck becomes rehearsal advice, never a zero-page deck", () => {
  const plan = buildDeckPlan({ format: "feature", goal: "meeting", recipient: "producer", delivery: "live", stage: "revised", materials: "deck" });
  assert.equal(plan.sections.length, 0);
  assert.match(plan.headline, /rehearse/i);
  assert.match(plan.intro, /deck already exists/i);
  assert.doesNotMatch(plan.intro, /0 pages/i);
  assert.match(plan.preDeckAction ?? "", /run the opening/i);
});

test("an unresolved series engine becomes one specific next move, not a zero-page deck", () => {
  const plan = buildDeckPlan({ format: "series", goal: "read", recipient: "producer", delivery: "live", stage: "draft", materials: "fresh" });
  assert.equal(plan.sections.length, 0);
  assert.match(plan.headline, /episodes|finite arc/i);
  assert.doesNotMatch(plan.intro, /0 pages/i);
  assert.match(plan.preDeckAction ?? "", /repeatable pressure|finite progression/i);
});

test("a funding route without real finance evidence refuses to invent a deck", () => {
  const plan = buildDeckPlan({ format: "feature", goal: "funding", recipient: "financier", delivery: "read", stage: "revised", materials: "core" });
  assert.equal(plan.sections.length, 0);
  assert.equal(plan.headline, "Do not invent the money slide.");
  assert.match(plan.preDeckAction ?? "", /qualified producing or finance input/i);
});

test("unclear image rights narrow circulation without freezing the safe deck structure", () => {
  const plan = buildDeckPlan({
    format: "feature",
    role: "writer-director",
    goal: "read",
    recipient: "producer",
    recipientShape: "one",
    access: "direct_request",
    delivery: "read",
    stage: "revised",
    materials: "core",
    requirementStatus: "none",
    boundaries: ["images_unclear"],
    deadline: "within_week",
  });
  assert.equal(plan.raw.outcome.id, "O-U11");
  assert.ok(plan.sections.length > 0);
  assert.match(plan.intro, /placeholder|owned image/i);
  assert.match(plan.reasons.join(" "), /does not get to freeze|structure can continue|permission/i);
});

test("all Deck Bones page jobs have a human-facing translation", () => {
  for (const section of Object.values(SECTIONS)) {
    assert.doesNotMatch(sectionJob(section.id), /artefact|inspectable|graspable|authorised/i);
  }
});

test("every configured Deck Bones journey reaches a complete human result", () => {
  let journeys = 0;
  for (const format of DECK_FORMATS) {
    const stages = format.value === "series" ? SERIES_STAGES : FEATURE_STAGES;
    for (const goal of DECK_GOALS) {
      const asks = goal.value === "specific" ? SPECIFIC_ASKS.map((choice) => choice.value) : [undefined];
      for (const specificAsk of asks) {
        for (const recipient of DECK_RECIPIENTS) {
          for (const delivery of DECK_DELIVERIES) {
            for (const stage of stages) {
              for (const materials of DECK_MATERIALS) {
                const plan = buildDeckPlan({
                  format: format.value,
                  goal: goal.value,
                  specificAsk,
                  recipient: recipient.value,
                  delivery: delivery.value,
                  stage: stage.value,
                  materials: materials.value,
                });
                assert.ok(plan.headline.trim());
                assert.ok(plan.intro.trim());
                assert.doesNotMatch(plan.intro, /\b0 pages\b/i);
                assert.ok(plan.reasons.length);
                assert.ok(plan.leaveOut.length);
                if (plan.sections.length === 0) assert.ok(plan.preDeckAction?.trim());
                for (const section of [...plan.sections, ...plan.optionalSections]) {
                  assert.ok(sectionName(section.sectionId).trim());
                  assert.ok(sectionJob(section.sectionId).trim());
                }
                journeys += 1;
              }
            }
          }
        }
      }
    }
  }
  assert.equal(journeys, 12_480);
});

test("You Are Here gives one bounded next move across industries", () => {
  assert.deepEqual(BROAD_LANES.map((choice) => choice.value), ["film", "advertising", "startup", "education", "other"]);
  const advice = buildNextAdvice({ lane: "advertising", situation: "requested", move: "approve", delivery: "read" });
  assert.equal(advice.headline, "Give them exactly what they asked for.");
  assert.equal(advice.doNow.length, 3);
  assert.equal(advice.nextTool, "slide");
});

test("Slide Check and Pitch Dictionary have enough authored structure to stand alone", () => {
  assert.ok(SLIDE_JOBS.length >= 8);
  assert.equal(DICTIONARY_TERMS.length, 62);
  const visibleSource = readFileSync("src/main.ts", "utf8");
  for (const asset of ["slide-check-v2.webp", "deck-bones-v2.webp", "you-are-here-v2.webp", "pitch-dictionary-v2.webp"]) {
    assert.match(visibleSource, new RegExp(asset.replace(".", "\\.")));
  }
  assert.doesNotMatch(visibleSource, /a[123]-(?:one-slide-or-three|deck-bones|you-are-here)\.png/);
});

test("every You Are Here choice pair returns one bounded action", () => {
  for (const lane of BROAD_LANES) {
    for (const situation of SITUATIONS) {
      const advice = buildNextAdvice({ lane: lane.value, situation: situation.value });
      assert.ok(advice.headline.trim());
      assert.ok(advice.body.trim());
      assert.equal(advice.doNow.length, 3);
      assert.equal(advice.doNot.length, 1);
    }
  }
});

test("the visible journey does not contain the rejected interrogations or engine labels", () => {
  const visibleSource = ["src/main.ts", "src/content.ts", "src/adapters.ts"]
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");
  for (const rejected of [
    "Are you in danger",
    "shared device",
    "Keep this answer",
    "Clear this case",
    "context_limited",
    "Current instruction controls",
  ]) {
    assert.doesNotMatch(visibleSource, new RegExp(rejected, "i"));
  }
});
