export interface DisciplineInfo {
  id: string;
  name: string;
  shortName: string;
  code: string;
  hours: number;
  icon: string;
  color: string;
  tagline: string;
  keyConcepts: string[];
  weeksSummary: { week: string; topic: string; practicalFocus: string }[];
}

export const CURRICULUM_DATA: Record<string, DisciplineInfo> = {
  automacao: {
    id: 'automacao',
    name: 'Automação Industrial',
    shortName: 'Automação',
    code: 'AUT-80',
    hours: 80,
    icon: 'Cpu',
    color: 'from-amber-500 to-orange-600',
    tagline: 'Da instrumentação de campo (sensores/CLP) ao protocolo MQTT e orquestração Node-RED',
    keyConcepts: [
      'Pirâmide ISA-95 (Níveis 0 a 4)',
      'Sensores Indutivos, Capacitivos e Fotoelétricos',
      'Protocolo MQTT (Pub/Sub, Tópicos, QoS 0/1/2)',
      'Node-RED: Ingestão, Histerese e Ciclo de Alertas',
      'Integração TI/TA (Chão de Fábrica ao Cloud)'
    ],
    weeksSummary: [
      { week: 'Sem. 01-03', topic: 'ISA-95 & Sensores Industriais', practicalFocus: 'Identificação de sinais PNP/NPN, atuadores e ciclo de scan' },
      { week: 'Sem. 04-05', topic: 'MQTT & Node-RED Básico', practicalFocus: 'Broker Mosquitto, payloads JSON e flow-based programming' },
      { week: 'Sem. 07-10', topic: 'Tratamento & Roteamento IIoT', practicalFocus: 'Construção nó a nó do fluxo: switch, change e function' },
      { week: 'Sem. 12-13', topic: 'QoS & Ciclo de Alertas', practicalFocus: 'Tratamento de falhas, supressão de ruído e histerese' },
      { week: 'Sem. 15-17', topic: 'ADS Factory Hub Integrado', practicalFocus: 'Conexão Wokwi/Node-RED ao AWS IoT Core e persistência' }
    ]
  },
  cienciaDados: {
    id: 'cienciaDados',
    name: 'Ciência de Dados',
    shortName: 'Ciência de Dados',
    code: 'DAT-80',
    hours: 80,
    icon: 'BarChart3',
    color: 'from-emerald-500 to-teal-600',
    tagline: 'Do ciclo CRISP-DM às Redes Neurais para manutenção preditiva e cálculo do OEE',
    keyConcepts: [
      'Metodologia CRISP-DM Industrial',
      'Estatística Descritiva & EDA em Telemetria',
      'Séries Temporais (Decomposição, Médias Móveis EWMA)',
      'Redes Neurais MLP & LSTM para Detecção de Anomalias',
      'Cálculo do OEE (Disponibilidade, Performance, Qualidade)'
    ],
    weeksSummary: [
      { week: 'Sem. 01-04', topic: 'CRISP-DM & Estatística', practicalFocus: 'EDA, custos assimétricos de falha, matriz de confusão e ROI' },
      { week: 'Sem. 05-07', topic: 'Testes de Hipótese & Séries Temporais', practicalFocus: 'Shapiro-Wilk, sazonalidade, janelamento e resíduos' },
      { week: 'Sem. 10-12', topic: 'Redes Neurais (MLP)', practicalFocus: 'Tensores, backpropagation, ativações e treino de MLP tabular' },
      { week: 'Sem. 13', topic: 'Arquiteturas Especializadas', practicalFocus: 'LSTM para sequências e Autoencoders para anomalias' },
      { week: 'Sem. 15-17', topic: 'ADS Factory Hub Integrado', practicalFocus: 'API Flask de predição servindo a inferência em tempo real' }
    ]
  },
  nuvem: {
    id: 'nuvem',
    name: 'Computação em Nuvem',
    shortName: 'Nuvem AWS',
    code: 'CLD-60',
    hours: 60,
    icon: 'Cloud',
    color: 'from-sky-500 to-blue-600',
    tagline: 'Infraestrutura como Código, mensageria SQS, IoT Core e governança no AWS Academy',
    keyConcepts: [
      'AWS Academy Learner Lab & Restrições LabRole',
      'VPC Segura: Subnets Públicas/Privadas e Security Groups',
      'AWS IoT Core & Topic Rules de Ingestão',
      'Amazon SQS para Desacoplamento e Buffer de Picos',
      'Infraestrutura como Código (Terraform)'
    ],
    weeksSummary: [
      { week: 'Sem. 01-04', topic: 'Fundamentos AWS & EC2 Docker', practicalFocus: 'Máquinas virtuais, SSH, Security Groups e containers' },
      { week: 'Sem. 05-07', topic: 'Storage, IAM & Sandbox Lab', practicalFocus: 'Governança LabRole e deploy da Fábrica Virtual na EC2' },
      { week: 'Sem. 10-13', topic: 'Arquitetura de Rede VPC', practicalFocus: 'Subnets, rotas, Internet Gateway e defesa em profundidade' },
      { week: 'Sem. 15-17', topic: 'ADS Factory Hub Integrado', practicalFocus: 'Provisionamento Terraform, fila SQS e banco de dados' }
    ]
  },
  devops: {
    id: 'devops',
    name: 'Integração e Entrega Contínua (DevOps)',
    shortName: 'DevOps CI/CD',
    code: 'OPS-40',
    hours: 40,
    icon: 'GitBranch',
    color: 'from-purple-500 to-indigo-600',
    tagline: 'Cultura CALMS, automação com GitHub Actions, Docker Hub e deploy contínuo na EC2',
    keyConcepts: [
      'Cultura CALMS e Gestão de Fluxo',
      'GitFlow, Conventional Commits e SemVer',
      'Pirâmide de Testes (Unitários, Integração e E2E)',
      'Imagens Docker Multi-Stage Versionadas no Docker Hub',
      'Continuous Deployment via SSH na Instância EC2'
    ],
    weeksSummary: [
      { week: 'Sem. 01-04', topic: 'CALMS, GitFlow & GitHub Actions', practicalFocus: 'Branches de feature/release, triggers e secrets' },
      { week: 'Sem. 05-07', topic: 'Pirâmide de Testes & Quality Gates', practicalFocus: 'Pytest/JUnit, testes de integração e bloqueio de merge' },
      { week: 'Sem. 10-13', topic: 'Docker Versionado & Docker Hub', practicalFocus: 'Dockerfile multi-stage, tags semânticas e push no Hub' },
      { week: 'Sem. 15-17', topic: 'ADS Factory Hub Integrado', practicalFocus: 'Pipeline completo automatizado com deploy na EC2 e rollback' }
    ]
  }
};

