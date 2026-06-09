import React from 'react';
import Link from 'next/link';
import { GraduationCap, ArrowRight, ShieldCheck, Sparkles, TrendingUp, PiggyBank } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex-1 flex flex-col bg-background text-foreground">
      {/* Navbar Header */}
      <header className="flex h-20 items-center justify-between px-6 md:px-12 border-b border-border bg-card/25 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <GraduationCap className="h-8 w-8 text-primary" />
          <div>
            <h1 className="font-bold text-xl tracking-tight bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
              UniFinance
            </h1>
            <p className="text-[9px] text-muted-foreground tracking-widest uppercase">Student SaaS</p>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 rounded-xl bg-secondary/80 hover:bg-secondary border border-border px-5 py-2 text-sm font-semibold transition-all duration-200"
        >
          Go to App
          <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[300px] h-[300px] rounded-full bg-accent-purple/10 blur-[100px] pointer-events-none" />

        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary animate-pulse">
            <Sparkles className="h-3.5 w-3.5" />
            Empowering Students to Save Smarter
          </div>
          <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
            Take Control of Your{' '}
            <span className="bg-gradient-to-r from-primary via-accent-purple to-accent-green bg-clip-text text-transparent">
              Student Finances
            </span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
            The all-in-one financial dashboard tailored for students. Track scholarships, balance tuition budgets, log expenses, and build healthy money habits.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-bold text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-[0_0_30px_rgba(238,158,115,0.35)]"
            >
              Get Started Free
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto flex items-center justify-center rounded-xl bg-secondary border border-border px-8 py-3.5 text-base font-bold text-white hover:bg-secondary/80 transition-all"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section id="features" className="border-t border-border bg-card/10 px-6 py-20 md:px-12">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-lg mx-auto space-y-3">
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Built Specifically for Students</h3>
            <p className="text-sm text-muted-foreground">
              Say goodbye to generic expense tools. UniFinance addresses actual student budget realities.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card/40 p-6 backdrop-blur-sm space-y-4 hover:border-primary/20 transition-all duration-300">
              <div className="rounded-xl bg-primary/10 p-3 text-primary w-fit">
                <PiggyBank className="h-6 w-6" />
              </div>
              <h4 className="font-bold text-lg">Smart Budget Planning</h4>
              <p className="text-sm text-muted-foreground">
                Allocate allowances and income toward tuition, rent, groceries, and textbooks easily.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card/40 p-6 backdrop-blur-sm space-y-4 hover:border-primary/20 transition-all duration-300">
              <div className="rounded-xl bg-primary/10 p-3 text-primary w-fit">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h4 className="font-bold text-lg">Scholarship & Job Tracking</h4>
              <p className="text-sm text-muted-foreground">
                Log recurring stipends, grant aids, and part-time shifts to know your exact cash flows.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card/40 p-6 backdrop-blur-sm space-y-4 hover:border-primary/20 transition-all duration-300">
              <div className="rounded-xl bg-primary/10 p-3 text-primary w-fit">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h4 className="font-bold text-lg">Secure & Private</h4>
              <p className="text-sm text-muted-foreground">
                Powered by Supabase and secure Row Level Security (RLS) policies. Your money data stays yours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 py-8 px-6 text-center text-xs text-muted-foreground">
        <p>© 2026 UniFinance SaaS Inc. All rights reserved. Built using Next.js 15, TypeScript, & Supabase.</p>
      </footer>
    </div>
  );
}
