'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Receipt,
  TrendingUp,
  TrendingDown,
  Calendar,
  Sparkles,
  Award,
  CreditCard,
  PieChart as PieChartIcon,
  BarChart3,
  Flame,
  ArrowRight,
  Plus,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import { useStore } from '@/lib/store-context';
import { calculateExpenseAnalytics } from '@/lib/financial-logic';
import { ExpensePeriod } from '@/types';
import { formatCurrency } from '@/lib/constants';

interface ExpenseDashboardProps {
  onOpenAddModal?: () => void;
}

const PERIODS: { label: string; value: ExpensePeriod }[] = [
  { label: 'This Week', value: 'this-week' },
  { label: 'Last Week', value: 'last-week' },
  { label: 'This Month', value: 'this-month' },
  { label: 'Last Month', value: 'last-month' },
  { label: 'This Quarter', value: 'this-quarter' },
  { label: 'Last Quarter', value: 'last-quarter' },
  { label: 'This Year', value: 'this-year' },
  { label: 'Custom', value: 'custom' },
];

const CHART_COLORS = [
  '#F59E0B',
  '#3B82F6',
  '#EC4899',
  '#8B5CF6',
  '#10B981',
  '#EF4444',
  '#6366F1',
  '#14B8A6',
  '#F97316',
  '#06B6D4',
  '#84CC16',
  '#64748B',
];

export function ExpenseDashboard({ onOpenAddModal }: ExpenseDashboardProps = {}) {
  const { enrichedTransactions, categories, currency, openAddModal } = useStore();

  const [selectedPeriod, setSelectedPeriod] = useState<ExpensePeriod>('this-month');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  const analytics = useMemo(() => {
    return calculateExpenseAnalytics(
      enrichedTransactions,
      categories,
      selectedPeriod,
      customStart || undefined,
      customEnd || undefined,
      currentDate || undefined
    );
  }, [enrichedTransactions, categories, selectedPeriod, customStart, customEnd, currentDate]);

  const {
    totalExpense,
    averageDailyExpense,
    highestExpense,
    highestExpenseItem,
    transactionCount,
    topCategory,
    previousPeriodExpense,
    percentageChange,
    categoryBreakdown,
    dailyTrend,
    topExpenses,
    insights,
  } = analytics;

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Top Header & Date Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-xs font-semibold text-rose-700 mb-2 border border-rose-200">
            <Receipt className="w-3.5 h-3.5 text-rose-600" />
            <span>Dedicated Expense Tracker</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Expense Dashboard & Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Analyze daily expenses, spending patterns by category, and compare against previous periods.
          </p>
        </div>

        <button
          onClick={() => (onOpenAddModal ? onOpenAddModal() : openAddModal('expense'))}
          className="self-start md:self-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/25 active:scale-98 transition-all flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Add Expense</span>
        </button>
      </div>

      {/* Period Filter Tabs */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {PERIODS.map((p) => {
            const isSelected = selectedPeriod === p.value;
            return (
              <button
                key={p.value}
                onClick={() => setSelectedPeriod(p.value)}
                className={`px-3 py-2 rounded-xl font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-rose-600 text-white shadow-xs shadow-rose-600/20'
                    : 'bg-slate-100/70 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Custom date range inputs */}
        {selectedPeriod === 'custom' && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
            <span className="font-bold text-slate-700">Custom Range:</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Expense */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
              Total Expense
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatCurrency(totalExpense, currency)}
            </span>
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              {previousPeriodExpense > 0 ? (
                <>
                  <span
                    className={`inline-flex items-center font-bold px-1.5 py-0.5 rounded ${
                      percentageChange > 0
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {percentageChange > 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {percentageChange > 0 ? `+${percentageChange}%` : `${percentageChange}%`}
                  </span>
                  <span className="text-slate-500">vs prev: {formatCurrency(previousPeriodExpense, currency)}</span>
                </>
              ) : (
                <span className="text-slate-400">No previous period data</span>
              )}
            </div>
          </div>
        </div>

        {/* Average Daily Expense */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Average Daily
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatCurrency(averageDailyExpense, currency)}
            </span>
            <p className="text-xs text-slate-500 mt-1">Average spent per day in this period</p>
          </div>
        </div>

        {/* Highest Expense */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Highest Expense
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatCurrency(highestExpense, currency)}
            </span>
            <p className="text-xs text-slate-600 truncate mt-1">
              {highestExpenseItem ? (
                <>
                  <span className="font-semibold text-slate-900">{highestExpenseItem.remark}</span> (
                  {highestExpenseItem.category_name})
                </>
              ) : (
                'No expenses logged'
              )}
            </p>
          </div>
        </div>

        {/* Transactions & Top Category */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
              Top Category
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {topCategory ? topCategory.name : 'N/A'}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              {topCategory ? (
                <>
                  {formatCurrency(topCategory.amount, currency)} ({topCategory.percentage}% of total)
                </>
              ) : (
                `${transactionCount} transactions recorded`
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown (Donut Chart) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-rose-600" />
              <span>Category Breakdown</span>
            </h3>
            <span className="text-xs text-slate-500">{categoryBreakdown.length} Categories</span>
          </div>

          {categoryBreakdown.length === 0 ? (
            <div className="text-center py-16 text-xs text-slate-400">
              No expenses recorded for this period.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4 flex-1">
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {categoryBreakdown.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`${currency}${Number(val).toLocaleString('en-IN')}`, 'Amount']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend List */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {categoryBreakdown.map((cat, idx) => (
                  <div key={cat.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 truncate max-w-[130px]">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color || CHART_COLORS[idx % CHART_COLORS.length] }}
                      />
                      <span className="font-semibold text-slate-800 truncate">{cat.name}</span>
                    </span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(cat.amount, currency)} ({cat.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Expense Trend (Daily Chart) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Expense Trend Over Time</span>
            </h3>
            <span className="text-xs text-slate-500">Daily spending</span>
          </div>

          {dailyTrend.length === 0 ? (
            <div className="text-center py-16 text-xs text-slate-400">
              No trend data available for this period.
            </div>
          ) : (
            <div className="h-60 w-full flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrend}>
                  <defs>
                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#94A3B8" />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    stroke="#94A3B8"
                    tickFormatter={(val) => `${currency}${val}`}
                  />
                  <Tooltip
                    formatter={(val: any) => [`${currency}${Number(val).toLocaleString('en-IN')}`, 'Spent']}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#EF4444"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#expenseGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Category Comparison (Bar Chart) & Top Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Comparison Bar Chart */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span>Category Spending Comparison</span>
            </h3>
          </div>

          {categoryBreakdown.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">
              No data for category comparison.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryBreakdown.slice(0, 6)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94A3B8" />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    stroke="#94A3B8"
                    tickFormatter={(val) => `${currency}${val}`}
                  />
                  <Tooltip
                    formatter={(val: any) => [`${currency}${Number(val).toLocaleString('en-IN')}`, 'Spent']}
                  />
                  <Bar dataKey="amount" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top Expenses List */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Top Expenses in Period</span>
            </h3>
            <span className="text-xs text-slate-500">Largest transactions</span>
          </div>

          {topExpenses.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">
              No expenses in this period.
            </div>
          ) : (
            <div className="space-y-2.5 flex-1 overflow-y-auto">
              {topExpenses.map((exp, index) => (
                <div
                  key={exp.id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-100/70 transition-colors flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[11px]">
                      {index + 1}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block">{exp.remark}</span>
                      <span className="text-[11px] text-slate-500">
                        {exp.category_name} • {exp.transaction_date}
                      </span>
                    </div>
                  </div>
                  <span className="font-extrabold text-sm text-slate-900">
                    {formatCurrency(exp.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Automatic Smart Insights (Section 15) */}
      <section className="bg-gradient-to-r from-blue-50/70 via-indigo-50/60 to-purple-50/70 rounded-3xl p-6 border border-blue-200/70 shadow-xs">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Automatic Spending Insights
            </h3>
            <p className="text-xs text-slate-600">Calculated dynamically from real transactions data</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className="p-3.5 bg-white/80 backdrop-blur-sm rounded-xl border border-blue-100/80 shadow-xs text-xs font-medium text-slate-800 flex items-start gap-2.5"
            >
              <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
              <span className="leading-relaxed">{insight}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
