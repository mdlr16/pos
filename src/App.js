import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SplashScreen from './components/SplashScreen';

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    // Simulamos un tiempo de carga
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Mostramos el splash screen mientras carga
  if (isLoading) {
    return <SplashScreen />;
  }

  // Una vez cargado, mostramos el contenido principal con una animación de fade
  return (
    <div className={`min-h-screen transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
      {user ? <Dashboard /> : <Login />}
    </div>
  );
};

export default App;