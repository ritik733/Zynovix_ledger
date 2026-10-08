export type TransactionType = 'expense' | 'borrow' | 'lending';

export type DisplayTransactionType = TransactionType | 'repayment';

export type TransactionStatus = 'completed' | 'pending' | 'partially_settled' | 'settled';

export type AgeingBucket = '0-7 days' | '8-30 days' | '31-60 days' | '61-90 days' | '90+ days';

export type PersonStatus = 'Receivable' | 'Payable' | 'Settled' | 'Balanced';

export interface Category {
  id: string;
  user_id?: string | null;
  name: string;
  icon?: string;
  color?: string;
  is_system?: boolean;
  created_at?: string;
}

export interface Person {
  id: string;
  user_id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Settlement {
  id: string;
  user_id: string;
  transaction_id: string;
  amount: number;
  settlement_date: string;
  payment_method?: string | null;
  remark: string;
  is_deleted?: boolean;
  created_at: string;
  updated_at?: string;
  // Joined or augmented details
  transaction_type?: TransactionType;
  person_name?: string | null;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  transaction_date: string;
  person_id?: string | null;
  category_id?: string | null;
  payment_method?: string | null;
  remark: string;
  notes?: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at?: string;
  // Computed / Joined fields
  person_name?: string | null;
  category_name?: string | null;
  total_settled?: number;
  pending_amount?: number;
  status?: TransactionStatus;
  days_outstanding?: number;
  ageing_bucket?: AgeingBucket;
  settlements?: Settlement[];
}

export interface PersonSummary {
  person_id: string;
  user_id: string;
  person_name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  created_at: string;
  total_borrowed: number;
  total_borrowed_settled: number;
  i_owe: number;
  total_lent: number;
  total_lent_settled: number;
  they_owe_me: number;
  net_position: number;
  oldest_pending_days: number;
  oldest_pending_date?: string | null;
  avg_outstanding_days: number;
  active_transactions_count: number;
  status: PersonStatus;
}

export interface AgeingItem {
  bucket: AgeingBucket;
  count: number;
  amount: number;
}

export interface AgeingAnalysis {
  lending: AgeingItem[];
  borrowing: AgeingItem[];
  totalLendingPending: number;
  totalBorrowingPending: number;
}

export interface AccountBalanceSummary {
  totalBorrowed: number;        // Total currently outstanding money I owe (i_owe sum)
  totalLent: number;            // Total currently outstanding money they owe me (they_owe_me sum)
  netReceivable: number;        // Sum of all positive person net balances
  netPayable: number;           // Sum of all negative person net balances (absolute value)
  netPosition: number;          // Total Lending Pending - Total Borrowing Pending
  totalOriginalBorrowed: number;
  totalOriginalLent: number;
  totalSettledRepayments: number;
  totalExpensesAllTime: number;
}

export interface ExpenseAnalytics {
  totalExpense: number;
  averageDailyExpense: number;
  highestExpense: number;
  highestExpenseItem?: Transaction;
  transactionCount: number;
  topCategory?: { name: string; amount: number; percentage: number };
  previousPeriodExpense: number;
  percentageChange: number; // e.g. +18.9%
  categoryBreakdown: { name: string; amount: number; color?: string; percentage: number }[];
  dailyTrend: { date: string; amount: number; label: string }[];
  topExpenses: Transaction[];
  insights: string[];
}

export type ExpensePeriod =
  | 'this-week'
  | 'last-week'
  | 'this-month'
  | 'last-month'
  | 'this-quarter'
  | 'last-quarter'
  | 'this-year'
  | 'custom';

export interface TransactionFilter {
  dateRange?: { start?: string; end?: string };
  type?: 'all' | 'expense' | 'borrow' | 'lending' | 'repayment';
  personId?: string;
  categoryId?: string;
  status?: 'all' | 'pending' | 'partially_settled' | 'settled' | 'completed';
  search?: string;
}
