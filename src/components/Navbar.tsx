import React from "react";
import { LogOut, Plus, ShieldCheck, Sparkles, User as UserIcon } from "lucide-react";
import { AppUser } from "../types";
import { logOut } from "../firebase";
import { LogoMark } from "./LogoMark";

const TelegramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M23.91 3.79L20.3 20.84c-.25 1.21-.98 1.5-2 .94l-5.5-4.07-2.66 2.57c-.3.3-.55.56-1.1.56-.72 0-.6-.27-.84-.95L6.3 13.7l-5.45-1.7c-1.18-.35-1.19-1.16.26-1.75l21.26-8.2c.97-.43 1.9.24 1.53 1.73z"/>
  </svg>
);

interface NavbarProps {
  user: AppUser;
  onNewEntry: () => void;
  isSaving?: boolean;
  isTelegramConnected?: boolean;
  onOpenTelegramSettings?: () => void;
  view?: "journal" | "studio";
  onNavigate?: (view: "journal" | "studio") => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onNewEntry,
  isSaving,
  isTelegramConnected,
  onOpenTelegramSettings,
  view = "journal",
  onNavigate,
}) => {
  return (
    <header className="w-full bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left branding and Navigation Toggle */}
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="flex items-center gap-3">
            <LogoMark size={32} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-stone-900 text-base tracking-tight">Journal Atelier</span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3" />
                  Isolated Firestore
                </span>
              </div>
            </div>
          </div>

          {/* View Toggle Segmented Control */}
          {onNavigate && (
            <div className="flex items-center p-0.5 sm:p-1 rounded-xl bg-stone-100 border border-stone-200/80">
              <button
                id="nav-journal-btn"
                type="button"
                onClick={() => onNavigate("journal")}
                className={`px-2.5 sm:px-3 py-1 text-xs rounded-lg transition cursor-pointer ${
                  view === "journal"
                    ? "bg-white text-stone-900 shadow-2xs font-semibold"
                    : "text-stone-600 hover:text-stone-900 font-medium"
                }`}
              >
                Journal
              </button>
              <button
                id="nav-studio-btn"
                type="button"
                onClick={() => onNavigate("studio")}
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-xs rounded-lg transition cursor-pointer ${
                  view === "studio"
                    ? "bg-white text-amber-900 shadow-2xs font-semibold"
                    : "text-stone-600 hover:text-stone-900 font-medium"
                }`}
              >
                <Sparkles className={`w-3.5 h-3.5 ${view === "studio" ? "text-amber-600" : "text-stone-500"}`} />
                <span>Project Studio</span>
              </button>
            </div>
          )}
        </div>

        {/* Center / Action */}
        <div className="flex items-center gap-3">
          {/* Subtle Telegram Connected Indicator */}
          {isTelegramConnected ? (
            <button
              id="nav-telegram-status-btn"
              onClick={onOpenTelegramSettings}
              type="button"
              className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200/80 hover:bg-sky-100 transition cursor-pointer"
              title="Telegram notifications active (click to manage)"
            >
              <TelegramIcon className="w-3.5 h-3.5" />
              <span>Telegram: connected</span>
            </button>
          ) : (
            <button
              id="nav-telegram-config-btn"
              onClick={onOpenTelegramSettings}
              type="button"
              className="hidden md:inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 px-2 py-1 rounded-md hover:bg-stone-100 transition cursor-pointer"
              title="Configure Telegram notifications"
            >
              <TelegramIcon className="w-3.5 h-3.5" />
              <span>Telegram</span>
            </button>
          )}

          {isSaving && (
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-stone-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Saving to Firestore...
            </span>
          )}

          <button
            id="nav-new-entry-btn"
            onClick={onNewEntry}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-stone-900 text-stone-50 hover:bg-stone-800 active:scale-[0.98] transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Reflection</span>
          </button>

          {/* User profile & Sign Out */}
          <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "User"}
                className="w-8 h-8 rounded-full border border-stone-200 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center text-xs font-semibold">
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
              </div>
            )}

            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-semibold text-stone-900 truncate max-w-[120px]">
                {user.displayName || "Authenticated"}
              </span>
              <span className="text-[10px] text-stone-500 truncate max-w-[120px]">
                {user.email || "Google Account"}
              </span>
            </div>

            <button
              id="nav-sign-out-btn"
              onClick={() => logOut()}
              title="Sign Out"
              className="p-1.5 sm:p-2 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition cursor-pointer"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
