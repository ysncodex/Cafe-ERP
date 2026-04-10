import type { DateRange, DateRangeFilter, Transaction } from '@/core/types';

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function filterTransactions(params: {
  transactions: Transaction[];
  dateRange: DateRange;
  customStart: string;
  customEnd: string;
  customDateRange: DateRangeFilter;
}) {
  const { transactions, dateRange, customStart, customEnd, customDateRange } = params;

  const now = new Date();
  const dayStart = startOfDay(now);

  const weekStart = new Date(dayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  return transactions.filter(t => {
    if (!t.date) return false;
    const tDate = t.date;

    // Custom date range from RangeCalendar takes priority
    if (customDateRange.from && customDateRange.to) {
      const start = new Date(customDateRange.from);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customDateRange.to);
      end.setHours(23, 59, 59, 999);
      return tDate >= start && tDate <= end;
    }

    // Fall back to regular dateRange filters
    if (dateRange === 'today') return tDate >= dayStart;
    if (dateRange === 'week') return tDate >= weekStart;
    if (dateRange === 'month') return tDate >= monthStart;
    if (dateRange === 'prev_month') return tDate >= prevMonthStart && tDate <= prevMonthEnd;
    if (dateRange === 'custom' && customStart && customEnd) {
      const start = new Date(customStart);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      return tDate >= start && tDate <= end;
    }

    return true;
  });
}
