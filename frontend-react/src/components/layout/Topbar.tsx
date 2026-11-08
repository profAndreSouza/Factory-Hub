import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const routeLabels: Record<string, string> = {
  '/': 'Hub Central',
  '/automacao': 'Automação Industrial',
  '/ciencia-de-dados': 'Ciência de Dados',
  '/nuvem': 'Nuvem AWS',
  '/devops': 'DevOps & CI/CD',
  '/dashboard': 'Smart N1 Dashboard',
};

export const Topbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const label = routeLabels[location.pathname] ?? 'Factory Hub';

  return (
    <header className="h-14 flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 transition-colors">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-400 dark:text-gray-500">Factory Hub</span>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <span className="font-semibold text-gray-700 dark:text-gray-200">{label}</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Live indicator */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Sistema Online
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="w-9 h-9 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-600 dark:text-gray-300"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
};

