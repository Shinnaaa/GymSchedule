import { weekSummary } from "../core/nutrition";
import { $, h, replaceChildren, show } from "./dom";
import { t } from "./locale";
import { planFor, store, targetsFor, update } from "./store";

const macroItem = (cls, labelKey, value, unit, sub) =>
  h("div", { class: `macro-item ${cls}` },
    h("div", { class: "macro-lbl" }, t(labelKey)),
    h("div", { class: "macro-val" }, String(value), h("span", { class: "macro-unit" }, unit)),
    h("div", { class: "macro-sub" }, sub));

export function renderNutrition() {
  const { profile, plan, tier } = store.state;
  const day = planFor(store.viewDay);
  const m = targetsFor(day.type);
  const week = weekSummary(profile, plan, tier);

  document.querySelectorAll(".tier-btn").forEach((b) => b.classList.toggle("active-tier", b.dataset.tier === tier));
  $("tierDesc").textContent = t(`tierDesc.${tier}`);
  $("dietTypeLabel").textContent = t(`dayType.${day.type}`);
  replaceChildren($("macroGrid"),
    macroItem("macro-cal", "macro.kcal", m.kcal, "kcal", t("macro.kcalSub", { tdee: week.tdee })),
    macroItem("macro-pro", "macro.protein", m.protein, "g", t("macro.proteinSub", { perKg: profile.proteinPerKg, weight: profile.weight })),
    macroItem("macro-carb", "macro.carbs", m.carbs, "g", t("macro.carbsSub")),
    macroItem("macro-fat", "macro.fat", m.fat, "g", t("macro.fatSub")));
  $("weekNoteNutrition").textContent = t("nutri.week", {
    bmr: week.bmr, tdee: week.tdee, avg: week.average, change: (week.kgPerWeek > 0 ? "+" : "") + week.kgPerWeek,
  });
  show($("belowBmr"), week.belowBmr);

  const types = ["train", "cardio", "rest"].filter((type) => plan.some((d) => d.type === type));
  replaceChildren($("byDay"), types.map((type) => {
    const x = targetsFor(type);
    return h("div", { class: "byday-item" },
      h("div", { class: `byday-type ${type}` }, t(`dayType.${type}`)),
      h("div", { class: "byday-kcal" }, `${x.kcal}`, h("span", { class: "macro-unit" }, " kcal")),
      h("div", { class: "byday-macros" }, `P ${x.protein} · C ${x.carbs} · F ${x.fat} g`));
  }));

  const active = day.type !== "rest";
  const supplements = active
    ? [["💊", "supp.protein", "supp.afterTraining"], ["⚗️", "supp.creatine", "supp.daily"]]
    : [["⚗️", "supp.creatine", "supp.daily"], ["🥛", "supp.protein", "supp.beforeBed"]];
  replaceChildren($("supplList"), supplements.map(([icon, what, when]) =>
    h("div", { class: "suppl-item" }, h("span", { class: "suppl-icon" }, icon), h("span", { class: "suppl-text" }, t(what)), h("span", { class: "suppl-when" }, t(when)))));
}

export function wireNutrition() {
  document.querySelectorAll(".tier-btn").forEach((b) =>
    b.addEventListener("click", () => update((s) => { s.tier = b.dataset.tier; })));
}
