import React, { useEffect, useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { SectionTabs } from '../components/common/SectionTabs';
import { TheoryBox } from '../components/common/TheoryBox';
import { TelemetryLineChart } from '../components/charts/TelemetryLineChart';
import { OeeGaugeChart } from '../components/charts/OeeGaugeChart';
import { getTelemetria } from '../services/telemetryService';
import { getModelTrainingDataInfo, getModelTrainingStatus, predict, startModelTraining } from '../services/aiPredictService';
import { ModelTrainingDataInfo, ModelTrainingStatus, TelemetryReading, PredictResponse } from '../types';

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
    desc: 'Treinar Random Forest para prever a classe da próxima leitura. A validação usa um período futuro, separado cronologicamente.',
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
    desc: 'Publicar o modelo na API Flask. O frontend envia a análise ao backend Java, que encaminha a inferência e devolve o resultado.',
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
  const [aiError, setAiError] = useState('');
  const [training, setTraining] = useState<ModelTrainingStatus | null>(null);
  const [trainingDataInfo, setTrainingDataInfo] = useState<ModelTrainingDataInfo | null>(null);
  const [trainingDataInfoError, setTrainingDataInfoError] = useState('');
  const [trainingLoading, setTrainingLoading] = useState(false);
  const [trainingError, setTrainingError] = useState('');

  useEffect(() => {
    getTelemetria('esp32-torno-01').then(setTelemetry).catch(() => setTelemetry([]));
  }, []);

  useEffect(() => {
    let active = true;
    const refreshDataInfo = () => {
      getModelTrainingDataInfo().then(info => {
        if (!active) return;
        setTrainingDataInfo(info);
        setTrainingDataInfoError('');
      }).catch(() => {
        if (active) setTrainingDataInfoError('Contagem atual indisponivel; confira a conexao com o InfluxDB.');
      });
    };
    refreshDataInfo();
    const interval = setInterval(refreshDataInfo, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const trainingState = training?.state;

  useEffect(() => {
    if (trainingState && trainingState !== 'running') return;
    let active = true;
    const refreshTraining = () => {
      getModelTrainingStatus().then(status => {
        if (!active) return;
        setTraining(status);
        setTrainingError('');
      }).catch(() => {
        if (active) setTrainingError('Aguardando conexão com o serviço de treinamento…');
      });
    };
    refreshTraining();
    const interval = setInterval(refreshTraining, 1500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [trainingState]);

  const handleTrainModel = async () => {
    setTrainingLoading(true);
    setTrainingError('');
    try {
      setTraining(await startModelTraining());
    } catch {
      setTrainingError('Não foi possível iniciar o treinamento. Confira a conexão com o backend.');
    } finally {
      setTrainingLoading(false);
    }
  };

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
      setAiError('');
    } catch {
      setAiError('O backend não conseguiu concluir a análise. Confira a conexão com a API e tente novamente.');
    } finally {
      setAiLoading(false);
    }
  };

  const oeeColor =
    oee >= 85 ? 'text-green-600 dark:text-green-400' : oee >= 65 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';
  const oeeBarColor = oee >= 85 ? 'bg-green-500' : oee >= 65 ? 'bg-amber-500' : 'bg-red-500';

  const riskColor =
    ((aiResult?.probabilidade_falha ?? 0) <= 1 ? (aiResult?.probabilidade_falha ?? 0) * 100 : (aiResult?.probabilidade_falha ?? 0)) >= 75
      ? 'bg-red-500'
      : ((aiResult?.probabilidade_falha ?? 0) <= 1 ? (aiResult?.probabilidade_falha ?? 0) * 100 : (aiResult?.probabilidade_falha ?? 0)) >= 40
      ? 'bg-amber-500'
      : 'bg-green-500';
  const riskPercent = aiResult
    ? aiResult.probabilidade_falha <= 1 ? aiResult.probabilidade_falha * 100 : aiResult.probabilidade_falha
    : 0;

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
          <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-blue-900 to-cyan-800 text-white shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-[1.15fr_0.85fr] items-center gap-6 p-6 md:p-8">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-200 font-semibold mb-2">Da medição à decisão</div>
                <h2 className="text-2xl md:text-3xl font-bold leading-tight">Dados industriais contam histórias.</h2>
                <p className="mt-3 text-sm leading-relaxed text-blue-100">Aprenda a fazer perguntas, avaliar a qualidade dos dados, encontrar padrões e transformar evidências em ações para a fábrica.</p>
                <div className="mt-5 flex flex-wrap gap-2 text-xs">
                  {['Entender', 'Preparar', 'Analisar', 'Agir'].map((step, index) => <span key={step} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5"><b className="text-cyan-300">0{index + 1}</b>{step}</span>)}
                </div>
              </div>
              <div role="img" aria-label="Ilustração de medições de sensores convergindo para um gráfico e uma decisão" className="min-h-[180px]">
                <svg viewBox="0 0 420 210" className="w-full h-full" aria-hidden="true">
                  <defs><linearGradient id="dsGlow" x1="0" x2="1"><stop stopColor="#22d3ee"/><stop offset="1" stopColor="#a5b4fc"/></linearGradient></defs>
                  <path d="M20 45 C100 45 105 95 180 95 M20 105 H180 M20 165 C100 165 105 115 180 115" fill="none" stroke="#93c5fd" strokeOpacity=".5" strokeWidth="2"/>
                  {[45,105,165].map((y,i)=><g key={y}><rect x="12" y={y-15} width="70" height="30" rx="9" fill="#ffffff" fillOpacity=".12" stroke="#7dd3fc" strokeOpacity=".5"/><text x="47" y={y+4} textAnchor="middle" fill="#e0f2fe" fontSize="11">{['Temp.','Vibração','RPM'][i]}</text><circle cx="20" cy={y} r="4" fill="#67e8f9"/></g>)}
                  <rect x="180" y="55" width="112" height="100" rx="16" fill="#0f172a" fillOpacity=".6" stroke="#67e8f9" strokeOpacity=".6"/>
                  <path d="M198 132 L218 115 L235 123 L255 87 L276 76" fill="none" stroke="url(#dsGlow)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                  {[198,218,235,255,276].map((x,i)=><circle key={x} cx={x} cy={[132,115,123,87,76][i]} r="4" fill="#a5f3fc"/>)}
                  <path d="M292 105 H337" stroke="#67e8f9" strokeWidth="2"/><path d="M330 98 L338 105 L330 112" fill="none" stroke="#67e8f9" strokeWidth="2"/>
                  <circle cx="372" cy="105" r="34" fill="#22c55e" fillOpacity=".17" stroke="#86efac" strokeWidth="2"/><path d="M359 105 L369 115 L387 94" fill="none" stroke="#86efac" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><text x="372" y="157" textAnchor="middle" fill="#d1fae5" fontSize="10">AÇÃO</text>
                </svg>
              </div>
            </div>
          </section>
          <TheoryBox type="info" title="Objetivos de aprendizagem">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs"><p>✓ Formular um problema de negócio e escolher indicadores adequados.</p><p>✓ Inspecionar tipos, ausências, distribuição e valores extremos.</p><p>✓ Preparar variáveis sem vazar informações entre treino e teste.</p><p>✓ Avaliar modelos pelas consequências de falsos positivos e falsos negativos.</p></div>
          </TheoryBox>
          <section className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-900/20">
            <h2 className="text-sm font-bold text-blue-900 dark:text-blue-200">🔌 Caminho de uma predição</h2>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 text-center text-xs">
              <div className="rounded-lg bg-white p-3 dark:bg-gray-800"><b>Frontend React</b><p className="mt-1 text-gray-500 dark:text-gray-400">POST /api/v1/predicoes</p></div><span className="text-blue-500 text-lg">→</span>
              <div className="rounded-lg bg-white p-3 dark:bg-gray-800"><b>Backend Java</b><p className="mt-1 text-gray-500 dark:text-gray-400">Valida e encaminha</p></div><span className="text-blue-500 text-lg">→</span>
              <div className="rounded-lg bg-white p-3 dark:bg-gray-800"><b>Serviço Flask</b><p className="mt-1 text-gray-500 dark:text-gray-400">POST /predict · inferência</p></div>
            </div>
            <p className="mt-2 text-center text-xs text-blue-800 dark:text-blue-300">A resposta percorre o caminho inverso. O navegador não acessa o serviço Flask diretamente.</p>
          </section>
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

          {/* EDA visual */}
          <section>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3">🔎 Antes do modelo: explore e questione os dados</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <article className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">Distribuição de temperatura (exemplo didático)</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">A maior parte das medições fica perto de 72 °C; pontos afastados merecem investigação, não exclusão automática.</p>
                <div role="img" aria-label="Histograma ilustrativo de temperaturas, com maior frequência entre 70 e 74 graus e uma observação extrema" className="mt-3">
                  <svg viewBox="0 0 520 190" className="w-full" aria-hidden="true">
                    <path d="M42 18 V150 H505" fill="none" stroke="#94a3b8" strokeWidth="1.5"/><path d="M42 115 H505 M42 80 H505 M42 45 H505" stroke="#cbd5e1" strokeDasharray="4 5"/>
                    {[{x:72,h:25},{x:122,h:53},{x:172,h:94},{x:222,h:122},{x:272,h:108},{x:322,h:70},{x:372,h:38},{x:422,h:17}].map(bar=><rect key={bar.x} x={bar.x} y={150-bar.h} width="34" height={bar.h} rx="4" fill="#6366f1" fillOpacity=".8"/>)}
                    <line x1="463" y1="25" x2="463" y2="150" stroke="#ef4444" strokeWidth="2" strokeDasharray="5 4"/><circle cx="463" cy="34" r="6" fill="#ef4444"/><text x="455" y="17" textAnchor="end" fill="#dc2626" fontSize="11">84,5 °C · investigar</text>
                    <text x="40" y="174" fill="#64748b" fontSize="10">68</text><text x="192" y="174" fill="#64748b" fontSize="10">72</text><text x="342" y="174" fill="#64748b" fontSize="10">76</text><text x="474" y="174" fill="#64748b" fontSize="10">86 °C</text>
                  </svg>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px]"><div className="rounded bg-indigo-50 dark:bg-indigo-900/20 p-2"><b className="block text-indigo-600 dark:text-indigo-300">Média</b>Sensível a extremos</div><div className="rounded bg-cyan-50 dark:bg-cyan-900/20 p-2"><b className="block text-cyan-600 dark:text-cyan-300">Mediana</b>Centro robusto</div><div className="rounded bg-rose-50 dark:bg-rose-900/20 p-2"><b className="block text-rose-600 dark:text-rose-300">IQR</b>Q3 − Q1</div></div>
              </article>
              <article className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">Perguntas que a EDA ajuda a responder</h3>
                <div className="mt-4 space-y-3 text-xs">
                  {[['Qual é o formato?', 'Histograma e medidas de centro/dispersão mostram assimetria, concentração e variabilidade.'],['Há valores estranhos?', 'Boxplot e regra IQR sinalizam observações para checagem com a operação.'],['As variáveis se relacionam?', 'Dispersão e correlação ajudam a encontrar associação, que não prova causalidade.'],['Algo muda ao longo do tempo?', 'Gráfico de linha revela tendência, sazonalidade, mudança de regime ou falhas de sensor.']].map(([title,desc],i)=><div key={title} className="flex gap-3"><span className="flex w-7 h-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-bold">0{i+1}</span><div><b className="text-gray-800 dark:text-gray-200">{title}</b><p className="mt-0.5 text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p></div></div>)}
                </div>
                <div className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 text-xs text-amber-800 dark:text-amber-200"><b>Regra prática:</b> outlier é um sinal para investigar contexto, unidade, sensor e processo; não é sinônimo automático de erro.</div>
              </article>
            </div>
          </section>

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

          {/* Random Forest illustration */}
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3">🌳 Como uma Random Forest combina decisões</h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Cada árvore aprende regras a partir de uma amostra dos dados. A floresta agrega as previsões; em classificação, a classe mais votada é escolhida.</p>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_2fr_auto_1fr] items-center gap-3 text-center">
                <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-4"><div className="text-[10px] uppercase tracking-wide font-bold text-blue-600 dark:text-blue-300">Atributos</div><div className="mt-2 flex flex-wrap justify-center gap-1">{['temp.','vibração','RPM','janela móvel'].map(feature=><span key={feature} className="rounded-full bg-blue-600 px-2 py-1 text-[10px] text-white">{feature}</span>)}</div></div>
                <div className="text-gray-300 dark:text-gray-600 text-2xl">→</div>
                <div className="grid grid-cols-3 gap-2">
                  {[['Árvore 1','WARNING','bg-amber-500'],['Árvore 2','CRITICAL','bg-red-500'],['Árvore 3','WARNING','bg-amber-500']].map(([tree,result,color])=><div key={tree} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3"><div className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{tree}</div><svg viewBox="0 0 80 50" className="mx-auto my-1 h-12 w-20" aria-hidden="true"><path d="M40 10 L20 27 M40 10 L60 27 M20 27 L10 42 M20 27 L30 42 M60 27 L50 42 M60 27 L70 42" stroke="#94a3b8" strokeWidth="2"/><circle cx="40" cy="9" r="6" fill="#6366f1"/><circle cx="20" cy="27" r="5" fill="#06b6d4"/><circle cx="60" cy="27" r="5" fill="#06b6d4"/><circle cx="10" cy="42" r="4" fill="#22c55e"/><circle cx="30" cy="42" r="4" fill="#f59e0b"/><circle cx="50" cy="42" r="4" fill="#ef4444"/><circle cx="70" cy="42" r="4" fill="#22c55e"/></svg><span className={`inline-block rounded-full px-2 py-1 text-[9px] font-bold text-white ${color}`}>{result}</span></div>)}
                </div>
                <div className="text-gray-300 dark:text-gray-600 text-2xl">→</div>
                <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-4"><div className="text-[10px] uppercase tracking-wide font-bold text-amber-700 dark:text-amber-300">Votação</div><div className="mt-2 text-lg font-black text-amber-600 dark:text-amber-300">2 de 3</div><div className="text-xs text-gray-600 dark:text-gray-400">WARNING</div></div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
                Esquema didático: a quantidade de árvores e os atributos reais dependem do modelo treinado e versionado no serviço de IA.
              </p>
            </div>
          </div>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <article className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <h2 className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-3">🧪 Separar dados sem contaminar a avaliação</h2>
              <div className="flex overflow-hidden rounded-lg text-center text-xs font-bold text-white"><div className="w-3/5 bg-indigo-600 p-3">Treino · ajustar o modelo</div><div className="w-1/5 bg-cyan-600 p-3">Validação</div><div className="w-1/5 bg-emerald-600 p-3">Teste final</div></div>
              <p className="mt-3 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">Para séries temporais, respeite a ordem cronológica: treine no passado e avalie em períodos posteriores. Ajuste escalas e imputações somente com os dados de treino para evitar vazamento de informação.</p>
            </article>
            <article className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <h2 className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-3">🎯 Métricas respondem a perguntas diferentes</h2>
              <div className="space-y-2 text-xs"><p className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3"><b className="text-green-700 dark:text-green-300">Recall:</b> entre as falhas reais, quantas o modelo encontrou? Baixo recall pode deixar uma máquina em risco passar despercebida.</p><p className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3"><b className="text-blue-700 dark:text-blue-300">Precisão:</b> entre os alertas emitidos, quantos eram falhas reais? Baixa precisão gera inspeções desnecessárias.</p><p className="rounded-lg bg-purple-50 dark:bg-purple-900/20 p-3"><b className="text-purple-700 dark:text-purple-300">F1:</b> equilíbrio entre precisão e recall. Compare métricas por classe; acurácia sozinha pode esconder falhas raras.</p></div>
            </article>
          </section>

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
          <section className="rounded-xl border border-indigo-200 bg-white p-5 shadow-sm dark:border-indigo-900 dark:bg-gray-800" aria-live="polite">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Treinamento do modelo</h2>
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                  O modelo é treinado automaticamente quando ainda não existe uma versão salva. Use o botão para treinar novamente com o histórico atual do InfluxDB.
                </p>
              </div>
              <button
                onClick={handleTrainModel}
                disabled={trainingLoading || training?.state === 'running'}
                className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {trainingLoading || training?.state === 'running' ? 'Treinando…' : 'Treinar modelo'}
              </button>
            </div>

            <div className="mt-4">
              <div className="mb-1 flex justify-between gap-3 text-xs">
                <span className="font-medium text-gray-700 dark:text-gray-300">{training?.message ?? 'Consultando o serviço de treinamento…'}</span>
                {training?.state === 'running' && <span className="shrink-0 text-indigo-600 dark:text-indigo-300">{training.progress}%</span>}
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${training?.state === 'failed' ? 'bg-red-500' : 'bg-indigo-500'}`}
                  style={{ width: `${Math.max(0, Math.min(100, training?.progress ?? 0))}%` }}
                />
              </div>
            </div>

            {trainingError && <p role="alert" className="mt-3 text-xs text-red-600 dark:text-red-400">{trainingError}</p>}
            {training?.metrics && (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ['Pares de treino', training.training_records?.toLocaleString('pt-BR') ?? '—'],
                  ['Acurácia', `${(training.metrics.accuracy * 100).toFixed(1)}%`],
                  ['F1 macro', `${(training.metrics.f1_macro * 100).toFixed(1)}%`],
                  ['Fonte', training.training_data_source ?? '—'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/60">
                    <div className="text-[10px] uppercase tracking-wide text-gray-400">{label}</div>
                    <div className="mt-1 truncate text-sm font-bold text-gray-800 dark:text-gray-100">{value}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400" aria-live="polite">
              <p>
                Disponíveis agora no InfluxDB: {trainingDataInfo ? `${trainingDataInfo.raw_measurements.toLocaleString('pt-BR')} leituras / ${trainingDataInfo.training_records.toLocaleString('pt-BR')} pares` : 'consultando...'}.
                {trainingDataInfo && <> Atualizado às {new Date(trainingDataInfo.observed_at).toLocaleTimeString('pt-BR')}.</>}
              </p>
              {training?.raw_measurements !== undefined && (
                <p>Último treino: {training.raw_measurements.toLocaleString('pt-BR')} leituras / {training.training_records?.toLocaleString('pt-BR')} pares usados.</p>
              )}
              {trainingDataInfoError && <p role="status" className="text-amber-700 dark:text-amber-300">{trainingDataInfoError}</p>}
            </div>
            {training?.metrics && (
              <p className="mt-2 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                A validação usa leituras futuras, mas os rótulos são didáticos e derivados de limites de temperatura e vibração. Acurácia alta, inclusive 100%, não comprova desempenho em falhas industriais reais.
              </p>
            )}

            {training?.messages?.length ? (
              <ol className="mt-4 max-h-44 space-y-2 overflow-y-auto border-t border-gray-100 pt-3 dark:border-gray-700">
                {training.messages.slice(-8).map((entry, index) => (
                  <li key={`${entry.timestamp}-${index}`} className="flex gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                    <span>{entry.message}</span>
                    <time className="ml-auto shrink-0 text-[10px] text-gray-400" dateTime={entry.timestamp}>
                      {new Date(entry.timestamp).toLocaleTimeString('pt-BR')}
                    </time>
                  </li>
                ))}
              </ol>
            ) : null}
          </section>

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
                  {aiError && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{aiError}</p>}
                </div>

                {aiResult ? (
                  <div className="space-y-3">
                    <div
                      className={`rounded-xl p-4 border ${
                        ['CRITICAL', 'RISCO_ANOMALIA'].includes(aiResult.status_previsto)
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                          : ['WARNING', 'ATENCAO'].includes(aiResult.status_previsto)
                          ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
                          : 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Status da próxima leitura</span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${
                            ['CRITICAL', 'RISCO_ANOMALIA'].includes(aiResult.status_previsto) ? 'bg-red-500' : ['WARNING', 'ATENCAO'].includes(aiResult.status_previsto) ? 'bg-amber-500' : 'bg-green-500'
                          }`}
                        >
                          {aiResult.status_previsto}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                        Risco estimado na próxima leitura: <span className="font-bold text-gray-800 dark:text-gray-200">{riskPercent.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                        <div
                          className={`h-4 rounded-full transition-all duration-500 ${riskColor}`}
                          style={{ width: `${Math.max(0, Math.min(100, riskPercent))}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                        💡 {aiResult.recomendacao}
                      </div>
                      <div className="text-xs text-gray-400 mt-2 font-mono">
                        Modelo: {aiResult.modelo_versao}
                      </div>
                      {aiResult.source && <div className="text-[10px] text-gray-400 mt-1">Fonte: {aiResult.source === 'MOCK' ? 'simulação do backend' : aiResult.source}</div>}
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
            {telemetry.length === 0 && <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">O backend ainda não retornou medições para este equipamento.</p>}
            <TelemetryLineChart data={telemetry} title="Temperatura · Vibração · RPM (últimos 30 min)" />
          </div>
        </div>
      )}
    </div>
  );
};

