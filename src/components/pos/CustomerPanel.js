import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useCustomers } from './hooks/useCustomers';

// Componente CustomFields optimizado para móvil
const CustomFields = ({ variables, onFieldsChange, extraFields }) => {
  const fieldsConfig = [
    {
      id: 'delivery_date',
      name: 'Fecha de Entrega',
      type: 'date',
      required: false
    },
    {
      id: 'delivery_address',
      name: 'Dirección de Entrega',
      type: 'textarea',
      required: false
    },
    {
      id: 'special_instructions',
      name: 'Instrucciones Especiales',
      type: 'textarea',
      required: false
    },
    {
      id: 'customer_reference',
      name: 'Referencia del Cliente',
      type: 'text',
      required: false
    },
    {
      id: 'priority_level',
      name: 'Nivel de Prioridad',
      type: 'select',
      required: false,
      options: [
        { value: '', label: 'Seleccionar...' },
        { value: 'low', label: 'Baja' },
        { value: 'normal', label: 'Normal' },
        { value: 'high', label: 'Alta' },
        { value: 'urgent', label: 'Urgente' }
      ]
    }
  ];

  const handleFieldChange = (fieldId, value) => {
    onFieldsChange?.(fieldId, value);
  };

  const renderField = (field) => {
    const value = extraFields?.[field.id] || '';

    const baseClasses = "w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            className={baseClasses}
            placeholder={`Ingresa ${field.name.toLowerCase()}`}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
          />
        );

      case 'textarea':
        return (
          <textarea
            className={`${baseClasses} h-24 resize-none`}
            placeholder={`Ingresa ${field.name.toLowerCase()}`}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            className={baseClasses}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
          />
        );

      case 'select':
        return (
          <select
            className={baseClasses}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
          >
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <input
            type="text"
            className={baseClasses}
            placeholder={`Ingresa ${field.name.toLowerCase()}`}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
          />
        );
    }
  };

  return (
    <div className="space-y-5">
      {fieldsConfig.map((field) => (
        <div key={field.id} className="space-y-2">
          <label className="block text-base font-medium text-gray-700">
            {field.name}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {renderField(field)}
        </div>
      ))}
      
      {fieldsConfig.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-500">No hay campos personalizados configurados</p>
        </div>
      )}
    </div>
  );
};

// Modal optimizado para móviles
const CustomerModal = ({ 
  isOpen, 
  onClose, 
  onCustomerCreated, 
  variables,
  validateNit,
  createCustomer,
  nitValue = '',
  nombreValue = '',
  direccionValue = '',
  setNitValue,
  setNombreValue,
  setDireccionValue,
  isMobile
}) => {
  const [isValidatingNit, setIsValidatingNit] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [nitValidationError, setNitValidationError] = useState('');
  const [createError, setCreateError] = useState('');

  // Estados locales para el formulario
  const [localNit, setLocalNit] = useState(nitValue || '');
  const [localNombre, setLocalNombre] = useState(nombreValue || '');
  const [localDireccion, setLocalDireccion] = useState(direccionValue || '');
  const [localTelefono, setLocalTelefono] = useState('');
  const [localEmail, setLocalEmail] = useState('');

  // Sincronizar con props cuando cambien
  useEffect(() => {
    setLocalNit(nitValue || '');
    setLocalNombre(nombreValue || '');
    setLocalDireccion(direccionValue || '');
  }, [nitValue, nombreValue, direccionValue]);

  // Función para validar NIT
  const handleValidateNit = async () => {
    if (!localNit.trim()) {
      setNitValidationError('Por favor ingrese un NIT');
      return;
    }

    setIsValidatingNit(true);
    setNitValidationError('');

    try {
      const result = await validateNit(localNit);
      
      // Actualizar campos con datos del NIT
      setLocalNombre(result.nombre);
      setLocalDireccion(result.direccion);
      
      // Actualizar también los valores externos si existen las funciones
      setNombreValue?.(result.nombre);
      setDireccionValue?.(result.direccion);
      
    } catch (error) {
      setNitValidationError(error.message);
    } finally {
      setIsValidatingNit(false);
    }
  };

  // Función para crear cliente
  const handleCreateCustomer = async () => {
    if (!localNombre.trim()) {
      setCreateError('El nombre es requerido');
      return;
    }

    setIsCreatingCustomer(true);
    setCreateError('');

    try {
      const customerData = {
        nit: localNit,
        nombre: localNombre,
        direccion: localDireccion,
        telefono: localTelefono,
        email: localEmail
      };

      const result = await createCustomer(customerData, 1); // userId = 1 por defecto
      
      // Notificar al componente padre
      onCustomerCreated?.(result);
      
      // Cerrar modal
      onClose();
      
    } catch (error) {
      setCreateError(error.message);
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  // Función para limpiar formulario
  const handleClearForm = () => {
    setLocalNit('');
    setLocalNombre('');
    setLocalDireccion('');
    setLocalTelefono('');
    setLocalEmail('');
    setNitValidationError('');
    setCreateError('');
    
    // Limpiar también valores externos
    setNitValue?.('');
    setNombreValue?.('');
    setDireccionValue?.('');
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className={`bg-white rounded-xl shadow-2xl w-full ${isMobile ? 'h-full max-h-screen' : 'max-w-md max-h-[90vh]'} mx-auto transform transition-all overflow-hidden`}>
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-t-xl">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Nuevo Cliente</h2>
            <p className="text-green-100 text-sm mt-1">Crear un nuevo cliente</p>
          </div>
          <button 
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className={`p-6 ${isMobile ? 'overflow-y-auto h-[calc(100%-180px)]' : 'max-h-[60vh] overflow-y-auto'} space-y-4`}>
        {/* Campo NIT con validación */}
        <div className="space-y-2">
          <label className="block text-base font-medium text-gray-700">
            NIT (opcional)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              placeholder="Ingrese NIT para validar"
              value={localNit}
              onChange={(e) => {
                setLocalNit(e.target.value);
                setNitValue?.(e.target.value);
                setNitValidationError(''); // Limpiar error al escribir
              }}
              inputMode="numeric"
            />
            <button
              type="button"
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 min-w-[100px]"
              onClick={handleValidateNit}
              disabled={isValidatingNit || !localNit.trim()}
            >
              {isValidatingNit ? (
                <svg className="w-4 h-4 animate-spin mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                'Validar'
              )}
            </button>
          </div>
          {nitValidationError && (
            <p className="text-red-600 text-sm">{nitValidationError}</p>
          )}
        </div>

        {/* Campo Nombre */}
        <div className="space-y-2">
          <label className="block text-base font-medium text-gray-700">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            placeholder="Nombre del cliente"
            value={localNombre}
            onChange={(e) => {
              setLocalNombre(e.target.value);
              setNombreValue?.(e.target.value);
              setCreateError(''); // Limpiar error al escribir
            }}
            required
          />
        </div>

        {/* Campo Dirección */}
        <div className="space-y-2">
          <label className="block text-base font-medium text-gray-700">
            Dirección
          </label>
          <textarea
            className="w-full px-4 py-3 border border-gray-300 rounded-lg h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            placeholder="Dirección del cliente"
            value={localDireccion}
            onChange={(e) => {
              setLocalDireccion(e.target.value);
              setDireccionValue?.(e.target.value);
            }}
          />
        </div>

        {/* Campo Teléfono */}
        <div className="space-y-2">
          <label className="block text-base font-medium text-gray-700">
            Teléfono
          </label>
          <input
            type="tel"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            placeholder="Teléfono del cliente"
            value={localTelefono}
            onChange={(e) => setLocalTelefono(e.target.value)}
            inputMode="tel"
          />
        </div>

        {/* Campo Email */}
        <div className="space-y-2">
          <label className="block text-base font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            placeholder="Email del cliente"
            value={localEmail}
            onChange={(e) => setLocalEmail(e.target.value)}
            inputMode="email"
          />
        </div>

        {/* Error de creación */}
        {createError && (
          <div className="p-3 bg-red-100 border border-red-300 rounded-lg">
            <p className="text-red-600 text-sm">{createError}</p>
          </div>
        )}
      </div>
      
      <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
        <div className="flex justify-between space-x-3">
          <button 
            className="px-4 py-3 text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors flex-1"
            onClick={handleClearForm}
            disabled={isCreatingCustomer}
          >
            Limpiar
          </button>
          <div className="flex space-x-3">
            <button 
              className="px-4 py-3 text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              onClick={onClose}
              disabled={isCreatingCustomer}
            >
              Cancelar
            </button>
            <button 
              className="px-4 py-3 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 flex-1 min-w-[120px]"
              onClick={handleCreateCustomer}
              disabled={isCreatingCustomer || !localNombre.trim()}
            >
              {isCreatingCustomer ? (
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Creando...</span>
                </div>
              ) : (
                'Crear Cliente'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(
    <div className={`fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 p-4 ${isMobile ? 'items-end' : ''}`}>
      {isMobile ? (
        <div className="w-full max-w-md mx-auto">
          {modalContent}
        </div>
      ) : (
        modalContent
      )}
    </div>,
    document.body
  );
};

const CustomerPanel = (props) => {
  const {
    variables = {},
    shippingAddress = 'Nivel 1',
    setShippingAddress,
    tipoVenta = 'Cotizacion',
    isFel = false,
    setIsFel,
    isEditable = true,
    setIsModalOpen,
    setNitValue,
    setNombreValue,
    setDireccionValue,
    isCustomFieldsModalOpen = false,
    openCustomFieldsModal,
    closeCustomFieldsModal,
    handleCustomFieldChange,
    extraFields = {},
    generalNotes = '',
    setGeneralNotes,
    cart = [],
    calculateSubtotal,
    calculateDiscount,
    calculateTotal,
    handleOpenPaymentModal,
    handleSavePedido,
    handleSaveCotizacion,
    handleOpenSalesHistoryModal,
    selectedCustomer = 'Cliente no seleccionado',
    setSelectedCustomer,
    setSelectedCustomerDetails
  } = props;

  // Hook para manejo de clientes
  const {
    customerSearch,
    setCustomerSearch,
    customers,
    showSuggestions,
    setShowSuggestions,
    isCustomerSearchFocused,
    setIsCustomerSearchFocused,
    validateNit,
    createCustomer,
    isApiConfigured
  } = useCustomers(variables);

  const [isAnimating, setIsAnimating] = useState(false);
  const [suggestionsPosition, setSuggestionsPosition] = useState({ top: 0, left: 0, width: 0 });
  const [expandedSections, setExpandedSections] = useState({
    notes: false,
    extraFields: false
  });
  
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const searchInputRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animación inicial
  useEffect(() => {
    setIsAnimating(true);
  }, []);

  // Función para manejar la creación de cliente exitosa
  const handleCustomerCreated = useCallback((result) => {
    setSelectedCustomer?.(result.customer);
    setCustomerSearch(result.customer);
  }, [setCustomerSearch, setSelectedCustomer]);

  // Función para abrir modal de cliente personalizado
  const handleOpenCustomerModal = useCallback(() => {
    setNitValue?.('');
    setNombreValue?.('');
    setDireccionValue?.('');
    setIsCustomerModalOpen(true);
  }, [setNitValue, setNombreValue, setDireccionValue]);

  // Función para calcular la posición de las sugerencias
  const updateSuggestionsPosition = useCallback(() => {
    if (searchInputRef.current) {
      const rect = searchInputRef.current.getBoundingClientRect();
      setSuggestionsPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, []);

  // Actualizar posición cuando se muestran las sugerencias
  useEffect(() => {
    if (showSuggestions && isCustomerSearchFocused) {
      updateSuggestionsPosition();
      
      const handleResize = () => updateSuggestionsPosition();
      window.addEventListener('resize', handleResize);
      
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [showSuggestions, isCustomerSearchFocused, updateSuggestionsPosition]);

  // Cálculos seguros
  const totalItems = cart?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const subtotal = calculateSubtotal?.() || 0;
  const discount = calculateDiscount?.() || 0;
  const total = calculateTotal?.() || 0;

  // Configuración del botón de acción principal
  const getActionButtonConfig = useCallback(() => {
    const baseConfig = {
      className: "w-full text-white flex items-center justify-center space-x-2 text-base font-medium py-4 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    };

    switch(tipoVenta) {
      case "Factura":
        return {
          ...baseConfig,
          text: "Procesar Pago",
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          ),
          action: handleOpenPaymentModal || (() => {}),
          bgClass: "bg-green-600 hover:bg-green-700"
        };
      case "Pedido":
        return {
          ...baseConfig,
          text: "Guardar Pedido",
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M8 11v6a2 2 0 002 2h4a2 2 0 002-2v-6M8 11h8" />
            </svg>
          ),
          action: handleSavePedido || (() => {}),
          bgClass: "bg-yellow-600 hover:bg-yellow-700"
        };
      case "Cotizacion":
        return {
          ...baseConfig,
          text: "Guardar Cotización",
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          ),
          action: handleSaveCotizacion || (() => {}),
          bgClass: "bg-blue-600 hover:bg-blue-700"
        };
      default:
        return {
          ...baseConfig,
          text: "Procesar",
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          ),
          action: () => {},
          bgClass: "bg-purple-600 hover:bg-purple-700"
        };
    }
  }, [tipoVenta, handleOpenPaymentModal, handleSavePedido, handleSaveCotizacion]);

  const buttonConfig = getActionButtonConfig();

  // Función para toggle de secciones expandibles
  const toggleSection = useCallback((section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  // Componente para estado vacío en móvil
  const MobileEmptyCustomerState = () => (
    <div className="text-center py-8 px-4">
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
      <h3 className="font-semibold text-gray-900 mb-2 text-sm">Sin clientes</h3>
      <p className="text-gray-500 text-xs max-w-xs mx-auto mb-3">
        No encontramos clientes que coincidan con "{customerSearch}"
      </p>
      <button
        onClick={() => {
          setShowSuggestions(false);
          setIsCustomerSearchFocused(false);
          setIsModalOpen?.(true);
        }}
        className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100"
      >
        Crear Cliente Nuevo
      </button>
    </div>
  );

  // Modal de cliente para móviles
  const MobileCustomerModal = () => {
    if (!isMobile || !showSuggestions || !isCustomerSearchFocused) return null;

    return createPortal(
      <>
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 z-[999] backdrop-blur-sm" 
          onClick={() => {
            setShowSuggestions(false);
            setIsCustomerSearchFocused(false);
          }}
        />
        
        <div className="fixed inset-x-0 bottom-0 top-16 bg-white rounded-t-2xl z-[1000] overflow-hidden shadow-2xl flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg">Clientes ({customers.length})</h3>
              <p className="text-blue-100 text-sm">Buscar: "{customerSearch}"</p>
            </div>
            <button 
              onClick={() => {
                setShowSuggestions(false);
                setIsCustomerSearchFocused(false);
              }}
              className="p-1 hover:bg-white hover:bg-opacity-20 rounded-full"
              aria-label="Cerrar búsqueda"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Lista de clientes */}
          <div className="overflow-y-auto flex-1 p-2">
            {customers.length > 0 ? (
              <div className="space-y-2">
                {customers.map((customer) => (
                  <button
                    key={customer.id}
                    className="w-full p-4 text-left bg-white border border-gray-200 rounded-lg hover:bg-blue-50 active:bg-blue-100 transition-colors"
                    onClick={() => {
                      setSelectedCustomer?.(customer.name || customer.nom);
                      setSelectedCustomerDetails?.({
                        id: customer.id,
                        name: customer.name || customer.nom,
                        nit: customer.idprof1 || customer.siren || '',
                        direccion: customer.address || customer.adresse || '',
                        telefono: customer.phone || customer.tel || '',
                        email: customer.email || '',
                        remise: parseFloat(customer.remise_percent) || 0
                      });
                      setShowSuggestions(false);
                      setIsCustomerSearchFocused(false);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-base truncate">
                          {customer.name || customer.nom}
                        </h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-500">
                            NIT: {customer.idprof1 || customer.siren || 'N/A'}
                          </span>
                          {customer.email && (
                            <span className="text-xs text-blue-600">
                              📧 {customer.email}
                            </span>
                          )}
                        </div>
                        {customer.address && (
                          <p className="text-xs text-gray-500 mt-1 truncate">
                            📍 {customer.address || customer.adresse}
                          </p>
                        )}
                      </div>
                      
                      <div className="text-right ml-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <MobileEmptyCustomerState />
            )}
          </div>

          {/* Footer con opción de crear cliente */}
          <div className="bg-gray-50 p-3 border-t flex justify-between items-center">
            <span className="text-xs text-gray-600">
              {customers.length > 0 ? 'Toca para seleccionar' : 'Sin resultados'}
            </span>
            <button
              onClick={() => {
                setShowSuggestions(false);
                setIsCustomerSearchFocused(false);
                setIsModalOpen?.(true);
              }}
              className="text-sm text-blue-600 font-medium px-3 py-1 bg-blue-50 rounded-lg hover:bg-blue-100"
            >
              ➕ Crear Cliente
            </button>
          </div>
        </div>
      </>,
      document.body
    );
  };

  // Componente de sugerencias para desktop
  const CustomerSuggestions = () => {
    if (!showSuggestions || !isCustomerSearchFocused || customers.length === 0) {
      return null;
    }

    return createPortal(
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 999999 }}>
        <div 
          className="absolute inset-0 bg-black bg-opacity-10 pointer-events-auto"
          onClick={() => {
            setShowSuggestions(false);
            setIsCustomerSearchFocused(false);
          }}
        />
        
        <div 
          className="absolute bg-white border border-gray-200 rounded-lg shadow-2xl max-h-48 overflow-y-auto pointer-events-auto"
          style={{
            top: `${suggestionsPosition.top}px`,
            left: `${suggestionsPosition.left}px`,
            width: `${suggestionsPosition.width}px`,
            zIndex: 999999
          }}
        >
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 sticky top-0">
            <span className="text-xs text-gray-600 font-medium">
              {customers.length} cliente{customers.length !== 1 ? 's' : ''} encontrado{customers.length !== 1 ? 's' : ''}
            </span>
          </div>
          {customers.map((customer) => (
            <button
              key={customer.id} 
              className="w-full p-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-blue-50 active:bg-blue-100"
              onClick={() => {
                setSelectedCustomer?.(customer.nom || customer.name);
                setSelectedCustomerDetails?.({
                  ...customer,
                  id: customer.id,
                  customerId: customer.id,
                  socid: customer.id
                });
                setShowSuggestions(false);
                setIsCustomerSearchFocused(false);
              }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{customer.nom || customer.name}</p>
                  {customer.idprof1 && (
                    <p className="text-xs text-gray-500">NIT: {customer.idprof1}</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>,
      document.body
    );
  };

  const handleInputFocus = () => {
    setShowSuggestions(true);
    setIsCustomerSearchFocused(true);
    updateSuggestionsPosition();
  };

  // Render principal condicional para móvil/desktop
  if (isMobile) {
    return (
      <div className={`w-full space-y-4 transform transition-all duration-300 ${
        isAnimating ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
      }`}>
        
        {/* Customer Search Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <span className="font-semibold text-gray-700">Cliente</span>
              </div>
              <button 
                className="w-8 h-8 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleOpenCustomerModal}
                disabled={!isEditable}
                aria-label="Agregar nuevo cliente"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-4">
            <div className="relative">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input 
                  ref={searchInputRef}
                  type="text" 
                  placeholder="Buscar por nombre o NIT..." 
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  value={customerSearch} 
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  onFocus={handleInputFocus}
                  disabled={!isEditable}
                />
                {customerSearch && (
                  <button
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    onClick={() => {
                      setCustomerSearch('');
                      setShowSuggestions(false);
                    }}
                    aria-label="Limpiar búsqueda"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Customer Info Section */}
        <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-blue-700 text-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-5">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold truncate">
                  {selectedCustomer && selectedCustomer !== 'Cliente no seleccionado' ? selectedCustomer : 'Cliente no seleccionado'}
                </h2>
                <p className="text-purple-100 text-sm truncate">
                  {selectedCustomer && selectedCustomer !== 'Cliente no seleccionado' ? 'Cliente actual' : 'Ningún cliente seleccionado'}
                </p>
              </div>
            </div>

            {variables.SPOS_USA_NIVEL_PRECIOS === "1" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-purple-100 mb-2">
                  Nivel de precios
                </label>
                <select
                  className="w-full px-4 py-3 bg-white bg-opacity-20 border border-white border-opacity-30 text-white rounded-lg focus:outline-none focus:bg-opacity-30 focus:border-opacity-50 text-base"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress?.(e.target.value)}
                >
                  <option value="Nivel 1" className="text-gray-900">Nivel 1</option>
                  <option value="Nivel 2" className="text-gray-900">Nivel 2</option>
                  <option value="Nivel 3" className="text-gray-900">Nivel 3</option>
                </select>
              </div>
            )}

            {tipoVenta === "Factura" && (
              <div className="flex items-center justify-between p-3 bg-white bg-opacity-20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Factura Electrónica (FEL)</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isFel} 
                    onChange={() => setIsFel?.(!isFel)} 
                    className="sr-only peer"
                  />
                  <div className="relative w-11 h-6 bg-white bg-opacity-30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Extra Fields Button */}
        {variables.SPOS_EXTRAFIELDS === "1" && (
          <button 
            className="w-full bg-white border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 rounded-xl p-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group active:bg-blue-100"
            onClick={openCustomFieldsModal}   
            disabled={!isEditable}
          >
            <div className="flex items-center justify-center space-x-2 text-gray-600 group-hover:text-blue-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="font-medium">Campos Personalizados</span>
            </div>
          </button>
        )}

        {/* Custom Fields Modal */}
        {isCustomFieldsModalOpen && (
          <div className="fixed inset-0 flex items-end z-50 bg-black bg-opacity-50 p-0">
            <div className="bg-white rounded-t-2xl shadow-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-t-xl">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold">Campos Personalizados</h2>
                    <p className="text-purple-100 text-sm mt-1">Información adicional para esta venta</p>
                  </div>
                  <button 
                    className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
                    onClick={closeCustomFieldsModal}
                    aria-label="Cerrar modal"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <CustomFields 
                  variables={variables} 
                  onFieldsChange={handleCustomFieldChange} 
                  extraFields={extraFields}
                />
              </div>
              <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                <div className="flex justify-end space-x-3">
                  <button 
                    className="px-4 py-3 text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                    onClick={closeCustomFieldsModal}
                  >
                    Cancelar
                  </button>
                  <button 
                    className="px-4 py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    onClick={closeCustomFieldsModal}
                  >
                    Guardar Campos
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notes Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <button 
            className="w-full bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center"
            onClick={() => toggleSection('notes')}
            aria-expanded={expandedSections.notes}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="font-medium text-gray-700">Notas Generales</span>
            </div>
            <svg 
              className={`w-5 h-5 text-gray-500 transform transition-transform ${expandedSections.notes ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedSections.notes && (
            <div className="p-4">
              <textarea 
                className="w-full h-32 p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                placeholder="Agregar notas sobre esta venta..."
                value={generalNotes}
                onChange={(e) => setGeneralNotes?.(e.target.value)}
                disabled={!isEditable}
              />
            </div>
          )}
        </div>

        {/* Totals Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 p-4 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="font-medium text-gray-700">Resumen de Venta</span>
            </div>
          </div>
          
          <div className="p-4 space-y-3">
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span>Total Items</span>
              </span>
              <span className="font-semibold text-gray-900">{totalItems}</span>
            </div>
            
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium text-gray-900">Q.{subtotal.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Descuento</span>
              <span className="font-medium text-red-600">-Q.{discount.toFixed(2)}</span>
            </div>
            
            <div className="border-t border-gray-200 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">Total:</span>
                <span className="text-xl font-bold text-green-600">Q.{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 sticky bottom-0 bg-white p-4 border-t border-gray-200 shadow-lg">
          <button 
            className={`${buttonConfig.bgClass} ${buttonConfig.className}`}
            onClick={buttonConfig.action}
            disabled={!isEditable}
          >
            {buttonConfig.icon}
            <span>{buttonConfig.text}</span>
          </button>

          <button 
            className="w-full border-2 border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center justify-center space-x-2 text-base font-medium py-4 px-4 rounded-lg transition-colors active:bg-gray-100"
            onClick={handleOpenSalesHistoryModal}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Historial de Ventas</span>
          </button>
        </div>
        
        <MobileCustomerModal />

        {/* Modal de Cliente */}
        <CustomerModal
          isOpen={isCustomerModalOpen}
          onClose={() => setIsCustomerModalOpen(false)}
          onCustomerCreated={handleCustomerCreated}
          variables={variables}
          validateNit={validateNit}
          createCustomer={createCustomer}
          isMobile={isMobile}
        />
      </div>
    );
  }

  // Versión desktop
  return (
    <div className={`w-full md:w-1/4 space-y-4 transform transition-all duration-300 ${
      isAnimating ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
    }`}>
      
      {/* Customer Search Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="font-semibold text-gray-700">Cliente</span>
            </div>
            <button 
              className="w-8 h-8 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleOpenCustomerModal}
              disabled={!isEditable}
              title="Agregar nuevo cliente"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="relative">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Buscar por nombre o NIT..." 
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                value={customerSearch} 
                onChange={(e) => setCustomerSearch(e.target.value)}
                onFocus={handleInputFocus}
                disabled={!isEditable}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Renderizar sugerencias usando portal */}
      <CustomerSuggestions />

      {/* Modal de Cliente */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onCustomerCreated={handleCustomerCreated}
        variables={variables}
        validateNit={validateNit}
        createCustomer={createCustomer}
        isMobile={isMobile}
      />

      {/* Customer Info Section */}
      <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-blue-700 text-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold truncate">
                {selectedCustomer && selectedCustomer !== 'Cliente no seleccionado' ? selectedCustomer : 'Cliente no seleccionado'}
              </h2>
              <p className="text-purple-100 text-sm">
                {selectedCustomer && selectedCustomer !== 'Cliente no seleccionado' ? 'Cliente actual' : 'Ningún cliente seleccionado'}
              </p>
            </div>
          </div>

          {variables.SPOS_USA_NIVEL_PRECIOS === "1" && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-purple-100 mb-2">
                Nivel de precios
              </label>
              <select
                className="w-full px-3 py-2 bg-white bg-opacity-20 border border-white border-opacity-30 text-white rounded-md focus:outline-none focus:bg-opacity-30 focus:border-opacity-50"
                value={shippingAddress}
                onChange={(e) => setShippingAddress?.(e.target.value)}
              >
                <option value="Nivel 1" className="text-gray-900">Nivel 1</option>
                <option value="Nivel 2" className="text-gray-900">Nivel 2</option>
                <option value="Nivel 3" className="text-gray-900">Nivel 3</option>
              </select>
            </div>
          )}

          {tipoVenta === "Factura" && (
            <div className="flex items-center justify-between p-3 bg-white bg-opacity-20 rounded-lg">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">Factura Electrónica (FEL)</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isFel} 
                  onChange={() => setIsFel?.(!isFel)} 
                  className="sr-only peer"
                />
                <div className="relative w-11 h-6 bg-white bg-opacity-30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Extra Fields Button */}
      {variables.SPOS_EXTRAFIELDS === "1" && (
        <button 
          className="w-full bg-white border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 rounded-xl p-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
          onClick={openCustomFieldsModal}   
          disabled={!isEditable}
        >
          <div className="flex items-center justify-center space-x-2 text-gray-600 group-hover:text-blue-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="font-medium">Campos Personalizados</span>
          </div>
        </button>
      )}

      {/* Custom Fields Modal */}
      {isCustomFieldsModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-auto transform transition-all max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-t-xl">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold">Campos Personalizados</h2>
                  <p className="text-purple-100 text-sm mt-1">Información adicional para esta venta</p>
                </div>
                <button 
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
                  onClick={closeCustomFieldsModal}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <CustomFields 
                variables={variables} 
                onFieldsChange={handleCustomFieldChange} 
                extraFields={extraFields}
              />
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <div className="flex justify-end space-x-3">
                <button 
                  className="px-4 py-2 text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
                  onClick={closeCustomFieldsModal}
                >
                  Cancelar
                </button>
                <button 
                  className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                  onClick={closeCustomFieldsModal}
                >
                  Guardar Campos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gray-50 p-3 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="font-medium text-gray-700">Notas Generales</span>
          </div>
        </div>
        <div className="p-4">
          <textarea 
            className="w-full h-24 p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="Agregar notas sobre esta venta..."
            value={generalNotes}
            onChange={(e) => setGeneralNotes?.(e.target.value)}
            disabled={!isEditable}
          />
        </div>
      </div>

      {/* Totals Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gray-50 p-3 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span className="font-medium text-gray-700">Resumen de Venta</span>
          </div>
        </div>
        
        <div className="p-4 space-y-3">
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600 flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span>Total Items</span>
            </span>
            <span className="font-semibold text-gray-900">{totalItems}</span>
          </div>
          
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium text-gray-900">Q.{subtotal.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600">Descuento</span>
            <span className="font-medium text-red-600">-Q.{discount.toFixed(2)}</span>
          </div>
          
          <div className="border-t border-gray-200 pt-3">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-gray-900">Total:</span>
              <span className="text-xl font-bold text-green-600">Q.{total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button 
          className={`${buttonConfig.bgClass} ${buttonConfig.className}`}
          onClick={buttonConfig.action}
          disabled={!isEditable}
        >
          {buttonConfig.icon}
          <span>{buttonConfig.text}</span>
        </button>

        <button 
          className="w-full border-2 border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center justify-center space-x-2 text-sm font-medium py-3 px-4 rounded-md transition-colors"
          onClick={handleOpenSalesHistoryModal}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Historial de Ventas</span>
        </button>
      </div>
      
      {/* Debug info si no está en producción */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs">
          <p className="font-semibold text-yellow-800">Debug Info:</p>
          <p className="text-yellow-700">API Configurada: {isApiConfigured ? 'Sí' : 'No'}</p>
          <p className="text-yellow-700">Clientes encontrados: {customers.length}</p>
          <p className="text-yellow-700">Función validateNit: {validateNit ? 'Disponible' : 'No disponible'}</p>
        </div>
      )}

      <MobileCustomerModal />
    </div>
  );
};

export default CustomerPanel;