"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  PiggyBank, 
  Cpu, 
  ScanLine, 
  FileText, 
  Inbox, 
  MessageSquareCode, 
  Database,
  ChevronDown,
  LineChart,
  UserCheck
} from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'ai' | 'ocr' | 'integrations'>('ai');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
    }
  };

  const faqData = [
    {
      q: "What makes UniFinance different from other expense trackers?",
      a: "Unlike standard static tools, UniFinance is built specifically for students. It combines long-term memory retrieval (Hindsight) and adaptive LLM routing (CascadeFlow) to act as a genuine AI Financial Copilot. It also features automatic receipt scanning, custom category corrections, and tracks student-specific income sources like scholarships, grants, and part-time shifts."
    },
    {
      q: "How does the OCR Receipt Scanning work?",
      a: "When you upload a receipt, our Python-based OCR backend crops, corrects contrast, and aligns the image using OpenCV. It then runs PaddleOCR to extract text and matches fields (Merchant, Date, Total, Currency) using specialized heuristics. If you correct a category, the system learns it for all future receipts."
    },
    {
      q: "What is CascadeFlow Adaptive Execution?",
      a: "CascadeFlow evaluates the complexity of your financial queries. Simple tasks are routed to lighter models (e.g., Llama-3.1-8b) to save time, while complex financial planning requests are escalated to Llama-3.3-70b. If a simpler model fails or times out, it automatically scales up, ensuring you always get reliable answers."
    },
    {
      q: "Is my financial data secure?",
      a: "Absolutely. UniFinance is built on Supabase. We utilize strict Row-Level Security (RLS) policies, meaning your data is completely isolated. Only you can access or query your financial records and OCR memory."
    }
  ];

  return (
    <div className="flex-1 flex flex-col bg-background text-foreground overflow-x-hidden selection:bg-primary/30">
      {/* Floating Header */}
      <header className="flex h-20 items-center justify-between px-6 md:px-12 border-b border-border bg-card/45 backdrop-blur-xl sticky top-0 z-50 transition-all">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight bg-gradient-to-r from-primary via-accent-purple to-accent-green bg-clip-text text-transparent">
              UniFinance
            </h1>
            <p className="text-[9px] text-muted-foreground tracking-widest uppercase">Student SaaS Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-xl bg-secondary/80 hover:bg-secondary border border-border px-5 py-2 text-sm font-semibold text-white transition-all duration-200"
          >
            Go to App
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative flex-1 flex flex-col items-center justify-center text-center px-6 py-24 md:py-32 overflow-hidden border-b border-border bg-gradient-to-b from-card/10 via-background to-background">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[400px] h-[400px] rounded-full bg-accent-purple/10 blur-[120px] pointer-events-none" />
        <div className="absolute top-20 left-10 w-[300px] h-[300px] rounded-full bg-accent-green/5 blur-[100px] pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-4xl space-y-8 z-10"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            Supercharged with Hindsight & CascadeFlow AI
          </div>
          
          <h2 className="text-4xl sm:text-7xl font-black tracking-tight leading-[1.1] text-foreground">
            Smart Financial Intelligence <br className="hidden md:inline" />
            <span className="bg-gradient-to-r from-primary via-accent-purple to-accent-green bg-clip-text text-transparent">
              Built for Students
            </span>
          </h2>

          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            The ultimate student expense engine. Automate tracking via receipt scans, get dynamic suggestions from your personalized AI assistant, and master your cash flows.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-4 text-base font-bold text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-[0_0_30px_rgba(238,158,115,0.3)]"
            >
              Launch Dashboard
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href="#deep-dive"
              className="w-full sm:w-auto flex items-center justify-center rounded-2xl bg-secondary/30 hover:bg-secondary/50 border border-border px-8 py-4 text-base font-bold text-foreground transition-all"
            >
              Explore Tech Stack
            </a>
          </div>
        </motion.div>

        {/* Floating Mini Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-4xl mt-16 px-4 z-10"
        >
          <div className="rounded-2xl border border-border bg-card/45 backdrop-blur-xl p-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-400/80" />
                <span className="w-3 h-3 rounded-full bg-yellow-400/80" />
                <span className="w-3 h-3 rounded-full bg-green-400/80" />
              </div>
              <div className="text-[11px] text-muted-foreground font-mono bg-secondary/40 px-3 py-1 rounded-md border border-border/40">
                unifinance.student/dashboard
              </div>
              <div className="w-6" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="border border-border/50 bg-secondary/10 rounded-xl p-4 space-y-2">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Total Balance</span>
                <span className="text-2xl font-black text-foreground">$1,420.50</span>
                <div className="text-xs text-accent-green flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> +12% from last month
                </div>
              </div>
              
              <div className="border border-border/50 bg-secondary/10 rounded-xl p-4 space-y-2">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Scholarships & Stipends</span>
                <span className="text-2xl font-black text-accent-purple">$800.00</span>
                <span className="text-[10px] text-muted-foreground block">Auto-allocated to Tuition Goal</span>
              </div>

              <div className="border border-border/50 bg-secondary/10 rounded-xl p-4 space-y-2">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">OCR Scanned This Month</span>
                <span className="text-2xl font-black text-accent-green">18 Receipts</span>
                <span className="text-[10px] text-muted-foreground block">98.4% Confidence Score</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Feature Navigation / Deep-Dive Tabs */}
      <section id="deep-dive" className="px-6 py-24 md:px-12 border-b border-border bg-card/5 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
            <h3 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">Advanced Architecture</h3>
            <p className="text-base sm:text-lg text-muted-foreground">
              UniFinance runs on a hybrid AI system designed to ensure intelligent answers, fast response rates, and seamless receipt parsing.
            </p>

            {/* Navigation Tabs */}
            <div className="inline-flex p-1 bg-secondary/20 rounded-2xl border border-border/60 mt-6 gap-1 w-full max-w-md">
              <button
                onClick={() => setActiveTab('ai')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  activeTab === 'ai' 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                AI Copilot
              </button>
              <button
                onClick={() => setActiveTab('ocr')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  activeTab === 'ocr' 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                OCR engine
              </button>
              <button
                onClick={() => setActiveTab('integrations')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  activeTab === 'integrations' 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Multi-Source
              </button>
            </div>
          </div>

          {/* Animated Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'ai' && (
              <motion.div
                key="ai-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4 }}
                className="grid md:grid-cols-2 gap-12 items-center"
              >
                <div className="space-y-6">
                  <div className="rounded-2xl bg-accent-purple/10 border border-accent-purple/20 p-4 text-accent-purple w-fit">
                    <Cpu className="h-8 w-8" />
                  </div>
                  <h4 className="text-3xl font-extrabold text-foreground">Hindsight & CascadeFlow Synergy</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Our AI Chat Assistant uses <strong>Hindsight Memory Retrieval</strong> to recall your previous edits, category overrides, and preferred budget allocation strategies. 
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    To maintain speed and cost efficiency, <strong>CascadeFlow Adaptive Execution</strong> automatically routes simpler inquiries to fast LLMs and scales up to massive reasoning engines (like Llama-3.3-70b) when complex budget projections are needed.
                  </p>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="border border-border/60 rounded-xl p-3 bg-card/30">
                      <span className="font-bold text-foreground block text-sm">Long-term Memory</span>
                      <span className="text-xs text-muted-foreground">Adjusts answers dynamically based on user feedback.</span>
                    </div>
                    <div className="border border-border/60 rounded-xl p-3 bg-card/30">
                      <span className="font-bold text-foreground block text-sm">Adaptive Routing</span>
                      <span className="text-xs text-muted-foreground">Maintains low latency under high load.</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card/45 p-6 space-y-4 shadow-xl">
                  <div className="flex items-center gap-2 text-xs font-bold text-accent-purple font-mono bg-accent-purple/10 border border-accent-purple/20 px-3 py-1 rounded-full w-fit">
                    <Sparkles className="h-3 w-3 animate-spin" /> AI Copilot Terminal
                  </div>
                  <div className="space-y-3 font-mono text-xs">
                    <div className="p-3 bg-secondary/15 rounded-xl border border-border/40 text-muted-foreground">
                      &gt; How much did I spend on groceries this month?
                    </div>
                    <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 text-foreground space-y-2">
                      <span className="text-primary font-bold">UniFinance Copilot:</span>
                      <p>You spent $124.50. This is 15% less than your usual average, because I applied your corrected "Costco Wholesale" rule from last Tuesday.</p>
                    </div>
                    <div className="p-3 bg-secondary/15 rounded-xl border border-border/40 text-muted-foreground">
                      &gt; Project my savings if my scholarship increases by $200.
                    </div>
                    <div className="p-3 bg-accent-purple/10 rounded-xl border-accent-purple/20 border text-foreground">
                      <span className="text-accent-purple font-bold">CascadeFlow Escalation:</span>
                      <p>Routing to reasoning engine... You will hit your Laptop Fund savings goal 2 months early!</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'ocr' && (
              <motion.div
                key="ocr-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4 }}
                className="grid md:grid-cols-2 gap-12 items-center"
              >
                <div className="space-y-6">
                  <div className="rounded-2xl bg-accent-green/10 border border-accent-green/20 p-4 text-accent-green w-fit">
                    <ScanLine className="h-8 w-8" />
                  </div>
                  <h4 className="text-3xl font-extrabold text-foreground">Computer Vision Receipt Parsing</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Upload receipt photos or multipage PDFs. Our Python microservice handles document perspective corrections, applies Contrast Limited Adaptive Histogram Equalization (CLAHE) for clarity, and executes PaddleOCR.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Heuristic parsers extract the Merchant, total Amount, Currency, and Transaction Date with smart fallback rules.
                  </p>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="border border-border/60 rounded-xl p-3 bg-card/30">
                      <span className="font-bold text-foreground block text-sm">Image Denoising</span>
                      <span className="text-xs text-muted-foreground">Advanced OpenCV pre-processing filters.</span>
                    </div>
                    <div className="border border-border/60 rounded-xl p-3 bg-card/30">
                      <span className="font-bold text-foreground block text-sm">Feedback Loop</span>
                      <span className="text-xs text-muted-foreground">Correct errors once; remember it forever.</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card/45 p-6 space-y-4 shadow-xl relative overflow-hidden">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-accent-green font-mono bg-accent-green/10 border border-accent-green/20 px-3 py-1 rounded-full">
                      OCR Engine Status
                    </span>
                    <span className="text-xs text-muted-foreground">receipt_scan_04.png</span>
                  </div>
                  <div className="border border-dashed border-accent-green/50 rounded-xl p-4 bg-secondary/5 relative flex flex-col items-center justify-center min-h-[160px]">
                    <div className="absolute top-2 left-2 text-[10px] text-accent-green font-mono font-bold">Auto-Crop Active</div>
                    <FileText className="h-10 w-10 text-muted-foreground mb-2" />
                    <span className="text-xs font-bold text-foreground">STARBUCKS COFFEE</span>
                    <span className="text-[10px] text-muted-foreground">Date: 2026-06-25 | Total: $14.50</span>
                    <div className="absolute bottom-2 right-2 text-[9px] text-accent-green bg-accent-green/10 border border-accent-green/20 px-2 py-0.5 rounded font-mono">
                      Matched: Food & Dining
                    </div>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-muted-foreground block uppercase tracking-wider">Extracted Data</span>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="p-2 bg-secondary/10 border border-border/40 rounded">Merchant: Starbucks</div>
                      <div className="p-2 bg-secondary/10 border border-border/40 rounded">Amount: $14.50</div>
                      <div className="p-2 bg-secondary/10 border border-border/40 rounded">Currency: USD</div>
                      <div className="p-2 bg-secondary/10 border border-border/40 rounded">Category: Food</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'integrations' && (
              <motion.div
                key="integrations-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4 }}
                className="grid md:grid-cols-2 gap-12 items-center"
              >
                <div className="space-y-6">
                  <div className="rounded-2xl bg-accent-cyan/10 border border-accent-cyan/20 p-4 text-accent-cyan w-fit">
                    <Inbox className="h-8 w-8" />
                  </div>
                  <h4 className="text-3xl font-extrabold text-foreground">Multi-Source Auto-Import</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Transactions are captured from wherever they happen. Log manual expenses easily on the dashboard, upload scans, or leverage background integrations.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Integrations securely import transactions from SMS alerts and Gmail notifications, automatically populating your balance chart.
                  </p>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="border border-border/60 rounded-xl p-3 bg-card/30">
                      <span className="font-bold text-foreground block text-sm">Recurring Detection</span>
                      <span className="text-xs text-muted-foreground">Auto-tracks Spotify, Gym, or rent dues.</span>
                    </div>
                    <div className="border border-border/60 rounded-xl p-3 bg-card/30">
                      <span className="font-bold text-foreground block text-sm">Multi-Channel Sync</span>
                      <span className="text-xs text-muted-foreground">Combines SMS, email, and manual entries.</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card/45 p-6 space-y-4 shadow-xl">
                  <span className="text-xs font-bold text-accent-cyan font-mono bg-accent-cyan/10 border border-accent-cyan/20 px-3 py-1 rounded-full w-fit block">
                    Source Routing Pipeline
                  </span>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 bg-secondary/10 border border-border/40 rounded-xl">
                      <span className="w-2.5 h-2.5 rounded-full bg-accent-cyan" />
                      <div className="flex-1">
                        <span className="text-xs font-bold text-foreground block">Gmail Auto-Parse</span>
                        <span className="text-[10px] text-muted-foreground">Rent Payment Confirmation received</span>
                      </div>
                      <span className="text-xs font-mono font-semibold text-accent-purple">-$450.00</span>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-secondary/10 border border-border/40 rounded-xl">
                      <span className="w-2.5 h-2.5 rounded-full bg-accent-pink" />
                      <div className="flex-1">
                        <span className="text-xs font-bold text-foreground block">SMS Transaction Alert</span>
                        <span className="text-[10px] text-muted-foreground">Auto-logged from local phone notification</span>
                      </div>
                      <span className="text-xs font-mono font-semibold text-accent-green">+$320.00</span>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-secondary/10 border border-border/40 rounded-xl">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                      <div className="flex-1">
                        <span className="text-xs font-bold text-foreground block">Recurring Projects</span>
                        <span className="text-[10px] text-muted-foreground">Stripe subscription automatically detected</span>
                      </div>
                      <span className="text-xs font-mono font-semibold text-accent-purple">-$9.99</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Built Specifically for Students List */}
      <section className="border-t border-border bg-card/10 px-6 py-20 md:px-12">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-lg mx-auto space-y-3">
            <h3 className="text-3xl font-extrabold tracking-tight">Tailored to Student Realities</h3>
            <p className="text-sm text-muted-foreground">
              Say goodbye to generic expense tools. UniFinance addresses actual student budget constraints.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card/40 p-6 backdrop-blur-sm space-y-4 hover:border-primary/20 transition-all duration-300">
              <div className="rounded-xl bg-primary/10 p-3 text-primary w-fit">
                <PiggyBank className="h-6 w-6" />
              </div>
              <h4 className="font-bold text-lg text-foreground">Smart Budget Planning</h4>
              <p className="text-sm text-muted-foreground">
                Allocate allowances and income toward tuition, rent, groceries, and textbooks easily.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card/40 p-6 backdrop-blur-sm space-y-4 hover:border-primary/20 transition-all duration-300">
              <div className="rounded-xl bg-accent-purple/10 p-3 text-accent-purple w-fit">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h4 className="font-bold text-lg text-foreground">Scholarship & Job Tracking</h4>
              <p className="text-sm text-muted-foreground">
                Log recurring stipends, grant aids, and part-time shifts to know your exact cash flows.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card/40 p-6 backdrop-blur-sm space-y-4 hover:border-primary/20 transition-all duration-300">
              <div className="rounded-xl bg-accent-green/10 p-3 text-accent-green w-fit">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h4 className="font-bold text-lg text-foreground">Secure & Private</h4>
              <p className="text-sm text-muted-foreground">
                Powered by Supabase and secure Row Level Security (RLS) policies. Your money data stays yours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive FAQ Section */}
      <section className="border-t border-border bg-background px-6 py-20 md:px-12">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h3 className="text-3xl font-extrabold tracking-tight">Frequently Asked Questions</h3>
            <p className="text-sm text-muted-foreground">Got questions? We've got answers.</p>
          </div>

          <div className="space-y-4">
            {faqData.map((faq, idx) => (
              <div key={idx} className="border border-border/80 rounded-2xl bg-card/35 overflow-hidden transition-all duration-200">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-6 text-left font-bold text-base hover:bg-secondary/10 transition-colors"
                >
                  <span className="text-foreground">{faq.q}</span>
                  <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${openFaq === idx ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {openFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-border/50 bg-secondary/5"
                    >
                      <p className="p-6 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border bg-card/20 px-6 py-24 md:px-12 relative overflow-hidden text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
        <div className="max-w-3xl mx-auto space-y-8 z-10 relative">
          <h3 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground">
            Ready to Take Control of Your College Finances?
          </h3>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
            Join other students saving smarter, managing budgets dynamically, and getting real-time insights from their personalized copilot.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-4 text-base font-bold text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-[0_0_30px_rgba(238,158,115,0.3)]"
            >
              Get Started Now
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/40 py-12 px-6 text-center text-xs text-muted-foreground space-y-4">
        <div className="flex items-center justify-center gap-2.5">
          <GraduationCap className="h-5 w-5 text-primary" />
          <span className="font-bold text-sm text-foreground">UniFinance</span>
        </div>
        <p>© 2026 UniFinance SaaS Inc. All rights reserved. Built using Next.js 15, TypeScript, Tailwind CSS, & Supabase.</p>
      </footer>
    </div>
  );
}

