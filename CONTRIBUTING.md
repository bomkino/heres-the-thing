# Contributing

Here’s The Thing welcomes bug fixes, missing real-world routes, clearer copy, sharper definitions, accessibility work, performance improvements, and visual craft with a reason for existing.

## Before opening code

Use the live tool or run it locally. Name the person, screen, and decision affected. “Make it more modern” is not a problem statement. “On a 390 px screen, the selected Deck Bones choice disappears below the fixed action bar” is.

For substantial product changes, open an issue first. This prevents two people from lovingly solving different problems under the same name.

## Local setup

```bash
git clone https://github.com/bomkino/heres-the-thing.git
cd heres-the-thing
npm install
npm run verify
```

Use Node.js 22.18 or newer.

## The contribution contract

### Product logic

- Put deterministic evidence in `/src`.
- Put human-facing translation in `website/src/adapters.ts`.
- Put visible choice labels and explanations in `website/src/content.ts`.
- Do not copy engine logic into the frontend.
- Add a focused test for every changed rule.
- If a choice space is finite, enumerate it. Do not test only the charming route.

### User experience

- One decision should own the screen.
- Prefer structured choices unless the product genuinely uses free text.
- Keep deeper questions behind explicit consent.
- State what typing, measuring, saving, or copying actually does.
- Preserve keyboard, touch, screen-reader, reduced-motion, and theme behavior.
- Do not add a network dependency to make a local interaction look intelligent.

### Copy

- Lead with the answer.
- Use the words deck makers use, then explain them.
- Avoid software bureaucracy: “artefact,” “context limited,” “current instruction controls,” and their little cousins.
- Humour may release pressure. It may not punch down or hide an instruction.
- Do not make unsupported promises about creative quality, fundraising, access, or outcomes.

### Visual work

- Explain the mechanism the flourish expresses.
- Reuse the supplied visual family and logo duplicate; do not redraw the brand as synthetic SVG.
- Provide a static/reduced-motion state.
- Test mobile as a composition of its own.
- Credit third-party references and confirm the licence before adding assets.

## Pull requests

Keep pull requests coherent. Include:

1. the user problem;
2. the decision you took;
3. screenshots or a recording for visible changes;
4. tests or the reason a test is not meaningful;
5. `npm run verify` output;
6. privacy, accessibility, and licensing effects.

By contributing, you agree that your contribution is licensed under the same terms as the part of the repository you change: AGPL-3.0-or-later for software/documentation, or CC BY-SA 4.0 for the original visual family.
