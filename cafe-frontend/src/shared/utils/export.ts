import type { Transaction, ERPStats } from '@/core/types';

async function getXlsx() {
  const mod = await import('xlsx');
  // xlsx may be published as CJS; support both module shapes.
  return (mod as unknown as { default?: typeof mod }).default ?? mod;
}

async function getPdf() {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  return { jsPDF, autoTable };
}

// Export transactions to Excel
export const exportToExcel = async (data: Transaction[], filename: string = 'transactions'): Promise<void> => {
  const XLSX = await getXlsx();
  const worksheet = XLSX.utils.json_to_sheet(
    data.map(t => ({
      Date: new Date(t.date).toLocaleDateString(),
      Type: t.type.replace('_', ' ').toUpperCase(),
      Description: t.description,
      Amount: t.amount,
      Method: t.method || '-',
      Channel: t.channel || '-',
      Category: t.category || '-',
      Quantity: t.quantity || '-',
      Supplier: t.supplier || '-',
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
  
  // Generate file
  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// Export transactions to CSV
export const exportToCSV = async (data: Transaction[], filename: string = 'transactions'): Promise<void> => {
  const XLSX = await getXlsx();
  const worksheet = XLSX.utils.json_to_sheet(
    data.map(t => ({
      Date: new Date(t.date).toLocaleDateString(),
      Type: t.type.replace('_', ' ').toUpperCase(),
      Description: t.description,
      Amount: t.amount,
      Method: t.method || '-',
      Channel: t.channel || '-',
      Category: t.category || '-',
      Quantity: t.quantity || '-',
      Supplier: t.supplier || '-',
    }))
  );

  const csv = XLSX.utils.sheet_to_csv(worksheet);
  
  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};

// Export report to PDF
export const exportReportToPDF = async (
  title: string,
  data: (string | number)[][],
  columns: string[],
  filename: string = 'report'
): Promise<void> => {
  const { jsPDF, autoTable } = await getPdf();
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  // Add date
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
  
  // Add table
  autoTable(doc, {
    head: [columns],
    body: data,
    startY: 35,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [59, 130, 246] },
  });
  
  // Save
  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
};

// Export dashboard summary to PDF
export const exportDashboardPDF = async (stats: ERPStats, dateRange: string): Promise<void> => {
  const { jsPDF, autoTable } = await getPdf();
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('BeansAndButter Café', 14, 20);
  doc.setFontSize(14);
  doc.text('Financial Dashboard Report', 14, 28);
  
  // Date Range
  doc.setFontSize(10);
  doc.text(`Period: ${dateRange}`, 14, 35);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 40);
  
  // Key Metrics
  doc.setFontSize(12);
  doc.text('Key Financial Metrics', 14, 50);
  
  const metricsData = [
    ['Total Revenue', `৳${stats.totalSales.toLocaleString()}`],
    ['Cash Liquidity', `৳${stats.cashInHand.toLocaleString()}`],
    ['Net Transfer to Monthly Fund', `৳${stats.monthlyFundGenerated.toLocaleString()}`],
    ['Daily Available Liquidity', `৳${stats.dailyAvailableCash.toLocaleString()}`],
    ['Total Added to Fund', `৳${stats.totalAdded.toLocaleString()}`],
    ['Total Withdrawn', `৳${stats.fundWithdrawn.total.toLocaleString()}`],
    ['Current Fund Balance', `৳${stats.fundTotal.toLocaleString()}`],
  ];
  
  autoTable(doc, {
    body: metricsData,
    startY: 55,
    theme: 'grid',
    styles: { fontSize: 10 },
  });
  
  // Sales Breakdown
  doc.addPage();
  doc.setFontSize(12);
  doc.text('Sales Breakdown', 14, 20);
  
  const inStoreSales = stats.totalSales - stats.foodpandaSales - stats.foodiSales;
  const salesData = [
    ['In Store', `৳${inStoreSales.toLocaleString()}`],
    ['Foodpanda', `৳${stats.foodpandaSales.toLocaleString()}`],
    ['Foodi', `৳${stats.foodiSales.toLocaleString()}`],
  ];
  
  autoTable(doc, {
    body: salesData,
    startY: 25,
    theme: 'grid',
  });
  
  doc.save(`dashboard_report_${new Date().toISOString().split('T')[0]}.pdf`);
};

// Export daily record to Excel
export interface DailyRecordExportData {
  date: string;
  cashSales: number;
  bkashSales: number;
  bankSales: number;
  productCosts: number;
  fixedCosts: number;
  cashToFund: number;
  externalAdditions: number;
  withdrawals: number;
  dailyNet: number;
}

export const exportDailyRecordExcel = async (dailyData: DailyRecordExportData[]): Promise<void> => {
  const XLSX = await getXlsx();
  const worksheet = XLSX.utils.json_to_sheet(
    dailyData.map(d => ({
      Date: d.date,
      'Cash Sales': d.cashSales,
      'bKash Sales': d.bkashSales,
      'Bank Sales': d.bankSales,
      'Product Costs': d.productCosts,
      'Fixed Costs': d.fixedCosts,
      'Cash to Fund': d.cashToFund,
      'External Additions': d.externalAdditions,
      'Withdrawals': d.withdrawals,
      'Daily Net': d.dailyNet,
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Record');
  
  XLSX.writeFile(workbook, `daily_record_${new Date().toISOString().split('T')[0]}.xlsx`);
};
