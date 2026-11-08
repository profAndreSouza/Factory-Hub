import React, { useEffect, useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { SectionTabs } from '../components/common/SectionTabs';
import { TheoryBox } from '../components/common/TheoryBox';
import { TelemetryLineChart } from '../components/charts/TelemetryLineChart';
import { OeeGaugeChart } from '../components/charts/OeeGaugeChart';
import { getTelemetria } from '../services/telemetryService';
import { predict } from '../services/aiPredictService';
import { TelemetryReading, PredictResponse } from '../types';

const TABS = [
  { id: 'teoria', label: '📚 Teoria' },
  { id: 'lab', label: '🧪 Laboratório' },
];

const CRISP_DM_PHASES = [
  {
    phase: '1. Business Understanding',
    color: 'bg-blue-500',
    desc: 'Definir o objetivo de negócio: reduzir paradas não planejadas em 30% via manutenção preditiva.',
    deliverable: 'Project Charter + KPIs',
  },
  {
    phase: '2. Data Understanding',
    color: 'bg-cyan-500',
    desc: 'Explorar séries temporais de telemetria (temp, vibração, RPM). Identificar distribuições e anomalias.',
    deliverable: 'EDA Report + Correlação',
  },
  {
    phase: '3. Data Preparation',
    color: 'bg-purple-500',
    desc: 'Limpeza, normalização, feature engineering (médias móveis, FFT, desvio padrão rolling).',
    deliverable: 'Dataset treino/validação',
  },
  {
    phase: '4. Modeling',
    color: 'bg-green-500',
    desc: 'Treinar Random Forest Classifier com features temporais. Validação cruzada estratificada.',
    deliverable: 'Modelo pkl + métricas',
  },
  {
    phase: '5. Evaluation',
    color: 'bg-amber-500',
    desc: 'F1-Score (macro), Precision-Recall, Confusion Matrix. Foco em recall para CRITICAL.',
    deliverable: 'Relatório de avaliação',
  },
  {
    phase: '6. Deployment',
    color: 'bg-red-500',
    desc: 'Servir via Flask REST API (POST /predict). Containerizado com Docker, CI/CD via GitHub Actions.',
    deliverable: 'API em produção + monitoramento',
  },
];

export const DataSciencePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('teoria');
  const [telemetry, setTelemetry] = useState<TelemetryReading[]>([]);

  // OEE Calculator
  const [disp, setDisp] = useState(91);
  const [perf, setPerf] = useState(87);
  const [qual, setQual] = useState(98);
  const oee = parseFloat(((disp / 100) * (perf / 100) * (qual / 100) * 100).toFixed(1));

  // AI Playground
  const [aiTemp, setAiTemp] = useState(72);
  const [aiVib, setAiVib] = useState(2.5);
  const [aiRpm, setAiRpm] = useState(3100);
  const [aiResult, setAiResult] = useState<PredictResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    getTelemetria('esp32-torno-01').then(setTelemetry);
  }, []);

  const handlePredict = async () => {
    setAiLoading(true);
    try {
      const res = await predict({
        device_id: 'esp32-playground-01',
        temperatura: aiTemp,
        vibracao: aiVib,
        rpm: aiRpm,
      });
      setAiResult(res);
    } finally {
      setAiLoading(false);
    }
  };

  const oeeColor =
    oee >= 85 ? 'text-green-600 dark:text-green-400' : oee >= 65 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';
  const oeeBarColor = oee >= 85 ? 'bg-green-500' : oee >= 65 ? 'bg-amber-500' : 'bg-red-500';

  const riskColor =
    (aiResult?.probabilidade_falha ?? 0) >= 75
      ? 'bg-red-500'
      : (aiResult?.probabilidade_falha ?? 0) >= 40
      ? 'bg-amber-500'
      : 'bg-green-500';

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        icon="📊"
        title="Ciência de Dados"
        subtitle="CRISP-DM · OEE · Feature Engineering · ML Preditivo"
        badge="Semanas 4–6"
        badgeColor="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
      />

      <SectionTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'teoria' && (
        <div className="space-y-6">
          {/* CRISP-DM */}
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3">🔄 CRISP-DM — 6 Fases</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {CRISP_DM_PHASES.map(p => (
                <div
                  key={p.phase}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm"
                >
                  <div className={`inline-block text-xs font-bold text-white px-2 py-0.5 rounded-full mb-2 ${p.color}`}>
                    {p.phase}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{p.desc}</p>
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-500">
                    📄 {p.deliverable}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* OEE Formula */}
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3">📐 Fórmula OEE</h2>
            <TheoryBox type="formula" title="Overall Equipment Effectiveness">
              <div className="text-center space-y-3 py-2">
                <div className="font-mono text-lg font-bold text-purple-700 dark:text-purple-300">
                  OEE = Disponibilidade × Performance × Qualidade
                </div>
                <div className="flex justify-center gap-4 flex-wrap text-sm">
                  <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-lg font-mono">
                    D = Tempo Produtivo / Tempo Planejado
                  </div>
                  <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-4 py-2 rounded-lg font-mono">
                    P = Peças Reais / Peças Teóricas
                  </div>
                  <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-4 py-2 rounded-lg font-mono">
                    Q = Peças Boas / Peças Totais
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  World Class: OEE ≥ 85% | Aceitável: 65–85% | Crítico: &lt; 65%
                </div>
              </div>
            </TheoryBox>
          </div>

          {/* Neural Network Topology */}
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3">🧠 Topologia da Rede Neural</h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <div className="flex items-center justify-around font-mono text-xs">
                <div className="flex flex-col items-center gap-2">
                  <div className="text-gray-400 font-semibold mb-1">INPUT</div>
                  {['temperatura', 'vibracao', 'rpm', 'temp_ma5', 'vib_std'].map(f => (
                    <div key={f} className="w-24 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-center px-1 leading-tight text-xs">
                      {f}
                    </div>
                  ))}
                </div>
                <div className="text-gray-300 dark:text-gray-600 text-2xl mx-2">→</div>
                <div className="flex flex-col items-center gap-2">
                  <div className="text-gray-400 font-semibold mb-1">HIDDEN 1</div>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold">
                      {i + 1}
                    </div>
                  ))}
                </div>
                <div className="text-gray-300 dark:text-gray-600 text-2xl mx-2">→</div>
                <div className="flex flex-col items-center gap-2">
                  <div className="text-gray-400 font-semibold mb-1">HIDDEN 2</div>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
                      {i + 1}
                    </div>
                  ))}
                </div>
                <div className="text-gray-300 dark:text-gray-600 text-2xl mx-2">→</div>
                <div className="flex flex-col items-center gap-2">
                  <div className="text-gray-400 font-semibold mb-1">OUTPUT</div>
                  {['OPERATIONAL', 'WARNING', 'CRITICAL'].map(cls => (
                    <div
                      key={cls}
                      className={`w-24 h-8 rounded-full text-white flex items-center justify-center text-xs font-bold ${
                        cls === 'OPERATIONAL' ? 'bg-green-500' : cls === 'WARNING' ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                    >
                      {cls}
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
                Arquitetura ilustrativa. O modelo final utiliza Random Forest (100 estimadores) com feature importance sobre séries temporais.
              </p>
            </div>
          </div>

          {/* Time Series */}
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3">📉 Decomposição de Série Temporal</h2>
            <TheoryBox type="formula" title="Modelo Aditivo de Decomposição">
              <div className="text-center font-mono text-base font-bold text-purple-700 dark:text-purple-300 my-2">
                Y(t) = T(t) + S(t) + R(t)
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs mt-3">
                <div className="text-center bg-blue-50 dark:bg-blue-900/20 rounded p-2">
                  <div className="font-bold text-blue-600 dark:text-blue-400">T(t)</div>
                  <div className="text-gray-600 dark:text-gray-400">Tendência — degradação gradual do rolamento</div>
                </div>
                <div className="text-center bg-green-50 dark:bg-green-900/20 rounded p-2">
                  <div className="font-bold text-green-600 dark:text-green-400">S(t)</div>
                  <div className="text-gray-600 dark:text-gray-400">Sazonalidade — ciclos de turno e manutenção</div>
                </div>
                <div className="text-center bg-amber-50 dark:bg-amber-900/20 rounded p-2">
                  <div className="font-bold text-amber-600 dark:text-amber-400">R(t)</div>
                  <div className="text-gray-600 dark:text-gray-400">Resíduo — ruído e anomalias pontuais</div>
                </div>
              </div>
            </TheoryBox>
          </div>
        </div>
      )}

      {activeTab === 'lab' && (
        <div className="space-y-6">
          {/* OEE Calculator */}
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3">🧮 Calculadora OEE</h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-5">
                  {[
                    { label: 'Disponibilidade', value: disp, setter: setDisp, color: 'accent-blue-500' },
                    { label: 'Performance', value: perf, setter: setPerf, color: 'accent-green-500' },
                    { label: 'Qualidade', value: qual, setter: setQual, color: 'accent-purple-500' },
                  ].map(({ label, value, setter, color }) => (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">{label}</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200">{value}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={value}
                        onChange={e => setter(Number(e.target.value))}
                        className={`w-full h-2 rounded-full ${color}`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex flex-col items-center gap-3">
                  <OeeGaugeChart oee={oee} size={180} />
                  <div className={`text-sm font-semibold ${oeeColor}`}>
                    OEE Global: {oee}%
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${oeeBarColor}`}
                      style={{ width: `${oee}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Playground */}
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3">🤖 Playground IA — Manutenção Preditiva</h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">Temperatura</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">{aiTemp}°C</span>
                    </div>
                    <input
                      type="range" min={50} max={100} value={aiTemp}
                      onChange={e => setAiTemp(Number(e.target.value))}
                      className="w-full h-2 rounded-full accent-red-500"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                      <span>50°C</span><span>100°C</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">Vibração</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">{aiVib.toFixed(1)} mm/s</span>
                    </div>
                    <input
                      type="range" min={0} max={10} step={0.1} value={aiVib}
                      onChange={e => setAiVib(Number(e.target.value))}
                      className="w-full h-2 rounded-full accent-amber-500"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                      <span>0 mm/s</span><span>10 mm/s</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">RPM</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">{aiRpm}</span>
                    </div>
                    <input
                      type="range" min={2500} max={4000} step={50} value={aiRpm}
                      onChange={e => setAiRpm(Number(e.target.value))}
                      className="w-full h-2 rounded-full accent-blue-500"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                      <span>2500</span><span>4000</span>
                    </div>
                  </div>
                  <button
                    onClick={handlePredict}
                    disabled={aiLoading}
                    className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm transition-colors"
                  >
                    {aiLoading ? '⟳ Analisando...' : '🔍 Analisar'}
                  </button>
                </div>

                {aiResult ? (
                  <div className="space-y-3">
                    <div
                      className={`rounded-xl p-4 border ${
                        aiResult.status_previsto === 'CRITICAL'
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                          : aiResult.status_previsto === 'WARNING'
                          ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
                          : 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Status Previsto</span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${
                            aiResult.status_previsto === 'CRITICAL' ? 'bg-red-500' : aiResult.status_previsto === 'WARNING' ? 'bg-amber-500' : 'bg-green-500'
                          }`}
                        >
                          {aiResult.status_previsto}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                        Risco de Falha: <span className="font-bold text-gray-800 dark:text-gray-200">{aiResult.probabilidade_falha}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                        <div
                          className={`h-4 rounded-full transition-all duration-500 ${riskColor}`}
                          style={{ width: `${aiResult.probabilidade_falha}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                        💡 {aiResult.recomendacao}
                      </div>
                      <div className="text-xs text-gray-400 mt-2 font-mono">
                        Modelo: {aiResult.modelo_versao}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-400 text-sm">
                    Configure os parâmetros e clique em Analisar
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Telemetry Chart */}
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3">📈 Série Temporal — esp32-torno-01</h2>
            <TelemetryLineChart data={telemetry} title="Temperatura · Vibração · RPM (últimos 30 min)" />
          </div>
        </div>
      )}
    </div>
  );
};

