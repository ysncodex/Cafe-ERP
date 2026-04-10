import { useMemo, useState } from 'react';
import { Calendar, Pencil, TrendingUp } from 'lucide-react';
import { useERP } from '@/context/ERPContext';
import type { DailyRecord } from '@/core/types';
import RangeCalendar from '@/features/CustomCalender';
import { useClientPagination } from '@/hooks';
import { ManagerPasswordModal, Pagination } from '@/shared/components/ui';
import { getStoredUser, handleError } from '@/shared/utils';

export default function DailyRecord() {
  const { dailyRecords, setCustomDateRange, addTransaction } = useERP();

  const canEdit = getStoredUser()?.role === 'owner';

  // Manager Password Modal States
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [passwordModalTitle, setPasswordModalTitle] = useState('');

  // Edit Daily Sales Modal States
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DailyRecord | null>(null);
  const [editValues, setEditValues] = useState({ cashSales: 0, bkashSales: 0, bankSales: 0 });

  const colSpan = canEdit ? 11 : 10;

  const handleManagerEdit = (record: DailyRecord) => {
    setPasswordModalTitle('Edit Daily Sales');
    setPendingAction(() => () => {
      setEditingRecord(record);
      setEditValues({
        cashSales: Number(record.cashSales) || 0,
        bkashSales: Number(record.bkashSales) || 0,
        bankSales: Number(record.bankSales) || 0,
      });
      setEditModalOpen(true);
    });
    setPasswordModalOpen(true);
  };

  const handleSaveEdits = () => {
    try {
      if (!editingRecord?.date) return;

      const date = new Date(editingRecord.date);
      date.setHours(12, 0, 0, 0);

      const current = {
        cashSales: Number(editingRecord.cashSales) || 0,
        bkashSales: Number(editingRecord.bkashSales) || 0,
        bankSales: Number(editingRecord.bankSales) || 0,
      };

      const next = {
        cashSales: Number(editValues.cashSales) || 0,
        bkashSales: Number(editValues.bkashSales) || 0,
        bankSales: Number(editValues.bankSales) || 0,
      };

      const diffs = {
        cash: next.cashSales - current.cashSales,
        bkash: next.bkashSales - current.bkashSales,
        bank: next.bankSales - current.bankSales,
      };

      const dateLabel = new Date(editingRecord.date).toLocaleDateString();
      (['cash', 'bkash', 'bank'] as const).forEach((method) => {
        const diff = diffs[method];
        if (!diff) return;
        addTransaction({
          type: 'sale_adjustment',
          method,
          amount: diff,
          channel: 'in_store',
          description: `Sales adjustment (${dateLabel})`,
          date,
        });
      });

      setEditModalOpen(false);
      setEditingRecord(null);
    } catch (error) {
      handleError(error, {
        action: 'save_daily_record_edits',
        severity: 'high',
      });
    }
  };

  const tableMinWidth = useMemo(() => (canEdit ? 'min-w-[1300px]' : 'min-w-[1200px]'), [canEdit]);

  // Client-side pagination
  const { paginatedData, pagination } = useClientPagination(dailyRecords, {
    initialPageSize: 10,
    pageSizeOptions: [5, 10, 20],
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
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

      {editModalOpen && editingRecord && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600">
                <Pencil size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Edit Sales</h3>
                <p className="text-xs text-slate-500">
                  {new Date(editingRecord.date).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                  Cash Sales
                </label>
                <input
                  type="number"
                  min={0}
                  value={editValues.cashSales}
                  onChange={(e) =>
                    setEditValues((v) => ({ ...v, cashSales: Number(e.target.value) }))
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                  bKash Sales
                </label>
                <input
                  type="number"
                  min={0}
                  value={editValues.bkashSales}
                  onChange={(e) =>
                    setEditValues((v) => ({ ...v, bkashSales: Number(e.target.value) }))
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                  Bank Sales
                </label>
                <input
                  type="number"
                  min={0}
                  value={editValues.bankSales}
                  onChange={(e) =>
                    setEditValues((v) => ({ ...v, bankSales: Number(e.target.value) }))
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <button
                onClick={() => {
                  setEditModalOpen(false);
                  setEditingRecord(null);
                }}
                className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdits}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-5 md:p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">All Records</h3>
              <p className="text-xs text-slate-500">Aggregated daily performance overview</p>
              <div className="flex gap-2 mt-2">
                <div className="bg-emerald-50 px-3 py-1.5 rounded-lg">
                  <span className="text-xs text-emerald-700 font-semibold">
                    {dailyRecords.length} Days Recorded
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0">
            <RangeCalendar onRangeChange={setCustomDateRange} className="" align="right" />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-slate-100 hover:scrollbar-thumb-slate-500">
        <table className={`w-full text-left ${tableMinWidth}`}>
          <thead className="bg-slate-50 border-b-2 border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">
                Date
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold text-emerald-600 uppercase tracking-wide">
                Cash Sales
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold text-pink-600 uppercase tracking-wide">
                bKash Sales
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold text-blue-600 uppercase tracking-wide">
                Bank Sales
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold text-rose-600 uppercase tracking-wide">
                Daily Costs
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold text-indigo-600 uppercase tracking-wide">
                Cash to Fund
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold text-sky-700 uppercase tracking-wide">
                Fund to Cash
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold text-amber-600 uppercase tracking-wide">
                Daily Available Liquidity
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold text-emerald-600 uppercase tracking-wide">
                Cash Added (All)
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wide">
                Extra (Fund In/Out)
              </th>
              {canEdit && (
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wide">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {dailyRecords.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-12 text-center text-slate-400 text-sm">
                  <div className="flex flex-col items-center gap-2">
                    <TrendingUp size={32} className="text-slate-300" />
                    <p>No daily records found</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((r, idx: number) => {
                // Daily available liquidity across all methods (cash/bank/bkash)
                const totalSales = r.cashSales + r.bkashSales + r.bankSales;
                const totalFundOut = r.cashFundOut + r.bankFundOut + r.bkashFundOut;
                const dailyAvail =
                  totalSales +
                  (r.cashAdded || 0) +
                  (r.fundToCash || 0) +
                  (r.fundIn || 0) -
                  r.dailyCosts -
                  r.cashToFund -
                  totalFundOut;
                return (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 text-xs font-semibold text-slate-700">
                      {r.date.toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-medium text-slate-700">
                      {r.cashSales.toLocaleString()} ৳
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-medium text-slate-700">
                      {r.bkashSales.toLocaleString()} ৳
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-medium text-slate-700">
                      {r.bankSales.toLocaleString()} ৳
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-medium text-rose-600">
                      {r.dailyCosts.toLocaleString()} ৳
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-medium text-indigo-600">
                      {r.cashToFund.toLocaleString()} ৳
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-medium text-sky-700">
                      {(r.fundToCash || 0) > 0 ? (
                        <span className="font-semibold">
                          {(r.fundToCash || 0).toLocaleString()} ৳
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-xs text-amber-700">
                      {dailyAvail.toLocaleString()} ৳
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-medium">
                      {(r.cashAdded || 0) > 0 ? (
                        <span className="text-emerald-600 font-semibold">
                          {(r.cashAdded || 0).toLocaleString()} ৳
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-xs">
                      {r.fundIn > 0 && (
                        <span className="text-emerald-600 font-semibold">+{r.fundIn} ৳</span>
                      )}
                      {r.fundIn > 0 && r.fundOut > 0 && (
                        <span className="text-slate-300 mx-1">/</span>
                      )}
                      {r.fundOut > 0 && (
                        <span className="text-rose-600 font-semibold">-{r.fundOut} ৳</span>
                      )}
                      {r.fundIn === 0 && r.fundOut === 0 && (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleManagerEdit(r)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                          title="Edit sales"
                        >
                          <Pencil size={14} />
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {dailyRecords.length > 0 && (
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
          <Pagination pagination={pagination} />
        </div>
      )}
    </div>
  );
}
