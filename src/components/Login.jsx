import React, { useState } from 'react';
import './Login.css';
import { login } from '../services/auth';
import { useNavigate, Link } from 'react-router-dom';
// Using public/mipres.jpg to avoid bundling issues; place the file in public/ (served at /mipres.jpg)

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

  const [showImg, setShowImg] = useState(true);

  return (
    <div className="login-bg">
      {/* decorative background image (non-interactive) behind the login card - set via inline style so webpack/CSS loader doesn't try to resolve the file */}
      <div aria-hidden="true" className="login-bg-img" style={{
        backgroundImage: "url('/Fondo.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: 0.15
      }} />
      <div className="login-card" role="main" aria-labelledby="login-title">
        <div className="login-card-inner">
          <div className="logo-wrap" aria-hidden="true">
            {/* Load mipres.jpg from public/ with cache-busting timestamp. If it fails, show inline SVG fallback */}
            {showImg && (
              <img
                src={`${process.env.PUBLIC_URL || ''}/mipres.jpg?_ts=${new Date().getTime()}`}
                alt="logo"
                className="camera-img"
                onError={(e) => { setShowImg(false); }}
              />
            )}
            {!showImg && (
              <svg className="camera-icon" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect x="8" y="20" width="48" height="32" rx="3" ry="3" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
                <circle cx="32" cy="36" r="8" fill="rgba(255,255,255,0.85)" />
                <path d="M20 20 L24 14 H40 L44 20" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
              </svg>
            )}
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
              <Link className="forgot" to="/reset">Forgot Password?</Link>
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