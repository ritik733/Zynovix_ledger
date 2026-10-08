import { Transaction } from '@/types';
import { format } from 'date-fns';

export function exportTransactionsToCSV(transactions: Transaction[], filenamePrefix: string = 'transactions'): void {
  if (transactions.length === 0) {
    alert('No transactions to export for the current filters.');
    return;
  }

  const headers = [
    'Date',
    'Type',
    'Person',
    'Category',
    'Amount',
    'Settled / Paid',
    'Pending Amount',
    'Status',
    'Payment Method',
    'Days Outstanding',
    'Ageing Bucket',
    'Remark',
    'Notes',
  ];

  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '""';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = transactions.map((t) => [
    escapeCSV(t.transaction_date),
    escapeCSV(t.type.toUpperCase()),
    escapeCSV(t.person_name || 'N/A'),
    escapeCSV(t.category_name || 'N/A'),
    escapeCSV(t.amount.toFixed(2)),
    escapeCSV((t.total_settled || 0).toFixed(2)),
    escapeCSV((t.pending_amount || 0).toFixed(2)),
    escapeCSV(t.status || 'N/A'),
    escapeCSV(t.payment_method || 'N/A'),
    escapeCSV(t.days_outstanding || 0),
    escapeCSV(t.ageing_bucket || 'N/A'),
    escapeCSV(t.remark),
    escapeCSV(t.notes || ''),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
  link.setAttribute('download', `${filenamePrefix}_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
