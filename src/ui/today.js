// Top of the page: clock, program week, day picker, today's card, "right now",
// override buttons, the timeline and the mobility routine.

import { overrideChoices, programWeek, weekDates } from "../core/plan";
import { buildTimeline, position, toMinutes } from "../core/timeline";
import { $, h, onAction, replaceChildren, show } from "./dom";
import { locale, t } from "./locale";
import { isViewingToday, planFor, store, targetsFor, todayIndex } from "./store";

const CHIP = { train: "chip-train", cardio: "chip-cardio", rest: "chip-rest" };
const sameChoice = (a, b) => a && b && a.type === b.type && a.label === b.label;

export function dayTitle(day) {
  return day.label || t(`dayType.${day.type}`);
}

function renderClock() {
  const now = new Date();
  $("clock").textContent = now.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit", hour12: false });
  $("clockDate").textContent = now.toLocaleDateString(locale(), { month: "numeric", day: "numeric", weekday: "short" });
}

function renderWeek() {
  const { week, phase } = programWeek(store.state.startDate);
  $("weekNum").textContent = t("week.num", { n: week });
  $("weekNote").textContent = t(`phase.${phase}`);
}

function renderDayPicker() {
  replaceChildren($("dayPicker"), weekDates().map((date) => {
    const weekday = date.getDay();
    const today = weekday === todayIndex();
    return h("button", { class: `dp-item${weekday === store.viewDay ? " active" : ""}`, data: { action: "view-day", day: weekday } },
      h("div", { class: "dp-dow" }, date.toLocaleDateString(locale(), { weekday: "short" })),
      h("div", { class: "dp-date" }, date.toLocaleDateString(locale(), { month: "numeric", day: "numeric" })),
      h("div", { class: `dp-dot ${planFor(weekday).type}` }),
      today ? h("div", { class: "dp-today-marker" }, "TODAY") : h("div", { class: "dp-spacer" }));
  }));
}

function timelineFor(day) {
  return buildTimeline(day.type, store.state.workoutTime, targetsFor(day.type), dayTitle(day));
}

function entryText(entry) {
  const params = { ...entry.params, label: entry.params.label || t(`dayType.${entry.key === "workout.cardio" ? "cardio" : "train"}`) };
  return { task: t(entry.key), detail: t(entry.detail, params), tag: entry.tag ? t(entry.tag) : "" };
}

function renderHero(day) {
  const targets = targetsFor(day.type);
  $("dayChip").textContent = t(`dayType.${day.type}`);
  $("dayChip").className = `day-chip ${CHIP[day.type]}`;
  $("dayTitle").textContent = dayTitle(day);
  const badge = $("dietBadge");
  badge.textContent = t(`diet.${day.type}`, { kcal: targets.kcal });
  badge.className = `diet-badge diet-${{ train: "high", cardio: "mid", rest: "low" }[day.type]}`;
  show($("overrideChip"), isViewingToday() && Boolean(store.override));
}

function renderNow(entries) {
  show($("nowCard"), isViewingToday());
  if (!isViewingToday()) return;
  const now = new Date();
  const { current, next } = position(entries, now.getHours() * 60 + now.getMinutes());
  const cur = current >= 0 ? entryText(entries[current]) : null;
  const nxt = next >= 0 ? entryText(entries[next]) : null;
  if (cur) {
    $("nowTask").textContent = cur.task;
    $("nowDetail").textContent = cur.detail;
  } else if (nxt) {
    $("nowTask").textContent = t("now.prepare", { task: nxt.task });
    $("nowDetail").textContent = nxt.detail;
  } else {
    $("nowTask").textContent = t("now.doneTitle");
    $("nowDetail").textContent = t("now.doneDetail");
  }
  show($("nowNext"), Boolean(cur && nxt));
  if (cur && nxt) {
    $("nowNextTime").textContent = entries[next].time;
    $("nowNextTask").textContent = nxt.task;
  }
}

function renderOverride() {
  show($("overrideSection"), isViewingToday());
  const choices = overrideChoices(store.state.plan);
  replaceChildren($("overrideButtons"),
    choices.map((choice, i) =>
      h("button", { class: `ovr-btn${sameChoice(store.override, choice) ? " active-ovr" : ""}`, data: { action: "override", index: i } }, dayTitle(choice))),
    h("button", { class: "ovr-btn reset-btn", data: { action: "reset-override" } }, t("override.reset")));
  $("overrideHint").classList.toggle("visible", Boolean(store.override));
}

function renderTimeline(entries) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = isViewingToday();
  replaceChildren($("timeline"), entries.map((entry, i) => {
    const start = toMinutes(entry.time);
    const end = i + 1 < entries.length ? toMinutes(entries[i + 1].time) : 1440;
    const state = !today ? "" : nowMin >= start && nowMin < end ? "active" : nowMin >= end ? "past" : "";
    const { task, detail, tag } = entryText(entry);
    return h("div", { class: `tl-item ${state}` },
      h("div", { class: "tl-time" }, entry.time),
      h("div", { class: "tl-spine" }, h("div", { class: "tl-dot" }), h("div", { class: "tl-vline" })),
      h("div", { class: "tl-body" },
        h("div", { class: "tl-task-row" }, h("span", { class: "tl-task" }, task), tag ? h("span", { class: "tl-tag" }, tag) : null),
        h("div", { class: "tl-detail" }, detail)));
  }));
}

function renderMobility() {
  replaceChildren($("mobilityGrid"), store.state.mobility.map((item) => {
    const [name, ...rest] = item.split(" · ");
    return h("div", { class: "spine-item" }, name, rest.length ? h("span", { class: "spine-sub" }, rest.join(" · ")) : null);
  }));
}

export function renderToday() {
  renderClock();
  renderWeek();
  renderDayPicker();
  const day = planFor(store.viewDay);
  const entries = timelineFor(day);
  renderHero(day);
  renderNow(entries);
  renderOverride();
  renderTimeline(entries);
  renderMobility();
}

export function wireToday({ onChange }) {
  onAction(document.body, {
    "view-day": (b) => {
      store.viewDay = Number(b.dataset.day);
      onChange();
    },
    override: (b) => {
      store.override = overrideChoices(store.state.plan)[Number(b.dataset.index)];
      store.viewDay = todayIndex();
      onChange();
    },
    "reset-override": () => {
      store.override = null;
      onChange();
    },
  });
}
