import { addFood, prune, removeFood, totals } from "../core/foodlog";
import { DEFAULT_MODEL, scanPhoto } from "../core/scan";
import { $, h, onAction, replaceChildren, show } from "./dom";
import { currentLanguage, t } from "./locale";
import { planFor, store, targetsFor, todayISO, todayIndex, update } from "./store";

const image = { base64: null, mimeType: "image/jpeg" };
let lastResult = null;
let scanning = false;

function loadImage(file) {
  if (!file || !file.type.startsWith("image/")) return;
  image.mimeType = file.type;
  const reader = new FileReader();
  reader.onload = () => {
    image.base64 = String(reader.result).split(",")[1];
    $("photoPreview").src = reader.result;
    show($("photoPreview"));
    $("scanBtn").disabled = false;
    lastResult = null;
    replaceChildren($("scanOutput"));
  };
  reader.readAsDataURL(file);
}

function renderResult(result) {
  replaceChildren($("scanOutput"),
    h("div", { class: "scan-result" },
      h("div", { class: "scan-result-title" }, t("photo.confidence", { level: "" }), h("span", { class: `conf-${result.confidence}` }, t(`conf.${result.confidence}`))),
      h("div", { class: "scan-kcal" }, String(result.kcal), h("span", { class: "scan-kcal-unit" }, "kcal")),
      h("div", { class: "scan-macros" },
        [["macro.protein", result.protein, "var(--lime)"], ["macro.carbs", result.carbs, "var(--cyan)"], ["macro.fat", result.fat, "var(--yellow)"]].map(([key, value, color]) =>
          h("div", { class: "scan-macro" }, h("div", { class: "scan-macro-lbl" }, t(key)), h("div", { class: "scan-macro-val", style: { color } }, `${value}g`)))),
      h("div", { class: "scan-foods" }, result.foods.map((f) =>
        h("div", { class: "scan-food-row" }, h("span", { class: "name" }, f.name), h("span", { class: "grams" }, `${f.weight}g`), h("span", { class: "kcal" }, `${f.kcal} kcal`)))),
      result.tips ? h("div", { class: "scan-notes" }, "💡 ", result.tips) : null,
      h("button", { class: "scan-add", data: { action: "add-scan" } }, t("photo.add"))));
}

function renderError(message) {
  replaceChildren($("scanOutput"), h("div", { class: "api-warn" }, message));
}

async function scan() {
  if (!image.base64 || scanning) return;
  const { apiKey, model } = store.state;
  if (!apiKey) return renderError(t("photo.noKey"));
  scanning = true;
  $("scanBtn").disabled = true;
  replaceChildren($("scanOutput"), h("div", { class: "scan-loading" }, h("div", { class: "scan-spinner" }), t("photo.scanning")));
  try {
    lastResult = await scanPhoto({ apiKey, model: model || DEFAULT_MODEL, mimeType: image.mimeType, base64: image.base64, lang: currentLanguage() });
    renderResult(lastResult);
  } catch (err) {
    const known = { truncated: "photo.err.truncated", noJson: "photo.err.noJson", noFoods: "photo.err.noFoods" }[err.message];
    renderError(t("photo.failed", { msg: known ? t(known) : err.message }));
  } finally {
    scanning = false;
    $("scanBtn").disabled = !image.base64;
  }
}

function log(item) {
  update((s) => {
    s.foodLogs = prune(addFood(s.foodLogs, todayISO(), { ...item, time: new Date().toTimeString().slice(0, 5) }), todayISO());
  });
}

export function renderFoodLog() {
  const items = store.state.foodLogs[todayISO()] || [];
  if (!items.length) return replaceChildren($("scanLog"), h("div", { class: "weight-empty" }, t("photo.logEmpty")));
  const total = totals(items);
  const target = targetsFor(planFor(todayIndex()).type).kcal;
  const pct = Math.round((total.kcal / target) * 100);
  const color = pct > 110 ? "var(--orange)" : pct > 90 ? "var(--yellow)" : "var(--lime)";
  replaceChildren($("scanLog"),
    items.map((item, i) =>
      h("div", { class: "scan-log-item" },
        h("span", { class: "scan-log-time" }, item.time || ""),
        h("span", { class: "scan-log-desc" }, item.name),
        h("span", { class: "scan-log-kcal" }, String(item.kcal)),
        h("button", { class: "scan-log-del", data: { action: "remove-food", index: i }, "aria-label": t("btn.delete") }, "✕"))),
    h("div", { class: "scan-total" },
      h("span", { class: "scan-total-lbl" }, t("photo.total")),
      h("span", {}, h("span", { class: "scan-total-val" }, String(total.kcal)), h("span", { class: "scan-total-of" }, ` / ${target} kcal`),
        h("span", { class: "scan-total-pct", style: { color } }, `${pct}%`))));
}

export function wirePhoto() {
  $("photoFileInput").addEventListener("change", (e) => loadImage(e.target.files[0]));
  const drop = $("photoDrop");
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("dragover"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("dragover"));
  drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("dragover"); loadImage(e.dataTransfer.files[0]); });
  $("scanBtn").addEventListener("click", scan);
  $("manualAdd").addEventListener("click", () => {
    const name = $("manualName").value.trim();
    const kcal = Math.round(Number($("manualKcal").value));
    if (!name || !Number.isFinite(kcal) || kcal <= 0 || kcal > 5000) return;
    log({ name, kcal, protein: 0, carbs: 0, fat: 0 });
    $("manualName").value = "";
    $("manualKcal").value = "";
  });
  onAction($("tab-photo"), {
    "add-scan": () => {
      if (!lastResult) return;
      const r = lastResult;
      log({ name: r.foods.map((f) => f.name).join(" + ").slice(0, 80), kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat });
      lastResult = null;
      replaceChildren($("scanOutput"));
    },
    "remove-food": (b) => update((s) => { s.foodLogs = removeFood(s.foodLogs, todayISO(), Number(b.dataset.index)); }),
  });
}
