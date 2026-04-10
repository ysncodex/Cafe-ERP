import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ShoppingBag, Package, Plus, X, Pencil, Trash2, Users, ChevronDown } from 'lucide-react';
import { useERP } from '@/context/ERPContext';
import {
  ManagerPasswordModal,
  EditTransactionModal,
  ManageListModal,
  ButtonLoading,
  Pagination,
} from '@/shared/components/ui';
import { useClientPagination } from '@/hooks';
import { productCostSchema, type ProductCostFormData, handleError } from '@/shared/utils';
import type { Transaction } from '@/core/types';
import RangeCalendar from '@/features/CustomCalender';

export default function ProductCosts() {
  const {
    stats,
    filteredTransactions,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    itemNames,
    suppliers,
    addItemName,
    addSupplier,
    renameItemName,
    deleteItemName,
    renameSupplier,
    deleteSupplier,
    setCustomDateRange,
  } = useERP();

  const [loading, setLoading] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newSupplier, setNewSupplier] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);

  const [manageItemOpen, setManageItemOpen] = useState(false);
  const [manageSupplierOpen, setManageSupplierOpen] = useState(false);

  // Form validation with react-hook-form + zod
  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm<ProductCostFormData>({
    resolver: zodResolver(productCostSchema),
    defaultValues: {
      item: '',
      cost: '',
      method: 'cash',
      quantity: '',
      unit: 'pcs',
      unitPrice: '',
      supplier: '',
    },
  });

  const quantity = watch('quantity');
  const unitPrice = watch('unitPrice');

  // Manager Password Modal States
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [passwordModalTitle, setPasswordModalTitle] = useState('');

  // Edit Transaction Modal States
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Auto-Calculate Amount
  useEffect(() => {
    const qty = parseFloat(quantity || '0');
    const price = parseFloat(unitPrice || '0');
    if (!isNaN(qty) && !isNaN(price) && qty > 0 && price > 0) {
      setValue('cost', (qty * price).toFixed(2));
    }
  }, [quantity, unitPrice, setValue]);

  const handleSubmit = async (data: ProductCostFormData) => {
    try {
      setLoading(true);
      addTransaction({
        type: 'expense_product',
        amount: Number(data.cost),
        method: data.method,
        description: data.item || 'Product Purchase',
        quantity: data.quantity ? Number(data.quantity) : undefined,
        unit: data.quantity ? data.unit : undefined,
        unitPrice: data.unitPrice ? Number(data.unitPrice) : undefined,
        supplier: data.supplier,
      });
      toast.success('Product cost added successfully!');
      reset();
    } catch (error) {
      handleError(error, {
        action: 'add_product_cost',
        severity: 'high',
        metadata: {
          item: data.item,
          cost: data.cost,
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
          action: 'delete_product_cost',
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
        action: 'update_product_cost',
        severity: 'high',
        metadata: { transactionId: updated.id },
      });
    }
  };

  const productExpenses = filteredTransactions.filter((t) => t.type === 'expense_product');

  // Convert productUsage object to array for pagination
  const productUsageArray = Object.entries(stats.productUsage).map(
    ([name, data]) => ({
      name,
      ...data,
    })
  );

  // Client-side pagination for expenses
  const { paginatedData: paginatedExpenses, pagination } = useClientPagination(productExpenses, {
    initialPageSize: 10,
    pageSizeOptions: [5, 10, 20],
  });

  // Client-side pagination for variable cost summary
  const { paginatedData: paginatedUsage, pagination: usagePagination } = useClientPagination(
    productUsageArray,
    {
      initialPageSize: 10,
      pageSizeOptions: [5, 10, 20],
    }
  );

  const handleAddItemName = () => {
    try {
      if (newItemName.trim()) {
        addItemName(newItemName.trim());
        setValue('item', newItemName.trim());
        setNewItemName('');
        setShowAddItem(false);
        toast.success('Item added successfully');
      }
    } catch (error) {
      handleError(error, {
        action: 'add_item_name',
        severity: 'medium',
        metadata: { itemName: newItemName },
      });
    }
  };

  const handleAddSupplier = () => {
    try {
      if (newSupplier.trim()) {
        addSupplier(newSupplier.trim());
        setValue('supplier', newSupplier.trim());
        setNewSupplier('');
        setShowAddSupplier(false);
      }
    } catch (error) {
      handleError(error, {
        action: 'add_supplier',
        severity: 'medium',
        metadata: { supplier: newSupplier },
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
        isOpen={manageItemOpen}
        onClose={() => setManageItemOpen(false)}
        title="Manage Item Names"
        items={itemNames}
        emptyText="No item names saved yet."
        onRename={renameItemName}
        onDelete={deleteItemName}
      />

      <ManageListModal
        isOpen={manageSupplierOpen}
        onClose={() => setManageSupplierOpen(false)}
        title="Manage Suppliers"
        items={suppliers}
        emptyText="No suppliers saved yet."
        onRename={renameSupplier}
        onDelete={deleteSupplier}
      />

      <div className="bg-white/90 backdrop-blur p-5 sm:p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 h-fit md:sticky md:top-28">
        <div className="flex items-start justify-between gap-4 mb-5 pb-5 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-100 text-orange-600">
              <ShoppingBag size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 leading-tight">Variable Costs</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Record ingredient & packaging purchases
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-3 py-1">
            <span>Auto-calculates total</span>
          </div>
        </div>

        <form onSubmit={handleFormSubmit(handleSubmit)} className="space-y-5">
          {/* Item Name Field */}
          <div>
            <div className="flex justify-between items-center gap-3 mb-2">
              <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                Item Name / Description
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setManageItemOpen(true)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title="Manage item names"
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
                  placeholder="New item name..."
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
                    {...register('item')}
                    className={`w-full h-11 pl-4 pr-10 bg-slate-50 border ${errors.item ? 'border-red-400' : 'border-slate-200'} rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 appearance-none`}
                  >
                    <option value="">Select or type item name...</option>
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
                    No item names saved yet — click “Add New”.
                  </p>
                )}
                {errors.item && <p className="text-xs text-red-600 mt-1">{errors.item.message}</p>}
              </>
            )}
          </div>

          {/* Supplier Field */}
          <div>
            <div className="flex justify-between items-center gap-3 mb-2">
              <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                <Users size={12} /> Supplier
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setManageSupplierOpen(true)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title="Manage suppliers"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddSupplier(!showAddSupplier)}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  <Plus size={12} /> Add New
                </button>
              </div>
            </div>
            {showAddSupplier ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New supplier name..."
                  value={newSupplier}
                  onChange={(e) => setNewSupplier(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSupplier()}
                  className="flex-1 h-11 px-4 bg-indigo-50 border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddSupplier}
                  className="h-11 px-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSupplier(false);
                    setNewSupplier('');
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
                    {...register('supplier')}
                    className={`w-full h-11 pl-4 pr-10 bg-slate-50 border ${errors.supplier ? 'border-red-400' : 'border-slate-200'} rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 appearance-none`}
                  >
                    <option value="">Select supplier...</option>
                    {suppliers.map((sup) => (
                      <option key={sup} value={sup}>
                        {sup}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
                {suppliers.length === 0 && (
                  <p className="text-[11px] text-slate-500 mt-2">
                    No suppliers saved yet — click “Add New”.
                  </p>
                )}
                {errors.supplier && (
                  <p className="text-xs text-red-600 mt-1">{errors.supplier.message}</p>
                )}
              </>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2 block">
                Qty
              </label>
              <input
                type="number"
                placeholder="0"
                {...register('quantity')}
                className={`w-full h-11 px-4 bg-slate-50 border ${errors.quantity ? 'border-red-400' : 'border-slate-200'} rounded-xl outline-none focus:ring-2 focus:ring-indigo-500`}
              />
              {errors.quantity && (
                <p className="text-xs text-red-600 mt-1">{errors.quantity.message}</p>
              )}
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2 block">
                Unit
              </label>
              <div className="relative">
                <select
                  {...register('unit')}
                  className="w-full h-11 pl-4 pr-10 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                >
                  <option value="pcs">Pcs</option>
                  <option value="kg">Kg</option>
                  <option value="g">g</option>
                  <option value="L">L</option>
                  <option value="ml">ml</option>
                  <option value="box">Box</option>
                  <option value="pack">Pack</option>
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>
            <div className="sm:col-span-3">
              <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2 block">
                Unit Price
              </label>
              <input
                type="number"
                placeholder="0.00"
                {...register('unitPrice')}
                className={`w-full h-11 px-4 bg-slate-50 border ${errors.unitPrice ? 'border-red-400' : 'border-slate-200'} rounded-xl outline-none focus:ring-2 focus:ring-indigo-500`}
              />
              {errors.unitPrice && (
                <p className="text-xs text-red-600 mt-1">{errors.unitPrice.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2 block">
              Total Cost
            </label>
            <input
              type="text"
              placeholder="0.00"
              {...register('cost')}
              className="w-full h-11 px-4 bg-slate-100 border border-slate-200 rounded-xl outline-none font-bold text-slate-800"
              readOnly
            />
            <p className="text-[11px] text-slate-500 mt-2">Calculated from Qty × Unit Price.</p>
          </div>

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
            className="w-full min-h-12 px-4 py-3.5 text-white rounded-xl font-bold shadow-lg mt-2 bg-slate-800 hover:bg-slate-900 flex items-center justify-center whitespace-nowrap transition-transform active:scale-[0.99]"
          >
            Save Cost
          </ButtonLoading>
        </form>
      </div>

      <div className="lg:col-span-2 space-y-6">
        {/* Variable Cost Summary Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 md:p-6 border-b border-slate-200 bg-gradient-to-r from-orange-50 to-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                  <Package size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Variable Cost Summary</h3>
                  <p className="text-xs text-slate-500">Summary of recorded purchases</p>
                </div>
              </div>
              <div className="bg-orange-100 px-4 py-2 rounded-lg border border-orange-200">
                <span className="text-xs text-orange-600 uppercase font-semibold">Total</span>
                <div className="text-xl font-bold text-orange-700">
                  {stats.totalProductCost.toLocaleString()} ৳
                </div>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-slate-100 hover:scrollbar-thumb-slate-500">
            <table className="w-full text-left min-w-[500px]">
              <thead className="bg-slate-50 border-b-2 border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide w-1/2">
                    Item Name
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wide w-1/6">
                    Total Qty
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wide w-1/6">
                    Total Cost
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wide w-1/6">
                    Avg Price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedUsage.map((item) => (
                  <tr key={item.name} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 text-xs font-semibold text-slate-700">{item.name}</td>
                    <td className="px-4 py-3 text-right text-xs text-slate-700 font-bold">
                      {item.qty}{' '}
                      <span className="text-[10px] text-slate-400 font-normal uppercase ml-1">
                        {item.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-orange-600">
                      {item.cost.toLocaleString()} ৳
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500">
                      {(item.cost / (item.qty || 1)).toFixed(1)} / {item.unit}
                    </td>
                  </tr>
                ))}
                {productUsageArray.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-xs">
                      No product usage recorded for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {productUsageArray.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
              <Pagination pagination={usagePagination} />
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 md:px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-700 text-sm">Cost History Log</h3>
              <p className="text-xs text-slate-500 mt-0.5">Detailed transaction records</p>
            </div>
            <RangeCalendar onRangeChange={setCustomDateRange} align="right" />
          </div>
          <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-slate-100 hover:scrollbar-thumb-slate-500">
            <table className="w-full text-left min-w-[650px]">
              <thead className="bg-slate-50 border-b-2 border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide w-[14%]">
                    Date
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide w-[22%]">
                    Item
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wide w-[12%]">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide w-[18%]">
                    Supplier
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wide w-[16%]">
                    Cost
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wide w-[18%]">
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
                    <td className="px-4 py-3 text-center text-xs text-slate-700">
                      {t.quantity ? (
                        <span className="font-semibold">
                          {t.quantity}{' '}
                          <span className="text-[10px] text-slate-400 uppercase">{t.unit}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{t.supplier || '-'}</td>
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
          {productExpenses.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
              <Pagination pagination={pagination} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
