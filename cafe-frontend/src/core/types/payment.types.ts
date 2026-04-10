/**
 * Payment Method Type Definitions
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

export interface ExternalFundBalanceBreakdown {
  cash: number;
  bank: number;
  bkash: number;
  total: number;
}
