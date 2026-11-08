import React, { useState } from 'react';
import { Cloud, Server, Database, Shield, Zap, RefreshCw, DollarSign } from 'lucide-react';
import { TheoryBox } from '../components/common/TheoryBox';

export const CloudPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'teoria' | 'laboratorio'>('teoria');

  // Simulador de Buffer SQS
  const [queueMessages, setQueueMessages] = useState<number>(14);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleSimulateBurst = () => {
    setQueueMessages(prev => prev + 25);
  };

  const handleBatchConsume = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setQueueMessages(prev => Math.max(0, prev - 10));
      setIsProcessing(false);
    }, 400);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header com Navegação de Abas */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Cloud className="w-6 h-6 text-sky-400" />
            <h2 className="text-2xl font-bold text-white">Computação em Nuvem (AWS Academy)</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            VPC, mensageria assíncrona SQS, IoT Core, Terraform e governança no AWS Learner Lab.
          </p>
        </div>

        <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
          <button
            onClick={() => setActiveTab('teoria')}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'teoria'
                ? 'bg-sky-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📚 Apostila & Conceitos
          </button>
          <button
            onClick={() => setActiveTab('laboratorio')}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'laboratorio'
                ? 'bg-sky-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🧪 Topologia AWS & Fila SQS
          </button>
        </div>
      </div>

      {activeTab === 'teoria' ? (
        /* CONTEÚDO TEÓRICO */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TheoryBox
            discipline="Computação em Nuvem"
            week="Semana 02 a 05"
            title="AWS Academy Learner Lab: Governança e LabRole"
            type="warning"
          >
            <p className="mb-2">
              No ambiente educacional da AWS, existem restrições estritas de IAM:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Sem criação de IAM Roles:</strong> O comando <code>iam:CreateRole</code> é bloqueado. É obrigatório reaproveitar a <code>LabRole</code> nativa.
              </li>
              <li>
                <strong>Orçamento de $100:</strong> Recursos ociosos ou de alto custo contínuo (como NAT Gateways e AWS Timestream) esgotam os créditos e desligam a conta.
              </li>
              <li>
                <strong>Credenciais de Sessão Temporárias:</strong> O token AWS STS expira a cada 4 horas no console.
              </li>
            </ul>
          </TheoryBox>

          <TheoryBox
            discipline="Computação em Nuvem"
            week="Semana 10 a 13"
            title="Arquitetura de Rede VPC & Isolamento de Segurança"
          >
            <p className="mb-2">
              Segurança em profundidade para a célula fabril na AWS:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>VPC Dedicada (10.0.0.0/16):</strong> Isolamento completo de tráfego de rede.</li>
              <li><strong>Subnet Pública (10.0.1.0/24):</strong> Hospeda a instância EC2 com Internet Gateway.</li>
              <li><strong>Security Groups Restritivos:</strong> Acesso SSH (porta 22) e Web (portas 80/443/8080/5000) com regras de entrada específicas.</li>
              <li><strong>RDS Isolado:</strong> O banco PostgreSQL escuta na porta 5432 aceitando conexões unicamente da subnet ou Security Group da EC2.</li>
            </ul>
          </TheoryBox>

          <TheoryBox
            discipline="Computação em Nuvem"
            week="Semana 15 a 17"
            title="Desacoplamento e Buffer de Picos com Amazon SQS"
          >
            <p className="mb-2">
              Por que não salvar diretamente no banco de dados a partir do IoT Core?
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Absorção de Rajadas (Bursts):</strong> Se 50 dispositivos transmitirem ao mesmo tempo, o banco de dados não trava por esgotamento de conexões.</li>
              <li><strong>Resiliência:</strong> Se o backend Java reiniciar para atualização, as mensagens aguardam na fila SQS sem perda.</li>
              <li><strong>DLQ (Dead Letter Queue):</strong> Mensagens mal formatadas que falham após 3 tentativas são isoladas para inspeção.</li>
            </ul>
          </TheoryBox>

          <TheoryBox
            discipline="Computação em Nuvem"
            week="Semana 14 a 17"
            title="Infraestrutura como Código (Terraform)"
            type="tip"
          >
            <p className="mb-2">
              Toda a topologia foi codificada de forma declarativa:
            </p>
            <div className="rounded bg-slate-950 p-2 font-mono text-xs text-sky-300">
              terraform init<br/>
              terraform plan -out=tfplan<br/>
              terraform apply tfplan
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Permite destruir e recriar o ambiente no AWS Academy em menos de 5 minutos, garantindo total reprodutibilidade.
            </p>
          </TheoryBox>
        </div>
      ) : (
        /* LABORATÓRIO INTERATIVO */
        <div className="space-y-8">
          {/* Topologia AWS Interativa */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Server className="w-5 h-5 text-sky-400" />
              Topologia dos Serviços Provisionados (AWS Academy)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* IoT Core */}
              <div className="rounded-xl border border-sky-800/60 bg-sky-950/30 p-4">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-semibold text-sky-300">AWS IoT Core</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <div className="text-sm font-bold text-white">MQTT Broker</div>
                <p className="text-[11px] text-slate-400 mt-1">Topic Rule: 'industria/smartn1/#'</p>
                <div className="mt-3 text-[10px] font-mono text-sky-400 bg-sky-950 p-1.5 rounded">
                  Ação: Roteia p/ SQS
                </div>
              </div>

              {/* SQS Queue */}
              <div className="rounded-xl border border-purple-800/60 bg-purple-950/30 p-4">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-semibold text-purple-300">Amazon SQS</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                </div>
                <div className="text-sm font-bold text-white">Fila de Buffer</div>
                <p className="text-[11px] text-slate-400 mt-1">factoryhub-telemetria-queue</p>
                <div className="mt-3 text-[10px] font-mono text-purple-400 bg-purple-950 p-1.5 rounded">
                  Mensagens na Fila: {queueMessages}
                </div>
              </div>

              {/* EC2 Docker Host */}
              <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/30 p-4">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-semibold text-emerald-300">EC2 Linux</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                </div>
                <div className="text-sm font-bold text-white">t3.small (Docker)</div>
                <p className="text-[11px] text-slate-400 mt-1">IAM: LabRole Associada</p>
                <div className="mt-3 text-[10px] font-mono text-emerald-400 bg-emerald-950 p-1.5 rounded">
                  Containers: 4 Ativos
                </div>
              </div>

              {/* RDS PostgreSQL */}
              <div className="rounded-xl border border-amber-800/60 bg-amber-950/30 p-4">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-semibold text-amber-300">RDS PostgreSQL</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                </div>
                <div className="text-sm font-bold text-white">db.t3.micro</div>
                <p className="text-[11px] text-slate-400 mt-1">Free Tier Elegível</p>
                <div className="mt-3 text-[10px] font-mono text-amber-400 bg-amber-950 p-1.5 rounded">
                  Porta 5432 (Privada)
                </div>
              </div>
            </div>
          </div>

          {/* Simulador Interativo do Buffer SQS */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3 mb-5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  Simulador de Absorção de Rajadas (Amazon SQS + Java Consumer)
                </h3>
                <p className="text-xs text-slate-400">
                  Observe como a fila absorve picos momentâneos enquanto o backend consome em lotes controlados.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSimulateBurst}
                  className="rounded-lg border border-amber-700 bg-amber-950/80 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-900 transition-all flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Injetar Rajada (+25 msgs)
                </button>
                <button
                  onClick={handleBatchConsume}
                  disabled={isProcessing || queueMessages === 0}
                  className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                  Consumir Lote (-10 msgs)
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Capacidade Atual do Buffer (Fila SQS):</span>
                <strong className="font-mono text-amber-400">{queueMessages} mensagens pendentes</strong>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-4 p-0.5 border border-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 transition-all duration-300"
                  style={{ width: `${Math.min((queueMessages / 50) * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-[11px] text-slate-500">
                O consumidor Java `@SqsListener` busca lotes de até 10 mensagens por requisição longa (Long Polling de 20s).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

