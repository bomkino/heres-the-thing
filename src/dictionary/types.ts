import type { ToolId } from "../shared/types.ts";

export type TermId = string;

export interface DictionaryTerm {
  id: TermId;
  label: string;
  aliases: string[];
  plain: string;
  whyItMatters: string;
  changes: string;
  oftenConfusedWith: TermId[];
  related: TermId[];
  lenses: Partial<Record<ToolId, string>>;
  scope?: string;
}

export interface ContextualTerm extends DictionaryTerm {
  activeTool: ToolId;
  here: string;
}
