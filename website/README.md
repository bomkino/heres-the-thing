# Website

The production website for Here’s The Thing. It is a static TypeScript application wrapped in a very small Cloudflare Worker for deep links on Sites.

## Commands

```bash
npm run dev          # local Vite server
npm run check        # strict TypeScript
npm run test         # product journey contract
npm run build        # dist/client + dist/server/index.js
npm run test:hosting # asset and SPA fallback contract
npm run verify       # all of the above
```

Run commands from this directory or use the root workspace scripts.

## Routes

- `/` — four-tool home
- `/slide` — Slide Check
- `/deck` — Deck Bones, Film & TV only
- `/next` — Next Move
- `/words` — Pitch Dictionary
- `/plan` — answers deliberately carried between tools

## Important boundaries

- `src/adapters.ts` translates engine evidence into human-facing plans. It may not invent evidence.
- `src/content.ts` owns visible structured choices.
- `src/main.ts` owns routes, state, copy, and accessible interaction.
- `src/measure.ts` measures the rendered 16:9 page locally.
- `src/atmosphere.ts` and `src/grain.ts` provide progressive visual atmosphere with reduced-motion fallbacks.
- `../src/` is the engine authority. Do not fork or copy its logic into the website.
- The website has no runtime API, analytics, remote font, account, upload, or AI dependency.

The visual PNG masters and prompts live in `assets-source/`; the runtime uses only the compressed derivatives in `public/`.
