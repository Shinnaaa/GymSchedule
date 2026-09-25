<p align="center">
  <a href="README.md"><img alt="English" src="https://img.shields.io/badge/English-1f2328?style=for-the-badge"></a>
  <a href="docs/README.zh-CN.md"><img alt="简体中文" src="https://img.shields.io/badge/%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-eaeef2?style=for-the-badge"></a>
  <a href="docs/README.ja.md"><img alt="日本語" src="https://img.shields.io/badge/%E6%97%A5%E6%9C%AC%E8%AA%9E-eaeef2?style=for-the-badge"></a>
</p>

<h1 align="center">🏋️ Fitness OS</h1>

<p align="center">
  A daily training and nutrition planner that runs in your browser.<br>
  Set your weekly split once; it tells you what to eat, when to train and what to buy, every day.
</p>

<p align="center">
  <a href="https://shinnaaa.github.io/GymSchedule/"><b>Open the app →</b></a>
</p>

<p align="center">
  <a href="https://github.com/Shinnaaa/GymSchedule/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Shinnaaa/GymSchedule/actions/workflows/ci.yml/badge.svg"></a>
  <img alt="Zero runtime dependencies" src="https://img.shields.io/badge/runtime%20deps-0-brightgreen">
  <img alt="No account" src="https://img.shields.io/badge/account-none-blue">
  <a href="LICENSE"><img alt="MIT" src="https://img.shields.io/badge/license-MIT-green"></a>
</p>

<p align="center"><img src="docs/images/timeline.png" alt="A training day: meals, pre-workout snack, workout and recovery on one timeline" width="760"></p>

---

## Features

- **Weekly plan** — mark each weekday as training, cardio or rest and describe the session (“Push · chest, shoulders, triceps”). The app shows the current program week and phase (ramp-up → build → progress).
- **Daily timeline** — meals, a pre-workout snack, the workout, post-workout recovery and a bedtime protein, placed around *your* workout time. A “right now” card tells you what to do at this moment and what comes next.
- **Carb cycling** — calories and macros change with the day: more carbs on training days, fewer on rest days, averaging out to your weekly goal. Most of the day's carbs go into the first meal after training.
- **Targets from your body** — BMR by Mifflin-St Jeor (male and female formulas), TDEE from your activity level, and a deficit or surplus from your goal rate (7,700 kcal per kg). Protein is set in g per kg of body weight. A warning appears if the plan would take you below a safe intake.
- **Diet level** — strict (−5 %), normal or relaxed (+5 %) for the day, without touching your settings.
- **Food photo scan** *(optional)* — photograph a meal and Google Gemini estimates each item's calories and macros; add it to today's log in one tap. You can also log food by hand.
- **Shopping list** — amounts for the day's protein, carbs, vegetables and extras, generated from the targets.
- **Weight log** — weight and optional body fat, a trend chart, weekly change, BMI (WHO categories) and body-fat range (ACE categories, by sex).
- **Override today** — swapped your leg day for a rest day? Pick another session for today and every number follows.
- **Mobility reminders** — your own routine to repeat every two hours at a desk.
- **English / 中文 / 日本語**, chosen from your browser and switchable at any time.

<p align="center">
  <img src="docs/images/nutrition.png" alt="Nutrition targets for the day and the week" width="49%">
  <img src="docs/images/weight.png" alt="Weight log with trend chart, BMI and body fat" width="49%">
</p>

## Use it

1. Open [shinnaaa.github.io/GymSchedule](https://shinnaaa.github.io/GymSchedule/). The first screen uses example body data so you can look around.
2. Go to **Settings**: enter your sex, age, height, weight, activity level and goal; set your weekly plan, workout time and program start date.
3. Check the **Timeline** each day. Log your weight once a week.

Everything is stored in your browser's `localStorage`; there is no account and no server. Use **Settings → Export** to back up or move your data to another device, and **Import** to restore it.

### Food photo scan (optional)

The scan needs your own [Gemini API key](https://aistudio.google.com/apikey) (the free tier is enough). Paste it in **Settings → Photo recognition**. The photo and the key go only to Google's API, directly from your browser; the key is sent in a request header, never in a URL. It is kept in memory for the session unless you tick *Remember on this device*. The model's reply is treated as untrusted data: it is parsed, validated, clamped to sensible ranges and displayed as plain text, and the totals are recomputed from the items.

> **Not medical advice.** The numbers are population-average estimates. If you have a medical condition, are pregnant, or are under 18, talk to a doctor or dietitian before changing how you eat.

<p align="center">
  <img src="docs/images/settings.png" alt="Settings: profile, weekly plan and workout time" width="49%">
  <img src="docs/images/mobile.png" alt="The app on a phone, in Chinese" width="30%">
</p>

---

## How the numbers are calculated

| | |
|---|---|
| BMR | Mifflin-St Jeor: `10·kg + 6.25·cm − 5·age + 5` (male) or `− 161` (female) |
| TDEE | BMR × 1.2 / 1.375 / 1.55 / 1.725 for sedentary / light / moderate / active |
| Daily change | goal rate (kg/week) × 7,700 kcal ÷ 7, subtracted when losing, added when gaining |
| Day weighting | training 1.12, cardio 1.0, rest 0.9 — normalised over *your* week so the weekly average hits the goal |
| Protein | g/kg × body weight (default 1.8) |
| Fat | the larger of 0.6–0.8 g/kg and 25–35 % of the day's calories (more on rest days, when carbs are lower) |
| Carbs | whatever calories remain (never below 30 g) |

The weekly summary warns when the average intake would be under 90 % of your BMR.

### What version 2.0 changed

Version 1 was a single HTML file written for one person: their body data, their split and their workout time were hard-coded, and the UI was Chinese only. Version 2 rebuilds it as a tested, modular project that anyone can configure, and fixes these problems found along the way:

- **XSS through the AI reply.** Food names from Gemini were inserted with `innerHTML`, so a crafted image or a misbehaving model could inject markup and scripts. Everything is now rendered as text.
- **API key in the URL.** The Gemini key was sent as a `?key=` query parameter, where it ends up in logs and history. It now goes in the `x-goog-api-key` header.
- **Food log lost on reload.** Scanned food was only kept in memory. It is now saved, and entries older than 30 days are pruned.
- **Wrong shopping amounts.** The list passed the day type (`train`) where the calculator expected a diet level (`high`), so rice quantities were computed from the wrong day's carbs.
- **Diet levels didn't match their descriptions.** The descriptions were hard-coded numbers that disagreed with what the calculator applied; both now come from the same code.
- **Male-only BMR.** Women were given the male formula (≈166 kcal too high).
- **Timeline collisions.** Meals could land during the workout; they are now moved to 30 minutes after it.

Existing v1 data (`fitness_*` keys in `localStorage`) is migrated automatically on first load, including the weight log.

---

## Development

```bash
npm install
npm run dev      # dev server
npm test         # Vitest: nutrition, plan, timeline, shopping, body metrics, food log, scan parsing, storage and v1 migration
npm run lint     # oxlint
npm run build    # → dist/
```

Every push runs lint, tests and the build; `main` is deployed to GitHub Pages.

### Project layout

```
index.html              static shell; text comes from data-i18n keys
src/
  main.js               wiring: tabs, re-render on change, 20-second clock
  styles.css
  core/                 pure logic, no DOM — all unit-tested
    nutrition.js          BMR, TDEE, day targets, weekly summary
    plan.js               weekly plan, overrides, program week and phase
    timeline.js           the day's schedule around the workout
    shopping.js           shopping list from targets
    body.js               weigh-ins, BMI, body-fat categories
    foodlog.js            food log, totals, pruning
    scan.js               Gemini request, reply parsing and validation
    storage.js            state shape, defaults, v1 migration, saving
    i18n.js               English / Chinese / Japanese strings
  ui/                   views; build DOM with h() and handle clicks by delegation
tests/                  Vitest suites (logic, DOM safety, i18n completeness)
```

## License

[MIT](LICENSE)
