import type { ColumnDef } from '@tanstack/react-table';

export interface TableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  searchPlaceholder?: string;
  exportFileName?: string;
}
