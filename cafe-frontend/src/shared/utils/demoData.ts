import type { Transaction } from '@/core/types';
import { generateId } from './helpers';
import { STORAGE_KEYS } from './constants';

export const DEMO_MODE_EVENT = 'demo_mode_changed';

/**
 * Generate demo transactions for testing purposes
 * Deterministic demo dataset designed to keep balances realistic and stable.
 *
 * Goals:
 * - No random values (repeatable)
 * - No negative method balances
 * - Includes the newer transaction types: cash_added, fund_to_cash
 * - Works well with current calculation rules
 */
export function generateDemoTransactions(): Transaction[] {
  const now = new Date();
  const transactions: Transaction[] = [];

  const at = (daysAgo: number, hour: number, minute: number = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  const add = (t: Omit<Transaction, 'id'>) => {
    transactions.push({ id: generateId(), ...t });
  };

  // Base capital (keeps balances positive)
  add({ type: 'fund_in', amount: 30000, method: 'bank', description: 'Owner investment (Bank)', date: at(20, 10) });
  add({ type: 'fund_in', amount: 10000, method: 'bkash', description: 'Owner investment (bKash)', date: at(20, 10, 15) });
  add({ type: 'fund_in', amount: 8000, method: 'cash', description: 'Owner investment (Cash)', date: at(20, 10, 30) });

  // 14 days of steady operations
  for (let day = 13; day >= 0; day--) {
    // Deterministic day-of-week variation so charts are not flat
    const baseDate = at(day, 0, 0);
    const dow = baseDate.getDay(); // 0=Sun..6=Sat
    const factorByDow = [1.15, 0.9, 0.95, 1.0, 1.05, 1.2, 1.1] as const;
    const factor = factorByDow[dow] ?? 1;

    const inStoreCash = Math.round(1500 * factor);
    const foodpandaBkash = Math.round(900 * factor);
    const foodiBank = Math.round(600 * factor);

    // Sales (easy to understand: one in-store + two delivery channels every day)
    add({ type: 'sale', amount: inStoreCash, method: 'cash', channel: 'in_store', description: 'In-store sales (Cash)', date: at(day, 11, 0) });
    add({ type: 'sale', amount: foodpandaBkash, method: 'bkash', channel: 'foodpanda', description: 'Foodpanda order (bKash)', date: at(day, 13, 0) });
    add({ type: 'sale', amount: foodiBank, method: 'bank', channel: 'foodi', description: 'Foodi order (Bank)', date: at(day, 19, 0) });

    // Product expense (every 2 days)
    if (day % 2 === 0) {
      add({
        type: 'expense_product',
        amount: 500,
        method: 'cash',
        category: 'Milk',
        description: 'Fresh Milk 2L',
        quantity: 2,
        unit: 'L',
        unitPrice: 250,
        supplier: 'Local Dairy Farm',
        date: at(day, 9, 30)
      });
    }

    // Cash secured to fund (every 3 days)
    if (day % 3 === 0) {
      add({ type: 'cash_to_fund', amount: 1000, method: 'cash', description: 'Cash secured to fund', date: at(day, 21, 0) });
    }

    // Cash Added (from bank) every 5 days
    // This increases Cash and decreases Bank, keeping Total Liquidity stable.
    if (day % 5 === 0) {
      add({ type: 'cash_added', amount: 800, method: 'bank', description: 'Cash added to drawer (From Bank)', date: at(day, 16, 0) });
    }
  }

  // A fixed monthly-style expense within this period
  add({
    type: 'expense_fixed',
    amount: 2000,
    method: 'bank',
    category: 'Utilities',
    description: 'Utilities bill',
    date: at(10, 10, 0)
  });

  // External withdrawal (profit taking)
  add({ type: 'fund_out', amount: 5000, method: 'bank', description: 'Owner withdrawal', date: at(7, 15, 0) });

  // Fund Balance -> Cash Drawer (operational move)
  add({ type: 'fund_to_cash', amount: 500, method: 'cash', description: 'Fund Balance moved to cash drawer', date: at(1, 12, 0) });

  // Sort by date (newest first)
  return transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
}

/**
 * Get a smaller set of demo data for quick testing
 */
export function getMinimalDemoData(): Transaction[] {
  const now = new Date();
  
  return [
    {
      id: generateId(),
      type: 'fund_in',
      amount: 30000,
      method: 'bank',
      description: 'Owner investment (Bank)',
      date: new Date(now.getFullYear(), now.getMonth(), 1, 9, 0, 0)
    },
    {
      id: generateId(),
      type: 'sale',
      amount: 450,
      method: 'cash',
      channel: 'in_store',
      description: 'Coffee and pastry',
      date: new Date(now.getTime() - 2 * 60 * 60 * 1000)
    },
    {
      id: generateId(),
      type: 'cash_added',
      amount: 300,
      method: 'bkash',
      description: 'Cash added to drawer (From bKash)',
      date: new Date(now.getTime() - 3 * 60 * 60 * 1000)
    },
    {
      id: generateId(),
      type: 'sale',
      amount: 850,
      method: 'bkash',
      channel: 'foodpanda',
      description: 'Foodpanda order',
      date: new Date(now.getTime() - 4 * 60 * 60 * 1000)
    },
    {
      id: generateId(),
      type: 'sale',
      amount: 650,
      method: 'bank',
      channel: 'foodi',
      description: 'Foodi order',
      date: new Date(now.getTime() - 5 * 60 * 60 * 1000)
    },
    {
      id: generateId(),
      type: 'expense_product',
      amount: 600,
      method: 'cash',
      category: 'Milk',
      description: 'Fresh Milk',
      quantity: 5,
      unit: 'L',
      unitPrice: 120,
      supplier: 'Local Dairy Farm',
      date: new Date(now.getTime() - 6 * 60 * 60 * 1000)
    },
    {
      id: generateId(),
      type: 'expense_fixed',
      amount: 25000,
      method: 'bank',
      category: 'Rent',
      description: 'Monthly shop rent',
      date: new Date(now.getFullYear(), now.getMonth(), 1)
    },
    {
      id: generateId(),
      type: 'cash_to_fund',
      amount: 5000,
      method: 'cash',
      description: 'Cash transferred to fund',
      date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
    },
    {
      id: generateId(),
      type: 'fund_to_cash',
      amount: 1000,
      method: 'cash',
      description: 'Fund Balance moved to cash drawer',
      date: new Date(now.getTime() - 20 * 60 * 60 * 1000)
    }
  ];
}

/**
 * Clear all demo data (for production)
 */
export function clearDemoData(): Transaction[] {
  return [];
}

/**
 * Check if demo mode is enabled (can be controlled via env or localStorage)
 */
export function isDemoMode(): boolean {
  // Check localStorage
  if (typeof window !== 'undefined') {
    try {
      const isEnabled = localStorage.getItem(STORAGE_KEYS.DEMO_MODE) === 'true';
      if (!isEnabled) return false;
      const userRaw = localStorage.getItem(STORAGE_KEYS.USER);
      if (!userRaw) return false;
      const user = JSON.parse(userRaw) as Record<string, unknown>;
      return user?.role === 'guest';
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Enable/disable demo mode
 */
export function setDemoMode(enabled: boolean): void {
  if (typeof window !== 'undefined') {
    // If demo is being enabled, drop any old/stale demo state so the app regenerates
    // the latest deterministic demo dataset after reload.
    if (enabled) {
      localStorage.removeItem('erp_state_demo_v1');
      localStorage.removeItem(STORAGE_KEYS.ERP_STATE_DEMO);
    }
    localStorage.setItem(STORAGE_KEYS.DEMO_MODE, enabled ? 'true' : 'false');
    // Notify app to swap datasets without a full page reload
    window.dispatchEvent(new Event(DEMO_MODE_EVENT));
  }
}

/**
 * Get initial transactions based on demo mode
 */
export function getInitialTransactions(): Transaction[] {
  if (isDemoMode()) {
    return generateDemoTransactions();
  }
  return [];
}
