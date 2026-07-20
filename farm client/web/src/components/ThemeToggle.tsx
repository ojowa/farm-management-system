'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/lib/theme';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const options = [
    { value: 'light' as const, label: 'Light', icon: '☀️' },
    { value: 'dark' as const, label: 'Dark', icon: '🌙' },
    { value: 'system' as const, label: 'System', icon: '💻' },
  ];

  const current = options.find((o) => o.value === theme) || options[2];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        aria-label="Toggle theme"
      >
        {current.icon}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 py-1">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setTheme(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 ${theme === opt.value ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
            >
              <span>{opt.icon}</span> {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
