// API Configuration Constants
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
};

// Date Format Constants
export const DATE_FORMATS = {
  DISPLAY: 'MMM DD, YYYY',
  API: 'YYYY-MM-DD',
  DATETIME: 'MMM DD, YYYY HH:mm',
};

// Payment Methods
export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'bkash', label: 'bKash' },
] as const;

// Sales Channels
export const SALES_CHANNELS = [
  { value: 'in_store', label: 'In Store' },
  { value: 'foodpanda', label: 'Foodpanda' },
  { value: 'foodi', label: 'Foodi' },
] as const;

// Expense Categories
export const EXPENSE_CATEGORIES = {
  PRODUCT: [
    'Vegetables',
    'Fruits',
    'Dairy',
    'Meat',
    'Spices',
    'Beverages',
    'Packaging',
    'Other',
  ],
  FIXED: [
    'Rent',
    'Salary',
    'Utilities',
    'Insurance',
    'Maintenance',
    'Other',
  ],
};

// Unit Types
export const UNIT_TYPES = [
  { value: 'kg', label: 'KG' },
  { value: 'g', label: 'Gram' },
  { value: 'L', label: 'Liter' },
  { value: 'ml', label: 'ML' },
  { value: 'pcs', label: 'Pieces' },
  { value: 'box', label: 'Box' },
  { value: 'pack', label: 'Pack' },
] as const;

// Date Range Presets
export const DATE_RANGES = {
  TODAY: 'today',
  WEEK: 'week',
  MONTH: 'month',
  PREV_MONTH: 'prev_month',
  CUSTOM: 'custom',
  ALL: 'all',
} as const;

// Transaction Types
export const TRANSACTION_TYPES = {
  SALE: 'sale',
  EXPENSE_PRODUCT: 'expense_product',
  EXPENSE_FIXED: 'expense_fixed',
  FUND_IN: 'fund_in',
  FUND_OUT: 'fund_out',
  CASH_TO_FUND: 'cash_to_fund',
  CASH_ADDED: 'cash_added',
  FUND_TO_CASH: 'fund_to_cash',
} as const;

// Currency
export const CURRENCY = '৳';

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
};

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER: 'user',
  THEME: 'theme',
  ERP_STATE: 'erp_state_v1',
  ERP_STATE_DEMO: 'erp_state_demo_v2',
  DATE_RANGE: 'dateRange',
  DEMO_MODE: 'demo_mode',
};
