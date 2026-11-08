import React, { useState } from 'react';
import { GitBranch, GitCommit, CheckCircle2, Play, ShieldCheck, Terminal, Layers } from 'lucide-react';
import { TheoryBox } from '../components/common/TheoryBox';

export const DevopsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'teoria' | 'laboratorio'>('teoria');

  // Construtor de Conventional Commits
  const [commitType, setCommitType] = useState<string>('feat');
  const [scope, setScope] = useState<string>('oee-calculator');
  const [description, setDescription] = useState<string>('adiciona cálculo de perda por velocidade');
  const [isBreaking, setIsBreaking] = useState<boolean>(false);

  // Geração da versão SemVer sugerida baseada no tipo
  const currentVersion = '1.2.4';
  const getNextVersion = () => {
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    if (isBreaking) return `${major + 1}.0.0`;
    if (commitType === 'feat') return `${major}.${minor + 1}.0`;
    return `${major}.${minor}.${patch + 1}`;
  };

  const formattedCommit = `${commitType}${scope ? `(${scope})` : ''}${isBreaking ? '!' : ''}: ${description}`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header com Navegação de Abas */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-purple-400" />
            <h2 className="text-2xl font-bold text-white">Integração e Entrega Contínua (DevOps)</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            GitFlow, Conventional Commits, SemVer, pirâmide de testes e esteiras GitHub Actions.
          </p>
        </div>

        <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
          <button
            onClick={() => setActiveTab('teoria')}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'teoria'
                ? 'bg-purple-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📚 Apostila & Conceitos
          </button>
          <button
            onClick={() => setActiveTab('laboratorio')}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'laboratorio'
                ? 'bg-purple-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🧪 Pipeline CI/CD & SemVer
          </button>
        </div>
      </div>

      {activeTab === 'teoria' ? (
        /* CONTEÚDO TEÓRICO */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TheoryBox
            discipline="DevOps"
            week="Semana 01 e 02"
            title="Estratégia de Ramificação GitFlow"
          >
            <p className="mb-2">
              Isolamento rigoroso de código para múltiplos desenvolvedores:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><code>main</code>: Código em produção, estável e testado, com tags SemVer.</li>
              <li><code>develop</code>: Linha base de integração contínua para novas funcionalidades.</li>
              <li><code>feature/&lt;nome&gt;</code>: Ramificada de develop para desenvolver novidades pontuais.</li>
              <li><code>release/vX.Y.Z</code>: Preparação de entrega, testes de homologação e pequenos ajustes.</li>
              <li><code>hotfix/&lt;correcao&gt;</code>: Correções urgentes que saem direto da main.</li>
            </ul>
          </TheoryBox>

          <TheoryBox
            discipline="DevOps"
            week="Semana 03 e 04"
            title="Conventional Commits e Versionamento Semântico (SemVer)"
          >
            <p className="mb-2">
              Padronização que permite gerar changelogs e bump de versão automatizados:
            </p>
            <div className="rounded bg-slate-950 p-2 font-mono text-xs text-purple-300">
              MAJOR.MINOR.PATCH (ex.: v1.3.0)<br/>
              - MAJOR: Quebra de compatibilidade (Breaking Change)<br/>
              - MINOR: Nova funcionalidade retrocompatível (feat:)<br/>
              - PATCH: Correção de bug (fix:, refactor:, chore:)
            </div>
          </TheoryBox>

          <TheoryBox
            discipline="DevOps"
            week="Semana 05 a 10"
            title="Pirâmide de Testes & Quality Gates"
          >
            <p className="mb-2">
              Garantia de confiabilidade em camadas complementares:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Testes Unitários (Topo):</strong> Rápidos e isolados (JUnit e pytest testando regras de negócio e cálculo de OEE sem banco).</li>
              <li><strong>Testes de Integração (Meio):</strong> Validação de rotas REST e persistência simulada.</li>
              <li><strong>Quality Gate no CI:</strong> O merge para <code>main</code> é bloqueado se a suíte falhar ou a cobertura for inferior a 80%.</li>
            </ul>
          </TheoryBox>

          <TheoryBox
            discipline="DevOps"
            week="Semana 13 a 17"
            title="Docker Multi-Stage & Continuous Deployment na EC2"
            type="tip"
          >
            <p className="mb-2">
              Construção eficiente e segura de contêineres:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Multi-stage Build:</strong> Compila no primeiro estágio (com Maven/JDK completo) e copia apenas o `.jar` final para um estágio Alpine mínimo de execução.</li>
              <li><strong>Deploy Automatizado:</strong> O GitHub Actions conecta via SSH com chave privada e executa <code>docker compose pull && docker compose up -d</code>.</li>
            </ul>
          </TheoryBox>
        </div>
      ) : (
        /* LABORATÓRIO INTERATIVO */
        <div className="space-y-8">
          {/* Construtor de Conventional Commits e SemVer */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <GitCommit className="w-5 h-5 text-purple-400" />
              Simulador de Conventional Commits & Cálculo Automático de SemVer
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Experimente alterar o tipo e escopo do commit para ver a dedução automática da próxima tag de versão.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Tipo de Commit</label>
                <select
                  value={commitType}
                  onChange={(e) => setCommitType(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200"
                >
                  <option value="feat">feat (nova feature -&gt; MINOR)</option>
                  <option value="fix">fix (correção de bug -&gt; PATCH)</option>
                  <option value="refactor">refactor (sem alteração funcional -&gt; PATCH)</option>
                  <option value="chore">chore (tarefas de build/infra -&gt; PATCH)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Escopo (Opcional)</label>
                <input
                  type="text"
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-slate-400 block mb-1">Descrição</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="breaking"
                checked={isBreaking}
                onChange={(e) => setIsBreaking(e.target.checked)}
                className="rounded accent-purple-500"
              />
              <label htmlFor="breaking" className="text-xs text-slate-300">
                Este commit contém uma <strong>Breaking Change</strong> (quebra de compatibilidade de API)?
              </label>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-slate-500">Mensagem Padronizada:</span>
                <p className="text-purple-300 font-bold mt-0.5">{formattedCommit}</p>
              </div>
              <div className="text-right">
                <span className="text-slate-500">Próxima Versão Calculada:</span>
                <p className="text-emerald-400 font-bold text-sm mt-0.5">
                  v{currentVersion} → <span className="underline">v{getNextVersion()}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Pipeline Status Mock */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-400" />
              Esteira de CI/CD do GitHub Actions em Execução
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/30 p-3">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>1. Lint & Format</span>
                </div>
                <p className="text-[11px] text-slate-400">ESLint, Flake8 & Spotless</p>
                <span className="text-[10px] text-slate-500 font-mono mt-2 block">Duração: 18s</span>
              </div>

              <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/30 p-3">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>2. Unit Tests</span>
                </div>
                <p className="text-[11px] text-slate-400">JUnit 5 & Pytest (42 tests)</p>
                <span className="text-[10px] text-slate-500 font-mono mt-2 block">Duração: 45s</span>
              </div>

              <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/30 p-3">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>3. Build Docker</span>
                </div>
                <p className="text-[11px] text-slate-400">Multi-stage 3 imagens</p>
                <span className="text-[10px] text-slate-500 font-mono mt-2 block">Duração: 1m 20s</span>
              </div>

              <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/30 p-3">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>4. Push Hub</span>
                </div>
                <p className="text-[11px] text-slate-400">Tags semânticas + latest</p>
                <span className="text-[10px] text-slate-500 font-mono mt-2 block">Duração: 32s</span>
              </div>

              <div className="rounded-xl border border-purple-800/60 bg-purple-950/30 p-3">
                <div className="flex items-center gap-2 text-purple-400 text-xs font-bold mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>5. SSH Deploy EC2</span>
                </div>
                <p className="text-[11px] text-slate-400">docker compose pull & up</p>
                <span className="text-[10px] text-slate-500 font-mono mt-2 block">Duração: 28s</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

