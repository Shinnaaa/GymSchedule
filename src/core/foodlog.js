// Food log, keyed by date ("YYYY-MM-DD") and kept for the last 30 days.

export const KEEP_DAYS = 30;

export function addFood(logs, date, item) {
  return { ...logs, [date]: [...(logs[date] || []), item] };
}

export function removeFood(logs, date, index) {
  const list = [...(logs[date] || [])];
  list.splice(index, 1);
  return { ...logs, [date]: list };
}

export function totals(items = []) {
  return items.reduce(
    (t, i) => ({ kcal: t.kcal + (i.kcal || 0), protein: t.protein + (i.protein || 0), carbs: t.carbs + (i.carbs || 0), fat: t.fat + (i.fat || 0) }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export function prune(logs, today, keepDays = KEEP_DAYS) {
  const cutoff = new Date(today + "T00:00:00");
  cutoff.setDate(cutoff.getDate() - keepDays);
  const limit = cutoff.toISOString().slice(0, 10);
  return Object.fromEntries(Object.entries(logs).filter(([date, items]) => date >= limit && items.length));
}
