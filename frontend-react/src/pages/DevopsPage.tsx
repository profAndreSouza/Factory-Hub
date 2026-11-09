import React, { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { SectionTabs } from '../components/common/SectionTabs';

const TABS = [
  { id: 'teoria', label: '📚 Teoria' },
  { id: 'lab', label: '🧪 Laboratório' },
];

type PipelineStatus = 'pending' | 'running' | 'success' | 'failed';

interface PipelineStep {
  id: string;
  label: string;
  icon: string;
  status: PipelineStatus;
}

const INITIAL_PIPELINE: PipelineStep[] = [
  { id: 'quality', label: 'CI + quality gates', icon: '🧪', status: 'pending' },
  { id: 'publish', label: 'Publicação manual', icon: '📦', status: 'pending' },
  { id: 'deploy', label: 'Deploy manual via SSM', icon: '🚀', status: 'pending' },
];

const CALMS = [
  {
    letter: 'C',
    name: 'Culture',
    icon: '🤝',
    color: 'bg-blue-500',
    desc: 'Cultura de colaboração, responsabilidade compartilhada e aprendizado contínuo entre Dev e Ops.',
  },
  {
    letter: 'A',
    name: 'Automation',
    icon: '🤖',
    color: 'bg-cyan-500',
    desc: 'Automação de testes, build, deploy e rollback. Eliminar tarefas manuais repetitivas e propensas a erros.',
  },
  {
    letter: 'L',
    name: 'Lean',
    icon: '⚡',
    color: 'bg-green-500',
    desc: 'Eliminar desperdícios no fluxo de valor. Work In Progress (WIP) limits, fluxo contínuo, Kanban.',
  },
  {
    letter: 'M',
    name: 'Measurement',
    icon: '📊',
    color: 'bg-purple-500',
    desc: 'DORA Metrics: Deployment Frequency, Lead Time, MTTR, Change Failure Rate. Data-driven decisions.',
  },
  {
    letter: 'S',
    name: 'Sharing',
    icon: '📢',
    color: 'bg-amber-500',
    desc: 'Compartilhar conhecimento, blameless post-mortems, runbooks, wikis e feedback loops.',
  },
];

type CommitType = 'feat' | 'fix' | 'refactor' | 'docs' | 'chore' | 'test' | 'ci';

const semverMap: Record<CommitType, string> = {
  feat: 'MINOR (new feature)',
  fix: 'PATCH (bug fix)',
  refactor: 'PATCH',
  docs: 'PATCH',
  chore: 'PATCH',
  test: 'PATCH',
  ci: 'PATCH',
};

export const DevopsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('teoria');
  const [pipeline, setPipeline] = useState<PipelineStep[]>(INITIAL_PIPELINE);
  const [pipelineRunning, setPipelineRunning] = useState(false);

  // Conventional commits
  const [commitType, setCommitType] = useState<CommitType>('feat');
  const [scope, setScope] = useState('telemetria');
  const [desc, setDesc] = useState('add real-time sensor streaming');

  const commitMsg = `${commitType}(${scope}): ${desc}`;
  const semver = semverMap[commitType];

  const simulatePipeline = async () => {
    if (pipelineRunning) return;
    setPipelineRunning(true);
    const steps = [...INITIAL_PIPELINE];
    setPipeline(steps.map(s => ({ ...s, status: 'pending' })));

    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, 300));
      setPipeline(prev =>
        prev.map((s, idx) => (idx === i ? { ...s, status: 'running' } : s))
      );
      await new Promise(r => setTimeout(r, 900));
      setPipeline(prev =>
        prev.map((s, idx) => (idx === i ? { ...s, status: 'success' } : s))
      );
    }
    setPipelineRunning(false);
  };

  const resetPipeline = () => {
    setPipeline(INITIAL_PIPELINE.map(s => ({ ...s, status: 'pending' })));
  };

  const statusIcon: Record<PipelineStatus, string> = {
    pending: '○',
    running: '⟳',
    success: '✓',
    failed: '✗',
  };

  const statusColor: Record<PipelineStatus, string> = {
    pending: 'text-gray-400 border-gray-300 dark:border-gray-600',
    running: 'text-blue-500 border-blue-500 animate-pulse',
    success: 'text-green-500 border-green-500',
    failed: 'text-red-500 border-red-500',
  };

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        icon="🚀"
        title="DevOps & CI/CD"
        subtitle="CALMS · GitFlow · Docker · GitHub Actions · Conventional Commits"
        badge="Semanas 10–12"
        badgeColor="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
      />

      <SectionTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'teoria' && (
        <div className="space-y-6">
          {/* CALMS */}
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3">🧱 Framework CALMS</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {CALMS.map(c => (
                <div
                  key={c.letter}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm"
                >
                  <div className={`w-10 h-10 rounded-lg ${c.color} text-white flex items-center justify-center font-black text-lg mb-3`}>
                    {c.letter}
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span>{c.icon}</span>
                    <span className="font-bold text-sm text-gray-800 dark:text-gray-200">{c.name}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>
            <figure className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <img src="/assets/lessons/devops-calms.jpg" alt="Ilustração do modelo CALMS com cultura, automação, Lean, medição e compartilhamento" loading="lazy" className="mx-auto max-h-80 w-full object-contain p-3" />
              <figcaption className="border-t border-gray-100 px-4 py-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">CALMS conecta práticas técnicas e colaboração para melhorar o fluxo de entrega.</figcaption>
            </figure>
          </div>

          {/* GitFlow */}
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3">🌿 GitFlow — Estratégia de Branches</h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm overflow-x-auto">
              <div className="min-w-[560px]">
                {[
                  { name: 'main', color: 'bg-blue-600', dots: [0, 3, 7] },
                  { name: 'develop', color: 'bg-cyan-500', dots: [0, 2, 4, 6, 7] },
                  { name: 'feature/sensor-data', color: 'bg-green-500', dots: [1, 2] },
                  { name: 'feature/ai-model', color: 'bg-green-400', dots: [3, 4] },
                  { name: 'release/v1.2.0', color: 'bg-amber-500', dots: [5, 6] },
                  { name: 'hotfix/critical-fix', color: 'bg-red-500', dots: [6, 7] },
                ].map(branch => (
                  <div key={branch.name} className="flex items-center gap-3 mb-2.5">
                    <div className="w-44 text-right font-mono text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                      {branch.name}
                    </div>
                    <div className="flex-1 relative h-6 flex items-center">
                      <div className={`h-1 rounded-full ${branch.color} opacity-40`} style={{ width: '100%' }} />
                      {Array.from({ length: 8 }, (_, i) => (
                        <div
                          key={i}
                          className={`absolute w-3 h-3 rounded-full border-2 transition-all ${
                            branch.dots.includes(i)
                              ? `${branch.color} border-white dark:border-gray-800`
                              : 'opacity-0'
                          }`}
                          style={{ left: `${i * 13}%` }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <div className="flex gap-3 mt-2 text-xs text-gray-400">
                  <span className="ml-48">Tag v1.0</span>
                  <span className="ml-auto">Tag v1.2.0 🏷️</span>
                </div>
              </div>
            </div>
          </div>

          {/* Testing Pyramid */}
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3">🔺 Pirâmide de Testes</h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <div className="flex flex-col items-center gap-1.5">
                {[
                  { label: 'E2E Tests', count: '~5', color: 'bg-red-500', width: 'w-1/4', desc: 'Cypress, lento, caro' },
                  { label: 'Integration Tests', count: '~30', color: 'bg-amber-500', width: 'w-2/4', desc: 'Testcontainers, moderado' },
                  { label: 'Unit Tests', count: '~200', color: 'bg-green-500', width: 'w-full', desc: 'JUnit, Jest, rápido, barato' },
                ].map(tier => (
                  <div key={tier.label} className={`${tier.width} flex items-center justify-center`}>
                    <div className={`w-full ${tier.color} text-white rounded px-4 py-3 text-center`}>
                      <div className="font-bold text-sm">{tier.label}</div>
                      <div className="text-xs opacity-80">{tier.count} testes · {tier.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'lab' && (
        <div className="space-y-6">
          {/* CI/CD Pipeline Visualizer */}
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3">🔁 Visualizador CI/CD Pipeline</h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-5 flex-wrap">
                <button
                  onClick={simulatePipeline}
                  disabled={pipelineRunning}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
                >
                  {pipelineRunning ? '⟳ Simulando...' : '▶ Simular fluxo didático'}
                </button>
                <button
                  onClick={resetPipeline}
                  disabled={pipelineRunning}
                  className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-300 text-sm font-semibold transition-colors"
                >
                  ↺ Reset
                </button>
              </div>

              <p className="mb-4 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                Esta animação é demonstrativa e não executa GitHub Actions. Na aplicação real, CI e quality gates rodam no workflow de CI; a publicação no Docker Hub e o deploy via SSM são workflows manuais separados. O Terraform também é executado em workflow próprio.
              </p>

              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {pipeline.map((step, idx) => (
                  <React.Fragment key={step.id}>
                    <div
                      className={`flex flex-col items-center gap-2 flex-shrink-0 border-2 rounded-xl px-4 py-3 min-w-[90px] transition-all ${statusColor[step.status]}`}
                    >
                      <span className="text-2xl">{step.icon}</span>
                      <span className="text-xs font-semibold text-center leading-tight">{step.label}</span>
                      <span className={`text-lg font-black ${statusColor[step.status]}`}>
                        {step.status === 'running'
                          ? <span className="inline-block animate-spin">⟳</span>
                          : statusIcon[step.status]}
                      </span>
                    </div>
                    {idx < pipeline.length - 1 && (
                      <div className="text-gray-300 dark:text-gray-600 text-xl flex-shrink-0">→</div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* Conventional Commits Builder */}
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3">✍️ Conventional Commits Builder</h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Tipo</label>
                  <select
                    value={commitType}
                    onChange={e => setCommitType(e.target.value as CommitType)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {(['feat', 'fix', 'refactor', 'docs', 'chore', 'test', 'ci'] as CommitType[]).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Escopo</label>
                  <input
                    type="text"
                    value={scope}
                    onChange={e => setScope(e.target.value)}
                    placeholder="ex: telemetria"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Descrição</label>
                  <input
                    type="text"
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    placeholder="ex: add sensor streaming"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="bg-gray-900 rounded-xl p-4">
                <div className="text-xs text-gray-500 mb-2 font-mono">git commit -m "..."</div>
                <div className="font-mono text-green-400 text-sm break-all">{commitMsg}</div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">SemVer bump:</span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    commitType === 'feat'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {semver}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

