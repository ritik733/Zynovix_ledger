'use client';

import React, { useState, useMemo } from 'react';
import {
  ArrowLeftRight,
  Search,
  Filter,
  Download,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { useStore } from '@/lib/store-context';
import { Transaction, DisplayTransactionType } from '@/types';
import { formatCurrency } from '@/lib/constants';
import { exportTransactionsToCSV } from '@/lib/export-csv';
import { SettleModal } from '../modals/SettleModal';
import { EditTransactionModal } from '../modals/EditTransactionModal';
import { DeleteConfirmModal } from '../modals/DeleteConfirmModal';

interface TransactionsViewProps {
  onOpenAddModal?: (type?: 'expense' | 'borrow' | 'lending' | 'repayment') => void;
}

export function TransactionsView({ onOpenAddModal }: TransactionsViewProps = {}) {
  const {
    enrichedTransactions,
    settlements,
    people,
    categories,
    deleteTransaction,
    currency,
    openAddModal,
  } = useStore();

  // Filter & Search states
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [personFilter, setPersonFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Modals state
  const [settleTarget, setSettleTarget] = useState<Transaction | null>(null);
  const [editTarget, setEditTarget] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return enrichedTransactions.filter((tx) => {
      // Type filter
      if (typeFilter !== 'all' && tx.type !== typeFilter) {
        return false;
      }

      // Person filter
      if (personFilter !== 'all' && tx.person_id !== personFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && tx.category_id !== categoryFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && tx.status !== statusFilter) {
        return false;
      }

      // Date range filter
      if (startDate && tx.transaction_date < startDate) {
        return false;
      }
      if (endDate && tx.transaction_date > endDate) {
        return false;
      }

      // Search term
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesRemark = tx.remark.toLowerCase().includes(query);
        const matchesPerson = tx.person_name?.toLowerCase().includes(query) || false;
        const matchesCategory = tx.category_name?.toLowerCase().includes(query) || false;
        const matchesMethod = tx.payment_method?.toLowerCase().includes(query) || false;
        const matchesAmount = String(tx.amount).includes(query);

        if (!matchesRemark && !matchesPerson && !matchesCategory && !matchesMethod && !matchesAmount) {
          return false;
        }
      }

      return true;
    });
  }, [
    enrichedTransactions,
    typeFilter,
    personFilter,
    categoryFilter,
    statusFilter,
    startDate,
    endDate,
    search,
  ]);

  // Handle Export CSV
  const handleExportCSV = () => {
    exportTransactionsToCSV(filteredTransactions, 'zynovix_ledger_transactions');
  };

  const handleResetFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setPersonFilter('all');
    setCategoryFilter('all');
    setStatusFilter('all');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters =
    Boolean(search) ||
    typeFilter !== 'all' ||
    personFilter !== 'all' ||
    categoryFilter !== 'all' ||
    statusFilter !== 'all' ||
    Boolean(startDate) ||
    Boolean(endDate);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-xs font-semibold text-blue-700 mb-2 border border-blue-200">
            <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600" />
            <span>Central Transaction Journal</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            All Transactions
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete history of expenses, borrow, lending, and settlement repayments with instant search.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5"
            title="Export filtered transactions to CSV"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => (onOpenAddModal ? onOpenAddModal() : openAddModal())}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 active:scale-98 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by remark, person name, category, or amount..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Filter Selects Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
          {/* Type Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
            >
              <option value="all">All Types</option>
              <option value="expense">Expense</option>
              <option value="borrow">Borrow</option>
              <option value="lending">Lending</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="partially_settled">Partially Settled</option>
              <option value="settled">Settled</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Person Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Person
            </label>
            <select
              value={personFilter}
              onChange={(e) => setPersonFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
            >
              <option value="all">All People</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
            />
          </div>
        </div>

        {/* Active Filters Bar */}
        {hasActiveFilters && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {filteredTransactions.length} of {enrichedTransactions.length} transactions
            </span>
            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-16 px-4">
            <ArrowLeftRight className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No transactions found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No transactions match your current search or filter criteria. Try adjusting or resetting the filters.
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[11px]">
                <tr>
                  <th className="py-3 px-3.5">Date</th>
                  <th className="py-3 px-3.5">Type</th>
                  <th className="py-3 px-3.5">Person / Category</th>
                  <th className="py-3 px-3.5 text-right">Amount</th>
                  <th className="py-3 px-3.5 text-right">Settled / Paid</th>
                  <th className="py-3 px-3.5 text-right">Pending</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5">Remark (Mandatory)</th>
                  <th className="py-3 px-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredTransactions.map((tx) => {
                  const isBorrow = tx.type === 'borrow';
                  const isLending = tx.type === 'lending';
                  const isExpense = tx.type === 'expense';
                  const pending = tx.pending_amount || 0;

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3.5 font-medium whitespace-nowrap">
                        {tx.transaction_date}
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isExpense
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : isBorrow
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {isExpense && <Receipt className="w-3 h-3" />}
                          {isBorrow && <ArrowDownLeft className="w-3 h-3" />}
                          {isLending && <ArrowUpRight className="w-3 h-3" />}
                          {tx.type}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 font-semibold text-slate-900 whitespace-nowrap">
                        {isExpense ? (
                          <span className="text-slate-700">{tx.category_name || 'Uncategorized'}</span>
                        ) : (
                          <span className="text-blue-700 font-bold">{tx.person_name || 'N/A'}</span>
                        )}
                        {tx.payment_method && (
                          <span className="text-[10px] text-slate-400 block font-normal">
                            {tx.payment_method}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 text-right font-extrabold text-slate-900 whitespace-nowrap">
                        {formatCurrency(tx.amount, currency)}
                      </td>

                      <td className="py-3 px-3.5 text-right text-slate-600 whitespace-nowrap">
                        {isExpense ? '-' : formatCurrency(tx.total_settled || 0, currency)}
                      </td>

                      <td className="py-3 px-3.5 text-right font-bold whitespace-nowrap">
                        {isExpense ? (
                          <span className="text-slate-400">-</span>
                        ) : pending > 0 ? (
                          <span className={isBorrow ? 'text-rose-600' : 'text-teal-600'}>
                            {formatCurrency(pending, currency)}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            tx.status === 'completed'
                              ? 'bg-slate-100 text-slate-700'
                              : tx.status === 'settled'
                              ? 'bg-emerald-100 text-emerald-800'
                              : tx.status === 'partially_settled'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {tx.status?.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 max-w-[220px]">
                        <div className="font-semibold text-slate-900 truncate" title={tx.remark}>
                          {tx.remark}
                        </div>
                        {tx.notes && (
                          <div className="text-[10px] text-slate-400 truncate">{tx.notes}</div>
                        )}
                      </td>

                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {pending > 0 && (
                            <button
                              onClick={() => setSettleTarget(tx)}
                              className="px-2 py-1 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                              title="Settle this transaction"
                            >
                              Settle
                            </button>
                          )}
                          <button
                            onClick={() => setEditTarget(tx)}
                            className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(tx)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Settle Modal */}
      {settleTarget && (
        <SettleModal
          isOpen={Boolean(settleTarget)}
          onClose={() => setSettleTarget(null)}
          transaction={settleTarget}
        />
      )}

      {/* Edit Modal */}
      {editTarget && (
        <EditTransactionModal
          isOpen={Boolean(editTarget)}
          onClose={() => setEditTarget(null)}
          transaction={editTarget}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          isOpen={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          transaction={deleteTarget}
          currency={currency}
          onConfirm={() => deleteTransaction(deleteTarget.id)}
        />
      )}
    </div>
  );
}
