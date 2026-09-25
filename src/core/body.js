// Weigh-ins, BMI and body-fat categories.

export function upsertWeighIn(log, entry) {
  const others = log.filter((e) => e.date !== entry.date);
  return [...others, entry].sort((a, b) => b.date.localeCompare(a.date)); // newest first
}

export function weightStats(log) {
  if (!log.length) return null;
  const [latest, previous] = log;
  const oldest = log[log.length - 1];
  const r1 = (n) => Math.round(n * 10) / 10;
  return {
    latest,
    lastChange: previous ? r1(latest.weight - previous.weight) : null,
    totalChange: log.length > 1 ? r1(latest.weight - oldest.weight) : null,
  };
}

export const bmi = (weightKg, heightCm) => weightKg / (heightCm / 100) ** 2;

/** WHO adult categories. */
export function bmiCategory(value) {
  if (value < 18.5) return "under";
  if (value < 25) return "normal";
  if (value < 30) return "over";
  return "obese";
}

/** American Council on Exercise ranges. */
export function bodyFatCategory(sex, pct) {
  const cut = sex === "female" ? [14, 21, 25, 32] : [6, 14, 18, 25];
  if (pct < cut[0]) return "essential";
  if (pct < cut[1]) return "athletic";
  if (pct < cut[2]) return "fitness";
  if (pct < cut[3]) return "average";
  return "high";
}

export const HEALTHY_BODY_FAT = { male: "14–17%", female: "21–24%" };
