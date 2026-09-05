import React, { useState, useEffect } from "react";
import { Lock, ShieldCheck, X, AlertCircle, Loader2 } from "lucide-react";

interface PinModalProps {
  mode: "set" | "enter";
  onSubmit: (pin: string) => Promise<string | null>;
  onCancel: () => void;
}

export const PinModal: React.FC<PinModalProps> = ({ mode, onSubmit, onCancel }) => {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, submitting]);

  const handlePinChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, "").slice(0, 6);
    setPin(digitsOnly);
    setError(null);
  };

  const handleConfirmPinChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, "").slice(0, 6);
    setConfirmPin(digitsOnly);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (pin.length < 4 || pin.length > 6) {
      setError("Use 4–6 digits for your PIN.");
      return;
    }

    if (mode === "set") {
      if (pin !== confirmPin) {
        setError("PINs do not match.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const err = await onSubmit(pin);
      if (err) {
        setError(err);
      }
    } catch {
      setError("Failed to process PIN. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid =
    mode === "set"
      ? pin.length >= 4 && pin.length <= 6 && confirmPin.length >= 4 && pin === confirmPin
      : pin.length >= 4 && pin.length <= 6;

  return (
    <div
      id="pin-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onCancel();
        }
      }}
    >
      <div
        id="pin-modal-container"
        className="relative w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-xl transition-all"
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="absolute right-4 top-4 p-1 text-stone-400 hover:text-stone-700 rounded-lg transition cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100/80 text-amber-800 flex items-center justify-center border border-amber-200/60">
            {mode === "set" ? <ShieldCheck className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-base font-semibold text-stone-900">
              {mode === "set" ? "Set a journal PIN" : "Enter your PIN"}
            </h2>
            <p className="text-xs text-stone-500">
              {mode === "set"
                ? "Choose a 4–6 digit PIN to protect entries."
                : "Enter your PIN to unlock protected reflections."}
            </p>
          </div>
        </div>

        {mode === "set" && (
          <div className="mb-4 rounded-xl bg-amber-50/70 border border-amber-200/60 p-3 text-[11px] text-amber-900 leading-relaxed">
            <span className="font-semibold">Privacy note:</span> This hides locked entries on your
            screen. It is not encryption — entries are still stored normally.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              {mode === "set" ? "New PIN (4–6 digits)" : "Your PIN"}
            </label>
            <input
              id="pin-input"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoFocus
              value={pin}
              onChange={(e) => handlePinChange(e.target.value)}
              disabled={submitting}
              placeholder="••••"
              className="w-full tracking-widest text-center text-lg font-mono py-2 px-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-stone-50/50 transition disabled:opacity-50"
            />
          </div>

          {mode === "set" && (
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Confirm PIN
              </label>
              <input
                id="pin-confirm-input"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => handleConfirmPinChange(e.target.value)}
                disabled={submitting}
                placeholder="••••"
                className="w-full tracking-widest text-center text-lg font-mono py-2 px-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-stone-50/50 transition disabled:opacity-50"
              />
              {confirmPin && pin !== confirmPin && (
                <p className="text-[11px] text-red-600 mt-1">PINs do not match.</p>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50/80 border border-red-200/60 rounded-xl p-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="px-3.5 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="pin-submit-btn"
              type="submit"
              disabled={submitting || !isFormValid}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-xl bg-amber-600 text-white hover:bg-amber-700 active:scale-[0.98] transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{mode === "set" ? "Set PIN" : "Unlock"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
