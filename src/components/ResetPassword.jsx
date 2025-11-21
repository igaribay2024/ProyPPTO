import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = verify email+secret, 2 = set new password
  const [email, setEmail] = useState('');
  const [secret, setSecret] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const api = async (path, body) => {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  };

  const handleVerify = async (e) => {
    e && e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { ok, status } = await api('/api/reset-password', { email, secret });
      if (ok) {
        setStep(2);
      } else {
        // failure: show message and redirect to main page on accept
        window.alert('Alguno de los valores no coinciden');
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError('Error verificando los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e && e.preventDefault();
    setError('');
    if (!newPassword) return setError('Ingrese la nueva contraseña');
    if (newPassword !== confirmPassword) return setError('Las contraseñas no coinciden');
    setLoading(true);
    try {
      const { ok } = await api('/api/reset-password', { email, secret, newPassword });
      if (ok) {
        window.alert('Contraseña cambiada correctamente. Serás redirigido a la página principal.');
        navigate('/', { replace: true });
      } else {
        window.alert('Alguno de los valores no coinciden');
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError('Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 18 }}>
      <h2>Recuperar contraseña</h2>
      {step === 1 && (
        <form onSubmit={handleVerify}>
          <div style={{ marginBottom: 8 }}>
            <label>Email:</label>
            <br />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>Secreto:</label>
            <br />
            <input type="text" value={secret} onChange={e => setSecret(e.target.value)} required maxLength={30} />
          </div>
          {error && <div style={{ color: 'red' }}>{error}</div>}
          <div style={{ marginTop: 12 }}>
            <button type="submit" disabled={loading}>{loading ? 'Verificando...' : 'Verificar'}</button>
            <button type="button" style={{ marginLeft: 8 }} onClick={() => navigate('/', { replace: true })}>Cancelar</button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleChangePassword}>
          <div style={{ marginBottom: 8 }}>
            <label>Nueva contraseña:</label>
            <br />
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>Confirmar contraseña:</label>
            <br />
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
          </div>
          {error && <div style={{ color: 'red' }}>{error}</div>}
          <div style={{ marginTop: 12 }}>
            <button type="submit" disabled={loading}>{loading ? 'Actualizando...' : 'Actualizar contraseña'}</button>
            <button type="button" style={{ marginLeft: 8 }} onClick={() => navigate('/', { replace: true })}>Cancelar</button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ResetPassword;
