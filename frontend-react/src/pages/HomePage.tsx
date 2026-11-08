import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Cpu, 
  BarChart3, 
  Cloud, 
  GitBranch, 
  Factory, 
  Layers, 
  ArrowRight,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { CURRICULUM_DATA } from '../data/curriculumData';

export const HomePage: React.FC = () => {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/40 p-8 shadow-2xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-950/60 px-3 py-1 text-xs font-semibold text-sky-400">
            <Sparkles className="h-3.5 w-3.5" />
            Ecossistema Integrado de Aprendizagem — Indústria 4.0
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Factory Hub: Portal & Apostila Viva
          </h2>
          <p className="text-base text-slate-300 leading-relaxed">
            Este portal materializa a convergência entre <strong className="text-amber-400">Automação Industrial</strong>, <strong className="text-emerald-400">Ciência de Dados</strong>, <strong className="text-sky-400">Computação em Nuvem</strong> e <strong className="text-purple-400">DevOps</strong>. Navegue pelos módulos para estudar a teoria de cada aula ou interagir diretamente com simuladores e a telemetria da célula fabril <strong>Smart N1</strong>.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/fabrica"
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-sky-600/30 hover:bg-sky-500 transition-all"
            >
              <Factory className="h-4 w-4" />
              Acessar Fábrica Virtual Smart N1
            </Link>
            <a
              href="#piramide"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-all"
            >
              <Layers className="h-4 w-4" />
              Ver Pirâmide ISA-95
            </a>
          </div>
        </div>
      </div>

      {/* 4 Cards das Disciplinas */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-sky-400" />
              Trilhas de Aprendizagem Curriculares
            </h3>
            <p className="text-xs text-slate-400">Cada módulo combina teoria explicativa com experimentos práticos.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Automação Industrial */}
          <Link
            to="/automacao"
            className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-amber-500/50 hover:bg-slate-900 transition-all shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-400 group-hover:scale-110 transition-transform">
                  <Cpu className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-amber-400 bg-amber-950/50 border border-amber-800/60 px-2 py-0.5 rounded-md">
                  80 Horas
                </span>
              </div>
              <h4 className="font-bold text-slate-100 text-base group-hover:text-amber-300 transition-colors">
                {CURRICULUM_DATA.automacao.name}
              </h4>
              <p className="mt-2 text-xs text-slate-400 line-clamp-3">
                {CURRICULUM_DATA.automacao.tagline}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-amber-400">
              <span>Abrir Módulo</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Ciência de Dados */}
          <Link
            to="/ciencia-de-dados"
            className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-emerald-500/50 hover:bg-slate-900 transition-all shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-400 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-2 py-0.5 rounded-md">
                  80 Horas
                </span>
              </div>
              <h4 className="font-bold text-slate-100 text-base group-hover:text-emerald-300 transition-colors">
                {CURRICULUM_DATA.cienciaDados.name}
              </h4>
              <p className="mt-2 text-xs text-slate-400 line-clamp-3">
                {CURRICULUM_DATA.cienciaDados.tagline}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-emerald-400">
              <span>Abrir Módulo</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Computação em Nuvem */}
          <Link
            to="/nuvem"
            className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-sky-500/50 hover:bg-slate-900 transition-all shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-sky-950/80 border border-sky-800 text-sky-400 group-hover:scale-110 transition-transform">
                  <Cloud className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-sky-400 bg-sky-950/50 border border-sky-800/60 px-2 py-0.5 rounded-md">
                  60 Horas
                </span>
              </div>
              <h4 className="font-bold text-slate-100 text-base group-hover:text-sky-300 transition-colors">
                {CURRICULUM_DATA.nuvem.name}
              </h4>
              <p className="mt-2 text-xs text-slate-400 line-clamp-3">
                {CURRICULUM_DATA.nuvem.tagline}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-sky-400">
              <span>Abrir Módulo</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* DevOps */}
          <Link
            to="/devops"
            className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-purple-500/50 hover:bg-slate-900 transition-all shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-purple-950/80 border border-purple-800 text-purple-400 group-hover:scale-110 transition-transform">
                  <GitBranch className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-purple-400 bg-purple-950/50 border border-purple-800/60 px-2 py-0.5 rounded-md">
                  40 Horas
                </span>
              </div>
              <h4 className="font-bold text-slate-100 text-base group-hover:text-purple-300 transition-colors">
                {CURRICULUM_DATA.devops.name}
              </h4>
              <p className="mt-2 text-xs text-slate-400 line-clamp-3">
                {CURRICULUM_DATA.devops.tagline}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-purple-400">
              <span>Abrir Módulo</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>

      {/* Seção Pirâmide ISA-95 Interativa */}
      <div id="piramide" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            Convergência TI/TA: A Pirâmide ISA-95 no Factory Hub
          </h3>
          <p className="text-xs text-slate-400">
            A arquitetura do projeto implementa cada camada do padrão internacional de automação e integração fabril:
          </p>
        </div>

        <div className="space-y-3">
          {/* Nível 4 */}
          <div className="rounded-xl border border-sky-800/50 bg-sky-950/30 p-4 transition-all hover:bg-sky-950/50">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-sky-300 text-sm">Nível 4: Negócios & Planejamento (ERP / Nuvem AWS)</span>
              <span className="text-[11px] font-mono bg-sky-900/80 text-sky-200 px-2 py-0.5 rounded">Computação em Nuvem & DevOps</span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Hospedagem em nuvem (EC2, SQS, RDS PostgreSQL), esteiras automatizadas de CI/CD (GitHub Actions) e painéis executivos em React.
            </p>
          </div>

          {/* Nível 3 */}
          <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/30 p-4 transition-all hover:bg-emerald-950/50">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-emerald-300 text-sm">Nível 3: Operação Fabril & MES (OEE & Predição)</span>
              <span className="text-[11px] font-mono bg-emerald-900/80 text-emerald-200 px-2 py-0.5 rounded">Ciência de Dados & Backend Java</span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Cálculo contínuo do OEE (Disponibilidade, Performance, Qualidade), detecção de anomalias com Rede Neural MLP (API Flask) e persistência consolidada.
            </p>
          </div>

          {/* Nível 2 */}
          <div className="rounded-xl border border-amber-800/50 bg-amber-950/30 p-4 transition-all hover:bg-amber-950/50">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-amber-300 text-sm">Nível 2: Supervisão & Controle SCADA (Node-RED)</span>
              <span className="text-[11px] font-mono bg-amber-900/80 text-amber-200 px-2 py-0.5 rounded">Automação Industrial</span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Roteamento de fluxos via Node-RED, filtragem de histerese, supressão de alarmes falsos e publicação segura para a nuvem.
            </p>
          </div>

          {/* Nível 0/1 */}
          <div className="rounded-xl border border-orange-800/50 bg-orange-950/30 p-4 transition-all hover:bg-orange-950/50">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-orange-300 text-sm">Nível 0 & 1: Chão de Fábrica (Sensores, Atuadores e ESP32)</span>
              <span className="text-[11px] font-mono bg-orange-900/80 text-orange-200 px-2 py-0.5 rounded">Automação Industrial (Wokwi)</span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Coleta de temperatura, vibração, RPM e contagem de peças boas/defeituosas com firmware em C++ simulado no Wokwi e transmitido por MQTT.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

