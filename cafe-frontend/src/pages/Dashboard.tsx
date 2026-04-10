import { useState, useMemo, lazy, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import {
  TrendingUp,
  DollarSign,
  Wallet,
  PiggyBank,
  ArrowRightLeft,
  PlusCircle,
  TrendingDown,
  Bike,
  Smartphone,
  Landmark,
  Banknote,
} from 'lucide-react';
import { useERP } from '@/context/ERPContext';
import { StatCard, ButtonLoading, EnhancedTable, SkeletonChart } from '@/shared/components/ui';
import { saleSchema, type SaleFormData, handleError } from '@/shared/utils';
import type { Transaction } from '@/core/types';
import RangeCalendar from '@/features/CustomCalender';
import { calculatePaymentMethodBalances } from '@/shared/utils/calculations';

const LazyComparisonChart = lazy(() =>
  import('@/shared/components/ui/AdvancedCharts').then((m) => ({ default: m.ComparisonChart }))
);

export default function Dashboard() {
  const { stats, transactions, filteredTransactions, addTransaction, setCustomDateRange } =
    useERP();

  const [loading, setLoading] = useState(false);

  // Form validation with react-hook-form + zod
  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<SaleFormData>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      amount: '',
      method: 'cash',
      channel: 'in_store',
      description: '',
    },
  });

  const handleSubmit = async (data: SaleFormData) => {
    try {
      setLoading(true);
      addTransaction({
        type: 'sale',
        amount: Number(data.amount),
        method: data.method,
        channel: data.channel,
        description: data.description || 'Sale',
      });
      toast.success('💰 Sale added successfully!');
      reset();
    } catch (error) {
      handleError(error, {
        action: 'add_sale',
        severity: 'high',
        metadata: {
          amount: data.amount,
          method: data.method,
          channel: data.channel,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  // Enhanced Table Column Definitions
  const columnHelper = createColumnHelper<Transaction>();
  const transactionColumns = useMemo(
    () =>
      [
        columnHelper.accessor('date', {
          header: 'Date & Time',
          cell: (info) => {
            const date = info.getValue();
            if (!date) return '-';
            return (
              <div className="text-xs">
                <div className="font-semibold text-slate-700">{date.toLocaleDateString()}</div>
                <div className="text-[10px] text-slate-400">
                  {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          },
        }),
        columnHelper.accessor('type', {
          header: 'Type',
          cell: (info) => {
            const type = info.getValue();
            return (
              <div
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  type === 'sale' || type === 'sale_adjustment'
                    ? 'bg-emerald-100 text-emerald-600'
                    : type === 'cash_added'
                      ? 'bg-cyan-100 text-cyan-700'
                      : type === 'fund_to_cash'
                        ? 'bg-sky-100 text-sky-700'
                        : type.includes('expense')
                          ? 'bg-rose-100 text-rose-600'
                          : 'bg-indigo-100 text-indigo-600'
                }`}
              >
                {type === 'sale' || type === 'sale_adjustment' ? (
                  <DollarSign size={10} />
                ) : type === 'cash_added' ? (
                  <PlusCircle size={10} />
                ) : type === 'fund_to_cash' ? (
                  <ArrowRightLeft size={10} />
                ) : type.includes('expense') ? (
                  <TrendingDown size={10} />
                ) : (
                  <ArrowRightLeft size={10} />
                )}
                {type.replace('_', ' ').toUpperCase()}
              </div>
            );
          },
        }),
        columnHelper.accessor('description', {
          header: 'Description',
          cell: (info) => (
            <span className="text-xs font-semibold text-slate-700">{info.getValue()}</span>
          ),
        }),
        columnHelper.accessor('amount', {
          header: 'Amount',
          cell: (info) => {
            const row = info.row.original;
            const rawValue = Number(info.getValue());
            const isSaleLike = row.type === 'sale' || row.type === 'sale_adjustment';
            const isPositiveByType =
              isSaleLike ||
              row.type === 'fund_in' ||
              row.type === 'cash_added' ||
              row.type === 'fund_to_cash';
            const showPositiveSign =
              row.type === 'sale_adjustment' ? rawValue >= 0 : isPositiveByType;
            const displayValue = row.type === 'sale_adjustment' ? Math.abs(rawValue) : rawValue;
            return (
              <span
                className={`text-xs font-bold ${
                  row.type === 'sale' || row.type === 'sale_adjustment' || row.type === 'fund_in'
                    ? 'text-emerald-600'
                    : row.type === 'cash_added'
                      ? 'text-cyan-700'
                      : row.type === 'fund_to_cash'
                        ? 'text-sky-700'
                        : 'text-slate-800'
                }`}
              >
                {showPositiveSign ? '+' : '-'}
                {displayValue} ৳
              </span>
            );
          },
        }),
      ] as ColumnDef<Transaction>[],
    []
  );
  const totalCosts = stats.totalProductCost + stats.totalFixedCost;

  // Keep Dashboard KPIs consistent with selected date range
  const paymentMethodsInRange = useMemo(
    () => calculatePaymentMethodBalances(filteredTransactions),
    [filteredTransactions]
  );

  const totalLiquidityInRange = paymentMethodsInRange.total.balance;

  const fundGeneratedInRange = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => {
      const val = Number(t.amount);
      if (t.type === 'cash_to_fund') return sum + val;
      if (t.type === 'fund_to_cash') return sum - val;
      return sum;
    }, 0);
  }, [filteredTransactions]);

  const dailyAvailableCashInRange = useMemo(() => {
    let net = 0;
    for (const t of filteredTransactions) {
      const val = Number(t.amount);
      if (t.type === 'sale' || t.type === 'sale_adjustment') net += val;
      else if (t.type === 'cash_added') net += val;
      else if (t.type === 'fund_to_cash') net += val;
      else if (t.type === 'fund_in') net += val;
      else if (t.type === 'fund_out') net -= val;
      else if (
        t.type === 'expense_product' ||
        t.type === 'expense_fixed' ||
        t.type === 'cash_to_fund'
      )
        net -= val;
    }
    return net;
  }, [filteredTransactions]);

  const salesComparisonData = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    startOfToday.setHours(0, 0, 0, 0);

    const key = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const label = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short' });

    const salesByDay = new Map<string, number>();
    for (const t of transactions) {
      if ((t.type !== 'sale' && t.type !== 'sale_adjustment') || !t.date) continue;
      const d = new Date(t.date);
      d.setHours(0, 0, 0, 0);
      const k = key(d);
      salesByDay.set(k, (salesByDay.get(k) ?? 0) + Number(t.amount));
    }

    const rows: Array<{ name: string; value: number; compare: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const current = new Date(startOfToday);
      current.setDate(current.getDate() - i);
      const prev = new Date(current);
      prev.setDate(prev.getDate() - 7);

      rows.push({
        name: label(current),
        value: salesByDay.get(key(current)) ?? 0,
        compare: salesByDay.get(key(prev)) ?? 0,
      });
    }
    return rows;
  }, [transactions]);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <RangeCalendar onRangeChange={setCustomDateRange} className="" />
      {/* Row 1: Key KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
        <StatCard
          title="Total Liquidity"
          value={`${totalLiquidityInRange.toLocaleString()} ৳`}
          subtext="Selected Range"
          icon={DollarSign}
          colorClass="text-amber-600"
          bgClass="bg-amber-50"
        />
        <StatCard
          title="Net Transfer to Monthly Fund"
          value={`${fundGeneratedInRange.toLocaleString()} ৳`}
          subtext="Selected Range"
          icon={PiggyBank}
          colorClass="text-indigo-600"
          bgClass="bg-indigo-50"
        />
        <StatCard
          title="Today’s Available Liquidity"
          value={`${dailyAvailableCashInRange.toLocaleString()} ৳`}
          subtext="Selected Range (Cash+Bank+bKash)"
          icon={Wallet}
          colorClass="text-cyan-600"
          bgClass="bg-cyan-50"
        />
        <StatCard
          title="Total Sales"
          value={`${stats.totalSales.toLocaleString()} ৳`}
          subtext="Gross Revenue"
          icon={TrendingUp}
          colorClass="text-emerald-600"
          bgClass="bg-emerald-50"
        />
        <StatCard
          title="Total Costs"
          value={`${totalCosts.toLocaleString()} ৳`}
          subtext="Product + Fixed"
          icon={TrendingDown}
          colorClass="text-rose-600"
          bgClass="bg-rose-50"
        />
      </div>

      {/* Row 1.5: Sales Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
        <StatCard
          title="Foodpanda Sales"
          value={`${stats.foodpandaSales.toLocaleString()} ৳`}
          subtext="Delivery Channel"
          icon={Bike}
          colorClass="text-orange-600"
          bgClass="bg-orange-50"
        />
        <StatCard
          title="Foodi Sales"
          value={`${stats.foodiSales.toLocaleString()} ৳`}
          subtext="Delivery Channel"
          icon={Bike}
          colorClass="text-yellow-700"
          bgClass="bg-yellow-50"
        />
        <StatCard
          title="Cash Sales"
          value={`${stats.cashSales.toLocaleString()} ৳`}
          subtext="Payment Method"
          icon={Banknote}
          colorClass="text-emerald-700"
          bgClass="bg-emerald-50"
        />
        <StatCard
          title="bKash Sales"
          value={`${stats.bkashSales.toLocaleString()} ৳`}
          subtext="Payment Method"
          icon={Smartphone}
          colorClass="text-fuchsia-700"
          bgClass="bg-fuchsia-50"
        />
        <StatCard
          title="Bank Sales"
          value={`${stats.bankSales.toLocaleString()} ৳`}
          subtext="Payment Method"
          icon={Landmark}
          colorClass="text-sky-700"
          bgClass="bg-sky-50"
        />
      </div>

      {/* Row 2: Fund Flow & Cost Flow Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fund Flow Analysis Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <ArrowRightLeft size={18} className="text-indigo-500" /> Fund Flow Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-xs text-slate-500 font-bold uppercase">External Fund Balance</p>
              <p className="text-2xl font-bold text-indigo-600">
                {stats.externalFundBalance.total.toLocaleString()} ৳
              </p>
              <div className="text-xs text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Cash:</span>{' '}
                  <span>{stats.externalFundBalance.cash.toLocaleString()} ৳</span>
                </div>
                <div className="flex justify-between">
                  <span>Bank:</span>{' '}
                  <span>{stats.externalFundBalance.bank.toLocaleString()} ৳</span>
                </div>
                <div className="flex justify-between">
                  <span>bKash:</span>{' '}
                  <span>{stats.externalFundBalance.bkash.toLocaleString()} ৳</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-slate-500 font-bold uppercase">Withdrawn (External)</p>
              <p className="text-2xl font-bold text-rose-600">
                -{stats.fundWithdrawn.total.toLocaleString()} ৳
              </p>
              <div className="text-xs text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Cash:</span> <span>{stats.fundWithdrawn.cash.toLocaleString()} ৳</span>
                </div>
                <div className="flex justify-between">
                  <span>Bank:</span> <span>{stats.fundWithdrawn.bank.toLocaleString()} ৳</span>
                </div>
                <div className="flex justify-between">
                  <span>bKash:</span> <span>{stats.fundWithdrawn.bkash.toLocaleString()} ৳</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cost Flow Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingDown size={18} className="text-orange-500" /> Cost Flow
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-xs text-slate-500 font-bold uppercase">Variable Costs</p>
              <p className="text-2xl font-bold text-orange-600">
                {stats.totalProductCost.toLocaleString()} ৳
              </p>
              <p className="text-xs text-slate-400">Ingredients & packaging</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-slate-500 font-bold uppercase">Fixed Costs</p>
              <p className="text-2xl font-bold text-purple-600">
                {stats.totalFixedCost.toLocaleString()} ৳
              </p>
              <p className="text-xs text-slate-400">Rent & Salary</p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Quick Sales & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Add Form */}
          <div className="bg-emerald-900 text-white p-5 md:p-6 rounded-2xl shadow-xl shadow-emerald-900/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-32 bg-emerald-800/20 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <h3 className="text-lg font-bold mb-4 md:mb-6 flex items-center gap-2 relative z-10">
              <PlusCircle size={20} className="text-emerald-400" /> Quick Sale
            </h3>
            <form onSubmit={handleFormSubmit(handleSubmit)} className="space-y-4 relative z-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-emerald-300 uppercase mb-1 block">
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('amount')}
                    className={`w-full p-2.5 bg-emerald-800/50 border ${errors.amount ? 'border-red-400' : 'border-emerald-700'} rounded-lg text-white placeholder-emerald-500/50 focus:outline-none focus:border-emerald-500`}
                    placeholder="0.00"
                  />
                  {errors.amount && (
                    <p className="text-xs text-red-300 mt-1">{errors.amount.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-emerald-300 uppercase mb-1 block">
                    Platform
                  </label>
                  <select
                    {...register('channel')}
                    className="w-full p-2.5 bg-emerald-800/50 border border-emerald-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="in_store">In-Store</option>
                    <option value="foodpanda">Foodpanda</option>
                    <option value="foodi">Foodi</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-emerald-300 uppercase mb-1 block">
                    Payment
                  </label>
                  <select
                    {...register('method')}
                    className="w-full p-2.5 bg-emerald-800/50 border border-emerald-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank</option>
                    <option value="bkash">bKash</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                <div className="sm:col-span-3">
                  <label className="text-xs font-bold text-emerald-300 uppercase mb-1 block">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    {...register('description')}
                    className="w-full p-2.5 bg-emerald-800/50 border border-emerald-700 rounded-lg text-white placeholder-emerald-500/50 focus:outline-none focus:border-emerald-500"
                    placeholder="e.g., Customer order, Coffee & pastry..."
                  />
                </div>
                <ButtonLoading
                  loading={isSubmitting || loading}
                  type="submit"
                  className="w-full bg-emerald-400 text-emerald-900 p-2.5 rounded-lg font-bold hover:bg-emerald-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  💰 Add Sale
                </ButtonLoading>
              </div>
            </form>
          </div>

          {/* Sales Comparison (real data) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <Suspense fallback={<SkeletonChart />}>
              <LazyComparisonChart data={salesComparisonData} title="Last 7 Days vs Prior 7 Days" />
            </Suspense>
          </div>
        </div>

        {/* Recent Activity with Enhanced Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h3 className="font-bold text-slate-700 text-sm">Recent Activity</h3>
          </div>
          <div className="p-3">
            <EnhancedTable
              data={filteredTransactions.slice(0, 8)}
              columns={transactionColumns}
              searchPlaceholder="Search transactions..."
              exportFileName="recent-activity"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
