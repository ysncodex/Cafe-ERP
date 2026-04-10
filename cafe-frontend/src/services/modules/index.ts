// Export all services from a single entry point
export { authService } from './auth.service';
export { salesService } from './sales.service';
export { expensesService } from './expenses.service';
export { fundService } from './fund.service';
export { reportsService } from './reports.service';

// Re-export types
export type { LoginCredentials, AuthResponse, User } from './auth.service';
export type { SaleCreateData, SalesStats } from './sales.service';
export type { ExpenseCreateData, ExpenseStats } from './expenses.service';
export type { FundOperationData, FundStats } from './fund.service';
export type { DailyReport, MonthlyReport, ProfitLossReport } from './reports.service';
