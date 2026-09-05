# Deployment Guide

Step-by-step setup to configure, secure, and deploy Journal Atelier to **Google Cloud Run**.
For the security rationale behind these steps see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 1. Environment & prerequisites

### Required tools & APIs
1. **Google Cloud SDK (`gcloud`)** — [install guide](https://cloud.google.com/sdk/docs/install)
2. **Node.js (v20+ or v22+) & npm** — [nodejs.org](https://nodejs.org)
3. **Google Cloud project** — an active GCP project with billing enabled.

Enable the required GCP APIs:

```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  identitytoolkit.googleapis.com \
  cloudbuild.googleapis.com
```

---

## 2. Secret Manager setup

Store your operational secrets (`GEMINI_API_KEY` and optional `TELEGRAM_BOT_TOKEN`) in
**Google Cloud Secret Manager** and grant access to the Cloud Run runtime service account:

```bash
# 1. Create and populate the Gemini API key secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# (Optional) Create and populate the Telegram bot token secret
gcloud secrets create TELEGRAM_BOT_TOKEN --replication-policy="automatic"
echo -n "YOUR_TELEGRAM_BOT_TOKEN" | gcloud secrets versions add TELEGRAM_BOT_TOKEN --data-file=-

# 2. Identify your GCP project number
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

# 3. Grant the Cloud Run default service account Secret Accessor permissions
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding TELEGRAM_BOT_TOKEN \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# 4. Grant Cloud Datastore User role so the Cloud Run backend can read/write Firestore
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/datastore.user"
```

### Telegram bot setup (optional feature)

To enable outbound reflection alerts:

1. **Create the bot:** message [@BotFather](https://t.me/BotFather) → `/newbot` → copy the
   token (`123456:ABC-DEF...`). This token is the value of the `TELEGRAM_BOT_TOKEN` secret
   above — keep it server-side only.
2. **Start the bot:** open your new bot in Telegram and press **Start** (or send it any
   message). Telegram bots **cannot initiate a conversation** — until the user does this,
   `sendMessage` returns `403 Forbidden` and no alert is delivered.
3. **Get your chat ID:** message [@userinfobot](https://t.me/userinfobot); it replies with
   your numeric `Id`. Paste this into the app's Telegram settings panel after signing in.

If `TELEGRAM_BOT_TOKEN` is not configured, the feature is a no-op — reflections still
synthesize and persist normally.

---

## 3. Database security configuration (Cloud Firestore)

Provision your Cloud Firestore database in Native Mode, then deploy these owner-bound
security rules.

### `firestore.rules`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User-isolated interactions and journal entries
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // User-isolated settings (e.g. Telegram chat ID, PIN hash, preferences)
    match /users/{userId}/settings/{settingId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Deploy the rules via the Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

---

## 4. Local development

1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure the Firebase client config.** The Firebase web config (project ID, web API
   key, authDomain, etc.) is kept out of the repo. Copy the example and fill in your
   Firebase project's values:
   ```bash
   cp firebase-applet-config.example.json firebase-applet-config.json
   ```
   Populate it from **Firebase Console → Project settings → Your apps → SDK setup and
   configuration**. Leave `recaptchaSiteKey` blank to disable App Check locally, or set your
   reCAPTCHA v3 site key to enable it. This file is gitignored — never commit it.

3. **Configure environment variables.** Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Add your valid Gemini API key:
   ```env
   GEMINI_API_KEY="AIzaSy..."
   ```

4. **Start the unified server (Express + Vite):**
   ```bash
   npm run dev
   ```
   The application is served at `http://localhost:3000`.

5. **Verify TypeScript & production build:**
   ```bash
   npm run lint
   npm run build
   ```

---

## 5. Cloud Run deployment

Deploy the application as a containerized service to **Google Cloud Run**:

```bash
# Set your preferred region
REGION="us-west1"
SERVICE_NAME="gemini-reflection-journal"

# Deploy directly from source with the secrets injected as environment variables
gcloud run deploy ${SERVICE_NAME} \
  --source . \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest,TELEGRAM_BOT_TOKEN=TELEGRAM_BOT_TOKEN:latest"
```

---

## 6. Required campaign labeling

To register the Cloud Run service for automated challenge verification and campaign
tracking, apply the verification label **after every publish**:

```bash
gcloud run services update ${SERVICE_NAME} \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=${REGION}
```

> ⚠️ **Re-apply this label after every redeploy.** AI Studio publishes can reset service
> labels, and the challenge verification depends on `dev-tutorial=cloud-run-ai-challenge`
> being present on the `gemini-reflection-journal` service in `us-west1`.
