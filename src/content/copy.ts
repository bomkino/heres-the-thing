export const SUITE_COPY = {
  parent: {
    eyebrow: "A private pitch clinic from pitch.dog",
    title: "Here’s the thing.",
    support: "Find the next honest move. Build only the deck this conversation needs. Make every page earn its place.",
    primaryAction: "Show me where I am",
    secondaryAction: "I know what I need",
    trust: "Free. Local. No login. No score. Nothing sent anywhere.",
    aside: "No oracle. No mystery upload. No motivational confetti.",
  },
  tools: {
    you_are_here: {
      title: "You Are Here!",
      promise: "Stop guessing what ‘ready’ looks like. Find the next useful move from the facts you actually have.",
      action: "Find my next move",
    },
    deck_bones: {
      title: "Deck Bones.",
      promise: "Choose the smallest deck this room needs, then give every section one honest job.",
      action: "Build this version",
    },
    one_slide_or_three: {
      title: "One Slide or Three?",
      promise: "Test whether a page can breathe, travel, and do its job—without worshipping minimalism.",
      action: "Check this page",
    },
  },
  transitions: {
    toDeckBones: {
      title: "Right. Now the thing needs bones.",
      body: "We’ll carry the reader, decision, route, requirements, and delivery forward. No asking twice.",
      action: "Build this version",
    },
    toOneSlide: {
      title: "Good bones. Now let every page breathe.",
      body: "Check the pages that carry the most decision work first. Keep, tighten, split, or move detail—with reasons.",
      action: "Check the first page",
    },
    backToRoute: {
      title: "The page is telling us something about the deck.",
      body: "Return to the structure without losing copy, context, or decisions.",
      action: "Adjust the bones",
    },
  },
  result: {
    resultEyebrow: "Here’s where the facts put you",
    complete: "You have a route, a structure, and pages that know their jobs. Keep the judgment. Lose the theatre.",
    export: "Take the plan with you",
    exportNote: "Recommendation, section plan, page checks, tasks, and sources. Private notes stay out unless you add them now.",
    localSaved: "Saved on this device. Nothing was uploaded.",
    cleared: "Cleared from this device. No server copy exists.",
  },
  invitation: {
    title: "Want another human in the room?",
    body: "Shaping and designing this version is work pitch.dog does. Your plan is already yours either way.",
    action: "See how pitch.dog can help",
  },
  boundaries: {
    noScore: "No score. We explain which fact changed the route.",
    noOracle: "This checks decisions, structure, and page mechanics. It does not judge the idea, predict success, or impersonate a lawyer, financier, producer, reader, or audience.",
    currentRequirements: "A current requirement wins. Even when our favourite answer is prettier.",
    creatorAuthority: "We name the job of your words. We do not write your soul for you.",
  },
  humour: {
    visualPage: "A visual page is allowed. The slide police have been informed.",
    staleRequirement: "Old instructions are not sacred texts. Check the date.",
    waiting: "More packaging will not make waiting less like waiting.",
    overbuiltDeck: "If everything is essential, the deck has become a storage unit.",
    directEntry: "You know the instrument. Fair enough.",
    dictionaryEmpty: "Try the job, not the fashionable noun.",
    closedAccess: "A famous logo is not a door.",
    cleared: "Gone locally. The cloud never met it.",
  },
} as const;
