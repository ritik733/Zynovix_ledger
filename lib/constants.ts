import { Category } from '@/types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-food', name: 'Food', icon: 'Utensils', color: '#F59E0B', is_system: true },
  { id: 'cat-travel', name: 'Travel', icon: 'Plane', color: '#3B82F6', is_system: true },
  { id: 'cat-shopping', name: 'Shopping', icon: 'ShoppingBag', color: '#EC4899', is_system: true },
  { id: 'cat-bills', name: 'Bills', icon: 'Receipt', color: '#8B5CF6', is_system: true },
  { id: 'cat-entertainment', name: 'Entertainment', icon: 'Film', color: '#10B981', is_system: true },
  { id: 'cat-health', name: 'Health', icon: 'HeartPulse', color: '#EF4444', is_system: true },
  { id: 'cat-education', name: 'Education', icon: 'GraduationCap', color: '#6366F1', is_system: true },
  { id: 'cat-rent', name: 'Rent', icon: 'Home', color: '#14B8A6', is_system: true },
  { id: 'cat-utilities', name: 'Utilities', icon: 'Zap', color: '#F97316', is_system: true },
  { id: 'cat-fuel', name: 'Fuel', icon: 'Fuel', color: '#D97706', is_system: true },
  { id: 'cat-subscription', name: 'Subscription', icon: 'CreditCard', color: '#06B6D4', is_system: true },
  { id: 'cat-other', name: 'Other', icon: 'Folder', color: '#6B7280', is_system: true },
];

export const PAYMENT_METHODS = [
  'Cash',
  'UPI (Google Pay / PhonePe / Paytm)',
  'Bank Transfer (IMPS / NEFT)',
  'Credit Card',
  'Debit Card',
  'Cheque',
  'Other',
];

export function formatCurrency(amount: number, currency: string = '₹'): string {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(abs);

  return `${isNegative ? '-' : ''}${currency}${formatted}`;
}
