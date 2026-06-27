import { useState, useEffect, useCallback } from 'react';
import { Pencil, X } from 'lucide-react';
import type { EditTransactionModalProps } from './Modal.types';
import type { Transaction, UnitType, PaymentMethod, SalesChannel } from '@/core/types';

export function EditTransactionModal({
  isOpen,
  onClose,
  transaction,
  onSave,
  itemNames,
  suppliers,
}: EditTransactionModalProps) {
  const [editData, setEditData] = useState<Partial<Transaction>>({});

  useEffect(() => {
    if (transaction) {
      setEditData({ ...transaction });
    }
  }, [transaction]);

  const update = useCallback(
    <K extends keyof Transaction>(field: K, value: Transaction[K]) =>
      setEditData((prev) => ({ ...prev, [field]: value })),
    [],
  );

  const handleSave = useCallback(() => {
    onSave({ ...transaction, ...editData } as Transaction);
    onClose();
  }, [transaction, editData, onSave, onClose]);

  if (!isOpen || !transaction) return null;

  const isAmountValid = Number(editData.amount) > 0;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600">
              <Pencil size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Edit Transaction</h3>
              <p className="text-xs text-slate-500">Update the fields you want to change</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Amount */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
              Amount (৳)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 500"
              value={editData.amount ?? ''}
              onChange={(e) => update('amount', Number(e.target.value))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {!isAmountValid && editData.amount !== undefined && (
              <p className="text-xs text-rose-500 mt-1">Amount must be greater than zero</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
              Item Description
            </label>
            <input
              type="text"
              list="edit-items"
              placeholder="e.g. Milk, Electricity Bill"
              value={editData.description ?? ''}
              onChange={(e) => update('description', e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <datalist id="edit-items">
              {itemNames.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>

          {/* Supplier — product expenses only */}
          {transaction.type === 'expense_product' && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                Supplier
              </label>
              <input
                type="text"
                list="edit-suppliers"
                placeholder="e.g. ABC Traders"
                value={editData.supplier ?? ''}
                onChange={(e) => update('supplier', e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <datalist id="edit-suppliers">
                {suppliers.map((sup) => (
                  <option key={sup} value={sup} />
                ))}
              </datalist>
            </div>
          )}

          {/* Quantity & Unit — product expenses only */}
          {transaction.type === 'expense_product' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                  Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 5"
                  value={editData.quantity ?? ''}
                  onChange={(e) => update('quantity', Number(e.target.value))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                  Unit
                </label>
                <select
                  value={editData.unit ?? 'pcs'}
                  onChange={(e) => update('unit', e.target.value as UnitType)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="pcs">Pcs</option>
                  <option value="kg">Kg</option>
                  <option value="g">g</option>
                  <option value="L">L</option>
                  <option value="ml">ml</option>
                  <option value="box">Box</option>
                  <option value="pack">Pack</option>
                </select>
              </div>
            </div>
          )}

          {/* Payment Method */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
              Payment Method
            </label>
            <select
              value={editData.method ?? 'cash'}
              onChange={(e) => update('method', e.target.value as PaymentMethod)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="cash">Cash</option>
              <option value="bank">Bank Transfer</option>
              <option value="bkash">bKash</option>
            </select>
          </div>

          {/* Sales Channel — sales only */}
          {transaction.type === 'sale' && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                Sales Channel
              </label>
              <select
                value={editData.channel ?? 'in_store'}
                onChange={(e) => update('channel', e.target.value as SalesChannel)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="in_store">In-Store</option>
                <option value="foodpanda">Foodpanda</option>
                <option value="foodi">Foodi</option>
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isAmountValid}
              className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
