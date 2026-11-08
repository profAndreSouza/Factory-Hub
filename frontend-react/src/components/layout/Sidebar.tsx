import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Cpu, 
  BarChart3, 
  Cloud, 
  GitBranch, 
  Factory,
  BookOpen
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
}

export const Sidebar: React.FC = () => {
  const navItems: NavItem[] = [
    {
      to: '/',
      label: 'Visão Geral & Teoria',
      sublabel: 'Pirâmide ISA-95 e Ecossistema',
      icon: <Home className="w-5 h-5" />,
    },
    {
      to: '/automacao',
      label: 'Automação Industrial',
      sublabel: 'ESP32, MQTT & Node-RED',
      icon: <Cpu className="w-5 h-5 text-amber-400" />,
      badge: '80h',
      badgeColor: 'bg-amber-950 text-amber-400 border-amber-800'
    },
    {
      to: '/ciencia-de-dados',
      label: 'Ciência de Dados & IA',
      sublabel: 'CRISP-DM, OEE & MLP',
      icon: <BarChart3 className="w-5 h-5 text-emerald-400" />,
      badge: '80h',
      badgeColor: 'bg-emerald-950 text-emerald-400 border-emerald-800'
    },
    {
      to: '/nuvem',
      label: 'Computação em Nuvem',
      sublabel: 'AWS Academy, SQS & VPC',
      icon: <Cloud className="w-5 h-5 text-sky-400" />,
      badge: '60h',
      badgeColor: 'bg-sky-950 text-sky-400 border-sky-800'
    },
    {
      to: '/devops',
      label: 'DevOps & CI/CD',
      sublabel: 'GitFlow, Docker & Actions',
      icon: <GitBranch className="w-5 h-5 text-purple-400" />,
      badge: '40h',
      badgeColor: 'bg-purple-950 text-purple-400 border-purple-800'
    },
    {
      to: '/fabrica',
      label: 'Fábrica Smart N1',
      sublabel: 'Dashboard Integrado Ao Vivo',
      icon: <Factory className="w-5 h-5 text-rose-400" />,
      badge: 'LIVE',
      badgeColor: 'bg-rose-950 text-rose-400 border-rose-800 animate-pulse'
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950/60 p-4 flex flex-col justify-between hidden md:flex shrink-0">
      <div className="space-y-6">
        <div>
          <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Trilhas Curriculares
          </span>
          <nav className="mt-2 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-xl px-3 py-2.5 text-xs transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-sky-900/60 to-slate-900 text-white font-semibold border border-sky-700/50 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <div>
                    <p className="font-medium text-slate-200">{item.label}</p>
                    <p className="text-[10px] text-slate-500">{item.sublabel}</p>
                  </div>
                </div>
                {item.badge && (
                  <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3 text-xs text-slate-400">
        <div className="flex items-center gap-2 text-slate-200 font-semibold mb-1">
          <BookOpen className="w-4 h-4 text-sky-400" />
          <span>Apostila Viva</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-snug">
          Alterne entre as abas teóricas e os playgrounds práticos em cada módulo.
        </p>
      </div>
    </aside>
  );
};

