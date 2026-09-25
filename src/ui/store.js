// App state + derived values shared by the views.

import { localizedDefaults } from "../core/i18n";
import { dayTargets } from "../core/nutrition";
import { dayPlan, isoDate } from "../core/plan";
import { loadState, saveState } from "../core/storage";
import { currentLanguage } from "./locale";

export const store = {
  state: null,
  override: null, // today's day-type override; not persisted, like v1
  viewDay: new Date().getDay(),
};

const listeners = new Set();

export function onChange(fn) {
  listeners.add(fn);
}

export function emit() {
  listeners.forEach((fn) => fn());
}

export function initStore() {
  store.state = loadState(localStorage, localizedDefaults(currentLanguage()));
  saveState(store.state); // persists a v1 migration right away
}

/** Mutate the state, persist it and re-render. */
export function update(mutate) {
  mutate(store.state);
  saveState(store.state);
  emit();
}

export const todayIndex = () => new Date().getDay();
export const todayISO = () => isoDate(new Date());
export const isViewingToday = () => store.viewDay === todayIndex();

/** The plan entry for a weekday; the override only ever applies to today. */
export function planFor(weekday) {
  const override = weekday === todayIndex() ? store.override : null;
  return dayPlan(store.state.plan, weekday, override);
}

export function targetsFor(type) {
  return dayTargets(store.state.profile, store.state.plan, type, store.state.tier);
}
