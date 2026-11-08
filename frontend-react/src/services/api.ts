import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const AI_BASE_URL = import.meta.env.VITE_AI_BASE_URL || 'http://localhost:5000';

export const api = axios.create({ baseURL: BASE_URL, timeout: 5000 });
export const aiApi = axios.create({ baseURL: AI_BASE_URL, timeout: 5000 });

