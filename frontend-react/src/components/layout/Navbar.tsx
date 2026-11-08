import React from 'react';
import { Activity, ShieldCheck, Server, Sparkles } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-950/90 px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 shadow-lg shadow-sky-500/20">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-100">Factory Hub</h1>
            <span className="rounded bg-sky-950 px-1.5 py-0.5 text-[10px] font-semibold text-sky-400 border border-sky-800">
              v1.0.0
            </span>
            <span className="hidden sm:inline-flex rounded bg-emerald-950 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-800">
              AWS Academy Ready
            </span>
          </div>
          <p className="text-xs text-slate-400">Portal Educacional & Célula Fabril Smart N1</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs">
        {/* Status Pills */}
        <div className="hidden md:flex items-center gap-3 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1.5">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>MQTT Core: Conectado</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5 text-sky-400">
            <Server className="h-3.5 w-3.5" />
            <span>EC2: t3.small</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5 text-purple-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>IA: MLP Model Online</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:text-white">
            <ShieldCheck className="h-4 w-4 text-amber-400" />
          </div>
        </div>
      </div>
    </header>
  );
};

