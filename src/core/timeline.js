// The day's timeline, built from the day type, the workout time and the macro
// targets. Entries carry an i18n key and parameters; the UI translates them.

const PROTEIN_PER_100G = 25; // cooked lean meat, fish or firm tofu, roughly
const CARBS_PER_100G = 28; // cooked rice, roughly

export const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + m;
};
export const toHHMM = (minutes) => {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

const foodParams = (protein, carbs) => ({
  protein: Math.round(protein),
  carbs: Math.round(carbs),
  meat: Math.round((protein / PROTEIN_PER_100G) * 100 / 10) * 10,
  rice: Math.round((carbs / CARBS_PER_100G) * 100 / 10) * 10,
});

const MEALS = [
  { key: "breakfast", time: "08:00" },
  { key: "lunch", time: "12:30" },
  { key: "dinner", time: "19:00" },
];

/**
 * @param {"train"|"cardio"|"rest"} type
 * @param {string} workoutTime "HH:MM"
 * @param {{protein:number,carbs:number}} targets
 * @param {string} label workout description
 */
export function buildTimeline(type, workoutTime, targets, label = "") {
  const entries = [];
  const bedtimeProtein = 25;
  const mealsProtein = (targets.protein - bedtimeProtein - (type === "rest" ? 0 : 25)) / MEALS.length;

  if (type === "rest") {
    // No workout: carbs mostly at lunch, a low-carb breakfast and dinner.
    const split = { breakfast: 0.2, lunch: 0.5, dinner: 0.3 };
    for (const meal of MEALS) {
      const tag = meal.key === "lunch" ? "tag.mainCarbs" : "tag.lowCarb";
      entries.push({ time: meal.time, key: `meal.${meal.key}`, tag, detail: "detail.meal", params: foodParams(mealsProtein, targets.carbs * split[meal.key]) });
    }
  } else {
    const start = toMinutes(workoutTime);
    const duration = type === "train" ? 60 : 40;
    const end = start + duration;
    const preCarbs = Math.round(targets.carbs * 0.15);
    entries.push({ time: toHHMM(start - 60), key: "meal.pre", tag: "tag.fuel", detail: "detail.pre", params: { carbs: preCarbs } });
    entries.push({ time: toHHMM(start), key: type === "train" ? "workout.train" : "workout.cardio", tag: "", detail: type === "train" ? "detail.train" : "detail.cardio", params: { label, minutes: duration } });
    entries.push({ time: toHHMM(end), key: "meal.post", tag: "tag.recovery", detail: "detail.post", params: { protein: 25 } });

    // A meal that would land between the pre-workout snack and 30 minutes after
    // the workout is pushed back, so it never collides with the session.
    const meals = MEALS.map((m) => {
      const at = toMinutes(m.time);
      return { ...m, at: at >= start - 60 && at < end + 30 ? end + 30 : at };
    });
    // The first main meal after the workout gets most of the remaining carbs.
    const remaining = targets.carbs - preCarbs;
    const after = meals.find((m) => m.at >= end) || meals[meals.length - 1];
    for (const meal of meals) {
      const share = meal === after ? 0.55 : 0.225;
      entries.push({ time: toHHMM(meal.at), key: `meal.${meal.key}`, tag: meal === after ? "tag.highCarb" : "", detail: "detail.meal", params: foodParams(mealsProtein, remaining * share) });
    }
  }
  entries.push({ time: "22:00", key: "meal.bedtime", tag: "tag.recovery", detail: "detail.bedtime", params: { protein: bedtimeProtein, total: targets.protein } });
  return entries.sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
}

/** Index of the current entry (or -1) and of the next one (or -1). */
export function position(entries, nowMinutes) {
  let current = -1;
  for (let i = 0; i < entries.length; i++) if (toMinutes(entries[i].time) <= nowMinutes) current = i;
  const next = current + 1 < entries.length ? current + 1 : -1;
  return { current, next };
}
