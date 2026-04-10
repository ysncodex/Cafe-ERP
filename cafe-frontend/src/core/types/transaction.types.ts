/**
 * Transaction Type Definitions
 * Core types for all transaction-related operations
 */

export type TransactionType =
  | 'sale'
  | 'sale_adjustment'
  | 'expense_product'
  | 'expense_fixed'
  | 'fund_in'
  | 'fund_out'
  | 'cash_to_fund'
  | 'cash_added'
  | 'fund_to_cash';
export type PaymentMethod = 'cash' | 'bank' | 'bkash';
export type SalesChannel = 'in_store' | 'foodpanda' | 'foodi';
export type UnitType = 'kg' | 'g' | 'L' | 'ml' | 'pcs' | 'box' | 'pack';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  method: PaymentMethod;
  channel?: SalesChannel;
  description: string;
  quantity?: number;
  unit?: UnitType;
  unitPrice?: number;
  supplier?: string;
  date: Date;
}

export type TransactionFormData = Omit<Transaction, 'id' | 'date'>;
