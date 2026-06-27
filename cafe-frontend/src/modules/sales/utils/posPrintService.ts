/**
 * Centralized POS printing service — Rangta thermal printer profiles.
 *
 * Browser limitations (Chrome / Edge):
 * • Cannot auto-select a physical printer without the system default being set.
 * • Cannot bypass the print dialog in a normal web app (kiosk mode / extensions differ).
 * • Paper size depends on the Windows driver — set Rangta to 80 mm roll once.
 * • @page size hints work when the driver supports custom / roll paper.
 *
 * Recommended one-time setup:
 * 1. Set your Rangta (RP326, RP850, etc.) as default receipt printer.
 * 2. Driver paper: 80 mm × continuous, margins None, Portrait.
 * 3. Allow pop-ups for this site.
 */

import type { NewOrderData } from '../types/menuItem.types';
import {
  RECEIPT_CSS,
  buildCustomerReceiptHTML,
  buildKitchenChitHTML,
} from './receiptPrint';

export type PrinterProfileId = 'rangta-80' | 'rangta-58' | 'generic-80';

export interface PrinterProfile {
  id: PrinterProfileId;
  label: string;
  widthMm: number;
  /** Typical Rangta models using this width. */
  models: string[];
}

export const PRINTER_PROFILES: Record<PrinterProfileId, PrinterProfile> = {
  'rangta-80': {
    id: 'rangta-80',
    label: 'Rangta 80 mm (Receipt)',
    widthMm: 80,
    models: ['RP326', 'RP850', 'RP80VI', 'RP80USE', 'RP400'],
  },
  'rangta-58': {
    id: 'rangta-58',
    label: 'Rangta 58 mm (Kitchen)',
    widthMm: 58,
    models: ['RP58VI', 'RP58USE', 'RP326-58'],
  },
  'generic-80': {
    id: 'generic-80',
    label: 'Generic 80 mm Thermal',
    widthMm: 80,
    models: ['Other ESC/POS 80mm'],
  },
};

export interface PosPrintConfig {
  customerProfile: PrinterProfileId;
  kitchenProfile: PrinterProfileId;
  /** Close print popup after dialog (recommended). */
  autoCloseWindow: boolean;
}

const STORAGE_KEY = 'bb_pos_print_config_v1';

const DEFAULT_CONFIG: PosPrintConfig = {
  customerProfile: 'rangta-80',
  kitchenProfile: 'rangta-58',
  autoCloseWindow: true,
};

export function loadPrintConfig(): PosPrintConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_CONFIG };
}

export function savePrintConfig(config: PosPrintConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Print CSS tuned for Rangta roll printers — portrait, minimal margins, no A4 waste. */
export function buildPrintPageCss(widthMm: number): string {
  return `
@page {
  size: ${widthMm}mm auto;
  margin: 0;
}
@media print {
  @page {
    size: ${widthMm}mm auto;
    margin: 0;
  }
  html, body {
    width: ${widthMm}mm !important;
    max-width: ${widthMm}mm !important;
    margin: 0 !important;
    padding: 2mm 2mm !important;
    background: #fff !important;
  }
  .print-page {
    width: 100% !important;
    page-break-inside: avoid;
  }
  .page-break {
    page-break-after: always;
  }
}
html, body {
  margin: 0;
  padding: 0;
  background: #fff;
  width: ${widthMm}mm;
  max-width: ${widthMm}mm;
}
body {
  padding: 2mm;
}
.print-page { width: 100%; }
.page-break { page-break-after: always; }
`.trim();
}

export type PrintKind = 'customer' | 'kitchen' | 'both';

function profileWidth(id: PrinterProfileId): number {
  return PRINTER_PROFILES[id].widthMm;
}

/**
 * Opens print dialog and resolves when it closes.
 * Returns false if pop-up blocked.
 */
export function printOrderAsync(
  order: NewOrderData,
  kind: PrintKind,
  config: PosPrintConfig = loadPrintConfig(),
): Promise<boolean> {
  return new Promise((resolve) => {
    const customerW = profileWidth(config.customerProfile);
    const kitchenW = profileWidth(config.kitchenProfile);

    let title: string;
    let bodyHTML: string;
    let pageCss: string;

    if (kind === 'customer') {
      title = `Receipt · ${order.orderNumber}`;
      bodyHTML = `<div class="print-page">${buildCustomerReceiptHTML(order)}</div>`;
      pageCss = buildPrintPageCss(customerW);
    } else if (kind === 'kitchen') {
      title = `Kitchen · ${order.orderNumber}`;
      bodyHTML = `<div class="print-page">${buildKitchenChitHTML(order)}</div>`;
      pageCss = buildPrintPageCss(kitchenW);
    } else {
      title = `Order · ${order.orderNumber}`;
      bodyHTML =
        `<div class="print-page page-break">${buildCustomerReceiptHTML(order)}</div>` +
        `<div class="print-page">${buildKitchenChitHTML(order)}</div>`;
      pageCss = buildPrintPageCss(customerW);
    }

    const win = window.open('', '_blank', 'width=420,height=720');
    if (!win) {
      resolve(false);
      return;
    }

    win.document.open();
    win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=${customerW}, initial-scale=1" />
<title>${esc(title)}</title>
<style>${pageCss}\n${RECEIPT_CSS}</style>
</head>
<body>${bodyHTML}</body>
</html>`);
    win.document.close();

    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      if (config.autoCloseWindow) {
        try {
          win.close();
        } catch {
          /* ignore */
        }
      }
      resolve(ok);
    };

    win.onafterprint = () => finish(true);

    const trigger = () => {
      win.focus();
      win.print();
    };

    if (win.document.readyState === 'complete') {
      setTimeout(trigger, 300);
    } else {
      win.onload = () => setTimeout(trigger, 300);
    }

    // Fallback if onafterprint never fires (some drivers)
    setTimeout(() => finish(true), 120_000);
  });
}

/** @deprecated Use printOrderAsync — sync wrapper kept for compatibility. */
export function printOrder(order: NewOrderData, kind: PrintKind): boolean {
  void printOrderAsync(order, kind);
  return true;
}

/** Browser / Rangta setup notes shown in POS settings or docs. */
export const PRINT_SETUP_NOTES = [
  'Set your Rangta printer as the Windows default (or pick it once in the print dialog).',
  'Paper size: 80 mm roll, continuous height, Portrait orientation.',
  'Margins: None or Minimum in the browser print dialog.',
  'Allow pop-ups for this site so receipts can print.',
  'Chrome and Edge use the same print engine — behavior is identical when settings match.',
] as const;
