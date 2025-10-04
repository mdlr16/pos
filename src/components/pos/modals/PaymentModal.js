import React, { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { AuthContext } from '../../../context/AuthContext';

const PaymentModal = ({
  isOpen,
  onClose,
  terminal = { 
    name: 'Terminal POS', 
    payment_methods: [
      { rowid: 1, label: 'Efectivo' },
      { rowid: 2, label: 'Tarjeta' }
    ]
  },
  total = 0,
  saldo = 0,
  payments = [],
  newPaymentAmount = 0,
  setNewPaymentAmount = () => {},
  selectedPaymentMethod = '',
  setSelectedPaymentMethod = () => {},
  handleAddPayment = () => {},
  handleSaveFactura = () => {},
  // 🔥 PROPS PARA PAGOS REALES
  isProcessingPayment = false,
  paymentResults = [],
  getPaymentSummary = null,
  // 🔥 PROPS PARA MANEJO DE PAGOS
  removePayment = null,
  clearAllPayments = null,
  editPayment = null,
  // 🔥 NUEVOS PROPS PARA DIAGNÓSTICO DEL SISTEMA
  partialPaymentsSupported = null,
  migrationStatus = null,
  endpointTestResult = null,
  getPaymentSystemDiagnostics = null
}) => {
  const { variables } = useContext(AuthContext);
  
  // 🍽️ DETECTAR MODO RESTAURANTE
  const isRestaurantMode = variables?.SPOS_RESTAURANTE === "1";
  
  // Estados locales
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [editingPaymentIndex, setEditingPaymentIndex] = useState(null);
  const [editAmount, setEditAmount] = useState(0);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const [showSystemInfo, setShowSystemInfo] = useState(false);

  // Detectar tamaño de pantalla
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animación de entrada
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      // Resetear estados de edición al abrir
      setEditingPaymentIndex(null);
      setEditAmount(0);
      setShowPaymentDetails(false);
      setShowSystemInfo(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 🔥 MANEJO MEJORADO DEL CIERRE CON CONFIRMACIÓN
  const handleClose = () => {
    if (isProcessingPayment) {
      return; // No cerrar mientras se procesan pagos
    }
    
    // Si hay pagos agregados, mostrar confirmación
    if (payments.length > 0) {
      setShowCloseConfirmation(true);
      return;
    }
    
    // Cerrar directamente si no hay pagos
    closeModal();
  };

  // Cerrar modal con animación
  const closeModal = () => {
    setIsAnimating(false);
    setShowCloseConfirmation(false);
    setTimeout(() => onClose(), 200);
  };

  // 🔥 CONFIRMAR CIERRE CON LIMPIEZA DE PAGOS
  const confirmCloseWithClear = () => {
    if (clearAllPayments) {
      clearAllPayments();
    }
    closeModal();
  };

  // 🔥 CÁLCULOS MEJORADOS CON SUMMARY
  const paymentSummary = getPaymentSummary ? getPaymentSummary() : {
    totalAmount: total,
    totalPaid: payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0),
    remainingAmount: total - payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0),
    isComplete: (total - payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0)) <= 0,
    paymentCount: payments.length,
    processedCount: 0,
    allProcessed: false,
    restaurantMode: isRestaurantMode,
    readyForDolibarr: false,
    partialPaymentsSupported: partialPaymentsSupported,
    systemCapabilities: {
      multiplePayments: false,
      paymentDeletion: false,
      automaticFallback: false,
      realTimeStatus: false
    }
  };

  const { totalPaid, remainingAmount, isComplete, systemCapabilities } = paymentSummary;
  const porcentajePagado = total > 0 ? (totalPaid / total) * 100 : 0;

  // 🔥 FUNCIÓN MEJORADA PARA ELIMINAR PAGO
  const handleRemovePayment = (index) => {
    if (isProcessingPayment || !removePayment) return;
    
    const payment = payments[index];
    if (!payment) return;
    
    const confirmMessage = `¿Eliminar pago de ${payment.method} por Q.${payment.amount.toFixed(2)}?`;
    
    if (window.confirm(confirmMessage)) {
      removePayment(index);
      
      // Si era el último pago, resetear estados de edición
      if (payments.length === 1) {
        setEditingPaymentIndex(null);
        setEditAmount(0);
      }
    }
  };

  // 🔥 FUNCIÓN MEJORADA PARA EDITAR PAGO
  const handleEditPayment = (index) => {
    if (isProcessingPayment || !editPayment) return;
    
    setEditingPaymentIndex(index);
    setEditAmount(payments[index]?.amount || 0);
  };

  // 🔥 FUNCIÓN PARA GUARDAR EDICIÓN
  const handleSaveEdit = () => {
    if (editPayment && editingPaymentIndex !== null && editAmount > 0) {
      editPayment(editingPaymentIndex, editAmount);
    }
    setEditingPaymentIndex(null);
    setEditAmount(0);
  };

  // 🔥 FUNCIÓN PARA CANCELAR EDICIÓN
  const handleCancelEdit = () => {
    setEditingPaymentIndex(null);
    setEditAmount(0);
  };

  // 🔥 ICONOS MEJORADOS PARA MÉTODOS DE PAGO
  const getPaymentIcon = (method) => {
    const methodLower = method.toLowerCase();
    
    if (methodLower.includes('efectivo') || methodLower.includes('cash')) {
      return (
        <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center shadow-sm">
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        </div>
      );
    }
    
    if (methodLower.includes('tarjeta') || methodLower.includes('card') || methodLower.includes('débito') || methodLower.includes('crédito')) {
      return (
        <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-sm">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
      );
    }
    
    if (methodLower.includes('transferencia') || methodLower.includes('transfer')) {
      return (
        <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center shadow-sm">
          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
      );
    }
    
    // Método de pago genérico
    return (
      <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center shadow-sm">
        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      </div>
    );
  };

  // 🔥 COMPONENTE MEJORADO DE ESTADO DE PROCESAMIENTO
  const ProcessingStatus = () => {
    if (!isProcessingPayment && paymentResults.length === 0) return null;

    return (
      <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-sm">
        <div className="flex items-center space-x-3 mb-3">
          {isProcessingPayment ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
              <div>
                <span className="text-sm font-semibold text-blue-700">Procesando pagos en Dolibarr...</span>
                <div className="text-xs text-blue-600 mt-1">
                  {partialPaymentsSupported ? 
                    'Usando endpoint personalizado con soporte completo' :
                    'Usando API estándar con fallback automático'
                  }
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <span className="text-sm font-semibold text-green-700">Pagos procesados exitosamente</span>
                <div className="text-xs text-green-600 mt-1">Todos los pagos han sido registrados</div>
              </div>
            </>
          )}
        </div>
        
        {paymentResults.length > 0 && (
          <div className="bg-white/50 rounded-lg p-3 space-y-2">
            {paymentResults.map((result, index) => (
              <div key={index} className={`flex justify-between items-center text-sm ${
                result.success ? 'text-green-700' : 'text-red-700'
              }`}>
                <span className="font-medium">{result.method}</span>
                <div className="flex items-center space-x-2">
                  <span>Q.{result.amount.toFixed(2)}</span>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                    result.success ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} 
                        d={result.success ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // 🍽️ COMPONENTE MEJORADO PARA MODO RESTAURANTE
  const RestaurantModeIndicator = () => {
    if (!isRestaurantMode) return null;

    return (
      <div className="mb-4 p-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-orange-700 flex items-center">
                Modo Restaurante
                <span className="ml-2 px-2 py-0.5 bg-orange-200 text-orange-800 text-xs rounded-full font-medium">
                  ACTIVO
                </span>
              </div>
              <div className="text-xs text-orange-600 mt-1">
                {partialPaymentsSupported ? 
                  'Pagos parciales múltiples soportados completamente' :
                  'Fallback automático a API estándar disponible'
                }
              </div>
            </div>
          </div>
          
          {/* Botón de información del sistema */}
          <button
            onClick={() => setShowSystemInfo(!showSystemInfo)}
            className="text-orange-600 hover:text-orange-800 p-1 rounded transition-colors"
            title="Información del sistema"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
        
        {/* 🔥 INFORMACIÓN EXPANDIDA DEL SISTEMA */}
        {showSystemInfo && (
          <div className="mt-3 p-3 bg-white/70 rounded-lg border border-orange-200">
            <div className="text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-orange-700 font-medium">Endpoint personalizado:</span>
                <span className={partialPaymentsSupported ? 'text-green-600' : 'text-red-600'}>
                  {partialPaymentsSupported ? '✓ Disponible' : '✗ No disponible'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-orange-700 font-medium">Pagos múltiples:</span>
                <span className={systemCapabilities?.multiplePayments ? 'text-green-600' : 'text-yellow-600'}>
                  {systemCapabilities?.multiplePayments ? '✓ Soportado' : '⚠️ Fallback disponible'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-orange-700 font-medium">Eliminación de pagos:</span>
                <span className={systemCapabilities?.paymentDeletion ? 'text-green-600' : 'text-gray-500'}>
                  {systemCapabilities?.paymentDeletion ? '✓ Soportado' : '– No disponible'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-orange-700 font-medium">Fallback automático:</span>
                <span className="text-blue-600">
                  {systemCapabilities?.automaticFallback ? '✓ Habilitado' : '– Configurar'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 🔥 COMPONENTE MEJORADO PARA MOSTRAR UN PAGO INDIVIDUAL
  const PaymentItem = ({ payment, index, isEditing }) => {
    const paymentResult = paymentResults[index];
    const isProcessed = payment.processed || false;
    const wasModified = payment.modified || false;

    if (isEditing) {
      return (
        <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-xl shadow-sm animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {getPaymentIcon(payment.method)}
              <div>
                <span className="text-sm font-semibold text-gray-900">{payment.method}</span>
                <div className="text-xs text-amber-600 mt-1">Editando monto...</div>
              </div>
            </div>
            <button
              onClick={handleCancelEdit}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-lg transition-colors"
              title="Cancelar edición"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium">Q.</span>
              <input
                type="number"
                className="w-full p-3 pl-8 text-sm border-2 border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white shadow-sm"
                value={editAmount || ''}
                onChange={(e) => setEditAmount(parseFloat(e.target.value) || 0)}
                step="0.01"
                min="0"
                autoFocus
                placeholder="0.00"
              />
            </div>
            <button
              onClick={handleSaveEdit}
              disabled={!editAmount || editAmount <= 0}
              className="px-4 py-3 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl group hover:shadow-md hover:border-gray-300 transition-all duration-200">
        <div className="flex items-center space-x-3">
          {getPaymentIcon(payment.method)}
          <div>
            <span className="text-sm font-semibold text-gray-900">{payment.method}</span>
            
            {/* Estados del pago */}
            <div className="flex items-center space-x-2 mt-1">
              {isProcessed && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-green-600 font-medium">Procesado</span>
                </div>
              )}
              {wasModified && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-xs text-yellow-600 font-medium">Modificado</span>
                </div>
              )}
              {payment.endpointSupported === false && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-xs text-blue-600 font-medium">Fallback</span>
                </div>
              )}
            </div>
            
            {showPaymentDetails && paymentResult && (
              <div className={`text-xs mt-1 flex items-center space-x-1 ${
                paymentResult.success ? 'text-green-600' : 'text-red-600'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  paymentResult.success ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span>{paymentResult.success ? 'Registrado correctamente' : 'Error en registro'}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <span className="font-bold text-lg text-green-600">Q.{payment.amount.toFixed(2)}</span>
            {wasModified && payment.originalAmount && (
              <div className="text-xs text-gray-500 line-through">
                Q.{payment.originalAmount.toFixed(2)}
              </div>
            )}
          </div>
          
          {!isProcessingPayment && (removePayment || editPayment) && (
            <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {editPayment && !isProcessed && (
                <button
                  onClick={() => handleEditPayment(index)}
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                  title="Editar pago"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              {removePayment && (
                <button
                  onClick={() => handleRemovePayment(index)}
                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                  title={isProcessed && partialPaymentsSupported ? "Eliminar pago (también del servidor)" : "Eliminar pago"}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 🔥 MODAL DE CONFIRMACIÓN DE CIERRE
  const CloseConfirmationModal = () => {
    if (!showCloseConfirmation) return null;

    return (
      <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">¿Cerrar y eliminar pagos?</h3>
              <p className="text-sm text-gray-600 mt-1">
                Tienes {payments.length} pago(s) agregado(s)
                {payments.some(p => p.processed) && ' (algunos ya procesados)'}
              </p>
            </div>
          </div>
          
          <p className="text-gray-700 mb-6">
            Si cierras el modal, se eliminarán todos los pagos que has agregado.
            {payments.some(p => p.processed) && partialPaymentsSupported && 
              ' Los pagos ya procesados también se eliminarán del servidor.'
            }
            <br /><br />
            ¿Estás seguro de que deseas continuar?
          </p>
          
          <div className="flex space-x-3">
            <button
              onClick={() => setShowCloseConfirmation(false)}
              className="flex-1 p-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmCloseWithClear}
              className="flex-1 p-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Sí, eliminar pagos
            </button>
          </div>
        </div>
      </div>
    );
  };

  // RENDERIZADO MÓVIL MEJORADO
  if (isMobile) {
    return createPortal(
      <>
        <div className="fixed inset-0 z-50 bg-white">
          <div className="flex flex-col h-full">
            {/* Header fijo con gradiente */}
            <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 safe-area-inset-top">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold">Procesar Pago</h2>
                  <p className="text-blue-100 text-sm">{terminal?.name || 'Terminal POS'}</p>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isProcessingPayment}
                  className={`p-2 rounded-full transition-colors ${
                    isProcessingPayment 
                      ? 'text-blue-300 cursor-not-allowed' 
                      : 'text-blue-100 hover:bg-white/20'
                  }`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Resumen de pago mejorado */}
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-blue-100 text-sm">Total</span>
                  <span className="text-xl font-bold">Q.{total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-blue-100 text-sm">Pagado</span>
                  <span className="font-semibold text-green-300">Q.{totalPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-blue-100 text-sm">Saldo</span>
                  <span className={`font-semibold ${remainingAmount > 0 ? 'text-red-300' : 'text-green-300'}`}>
                    Q.{remainingAmount.toFixed(2)}
                  </span>
                </div>
                
                {/* Barra de progreso mejorada */}
                <div className="relative">
                  <div className="w-full bg-white/20 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        isComplete 
                          ? 'bg-gradient-to-r from-green-400 to-green-500' 
                          : 'bg-gradient-to-r from-yellow-400 to-orange-500'
                      }`}
                      style={{ width: `${Math.min(porcentajePagado, 100)}%` }}
                    ></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-semibold text-white drop-shadow">
                      {porcentajePagado.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contenido scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {/* Indicadores especiales */}
              <RestaurantModeIndicator />
              <ProcessingStatus />

              {/* Lista de pagos mejorada */}
              {payments.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 text-lg flex items-center">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-2">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      Pagos realizados ({payments.length})
                    </h3>
                    {paymentResults.length > 0 && (
                      <button
                        onClick={() => setShowPaymentDetails(!showPaymentDetails)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {showPaymentDetails ? 'Ocultar' : 'Ver'} detalles
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {payments.map((payment, index) => (
                      <PaymentItem
                        key={payment.id || index}
                        payment={payment}
                        index={index}
                        isEditing={editingPaymentIndex === index}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Formulario para nuevo pago mejorado */}
              {!isComplete && !isProcessingPayment && (
                <div className="bg-white border border-blue-200 p-4 rounded-xl shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-4 text-lg flex items-center">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-2">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    Agregar nuevo pago
                  </h3>
                  
                  {/* Selección de método de pago */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Método de pago</label>
                    <select
                      className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                      value={selectedPaymentMethod}
                      onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    >
                      <option value="" disabled>Seleccione método de pago</option>
                      {(terminal?.payment_methods || []).map((method) => (
                        <option key={method.rowid} value={method.label}>{method.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Monto del pago */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Monto a pagar</label>
                    <div className="relative mb-3">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium">Q.</span>
                      <input
                        type="number"
                        className="w-full p-3 pl-8 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                        placeholder="0.00"
                        value={newPaymentAmount || ''}
                        onChange={(e) => setNewPaymentAmount(parseFloat(e.target.value) || 0)}
                        step="0.01"
                        min="0"
                      />
                    </div>
                    
                    {/* Botones de cantidad rápida mejorados */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        className="p-2 bg-blue-50 border border-blue-300 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        onClick={() => setNewPaymentAmount(Math.max(0, remainingAmount))}
                        disabled={remainingAmount <= 0}
                      >
                        Saldo (Q.{Math.max(0, remainingAmount).toFixed(2)})
                      </button>
                      <button
                        className="p-2 bg-green-50 border border-green-300 text-green-600 rounded-lg text-xs font-semibold hover:bg-green-100 transition-colors"
                        onClick={() => setNewPaymentAmount(total)}
                      >
                        Total (Q.{total.toFixed(2)})
                      </button>
                    </div>
                  </div>

                  {/* Botón agregar pago mejorado */}
                  <button
                    className="w-full p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold text-sm disabled:from-gray-300 disabled:to-gray-400 disabled:text-gray-500 shadow-sm hover:shadow-md transition-all"
                    onClick={() => handleAddPayment(terminal)}
                    disabled={!selectedPaymentMethod || !newPaymentAmount || newPaymentAmount <= 0}
                  >
                    Agregar pago
                  </button>
                </div>
              )}

              {/* Información adicional para pago completo */}
              {isComplete && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-4 rounded-xl shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-green-700">
                        {isRestaurantMode ? 'Pago completo en restaurante' : 'Pago completo'}
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        {isRestaurantMode ? 
                          'La factura se creará y pagará automáticamente' :
                          'Todos los pagos han sido registrados correctamente'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Botones fijos en la parte inferior */}
            <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4 safe-area-inset-bottom">
              {isComplete ? (
                <button
                  className="w-full p-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg flex items-center justify-center shadow-lg disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed hover:shadow-xl transition-all"
                  onClick={handleSaveFactura}
                  disabled={isProcessingPayment}
                >
                  {isProcessingPayment ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent mr-3"></div>
                      Procesando...
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Finalizar venta - Pago completo
                    </>
                  )}
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    className="p-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-semibold text-sm disabled:from-gray-300 disabled:to-gray-400 disabled:text-gray-500 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all"
                    onClick={handleSaveFactura}
                    disabled={payments.length === 0 || isProcessingPayment}
                  >
                    {isProcessingPayment ? 'Procesando...' : 'Guardar parcial'}
                  </button>
                  <button
                    className="p-3 bg-gray-500 text-white rounded-xl font-semibold text-sm disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all"
                    onClick={handleClose}
                    disabled={isProcessingPayment}
                  >
                    {isProcessingPayment ? 'Procesando...' : 'Cancelar'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <CloseConfirmationModal />
      </>,
      document.body
    );
  }

  // VERSIÓN PARA DESKTOP MEJORADA
  return createPortal(
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
        <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-lg transform transition-all duration-300 ${
          isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}>
          <div className="p-6">
            {/* Header mejorado */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Procesar Pago</h2>
                <p className="text-sm text-gray-600 mt-1">{terminal?.name || 'Terminal POS'}</p>
              </div>
              <button
                onClick={handleClose}
                disabled={isProcessingPayment}
                className={`p-2 rounded-full transition-colors ${
                  isProcessingPayment 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Indicadores especiales */}
            <RestaurantModeIndicator />
            <ProcessingStatus />

            {/* Resumen de pago mejorado */}
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-xl mb-6 border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-700">Total</span>
                <span className="text-2xl font-bold text-gray-900">Q.{total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Pagado</span>
                <span className="font-bold text-green-600">Q.{totalPaid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-600">Saldo</span>
                <span className={`font-bold text-lg ${remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  Q.{remainingAmount.toFixed(2)}
                </span>
              </div>
              
              {/* Barra de progreso mejorada */}
              <div className="relative">
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className={`h-4 rounded-full transition-all duration-500 ${
                      isComplete 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                        : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                    }`}
                    style={{ width: `${Math.min(porcentajePagado, 100)}%` }}
                  ></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white drop-shadow">
                    {porcentajePagado.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Lista de pagos mejorada */}
            {payments.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-2">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    Pagos realizados ({payments.length})
                  </h3>
                  {paymentResults.length > 0 && (
                    <button
                      onClick={() => setShowPaymentDetails(!showPaymentDetails)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {showPaymentDetails ? 'Ocultar' : 'Ver'} detalles
                    </button>
                  )}
                </div>
                
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {payments.map((payment, index) => (
                    <PaymentItem
                      key={payment.id || index}
                      payment={payment}
                      index={index}
                      isEditing={editingPaymentIndex === index}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Formulario para nuevo pago mejorado */}
            {!isComplete && !isProcessingPayment && (
              <div className="bg-gray-50 p-4 rounded-xl mb-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mr-2">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  Agregar pago
                </h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Método</label>
                  <select
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                    value={selectedPaymentMethod}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                  >
                    <option value="" disabled>Seleccione método</option>
                    {(terminal?.payment_methods || []).map((method) => (
                      <option key={method.rowid} value={method.label}>{method.label}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Monto</label>
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">Q.</span>
                      <input
                        type="number"
                        className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                        placeholder="0.00"
                        value={newPaymentAmount || ''}
                        onChange={(e) => setNewPaymentAmount(parseFloat(e.target.value) || 0)}
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <button
                      className="px-4 bg-blue-50 text-blue-600 rounded-lg text-sm font-semibold whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-100 transition-colors"
                      onClick={() => setNewPaymentAmount(Math.max(0, remainingAmount))}
                      disabled={remainingAmount <= 0}
                    >
                      Usar saldo
                    </button>
                  </div>
                </div>

                <button
                  className="w-full p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold disabled:from-gray-300 disabled:to-gray-400 disabled:text-gray-500 shadow-sm hover:shadow-md transition-all"
                  onClick={() => handleAddPayment(terminal)}
                  disabled={!selectedPaymentMethod || !newPaymentAmount || newPaymentAmount <= 0}
                >
                  Agregar pago
                </button>
              </div>
            )}

            {/* Información adicional para pago completo */}
            {isComplete && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-4 rounded-xl mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-green-700">Pago completo</div>
                    <div className="text-xs text-green-600 mt-1">
                      {isRestaurantMode ? 'La factura se creará y pagará automáticamente' : 'Listo para finalizar la venta'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Botones de acción mejorados */}
            <div className="flex space-x-3">
              {isComplete ? (
                <button
                  className="flex-1 p-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold flex items-center justify-center disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all"
                  onClick={handleSaveFactura}
                  disabled={isProcessingPayment}
                >
                  {isProcessingPayment ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                      Procesando...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Finalizar
                    </>
                  )}
                </button>
              ) : (
                <button
                  className="flex-1 p-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-semibold disabled:from-gray-300 disabled:to-gray-400 disabled:text-gray-500 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all"
                  onClick={handleSaveFactura}
                  disabled={payments.length === 0 || isProcessingPayment}
                >
                  {isProcessingPayment ? 'Procesando...' : 'Guardar parcial'}
                </button>
              )}
              <button
                className="flex-1 p-3 bg-gray-200 text-gray-700 rounded-xl font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all"
                onClick={handleClose}
                disabled={isProcessingPayment}
              >
                {isProcessingPayment ? 'Procesando...' : 'Cancelar'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <CloseConfirmationModal />
    </>,
    document.body
  );
};

export default PaymentModal;