import React from 'react';
import { Sidebar } from '@/components/sidebar/sidebar';
import { CurrencyProvider } from '@/hooks/use-currency';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <CurrencyProvider>
      <div className="flex min-h-screen flex-col md:flex-row bg-background">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <div className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </CurrencyProvider>
  );
}

