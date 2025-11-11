import React, { useState } from 'react';
import './Login.css';
import { login } from '../services/auth';
import { useNavigate } from 'react-router-dom';
import mipres from '../assets/mipres.jpg';

const Login = ({ setUser }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const emailTrimmed = (email || '').toString().trim();
      const passwordTrimmed = (password || '').toString().trim();
      const response = await login(emailTrimmed, passwordTrimmed);
      console.log('Login response:', response);
      if (response && response.token) {
        if (typeof setUser === 'function') setUser(response.user || response);
        try { navigate('/dashboard', { replace: true }); } catch (e) {}
      } else {
        setError('Login successful but no token received');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <div className="login-card" role="main" aria-labelledby="login-title">
        <div className="login-card-inner">
          <div className="logo-wrap" aria-hidden="true">
            {/* Load mipres.jpg as an imported asset to let webpack handle it */}
            <img src={mipres} alt="logo" className="camera-img" />
          </div>
          <h1 id="login-title" className="login-title">USER LOGIN</h1>
          {error && <p className="login-error">{error}</p>}
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <input
                type="email"
                id="email"
                placeholder="Email ID"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-label="Email"
              />
            </div>
            <div className="input-group">
              <input
                type="password"
                id="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-label="Password"
              />
            </div>

            <div className="login-controls">
              <label className="remember">
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                <span>Remember me</span>
              </label>
              <a className="forgot" href="#/reset">Forgot Password?</a>
            </div>

            <button type="submit" className="login-button" disabled={loading} aria-disabled={loading}>
              {loading ? 'Logging in...' : 'LOGIN'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;