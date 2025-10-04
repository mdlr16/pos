import React from 'react';
import ReactDOM from 'react-dom/client'; // Asegúrate de que estés importando 'react-dom/client' para usar createRoot
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

// Usamos createRoot en lugar de ReactDOM.render
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);

// Registrar el service worker para habilitar PWA
serviceWorkerRegistration.register();
