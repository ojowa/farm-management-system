'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, ChevronFirst, ChevronLast } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  showPageNumbers?: boolean;
  maxPageNumbers?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  showPageNumbers = true,
  maxPageNumbers = 5,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = React.useMemo(() => {
    if (!showPageNumbers) return [];
    if (totalPages <= maxPageNumbers) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const half = Math.floor(maxPageNumbers / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxPageNumbers - 1);

    if (end - start + 1 < maxPageNumbers) {
      start = Math.max(1, end - maxPageNumbers + 1);
    }

    const result: (number | string)[] = [];
    if (start > 1) {
      result.push(1);
      if (start > 2) result.push('...');
    }
    for (let i = start; i <= end; i++) result.push(i);
    if (end < totalPages) {
      if (end < totalPages - 1) result.push('...');
      result.push(totalPages);
    }
    return result;
  }, [currentPage, totalPages, maxPageNumbers, showPageNumbers]);

  return (
    <nav className={cn('flex items-center gap-1', className)} aria-label="Pagination">
      <button
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className={cn('p-2 rounded-md hover:bg-accent disabled:opacity-50 disabled:pointer-events-none', 'h-9 w-9')}
        aria-label="First page"
      >
        <ChevronFirst className="h-4 w-4" />
      </button>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={cn('p-2 rounded-md hover:bg-accent disabled:opacity-50 disabled:pointer-events-none', 'h-9 w-9')}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {showPageNumbers && (
        <div className="flex items-center gap-1">
          {pages.map((page, index) =>
            page === '...' ? (
              <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page as number)}
                className={cn(
                  'h-9 min-w-9 rounded-md text-sm font-medium transition-colors',
                  page === currentPage
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                )}
                aria-label={`Page ${page}`}
                aria-current={page === currentPage ? 'page' : undefined}
              >
                {page}
              </button>
            )
          )}
        </div>
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={cn('p-2 rounded-md hover:bg-accent disabled:opacity-50 disabled:pointer-events-none', 'h-9 w-9')}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      <button
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className={cn('p-2 rounded-md hover:bg-accent disabled:opacity-50 disabled:pointer-events-none', 'h-9 w-9')}
        aria-label="Last page"
      >
        <ChevronLast className="h-4 w-4" />
      </button>
    </nav>
  );
}