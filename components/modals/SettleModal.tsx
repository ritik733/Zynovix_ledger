'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import { useStore } from '@/lib/store-context';
import { Transaction } from '@/types';
import { PAYMENT_METHODS, formatCurrency } from '@/lib/constants';
import { format } from 'date-fns';

interface SettleModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export function SettleModal({ isOpen, onClose, transaction }: SettleModalProps) {
  const { addSettlement, currency } = useStore();

  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('UPI (Google Pay / PhonePe / Paytm)');
  const [remark, setRemark] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (transaction && isOpen) {
      const pending = transaction.pending_amount || 0;
      setAmount(String(pending));
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setRemark(
        transaction.type === 'borrow'
          ? `Repayment to ${transaction.person_name || 'person'}`
          : `Received settlement from ${transaction.person_name || 'person'}`
      );
      setErrorMsg(null);
    }
  }, [transaction, isOpen]);

  if (!isOpen || !transaction) return null;

  const pending = transaction.pending_amount || 0;
  const isBorrow = transaction.type === 'borrow';

  const handlePreset = (pct: number) => {
    const calculated = Math.round(((pending * pct) / 100) * 100) / 100;
    setAmount(String(calculated));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      setErrorMsg('Please enter a settlement amount greater than 0.');
      return;
    }

    if (parsed > pending) {
      setErrorMsg(
        `Settlement amount (${formatCurrency(parsed, currency)}) cannot exceed pending balance (${formatCurrency(
          pending,
          currency
        )}).`
      );
      return;
    }

    // MANDATORY REMARK VALIDATION
    if (!remark || remark.trim().length === 0) {
      setErrorMsg('Remark is mandatory for settlements/repayments.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await addSettlement({
        transaction_id: transaction.id,
        amount: parsed,
        settlement_date: date,
        payment_method: paymentMethod,
        remark: remark.trim(),
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to record settlement.');
        setIsSubmitting(false);
        return;
      }

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                {isBorrow ? 'Record Repayment (I Pay)' : 'Record Settlement (I Receive)'}
              </h2>
              <p className="text-xs text-slate-500">
                Settling transaction with <strong>{transaction.person_name}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transaction Context Card */}
        <div className="px-6 py-3.5 bg-slate-50/70 border-b border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Original Transaction:</span>
            <span className="font-semibold text-slate-800">
              {formatCurrency(transaction.amount, currency)} ({transaction.type.toUpperCase()})
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Already Settled / Paid:</span>
            <span className="font-semibold text-slate-800">
              {formatCurrency(transaction.total_settled || 0, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
            <span className="font-bold text-slate-700">Remaining Pending:</span>
            <span className="font-extrabold text-indigo-600 text-sm">
              {formatCurrency(pending, currency)}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Amount input & presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Settlement Amount ({currency}) <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePreset(25)}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  25%
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset(50)}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset(100)}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700"
                >
                  Full (100%)
                </button>
              </div>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold text-base pointer-events-none">
                {currency}
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={pending}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Settlement Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Settlement Date <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                <Calendar className="w-4 h-4" />
              </span>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Mandatory Remark */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Remark <span className="text-rose-500 font-bold">* MANDATORY</span>
              </label>
            </div>
            <input
              type="text"
              required
              placeholder="e.g. Paid via GPay, Cash received at home..."
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/25 active:scale-98 transition-all"
            >
              {isSubmitting ? 'Recording...' : 'Confirm Settlement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
