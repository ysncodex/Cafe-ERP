import { useState, useMemo } from 'react';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  PieChart,
  Building2,
  Download,
  FileSpreadsheet,
  FileText,
  BarChart3,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
} from 'lucide-react';
import { useERP } from '@/context/ERPContext';
import { exportDashboardPDF, exportToExcel, exportToCSV, handleError } from '@/shared/utils';
import { formatCurrency } from '@/shared/utils/formatters';
import RangeCalendar from '@/features/CustomCalender';
import { StatCard } from '@/shared/components/ui';
import { toast } from 'sonner';

type ComparisonPeriod = 'none' | 'previous' | 'year';

export default function Reports() {
  const { stats, setCustomDateRange, filteredTransactions, transactions, customDateRange } =
    useERP();
  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriod>('none');

  // Calculate comparison period data
  const comparisonData = useMemo(() => {
    if (comparisonPeriod === 'none' || !customDateRange.from || !customDateRange.to) {
      return null;
    }

    const currentStart = new Date(customDateRange.from);
    const currentEnd = new Date(customDateRange.to);
    const daysDiff = Math.ceil(
      (currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    let compareStart: Date;
    let compareEnd: Date;

    if (comparisonPeriod === 'previous') {
      // Compare with previous period of same length
      compareEnd = new Date(currentStart);
      compareEnd.setDate(compareEnd.getDate() - 1);
      compareStart = new Date(compareEnd);
      compareStart.setDate(compareStart.getDate() - daysDiff);
    } else {
      // Compare with same period last year
      compareStart = new Date(currentStart);
      compareStart.setFullYear(compareStart.getFullYear() - 1);
      compareEnd = new Date(currentEnd);
      compareEnd.setFullYear(compareEnd.getFullYear() - 1);
    }

    const compareTransactions = transactions.filter((t) => {
      if (!t.date) return false;
      return t.date >= compareStart && t.date <= compareEnd;
    });

    const compareSales = compareTransactions
      .filter((t) => t.type === 'sale' || t.type === 'sale_adjustment')
      .reduce((sum, t) => sum + t.amount, 0);

    const compareExpenses = compareTransactions
      .filter((t) => t.type === 'expense_product' || t.type === 'expense_fixed')
      .reduce((sum, t) => sum + t.amount, 0);

    const compareProductCost = compareTransactions
      .filter((t) => t.type === 'expense_product')
      .reduce((sum, t) => sum + t.amount, 0);

    const compareFixedCost = compareTransactions
      .filter((t) => t.type === 'expense_fixed')
      .reduce((sum, t) => sum + t.amount, 0);

    const compareProfit = compareSales - compareExpenses;
    const compareGrossProfit = compareSales - compareProductCost;

    // Calculate changes
    const salesChange = stats.totalSales - compareSales;
    const salesChangePercent = compareSales > 0 ? (salesChange / compareSales) * 100 : 0;

    const expensesChange = stats.totalExpenses - compareExpenses;
    const expensesChangePercent =
      compareExpenses > 0 ? (expensesChange / compareExpenses) * 100 : 0;

    const profitChange = stats.profit - compareProfit;
    const profitChangePercent =
      compareProfit !== 0 ? (profitChange / Math.abs(compareProfit)) * 100 : 0;

    return {
      period: comparisonPeriod === 'previous' ? 'Previous Period' : 'Same Period Last Year',
      sales: compareSales,
      expenses: compareExpenses,
      productCost: compareProductCost,
      fixedCost: compareFixedCost,
      profit: compareProfit,
      grossProfit: compareGrossProfit,
      salesChange,
      salesChangePercent,
      expensesChange,
      expensesChangePercent,
      profitChange,
      profitChangePercent,
    };
  }, [comparisonPeriod, customDateRange, transactions, stats]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const profitMargin = stats.totalSales > 0 ? (stats.profit / stats.totalSales) * 100 : 0;
    const grossMargin = stats.totalSales > 0 ? (stats.grossProfit / stats.totalSales) * 100 : 0;
    const expenseRatio = stats.totalSales > 0 ? (stats.totalExpenses / stats.totalSales) * 100 : 0;

    const foodpandaRevenue = stats.foodpandaSales;
    const foodiRevenue = stats.foodiSales;
    const inStoreRevenue = stats.totalSales - foodpandaRevenue - foodiRevenue;

    const foodpandaShare = stats.totalSales > 0 ? (foodpandaRevenue / stats.totalSales) * 100 : 0;
    const foodiShare = stats.totalSales > 0 ? (foodiRevenue / stats.totalSales) * 100 : 0;
    const inStoreShare = stats.totalSales > 0 ? (inStoreRevenue / stats.totalSales) * 100 : 0;

    return {
      profitMargin,
      grossMargin,
      expenseRatio,
      channelBreakdown: {
        inStore: { revenue: inStoreRevenue, share: inStoreShare },
        foodpanda: { revenue: foodpandaRevenue, share: foodpandaShare },
        foodi: { revenue: foodiRevenue, share: foodiShare },
      },
    };
  }, [stats]);

  // Calculate trend data for charts (last 7 days or periods)
  const trendData = useMemo(() => {
    const dailyData = new Map<string, { sales: number; expenses: number; profit: number }>();

    filteredTransactions.forEach((t) => {
      if (!t.date) return;
      const dateKey = t.date.toLocaleDateString();
      const existing = dailyData.get(dateKey) || { sales: 0, expenses: 0, profit: 0 };

      if (t.type === 'sale' || t.type === 'sale_adjustment') {
        existing.sales += t.amount;
      } else if (t.type === 'expense_product' || t.type === 'expense_fixed') {
        existing.expenses += t.amount;
      }
      existing.profit = existing.sales - existing.expenses;

      dailyData.set(dateKey, existing);
    });

    return Array.from(dailyData.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .slice(-7)
      .map(([date, data]) => ({ date, ...data }));
  }, [filteredTransactions]);

  const handleExportExcel = async () => {
    try {
      await exportToExcel(
        filteredTransactions,
        `financial_report_${new Date().toISOString().split('T')[0]}`
      );
      toast.success('📊 Excel report exported successfully!');
    } catch (error) {
      handleError(error, {
        action: 'export_excel',
        severity: 'medium',
        metadata: { transactionCount: filteredTransactions.length },
      });
    }
  };

  const handleExportCSV = async () => {
    try {
      await exportToCSV(
        filteredTransactions,
        `financial_report_${new Date().toISOString().split('T')[0]}`
      );
      toast.success('📄 CSV report exported successfully!');
    } catch (error) {
      handleError(error, {
        action: 'export_csv',
        severity: 'medium',
        metadata: { transactionCount: filteredTransactions.length },
      });
    }
  };

  const handleExportPDF = async () => {
    try {
      const dateRange = 'Current Period'; // You can make this dynamic
      await exportDashboardPDF(stats, dateRange);
      toast.success('📑 PDF report exported successfully!');
    } catch (error) {
      handleError(error, {
        action: 'export_pdf',
        severity: 'medium',
      });
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-2 pb-20">
      {/* Report Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-slate-200">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
            Advanced Financial Report
          </h2>
          <p className="text-slate-500 mt-2 flex items-center gap-2">
            <Calendar size={16} className="text-slate-400" />
            Period:{' '}
            <span className="font-bold text-slate-700 capitalize bg-slate-100 px-2 py-0.5 rounded text-sm">
              Current Selection
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <div className="flex-shrink-0">
            <RangeCalendar onRangeChange={setCustomDateRange} />
          </div>
          <select
            value={comparisonPeriod}
            onChange={(e) => setComparisonPeriod(e.target.value as ComparisonPeriod)}
            className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:border-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          >
            <option value="none">No Comparison</option>
            <option value="previous">vs Previous Period</option>
            <option value="year">vs Last Year</option>
          </select>
          <button
            onClick={handleExportExcel}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-lg transition-all"
          >
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button
            onClick={handleExportCSV}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-lg transition-all"
          >
            <FileText size={16} /> CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all"
          >
            <Download size={16} /> PDF
          </button>
        </div>
      </div>

      {/* Comparison Alert */}
      {comparisonData && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="text-blue-600" size={24} />
            <div>
              <h3 className="font-bold text-blue-900">Comparing with {comparisonData.period}</h3>
              <p className="text-sm text-blue-700 mt-1">
                Sales:{' '}
                <span
                  className={`font-bold ${comparisonData.salesChange >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {comparisonData.salesChange >= 0 ? '+' : ''}
                  {formatCurrency(comparisonData.salesChange)} (
                  {comparisonData.salesChangePercent >= 0 ? '+' : ''}
                  {comparisonData.salesChangePercent.toFixed(1)}%)
                </span>
                {' • '}
                Profit:{' '}
                <span
                  className={`font-bold ${comparisonData.profitChange >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {comparisonData.profitChange >= 0 ? '+' : ''}
                  {formatCurrency(comparisonData.profitChange)} (
                  {comparisonData.profitChangePercent >= 0 ? '+' : ''}
                  {comparisonData.profitChangePercent.toFixed(1)}%)
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* High Level Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 p-4 opacity-5">
            <TrendingUp size={100} />
          </div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
            Total Revenue
          </p>
          <h3 className="text-3xl font-extrabold text-slate-900">
            {stats.totalSales.toLocaleString()} ৳
          </h3>
          {comparisonData && (
            <div
              className={`mt-3 flex items-center gap-1 text-sm font-bold ${comparisonData.salesChange >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {comparisonData.salesChange >= 0 ? (
                <ArrowUpRight size={16} />
              ) : (
                <ArrowDownRight size={16} />
              )}
              {Math.abs(comparisonData.salesChangePercent).toFixed(1)}% vs {comparisonData.period}
            </div>
          )}
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded">
            <CheckCircle2 size={12} /> Gross Income
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 p-4 opacity-5">
            <TrendingDown size={100} />
          </div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
            Total Expenses
          </p>
          <h3 className="text-3xl font-extrabold text-slate-900">
            {stats.totalExpenses.toLocaleString()} ৳
          </h3>
          {comparisonData && (
            <div
              className={`mt-3 flex items-center gap-1 text-sm font-bold ${comparisonData.expensesChange <= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {comparisonData.expensesChange >= 0 ? (
                <ArrowUpRight size={16} />
              ) : (
                <ArrowDownRight size={16} />
              )}
              {Math.abs(comparisonData.expensesChangePercent).toFixed(1)}% vs{' '}
              {comparisonData.period}
            </div>
          )}
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-rose-600 bg-rose-50 w-fit px-2 py-1 rounded">
            <AlertCircle size={12} /> Variable + Fixed
          </div>
        </div>

        <div
          className={`p-6 rounded-xl border shadow-sm relative overflow-hidden text-white ${stats.profit >= 0 ? 'bg-gradient-to-br from-emerald-600 to-emerald-800 border-emerald-600' : 'bg-gradient-to-br from-rose-600 to-rose-800 border-rose-600'}`}
        >
          <p className="text-sm font-bold text-white/80 uppercase tracking-wider mb-2">
            {stats.profit >= 0 ? 'Net Profit' : 'Net Loss'}
          </p>
          <h3 className="text-3xl font-extrabold text-white">
            {stats.profit >= 0 ? '+' : ''}
            {stats.profit.toLocaleString()} ৳
          </h3>
          {comparisonData && (
            <div
              className={`mt-3 flex items-center gap-1 text-sm font-bold ${comparisonData.profitChange >= 0 ? 'text-white' : 'text-white/70'}`}
            >
              {comparisonData.profitChange >= 0 ? (
                <ArrowUpRight size={16} />
              ) : (
                <ArrowDownRight size={16} />
              )}
              {Math.abs(comparisonData.profitChangePercent).toFixed(1)}% vs {comparisonData.period}
            </div>
          )}
          <p className="mt-4 text-xs text-white/70 font-medium">
            {stats.profit >= 0
              ? 'Excellent performance! Keep growing.'
              : 'Attention required. Review costs immediately.'}
          </p>
        </div>
      </div>

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Profit Margin"
          value={`${kpis.profitMargin.toFixed(1)}%`}
          icon={Percent}
          colorClass="text-emerald-600"
          bgClass="bg-emerald-100"
        />
        <StatCard
          title="Gross Margin"
          value={`${kpis.grossMargin.toFixed(1)}%`}
          icon={TrendingUp}
          colorClass="text-blue-600"
          bgClass="bg-blue-100"
        />
        <StatCard
          title="Expense Ratio"
          value={`${kpis.expenseRatio.toFixed(1)}%`}
          icon={AlertCircle}
          colorClass="text-orange-600"
          bgClass="bg-orange-100"
        />
        <StatCard
          title="In-Store Revenue"
          value={formatCurrency(kpis.channelBreakdown.inStore.revenue)}
          icon={Building2}
          colorClass="text-purple-600"
          bgClass="bg-purple-100"
        />
      </div>

      {/* Trend Charts */}
      {trendData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue & Expense Trend */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <LineChart className="text-blue-600" size={20} />
              <h3 className="font-bold text-slate-800 text-lg">Revenue & Expense Trend</h3>
            </div>
            <div className="space-y-3">
              {trendData.map((day, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-20 text-xs font-semibold text-slate-600">
                    {day.date.split('/').slice(0, 2).join('/')}
                  </div>
                  <div className="flex-1 flex gap-2">
                    <div className="relative flex-1 bg-slate-100 rounded-full h-8 flex items-center">
                      <div
                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full flex items-center justify-end pr-2"
                        style={{
                          width: `${Math.min((day.sales / Math.max(...trendData.map((d) => d.sales))) * 100, 100)}%`,
                        }}
                      >
                        <span className="text-xs font-bold text-white">
                          {(day.sales / 1000).toFixed(0)}k
                        </span>
                      </div>
                    </div>
                    <div className="relative flex-1 bg-slate-100 rounded-full h-8 flex items-center">
                      <div
                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full flex items-center justify-end pr-2"
                        style={{
                          width: `${Math.min((day.expenses / Math.max(...trendData.map((d) => d.expenses))) * 100, 100)}%`,
                        }}
                      >
                        <span className="text-xs font-bold text-white">
                          {(day.expenses / 1000).toFixed(0)}k
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-slate-600">Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-slate-600">Expenses</span>
              </div>
            </div>
          </div>

          {/* Channel Performance */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <PieChart className="text-purple-600" size={20} />
              <h3 className="font-bold text-slate-800 text-lg">Channel Performance</h3>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-slate-700">In-Store</span>
                  <span className="text-sm font-bold text-purple-600">
                    {formatCurrency(kpis.channelBreakdown.inStore.revenue)} (
                    {kpis.channelBreakdown.inStore.share.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"
                    style={{ width: `${kpis.channelBreakdown.inStore.share}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-slate-700">Foodpanda</span>
                  <span className="text-sm font-bold text-pink-600">
                    {formatCurrency(kpis.channelBreakdown.foodpanda.revenue)} (
                    {kpis.channelBreakdown.foodpanda.share.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-pink-400 to-pink-600 rounded-full"
                    style={{ width: `${kpis.channelBreakdown.foodpanda.share}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-slate-700">Foodi</span>
                  <span className="text-sm font-bold text-orange-600">
                    {formatCurrency(kpis.channelBreakdown.foodi.revenue)} (
                    {kpis.channelBreakdown.foodi.share.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full"
                    style={{ width: `${kpis.channelBreakdown.foodi.share}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* P&L Statement */}
        <div className="lg:col-span-2 bg-white border border-slate-200 shadow-lg rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-lg">Profit & Loss Statement</h3>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Unaudited
            </span>
          </div>
          <div className="p-8 space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <p className="font-bold text-slate-900 text-lg">Total Sales</p>
              </div>
              <p className="font-bold text-slate-900 text-lg">
                {stats.totalSales.toLocaleString()} ৳
              </p>
            </div>
            <div className="border-b border-slate-100"></div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-rose-600">
                <span className="font-medium">(-) Variable Costs (COGS)</span>
                <span className="font-bold">({stats.totalProductCost.toLocaleString()}) ৳</span>
              </div>
              <p className="text-xs text-slate-400 pl-4">
                Raw materials, packaging, variable costs
              </p>
            </div>

            <div className="flex justify-between items-center py-3 px-4 bg-slate-50 rounded-lg border border-slate-100">
              <span className="font-bold text-slate-700 uppercase text-sm">Gross Profit</span>
              <span
                className={`font-bold text-lg ${stats.grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
              >
                {stats.grossProfit.toLocaleString()} ৳
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-purple-600">
                <span className="font-medium">(-) Fixed Costs (OpEx)</span>
                <span className="font-bold">({stats.totalFixedCost.toLocaleString()}) ৳</span>
              </div>
              <p className="text-xs text-slate-400 pl-4">Rent, salaries, utilities, maintenance</p>
            </div>

            <div className="border-b-2 border-slate-900 my-4"></div>

            <div className="flex justify-between items-center">
              <div>
                <span
                  className={`text-2xl font-black uppercase ${stats.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}
                >
                  {stats.profit >= 0 ? 'NET PROFIT' : 'NET LOSS'}
                </span>
                <p className="text-xs text-slate-500 font-medium mt-1">Bottom Line Result</p>
              </div>
              <span
                className={`text-3xl font-black ${stats.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}
              >
                {stats.profit.toLocaleString()} ৳
              </span>
            </div>
          </div>
        </div>

        {/* Top Cost Drivers */}
        <div className="space-y-6">
          {/* Top 5 Variable Costs */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden h-fit">
            <div className="p-4 border-b border-slate-100 bg-orange-50 flex items-center gap-2">
              <PieChart size={18} className="text-orange-600" />
              <h3 className="font-bold text-slate-800 text-sm uppercase">Top 5 Product Costs</h3>
            </div>
            <div className="p-0">
              {stats.topProducts.map((item, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="font-bold text-slate-700 text-sm">{item.name}</p>
                    <p className="text-xs text-slate-400">
                      {item.qty} {item.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-600 text-sm">
                      -{item.cost.toLocaleString()} ৳
                    </p>
                    <div className="h-1.5 w-16 bg-slate-100 rounded-full mt-1 ml-auto overflow-hidden">
                      <div
                        className="h-full bg-orange-400 rounded-full"
                        style={{
                          width: `${Math.min((item.cost / (stats.totalProductCost || 1)) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
              {stats.topProducts.length === 0 && (
                <div className="p-6 text-center text-slate-400 text-sm">No data available</div>
              )}
            </div>
          </div>

          {/* Top 5 Fixed Costs */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden h-fit">
            <div className="p-4 border-b border-slate-100 bg-purple-50 flex items-center gap-2">
              <Building2 size={18} className="text-purple-600" />
              <h3 className="font-bold text-slate-800 text-sm uppercase">Top 5 Fixed Costs</h3>
            </div>
            <div className="p-0">
              {stats.topFixed.map((item, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                >
                  <p className="font-bold text-slate-700 text-sm">{item.name}</p>
                  <div className="text-right">
                    <p className="font-bold text-purple-600 text-sm">
                      -{item.amount.toLocaleString()} ৳
                    </p>
                    <div className="h-1.5 w-16 bg-slate-100 rounded-full mt-1 ml-auto overflow-hidden">
                      <div
                        className="h-full bg-purple-400 rounded-full"
                        style={{
                          width: `${Math.min((item.amount / (stats.totalFixedCost || 1)) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
              {stats.topFixed.length === 0 && (
                <div className="p-6 text-center text-slate-400 text-sm">No data available</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="text-center pt-8 pb-4 text-slate-400 text-xs font-medium uppercase tracking-widest">
        Café ERP System • Generated Report
      </div>
    </div>
  );
}
