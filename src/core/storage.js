// App state in localStorage, with a one-time migration from v1 (fitness_* keys).

import { defaultPlan, normalizePlan } from "./plan";

export const STATE_KEY = "fitnessos:v2";

export const DEFAULT_PROFILE = {
  sex: "male",
  age: 30,
  height: 175,
  weight: 75,
  activity: "light",
  goal: "lose",
  rate: 0.5,
  proteinPerKg: 1.8,
};

export const DEFAULT_MOBILITY = [
  "Cat–cow · 10 slow reps",
  "Thoracic rotation · 10 each side",
  "Hip flexor stretch · 30 s each side",
  "Chin tucks · 10 reps",
];

/** `defaults` lets new users get plan labels and mobility items in their language. */
export function defaultState(defaults = {}) {
  return {
    version: 2,
    profile: { ...DEFAULT_PROFILE },
    plan: defaultPlan(defaults.planLabels),
    workoutTime: "18:00",
    tier: "normal",
    startDate: null,
    mobility: [...(defaults.mobility || DEFAULT_MOBILITY)],
    weighIns: [],
    foodLogs: {},
    shoppingChecked: {},
    rememberKey: false,
    apiKey: "",
    model: "",
    onboarded: false,
  };
}

const clamp = (v, lo, hi, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
};

export function normalizeProfile(p = {}) {
  const d = DEFAULT_PROFILE;
  return {
    sex: p.sex === "female" ? "female" : "male",
    age: Math.round(clamp(p.age, 15, 90, d.age)),
    height: clamp(p.height, 120, 230, d.height),
    weight: clamp(p.weight, 30, 300, d.weight),
    activity: ["sedentary", "light", "moderate", "active"].includes(p.activity) ? p.activity : d.activity,
    goal: ["lose", "maintain", "gain"].includes(p.goal) ? p.goal : d.goal,
    rate: clamp(p.rate, 0.1, 1.0, d.rate),
    proteinPerKg: clamp(p.proteinPerKg, 1.2, 2.5, d.proteinPerKg),
  };
}

export function normalizeState(raw, defaults) {
  const base = defaultState(defaults);
  const s = raw && typeof raw === "object" ? raw : {};
  return {
    ...base,
    ...s,
    version: 2,
    profile: normalizeProfile(s.profile),
    plan: Array.isArray(s.plan) && s.plan.length === 7 ? normalizePlan(s.plan) : base.plan,
    workoutTime: /^\d{2}:\d{2}$/.test(s.workoutTime) ? s.workoutTime : base.workoutTime,
    tier: ["strict", "normal", "loose"].includes(s.tier) ? s.tier : "normal",
    mobility: Array.isArray(s.mobility) ? s.mobility.filter((x) => typeof x === "string").slice(0, 12) : base.mobility,
    weighIns: Array.isArray(s.weighIns) ? s.weighIns.filter((w) => w && /^\d{4}-\d{2}-\d{2}$/.test(w.date) && Number.isFinite(w.weight)) : [],
    foodLogs: s.foodLogs && typeof s.foodLogs === "object" ? s.foodLogs : {},
    shoppingChecked: s.shoppingChecked && typeof s.shoppingChecked === "object" ? s.shoppingChecked : {},
    apiKey: s.rememberKey && typeof s.apiKey === "string" ? s.apiKey : "",
  };
}

// v1 hard-coded one person's week and mobility routine (in Chinese); people
// upgrading from it keep exactly that.
export const V1_PLAN = [
  { type: "rest", label: "" },
  { type: "train", label: "胸 · 肩 · 三头" },
  { type: "train", label: "背 · 二头 · Face Pull 必做" },
  { type: "rest", label: "胸椎专项 · 泡沫轴 + 猫牛 + 椅背伸展 15 分钟" },
  { type: "train", label: "腿 · 臀" },
  { type: "rest", label: "" },
  { type: "cardio", label: "爬坡走 · 坡度 8–12% · 5–6 km/h · 40 分钟" },
];
export const V1_MOBILITY = ["椅背顶胸椎后仰 · 30 秒 × 3", "猫牛式 · 10 次慢速", "坐姿胸椎旋转 · 每侧 10 次", "俯卧抬胸 · 10 次"];

/** Builds v2 state from the v1 keys, or returns null if there is no v1 data. */
export function migrateV1(get) {
  const keys = ["height", "weight", "age", "tier", "weightLog", "startDate"];
  const v1 = Object.fromEntries(keys.map((k) => [k, get(`fitness_${k}`)]));
  if (keys.every((k) => v1[k] == null)) return null;
  const state = defaultState();
  state.profile = normalizeProfile({
    ...DEFAULT_PROFILE,
    sex: "male",
    age: v1.age ?? DEFAULT_PROFILE.age,
    height: v1.height ?? DEFAULT_PROFILE.height,
    weight: v1.weight ?? DEFAULT_PROFILE.weight,
    activity: "light",
    goal: "lose",
    rate: 0.75,
  });
  state.plan = V1_PLAN.map((d) => ({ ...d }));
  state.mobility = [...V1_MOBILITY];
  state.workoutTime = "11:20";
  state.tier = v1.tier || "normal";
  state.startDate = v1.startDate || null;
  state.weighIns = (Array.isArray(v1.weightLog) ? v1.weightLog : [])
    .filter((e) => e && e.date && Number.isFinite(e.val))
    .map((e) => ({ date: e.date, weight: e.val, fat: Number.isFinite(e.fat) ? e.fat : null }));
  state.onboarded = true;
  return normalizeState(state);
}

export function loadState(storage = localStorage, defaults = {}) {
  const getJSON = (key) => {
    try {
      const raw = storage.getItem(key);
      return raw == null ? null : JSON.parse(raw);
    } catch {
      return null;
    }
  };
  const saved = getJSON(STATE_KEY);
  if (saved) return normalizeState(saved, defaults);
  return migrateV1(getJSON) || defaultState(defaults);
}

export function saveState(state, storage = localStorage) {
  const toSave = { ...state, apiKey: state.rememberKey ? state.apiKey : "" };
  try {
    storage.setItem(STATE_KEY, JSON.stringify(toSave));
  } catch {
    // storage full or unavailable
  }
}
