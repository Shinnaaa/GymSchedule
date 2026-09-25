import "./styles.css";
import { $, show } from "./ui/dom";
import { applyStaticText, onLanguageChange } from "./ui/locale";
import { renderNutrition, wireNutrition } from "./ui/nutrition";
import { renderFoodLog, wirePhoto } from "./ui/photo";
import { renderSettings, wireSettings } from "./ui/settings";
import { renderShopping, wireShopping } from "./ui/shopping";
import { emit, initStore, onChange, store } from "./ui/store";
import { renderToday, wireToday } from "./ui/today";
import { renderWeight, wireWeight } from "./ui/weight";

function switchTab(name) {
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === `tab-${name}`));
  if (name === "weight") renderWeight(); // the chart needs the panel to be visible to measure it
}

function renderAll() {
  show($("onboardBanner"), !store.state.onboarded);
  renderToday();
  renderNutrition();
  renderFoodLog();
  renderShopping();
  renderWeight();
  renderSettings();
}

function init() {
  applyStaticText();
  initStore();
  document.querySelectorAll(".tab-btn").forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.tab)));
  document.querySelectorAll("[data-go-tab]").forEach((b) =>
    b.addEventListener("click", () => {
      switchTab(b.dataset.goTab);
      $(`tab-${b.dataset.goTab}`).scrollIntoView({ behavior: "smooth" });
    })
  );
  wireToday({ onChange: emit });
  wireNutrition();
  wirePhoto();
  wireShopping();
  wireWeight();
  wireSettings();
  onChange(renderAll);
  onLanguageChange(renderAll);
  document.addEventListener("keydown", (e) => e.key === "Escape" && show($("weightModal"), false));
  window.addEventListener("resize", () => renderWeight());
  renderAll();
  // The clock and "right now" move with time; the rest only changes on input.
  setInterval(renderToday, 20_000);
}

init();
