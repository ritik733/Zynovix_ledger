'use client';

import React from 'react';
import { TransactionsView } from '@/components/transactions/TransactionsView';

interface PageProps {
  onOpenAddModal?: (type?: 'expense' | 'borrow' | 'lending' | 'repayment') => void;
}

export default function TransactionsPage({ onOpenAddModal = () => {} }: PageProps) {
  return <TransactionsView onOpenAddModal={onOpenAddModal} />;
}
