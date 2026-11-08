import React from 'react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';

interface NavItem {
  icon: string;
  label: string;
  to: string;
}

const navItems: NavItem[] = [
  { icon: '🏠', label: 'Hub Central', to: '/' },
  { icon: '⚡', label: 'Automação Industrial', to: '/automacao' },
  { icon: '📊', label: 'Ciência de Dados', to: '/ciencia-de-dados' },
  { icon: '☁️', label: 'Nuvem AWS', to: '/nuvem' },
  { icon: '🚀', label: 'DevOps & CI/CD', to: '/devops' },
  { icon: '🏭', label: 'Smart N1 Dashboard', to: '/dashboard' },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-60 flex-shrink-0 bg-slate-900 text-white flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-sm font-black">
            FH
          </div>
          <div>
            <div className="text-sm font-bold leading-tight">Factory Hub</div>
            <div className="text-xs text-slate-400 leading-tight">Smart N1 — IIoT Portal</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-3">
          Módulos
        </div>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group',
                isActive
                  ? 'bg-blue-600 text-white font-medium shadow-lg shadow-blue-900/40'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )
            }
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="leading-tight">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-700">
        <div className="text-xs text-slate-500">
          Célula Fabril Smart N1
        </div>
        <div className="text-xs text-slate-600 mt-0.5">v1.0.0 — 2026</div>
      </div>
    </aside>
  );
};

