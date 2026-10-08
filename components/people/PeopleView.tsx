'use client';

import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Phone,
  Mail,
  FileText,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  Edit2,
  Trash2,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { useStore } from '@/lib/store-context';
import { Person, PersonSummary } from '@/types';
import { formatCurrency } from '@/lib/constants';
import { PersonDetailModal } from '../modals/PersonDetailModal';

interface PeopleViewProps {
  onOpenAddModal?: (type?: 'borrow' | 'lending') => void;
}

export function PeopleView({ onOpenAddModal }: PeopleViewProps = {}) {
  const {
    people,
    personSummaries,
    addPerson,
    updatePerson,
    deletePerson,
    currency,
    openAddModal,
  } = useStore();

  const [search, setSearch] = useState<string>('');
  const [selectedPerson, setSelectedPerson] = useState<PersonSummary | null>(null);

  // Add / Edit Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);

  const [formName, setFormName] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const openAddPersonModal = () => {
    setEditingPerson(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormNotes('');
    setErrorMsg(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (p: Person) => {
    setEditingPerson(p);
    setFormName(p.name);
    setFormPhone(p.phone || '');
    setFormEmail(p.email || '');
    setFormNotes(p.notes || '');
    setErrorMsg(null);
    setIsAddModalOpen(true);
  };

  const handleSavePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formName.trim()) {
      setErrorMsg('Person name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingPerson) {
        const res = await updatePerson(editingPerson.id, {
          name: formName.trim(),
          phone: formPhone.trim() || null,
          email: formEmail.trim() || null,
          notes: formNotes.trim() || null,
        });
        if (!res.success) {
          setErrorMsg(res.error || 'Failed to update person.');
          setIsSubmitting(false);
          return;
        }
      } else {
        const res = await addPerson({
          name: formName.trim(),
          phone: formPhone.trim() || undefined,
          email: formEmail.trim() || undefined,
          notes: formNotes.trim() || undefined,
        });
        if (!res.success) {
          setErrorMsg(res.error || 'Failed to add person.');
          setIsSubmitting(false);
          return;
        }
      }

      setIsAddModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving person.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      const res = await deletePerson(id);
      if (!res.success) {
        alert(res.error || 'Could not delete person.');
      }
    }
  };

  // Filtered person summaries
  const filteredSummaries = personSummaries.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.person_name.toLowerCase().includes(q) ||
      (p.phone && p.phone.toLowerCase().includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-xs font-semibold text-blue-700 mb-2 border border-blue-200">
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>People Management</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Accounts & Contacts
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage contacts for borrow and lending transactions. View independent ledger positions per person.
          </p>
        </div>

        <button
          onClick={openAddPersonModal}
          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 active:scale-98 transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Add New Person</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by contact name, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-4 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
      </div>

      {/* People Grid */}
      {filteredSummaries.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-6">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No people found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search ? 'No contacts match your search query.' : 'Add your first contact to track borrow and lending.'}
          </p>
          <button
            onClick={openAddPersonModal}
            className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700"
          >
            + Add Person
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSummaries.map((p) => {
            const rawPerson = people.find((item) => item.id === p.person_id);
            const isReceivable = p.status === 'Receivable';
            const isPayable = p.status === 'Payable';

            return (
              <div
                key={p.person_id}
                onClick={() => setSelectedPerson(p)}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors flex items-center justify-center font-bold text-base shadow-xs">
                        {p.person_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-base leading-tight">
                          {p.person_name}
                        </h3>
                        <span
                          className={`mt-1 inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isReceivable
                              ? 'bg-emerald-100 text-emerald-800'
                              : isPayable
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-1 opacity-80 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {rawPerson && (
                        <button
                          onClick={() => openEditModal(rawPerson)}
                          className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100"
                          title="Edit Contact"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(p.person_id, p.person_name)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                        title="Delete Contact"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="mt-3.5 space-y-1 text-xs text-slate-500">
                    {p.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{p.phone}</span>
                      </div>
                    )}
                    {p.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{p.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Financial Metrics */}
                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-amber-50/50 rounded-xl">
                      <span className="text-[10px] text-amber-800 font-semibold block">I Owe:</span>
                      <span className="font-bold text-slate-900 mt-0.5 block">
                        {formatCurrency(p.i_owe, currency)}
                      </span>
                    </div>

                    <div className="p-2 bg-emerald-50/50 rounded-xl">
                      <span className="text-[10px] text-emerald-800 font-semibold block">They Owe Me:</span>
                      <span className="font-bold text-slate-900 mt-0.5 block">
                        {formatCurrency(p.they_owe_me, currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Net Balance */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Net Position:</span>
                    <span
                      className={`font-extrabold text-sm ${
                        p.net_position > 0
                          ? 'text-emerald-700'
                          : p.net_position < 0
                          ? 'text-rose-700'
                          : 'text-slate-700'
                      }`}
                    >
                      {p.net_position > 0 ? '+' : ''}
                      {formatCurrency(p.net_position, currency)}
                    </span>
                  </div>

                  <span className="text-xs font-semibold text-blue-600 group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                    View History <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Person Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-base font-bold text-slate-900">
                {editingPerson ? 'Edit Contact' : 'Add New Person'}
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePerson} className="p-6 space-y-3.5 text-xs">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="rahul@example.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Roommate, colleague, gym buddy..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all"
                >
                  {isSubmitting ? 'Saving...' : editingPerson ? 'Update Contact' : 'Create Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
    </div>
  );
}
