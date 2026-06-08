'use client';

import { AlertOctagon, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-[#09090b] text-[#fafafa] items-center justify-center px-6 py-12">
        <div className="max-w-md w-full text-center space-y-6 backdrop-blur-sm bg-[#181824]/40 p-8 rounded-3xl border border-rose-500/20 shadow-2xl">
          <div className="inline-flex items-center justify-center p-4 bg-rose-500/10 rounded-full text-rose-500 border border-rose-500/20">
            <AlertOctagon className="h-10 w-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">Critical Error Encountered</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The application encountered a critical layout crash and was unable to recover automatically. Please restart or reset the session.
            </p>
            {error.digest && (
              <p className="text-[10px] text-muted-foreground font-mono bg-secondary/30 p-2 rounded-lg break-all">
                Digest: {error.digest}
              </p>
            )}
          </div>

          <div className="flex justify-center pt-2">
            <button
              onClick={() => reset()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-xs font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              Reset Layout
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
