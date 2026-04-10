import { api } from '../api';
import type { Transaction } from '@/core/types';

// Type definitions for fund operations
export interface FundOperationData {
  type: 'fund_in' | 'fund_out' | 'cash_to_fund' | 'cash_added' | 'fund_to_cash';
  amount: number;
  source?: string;
  reason?: string;
  description?: string;
  date: string;
}

export interface FundStats {
  totalFundBalance: number;
  cashToFundTransfers: number;
  externalAdditions: number;
  withdrawals: number;
}

// Fund Service
export const fundService = {
  // Get all fund transactions
  getAll: async (params?: { 
    startDate?: string; 
    endDate?: string;
    type?: string;
  }): Promise<Transaction[]> => {
    return api.get<Transaction[]>('/funds', params);
  },

  // Get fund transaction by ID
  getById: async (id: string): Promise<Transaction> => {
    return api.get<Transaction>(`/funds/${id}`);
  },

  // Create fund operation
  create: async (data: FundOperationData): Promise<Transaction> => {
    return api.post<Transaction>('/funds', data);
  },

  // Update fund operation
  update: async (id: string, data: Partial<FundOperationData>): Promise<Transaction> => {
    return api.put<Transaction>(`/funds/${id}`, data);
  },

  // Delete fund operation
  delete: async (id: string): Promise<void> => {
    return api.delete<void>(`/funds/${id}`);
  },

  // Get fund statistics
  getStats: async (params?: { 
    startDate?: string; 
    endDate?: string;
  }): Promise<FundStats> => {
    return api.get<FundStats>('/funds/stats', params);
  },

  // Get current fund balance
  getBalance: async (): Promise<number> => {
    return api.get<number>('/funds/balance');
  },
};
