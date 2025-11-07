import React, { createContext, useContext, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

const NotifierContext = createContext(null);

export function NotifierProvider({ children }) {
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'info' });

  const notify = (message, severity = 'info', options = {}) => {
    const msg = typeof message === 'string' ? message : JSON.stringify(message);
    setSnack({ open: true, message: msg, severity: severity || 'info', ...options });
  };

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnack(s => ({ ...s, open: false }));
  };

  return (
    <NotifierContext.Provider value={notify}>
      {children}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleClose} severity={snack.severity} variant="filled" sx={{ width: '100%' }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </NotifierContext.Provider>
  );
}

export function useNotifier() {
  const ctx = useContext(NotifierContext);
  if (!ctx) throw new Error('useNotifier must be used within NotifierProvider');
  return ctx;
}
