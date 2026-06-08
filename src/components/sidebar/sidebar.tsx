'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Expenses', href: '/dashboard/expenses', icon: Receipt },
  { name: 'Budgets', href: '/dashboard/budgets', icon: PiggyBank },
  { name: 'Analytics', href: '/dashboard/analytics', icon: TrendingUp },
  { name: 'Converter', href: '/dashboard/currency-converter', icon: Coins },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = () => {
    // Delete local mock session cookie
    document.cookie = 'sb-mock-user=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    router.push('/');
    router.refresh();
  };

  return (
    <>
      {/* Mobile Header */}
      <header className="flex h-16 items-center justify-between border-b border-border bg-card/50 px-6 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            UniFinance
          </span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
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
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card/30 backdrop-blur-xl transition-transform duration-300 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:static md:flex`}
      >
        {/* Brand Logo */}
        <div className="flex h-16 items-center gap-2.5 px-6 border-b border-border">
          <GraduationCap className="h-8 w-8 text-primary" />
          <div>
            <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              UniFinance
            </h1>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Student SaaS</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 px-4 py-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary/10 text-primary border-l-2 border-primary shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                    : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Footer Profile Stub */}
        <div className="border-t border-border p-4 bg-card/10">
          <div className="flex items-center gap-3 rounded-xl p-2 hover:bg-secondary/20 transition-all duration-200 cursor-pointer">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-sm">
              JD
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold truncate">John Doe</p>
              <p className="text-[10px] text-muted-foreground truncate">john@university.edu</p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-destructive transition-colors p-1"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
