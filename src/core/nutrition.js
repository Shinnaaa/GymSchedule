// Carb-cycling nutrition targets.
//
// 1. BMR from Mifflin-St Jeor (sex-specific), TDEE = BMR × activity factor.
// 2. The goal (kg per week) sets a daily energy delta (≈7,700 kcal per kg of body fat).
// 3. That weekly average is spread across day types with weights (training days
//    get more, rest days less) and normalised, so the week still averages exactly
//    to the target for the user's own plan.
// 4. Protein is fixed per kg; fat has a floor per kg; carbs take the rest — so
//    carbs are what cycles between day types.

export const ACTIVITY = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 };
export const KCAL_PER_KG = 7700;
export const DAY_WEIGHT = { train: 1.12, cardio: 1.0, rest: 0.9 };
export const TIER_SCALE = { strict: 0.95, normal: 1.0, loose: 1.05 };
const FAT_SHARE = { train: 0.25, cardio: 0.28, rest: 0.35 };
const FAT_MIN_PER_KG = { train: 0.6, cardio: 0.6, rest: 0.8 };
const MIN_CARBS = 30;

export function bmr({ sex, weight, height, age }) {
  return 10 * weight + 6.25 * height - 5 * age + (sex === "female" ? -161 : 5);
}

export function tdee(profile) {
  return bmr(profile) * (ACTIVITY[profile.activity] || ACTIVITY.light);
}

/** Daily kcal change from the goal: negative to lose, positive to gain. */
export function dailyDelta({ goal, rate }) {
  if (goal === "maintain") return 0;
  const sign = goal === "gain" ? 1 : -1;
  return (sign * rate * KCAL_PER_KG) / 7;
}

/** Normalisation so Σ(weight × k) over the plan's 7 days equals 7. */
export function weekFactor(plan) {
  const total = plan.reduce((sum, day) => sum + DAY_WEIGHT[day.type], 0);
  return total > 0 ? 7 / total : 1;
}

/** Macros for one day type under the user's plan. */
export function dayTargets(profile, plan, dayType, tier = "normal") {
  const base = tdee(profile);
  const average = base + dailyDelta(profile);
  let kcal = average * DAY_WEIGHT[dayType] * weekFactor(plan) * (TIER_SCALE[tier] || 1);

  const protein = profile.proteinPerKg * profile.weight;
  let fat = Math.max(FAT_MIN_PER_KG[dayType] * profile.weight, (FAT_SHARE[dayType] * kcal) / 9);
  let carbs = (kcal - protein * 4 - fat * 9) / 4;
  if (carbs < MIN_CARBS) {
    // Very small targets: keep a carb floor, trim fat to its minimum, and let kcal rise to fit.
    carbs = MIN_CARBS;
    fat = FAT_MIN_PER_KG[dayType] * profile.weight;
    kcal = protein * 4 + carbs * 4 + fat * 9;
  }
  return {
    kcal: Math.round(kcal),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
  };
}

/** Week-level numbers for the summary: BMR, TDEE, the average target and the expected change. */
export function weekSummary(profile, plan, tier = "normal") {
  const days = plan.map((day) => dayTargets(profile, plan, day.type, tier).kcal);
  const average = days.reduce((a, b) => a + b, 0) / 7;
  const base = tdee(profile);
  return {
    bmr: Math.round(bmr(profile)),
    tdee: Math.round(base),
    average: Math.round(average),
    kgPerWeek: Math.round((((average - base) * 7) / KCAL_PER_KG) * 100) / 100,
    // Flag only clearly aggressive plans; hovering around BMR is common in a cut.
    belowBmr: average < 0.9 * bmr(profile),
  };
}
