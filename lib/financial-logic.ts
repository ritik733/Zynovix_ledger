import {
  differenceInDays,
  parseISO,
  startOfWeek,
  endOfWeek,
  subWeeks,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfQuarter,
  endOfQuarter,
  subQuarters,
  startOfYear,
  endOfYear,
  isWithinInterval,
  format,
} from 'date-fns';
import {
  Transaction,
  Settlement,
  Person,
  PersonSummary,
  AgeingAnalysis,
  AgeingBucket,
  AgeingItem,
  AccountBalanceSummary,
  ExpenseAnalytics,
  ExpensePeriod,
  Category,
} from '@/types';

export function getDaysOutstanding(transactionDateStr: string, asOfDate?: Date): number {
  try {
    const txDate = parseISO(transactionDateStr);
    const today = asOfDate || (typeof window !== 'undefined' ? new Date() : new Date('2026-10-08T00:00:00Z'));
    // Normalize to date comparison
    const days = differenceInDays(today, txDate);
    return Math.max(0, days);
  } catch {
    return 0;
  }
}

export function getAgeingBucket(days: number): AgeingBucket {
  if (days <= 7) return '0-7 days';
  if (days <= 30) return '8-30 days';
  if (days <= 60) return '31-60 days';
  if (days <= 90) return '61-90 days';
  return '90+ days';
}

export const AGEING_BUCKETS: AgeingBucket[] = [
  '0-7 days',
  '8-30 days',
  '31-60 days',
  '61-90 days',
  '90+ days',
];

/**
 * Enriches transactions with their settlements, pending balance, and ageing
 */
export function enrichTransactions(
  transactions: Transaction[],
  settlements: Settlement[],
  people: Person[],
  categories: Category[],
  asOfDate?: Date
): Transaction[] {
  const peopleMap = new Map(people.map((p) => [p.id, p.name]));
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  return transactions
    .filter((t) => !t.is_deleted)
    .map((t) => {
      const txSettlements = settlements.filter(
        (s) => s.transaction_id === t.id && !s.is_deleted
      );
      const totalSettled = txSettlements.reduce((sum, s) => sum + Number(s.amount), 0);
      const days = getDaysOutstanding(t.transaction_date, asOfDate);

      let pendingAmount = 0;
      let status: Transaction['status'] = 'completed';

      if (t.type === 'expense') {
        pendingAmount = 0;
        status = 'completed';
      } else {
        pendingAmount = Math.max(0, Number(t.amount) - totalSettled);
        if (pendingAmount <= 0) {
          status = 'settled';
        } else if (totalSettled > 0) {
          status = 'partially_settled';
        } else {
          status = 'pending';
        }
      }

      return {
        ...t,
        amount: Number(t.amount),
        person_name: t.person_id ? peopleMap.get(t.person_id) || 'Unknown' : null,
        category_name: t.category_id ? categoryMap.get(t.category_id) || 'Uncategorized' : null,
        total_settled: totalSettled,
        pending_amount: pendingAmount,
        status,
        days_outstanding: days,
        ageing_bucket: getAgeingBucket(days),
        settlements: txSettlements,
      };
    });
}

/**
 * Computes person-wise summaries without merging borrow and lending
 */
export function calculatePersonSummaries(
  people: Person[],
  enrichedTransactions: Transaction[]
): PersonSummary[] {
  return people.map((person) => {
    const personTxs = enrichedTransactions.filter((t) => t.person_id === person.id);

    const borrowTxs = personTxs.filter((t) => t.type === 'borrow');
    const lendingTxs = personTxs.filter((t) => t.type === 'lending');

    const total_borrowed = borrowTxs.reduce((sum, t) => sum + t.amount, 0);
    const total_borrowed_settled = borrowTxs.reduce((sum, t) => sum + (t.total_settled || 0), 0);
    const i_owe = borrowTxs.reduce((sum, t) => sum + (t.pending_amount || 0), 0);

    const total_lent = lendingTxs.reduce((sum, t) => sum + t.amount, 0);
    const total_lent_settled = lendingTxs.reduce((sum, t) => sum + (t.total_settled || 0), 0);
    const they_owe_me = lendingTxs.reduce((sum, t) => sum + (t.pending_amount || 0), 0);

    const pendingTxs = personTxs.filter((t) => (t.pending_amount || 0) > 0);

    let oldest_pending_days = 0;
    let oldest_pending_date: string | null = null;
    let avg_outstanding_days = 0;

    if (pendingTxs.length > 0) {
      const sortedByDate = [...pendingTxs].sort(
        (a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
      );
      oldest_pending_date = sortedByDate[0].transaction_date;
      oldest_pending_days = sortedByDate[0].days_outstanding || 0;

      const totalDays = pendingTxs.reduce((acc, cur) => acc + (cur.days_outstanding || 0), 0);
      avg_outstanding_days = Math.round((totalDays / pendingTxs.length) * 10) / 10;
    }

    const net_position = they_owe_me - i_owe;

    let status: PersonSummary['status'] = 'Settled';
    if (net_position > 0) {
      status = 'Receivable';
    } else if (net_position < 0) {
      status = 'Payable';
    } else if (i_owe > 0 || they_owe_me > 0) {
      status = 'Balanced';
    } else {
      status = 'Settled';
    }

    return {
      person_id: person.id,
      user_id: person.user_id,
      person_name: person.name,
      phone: person.phone,
      email: person.email,
      notes: person.notes,
      created_at: person.created_at,
      total_borrowed,
      total_borrowed_settled,
      i_owe,
      total_lent,
      total_lent_settled,
      they_owe_me,
      net_position,
      oldest_pending_days,
      oldest_pending_date,
      avg_outstanding_days,
      active_transactions_count: pendingTxs.length,
      status,
    };
  });
}

/**
 * Calculates Ageing Analysis breakdown for Pending Borrow and Lending
 */
export function calculateAgeingAnalysis(enrichedTransactions: Transaction[]): AgeingAnalysis {
  const pendingTxs = enrichedTransactions.filter((t) => (t.pending_amount || 0) > 0);

  const initBuckets = (): Record<AgeingBucket, { count: number; amount: number }> => ({
    '0-7 days': { count: 0, amount: 0 },
    '8-30 days': { count: 0, amount: 0 },
    '31-60 days': { count: 0, amount: 0 },
    '61-90 days': { count: 0, amount: 0 },
    '90+ days': { count: 0, amount: 0 },
  });

  const lendingBuckets = initBuckets();
  const borrowingBuckets = initBuckets();

  let totalLendingPending = 0;
  let totalBorrowingPending = 0;

  pendingTxs.forEach((t) => {
    const bucket = t.ageing_bucket || getAgeingBucket(t.days_outstanding || 0);
    const pending = t.pending_amount || 0;

    if (t.type === 'lending') {
      lendingBuckets[bucket].count += 1;
      lendingBuckets[bucket].amount += pending;
      totalLendingPending += pending;
    } else if (t.type === 'borrow') {
      borrowingBuckets[bucket].count += 1;
      borrowingBuckets[bucket].amount += pending;
      totalBorrowingPending += pending;
    }
  });

  const lending: AgeingItem[] = AGEING_BUCKETS.map((b) => ({
    bucket: b,
    count: lendingBuckets[b].count,
    amount: lendingBuckets[b].amount,
  }));

  const borrowing: AgeingItem[] = AGEING_BUCKETS.map((b) => ({
    bucket: b,
    count: borrowingBuckets[b].count,
    amount: borrowingBuckets[b].amount,
  }));

  return {
    lending,
    borrowing,
    totalLendingPending,
    totalBorrowingPending,
  };
}

/**
 * Calculates Account Balance Overview metrics
 */
export function calculateAccountBalanceSummary(
  personSummaries: PersonSummary[],
  enrichedTransactions: Transaction[]
): AccountBalanceSummary {
  let totalBorrowed = 0;
  let totalLent = 0;
  let netReceivable = 0;
  let netPayable = 0;

  personSummaries.forEach((p) => {
    totalBorrowed += p.i_owe;
    totalLent += p.they_owe_me;
    if (p.net_position > 0) {
      netReceivable += p.net_position;
    } else if (p.net_position < 0) {
      netPayable += Math.abs(p.net_position);
    }
  });

  const totalOriginalBorrowed = enrichedTransactions
    .filter((t) => t.type === 'borrow')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOriginalLent = enrichedTransactions
    .filter((t) => t.type === 'lending')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSettledRepayments = enrichedTransactions
    .filter((t) => t.type !== 'expense')
    .reduce((sum, t) => sum + (t.total_settled || 0), 0);

  const totalExpensesAllTime = enrichedTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    totalBorrowed,
    totalLent,
    netReceivable,
    netPayable,
    netPosition: totalLent - totalBorrowed,
    totalOriginalBorrowed,
    totalOriginalLent,
    totalSettledRepayments,
    totalExpensesAllTime,
  };
}

/**
 * Date range calculation for Expense Dashboard periods
 */
export function getDateRangeForPeriod(
  period: ExpensePeriod,
  customStart?: string,
  customEnd?: string,
  referenceDate?: Date
): { current: { start: Date; end: Date }; previous: { start: Date; end: Date } } {
  const now = referenceDate || (typeof window !== 'undefined' ? new Date() : new Date('2026-10-08T00:00:00Z'));

  switch (period) {
    case 'this-week': {
      const curStart = startOfWeek(now, { weekStartsOn: 1 });
      const curEnd = endOfWeek(now, { weekStartsOn: 1 });
      const prevWeekDate = subWeeks(now, 1);
      const prevStart = startOfWeek(prevWeekDate, { weekStartsOn: 1 });
      const prevEnd = endOfWeek(prevWeekDate, { weekStartsOn: 1 });
      return { current: { start: curStart, end: curEnd }, previous: { start: prevStart, end: prevEnd } };
    }
    case 'last-week': {
      const lastWeekDate = subWeeks(now, 1);
      const curStart = startOfWeek(lastWeekDate, { weekStartsOn: 1 });
      const curEnd = endOfWeek(lastWeekDate, { weekStartsOn: 1 });
      const twoWeeksAgo = subWeeks(now, 2);
      const prevStart = startOfWeek(twoWeeksAgo, { weekStartsOn: 1 });
      const prevEnd = endOfWeek(twoWeeksAgo, { weekStartsOn: 1 });
      return { current: { start: curStart, end: curEnd }, previous: { start: prevStart, end: prevEnd } };
    }
    case 'this-month': {
      const curStart = startOfMonth(now);
      const curEnd = endOfMonth(now);
      const lastMonthDate = subMonths(now, 1);
      const prevStart = startOfMonth(lastMonthDate);
      const prevEnd = endOfMonth(lastMonthDate);
      return { current: { start: curStart, end: curEnd }, previous: { start: prevStart, end: prevEnd } };
    }
    case 'last-month': {
      const lastMonthDate = subMonths(now, 1);
      const curStart = startOfMonth(lastMonthDate);
      const curEnd = endOfMonth(lastMonthDate);
      const twoMonthsAgo = subMonths(now, 2);
      const prevStart = startOfMonth(twoMonthsAgo);
      const prevEnd = endOfMonth(twoMonthsAgo);
      return { current: { start: curStart, end: curEnd }, previous: { start: prevStart, end: prevEnd } };
    }
    case 'this-quarter': {
      const curStart = startOfQuarter(now);
      const curEnd = endOfQuarter(now);
      const lastQuarterDate = subQuarters(now, 1);
      const prevStart = startOfQuarter(lastQuarterDate);
      const prevEnd = endOfQuarter(lastQuarterDate);
      return { current: { start: curStart, end: curEnd }, previous: { start: prevStart, end: prevEnd } };
    }
    case 'last-quarter': {
      const lastQuarterDate = subQuarters(now, 1);
      const curStart = startOfQuarter(lastQuarterDate);
      const curEnd = endOfQuarter(lastQuarterDate);
      const twoQuartersAgo = subQuarters(now, 2);
      const prevStart = startOfQuarter(twoQuartersAgo);
      const prevEnd = endOfQuarter(twoQuartersAgo);
      return { current: { start: curStart, end: curEnd }, previous: { start: prevStart, end: prevEnd } };
    }
    case 'this-year': {
      const curStart = startOfYear(now);
      const curEnd = endOfYear(now);
      const lastYearStart = startOfYear(new Date(now.getFullYear() - 1, 0, 1));
      const lastYearEnd = endOfYear(new Date(now.getFullYear() - 1, 0, 1));
      return { current: { start: curStart, end: curEnd }, previous: { start: lastYearStart, end: lastYearEnd } };
    }
    case 'custom': {
      const curStart = customStart ? parseISO(customStart) : startOfMonth(now);
      const curEnd = customEnd ? parseISO(customEnd) : endOfMonth(now);
      const durationDays = differenceInDays(curEnd, curStart) || 1;
      const prevEnd = new Date(curStart.getTime() - 24 * 60 * 60 * 1000);
      const prevStart = new Date(prevEnd.getTime() - durationDays * 24 * 60 * 60 * 1000);
      return { current: { start: curStart, end: curEnd }, previous: { start: prevStart, end: prevEnd } };
    }
  }
}

/**
 * Calculates complete expense analytics with previous period comparison and smart insights
 */
export function calculateExpenseAnalytics(
  enrichedTransactions: Transaction[],
  categories: Category[],
  period: ExpensePeriod = 'this-month',
  customStart?: string,
  customEnd?: string,
  referenceDate?: Date
): ExpenseAnalytics {
  const expenseTxs = enrichedTransactions.filter((t) => t.type === 'expense');
  const { current, previous } = getDateRangeForPeriod(period, customStart, customEnd, referenceDate);

  const currentTxs = expenseTxs.filter((t) => {
    try {
      const d = parseISO(t.transaction_date);
      return isWithinInterval(d, { start: current.start, end: current.end });
    } catch {
      return false;
    }
  });

  const previousTxs = expenseTxs.filter((t) => {
    try {
      const d = parseISO(t.transaction_date);
      return isWithinInterval(d, { start: previous.start, end: previous.end });
    } catch {
      return false;
    }
  });

  const totalExpense = currentTxs.reduce((sum, t) => sum + t.amount, 0);
  const previousPeriodExpense = previousTxs.reduce((sum, t) => sum + t.amount, 0);

  // Percentage change
  let percentageChange = 0;
  if (previousPeriodExpense > 0) {
    percentageChange = Math.round(((totalExpense - previousPeriodExpense) / previousPeriodExpense) * 1000) / 10;
  } else if (totalExpense > 0) {
    percentageChange = 100;
  }

  // Days in period for daily average
  const daysInPeriod = Math.max(1, differenceInDays(current.end, current.start) + 1);
  const averageDailyExpense = Math.round(totalExpense / daysInPeriod);

  // Highest expense
  let highestExpense = 0;
  let highestExpenseItem: Transaction | undefined;
  if (currentTxs.length > 0) {
    const sorted = [...currentTxs].sort((a, b) => b.amount - a.amount);
    highestExpense = sorted[0].amount;
    highestExpenseItem = sorted[0];
  }

  // Category breakdown
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const catTotals = new Map<string, number>();

  currentTxs.forEach((t) => {
    const catId = t.category_id || 'cat-other';
    catTotals.set(catId, (catTotals.get(catId) || 0) + t.amount);
  });

  const categoryBreakdown = Array.from(catTotals.entries())
    .map(([catId, amount]) => {
      const cat = categoryMap.get(catId);
      const name = cat ? cat.name : 'Other';
      const color = cat ? cat.color : '#6B7280';
      const percentage = totalExpense > 0 ? Math.round((amount / totalExpense) * 1000) / 10 : 0;
      return { name, amount, color, percentage };
    })
    .sort((a, b) => b.amount - a.amount);

  const topCategory = categoryBreakdown[0] || undefined;

  // Daily Trend
  const dateTotals = new Map<string, number>();
  currentTxs.forEach((t) => {
    dateTotals.set(t.transaction_date, (dateTotals.get(t.transaction_date) || 0) + t.amount);
  });

  const dailyTrend = Array.from(dateTotals.entries())
    .map(([date, amount]) => ({
      date,
      amount,
      label: format(parseISO(date), 'dd MMM'),
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Top Expenses (Top 5 largest)
  const topExpenses = [...currentTxs].sort((a, b) => b.amount - a.amount).slice(0, 5);

  // Automatic Insights Generation
  const insights: string[] = [];

  if (currentTxs.length === 0) {
    insights.push('No expenses recorded for this period yet. Tap "+ Add Transaction" to log an expense.');
  } else {
    if (topCategory && topCategory.amount > 0) {
      insights.push(
        `${topCategory.name} is your highest spending category this period at ₹${topCategory.amount.toLocaleString(
          'en-IN'
        )} (${topCategory.percentage}% of total expenses).`
      );
    }

    if (previousPeriodExpense > 0) {
      if (percentageChange > 0) {
        insights.push(
          `Your expenses increased by ${percentageChange}% compared with the previous period (₹${totalExpense.toLocaleString(
            'en-IN'
          )} vs ₹${previousPeriodExpense.toLocaleString('en-IN')}).`
        );
      } else if (percentageChange < 0) {
        insights.push(
          `Great job! Your spending decreased by ${Math.abs(percentageChange)}% compared with the previous period.`
        );
      } else {
        insights.push('Your spending is exactly matching the previous period.');
      }
    }

    if (averageDailyExpense > 0) {
      insights.push(
        `Your average daily expense for this period is ₹${averageDailyExpense.toLocaleString('en-IN')}.`
      );
    }

    if (highestExpenseItem) {
      insights.push(
        `Highest single expense was ₹${highestExpenseItem.amount.toLocaleString('en-IN')} for "${highestExpenseItem.remark}" (${highestExpenseItem.category_name || 'General'}).`
      );
    }

    insights.push(`You have logged ${currentTxs.length} expense transactions in this period.`);
  }

  return {
    totalExpense,
    averageDailyExpense,
    highestExpense,
    highestExpenseItem,
    transactionCount: currentTxs.length,
    topCategory,
    previousPeriodExpense,
    percentageChange,
    categoryBreakdown,
    dailyTrend,
    topExpenses,
    insights,
  };
}
