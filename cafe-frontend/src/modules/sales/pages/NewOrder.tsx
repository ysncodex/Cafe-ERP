import { useState, useMemo, useCallback } from 'react';
import {
  Search,
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Printer,
  CheckCircle2,
  Coffee,
  Banknote,
  Smartphone,
  Landmark,
  UtensilsCrossed,
  User,
  ChevronDown,
  ReceiptText,
  Store,
  Package2,
  Bike,
  ArrowLeftRight,
  AlertCircle,
  Tag,
  Gift,
  Loader2,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { useERP } from '@/core/context/useERP';
import { loadMenuCatalog } from '../utils/menuCatalog.storage';
import {
  ALL_CATEGORIES,
  CATEGORY_STYLES,
  TABLE_OPTIONS,
  type MenuItem,
  type MenuCategory,
  type OrderItem,
  type NewOrderData,
  type DiscountType,
} from '../types/menuItem.types';
import {
  RECEIPT_CSS,
  buildCustomerReceiptHTML,
  buildKitchenChitHTML,
} from '../utils/receiptPrint';
import { printOrderAsync } from '../utils/posPrintService';
import {
  NO_TABLE,
  lineTotal,
  computeOrderTotals,
  buildDraftOrder,
  orderToTransaction,
} from '../utils/orderUtils';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank: 'Card / Bank',
  bkash: 'bKash',
};

const CHANNEL_LABELS: Record<string, string> = {
  in_store: 'Dine In',
  takeaway: 'Takeaway',
  delivery: 'Delivery',
};

// ─── Category Dot ─────────────────────────────────────────────────────────────

function CategoryDot({ category }: { category: MenuCategory }) {
  const s = CATEGORY_STYLES[category];
  return (
    <span className="flex items-center gap-1">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
      <span className={`text-[9px] font-bold uppercase tracking-wide ${s.text}`}>{category}</span>
    </span>
  );
}

// ─── Product Card (horizontal) ────────────────────────────────────────────────

function OrderProductCard({ item, qty, onAdd }: { item: MenuItem; qty: number; onAdd: (i: MenuItem) => void }) {
  return (
    <button
      type="button"
      onClick={() => onAdd(item)}
      className={`w-full flex items-center gap-3 text-left bg-white rounded-xl border px-3 py-2.5 transition-all duration-150 select-none group relative
        ${qty > 0
          ? 'border-amber-400 ring-2 ring-amber-100 shadow-sm'
          : 'border-slate-200 hover:border-amber-300 hover:shadow-sm'}`}
    >
      {qty > 0 && (
        <span className="absolute -top-2 -left-2 min-w-5 h-5 px-1 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center z-10 shadow">
          {qty}
        </span>
      )}

      <div className="flex-1 min-w-0">
        <CategoryDot category={item.category} />
        <p className="text-[13px] font-bold text-slate-800 mt-1 leading-snug truncate">{item.name}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-bold text-slate-800 tabular-nums">৳{item.price}</span>
        <span className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all
          ${qty > 0
            ? 'bg-amber-500 border-amber-500 text-white'
            : 'border-slate-200 text-slate-400 group-hover:border-amber-400 group-hover:text-amber-500'}`}>
          <Plus size={14} />
        </span>
      </div>
    </button>
  );
}

// ─── Cart Item Row ────────────────────────────────────────────────────────────

function CartItemRow({
  orderItem, onIncrement, onDecrement, onRemove, onToggleGift,
}: {
  orderItem: OrderItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
  onToggleGift: () => void;
}) {
  const { menuItem: item, quantity, isGift } = orderItem;
  const total = lineTotal(orderItem);
  return (
    <div className={`flex items-center gap-2 py-2.5 border-b border-slate-100 last:border-0 group ${isGift ? 'bg-emerald-50/50 -mx-1 px-1 rounded-lg' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[13px] font-semibold text-slate-800 leading-snug truncate">{item.name}</p>
          {isGift && (
            <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">
              Gift
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-400">
          {isGift ? `Was ৳${item.price} · now free` : `৳${item.price} each`}
        </p>
      </div>
      <button
        type="button"
        onClick={onToggleGift}
        title={isGift ? 'Remove gift' : 'Mark as gift'}
        className={`p-1.5 rounded-lg border transition-all shrink-0 ${
          isGift
            ? 'border-emerald-400 bg-emerald-100 text-emerald-600'
            : 'border-slate-200 text-slate-400 opacity-0 group-hover:opacity-100 hover:border-emerald-300 hover:text-emerald-500'
        }`}
      >
        <Gift size={12} />
      </button>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onDecrement}
          className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all"
        >
          <Minus size={11} />
        </button>
        <span className="text-sm font-bold text-slate-800 w-5 text-center">{quantity}</span>
        <button
          onClick={onIncrement}
          className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:border-amber-400 hover:text-amber-500 hover:bg-amber-50 transition-all"
        >
          <Plus size={11} />
        </button>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[13px] font-bold text-slate-800 w-14 text-right tabular-nums">
          {isGift ? 'FREE' : `৳${total}`}
        </span>
        <button
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition-all"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

// ─── Receipt / Chit preview (shares HTML+CSS with print output) ───────────────

function ReceiptPreview({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

// ─── Payment Panel ────────────────────────────────────────────────────────────

function PaymentPanel({
  order,
  customerPaidStr,
  onPaidChange,
}: {
  order: NewOrderData;
  customerPaidStr: string;
  onPaidChange: (v: string) => void;
}) {
  const paid = parseFloat(customerPaidStr) || 0;
  const change = Math.max(0, paid - order.total);
  const insufficient = paid > 0 && paid < order.total;

  const quickAmounts = useMemo(() => {
    const base = order.total;
    const options: number[] = [base];
    for (const r of [50, 100, 200, 500]) {
      const rounded = Math.ceil(base / r) * r;
      if (!options.includes(rounded)) options.push(rounded);
      if (options.length >= 4) break;
    }
    return options.slice(0, 4);
  }, [order.total]);

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-4 text-white text-center">
        <p className="text-xs font-semibold opacity-80 uppercase tracking-wide mb-0.5">Total Bill</p>
        <p className="text-3xl font-black tracking-tight">৳{order.total}</p>
        {order.discount > 0 && (
          <p className="text-xs opacity-75 mt-0.5">Includes ৳{order.discount} discount</p>
        )}
        <p className="text-xs opacity-75 mt-1 font-medium">{PAYMENT_LABELS[order.paymentMethod]} · {CHANNEL_LABELS[order.channel]}</p>
      </div>

      <div>
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Quick Amount</p>
        <div className="grid grid-cols-4 gap-1.5">
          {quickAmounts.map((amt) => (
            <button
              key={amt}
              onClick={() => onPaidChange(String(amt))}
              className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                paid === amt
                  ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-amber-300 hover:bg-amber-50'
              }`}
            >
              ৳{amt}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          Customer Paid
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">৳</span>
          <input
            type="number"
            min="0"
            value={customerPaidStr}
            onChange={(e) => onPaidChange(e.target.value)}
            placeholder="0"
            className={`w-full pl-8 pr-4 py-3 rounded-xl border text-lg font-bold outline-none transition-all ${
              insufficient
                ? 'border-red-300 bg-red-50 text-red-700 focus:ring-2 focus:ring-red-100'
                : paid >= order.total
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 focus:ring-2 focus:ring-emerald-100'
                : 'border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100'
            }`}
          />
        </div>
        {insufficient && (
          <p className="text-xs text-red-500 mt-1 font-medium">
            Short by ৳{(order.total - paid).toFixed(0)}
          </p>
        )}
      </div>

      {paid >= order.total && paid > 0 && (
        <div className={`rounded-2xl p-3.5 flex items-center gap-3 ${
          change === 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            change === 0 ? 'bg-emerald-100' : 'bg-blue-100'
          }`}>
            <ArrowLeftRight size={18} className={change === 0 ? 'text-emerald-600' : 'text-blue-600'} />
          </div>
          <div>
            <p className={`text-[11px] font-semibold uppercase tracking-wide ${change === 0 ? 'text-emerald-600' : 'text-blue-600'}`}>
              {change === 0 ? 'Exact Payment' : 'Change to Return'}
            </p>
            <p className={`text-2xl font-black leading-none ${change === 0 ? 'text-emerald-700' : 'text-blue-700'}`}>
              {change === 0 ? 'No Change' : `৳${change}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Order Completion Modal ───────────────────────────────────────────────────

function OrderCompletionModal({
  order,
  onClose,
  onPrintAndComplete,
  onSubmitPending,
}: {
  order: NewOrderData;
  onClose: () => void;
  onPrintAndComplete: (order: NewOrderData, kind: 'customer' | 'both') => Promise<void>;
  onSubmitPending: (order: NewOrderData) => void;
}) {
  const [activeTab, setActiveTab] = useState<'payment' | 'customer' | 'kitchen'>('payment');
  const [customerPaidStr, setCustomerPaidStr] = useState(String(order.total));
  const [printing, setPrinting] = useState<'customer' | 'kitchen' | 'both' | null>(null);

  const paid = parseFloat(customerPaidStr) || 0;
  const change = Math.max(0, paid - order.total);
  const paymentOk = paid >= order.total;

  const enrichedOrder: NewOrderData = useMemo(() => ({
    ...order,
    customerPaid: paid,
    changeAmount: change,
  }), [order, paid, change]);

  const customerHTML = useMemo(() => buildCustomerReceiptHTML(enrichedOrder), [enrichedOrder]);
  const kitchenHTML = useMemo(() => buildKitchenChitHTML(enrichedOrder), [enrichedOrder]);

  const handlePrintAndComplete = async (kind: 'customer' | 'both') => {
    if (!paymentOk) {
      toast.error(`Customer must pay at least ৳${order.total}`);
      return;
    }
    setPrinting(kind);
    try {
      const ok = await printOrderAsync(enrichedOrder, kind);
      if (!ok) {
        toast.error('Pop-up blocked — allow pop-ups and retry');
        return;
      }
      await onPrintAndComplete(enrichedOrder, kind);
    } finally {
      setPrinting(null);
    }
  };

  /** Receipt / Kitchen tabs — print ticket then save as pending (no payment required). */
  const handlePrintPending = async (kind: 'customer' | 'kitchen') => {
    setPrinting(kind);
    try {
      const ok = await printOrderAsync(enrichedOrder, kind);
      if (!ok) {
        toast.error('Pop-up blocked — allow pop-ups and retry');
        return;
      }
      onSubmitPending(enrichedOrder);
    } finally {
      setPrinting(null);
    }
  };

  const handlePrimaryPrint = () => {
    if (activeTab === 'payment') void handlePrintAndComplete('customer');
    else if (activeTab === 'kitchen') void handlePrintPending('kitchen');
    else void handlePrintPending('customer');
  };

  const primaryLabel =
    activeTab === 'payment'
      ? 'Print Receipt & Complete'
      : activeTab === 'kitchen'
        ? 'Print for Kitchen'
        : 'Print for Customer';

  const primaryPrinting =
    activeTab === 'payment'
      ? printing === 'customer'
      : printing === activeTab;

  const primaryDisabled =
    printing !== null || (activeTab === 'payment' && !paymentOk);

  const footerHint =
    activeTab === 'payment'
      ? 'Payment tab: print actions complete the order after payment. Submit = pending without print.'
      : activeTab === 'kitchen'
        ? 'Sends kitchen chit to printer and saves order as pending — collect payment later.'
        : 'Prints customer receipt and saves order as pending — collect payment later.';

  const tabs = [
    { id: 'payment' as const, label: 'Payment', Icon: Banknote },
    { id: 'customer' as const, label: 'Receipt', Icon: ReceiptText },
    { id: 'kitchen' as const, label: 'Kitchen', Icon: UtensilsCrossed },
  ];

  const hasTable = order.tableNumber && order.tableNumber !== NO_TABLE;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <style>{RECEIPT_CSS}</style>
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        <div className="relative bg-gradient-to-br from-slate-700 to-slate-900 px-5 pt-5 pb-6 text-white shrink-0">
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
            <X size={16} />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <ReceiptText size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Review Order</h2>
              <p className="text-xs opacity-80">{order.orderNumber}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Items', value: order.items.reduce((s, o) => s + o.quantity, 0) },
              { label: 'Bill', value: `৳${order.total}` },
              { label: hasTable ? order.tableNumber : CHANNEL_LABELS[order.channel], value: PAYMENT_LABELS[order.paymentMethod] },
            ].map((s) => (
              <div key={s.label} className="bg-white/15 rounded-xl px-2 py-1.5 text-center">
                <p className="text-[10px] opacity-75 uppercase tracking-wide truncate">{s.label}</p>
                <p className="text-sm font-bold leading-snug truncate">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex border-b border-slate-100 shrink-0 bg-white">
          {tabs.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)} className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all ${activeTab === id ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              <Icon size={13} />{label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'payment' && (
            <div className="p-4">
              <PaymentPanel order={enrichedOrder} customerPaidStr={customerPaidStr} onPaidChange={setCustomerPaidStr} />
            </div>
          )}
          {activeTab === 'customer' && (
            <div className="p-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-inner mx-auto max-w-[300px]">
                <ReceiptPreview html={customerHTML} />
              </div>
            </div>
          )}
          {activeTab === 'kitchen' && (
            <div className="p-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-inner mx-auto max-w-[260px]">
                <ReceiptPreview html={kitchenHTML} />
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-slate-100 shrink-0 space-y-2 bg-white">
          <button
            type="button"
            disabled={primaryDisabled}
            onClick={handlePrimaryPrint}
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
          >
            {primaryPrinting ? <Loader2 size={15} className="animate-spin" /> : <Printer size={15} />}
            {primaryLabel}
          </button>
          {activeTab === 'payment' ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={printing !== null || !paymentOk}
                onClick={() => void handlePrintAndComplete('both')}
                className="flex items-center justify-center gap-1.5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {printing === 'both' ? <Loader2 size={13} className="animate-spin" /> : <Printer size={13} />}
                Print Both
              </button>
              <button
                type="button"
                disabled={printing !== null}
                onClick={() => onSubmitPending(order)}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
              >
                <Send size={13} />
                Submit
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={printing !== null}
              onClick={() => onSubmitPending(order)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
            >
              <Send size={13} />
              Submit Without Print
            </button>
          )}
          <p className="text-[10px] text-center text-slate-400">{footerHint}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NewOrder() {
  const { addTransaction } = useERP();

  const [catalog] = useState<MenuItem[]>(() =>
    loadMenuCatalog().filter((i) => i.available),
  );
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | 'All'>('All');

  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState<string>(NO_TABLE);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'bkash'>('cash');
  const [channel, setChannel] = useState<'in_store' | 'takeaway' | 'delivery'>('in_store');

  const [discountType, setDiscountType] = useState<DiscountType>('flat');
  const [discountStr, setDiscountStr] = useState('');

  const [draftOrder, setDraftOrder] = useState<NewOrderData | null>(null);

  // ── Filtered catalog ──
  const filteredCatalog = useMemo(() => {
    let items = catalog;
    if (selectedCategory !== 'All') items = items.filter((i) => i.category === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((i) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
    }
    return items;
  }, [catalog, selectedCategory, searchQuery]);

  // ── Cart helpers ──
  const getQty = useCallback(
    (id: string) => orderItems.find((o) => o.menuItem.id === id)?.quantity ?? 0,
    [orderItems],
  );

  const addItem = useCallback((item: MenuItem) => {
    setOrderItems((prev) => {
      const ex = prev.find((o) => o.menuItem.id === item.id);
      if (ex) return prev.map((o) => o.menuItem.id === item.id ? { ...o, quantity: o.quantity + 1 } : o);
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  }, []);

  const increment = useCallback((id: string) => {
    setOrderItems((prev) => prev.map((o) => o.menuItem.id === id ? { ...o, quantity: o.quantity + 1 } : o));
  }, []);

  const decrement = useCallback((id: string) => {
    setOrderItems((prev) => {
      const oi = prev.find((o) => o.menuItem.id === id);
      if (!oi) return prev;
      if (oi.quantity === 1) return prev.filter((o) => o.menuItem.id !== id);
      return prev.map((o) => o.menuItem.id === id ? { ...o, quantity: o.quantity - 1 } : o);
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setOrderItems((prev) => prev.filter((o) => o.menuItem.id !== id));
  }, []);

  const toggleGift = useCallback((id: string) => {
    setOrderItems((prev) =>
      prev.map((o) => (o.menuItem.id === id ? { ...o, isGift: !o.isGift } : o)),
    );
  }, []);

  const clearCart = useCallback(() => setOrderItems([]), []);

  const discountValue = parseFloat(discountStr) || 0;
  const { subtotal, discount, total, totalItems } = useMemo(
    () => computeOrderTotals(orderItems, discountType, discountValue),
    [orderItems, discountType, discountValue],
  );

  // ── Validation ──
  const isDineIn = channel === 'in_store';
  const tableMissing = isDineIn && (!tableNumber || tableNumber === NO_TABLE);
  const canComplete = orderItems.length > 0 && !tableMissing;

  const resetPos = useCallback(() => {
    setDraftOrder(null);
    setOrderItems([]);
    setCustomerName('');
    setTableNumber(NO_TABLE);
    setDiscountStr('');
    setDiscountType('flat');
    setPaymentMethod('cash');
    setChannel('in_store');
  }, []);

  const saveOrder = useCallback(
    (order: NewOrderData, status: 'completed' | 'pending') => {
      const tx = orderToTransaction(order, status);
      addTransaction({ ...tx, date: new Date(order.createdAt) });
    },
    [addTransaction],
  );

  const handleOpenCompletion = useCallback(() => {
    if (orderItems.length === 0) { toast.error('Add at least one item to the order'); return; }
    if (channel === 'in_store' && (!tableNumber || tableNumber === NO_TABLE)) {
      toast.error('Select a table to complete a Dine-In order');
      return;
    }
    setDraftOrder(
      buildDraftOrder({
        items: orderItems,
        customerName,
        tableNumber,
        paymentMethod,
        channel,
        discountType,
        discountValue,
      }),
    );
  }, [orderItems, customerName, tableNumber, paymentMethod, channel, discountType, discountValue]);

  const handlePrintAndComplete = useCallback(
    async (order: NewOrderData, kind: 'customer' | 'both') => {
      saveOrder(order, 'completed');
      toast.success(`Order ${order.orderNumber} completed · ৳${order.total}`);
      resetPos();
      void kind;
    },
    [saveOrder, resetPos],
  );

  const handleSubmitPending = useCallback(
    (order: NewOrderData) => {
      saveOrder(order, 'pending');
      toast.success(`Order ${order.orderNumber} saved as pending`);
      resetPos();
    },
    [saveOrder, resetPos],
  );

  return (
    <div className="flex gap-4 h-[calc(100vh-140px)] min-h-[600px]">

      {/* ── LEFT: Product Browser (60%) ── */}
      <div className="flex-[3] min-w-0 flex flex-col gap-3 overflow-hidden">
        <div className="shrink-0">
          <h1 className="text-xl font-bold text-slate-800">Order Item List</h1>
          <p className="text-xs text-slate-500">Select items to add to the order</p>
        </div>

        {/* Search */}
        <div className="relative shrink-0">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products by name..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5 shrink-0">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              selectedCategory === 'All'
                ? 'bg-amber-400 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            All
          </button>
          {ALL_CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            const style = CATEGORY_STYLES[cat];
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  isActive ? style.badge : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Product List — horizontal cards */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
          {filteredCatalog.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-2 pb-4">
              {filteredCatalog.map((item) => (
                <OrderProductCard key={item.id} item={item} qty={getQty(item.id)} onAdd={addItem} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <Package2 size={36} className="text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-500">No items found</p>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Order Cart (40%) ── */}
      <div className="flex-[2] min-w-[320px] shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">

        {/* Cart Header */}
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart size={16} className="text-slate-600" />
            <span className="font-bold text-slate-800 text-sm">Current Order</span>
            {totalItems > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </div>
          {orderItems.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-red-400 hover:text-red-500 font-semibold flex items-center gap-1 transition-colors"
            >
              <Trash2 size={11} /> Clear
            </button>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4">
          {orderItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <ShoppingCart size={38} className="text-slate-200 mb-3" />
              <p className="text-sm font-semibold text-slate-400">Cart is empty</p>
              <p className="text-xs text-slate-300 mt-1">Tap products to add them</p>
            </div>
          ) : (
            orderItems.map((oi) => (
              <CartItemRow
                key={oi.menuItem.id}
                orderItem={oi}
                onIncrement={() => increment(oi.menuItem.id)}
                onDecrement={() => decrement(oi.menuItem.id)}
                onRemove={() => removeItem(oi.menuItem.id)}
                onToggleGift={() => toggleGift(oi.menuItem.id)}
              />
            ))
          )}
        </div>

        {/* Order Details + Summary */}
        <div className="border-t border-slate-100 p-3.5 space-y-3 shrink-0">

          {/* Channel */}
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { val: 'in_store', label: 'Dine In', Icon: Store },
                { val: 'takeaway', label: 'Takeaway', Icon: Coffee },
                { val: 'delivery', label: 'Delivery', Icon: Bike },
              ] as const
            ).map(({ val, label, Icon }) => (
              <button
                key={val}
                onClick={() => setChannel(val)}
                className={`flex flex-col items-center gap-0.5 py-2 rounded-xl border text-[11px] font-semibold transition-all ${
                  channel === val
                    ? 'border-amber-400 bg-amber-50 text-amber-700'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {/* Customer name + Table dropdown */}
          <div className={isDineIn ? 'grid grid-cols-2 gap-2' : ''}>
            <div className="relative">
              <User size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer (optional)"
                className="w-full pl-7 pr-2 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
              />
            </div>

            {isDineIn && (
              <div className="relative">
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className={`w-full pl-2.5 pr-7 py-2 rounded-xl border text-xs outline-none transition-all appearance-none bg-white ${
                    tableMissing
                      ? 'border-red-300 text-red-600 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                      : 'border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100'
                  }`}
                >
                  <option value={NO_TABLE}>Select table *</option>
                  {TABLE_OPTIONS.filter((opt) => opt !== NO_TABLE).map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {tableMissing && (
            <p className="flex items-center gap-1 text-[11px] text-red-500 font-medium -mt-1">
              <AlertCircle size={11} /> Table selection is required for Dine-In orders
            </p>
          )}

          {/* Payment Method */}
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { val: 'cash', label: 'Cash', Icon: Banknote },
                { val: 'bkash', label: 'bKash', Icon: Smartphone },
                { val: 'bank', label: 'Card', Icon: Landmark },
              ] as const
            ).map(({ val, label, Icon }) => (
              <button
                key={val}
                onClick={() => setPaymentMethod(val)}
                className={`flex items-center justify-center gap-1 py-2 rounded-xl border text-[11px] font-semibold transition-all ${
                  paymentMethod === val
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>

          {/* Discount — type toggle + value */}
          <div className="flex items-stretch gap-2">
            <div className="flex rounded-xl border border-slate-200 overflow-hidden shrink-0">
              {(
                [
                  { val: 'flat', label: '৳' },
                  { val: 'percent', label: '%' },
                ] as const
              ).map(({ val, label }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setDiscountType(val)}
                  className={`w-9 text-sm font-bold transition-all ${
                    discountType === val
                      ? 'bg-amber-500 text-white'
                      : 'bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <Tag size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="number"
                min="0"
                max={discountType === 'percent' ? 100 : undefined}
                value={discountStr}
                onChange={(e) => setDiscountStr(e.target.value)}
                placeholder={discountType === 'percent' ? 'Discount %' : 'Discount amount'}
                className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
              />
            </div>
          </div>

          {/* Order summary */}
          <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Subtotal ({totalItems} item{totalItems !== 1 ? 's' : ''})</span>
              <span className="tabular-nums">৳{subtotal}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-xs text-emerald-600 font-medium">
                <span>Discount{discountType === 'percent' && discountValue > 0 ? ` (${Math.min(discountValue, 100)}%)` : ''}</span>
                <span className="tabular-nums">−৳{discount}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-slate-800 border-t border-slate-200 pt-1.5">
              <span>Total</span>
              <span className="tabular-nums">৳{total}</span>
            </div>
          </div>

          {/* Complete button — centered & prominent */}
          <button
            onClick={handleOpenCompletion}
            disabled={!canComplete}
            className={`w-full py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
              canComplete
                ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-200/60 active:scale-[0.98]'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 size={18} />
            Complete Order
          </button>
        </div>
      </div>

      {/* ── Receipt Modal — shown for every order type ── */}
      {draftOrder && (
        <OrderCompletionModal
          order={draftOrder}
          onClose={() => setDraftOrder(null)}
          onPrintAndComplete={handlePrintAndComplete}
          onSubmitPending={handleSubmitPending}
        />
      )}
    </div>
  );
}
