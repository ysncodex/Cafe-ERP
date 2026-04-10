import { api } from '../api';
import type { Transaction } from '@/core/types';

// Type definitions for sales
export interface SaleCreateData {
  channel: 'in_store' | 'foodpanda' | 'foodi';
  paymentMethod: 'cash' | 'bank' | 'bkash';
  amount: number;
  description?: string;
  date: string;
}

export interface SalesStats {
  totalSales: number;
  cashSales: number;
  bankSales: number;
  bkashSales: number;
  salesByChannel: {
    in_store: number;
    foodpanda: number;
    foodi: number;
  };
}

// Sales Service
export const salesService = {
  // Get all sales transactions
  getAll: async (params?: { 
    startDate?: string; 
    endDate?: string;
    channel?: string;
  }): Promise<Transaction[]> => {
    return api.get<Transaction[]>('/sales', params);
  },

  // Get sales by ID
  getById: async (id: string): Promise<Transaction> => {
    return api.get<Transaction>(`/sales/${id}`);
  },

  // Create new sale
  create: async (data: SaleCreateData): Promise<Transaction> => {
    return api.post<Transaction>('/sales', data);
  },

  // Update sale
  update: async (id: string, data: Partial<SaleCreateData>): Promise<Transaction> => {
    return api.put<Transaction>(`/sales/${id}`, data);
  },

  // Delete sale
  delete: async (id: string): Promise<void> => {
    return api.delete<void>(`/sales/${id}`);
  },

  // Get sales statistics
  getStats: async (params?: { 
    startDate?: string; 
    endDate?: string;
  }): Promise<SalesStats> => {
    return api.get<SalesStats>('/sales/stats', params);
  },

  // Get recent sales
  getRecent: async (limit: number = 10): Promise<Transaction[]> => {
    return api.get<Transaction[]>('/sales/recent', { limit });
  },
};
