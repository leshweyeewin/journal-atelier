# Journal Atelier

**A secure, private "Personal Gemini Journal"** — sign in with Google, reflect or
brainstorm with Gemini over multi-turn conversations, and have your entries summarized
and stored with strict per-user isolation.

Built **security-first** on Firebase Authentication, Cloud Firestore, Google Cloud Run,
and **Gemini 3.6 Flash** — with the API key held server-side at all times.

🔗 **Live prototype:** https://journal-atelier.ai.studio/

> Built for the **Google Cloud GenAI Academy (APAC) — Cohort 3 · Ideathon Challenge**.
> `#AccelerateAIwithCloudRun`

---

## Inspiration

Journaling is one of the most personal things a person does — and that is exactly why
"AI journaling" apps make us nervous. The moment a private thought is typed into a text
box, the honest question is: *where does it go, who can read it, and what holds the key?*
Too many AI apps answer that question badly — shipping model keys to the browser, storing
notes in a shared bucket, or quietly using private text as a training or command surface.

But privacy is only half of the inspiration. The other half is what we *wished* a journal
could do: not just hold one entry at a time, but show how a mood or a theme moves over
weeks, and give the half-formed ideas that surface while reflecting somewhere to go. A
private foundation is what made it safe to build those two ideas on top.

**Journal Atelier** was built to prove the opposite is achievable on Google Cloud: an AI
journal that is genuinely useful *and* genuinely private. Every design decision started
from a threat model, not an afterthought — the Gemini key never leaves the server, every
entry is isolated to its owner's verified `uid`, model output is treated as untrusted, and
the one feature people expect to be encrypted (the PIN lock) says honestly what it is and
isn't. The result is a reflective companion — reflect, brainstorm, synthesize, and even
ideate whole new AI projects — that a security reviewer can actually sign off on.

Each of the three surfaces grew out of one of those motivations:

- **Trends** — a single entry is only a snapshot, and the real payoff of journaling shows up
  *longitudinally*. That gap is the inspiration: a dashboard that charts mood and recurring
  themes over time, turning scattered entries into a picture you can actually see — computed
  in the browser from your own data, so the insight never costs you privacy.
- **Journal** — the core loop, a reflective companion that talks an entry through and, in one
  click, synthesizes a title, mood, recurring themes, and a coaching question.
- **AI Project Studio** — journaling and building so often start from the same half-formed
  idea that we wanted a bridge between them. The inspiration: pursuing AI-project skills and
  entering hackathons should begin right where you reflect — so the Studio turns a seed into
  a novel project concept, refines it with Gemini, and exports a provider-agnostic build spec
  you can carry straight into a build session.

This project was created for the **Google Cloud GenAI Academy (APAC) Cohort 3 Ideathon
Challenge**, showcasing Firebase, Firestore, Cloud Run, and Gemini working together under
a strict, verifiable security posture.

---

## What it does

| Capability | Description |
| :--- | :--- |
| ✍️ **Reflect & Brainstorm** | Write journal entries and talk them through with Gemini over multi-turn, context-preserving chat. |
| 🧠 **Multi-agent Synthesize** | One click routes an entry through four specialist agents — Reflection, Sentiment, Pattern, Coach — for a title, mood, recurring themes drawn from *your own* history, and a coaching question. |
| 📈 **Mood & Sentiment Trends** | A Trends dashboard charts your emotional valence over time and mood frequency (past-30-days / all-time), with click-to-filter drill-down — computed entirely in-browser from your own entries. |
| 💡 **AI Project Studio** | Generate novel AI project concepts from a seed (or "Surprise Me"), **refine** them with Gemini, save them to history, and export a **provider-agnostic Markdown build spec** you can hand to Gemini, Claude, OpenAI, or a local Ollama model. |
| 🔒 **Personal PIN lock** | Screen-privacy layer for individual entries, backed by a browser-derived PBKDF2-SHA256 hash — honest about being privacy, not encryption. |
| 📲 **Telegram alerts** | Optional outbound-only push on synthesis, saved ideas, and an on-demand weekly digest — summary metadata only, never the raw journal text. |

## Security posture (at a glance)

- **Server-side keys only** — the browser holds a Firebase ID token; the Gemini key lives
  in Secret Manager on Cloud Run and is never shipped to the client.
- **Verified identity at every boundary** — Firebase Admin `verifyIdToken` on each API call,
  with optional **Firebase App Check (reCAPTCHA v3)** attesting requests come from the real app.
- **Owner-bound data isolation** — Firestore rules enforce `request.auth.uid == userId`.
- **Untrusted model I/O** — user seeds and entries are wrapped as data, never instructions
  (OWASP LLM01); reference links come only from a server-side allowlist, and AI markdown is
  sanitized (dangerous elements + `javascript:`/`data:` URLs stripped) before render (LLM05 / A03).
- **Outbound-only notifications** — every Telegram push (including the weekly digest) sends
  summary metadata only; no raw entries, messages, or locked content ever leave the server.
- **Zero hardcoded secrets** — no keys, tokens, or service-account files in the repo.

Full details: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

---

## Tech stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| User identity | Firebase Authentication | Google Sign-In (federated). No emails/passwords stored. |
| Backend database | Cloud Firestore | User-isolated document storage for entries and summaries. |
| AI engine | Gemini 3.6 Flash (`@google/genai`) | Generates replies and summarizes entries, with a resilient model fallback ladder. |
| Secret management | Google Cloud Secret Manager | Stores the Gemini API key; retrieved server-side only. |
| Runtime / deploy | Google Cloud Run | Server-side runtime; keys injected from Secret Manager. |
| Frontend | React + Vite + TypeScript | Editor, chat, Project Studio, Trends dashboard, history sidebar. |
| Charts | Recharts | Client-side mood/sentiment visualizations on the Trends dashboard. |

---

## Quick start

```bash
npm install
cp firebase-applet-config.example.json firebase-applet-config.json   # fill in Firebase web config
cp .env.example .env                                                  # add GEMINI_API_KEY
npm run dev                                                           # http://localhost:3000
```

Full setup, Secret Manager, Firestore rules, and Cloud Run deployment:
**[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

---

## Documentation

| Doc | Contents |
| :--- | :--- |
| **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** | Security highlights, system architecture, and data-flow diagrams. |
| **[docs/SECURITY_WALKTHROUGH.md](docs/SECURITY_WALKTHROUGH.md)** | Agentic threat model (5 zones), prompt-injection & XSS verification scenarios (PI-1 … PI-7), and PIN-lock verification (L-1 … L-8). |
| **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** | Prerequisites, Secret Manager, Firestore rules, local dev, Cloud Run deploy, campaign labeling, Telegram setup. |
| **[docs/TESTING.md](docs/TESTING.md)** | Full walkthrough test matrix (TC-01 … TC-49) covering every user interaction and security control. |

---

## Challenge submission

- **Track:** Ideathon Challenge — Google Cloud GenAI Academy (APAC), Cohort 3
- **Cloud Run service:** `gemini-reflection-journal` (`us-west1`), label
  `dev-tutorial=cloud-run-ai-challenge`
- **Services used:** Firebase Auth · Cloud Firestore · Cloud Run · Gemini API · Secret Manager
