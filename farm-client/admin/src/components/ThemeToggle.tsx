'use client';

import React from 'react';
import { useTheme } from '@/lib/theme';
import { Sun, Moon, Monitor } from 'lucide-react';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const Icon = theme === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <DropdownMenu
      trigger={
        <Button variant="ghost" size="icon" aria-label="Toggle theme" title="Theme">
          <Icon className="h-5 w-5" />
        </Button>
      }
    >
      <DropdownMenuItem onClick={() => setTheme('light')}>Light</DropdownMenuItem>
      <DropdownMenuItem onClick={() => setTheme('dark')}>Dark</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => setTheme('system')}>System</DropdownMenuItem>
    </DropdownMenu>
  );
}