import type { SlideContent, TextMetrics } from "./types.ts";

const BULLET_LINE = /^\s*(?:[-*•‣◦▪]|\d+[.)])\s+/u;

function segment(text: string, locale: string, granularity: "word" | "sentence" | "grapheme") {
  return Array.from(new Intl.Segmenter(resolveSegmenterLocale(locale), { granularity }).segment(text));
}

export function resolveSegmenterLocale(locale = "und"): string {
  const candidate = locale || "und";
  try {
    const canonical = Intl.getCanonicalLocales(candidate)[0] ?? "und";
    new Intl.Segmenter(canonical);
    return canonical;
  } catch {
    return "und";
  }
}

export function countWords(text: string, locale = "und"): number {
  if (!text.trim()) return 0;
  return segment(text, locale, "word").filter((part) => part.isWordLike).length;
}

export function countSentences(text: string, locale = "und"): number {
  if (!text.trim()) return 0;
  return segment(text, locale, "sentence").filter((part) => part.segment.trim()).length;
}

export function countGraphemes(text: string, locale = "und"): number {
  if (!text) return 0;
  return segment(text, locale, "grapheme").length;
}

export function bodyBlocks(body: string): Array<{ kind: "paragraph" | "bullet_group"; text: string }> {
  const lines = body.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Array<{ kind: "paragraph" | "bullet_group"; text: string }> = [];
  let paragraph: string[] = [];
  let bullets: string[] = [];

  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();
    if (text) blocks.push({ kind: "paragraph", text });
    paragraph = [];
  };
  const flushBullets = () => {
    const text = bullets.join("\n").trim();
    if (text) blocks.push({ kind: "bullet_group", text });
    bullets = [];
  };

  for (const line of lines) {
    if (!line.trim()) {
      flushParagraph();
      flushBullets();
    } else if (BULLET_LINE.test(line)) {
      flushParagraph();
      bullets.push(line.trim());
    } else {
      flushBullets();
      paragraph.push(line.trim());
    }
  }
  flushParagraph();
  flushBullets();
  return blocks;
}

export function analyseText(content: SlideContent, locale = "und", sourceMustBeRead = false): TextMetrics {
  const resolvedLocale = resolveSegmenterLocale(locale);
  const title = content.title?.trim() ?? "";
  const body = content.body?.trim() ?? "";
  const quote = content.quote?.trim() ?? "";
  const labels = (content.labels ?? []).map((label) => label.trim()).filter(Boolean);
  const source = content.source?.trim() ?? "";
  const mainParts = [title, body, quote, ...labels].filter(Boolean);
  const mainText = mainParts.join("\n\n");
  const visibleText = [...mainParts, source].filter(Boolean).join("\n\n");
  const blocks = bodyBlocks(body);
  const bulletLines = body.split(/\r?\n/u).filter((line) => BULLET_LINE.test(line));
  const sentences = segment(mainText, locale, "sentence")
    .map((part) => part.segment.trim())
    .filter(Boolean);
  const longestSentenceWords = sentences.reduce(
    (max, sentence) => Math.max(max, countWords(sentence, locale)),
    0,
  );
  const mainWordCount = countWords(mainText, locale);
  const sourceWordCount = countWords(source, locale);

  return {
    visibleText,
    mainWordCount,
    sourceWordCount,
    visibleWordCount: mainWordCount + sourceWordCount,
    timedWordCount: mainWordCount + (sourceMustBeRead ? sourceWordCount : 0),
    graphemeCount: countGraphemes(visibleText, locale),
    sentenceCount: countSentences(mainText, locale),
    paragraphCount: blocks.filter((block) => block.kind === "paragraph").length,
    bulletCount: bulletLines.length,
    bulletGroupCount: blocks.filter((block) => block.kind === "bullet_group").length,
    explicitBlockCount:
      blocks.length + Number(Boolean(title)) + Number(Boolean(quote)) + labels.length + Number(Boolean(source)),
    longestSentenceWords,
    locale: resolvedLocale,
  };
}

export function previewText(value: string, length = 48): string {
  const flat = value.replace(/\s+/gu, " ").trim();
  return flat.length <= length ? flat : `${flat.slice(0, length - 1)}…`;
}
