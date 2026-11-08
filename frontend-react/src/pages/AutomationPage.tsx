import React, { useState } from 'react';
import { Cpu, Radio, Terminal, Play, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { TheoryBox } from '../components/common/TheoryBox';

export const AutomationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'teoria' | 'laboratorio'>('teoria');
  
  // Estado do simulador Wokwi mock
  const [deviceState, setDeviceState] = useState<'OPERATIONAL' | 'WARNING' | 'CRITICAL'>('OPERATIONAL');
  const [temp, setTemp] = useState<number>(68.5);
  const [vib, setVib] = useState<number>(2.1);
  const [rpm, setRpm] = useState<number>(3450);
  const [pieces, setPieces] = useState<number>(120);
  const [defects, setDefects] = useState<number>(2);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([
    '[INIT] Simulador ESP32 pronto.',
    '[MQTT] Conectado ao endpoint do AWS IoT Core (porta 8883 / TLS).',
    '[SUB] Tópico de comando: industria/smartn1/cmd/esp32-torno-01'
  ]);

  const handleStateChange = (state: 'OPERATIONAL' | 'WARNING' | 'CRITICAL') => {
    setDeviceState(state);
    if (state === 'OPERATIONAL') {
      setTemp(68.5);
      setVib(2.1);
      setRpm(3450);
    } else if (state === 'WARNING') {
      setTemp(81.2);
      setVib(4.3);
      setRpm(3300);
    } else {
      setTemp(94.8);
      setVib(7.8);
      setRpm(2900);
    }
  };

  const handlePublishNow = () => {
    setIsPublishing(true);
    const payload = {
      device_id: 'esp32-torno-01',
      timestamp: Math.floor(Date.now() / 1000),
      temperatura: temp,
      vibracao: vib,
      rpm: rpm,
      status: deviceState,
      pecas_produzidas: pieces + 1,
      pecas_defeito: defects
    };
    setPieces(p => p + 1);

    setTimeout(() => {
      setLogs(prev => [
        `[PUB] Tópico 'industria/smartn1/telemetria': ${JSON.stringify(payload)}`,
        ...prev.slice(0, 8)
      ]);
      setIsPublishing(false);
    }, 300);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header com Navegação de Abas */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-6 h-6 text-amber-400" />
            <h2 className="text-2xl font-bold text-white">Automação Industrial & IIoT</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Conectividade Chão de Fábrica (OT) para Nuvem (IT) via ESP32, MQTT e Node-RED.
          </p>
        </div>

        <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
          <button
            onClick={() => setActiveTab('teoria')}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'teoria'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📚 Apostila & Teoria
          </button>
          <button
            onClick={() => setActiveTab('laboratorio')}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'laboratorio'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🧪 Simulador Wokwi & MQTT
          </button>
        </div>
      </div>

      {activeTab === 'teoria' ? (
        /* CONTEÚDO TEÓRICO */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TheoryBox
            discipline="Automação Industrial"
            week="Semana 01 a 03"
            title="Sinais Industriais e Tipos de Dados OT"
          >
            <p className="mb-2">
              Em plantas fabris, os dados originam-se em dois formatos essenciais:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Sinais Discretos (Binários 24V DC):</strong> Sensores fotoelétricos de passagem de peças (contagem), chaves fim de curso, botão de emergência.
              </li>
              <li>
                <strong>Sinais Analógicos (4-20mA / 0-10V):</strong> Temperatura de rolamentos (PT100/Termopar), transdutores de vibração piezoelétricos e encoders de velocidade (RPM).
              </li>
            </ul>
            <p className="mt-2 text-xs text-amber-300">
              💡 <em>No Factory Hub, o ESP32 digitaliza esses sinais e converte para JSON serializado.</em>
            </p>
          </TheoryBox>

          <TheoryBox
            discipline="Automação Industrial"
            week="Semana 04 e 05"
            title="Protocolo MQTT: Pub/Sub & Níveis de QoS"
          >
            <p className="mb-2">
              O MQTT é um protocolo leve construído sobre TCP/IP com padrão Publisher/Subscriber:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>QoS 0 (At most once):</strong> Envio rápido sem confirmação. Ideal para telemetria de alta frequência onde a perda esporádica de 1 ponto não prejudica.</li>
              <li><strong>QoS 1 (At least once):</strong> Mensagem entregue com garantia de pelo menos uma vez (pode haver duplicação). Utilizado para eventos de alarmes e contagem de peças.</li>
              <li><strong>QoS 2 (Exactly once):</strong> Entrega garantida exatamente uma vez com handshake de 4 vias (maior overhead).</li>
            </ul>
          </TheoryBox>

          <TheoryBox
            discipline="Automação Industrial"
            week="Semana 07 a 10"
            title="Orquestração e Flow-Based Programming com Node-RED"
          >
            <p className="mb-2">
              O <strong>Node-RED</strong> atua como a camada de mediação (Edge Gateway):
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><code>mqtt in</code>: Escuta o tópico do sensor.</li>
              <li><code>json</code>: Converte a string recebida em objeto JavaScript manipulável.</li>
              <li><code>switch</code>: Roteia a mensagem conforme regras condicionais (ex.: <code>temperatura &gt; 80</code>).</li>
              <li><code>change</code>: Ajusta propriedades do payload antes de encaminhar à nuvem.</li>
            </ul>
          </TheoryBox>

          <TheoryBox
            discipline="Automação Industrial"
            week="Semana 12 e 13"
            title="Processamento Stateful: Histerese e Ciclo de Vida de Alertas"
            type="warning"
          >
            <p className="mb-2">
              Limiares simples geram alertas oscilantes (*flapping*). Para evitar ruído operacional:
            </p>
            <div className="rounded bg-slate-950 p-2 font-mono text-xs text-slate-300">
              Alerta Ativa: Temperatura &gt; 85°C por 3 leituras consecutivas<br/>
              Alerta Normaliza: Temperatura &lt; 78°C (banda morta de histerese)
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Isso garante que pequenos ruídos analógicos de leitura não sobrecarreguem os operadores nem a fila SQS.
            </p>
          </TheoryBox>
        </div>
      ) : (
        /* LABORATÓRIO INTERATIVO */
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-amber-400" />
                  Simulador de Célula Fabril (ESP32 Wokwi Mock)
                </h3>
                <p className="text-xs text-slate-400">
                  Injete falhas ou estados de produção para inspecionar a geração e publicação de pacotes MQTT.
                </p>
              </div>

              {/* Seletor de Estados */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleStateChange('OPERATIONAL')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    deviceState === 'OPERATIONAL'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  Normal
                </button>
                <button
                  onClick={() => handleStateChange('WARNING')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    deviceState === 'WARNING'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 text-amber-300" />
                  Atenção
                </button>
                <button
                  onClick={() => handleStateChange('CRITICAL')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    deviceState === 'CRITICAL'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 text-rose-300" />
                  Falha Crítica
                </button>
              </div>
            </div>

            {/* Painel de Variáveis do Sensor */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <span className="text-xs text-slate-400">Temperatura Analógica</span>
                <div className="text-2xl font-bold text-amber-400 mt-1">{temp.toFixed(1)} °C</div>
                <input
                  type="range"
                  min="50"
                  max="110"
                  step="0.5"
                  value={temp}
                  onChange={(e) => setTemp(parseFloat(e.target.value))}
                  className="w-full mt-3 accent-amber-500"
                />
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <span className="text-xs text-slate-400">Vibração Triaxial (RMS)</span>
                <div className="text-2xl font-bold text-sky-400 mt-1">{vib.toFixed(2)} mm/s</div>
                <input
                  type="range"
                  min="0.5"
                  max="12.0"
                  step="0.1"
                  value={vib}
                  onChange={(e) => setVib(parseFloat(e.target.value))}
                  className="w-full mt-3 accent-sky-500"
                />
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <span className="text-xs text-slate-400">Rotação do Fuso (RPM)</span>
                <div className="text-2xl font-bold text-purple-400 mt-1">{rpm} RPM</div>
                <input
                  type="range"
                  min="0"
                  max="4500"
                  step="50"
                  value={rpm}
                  onChange={(e) => setRpm(parseInt(e.target.value))}
                  className="w-full mt-3 accent-purple-500"
                />
              </div>
            </div>

            {/* Botão de Disparo */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <Radio className={`w-4 h-4 ${isPublishing ? 'text-amber-400 animate-spin' : 'text-emerald-400'}`} />
                <span>Broker Alvo: <strong>AWS IoT Core (us-east-1)</strong></span>
              </div>

              <button
                onClick={handlePublishNow}
                disabled={isPublishing}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition-all disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                Publicar Telemetria via MQTT
              </button>
            </div>
          </div>

          {/* Terminal de Saída */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2 mb-3">
              <span>Terminal de Eventos MQTT & Log de Borda</span>
              <span className="text-[10px] text-emerald-400">Conexão Ativa</span>
            </div>
            <div className="space-y-1.5 text-slate-300">
              {logs.map((log, index) => (
                <div key={index} className="leading-relaxed">
                  <span className="text-slate-500 mr-2">{new Date().toLocaleTimeString()}</span>
                  <span className={log.includes('[PUB]') ? 'text-amber-300 font-semibold' : 'text-slate-300'}>
                    {log}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

