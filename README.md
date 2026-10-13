# VerifyAI

**Check a claim or image before you share it — a verdict with the evidence, powered by live web search.**

VerifyAI is a multi-page web app that fact-checks a statement against the live web and returns a plain verdict (True / Misleading / False / Unverified) with a confidence figure and the **sources it used**. For images, it reads hidden EXIF metadata in your browser and gives one-tap reverse-image search. It's free, with no accounts.

---

## How it works

- **Claims** are sent to a small serverless function (`/api/verify`) which calls **Google Gemini** with **Google Search grounding** — real web search — and returns a structured verdict plus the source links.
- **Images** are read **in your browser** with `exifr` (capture date, camera, editing software, GPS). The image itself is never uploaded. Reverse-image links (Google Lens, TinEye, Bing) help you find where a photo first appeared.

The AI key lives **server-side only**, as an environment variable — it is never exposed to visitors.

---

## Pages

```
verifyai/
├── index.html      # Home (masthead, verdict stamp, method)
├── verify.html     # The verifier (claim + image → verdict + sources)
├── how.html        # How the method works
├── about.html      # About, limits, honest disclaimers
├── style.css       # Shared Editorial Newsroom styling
├── api/
│   └── verify.js   # Serverless function → Gemini + Google Search
└── README.md
```

Every page links to the others through the top navigation.

---

## Deploying to Vercel (free)

1. Push this whole folder to a GitHub repo.
2. In Vercel: **Add New → Project → Import** the repo. Framework preset: **Other**. Leave build settings empty.
3. **Get a free Gemini API key:** go to **[Google AI Studio](https://aistudio.google.com/app/apikey)** → *Create API key*. (Free tier, no card.)
4. In Vercel → your project → **Settings → Environment Variables**, add:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** *(your key)*
   - Apply to Production (and Preview).
5. **Deploy** (or redeploy after adding the key). Your site is live at `https://<your-project>.vercel.app/`.

The `/api/verify` function runs automatically — Vercel detects the `api/` folder; no extra config needed.

> **Note:** the verifier only returns real results on the deployed Vercel site (where the key and the serverless function exist). In a static/local preview, the backend isn't running — use the **"See a sample verdict"** button to preview the result UI. Image EXIF and reverse-image links work everywhere.

### Netlify instead?
Netlify works too, but the function path differs (`netlify/functions/verify.js` + a redirect from `/api/verify`). Vercel is the simplest for this layout.

---

## Cost

- **Gemini API** has a free tier that comfortably covers personal/demo use. If you exceed it, Google may require billing — monitor usage in Google AI Studio.
- **Vercel Hobby** hosting and serverless functions are free for personal projects.

No other paid services are used.

---

## Configuration

- **Model:** change `MODEL` at the top of `api/verify.js` (default `gemini-2.5-flash`).
- **Prompt / verdict rules:** edit the prompt string in `api/verify.js`.
- **Sample claims / demo result:** edit `SAMPLES` and `DEMO` in `verify.html`.

---

## Honest limitations

VerifyAI uses an AI model with web search. It can be confidently wrong, miss context, or rely on a weak source. It is a **starting point**, not a final authority — always open the sources and judge them yourself. It can't fact-check opinions or predictions, struggles with breaking news (expect "Unverified"), and can't prove an image is AI-generated (metadata is a hint, not proof). It is **not a substitute for professional fact-checking**.

---

*Free, no account. Your images never leave your device.*
