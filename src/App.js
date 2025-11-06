import React, { useState, useEffect } from 'react';
import Login from './components/Login';
// Presupuestos and Gastos are loaded via the dashboard routes/components when needed
// and should not be imported here to avoid unused-import warnings.
import Welcome from './components/Welcome';
import Dashboard from './dashboard/dashboard';

function App() {
  const [user, setUser] = useState(null);
  const [showDashboard, setShowDashboard] = useState(false);

  // Inicializar sesión desde localStorage si existe
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        // parsed may be { token, user } or just token/user depending on previous code
        const userObj = parsed?.user || (parsed?.email ? parsed : null);
        if (userObj) setUser(userObj);
      }
    } catch (err) {
      // ignore
    }
  }, []);

  if (!user) return <Login setUser={setUser} />;

  if (!showDashboard) {
    return (
      <Welcome
        user={user}
        onEnter={() => setShowDashboard(true)}
        setUser={setUser}
      />
    );
  }

  return <Dashboard user={user} />;
}

export default App;