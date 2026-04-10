import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Building2, Pencil, Trash2, Plus, X, ChevronDown } from 'lucide-react';
import { useERP } from '@/context/ERPContext';
import {
  ManagerPasswordModal,
  EditTransactionModal,
  ManageListModal,
  ButtonLoading,
  Pagination,
} from '@/shared/components/ui';
import { useClientPagination } from '@/hooks';
import { fixedCostSchema, type FixedCostFormData, handleError } from '@/shared/utils';
import type { Transaction } from '@/core/types';
import RangeCalendar from '@/features/CustomCalender';

export default function FixedCosts() {
  const {
    stats,
    filteredTransactions,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    itemNames,
    suppliers,
    addItemName,
    renameItemName,
    deleteItemName,
    setCustomDateRange,
  } = useERP();

  const [loading, setLoading] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);

  const [manageDescriptionOpen, setManageDescriptionOpen] = useState(false);

  // Form validation with react-hook-form + zod
  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<FixedCostFormData>({
    resolver: zodResolver(fixedCostSchema),
    defaultValues: {
      description: '',
      amount: '',
      method: 'cash',
    },
  });

  // Manager Password Modal States
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [passwordModalTitle, setPasswordModalTitle] = useState('');

  // Edit Transaction Modal States
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const handleSubmit = async (data: FixedCostFormData) => {
    try {
      setLoading(true);
      addTransaction({
        type: 'expense_fixed',
        amount: Number(data.amount),
        method: data.method,
        description: data.description || 'Fixed Cost',
      });
      toast.success('🏢 Fixed cost added successfully!');
      reset();
    } catch (error) {
      handleError(error, {
        action: 'add_fixed_cost',
        severity: 'high',
        metadata: {
          amount: data.amount,
          description: data.description,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManagerDelete = (id: string) => {
    setPasswordModalTitle('Delete Transaction');
    setPendingAction(() => () => {
      try {
        deleteTransaction(id);
        toast.success('Transaction deleted successfully');
      } catch (error) {
        handleError(error, {
          action: 'delete_fixed_cost',
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
      toast.success('Transaction updated successfully');
    } catch (error) {
      handleError(error, {
        action: 'update_fixed_cost',
        severity: 'high',
        metadata: { transactionId: updated.id },
      });
    }
  };

  const fixedExpenses = filteredTransactions.filter((t) => t.type === 'expense_fixed');

  // Client-side pagination
  const { paginatedData: paginatedExpenses, pagination } = useClientPagination(fixedExpenses, {
    initialPageSize: 7,
    pageSizeOptions: [7, 10, 20],
  });

  const handleAddItemName = () => {
    try {
      if (newItemName.trim()) {
        addItemName(newItemName.trim());
        setValue('description', newItemName.trim());
        setNewItemName('');
        setShowAddItem(false);
        toast.success('Item added successfully');
      }
    } catch (error) {
      handleError(error, {
        action: 'add_fixed_description',
        severity: 'medium',
        metadata: { itemName: newItemName },
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in zoom-in-95 duration-300">
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

      <ManageListModal
        isOpen={manageDescriptionOpen}
        onClose={() => setManageDescriptionOpen(false)}
        title="Manage Descriptions"
        items={itemNames}
        emptyText="No descriptions saved yet."
        onRename={renameItemName}
        onDelete={deleteItemName}
      />

      <div className="bg-white/90 backdrop-blur p-5 sm:p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 h-fit md:sticky md:top-28">
        <div className="flex items-start justify-between gap-4 mb-5 pb-5 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100 text-purple-600">
              <Building2 size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 leading-tight">Fixed Costs</h3>
              <p className="text-xs text-slate-500 mt-0.5">Record rent/salaries</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-3 py-1">
            <span>Recurring expenses</span>
          </div>
        </div>

        <form onSubmit={handleFormSubmit(handleSubmit)} className="space-y-5">
          {/* Item Name / Description Field */}
          <div>
            <div className="flex justify-between items-center gap-3 mb-2">
              <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                Description
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setManageDescriptionOpen(true)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title="Manage descriptions"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddItem(!showAddItem)}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  <Plus size={12} /> Add New
                </button>
              </div>
            </div>
            {showAddItem ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New description..."
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddItemName()}
                  className="flex-1 h-11 px-4 bg-indigo-50 border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddItemName}
                  className="h-11 px-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddItem(false);
                    setNewItemName('');
                  }}
                  className="h-11 px-3 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <select
                    {...register('description')}
                    className={`w-full h-11 pl-4 pr-10 bg-slate-50 border ${errors.description ? 'border-red-400' : 'border-slate-200'} rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 appearance-none`}
                  >
                    <option value="">Select or type description...</option>
                    {itemNames.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
                {itemNames.length === 0 && (
                  <p className="text-[11px] text-slate-500 mt-2">
                    No descriptions saved yet — click “Add New”.
                  </p>
                )}
                {errors.description && (
                  <p className="text-xs text-red-600 mt-1">{errors.description.message}</p>
                )}
              </>
            )}
          </div>

          {/* Amount Field */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2 block">
              Total Cost
            </label>
            <input
              type="number"
              placeholder="0.00"
              {...register('amount')}
              className={`w-full h-11 px-4 bg-slate-50 border ${errors.amount ? 'border-red-400' : 'border-slate-200'} rounded-xl outline-none font-bold text-base focus:ring-2 focus:ring-indigo-500`}
            />
            {errors.amount && <p className="text-xs text-red-600 mt-1">{errors.amount.message}</p>}
          </div>

          {/* Payment Method */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2 block">
              Paid Via
            </label>
            <div className="relative">
              <select
                {...register('method')}
                className="w-full h-11 pl-4 pr-10 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="bkash">bKash</option>
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>

          <ButtonLoading
            loading={isSubmitting || loading}
            type="submit"
            className="w-full min-h-12 px-4 py-3.5 text-white rounded-xl font-bold shadow-lg mt-2 bg-purple-600 hover:bg-purple-700 flex items-center justify-center whitespace-nowrap transition-transform active:scale-[0.99]"
          >
            Save Cost
          </ButtonLoading>
        </form>
      </div>

      <div className="lg:col-span-2 space-y-6">
        {/* Fixed Cost Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 md:p-6 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Fixed Cost Summary</h3>
                  <p className="text-xs text-slate-500">Recurring expenses overview</p>
                </div>
              </div>
              <div className="bg-purple-100 px-4 py-2 rounded-lg border border-purple-200">
                <span className="text-xs text-purple-600 uppercase font-semibold">Total</span>
                <div className="text-xl font-bold text-purple-700">
                  {stats.totalFixedCost.toLocaleString()} ৳
                </div>
              </div>
            </div>
          </div>
          <div className="p-5 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.topFixed.map((item, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100 hover:border-purple-200 transition-colors"
                >
                  <div>
                    <p className="font-bold text-slate-700 text-sm">{item.name}</p>
                    <p className="text-xs text-slate-400">Fixed expense</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-purple-600 text-lg">
                      -{item.amount.toLocaleString()} ৳
                    </p>
                  </div>
                </div>
              ))}
              {stats.topFixed.length === 0 && (
                <div className="col-span-2 p-8 text-center text-slate-400 text-xs">
                  No fixed costs recorded for this period.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cost History Log */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 md:px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-700 text-sm">Fixed Cost History</h3>
              <p className="text-xs text-slate-500 mt-0.5">All fixed cost transactions</p>
            </div>
            <RangeCalendar onRangeChange={setCustomDateRange} align="right" />
          </div>
          <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-slate-100 hover:scrollbar-thumb-slate-500">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-slate-50 border-b-2 border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Date
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Description
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
                {paginatedExpenses.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {t.date?.toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{t.description}</td>
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
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {fixedExpenses.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
              <Pagination pagination={pagination} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
