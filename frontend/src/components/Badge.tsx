import type { ReactNode } from 'react';

type BadgeVariant = 'strategic' | 'operational' | 'defensive' | 'capability' | 'default' | 'blue' | 'green' | 'yellow' | 'red' | 'gray';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  strategic: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  operational: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  defensive: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  capability: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  default: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium transition-colors duration-150 ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
