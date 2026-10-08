'use client';

import React, { useState } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  FileText,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import { useStore } from '@/lib/store-context';
import { PersonSummary, Transaction } from '@/types';
import { formatCurrency } from '@/lib/constants';
import { SettleModal } from './SettleModal';

interface PersonDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  personSummary: PersonSummary | null;
  onOpenAddTransactionForPerson: (type: 'borrow' | 'lending') => void;
}

export function PersonDetailModal({
  isOpen,
  onClose,
  personSummary,
  onOpenAddTransactionForPerson,
}: PersonDetailModalProps) {
  const { enrichedTransactions, settlements, currency } = useStore();
  const [settleTx, setSettleTx] = useState<Transaction | null>(null);

  if (!isOpen || !personSummary) return null;

  // All transactions for this person (borrow and lending)
  const personTransactions = enrichedTransactions.filter(
    (t) => t.person_id === personSummary.person_id
  );

  // Settlements associated with this person's transactions
  const personTxIds = new Set(personTransactions.map((t) => t.id));
  const personSettlements = settlements.filter(
    (s) => personTxIds.has(s.transaction_id) && !s.is_deleted
  );

  const totalPaidReceived =
    personSummary.total_borrowed_settled + personSummary.total_lent_settled;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
        <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg">
                {personSummary.person_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900 leading-tight">
                    {personSummary.person_name}
                  </h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      personSummary.status === 'Receivable'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : personSummary.status === 'Payable'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {personSummary.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                  {personSummary.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {personSummary.phone}
                    </span>
                  )}
                  {personSummary.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      {personSummary.email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action Bar */}
          <div className="px-6 py-2.5 bg-slate-100/60 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-slate-600 font-medium">
              Maintain borrow and lending separately. Independent records remain visible.
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAddTransactionForPerson('borrow')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 flex items-center gap-1.5 transition-colors"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>+ Borrow from {personSummary.person_name.split(' ')[0]}</span>
              </button>
              <button
                onClick={() => onOpenAddTransactionForPerson('lending')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1.5 transition-colors"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>+ Lend to {personSummary.person_name.split(' ')[0]}</span>
              </button>
            </div>
          </div>

          {/* Metrics Overview Cards */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Total Borrowed */}
              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">
                  Total Borrowed
                </span>
                <span className="text-base font-bold text-slate-900 mt-1 block">
                  {formatCurrency(personSummary.total_borrowed, currency)}
                </span>
                <span className="text-[10px] text-amber-700">
                  Paid: {formatCurrency(personSummary.total_borrowed_settled, currency)}
                </span>
              </div>

              {/* Total Lent */}
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                  Total Lent
                </span>
                <span className="text-base font-bold text-slate-900 mt-1 block">
                  {formatCurrency(personSummary.total_lent, currency)}
                </span>
                <span className="text-[10px] text-emerald-700">
                  Received: {formatCurrency(personSummary.total_lent_settled, currency)}
                </span>
              </div>

              {/* I Owe */}
              <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider block">
                  I Owe
                </span>
                <span className="text-base font-extrabold text-rose-600 mt-1 block">
                  {formatCurrency(personSummary.i_owe, currency)}
                </span>
                <span className="text-[10px] text-slate-500">Pending borrowing</span>
              </div>

              {/* They Owe Me */}
              <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-100">
                <span className="text-[11px] font-semibold text-teal-800 uppercase tracking-wider block">
                  They Owe Me
                </span>
                <span className="text-base font-extrabold text-teal-600 mt-1 block">
                  {formatCurrency(personSummary.they_owe_me, currency)}
                </span>
                <span className="text-[10px] text-slate-500">Pending lending</span>
              </div>

              {/* Net Position */}
              <div
                className={`p-3 rounded-xl border ${
                  personSummary.net_position > 0
                    ? 'bg-emerald-50/60 border-emerald-200'
                    : personSummary.net_position < 0
                    ? 'bg-rose-50/60 border-rose-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Net Position
                </span>
                <span
                  className={`text-base font-extrabold mt-1 block ${
                    personSummary.net_position > 0
                      ? 'text-emerald-700'
                      : personSummary.net_position < 0
                      ? 'text-rose-700'
                      : 'text-slate-700'
                  }`}
                >
                  {personSummary.net_position > 0 ? '+' : ''}
                  {formatCurrency(personSummary.net_position, currency)}
                </span>
                <span className="text-[10px] font-medium text-slate-600">
                  {personSummary.net_position > 0
                    ? 'They owe me net'
                    : personSummary.net_position < 0
                    ? 'I owe them net'
                    : 'Balanced'}
                </span>
              </div>

              {/* Ageing Info */}
              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                <span className="text-[11px] font-semibold text-indigo-800 uppercase tracking-wider block">
                  Oldest Pending
                </span>
                <span className="text-base font-bold text-indigo-900 mt-1 block">
                  {personSummary.oldest_pending_days > 0
                    ? `${personSummary.oldest_pending_days} days`
                    : '0 days'}
                </span>
                <span className="text-[10px] text-slate-500">
                  Avg age: {personSummary.avg_outstanding_days}d
                </span>
              </div>
            </div>

            {/* Transaction Timeline / Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Transaction History & Settlements
                </h3>
                <span className="text-xs text-slate-500">
                  {personTransactions.length} transaction{personTransactions.length === 1 ? '' : 's'} recorded
                </span>
              </div>

              {personTransactions.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
                  No borrow or lending transactions recorded with {personSummary.person_name} yet.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/80 text-slate-600 border-b border-slate-200 uppercase font-bold text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3 text-right">Amount</th>
                          <th className="py-2.5 px-3 text-right">Paid/Settled</th>
                          <th className="py-2.5 px-3 text-right">Pending</th>
                          <th className="py-2.5 px-3">Age</th>
                          <th className="py-2.5 px-3">Remark (Mandatory)</th>
                          <th className="py-2.5 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {personTransactions.map((tx) => {
                          const isBorrow = tx.type === 'borrow';
                          const pending = tx.pending_amount || 0;
                          const txSettlements = tx.settlements || [];

                          return (
                            <React.Fragment key={tx.id}>
                              <tr className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-3 px-3 font-medium whitespace-nowrap">
                                  {tx.transaction_date}
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      isBorrow
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-emerald-100 text-emerald-800'
                                    }`}
                                  >
                                    {isBorrow ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                    {isBorrow ? 'Borrow' : 'Lending'}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                                  {formatCurrency(tx.amount, currency)}
                                </td>
                                <td className="py-3 px-3 text-right text-slate-600 whitespace-nowrap">
                                  {formatCurrency(tx.total_settled || 0, currency)}
                                </td>
                                <td className="py-3 px-3 text-right font-bold whitespace-nowrap">
                                  <span
                                    className={
                                      pending > 0
                                        ? isBorrow
                                          ? 'text-rose-600'
                                          : 'text-teal-600'
                                        : 'text-slate-400'
                                    }
                                  >
                                    {formatCurrency(pending, currency)}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                                  {tx.days_outstanding}d
                                </td>
                                <td className="py-3 px-3 max-w-[200px]">
                                  <div className="font-medium text-slate-900 truncate" title={tx.remark}>
                                    {tx.remark}
                                  </div>
                                  {tx.notes && (
                                    <div className="text-[11px] text-slate-400 truncate">{tx.notes}</div>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-center whitespace-nowrap">
                                  {pending > 0 ? (
                                    <button
                                      onClick={() => setSettleTx(tx)}
                                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                                    >
                                      Settle
                                    </button>
                                  ) : (
                                    <span className="text-[11px] font-semibold text-emerald-600 inline-flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Fully Settled
                                    </span>
                                  )}
                                </td>
                              </tr>

                              {/* Nested settlement rows if any repayments occurred */}
                              {txSettlements.length > 0 &&
                                txSettlements.map((stl) => (
                                  <tr key={stl.id} className="bg-indigo-50/30 text-[11px]">
                                    <td className="py-1.5 px-3 pl-8 text-slate-500 font-mono">
                                      ↳ {stl.settlement_date}
                                    </td>
                                    <td className="py-1.5 px-3 text-indigo-700 font-semibold uppercase text-[10px]">
                                      Repayment
                                    </td>
                                    <td className="py-1.5 px-3 text-right text-slate-400">-</td>
                                    <td className="py-1.5 px-3 text-right font-semibold text-indigo-700">
                                      {formatCurrency(stl.amount, currency)}
                                    </td>
                                    <td className="py-1.5 px-3 text-right text-slate-400">-</td>
                                    <td className="py-1.5 px-3 text-slate-400">-</td>
                                    <td colSpan={2} className="py-1.5 px-3 text-slate-600 italic">
                                      &quot;{stl.remark}&quot; {stl.payment_method ? `via ${stl.payment_method}` : ''}
                                    </td>
                                  </tr>
                                ))}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Settle Modal */}
      {settleTx && (
        <SettleModal
          isOpen={Boolean(settleTx)}
          onClose={() => setSettleTx(null)}
          transaction={settleTx}
        />
      )}
    </>
  );
}
