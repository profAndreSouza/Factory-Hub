import React from 'react';
import { BookOpen, Lightbulb, AlertTriangle, HelpCircle } from 'lucide-react';

interface TheoryBoxProps {
  discipline: 'Automação Industrial' | 'Ciência de Dados' | 'Computação em Nuvem' | 'DevOps';
  week?: string;
  title: string;
  type?: 'theory' | 'tip' | 'warning' | 'formula';
  children: React.ReactNode;
}

export const TheoryBox: React.FC<TheoryBoxProps> = ({
  discipline,
  week,
  title,
  type = 'theory',
  children,
}) => {
  const getBadgeStyle = () => {
    switch (discipline) {
      case 'Automação Industrial':
        return 'bg-amber-950/80 text-amber-300 border-amber-700/50';
      case 'Ciência de Dados':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/50';
      case 'Computação em Nuvem':
        return 'bg-sky-950/80 text-sky-300 border-sky-700/50';
      case 'DevOps':
        return 'bg-purple-950/80 text-purple-300 border-purple-700/50';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'tip':
        return <Lightbulb className="w-5 h-5 text-amber-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-rose-400" />;
      case 'formula':
        return <HelpCircle className="w-5 h-5 text-indigo-400" />;
      default:
        return <BookOpen className="w-5 h-5 text-cyan-400" />;
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg backdrop-blur-sm transition-all hover:border-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          {getIcon()}
          <h4 className="font-semibold text-slate-100">{title}</h4>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {week && (
            <span className="rounded-md bg-slate-800 px-2 py-0.5 text-slate-300 font-mono">
              {week}
            </span>
          )}
          <span className={`rounded-md border px-2 py-0.5 font-medium ${getBadgeStyle()}`}>
            {discipline}
          </span>
        </div>
      </div>
      <div className="pt-3 text-sm leading-relaxed text-slate-300">
        {children}
      </div>
    </div>
  );
};

