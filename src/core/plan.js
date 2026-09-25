// The weekly plan: one entry per weekday (index 0 = Sunday, as Date#getDay).

export const DAY_TYPES = ["train", "cardio", "rest"];

/** A common beginner split for new users: push / pull / legs plus one cardio day. */
export function defaultPlan(labels = {}) {
  return [
    { type: "rest", label: "" },
    { type: "train", label: labels.push || "Push · chest, shoulders, triceps" },
    { type: "rest", label: "" },
    { type: "train", label: labels.pull || "Pull · back, biceps" },
    { type: "rest", label: "" },
    { type: "train", label: labels.legs || "Legs · quads, hamstrings, glutes" },
    { type: "cardio", label: labels.cardio || "Incline walk · 40 min" },
  ];
}

export function normalizePlan(plan) {
  if (!Array.isArray(plan) || plan.length !== 7) return defaultPlan();
  return plan.map((day) => ({
    type: DAY_TYPES.includes(day?.type) ? day.type : "rest",
    label: typeof day?.label === "string" ? day.label.slice(0, 60) : "",
  }));
}

/** The plan for a weekday, honouring a one-day override ({ type, label }). */
export function dayPlan(plan, weekday, override = null) {
  return override ? { type: override.type, label: override.label || "" } : plan[weekday];
}

/** Choices for "change today to": each distinct workout in the plan, then cardio and rest. */
export function overrideChoices(plan) {
  const seen = new Set();
  const workouts = plan.filter((d) => d.type !== "rest" && !seen.has(d.type + d.label) && seen.add(d.type + d.label));
  const choices = workouts.map((d) => ({ type: d.type, label: d.label }));
  if (!choices.some((c) => c.type === "cardio")) choices.push({ type: "cardio", label: "" });
  choices.push({ type: "rest", label: "" });
  return choices;
}

/** Program week (1-based) and phase from the start date. Weeks start on Monday. */
export function programWeek(startISO, now = new Date()) {
  const monday = (d) => {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  };
  const start = startISO ? monday(new Date(startISO + "T00:00:00")) : monday(now);
  const week = Math.max(1, Math.round((monday(now) - start) / (7 * 86_400_000)) + 1);
  const phase = week <= 2 ? "rampUp" : week <= 4 ? "build" : "progress";
  return { week, phase };
}

/** Monday-first dates of the week containing `now`. */
export function weekDates(now = new Date()) {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
