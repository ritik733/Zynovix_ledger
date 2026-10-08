'use client';

import React, { useState } from 'react';
import {
  Settings,
  Database,
  CloudCheck,
  FolderPlus,
  RotateCcw,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  Info,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useStore } from '@/lib/store-context';

export function SettingsView() {
  const {
    isSupabaseConfigured,
    isSupabaseConnected,
    currentUser,
    currency,
    setCurrency,
    categories,
    addCategory,
    loadSeedScenarios,
    resetAllData,
    exportDataToJSON,
    importDataFromJSON,
  } = useStore();

  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3B82F6');
  const [catMsg, setCatMsg] = useState<string | null>(null);

  const [importJsonText, setImportJsonText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const res = await addCategory({
      name: newCatName.trim(),
      color: newCatColor,
    });

    if (res.success) {
      setNewCatName('');
      setCatMsg('Category added successfully!');
      setTimeout(() => setCatMsg(null), 3000);
    } else {
      setCatMsg(res.error || 'Failed to add category.');
    }
  };

  const handleExportJSON = () => {
    const jsonStr = exportDataToJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zynovix_ledger_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = () => {
    if (!importJsonText.trim()) return;
    const ok = importDataFromJSON(importJsonText.trim());
    if (ok) {
      setImportStatus('Backup restored successfully!');
      setImportJsonText('');
      setTimeout(() => setImportStatus(null), 3000);
    } else {
      setImportStatus('Invalid JSON backup format.');
    }
  };

  const handleReset = () => {
    if (
      confirm(
        'WARNING: This will clear all transactions, people, and custom categories from your local ledger. Are you sure?'
      )
    ) {
      resetAllData();
      alert('Ledger data reset.');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-150 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-700 mb-2 border border-slate-200">
          <Settings className="w-3.5 h-3.5 text-slate-600" />
          <span>System & Ledger Settings</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Application Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure currency symbol, manage expense categories, inspect Supabase connection, and test scenarios.
        </p>
      </div>

      {/* Supabase Connection Status Card */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Database & Supabase Connection</h2>
              <p className="text-xs text-slate-500">
                Production-ready connection and Row Level Security (RLS)
              </p>
            </div>
          </div>

          <div>
            {isSupabaseConnected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Supabase Connected
              </span>
            ) : isSupabaseConfigured ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                Configured (Awaiting Sign-in)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                Local Demo Mode Active
              </span>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl text-xs space-y-2 border border-slate-200/80">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Row Level Security (RLS) & Vercel Environment Variables</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            The database schema migration is located in{' '}
            <code className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono text-[11px]">
              supabase/migrations/20261008000000_init_ledger.sql
            </code>
            . In Vercel, Supabase credentials are read automatically from{' '}
            <code className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono text-[11px]">
              NEXT_PUBLIC_SUPABASE_URL
            </code>{' '}
            and{' '}
            <code className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono text-[11px]">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>
            .
          </p>
        </div>
      </section>

      {/* Test Scenarios 1 to 6 One-Click Loader */}
      <section className="bg-gradient-to-r from-blue-50/80 to-indigo-50/70 rounded-2xl border border-blue-200 p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                1-Click Verification Test Scenarios (Rahul, Amit, Neha)
              </h2>
              <p className="text-xs text-slate-600">
                Populate all 6 business scenarios required in Section 28 for instant demonstration.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              loadSeedScenarios();
              alert('Successfully loaded Scenarios 1 through 6 (Rahul, Amit, Neha, Vikram)!');
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/25 active:scale-98 transition-all"
          >
            Load Test Scenarios
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2 text-[11px] text-slate-700">
          <div className="p-2 bg-white/80 rounded-lg border border-blue-100">
            <strong>Scenario 1 & 4 (Rahul):</strong> Borrow ₹10,000, Repaid ₹4,000 → Pending ₹6,000.
          </div>
          <div className="p-2 bg-white/80 rounded-lg border border-blue-100">
            <strong>Scenario 3 (Simultaneous):</strong> Rahul borrow ₹10k & lent ₹3k kept independent!
          </div>
          <div className="p-2 bg-white/80 rounded-lg border border-blue-100">
            <strong>Scenario 2 & 5 (Amit):</strong> Lent ₹5,000, Received ₹2,000 → Pending ₹3,000.
          </div>
          <div className="p-2 bg-white/80 rounded-lg border border-blue-100">
            <strong>Scenario 6 (Ageing 90+ days):</strong> Neha lent ₹10,000 95 days ago → 90+ days bucket.
          </div>
          <div className="p-2 bg-white/80 rounded-lg border border-blue-100">
            <strong>Expense Analytics:</strong> Multi-period expenses with comparative trends & insights.
          </div>
          <div className="p-2 bg-white/80 rounded-lg border border-blue-100">
            <strong>Mandatory Remark:</strong> Strict validation enforced everywhere.
          </div>
        </div>
      </section>

      {/* Preferences Section */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
          Currency Preferences
        </h2>

        <div className="flex items-center gap-4 text-xs">
          <label className="font-semibold text-slate-700">Display Currency Symbol:</label>
          <div className="flex items-center gap-2">
            {['₹', '$', '€', '£', 'AED'].map((sym) => (
              <button
                key={sym}
                onClick={() => setCurrency(sym)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  currency === sym
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Expense Categories Management */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Manage Expense Categories</h2>
            <p className="text-xs text-slate-500">
              Configurable expense categories for classification and reports
            </p>
          </div>
          <span className="text-xs text-slate-500">{categories.length} categories active</span>
        </div>

        {/* Existing Categories Chips */}
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-800"
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: c.color || '#3B82F6' }}
              />
              <span>{c.name}</span>
            </span>
          ))}
        </div>

        {/* Add Category Form */}
        <form onSubmit={handleAddCategory} className="pt-2 flex items-center gap-3 text-xs">
          <input
            type="text"
            placeholder="New Category Name..."
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 flex-1"
          />
          <input
            type="color"
            value={newCatColor}
            onChange={(e) => setNewCatColor(e.target.value)}
            className="w-10 h-9 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-white"
            title="Pick category color"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            + Add
          </button>
        </form>
        {catMsg && <div className="text-xs text-emerald-600 font-semibold">{catMsg}</div>}
      </section>

      {/* Backup, Restore & Danger Zone */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
          Backup, Export & Maintenance
        </h2>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportJSON}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Full JSON Backup</span>
          </button>

          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset All Ledger Data</span>
          </button>
        </div>

        {/* Restore JSON input */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <label className="block text-xs font-semibold text-slate-700">
            Restore from JSON Backup:
          </label>
          <div className="flex gap-2">
            <textarea
              rows={2}
              placeholder="Paste exported JSON content here..."
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
            />
            <button
              onClick={handleImportJSON}
              className="px-4 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-xl hover:bg-slate-900 self-end"
            >
              Restore
            </button>
          </div>
          {importStatus && (
            <div className="text-xs font-semibold text-indigo-600">{importStatus}</div>
          )}
        </div>
      </section>
    </div>
  );
}
