import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  ArrowRightLeft,
  AlertTriangle,
  Banknote,
  Bike,
  CheckCircle2,
  ClipboardList,
  Cloud,
  Landmark,
  Layers,
  Pencil,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingBag,
  Smartphone,
  Store,
  Trash2,
  Utensils,
  Wifi,
  WifiOff,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useERP } from '@/core/context/useERP';
import RangeCalendar from '@/shared/components/ui/Calendar/CustomCalendar';
import {
  EditTransactionModal,
  ManagerPasswordModal,
  Pagination,
} from '@/shared/components/ui';
import { useClientPagination } from '@/shared/hooks';
import type { Transaction, PaymentMethod, SalesChannel, DateRange } from '@/core/types';
import { sleep, generateId } from '@/shared/utils';
import { formatCurrency, formatDateTime } from '@/shared/utils/formatters';
import {
  formatLastSuccessfulSyncPhrase,
  loadPosSyncHub,
  pushIntegrationLog,
  savePosSyncHub,
  type DeliveryIntegrationKey,
  type PendingOfflineInvoice,
  type PosSyncHubState,
  type SyncFailureLogEntry,
} from '@/modules/sales/utils/posSyncHub.storage';

function getNavigatorOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

function periodDescription(
  customDateRange: { from: Date | null; to: Date | null },
  dateRange: DateRange,
): string {
  if (customDateRange.from && customDateRange.to) {
    const a = customDateRange.from.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const b = customDateRange.to.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${a} – ${b}`;
  }
  const labels: Record<DateRange, string> = {
    today: 'Today',
    week: 'This week',
    month: 'This month',
    prev_month: 'Previous month',
    custom: 'Custom period',
    all: 'All time',
  };
  return labels[dateRange] ?? 'Current period';
}

const SYNC_CHANNELS: SalesChannel[] = ['in_store', 'foodpanda', 'foodi'];

const CHANNEL_DISPLAY: Record<
  SalesChannel,
  { label: string; icon: LucideIcon; badgeClass: string }
> = {
  in_store: {
    label: 'In-Store',
    icon: Store,
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  foodpanda: {
    label: 'Foodpanda',
    icon: ShoppingBag,
    badgeClass: 'bg-orange-50 text-orange-700 border border-orange-200',
  },
  foodi: {
    label: 'Foodi',
    icon: Utensils,
    badgeClass: 'bg-violet-50 text-violet-700 border border-violet-200',
  },
};

const METHOD_DISPLAY: Record<PaymentMethod, { label: string; icon: LucideIcon; color: string }> = {
  cash: { label: 'Cash', icon: Banknote, color: 'text-emerald-600' },
  bkash: { label: 'bKash', icon: Smartphone, color: 'text-pink-600' },
  bank: { label: 'Bank', icon: Landmark, color: 'text-blue-600' },
};

const TYPE_LABELS: Record<string, string> = {
  sale: 'Sale',
  sale_adjustment: 'Adjustment',
};

const THIRD_PARTY_IDS: DeliveryIntegrationKey[] = ['foodpanda', 'foodi', 'pathao'];

const INTEGRATION_UI: Record<
  DeliveryIntegrationKey,
  {
    title: string;
    subtitle: string;
    icon: LucideIcon;
    ledgerChannel: SalesChannel;
    descriptionPrefix: string;
  }
> = {
  foodpanda: {
    title: 'Foodpanda',
    subtitle: 'Partner API • delivery marketplace',
    icon: ShoppingBag,
    ledgerChannel: 'foodpanda',
    descriptionPrefix: 'Foodpanda import',
  },
  foodi: {
    title: 'Foodi',
    subtitle: 'Partner API • delivery marketplace',
    icon: Utensils,
    ledgerChannel: 'foodi',
    descriptionPrefix: 'Foodi import',
  },
  pathao: {
    title: 'Pathao Food',
    subtitle: 'Partner API • delivery revenue aggregator',
    icon: Bike,
    ledgerChannel: 'foodi',
    descriptionPrefix: '[Pathao Food]',
  },
};

type PendingPasswordAction =
  | { kind: 'retry_sync_error'; data: SyncFailureLogEntry }
  | { kind: 'resolve_sync_error'; data: { id: string } }
  | { kind: 'delete_tx'; data: Transaction }
  | { kind: 'authorize_edit_tx'; data: Transaction };

export default function PosSync() {
  const {
    filteredTransactions,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    itemNames,
    suppliers,
    customDateRange,
    setCustomDateRange,
    dateRange,
  } = useERP();

  const periodLabel = useMemo(
    () => periodDescription(customDateRange, dateRange),
    [customDateRange, dateRange],
  );

  const [hub, setHub] = useState<PosSyncHubState>(() => loadPosSyncHub());

  useEffect(() => {
    savePosSyncHub(hub);
  }, [hub]);

  const [isOnline, setIsOnline] = useState(() => getNavigatorOnline());

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    setHub((prev) => {
      if (prev.lastSuccessfulSyncISO != null) return prev;
      if (!getNavigatorOnline()) return prev;
      return { ...prev, lastSuccessfulSyncISO: new Date().toISOString() };
    });
  }, []);

  /* ─── Transaction log (posted sales / adjustments) ──────────────────────── */

  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<SalesChannel | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'sale' | 'sale_adjustment'>('all');
  const [editTarget, setEditTarget] = useState<Transaction | null>(null);

  const dayTransactions = useMemo(() => {
    return filteredTransactions.filter((t) => t.type === 'sale' || t.type === 'sale_adjustment');
  }, [filteredTransactions]);

  const filteredTxnRows = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return dayTransactions.filter((t) => {
      const okSearch =
        !q ||
        (t.description?.toLowerCase().includes(q) ?? false) ||
        String(t.amount).includes(q) ||
        t.id.toLowerCase().includes(q);
      const okCh = channelFilter === 'all' || t.channel === channelFilter;
      const okTy = typeFilter === 'all' || t.type === typeFilter;
      return okSearch && okCh && okTy;
    });
  }, [dayTransactions, searchQuery, channelFilter, typeFilter]);

  const { paginatedData, pagination } = useClientPagination(filteredTxnRows, {
    initialPageSize: 10,
  });

  const resetTxnFilters = useCallback(() => {
    setSearchQuery('');
    setChannelFilter('all');
    setTypeFilter('all');
  }, []);

  const handleEditSave = useCallback(
    (updated: Transaction) => {
      updateTransaction(updated);
      toast.success('Transaction updated.');
      setEditTarget(null);
    },
    [updateTransaction],
  );

  /* ─── Offline queue flush / integrations (unchanged) ───────────────────── */

  const flushingRef = useRef(false);
  const [isFlushingPending, setIsFlushingPending] = useState(false);
  const [flushProgress, setFlushProgress] = useState(0);
  const prevOnlineRef = useRef(isOnline);

  const ingestPendingSale = useCallback(
    (row: PendingOfflineInvoice): void => {
      addTransaction({
        type: 'sale',
        channel: row.channel,
        method: row.method,
        amount: row.amount,
        description: `${row.description} (${row.invoiceNo})`,
        date: new Date(row.capturedAtISO),
      });
    },
    [addTransaction],
  );

  const hubRef = useRef(hub);
  hubRef.current = hub;

  const flushPendingQueue = useCallback(async () => {
    if (!getNavigatorOnline()) {
      toast.error('Offline — cashier tickets stay safely on this device until the network returns.');
      return;
    }
    if (flushingRef.current) return;

    const batch = [...hubRef.current.pendingQueue];
    const initialIds = new Set(batch.map((b) => b.id));

    if (batch.length === 0) {
      toast.message('Invoice queue is clear.');
      setHub((prev) => ({
        ...prev,
        lastSuccessfulSyncISO: new Date().toISOString(),
      }));
      return;
    }

    flushingRef.current = true;
    setIsFlushingPending(true);
    setFlushProgress(4);

    const newFailures: SyncFailureLogEntry[] = [];
    const total = batch.length;
    let attempted = 0;
    let successCount = 0;
    let queue = [...batch];

    try {
      while (queue.length > 0) {
        if (!getNavigatorOnline()) {
          toast.warning('Upload paused — connectivity dropped mid-batch.');
          break;
        }

        const item = queue[0];
        queue = queue.slice(1);

        attempted += 1;
        setFlushProgress(Math.min(96, Math.round((attempted / total) * 100)));

        await sleep(40 + Math.min(120, attempted * 3));

        if (item.simulatedFailureReason) {
          newFailures.push({
            id: generateId(),
            createdAtISO: new Date().toISOString(),
            orderLabel: item.invoiceNo,
            message: `Sync Failed for ${item.invoiceNo}: ${item.simulatedFailureReason}.`,
            resolved: false,
            retryCount: 0,
            payload: item,
          });
          continue;
        }

        ingestPendingSale(item);
        successCount += 1;
      }

      const finishedBatch = queue.length === 0;
      setFlushProgress(100);

      setHub((prev) => ({
        ...prev,
        pendingQueue: [...prev.pendingQueue.filter((p) => !initialIds.has(p.id)), ...queue],
        errors: [...prev.errors, ...newFailures],
        lastSuccessfulSyncISO: new Date().toISOString(),
      }));

      if (newFailures.length > 0) {
        toast.error(
          `${newFailures.length} invoice${newFailures.length > 1 ? 's' : ''} moved to Error Log`,
        );
      }
      if (successCount > 0 && finishedBatch) {
        toast.success(
          `Posted ${successCount} offline invoice${successCount === 1 ? '' : 's'} into the ERP ledger`,
        );
      }
      if (successCount > 0 && !finishedBatch) {
        toast.success(
          `Posted ${successCount} offline invoice${successCount === 1 ? '' : 's'} before reconnect pause`,
        );
      }
    } finally {
      flushingRef.current = false;
      setIsFlushingPending(false);
      window.setTimeout(() => setFlushProgress(0), 700);
    }
  }, [ingestPendingSale]);

  const fetchPartnerOrders = useCallback(
    async (key: DeliveryIntegrationKey) => {
      if (!getNavigatorOnline()) {
        toast.error('Partner APIs are unreachable while offline');
        return;
      }
      await sleep(280 + Math.random() * 220);
      const ui = INTEGRATION_UI[key];
      const deliveryCount = Math.max(5, Math.min(18, Math.floor(10 + Math.random() * 8)));
      const methods: PaymentMethod[] = ['bkash', 'cash', 'bank'];
      const captured = new Date();
      const timeLabel = captured.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      for (let i = 0; i < deliveryCount; i += 1) {
        addTransaction({
          type: 'sale',
          channel: ui.ledgerChannel,
          method: methods[i % methods.length],
          amount: 95 + (((i + 3) * 47) % 410),
          description: `${ui.descriptionPrefix} • delivery order ${Date.now().toString(36).slice(-4)}-${i + 1}`,
          date: new Date(Date.now() - i * 18_000),
        });
      }

      setHub((prev) => {
        const next = pushIntegrationLog(prev, {
          integration: key,
          message: `Fetched ${deliveryCount} delivery orders from ${ui.title} at ${timeLabel}. Revenue posted into Daily Sales.`,
          atISO: new Date().toISOString(),
        });
        return { ...next, lastSuccessfulSyncISO: new Date().toISOString() };
      });

      toast.success(`${deliveryCount} ${ui.title} orders imported`);
    },
    [addTransaction],
  );

  useEffect(() => {
    if (isOnline) {
      const resumed = prevOnlineRef.current === false;
      prevOnlineRef.current = true;
      if (resumed && hubRef.current.pendingQueue.length > 0 && !flushingRef.current) {
        toast.info('Network restored — uploading queued POS receipts…');
        void flushPendingQueue();
      }
    } else {
      prevOnlineRef.current = false;
    }
  }, [isOnline, flushPendingQueue]);

  const enqueueSyntheticOfflineReceipt = useCallback(() => {
    const inv = `INV-LOC-${Math.floor(Date.now() / 1000) % 10_000}`;
    setHub((prev) => ({
      ...prev,
      pendingQueue: [
        {
          id: generateId(),
          invoiceNo: inv,
          capturedAtISO: new Date().toISOString(),
          amount: Math.round((85 + Math.random() * 120) * 100) / 100,
          channel: 'in_store',
          method: 'cash',
          description: `Local POS offline capture (${inv})`,
        },
        ...prev.pendingQueue,
      ],
    }));
    toast.message('Sandbox receipt queued (simulates cashier Wi-Fi outage).');
  }, []);

  /* ─── Manager modal (sync errors + transaction edit/delete) ─────────────── */

  const [pendingPw, setPendingPw] = useState<PendingPasswordAction | null>(null);
  const [showPwModal, setShowPwModal] = useState(false);

  const openPassword = useCallback((action: PendingPasswordAction) => {
    setPendingPw(action);
    setShowPwModal(true);
  }, []);

  const passwordTitle = useMemo(() => {
    if (!pendingPw) return 'Manager authorization';
    switch (pendingPw.kind) {
      case 'retry_sync_error':
        return 'Authorize Sync Retry';
      case 'resolve_sync_error':
        return 'Authorize Issue Resolution';
      case 'delete_tx':
        return 'Delete Transaction';
      case 'authorize_edit_tx':
        return 'Edit Transaction';
      default:
        return 'Manager authorization';
    }
  }, [pendingPw]);

  const handlePasswordConfirm = useCallback(() => {
    if (!pendingPw) return;

    switch (pendingPw.kind) {
      case 'retry_sync_error': {
        const entry = pendingPw.data;
        if (!entry.payload) {
          toast.error('This error cannot replay automatically — correct master data first.');
          break;
        }
        const replay: PendingOfflineInvoice = {
          ...entry.payload,
          id: generateId(),
          simulatedFailureReason: undefined,
        };
        setHub((prev) => ({
          ...prev,
          errors: prev.errors.filter((e) => e.id !== entry.id),
          pendingQueue: [replay, ...prev.pendingQueue],
        }));
        toast.success(`${entry.orderLabel} re-queued for upload`);
        window.setTimeout(() => void flushPendingQueue(), 140);
        break;
      }
      case 'resolve_sync_error': {
        const { id } = pendingPw.data;
        setHub((prev) => ({
          ...prev,
          errors: prev.errors.map((e) => (e.id === id ? { ...e, resolved: true } : e)),
        }));
        toast.success('Incident marked resolved in the sync log.');
        break;
      }
      case 'delete_tx': {
        deleteTransaction(pendingPw.data.id);
        toast.success('Transaction deleted.');
        break;
      }
      case 'authorize_edit_tx':
        setEditTarget(pendingPw.data);
        break;
      default:
        break;
    }

    setPendingPw(null);
    setShowPwModal(false);
  }, [pendingPw, deleteTransaction, flushPendingQueue]);

  const handlePasswordModalClose = useCallback(() => {
    setShowPwModal(false);
    setPendingPw(null);
  }, []);

  const unresolvedErrors = useMemo(
    () => hub.errors.filter((e) => !e.resolved),
    [hub.errors],
  );

  const lastSyncPhrase = formatLastSuccessfulSyncPhrase(hub.lastSuccessfulSyncISO);

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-3">
        <div className="bg-indigo-100 p-3 rounded-xl shrink-0">
          <ArrowRightLeft size={22} className="text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 leading-tight">POS Sync</h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
            Connection health, offline queue, partner imports, sync errors, and posted transaction review.
          </p>
        </div>
      </header>

      <section
        aria-label="Connection and sync health"
        className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-5 py-4 bg-gradient-to-r from-slate-50 via-white to-slate-50/80 border-b border-slate-100">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border ${
                    isOnline
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {isOnline ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                  {isOnline ? 'Connected' : 'Offline'}
                </span>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                  POS ⇄ ERP link
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-800 mt-2 leading-snug">
                {!isOnline
                  ? 'Local POS keeps ringing sales during Wi‑Fi outages; uploads resume automatically when you reconnect.'
                  : hub.pendingQueue.length > 0
                  ? `${hub.pendingQueue.length} invoice${hub.pendingQueue.length === 1 ? '' : 's'} pending ERP upload`
                  : 'Connectivity OK — cashier captures post into Daily Sales unless they are queued below.'}
              </p>
              <p className="text-xs text-slate-500 mt-1">{lastSyncPhrase}</p>
            </div>
          </div>

          <button
            type="button"
            disabled={isFlushingPending || !isOnline || hub.pendingQueue.length === 0}
            onClick={() => void flushPendingQueue()}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw size={15} className={isFlushingPending ? 'animate-spin' : ''} />
            {isFlushingPending ? 'Uploading…' : 'Sync pending receipts'}
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-5 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-start gap-3">
            <div className="bg-amber-50 p-2.5 rounded-xl text-amber-700 shrink-0">
              <Layers size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Offline capture queue
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Cashiers keep printing receipts offline; Beans & Butter buffers them safely here.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 items-baseline">
                <span className="text-3xl font-black text-slate-900 tabular-nums">
                  {hub.pendingQueue.length}
                </span>
                <span className="text-sm font-semibold text-slate-600">
                  invoice{hub.pendingQueue.length === 1 ? '' : 's'} pending sync
                </span>
              </div>
              {hub.pendingQueue.length > 0 && (
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    <span>ERP upload runway</span>
                    <span>
                      {isFlushingPending
                        ? `${Math.round(flushProgress)}%`
                        : isOnline
                        ? 'Ready'
                        : 'Paused'}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                    <div
                      className={`h-full rounded-full transition-[width] duration-300 ease-out ${
                        isFlushingPending
                          ? 'bg-gradient-to-r from-indigo-500 to-emerald-500'
                          : 'bg-indigo-200'
                      }`}
                      style={{
                        width: `${isFlushingPending ? flushProgress : isOnline ? 12 : 0}%`,
                      }}
                    />
                  </div>
                  {!isOnline && (
                    <p className="text-[11px] text-rose-700 font-semibold mt-2 flex items-center gap-1">
                      <WifiOff size={13} />
                      Connectivity lost — uploads resume automatically when you reconnect.
                    </p>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() => enqueueSyntheticOfflineReceipt()}
                className="mt-4 text-xs font-bold text-indigo-700 px-3 py-2 rounded-xl border border-indigo-200 hover:bg-indigo-50 transition-colors"
              >
                + Simulate offline receipt
              </button>
            </div>
          </div>
        </div>

        <div className="xl:col-span-7 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Cloud size={18} className="text-indigo-500 shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Third-party integrations
              </h2>
              <p className="text-[11px] text-slate-500">
                Foodpanda, Foodi, and Pathao Food orders flow straight into ERP revenue totals.
              </p>
            </div>
          </div>
          <div className="p-5 grid gap-4 sm:grid-cols-3">
            {THIRD_PARTY_IDS.map((key) => {
              const ui = INTEGRATION_UI[key];
              const Icon = ui.icon;
              return (
                <div
                  key={key}
                  className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 flex flex-col gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-xl border border-slate-200 shrink-0">
                      <Icon size={22} className="text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800">{ui.title}</p>
                      <p className="text-[11px] text-slate-500 leading-snug">{ui.subtitle}</p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center w-fit px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      isOnline
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    {isOnline ? 'API reachable' : 'Connector offline'}
                  </span>
                  <button
                    type="button"
                    disabled={!isOnline}
                    onClick={() => void fetchPartnerOrders(key)}
                    className="mt-auto w-full py-2 rounded-xl text-[11px] font-bold uppercase tracking-wide bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-indigo-100"
                  >
                    Fetch orders
                  </button>
                </div>
              );
            })}
          </div>
          <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 flex-1 min-h-[120px]">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2 flex items-center gap-1">
              <ClipboardList size={12} />
              Connector activity
            </p>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {hub.integrationLogs.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  Trigger “Fetch orders” to record partner imports with timestamps here.
                </p>
              ) : (
                hub.integrationLogs.map((log) => (
                  <div
                    key={log.id}
                    className="text-xs text-slate-600 bg-white border border-slate-100 rounded-xl px-3 py-2"
                  >
                    <span className="text-[10px] text-slate-400 mr-2 font-mono">
                      {formatDateTime(log.atISO)}
                    </span>
                    {log.message}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="bg-slate-100 p-2.5 rounded-xl shrink-0">
              <ClipboardList size={17} className="text-slate-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Posted transaction log
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Sales and POS adjustments in the ERP for the current global date filter ({periodLabel}).
              </p>
            </div>
          </div>
          <div className="shrink-0">
            <RangeCalendar onRangeChange={setCustomDateRange} align="right" />
          </div>
        </div>

        <div className="px-5 py-3 border-b border-slate-100 flex flex-col sm:flex-row flex-wrap gap-2 sm:items-center sm:justify-between bg-slate-50/40">
          <div className="relative flex-1 max-w-xs min-w-[180px]">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search description, amount…"
              className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value as SalesChannel | 'all')}
              className="px-2.5 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              <option value="all">All channels</option>
              {SYNC_CHANNELS.map((ch) => (
                <option key={ch} value={ch}>
                  {CHANNEL_DISPLAY[ch].label}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as 'all' | 'sale' | 'sale_adjustment')
              }
              className="px-2.5 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              <option value="all">All types</option>
              <option value="sale">Sale</option>
              <option value="sale_adjustment">Adjustment</option>
            </select>
            {(searchQuery || channelFilter !== 'all' || typeFilter !== 'all') && (
              <button
                type="button"
                onClick={resetTxnFilters}
                className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 font-medium transition-colors"
              >
                <RotateCcw size={12} />
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredTxnRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400 px-4 text-center">
              <ClipboardList size={36} strokeWidth={1.2} />
              <p className="text-sm font-medium">No matching transactions</p>
              <p className="text-xs max-w-sm">
                {dayTransactions.length === 0
                  ? 'No sales or adjustments in this period. Widen the date range in the calendar or sync pending receipts.'
                  : 'Try adjusting filters or search.'}
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[720px]">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                <tr>
                  {(
                    [
                      'Date & time',
                      'Type',
                      'Channel',
                      'Method',
                      'Description',
                      'Amount',
                      'Actions',
                    ] as const
                  ).map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider ${
                        h === 'Actions' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedData.map((row) => {
                  const ch = row.channel as SalesChannel | undefined;
                  const chCfg = ch ? CHANNEL_DISPLAY[ch] : null;
                  const ChIcon = chCfg?.icon;
                  const mCfg = METHOD_DISPLAY[row.method];
                  const Mi = mCfg.icon;
                  const isAdj = row.type === 'sale_adjustment';

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-indigo-50/30 transition-colors duration-100 group text-xs"
                    >
                      <td className="px-4 py-2.5 font-mono text-slate-600 whitespace-nowrap">
                        {formatDateTime(row.date)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isAdj
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {TYPE_LABELS[row.type] ?? row.type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {!chCfg || !ChIcon ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${chCfg.badgeClass}`}
                          >
                            <ChIcon size={11} />
                            {chCfg.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 font-medium ${mCfg.color}`}>
                          <Mi size={13} />
                          {mCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 max-w-[200px]">
                        <span className="text-slate-700 truncate block">{row.description || '—'}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`font-bold tabular-nums ${isAdj ? 'text-rose-600' : 'text-emerald-700'}`}
                        >
                          {isAdj ? '−' : '+'}
                          {formatCurrency(row.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="inline-flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => openPassword({ kind: 'authorize_edit_tx', data: row })}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openPassword({ kind: 'delete_tx', data: row })}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {filteredTxnRows.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100">
            <Pagination pagination={pagination} showPageSizeSelector showPageInfo />
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap gap-3">
          <AlertTriangle size={18} className="text-rose-500 shrink-0" />
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Sync error log</h2>
            <p className="text-[11px] text-slate-500">
              {unresolvedErrors.length} open incident{unresolvedErrors.length === 1 ? '' : 's'} require manager
              intervention.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-slate-50 border-b border-slate-100 text-left">
              <tr>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">When</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Order</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Message</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {hub.errors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400 italic">
                    No sync failures logged.
                  </td>
                </tr>
              ) : (
                hub.errors.map((row) => (
                  <tr
                    key={row.id}
                    className={`text-xs ${row.resolved ? 'bg-slate-50/80 opacity-80' : 'hover:bg-indigo-50/40'}`}
                  >
                    <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                      {formatDateTime(row.createdAtISO)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{row.orderLabel}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-md">{row.message}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${
                          row.resolved
                            ? 'bg-slate-200 text-slate-700 ring-slate-200'
                            : 'bg-rose-50 text-rose-700 ring-rose-200'
                        }`}
                      >
                        {row.resolved ? 'Resolved' : 'Open'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!row.resolved ? (
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            disabled={row.payload == null || !isOnline}
                            onClick={() =>
                              row.payload &&
                              openPassword({ kind: 'retry_sync_error', data: row })
                            }
                            className="text-[11px] font-bold text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-200 hover:bg-indigo-50 disabled:opacity-35"
                          >
                            Retry sync
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              openPassword({ kind: 'resolve_sync_error', data: { id: row.id } })
                            }
                            className="text-[11px] font-bold text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50"
                          >
                            Resolve issue
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-semibold">Closed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ManagerPasswordModal
        isOpen={showPwModal}
        onClose={handlePasswordModalClose}
        onConfirm={handlePasswordConfirm}
        title={passwordTitle}
      />

      <EditTransactionModal
        isOpen={editTarget !== null}
        onClose={() => setEditTarget(null)}
        transaction={editTarget!}
        onSave={handleEditSave}
        itemNames={itemNames}
        suppliers={suppliers}
      />
    </div>
  );
}
