/**
 * Order helpers — totals, draft building, ERP transaction mapping.
 */

import { generateId } from '@/shared/utils';
import type { ReceiptStatus, Transaction } from '@/core/types';
import type { DiscountType, NewOrderData, OrderItem } from '../types/menuItem.types';

export const NO_TABLE = '— None —';

export function lineUnitPrice(item: OrderItem): number {
  return item.isGift ? 0 : item.menuItem.price;
}

export function lineTotal(item: OrderItem): number {
  return lineUnitPrice(item) * item.quantity;
}

export function computeGiftStats(items: OrderItem[]) {
  let giftItemCount = 0;
  let giftTotalValue = 0;
  for (const oi of items) {
    if (oi.isGift) {
      giftItemCount += oi.quantity;
      giftTotalValue += oi.menuItem.price * oi.quantity;
    }
  }
  return { giftItemCount, giftTotalValue };
}

export function computeOrderTotals(
  items: OrderItem[],
  discountType: DiscountType,
  discountValue: number,
) {
  const subtotal = items.reduce((s, oi) => s + lineTotal(oi), 0);
  let discount = 0;
  if (subtotal > 0 && discountValue > 0) {
    const raw =
      discountType === 'percent'
        ? Math.round((subtotal * Math.min(discountValue, 100)) / 100)
        : discountValue;
    discount = Math.min(raw, subtotal);
  }
  const total = subtotal - discount;
  const totalItems = items.reduce((s, oi) => s + oi.quantity, 0);
  const { giftItemCount, giftTotalValue } = computeGiftStats(items);
  return { subtotal, discount, total, totalItems, giftItemCount, giftTotalValue };
}

export function formatOrderNumber(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `BB-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export interface BuildDraftParams {
  items: OrderItem[];
  customerName: string;
  tableNumber: string;
  paymentMethod: 'cash' | 'bank' | 'bkash';
  channel: 'in_store' | 'takeaway' | 'delivery';
  discountType: DiscountType;
  discountValue: number;
}

export function buildDraftOrder(params: BuildDraftParams): NewOrderData {
  const { subtotal, discount, total, giftItemCount, giftTotalValue } = computeOrderTotals(
    params.items,
    params.discountType,
    params.discountValue,
  );
  const isDineIn = params.channel === 'in_store';
  const now = new Date().toISOString();

  return {
    id: generateId(),
    orderNumber: formatOrderNumber(),
    items: params.items,
    customerName: params.customerName.trim(),
    tableNumber: isDineIn ? params.tableNumber : NO_TABLE,
    paymentMethod: params.paymentMethod,
    channel: params.channel,
    subtotal,
    discount,
    discountType: params.discountValue > 0 ? params.discountType : undefined,
    discountValue: params.discountValue > 0 ? params.discountValue : undefined,
    tax: 0,
    total,
    customerPaid: 0,
    changeAmount: 0,
    createdAt: now,
    cashierName: '',
    giftItemCount,
    giftTotalValue,
  };
}

function mapPosChannelToErp(channel: NewOrderData['channel']) {
  if (channel === 'delivery') return 'foodi' as const;
  return 'in_store' as const;
}

export function orderToTransaction(
  order: NewOrderData,
  status: ReceiptStatus,
): Omit<Transaction, 'id' | 'date'> {
  const totalItems = order.items.reduce((s, oi) => s + oi.quantity, 0);
  const { giftItemCount, giftTotalValue } = computeGiftStats(order.items);

  return {
    type: 'sale',
    amount: order.total,
    description:
      order.items.length === 1
        ? order.items[0].menuItem.name
        : `Order ${order.orderNumber} (${totalItems} items)`,
    method: order.paymentMethod,
    channel: mapPosChannelToErp(order.channel),
    customerName: order.customerName || undefined,
    category: order.items[0]?.menuItem.category,
    quantity: totalItems,
    discountAmount: order.discount > 0 ? order.discount : undefined,
    receiptLines: order.items.map((oi) => ({
      name: oi.isGift ? `${oi.menuItem.name} (Gift)` : oi.menuItem.name,
      qty: oi.quantity,
      unitPrice: lineUnitPrice(oi),
      isGift: oi.isGift,
      giftReason: oi.giftReason,
      originalUnitPrice: oi.isGift ? oi.menuItem.price : undefined,
    })),
    receiptStatus: status,
    orderNumber: order.orderNumber,
    tableNumber: order.tableNumber !== NO_TABLE ? order.tableNumber : undefined,
    posChannel: order.channel,
    giftItemCount: giftItemCount > 0 ? giftItemCount : undefined,
    giftTotalValue: giftTotalValue > 0 ? giftTotalValue : undefined,
  };
}

/** Rebuild NewOrderData from a stored pending transaction for payment collection. */
export function transactionToOrder(tx: Transaction): NewOrderData | null {
  if (!tx.receiptLines?.length || !tx.orderNumber) return null;

  const items: OrderItem[] = tx.receiptLines.map((line) => ({
    menuItem: {
      id: `hist-${line.name}`,
      name: line.name.replace(/ \(Gift\)$/, ''),
      category: 'Coffee',
      price: line.originalUnitPrice ?? line.unitPrice,
      available: true,
    },
    quantity: line.qty,
    isGift: line.isGift,
    giftReason: line.giftReason,
  }));

  return {
    id: tx.id,
    orderNumber: tx.orderNumber,
    items,
    customerName: tx.customerName ?? '',
    tableNumber: tx.tableNumber ?? NO_TABLE,
    paymentMethod: tx.method,
    channel: tx.posChannel ?? 'in_store',
    subtotal: tx.receiptLines.reduce((s, l) => s + l.qty * l.unitPrice, 0) + (tx.discountAmount ?? 0),
    discount: tx.discountAmount ?? 0,
    total: tx.amount,
    customerPaid: 0,
    changeAmount: 0,
    createdAt: new Date(tx.date).toISOString(),
    cashierName: tx.cashier ?? '',
    giftItemCount: tx.giftItemCount,
    giftTotalValue: tx.giftTotalValue,
  };
}
