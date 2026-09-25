import { HEALTHY_BODY_FAT, bmi, bmiCategory, bodyFatCategory, upsertWeighIn, weightStats } from "../core/body";
import { $, h, onAction, replaceChildren, show } from "./dom";
import { locale, t } from "./locale";
import { store, todayISO, update } from "./store";

const COLOR = {
  bmi: { under: "var(--cyan)", normal: "var(--lime)", over: "var(--yellow)", obese: "var(--orange)" },
  bf: { essential: "var(--cyan)", athletic: "var(--lime)", fitness: "var(--lime)", average: "var(--yellow)", high: "var(--orange)" },
};
const signed = (n) => (n > 0 ? `+${n}` : String(n));
const deltaColor = (n) => (n == null || n === 0 ? "var(--muted)" : n < 0 === (store.state.profile.goal !== "gain") ? "var(--lime)" : "var(--orange)");
const shortDate = (iso) => new Date(iso + "T00:00:00").toLocaleDateString(locale(), { month: "numeric", day: "numeric" });

function stat(label, value, unit, sub, color) {
  return h("div", { class: "wt-stat" },
    h("div", { class: "wt-stat-label" }, label),
    h("div", { class: "wt-stat-val", style: color ? { color } : null }, value, h("span", { class: "wt-stat-unit" }, unit)),
    h("div", { class: "wt-stat-sub" }, sub));
}

function gauge(title, value, unit, pct, color, status, range) {
  return h("div", { class: "gauge-card" },
    h("div", { class: "gauge-title" }, title),
    h("div", { class: "gauge-val" }, value, unit ? h("span", { class: "gauge-unit" }, unit) : null),
    h("div", { class: "gauge-wrap" }, h("div", { class: "gauge-track", style: { width: `${pct}%`, background: color } })),
    h("div", { class: "gauge-status", style: { color } }, status),
    h("div", { class: "gauge-range" }, range));
}

function renderChart(log) {
  const canvas = $("weightChart");
  const enough = log.length >= 2;
  show(canvas, enough);
  show($("chartEmpty"), !enough);
  if (!enough) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.parentElement.clientWidth;
  const H = 160;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.height = `${H}px`;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  const data = [...log].reverse();
  const vals = data.map((d) => d.weight);
  const min = Math.min(...vals) - 1;
  const max = Math.max(...vals) + 1;
  const pad = { top: 16, right: 12, bottom: 28, left: 40 };
  const cw = W - pad.left - pad.right;
  const ch = H - pad.top - pad.bottom;
  const x = (i) => pad.left + (i / Math.max(data.length - 1, 1)) * cw;
  const y = (v) => pad.top + ch - ((v - min) / (max - min)) * ch;
  ctx.font = "500 9px Barlow, sans-serif";
  for (let i = 0; i <= 4; i++) {
    const gy = pad.top + (i / 4) * ch;
    ctx.strokeStyle = "#1e2428";
    ctx.beginPath(); ctx.moveTo(pad.left, gy); ctx.lineTo(pad.left + cw, gy); ctx.stroke();
    ctx.fillStyle = "#4a5560"; ctx.textAlign = "right";
    ctx.fillText((max - ((max - min) * i) / 4).toFixed(1), pad.left - 4, gy + 3);
  }
  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch);
  grad.addColorStop(0, "rgba(184,255,60,0.15)");
  grad.addColorStop(1, "rgba(184,255,60,0)");
  ctx.beginPath();
  vals.forEach((v, i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v))));
  ctx.lineTo(x(vals.length - 1), pad.top + ch); ctx.lineTo(x(0), pad.top + ch); ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();
  ctx.strokeStyle = "#b8ff3c"; ctx.lineWidth = 2; ctx.lineJoin = "round";
  ctx.beginPath(); vals.forEach((v, i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v)))); ctx.stroke();
  ctx.fillStyle = "#b8ff3c";
  vals.forEach((v, i) => { ctx.beginPath(); ctx.arc(x(i), y(v), 3, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = "#4a5560"; ctx.textAlign = "center";
  data.forEach((d, i) => { if (i === 0 || i === data.length - 1 || i % 3 === 0) ctx.fillText(shortDate(d.date), x(i), H - 6); });
}

export function renderWeight() {
  const { weighIns: log, profile } = store.state;
  const stats = weightStats(log);
  replaceChildren($("wtStatsRow"), stats
    ? [
        stat(t("wt.current"), String(stats.latest.weight), " kg", shortDate(stats.latest.date)),
        stat(t("wt.lastChange"), stats.lastChange == null ? "--" : signed(stats.lastChange), " kg", t("wt.vsPrevious"), deltaColor(stats.lastChange)),
        stat(t("wt.totalChange"), stats.totalChange == null ? "--" : signed(stats.totalChange), " kg", t("wt.sinceStart"), deltaColor(stats.totalChange)),
      ]
    : h("div", { class: "weight-empty span-all" }, t("wt.empty")));

  if (stats) {
    const value = bmi(stats.latest.weight, profile.height);
    const cat = bmiCategory(value);
    const fat = stats.latest.fat;
    const bfCat = fat == null ? null : bodyFatCategory(profile.sex, fat);
    replaceChildren($("gaugeRow"),
      gauge(t("wt.bmi", { height: profile.height }), value.toFixed(1), "", Math.min(100, ((value - 15) / 25) * 100), COLOR.bmi[cat], t(`bmi.${cat}`), t("wt.bmiRange")),
      fat == null
        ? h("div", { class: "gauge-card" }, h("div", { class: "gauge-title" }, t("wt.bodyFat")), h("div", { class: "gauge-range" }, t("wt.bfNone")))
        : gauge(t("wt.bodyFat"), fat.toFixed(1), "%", Math.min(100, ((fat - 3) / 47) * 100), COLOR.bf[bfCat], t(`bf.${bfCat}`), t("wt.bfRange", { range: HEALTHY_BODY_FAT[profile.sex] })));
  } else {
    replaceChildren($("gaugeRow"), h("div", { class: "weight-empty span-all" }, t("wt.metricsEmpty")));
  }

  $("weightGoal").textContent = t(`wt.goal.${profile.goal}`, { rate: profile.rate });
  replaceChildren($("weightLog"), log.map((entry, i) => {
    const prev = log[i + 1];
    const d = prev ? Math.round((entry.weight - prev.weight) * 10) / 10 : null;
    return h("div", { class: "weight-entry" },
      h("span", { class: "weight-entry-date" }, shortDate(entry.date)),
      h("span", { class: "weight-entry-val" }, String(entry.weight), h("span", { class: "wt-stat-unit" }, " kg")),
      entry.fat != null ? h("span", { class: "weight-entry-fat" }, `${entry.fat}%`) : null,
      d != null ? h("span", { class: `weight-entry-delta ${d < 0 ? "delta-down" : d > 0 ? "delta-up" : "delta-flat"}` }, `${d < 0 ? "▼" : d > 0 ? "▲" : "–"}${Math.abs(d)}`) : null,
      h("button", { class: "weight-del", data: { action: "delete-weight", date: entry.date }, "aria-label": t("btn.delete") }, "✕"));
  }));
  renderChart(log);
}

export function openWeightModal() {
  $("modalDateHint").textContent = t("modal.hint", { date: new Date().toLocaleDateString(locale(), { month: "long", day: "numeric" }) });
  $("weightInput").value = "";
  $("fatInput").value = "";
  show($("weightModal"));
  setTimeout(() => $("weightInput").focus(), 100);
}

export function wireWeight() {
  $("open-weight-modal").addEventListener("click", openWeightModal);
  $("weightCancel").addEventListener("click", () => show($("weightModal"), false));
  $("weightModal").addEventListener("click", (e) => e.target === $("weightModal") && show($("weightModal"), false));
  $("weightForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const weight = Number($("weightInput").value);
    const fatRaw = $("fatInput").value;
    const fat = fatRaw === "" ? null : Number(fatRaw);
    if (!Number.isFinite(weight) || weight < 30 || weight > 300) return;
    if (fat != null && (!Number.isFinite(fat) || fat < 3 || fat > 60)) return;
    update((s) => {
      s.weighIns = upsertWeighIn(s.weighIns, { date: todayISO(), weight, fat });
      s.profile.weight = weight; // targets follow the latest weigh-in
    });
    show($("weightModal"), false);
  });
  onAction($("tab-weight"), {
    "delete-weight": (b) => update((s) => { s.weighIns = s.weighIns.filter((w) => w.date !== b.dataset.date); }),
  });
}
