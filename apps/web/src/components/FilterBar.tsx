'use client';

import React, { useMemo } from 'react';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
}

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  filterValues?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  onClear?: () => void;
}

export default function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters = [],
  filterValues = {},
  onFilterChange,
  onClear,
}: FilterBarProps) {
  const hasActiveFilters = useMemo(() => searchValue || Object.values(filterValues).some(Boolean), [searchValue, filterValues]);

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4" role="search" aria-label="Filter results">
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        {searchValue && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {filters.map((f) => (
        <select
          key={f.key}
          value={filterValues[f.key] || ''}
          onChange={(e) => onFilterChange?.(f.key, e.target.value)}
          aria-label={f.label}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">{f.label}</option>
          {f.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ))}

      {hasActiveFilters && onClear && (
        <button
          onClick={onClear}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
