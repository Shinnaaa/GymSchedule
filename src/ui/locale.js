import { LANGUAGES, detectLanguage, translate } from "../core/i18n";
import { h, replaceChildren } from "./dom";

const KEY = "fitnessos:lang";
const listeners = new Set();

function initialLanguage() {
  try {
    const saved = localStorage.getItem(KEY);
    if (LANGUAGES.some((l) => l.code === saved)) return saved;
  } catch {
    // storage unavailable
  }
  return detectLanguage(navigator.languages || [navigator.language]);
}

let lang = initialLanguage();

export const t = (key, vars) => translate(lang, key, vars);
export const currentLanguage = () => lang;
export const locale = () => ({ zh: "zh-CN", ja: "ja-JP" })[lang] || "en-US";

export function onLanguageChange(fn) {
  listeners.add(fn);
}

export function setLanguage(code) {
  lang = code;
  try {
    localStorage.setItem(KEY, code);
  } catch {
    // storage unavailable
  }
  applyStaticText();
  listeners.forEach((fn) => fn(code));
}

/** Fills every element carrying data-i18n / -placeholder / -title in the static HTML. */
export function applyStaticText(root = document) {
  document.documentElement.lang = lang;
  document.title = t("app.name");
  root.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => (el.placeholder = t(el.dataset.i18nPlaceholder)));
  root.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
    el.setAttribute("aria-label", el.title);
  });
  root.querySelectorAll("[data-role=lang-switch]").forEach((box) =>
    replaceChildren(
      box,
      LANGUAGES.map((l) =>
        h("button", { type: "button", class: l.code === lang ? "active" : "", data: { lang: l.code }, title: l.name }, l.short)
      )
    )
  );
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-role=lang-switch] button[data-lang]");
  if (button && button.dataset.lang !== lang) setLanguage(button.dataset.lang);
});
