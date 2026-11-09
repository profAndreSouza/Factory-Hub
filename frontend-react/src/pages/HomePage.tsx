import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { getServiceHealth } from '../services/telemetryService';
import { curriculumData } from '../data/curriculumData';
import { ServiceHealth } from '../types';

const isaPyramid = [
  {
    level: 4,
    label: 'Level 4 — Enterprise',
    description: 'ERP / Cloud AWS',
    mapping: 'EC2 + RDS + SQS',
    color: 'bg-cyan-400',
    width: 'w-2/6',
  },
  {
    level: 3,
    label: 'Level 3 — MES',
    description: 'Manufacturing Execution',
    mapping: 'Backend Java Spring Boot',
    color: 'bg-cyan-500',
    width: 'w-3/6',
  },
  {
    level: 2,
    label: 'Level 2 — SCADA',
    description: 'Supervisory Control',
    mapping: 'Node-RED Dashboard',
    color: 'bg-cyan-600',
    width: 'w-4/6',
  },
  {
    level: 1,
    label: 'Level 1 — Control',
    description: 'PLCs / Controllers',
    mapping: 'ESP32 Firmware',
    color: 'bg-blue-600',
    width: 'w-5/6',
  },
  {
    level: 0,
    label: 'Level 0 — Field',
    description: 'Sensors & Actuators',
    mapping: 'DS18B20 · MPU-6050',
    color: 'bg-blue-700',
    width: 'w-full',
  },
];

export const HomePage: React.FC = () => {
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [healthError, setHealthError] = useState(false);
  const [healthLoaded, setHealthLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    const refreshHealth = () => getServiceHealth().then(data => {
      if (!mounted) return;
      setServices(data);
      setHealthError(false);
      setHealthLoaded(true);
    }).catch(() => { if (mounted) { setHealthError(true); setHealthLoaded(true); } });
    refreshHealth();
    const interval = setInterval(refreshHealth, 10000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        icon="🏭"
        title="Factory Hub — Célula Fabril Smart N1"
        subtitle="Portal educacional IIoT integrado: Automação, Dados, Cloud e DevOps"
        badge="Educational Portal"
      />

      {/* ISA-95 Pyramid */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
          <span>🏗️</span> Hierarquia ISA-95
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex flex-col items-center gap-1.5">
            {isaPyramid.map(tier => (
                <div key={tier.level} className={`${tier.width} flex items-center justify-center`}>
                  <div
                    className={`w-full ${tier.color} text-white rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 shadow-sm`}
                  >
                    <div>
                      <div className="font-bold text-sm">{tier.label}</div>
                      <div className="text-xs opacity-80">{tier.description}</div>
                    </div>
                    <div className="text-xs opacity-70 font-mono bg-black/20 rounded px-2 py-0.5 whitespace-nowrap">
                      {tier.mapping}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* Module Cards */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
          <span>📚</span> Módulos do Curso
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {curriculumData.map(module => (
            <Link
              key={module.id}
              to={module.route}
              className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all"
            >
              <div className="flex items-start gap-3 mb-3">
                <span className="text-3xl">{module.icon}</span>
                <div>
                  <span
                    className={`text-xs font-semibold text-white px-2 py-0.5 rounded-full ${module.disciplineColor}`}
                  >
                    {module.discipline}
                  </span>
                  <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {module.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{module.weeks}</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                {module.description}
              </p>
              <div className="mt-3 flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400 font-medium">
                Acessar módulo <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* System Status */}
      <section className="mb-6">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
          <span>🔌</span> Status dos Serviços
        </h2>
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">Os status são enviados pela API Java. MOCK indica um estado simulado; UNKNOWN indica que a dependência ainda não é monitorada.</p>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          {healthError ? (
            <div className="text-sm text-red-500">Não foi possível carregar os status enviados pelo backend.</div>
          ) : !healthLoaded ? (
            <div className="text-sm text-gray-400 animate-pulse">Carregando status do backend...</div>
          ) : services.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">O backend não retornou status de serviços.</div>
          ) : (
            <div className="flex flex-wrap gap-4">
              {services.map(svc => (
                <div
                  key={svc.name}
                  className="flex flex-col items-start gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-3 border border-gray-100 dark:border-gray-700 min-w-[160px]"
                >
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    {svc.name}
                  </div>
                  {svc.source && <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${svc.source === 'MOCK' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>{svc.source}</span>}
                  <StatusBadge status={svc.status} size="sm" />
                  {svc.latency_ms !== undefined && (
                    <div className="text-xs text-gray-400">{svc.latency_ms} ms</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

