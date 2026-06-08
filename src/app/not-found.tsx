'use client';

import React from 'react';
import Link from 'next/link';
import { Compass, ArrowLeft, Home, HelpCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-screen bg-[#09090b] text-[#fafafa] relative overflow-hidden px-6 py-12">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] bg-purple-500/10 rounded-full blur-[90px] pointer-events-none" />

      {/* Content Container */}
      <div className="max-w-md w-full text-center space-y-8 relative z-10 backdrop-blur-sm bg-card/25 p-8 rounded-3xl border border-border/60 shadow-2xl">
        {/* Animated Compass Icon */}
        <div className="inline-flex items-center justify-center p-5 bg-primary/10 rounded-full text-primary border border-primary/20 animate-pulse">
          <Compass className="h-14 w-14 rotate-45 transition-transform duration-1000 hover:rotate-180" />
        </div>

        {/* Error Codes */}
        <div className="space-y-3">
          <h1 className="text-7xl font-black tracking-tighter bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            404
          </h1>
          <h2 className="text-xl font-bold text-foreground">Lost in Destination?</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The page you are looking for does not exist, has been moved, or lies outside your plan boundaries. Let's redirect you back to safety.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-4 border-t border-border/40">
          <button
            onClick={() => window.history.back()}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-xl border border-border bg-secondary/15 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
          
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary text-xs font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)]"
          >
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
        </div>

        {/* Support Help */}
        <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1.5 pt-2">
          <HelpCircle className="h-3.5 w-3.5" />
          Need assistance? Contact our finance support desk.
        </p>
      </div>
    </div>
  );
}
