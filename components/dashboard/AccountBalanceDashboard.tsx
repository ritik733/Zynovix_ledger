'use client';

import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  Users,
  Clock,
  Plus,
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  Calendar,
  Info,
} from 'lucide-react';
import { useStore } from '@/lib/store-context';
import { formatCurrency } from '@/lib/constants';
import { PersonSummary, Transaction } from '@/types';
import { PersonDetailModal } from '../modals/PersonDetailModal';
import { SettleModal } from '../modals/SettleModal';

interface AccountBalanceDashboardProps {
  onOpenAddModal?: (type?: 'expense' | 'borrow' | 'lending' | 'repayment') => void;
}

export function AccountBalanceDashboard({ onOpenAddModal }: AccountBalanceDashboardProps = {}) {
  const {
    accountBalanceSummary,
    personSummaries,
    ageingAnalysis,
    enrichedTransactions,
    currency,
    openAddModal,
  } = useStore();

  const [selectedPerson, setSelectedPerson] = useState<PersonSummary | null>(null);
  const [settleTx, setSettleTx] = useState<Transaction | null>(null);

  const [greeting, setGreeting] = useState('Welcome Back');

  useEffect(() => {
    const currentHour = new Date().getHours();
    setGreeting(
      currentHour < 12
        ? 'Good Morning'
        : currentHour < 17
        ? 'Good Afternoon'
        : 'Good Evening'
    );
  }, []);

  const {
    totalBorrowed,
    totalLent,
    netPosition,
    netReceivable,
    netPayable,
    totalSettledRepayments,
  } = accountBalanceSummary;

  // Filter pending transactions for quick settle
  const pendingTransactions = enrichedTransactions.filter(
    (t) => (t.type === 'borrow' || t.type === 'lending') && (t.pending_amount || 0) > 0
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Top Banner Greeting & Primary CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-blue-200 mb-3 border border-white/10">
            <Wallet className="w-3.5 h-3.5 text-blue-400" />
            <span>Personal Ledger Overview</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {greeting}, Track Your Balances
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Real-time borrow and lending ledger. Track who you owe, who owes you, and monitor ageing outstanding balances.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (onOpenAddModal) onOpenAddModal('borrow');
              else openAddModal('borrow');
            }}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-200 border border-amber-400/30 hover:bg-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4 text-amber-300" />
            <span>+ Borrow</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onOpenAddModal) onOpenAddModal('lending');
              else openAddModal('lending');
            }}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 hover:bg-emerald-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4 text-emerald-300" />
            <span>+ Lend</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onOpenAddModal) onOpenAddModal('expense');
              else openAddModal('expense');
            }}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-200 border border-rose-400/30 hover:bg-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-rose-300" />
            <span>+ Expense</span>
          </button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Scale className="w-5 h-5 text-indigo-600" />
            <span>Account Balance</span>
          </h2>
          <span className="text-xs text-slate-500">Live Database Calculations</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Card 1: Total Borrowed (I Owe) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                I Owe (Total Borrowed)
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {formatCurrency(totalBorrowed, currency)}
              </span>
              <p className="text-xs text-slate-500 mt-1">
                Outstanding money you currently owe to others across all borrowing transactions.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Net Payable:</span>
              <span className="font-bold text-amber-700">{formatCurrency(netPayable, currency)}</span>
            </div>
          </div>

          {/* Card 2: Total Lent (They Owe Me) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                They Owe Me (Total Lent)
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {formatCurrency(totalLent, currency)}
              </span>
              <p className="text-xs text-slate-500 mt-1">
                Outstanding money others currently owe you across all lending transactions.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Net Receivable:</span>
              <span className="font-bold text-emerald-700">{formatCurrency(netReceivable, currency)}</span>
            </div>
          </div>

          {/* Card 3: Net Position */}
          <div
            className={`rounded-2xl p-5 border shadow-xs hover:shadow-md transition-shadow ${
              netPosition > 0
                ? 'bg-gradient-to-br from-emerald-50/70 to-teal-50/50 border-emerald-200'
                : netPosition < 0
                ? 'bg-gradient-to-br from-rose-50/70 to-amber-50/50 border-rose-200'
                : 'bg-white border-slate-200/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Net Position (Lent - Borrowed)
              </span>
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  netPosition > 0
                    ? 'bg-emerald-100 text-emerald-700'
                    : netPosition < 0
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Scale className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                    netPosition > 0
                      ? 'text-emerald-700'
                      : netPosition < 0
                      ? 'text-rose-700'
                      : 'text-slate-900'
                  }`}
                >
                  {netPosition > 0 ? '+' : ''}
                  {formatCurrency(netPosition, currency)}
                </span>
                <span
                  className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${
                    netPosition > 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : netPosition < 0
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {netPosition > 0
                    ? 'Net Receivable'
                    : netPosition < 0
                    ? 'Net Payable'
                    : 'Balanced'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {netPosition > 0
                  ? 'Positive: You have more money to receive than you owe.'
                  : netPosition < 0
                  ? 'Negative: You owe more money to others than you are owed.'
                  : 'All borrowings and lendings are fully balanced.'}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-500">Settlements recorded:</span>
              <span className="font-semibold text-slate-700">
                {formatCurrency(totalSettledRepayments, currency)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Person-wise Account Summary (Section 9) */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>Person-wise Account Summary</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any person to view independent borrow/lending records and settlement history.
            </p>
          </div>
        </div>

        {personSummaries.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No people added yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Add a borrow or lending transaction to automatically track balances by person.
            </p>
            <button
              onClick={() => (onOpenAddModal ? onOpenAddModal('borrow') : openAddModal('borrow'))}
              className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700"
            >
              + Record First Borrow / Lend
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Person</th>
                    <th className="py-3 px-4 text-right">I Owe</th>
                    <th className="py-3 px-4 text-right">They Owe Me</th>
                    <th className="py-3 px-4 text-right">Net Position</th>
                    <th className="py-3 px-4">Oldest Pending</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {personSummaries.map((p) => {
                    const isPayable = p.status === 'Payable';
                    const isReceivable = p.status === 'Receivable';
                    const isSettled = p.status === 'Settled';

                    return (
                      <tr
                        key={p.person_id}
                        className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                        onClick={() => setSelectedPerson(p)}
                      >
                        <td className="py-3.5 px-4 font-semibold text-slate-900 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                            {p.person_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="block leading-tight">{p.person_name}</span>
                            {p.phone && <span className="text-[11px] text-slate-400 block">{p.phone}</span>}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right font-medium text-slate-700 whitespace-nowrap">
                          {p.i_owe > 0 ? (
                            <span className="text-amber-700 font-bold">
                              {formatCurrency(p.i_owe, currency)}
                            </span>
                          ) : (
                            <span className="text-slate-400">{currency}0</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right font-medium text-slate-700 whitespace-nowrap">
                          {p.they_owe_me > 0 ? (
                            <span className="text-emerald-700 font-bold">
                              {formatCurrency(p.they_owe_me, currency)}
                            </span>
                          ) : (
                            <span className="text-slate-400">{currency}0</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right font-extrabold whitespace-nowrap">
                          <span
                            className={
                              p.net_position > 0
                                ? 'text-emerald-700'
                                : p.net_position < 0
                                ? 'text-rose-700'
                                : 'text-slate-400'
                            }
                          >
                            {p.net_position > 0 ? '+' : ''}
                            {formatCurrency(p.net_position, currency)}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                          {p.oldest_pending_days > 0 ? (
                            <span
                              className={`inline-flex items-center gap-1 font-semibold ${
                                p.oldest_pending_days > 60
                                  ? 'text-rose-600'
                                  : p.oldest_pending_days > 30
                                  ? 'text-amber-600'
                                  : 'text-slate-600'
                              }`}
                            >
                              <Clock className="w-3.5 h-3.5" />
                              {p.oldest_pending_days} days
                            </span>
                          ) : (
                            <span className="text-slate-400">None</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-block ${
                              isReceivable
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : isPayable
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPerson(p);
                            }}
                            className="px-3 py-1 rounded-lg text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 transition-colors inline-flex items-center gap-1"
                          >
                            <span>Details</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Ageing Analysis (Section 10) */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <span>Ageing Analysis for Outstanding Balances</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Identifies how long pending amounts have remained unpaid since the original transaction date.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lending Ageing Table (Money They Owe Me) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Lending Ageing (They Owe Me)
                </h3>
              </div>
              <span className="text-xs font-extrabold text-emerald-700">
                Total: {formatCurrency(ageingAnalysis.totalLendingPending, currency)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Age Bucket</th>
                    <th className="py-2.5 px-3 text-center">Transactions</th>
                    <th className="py-2.5 px-3 text-right">Pending Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {ageingAnalysis.lending.map((item) => {
                    const isOld = item.bucket === '61-90 days' || item.bucket === '90+ days';
                    return (
                      <tr key={item.bucket} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-semibold flex items-center gap-1.5">
                          {isOld && item.amount > 0 && (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          )}
                          <span>{item.bucket}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-medium text-slate-600">
                          {item.count}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {formatCurrency(item.amount, currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Borrowing Ageing Table (Money I Owe Others) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Borrowing Ageing (I Owe Others)
                </h3>
              </div>
              <span className="text-xs font-extrabold text-amber-700">
                Total: {formatCurrency(ageingAnalysis.totalBorrowingPending, currency)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Age Bucket</th>
                    <th className="py-2.5 px-3 text-center">Transactions</th>
                    <th className="py-2.5 px-3 text-right">Pending Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {ageingAnalysis.borrowing.map((item) => {
                    const isOld = item.bucket === '61-90 days' || item.bucket === '90+ days';
                    return (
                      <tr key={item.bucket} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-semibold flex items-center gap-1.5">
                          {isOld && item.amount > 0 && (
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          )}
                          <span>{item.bucket}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-medium text-slate-600">
                          {item.count}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {formatCurrency(item.amount, currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Person Detail Modal */}
      {selectedPerson && (
        <PersonDetailModal
          isOpen={Boolean(selectedPerson)}
          onClose={() => setSelectedPerson(null)}
          personSummary={selectedPerson}
          onOpenAddTransactionForPerson={(type) => {
            const pId = selectedPerson.person_id;
            setSelectedPerson(null);
            if (onOpenAddModal) {
              onOpenAddModal(type);
            } else {
              openAddModal(type, pId);
            }
          }}
        />
      )}

      {/* Settle Modal */}
      {settleTx && (
        <SettleModal
          isOpen={Boolean(settleTx)}
          onClose={() => setSettleTx(null)}
          transaction={settleTx}
        />
      )}
    </div>
  );
}
