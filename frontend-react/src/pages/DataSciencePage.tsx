import React, { useState } from 'react';
import { BarChart3, Brain, Calculator, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';
import { TheoryBox } from '../components/common/TheoryBox';

export const DataSciencePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'teoria' | 'laboratorio'>('teoria');

  // Sliders da Rede Neural
  const [temp, setTemp] = useState<number>(72.0);
  const [vib, setVib] = useState<number>(2.5);
  const [rpm, setRpm] = useState<number>(3480);

  // Sliders do OEE
  const [tempoPlanejado, setTempoPlanejado] = useState<number>(480); // minutos (8h)
  const [tempoParada, setTempoParada] = useState<number>(35); // minutos
  const [capacidadeNominal, setCapacidadeNominal] = useState<number>(500); // peças
  const [pecasProduzidas, setPecasProduzidas] = useState<number>(460); // peças
  const [pecasDefeito, setPecasDefeito] = useState<number>(12); // peças

  // Cálculo da Rede Neural MLP (função sigmoide ponderada didática que espelha o modelo treinado)
  const calculateNeuralInference = () => {
    // Normalização similar ao StandardScaler
    const normTemp = (temp - 60) / 15;
    const normVib = (vib - 2.0) / 1.5;
    const normRpm = (3500 - rpm) / 500;

    // Função de ativação logística ponderada
    const z = 1.8 * normTemp + 2.5 * normVib + 0.8 * normRpm - 3.2;
    const prob = 1 / (1 + Math.exp(-z));
    return Math.min(Math.max(prob, 0.01), 0.99);
  };

  const probFalha = calculateNeuralInference();
  const isAnomaly = probFalha >= 0.70;

  // Cálculos do OEE
  const tempoOperacional = Math.max(tempoPlanejado - tempoParada, 0);
  const disponibilidade = tempoPlanejado > 0 ? (tempoOperacional / tempoPlanejado) * 100 : 0;
  const performance = capacidadeNominal > 0 ? (pecasProduzidas / capacidadeNominal) * 100 : 0;
  const pecasBoas = Math.max(pecasProduzidas - pecasDefeito, 0);
  const qualidade = pecasProduzidas > 0 ? (pecasBoas / pecasProduzidas) * 100 : 0;
  const oee = (disponibilidade / 100) * (performance / 100) * (qualidade / 100) * 100;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header com Navegação de Abas */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-400" />
            <h2 className="text-2xl font-bold text-white">Ciência de Dados & Inteligência Artificial</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            CRISP-DM, séries temporais, inferência com Redes Neurais (MLP) e cálculo do OEE.
          </p>
        </div>

        <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
          <button
            onClick={() => setActiveTab('teoria')}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'teoria'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📚 Apostila & Conceitos
          </button>
          <button
            onClick={() => setActiveTab('laboratorio')}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'laboratorio'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🧪 Laboratório de IA & OEE
          </button>
        </div>
      </div>

      {activeTab === 'teoria' ? (
        /* CONTEÚDO TEÓRICO */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TheoryBox
            discipline="Ciência de Dados"
            week="Semana 01 a 04"
            title="Ciclo CRISP-DM Aplicado à Indústria 4.0"
          >
            <p className="mb-2">
              A metodologia <strong>CRISP-DM</strong> estrutura o pipeline de inteligência:
            </p>
            <ol className="list-decimal pl-5 space-y-1">
              <li><strong>Business Understanding:</strong> Reduzir custos com paradas não planejadas de usinagem.</li>
              <li><strong>Data Understanding:</strong> Explorar distribuição de temperatura, vibração e ruído acústico.</li>
              <li><strong>Data Preparation:</strong> Tratamento de valores nulos, normalização e janelas móveis de tempo.</li>
              <li><strong>Modeling:</strong> Treinamento da Rede Neural MLP para classificação de risco.</li>
              <li><strong>Evaluation:</strong> Avaliação de Recall e custos de falsos negativos versus falsos positivos.</li>
              <li><strong>Deployment:</strong> Servir a predição via microsserviço Python Flask na nuvem.</li>
            </ol>
          </TheoryBox>

          <TheoryBox
            discipline="Ciência de Dados"
            week="Semana 07"
            title="Análise de Séries Temporais (Time Series)"
          >
            <p className="mb-2">
              Telemetria contínua de máquinas é decomposta em 3 componentes aditivos ou multiplicativos:
            </p>
            <div className="rounded bg-slate-950 p-2 font-mono text-xs text-slate-300">
              Y(t) = Tendência(t) + Sazonalidade(t) + Resíduo(t)
            </div>
            <p className="mt-2 text-xs text-slate-400">
              - <strong>Tendência:</strong> Desgaste progressivo de mancais ao longo de semanas.<br/>
              - <strong>Sazonalidade:</strong> Variação térmica diurna/noturna na fábrica.<br/>
              - <strong>Resíduo:</strong> Picos anômalos pontuais onde o modelo de detecção atua.
            </p>
          </TheoryBox>

          <TheoryBox
            discipline="Ciência de Dados"
            week="Semana 10 a 13"
            title="Redes Neurais Artificiais (MLP) para Detecção de Falhas"
          >
            <p className="mb-2">
              O modelo <strong>Multilayer Perceptron (MLP)</strong> processa os vetores de atributos dos sensores:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Camada de Entrada:</strong> Sensores normalizados (Temperatura, Vibração, RPM).</li>
              <li><strong>Camadas Ocultas:</strong> Neurônios com funções de ativação ReLU e regularização por Dropout (20%) para evitar overfitting.</li>
              <li><strong>Camada de Saída:</strong> Ativação Sigmoide gerando probabilidade de anomalia $P \in [0, 1]$.</li>
            </ul>
          </TheoryBox>

          <TheoryBox
            discipline="Ciência de Dados"
            week="Semana 14 a 16"
            title="Fórmulas Matemáticas do OEE (Overall Equipment Effectiveness)"
            type="formula"
          >
            <p className="mb-2">
              O OEE é o padrão internacional para produtividade de ativos fabris:
            </p>
            <div className="space-y-1 rounded bg-slate-950 p-2.5 font-mono text-xs text-emerald-300">
              <div>D = (Tempo Operando / Tempo Planejado) × 100%</div>
              <div>P = (Peças Reais / Capacidade Nominal) × 100%</div>
              <div>Q = (Peças Boas / Peças Totais) × 100%</div>
              <div className="text-white font-bold border-t border-slate-800 pt-1">
                OEE = D × P × Q (Meta Classe Mundial: ≥ 85%)
              </div>
            </div>
          </TheoryBox>
        </div>
      ) : (
        /* LABORATÓRIO INTERATIVO */
        <div className="space-y-8">
          {/* Seção 1: Playground da Rede Neural */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-400" />
                  Inferência Online da Rede Neural (API Python Flask Mock)
                </h3>
                <p className="text-xs text-slate-400">
                  Ajuste os parâmetros para simular a resposta imediata do modelo preditivo em produção.
                </p>
              </div>
              <span className="text-[11px] font-mono bg-purple-950 text-purple-300 border border-purple-800 px-2.5 py-1 rounded-md">
                Modelo: MLP-v1.2 (PyTorch)
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Controles de Entrada */}
              <div className="lg:col-span-2 space-y-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Temperatura do Mancal</span>
                    <strong className="text-amber-400 font-mono text-sm">{temp.toFixed(1)} °C</strong>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="105"
                    step="0.5"
                    value={temp}
                    onChange={(e) => setTemp(parseFloat(e.target.value))}
                    className="w-full mt-2 accent-amber-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>Faixa normal: 60-75°C</span>
                    <span>Zona crítica: &gt; 90°C</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Vibração RMS</span>
                    <strong className="text-sky-400 font-mono text-sm">{vib.toFixed(2)} mm/s</strong>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="10.0"
                    step="0.1"
                    value={vib}
                    onChange={(e) => setVib(parseFloat(e.target.value))}
                    className="w-full mt-2 accent-sky-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>Faixa normal: 1.5-3.0 mm/s</span>
                    <span>Zona crítica: &gt; 5.5 mm/s</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Velocidade de Rotação</span>
                    <strong className="text-purple-400 font-mono text-sm">{rpm} RPM</strong>
                  </div>
                  <input
                    type="range"
                    min="1500"
                    max="4200"
                    step="50"
                    value={rpm}
                    onChange={(e) => setRpm(parseInt(e.target.value))}
                    className="w-full mt-2 accent-purple-500"
                  />
                </div>
              </div>

              {/* Resultado do Diagnóstico da IA */}
              <div className={`rounded-xl border p-5 flex flex-col justify-between ${
                isAnomaly
                  ? 'border-rose-500/50 bg-rose-950/20'
                  : 'border-emerald-500/50 bg-emerald-950/20'
              }`}>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Diagnóstico Preditivo
                  </span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className={`text-4xl font-extrabold font-mono ${
                      isAnomaly ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {(probFalha * 100).toFixed(1)}%
                    </span>
                    <span className="text-xs text-slate-400">risco de anomalia</span>
                  </div>

                  {/* Barra de Progresso do Risco */}
                  <div className="w-full bg-slate-800 rounded-full h-2.5 mt-3 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        isAnomaly ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${probFalha * 100}%` }}
                    ></div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center gap-2 mb-1">
                      {isAnomaly ? (
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                      )}
                      <span className={`text-xs font-bold ${isAnomaly ? 'text-rose-300' : 'text-emerald-300'}`}>
                        {isAnomaly ? 'RISCO DE FALHA DETECTADO' : 'OPERAÇÃO DENTRO DOS PADRÕES'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {isAnomaly
                        ? 'Temperatura ou vibração elevadas indicam desgaste iminente. Agendar manutenção preventiva.'
                        : 'Sinais consistentes com a curva normal de calibração da máquina.'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 text-[10px] text-slate-500 font-mono">
                  Endpoint: POST http://ai-flask:5000/predict
                </div>
              </div>
            </div>
          </div>

          {/* Seção 2: Calculadora Dinâmica de OEE */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-emerald-400" />
                  Calculadora Interativa de Eficiência Global (OEE)
                </h3>
                <p className="text-xs text-slate-400">
                  Manipule os 3 pilares do indicador industrial para compreender as fontes de perdas.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950 border border-emerald-800 px-3 py-1 rounded-lg">
                OEE Global: {oee.toFixed(1)}%
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Disponibilidade */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-300">1. Disponibilidade</span>
                  <span className="font-bold text-sky-400 text-sm font-mono">{disponibilidade.toFixed(1)}%</span>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Tempo de Parada: {tempoParada} min</label>
                  <input
                    type="range"
                    min="0"
                    max="180"
                    step="5"
                    value={tempoParada}
                    onChange={(e) => setTempoParada(parseInt(e.target.value))}
                    className="w-full accent-sky-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Tempo Operado: {tempoOperacional} min / {tempoPlanejado} min programados
                </p>
              </div>

              {/* Performance */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-300">2. Performance</span>
                  <span className="font-bold text-amber-400 text-sm font-mono">{performance.toFixed(1)}%</span>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Produzidas: {pecasProduzidas} peças</label>
                  <input
                    type="range"
                    min="200"
                    max="600"
                    step="10"
                    value={pecasProduzidas}
                    onChange={(e) => setPecasProduzidas(parseInt(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Meta teórica do turno: {capacidadeNominal} peças
                </p>
              </div>

              {/* Qualidade */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-300">3. Qualidade</span>
                  <span className="font-bold text-emerald-400 text-sm font-mono">{qualidade.toFixed(1)}%</span>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Peças com Defeito: {pecasDefeito}</label>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={pecasDefeito}
                    onChange={(e) => setPecasDefeito(parseInt(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Peças Conformes: {pecasBoas} de {pecasProduzidas}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

