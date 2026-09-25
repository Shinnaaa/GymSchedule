// @vitest-environment jsdom
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { h } from "../src/ui/dom";
import { MESSAGES } from "../src/core/i18n";
import { buildTimeline } from "../src/core/timeline";

const SRC = join(__dirname, "../src");
const sources = () => {
  const files = [];
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(join(dir, e.name)) : files.push(join(dir, e.name))));
  walk(SRC);
  return files.filter((f) => f.endsWith(".js")).map((f) => [f, readFileSync(f, "utf8")]);
};
const html = readFileSync(join(__dirname, "../index.html"), "utf8");

describe("DOM building is injection-proof", () => {
  const hostile = [`<img src=x onerror=alert(1)>`, `x');alert(1);//`, `"><script>alert(1)</script>`];

  it("renders hostile strings as text", () => {
    const el = h("div", { data: { id: hostile[1] }, title: hostile[2] }, hostile[0], h("span", {}, hostile[2]));
    expect(el.textContent).toBe(hostile[0] + hostile[2]);
    expect(el.querySelector("img, script")).toBeNull();
    expect(el.dataset.id).toBe(hostile[1]);
  });

  it("refuses inline event handlers", () => {
    expect(() => h("button", { onclick: "alert(1)" })).toThrow();
  });

  it("no source file builds HTML from strings or uses inline handlers", () => {
    for (const [file, code] of sources()) {
      expect(code, file).not.toMatch(/\.(innerHTML|outerHTML)\s*=|insertAdjacentHTML|document\.write/);
    }
    expect(html).not.toMatch(/\son[a-z]+=/i);
  });
});

describe("i18n", () => {
  const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  const keys = Object.keys(MESSAGES.en);

  it.each(Object.keys(MESSAGES))("%s has every key with matching placeholders", (code) => {
    expect(Object.keys(MESSAGES[code]).sort()).toEqual([...keys].sort());
    for (const key of keys) expect(placeholders(MESSAGES[code][key]), `${code}:${key}`).toEqual(placeholders(MESSAGES.en[key]));
  });

  it("every key referenced in the UI exists", () => {
    const used = new Set();
    for (const [, code] of sources()) for (const m of code.matchAll(/\bt\(\s*["'`]([\w.-]+)["'`]/g)) used.add(m[1]);
    for (const m of html.matchAll(/data-i18n(?:-placeholder|-title)?="([\w.-]+)"/g)) used.add(m[1]);
    for (const key of used) expect(keys, key).toContain(key);
    expect(used.size).toBeGreaterThan(50);
  });

  it("every timeline key, tag and detail exists", () => {
    const targets = { kcal: 2000, protein: 140, carbs: 200, fat: 60 };
    for (const type of ["train", "cardio", "rest"]) {
      for (const e of buildTimeline(type, "11:20", targets, "x")) {
        for (const key of [e.key, e.tag, e.detail].filter(Boolean)) expect(keys, key).toContain(key);
      }
    }
  });
});
