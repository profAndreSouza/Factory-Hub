import React from 'react';
import clsx from 'clsx';

type StatusValue = 'OPERATIONAL' | 'WARNING' | 'CRITICAL' | 'RISCO_ANOMALIA' | 'ATENCAO' | 'STOPPED' | 'UNKNOWN' | 'online' | 'offline' | 'degraded' | 'unknown';

interface StatusBadgeProps {
  status: StatusValue;
  size?: 'sm' | 'md';
}

const statusConfig: Record<StatusValue, { label: string; classes: string; dot: string }> = {
  OPERATIONAL: {
    label: 'OPERATIONAL',
    classes: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    dot: 'bg-green-500',
  },
  online: {
    label: 'ONLINE',
    classes: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    dot: 'bg-green-500',
  },
  WARNING: {
    label: 'WARNING',
    classes: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  degraded: {
    label: 'DEGRADED',
    classes: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  CRITICAL: {
    label: 'CRITICAL',
    classes: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    dot: 'bg-red-500',
  },
  RISCO_ANOMALIA: {
    label: 'RISCO DE ANOMALIA',
    classes: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    dot: 'bg-red-500',
  },
  ATENCAO: {
    label: 'ATENÇÃO',
    classes: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  STOPPED: {
    label: 'STOPPED',
    classes: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    dot: 'bg-gray-500',
  },
  UNKNOWN: {
    label: 'UNKNOWN',
    classes: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    dot: 'bg-gray-400',
  },
  offline: {
    label: 'OFFLINE',
    classes: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    dot: 'bg-red-500',
  },
  unknown: {
    label: 'UNKNOWN',
    classes: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    dot: 'bg-gray-400',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = statusConfig[status];
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-semibold',
        config.classes,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs'
      )}
    >
      <span className={clsx('rounded-full animate-pulse', config.dot, size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2')} />
      {config.label}
    </span>
  );
};

