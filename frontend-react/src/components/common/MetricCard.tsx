import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  sublabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  status?: 'normal' | 'warning' | 'critical' | 'info';
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  sublabel,
  trend,
  trendValue,
  status = 'info',
  icon,
}) => {
  const getStatusBorder = () => {
    switch (status) {
      case 'normal':
        return 'border-emerald-500/30 hover:border-emerald-500/60 bg-gradient-to-b from-slate-900/90 to-emerald-950/20';
      case 'warning':
        return 'border-amber-500/30 hover:border-amber-500/60 bg-gradient-to-b from-slate-900/90 to-amber-950/20';
      case 'critical':
        return 'border-rose-500/30 hover:border-rose-500/60 bg-gradient-to-b from-slate-900/90 to-rose-950/20';
      default:
        return 'border-slate-800 hover:border-slate-700 bg-slate-900/80';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'normal':
        return 'text-emerald-400';
      case 'warning':
        return 'text-amber-400';
      case 'critical':
        return 'text-rose-400';
      default:
        return 'text-sky-400';
    }
  };

  return (
    <div className={`rounded-xl border p-4 shadow-md backdrop-blur-sm transition-all ${getStatusBorder()}`}>
      <div className="flex items-center justify-between text-xs font-medium text-slate-400">
        <span>{label}</span>
        {icon && <span className="text-slate-400">{icon}</span>}
      </div>

      <div className="mt-2 flex items-baseline gap-1.5">
        <span className={`text-2xl font-bold tracking-tight ${getStatusText()}`}>
          {value}
        </span>
        {unit && <span className="text-sm font-medium text-slate-400">{unit}</span>}
      </div>

      {(sublabel || trend) && (
        <div className="mt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/60 pt-2">
          <span>{sublabel}</span>
          {trend && (
            <span className="flex items-center gap-0.5 font-medium">
              {trend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
              {trend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
              {trend === 'neutral' && <Minus className="w-3.5 h-3.5 text-slate-400" />}
              {trendValue}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

