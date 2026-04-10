import type { Transaction } from '@/core/types';

/**
 * Fund Calculation Utilities
 * Separated for better maintainability and clarity
 */

export interface FundAddedBreakdown {
  cash: number;
  bank: number;
  bkash: number;
  fromSales: number;
  total: number;
}

export interface FundWithdrawnBreakdown {
  cash: number;
  bank: number;
  bkash: number;
  total: number;
}

export interface FundFlowResult {
  fundAdded: FundAddedBreakdown;
  fundWithdrawn: FundWithdrawnBreakdown;
  netFund: number;
}

/**
 * Calculate fund additions (external investments only)
 * Does NOT include cash_to_fund from sales
 */
export function calculateFundAdded(transactions: Transaction[]): FundAddedBreakdown {
  const breakdown = {
    cash: 0,
    bank: 0,
    bkash: 0,
    fromSales: 0,
    total: 0
  };

  transactions.forEach(t => {
    const val = Number(t.amount);
    
    // Only count fund_in (external investments)
    if (t.type === 'fund_in') {
      if (t.method === 'cash') breakdown.cash += val;
      if (t.method === 'bank') breakdown.bank += val;
      if (t.method === 'bkash') breakdown.bkash += val;
      breakdown.total += val;
    }
    
    // Track cash_to_fund separately (from sales, not external)
    if (t.type === 'cash_to_fund') {
      breakdown.fromSales += val;
    }
  });

  return breakdown;
}

/**
 * Calculate fund withdrawals
 * Only includes fund_out transactions
 */
export function calculateFundWithdrawn(transactions: Transaction[]): FundWithdrawnBreakdown {
  const breakdown = {
    cash: 0,
    bank: 0,
    bkash: 0,
    total: 0
  };

  transactions.forEach(t => {
    const val = Number(t.amount);
    
    // fund_to_cash is a withdrawal from stored/external fund into the cash drawer
    if (t.type === 'fund_out' || t.type === 'fund_to_cash') {
      if (t.method === 'cash') breakdown.cash += val;
      if (t.method === 'bank') breakdown.bank += val;
      if (t.method === 'bkash') breakdown.bkash += val;
      breakdown.total += val;
    }
  });

  return breakdown;
}

/**
 * Calculate complete fund flow analysis
 */
export function calculateFundFlow(transactions: Transaction[]): FundFlowResult {
  const fundAdded = calculateFundAdded(transactions);
  const fundWithdrawn = calculateFundWithdrawn(transactions);
  
  // Net fund = Added (external) + From Sales - Withdrawn
  const netFund = fundAdded.total + fundAdded.fromSales - fundWithdrawn.total;

  return {
    fundAdded,
    fundWithdrawn,
    netFund
  };
}

/**
 * Calculate total fund balance (all time)
 * Includes both fund_in and cash_to_fund, minus fund_out
 */
export function calculateTotalFundBalance(allTransactions: Transaction[]): number {
  let balance = 0;

  allTransactions.forEach(t => {
    const val = Number(t.amount);
    
    if (t.type === 'fund_in' || t.type === 'cash_to_fund') {
      balance += val;
    }
    if (t.type === 'fund_out' || t.type === 'fund_to_cash') {
      balance -= val;
    }
  });

  return balance;
}

/**
 * Calculate monthly fund generated (cash transferred from sales this month)
 */
export function calculateMonthlyFundGenerated(allTransactions: Transaction[]): number {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  let monthlyFund = 0;

  allTransactions.forEach(t => {
    if (t.date < startOfMonth) return;
    if (t.type === 'cash_to_fund') monthlyFund += Number(t.amount);
    if (t.type === 'fund_to_cash') monthlyFund -= Number(t.amount);
  });

  return monthlyFund;
}
