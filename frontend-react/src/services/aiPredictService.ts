import { ModelTrainingDataInfo, ModelTrainingStatus, PredictRequest, PredictResponse } from '../types';
import { api } from './api';

// The browser talks only to the Java backend. The backend forwards this request
// to Flask and returns the prediction to the UI.
export async function predict(req: PredictRequest): Promise<PredictResponse> {
  const { data } = await api.post<PredictResponse>('/api/v1/predicoes', req, { timeout: 30000 });
  return data;
}

export async function startModelTraining(): Promise<ModelTrainingStatus> {
  const { data } = await api.post<ModelTrainingStatus>('/api/v1/treinamentos', {}, { timeout: 10000 });
  return data;
}

export async function getModelTrainingStatus(): Promise<ModelTrainingStatus> {
  const { data } = await api.get<ModelTrainingStatus>('/api/v1/treinamentos/status');
  return data;
}

export async function getModelTrainingDataInfo(): Promise<ModelTrainingDataInfo> {
  const { data } = await api.get<ModelTrainingDataInfo>('/api/v1/treinamentos/data-info', { timeout: 30000 });
  return data;
}
