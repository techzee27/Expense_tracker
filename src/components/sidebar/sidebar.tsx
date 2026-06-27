'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getProfileAction } from '@/controllers/profile.controller';
import {
  LayoutDashboard,
  Receipt,
  TrendingUp,
  PiggyBank,
  Settings,
  LogOut,
  Menu,
  X,
  GraduationCap,
  Coins,
  ClipboardList,
  ArrowUpRight,
  Target,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Expenses', href: '/dashboard/expenses', icon: Receipt },
  { name: 'Income', href: '/dashboard/income', icon: ArrowUpRight },
  { name: 'Review Queue', href: '/dashboard/review', icon: ClipboardList },
  { name: 'Budgets', href: '/dashboard/budgets', icon: PiggyBank },
  { name: 'Savings', href: '/dashboard/savings', icon: Target },
  { name: 'Analytics', href: '/dashboard/analytics', icon: TrendingUp },
  { name: 'Converter', href: '/dashboard/currency-converter', icon: Coins },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userData, setUserData] = useState<{ email: string; name: string } | null>(null);

  // Sync collapsed state with document body on mount
  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed') === 'true';
    setIsCollapsed(stored);
    if (stored) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
  }, []);

  const toggleCollapse = () => {
    const nextVal = !isCollapsed;
    setIsCollapsed(nextVal);
    localStorage.setItem('sidebar-collapsed', String(nextVal));
    if (nextVal) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (authUser) {
          const profileResult = await getProfileAction(authUser.id);
          const name =
            profileResult.success && profileResult.data?.fullName
              ? profileResult.data.fullName
              : authUser.user_metadata?.full_name || 'Student';
          setUserData({
            email: authUser.email || '',
            name,
          });
        }
      } catch (err) {
        console.error('Failed to resolve user details in sidebar', err);
      }
    };
    fetchUser();
  }, []);

  const initials = userData
    ? userData.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'U';

  return (
    <>
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-40 flex h-16 items-center justify-between border-b border-white/5 bg-[#0c0d12]/90 backdrop-blur-md px-6 text-white md:hidden">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
            UniFinance
          </span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Toggle navigation menu"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/10 bg-[#0c0d12]/85 backdrop-blur-xl text-secondary-foreground shadow-[4px_0_24px_rgba(0,0,0,0.3)] transition-all ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 md:flex`}
      >
        {/* Desktop/Tablet Collapse Toggle Button - Always visible, floats on right border */}
        <button
          onClick={toggleCollapse}
          className="hidden md:flex absolute -right-3.5 top-6 z-50 h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-[#12131a] text-primary hover:bg-primary hover:text-white hover:border-primary/50 hover:scale-110 active:scale-90 shadow-[0_4px_20px_rgba(0,0,0,0.4)] transition-all duration-300 ease-out cursor-pointer hover:shadow-[0_0_15px_rgba(238,158,115,0.4)]"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <ChevronLeft className={`h-4 w-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : 'rotate-0'}`} />
        </button>

        {/* Brand Logo */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-white/10 brand-logo-container">
          <div className="flex items-center gap-2.5">
            <GraduationCap className="h-8 w-8 text-primary shrink-0" />
            <div className="brand-text">
              <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent brand-title">
                UniFinance
              </h1>
              <p className="text-[10px] text-white/50 tracking-widest uppercase brand-subtitle">Student SaaS</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto space-y-1.5 px-4 py-6 scrollbar-thin">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary border-l-4 border-primary font-bold shadow-[0_0_25px_rgba(238,158,115,0.15)]'
                    : 'text-white/70 hover:bg-white/5 hover:text-white hover:scale-[1.02] active:scale-[0.98]'
                }`}
                title={isCollapsed ? item.name : undefined}
              >
                <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-primary' : 'text-white/70 group-hover:text-white'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Footer Profile Stub */}
        <div className="border-t border-white/10 p-4 bg-black/20 footer-container">
          <Link
            href="/dashboard/settings"
            onClick={() => setIsOpen(false)}
            className={`flex flex-col gap-3 rounded-xl p-3 border border-transparent transition-all duration-300 cursor-pointer justify-start footer-inner relative overflow-hidden group ${
              pathname === '/dashboard/settings'
                ? 'bg-gradient-to-r from-primary/15 to-primary/5 border-primary/20 text-primary font-bold shadow-[0_0_20px_rgba(238,158,115,0.15)]'
                : 'hover:bg-white/5 hover:border-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]'
            }`}
          >
            {/* Subtle background hover glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="flex items-center gap-3 relative z-10">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-sm shrink-0 border border-primary/30 group-hover:scale-105 transition-transform duration-300">
                {initials}
              </div>
              <div className="flex-1 overflow-hidden user-info">
                <p className="text-xs font-bold truncate text-white group-hover:text-primary transition-colors">{userData ? userData.name : 'Loading...'}</p>
                <p className="text-[10px] text-white/50 truncate">{userData ? userData.email : ''}</p>
              </div>
            </div>

            {/* Manage Profile Indicator */}
            <div className="flex items-center justify-between mt-1 text-[11px] text-primary/75 group-hover:text-primary transition-colors font-semibold user-info relative z-10">
              <span>Manage Profile</span>
              <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform duration-300" />
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
}


