import type { CopyBudget, DeliveryMode, SlideRole } from "./types.ts";
import { getJobBudget } from "./jobs.ts";

export const RULE_VERSION = "copy-bands-0.1.0" as const;

type RoleFamily = "glance" | "explain" | "inspect" | "quote" | "reference";

export const ROLE_FAMILY: Record<SlideRole, RoleFamily> = {
  cover: "glance",
  section: "glance",
  statement: "glance",
  question: "glance",
  overview: "explain",
  argument: "explain",
  story: "explain",
  evidence: "inspect",
  data: "inspect",
  comparison: "inspect",
  process: "inspect",
  timeline: "inspect",
  quote: "quote",
  case_study: "explain",
  profile: "inspect",
  gallery: "inspect",
  ask: "explain",
  summary: "explain",
  reference: "reference",
  legal_or_required_text: "reference",
};

const BANDS: Record<RoleFamily, Record<Exclude<DeliveryMode, "dual_use">, CopyBudget>> = {
  glance: {
    speaker_led: band(18, 32, 2, 4),
    guided_read: band(28, 45, 3, 5),
    self_read: band(45, 70, 4, 6),
    reference: band(70, 120, 6, 9),
  },
  explain: {
    speaker_led: band(40, 65, 4, 6),
    guided_read: band(60, 90, 5, 7),
    self_read: band(100, 150, 6, 9),
    reference: band(160, 240, 10, 14),
  },
  inspect: {
    speaker_led: band(50, 80, 5, 7),
    guided_read: band(75, 115, 6, 9),
    self_read: band(120, 175, 8, 11),
    reference: band(180, 260, 12, 16),
  },
  quote: {
    speaker_led: band(35, 55, 3, 5),
    guided_read: band(55, 80, 4, 6),
    self_read: band(80, 120, 5, 8),
    reference: band(120, 180, 8, 12),
  },
  reference: {
    speaker_led: band(35, 60, 4, 6),
    guided_read: band(70, 110, 6, 9),
    self_read: band(140, 220, 10, 14),
    reference: band(240, 360, 14, 20),
  },
};

function band(
  comfortableMaxWords: number,
  tightMaxWords: number,
  comfortableMaxBlocks: number,
  tightMaxBlocks: number,
): CopyBudget {
  return {
    comfortableMaxWords,
    tightMaxWords,
    comfortableMaxBlocks,
    tightMaxBlocks,
    basis: "editorial_judgement",
    status: "provisional",
  };
}

export function getCopyBudget(role: SlideRole, delivery: DeliveryMode, jobId?: string): CopyBudget {
  const family = ROLE_FAMILY[role];
  const resolvedDelivery = delivery === "dual_use" ? "speaker_led" : delivery;
  const jobBudget = getJobBudget(jobId, resolvedDelivery);
  if (jobBudget) return jobBudget;
  return { ...BANDS[family][resolvedDelivery] };
}

export function getDualUseBudgets(role: SlideRole, jobId?: string): { live: CopyBudget; read: CopyBudget } {
  const family = ROLE_FAMILY[role];
  return {
    live: getJobBudget(jobId, "speaker_led") ?? { ...BANDS[family].speaker_led },
    read: getJobBudget(jobId, "self_read") ?? { ...BANDS[family].self_read },
  };
}
