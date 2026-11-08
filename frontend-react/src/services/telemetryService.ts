import { Machine, TelemetryReading, OeeIndicators, Alert, ServiceHealth } from '../types';
import {
  mockMachines,
  mockAlertas,
  mockOeeIndicators,
  telemetryByDevice,
} from '../data/mockTelemetry';

// TODO: replace with api.get('/api/v1/maquinas')
export async function getMaquinas(): Promise<Machine[]> {
  await delay(200);
  return mockMachines;
}

// TODO: replace with api.get(`/api/v1/telemetria?device_id=${deviceId}`)
export async function getTelemetria(deviceId: string): Promise<TelemetryReading[]> {
  await delay(150);
  return telemetryByDevice[deviceId] ?? [];
}

// TODO: replace with api.get(`/api/v1/indicadores?device_id=${deviceId}&periodo=${periodo}`)
export async function getOeeIndicators(
  _deviceId: string,
  _periodo: string
): Promise<OeeIndicators> {
  await delay(200);
  return mockOeeIndicators;
}

// TODO: replace with api.get('/api/v1/alertas')
export async function getAlertas(): Promise<Alert[]> {
  await delay(150);
  return mockAlertas;
}

// TODO: replace with api.get('/api/v1/health')
export async function getServiceHealth(): Promise<ServiceHealth[]> {
  await delay(100);
  return [
    { name: 'MQTT Broker', status: 'online', latency_ms: 12 },
    { name: 'Backend Java', status: 'online', latency_ms: 45 },
    { name: 'Flask AI', status: 'degraded', latency_ms: 310 },
    { name: 'PostgreSQL', status: 'online', latency_ms: 8 },
  ];
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

