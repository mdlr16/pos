import React, { useEffect } from 'react';
import PropTypes from 'prop-types';

const Alert = ({ 
  message, 
  type = 'success', 
  onClose, 
  autoClose = true, 
  autoCloseDuration = 5000
}) => {
  // Estilos base mejorados
  const baseStyles = 'fixed z-50 p-6 rounded-xl border-2 shadow-2xl flex items-center justify-between transition-all duration-300';
  
  // Estilos por tipo con mayor contraste
  const typeStyles = {
    success: 'bg-green-50 text-green-900 border-green-500',
    error: 'bg-red-50 text-red-900 border-red-500',
    warning: 'bg-yellow-50 text-yellow-900 border-yellow-500',
    info: 'bg-blue-50 text-blue-900 border-blue-500',
  };

  // Íconos grandes
  const typeIcons = {
    success: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    warning: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  useEffect(() => {
    if (autoClose && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDuration);

      return () => clearTimeout(timer);
    }
  }, [autoClose, autoCloseDuration, onClose]);

  return (
    <div 
      className={`inset-0 m-auto ${baseStyles} ${typeStyles[type]}`}
      style={{
        width: 'fit-content',
        height: 'fit-content',
        maxWidth: '90%',
        animation: 'fadeIn 0.3s ease-out',
        backdropFilter: 'blur(4px)',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
      }}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center">
        <span className="mr-4">{typeIcons[type]}</span>
        <span className="text-xl font-semibold">{message}</span>
      </div>
      
      {onClose && (
        <button 
          className="ml-6 text-3xl font-bold opacity-70 hover:opacity-100 focus:outline-none"
          onClick={onClose}
          aria-label="Cerrar alerta"
          style={{ lineHeight: '1' }}
        >
          &times;
        </button>
      )}
      
      {/* Barra de progreso */}
      {autoClose && (
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black bg-opacity-10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-black bg-opacity-30"
            style={{
              animation: `progress ${autoCloseDuration}ms linear forwards`,
              animationPlayState: 'running'
            }}
          ></div>
        </div>
      )}
    </div>
  );
};

Alert.propTypes = {
  message: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['success', 'error', 'warning', 'info']),
  onClose: PropTypes.func,
  autoClose: PropTypes.bool,
  autoCloseDuration: PropTypes.number,
};

export default Alert;