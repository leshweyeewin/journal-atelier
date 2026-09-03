# Gemini Reflection Journal & Brainstorming Studio

A production-grade, user-authenticated reflection journal and multi-turn brainstorming companion powered by **Gemini 3.6 Flash** and **Google Cloud Firestore**, secured with **Firebase Authentication** (Google Sign-In) and owner-bound database rules.

---

## Architecture & Security Highlights

1. **User Identity & Passwordless Authentication**:
   - Outsources credentials entirely to **Firebase Authentication** via federated Google Sign-In.
   - No emails, plaintext passwords, or hashing logic handled in application state.
   - Client sends cryptographically signed JWT tokens (`Authorization: Bearer <idToken>`) to server-side endpoints.

2. **Strict Firestore Data Isolation**:
   - Every journal entry, chat interaction, and AI reflection is saved under the user-specific path: `/users/{userId}/interactions/{interactionId}`.
   - Firestore security rules strictly enforce `request.auth.uid == userId`, preventing any cross-tenant data leaks.
   - Built-in recursive payload sanitizer removes `undefined` properties before database writes to prevent driver crashes.

3. **Gemini 3.6 Flash Resilient Fallback Ladder**:
   - Server-side helper `generateContentWithFallback` wraps `@google/genai` with an automated fallback ladder:
     1. Primary: `gemini-3.6-flash`
     2. High-Availability: `gemini-3.1-flash-lite`
     3. Dynamic Alias: `gemini-flash-latest`
     4. Deep Reasoning: `gemini-3.7-flash`
   - Automatically catches recoverable API codes (`503 UNAVAILABLE`, `429 RESOURCE_EXHAUSTED`, `404 NOT_FOUND`, `500 INTERNAL`) and retries the next model before escalating.

4. **Zero-Hardcoded Secrets**:
   - `GEMINI_API_KEY` is kept strictly server-side in environment variables or Google Cloud Secret Manager.

---

## 1. Environment & Prerequisites

### Required Tools & APIs
1. **Google Cloud SDK (`gcloud`)**: [Install Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
2. **Node.js (v20+ or v22+) & npm**: [Node.js Downloads](https://nodejs.org)
3. **Google Cloud Project**: An active GCP project with billing enabled.

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

## 2. Secret Management Setup

Store your Gemini API key in **Google Cloud Secret Manager** and grant access to the Cloud Run runtime service account:

```bash
# 1. Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Identify your GCP project number
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

# 3. Grant the Cloud Run default service account Secret Accessor permissions
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 3. Database Security Configuration (Cloud Firestore)

Ensure your Cloud Firestore database is provisioned in Native Mode. Deploy the following security rules:

### `firestore.rules`
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Deploy the rules via Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 4. Local Development

1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure the Firebase client config:**
   The Firebase web config (project ID, web API key, authDomain, etc.) is kept out
   of the repo. Copy the example and fill in your Firebase project's values:
   ```bash
   cp firebase-applet-config.example.json firebase-applet-config.json
   ```
   Populate it from **Firebase Console → Project settings → Your apps → SDK setup
   and configuration**. Leave `recaptchaSiteKey` blank to disable App Check locally,
   or set your reCAPTCHA v3 site key to enable it. This file is gitignored — never
   commit it.

3. **Configure Environment Variables:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Add your valid Gemini API key:
   ```env
   GEMINI_API_KEY="AIzaSy..."
   ```

4. **Start the Unified Server (Express + Vite):**
   ```bash
   npm run dev
   ```
   The application will be served at `http://localhost:3000`.

5. **Verify TypeScript & Production Build:**
   ```bash
   npm run lint
   npm run build
   ```

---

## 5. Cloud Run Deployment Flow

Deploy the application as a containerized service to **Google Cloud Run**:

```bash
# Set your preferred region
REGION="us-central1"
SERVICE_NAME="gemini-reflection-journal"

# Deploy directly from source with the secret injected as an environment variable
gcloud run deploy ${SERVICE_NAME} \
  --source . \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest"
```

---

## 6. Required Campaign Labeling

To register the Cloud Run service for the automated challenge verification and campaign tracking, execute:

```bash
gcloud run services update ${SERVICE_NAME} \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=${REGION}
```

---

## 7. Functional Stability & Walkthrough Test Matrix

Every user-facing action and workflow has been verified:

| Test Case | Functional Area | Step-by-Step Walkthrough | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **TC-01** | Landing Page & Authentication | 1. Navigate to `/`.<br>2. Click **"Sign In with Google"**.<br>3. Complete federated OAuth prompt. | User is authenticated via Firebase Auth; session transitions to the private dashboard; avatar and user email display in the top navigation. |
| **TC-02** | Reflection Drafting | 1. Enter a custom title or leave blank.<br>2. Select reflection mode (`Reflect`, `Brainstorm`, `Synthesize`).<br>3. Type reflection text or click a reflection starter prompt. | Word counter increments; draft status displays "Unsaved draft" until persisted. |
| **TC-03** | AI Reflection Interaction | 1. Type reflection content.<br>2. Click **"Ask Gemini to Reflect"**.<br>3. Observe loader. | Server proxies request through resilient fallback ladder (`gemini-3.6-flash`); thoughtful markdown analysis is rendered; user thought & AI reply are automatically persisted to Firestore. |
| **TC-04** | Multi-Turn Dialogue | 1. In the dialogue stream, type a follow-up or click a suggested prompt.<br>2. Click Send. | Gemini maintains multi-turn context; responses stream into the dialogue thread; Firestore interaction document updates in real-time. |
| **TC-05** | AI Summarization & Insights | 1. Click **"Synthesize & Tag"**.<br>2. Review generated card. | Structured JSON is parsed into suggested title, executive summary, 3 key takeaways, mood badge, and topical tags. |
| **TC-06** | Database Data Isolation | 1. View left sidebar.<br>2. Search or click an existing reflection.<br>3. Sign in as a different user. | Subcollection query is strictly bound to `/users/${userId}/interactions`; User B cannot see or query User A's entries. |
| **TC-07** | Deletion & Cleanup | 1. Hover over a reflection card in the sidebar.<br>2. Click the trash icon.<br>3. Confirm deletion. | Document is deleted from Firestore via `deleteDoc`; sidebar removes the card immediately via `onSnapshot`. |
| **TC-08** | Error Escalation & Retry | 1. Trigger an intentional network failure or simulate save error. | Error banner appears with a **"Retry Save"** button; user input buffer is preserved intact without data loss. |
