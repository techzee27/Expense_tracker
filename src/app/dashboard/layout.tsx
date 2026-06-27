import React from 'react';
import { Sidebar } from '@/components/sidebar/sidebar';
import { CurrencyProvider } from '@/hooks/use-currency';
import { SessionProvider } from '@/components/providers/session-provider';
import { FinancialDataProvider } from '@/components/providers/financial-data-provider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CurrencyProvider>
        <FinancialDataProvider>
          <div className="flex min-h-screen flex-col md:flex-row bg-background">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-y-auto pt-16 md:pt-0 md:pl-64">
              <div className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
                {children}
              </div>
            </main>
          </div>
        </FinancialDataProvider>
      </CurrencyProvider>
    </SessionProvider>
  );
}



