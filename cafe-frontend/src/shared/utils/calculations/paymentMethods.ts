import type { Transaction } from '@/core/types';

/**
 * Payment Method Balance Tracking
 * Comprehensive tracking for Cash, Bank, and Bkash balances
 */

export interface MethodBreakdown {
  balance: number;
  sales: number;
  expenses: number;
  fundIn: number;
  fundOut: number;
  cashToFund: number;
}

export interface PaymentMethodBalances {
  cash: MethodBreakdown;
  bank: MethodBreakdown;
  bkash: MethodBreakdown;
  total: {
    balance: number;
    sales: number;
    expenses: number;
  };
}

/**
 * Calculate comprehensive balances for all payment methods
 */
export function calculatePaymentMethodBalances(
  allTransactions: Transaction[],
  filteredTransactions?: Transaction[]
): PaymentMethodBalances {
  const filtered = filteredTransactions || allTransactions;

  // Initialize breakdowns
  const cash: MethodBreakdown = {
    balance: 0,
    sales: 0,
    expenses: 0,
    fundIn: 0,
    fundOut: 0,
    cashToFund: 0
  };

  const bank: MethodBreakdown = {
    balance: 0,
    sales: 0,
    expenses: 0,
    fundIn: 0,
    fundOut: 0,
    cashToFund: 0
  };

  const bkash: MethodBreakdown = {
    balance: 0,
    sales: 0,
    expenses: 0,
    fundIn: 0,
    fundOut: 0,
    cashToFund: 0
  };

  // Calculate ALL TIME balances (affects balance only)
  allTransactions.forEach(t => {
    const val = Number(t.amount);
    const method = t.method;

    // Transfers between payment method and Fund
    // - cash_to_fund: money leaves the selected method and moves into Fund
    // - fund_to_cash: money leaves Fund and enters the selected method
    if (t.type === 'cash_to_fund') {
      if (method === 'cash') cash.balance -= val;
      else if (method === 'bank') bank.balance -= val;
      else if (method === 'bkash') bkash.balance -= val;
      return;
    }
    if (t.type === 'fund_to_cash') {
      if (method === 'cash') cash.balance += val;
      else if (method === 'bank') bank.balance += val;
      else if (method === 'bkash') bkash.balance += val;
      return;
    }

    // Special case: Cash Added means cash drawer increases.
    // If source is bank/bkash, that source decreases by the same amount (total liquidity unchanged).
    if (t.type === 'cash_added') {
      cash.balance += val;
      if (method === 'bank') bank.balance -= val;
      if (method === 'bkash') bkash.balance -= val;
      // If source is 'cash', treat it as external cash injection / adjustment.
      return;
    }

    if (method === 'cash') {
      if (t.type === 'sale' || t.type === 'sale_adjustment') cash.balance += val;
      else if (t.type === 'expense_product' || t.type === 'expense_fixed') cash.balance -= val;
      else if (t.type === 'fund_in') cash.balance += val;
      else if (t.type === 'fund_out') cash.balance -= val;
    } else if (method === 'bank') {
      if (t.type === 'sale' || t.type === 'sale_adjustment') bank.balance += val;
      else if (t.type === 'expense_product' || t.type === 'expense_fixed') bank.balance -= val;
      else if (t.type === 'fund_in') bank.balance += val;
      else if (t.type === 'fund_out') bank.balance -= val;
    } else if (method === 'bkash') {
      if (t.type === 'sale' || t.type === 'sale_adjustment') bkash.balance += val;
      else if (t.type === 'expense_product' || t.type === 'expense_fixed') bkash.balance -= val;
      else if (t.type === 'fund_in') bkash.balance += val;
      else if (t.type === 'fund_out') bkash.balance -= val;
    }
  });

  // Calculate FILTERED period stats (sales, expenses, etc.)
  filtered.forEach(t => {
    const val = Number(t.amount);
    const method = t.method;

    if (method === 'cash') {
      if (t.type === 'sale' || t.type === 'sale_adjustment') cash.sales += val;
      else if (t.type === 'expense_product' || t.type === 'expense_fixed') cash.expenses += val;
      else if (t.type === 'fund_in') cash.fundIn += val;
      else if (t.type === 'fund_out') cash.fundOut += val;
      else if (t.type === 'cash_to_fund') cash.cashToFund += val;
    } else if (method === 'bank') {
      if (t.type === 'sale' || t.type === 'sale_adjustment') bank.sales += val;
      else if (t.type === 'expense_product' || t.type === 'expense_fixed') bank.expenses += val;
      else if (t.type === 'fund_in') bank.fundIn += val;
      else if (t.type === 'fund_out') bank.fundOut += val;
      else if (t.type === 'cash_to_fund') bank.cashToFund += val;
    } else if (method === 'bkash') {
      if (t.type === 'sale' || t.type === 'sale_adjustment') bkash.sales += val;
      else if (t.type === 'expense_product' || t.type === 'expense_fixed') bkash.expenses += val;
      else if (t.type === 'fund_in') bkash.fundIn += val;
      else if (t.type === 'fund_out') bkash.fundOut += val;
      else if (t.type === 'cash_to_fund') bkash.cashToFund += val;
    }
  });

  return {
    cash,
    bank,
    bkash,
    total: {
      balance: cash.balance + bank.balance + bkash.balance,
      sales: cash.sales + bank.sales + bkash.sales,
      expenses: cash.expenses + bank.expenses + bkash.expenses
    }
  };
}

/**
 * Calculate daily available cash (today only) - ALL payment methods
 * Only includes operational transactions: sales, expenses, and cash_to_fund
 * Includes fund_in/fund_out to reflect real liquidity changes
 */
export function calculateDailyAvailableCash(transactions: Transaction[]): number {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  startOfToday.setHours(0, 0, 0, 0);
  
  let dailyAvailableCash = 0;

  transactions.forEach(t => {
    const val = Number(t.amount);
    const tDate = new Date(t.date);
    tDate.setHours(0, 0, 0, 0);
    const isToday = tDate.getTime() === startOfToday.getTime();

    if (isToday) {
      // Include ALL payment methods (cash, bank, bkash)
      if (t.type === 'sale' || t.type === 'sale_adjustment') {
        dailyAvailableCash += val;
      } else if (t.type === 'fund_in') {
        dailyAvailableCash += val;
      } else if (t.type === 'fund_to_cash') {
        // Store cash -> cash drawer increases what is available today
        dailyAvailableCash += val;
      } else if (t.type === 'cash_added') {
        // Cash Added increases what is available in the cash drawer today
        dailyAvailableCash += val;
      } else if (t.type === 'fund_out') {
        dailyAvailableCash -= val;
      } else if (t.type === 'expense_product' || t.type === 'expense_fixed' || t.type === 'cash_to_fund') {
        dailyAvailableCash -= val;
      }
    }
  });

  return dailyAvailableCash;
}
