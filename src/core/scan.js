// Photo calorie estimation with Google Gemini (the user brings their own key).
// The model's reply is untrusted input: it is parsed, validated and clamped
// here, and the UI only ever renders it as text.

export const DEFAULT_MODEL = "gemini-2.5-flash";
const LANGUAGE_NAME = { zh: "Simplified Chinese", en: "English", ja: "Japanese" };

export function buildPrompt(lang = "en") {
  return `You are a sports nutritionist estimating the energy and macros of the food in this photo for someone tracking a diet.

Reference values (cooked weight):
- White rice 200 g: 232 kcal, protein 4 g, carbs 51 g, fat 0.4 g
- Chicken breast 100 g: 165 kcal, protein 31 g, fat 3.6 g
- Lean beef 100 g: 200 kcal, protein 26 g, fat 10 g
- Pork belly / chashu 100 g: 250–500 kcal
- A bowl of ramen with broth: 600–900 kcal; broth and oil add 100–180 kcal
- Stir-fried dishes: add 120–160 kcal of oil per portion; sauces 50–80 kcal

Rules:
1. Estimate each visible item separately (weight, kcal, protein, carbs, fat) and include sauces, oil and broth.
2. total_kcal and the macro totals must equal the sums of the items.
3. When unsure, estimate about 15% high rather than low, and explain the main uncertainty in "tips".
4. Write "name", "basis" and "tips" in ${LANGUAGE_NAME[lang] || "English"}.
5. Output only this JSON, with no other text:
{"foods":[{"name":"","weight_g":0,"kcal":0,"protein_g":0,"carb_g":0,"fat_g":0,"basis":""}],"total_kcal":0,"protein_g":0,"carb_g":0,"fat_g":0,"confidence":"high|medium|low","tips":""}`;
}

const num = (v, max) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(0, Math.round(n))) : 0;
};
const text = (v, max = 80) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Extracts and validates the JSON reply. Throws a short, user-facing reason on failure. */
export function parseScanReply(raw) {
  let body = String(raw || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const first = body.indexOf("{");
  const last = body.lastIndexOf("}");
  if (first < 0 || last < first) throw new Error(body.length > 100 ? "truncated" : "noJson");
  body = body.slice(first, last + 1);
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    throw new Error("noJson");
  }
  const foods = (Array.isArray(data.foods) ? data.foods : []).slice(0, 20).map((f) => ({
    name: text(f?.name) || "?",
    weight: num(f?.weight_g, 5000),
    kcal: num(f?.kcal, 5000),
    protein: num(f?.protein_g, 500),
    carbs: num(f?.carb_g, 1000),
    fat: num(f?.fat_g, 500),
  }));
  if (!foods.length) throw new Error("noFoods");
  const sum = (k) => foods.reduce((s, f) => s + f[k], 0);
  const confidence = ["high", "medium", "low"].includes(data.confidence) ? data.confidence : "low";
  // Recompute totals from the items rather than trusting the model's arithmetic.
  return { foods, kcal: sum("kcal"), protein: sum("protein"), carbs: sum("carbs"), fat: sum("fat"), confidence, tips: text(data.tips, 300) };
}

export async function scanPhoto({ apiKey, model = DEFAULT_MODEL, mimeType, base64, lang, fetchImpl = fetch }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ inline_data: { mime_type: mimeType, data: base64 } }, { text: buildPrompt(lang) }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 8192, responseMimeType: "application/json" },
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${response.status}`);
  }
  const data = await response.json();
  return parseScanReply(data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "");
}

export function looksLikeGeminiKey(key) {
  return /^AIza[\w-]{30,}$/.test(String(key).trim());
}
