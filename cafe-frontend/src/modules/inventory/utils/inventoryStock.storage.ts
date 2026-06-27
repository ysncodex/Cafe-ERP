import { STORAGE_KEYS } from '@/shared/utils/constants';
import { generateId } from '@/shared/utils/helpers';
import type {
  InventoryPersistedState,
  StockItem,
  StockLot,
  StockMovement,
  StockMovementType,
} from '../types/stock.types';

/** Stable demo catalog ids — keeps seed merges predictable */
export const SEED_IDS = {
  espresso: 'inv-sku-espresso',
  milk: 'inv-sku-milk',
  soda: 'inv-sku-soda',
  butter: 'inv-sku-butter',
} as const;

export function getInventoryStorageKey(): string {
  return STORAGE_KEYS.INVENTORY_STOCK;
}

function isoDaysAgo(days: number, hour = 11): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function expiryFromToday(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function seedCatalog(): StockItem[] {
  return [
    {
      id: SEED_IDS.espresso,
      sku: 'INV-COFFEE-ESP1',
      name: 'House Espresso Blend (1kg)',
      category: 'Coffee Beans',
      unit: 'kg',
      parLevel: 12,
      unitCostBdt: 1850,
    },
    {
      id: SEED_IDS.milk,
      sku: 'INV-DAIRY-MILK1',
      name: 'Pasteurized Milk (1L)',
      category: 'Dairy',
      unit: 'L',
      parLevel: 15,
      unitCostBdt: 110,
    },
    {
      id: SEED_IDS.soda,
      sku: 'INV-DRY-SODA500',
      name: 'Baking Soda (500g)',
      category: 'Dry Goods',
      unit: 'g',
      parLevel: 2000,
      unitCostBdt: 220,
    },
    {
      id: SEED_IDS.butter,
      sku: 'INV-DAIRY-BUT225',
      name: 'Unsalted Butter (225g blocks)',
      category: 'Dairy',
      unit: 'pcs',
      parLevel: 24,
      unitCostBdt: 385,
    },
  ];
}

function seedMovements(): StockMovement[] {
  const espresso = SEED_IDS.espresso;
  const milk = SEED_IDS.milk;
  const soda = SEED_IDS.soda;
  const butter = SEED_IDS.butter;

  const mv = (
    itemId: string,
    type: StockMovementType,
    qtySigned: number,
    daysAgo: number,
    extra?: Partial<Omit<StockMovement, 'id' | 'itemId' | 'type' | 'qtySigned' | 'createdAtISO'>>,
  ): StockMovement => ({
    id: generateId(),
    itemId,
    type,
    qtySigned,
    createdAtISO: isoDaysAgo(daysAgo),
    note: extra?.note,
    summary: extra?.summary,
  });

  /** Newest-first: index 0 = most recent ledger line */
  return [
    mv(milk, 'wastage', -2, 0, {
      summary: 'Training pour & rinse waste — dumped by opener',
      note: 'Morning rush cleanup',
    }),
    mv(milk, 'pos_deduction', -5, 0, {
      summary: 'Recipe deduction from latte / milk drinks (POS)',
    }),
    mv(espresso, 'pos_deduction', -8, 0, {
      summary: 'POS-linked recipe deductions (estimated)',
    }),
    mv(butter, 'pos_deduction', -4, 1, {
      summary: 'Bakery pulls & biscuits from POS linkage',
    }),
    mv(soda, 'purchase', 5000, 1, { summary: 'Wholesale carton — dry room refill' }),
    mv(milk, 'purchase', 20, 1, {
      summary: 'Refrigerated delivery — pasted into ERP same day',
      note: 'Dairy cooperative invoice #9812',
    }),
    mv(espresso, 'purchase', 50, 2, {
      summary: 'Roastery shipment received',
      note: 'INV-4421 pallet',
    }),
    mv(butter, 'purchase', 38, 2, {
      summary: 'Cold chain delivery verified',
    }),
    mv(milk, 'pos_deduction', -28, 2, {
      summary: 'Weekend latte volume — modeled POS deductions',
      note: 'Rough recipe yield model × ticket mix',
    }),
    mv(soda, 'wastage', -1200, 3, {
      summary: 'Audit correction — duplicate bags condensed',
      note: 'Historical intake mismatch',
    }),
    mv(espresso, 'pos_deduction', -35, 3, {
      summary: 'POS recipe usage batch (estimated)',
    }),
    mv(espresso, 'adjustment', 3, 4, {
      summary: 'Count correction matched physical weigh-in',
      note: 'Weekly blind cycle count',
    }),
    mv(milk, 'purchase', 27, 4, {
      summary: 'Opening refrigeration balance migrated from spreadsheets',
      note: 'Starting count before POS bridge',
    }),
    mv(butter, 'pos_deduction', -10, 4, {
      summary: 'Brunch service — laminated dough usage',
    }),
    mv(soda, 'purchase', 8000, 5, {
      summary: 'Month-start baking pantry stock-up',
    }),
    mv(espresso, 'purchase', 30, 6, {
      summary: 'Opening pantry espresso balance',
      note: 'Imported from binder logs',
    }),
  ];
}

function seedLots(): StockLot[] {
  return [
    {
      id: generateId(),
      itemId: SEED_IDS.espresso,
      qty: 40,
      expiryDate: null,
    },
    {
      id: generateId(),
      itemId: SEED_IDS.milk,
      qty: 10,
      expiryDate: expiryFromToday(3),
    },
    {
      id: generateId(),
      itemId: SEED_IDS.milk,
      qty: 2,
      expiryDate: expiryFromToday(6),
    },
    {
      id: generateId(),
      itemId: SEED_IDS.butter,
      qty: 14,
      expiryDate: expiryFromToday(-2),
    },
    {
      id: generateId(),
      itemId: SEED_IDS.butter,
      qty: 10,
      expiryDate: expiryFromToday(5),
    },
    {
      id: generateId(),
      itemId: SEED_IDS.soda,
      qty: 11800,
      expiryDate: null,
    },
  ];
}

/** Default ledger + seeded lots for first-time installs */
export function createDefaultInventoryState(): InventoryPersistedState {
  return {
    items: seedCatalog(),
    movements: seedMovements(),
    lots: seedLots(),
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object';
}

function reviveMovement(raw: unknown): StockMovement | null {
  if (!isRecord(raw)) return null;
  const id = raw.id,
    itemId = raw.itemId,
    type = raw.type,
    qtySigned = raw.qtySigned,
    createdAtISO = raw.createdAtISO;
  if (
    typeof id !== 'string' ||
    typeof itemId !== 'string' ||
    typeof qtySigned !== 'number' ||
    typeof createdAtISO !== 'string'
  )
    return null;
  const t = type as StockMovementType;
  if (!['purchase', 'pos_deduction', 'wastage', 'adjustment'].includes(t)) return null;
  return {
    id,
    itemId,
    type: t,
    qtySigned,
    createdAtISO,
    ...(typeof raw.note === 'string' ? { note: raw.note } : {}),
    ...(typeof raw.summary === 'string' ? { summary: raw.summary } : {}),
  };
}

function reviveItem(raw: unknown): StockItem | null {
  if (!isRecord(raw)) return null;
  const { id, sku, name, category, unit, parLevel, unitCostBdt } = raw;
  if (
    typeof id !== 'string' ||
    typeof sku !== 'string' ||
    typeof name !== 'string' ||
    typeof category !== 'string' ||
    typeof unit !== 'string' ||
    typeof parLevel !== 'number' ||
    typeof unitCostBdt !== 'number'
  )
    return null;
  const u = unit as StockItem['unit'];
  const allowed = ['kg', 'g', 'L', 'ml', 'pcs', 'box', 'pack'];
  if (!allowed.includes(u)) return null;
  return { id, sku, name, category, unit: u, parLevel, unitCostBdt };
}

function reviveLot(raw: unknown): StockLot | null {
  if (!isRecord(raw)) return null;
  const id = raw.id,
    itemId = raw.itemId,
    qty = raw.qty;
  if (typeof id !== 'string' || typeof itemId !== 'string' || typeof qty !== 'number') return null;
  const exp = raw.expiryDate;
  const expiryDate = exp === null || typeof exp === 'string' ? exp : null;
  return { id, itemId, qty, expiryDate };
}

/** Sum ledger qty for one SKU */
export function sumMovementQty(movements: StockMovement[], itemId: string): number {
  return movements.reduce((acc, m) => (m.itemId === itemId ? acc + m.qtySigned : acc), 0);
}

/** FEFO: reduce dated lots closest to expiry (null/expired ambient lots last before null far) */
export function deductFifoLots(lots: StockLot[], itemId: string, deductQty: number): StockLot[] {
  if (deductQty <= 0) return lots;
  const others = lots.filter((l) => l.itemId !== itemId);
  const mine = lots.filter((l) => l.itemId === itemId);
  mine.sort((a, b) => {
    const ad = parseYmdLocal(a.expiryDate);
    const bd = parseYmdLocal(b.expiryDate);
    const aNull = !ad ? 2 : Number.isFinite(ad!.getTime()) ? 0 : 2;
    const bNull = !bd ? 2 : Number.isFinite(bd!.getTime()) ? 0 : 2;
    if (aNull !== bNull) return bNull - aNull;
    if (!ad || !bd) return 0;
    return ad.getTime() - bd.getTime();
  });

  let left = deductQty;
  const adjusted: StockLot[] = [];
  for (const l of mine) {
    if (left <= 1e-9) {
      adjusted.push(l);
      continue;
    }
    const take = Math.min(l.qty, left);
    const rest = Math.round((l.qty - take) * 10000) / 10000;
    left -= take;
    if (rest > 1e-6) adjusted.push({ ...l, qty: rest });
  }
  return [...others, ...adjusted];
}

function parseYmdLocal(ymd: string | null): Date | null {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Lots with expiry hitting within [today, today+withinDays], qty > epsilon */
export function countExpiringSnapshot(
  lots: StockLot[],
  withinDays: number,
): { skuCount: number; lotCount: number; qtyTotalApprox: number } {
  const start = stripTime(new Date());
  const end = new Date(start);
  end.setDate(end.getDate() + withinDays);
  const sku = new Set<string>();
  let lotCount = 0;
  let qty = 0;
  for (const l of lots) {
    const d = parseYmdLocal(l.expiryDate);
    if (!d || l.qty <= 1e-6) continue;
    const t = stripTime(d);
    if (t >= start && t <= end) {
      sku.add(l.itemId);
      lotCount++;
      qty += l.qty;
    }
  }
  return { skuCount: sku.size, lotCount, qtyTotalApprox: Math.round(qty * 100) / 100 };
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function loadInventoryState(storageKey?: string): InventoryPersistedState {
  const key = storageKey ?? getInventoryStorageKey();
  if (typeof window === 'undefined') return createDefaultInventoryState();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return createDefaultInventoryState();
    const parsed = JSON.parse(raw) as Partial<InventoryPersistedState>;
    const itemsRaw = parsed.items,
      mvRaw = parsed.movements,
      lotsRaw = parsed.lots;

    const items = Array.isArray(itemsRaw)
      ? (itemsRaw.map(reviveItem).filter(Boolean) as StockItem[])
      : [];
    const movements = Array.isArray(mvRaw)
      ? (mvRaw.map(reviveMovement).filter(Boolean) as StockMovement[])
      : [];
    const lotsLots = Array.isArray(lotsRaw)
      ? (lotsRaw.map(reviveLot).filter(Boolean) as StockLot[])
      : [];

    if (items.length === 0 || movements.length === 0) {
      return createDefaultInventoryState();
    }

    return { items, movements: movements.slice(0, 500), lots: lotsLots.slice(0, 200) };
  } catch {
    return createDefaultInventoryState();
  }
}

export function saveInventoryState(
  state: InventoryPersistedState,
  storageKey?: string,
): void {
  const key = storageKey ?? getInventoryStorageKey();
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // ignore quota
  }
}
