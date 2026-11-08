export interface ModuleCurriculum {
  id: string;
  title: string;
  discipline: string;
  disciplineColor: string;
  weeks: string;
  icon: string;
  description: string;
  keyConcepts: string[];
  route: string;
}

export const curriculumData: ModuleCurriculum[] = [
  {
    id: 'automacao',
    title: 'Automação Industrial',
    discipline: 'Industrial Automation',
    disciplineColor: 'bg-blue-500',
    weeks: 'Semanas 1–3',
    icon: '⚡',
    description:
      'Fundamentos de IIoT com ESP32, protocolo MQTT, ISA-95 e integração Node-RED para aquisição de dados em tempo real.',
    keyConcepts: [
      'ISA-95 — Hierarquia de automação (Nível 0–4)',
      'MQTT — QoS 0, 1, 2 e estrutura de tópicos',
      'ESP32 — Sensores de temperatura (DS18B20), vibração (MPU-6050)',
      'Node-RED — Fluxos de processamento e dashboard',
      'Histerese — Thresholds e debounce de alarmes',
      'Sinais discretos vs analógicos',
    ],
    route: '/automacao',
  },
  {
    id: 'ciencia-de-dados',
    title: 'Ciência de Dados',
    discipline: 'Data Science',
    disciplineColor: 'bg-purple-500',
    weeks: 'Semanas 4–6',
    icon: '📊',
    description:
      'Pipeline CRISP-DM, cálculo de OEE, feature engineering em séries temporais e modelo de ML para manutenção preditiva.',
    keyConcepts: [
      'CRISP-DM — 6 fases do ciclo de vida de dados',
      'OEE — Disponibilidade × Performance × Qualidade',
      'Feature Engineering — Médias móveis, FFT, desvio padrão',
      'Random Forest — Classificador de falhas',
      'Decomposição temporal — Y(t) = T(t) + S(t) + R(t)',
      'Flask REST API — Endpoint /predict',
    ],
    route: '/ciencia-de-dados',
  },
  {
    id: 'nuvem',
    title: 'Nuvem AWS',
    discipline: 'Cloud Computing',
    disciplineColor: 'bg-orange-500',
    weeks: 'Semanas 7–9',
    icon: '☁️',
    description:
      'Arquitetura AWS Academy com EC2, RDS PostgreSQL, SQS para buffer de mensagens e VPC com subnets públicas/privadas.',
    keyConcepts: [
      'AWS Academy — Restrições e créditos educacionais',
      'EC2 t2.micro — Backend Java Spring Boot',
      'RDS db.t3.micro — PostgreSQL para séries temporais',
      'SQS — Buffer assíncrono para picos de telemetria',
      'VPC — Subnets públicas e privadas',
      'Security Groups — Regras de firewall',
    ],
    route: '/nuvem',
  },
  {
    id: 'devops',
    title: 'DevOps & CI/CD',
    discipline: 'DevOps',
    disciplineColor: 'bg-green-500',
    weeks: 'Semanas 10–12',
    icon: '🚀',
    description:
      'Cultura CALMS, GitFlow, containerização Docker, pipeline CI/CD com GitHub Actions e Conventional Commits.',
    keyConcepts: [
      'CALMS — Culture, Automation, Lean, Measurement, Sharing',
      'GitFlow — main, develop, feature, release, hotfix',
      'Docker — Dockerfile multi-stage, docker-compose',
      'GitHub Actions — Workflow de CI/CD',
      'Conventional Commits — feat, fix, chore, refactor',
      'SemVer — Major.Minor.Patch',
    ],
    route: '/devops',
  },
  {
    id: 'dashboard',
    title: 'Smart N1 Dashboard',
    discipline: 'Operational',
    disciplineColor: 'bg-cyan-500',
    weeks: 'Projeto Final',
    icon: '🏭',
    description:
      'Dashboard operacional em tempo real integrando telemetria, OEE, alertas preditivos e status de todos os serviços.',
    keyConcepts: [
      'Dashboard em tempo real — Auto-refresh 10s',
      'OEE Global — Agregação por turno',
      'Alertas preditivos — Classificação por severidade',
      'Gestão de máquinas — Status por linha de produção',
      'Integração completa — IoT → Cloud → Dashboard',
    ],
    route: '/dashboard',
  },
];

