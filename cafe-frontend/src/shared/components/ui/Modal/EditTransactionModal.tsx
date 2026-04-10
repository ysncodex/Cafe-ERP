import { useState, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import type { EditTransactionModalProps } from './Modal.types';
import type { Transaction, UnitType, PaymentMethod, SalesChannel } from '@/core/types';

/**
 * EditTransactionModal Component
 * Edit transaction details with validation
 */
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
      // Sync props into local editable state when switching transactions.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditData({ ...transaction });
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const handleSave = () => {
    onSave({ ...transaction, ...editData } as Transaction);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600">
            <Pencil size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Edit Transaction</h3>
            <p className="text-xs text-slate-500">Modify the transaction details below</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Amount */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Amount</label>
            <input
              type="number"
              value={editData.amount || ''}
              onChange={(e) => setEditData({ ...editData, amount: Number(e.target.value) })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
              Description / Item Name
            </label>
            <input
              type="text"
              list="edit-items"
              value={editData.description || ''}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <datalist id="edit-items">
              {itemNames.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>

          {/* Supplier - for product costs */}
          {transaction.type === 'expense_product' && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                Supplier
              </label>
              <input
                type="text"
                list="edit-suppliers"
                value={editData.supplier || ''}
                onChange={(e) => setEditData({ ...editData, supplier: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <datalist id="edit-suppliers">
                {suppliers.map((sup) => (
                  <option key={sup} value={sup} />
                ))}
              </datalist>
            </div>
          )}

          {/* Quantity & Unit - for product costs */}
          {transaction.type === 'expense_product' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                  Quantity
                </label>
                <input
                  type="number"
                  value={editData.quantity || ''}
                  onChange={(e) => setEditData({ ...editData, quantity: Number(e.target.value) })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                  Unit
                </label>
                <select
                  value={editData.unit || 'pcs'}
                  onChange={(e) => setEditData({ ...editData, unit: e.target.value as UnitType })}
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
              value={editData.method || 'cash'}
              onChange={(e) =>
                setEditData({ ...editData, method: e.target.value as PaymentMethod })
              }
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="bkash">bKash</option>
            </select>
          </div>

          {/* Channel - for sales */}
          {transaction.type === 'sale' && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                Platform
              </label>
              <select
                value={editData.channel || 'in_store'}
                onChange={(e) =>
                  setEditData({ ...editData, channel: e.target.value as SalesChannel })
                }
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="in_store">In-Store</option>
                <option value="foodpanda">Foodpanda</option>
                <option value="foodi">Foodi</option>
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
