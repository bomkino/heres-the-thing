import test from "node:test";
import assert from "node:assert/strict";
import { contextualiseTerm, DICTIONARY_TERMS, searchTerms, validateDictionary } from "../src/dictionary/index.ts";
import { createSession, togglePinnedTerm, visitDictionaryTerm } from "../src/shared/session.ts";

test("shared dictionary has complete internal references", () => {
  assert.ok(DICTIONARY_TERMS.length >= 40);
  assert.deepEqual(validateDictionary(), []);
});

test("same term explains itself through each tool lens", () => {
  const here = contextualiseTerm("series-engine", "you_are_here");
  const bones = contextualiseTerm("series-engine", "deck_bones");
  const slide = contextualiseTerm("series-engine", "one_slide_or_three");
  assert.match(here?.here ?? "", /next piece|deck/iu);
  assert.match(bones?.here ?? "", /section/iu);
  assert.match(slide?.here ?? "", /page profile/iu);
});

test("dictionary search resolves aliases and confusion", () => {
  assert.equal(searchTerms("TV bible")[0]?.id, "pitch-bible");
  assert.ok(searchTerms("one deck for live and read").some((term) => term.id === "dual-use"));
});

test("recent and pinned words travel with local case but not route logic", () => {
  let session = createSession({ now: "2026-07-19T12:00:00.000Z", idSeed: "dictionary" });
  session = visitDictionaryTerm(session, "series-engine", "2026-07-19T12:00:01.000Z");
  session = togglePinnedTerm(session, "series-engine", "2026-07-19T12:00:02.000Z");
  assert.deepEqual(session.dictionary.recentTermIds, ["series-engine"]);
  assert.deepEqual(session.dictionary.pinnedTermIds, ["series-engine"]);
  assert.equal(session.shared.desiredDecision.status, "unknown");
});
