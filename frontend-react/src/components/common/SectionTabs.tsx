import React from 'react';
import clsx from 'clsx';

interface Tab {
  id: string;
  label: string;
}

interface SectionTabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
}

export const SectionTabs: React.FC<SectionTabsProps> = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit mb-6">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={clsx(
            'px-5 py-2 rounded-lg text-sm font-medium transition-all',
            activeTab === tab.id
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

