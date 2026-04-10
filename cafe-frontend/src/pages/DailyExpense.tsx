import { useState } from 'react';
import { Pencil, Trash2, TrendingDown, AlertCircle } from 'lucide-react';
import { useERP } from '@/context/ERPContext';
import { ManagerPasswordModal, EditTransactionModal, Pagination } from '@/shared/components/ui';
import { useClientPagination } from '@/hooks';
import type { Transaction } from '@/core/types';
import RangeCalendar from '@/features/CustomCalender';
import { handleError } from '@/shared/utils';

export default function DailyExpense() {
  const {
    stats,
    filteredTransactions,
    deleteTransaction,
    updateTransaction,
    itemNames,
    suppliers,
    setCustomDateRange,
  } = useERP();

  // Manager Password Modal States
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [passwordModalTitle, setPasswordModalTitle] = useState('');

  // Edit Transaction Modal States
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const handleManagerDelete = (id: string) => {
    setPasswordModalTitle('Delete Transaction');
    setPendingAction(() => () => {
      try {
        deleteTransaction(id);
      } catch (error) {
        handleError(error, {
          action: 'delete_expense',
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

  const handleSaveEdit = (updated: Transaction) => {
    try {
      updateTransaction(updated);
    } catch (error) {
      handleError(error, {
        action: 'update_expense',
        severity: 'high',
        metadata: { transactionId: updated.id },
      });
    }
  };

  const expenseTransactions = filteredTransactions.filter((t) => t.type.includes('expense'));

  // Client-side pagination
  const { paginatedData: paginatedExpenses, pagination } = useClientPagination(
    expenseTransactions,
    {
      initialPageSize: 10,
      pageSizeOptions: [5, 10, 20],
    }
  );

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

      <EditTransactionModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingTransaction(null);
        }}
        transaction={editingTransaction}
        onSave={handleSaveEdit}
        itemNames={itemNames}
        suppliers={suppliers}
      />

      <div className="p-5 md:p-6 border-b border-slate-100 bg-gradient-to-r from-rose-50 to-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
              <TrendingDown size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Master Expense Register</h3>
              <p className="text-xs text-slate-500">Complete expense tracking & management</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-rose-100 text-rose-700 px-4 py-2 rounded-lg font-bold border border-rose-200">
              <span className="text-xs text-rose-600">Total</span>
              <div className="text-lg">{stats.totalExpenses.toLocaleString()} ৳</div>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500">Count</span>
              <div className="text-lg font-bold text-slate-700">{expenseTransactions.length}</div>
            </div>
            <RangeCalendar onRangeChange={setCustomDateRange} align="right" />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-slate-100 hover:scrollbar-thumb-slate-500">
        <table className="w-full text-left min-w-[900px]">
          <thead className="bg-slate-50 border-b-2 border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">
                Date
              </th>
              <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">
                Type
              </th>
              <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">
                Details
              </th>
              <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">
                Supplier
              </th>
              <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">
                Via
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wide">
                Cost
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {expenseTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle size={32} className="text-slate-300" />
                    <p>No expenses recorded for this period</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedExpenses.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/70 transition-colors group">
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {t.date?.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] font-semibold px-2 py-1 rounded uppercase tracking-wider ${t.type === 'expense_product' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}`}
                    >
                      {t.type === 'expense_product' ? 'Variable' : 'Fixed'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{t.description}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{t.supplier || '-'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 capitalize">{t.method}</td>
                  <td className="px-4 py-3 text-right font-bold text-xs text-rose-600">
                    -{t.amount} ৳
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                      <button
                        onClick={() => handleManagerEdit(t)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit (Manager Only)"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleManagerDelete(t.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete (Manager Only)"
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

      {/* Pagination Controls */}
      {expenseTransactions.length > 0 && (
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
          <Pagination pagination={pagination} />
        </div>
      )}
    </div>
  );
}
