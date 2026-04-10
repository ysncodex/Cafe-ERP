import type { DailyRecord, Transaction } from '@/core/types';

export function computeDailyRecords(filteredTransactions: Transaction[]): DailyRecord[] {
  const records: Record<string, DailyRecord> = {};

  filteredTransactions.forEach(t => {
    const dateKey = t.date?.toLocaleDateString();
    if (!dateKey) return;

    if (!records[dateKey]) {
      records[dateKey] = {
        date: t.date,
        cashSales: 0,
        bkashSales: 0,
        bankSales: 0,
        cashCosts: 0,
        bankCosts: 0,
        bkashCosts: 0,
        dailyCosts: 0,
        cashAdded: 0,
        cashAddedExternal: 0,
        fundToCash: 0,
        cashToFund: 0,
        cashFundOut: 0,
        bankFundOut: 0,
        bkashFundOut: 0,
        fundIn: 0,
        fundOut: 0,
      };
    }

    const val = Number(t.amount);

    if (t.type === 'sale' || t.type === 'sale_adjustment') {
      if (t.method === 'cash') records[dateKey].cashSales += val;
      if (t.method === 'bkash') records[dateKey].bkashSales += val;
      if (t.method === 'bank') records[dateKey].bankSales += val;
    }

    if (t.type === 'expense_product' || t.type === 'expense_fixed') {
      records[dateKey].dailyCosts += val;
      if (t.method === 'cash') records[dateKey].cashCosts += val;
      if (t.method === 'bank') records[dateKey].bankCosts += val;
      if (t.method === 'bkash') records[dateKey].bkashCosts += val;
    }

    if (t.type === 'cash_to_fund') {
      records[dateKey].cashToFund += val;
    }

    if (t.type === 'cash_added') {
      records[dateKey].cashAdded += val;
      // Only external cash actually increases total liquidity.
      // If method is bank/bkash, it's an internal move between methods.
      if (t.method === 'cash') records[dateKey].cashAddedExternal += val;
    }

    if (t.type === 'fund_to_cash') {
      records[dateKey].fundToCash += val;
    }

    if (t.type === 'fund_in') records[dateKey].fundIn += val;
    if (t.type === 'fund_out') {
      records[dateKey].fundOut += val;
      if (t.method === 'cash') records[dateKey].cashFundOut += val;
      if (t.method === 'bank') records[dateKey].bankFundOut += val;
      if (t.method === 'bkash') records[dateKey].bkashFundOut += val;
    }
  });

  return Object.values(records).sort((a, b) => b.date.getTime() - a.date.getTime());
}
