import { useState, useMemo } from 'react';
import {
  Wallet,
  Pencil,
  Trash2,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  PlusCircle,
  Store,
  Calendar as CalendarIcon,
  Hash,
  Briefcase,
  AlertCircle,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import { useERP } from '@/context/ERPContext';
import { ManagerPasswordModal, EditTransactionModal, Pagination } from '@/shared/components/ui';
import { useClientPagination } from '@/hooks';
import type { Transaction, PaymentMethod } from '@/core/types';
import RangeCalendar from '@/features/CustomCalender';
import { handleError } from '@/shared/utils';

type CashAddedSource = 'cash' | 'bank' | 'bkash' | 'fund_balance';

type TransactionMode = 'transfer' | 'invest' | 'withdraw' | 'cash_added';

type TransferDirection = 'cash_to_fund' | 'fund_to_cash';

type StatCardProps = {
  label: string;
  value: number;
  icon: LucideIcon;
  colorClass: string;
  bgClass: string;
};

const StatCard = ({ label, value, icon: Icon, colorClass, bgClass }: StatCardProps) => (
  <div
    className={`p-4 rounded-xl border ${bgClass} flex items-center gap-4 transition-all hover:shadow-md`}
  >
    <div className={`p-3 rounded-lg bg-white shadow-sm ${colorClass}`}>
      <Icon size={20} />
    </div>
    <div>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-bold ${colorClass}`}>{value.toLocaleString()} ৳</p>
    </div>
  </div>
);

export default function FundManagement() {
  const {
    stats,
    filteredTransactions,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    itemNames,
    suppliers,
    setCustomDateRange,
  } = useERP();

  // --- Local State ---
  const [mode, setMode] = useState<TransactionMode>('transfer');
  const [transferDirection, setTransferDirection] = useState<TransferDirection>('cash_to_fund');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [cashAddedSource, setCashAddedSource] = useState<CashAddedSource>('bkash');
  const [transactionDate, setTransactionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [reference, setReference] = useState('');

  // --- Modal States ---
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [passwordModalTitle, setPasswordModalTitle] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // --- Handlers ---
  const handleModeChange = (newMode: TransactionMode) => {
    setMode(newMode);
    // Auto-set sensible defaults based on mode
    if (newMode === 'transfer') {
      setTransferDirection('cash_to_fund');
      setDescription('Sales → Monthly Fund');
      setMethod('cash');
    } else if (newMode === 'invest') {
      setDescription('Owner Capital Injection');
      setMethod('cash');
    } else if (newMode === 'withdraw') {
      setDescription('Owner Profit Withdrawal');
      setMethod('cash');
    } else if (newMode === 'cash_added') {
      setDescription('Cash Added to Drawer');
      setCashAddedSource('bkash');
    }
  };

  const handleTransferDirectionChange = (dir: TransferDirection) => {
    setTransferDirection(dir);
    if (dir === 'cash_to_fund') {
      setDescription('Sales → Monthly Fund');
      // Keep current method selection; default remains cash.
    } else {
      setDescription('Monthly Fund → Available Liquidity');
      // Keep current method selection; this represents the source (cash/bank/bkash).
    }
  };

  const handleSubmit = () => {
    try {
      if (!amount) return;

      const parseLocalDate = (isoDate: string) => {
        const [year, month, day] = isoDate.split('-').map(Number);
        return new Date(year, month - 1, day);
      };

      let type: 'fund_in' | 'fund_out' | 'cash_to_fund' | 'cash_added' | 'fund_to_cash' = 'fund_in';

      if (mode === 'transfer') type = transferDirection;
      else if (mode === 'invest') type = 'fund_in';
      else if (mode === 'withdraw') type = 'fund_out';
      else if (mode === 'cash_added')
        type = cashAddedSource === 'fund_balance' ? 'fund_to_cash' : 'cash_added';

      // Construct robust description
      const finalDescription = reference ? `${description} (Ref: ${reference})` : description;

      const resolvedMethod: PaymentMethod =
        mode === 'cash_added'
          ? cashAddedSource === 'fund_balance'
            ? method
            : (cashAddedSource as PaymentMethod)
          : method;

      addTransaction({
        type,
        amount: Number(amount),
        // fund/cash operations can be recorded as cash/bank/bkash
        // - For cash_added: method is the SOURCE (bank/bkash/cash) OR selected fund source when using fund_balance
        // - For other modes: method is the selected method
        method: resolvedMethod,
        description:
          type === 'fund_to_cash' ? `${finalDescription} (From Fund Balance)` : finalDescription,
        date: parseLocalDate(transactionDate), // Use selected date (local)
      });

      // Reset form
      setAmount('');
      setReference('');
      if (mode === 'transfer') {
        setDescription(
          transferDirection === 'fund_to_cash'
            ? 'Monthly Fund → Available Liquidity'
            : 'Sales → Monthly Fund'
        );
      } else if (mode === 'invest') setDescription('Owner Capital Injection');
      else if (mode === 'withdraw') setDescription('Owner Profit Withdrawal');
      else setDescription('Cash Added to Drawer');
    } catch (error) {
      handleError(error, {
        action: `fund_${mode}`,
        severity: 'critical',
        metadata: { amount, mode, method, description },
      });
    }
  };

  const handleManagerDelete = (id: string) => {
    setPasswordModalTitle('Delete Transaction');
    setPendingAction(() => () => {
      try {
        deleteTransaction(id);
      } catch (error) {
        handleError(error, {
          action: 'delete_fund_transaction',
          severity: 'high',
          metadata: { transactionId: id },
        });
      }
    });
    setPasswordModalOpen(true);
  };

  const handleManagerEdit = (transaction: Transaction) => {
    setPasswordModalTitle('Edit Transaction');
    setPendingAction(() => () => {
      setEditingTransaction(transaction);
      setEditModalOpen(true);
    });
    setPasswordModalOpen(true);
  };

  // --- Data Processing ---
  const fundTransactions = useMemo(
    () =>
      filteredTransactions.filter((t) =>
        ['fund_in', 'fund_out', 'cash_to_fund', 'cash_added', 'fund_to_cash'].includes(t.type)
      ),
    [filteredTransactions]
  );

  // Calculate View Stats (based on current filter/pagination context)
  const viewStats = useMemo(() => {
    const totalIn = fundTransactions
      .filter((t) => t.type === 'fund_in' || t.type === 'cash_to_fund')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalOut = fundTransactions
      .filter((t) => t.type === 'fund_out' || t.type === 'fund_to_cash')
      .reduce((sum, t) => sum + t.amount, 0);
    return { totalIn, totalOut, net: totalIn - totalOut };
  }, [fundTransactions]);

  const { paginatedData: paginatedFunds, pagination } = useClientPagination(fundTransactions, {
    initialPageSize: 10,
    pageSizeOptions: [5, 10, 20],
  });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      {/* --- Modals --- */}
      <ManagerPasswordModal
        isOpen={passwordModalOpen}
        onClose={() => {
          setPasswordModalOpen(false);
          setPendingAction(null);
        }}
        onConfirm={() => {
          if (pendingAction) pendingAction();
        }}
        title={passwordModalTitle}
      />

      <EditTransactionModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingTransaction(null);
        }}
        transaction={editingTransaction}
        onSave={(updated) => {
          try {
            updateTransaction(updated);
          } catch (error) {
            handleError(error, {
              action: 'update_fund_transaction',
              severity: 'high',
              metadata: { transactionId: updated.id },
            });
          }
        }}
        itemNames={itemNames}
        suppliers={suppliers}
      />

      {/* --- Left Column: Operations Panel (4 cols) --- */}
      <div className="xl:col-span-4 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                <Wallet className="text-indigo-300" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Fund Operations</h2>
                <p className="text-slate-400 text-xs">Manage capital flow & reserves</p>
              </div>
            </div>

            {/* Mode Selectors */}
            <div className="grid grid-cols-4 gap-2 mt-6 p-1 bg-slate-700/50 rounded-xl">
              <button
                onClick={() => handleModeChange('transfer')}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${mode === 'transfer' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-300 hover:bg-white/5'}`}
              >
                Transfer
              </button>
              <button
                onClick={() => handleModeChange('invest')}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${mode === 'invest' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-300 hover:bg-white/5'}`}
              >
                Invest
              </button>
              <button
                onClick={() => handleModeChange('withdraw')}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${mode === 'withdraw' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-300 hover:bg-white/5'}`}
              >
                Withdraw
              </button>
              <button
                onClick={() => handleModeChange('cash_added')}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${mode === 'cash_added' ? 'bg-cyan-500 text-white shadow-lg' : 'text-slate-300 hover:bg-white/5'}`}
              >
                Cash Added
              </button>
            </div>
          </div>

          {/* Form Body */}
          <div className="p-6 space-y-5">
            {/* Context Banner */}
            <div
              className={`p-3 rounded-lg border flex items-start gap-3 ${
                mode === 'transfer'
                  ? 'bg-amber-50 border-amber-100'
                  : mode === 'invest'
                    ? 'bg-emerald-50 border-emerald-100'
                    : mode === 'withdraw'
                      ? 'bg-rose-50 border-rose-100'
                      : 'bg-cyan-50 border-cyan-100'
              }`}
            >
              {mode === 'transfer' && (
                <Store className="text-amber-600 shrink-0 mt-0.5" size={18} />
              )}
              {mode === 'invest' && (
                <TrendingUp className="text-emerald-600 shrink-0 mt-0.5" size={18} />
              )}
              {mode === 'withdraw' && (
                <Briefcase className="text-rose-600 shrink-0 mt-0.5" size={18} />
              )}
              {mode === 'cash_added' && (
                <PlusCircle className="text-cyan-600 shrink-0 mt-0.5" size={18} />
              )}
              <div>
                <h4
                  className={`text-sm font-bold ${
                    mode === 'transfer'
                      ? 'text-amber-800'
                      : mode === 'invest'
                        ? 'text-emerald-800'
                        : mode === 'withdraw'
                          ? 'text-rose-800'
                          : 'text-cyan-800'
                  }`}
                >
                  {mode === 'transfer'
                    ? transferDirection === 'fund_to_cash'
                      ? 'Monthly Fund → Available Liquidity'
                      : 'Sales → Monthly Fund'
                    : mode === 'invest'
                      ? 'Add External Capital'
                      : mode === 'withdraw'
                        ? 'Withdraw Funds'
                        : 'Add Cash to Drawer'}
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {mode === 'transfer'
                    ? transferDirection === 'fund_to_cash'
                      ? 'Move money from Monthly Fund into Available Liquidity (Cash/Bank/bKash).'
                      : 'Move sales money from Available Liquidity into Monthly Fund.'
                    : mode === 'invest'
                      ? 'Inject new capital from owners or external loans.'
                      : mode === 'withdraw'
                        ? 'Withdraw profit, owner salary, or emergency cash.'
                        : 'Bring cash into the drawer from Bank/bKash, or record an external cash top-up.'}
                </p>
              </div>
            </div>

            {/* Transfer Direction (only for Transfer mode) */}
            {mode === 'transfer' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">
                  Transfer Type
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-amber-50 border border-amber-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleTransferDirectionChange('cash_to_fund')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      transferDirection === 'cash_to_fund'
                        ? 'bg-amber-600 text-white shadow'
                        : 'text-amber-900/80 hover:bg-white/70'
                    }`}
                  >
                    Sales → Monthly Fund
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTransferDirectionChange('fund_to_cash')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      transferDirection === 'fund_to_cash'
                        ? 'bg-sky-600 text-white shadow'
                        : 'text-sky-900/80 hover:bg-white/70'
                    }`}
                  >
                    Monthly Fund → Available Liquidity
                  </button>
                </div>
              </div>
            )}

            {/* Inputs */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-slate-400 font-bold">৳</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-lg text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">
                  Date
                </label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-3 text-slate-400" size={16} />
                  <input
                    type="date"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">
                  {mode === 'cash_added' ? 'Source' : 'Method'}
                </label>
                <div className="relative">
                  <select
                    value={mode === 'cash_added' ? cashAddedSource : method}
                    onChange={(e) => {
                      if (mode === 'cash_added')
                        setCashAddedSource(e.target.value as CashAddedSource);
                      else setMethod(e.target.value as PaymentMethod);
                    }}
                    className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium appearance-none focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {mode === 'cash_added' ? (
                      <>
                        <option value="cash">External Cash</option>
                        <option value="bank">From Bank</option>
                        <option value="bkash">From bKash / MFS</option>
                        <option value="fund_balance">From Fund Balance</option>
                      </>
                    ) : (
                      <>
                        <option value="cash">Cash Drawer</option>
                        <option value="bank">Bank Account</option>
                        <option value="bkash">bKash / MFS</option>
                      </>
                    )}
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-3 text-slate-400 pointer-events-none"
                    size={14}
                  />
                </div>
              </div>
            </div>

            {mode === 'cash_added' && cashAddedSource === 'fund_balance' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">
                  Fund Source Method
                </label>
                <div className="relative">
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                    className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium appearance-none focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank</option>
                    <option value="bkash">bKash</option>
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-3 text-slate-400 pointer-events-none"
                    size={14}
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1 ml-1">
                  Choose which fund source was used to refill the cash drawer.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Details about this transaction..."
              />
            </div>

            {/* Reference - New Feature */}
            {mode !== 'transfer' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">
                  Ref / Cheque No. (Optional)
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-3 text-slate-400" size={14} />
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. TRX-12345"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleSubmit}
              className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transform active:scale-95 transition-all flex items-center justify-center gap-2 ${
                mode === 'transfer'
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
                  : mode === 'invest'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                    : mode === 'withdraw'
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                      : 'bg-cyan-600 hover:bg-cyan-700 shadow-cyan-200'
              }`}
            >
              {mode === 'transfer' && <ArrowRightLeft size={18} />}
              {mode === 'invest' && <TrendingUp size={18} />}
              {mode === 'withdraw' && <TrendingDown size={18} />}
              {mode === 'cash_added' && <PlusCircle size={18} />}
              Confirm{' '}
              {mode === 'transfer'
                ? 'Transfer'
                : mode === 'invest'
                  ? 'Investment'
                  : mode === 'withdraw'
                    ? 'Withdrawal'
                    : 'Cash Added'}
            </button>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-indigo-500 mt-0.5" size={18} />
            <div>
              <h5 className="text-sm font-bold text-indigo-900">Pro Tip</h5>
              <p className="text-xs text-indigo-700 mt-1">
                Always use "Transfer" when moving money from the till to the safe. Use "Invest" only
                when adding new money from outside the business.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* --- Right Column: History & Intelligence (8 cols) --- */}
      <div className="xl:col-span-8 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Accumulated Fund"
            value={stats.fundTotal}
            icon={Wallet}
            colorClass="text-indigo-600"
            bgClass="bg-indigo-50 border-indigo-100"
          />
          <StatCard
            label="Period Inflow"
            value={viewStats.totalIn}
            icon={TrendingUp}
            colorClass="text-emerald-600"
            bgClass="bg-white border-slate-200"
          />
          <StatCard
            label="Period Outflow"
            value={viewStats.totalOut}
            icon={TrendingDown}
            colorClass="text-rose-600"
            bgClass="bg-white border-slate-200"
          />
        </div>

        {/* Transaction Table Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[600px]">
          {/* Table Header / Filters */}
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-800">Transaction History</h3>
              <p className="text-xs text-slate-500">Audit trail of all fund movements</p>
            </div>
            <div className="flex items-center gap-2">
              <RangeCalendar onRangeChange={setCustomDateRange} align="right" />
            </div>
          </div>

          {/* Table Content */}
          <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-slate-300">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-[120px]">
                    Date
                  </th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-[140px]">
                    Type
                  </th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider w-[150px]">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider w-[100px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedFunds.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-slate-50 rounded-full">
                          <Wallet size={32} className="opacity-50" />
                        </div>
                        <p>No transactions found for this period</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedFunds.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-3.5">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-700">
                            {t.date?.toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                            })}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {t.date?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide border ${
                            t.type === 'fund_in'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : t.type === 'cash_to_fund'
                                ? 'bg-amber-50 text-amber-700 border-amber-100'
                                : t.type === 'fund_out'
                                  ? 'bg-rose-50 text-rose-700 border-rose-100'
                                  : t.type === 'fund_to_cash'
                                    ? 'bg-sky-50 text-sky-700 border-sky-100'
                                    : 'bg-cyan-50 text-cyan-700 border-cyan-100'
                          }`}
                        >
                          {t.type === 'fund_in' && <TrendingUp size={12} />}
                          {t.type === 'cash_to_fund' && <ArrowRightLeft size={12} />}
                          {t.type === 'fund_out' && <TrendingDown size={12} />}
                          {t.type === 'cash_added' && <PlusCircle size={12} />}
                          {t.type === 'fund_to_cash' && <ArrowRightLeft size={12} />}
                          {t.type === 'fund_in'
                            ? 'Invest'
                            : t.type === 'cash_to_fund'
                              ? 'Transfer'
                              : t.type === 'fund_out'
                                ? 'Withdraw'
                                : t.type === 'fund_to_cash'
                                  ? 'Fund → Liquidity'
                                  : 'Cash Added'}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="text-sm text-slate-600 font-medium block truncate max-w-[280px]">
                          {t.description}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                          {t.method}
                        </span>
                      </td>
                      <td
                        className={`px-6 py-3.5 text-right font-bold text-sm ${
                          t.type === 'fund_out'
                            ? 'text-rose-600'
                            : t.type === 'cash_added'
                              ? 'text-cyan-700'
                              : 'text-emerald-600'
                        }`}
                      >
                        {t.type === 'fund_out' ? '-' : '+'} {t.amount.toLocaleString()} ৳
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleManagerEdit(t)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleManagerDelete(t.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
            <Pagination pagination={pagination} />
          </div>
        </div>
      </div>
    </div>
  );
}
