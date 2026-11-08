export interface TelemetryReading {
  timestamp: string;         // ISO string
  temperatura: number;       // °C
  vibracao: number;          // mm/s
  rpm: number;
  status: 'OPERATIONAL' | 'WARNING' | 'CRITICAL' | 'STOPPED' | 'UNKNOWN';
  pecas_produzidas?: number;
  pecas_defeito?: number;
}

export interface Machine {
  device_id: string;
  nome: string;
  linha: string;
  status: 'OPERATIONAL' | 'WARNING' | 'CRITICAL' | 'STOPPED' | 'UNKNOWN';
  ultima_leitura: TelemetryReading;
}

export interface OeeIndicators {
  disponibilidade: number;   // 0-100
  performance: number;       // 0-100
  qualidade: number;         // 0-100
  oee: number;               // 0-100
  periodo: string;
  total_pecas?: number;
  pecas_boas?: number;
  pecas_refugo?: number;
}

export interface Alert {
  id: string;
  device_id: string;
  timestamp: string;
  probabilidade_falha: number;
  status_previsto: string;
  recomendacao: string;
  severidade: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface PredictRequest {
  device_id: string;
  temperatura: number;
  vibracao: number;
  rpm: number;
}

export interface PredictResponse {
  device_id: string;
  status_previsto: string;
  probabilidade_falha: number;
  recomendacao: string;
  modelo_versao: string;
}

export interface ServiceHealth {
  name: string;
  status: 'online' | 'offline' | 'degraded' | 'unknown';
  latency_ms?: number;
}

