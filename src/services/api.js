import axios from 'axios';

// Configuration for different environments
const getBaseURL = () => {
  if (process.env.NODE_ENV === 'development') {
    // En desarrollo, usar localhost para las functions de Vercel
    return 'http://localhost:3000';
  }
  
  // Production environment - Vercel deployment
  return process.env.REACT_APP_API_URL || 'https://proy-ppto.vercel.app';
};

const baseURL = getBaseURL();

const api = axios.create({
  baseURL,
  headers: { 
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache'
  },
  timeout: 30000, // Increased timeout for Vercel Functions
  withCredentials: false // Vercel CORS configuration
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

// Add response interceptor to handle database failures with mock data fallback
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.log('API Error:', error.message);
    
    // If request failed and it's a data endpoint, try mock data
    if (error.config?.url?.includes('/api/gastos') || 
        error.config?.url?.includes('/api/presupuestos')) {
      console.log('🔄 BD failed, trying mock data...');
      
      try {
        const mockResponse = await axios.get(`${baseURL}/api/debug/mock`, {
          timeout: 10000
        });
        
        if (mockResponse.data?.success) {
          console.log('✅ Mock data loaded successfully');
          
          // Return appropriate mock data based on original endpoint
          if (error.config.url.includes('/api/gastos')) {
            return {
              ...mockResponse,
              data: mockResponse.data.data.gastos || []
            };
          } else if (error.config.url.includes('/api/presupuestos')) {
            return {
              ...mockResponse,
              data: mockResponse.data.data.presupuestos || []
            };
          }
        }
      } catch (mockError) {
        console.log('❌ Mock data also failed:', mockError.message);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;

export function clearAuth() {
  try {
    localStorage.removeItem('user');
  } catch (e) {}
}
