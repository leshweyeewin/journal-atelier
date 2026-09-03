import React from "react";
import { BookOpen, LogOut, Plus, ShieldCheck, Sparkles, User as UserIcon } from "lucide-react";
import { AppUser } from "../types";
import { logOut } from "../firebase";

interface NavbarProps {
  user: AppUser;
  onNewEntry: () => void;
  isSaving?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onNewEntry, isSaving }) => {
  return (
    <header className="w-full bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left branding */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-stone-900 text-stone-50 flex items-center justify-center shadow-xs">
            <BookOpen className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-stone-900 text-base tracking-tight">Reflection Studio</span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3 h-3" />
                Isolated Firestore
              </span>
            </div>
          </div>
        </div>

        {/* Center / Action */}
        <div className="flex items-center gap-3">
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
