/**
 * Core Type Exports
 * Barrel file for all type definitions
 */

// Transaction types
export * from './transaction.types';

// Payment types
export * from './payment.types';

// Common types
export * from './common.types';

// ERP Context types
export interface ERPContextType {
  // Transactions
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  addTransaction: (t: Omit<Transaction, 'id' | 'date'> & { date?: Date }) => void;
  deleteTransaction: (id: string) => void;
  updateTransaction: (t: Transaction) => void;

  // Filters
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  customStart: string;
  setCustomStart: (date: string) => void;
  customEnd: string;
  setCustomEnd: (date: string) => void;
  customDateRange: DateRangeFilter;
  setCustomDateRange: (range: DateRangeFilter) => void;

  // Analytics
  stats: ERPStats;
  dailyRecords: DailyRecord[];

  // Lists Management
  itemNames: string[];
  suppliers: string[];
  addItemName: (name: string) => void;
  addSupplier: (name: string) => void;

  renameItemName: (oldName: string, newName: string) => void;
  deleteItemName: (name: string) => void;
  renameSupplier: (oldName: string, newName: string) => void;
  deleteSupplier: (name: string) => void;
}

// Stats interface
export interface ERPStats {
  totalSales: number;
  foodpandaSales: number;
  foodiSales: number;
  cashInHand: number;
  totalLiquidity: number;
  cashBalance: number;
  bankBalance: number;
  bkashBalance: number;
  totalBalance: number;
  cashSales: number;
  bankSales: number;
  bkashSales: number;
  bankReceived: number;
  bkashReceived: number;
  cashExpenses: number;
  bankExpenses: number;
  bkashExpenses: number;
  fundTotal: number;
  totalAdded: number;
  totalExpenses: number;
  totalProductCost: number;
  totalFixedCost: number;
  monthlyFundGenerated: number;
  dailyAvailableCash: number;
  netCashInRange: number;
  externalFundBalance: ExternalFundBalanceBreakdown;
  fundAdded: FundAddedBreakdown;
  fundWithdrawn: FundWithdrawnBreakdown;
  profit: number;
  grossProfit: number;
  expenseCategories: Record<string, number>;
  productUsage: Record<string, { qty: number; unit: string; cost: number; count: number }>;
  recentSales: Array<{ name: string; value: number }>;
  topProducts: Array<{ name: string; cost: number; qty: number; unit: string }>;
  topFixed: Array<{ name: string; amount: number }>;
  paymentMethods: PaymentMethodBalances;
}

// Daily Record interface
export interface DailyRecord {
  date: Date;
  cashSales: number;
  bkashSales: number;
  bankSales: number;
  cashCosts: number;
  bankCosts: number;
  bkashCosts: number;
  dailyCosts: number;
  cashAdded: number;
  cashAddedExternal: number;
  fundToCash: number;
  cashToFund: number;
  cashFundOut: number;
  bankFundOut: number;
  bkashFundOut: number;
  fundIn: number;
  fundOut: number;
}

// Re-export types for convenience
import type { Transaction } from './transaction.types';
import type {
  PaymentMethodBalances,
  FundAddedBreakdown,
  FundWithdrawnBreakdown,
  ExternalFundBalanceBreakdown,
} from './payment.types';
import type { DateRange, DateRangeFilter } from './common.types';
