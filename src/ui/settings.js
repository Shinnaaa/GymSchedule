import { DAY_TYPES, isoDate } from "../core/plan";
import { looksLikeGeminiKey } from "../core/scan";
import { STATE_KEY, defaultState, normalizeProfile, normalizeState } from "../core/storage";
import { localizedDefaults } from "../core/i18n";
import { $, h, replaceChildren } from "./dom";
import { currentLanguage, locale, t } from "./locale";
import { store, update } from "./store";

// Monday first, like the day picker.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

function hint(id, key, ok = true) {
  const el = $(id);
  el.textContent = t(key);
  el.style.color = ok ? "var(--lime)" : "var(--orange)";
  el.classList.add("visible");
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove("visible"), 3000);
}

function fillForms() {
  const s = store.state;
  const profile = $("profileForm").elements;
  for (const key of Object.keys(s.profile)) profile[key].value = s.profile[key];

  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  replaceChildren($("planRows"), WEEK_ORDER.map((weekday, i) => {
    const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const day = s.plan[weekday];
    return h("div", { class: "plan-row" },
      h("span", { class: "dow" }, date.toLocaleDateString(locale(), { weekday: "short" })),
      h("select", { class: "setting-input", name: `type-${weekday}`, "aria-label": t("set.plan") },
        DAY_TYPES.map((type) => h("option", { value: type, selected: type === day.type }, t(`dayType.${type}`)))),
      h("input", { class: "setting-input", name: `label-${weekday}`, value: day.label, maxlength: 60, placeholder: t("set.planLabel") }));
  }));
  const plan = $("planForm").elements;
  plan.workoutTime.value = s.workoutTime;
  plan.startDate.value = s.startDate || "";
  plan.mobility.value = s.mobility.join("\n");

  const ai = $("aiForm").elements;
  ai.apiKey.value = s.apiKey;
  ai.model.value = s.model;
  ai.rememberKey.checked = s.rememberKey;
}

export const renderSettings = fillForms;

export function wireSettings() {
  $("profileForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target.elements;
    update((s) => {
      s.profile = normalizeProfile({
        sex: f.sex.value, age: f.age.value, height: f.height.value, weight: f.weight.value,
        activity: f.activity.value, goal: f.goal.value, rate: f.rate.value, proteinPerKg: f.proteinPerKg.value,
      });
      s.onboarded = true;
    });
    hint("profileHint", "set.saved");
  });

  $("planForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target.elements;
    update((s) => {
      s.plan = s.plan.map((_, weekday) => ({ type: f[`type-${weekday}`].value, label: f[`label-${weekday}`].value.trim().slice(0, 60) }));
      s.workoutTime = f.workoutTime.value || s.workoutTime;
      s.startDate = f.startDate.value || null;
      s.mobility = f.mobility.value.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 12);
    });
    store.override = null;
    hint("planHint", "set.saved");
  });

  $("aiForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const key = f.apiKey.value.trim();
    if (key && !looksLikeGeminiKey(key)) return hint("aiHint", "set.keyBad", false);
    update((s) => {
      s.apiKey = key;
      s.model = f.model.value.trim();
      s.rememberKey = f.rememberKey.checked;
    });
    hint("aiHint", "set.keySaved");
  });

  $("exportData").addEventListener("click", () => {
    const { apiKey: _omit, ...data } = store.state;
    const url = URL.createObjectURL(new Blob([JSON.stringify({ ...data, apiKey: "" }, null, 2)], { type: "application/json" }));
    const a = h("a", { href: url, download: `fitness-os-${isoDate(new Date())}.json` });
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
  $("importData").addEventListener("click", () => $("importFile").click());
  $("importFile").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || data.version !== 2 || !data.profile) throw new Error("not a backup");
      update((s) => Object.assign(s, normalizeState({ ...data, apiKey: s.apiKey, rememberKey: s.rememberKey })));
      hint("dataHint", "set.imported");
    } catch {
      hint("dataHint", "set.importFailed", false);
    }
  });
  $("resetData").addEventListener("click", () => {
    if (!window.confirm(t("set.confirmReset"))) return;
    localStorage.removeItem(STATE_KEY);
    ["height", "weight", "age", "tier", "weightLog", "startDate"].forEach((k) => localStorage.removeItem(`fitness_${k}`));
    store.override = null;
    update((s) => Object.assign(s, defaultState(localizedDefaults(currentLanguage()))));
  });
}
