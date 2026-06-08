'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an observability service
    console.error('Unhandled UI rendering error captured by boundary:', error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh] bg-[#09090b] text-[#fafafa] px-6 py-12">
      <div className="max-w-md w-full text-center space-y-6 backdrop-blur-sm bg-card/25 p-8 rounded-3xl border border-border/60 shadow-2xl">
        <div className="inline-flex items-center justify-center p-4 bg-rose-500/10 rounded-full text-rose-400 border border-rose-500/20">
          <AlertTriangle className="h-10 w-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">Something went wrong!</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            An unexpected error occurred while rendering this view. Please try resetting the component or reload the page.
          </p>
          {error.digest && (
            <p className="text-[10px] text-muted-foreground font-mono bg-secondary/20 p-2 rounded-lg break-all">
              Error Digest: {error.digest}
            </p>
          )}
        </div>

        <div className="flex justify-center pt-2">
          <button
            onClick={() => reset()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-xs font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] cursor-pointer"
          >
            <RefreshCcw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
