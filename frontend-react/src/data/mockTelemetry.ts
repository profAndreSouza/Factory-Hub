import { TelemetryReading, Machine, OeeIndicators, Alert } from '../types';

// Helper to build ISO timestamps going back N minutes from now
function ts(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
}

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

function randBetween(min: number, max: number, decimals = 1): number {
  const val = Math.random() * (max - min) + min;
  return parseFloat(val.toFixed(decimals));
}

function statusFromTemp(temp: number): 'OPERATIONAL' | 'WARNING' | 'CRITICAL' {
  if (temp >= 90) return 'CRITICAL';
  if (temp >= 80) return 'WARNING';
  return 'OPERATIONAL';
}

function buildReadings(
  baseTemp: number,
  baseVib: number,
  baseRpm: number,
  spike: boolean
): TelemetryReading[] {
  return Array.from({ length: 30 }, (_, i) => {
    const tempDelta = spike && i > 20 ? randBetween(10, 18) : randBetween(-3, 4);
    const temp = clamp(parseFloat((baseTemp + tempDelta).toFixed(1)), 60, 100);
    const vib = clamp(randBetween(baseVib - 1, baseVib + 1.5), 1.0, 10.0);
    const rpm = clamp(Math.round(baseRpm + randBetween(-120, 120, 0)), 2500, 4000);
    const status = statusFromTemp(temp);
    const produced = Math.round(randBetween(40, 60, 0));
    const defects = status === 'CRITICAL' ? Math.round(produced * 0.08) : status === 'WARNING' ? Math.round(produced * 0.03) : Math.round(produced * 0.005);
    return {
      timestamp: ts(29 - i),
      temperatura: temp,
      vibracao: vib,
      rpm,
      status,
      pecas_produzidas: produced,
      pecas_defeito: defects,
    };
  });
}

export const mockTelemetryTorno01: TelemetryReading[] = buildReadings(70, 2.5, 3100, false);
export const mockTelemetryTorno02: TelemetryReading[] = buildReadings(76, 3.8, 3050, true);
export const mockTelemetryFresadora01: TelemetryReading[] = buildReadings(68, 2.0, 2950, false);

const lastTorno01 = mockTelemetryTorno01[29];
const lastTorno02 = mockTelemetryTorno02[29];
const lastFresadora01 = mockTelemetryFresadora01[29];

export const mockMachines: Machine[] = [
  {
    device_id: 'esp32-torno-01',
    nome: 'Torno CNC #01',
    linha: 'Linha A',
    status: lastTorno01.status,
    ultima_leitura: lastTorno01,
  },
  {
    device_id: 'esp32-torno-02',
    nome: 'Torno CNC #02',
    linha: 'Linha A',
    status: lastTorno02.status,
    ultima_leitura: lastTorno02,
  },
  {
    device_id: 'esp32-fresadora-01',
    nome: 'Fresadora #01',
    linha: 'Linha B',
    status: lastFresadora01.status,
    ultima_leitura: lastFresadora01,
  },
];

export const mockOeeIndicators: OeeIndicators = {
  disponibilidade: 91.2,
  performance: 87.4,
  qualidade: 97.8,
  oee: parseFloat((0.912 * 0.874 * 0.978 * 100).toFixed(1)),
  periodo: 'Hoje',
};

export const mockAlertas: Alert[] = [
  {
    id: 'ALT-001',
    device_id: 'esp32-torno-02',
    timestamp: ts(5),
    probabilidade_falha: 78.3,
    status_previsto: 'WARNING',
    recomendacao: 'Verificar rolamentos e nível de lubrificação.',
    severidade: 'HIGH',
  },
  {
    id: 'ALT-002',
    device_id: 'esp32-torno-02',
    timestamp: ts(2),
    probabilidade_falha: 91.5,
    status_previsto: 'CRITICAL',
    recomendacao: 'Parar máquina imediatamente. Substituir rolamento traseiro.',
    severidade: 'CRITICAL',
  },
  {
    id: 'ALT-003',
    device_id: 'esp32-torno-01',
    timestamp: ts(18),
    probabilidade_falha: 32.1,
    status_previsto: 'WARNING',
    recomendacao: 'Monitorar temperatura. Verificar sistema de refrigeração.',
    severidade: 'MEDIUM',
  },
  {
    id: 'ALT-004',
    device_id: 'esp32-fresadora-01',
    timestamp: ts(45),
    probabilidade_falha: 12.4,
    status_previsto: 'OPERATIONAL',
    recomendacao: 'Operação normal. Manutenção preventiva em 72h.',
    severidade: 'LOW',
  },
];

export const telemetryByDevice: Record<string, TelemetryReading[]> = {
  'esp32-torno-01': mockTelemetryTorno01,
  'esp32-torno-02': mockTelemetryTorno02,
  'esp32-fresadora-01': mockTelemetryFresadora01,
};

