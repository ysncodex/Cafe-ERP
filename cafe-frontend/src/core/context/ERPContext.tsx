import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Transaction, DateRange, DateRangeFilter, ERPContextType } from '@/core/types';
import { generateId, STORAGE_KEYS } from '@/shared/utils';

import { loadPersistedERPState, savePersistedERPState } from './erp/storage';
import { LEGACY_DEFAULT_ITEM_NAMES, LEGACY_DEFAULT_SUPPLIERS } from './erp/legacyDefaults';
import { cleanInitialList, normalizeLabel, uniqueByLower } from './erp/listUtils';
import { filterTransactions } from './erp/filters';
import { computeStats } from './erp/stats';
import { computeDailyRecords } from './erp/dailyRecords';

import { ERPContext } from './ERPContextDef';

function loadSavedDateRange(): DateRangeFilter {
  if (typeof window === 'undefined') return { from: null, to: null };
  try {
    const raw = localStorage.getItem('dateRange');
    if (!raw) return { from: null, to: null };
    const parsed = JSON.parse(raw) as { from?: string; to?: string };
    const from = parsed.from ? new Date(parsed.from) : null;
    const to = parsed.to ? new Date(parsed.to) : null;
    if (from && !Number.isNaN(from.getTime()) && to && !Number.isNaN(to.getTime())) {
      return { from, to };
    }
  } catch {
    // ignore invalid saved range
  }
  return { from: null, to: null };
}

// ─── Helpers (module-level, no closure over component state) ──────────────────

function loadActiveState() {
  const persisted = loadPersistedERPState(STORAGE_KEYS.ERP_STATE);
  return { persisted };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ERPProvider({ children }: { children: ReactNode }) {
  // Single initialization call — result shared across all useState initializers
  // so localStorage is read exactly once on mount.
  const [initialState] = useState(loadActiveState);

  const [transactions, setTransactions] = useState<Transaction[]>(
    () => initialState.persisted?.transactions ?? []
  );
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [customDateRange, setCustomDateRange] = useState<DateRangeFilter>(loadSavedDateRange);

  const [itemNames, setItemNames] = useState<string[]>(() =>
    cleanInitialList(initialState.persisted?.itemNames, LEGACY_DEFAULT_ITEM_NAMES)
  );
  const [suppliers, setSuppliers] = useState<string[]>(() =>
    cleanInitialList(initialState.persisted?.suppliers, LEGACY_DEFAULT_SUPPLIERS)
  );

  // ── Persistence ─────────────────────────────────────────────────────────────
  useEffect(() => {
    savePersistedERPState(STORAGE_KEYS.ERP_STATE, { transactions, itemNames, suppliers });
  }, [transactions, itemNames, suppliers]);

  // ── Derived state ───────────────────────────────────────────────────────────
  const filteredTransactions = useMemo(
    () => filterTransactions({ transactions, dateRange, customStart, customEnd, customDateRange }),
    [transactions, dateRange, customStart, customEnd, customDateRange]
  );

  const stats = useMemo(
    () => computeStats(transactions, filteredTransactions),
    [transactions, filteredTransactions]
  );

  const dailyRecords = useMemo(
    () => computeDailyRecords(filteredTransactions),
    [filteredTransactions]
  );

  // ── Transaction actions ─────────────────────────────────────────────────────
  // useCallback keeps references stable across renders so child components that
  // receive these as props don't re-render unnecessarily.

  const addTransaction = useCallback(
    (data: Omit<Transaction, 'id' | 'date'> & { date?: Date }): Transaction => {
      const newTransaction: Transaction = {
        ...data,
        id: generateId(),
        date: data.date ?? new Date(),
      };
      setTransactions((prev) => [newTransaction, ...prev]);
      return newTransaction;
    },
    []
  );

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateTransaction = useCallback((updated: Transaction) => {
    setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }, []);

  /** Reset all transactions and lists back to empty / legacy defaults. */
  const clearAllData = useCallback(() => {
    setTransactions([]);
    setItemNames([...LEGACY_DEFAULT_ITEM_NAMES]);
    setSuppliers([...LEGACY_DEFAULT_SUPPLIERS]);
  }, []);

  // ── List actions ────────────────────────────────────────────────────────────

  const addItemName = useCallback((name: string) => {
    const v = normalizeLabel(name);
    if (!v) return;
    setItemNames((prev) => uniqueByLower([...prev, v]));
  }, []);

  const addSupplier = useCallback((name: string) => {
    const v = normalizeLabel(name);
    if (!v) return;
    setSuppliers((prev) => uniqueByLower([...prev, v]));
  }, []);

  const renameItemName = useCallback((oldName: string, newName: string) => {
    const from = normalizeLabel(oldName);
    const to = normalizeLabel(newName);
    if (!from || !to) return;
    setItemNames((prev) =>
      uniqueByLower(prev.map((v) => (v.toLowerCase() === from.toLowerCase() ? to : v)))
    );
  }, []);

  const deleteItemName = useCallback((name: string) => {
    const v = normalizeLabel(name);
    if (!v) return;
    setItemNames((prev) => prev.filter((x) => x.toLowerCase() !== v.toLowerCase()));
  }, []);

  const renameSupplier = useCallback((oldName: string, newName: string) => {
    const from = normalizeLabel(oldName);
    const to = normalizeLabel(newName);
    if (!from || !to) return;
    setSuppliers((prev) =>
      uniqueByLower(prev.map((v) => (v.toLowerCase() === from.toLowerCase() ? to : v)))
    );
  }, []);

  const deleteSupplier = useCallback((name: string) => {
    const v = normalizeLabel(name);
    if (!v) return;
    setSuppliers((prev) => prev.filter((x) => x.toLowerCase() !== v.toLowerCase()));
  }, []);

  // ── Context value ───────────────────────────────────────────────────────────

  const value: ERPContextType = {
    transactions,
    filteredTransactions,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    clearAllData,
    dateRange,
    setDateRange,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    customDateRange,
    setCustomDateRange,
    stats,
    dailyRecords,
    itemNames,
    suppliers,
    addItemName,
    addSupplier,
    renameItemName,
    deleteItemName,
    renameSupplier,
    deleteSupplier,
  };

  return <ERPContext.Provider value={value}>{children}</ERPContext.Provider>;
}
