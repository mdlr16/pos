import React, { useState } from 'react';

const RestaurantErrorHandler = ({ 
  error, 
  onRetry, 
  onDismiss, 
  canRetry = false,
  showDiagnostic,
  mesasHook 
}) => {
  
  const [showDetails, setShowDetails] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  if (!error) return null;

  const handleRetry = async () => {
    if (!onRetry || isRetrying) return;
    
    setIsRetrying(true);
    try {
      await onRetry();
    } catch (retryError) {
      console.error('Error en retry:', retryError);
    } finally {
      setIsRetrying(false);
    }
  };

  const getErrorIcon = () => {
    if (error.message.includes('conexión') || error.message.includes('network')) {
      return '🌐';
    } else if (error.message.includes('API Key') || error.message.includes('autenticación')) {
      return '🔐';
    } else if (error.message.includes('404') || error.message.includes('no encontrado')) {
      return '🔍';
    } else if (error.message.includes('configuración')) {
      return '⚙️';
    } else {
      return '❌';
    }
  };

  const getErrorCategory = () => {
    if (error.message.includes('conexión') || error.message.includes('network')) {
      return 'Conectividad';
    } else if (error.message.includes('API Key') || error.message.includes('autenticación')) {
      return 'Autenticación';
    } else if (error.message.includes('configuración')) {
      return 'Configuración';
    } else if (error.message.includes('404')) {
      return 'Recurso no encontrado';
    } else {
      return 'Error del sistema';
    }
  };

  const getSolutions = () => {
    const category = getErrorCategory();
    const solutions = [];

    switch (category) {
      case 'Conectividad':
        solutions.push('Verifique su conexión a internet');
        solutions.push('Confirme que el servidor esté disponible');
        solutions.push('Revise la URL del sistema en la configuración');
        break;
        
      case 'Autenticación':
        solutions.push('Verifique que la API Key esté configurada correctamente');
        solutions.push('Confirme que el usuario tenga permisos de API');
        solutions.push('Verifique que el módulo API de Dolibarr esté activado');
        break;
        
      case 'Configuración':
        solutions.push('Complete la configuración inicial del sistema');
        solutions.push('Verifique las variables de entorno');
        solutions.push('Active el modo restaurante en la configuración');
        break;
        
      case 'Recurso no encontrado':
        solutions.push('Ejecute el script de instalación');
        solutions.push('Complete la configuración inicial del restaurante');
        solutions.push('Verifique que las tablas estén creadas');
        break;
        
      default:
        solutions.push('Contacte al administrador del sistema');
        solutions.push('Revise los logs del servidor para más detalles');
        solutions.push('Ejecute el diagnóstico completo del sistema');
    }

    return solutions;
  };

  const formatTimestamp = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return 'Fecha no válida';
    }
  };

  return (
    <div className="fixed top-4 right-4 left-4 md:left-auto md:w-96 bg-white border border-red-200 rounded-lg shadow-lg z-50">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 bg-red-50 border-b border-red-200 rounded-t-lg">
        <span className="text-2xl">{getErrorIcon()}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-red-900">
            Error en {getErrorCategory()}
          </h3>
          <p className="text-sm text-red-700 mt-1 break-words">
            {error.message}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Timestamp */}
        {error.timestamp && (
          <div className="text-xs text-gray-500 mb-3">
            {formatTimestamp(error.timestamp)}
          </div>
        )}

        {/* Solutions */}
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2 text-sm">Soluciones sugeridas:</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            {getSolutions().map((solution, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>{solution}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mb-3">
          {canRetry && onRetry && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded text-sm transition-colors disabled:bg-blue-300"
            >
              {isRetrying ? (
                <>
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                  Reintentando...
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reintentar
                </>
              )}
            </button>
          )}
          
          {showDiagnostic && (
            <button
              onClick={showDiagnostic}
              className="flex items-center gap-1 bg-purple-500 hover:bg-purple-600 text-white px-3 py-1.5 rounded text-sm transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Diagnóstico
            </button>
          )}
          
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 bg-gray-500 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {showDetails ? 'Ocultar' : 'Detalles'}
          </button>
        </div>

        {/* Technical Details */}
        {showDetails && (
          <div className="bg-gray-50 rounded p-3 text-xs">
            <h5 className="font-medium mb-2">Información técnica:</h5>
            <div className="space-y-1 text-gray-600">
              <div><strong>Contexto:</strong> {error.context || 'No especificado'}</div>
              <div><strong>Mensaje técnico:</strong> {error.technical || error.message}</div>
              <div><strong>Reintentable:</strong> {error.retryable ? 'Sí' : 'No'}</div>
              {mesasHook && (
                <>
                  <div><strong>Estado del hook:</strong></div>
                  <div className="ml-2">
                    <div>• Configurado: {mesasHook.isConfigured ? 'Sí' : 'No'}</div>
                    <div>• Necesita setup: {mesasHook.needsSetup ? 'Sí' : 'No'}</div>
                    <div>• Total mesas: {mesasHook.totalMesas || 0}</div>
                    <div>• Loading: {mesasHook.isLoading ? 'Sí' : 'No'}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Progress bar si está reintentando */}
      {isRetrying && (
        <div className="h-1 bg-gray-200 rounded-b-lg overflow-hidden">
          <div className="h-full bg-blue-500 animate-pulse"></div>
        </div>
      )}
    </div>
  );
};

// Componente adicional para mostrar estado del sistema
const RestaurantSystemStatus = ({ mesasHook, compact = false }) => {
  if (!mesasHook) return null;

  const getStatusColor = () => {
    if (mesasHook.hasError) return 'bg-red-100 text-red-800 border-red-200';
    if (mesasHook.isLoading) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (!mesasHook.isConfigured) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const getStatusIcon = () => {
    if (mesasHook.hasError) return '❌';
    if (mesasHook.isLoading) return '⏳';
    if (!mesasHook.isConfigured) return '⚙️';
    return '✅';
  };

  const getStatusText = () => {
    if (mesasHook.hasError) return 'Error en el sistema';
    if (mesasHook.isLoading) return 'Cargando...';
    if (!mesasHook.isConfigured) return 'Requiere configuración';
    return 'Sistema operativo';
  };

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs border ${getStatusColor()}`}>
        <span>{getStatusIcon()}</span>
        <span>{getStatusText()}</span>
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-lg border ${getStatusColor()}`}>
      <div className="flex items-center gap-3">
        <span className="text-lg">{getStatusIcon()}</span>
        <div className="flex-1">
          <h4 className="font-medium">{getStatusText()}</h4>
          <div className="text-sm opacity-75 mt-1">
            {mesasHook.totalMesas} mesas configuradas • 
            {mesasHook.mesas?.length || 0} operativas
            {mesasHook.retryCount > 0 && ` • Reintentos: ${mesasHook.retryCount}`}
          </div>
        </div>
      </div>
    </div>
  );
};

export { RestaurantErrorHandler as default, RestaurantSystemStatus };