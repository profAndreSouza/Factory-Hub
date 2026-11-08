import React from 'react';
import clsx from 'clsx';

interface TheoryBoxProps {
  type: 'info' | 'formula' | 'example' | 'warning';
  title: string;
  children: React.ReactNode;
}

const typeConfig = {
  info: {
    border: 'border-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    icon: 'ℹ️',
    titleColor: 'text-blue-700 dark:text-blue-300',
  },
  formula: {
    border: 'border-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    icon: '∑',
    titleColor: 'text-purple-700 dark:text-purple-300',
  },
  example: {
    border: 'border-green-500',
    bg: 'bg-green-50 dark:bg-green-900/20',
    icon: '💡',
    titleColor: 'text-green-700 dark:text-green-300',
  },
  warning: {
    border: 'border-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    icon: '⚠️',
    titleColor: 'text-amber-700 dark:text-amber-300',
  },
};

export const TheoryBox: React.FC<TheoryBoxProps> = ({ type, title, children }) => {
  const cfg = typeConfig[type];
  return (
    <div
      className={clsx(
        'rounded-r-xl border-l-4 p-4 my-3',
        cfg.border,
        cfg.bg
      )}
    >
      <div className={clsx('flex items-center gap-2 font-semibold mb-2 text-sm', cfg.titleColor)}>
        <span>{cfg.icon}</span>
        <span>{title}</span>
      </div>
      <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{children}</div>
    </div>
  );
};

