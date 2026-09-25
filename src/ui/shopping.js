import { isoDate } from "../core/plan";
import { shoppingForDay } from "../core/shopping";
import { $, h, onAction, replaceChildren } from "./dom";
import { locale, t } from "./locale";
import { store, targetsFor, update } from "./store";
import { dayTitle } from "./today";

const CHIP = { train: "chip-train", cardio: "chip-cardio", rest: "chip-rest" };

export function renderShopping() {
  const now = new Date();
  const days = [1, 2, 3].map((offset) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    return { date, iso: isoDate(date), day: store.state.plan[date.getDay()] };
  });
  // Ticks only matter for the days shown.
  const checked = store.state.shoppingChecked;
  replaceChildren($("shopContent"),
    days.map(({ date, iso, day }) =>
      h("div", { class: "shop-day" },
        h("div", { class: "shop-day-hd" }, date.toLocaleDateString(locale(), { month: "numeric", day: "numeric", weekday: "short" }), " ",
          h("span", { class: CHIP[day.type] }, dayTitle(day))),
        h("div", { class: "shop-items" }, shoppingForDay(day.type, targetsFor(day.type)).map((item) => {
          const key = `${iso}:${item.key}`;
          return h("button", { class: `shop-item${checked[key] ? " checked" : ""}`, data: { action: "toggle-shop", key } },
            h("div", { class: "shop-check" }, checked[key] ? "✓" : ""),
            h("span", { class: "shop-name" }, t(`shop.${item.key}`)),
            h("span", { class: "shop-qty" }, item.unit === "pc" ? t("unit.pc", { n: item.amount }) : `${item.amount} g`));
        })))),
    h("button", { class: "shop-reset", data: { action: "reset-shop" } }, t("shop.reset")));
}

export function wireShopping() {
  onAction($("tab-shopping"), {
    "toggle-shop": (b) => update((s) => {
      const today = isoDate(new Date());
      const kept = Object.fromEntries(Object.entries(s.shoppingChecked).filter(([k]) => k.slice(0, 10) > today));
      kept[b.dataset.key] = !kept[b.dataset.key];
      s.shoppingChecked = kept;
    }),
    "reset-shop": () => update((s) => { s.shoppingChecked = {}; }),
  });
}
