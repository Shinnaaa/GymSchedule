// Shopping list for upcoming days, sized from each day's targets.

const PROTEIN_PER_100G = 25;
const CARBS_PER_100G = 28;
const round = (n, step) => Math.max(step, Math.round(n / step) * step);

/** Items for one day: { key, amount, unit } — the UI translates `key`. */
export function shoppingForDay(type, targets) {
  const shakeAndYogurt = type === "rest" ? 25 : 50; // protein from bedtime yogurt (+ shake on active days)
  const items = [
    { key: "protein", amount: round(((targets.protein - shakeAndYogurt) / PROTEIN_PER_100G) * 100, 50), unit: "g" },
    { key: "carbs", amount: round((targets.carbs / CARBS_PER_100G) * 100, 50), unit: "g" },
    { key: "vegetables", amount: 400, unit: "g" },
    { key: "yogurt", amount: 150, unit: "g" },
  ];
  if (type !== "rest") items.push({ key: "fruit", amount: 1, unit: "pc" });
  if (type === "rest") items.push({ key: "fats", amount: 30, unit: "g" });
  return items;
}
