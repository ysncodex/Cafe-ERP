import { useState, useEffect, useCallback } from 'react';
import { usePagination, type PaginationConfig, type UsePaginationReturn } from './usePagination';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UsePaginatedApiOptions<T> extends PaginationConfig {
  autoFetch?: boolean;
  dependencies?: unknown[];
  onSuccess?: (data: T[]) => void;
  onError?: (error: Error) => void;
}

export interface UsePaginatedApiReturn<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  pagination: UsePaginationReturn;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching paginated data from API
 * Combines data fetching with pagination logic
 *
 * @example
 * ```tsx
 * // For API that returns paginated response
 * const { data, loading, error, pagination } = usePaginatedApi(
 *   (page, pageSize) => api.get(`/invoices?page=${page}&limit=${pageSize}`),
 *   { initialPageSize: 20 }
 * );
 *
 * // For client-side pagination of fetched data
 * const { data: allInvoices } = useApi(() => api.get('/invoices'));
 * const pagination = usePagination({ initialPageSize: 20 });
 * pagination.setTotalItems(allInvoices?.length || 0);
 * const paginatedData = allInvoices?.slice(pagination.startIndex, pagination.endIndex);
 * ```
 */
export const usePaginatedApi = <T>(
  apiFunction: (page: number, pageSize: number) => Promise<PaginatedResponse<T>>,
  options: UsePaginatedApiOptions<T> = {}
): UsePaginatedApiReturn<T> => {
  const { autoFetch = true, dependencies = [], onSuccess, onError, ...paginationConfig } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const pagination = usePagination(paginationConfig);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiFunction(pagination.currentPage, pagination.pageSize);

      // Update data and pagination state
      setData(response.data);
      pagination.setTotalItems(response.total);

      // Call success callback if provided
      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = axiosErr.response?.data?.message || axiosErr.message || 'Failed to fetch data';
      setError(errorMessage);
      console.error('Paginated API Error:', err);

      // Call error callback if provided
      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [apiFunction, pagination.currentPage, pagination.pageSize, ...dependencies]);

  // Fetch data when page or pageSize changes
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [fetchData, autoFetch]);

  return {
    data,
    loading,
    error,
    pagination,
    refetch: fetchData,
  };
};

/**
 * Hook for client-side pagination of already-fetched data
 * Use when you have all data and want to paginate it on the client
 *
 * @example
 * ```tsx
 * const { data: allInvoices, loading } = useApi(() => invoiceService.getAll());
 * const { paginatedData, pagination } = useClientPagination(allInvoices || [], {
 *   initialPageSize: 20
 * });
 *
 * return (
 *   <>
 *     <InvoiceList invoices={paginatedData} />
 *     <Pagination pagination={pagination} />
 *   </>
 * );
 * ```
 */
export const useClientPagination = <T>(data: T[], config: PaginationConfig = {}) => {
  const pagination = usePagination(config);

  // Update total items when data changes
  useEffect(() => {
    pagination.setTotalItems(data.length);
  }, [data.length]);

  // Get paginated slice of data
  const paginatedData = data.slice(pagination.startIndex, pagination.endIndex);

  return {
    paginatedData,
    pagination,
  };
};
