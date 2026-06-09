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
  const [userData, setUserData] = useState<{ email: string; name: string } | null>(null);

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

  const handleSignOut = () => {
    // Delete local mock session cookie
    document.cookie = 'sb-mock-user=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    router.push('/');
    router.refresh();
  };

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
      <header className="flex h-16 items-center justify-between border-b border-border bg-secondary px-6 text-secondary-foreground md:hidden">
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
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-secondary text-secondary-foreground transition-transform duration-300 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:static md:flex`}
      >
        {/* Brand Logo */}
        <div className="flex h-16 items-center gap-2.5 px-6 border-b border-border">
          <GraduationCap className="h-8 w-8 text-primary" />
          <div>
            <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
              UniFinance
            </h1>
            <p className="text-[10px] text-white/50 tracking-widest uppercase">Student SaaS</p>
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
                    ? 'bg-primary/20 text-primary border-l-2 border-primary shadow-[0_0_15px_rgba(238,158,115,0.25)]'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-white/70 group-hover:text-white'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Footer Profile Stub */}
        <div className="border-t border-border p-4 bg-black/10">
          <div className="flex items-center gap-3 rounded-xl p-2 hover:bg-white/5 transition-all duration-200 cursor-pointer">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-sm">
              {initials}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold truncate text-white">{userData ? userData.name : 'Loading...'}</p>
              <p className="text-[10px] text-white/60 truncate">{userData ? userData.email : ''}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-white/60 hover:text-primary transition-colors p-1"
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

