import "./styles.css";
import { initialiseAtmosphere } from "./atmosphere.ts";
import { initialiseGrain } from "./grain.ts";
import { DICTIONARY_TERMS, getTerm, searchTerms } from "../../src/index.ts";
import {
  ACCESS_ROUTES,
  BROAD_LANES,
  BROAD_DELIVERIES,
  DEADLINES,
  DECK_BOUNDARIES,
  DECK_DELIVERIES,
  DECK_FORMATS,
  DECK_GOALS,
  DECK_MATERIALS,
  DECK_RECIPIENTS,
  DECK_ROLES,
  DESIRED_MOVES,
  FEATURE_STAGES,
  RECIPIENT_SHAPES,
  REQUIREMENT_STATES,
  SERIES_STAGES,
  SITUATIONS,
  SLIDE_JOBS,
  SLIDE_MODES,
  SLIDE_TIMES,
  SLIDE_VIEWPORTS,
  SPECIFIC_ASKS,
  type Choice,
} from "./content.ts";
import { buildDeckPlan, buildNextAdvice, buildSlideResult, sectionJob, sectionName } from "./adapters.ts";
import { measureSlide } from "./measure.ts";
import type {
  AppState,
  DeckAnswers,
  DeckBoundary,
  DeckDelivery,
  DeckFormat,
  DeckGoal,
  DeckMaterials,
  DeckRecipient,
  DeckRide,
  DeckRole,
  DeckStage,
  DeadlineBand,
  AccessRouteChoice,
  RecipientShape,
  RequirementStatusChoice,
  NextAnswers,
  Route,
  SlideDraft,
  SlideTime,
  SlideViewport,
  SpecificAsk,
} from "./types.ts";

const app = document.querySelector<HTMLDivElement>("#app");
const live = document.querySelector<HTMLDivElement>("#live");
if (!app || !live) throw new Error("App shell is missing.");
const appRoot: HTMLDivElement = app;
const liveRegion: HTMLDivElement = live;
const threadCanvas = document.querySelector<HTMLCanvasElement>("#thread-canvas");
let lastInputWasKeyboard = false;
const systemTheme = matchMedia("(prefers-color-scheme: dark)");

window.addEventListener("pointerdown", () => { lastInputWasKeyboard = false; }, { capture: true });
window.addEventListener("keydown", (event) => {
  if (["Tab", "Enter", " ", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) lastInputWasKeyboard = true;
}, { capture: true });

function paintTheme(theme: "light" | "dark", source: "system" | "manual"): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.themeSource = source;
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0d0e0c" : "#f2f2ed");
}

paintTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light", document.documentElement.dataset.themeSource === "manual" ? "manual" : "system");
systemTheme.addEventListener("change", (event) => {
  if (document.documentElement.dataset.themeSource === "system") paintTheme(event.matches ? "dark" : "light", "system");
});

const SESSION_KEY = "htt.session.v3";

function blankState(): AppState {
  return {
    route: routeFromPath(location.pathname),
    deckStep: 0,
    deck: { boundaries: [] },
    nextStep: 0,
    next: {},
    quick: { copy: "", title: "", mode: "live", job: "statement", viewport: "laptop", time: "ten", craft: false },
    slide: { copy: "", title: "", mode: "live", job: "statement", viewport: "laptop", time: "ten", craft: false },
    dictionaryOpen: false,
    dictionaryQuery: "",
    dictionaryCategory: "start",
  };
}

function restoreState(): AppState {
  const base = blankState();
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "null") as Partial<AppState> | null;
    if (!saved) return base;
    const restored: AppState = {
      ...base,
      ...saved,
      route: routeFromPath(location.pathname),
      deck: { ...base.deck, ...saved.deck, boundaries: saved.deck?.boundaries ?? [] },
      next: { ...base.next, ...saved.next },
      quick: { ...base.quick, ...saved.quick },
      slide: { ...base.slide, ...saved.slide },
      dictionaryOpen: false,
      selectedTermId: undefined,
    };
    restored.nextStep = Math.min(restored.nextStep, 3);
    if (restored.deckPlan && (!restored.deckPlan.reasons || !restored.deckPlan.leaveOut || !restored.deckPlan.optionalSections)) {
      restored.deckPlan = buildDeckPlan(restored.deck);
    }
    return restored;
  } catch {
    return base;
  }
}

const state: AppState = restoreState();

function saveState(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...state, dictionaryOpen: false, selectedTermId: undefined }));
  } catch (_) {}
}

const PLAIN_OVERRIDES: Record<string, { plain: string; why: string; changes: string }> = {
  "pitch-deck": {
    plain: "A short visual document that helps a particular person understand a project and decide what to do next.",
    why: "A deck for everyone usually helps no one. The reader and the decision shape what belongs.",
    changes: "The pages, detail, order, and amount of explanation.",
  },
  "page-job": {
    plain: "The one thing a page must help someone understand, feel, compare, or do.",
    why: "A page with six jobs usually does none of them cleanly.",
    changes: "What stays, what moves elsewhere, and what the page emphasises.",
  },
  logline: {
    plain: "One or two sentences that make the central story or idea easy to understand.",
    why: "It gives a new reader something solid to hold before the detail arrives.",
    changes: "The project’s first explanation—not the project itself.",
  },
  comps: {
    plain: "Other work you name to explain one useful relationship—tone, audience, format, scale, or structure.",
    why: "Good comps create orientation. Bad comps merely borrow prestige.",
    changes: "What the reader can picture quickly and what still needs proving.",
  },
  "dual-use": {
    plain: "One deck used both in a presentation and as a file people read later. Harder than it sounds.",
    why: "Live slides support a speaker. Read-alone pages must carry their own context.",
    changes: "Often, the honest answer is two versions with the same spine.",
  },
  appendix: {
    plain: "Useful backup material kept out of the main story until someone needs it.",
    why: "It protects the main argument without throwing useful detail away.",
    changes: "The primary deck stays shorter; diligence and reference remain available.",
  },
};

const revealObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    }
  }
}, { threshold: 0.08 });

window.addEventListener("popstate", () => {
  state.route = routeFromPath(location.pathname);
  render();
});

function routeFromPath(path: string): Route {
  if (path.startsWith("/slide")) return "slide";
  if (path.startsWith("/deck")) return "deck";
  if (path.startsWith("/next")) return "next";
  if (path.startsWith("/words")) return "words";
  if (path.startsWith("/plan")) return "plan";
  return "home";
}

function routePath(route: Route): string {
  return route === "home" ? "/" : `/${route}`;
}

function change(update: () => void, scroll: "top" | "keep" = "top", revealOnPhone?: string): void {
  const documentWithTransitions = document as Document & { startViewTransition?: (callback: () => void) => unknown };
  const commit = () => {
    update();
    saveState();
    render("heading");
    if (scroll === "top") {
      const resetScroll = () => window.scrollTo({ top: 0, behavior: "auto" });
      resetScroll();
      requestAnimationFrame(resetScroll);
    }
    if (revealOnPhone && matchMedia("(max-width: 820px)").matches) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>(revealOnPhone)?.scrollIntoView({
        block: "start",
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      }));
    }
  };
  if (documentWithTransitions.startViewTransition && !lastInputWasKeyboard && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    documentWithTransitions.startViewTransition(commit);
  } else {
    commit();
  }
}

function refresh(update: () => void, focus: "drawer" | "none" = "none"): void {
  update();
  saveState();
  render(focus);
}

function navigate(route: Route, revealOnPhone?: string): void {
  if (state.route === route) return;
  history.pushState({}, "", routePath(route));
  change(() => { state.route = route; }, "top", revealOnPhone);
}

function announce(message: string): void {
  liveRegion.textContent = "";
  requestAnimationFrame(() => { liveRegion.textContent = message; });
}

function escapeHTML(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

function header(): string {
  const hasPlan = Boolean(state.deckPlan || state.nextAdvice || state.slideResult || state.quickResult);
  const label = state.route === "deck" ? "Deck Bones. · Film & TV" : state.route === "slide" ? "Slide Check." : state.route === "next" ? "You Are Here!" : state.route === "words" ? "Pitch Dictionary." : "Here’s The Thing";
  const currentTheme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  const nextTheme = currentTheme === "dark" ? "light" : "dark";
  const followsSystem = document.documentElement.dataset.themeSource !== "manual";
  return `
    <header class="site-header ${state.route !== "home" ? "site-header--tool" : ""}">
      <button class="brand" type="button" data-route="home" aria-label="Here’s The Thing — home">
        <img src="/assets/pitchdog-logomark.svg" alt="" width="31" height="31">
        <span>${label}</span>
      </button>
      <nav class="site-nav" aria-label="The four tools">
        <button type="button" data-route="slide">Slide Check</button>
        <button type="button" data-route="deck">Deck Bones</button>
        <button type="button" data-route="next">You Are Here</button>
        <button type="button" data-route="words">Dictionary</button>
      </nav>
      <div class="header-actions">
        ${hasPlan && state.route !== "plan" ? '<button class="header-link" type="button" data-route="plan">My plan</button>' : ""}
        <button class="theme-toggle" id="theme-toggle" type="button" aria-label="Switch to ${nextTheme} theme" title="${followsSystem ? "Following your system. " : ""}Switch to ${nextTheme} theme"><span aria-hidden="true"></span></button>
      </div>
    </header>`;
}

function footer(): string {
  if (state.route === "deck" && !state.deckPlan) return "";
  if (state.route === "next" && !state.nextAdvice) return "";
  return `
    <footer class="site-footer">
      <p>Made with unreasonable care by <strong>pitch.dog</strong>.</p>
      <p>Your work stays in this tab. Refresh is safe; closing the tab clears it.</p>
    </footer>`;
}

function dictionaryButton(): string {
  if (state.route === "words") return "";
  return `<button class="dictionary-fab" id="dictionary-open" type="button" aria-label="Open quick pitch dictionary"><span aria-hidden="true">?</span><strong>Clear a doubt</strong></button>`;
}

function render(focus: "heading" | "drawer" | "none" = "heading"): void {
  document.body.dataset.route = state.route;
  document.body.style.overflow = state.dictionaryOpen ? "hidden" : "";
  document.title = state.route === "home" ? "Here’s The Thing — four focused pitch tools"
    : state.route === "slide" ? "Slide Check — Here’s The Thing"
    : state.route === "deck" ? "Deck Bones. — Here’s The Thing"
    : state.route === "next" ? "You Are Here! — Here’s The Thing"
    : state.route === "words" ? "Pitch Dictionary — Here’s The Thing"
    : "My plan — Here’s The Thing";
  const page = state.route === "home" ? homePage()
    : state.route === "slide" ? slidePage()
    : state.route === "deck" ? deckPage()
    : state.route === "next" ? nextPage()
    : state.route === "words" ? wordsPage()
    : planPage();
  appRoot.innerHTML = `${header()}<main id="main">${page}</main>${footer()}${dictionaryButton()}${dictionaryDrawer()}`;
  document.querySelectorAll<HTMLElement>(".skip-link, .site-header, #main, .site-footer, .dictionary-fab").forEach((element) => {
    element.inert = state.dictionaryOpen;
    if (state.dictionaryOpen) element.setAttribute("aria-hidden", "true");
    else element.removeAttribute("aria-hidden");
  });
  attachGlobalEvents();
  if (state.route === "home") attachHomeEvents();
  if (state.route === "slide") attachSlideEvents();
  if (state.route === "deck") attachDeckEvents();
  if (state.route === "next") attachNextEvents();
  if (state.route === "words") attachWordsEvents();
  if (state.route === "plan") attachPlanEvents();
  if (state.dictionaryOpen) attachDictionaryEvents();
  attachFlourishes();
  document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((element) => revealObserver.observe(element));
  requestAnimationFrame(() => {
    const focusTarget = focus === "drawer"
      ? document.querySelector<HTMLElement>("#dictionary-search") ?? document.querySelector<HTMLElement>("#term-back, #dictionary-close")
      : focus === "heading" ? document.querySelector<HTMLElement>("h1") : null;
    focusTarget?.focus({ preventScroll: true });
  });
}

function homePage(): string {
  return `
    <section class="home-manifesto">
      <div class="home-constellation" aria-hidden="true">
        <span style="--x:13%;--y:22%">page</span><span style="--x:75%;--y:18%">reader</span>
        <span style="--x:82%;--y:70%">decision</span><span style="--x:20%;--y:78%">story</span>
        <i></i><i></i><i></i>
      </div>
      <div class="manifesto-copy">
        <p class="kicker">Here’s The Thing · four ways in</p>
        <h1 tabindex="-1">What is the actual problem?</h1>
        <p class="hero-lede">A bad deck can be four different problems wearing the same little blazer.</p>
        <p class="manifesto-rule">Pick the question you need answered. Ignore the other three. They will cope.</p>
        <a class="scroll-cue" href="#four-tools">Meet the four tools <span aria-hidden="true">↓</span></a>
      </div>
      <div class="manifesto-sticky" data-scroll-card aria-hidden="true"><span>THE DECK?</span><del>Maybe.</del><strong>THE DECISION.</strong></div>
    </section>

    <section class="tool-atlas" id="four-tools" aria-label="Four focused pitch tools">
      <article class="tool-chapter tool-chapter--slide" data-reveal data-scroll-card>
        <div class="chapter-art" aria-hidden="true"><img src="/assets/visual-family-v2/slide-check-v2.webp" alt=""></div>
        <div class="chapter-index"><span>01 / 04</span><small>Any work with slides</small></div>
        <div class="chapter-copy">
          <p class="chapter-question">Is this one page trying to do too much?</p>
          <h2>Slide Check.</h2>
          <p class="chapter-deck">Paste one real slide. Get a physical-fit verdict, reading load, honest break points, and an optional craft check.</p>
          <dl class="chapter-facts"><div><dt>You give it</dt><dd>The exact words people see</dd></div><div><dt>You get</dt><dd>One clear page decision</dd></div><div><dt>Time</dt><dd>30 seconds—or a deeper look</dd></div></dl>
          <button class="chapter-cta" type="button" data-route="slide">Check one slide <span aria-hidden="true">↗</span></button>
        </div>
      </article>

      <article class="tool-chapter tool-chapter--deck" data-reveal data-scroll-card>
        <div class="chapter-art" aria-hidden="true"><img src="/assets/visual-family-v2/deck-bones-v2.webp" alt=""></div>
        <div class="chapter-index"><span>02 / 04</span><small>Scripted Film & TV only</small></div>
        <div class="chapter-copy">
          <p class="chapter-question">What actually belongs in this Film & TV deck?</p>
          <h2>Deck Bones.</h2>
          <p class="chapter-deck">Choose the project, reader, moment, and route. Get a page-by-page structure whose sections have earned their place.</p>
          <dl class="chapter-facts"><div><dt>You give it</dt><dd>Structured choices—never an essay</dd></div><div><dt>You get</dt><dd>A Film & TV deck plan</dd></div><div><dt>Time</dt><dd>90-second quick plan or 4-minute deep ride</dd></div></dl>
          <button class="chapter-cta" type="button" data-route="deck">Build the bones <span aria-hidden="true">↗</span></button>
        </div>
      </article>

      <article class="tool-chapter tool-chapter--next" data-reveal data-scroll-card>
        <div class="chapter-art" aria-hidden="true"><img src="/assets/visual-family-v2/you-are-here-v2.webp" alt=""></div>
        <div class="chapter-index"><span>03 / 04</span><small>Film · ads · startups · education</small></div>
        <div class="chapter-copy">
          <p class="chapter-question">Should I even be making a deck right now?</p>
          <h2>You Are Here!</h2>
          <p class="chapter-deck">Name the live situation and the decision you need. Get one bounded next move—and permission to stop polishing the wrong thing.</p>
          <dl class="chapter-facts"><div><dt>You give it</dt><dd>Four plain choices</dd></div><div><dt>You get</dt><dd>The next useful move</dd></div><div><dt>Time</dt><dd>About one minute</dd></div></dl>
          <button class="chapter-cta" type="button" data-route="next">Find my next move <span aria-hidden="true">↗</span></button>
        </div>
      </article>

      <article class="tool-chapter tool-chapter--words" data-reveal data-scroll-card>
        <div class="chapter-art" aria-hidden="true"><img src="/assets/visual-family-v2/pitch-dictionary-v2.webp" alt=""></div>
        <div class="word-river" aria-hidden="true"><span>LOGLINE</span><span>COMPS</span><span>THE ASK</span><span>ENGINE</span><span>APPENDIX</span></div>
        <div class="chapter-index"><span>04 / 04</span><small>Always within reach</small></div>
        <div class="chapter-copy">
          <p class="chapter-question">What does this pitch word actually mean here?</p>
          <h2>Pitch Dictionary.</h2>
          <p class="chapter-deck">Sixty-two terms without the smoke machine: plain meaning, why it matters, what it changes, and how the meaning shifts across the other three tools.</p>
          <dl class="chapter-facts"><div><dt>You give it</dt><dd>A word or a doubt</dd></div><div><dt>You get</dt><dd>Context, not jargon</dd></div><div><dt>Time</dt><dd>As long as the doubt takes</dd></div></dl>
          <button class="chapter-cta" type="button" data-route="words">Open the dictionary <span aria-hidden="true">↗</span></button>
        </div>
      </article>
    </section>`;
}

function modeSwitch(prefix: string, selected: SlideDraft["mode"]): string {
  return `<div class="mode-switch" role="group" aria-label="How people will use this slide">
    ${SLIDE_MODES.map((choice) => `<button type="button" data-${prefix}-mode="${choice.value}" aria-pressed="${choice.value === selected}">${choice.label}</button>`).join("")}
  </div>`;
}

function slidePreview(draft: SlideDraft): string {
  return `<div class="slide-preview-wrap" data-tilt="2.4">
    <div class="slide-preview" aria-label="16 by 9 slide preview">
      <div class="slide-preview__number">16:9</div>
      ${draft.title ? `<h3>${escapeHTML(draft.title)}</h3>` : ""}
      <p>${escapeHTML(draft.copy || "Your slide, with room to breathe.")}</p>
      <i aria-hidden="true"></i>
    </div>
  </div>`;
}

function slideResultCard(result: NonNullable<AppState["slideResult"]>, origin: "quick" | "full"): string {
  const metrics = result.raw.metrics;
  const seconds = result.raw.readingTime.seconds;
  const showSplits = ["split_two", "split_three", "edit_before_splitting"].includes(result.raw.recommendation);
  return `<article class="slide-verdict" aria-live="polite">
    <p class="kicker">The straight answer</p>
    <h3>${result.headline}</h3>
    <p>${result.body}</p>
    <dl class="metric-line">
      <div><dt>Words</dt><dd>${metrics.visibleWordCount}</dd></div>
      <div><dt>Text blocks</dt><dd>${metrics.explicitBlockCount}</dd></div>
      <div><dt>Reading time</dt><dd>${typeof seconds === "number" ? `${Math.max(1, Math.round(seconds))} sec` : "Context needed"}</dd></div>
    </dl>
    ${showSplits && result.raw.splitPlans.length ? `<details><summary>Show possible break points</summary><p>These are mechanical paragraph or sentence boundaries. You decide whether the thought survives.</p><ol>${result.raw.splitPlans.slice(0, 3).map((plan) => `<li>${plan.slideCount} slides · ${plan.boundaryIndices.length === 1 ? "one suggested break" : `${plan.boundaryIndices.length} suggested breaks`}</li>`).join("")}</ol></details>` : ""}
    ${result.craft.length ? `<details class="craft-verdict" open><summary>The craft check</summary><div class="craft-list">${result.craft.map((item) => `<div class="craft-item craft-item--${item.state}"><span>${item.state === "good" ? "Good" : item.state === "watch" ? "Look again" : "Unknown"}</span><strong>${escapeHTML(item.label)}</strong><p>${escapeHTML(item.detail)}</p></div>`).join("")}</div><p class="mechanical-note">These are visible, mechanical cues. They do not score taste, truth, originality, or whether the writing is any good.</p></details>` : ""}
    ${origin === "quick" ? '<button class="text-action" type="button" data-route="slide" data-carry-quick>Take the deeper slide check ↗</button>' : ""}
  </article>`;
}

function slidePage(): string {
  return `<section class="tool-page tool-page--slide">
    <div class="tool-intro">
      <div class="tool-intro-art" data-tilt="2" aria-hidden="true"><img src="/assets/visual-family-v2/slide-check-v2.webp" alt=""></div>
      <button class="back-home" type="button" data-route="home">← All four tools</button>
      <p class="scope-tag">Film · ads · startups · education · more</p>
      <p class="kicker">One page. One honest answer.</p>
      <h1 tabindex="-1">Slide Check.</h1>
      <p class="tool-lede">Is one slide carrying too much? Paste the exact visible words. We test the real 16:9 fit, reading load, and possible break points.</p>
      <div class="promise-strip"><span>We measure the page</span><span>We do not grade the idea</span><span>Nothing leaves your browser</span></div>
    </div>
    <div class="slide-workbench">
      <div class="slide-controls">
        <p class="workbench-label">Slide Check · your page</p>
        <h2>Paste one real slide.</h2>
        <p class="workbench-intro">Not the whole deck. Not a description of the slide. The words a person actually has to read.</p>
        ${modeSwitch("slide", state.slide.mode)}
        <div class="copy-editor">
          <div class="copy-editor__bar"><span>16:9 copy editor</span><strong>Paste here ↓</strong></div>
          <label for="slide-title">Slide title <span>optional</span></label>
          <input id="slide-title" value="${escapeHTML(state.slide.title)}" placeholder="For example: Why this, why now">
          <label for="slide-copy">Everything else visible on the slide</label>
          <textarea id="slide-copy" rows="10" placeholder="Paste the body, labels, quote, or source people must read…">${escapeHTML(state.slide.copy)}</textarea>
        </div>
        <details class="advanced-details" ${state.slide.craft ? "open" : ""}>
          <summary><span>Take the deeper ride</span><small>Context + best-practice cues · about 2 minutes</small></summary>
          <p class="advanced-consent">Optional. The quick verdict works without this. Open it when you want a more useful, more conditional answer.</p>
          <div class="advanced-grid">
            <label>What is this slide doing?<select id="slide-job">${SLIDE_JOBS.map((choice) => `<option value="${choice.value}" ${choice.value === state.slide.job ? "selected" : ""}>${choice.label} — ${choice.detail}</option>`).join("")}</select></label>
            <label>Smallest likely view<select id="slide-viewport">${SLIDE_VIEWPORTS.map((choice) => `<option value="${choice.value}" ${choice.value === state.slide.viewport ? "selected" : ""}>${choice.label}</option>`).join("")}</select></label>
            <label>How long is it up?<select id="slide-time">${SLIDE_TIMES.map((choice) => `<option value="${choice.value}" ${choice.value === state.slide.time ? "selected" : ""}>${choice.label}</option>`).join("")}</select></label>
            <label class="craft-toggle"><input id="slide-craft" type="checkbox" ${state.slide.craft ? "checked" : ""}><span><strong>Check the craft too</strong><small>Visible hierarchy, duplication, long sentences, and job-specific cues. Mechanical, transparent, no pretend mind-reading.</small></span></label>
          </div>
        </details>
        <button class="primary-action" id="slide-submit" type="button">Check this real 16:9 page <span aria-hidden="true">↗</span></button>
        <p class="input-truth"><strong>The honest boundary:</strong> this counts, times, and measures. It can point to existing breaks. It cannot understand your intention, verify a claim, or tell you whether the idea has soul.</p>
      </div>
      <div class="slide-stage">
        ${slidePreview(state.slide)}
        ${state.slideResult ? slideResultCard(state.slideResult, "full") : '<p class="stage-whisper">The verdict lands here. Your copy stays yours.</p>'}
      </div>
    </div>
  </section>`;
}

interface FlowStep<T extends string> {
  key: string;
  kicker: string;
  question: string;
  note: string;
  choices: Choice<T>[];
  multiple?: boolean;
}

function deckSteps(): FlowStep<string>[] {
  const quick: FlowStep<string>[] = [
    { key: "format", kicker: "The project", question: "What are you making?", note: "Deck Bones is built specifically for scripted Film & TV.", choices: DECK_FORMATS },
    { key: "goal", kicker: "The job", question: "What should this deck help happen?", note: "Pick the closest one. We’ll do the fussy translation backstage.", choices: DECK_GOALS },
  ];
  if (state.deck.goal === "specific") quick.push({ key: "specificAsk", kicker: "The request", question: "What did they ask for?", note: "Choose the nearest standard item. No blank box, because this tool does not pretend to understand prose.", choices: SPECIFIC_ASKS });
  quick.push(
    { key: "recipient", kicker: "The reader", question: "Who needs to make the next decision?", note: "Different readers need different proof. Famous logos are not a strategy.", choices: DECK_RECIPIENTS },
    { key: "stage", kicker: "The material", question: state.deck.format === "series" ? "How far is the pilot and series?" : "How far is the screenplay?", note: "A deck can frame the work. It cannot secretly replace the work.", choices: state.deck.format === "series" ? SERIES_STAGES : FEATURE_STAGES },
    { key: "materials", kicker: "What exists", question: "What can we reuse?", note: "Starting over is expensive. We only do it when the old thing has the wrong job.", choices: DECK_MATERIALS },
  );
  if (state.deckRide !== "deep") return quick;
  const steps: FlowStep<string>[] = [
    { key: "format", kicker: "The project", question: "What are you making?", note: "Deck Bones is built specifically for scripted Film & TV.", choices: DECK_FORMATS },
    { key: "role", kicker: "Your seat", question: "What is your real role in this version?", note: "Authorship changes which claims, pages, and visual arguments belong to you.", choices: DECK_ROLES },
    { key: "goal", kicker: "The job", question: "What should this deck help happen?", note: "Pick the closest one. We’ll do the fussy translation backstage.", choices: DECK_GOALS },
  ];
  if (state.deck.goal === "specific") steps.push({ key: "specificAsk", kicker: "The request", question: "What did they ask for?", note: "Choose the nearest standard item. No blank box, because this tool does not pretend to understand prose.", choices: SPECIFIC_ASKS });
  steps.push(
    { key: "recipient", kicker: "The reader", question: "Who needs to make the next decision?", note: "Different readers need different proof. Famous logos are not a strategy.", choices: DECK_RECIPIENTS },
    { key: "recipientShape", kicker: "The room", question: "How many decisions is this version serving?", note: "Several people are fine. Several incompatible jobs are not one deck.", choices: RECIPIENT_SHAPES },
    { key: "access", kicker: "The route", question: "How can the material legitimately reach them?", note: "A closed route is a route fact—not a verdict on the project.", choices: ACCESS_ROUTES },
    { key: "delivery", kicker: "The room", question: "How will they meet the deck?", note: "A live deck and a read-alone deck have different jobs.", choices: DECK_DELIVERIES },
    { key: "stage", kicker: "The material", question: state.deck.format === "series" ? "How far is the pilot and series?" : "How far is the screenplay?", note: "A deck can frame the work. It cannot secretly replace the work.", choices: state.deck.format === "series" ? SERIES_STAGES : FEATURE_STAGES },
    { key: "materials", kicker: "What exists", question: "What can we reuse?", note: "Starting over is expensive. We only do it when the old thing has the wrong job.", choices: DECK_MATERIALS },
    { key: "requirementStatus", kicker: "The request", question: "What instruction are you actually working from?", note: "Current requirements outrank generic advice. Memory does not become policy through confidence.", choices: REQUIREMENT_STATES },
    { key: "boundaries", kicker: "What must stay honest", question: "Does any of this need special care?", note: "Pick all that apply. This only narrows risky claims; it does not freeze the whole project.", choices: DECK_BOUNDARIES, multiple: true },
    { key: "deadline", kicker: "The clock", question: "When does this version need to be useful?", note: "A deadline changes sequence and ambition. It does not make unsupported claims true.", choices: DEADLINES },
  );
  return steps;
}

function deckLanding(): string {
  return `<section class="ride-landing ride-landing--deck">
    <div class="ride-landing__intro">
      <button class="back-home" type="button" data-route="home">← All four tools</button>
      <p class="scope-tag">Deck Bones · scripted Film & TV only</p>
      <h1 tabindex="-1">Build the deck’s bones.</h1>
      <p>Not a template. A useful structure for this project, this reader, and this moment.</p>
      <div class="bone-mobile" aria-hidden="true"><img src="/assets/visual-family-v2/deck-bones-v2.webp" alt=""></div>
    </div>
    <div class="ride-choices" aria-label="Choose how deep to go">
      <button type="button" data-deck-ride="quick" class="ride-card ride-card--quick">
        <span class="ride-number">01</span><small>About 90 seconds · 5-ish questions</small>
        <strong>Give me the useful plan.</strong>
        <p>Project, job, reader, stage, and what already exists. We make a sensible working plan and show the assumptions.</p>
        <em>Start the quick plan <span aria-hidden="true">↗</span></em>
      </button>
      <button type="button" data-deck-ride="deep" class="ride-card ride-card--deep">
        <span class="ride-number">02</span><small>About 4 minutes · 12-ish questions</small>
        <strong>Take me through it properly.</strong>
        <p>With your consent: role, route, exact request, audience shape, delivery, reuse, boundaries, and the clock. Still no blank boxes.</p>
        <em>Take the deeper ride <span aria-hidden="true">↗</span></em>
      </button>
    </div>
    <p class="ride-truth">Both journeys use the same deterministic Film & TV engine. The deep ride earns a more conditional answer because it knows more facts—not because it performs more ceremony.</p>
  </section>`;
}

function flowProgress(step: number, total: number, name: string): string {
  const value = Math.max(1, Math.min(total, step + 1));
  return `<div class="flow-progress" aria-label="${name}: step ${value} of ${total}">
    <span>${name}</span><strong>Step ${value} of ${total}</strong>
    <div class="progress-track"><i style="--progress:${(value / total) * 100}%"></i></div>
  </div>`;
}

function answerList(choices: Choice<string>[], prefix: string, selected?: string): string {
  return `<div class="answer-list">${choices.map((choice, index) => `
    <button class="answer-row" type="button" data-${prefix}-choice="${choice.value}" aria-pressed="${choice.value === selected}">
      <span class="answer-number">${String(index + 1).padStart(2, "0")}</span>
      <span class="answer-copy"><strong>${choice.label}</strong><small>${choice.detail}</small></span>
      <span class="answer-arrow" aria-hidden="true">↗</span>
    </button>`).join("")}</div>`;
}

function deckPage(): string {
  if (!state.deckRide && !state.deckPlan) return deckLanding();
  if (state.deckPlan) return deckResultPage();
  const steps = deckSteps();
  const step = steps[Math.min(state.deckStep, steps.length - 1)]!;
  const selected = (state.deck as unknown as Record<string, string | undefined>)[step.key];
  const selectedMany = step.key === "boundaries" ? state.deck.boundaries ?? [] : [];
  return `<section class="flow-page flow-page--deck">
    ${flowProgress(state.deckStep, steps.length, "Film & TV deck planner")}
    <div class="flow-layout">
      <div class="flow-question">
        <div class="flow-art" data-tilt="1.8" aria-hidden="true"><img src="/assets/visual-family-v2/deck-bones-v2.webp" alt=""></div>
        <button class="back-home flow-back" type="button" id="deck-back">← ${state.deckStep ? "Previous question" : "Choose a different ride"}</button>
        <p class="scope-tag">Deck Bones · ${state.deckRide === "deep" ? "Deep diagnostic" : "Quick plan"} · scripted features & series only</p>
        <p class="kicker">${step.kicker}</p>
        <h1 tabindex="-1">${step.question}</h1>
        <p>${step.note}</p>
        <div class="paper-spine" aria-hidden="true">${steps.map((_, index) => `<i class="${index < state.deckStep ? "is-done" : index === state.deckStep ? "is-now" : ""}"></i>`).join("")}</div>
      </div>
      <div class="flow-answers">${step.multiple ? `<div class="answer-list answer-list--multi">${step.choices.map((choice, index) => `<button class="answer-row" type="button" data-deck-multi="${choice.value}" aria-pressed="${selectedMany.includes(choice.value as DeckBoundary)}"><span class="answer-number">${String(index + 1).padStart(2, "0")}</span><span class="answer-copy"><strong>${choice.label}</strong><small>${choice.detail}</small></span><span class="answer-check" aria-hidden="true">✓</span></button>`).join("")}</div><button class="primary-action multi-continue" id="deck-multi-continue" type="button">Keep going <span aria-hidden="true">↗</span></button>` : answerList(step.choices, "deck", selected)}</div>
    </div>
  </section>`;
}

function deckResultPage(): string {
  const plan = state.deckPlan!;
  const sections = plan.sections;
  return `<section class="result-page result-page--deck">
    <div class="result-hero">
      <div class="result-art" data-tilt="1.6" aria-hidden="true"><img src="/assets/visual-family-v2/deck-bones-v2.webp" alt=""></div>
      <button class="back-home" type="button" data-route="home">← All four tools</button>
      <p class="scope-tag">Your Film & TV deck plan · ${state.deckRide === "deep" ? "deep diagnostic" : "quick plan"}</p>
      <h1 tabindex="-1">${escapeHTML(plan.headline)}</h1>
      <p>${escapeHTML(plan.intro)}</p>
      <div class="result-actions">
        <button class="primary-action" id="deck-download" type="button">${sections.length ? "Download the plan" : "Download this advice"} <span aria-hidden="true">↓</span></button>
        <button class="text-action" id="deck-restart" type="button">Change answers</button>
      </div>
    </div>
    ${sections.length ? `<section class="deck-wall" aria-labelledby="deck-wall-title">
      <div class="deck-wall-head">
        <div class="section-heading"><p class="kicker">The pages</p><h2 id="deck-wall-title">Every page gets one job.</h2><p>Swipe or scroll sideways. The deck stays a deck—not a vertical tax return.</p></div>
        <div class="deck-rail-controls" aria-label="Move through deck pages"><button id="deck-prev" type="button" disabled><span aria-hidden="true">←</span> Previous</button><span id="deck-position" aria-live="polite">1 / ${sections.length}</span><button id="deck-next" type="button">Next <span aria-hidden="true">→</span></button></div>
      </div>
      <div class="slide-grid" id="deck-rail" tabindex="0" aria-label="Deck pages">${sections.map((section, index) => {
        const stateLabel = section.materialState === "reuse" ? "Use what you have" : section.materialState === "revise" ? "Revise" : section.materialState === "check-first" ? "Check first" : "Build";
        return `<article class="deck-slide deck-slide--${index % 4}" data-deck-slide="${index}"><span class="deck-slide__count">${String(index + 1).padStart(2, "0")}</span><small>${stateLabel}</small><h3>${sectionName(section.sectionId)}</h3><p>${sectionJob(section.sectionId)}</p><i aria-hidden="true"></i></article>`;
      }).join("")}</div>
    </section>` : `<section class="pre-deck"><p class="kicker">Your next move</p><h2>${plan.headline === "Do not invent the money slide." ? "Use the real requirements." : plan.raw.outcome.kind === "rehearsal" ? "Stop adding. Rehearse." : "Do this before the deck."}</h2><p class="pre-deck__action">${escapeHTML(plan.preDeckAction ?? "Complete the next piece of work, then return to the deck.")}</p><p class="pre-deck__reason">${escapeHTML(plan.reasons[0] ?? "One smaller piece of work will create more value first.")}</p></section>`}
    <section class="result-details">
      <details><summary>Why this plan?</summary><ul>${plan.reasons.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul></details>
      <details><summary>Maybe later${plan.optionalSections.length ? ` (${plan.optionalSections.length})` : ""}</summary>${plan.optionalSections.length ? `<p>These pages may help later. They are not part of the core version above.</p><ul>${plan.optionalSections.map((section) => `<li><strong>${sectionName(section.sectionId)}:</strong> ${sectionJob(section.sectionId)}</li>`).join("")}</ul>` : "<p>No spare pages are waiting in the wings. Lovely.</p>"}</details>
      <details><summary>What should stay out?</summary><ul>${plan.leaveOut.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul></details>
    </section>
  </section>`;
}

function nextSteps(): FlowStep<string>[] {
  return [
    { key: "lane", kicker: "The work", question: "What kind of deck is this?", note: "This tool works beyond Film & TV. Pick the nearest world.", choices: BROAD_LANES },
    { key: "situation", kicker: "Right now", question: "Where are you in the process?", note: "No backstory. No deck séance. Just the live situation.", choices: SITUATIONS },
    { key: "move", kicker: "The decision", question: "What do you need to happen next?", note: "Not the grand dream. The next bounded thing a real person could do.", choices: DESIRED_MOVES },
    { key: "delivery", kicker: "The encounter", question: "How will people meet the material?", note: "A room, a file, or both changes what the next useful move should protect.", choices: BROAD_DELIVERIES },
  ];
}

function nextPage(): string {
  if (state.nextAdvice) return nextResultPage();
  const steps = nextSteps();
  const step = steps[Math.min(state.nextStep, steps.length - 1)]!;
  const selected = (state.next as unknown as Record<string, string | undefined>)[step.key];
  return `<section class="flow-page flow-page--next">
    ${flowProgress(state.nextStep, steps.length, "Find the next move")}
    <div class="flow-layout">
      <div class="flow-question">
        <div class="flow-art" data-tilt="1.8" aria-hidden="true"><img src="/assets/visual-family-v2/you-are-here-v2.webp" alt=""></div>
        <button class="back-home flow-back" type="button" id="next-back">← ${state.nextStep ? "Previous question" : "All four tools"}</button>
        <p class="scope-tag">You Are Here! · Film, ads, startups & more</p>
        <p class="kicker">${step.kicker}</p>
        <h1 tabindex="-1">${step.question}</h1>
        <p>${step.note}</p>
        <div class="route-doodle" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      </div>
      <div class="flow-answers">${answerList(step.choices, "next", selected)}</div>
    </div>
  </section>`;
}

function nextResultPage(): string {
  const advice = state.nextAdvice!;
  return `<section class="result-page result-page--next">
    <div class="result-hero">
      <div class="result-art" data-tilt="1.6" aria-hidden="true"><img src="/assets/visual-family-v2/you-are-here-v2.webp" alt=""></div>
      <button class="back-home" type="button" data-route="home">← All four tools</button>
      <p class="scope-tag">${advice.eyebrow}</p>
      <h1 tabindex="-1">${advice.headline}</h1>
      <p>${advice.body}</p>
      <div class="next-list"><h2>Do this now</h2><ol>${advice.doNow.map((item) => `<li>${item}</li>`).join("")}</ol></div>
      <div class="not-list"><strong>Not now:</strong> ${advice.doNot.join(" ")}</div>
      <div class="result-actions">${advice.nextTool ? `<button class="primary-action" type="button" data-route="${advice.nextTool}">${advice.nextToolLabel} <span aria-hidden="true">↗</span></button>` : ""}<button class="text-action" id="next-restart" type="button">Try another situation</button></div>
    </div>
  </section>`;
}

const WORD_CATEGORIES = [
  { id: "start", label: "Start here", detail: "The small set that makes the rest of the work easier." },
  { id: "documents", label: "Documents", detail: "What people mean by deck, bible, treatment, lookbook, and their unruly cousins." },
  { id: "story", label: "Story & structure", detail: "The moving parts of Film & TV ideas and arguments." },
  { id: "people", label: "People & decisions", detail: "Who decides, how material travels, and what the next move really is." },
  { id: "pages", label: "Pages & slides", detail: "What one page must do and how people physically meet it." },
  { id: "proof", label: "Proof & claims", detail: "Evidence, sources, rights, money, and the limits of confident typography." },
  { id: "process", label: "Process & boundaries", detail: "Requirements, reuse, labour, uncertainty, and where a person must decide." },
] as const;

const START_TERMS = new Set(["next-decision", "recipient", "audience", "artefact", "deck", "pitch-deck", "page-job", "section-job", "result-footing"]);
const DOCUMENT_TERMS = new Set(["artefact", "deck", "one-pager", "pitch-deck", "finance-deck", "lookbook", "treatment", "directors-treatment", "pitch-bible", "production-bible", "appendix"]);
const STORY_TERMS = new Set(["pilot", "logline", "tagline", "synopsis", "series-engine", "limited-series", "season-arc", "episode-examples", "episode-list", "theme", "protect-this"]);
const PEOPLE_TERMS = new Set(["next-decision", "big-goal", "recipient", "audience", "access-route", "reader-question", "recipient-doubt", "attachment"]);
const PAGE_TERMS = new Set(["page-job", "section-job", "delivery-mode", "live-deck", "read-alone-deck", "dual-use", "reference-slide", "copy-band", "preview-fit", "type-pressure", "channel-competition", "split-source", "mechanical-split", "rewritten-copy"]);
const PROOF_TERMS = new Set(["current-requirement", "source-freshness", "image-provenance", "visual-reference", "finance-deck", "specialist-first", "convention"]);

function categoryForTerm(id: string): string {
  if (START_TERMS.has(id)) return "start";
  if (DOCUMENT_TERMS.has(id)) return "documents";
  if (STORY_TERMS.has(id)) return "story";
  if (PEOPLE_TERMS.has(id)) return "people";
  if (PAGE_TERMS.has(id)) return "pages";
  if (PROOF_TERMS.has(id)) return "proof";
  return "process";
}

function visibleDictionaryTerms() {
  const searched = state.dictionaryQuery ? searchTerms(state.dictionaryQuery, undefined, 80) : [...DICTIONARY_TERMS];
  if (state.dictionaryQuery) return searched;
  return searched.filter((term) => categoryForTerm(term.id) === state.dictionaryCategory);
}

function wordsResults(): string {
  const terms = visibleDictionaryTerms();
  if (!terms.length) return `<div class="word-empty"><strong>No jargon found.</strong><p>Try the job, document, person, or doubt—not necessarily the word somebody used in the meeting.</p></div>`;
  return `<div class="word-index">${terms.map((term, index) => `<button type="button" class="word-row" data-word-term="${term.id}"><span>${String(index + 1).padStart(2, "0")}</span><strong>${escapeHTML(term.label)}</strong><p>${escapeHTML(PLAIN_OVERRIDES[term.id]?.plain ?? term.plain)}</p><i aria-hidden="true">↗</i></button>`).join("")}</div>`;
}

function wordTermDetail(id: string): string {
  const term = getTerm(id);
  if (!term) return "";
  const copy = PLAIN_OVERRIDES[id];
  const lensNames: Record<string, string> = { you_are_here: "You Are Here!", deck_bones: "Deck Bones.", one_slide_or_three: "Slide Check." };
  const related = [...new Set([...term.oftenConfusedWith, ...term.related])].map((termId) => getTerm(termId)).filter(Boolean);
  return `<aside class="word-sheet" aria-labelledby="word-sheet-title">
    <button class="word-sheet__close" id="word-sheet-close" type="button">Close <span aria-hidden="true">×</span></button>
    <p class="kicker">Pitch Dictionary · ${escapeHTML(categoryForTerm(term.id))}</p>
    <h2 id="word-sheet-title">${escapeHTML(term.label)}</h2>
    <p class="word-sheet__plain">${escapeHTML(copy?.plain ?? term.plain)}</p>
    <dl class="word-sheet__facts"><div><dt>Why it matters</dt><dd>${escapeHTML(copy?.why ?? term.whyItMatters)}</dd></div><div><dt>What it changes</dt><dd>${escapeHTML(copy?.changes ?? term.changes)}</dd></div></dl>
    ${Object.entries(term.lenses).length ? `<section class="word-lenses"><p class="kicker">The word changes clothes</p><h3>Inside the other tools</h3>${Object.entries(term.lenses).map(([tool, lens]) => `<div><strong>${lensNames[tool] ?? tool}</strong><p>${escapeHTML(lens ?? "")}</p></div>`).join("")}</section>` : ""}
    ${related.length ? `<section class="word-relations"><p class="kicker">Follow the thread</p>${related.map((item) => item ? `<button type="button" data-word-term="${item.id}">${escapeHTML(item.label)} <span aria-hidden="true">↗</span></button>` : "").join("")}</section>` : ""}
  </aside>`;
}

function wordsPage(): string {
  const mapTerms = DICTIONARY_TERMS.filter((term) => START_TERMS.has(term.id) || PAGE_TERMS.has(term.id)).slice(0, 22);
  const activeCategory = WORD_CATEGORIES.find((category) => category.id === state.dictionaryCategory) ?? WORD_CATEGORIES[0];
  return `<section class="words-page">
    <div class="words-hero">
      <div class="words-hero-art" aria-hidden="true"><img src="/assets/visual-family-v2/pitch-dictionary-v2.webp" alt=""></div>
      <button class="back-home" type="button" data-route="home">← All four tools</button>
      <p class="scope-tag">Pitch Dictionary · ${DICTIONARY_TERMS.length} terms · no smoke machine</p>
      <h1 tabindex="-1">Words should help.<br>Wild concept.</h1>
      <p class="tool-lede">Plain meaning, useful context, and the argument hiding underneath the jargon.</p>
      <label class="word-search" for="word-search"><span>What word is getting in the way?</span><input id="word-search" type="search" value="${escapeHTML(state.dictionaryQuery)}" placeholder="Try: series engine, comps, leave-behind…"><i aria-hidden="true">⌕</i></label>
    </div>
    <div class="word-orbit" aria-hidden="true">${mapTerms.map((term, index) => `<span style="--i:${index};--n:${mapTerms.length}" data-orbit-word>${escapeHTML(term.label)}</span>`).join("")}<strong>?</strong></div>
    <section class="word-browser" aria-labelledby="word-browser-title">
      <div class="word-browser__head"><div><p class="kicker">Browse by the thing you are trying to understand</p><h2 id="word-browser-title">${state.dictionaryQuery ? "Search results" : activeCategory.label}</h2><p>${state.dictionaryQuery ? "Matching labels, aliases, and plain definitions." : activeCategory.detail}</p></div><span>${visibleDictionaryTerms().length} ${visibleDictionaryTerms().length === 1 ? "term" : "terms"}</span></div>
      <div class="word-categories" aria-label="Dictionary categories">${WORD_CATEGORIES.map((category) => `<button type="button" data-word-category="${category.id}" aria-pressed="${!state.dictionaryQuery && category.id === state.dictionaryCategory}">${category.label}</button>`).join("")}</div>
      <div id="word-results">${wordsResults()}</div>
    </section>
    ${state.selectedTermId ? wordTermDetail(state.selectedTermId) : ""}
  </section>`;
}

function planPage(): string {
  const any = state.deckPlan || state.nextAdvice || state.slideResult || state.quickResult;
  if (!any) return `<section class="empty-plan"><button class="back-home" type="button" data-route="home">← All four tools</button><h1 tabindex="-1">Nothing to carry yet.</h1><p>Use one tool. Get one useful answer. Then it will appear here.</p></section>`;
  const slide = currentSlideResult();
  const carryQuick = Boolean(slide && state.quickResult && slide === state.quickResult);
  return `<section class="plan-page">
    <button class="back-home" type="button" data-route="home">← All four tools</button>
    <p class="kicker">Your work</p><h1 tabindex="-1">The useful bits.<br><span>Nothing ceremonial.</span></h1>
    <p class="plan-intro">Open any answer to continue or change it. Nothing is sealed in amber.</p>
    <div class="plan-stack">
      ${state.nextAdvice ? `<button class="plan-card plan-card--next" type="button" data-route="next"><span class="plan-art" aria-hidden="true"><img src="/assets/visual-family-v2/you-are-here-v2.webp" alt=""></span><small>Next move</small><h2>${state.nextAdvice.headline}</h2><p>${state.nextAdvice.body}</p><span>Open this answer ↗</span></button>` : ""}
      ${state.deckPlan ? `<button class="plan-card plan-card--deck" type="button" data-route="deck"><span class="plan-art" aria-hidden="true"><img src="/assets/visual-family-v2/deck-bones-v2.webp" alt=""></span><small>Film & TV deck plan</small><h2>${escapeHTML(state.deckPlan.headline)}</h2><p>${state.deckPlan.sections.length ? `${state.deckPlan.sections.length} page jobs in this version.` : "One thing to do before building the deck."}</p><span>Open this answer ↗</span></button>` : ""}
      ${slide ? `<button class="plan-card plan-card--slide" type="button" data-route="slide" ${carryQuick ? "data-carry-quick" : ""}><span class="plan-art" aria-hidden="true"><img src="/assets/visual-family-v2/slide-check-v2.webp" alt=""></span><small>Slide check</small><h2>${slide.headline}</h2><p>${slide.body}</p><span>Open this answer ↗</span></button>` : ""}
    </div>
    <div class="result-actions"><button class="primary-action" id="plan-download" type="button">Download everything <span aria-hidden="true">↓</span></button><button class="text-action" id="plan-copy" type="button">Copy summary</button></div>
  </section>`;
}

function dictionaryDrawer(): string {
  if (!state.dictionaryOpen) return "";
  return `<div class="drawer-scrim" id="dictionary-scrim"><aside class="dictionary-drawer" role="dialog" aria-modal="true" aria-labelledby="dictionary-title" aria-describedby="dictionary-description">
    <header><div><p class="kicker">Words for the road</p><h2 id="dictionary-title">Plain English, right here.</h2><p id="dictionary-description">Clear the doubt. Keep your place.</p></div><button id="dictionary-close" type="button" aria-label="Close plain-English help">×</button></header>
    ${state.selectedTermId ? dictionaryTerm(state.selectedTermId) : `<label for="dictionary-search">What word is getting in the way?</label><input id="dictionary-search" type="search" value="${escapeHTML(state.dictionaryQuery)}" placeholder="Try: logline, comps, appendix…"><div id="dictionary-results">${dictionaryResults()}</div>`}
    <button class="drawer-to-dictionary" type="button" data-route="words">Explore all ${DICTIONARY_TERMS.length} words <span aria-hidden="true">↗</span></button>
  </aside></div>`;
}

function dictionaryResults(): string {
  const common = ["pitch-deck", "page-job", "logline", "comps", "dual-use", "appendix"];
  const terms = state.dictionaryQuery ? searchTerms(state.dictionaryQuery, undefined, 12) : common.map((id) => getTerm(id)).filter(Boolean);
  if (!terms.length) return `<p class="dictionary-empty">No match. Try the job the page is doing, not the fashionable noun.</p>`;
  return `<div class="dictionary-list">${terms.map((term) => term ? `<button type="button" data-term="${term.id}"><strong>${term.label}</strong><span>${PLAIN_OVERRIDES[term.id]?.plain ?? term.plain}</span></button>` : "").join("")}</div>`;
}

function dictionaryTerm(id: string): string {
  const term = getTerm(id);
  if (!term) return "";
  const copy = PLAIN_OVERRIDES[id];
  return `<article class="term-card"><button class="term-back" id="term-back" type="button">← All words</button><h3>${term.label}</h3><p class="term-plain">${copy?.plain ?? term.plain}</p><dl><div><dt>Why it matters</dt><dd>${copy?.why ?? term.whyItMatters}</dd></div><div><dt>What it changes</dt><dd>${copy?.changes ?? term.changes}</dd></div></dl></article>`;
}

function attachGlobalEvents(): void {
  document.querySelectorAll<HTMLElement>("[data-route]").forEach((element) => element.addEventListener("click", () => {
    const carriesQuick = element.hasAttribute("data-carry-quick");
    if (carriesQuick) {
      state.slide = { ...state.quick };
      state.slideResult = state.quickResult;
    }
    state.dictionaryOpen = false;
    state.selectedTermId = undefined;
    navigate(element.dataset.route as Route, carriesQuick ? ".slide-controls" : undefined);
  }));
  document.querySelector("#theme-toggle")?.addEventListener("click", toggleTheme);
  document.querySelector("#dictionary-open")?.addEventListener("click", () => refresh(() => { state.dictionaryOpen = true; state.selectedTermId = undefined; }, "drawer"));
}

function toggleTheme(): void {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  paintTheme(next, "manual");
  const button = document.querySelector<HTMLButtonElement>("#theme-toggle");
  button?.setAttribute("aria-label", `Switch to ${next === "dark" ? "light" : "dark"} theme`);
  button?.setAttribute("title", `Switch to ${next === "dark" ? "light" : "dark"} theme`);
  try { localStorage.setItem("htt.theme", next); } catch (_) {}
  announce(`${next === "dark" ? "Dark" : "Light"} theme.`);
}

function attachHomeEvents(): void {
  attachScrollTheatre();
}

function attachSlideEvents(): void {
  const copyInput = document.querySelector<HTMLTextAreaElement>("#slide-copy");
  const titleInput = document.querySelector<HTMLInputElement>("#slide-title");
  const jobInput = document.querySelector<HTMLSelectElement>("#slide-job");
  const viewportInput = document.querySelector<HTMLSelectElement>("#slide-viewport");
  const timeInput = document.querySelector<HTMLSelectElement>("#slide-time");
  const craftInput = document.querySelector<HTMLInputElement>("#slide-craft");
  copyInput?.addEventListener("input", () => {
    clearInputError(copyInput);
    state.slide.copy = copyInput.value;
    markSlideDirty(".slide-stage", copyInput.value);
    state.slideResult = undefined;
    saveState();
  });
  titleInput?.addEventListener("input", () => { state.slide.title = titleInput.value; state.slideResult = undefined; saveState(); });
  jobInput?.addEventListener("change", () => { state.slide.job = jobInput.value as SlideDraft["job"]; state.slideResult = undefined; saveState(); });
  viewportInput?.addEventListener("change", () => { state.slide.viewport = viewportInput.value as SlideViewport; state.slideResult = undefined; saveState(); });
  timeInput?.addEventListener("change", () => { state.slide.time = timeInput.value as SlideTime; state.slideResult = undefined; saveState(); });
  craftInput?.addEventListener("change", () => { state.slide.craft = craftInput.checked; state.slideResult = undefined; saveState(); });
  document.querySelectorAll<HTMLButtonElement>("[data-slide-mode]").forEach((button) => button.addEventListener("click", () => refresh(() => {
    state.slide.copy = copyInput?.value ?? state.slide.copy;
    state.slide.title = titleInput?.value ?? state.slide.title;
    state.slide.mode = button.dataset.slideMode as SlideDraft["mode"];
    state.slideResult = undefined;
  })));
  document.querySelector("#slide-submit")?.addEventListener("click", async () => {
    const copyInput = document.querySelector<HTMLTextAreaElement>("#slide-copy");
    const titleInput = document.querySelector<HTMLInputElement>("#slide-title");
    const copy = copyInput?.value.trim() ?? "";
    if (!copy) { if (copyInput) showInputError(copyInput, "Paste the visible slide copy first."); return; }
    const submit = document.querySelector<HTMLButtonElement>("#slide-submit");
    if (submit) { submit.disabled = true; submit.textContent = "Measuring the real 16:9 page…"; }
    state.slide.copy = copy;
    state.slide.title = titleInput?.value.trim() ?? "";
    state.slide.job = (jobInput?.value ?? "statement") as SlideDraft["job"];
    state.slide.viewport = (viewportInput?.value ?? "laptop") as SlideViewport;
    state.slide.time = (timeInput?.value ?? "ten") as SlideTime;
    state.slide.craft = craftInput?.checked ?? false;
    try {
      const preview = await measureSlide(state.slide.title, copy);
      change(() => {
        state.slideResult = buildSlideResult(state.slide, preview);
        state.lastSlideOrigin = "full";
      }, "keep", ".slide-stage .slide-verdict");
      announce(state.slideResult?.headline ?? "Slide checked.");
    } catch {
      if (submit) { submit.disabled = false; submit.innerHTML = 'Try the check again <span aria-hidden="true">↗</span>'; }
      if (copyInput) showInputError(copyInput, "The preview missed its cue. Your copy is safe—try once more.");
    }
  });
}

function attachDeckEvents(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-deck-ride]").forEach((button) => button.addEventListener("click", () => change(() => {
    const ride = button.dataset.deckRide as DeckRide;
    state.deckRide = ride;
    state.deck = { ride, boundaries: [] };
    state.deckStep = 0;
    state.deckPlan = undefined;
  })));
  document.querySelector("#deck-back")?.addEventListener("click", () => {
    if (state.deckStep === 0) change(() => { state.deckRide = undefined; state.deck = { boundaries: [] }; state.deckPlan = undefined; });
    else change(() => { state.deckStep -= 1; state.deckPlan = undefined; });
  });
  document.querySelectorAll<HTMLButtonElement>("[data-deck-choice]").forEach((button) => button.addEventListener("click", () => {
    const steps = deckSteps();
    const step = steps[state.deckStep]!;
    const value = button.dataset.deckChoice!;
    change(() => {
      if (step.key === "format") state.deck.format = value as DeckFormat;
      if (step.key === "goal") state.deck.goal = value as DeckGoal;
      if (step.key === "specificAsk") state.deck.specificAsk = value as SpecificAsk;
      if (step.key === "recipient") state.deck.recipient = value as DeckRecipient;
      if (step.key === "delivery") state.deck.delivery = value as DeckDelivery;
      if (step.key === "stage") state.deck.stage = value as DeckStage;
      if (step.key === "materials") state.deck.materials = value as DeckMaterials;
      if (step.key === "role") state.deck.role = value as DeckRole;
      if (step.key === "recipientShape") state.deck.recipientShape = value as RecipientShape;
      if (step.key === "access") state.deck.access = value as AccessRouteChoice;
      if (step.key === "requirementStatus") state.deck.requirementStatus = value as RequirementStatusChoice;
      if (step.key === "deadline") state.deck.deadline = value as DeadlineBand;
      const updatedSteps = deckSteps();
      if (state.deckStep >= updatedSteps.length - 1) {
        if (state.deckRide === "quick") {
          state.deck.delivery = state.deck.goal === "meeting" ? "live" : state.deck.goal === "team" ? "internal" : "read";
          state.deck.recipientShape = "one";
          state.deck.requirementStatus = state.deck.goal === "specific" ? "current" : "none";
          state.deck.boundaries = [];
        }
        state.deckPlan = buildDeckPlan(state.deck);
      }
      else state.deckStep += 1;
    });
  }));
  document.querySelectorAll<HTMLButtonElement>("[data-deck-multi]").forEach((button) => button.addEventListener("click", () => refresh(() => {
    const value = button.dataset.deckMulti as DeckBoundary;
    const selected = new Set(state.deck.boundaries ?? []);
    if (value === "ordinary") {
      selected.clear();
      if (button.getAttribute("aria-pressed") !== "true") selected.add("ordinary");
    } else {
      selected.delete("ordinary");
      if (selected.has(value)) selected.delete(value); else selected.add(value);
    }
    state.deck.boundaries = [...selected];
  })));
  document.querySelector("#deck-multi-continue")?.addEventListener("click", () => change(() => {
    if (!(state.deck.boundaries ?? []).length) state.deck.boundaries = ["ordinary"];
    state.deckStep += 1;
  }));
  document.querySelector("#deck-restart")?.addEventListener("click", () => change(() => {
    state.deckPlan = undefined;
    state.deckStep = Math.max(0, deckSteps().length - 1);
  }));
  document.querySelector("#deck-download")?.addEventListener("click", () => {
    const hasPages = Boolean(state.deckPlan?.sections.length);
    download(hasPages ? "heres-the-thing-film-tv-deck-plan.md" : "heres-the-thing-film-tv-deck-advice.md", deckMarkdown(), hasPages ? "Plan downloaded." : "Advice downloaded.");
  });
  attachDeckRail();
}

function attachDeckRail(): void {
  const rail = document.querySelector<HTMLElement>("#deck-rail");
  const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-deck-slide]"));
  const previous = document.querySelector<HTMLButtonElement>("#deck-prev");
  const next = document.querySelector<HTMLButtonElement>("#deck-next");
  const position = document.querySelector<HTMLElement>("#deck-position");
  if (!rail || !cards.length || !previous || !next || !position) return;
  let current = 0;
  let frame = 0;
  const firstOffset = cards[0]!.offsetLeft;
  const paintControls = () => {
    position.textContent = `${current + 1} / ${cards.length}`;
    previous.disabled = current === 0;
    next.disabled = current === cards.length - 1;
  };
  const update = () => {
    current = cards.reduce((closest, card, index) => Math.abs((card.offsetLeft - firstOffset) - rail.scrollLeft) < Math.abs((cards[closest]!.offsetLeft - firstOffset) - rail.scrollLeft) ? index : closest, 0);
    paintControls();
  };
  const move = (direction: -1 | 1) => {
    const target = Math.max(0, Math.min(cards.length - 1, current + direction));
    rail.scrollTo({ left: cards[target]!.offsetLeft - firstOffset, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    current = target;
    paintControls();
  };
  previous.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));
  rail.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
    if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
  });
  rail.addEventListener("scroll", () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(update);
  }, { passive: true });
  update();
}

function attachNextEvents(): void {
  document.querySelector("#next-back")?.addEventListener("click", () => {
    if (state.nextStep === 0) navigate("home");
    else change(() => { state.nextStep -= 1; state.nextAdvice = undefined; });
  });
  document.querySelectorAll<HTMLButtonElement>("[data-next-choice]").forEach((button) => button.addEventListener("click", () => {
    const step = nextSteps()[state.nextStep]!;
    const value = button.dataset.nextChoice!;
    change(() => {
      (state.next as unknown as Record<string, string | undefined>)[step.key] = value;
      if (state.nextStep >= nextSteps().length - 1) state.nextAdvice = buildNextAdvice(state.next);
      else state.nextStep += 1;
    });
  }));
  document.querySelector("#next-restart")?.addEventListener("click", () => change(() => {
    state.nextAdvice = undefined;
    state.nextStep = Math.max(0, nextSteps().length - 1);
  }));
}

function attachWordsEvents(): void {
  const bindTerms = () => document.querySelectorAll<HTMLButtonElement>("[data-word-term]").forEach((button) => button.addEventListener("click", () => refresh(() => {
    state.selectedTermId = button.dataset.wordTerm;
  })));
  bindTerms();
  document.querySelector("#word-sheet-close")?.addEventListener("click", () => refresh(() => { state.selectedTermId = undefined; }));
  document.querySelectorAll<HTMLButtonElement>("[data-word-category]").forEach((button) => button.addEventListener("click", () => refresh(() => {
    state.dictionaryQuery = "";
    state.dictionaryCategory = button.dataset.wordCategory ?? "start";
    state.selectedTermId = undefined;
  })));
  const search = document.querySelector<HTMLInputElement>("#word-search");
  search?.addEventListener("input", () => {
    state.dictionaryQuery = search.value;
    state.selectedTermId = undefined;
    saveState();
    const results = document.querySelector<HTMLElement>("#word-results");
    if (results) results.innerHTML = wordsResults();
    const count = document.querySelector<HTMLElement>(".word-browser__head > span");
    if (count) {
      const total = visibleDictionaryTerms().length;
      count.textContent = `${total} ${total === 1 ? "term" : "terms"}`;
    }
    bindTerms();
  });
  if (matchMedia("(hover: hover) and (pointer: fine)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const orbit = document.querySelector<HTMLElement>(".word-orbit");
    orbit?.addEventListener("pointermove", (event) => {
      const bounds = orbit.getBoundingClientRect();
      orbit.style.setProperty("--orbit-x", `${((event.clientX - bounds.left) / bounds.width - 0.5).toFixed(3)}`);
      orbit.style.setProperty("--orbit-y", `${((event.clientY - bounds.top) / bounds.height - 0.5).toFixed(3)}`);
    }, { passive: true });
  }
}

function attachScrollTheatre(): void {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-scroll-card]"));
  if (!cards.length) return;
  let frame = 0;
  const paint = () => {
    frame = 0;
    const middle = innerHeight / 2;
    for (const card of cards) {
      const bounds = card.getBoundingClientRect();
      const progress = Math.max(-1, Math.min(1, (bounds.top + bounds.height / 2 - middle) / innerHeight));
      card.style.setProperty("--scroll-y", `${(-progress * 18).toFixed(2)}px`);
      card.style.setProperty("--scroll-r", `${(progress * 0.85).toFixed(2)}deg`);
      card.style.setProperty("--scroll-p", Math.abs(progress).toFixed(3));
    }
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };
  window.addEventListener("scroll", schedule, { passive: true, once: false });
  paint();
}

function attachPlanEvents(): void {
  document.querySelector("#plan-download")?.addEventListener("click", () => download("heres-the-thing-plan.md", fullPlanMarkdown()));
  document.querySelector("#plan-copy")?.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(fullPlanMarkdown()); announce("Plan copied."); }
    catch { announce("Copy was blocked. Download the plan instead."); }
  });
}

function attachDictionaryEvents(): void {
  document.querySelector("#dictionary-close")?.addEventListener("click", closeDictionary);
  document.querySelector("#dictionary-scrim")?.addEventListener("click", (event) => { if (event.target === event.currentTarget) closeDictionary(); });
  document.querySelector("#term-back")?.addEventListener("click", () => refresh(() => { state.selectedTermId = undefined; }, "drawer"));
  document.querySelectorAll<HTMLButtonElement>("[data-term]").forEach((button) => button.addEventListener("click", () => refresh(() => { state.selectedTermId = button.dataset.term; }, "drawer")));
  document.querySelector<HTMLInputElement>("#dictionary-search")?.addEventListener("input", (event) => {
    state.dictionaryQuery = (event.currentTarget as HTMLInputElement).value;
    const results = document.querySelector("#dictionary-results");
    if (results) {
      results.innerHTML = dictionaryResults();
      results.querySelectorAll<HTMLButtonElement>("[data-term]").forEach((button) => button.addEventListener("click", () => refresh(() => { state.selectedTermId = button.dataset.term; }, "drawer")));
    }
  });
}

function closeDictionary(): void {
  if (!state.dictionaryOpen) return;
  const scrim = document.querySelector<HTMLElement>("#dictionary-scrim");
  const drawer = document.querySelector<HTMLElement>(".dictionary-drawer");
  const finish = () => {
    refresh(() => { state.dictionaryOpen = false; state.selectedTermId = undefined; });
    requestAnimationFrame(() => document.querySelector<HTMLElement>("#dictionary-open")?.focus());
  };
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !scrim || !drawer) {
    finish();
    return;
  }
  scrim.classList.add("is-closing");
  drawer.classList.add("is-closing");
  window.setTimeout(finish, 210);
}

function attachFlourishes(): void {
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  document.querySelectorAll<HTMLElement>("[data-tilt]").forEach((element) => {
    const strength = Number(element.dataset.tilt || 2);
    let frame = 0;
    element.addEventListener("pointermove", (event) => {
      const bounds = element.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        element.style.setProperty("--tilt-x", `${(-y * strength).toFixed(2)}deg`);
        element.style.setProperty("--tilt-y", `${(x * strength).toFixed(2)}deg`);
        element.style.setProperty("--light-x", `${((x + 0.5) * 100).toFixed(1)}%`);
        element.style.setProperty("--light-y", `${((y + 0.5) * 100).toFixed(1)}%`);
      });
    }, { passive: true });
    element.addEventListener("pointerleave", () => {
      cancelAnimationFrame(frame);
      element.style.setProperty("--tilt-x", "0deg");
      element.style.setProperty("--tilt-y", "0deg");
      element.style.setProperty("--light-x", "50%");
      element.style.setProperty("--light-y", "50%");
    });
  });
}

function initialiseThread(): void {
  if (!threadCanvas || !matchMedia("(hover: hover) and (pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const context = threadCanvas.getContext("2d");
  if (!context) return;
  const points = Array.from({ length: 24 }, () => ({ x: 0, y: 0 }));
  const target = { x: 0, y: 0 };
  let initialised = false;
  let frame = 0;
  let quietFrames = 0;

  const size = () => {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    threadCanvas.width = Math.round(innerWidth * ratio);
    threadCanvas.height = Math.round(innerHeight * ratio);
    threadCanvas.style.width = `${innerWidth}px`;
    threadCanvas.style.height = `${innerHeight}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const paint = () => {
    frame = 0;
    if (!initialised || !["home", "plan"].includes(document.body.dataset.route ?? "")) {
      context.clearRect(0, 0, innerWidth, innerHeight);
      return;
    }
    let movement = 0;
    points[0]!.x += (target.x - points[0]!.x) * 0.38;
    points[0]!.y += (target.y - points[0]!.y) * 0.38;
    for (let index = 1; index < points.length; index += 1) {
      const point = points[index]!;
      const leader = points[index - 1]!;
      const oldX = point.x;
      const oldY = point.y;
      point.x += (leader.x - point.x) * (0.31 - index * 0.0045);
      point.y += (leader.y - point.y) * (0.31 - index * 0.0045);
      movement += Math.abs(point.x - oldX) + Math.abs(point.y - oldY);
    }
    context.clearRect(0, 0, innerWidth, innerHeight);
    context.beginPath();
    const tail = points.at(-1)!;
    context.moveTo(tail.x, tail.y);
    for (let index = points.length - 2; index > 0; index -= 1) {
      const point = points[index]!;
      const leader = points[index - 1]!;
      context.quadraticCurveTo(point.x, point.y, (point.x + leader.x) / 2, (point.y + leader.y) / 2);
    }
    context.lineTo(points[0]!.x, points[0]!.y);
    const thread = context.createLinearGradient(tail.x, tail.y, points[0]!.x, points[0]!.y);
    thread.addColorStop(0, "rgba(255, 79, 135, 0)");
    thread.addColorStop(0.58, "rgba(255, 79, 135, 0.48)");
    thread.addColorStop(1, "rgba(255, 79, 135, 0.96)");
    context.strokeStyle = thread;
    context.lineWidth = 1.8;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.stroke();
    context.beginPath();
    context.arc(points[0]!.x, points[0]!.y, 3.4, 0, Math.PI * 2);
    context.fillStyle = "#ff4f87";
    context.fill();
    quietFrames = movement < 0.08 ? quietFrames + 1 : 0;
    if (quietFrames < 18) frame = requestAnimationFrame(paint);
  };

  window.addEventListener("resize", size, { passive: true });
  window.addEventListener("pointermove", (event) => {
    target.x = event.clientX;
    target.y = event.clientY;
    if (!initialised) {
      points.forEach((point) => { point.x = target.x; point.y = target.y; });
      initialised = true;
    }
    quietFrames = 0;
    if (!frame) frame = requestAnimationFrame(paint);
  }, { passive: true });
  document.addEventListener("pointerout", (event) => {
    if (event.relatedTarget) return;
    context.clearRect(0, 0, innerWidth, innerHeight);
  });
  size();
}

function dictionaryEscape(event: KeyboardEvent): void {
  if (!state.dictionaryOpen) return;
  if (event.key === "Escape") {
    event.preventDefault();
    closeDictionary();
    return;
  }
  if (event.key !== "Tab") return;
  const drawer = document.querySelector<HTMLElement>(".dictionary-drawer");
  const focusable = Array.from(drawer?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') ?? []);
  if (!focusable.length) return;
  const first = focusable[0]!;
  const last = focusable[focusable.length - 1]!;
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

function markSlideDirty(stageSelector: string, copy: string): void {
  const stage = document.querySelector(stageSelector);
  const previewCopy = stage?.querySelector<HTMLElement>(".slide-preview p");
  if (previewCopy) previewCopy.textContent = copy.trim() || "Your slide, with room to breathe.";
  stage?.querySelector(".slide-verdict")?.remove();
  if (stage && !stage.querySelector(".stage-whisper")) {
    const note = document.createElement("p");
    note.className = "stage-whisper";
    note.textContent = "Ready when you are.";
    stage.appendChild(note);
  }
}

function showInputError(input: HTMLTextAreaElement, message: string): void {
  clearInputError(input);
  input.setAttribute("aria-invalid", "true");
  input.classList.add("is-invalid");
  const error = document.createElement("p");
  error.className = "input-error";
  error.id = `${input.id}-error`;
  error.setAttribute("role", "alert");
  error.textContent = message;
  input.setAttribute("aria-describedby", error.id);
  input.insertAdjacentElement("afterend", error);
  input.focus();
  announce(message);
}

function clearInputError(input: HTMLTextAreaElement): void {
  input.removeAttribute("aria-invalid");
  input.removeAttribute("aria-describedby");
  input.classList.remove("is-invalid");
  document.querySelector(`#${input.id}-error`)?.remove();
}

function deckMarkdown(headingLevel: 1 | 2 = 1): string {
  const plan = state.deckPlan;
  const title = "#".repeat(headingLevel);
  const section = "#".repeat(headingLevel + 1);
  if (!plan) return `${title} Film & TV deck plan\n\nNo plan yet.\n`;
  if (!plan.sections.length) {
    const actionHeading = plan.raw.outcome.kind === "rehearsal" ? "Rehearse this" : "Do this first";
    return `${title} ${plan.headline}\n\n${plan.intro}\n\n${section} ${actionHeading}\n\n${plan.preDeckAction ?? "Complete the next piece of work, then return to the deck."}\n\n${section} Why\n\n${plan.reasons.map((item) => `- ${item}`).join("\n")}\n\n${section} Keep out\n\n${plan.leaveOut.map((item) => `- ${item}`).join("\n")}\n`;
  }
  return `${title} ${plan.headline}\n\n${plan.intro}\n\n${section} Core page jobs\n\n${plan.sections.map((item, index) => `${index + 1}. **${sectionName(item.sectionId)}** — ${sectionJob(item.sectionId)}`).join("\n")}\n\n${section} Possible later pages\n\n${plan.optionalSections.map((item) => `- **${sectionName(item.sectionId)}** — ${sectionJob(item.sectionId)}`).join("\n") || "- None for this version."}\n\n${section} Why this plan\n\n${plan.reasons.map((item) => `- ${item}`).join("\n")}\n\n${section} Keep out\n\n${plan.leaveOut.map((item) => `- ${item}`).join("\n")}\n`;
}

function fullPlanMarkdown(): string {
  const parts = ["# Here’s The Thing\n"];
  if (state.nextAdvice) parts.push(`## Next move\n\n### ${state.nextAdvice.headline}\n\n${state.nextAdvice.body}\n\n### Do this now\n\n${state.nextAdvice.doNow.map((item) => `- ${item}`).join("\n")}\n\n### Not now\n\n${state.nextAdvice.doNot.map((item) => `- ${item}`).join("\n")}\n`);
  if (state.deckPlan) parts.push(deckMarkdown(2));
  const slide = currentSlideResult();
  if (slide) parts.push(`## Slide check\n\n### ${slide.headline}\n\n${slide.body}\n\n- Words: ${slide.raw.metrics.visibleWordCount}\n- Text blocks: ${slide.raw.metrics.explicitBlockCount}\n`);
  return parts.join("\n");
}

function currentSlideResult(): AppState["slideResult"] {
  if (state.lastSlideOrigin === "quick") return state.quickResult ?? state.slideResult;
  if (state.lastSlideOrigin === "full") return state.slideResult ?? state.quickResult;
  return state.slideResult ?? state.quickResult;
}

function download(filename: string, content: string, confirmation = "Plan downloaded."): void {
  const url = URL.createObjectURL(new Blob([content], { type: "text/markdown;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  announce(confirmation);
}

document.addEventListener("keydown", dictionaryEscape);
window.addEventListener("pagehide", saveState);
initialiseAtmosphere();
initialiseGrain();
initialiseThread();
render("heading");
