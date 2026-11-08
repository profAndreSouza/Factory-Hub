import React, { useState, useEffect } from 'react';
import { 
  Factory, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Cpu, 
  TrendingUp, 
  Clock, 
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { MetricCard } from '../components/common/MetricCard';

interface TelemetryPoint {
  time: string;
  temp: number;
  vib: number;
  rpm: number;
}

export const SmartN1Dashboard: React.FC = () => {
  const [dataPoints, setDataPoints] = useState<TelemetryPoint[]>([
    { time: '10:00', temp: 68.2, vib: 2.1, rpm: 3480 },
    { time: '10:05', temp: 69.1, vib: 2.3, rpm: 3490 },
    { time: '10:10', temp: 70.4, vib: 2.2, rpm: 3470 },
    { time: '10:15', temp: 72.8, vib: 2.5, rpm: 3450 },
    { time: '10:20', temp: 71.9, vib: 2.4, rpm: 3460 },
    { time: '10:25', temp: 73.5, vib: 2.6, rpm: 3480 },
    { time: '10:30', temp: 74.2, vib: 2.8, rpm: 3490 },
  ]);

  const [currentTemp, setCurrentTemp] = useState<number>(74.2);
  const [currentVib, setCurrentVib] = useState<number>(2.8);
  const [lastUpdate, setLastUpdate] = useState<string>(new Date().toLocaleTimeString());

  // Simulação de telemetria contínua a cada 5 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      // Adiciona leve ruído gaussiano simulando sensor real
      const newTemp = +(70 + Math.sin(Date.now() / 10000) * 6 + (Math.random() - 0.5) * 1.5).toFixed(1);
      const newVib = +(2.2 + (Math.random() - 0.5) * 0.8).toFixed(2);
      const newRpm = Math.floor(3450 + (Math.random() - 0.5) * 60);

      setCurrentTemp(newTemp);
      setCurrentVib(newVib);
      setLastUpdate(now);

      setDataPoints(prev => [
        ...prev.slice(1),
        { time: now, temp: newTemp, vib: newVib, rpm: newRpm }
      ]);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Executivo */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Factory className="w-6 h-6 text-rose-400" />
            <h2 className="text-2xl font-bold text-white">Célula Fabril Smart N1 — Dashboard Integrado</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Monitoramento de chão de fábrica unificando telemetria OT, predição de IA, consolidações em nuvem e saúde dos containers.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg font-mono">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>Última sincronização: {lastUpdate}</span>
          </div>
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800 px-3 py-1.5 rounded-lg">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Chão de Fábrica Online
          </span>
        </div>
      </div>

      {/* 4 Cards de Métricas Principais (OEE e Produção) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="OEE Geral da Célula"
          value="84.6"
          unit="%"
          sublabel="Meta Classe Mundial: ≥ 85%"
          trend="up"
          trendValue="+1.8%"
          status="normal"
          icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
        />
        <MetricCard
          label="Disponibilidade Média"
          value="91.2"
          unit="%"
          sublabel="Paradas não programadas: 18 min"
          trend="neutral"
          trendValue="0.0%"
          status="normal"
          icon={<Activity className="w-4 h-4 text-sky-400" />}
        />
        <MetricCard
          label="Temperatura Torno CNC-01"
          value={currentTemp}
          unit="°C"
          sublabel="Faixa aceitável: 60-78°C"
          trend={currentTemp > 75 ? 'up' : 'neutral'}
          trendValue={currentTemp > 75 ? 'Atenção' : 'Estável'}
          status={currentTemp > 78 ? 'warning' : 'normal'}
          icon={<Cpu className="w-4 h-4 text-amber-400" />}
        />
        <MetricCard
          label="Diagnóstico de IA (MLP)"
          value="Normal"
          unit=""
          sublabel="Probabilidade de falha: 14.2%"
          status="normal"
          icon={<Sparkles className="w-4 h-4 text-purple-400" />}
        />
      </div>

      {/* Gráficos de Telemetria Temporal e Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de Telemetria Dinâmica */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-sky-400" />
                Telemetria Contínua da Máquina (Últimas Leituras)
              </h3>
              <p className="text-xs text-slate-400">Dados ingeridos via AWS IoT Core e consumidos pelo Backend Java.</p>
            </div>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
              Dispositivo: esp32-torno-01
            </span>
          </div>

          {/* Gráfico Simplificado em Barras SVG */}
          <div className="h-52 w-full pt-4 flex items-end justify-between gap-2 border-b border-slate-800 pb-2">
            {dataPoints.map((pt, idx) => {
              const heightPercent = Math.min(Math.max(((pt.temp - 50) / 50) * 100, 10), 100);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <span className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {pt.temp}°C
                  </span>
                  <div
                    className={`w-full rounded-t-md transition-all duration-500 ${
                      pt.temp > 75 ? 'bg-amber-500' : 'bg-sky-500'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  ></div>
                  <span className="text-[9px] text-slate-500 font-mono">{pt.time}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded bg-sky-500"></span>
                <span>Temperatura (°C)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded bg-amber-500"></span>
                <span>Zona de Alerta (&gt; 75°C)</span>
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Taxa de amostragem: 4s</span>
          </div>
        </div>

        {/* Tabela de Alertas Preditivos & Status das Máquinas */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Alertas & Manutenção
            </h3>
            <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded font-bold">
              1 Pendente
            </span>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-amber-800/60 bg-amber-950/20 p-3">
              <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                <span>Torno CNC-01 (Mancal)</span>
                <span className="text-[10px] font-mono text-amber-400">10:28</span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Elevação gradual de vibração ({currentVib} mm/s). Rede Neural sugere re-lubrificação preventiva no próximo intervalo.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span>Fresadora CNC-02</span>
                <span className="text-[10px] font-mono text-emerald-400">OPERACIONAL</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Todas as medições dentro da normalidade. OEE em 88.3%.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span>Injetora Plástica-03</span>
                <span className="text-[10px] font-mono text-emerald-400">OPERACIONAL</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Ciclo de injeção estável (42 s/ciclo). Qualidade em 98.7%.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

