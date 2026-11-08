import { PredictRequest, PredictResponse } from '../types';

// TODO: replace with aiApi.post('/predict', req)
export async function predict(req: PredictRequest): Promise<PredictResponse> {
  await new Promise(resolve => setTimeout(resolve, 600));

  const highRisk = req.temperatura > 85 || req.vibracao > 6;
  const medRisk = req.temperatura > 75 || req.vibracao > 4;

  let probabilidade_falha: number;
  let status_previsto: string;
  let recomendacao: string;

  if (highRisk) {
    probabilidade_falha = parseFloat((75 + Math.random() * 20).toFixed(1));
    status_previsto = req.temperatura > 92 ? 'CRITICAL' : 'WARNING';
    recomendacao =
      req.temperatura > 85
        ? 'Temperatura crítica. Verificar sistema de refrigeração e reduzir carga imediatamente.'
        : 'Vibração excessiva. Inspecionar rolamentos e fixações. Programar manutenção em 24h.';
  } else if (medRisk) {
    probabilidade_falha = parseFloat((30 + Math.random() * 30).toFixed(1));
    status_previsto = 'WARNING';
    recomendacao =
      'Parâmetros próximos ao limiar. Monitorar continuamente e agendar inspeção preventiva.';
  } else {
    probabilidade_falha = parseFloat((2 + Math.random() * 18).toFixed(1));
    status_previsto = 'OPERATIONAL';
    recomendacao = 'Operação normal. Próxima manutenção preventiva conforme cronograma.';
  }

  return {
    device_id: req.device_id,
    status_previsto,
    probabilidade_falha,
    recomendacao,
    modelo_versao: 'v2.1.0-RandomForest',
  };
}

