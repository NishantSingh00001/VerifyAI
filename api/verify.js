// VerifyAI — serverless verification endpoint (Vercel Node function)
// Calls Google Gemini with Google Search grounding and returns a structured verdict.
// The API key is read from the GEMINI_API_KEY environment variable (set it in Vercel).

const MODEL = "gemini-2.5-flash";

export default async function handler(req, res) {
  // CORS (same-origin in practice; permissive for safety)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is not set. Add it in your Vercel project settings (Environment Variables), then redeploy."
    });
  }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const claim = (body && body.claim ? String(body.claim) : "").trim();
  if (!claim) return res.status(400).json({ error: "No claim provided." });
  if (claim.length > 1200) return res.status(400).json({ error: "Claim is too long (max 1200 characters)." });

  const prompt =
`You are a careful, non-partisan fact-checker. Use web search to verify the CLAIM below.
Think about what evidence would confirm or refute it, search for primary and reputable secondary sources, and weigh what you find.

Return ONLY a JSON object (no markdown fences) with exactly these keys:
{
  "verdict": one of "TRUE" | "MISLEADING" | "FALSE" | "UNVERIFIED",
  "confidence": integer 0-100,
  "summary": one or two sentence plain-language verdict,
  "reasoning": array of 3-5 short strings, each a concrete evidence-based point
}
Rules:
- "MISLEADING" = technically true but framed to mislead (wrong context, outdated, cherry-picked).
- "UNVERIFIED" = you could not find adequate sources. Do not guess; use this when unsure.
- Be concise and specific. Do not include URLs in the JSON (sources are attached automatically).

CLAIM: "${claim}"`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 1024 }
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await r.json();
    if (!r.ok) {
      const msg = (data && data.error && data.error.message) ? data.error.message : "Gemini API error.";
      return res.status(502).json({ error: msg });
    }

    const cand = data.candidates && data.candidates[0];
    const parts = (cand && cand.content && cand.content.parts) || [];
    let text = parts.map(p => p.text || "").join("").trim();

    // strip accidental code fences
    text = text.replace(/^```(?:json)?/i, "").replace(/```$/,"").trim();

    let parsed;
    try { parsed = JSON.parse(text); }
    catch (e) {
      const m = text.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch (e2) {} }
    }
    if (!parsed) {
      return res.status(200).json({
        verdict: "UNVERIFIED", confidence: null,
        summary: "The model did not return a structured verdict. Try rephrasing the claim.",
        reasoning: [], sources: collectSources(cand)
      });
    }

    const out = {
      verdict: String(parsed.verdict || "UNVERIFIED").toUpperCase(),
      confidence: (typeof parsed.confidence === "number") ? Math.max(0, Math.min(100, Math.round(parsed.confidence))) : null,
      summary: parsed.summary || "",
      reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning.slice(0, 6).map(String) : [],
      sources: collectSources(cand)
    };
    return res.status(200).json(out);
  } catch (err) {
    return res.status(502).json({ error: "Could not reach the verification service: " + (err && err.message ? err.message : "unknown error") });
  }
}

function collectSources(cand) {
  const out = [];
  const gm = cand && cand.groundingMetadata;
  const chunks = (gm && gm.groundingChunks) || [];
  chunks.forEach(c => {
    if (c && c.web && c.web.uri) out.push({ title: c.web.title || c.web.uri, uri: c.web.uri });
  });
  // de-dupe by uri
  const seen = {}; const dedup = [];
  out.forEach(s => { if (!seen[s.uri]) { seen[s.uri] = 1; dedup.push(s); } });
  return dedup.slice(0, 8);
}
