import { api } from './api';
import { Machine, TelemetryReading, OeeIndicators, Alert, ServiceHealth } from '../types';

interface BackendMachine extends Omit<Partial<Machine>, 'ultima_leitura'> {
  id?: string;
  tipo?: string;
  status_atual?: Machine['status'];
  ultima_leitura?: Partial<TelemetryReading> & { data_hora?: string };
}

export async function getMaquinas(): Promise<Machine[]> {
  const { data } = await api.get<BackendMachine[]>('/api/v1/maquinas');
  return data.map(machine => ({
    ...machine,
    device_id: machine.device_id ?? machine.id ?? '',
    nome: machine.nome ?? machine.id ?? machine.device_id ?? 'Máquina sem nome',
    linha: machine.linha ?? machine.tipo ?? '—',
    status: machine.status ?? machine.status_atual ?? 'UNKNOWN',
    ultima_leitura: {
      ...machine.ultima_leitura,
      timestamp: machine.ultima_leitura?.timestamp ?? machine.ultima_leitura?.data_hora ?? '',
      temperatura: machine.ultima_leitura?.temperatura ?? 0,
      vibracao: machine.ultima_leitura?.vibracao ?? 0,
      rpm: machine.ultima_leitura?.rpm ?? 0,
      status: machine.ultima_leitura?.status ?? machine.status ?? machine.status_atual ?? 'UNKNOWN',
    },
  }));
}

export async function getTelemetria(deviceId: string): Promise<TelemetryReading[]> {
  const { data } = await api.get<Array<TelemetryReading & { data_hora?: string }>>(`/api/v1/telemetria/${encodeURIComponent(deviceId)}/recente`);
  return Array.isArray(data) ? data.map(reading => ({ ...reading, timestamp: reading.timestamp ?? reading.data_hora ?? '' })) : [];
}

export async function getOeeIndicators(deviceId: string, periodo: string): Promise<OeeIndicators> {
  const { data } = await api.get<OeeIndicators>(`/api/v1/indicadores/${encodeURIComponent(deviceId)}/oee`, {
    params: { periodo },
  });
  return data;
}

export async function getAlertas(): Promise<Alert[]> {
  const { data } = await api.get<Alert[]>('/api/v1/alertas');
  return Array.isArray(data) ? data : [];
}

interface BackendHealthService {
  name: string;
  status: string;
  latency_ms?: number;
}

interface BackendHealth {
  services?: BackendHealthService[];
}

export async function getServiceHealth(): Promise<ServiceHealth[]> {
  const { data } = await api.get<BackendHealthService[] | BackendHealth>('/api/v1/health');
  const services = Array.isArray(data) ? data : data.services ?? [];
  return services.map(service => ({
    name: service.name,
    status: normalizeHealthStatus(service.status),
    latency_ms: service.latency_ms,
  }));
}

function normalizeHealthStatus(status: string): ServiceHealth['status'] {
  const normalized = status.toLowerCase();
  if (['online', 'up', 'healthy', 'operational'].includes(normalized)) return 'online';
  if (['degraded', 'warning', 'partial'].includes(normalized)) return 'degraded';
  if (['offline', 'down', 'unhealthy'].includes(normalized)) return 'offline';
  return 'unknown';
}
