'use client';

import React, { useState } from 'react';
import { StoreProvider } from '@/lib/store-context';
import { Navbar } from './Navbar';
import { MobileNav } from './MobileNav';
import { AddTransactionModal } from '../modals/AddTransactionModal';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState<
    'expense' | 'borrow' | 'lending' | 'repayment'
  >('expense');

  const handleOpenAddModal = (
    type: 'expense' | 'borrow' | 'lending' | 'repayment' = 'expense'
  ) => {
    setModalDefaultType(type);
    setIsAddModalOpen(true);
  };

  return (
    <StoreProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 pb-20 md:pb-8">
        <Navbar onOpenAddModal={handleOpenAddModal} />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {React.cloneElement(children as React.ReactElement<any>, {
            onOpenAddModal: handleOpenAddModal,
          })}
        </main>

        <MobileNav onOpenAddModal={() => handleOpenAddModal('expense')} />

        <AddTransactionModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          initialType={modalDefaultType}
        />
      </div>
    </StoreProvider>
  );
}
