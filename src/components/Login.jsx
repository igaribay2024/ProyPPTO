import React, { useState } from 'react';
import './Login.css';
import { login } from '../services/auth';
import { useNavigate } from 'react-router-dom';

const Login = ({ setUser }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Trim inputs to avoid accidental leading/trailing spaces coming from the form
      const emailTrimmed = (email || '').toString().trim();
      const passwordTrimmed = (password || '').toString().trim();
      const response = await login(emailTrimmed, passwordTrimmed);
      console.log('Login response:', response); // Para depuración
      
      if (response.token) {
        // Guardar usuario en el estado de la app si se proporcionó setUser
        if (typeof setUser === 'function') setUser(response.user || response);
        // redirect immediately after successful login
        try { navigate('/dashboard', { replace: true }); } catch (e) {}
        // Redirigir al usuario después del login exitoso (App controla vista)
      } else {
        setError('Login successful but no token received');
      }
    } catch (err) {
      console.error('Login error:', err); // Para depuración
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default Login;