import type { SplitCandidate, SplitPlan } from "./types.ts";
import { countWords, previewText, resolveSegmenterLocale } from "./text-analysis.ts";

const BULLET_LINE = /^\s*(?:[-*•‣◦▪]|\d+[.)])\s+/u;

interface Boundary {
  index: number;
  kind: "paragraph" | "bullet_group" | "sentence";
  before: string;
  after: string;
}

export function findSplitCandidates(body: string, locale = "und"): SplitCandidate[] {
  const clean = normaliseSplitSource(body);
  if (!clean) return [];
  const boundaries = strongBoundaries(clean);
  const selected = boundaries.length > 0 ? boundaries : sentenceBoundaries(clean, locale);
  const totalWords = countWords(clean, locale);

  return selected.map((boundary) => {
    const wordsBefore = countWords(boundary.before, locale);
    return {
      boundaryIndex: boundary.index,
      kind: boundary.kind,
      strength: boundary.kind === "sentence" ? "usable" : "strong",
      wordsBefore,
      wordsAfter: Math.max(0, totalWords - wordsBefore),
      previewBefore: previewText(boundary.before.slice(-120)),
      previewAfter: previewText(boundary.after.slice(0, 120)),
    };
  });
}

export function normaliseSplitSource(body: string): string {
  return body.replace(/\r\n?/g, "\n").trim();
}

function strongBoundaries(body: string): Boundary[] {
  const blocks: Array<{ start: number; end: number; kind: "paragraph" | "bullet_group" }> = [];
  let open: { start: number; end: number; kind: "paragraph" | "bullet_group" } | undefined;
  let offset = 0;

  for (const line of body.split("\n")) {
    const blank = !line.trim();
    const kind = BULLET_LINE.test(line) ? "bullet_group" : "paragraph";
    if (blank) {
      if (open) blocks.push(open);
      open = undefined;
    } else if (!open) {
      open = { start: offset, end: offset + line.length, kind };
    } else if (open.kind === kind) {
      open.end = offset + line.length;
    } else {
      blocks.push(open);
      open = { start: offset, end: offset + line.length, kind };
    }
    offset += line.length + 1;
  }
  if (open) blocks.push(open);
  if (blocks.length < 2) return [];

  return blocks.slice(0, -1).map((block) => ({
    index: block.end,
    kind: block.kind,
    before: body.slice(0, block.end),
    after: body.slice(block.end),
  }));
}

function sentenceBoundaries(body: string, locale: string): Boundary[] {
  const sentences = Array.from(new Intl.Segmenter(resolveSegmenterLocale(locale), { granularity: "sentence" }).segment(body))
    .filter((part) => part.segment.trim());
  if (sentences.length < 2) return [];
  return sentences.slice(0, -1).map((sentence) => {
    const end = sentence.index + sentence.segment.length;
    return {
      index: end,
      kind: "sentence" as const,
      before: body.slice(0, end),
      after: body.slice(end),
    };
  });
}

export function buildSplitPlans(candidates: SplitCandidate[], totalWords: number): SplitPlan[] {
  if (candidates.length === 0 || totalWords === 0) return [];
  const plans: SplitPlan[] = [];
  const two = [...candidates].sort(
    (a, b) => Math.abs(a.wordsBefore / totalWords - 0.5) - Math.abs(b.wordsBefore / totalWords - 0.5),
  )[0];
  if (two) {
    plans.push({
      slideCount: 2,
      boundaryIndices: [two.boundaryIndex],
      balance: roundBalance(Math.abs(two.wordsBefore / totalWords - 0.5)),
      basis: "mechanical_boundaries_only",
    });
  }

  if (candidates.length >= 2) {
    let best: { first: SplitCandidate; second: SplitCandidate; error: number } | undefined;
    for (let i = 0; i < candidates.length - 1; i += 1) {
      for (let j = i + 1; j < candidates.length; j += 1) {
        const first = candidates[i];
        const second = candidates[j];
        if (first.boundaryIndex >= second.boundaryIndex) continue;
        const error =
          Math.abs(first.wordsBefore / totalWords - 1 / 3) +
          Math.abs(second.wordsBefore / totalWords - 2 / 3);
        if (!best || error < best.error) best = { first, second, error };
      }
    }
    if (best) {
      plans.push({
        slideCount: 3,
        boundaryIndices: [best.first.boundaryIndex, best.second.boundaryIndex],
        balance: roundBalance(best.error / 2),
        basis: "mechanical_boundaries_only",
      });
    }
  }
  return plans;
}

function roundBalance(error: number): number {
  return Number(Math.max(0, 1 - error * 2).toFixed(3));
}
