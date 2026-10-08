'use client';

import React from 'react';
import { AccountBalanceDashboard } from '@/components/dashboard/AccountBalanceDashboard';

interface PageProps {
  onOpenAddModal?: (type?: 'expense' | 'borrow' | 'lending' | 'repayment') => void;
}

export default function HomePage({ onOpenAddModal = () => {} }: PageProps) {
  return <AccountBalanceDashboard onOpenAddModal={onOpenAddModal} />;
}
