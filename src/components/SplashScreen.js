import React, { useState, useEffect } from 'react';

const SplashScreen = () => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('Iniciando sistema...');
  
  const loadingSteps = [
    'Iniciando sistema...',
    'Cargando configuración...',
    'Conectando a la base de datos...',
    'Preparando interfaz...',
    'Sistema listo'
  ];

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        const currentIndex = loadingSteps.indexOf(prev);
        if (currentIndex < loadingSteps.length - 1) {
          return loadingSteps[currentIndex + 1];
        }
        clearInterval(stepInterval);
        return prev;
      });
    }, 1200);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-slate-900 via-teal-900 to-cyan-900">
      {/* Fondo animado con partículas */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/30 rounded-full animate-ping"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>
      
      {/* Ondas de fondo */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-600/10 to-cyan-600/10 animate-pulse" />
        <div 
          className="absolute inset-0 bg-gradient-to-t from-cyan-500/5 to-transparent transform -skew-y-12" 
          style={{ animationDelay: '1s' }}
        />
      </div>

      {/* Contenedor principal */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-8">
        <div className="relative">
          {/* Efectos de resplandor */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 via-teal-400/10 to-cyan-400/20 rounded-3xl blur-2xl animate-pulse" />
          <div className="absolute inset-0 bg-white/5 rounded-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
          
          {/* Tarjeta principal */}
          <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-12 shadow-2xl border border-white/20">
            <div className="text-center space-y-8">
              
              {/* Logo con efectos mejorados */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/30 to-teal-400/30 rounded-full blur-3xl group-hover:blur-2xl transition-all duration-500 animate-pulse" />
                <div className="relative">
                  <div className="w-40 h-40 mx-auto rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center backdrop-blur-sm border border-white/30 shadow-2xl">
                    <div className="text-6xl font-bold text-transparent bg-gradient-to-r from-cyan-300 to-teal-300 bg-clip-text">
                      SIEL
                    </div>
                  </div>
                </div>
              </div>

              {/* Título principal */}
              <div className="space-y-3">
                <h1 className="text-5xl font-bold text-white tracking-wide">
                  <span className="bg-gradient-to-r from-cyan-300 via-white to-teal-300 bg-clip-text text-transparent">
                    Grupo SIEL
                  </span>
                </h1>
                <p className="text-cyan-100/90 text-xl font-light tracking-widest uppercase">
                  Sistema de Punto de Venta
                </p>
                <div className="w-24 h-1 bg-gradient-to-r from-cyan-400 to-teal-400 mx-auto rounded-full" />
              </div>

              {/* Barra de progreso mejorada */}
              <div className="space-y-4">
                <div className="relative w-80 mx-auto">
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 rounded-full transition-all duration-300 ease-out shadow-lg"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-sm text-cyan-200/80">
                    <span>0%</span>
                    <span className="font-medium">{Math.round(progress)}%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Spinner circular mejorado */}
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-white/10" />
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-400 border-r-teal-400 animate-spin" />
                  <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-cyan-300 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }} />
                </div>

                {/* Estado de carga dinámico */}
                <div className="space-y-2">
                  <p className="text-cyan-200/90 text-lg font-medium animate-pulse">
                    {currentStep}
                  </p>
                  <div className="flex justify-center space-x-1">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.2}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Elementos decorativos flotantes */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-32 h-32 rounded-full border border-white/10 animate-ping"
            style={{
              left: `${10 + (i * 12)}%`,
              top: `${20 + (i * 8)}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: '3s'
            }}
          />
        ))}
      </div>

      {/* Efectos de luz en las esquinas */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-cyan-400/20 to-transparent rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-teal-400/20 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
    </div>
  );
};

export default SplashScreen;