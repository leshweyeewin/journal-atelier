import React, { useState, useEffect } from "react";
import { Send, Check, X, Bell, AlertCircle, Loader2 } from "lucide-react";
import { getTelegramSettings, saveTelegramSettings, disconnectTelegramSettings } from "../lib/geminiApi";

interface TelegramSettingsProps {
  onStatusChange?: (connected: boolean, chatId: string | null) => void;
  isOpenModal?: boolean;
  onCloseModal?: () => void;
}

export const TelegramSettings: React.FC<TelegramSettingsProps> = ({
  onStatusChange,
  isOpenModal,
  onCloseModal,
}) => {
  const [chatId, setChatId] = useState<string>("");
  const [savedChatId, setSavedChatId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Fetch current Telegram settings on mount
  useEffect(() => {
    let isMounted = true;
    async function loadSettings() {
      try {
        setIsLoading(true);
        const res = await getTelegramSettings();
        if (isMounted) {
          if (res.connected && res.telegramChatId) {
            setIsConnected(true);
            setSavedChatId(res.telegramChatId);
            setChatId(res.telegramChatId);
            onStatusChange?.(true, res.telegramChatId);
          } else {
            setIsConnected(false);
            setSavedChatId(null);
            onStatusChange?.(false, null);
          }
        }
      } catch (err: any) {
        console.warn("Could not load Telegram settings:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleStartEditing = () => {
    setError(null);
    setSuccessMsg(null);
    setChatId(savedChatId || "");
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const trimmed = chatId.trim();
    if (!trimmed) {
      setError("Please enter your numeric Telegram chat ID.");
      return;
    }

    if (!/^-?\d+$/.test(trimmed)) {
      setError("Invalid Chat ID: must contain only numbers.");
      return;
    }

    try {
      setIsSaving(true);
      const res = await saveTelegramSettings(trimmed);
      if (res.connected && res.telegramChatId) {
        setIsConnected(true);
        setSavedChatId(res.telegramChatId);
        setIsEditing(false);
        setSuccessMsg("Telegram connected! Reflection summaries will be sent upon synthesis.");
        onStatusChange?.(true, res.telegramChatId);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to save Telegram Chat ID.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setError(null);
    setSuccessMsg(null);
    try {
      setIsSaving(true);
      await disconnectTelegramSettings();
      setIsConnected(false);
      setSavedChatId(null);
      setChatId("");
      setIsEditing(false);
      setSuccessMsg("Telegram disconnected.");
      onStatusChange?.(false, null);
    } catch (err: any) {
      setError(err?.message || "Failed to disconnect Telegram.");
    } finally {
      setIsSaving(false);
    }
  };

  // Content body
  const contentNode = (
    <div className="space-y-3 text-left">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
            <Send className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-stone-900">Telegram Outbound</h3>
            <p className="text-[11px] text-stone-500">Reflection synthesis alerts</p>
          </div>
        </div>

        {isConnected && !isEditing ? (
          <span
            id="telegram-connected-badge"
            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Telegram: connected
          </span>
        ) : (
          <span className="text-[11px] text-stone-400 font-medium">Outbound only</span>
        )}
      </div>

      {isLoading ? (
        <div className="py-3 flex items-center justify-center gap-2 text-xs text-stone-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Checking Telegram settings...</span>
        </div>
      ) : isConnected && !isEditing ? (
        <div className="bg-stone-50 border border-stone-200/80 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-stone-500">Chat ID:</span>
            <span className="font-mono font-medium text-stone-800">{savedChatId}</span>
          </div>
          <p className="text-[11px] text-stone-600 leading-relaxed">
            Minimal reflection summaries (title, mood tag, and Coach question) will be sent to this chat.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              id="telegram-edit-btn"
              type="button"
              onClick={handleStartEditing}
              className="text-xs text-stone-700 hover:text-stone-900 font-medium underline underline-offset-2 cursor-pointer"
            >
              Change ID
            </button>
            <span className="text-stone-300">•</span>
            <button
              id="telegram-disconnect-btn"
              type="button"
              onClick={handleDisconnect}
              disabled={isSaving}
              className="text-xs text-red-600 hover:text-red-700 font-medium cursor-pointer"
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-2.5">
          <div>
            <label htmlFor="telegram-chat-id-input" className="block text-[11px] font-medium text-stone-700 mb-1">
              Your Telegram Chat ID
            </label>
            <input
              id="telegram-chat-id-input"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 123456789"
              value={chatId}
              onChange={(e) => {
                setChatId(e.target.value);
                if (error) setError(null);
              }}
              className="w-full text-xs px-3 py-1.5 rounded-md border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-800"
              required
            />
            <p className="text-[11px] text-stone-500 mt-1">
              Numbers only — your numeric chat ID (e.g. 123456789).
            </p>
          </div>

          {/* Hint requirement: one-line hint to message the bot and get their id from @userinfobot */}
          <p className="text-[11px] text-stone-500 leading-normal">
            Message the bot and get your ID from <span className="font-medium text-stone-700">@userinfobot</span>
          </p>

          {error && (
            <div className="p-2 rounded bg-red-50 border border-red-200 text-[11px] text-red-700 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-700 flex items-start gap-1.5">
              <Check className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              id="save-telegram-settings-btn"
              type="submit"
              disabled={isSaving || !chatId.trim()}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-stone-900 text-stone-50 hover:bg-stone-800 disabled:opacity-50 transition cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3 h-3" />
                  <span>Save ID</span>
                </>
              )}
            </button>

            {isEditing && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setChatId(savedChatId || "");
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-xs text-stone-600 hover:text-stone-900 px-2 py-1.5 rounded cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );

  // Modal render (Telegram settings only appears as modal from navbar)
  if (isOpenModal === false) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl border border-stone-200 shadow-xl max-w-md w-full p-5 relative">
        <button
          id="close-telegram-modal-btn"
          onClick={onCloseModal}
          className="absolute top-4 right-4 p-1 text-stone-400 hover:text-stone-700 rounded-md transition cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="pr-6 mb-2">
          <h2 className="text-sm font-semibold text-stone-900">Telegram Notifications</h2>
          <p className="text-xs text-stone-500">
            Receive outbound reflection digests directly on Telegram.
          </p>
        </div>
        <div className="pt-2">{contentNode}</div>
      </div>
    </div>
  );
};
