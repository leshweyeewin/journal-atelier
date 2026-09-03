import React, { useState } from "react";
import { Lock, Sparkles, ShieldCheck, ArrowRight, Brain, AlertCircle, Smartphone } from "lucide-react";
import { signInWithGoogle } from "../firebase";
import { LogoMark } from "./LogoMark";

interface LandingPageProps {
  onAuthSuccess?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onAuthSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
      if (onAuthSuccess) onAuthSuccess();
    } catch (err: any) {
      console.error("Sign-in failed:", err);
      if (err.code === "auth/popup-closed-by-user") {
        setAuthError("Sign-in popup was closed before completing. Please try again.");
      } else if (err.code === "auth/popup-blocked") {
        setAuthError("Sign-in popup was blocked by your browser. Please allow popups for this site.");
      } else {
        setAuthError(err.message || "Failed to sign in with Google. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col justify-between selection:bg-amber-100 selection:text-amber-900">
      {/* Top Header */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between border-b border-stone-200">
        <div className="flex items-center gap-3">
          <LogoMark size={32} />
          <div>
            <span className="font-semibold text-stone-900 tracking-tight text-lg">Journal Atelier</span>
            <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-md bg-stone-200 text-stone-700">Gemini 3.6</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="landing-signin-nav-btn"
            onClick={handleSignIn}
            disabled={loading}
            className="inline-flex items-center justify-center text-sm font-medium px-4 py-2 rounded-lg bg-stone-900 text-stone-50 hover:bg-stone-800 active:scale-[0.98] transition-all disabled:opacity-50 shadow-sm cursor-pointer"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-stone-400 border-t-white rounded-full animate-spin" />
                Signing in...
              </span>
            ) : (
              "Sign In with Google"
            )}
          </button>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="w-full max-w-5xl mx-auto px-6 py-16 flex-1 flex flex-col justify-center">
        {authError && (
          <div className="mb-8 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Authentication Notice</p>
              <p className="text-red-700 mt-0.5">{authError}</p>
            </div>
            <button
              onClick={() => setAuthError(null)}
              className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="text-center max-w-3xl mx-auto mb-12">
          {/* Hero Brand Lockup */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <LogoMark size={64} />
            <div className="text-left">
              <span className="block font-serif text-3xl sm:text-4xl tracking-tight text-stone-900 leading-tight">
                Journal Atelier
              </span>
              <span className="block text-xs sm:text-sm text-stone-500 font-sans tracking-wide mt-0.5">
                Reflection, clarified by Gemini.
              </span>
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-900 leading-tight mb-4">
            Four minds on every reflection.
          </h1>

          <p className="text-xl sm:text-2xl font-medium text-stone-700 tracking-tight mb-6">
            A private journaling space where a team of specialist Gemini agents reflects with you.
          </p>

          <p className="text-base sm:text-lg text-stone-600 leading-relaxed mb-10 max-w-2xl mx-auto">
            Write a reflection and a Reflection, Sentiment, Pattern, and Coach agent each weigh in — summarizing, sensing your mood, surfacing recurring themes from your own past entries, and leaving you one question to sit with. Every entry stays isolated to your own account.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              id="landing-hero-google-btn"
              onClick={handleSignIn}
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-stone-900 text-stone-50 hover:bg-stone-800 active:scale-[0.98] font-medium text-base transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-stone-400 border-t-white rounded-full animate-spin" />
                  Connecting Google Account...
                </span>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.4 8.9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.7s.1-1.9.4-2.7L1.6 6.4C.6 8.4 0 10.6 0 13s.6 4.6 1.6 6.6l3.7-2.9z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5.1L1.6 16C3.5 20.1 7.4 23 12 23z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                  <ArrowRight className="w-4 h-4 text-stone-400" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          <div className="p-6 rounded-2xl bg-white border border-stone-200/80 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 mb-4">
              <Brain className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-stone-900 text-base mb-2">Multi-Agent Reflection Brain</h3>
            <p className="text-stone-600 text-sm leading-relaxed">
              Four specialist agents — Reflection, Sentiment, Pattern, and Coach — analyze each entry server-side, never in your browser.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-stone-200/80 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-stone-900 text-base mb-2">Strict Firestore Isolation</h3>
            <p className="text-stone-600 text-sm leading-relaxed">
              Every reflection lives under your own uid path, enforced by security rules. The Pattern agent can only ever read your history — never another user's.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-stone-200/80 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700 mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-stone-900 text-base mb-2">Zero-Password, Verified Auth</h3>
            <p className="text-stone-600 text-sm leading-relaxed">
              Federated Google Sign-In means no passwords. Every server request is cryptographically verified with the Firebase Admin SDK before any data is touched.
            </p>
          </div>

          <div id="landing-feature-telegram" className="p-6 rounded-2xl bg-white border border-stone-200/80 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 mb-4">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-stone-900 text-base mb-2">Reflections to Your Phone</h3>
            <p className="text-stone-600 text-sm leading-relaxed">
              Opt in to get each reflection's mood and Coach question pushed to your Telegram — outbound-only, so nothing ever reads your chats back.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-stone-200 py-6 text-center text-xs text-stone-500">
        <p>Built with Google AI Studio, Gemini 3.6 Flash & Cloud Firestore. Fully isolated owner-bound storage.</p>
      </footer>
    </div>
  );
};
