'use client';

import React from 'react';
import { StoreProvider, useStore } from '@/lib/store-context';
import { Navbar } from './Navbar';
import { MobileNav } from './MobileNav';
import { AddTransactionModal } from '../modals/AddTransactionModal';

interface AppShellProps {
  children: React.ReactNode;
}

function AppContent({ children }: { children: React.ReactNode }) {
  const {
    isAddModalOpen,
    closeAddModal,
    addModalType,
    addModalPersonId,
    addModalTransactionId,
  } = useStore();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 pb-20 md:pb-8">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>

      <MobileNav />

      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        initialType={addModalType}
        initialPersonId={addModalPersonId}
        initialTransactionId={addModalTransactionId}
      />
    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  return (
    <StoreProvider>
      <AppContent>{children}</AppContent>
    </StoreProvider>
  );
}
