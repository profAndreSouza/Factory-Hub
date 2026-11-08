import React, { useEffect, useRef, useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { SectionTabs } from '../components/common/SectionTabs';
import { TheoryBox } from '../components/common/TheoryBox';
import { TelemetryLineChart } from '../components/charts/TelemetryLineChart';
import { getTelemetria } from '../services/telemetryService';
import { TelemetryReading } from '../types';

const TABS = [
  { id: 'teoria', label: '📚 Teoria' },
  { id: 'lab', label: '🧪 Laboratório' },
];

type SimStatus = 'OPERATIONAL' | 'WARNING' | 'CRITICAL';

const simReadings: Record<SimStatus, { temperatura: number; vibracao: number; rpm: number }> = {
  OPERATIONAL: { temperatura: 72.4, vibracao: 2.3, rpm: 3100 },
  WARNING: { temperatura: 83.1, vibracao: 5.2, rpm: 2850 },
  CRITICAL: { temperatura: 95.8, vibracao: 8.7, rpm: 2600 },
};

function buildPayload(deviceId: string, status: SimStatus) {
  const r = simReadings[status];
  return JSON.stringify(
    {
      device_id: deviceId,
      timestamp: new Date().toISOString(),
      temperatura: r.temperatura,
      vibracao: r.vibracao,
      rpm: r.rpm,
      status,
      pecas_produzidas: status === 'CRITICAL' ? 23 : status === 'WARNING' ? 38 : 52,
      pecas_defeito: status === 'CRITICAL' ? 4 : status === 'WARNING' ? 1 : 0,
    },
    null,
    2
  );
}

function buildLogEntry(status: SimStatus): string {
  const time = new Date().toLocaleTimeString('pt-BR');
  const r = simReadings[status];
  const icon = status === 'CRITICAL' ? '🔴' : status === 'WARNING' ? '🟡' : '🟢';
  return `[${time}] ${icon} PUBLISH esp32-torno-01/telemetria | temp=${r.temperatura}°C vib=${r.vibracao}mm/s rpm=${r.rpm} status=${status}`;
}

export const AutomationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('teoria');
  const [simStatus, setSimStatus] = useState<SimStatus>('OPERATIONAL');
  const [logs, setLogs] = useState<string[]>([
    '[sistema] Aguardando publicação...',
  ]);
  const [telemetry, setTelemetry] = useState<TelemetryReading[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getTelemetria('esp32-torno-01').then(setTelemetry);
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const handleSim = (status: SimStatus) => {
    setSimStatus(status);
    const entry = buildLogEntry(status);
    setLogs(prev => [...prev.slice(-49), entry]);
  };

  const payload = buildPayload('esp32-torno-01', simStatus);

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        icon="⚡"
        title="Automação Industrial"
        subtitle="ISA-95 · MQTT · Sensores · Histerese · ESP32"
        badge="Semanas 1–3"
        badgeColor="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
      />

      <SectionTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'teoria' && (
        <div className="space-y-6">
          {/* ISA-95 Table */}
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3">🏗️ Hierarquia ISA-95 no Factory Hub</h2>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm bg-white dark:bg-gray-800">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    <th className="px-4 py-3 text-left font-semibold">Nível</th>
                    <th className="px-4 py-3 text-left font-semibold">Nome</th>
                    <th className="px-4 py-3 text-left font-semibold">Função</th>
                    <th className="px-4 py-3 text-left font-semibold">Factory Hub</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {[
                    ['0', 'Field Level', 'Sensores e atuadores físicos', 'DS18B20 (temp), MPU-6050 (vibração)'],
                    ['1', 'Control Level', 'Controle de processos em tempo real', 'ESP32 com firmware MicroPython/Arduino'],
                    ['2', 'SCADA / HMI', 'Supervisão e monitoramento visual', 'Node-RED com dashboard MQTT'],
                    ['3', 'MES', 'Execução e rastreamento de produção', 'Backend Java Spring Boot + REST API'],
                    ['4', 'ERP / Enterprise', 'Planejamento e integração empresarial', 'AWS EC2 + RDS + SQS + React Frontend'],
                  ].map(([lvl, name, fn, fh]) => (
                    <tr key={lvl} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-blue-500">L{lvl}</td>
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{name}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{fn}</td>
                      <td className="px-4 py-3 text-cyan-600 dark:text-cyan-400 font-mono text-xs">{fh}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* MQTT */}
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3">📡 Protocolo MQTT</h2>
            <TheoryBox type="info" title="Estrutura de Tópico">
              <code className="text-blue-600 dark:text-blue-300 font-mono text-sm">
                factory/celula-n1/{'<device_id>'}/telemetria
              </code>
              <p className="mt-2">
                Exemplo: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">factory/celula-n1/esp32-torno-01/telemetria</code>
              </p>
            </TheoryBox>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 mt-3">
              <table className="w-full text-sm bg-white dark:bg-gray-800">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    <th className="px-4 py-3 text-left font-semibold">QoS</th>
                    <th className="px-4 py-3 text-left font-semibold">Garantia</th>
                    <th className="px-4 py-3 text-left font-semibold">Uso no Projeto</th>
                    <th className="px-4 py-3 text-left font-semibold">Overhead</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {[
                    ['QoS 0', 'At most once — Fire & forget', 'Telemetria de alta frequência (5s)', 'Mínimo'],
                    ['QoS 1', 'At least once — ACK requerido', 'Alertas e eventos de status', 'Médio'],
                    ['QoS 2', 'Exactly once — 4-way handshake', 'Comandos críticos de atuação', 'Alto'],
                  ].map(([qos, guarantee, use, overhead]) => (
                    <tr key={qos} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 font-bold text-purple-500 font-mono">{qos}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{guarantee}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{use}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{overhead}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sensors */}
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3">🔧 Tipos de Sinais de Sensor</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TheoryBox type="info" title="Sinal Discreto (Digital)">
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Dois estados: 0 (LOW) ou 1 (HIGH)</li>
                  <li>Ex: botão de emergência, reed switch, sensor indutivo</li>
                  <li>ESP32: GPIO com <code>digitalRead()</code></li>
                  <li>Protocolo: Bit único no payload JSON</li>
                </ul>
              </TheoryBox>
              <TheoryBox type="example" title="Sinal Analógico (Contínuo)">
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Valores contínuos em uma faixa (0–3.3V / 0–4095 ADC)</li>
                  <li>Ex: DS18B20 (temperatura), MPU-6050 (aceleração)</li>
                  <li>ESP32: ADC 12-bit com <code>analogRead()</code></li>
                  <li>Requer calibração e filtro passa-baixa</li>
                </ul>
              </TheoryBox>
            </div>
          </div>

          {/* Hysteresis */}
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3">📐 Histerese (Hysteresis)</h2>
            <TheoryBox type="warning" title="Thresholds de Alarme com Histerese">
              <p className="mb-2">
                A histerese evita o "chattering" (oscilação rápida de alarmes) ao usar thresholds diferentes
                para ativação e desativação.
              </p>
              <div className="font-mono text-xs bg-gray-800 text-green-400 rounded p-3 mt-2 space-y-1">
                <div>{'// Temperatura'}</div>
                <div>{'NORMAL   → WARNING:  T > 80°C  (ativa alarme)'}</div>
                <div>{'WARNING  → NORMAL:   T < 76°C  (cancela, histerese = 4°C)'}</div>
                <div>{'WARNING  → CRITICAL: T > 90°C  (escalada)'}</div>
                <div>{'CRITICAL → WARNING:  T < 85°C  (histerese = 5°C)'}</div>
                <div className="mt-2">{'// Vibração (mm/s)'}</div>
                <div>{'NORMAL   → WARNING:  V > 5.0'}</div>
                <div>{'WARNING  → NORMAL:   V < 4.0  (histerese = 1.0)'}</div>
              </div>
            </TheoryBox>
          </div>
        </div>
      )}

      {activeTab === 'lab' && (
        <div className="space-y-6">
          {/* ESP32 Simulator */}
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3">🔧 Simulador ESP32</h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Simule diferentes estados do <code className="text-blue-500">esp32-torno-01</code> e observe o payload MQTT gerado.
              </p>
              <div className="flex gap-3 mb-5 flex-wrap">
                {(['OPERATIONAL', 'WARNING', 'CRITICAL'] as SimStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => handleSim(s)}
                    className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                      simStatus === s
                        ? s === 'OPERATIONAL'
                          ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                          : s === 'WARNING'
                          ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                          : 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {s === 'OPERATIONAL' ? '🟢' : s === 'WARNING' ? '🟡' : '🔴'} {s}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3 mb-5">
                {Object.entries(simReadings[simStatus]).map(([key, val]) => (
                  <div key={key} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{key}</div>
                    <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{val}</div>
                    <div className="text-xs text-gray-400">
                      {key === 'temperatura' ? '°C' : key === 'vibracao' ? 'mm/s' : 'RPM'}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                  📦 Payload MQTT (JSON)
                </div>
                <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs font-mono overflow-x-auto leading-relaxed">
                  {payload}
                </pre>
              </div>
            </div>
          </div>

          {/* MQTT Terminal */}
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3">🖥️ MQTT Log Terminal</h2>
            <div className="bg-gray-950 rounded-xl border border-gray-700 overflow-hidden shadow-lg">
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 border-b border-gray-700">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs text-gray-400 ml-2 font-mono">mqtt-broker — broker.factory-hub.local:1883</span>
              </div>
              <div
                ref={logRef}
                className="h-48 overflow-y-auto p-4 font-mono text-xs space-y-1"
              >
                {logs.map((log, i) => (
                  <div
                    key={i}
                    className={
                      log.includes('🔴')
                        ? 'text-red-400'
                        : log.includes('🟡')
                        ? 'text-amber-400'
                        : log.includes('🟢')
                        ? 'text-green-400'
                        : 'text-gray-400'
                    }
                  >
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Telemetry Chart */}
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3">📈 Telemetria Histórica — esp32-torno-01</h2>
            <TelemetryLineChart data={telemetry} title="Temperatura · Vibração · RPM (últimos 30 min)" />
          </div>
        </div>
      )}
    </div>
  );
};

