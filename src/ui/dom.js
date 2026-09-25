// Tiny DOM helpers. Everything user-controlled is inserted as text; no HTML
// strings are ever built from data, and no inline event handlers exist.

export const $ = (id) => document.getElementById(id);

/**
 * h("button", { class: "btn", data: { action: "copy", id } }, "Copy")
 * Props: class, data (dataset), style (object), text, and plain attributes.
 * Children: strings (as text), nodes, arrays, or null/false (skipped).
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue;
    if (key === "class") el.className = value;
    else if (key === "data") Object.assign(el.dataset, value);
    else if (key === "style") Object.assign(el.style, value);
    else if (key === "text") el.textContent = value;
    else if (key.startsWith("on")) throw new Error("use data-action + delegation instead of inline handlers");
    else el.setAttribute(key, value === true ? "" : value);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

export function show(el, visible = true) {
  el.classList.toggle("hidden", !visible);
}

export function replaceChildren(el, ...children) {
  el.replaceChildren();
  append(el, children);
}

/** Calls handler(actionElement, event) for clicks on [data-action] inside root. */
export function onAction(root, handlers) {
  root.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target || !root.contains(target)) return;
    const handler = handlers[target.dataset.action];
    if (handler) handler(target, event);
  });
}
