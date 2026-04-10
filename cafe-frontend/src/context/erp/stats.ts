import type { ERPStats, Transaction } from '@/core/types';
import {
  calculateFundFlow,
  calculateMonthlyFundGenerated,
  calculateTotalFundBalance,
} from '@/shared/utils/calculations';
import { calculateDailyAvailableCash, calculatePaymentMethodBalances } from '@/shared/utils/calculations';

export function computeStats(transactions: Transaction[], filteredTransactions: Transaction[]): ERPStats {
  let totalSales = 0;
  let foodpandaSales = 0;
  let foodiSales = 0;

  let totalExpenses = 0;
  let totalProductCost = 0;
  let totalFixedCost = 0;

  const expenseCategories: Record<string, number> = {};
  const productUsage: Record<string, { qty: number; unit: string; cost: number; count: number }> = {};
  const fixedCostAgg: Record<string, number> = {};

  // 1. Calculate comprehensive payment method balances
  const paymentMethods = calculatePaymentMethodBalances(transactions, filteredTransactions);
  const fundFlow = calculateFundFlow(filteredTransactions);
  const fundTotal = calculateTotalFundBalance(transactions);
  const monthlyFundGenerated = calculateMonthlyFundGenerated(transactions);
  const dailyAvailableCash = calculateDailyAvailableCash(transactions);

  // External fund balance (external only): fund_in - fund_out (range-based)
  const externalFundBalance = {
    cash: fundFlow.fundAdded.cash - fundFlow.fundWithdrawn.cash,
    bank: fundFlow.fundAdded.bank - fundFlow.fundWithdrawn.bank,
    bkash: fundFlow.fundAdded.bkash - fundFlow.fundWithdrawn.bkash,
    total: fundFlow.fundAdded.total - fundFlow.fundWithdrawn.total,
  };

  // Net cash movement for selected range: sales - expenses - cash_to_fund
  let netCashInRange = 0;
  filteredTransactions.forEach(t => {
    const val = Number(t.amount);
    if (t.type === 'sale' || t.type === 'sale_adjustment') netCashInRange += val;
    else if (t.type === 'expense_product' || t.type === 'expense_fixed' || t.type === 'cash_to_fund') {
      netCashInRange -= val;
    }
  });

  // 2. Calculate Total Available Liquidity (all payment methods)
  const totalLiquidity = paymentMethods.total.balance;
  const cashInHand = paymentMethods.cash.balance;

  // 3. Calculate Stats based on Filtered Date Range
  filteredTransactions.forEach(t => {
    const val = Number(t.amount);

    if (t.type === 'sale' || t.type === 'sale_adjustment') {
      totalSales += val;
      if (t.channel === 'foodpanda') foodpandaSales += val;
      if (t.channel === 'foodi') foodiSales += val;
    }

    if (t.type === 'expense_product' || t.type === 'expense_fixed') {
      totalExpenses += val;
      if (t.type === 'expense_product') {
        totalProductCost += val;

        const itemName = t.description || 'Unknown Item';
        if (!productUsage[itemName]) {
          productUsage[itemName] = { qty: 0, unit: t.unit || 'pcs', cost: 0, count: 0 };
        }
        productUsage[itemName].qty += t.quantity || 0;
        productUsage[itemName].cost += val;
        productUsage[itemName].count += 1;
      }
      if (t.type === 'expense_fixed') {
        totalFixedCost += val;
        const key = t.category || t.description || 'Misc';
        fixedCostAgg[key] = (fixedCostAgg[key] || 0) + val;
      }

      const cat = t.category || (t.type === 'expense_product' ? 'Product' : 'Fixed');
      expenseCategories[cat] = (expenseCategories[cat] || 0) + val;
    }
  });

  const recentSales = filteredTransactions
    .filter(t => t.type === 'sale' || t.type === 'sale_adjustment')
    .slice(0, 10)
    .reverse()
    .map((t, index) => ({
      name: `Day ${index + 1}`,
      value: t.amount,
    }));

  const topProducts = Object.entries(productUsage)
    .map(([name, data]) => ({ name, cost: data.cost, qty: data.qty, unit: data.unit }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);

  const topFixed = Object.entries(fixedCostAgg)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return {
    // Sales metrics
    totalSales,
    foodpandaSales,
    foodiSales,

    // Payment method balances and breakdowns
    cashInHand,
    totalLiquidity,
    cashBalance: paymentMethods.cash.balance,
    bankBalance: paymentMethods.bank.balance,
    bkashBalance: paymentMethods.bkash.balance,
    totalBalance: paymentMethods.total.balance,

    // Sales by payment method
    cashSales: paymentMethods.cash.sales,
    bankSales: paymentMethods.bank.sales,
    bkashSales: paymentMethods.bkash.sales,

    // Received amounts (for compatibility)
    bankReceived: paymentMethods.bank.sales + paymentMethods.bank.fundIn,
    bkashReceived: paymentMethods.bkash.sales + paymentMethods.bkash.fundIn,

    // Expenses by payment method
    cashExpenses: paymentMethods.cash.expenses,
    bankExpenses: paymentMethods.bank.expenses,
    bkashExpenses: paymentMethods.bkash.expenses,

    // Fund metrics
    fundTotal,
    totalAdded: fundFlow.fundAdded.total,
    totalExpenses,
    totalProductCost,
    totalFixedCost,
    monthlyFundGenerated,
    dailyAvailableCash,
    netCashInRange,
    externalFundBalance,
    fundAdded: fundFlow.fundAdded,
    fundWithdrawn: fundFlow.fundWithdrawn,

    // Profitability
    profit: totalSales - totalExpenses,
    grossProfit: totalSales - totalProductCost,

    // Categorized data
    expenseCategories,
    productUsage,
    recentSales,
    topProducts,
    topFixed,

    // Payment method details
    paymentMethods,
  };
}
