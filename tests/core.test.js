import { describe, expect, it } from "vitest";
import { bmr, dailyDelta, dayTargets, tdee, weekSummary } from "../src/core/nutrition";
import { dayPlan, defaultPlan, normalizePlan, overrideChoices, programWeek } from "../src/core/plan";
import { buildTimeline, position, toMinutes } from "../src/core/timeline";
import { shoppingForDay } from "../src/core/shopping";
import { bmi, bmiCategory, bodyFatCategory, upsertWeighIn, weightStats } from "../src/core/body";
import { addFood, prune, removeFood, totals } from "../src/core/foodlog";
import { looksLikeGeminiKey, parseScanReply, scanPhoto } from "../src/core/scan";
import { V1_PLAN, loadState, migrateV1, normalizeState, saveState } from "../src/core/storage";

const man = { sex: "male", age: 28, height: 183, weight: 106, activity: "light", goal: "lose", rate: 0.75, proteinPerKg: 1.8 };
const plan = V1_PLAN;

describe("nutrition", () => {
  it("uses Mifflin-St Jeor with the sex constant", () => {
    expect(bmr(man)).toBeCloseTo(2068.75);
    expect(bmr({ ...man, sex: "female" })).toBeCloseTo(2068.75 - 166);
    expect(tdee(man)).toBeCloseTo(2068.75 * 1.375);
  });

  it("turns the weekly rate into a daily delta", () => {
    expect(dailyDelta({ goal: "lose", rate: 0.7 })).toBeCloseTo(-770);
    expect(dailyDelta({ goal: "gain", rate: 0.35 })).toBeCloseTo(385);
    expect(dailyDelta({ goal: "maintain", rate: 1 })).toBe(0);
  });

  it("averages exactly to the target over the user's own week", () => {
    for (const p of [plan, defaultPlan(), normalizePlan(Array(7).fill({ type: "rest" }))]) {
      const week = p.map((d) => dayTargets(man, p, d.type).kcal);
      const avg = week.reduce((a, b) => a + b, 0) / 7;
      expect(Math.abs(avg - (tdee(man) + dailyDelta(man)))).toBeLessThan(2);
    }
  });

  it("cycles carbs: most on training days, fewest on rest days, protein constant", () => {
    const train = dayTargets(man, plan, "train");
    const cardio = dayTargets(man, plan, "cardio");
    const rest = dayTargets(man, plan, "rest");
    expect(train.carbs).toBeGreaterThan(cardio.carbs);
    expect(cardio.carbs).toBeGreaterThan(rest.carbs);
    expect(new Set([train.protein, cardio.protein, rest.protein]).size).toBe(1);
    expect(train.protein).toBe(191);
    expect(rest.fat).toBeGreaterThanOrEqual(Math.round(0.8 * man.weight));
    // kcal = 4p + 4c + 9f (within rounding)
    for (const d of [train, cardio, rest]) expect(Math.abs(d.kcal - (4 * d.protein + 4 * d.carbs + 9 * d.fat))).toBeLessThan(10);
  });

  it("keeps a carb floor and flags targets below BMR", () => {
    // A 1 kg/week deficit on a sedentary 80 kg man pushes the target well below BMR.
    const steep = { sex: "male", age: 30, height: 180, weight: 80, activity: "sedentary", goal: "lose", rate: 1, proteinPerKg: 1.2 };
    expect(dayTargets(steep, plan, "rest").carbs).toBe(30); // the floor kicks in on rest days
    expect(weekSummary(steep, plan).belowBmr).toBe(true);
    expect(weekSummary(man, plan).belowBmr).toBe(false);
    expect(weekSummary(man, plan).kgPerWeek).toBeCloseTo(-0.75, 1);
  });

  it("applies the diet level", () => {
    const n = dayTargets(man, plan, "train", "normal").kcal;
    expect(dayTargets(man, plan, "train", "strict").kcal).toBe(Math.round(n * 0.95) || expect.any(Number));
    expect(dayTargets(man, plan, "train", "loose").kcal).toBeGreaterThan(n);
  });
});

describe("plan", () => {
  it("normalizes and overrides a day", () => {
    expect(normalizePlan([1, 2])).toHaveLength(7);
    expect(normalizePlan(Array(7).fill({ type: "bogus", label: 5 }))[0]).toEqual({ type: "rest", label: "" });
    expect(dayPlan(plan, 1)).toEqual(plan[1]);
    expect(dayPlan(plan, 1, { type: "rest" })).toEqual({ type: "rest", label: "" });
    const choices = overrideChoices(plan);
    expect(choices.map((c) => c.type)).toEqual(["train", "train", "train", "cardio", "rest"]);
    expect(overrideChoices(Array(7).fill({ type: "rest", label: "" })).map((c) => c.type)).toEqual(["cardio", "rest"]);
  });

  it("counts program weeks from Monday and names the phase", () => {
    const now = new Date(2026, 8, 26); // Saturday
    expect(programWeek("2026-09-21", now)).toEqual({ week: 1, phase: "rampUp" });
    expect(programWeek("2026-09-02", now)).toEqual({ week: 4, phase: "build" });
    expect(programWeek("2026-08-01", now).phase).toBe("progress");
    expect(programWeek(null, now).week).toBe(1);
  });
});

describe("timeline", () => {
  const targets = dayTargets(man, plan, "train");

  it("is sorted and hands out exactly the day's protein", () => {
    for (const type of ["train", "cardio", "rest"]) {
      const t = dayTargets(man, plan, type);
      const entries = buildTimeline(type, "11:20", t, "Legs");
      const times = entries.map((e) => toMinutes(e.time));
      expect(times).toEqual([...times].sort((a, b) => a - b));
      const protein = entries.reduce((s, e) => s + (e.key.startsWith("meal.") && e.key !== "meal.pre" ? (e.params.protein || 0) : 0), 0);
      expect(Math.abs(protein - t.protein)).toBeLessThanOrEqual(3);
    }
  });

  it("puts most carbs in the first meal after training", () => {
    const entries = buildTimeline("train", "18:00", targets, "Push");
    const meals = entries.filter((e) => ["meal.breakfast", "meal.lunch", "meal.dinner"].includes(e.key));
    const biggest = meals.reduce((a, b) => (b.params.carbs > a.params.carbs ? b : a));
    expect(biggest.key).toBe("meal.dinner");
    expect(biggest.tag).toBe("tag.highCarb");
  });

  it("keeps meals clear of the workout", () => {
    for (const time of ["07:00", "11:20", "12:00", "18:00", "20:00"]) {
      const entries = buildTimeline("train", time, targets, "Push");
      const start = toMinutes(time);
      for (const e of entries.filter((x) => ["meal.breakfast", "meal.lunch", "meal.dinner"].includes(x.key))) {
        const at = toMinutes(e.time);
        expect(at < start - 60 || at >= start + 90).toBe(true);
      }
    }
  });

  it("finds the current and next step", () => {
    const entries = buildTimeline("rest", "18:00", dayTargets(man, plan, "rest"));
    expect(position(entries, toMinutes("07:00"))).toEqual({ current: -1, next: 0 });
    expect(position(entries, toMinutes("13:00")).current).toBe(1);
    expect(position(entries, toMinutes("23:30"))).toEqual({ current: entries.length - 1, next: -1 });
  });
});

describe("shopping, body, food log", () => {
  it("sizes shopping from targets", () => {
    const items = shoppingForDay("train", dayTargets(man, plan, "train"));
    expect(items.map((i) => i.key)).toEqual(["protein", "carbs", "vegetables", "yogurt", "fruit"]);
    expect(items.every((i) => i.amount > 0)).toBe(true);
    expect(shoppingForDay("rest", dayTargets(man, plan, "rest")).some((i) => i.key === "fats")).toBe(true);
  });

  it("tracks weigh-ins and classifies BMI / body fat", () => {
    let log = upsertWeighIn([], { date: "2026-09-01", weight: 106, fat: null });
    log = upsertWeighIn(log, { date: "2026-09-08", weight: 105.2, fat: 28 });
    log = upsertWeighIn(log, { date: "2026-09-08", weight: 105.0, fat: 28 });
    expect(log.map((e) => e.date)).toEqual(["2026-09-08", "2026-09-01"]);
    expect(weightStats(log)).toMatchObject({ lastChange: -1, totalChange: -1 });
    expect(bmiCategory(bmi(106, 183))).toBe("obese");
    expect(bmiCategory(22)).toBe("normal");
    expect(bodyFatCategory("male", 16)).toBe("fitness");
    expect(bodyFatCategory("female", 16)).toBe("athletic");
  });

  it("keeps a per-day food log", () => {
    let logs = addFood({}, "2026-09-26", { name: "Ramen", kcal: 800, protein: 30 });
    logs = addFood(logs, "2026-09-26", { name: "Egg", kcal: 70, protein: 6 });
    expect(totals(logs["2026-09-26"])).toMatchObject({ kcal: 870, protein: 36 });
    logs = removeFood(logs, "2026-09-26", 0);
    expect(logs["2026-09-26"].map((i) => i.name)).toEqual(["Egg"]);
    expect(Object.keys(prune({ ...logs, "2026-07-01": [{ kcal: 1 }] }, "2026-09-26"))).toEqual(["2026-09-26"]);
  });
});

describe("photo scan", () => {
  const reply = {
    foods: [
      { name: "Ramen", weight_g: 600, kcal: 750, protein_g: 30, carb_g: 90, fat_g: 28 },
      { name: "<img src=x onerror=alert(1)>", weight_g: "50", kcal: "120.4", protein_g: -5, carb_g: 1e9, fat_g: "x" },
    ],
    total_kcal: 99999,
    confidence: "medium",
    tips: "Broth fat is uncertain",
  };

  it("validates, clamps and re-totals the model's reply", () => {
    const r = parseScanReply("<think>hmm</think>```json\n" + JSON.stringify(reply) + "\n```");
    expect(r.foods[1]).toEqual({ name: "<img src=x onerror=alert(1)>", weight: 50, kcal: 120, protein: 0, carbs: 1000, fat: 0 });
    expect(r.kcal).toBe(870); // recomputed, not the model's 99999
    expect(r.confidence).toBe("medium");
  });

  it("explains failures", () => {
    expect(() => parseScanReply("")).toThrow("noJson");
    expect(() => parseScanReply('{"foods": [')).toThrow();
    expect(() => parseScanReply('{"foods": []}')).toThrow("noFoods");
    expect(() => parseScanReply("x".repeat(200))).toThrow("truncated");
  });

  it("sends the key in a header, not the URL", async () => {
    let seen;
    const fetchImpl = async (url, init) => {
      seen = { url, init };
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(reply) }] } }] }) };
    };
    const r = await scanPhoto({ apiKey: "AIzaTEST", mimeType: "image/png", base64: "AAAA", lang: "ja", fetchImpl });
    expect(seen.url).not.toContain("AIzaTEST");
    expect(seen.init.headers["x-goog-api-key"]).toBe("AIzaTEST");
    expect(JSON.parse(seen.init.body).contents[0].parts[1].text).toContain("Japanese");
    expect(r.foods).toHaveLength(2);
  });

  it("recognizes a Gemini key shape", () => {
    expect(looksLikeGeminiKey("AIza" + "x".repeat(35))).toBe(true);
    expect(looksLikeGeminiKey("sk-123")).toBe(false);
  });
});

describe("storage", () => {
  const memory = (seed = {}) => {
    const map = new Map(Object.entries(seed));
    return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, v), map };
  };

  it("migrates v1 data, keeping that user's plan and weigh-ins", () => {
    const v1 = memory({
      fitness_height: "183", fitness_weight: "106", fitness_age: "28", fitness_tier: '"strict"',
      fitness_weightLog: JSON.stringify([{ date: "2026-09-01", val: 106, fat: null }, { date: "2026-09-08", val: 105.2, fat: 28 }]),
    });
    const state = loadState(v1);
    expect(state.profile).toMatchObject({ height: 183, weight: 106, age: 28, sex: "male", rate: 0.75 });
    expect(state.tier).toBe("strict");
    expect(state.plan).toEqual(V1_PLAN);
    expect(state.workoutTime).toBe("11:20");
    expect(state.weighIns).toHaveLength(2);
    expect(state.weighIns[1]).toEqual({ date: "2026-09-08", weight: 105.2, fat: 28 });
    expect(state.onboarded).toBe(true);
  });

  it("gives new users localized defaults and never stores an un-remembered key", () => {
    const store = memory();
    const state = loadState(store, { planLabels: { push: "推" }, mobility: ["a"] });
    expect(state.onboarded).toBe(false);
    expect(state.plan[1].label).toBe("推");
    saveState({ ...state, apiKey: "AIzaSECRET", rememberKey: false }, store);
    expect([...store.map.values()].join()).not.toContain("AIzaSECRET");
    saveState({ ...state, apiKey: "AIzaSECRET", rememberKey: true }, store);
    expect(loadState(store).apiKey).toBe("AIzaSECRET");
  });

  it("repairs bad saved values", () => {
    const s = normalizeState({ profile: { age: 500, sex: "x", activity: "?" }, workoutTime: "late", plan: [], weighIns: [{ date: "bad" }] });
    expect(s.profile).toMatchObject({ age: 90, sex: "male", activity: "light" });
    expect(s.workoutTime).toBe("18:00");
    expect(s.plan).toHaveLength(7);
    expect(s.weighIns).toEqual([]);
    expect(migrateV1(() => null)).toBeNull();
  });
});
