import React from "react";
import { AlertTriangle, RefreshCw, X } from "lucide-react";

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss: () => void;
  retryLabel?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  onRetry,
  onDismiss,
  retryLabel = "Retry Save",
}) => {
  return (
    <div
      id="app-error-banner"
      role="alert"
      className="p-3.5 sm:p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 shadow-xs flex items-start justify-between gap-3 animate-fadeIn"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs sm:text-sm font-semibold text-red-900">Action Alert</h4>
          <p className="text-xs text-red-700 mt-0.5 leading-relaxed">{message}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onRetry && (
          <button
            id="error-banner-retry-btn"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 active:scale-95 transition shadow-2xs cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>{retryLabel}</span>
          </button>
        )}
        <button
          id="error-banner-dismiss-btn"
          onClick={onDismiss}
          className="p-1 text-red-500 hover:text-red-800 rounded transition cursor-pointer"
          aria-label="Dismiss error"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
