import {
  SESSION_SCHEMA_VERSION,
  SUITE_VERSION,
  type FactSource,
  type JourneyEvent,
  type Known,
  type SharedFacts,
  type StorageLike,
  type SuiteSession,
  type ToolId,
  unknown,
} from "./types.ts";

export const DEFAULT_STORAGE_KEY = "pitchdog.heres-the-thing.session.v0.1";

function blankSharedFacts(): SharedFacts {
  return {
    lane: unknown(),
    role: unknown(),
    desiredDecision: unknown(),
    recipient: unknown(),
    delivery: unknown(),
    requirements: unknown(),
    language: unknown(),
    sharedDevice: unknown(),
    accessibilityNeeds: [],
  };
}

function idFrom(seed: string): string {
  let hash = 0x811c9dc5;
  for (const char of seed) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return `htt-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function createSession(options: {
  now?: string;
  idSeed?: string;
  activeTool?: ToolId;
  shared?: Partial<SharedFacts>;
} = {}): SuiteSession {
  const now = options.now ?? new Date().toISOString();
  const activeTool = options.activeTool ?? "you_are_here";
  const shared = { ...blankSharedFacts(), ...options.shared };
  return {
    schemaVersion: SESSION_SCHEMA_VERSION,
    suiteVersion: SUITE_VERSION,
    id: idFrom(options.idSeed ?? now),
    createdAt: now,
    updatedAt: now,
    activeTool,
    shared,
    dictionary: { pinnedTermIds: [], recentTermIds: [] },
    tools: {
      you_are_here: {},
      deck_bones: {},
      one_slide_or_three: {},
    },
    history: [event(activeTool, "entered", "Started here.", now, 0)],
  };
}

function event(
  tool: ToolId,
  type: JourneyEvent["type"],
  summary: string,
  at: string,
  index: number,
): JourneyEvent {
  return { id: `${tool}:${type}:${index}`, at, tool, type, summary };
}

export function recordToolResult(
  session: SuiteSession,
  tool: ToolId,
  input: unknown,
  result: unknown,
  version: string,
  summary: string,
  now = new Date().toISOString(),
): SuiteSession {
  return {
    ...session,
    activeTool: tool,
    updatedAt: now,
    tools: {
      ...session.tools,
      [tool]: { input, result, version, updatedAt: now },
    },
    history: [
      ...session.history,
      event(tool, "assessed", summary, now, session.history.length),
    ],
  };
}

export function handOff(
  session: SuiteSession,
  from: ToolId,
  to: ToolId,
  summary: string,
  now = new Date().toISOString(),
): SuiteSession {
  return {
    ...session,
    activeTool: to,
    updatedAt: now,
    history: [
      ...session.history,
      event(from, "handed_off", summary, now, session.history.length),
      event(to, "entered", "Continued with carried facts.", now, session.history.length + 1),
    ],
  };
}

export function enterTool(
  session: SuiteSession,
  to: ToolId,
  summary: string,
  now = new Date().toISOString(),
): SuiteSession {
  return {
    ...session,
    activeTool: to,
    updatedAt: now,
    history: [
      ...session.history,
      event(to, "entered", summary, now, session.history.length),
    ],
  };
}

export function mergeKnown<T>(current: Known<T>, incoming: Known<T>): Known<T> {
  if (incoming.status === "unknown") return current;
  if (current.status === "unknown" || current.status === "not_applicable") return incoming;
  if (incoming.status !== "known" || current.status !== "known") return incoming;
  if (stableStringify(current.value) === stableStringify(incoming.value)) return incoming;
  return {
    status: "conflicted",
    values: [
      { value: current.value, source: current.source },
      { value: incoming.value, source: incoming.source },
    ],
  };
}

export function setSharedFact<K extends keyof SharedFacts>(
  session: SuiteSession,
  key: K,
  value: SharedFacts[K],
  now = new Date().toISOString(),
): SuiteSession {
  return {
    ...session,
    updatedAt: now,
    shared: { ...session.shared, [key]: value },
  };
}

export function mergeSharedFact<K extends Exclude<keyof SharedFacts, "accessibilityNeeds">>(
  session: SuiteSession,
  key: K,
  value: SharedFacts[K],
  now = new Date().toISOString(),
): SuiteSession {
  const merged = mergeKnown<unknown>(session.shared[key] as Known<unknown>, value as Known<unknown>) as SharedFacts[K];
  return setSharedFact(session, key, merged, now);
}

export function carryKnown<T>(value: T, source: FactSource = "tool_handoff"): Known<T> {
  return { status: "known", value, source };
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function fingerprint(value: unknown): string {
  const input = stableStringify(value);
  let hash = 0x811c9dc5;
  for (const char of input) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function stripProtectThis(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripProtectThis);
  if (!value || typeof value !== "object") return value;
  const clean: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (key === "protectThis") continue;
    clean[key] = stripProtectThis(child);
  }
  return clean;
}

export function serializeSession(session: SuiteSession, includeProtectThis = false): string {
  const safe = includeProtectThis ? session : stripProtectThis(session);
  return JSON.stringify(safe, null, 2);
}

export function deserializeSession(serialized: string): SuiteSession {
  const parsed: unknown = JSON.parse(serialized);
  if (!parsed || typeof parsed !== "object") throw new Error("Session must be an object.");
  const record = parsed as Record<string, unknown>;
  if (record.schemaVersion !== SESSION_SCHEMA_VERSION) {
    throw new Error(`Unsupported session schema: ${String(record.schemaVersion)}`);
  }
  if (!record.shared || typeof record.shared !== "object" || !record.dictionary || typeof record.dictionary !== "object" || !record.tools || typeof record.tools !== "object" || !Array.isArray(record.history)) {
    throw new Error("Session is missing shared facts, dictionary state, tool state, or history.");
  }
  const dictionary = record.dictionary as Record<string, unknown>;
  if (!Array.isArray(dictionary.pinnedTermIds) || !dictionary.pinnedTermIds.every((id) => typeof id === "string") ||
      !Array.isArray(dictionary.recentTermIds) || !dictionary.recentTermIds.every((id) => typeof id === "string") || dictionary.recentTermIds.length > 12) {
    throw new Error("Session dictionary state is invalid.");
  }
  const tools = record.tools as Record<string, unknown>;
  if (!["you_are_here", "deck_bones", "one_slide_or_three"].every((tool) => tools[tool] && typeof tools[tool] === "object")) {
    throw new Error("Session tool state is invalid.");
  }
  if (typeof record.id !== "string" || typeof record.createdAt !== "string" || typeof record.updatedAt !== "string" ||
      !["you_are_here", "deck_bones", "one_slide_or_three"].includes(String(record.activeTool))) {
    throw new Error("Session identity, dates, or active tool are invalid.");
  }
  return parsed as SuiteSession;
}

export function saveLocal(
  storage: StorageLike,
  session: SuiteSession,
  key = DEFAULT_STORAGE_KEY,
  options: { includeProtectThis?: boolean } = {},
): void {
  storage.setItem(key, serializeSession(session, options.includeProtectThis ?? false));
}

export function restoreLocal(storage: StorageLike, key = DEFAULT_STORAGE_KEY): SuiteSession | undefined {
  const value = storage.getItem(key);
  return value ? deserializeSession(value) : undefined;
}

export function clearLocal(storage: StorageLike, key = DEFAULT_STORAGE_KEY): void {
  storage.removeItem(key);
}

export function visitDictionaryTerm(
  session: SuiteSession,
  termId: string,
  now = new Date().toISOString(),
): SuiteSession {
  return {
    ...session,
    updatedAt: now,
    dictionary: {
      ...session.dictionary,
      recentTermIds: [termId, ...session.dictionary.recentTermIds.filter((id) => id !== termId)].slice(0, 12),
    },
  };
}

export function togglePinnedTerm(
  session: SuiteSession,
  termId: string,
  now = new Date().toISOString(),
): SuiteSession {
  const exists = session.dictionary.pinnedTermIds.includes(termId);
  return {
    ...session,
    updatedAt: now,
    dictionary: {
      ...session.dictionary,
      pinnedTermIds: exists
        ? session.dictionary.pinnedTermIds.filter((id) => id !== termId)
        : [...session.dictionary.pinnedTermIds, termId],
    },
  };
}
