'use client';

import React from 'react';
import { ExpenseDashboard } from '@/components/expenses/ExpenseDashboard';

interface PageProps {
  onOpenAddModal?: (type?: 'expense' | 'borrow' | 'lending' | 'repayment') => void;
}

export default function ExpensesPage({ onOpenAddModal = () => {} }: PageProps) {
  return <ExpenseDashboard onOpenAddModal={() => onOpenAddModal('expense')} />;
}
