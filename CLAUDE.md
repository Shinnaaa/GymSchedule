# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

Fitness OS: a daily training and nutrition planner that runs in the browser.
Vanilla JavaScript modules built with Vite into `dist/` (relative `base: "./"`,
served from `/GymSchedule/` on GitHub Pages). Zero runtime dependencies; all
data lives in `localStorage`. The only network request is the optional Gemini
food-photo scan, made directly from the browser with the user's own key.

History: v1 was a single hand-written `index.html` for one person (Chinese UI,
hard-coded body data, split and workout time). v2 (2026-09) rebuilt it as tested
modules, made everything configurable, added English/Japanese, and fixed an XSS
via the AI reply (innerHTML), the API key sent in the URL, the food log not
being persisted, wrong shopping amounts (day type passed where diet level was
expected), diet-level descriptions not matching the calculation, a male-only
BMR, and meals scheduled during the workout.

## Commands

```
npm install
npm run dev      # Vite dev server
npm test         # Vitest (tests/)
npm run lint     # oxlint — CI requires zero warnings
npm run build    # → dist/
```

CI (`.github/workflows/ci.yml`): lint → test → build on every push/PR; deploys
`main` to Pages from `dist/`.

## Architecture

- `src/core/` — pure logic, no DOM, unit-tested:
  - `nutrition.js`: Mifflin-St Jeor BMR (by sex), TDEE, `dayTargets(profile,
    plan, dayType, tier)` (day weights normalised over the user's week so the
    average hits the goal), `weekSummary` (warns below 90 % of BMR).
  - `plan.js`: weekly plan (`{type, label}` × 7, Sunday = index 0), overrides,
    program week/phase from the start date.
  - `timeline.js`: entries `{time, key, tag, detail, params}` — i18n keys plus
    parameters; the UI translates. Meals that collide with the workout window
    are moved to 30 min after it.
  - `shopping.js`, `body.js` (weigh-ins, BMI, body-fat categories),
    `foodlog.js`, `scan.js` (Gemini request with `x-goog-api-key` header;
    `parseScanReply` validates, clamps and recomputes totals), `i18n.js`.
  - `storage.js`: state shape under `fitnessos:v2`, `normalizeState`,
    `migrateV1` from the old `fitness_*` keys. `saveState` drops `apiKey`
    unless `rememberKey` is set.
- `src/ui/` — one module per view. `store.js` holds `{ state, override,
  viewDay }`; `update()` saves and emits, `main.js` re-renders everything.
  `dom.js` `h()` builds elements (text only); clicks go through `data-action`
  delegation (`onAction`). `locale.js` applies `data-i18n*` attributes.
- `index.html` — static shell; `src/styles.css` holds all styles.

## Rules

- Never build HTML from data: no `innerHTML`/`insertAdjacentHTML`, no inline
  `on*` attributes. The Gemini reply is untrusted — always pass it through
  `parseScanReply` and render as text.
- Never put the API key in a URL, and never persist it without `rememberKey`.
- Every user-visible string is a key in `core/i18n.js` in all three languages
  with the same placeholders (tested). Store keys (`train`, `lose`), not labels.
- Changing the stored shape: handle old data in `normalizeState` (and keep
  `migrateV1` working), add a test. Existing users' data must keep loading.
- Nutrition changes: keep the formulas in the README's "How the numbers are
  calculated" table in sync.
