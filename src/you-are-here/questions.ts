import type { YouAreHereQuestion, YouAreHereQuestionId } from "./types.ts";

export const YOU_ARE_HERE_QUESTIONS: Record<YouAreHereQuestionId, YouAreHereQuestion> = {
  "Q-SHARED-DEVICE": {
    id: "Q-SHARED-DEVICE",
    prompt: "Is this a shared device?",
    why: "This changes what is safe to leave behind, never the advice itself.",
    allowsUnknown: true,
  },
  "Q-LANE": {
    id: "Q-LANE",
    prompt: "What are you moving?",
    why: "Feature and episodic routes depend on different core work.",
    allowsUnknown: false,
  },
  "Q-TRIGGER": {
    id: "Q-TRIGGER",
    prompt: "What is happening now?",
    why: "A live request, meeting, wait, or pass may decide the next move before any abstract goal does.",
    allowsUnknown: true,
  },
  "Q-REQUIREMENT": {
    id: "Q-REQUIREMENT",
    prompt: "What did they actually ask for?",
    why: "Current instructions outrank templates. Mandatory, optional, and prohibited are different facts.",
    allowsUnknown: true,
  },
  "Q-DECISION": {
    id: "Q-DECISION",
    prompt: "What do you want the next person to decide or do?",
    why: "A document is useful only when it serves a real decision.",
    allowsUnknown: true,
  },
  "Q-RECIPIENT": {
    id: "Q-RECIPIENT",
    prompt: "Who needs to say yes, or at least keep talking?",
    why: "Same project becomes different material for a producer, director, fund, representative, or team.",
    allowsUnknown: true,
  },
  "Q-ACCESS": {
    id: "Q-ACCESS",
    prompt: "How can this honestly reach them?",
    why: "A closed inbox is a route fact, not a judgement on you or the work.",
    allowsUnknown: true,
  },
  "Q-FEATURE-STAGE": {
    id: "Q-FEATURE-STAGE",
    prompt: "How far is the screenplay?",
    why: "Packaging cannot do the screenplay's job.",
    allowsUnknown: true,
  },
  "Q-EPISODIC-STAGE": {
    id: "Q-EPISODIC-STAGE",
    prompt: "How far is the pilot?",
    why: "A large bible cannot quietly replace proof on the page.",
    allowsUnknown: true,
  },
  "Q-SERIES-SHAPE": {
    id: "Q-SERIES-SHAPE",
    prompt: "What makes the next episode or part happen?",
    why: "Returning shows need repeatable pressure. Limited stories need honest progression toward an ending.",
    allowsUnknown: true,
  },
  "Q-DELIVERY": {
    id: "Q-DELIVERY",
    prompt: "Will they read it alone, or will you be there?",
    why: "Live support and a leave-behind are related, but they are not the same document.",
    allowsUnknown: true,
  },
};
