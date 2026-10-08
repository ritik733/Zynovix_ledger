'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Plus,
  UserPlus,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useStore } from '@/lib/store-context';
import { PAYMENT_METHODS } from '@/lib/constants';
import { format } from 'date-fns';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'expense' | 'borrow' | 'lending' | 'repayment';
  initialPersonId?: string;
  initialTransactionId?: string;
}

export function AddTransactionModal({
  isOpen,
  onClose,
  initialType = 'expense',
  initialPersonId,
  initialTransactionId,
}: AddTransactionModalProps) {
  const {
    categories,
    people,
    enrichedTransactions,
    currency,
    addTransaction,
    addSettlement,
    addPerson,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'expense' | 'borrow' | 'lending' | 'repayment'>(
    initialType
  );

  // Form State
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [personId, setPersonId] = useState<string>(initialPersonId || '');
  const [paymentMethod, setPaymentMethod] = useState<string>('UPI (Google Pay / PhonePe / Paytm)');
  const [remark, setRemark] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Repayment target transaction
  const [selectedTxId, setSelectedTxId] = useState<string>(initialTransactionId || '');

  // Quick add person inline modal/toggle
  const [isQuickAddingPerson, setIsQuickAddingPerson] = useState<boolean>(false);
  const [newPersonName, setNewPersonName] = useState<string>('');
  const [newPersonPhone, setNewPersonPhone] = useState<string>('');

  // Validation & feedback state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync props when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialType);
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setAmount('');
      setRemark('');
      setNotes('');
      setErrorMsg(null);
      setIsQuickAddingPerson(false);

      if (initialPersonId) {
        setPersonId(initialPersonId);
      } else if (people.length > 0 && !personId) {
        setPersonId(people[0].id);
      }

      if (initialTransactionId) {
        setSelectedTxId(initialTransactionId);
        const target = enrichedTransactions.find((t) => t.id === initialTransactionId);
        if (target) {
          setAmount(String(target.pending_amount || ''));
          if (target.person_id) setPersonId(target.person_id);
        }
      }

      if (categories.length > 0 && !categoryId) {
        setCategoryId(categories[0].id);
      }
    }
  }, [isOpen, initialType, initialPersonId, initialTransactionId]);

  if (!isOpen) return null;

  // Filter pending transactions for Repayment tab
  const pendingTransactionsForPerson = enrichedTransactions.filter(
    (t) =>
      (t.type === 'borrow' || t.type === 'lending') &&
      (t.pending_amount || 0) > 0 &&
      (!personId || t.person_id === personId)
  );

  const selectedTransaction = enrichedTransactions.find((t) => t.id === selectedTxId);

  // Handle Quick Add Person
  const handleQuickAddPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonName.trim()) {
      setErrorMsg('Person name cannot be empty.');
      return;
    }

    const res = await addPerson({
      name: newPersonName.trim(),
      phone: newPersonPhone.trim() || undefined,
    });

    if (res.success && res.person) {
      setPersonId(res.person.id);
      setIsQuickAddingPerson(false);
      setNewPersonName('');
      setNewPersonPhone('');
      setErrorMsg(null);
    } else {
      setErrorMsg(res.error || 'Failed to add person.');
    }
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid amount greater than 0.');
      return;
    }

    // MANDATORY REMARK VALIDATION
    if (!remark || remark.trim().length === 0) {
      setErrorMsg('Remark is mandatory for all transactions. Please enter a remark.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (activeTab === 'expense') {
        const res = await addTransaction({
          type: 'expense',
          amount: parsedAmount,
          transaction_date: date,
          category_id: categoryId || (categories[0]?.id ?? null),
          payment_method: paymentMethod,
          remark: remark.trim(),
          notes: notes.trim() || null,
        });

        if (!res.success) {
          setErrorMsg(res.error || 'Failed to add expense.');
          setIsSubmitting(false);
          return;
        }
      } else if (activeTab === 'borrow' || activeTab === 'lending') {
        if (!personId) {
          setErrorMsg(`Please select or add a person for ${activeTab === 'borrow' ? 'Borrowing' : 'Lending'}.`);
          setIsSubmitting(false);
          return;
        }

        const res = await addTransaction({
          type: activeTab,
          amount: parsedAmount,
          transaction_date: date,
          person_id: personId,
          payment_method: paymentMethod,
          remark: remark.trim(),
          notes: notes.trim() || null,
        });

        if (!res.success) {
          setErrorMsg(res.error || `Failed to record ${activeTab}.`);
          setIsSubmitting(false);
          return;
        }
      } else if (activeTab === 'repayment') {
        if (!selectedTxId) {
          setErrorMsg('Please select which pending transaction is being settled/repaid.');
          setIsSubmitting(false);
          return;
        }

        const res = await addSettlement({
          transaction_id: selectedTxId,
          amount: parsedAmount,
          settlement_date: date,
          payment_method: paymentMethod,
          remark: remark.trim(),
        });

        if (!res.success) {
          setErrorMsg(res.error || 'Failed to record repayment.');
          setIsSubmitting(false);
          return;
        }
      }

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              +
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">Add Transaction</h2>
              <p className="text-xs text-slate-500">Record a new expense, borrow, lending, or settlement</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-100">
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100/80 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('expense');
                setErrorMsg(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg transition-all ${
                activeTab === 'expense'
                  ? 'bg-white text-rose-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Expense</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('borrow');
                setErrorMsg(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg transition-all ${
                activeTab === 'borrow'
                  ? 'bg-white text-amber-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Borrow</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('lending');
                setErrorMsg(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg transition-all ${
                activeTab === 'lending'
                  ? 'bg-white text-emerald-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Lending</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('repayment');
                setErrorMsg(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg transition-all ${
                activeTab === 'repayment'
                  ? 'bg-white text-indigo-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Settle</span>
            </button>
          </div>

          {/* Context Explainer Banner */}
          <div className="mt-2.5 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between">
            {activeTab === 'expense' && (
              <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                💸 Outgoing personal expense (spent money)
              </span>
            )}
            {activeTab === 'borrow' && (
              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                📥 Borrowed money (I received money, I owe them)
              </span>
            )}
            {activeTab === 'lending' && (
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                📤 Lent money (I gave money, they owe me)
              </span>
            )}
            {activeTab === 'repayment' && (
              <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                🤝 Settle/Repay an existing pending borrow or lending transaction
              </span>
            )}
          </div>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="px-6 py-4 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Amount and Date (Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Amount ({currency}) <span className="text-rose-500">*</span>
              </label>
              <div className="relative rounded-xl shadow-xs">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold text-base pointer-events-none">
                  {currency}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative rounded-xl shadow-xs">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <Calendar className="w-4 h-4" />
                </span>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Tab Specific Fields */}
          {activeTab === 'expense' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(activeTab === 'borrow' || activeTab === 'lending') && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Person <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsQuickAddingPerson(!isQuickAddingPerson)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isQuickAddingPerson ? 'Select Existing' : '+ New Person'}</span>
                </button>
              </div>

              {isQuickAddingPerson ? (
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
                  <div className="text-xs font-semibold text-blue-900">Add New Person</div>
                  <input
                    type="text"
                    placeholder="Full Name (e.g. Rahul Sharma)"
                    value={newPersonName}
                    onChange={(e) => setNewPersonName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Phone number (optional)"
                    value={newPersonPhone}
                    onChange={(e) => setNewPersonPhone(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-sm"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsQuickAddingPerson(false)}
                      className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleQuickAddPerson}
                      className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
                    >
                      Save Person
                    </button>
                  </div>
                </div>
              ) : (
                <select
                  value={personId}
                  onChange={(e) => setPersonId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  required
                >
                  <option value="">-- Choose a Person --</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.phone ? `(${p.phone})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {activeTab === 'repayment' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Filter by Person (Optional)
                </label>
                <select
                  value={personId}
                  onChange={(e) => {
                    setPersonId(e.target.value);
                    setSelectedTxId('');
                  }}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium"
                >
                  <option value="">-- All People with Pending Amounts --</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Transaction to Settle <span className="text-rose-500">*</span>
                </label>
                {pendingTransactionsForPerson.length === 0 ? (
                  <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-600">
                    No pending transactions found for this selection.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {pendingTransactionsForPerson.map((t) => {
                      const isSelected = selectedTxId === t.id;
                      const isBorrow = t.type === 'borrow';
                      return (
                        <div
                          key={t.id}
                          onClick={() => {
                            setSelectedTxId(t.id);
                            setAmount(String(t.pending_amount));
                            if (t.person_id) setPersonId(t.person_id);
                          }}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-500'
                              : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                          }`}
                        >
                          <div className="flex items-center justify-between font-semibold">
                            <span className="flex items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                  isBorrow ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {isBorrow ? 'I Borrowed' : 'I Lent'}
                              </span>
                              <span className="text-slate-900 font-bold">{t.person_name}</span>
                            </span>
                            <span className="text-slate-900 font-bold">
                              Pending: {currency}
                              {t.pending_amount?.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-slate-500">
                            <span className="truncate max-w-[200px]">"{t.remark}"</span>
                            <span>
                              Original: {currency}
                              {t.amount.toLocaleString('en-IN')} • {t.transaction_date}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedTransaction && (
                <div className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between text-xs">
                  <span className="text-indigo-900">
                    Max remaining pending: <strong>{currency}{selectedTransaction.pending_amount?.toLocaleString('en-IN')}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setAmount(String(selectedTransaction.pending_amount))}
                    className="text-indigo-700 font-semibold underline hover:text-indigo-900"
                  >
                    Full Settle
                  </button>
                </div>
              )}
            </div>
          )}

          {/* MANDATORY REMARK FIELD */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Remark <span className="text-rose-500 font-bold">* MANDATORY</span>
              </label>
              <span className="text-[11px] text-slate-500">Required for financial ledger records</span>
            </div>
            <input
              type="text"
              required
              placeholder="e.g. Grocery items, Rahul dinner split, Taxi fare..."
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Payment Method (Optional)
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>

          {/* Optional Notes */}
          {activeTab !== 'repayment' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Additional Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Any extra context or memo..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          )}

          {/* Form Actions Footer */}
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
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition-all active:scale-98 ${
                activeTab === 'expense'
                  ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 shadow-rose-600/25'
                  : activeTab === 'borrow'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-600/25'
                  : activeTab === 'lending'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-600/25'
                  : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-indigo-600/25'
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">Saving...</span>
              ) : activeTab === 'expense' ? (
                'Save Expense'
              ) : activeTab === 'borrow' ? (
                'Record Borrowing'
              ) : activeTab === 'lending' ? (
                'Record Lending'
              ) : (
                'Record Settlement'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
