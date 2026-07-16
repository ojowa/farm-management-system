import * as React from 'react';
import { cn } from '../lib/cn';

const colorMap: Record<string, string> = {
  green: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',
  red: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300',
  yellow: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300',
  blue: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',
  gray: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
  orange: 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300',
  primary: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',
  secondary: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',
  success: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',
  warning: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300',
  danger: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300',
  info: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-300',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: string;
}

function Badge({ className, color = 'gray', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        colorMap[color] || colorMap.gray,
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
