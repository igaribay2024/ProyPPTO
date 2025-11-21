import axios from 'axios';

// Configuration for different environments
const getBaseURL = () => {
  if (process.env.NODE_ENV === 'development') {
    // En desarrollo usamos el proxy de CRA (package.json -> proxy)
    return '';
  }
  
  // Production environment
  return process.env.REACT_APP_API_URL || 'https://altexppto-api.azurewebsites.net';
};

const baseURL = getBaseURL();

const api = axios.create({
  baseURL,
  headers: { 
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache'
  },
  timeout: 30000, // Increased timeout for Azure
  withCredentials: false // Azure CORS configuration
});
// Automatically attach Authorization header if token is present in localStorage
api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('user');
    if (stored) {
      const parsed = JSON.parse(stored);
      const token = parsed?.token || parsed;
      if (token) config.headers = { ...(config.headers || {}), Authorization: `Bearer ${token}` };
    }
  } catch (err) {
    // ignore JSON parse or localStorage errors
  }
  return config;
});

export default api;

export function clearAuth() {
  try {
    localStorage.removeItem('user');
  } catch (e) {}
}
