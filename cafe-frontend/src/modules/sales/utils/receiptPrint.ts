/**
 * Receipt builder — single source of truth for the on-screen receipt preview
 * and the printed output, so both look identical.
 *
 * The same HTML + CSS is used for:
 *   • on-screen preview  (injected via dangerouslySetInnerHTML + <style>)
 *   • printing           (written into a popup window)
 *
 * CSS uses plain class names (rcpt-*) — NOT Tailwind — so it survives the
 * jump into a fresh print window where Tailwind isn't loaded.
 */

import type { NewOrderData } from '../types/menuItem.types';

// ─── Business identity ──────────────────────────────────────────────────────

export const RECEIPT_BRAND = {
  name: 'Beans & Butter Café',
  tagline: 'Demra · Dhaka',
  address: 'House 12, Demra Road, Dhaka-1232',
  phone: '+880 1XXX-XXXXXX',
  footerThanks: 'Thank you — see you again!',
  wifi: 'Wi-Fi: BeansGuest · beans.and.butter',
} as const;

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

// ─── Formatting helpers ─────────────────────────────────────────────────────

/** Currency uses "Tk" for reliable thermal-printer + cross-font rendering. */
export function money(n: number): string {
  return `Tk ${Math.round(n).toLocaleString('en-US')}`;
}

export function receiptTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function receiptDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function esc(value: string | number): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function hasTable(order: NewOrderData): boolean {
  return Boolean(order.tableNumber && order.tableNumber !== '— None —');
}

function discountLabel(order: NewOrderData): string {
  if (order.discountType === 'percent' && order.discountValue) {
    return `Discount (${order.discountValue}%)`;
  }
  return 'Discount';
}

// ─── Shared CSS (plain classes — used for screen + print) ───────────────────

export const RECEIPT_CSS = `
.rcpt {
  font-family: 'Consolas', 'Menlo', 'Courier New', monospace;
  color: #111827;
  width: 100%;
  font-size: 12px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
.rcpt * { box-sizing: border-box; }
.rcpt-center { text-align: center; }
.rcpt-name { font-size: 16px; font-weight: 800; letter-spacing: 0.5px; }
.rcpt-muted { color: #6b7280; }
.rcpt-sm { font-size: 11px; }
.rcpt-xs { font-size: 10px; }
.rcpt-hr { border: none; border-top: 1px dashed #9ca3af; margin: 8px 0; }
.rcpt-hr-solid { border: none; border-top: 2px solid #111827; margin: 8px 0; }
.rcpt-row { display: flex; justify-content: space-between; gap: 8px; }
.rcpt-row + .rcpt-row { margin-top: 2px; }
.rcpt-label { color: #6b7280; }
.rcpt-strong { font-weight: 700; }
.rcpt-badge {
  display: inline-block;
  background: #111827;
  color: #fff;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 4px;
  letter-spacing: 1px;
}
.rcpt-items { margin: 4px 0; }
.rcpt-item { margin-bottom: 6px; }
.rcpt-item-top { display: flex; justify-content: space-between; gap: 8px; }
.rcpt-item-name { font-weight: 600; flex: 1; }
.rcpt-item-total { font-weight: 700; white-space: nowrap; }
.rcpt-item-sub { color: #6b7280; font-size: 10px; margin-top: 1px; }
.rcpt-total-row { display: flex; justify-content: space-between; font-weight: 800; font-size: 15px; }
.rcpt-section { margin: 6px 0; }
.rcpt-gift { font-size: 9px; font-weight: 800; color: #059669; letter-spacing: 0.5px; }
.rcpt-free { color: #059669; font-weight: 700; }

/* Kitchen chit */
.chit { font-family: 'Consolas', 'Menlo', 'Courier New', monospace; color: #111827; width: 100%; }
.chit-title { text-align: center; font-size: 22px; font-weight: 800; letter-spacing: 3px; }
.chit-type { text-align: center; font-size: 15px; font-weight: 800; text-transform: uppercase; margin-top: 2px; }
.chit-table { text-align: center; margin-top: 6px; }
.chit-meta { display: flex; justify-content: space-between; font-weight: 700; font-size: 13px; }
.chit-name { font-weight: 700; margin-top: 4px; }
.chit-items { margin: 8px 0; }
.chit-item { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px; }
.chit-qty { font-size: 20px; font-weight: 800; line-height: 1; width: 38px; flex-shrink: 0; }
.chit-item-name { font-size: 14px; font-weight: 700; line-height: 1.3; padding-top: 2px; }
`.trim();

// ─── Customer receipt HTML ──────────────────────────────────────────────────

export function buildCustomerReceiptHTML(order: NewOrderData): string {
  const itemsHTML = order.items
    .map((oi) => {
      const lineTotal = oi.isGift ? 0 : oi.menuItem.price * oi.quantity;
      const giftTag = oi.isGift ? ' <span class="rcpt-gift">[GIFT]</span>' : '';
      return `
      <div class="rcpt-item">
        <div class="rcpt-item-top">
          <span class="rcpt-item-name">${esc(oi.menuItem.name)}${giftTag}</span>
          <span class="rcpt-item-total ${oi.isGift ? 'rcpt-free' : ''}">${oi.isGift ? 'FREE' : esc(money(lineTotal))}</span>
        </div>
        <div class="rcpt-item-sub">${oi.quantity} x ${oi.isGift ? esc(money(oi.menuItem.price)) + ' (complimentary)' : esc(money(oi.menuItem.price))}</div>
      </div>`;
    })
    .join('');

  const metaRows: string[] = [
    `<div class="rcpt-row"><span class="rcpt-label">Order #</span><span class="rcpt-strong">${esc(order.orderNumber)}</span></div>`,
    `<div class="rcpt-row"><span class="rcpt-label">Type</span><span>${esc(CHANNEL_LABELS[order.channel] ?? order.channel)}</span></div>`,
  ];
  if (hasTable(order)) {
    metaRows.push(
      `<div class="rcpt-row"><span class="rcpt-label">Table</span><span class="rcpt-strong">${esc(order.tableNumber)}</span></div>`,
    );
  }
  metaRows.push(
    `<div class="rcpt-row"><span class="rcpt-label">Date</span><span>${esc(receiptDate(order.createdAt))}</span></div>`,
    `<div class="rcpt-row"><span class="rcpt-label">Time</span><span>${esc(receiptTime(order.createdAt))}</span></div>`,
  );
  if (order.customerName) {
    metaRows.push(
      `<div class="rcpt-row"><span class="rcpt-label">Customer</span><span>${esc(order.customerName)}</span></div>`,
    );
  }

  const totalRows: string[] = [
    `<div class="rcpt-row"><span class="rcpt-label">Subtotal</span><span>${esc(money(order.subtotal))}</span></div>`,
  ];
  if (order.giftItemCount && order.giftItemCount > 0) {
    totalRows.push(
      `<div class="rcpt-row"><span class="rcpt-label">Gift Items</span><span>${order.giftItemCount} (value ${esc(money(order.giftTotalValue ?? 0))})</span></div>`,
    );
  }
  if (order.discount > 0) {
    totalRows.push(
      `<div class="rcpt-row"><span class="rcpt-label">${esc(discountLabel(order))}</span><span>- ${esc(money(order.discount))}</span></div>`,
    );
  }
  if (order.tax && order.tax > 0) {
    totalRows.push(
      `<div class="rcpt-row"><span class="rcpt-label">Tax / VAT</span><span>${esc(money(order.tax))}</span></div>`,
    );
  }

  const payRows: string[] = [
    `<div class="rcpt-row"><span class="rcpt-label">Payment</span><span class="rcpt-strong">${esc(PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod)}</span></div>`,
  ];
  if (order.customerPaid > 0) {
    payRows.push(
      `<div class="rcpt-row"><span class="rcpt-label">Paid</span><span>${esc(money(order.customerPaid))}</span></div>`,
    );
  }
  if (order.changeAmount > 0) {
    payRows.push(
      `<div class="rcpt-row rcpt-strong"><span>Change</span><span>${esc(money(order.changeAmount))}</span></div>`,
    );
  }

  return `
<div class="rcpt">
  <div class="rcpt-center rcpt-section">
    <div class="rcpt-name">${esc(RECEIPT_BRAND.name)}</div>
    <div class="rcpt-muted rcpt-sm">${esc(RECEIPT_BRAND.tagline)}</div>
    <div class="rcpt-muted rcpt-sm">${esc(RECEIPT_BRAND.address)}</div>
    <div class="rcpt-muted rcpt-sm">${esc(RECEIPT_BRAND.phone)}</div>
  </div>
  <hr class="rcpt-hr" />
  <div class="rcpt-section">${metaRows.join('')}</div>
  <hr class="rcpt-hr" />
  <div class="rcpt-items">${itemsHTML}</div>
  <hr class="rcpt-hr" />
  <div class="rcpt-section">${totalRows.join('')}</div>
  <hr class="rcpt-hr-solid" />
  <div class="rcpt-total-row"><span>TOTAL</span><span>${esc(money(order.total))}</span></div>
  <hr class="rcpt-hr" />
  <div class="rcpt-section">${payRows.join('')}</div>
  <hr class="rcpt-hr" />
  <div class="rcpt-center rcpt-muted rcpt-section">
    <div class="rcpt-thanks">${esc(RECEIPT_BRAND.footerThanks)}</div>
    <div class="rcpt-xs">${esc(RECEIPT_BRAND.wifi)}</div>
    <div class="rcpt-xs">* * *</div>
  </div>
</div>`.trim();
}

// ─── Kitchen chit HTML ──────────────────────────────────────────────────────

export function buildKitchenChitHTML(order: NewOrderData): string {
  const itemsHTML = order.items
    .map((oi) => {
      const giftTag = oi.isGift ? ' <span class="rcpt-gift">[GIFT]</span>' : '';
      return `
      <div class="chit-item">
        <span class="chit-qty">${oi.quantity}x</span>
        <span class="chit-item-name">${esc(oi.menuItem.name)}${giftTag}</span>
      </div>`;
    })
    .join('');

  const tableHTML = hasTable(order)
    ? `<div class="chit-table"><span class="rcpt-badge">${esc(order.tableNumber.toUpperCase())}</span></div>`
    : '';
  const nameHTML = order.customerName
    ? `<div class="chit-name">Name: ${esc(order.customerName)}</div>`
    : '';

  return `
<div class="chit">
  <div class="chit-title">KITCHEN</div>
  <div class="chit-type">${esc(CHANNEL_LABELS[order.channel] ?? order.channel)}</div>
  ${tableHTML}
  <hr class="rcpt-hr-solid" />
  <div class="chit-meta">
    <span>#${esc(order.orderNumber.split('-').pop() ?? '')}</span>
    <span>${esc(receiptTime(order.createdAt))}</span>
  </div>
  ${nameHTML}
  <hr class="rcpt-hr" />
  <div class="chit-items">${itemsHTML}</div>
  <hr class="rcpt-hr-solid" />
  <div class="rcpt-center rcpt-muted rcpt-xs">${esc(receiptDate(order.createdAt))} · ${esc(receiptTime(order.createdAt))}</div>
</div>`.trim();
}
