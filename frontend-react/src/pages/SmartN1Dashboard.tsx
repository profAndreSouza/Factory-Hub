import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { MetricCard } from '../components/common/MetricCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { TelemetryLineChart } from '../components/charts/TelemetryLineChart';
import { OeeGaugeChart } from '../components/charts/OeeGaugeChart';
import {
  getMaquinas,
  getTelemetria,
  getOeeIndicators,
  getAlertas,
} from '../services/telemetryService';
import { Machine, TelemetryReading, OeeIndicators, Alert } from '../types';

const SEVERITY_ROW: Record<Alert['severidade'], string> = {
  LOW: 'bg-gray-50 dark:bg-gray-900/40',
  MEDIUM: 'bg-amber-50 dark:bg-amber-900/10',
  HIGH: 'bg-orange-50 dark:bg-orange-900/10',
  CRITICAL: 'bg-red-50 dark:bg-red-900/10',
};

const SEVERITY_BADGE: Record<Alert['severidade'], string> = {
  LOW: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  MEDIUM: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export const SmartN1Dashboard: React.FC = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [oee, setOee] = useState<OeeIndicators | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryReading[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('esp32-torno-01');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [loadError, setLoadError] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [m, a] = await Promise.all([getMaquinas(), getAlertas()]);
      setMachines(m);
      setAlerts(a);
      if (m.length) {
        setSelectedDevice(current => m.some(machine => machine.device_id === current) ? current : m[0].device_id);
      }
      setLoadError(false);
      setLastRefresh(new Date());
    } catch {
      setLoadError(true);
    }
  }, []);

  const fetchTelemetry = useCallback(async (deviceId: string) => {
    try {
      const t = await getTelemetria(deviceId);
      setTelemetry(t);
    } catch {
      setTelemetry([]);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  useEffect(() => {
    fetchTelemetry(selectedDevice);
  }, [selectedDevice, fetchTelemetry]);

  useEffect(() => {
    if (!selectedDevice) return;
    getOeeIndicators(selectedDevice, 'hoje').then(setOee).catch(() => setOee(null));
  }, [selectedDevice, lastRefresh]);

  // KPI computations
  const avgTemp = machines.length
    ? parseFloat(
        (machines.reduce((acc, m) => acc + m.ultima_leitura.temperatura, 0) / machines.length).toFixed(1)
      )
    : 0;

  const totalPecas = oee?.total_pecas;
  const totalDefeitos = oee?.pecas_refugo;
  const oeeObservedSeconds = oee?.tempo_observado_segundos ?? 0;
  const oeeObservedLabel = oeeObservedSeconds < 60
    ? `${oeeObservedSeconds} s`
    : `${Math.round(oeeObservedSeconds / 60)} min`;
  const taxaRefugo = totalPecas && totalDefeitos !== undefined
    ? parseFloat(((totalDefeitos / totalPecas) * 100).toFixed(2))
    : undefined;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <PageHeader
          icon="🏭"
          title="Smart N1 Dashboard"
          subtitle="Monitoramento operacional em tempo real · Célula Fabril"
          badge="LIVE"
          badgeColor="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
        />
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-right">
          <div>Auto-refresh: 10s</div>
          <div>Atualizado: {lastRefresh.toLocaleTimeString('pt-BR')}</div>
        </div>
      </div>

      {loadError && <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">Não foi possível atualizar os dados do backend. Confira a conexão com a API.</div>}

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="OEE da Máquina"
          value={oee?.oee ?? '—'}
          unit={oee ? '%' : undefined}
          colorVariant={!oee ? 'default' : oee.oee >= 85 ? 'success' : oee.oee >= 65 ? 'warning' : 'danger'}
          icon={<span className="text-xl">📊</span>}
        />
        <MetricCard
          title="Peças Hoje"
          value={totalPecas ?? '—'}
          unit={totalPecas !== undefined ? 'pcs' : undefined}
          colorVariant="default"
          icon={<span className="text-xl">🔧</span>}
        />
        <MetricCard
          title="Taxa de Refugo"
          value={taxaRefugo ?? '—'}
          unit={taxaRefugo !== undefined ? '%' : undefined}
          colorVariant={taxaRefugo === undefined ? 'default' : taxaRefugo > 2 ? 'danger' : taxaRefugo > 1 ? 'warning' : 'success'}
          icon={<span className="text-xl">🗑️</span>}
        />
        <MetricCard
          title="Temp. Média"
          value={machines.length ? avgTemp : '—'}
          unit={machines.length ? '°C' : undefined}
          colorVariant={avgTemp > 90 ? 'danger' : avgTemp > 80 ? 'warning' : 'default'}
          icon={<span className="text-xl">🌡️</span>}
        />
      </div>

      {/* OEE Gauge + Machine Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* OEE Gauge */}
        {oee && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm flex flex-col items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 self-start">OEE por Componente</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 self-start">
              {oee.origem === 'LIVE_PARTIAL'
                ? `Calculado com telemetria real em ${oeeObservedLabel} observados.`
                : 'Indicador demonstrativo; aguardando telemetria real com contadores.'}
            </p>
            <OeeGaugeChart oee={oee.oee} size={160} />
            <div className="w-full space-y-2 text-xs">
              {[
                { label: 'Disponibilidade', value: oee.disponibilidade, color: 'bg-blue-500' },
                { label: 'Performance', value: oee.performance, color: 'bg-cyan-500' },
                { label: 'Qualidade', value: oee.qualidade, color: 'bg-green-500' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-gray-500 dark:text-gray-400">{label}</span>
                    <span className="font-bold text-gray-700 dark:text-gray-300">{value}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                    <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Machine Status Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {machines.map(machine => (
            <div
              key={machine.device_id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-bold text-sm text-gray-800 dark:text-gray-200">{machine.nome}</div>
                  <div className="text-xs text-gray-400">{machine.linha}</div>
                </div>
                <StatusBadge status={machine.status} size="sm" />
              </div>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-gray-400">Temp</span>
                  <span className={`font-bold ${machine.ultima_leitura.temperatura > 85 ? 'text-red-500' : machine.ultima_leitura.temperatura > 75 ? 'text-amber-500' : 'text-green-500'}`}>
                    {machine.ultima_leitura.temperatura}°C
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Vibração</span>
                  <span className={`font-bold ${machine.ultima_leitura.vibracao > 6 ? 'text-red-500' : machine.ultima_leitura.vibracao > 4 ? 'text-amber-500' : 'text-green-500'}`}>
                    {machine.ultima_leitura.vibracao} mm/s
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">RPM</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300">
                    {machine.ultima_leitura.rpm}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Telemetry Chart */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-200">📈 Telemetria em Tempo Real</h2>
          <select
            value={selectedDevice}
            onChange={e => setSelectedDevice(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {machines.map(m => (
              <option key={m.device_id} value={m.device_id}>{m.nome}</option>
            ))}
          </select>
        </div>
        <TelemetryLineChart data={telemetry} title={`${machines.find(m => m.device_id === selectedDevice)?.nome ?? selectedDevice} — últimos 30 min`} />
      </div>

      {/* Alerts Table */}
      <div>
        <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3">🚨 Alertas Preditivos</h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  <th className="px-4 py-3 text-left font-semibold">Máquina</th>
                  <th className="px-4 py-3 text-left font-semibold">Horário</th>
                  <th className="px-4 py-3 text-left font-semibold">Risco</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Severidade</th>
                  <th className="px-4 py-3 text-left font-semibold">Recomendação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {alerts.map(alert => (
                  <tr
                    key={alert.id}
                    className={`${SEVERITY_ROW[alert.severidade]} hover:opacity-90 transition-opacity`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                      {alert.device_id}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(alert.timestamp).toLocaleTimeString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${
                              alert.probabilidade_falha > 75
                                ? 'bg-red-500'
                                : alert.probabilidade_falha > 40
                                ? 'bg-amber-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${alert.probabilidade_falha}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          {alert.probabilidade_falha}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={alert.status_previsto as 'OPERATIONAL' | 'WARNING' | 'CRITICAL' | 'RISCO_ANOMALIA' | 'ATENCAO'}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${SEVERITY_BADGE[alert.severidade]}`}>
                        {alert.severidade}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-xs">
                      {alert.recomendacao}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

