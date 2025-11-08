import api from './api';

const LOGIN_PATH = '/api/login'; // ajustar si tu backend usa otro path

export const login = async (email, password) => {
  try {
    // Trim inputs to avoid accidental leading/trailing spaces from the UI
    const payloadEmail = (email || '').toString().trim();
    const payloadPassword = (password || '').toString().trim();
    console.log('Attempting login to:', LOGIN_PATH, 'payload:', { email: payloadEmail, password: payloadPassword ? '***' : '' });
    const response = await api.post(LOGIN_PATH, { email: payloadEmail, password: payloadPassword });
    console.log('Server response status:', response.status, 'data:', response.data);

    if (response.data?.token) {
      // Guardar respuesta completa (token + user) para persistir sesión
      localStorage.setItem('user', JSON.stringify(response.data));
      return response.data;
    }
    throw new Error('No token received from server');
  } catch (error) {
    console.error('Login error object:', error);
    if (!error.response) {
      const hint = error.message?.includes('Network Error')
        ? 'Network Error: comprueba que el backend está en ejecución y habilitó CORS.'
        : `No response from server: ${error.message}`;
      throw new Error(hint);
    }

    const { status, data } = error.response;
    console.error('Response status:', status);
    console.error('Response data:', data);

    const serverMsg = data?.message || data?.error || (typeof data === 'object' ? JSON.stringify(data) : data) || `Request failed with status code ${status}`;
    throw new Error(serverMsg);
  }
};

export const validateToken = async () => {
  try {
    // Expect backend to expose an endpoint that returns current user when token is valid
    const resp = await api.get('/api/me');
    // resp.data should be the user object
    return resp.data;
  } catch (err) {
    console.error('validateToken failed', err);
    throw err;
  }
};