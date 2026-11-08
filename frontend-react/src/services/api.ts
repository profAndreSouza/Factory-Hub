import axios from 'axios';

// Relative URLs go through the Vite proxy in development and Nginx in Docker.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const api = axios.create({ baseURL: BASE_URL, timeout: 5000 });

