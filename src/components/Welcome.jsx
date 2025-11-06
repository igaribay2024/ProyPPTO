import React from 'react';

export default function Welcome({ user, onEnter, setUser }) {
  const nombre =
    user?.nombre || user?.name || (typeof user === 'string' ? user : 'Usuario');

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Bienvenido, {nombre}</h1>
      <p>Has ingresado correctamente.</p>
      <div style={{ marginTop: 16 }}>
        <button onClick={onEnter} style={{ marginRight: 8 }}>
          Ir al dashboard
        </button>
        <button onClick={handleLogout}>Cerrar sesión</button>
      </div>
    </div>
  );
}