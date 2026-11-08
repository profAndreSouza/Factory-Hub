import { PredictRequest, PredictResponse } from '../types';
import { api } from './api';

// The browser talks only to the Java backend. The backend forwards this request
// to Flask and returns the prediction to the UI.
export async function predict(req: PredictRequest): Promise<PredictResponse> {
  const { data } = await api.post<PredictResponse>('/api/v1/predicoes', req, { timeout: 30000 });
  return data;
}
