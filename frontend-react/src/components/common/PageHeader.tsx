import React from 'react';

interface PageHeaderProps {
  icon: string;
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  icon,
  title,
  subtitle,
  badge,
  badgeColor = 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
}) => {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-4xl">{icon}</span>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
            {badge && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
                {badge}
              </span>
            )}
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="h-px bg-gradient-to-r from-blue-500 via-cyan-400 to-transparent mt-4" />
    </div>
  );
};

