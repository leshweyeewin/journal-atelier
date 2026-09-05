# Journal Atelier

**A secure, private "Personal Gemini Journal"** — sign in with Google, reflect or
brainstorm with Gemini over multi-turn conversations, and have your entries summarized
and stored with strict per-user isolation.

Built **security-first** on Firebase Authentication, Cloud Firestore, Google Cloud Run,
and **Gemini 3.6 Flash** — with the API key held server-side at all times.

- 🔗 **Live prototype:** https://journal-atelier.ai.studio/
- 💻 **Source:** https://github.com/leshweyeewin/journal-atelier

> Built for the **Google Cloud GenAI Academy (APAC) — Cohort 3 · Ideathon Challenge**.
> `#AccelerateAIwithCloudRun`

---

## Inspiration

Journaling is one of the most personal things a person does — and that is exactly why
"AI journaling" apps make us nervous. The moment a private thought is typed into a text
box, the honest question is: *where does it go, who can read it, and what holds the key?*
Too many AI apps answer that question badly — shipping model keys to the browser, storing
notes in a shared bucket, or quietly using private text as a training or command surface.

**Journal Atelier** was built to prove the opposite is achievable on Google Cloud: an AI
journal that is genuinely useful *and* genuinely private. Every design decision started
from a threat model, not an afterthought — the Gemini key never leaves the server, every
entry is isolated to its owner's verified `uid`, model output is treated as untrusted, and
the one feature people expect to be encrypted (the PIN lock) says honestly what it is and
isn't. The result is a reflective companion — reflect, brainstorm, synthesize, and even
ideate whole new AI projects — that a security reviewer can actually sign off on.

This project was created for the **Google Cloud GenAI Academy (APAC) Cohort 3 Ideathon
Challenge**, showcasing Firebase, Firestore, Cloud Run, and Gemini working together under
a strict, verifiable security posture.

---

## What it does

| Capability | Description |
| :--- | :--- |
| ✍️ **Reflect & Brainstorm** | Write journal entries and talk them through with Gemini over multi-turn, context-preserving chat. |
| 🧠 **Multi-agent Synthesize** | One click routes an entry through four specialist agents — Reflection, Sentiment, Pattern, Coach — for a title, mood, recurring themes drawn from *your own* history, and a coaching question. |
| 💡 **AI Project Studio** | Generate novel AI project concepts from a seed (or "Surprise Me"), save them to history, and export a **provider-agnostic Markdown build spec** you can hand to Gemini, Claude, OpenAI, or a local Ollama model. |
| 🔒 **Personal PIN lock** | Screen-privacy layer for individual entries, backed by a browser-derived PBKDF2-SHA256 hash — honest about being privacy, not encryption. |
| 📲 **Telegram alerts** | Optional outbound-only push of a reflection's title, mood, and coaching question — never the raw journal text. |

## Security posture (at a glance)

- **Server-side keys only** — the browser holds a Firebase ID token; the Gemini key lives
  in Secret Manager on Cloud Run and is never shipped to the client.
- **Verified identity at every boundary** — Firebase Admin `verifyIdToken` on each API call.
- **Owner-bound data isolation** — Firestore rules enforce `request.auth.uid == userId`.
- **Untrusted model I/O** — user seeds and entries are wrapped as data, never instructions
  (OWASP LLM01); reference links come only from a server-side allowlist (LLM05).
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
| Frontend | React + Vite + TypeScript | Editor, chat, Project Studio, history sidebar. |

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
| **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** | Prerequisites, Secret Manager, Firestore rules, local dev, Cloud Run deploy, campaign labeling, Telegram setup. |
| **[docs/TESTING.md](docs/TESTING.md)** | Full walkthrough test matrix (TC-01 … TC-41) covering every user interaction and security control. |
| **[CLAUDE.md](CLAUDE.md)** | Project constitution — the security directives every change is held to. |

---

## Challenge submission

- **Track:** Ideathon Challenge — Google Cloud GenAI Academy (APAC), Cohort 3
- **Cloud Run service:** `gemini-reflection-journal` (`us-west1`), label
  `dev-tutorial=cloud-run-ai-challenge`
- **Services used:** Firebase Auth · Cloud Firestore · Cloud Run · Gemini API · Secret Manager
