import { stableStringify } from "./shared/session.ts";
import type { SuiteSession } from "./shared/types.ts";
import type { DeckBonesResult } from "./deck-bones/types.ts";
import type { IntakeAssessment } from "./one-slide-or-three/types.ts";
import type { YouAreHereResult } from "./you-are-here/types.ts";

function asResult<T>(value: unknown): T | undefined {
  return value && typeof value === "object" ? value as T : undefined;
}

export function exportSessionMarkdown(
  session: SuiteSession,
  options: { includeProtectThis?: boolean } = {},
): string {
  const here = asResult<YouAreHereResult>(session.tools.you_are_here.result);
  const bones = asResult<DeckBonesResult>(session.tools.deck_bones.result);
  const slide = asResult<IntakeAssessment>(session.tools.one_slide_or_three.result);
  const lines = [
    "# Here’s the thing. — working plan",
    "",
    `Session: \`${session.id}\``,
    `Suite version: \`${session.suiteVersion}\``,
    `Updated: ${session.updatedAt}`,
    "",
    "Private, local working export. It does not certify quality, rights, access, legality, finance, or likely success.",
    "",
  ];
  if (here) {
    lines.push(
      "## You Are Here!",
      "",
      here.youAreHere,
      "",
      `**Next move:** ${here.nextMove}`,
      "",
      `**Park:** ${here.parkThis.join(" ")}`,
      "",
      `**Approach:** ${here.approach}`,
      "",
      `**After that:** ${here.afterThat}`,
      "",
    );
    if (options.includeProtectThis && session.protectThis?.selectedLine) {
      lines.push("**Protect this:**", "", session.protectThis.selectedLine, "");
    }
  }
  if (bones) {
    lines.push("## Deck Bones.", "", `**${bones.explanation.headline}**`, "", bones.explanation.thisVersionIsFor, "");
    for (const section of bones.sections) {
      lines.push(`- **${section.sectionId}** — ${section.state}; ${section.materialState}. ${section.doneWhen}`);
    }
    if (bones.tasks.length) {
      lines.push("", "### Bring first", "");
      for (const task of bones.tasks) lines.push(`- **${task.title}:** ${task.action}`);
    }
    lines.push("");
  }
  if (slide?.state === "assessed" && slide.assessment) {
    const assessment = slide.assessment;
    lines.push(
      "## One Slide or Three?",
      "",
      `**Recommendation:** ${assessment.recommendation}`,
      `**Footing:** ${assessment.resultStrength}`,
      `**Visible words:** ${assessment.metrics.visibleWordCount}`,
      "",
    );
    for (const reason of assessment.reasons.slice(0, 5)) lines.push(`- ${reason.message}`);
    lines.push("");
  } else if (slide?.state === "needs_input" && slide.nextQuestion) {
    lines.push(
      "## One Slide or Three?",
      "",
      "**Status:** One more fact is needed before calling the page.",
      `**Next question:** ${slide.nextQuestion.prompt}`,
      "",
    );
  }
  lines.push(
    "## Decisive shared facts",
    "",
    "```json",
    stableStringify(session.shared),
    "```",
    "",
  );
  return `${lines.join("\n")}\n`;
}
