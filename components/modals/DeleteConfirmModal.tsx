'use client';

import React from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';
import { Transaction } from '@/types';
import { formatCurrency } from '@/lib/constants';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  transaction: Transaction | null;
  currency: string;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  transaction,
  currency,
}: DeleteConfirmModalProps) {
  if (!isOpen || !transaction) return null;

  const hasSettlements = (transaction.settlements && transaction.settlements.length > 0) || (transaction.total_settled || 0) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-6">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <h3 className="text-lg font-bold text-slate-900">Delete Transaction?</h3>
          <p className="text-xs text-slate-600 mt-1">
            Are you sure you want to delete this {transaction.type} transaction of{' '}
            <strong className="text-slate-900">{formatCurrency(transaction.amount, currency)}</strong>?
          </p>

          <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs space-y-1 border border-slate-100">
            <div><strong>Remark:</strong> {transaction.remark}</div>
            <div><strong>Date:</strong> {transaction.transaction_date}</div>
            {transaction.person_name && <div><strong>Person:</strong> {transaction.person_name}</div>}
          </div>

          {hasSettlements && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Warning:</strong> This transaction has{' '}
                {transaction.settlements?.length || 1} associated settlement repayment(s) totaling{' '}
                {formatCurrency(transaction.total_settled || 0, currency)}. Deleting this transaction will also delete or unbind its settlements to maintain ledger balance integrity.
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/25 transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Confirm Delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
