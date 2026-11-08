import React from 'react';
import clsx from 'clsx';

interface MetricCardProps {
  title: string;
  value: number | string;
  unit?: string;
  trend?: number;
  colorVariant?: 'default' | 'success' | 'warning' | 'danger';
  icon?: React.ReactNode;
}

const variantStyles: Record<string, string> = {
  default: 'border-gray-200 dark:border-gray-700',
  success: 'border-green-400 dark:border-green-500',
  warning: 'border-amber-400 dark:border-amber-500',
  danger: 'border-red-400 dark:border-red-500',
};

const variantValueColor: Record<string, string> = {
  default: 'text-gray-900 dark:text-white',
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-red-600 dark:text-red-400',
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  trend,
  colorVariant = 'default',
  icon,
}) => {
  return (
    <div
      className={clsx(
        'rounded-xl border-l-4 bg-white dark:bg-gray-800 shadow-sm p-5 flex flex-col gap-2 transition-colors',
        variantStyles[colorVariant]
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</span>
        {icon && <span className="text-gray-400 dark:text-gray-500">{icon}</span>}
      </div>
      <div className="flex items-end gap-1">
        <span className={clsx('text-3xl font-bold', variantValueColor[colorVariant])}>
          {value}
        </span>
        {unit && (
          <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">{unit}</span>
        )}
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1 text-sm">
          <span className={trend >= 0 ? 'text-green-500' : 'text-red-500'}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
          </span>
          <span className="text-gray-400 dark:text-gray-500">vs. turno anterior</span>
        </div>
      )}
    </div>
  );
};

