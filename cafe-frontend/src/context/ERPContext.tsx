/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Transaction, DateRange, DateRangeFilter, ERPContextType } from '@/core/types';
import {
  DEMO_MODE_EVENT,
  generateId,
  getInitialTransactions,
  getStoredUser,
  isDemoMode,
  STORAGE_KEYS,
} from '@/shared/utils';

import { loadPersistedERPState, savePersistedERPState } from './erp/storage';
import {
  LEGACY_DEFAULT_ITEM_NAMES,
  LEGACY_DEFAULT_SUPPLIERS,
} from './erp/legacyDefaults';
import { cleanInitialList, normalizeLabel, uniqueByLower } from './erp/listUtils';
import { filterTransactions } from './erp/filters';
import { computeStats } from './erp/stats';
import { computeDailyRecords } from './erp/dailyRecords';

const ERPContext = createContext<ERPContextType | undefined>(undefined);

export function ERPProvider({ children }: { children: ReactNode }) {
  const getActiveStorageKey = () =>
    isDemoMode() ? STORAGE_KEYS.ERP_STATE_DEMO : STORAGE_KEYS.ERP_STATE;

  const loadActiveState = () => {
    // If user is not guest, demo must be off (prevents owners seeing dummy data)
    const user = getStoredUser();
    if (user?.role !== 'guest') {
      try {
        if (localStorage.getItem(STORAGE_KEYS.DEMO_MODE) === 'true') {
          localStorage.setItem(STORAGE_KEYS.DEMO_MODE, 'false');
        }
      } catch {
        // ignore
      }
    }

    const storageKey = getActiveStorageKey();
    const persisted = loadPersistedERPState(storageKey);
    return {
      storageKey,
      persisted,
    };
  };

  const [, setActiveStorage] = useState(() => loadActiveState());

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const { persisted } = loadActiveState();
    return persisted?.transactions ?? getInitialTransactions();
  });
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [customDateRange, setCustomDateRange] = useState<DateRangeFilter>({ from: null, to: null });

  // Dynamic Lists
  const [itemNames, setItemNames] = useState<string[]>(() => {
    const { persisted } = loadActiveState();
    return cleanInitialList(persisted?.itemNames, LEGACY_DEFAULT_ITEM_NAMES);
  });
  const [suppliers, setSuppliers] = useState<string[]>(() => {
    const { persisted } = loadActiveState();
    return cleanInitialList(persisted?.suppliers, LEGACY_DEFAULT_SUPPLIERS);
  });

  // Swap datasets instantly when demo mode changes (guest only)
  useEffect(() => {
    const handleDemoModeChanged = () => {
      const user = getStoredUser();
      if (user?.role !== 'guest') {
        try {
          localStorage.setItem(STORAGE_KEYS.DEMO_MODE, 'false');
        } catch {
          // ignore
        }
      }

      const storageKey = getActiveStorageKey();
      const persisted = loadPersistedERPState(storageKey);
      setActiveStorage({ storageKey, persisted });

      setTransactions(persisted?.transactions ?? getInitialTransactions());

      setItemNames(cleanInitialList(persisted?.itemNames, LEGACY_DEFAULT_ITEM_NAMES));
      setSuppliers(cleanInitialList(persisted?.suppliers, LEGACY_DEFAULT_SUPPLIERS));
    };

    window.addEventListener(DEMO_MODE_EVENT, handleDemoModeChanged);
    return () => window.removeEventListener(DEMO_MODE_EVENT, handleDemoModeChanged);
  }, []);

  useEffect(() => {
    const storageKey = isDemoMode() ? STORAGE_KEYS.ERP_STATE_DEMO : STORAGE_KEYS.ERP_STATE;
    savePersistedERPState(storageKey, {
      transactions,
      itemNames,
      suppliers,
    });
  }, [transactions, itemNames, suppliers]);

  // Filter Logic
  const filteredTransactions = useMemo(() => {
    return filterTransactions({
      transactions,
      dateRange,
      customStart,
      customEnd,
      customDateRange,
    });
  }, [transactions, dateRange, customStart, customEnd, customDateRange]);

  // Calculations
  const stats = useMemo(() => {
    return computeStats(transactions, filteredTransactions);
  }, [transactions, filteredTransactions]);

  const dailyRecords = useMemo(() => {
    return computeDailyRecords(filteredTransactions);
  }, [filteredTransactions]);

  // Actions
  const addTransaction = (data: Omit<Transaction, 'id' | 'date'> & { date?: Date }) => {
    const newTransaction: Transaction = {
      ...data,
      id: generateId(),
      date: data.date ?? new Date(),
    };
    setTransactions((prev) => [newTransaction, ...prev]);
  };

  const deleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const updateTransaction = (updated: Transaction) => {
    setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const addItemName = (name: string) => {
    const v = normalizeLabel(name);
    if (!v) return;
    setItemNames((prev) => {
      return uniqueByLower([...prev, v]);
    });
  };

  const addSupplier = (name: string) => {
    const v = normalizeLabel(name);
    if (!v) return;
    setSuppliers((prev) => uniqueByLower([...prev, v]));
  };

  const renameItemName = (oldName: string, newName: string) => {
    const from = normalizeLabel(oldName);
    const to = normalizeLabel(newName);
    if (!from || !to) return;
    setItemNames((prev) => {
      const next = prev.map((v) => (v.toLowerCase() === from.toLowerCase() ? to : v));
      return uniqueByLower(next);
    });
  };

  const deleteItemName = (name: string) => {
    const v = normalizeLabel(name);
    if (!v) return;
    setItemNames((prev) => prev.filter((x) => x.toLowerCase() !== v.toLowerCase()));
  };

  const renameSupplier = (oldName: string, newName: string) => {
    const from = normalizeLabel(oldName);
    const to = normalizeLabel(newName);
    if (!from || !to) return;
    setSuppliers((prev) =>
      uniqueByLower(prev.map((v) => (v.toLowerCase() === from.toLowerCase() ? to : v)))
    );
  };

  const deleteSupplier = (name: string) => {
    const v = normalizeLabel(name);
    if (!v) return;
    setSuppliers((prev) => prev.filter((x) => x.toLowerCase() !== v.toLowerCase()));
  };

  const value: ERPContextType = {
    transactions,
    filteredTransactions,
    addTransaction,
    deleteTransaction,
    updateTransaction,
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

export function useERP() {
  const context = useContext(ERPContext);
  if (!context) {
    throw new Error('useERP must be used within ERPProvider');
  }
  return context;
}
