import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

let idCounter = 1;

export function useToast() {
  return useContext(ToastContext);
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((message, type = 'info', timeout = 4000) => {
    const id = idCounter++;
    const t = { id, message, type };
    setToasts((s) => [...s, t]);
    if (timeout > 0) {
      setTimeout(() => {
        setToasts((s) => s.filter(x => x.id !== id));
      }, timeout);
    }
    return id;
  }, []);

  const remove = useCallback((id) => setToasts((s) => s.filter(x => x.id !== id)), []);

  return (
    <ToastContext.Provider value={{ add, remove }}>
      {children}
      <div style={containerStyle} aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} style={{...toastStyle, ...(t.type === 'error' ? toastErrorStyle : t.type === 'success' ? toastSuccessStyle : {})}}>
            {t.message}
            <button onClick={() => remove(t.id)} style={closeBtnStyle}>✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const containerStyle = {
  position: 'fixed',
  right: 20,
  bottom: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  zIndex: 2000
};

const toastStyle = {
  minWidth: 260,
  background: 'rgba(0,0,0,0.8)',
  color: '#fff',
  padding: '10px 14px',
  borderRadius: 10,
  boxShadow: '0 6px 18px rgba(0,0,0,0.2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
};

const toastSuccessStyle = { background: 'linear-gradient(90deg,#059669,#10b981)' };
const toastErrorStyle = { background: 'linear-gradient(90deg,#dc2626,#ef4444)' };

const closeBtnStyle = {
  background: 'transparent',
  border: 'none',
  color: 'rgba(255,255,255,0.9)',
  cursor: 'pointer',
  fontSize: 14,
};
