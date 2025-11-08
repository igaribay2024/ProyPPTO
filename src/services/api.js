import axios from 'axios';

// En desarrollo usamos el proxy de CRA (package.json -> proxy). Por eso baseURL es
// cadena vacía en development para permitir rutas relativas como '/api/...'.
const baseURL =
  process.env.NODE_ENV === 'development'
    ? ''
    : process.env.REACT_APP_API_BASE || 'http://localhost:3001';

const api = axios.create({
  baseURL,
  headers: { 
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache'
  },
  // timeout: 10000, // opcional
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
