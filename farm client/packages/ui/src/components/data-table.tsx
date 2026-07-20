import * as React from 'react';
import { cn } from '../lib/cn';
import { EmptyState } from './empty-state';

export interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: string;
  emptyAction?: React.ReactNode;
  onRowClick?: (row: T) => void;
  footer?: React.ReactNode;
  className?: string;
}

function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data found',
  emptyIcon,
  emptyAction,
  onRowClick,
  footer,
  className,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className={cn('bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8', className)}>
        <div className="animate-pulse space-y-4" aria-label="Loading" role="status">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={cn('bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center', className)}>
        <EmptyState
          icon={emptyIcon}
          title={emptyMessage}
          action={emptyAction}
        />
      </div>
    );
  }

  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr
                key={item.id || idx}
                className={cn(
                  'border-b border-gray-100 dark:border-gray-700 last:border-0',
                  onRowClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50',
                )}
                onClick={() => onRowClick?.(item)}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(item); } } : undefined}
                role={onRowClick ? 'button' : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-gray-900 dark:text-gray-100">
                    {col.render ? col.render(item) : item[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer && <div className="border-t border-gray-200 dark:border-gray-700">{footer}</div>}
    </div>
  );
}

export { DataTable };
