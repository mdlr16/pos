import { useState, useEffect, useCallback } from 'react';

const useCustomFields = (variables) => {
  // Estados principales
  const [extraFields, setExtraFields] = useState({});
  const [isCustomFieldsModalOpen, setIsCustomFieldsModalOpen] = useState(false);
  const [customFieldsConfig, setCustomFieldsConfig] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Función para construir la URL base de la API
  const buildApiUrl = useCallback(() => {
    if (!variables?.SPOS_URL) {
      console.error('❌ SPOS_URL no está definido en variables');
      return null;
    }
    
    const baseUrl = `${variables.SPOS_URL}/api/index.php`;
    console.log('🌐 URL base construida para custom fields:', baseUrl);
    return baseUrl;
  }, [variables?.SPOS_URL]);

  // Función para cargar la configuración de campos personalizados
  const loadCustomFieldsConfig = useCallback(async () => {
    const baseUrl = buildApiUrl();
    if (!baseUrl || !variables?.DOLAPIKEY) {
      console.warn('⚠️ No se puede cargar configuración de campos personalizados: faltan credenciales');
      return;
    }

    try {
      setIsLoading(true);
      console.log('📥 Cargando configuración de campos personalizados...');

      // En un sistema real, esto vendría de una API específica
      // Por ahora, definimos una configuración por defecto
      const defaultConfig = [
        {
          id: 'delivery_date',
          name: 'Fecha de Entrega',
          type: 'date',
          required: false,
          placeholder: 'Selecciona la fecha de entrega'
        },
        {
          id: 'delivery_address',
          name: 'Dirección de Entrega',
          type: 'textarea',
          required: false,
          placeholder: 'Ingresa la dirección de entrega específica'
        },
        {
          id: 'special_instructions',
          name: 'Instrucciones Especiales',
          type: 'textarea',
          required: false,
          placeholder: 'Instrucciones adicionales para la venta'
        },
        {
          id: 'customer_reference',
          name: 'Referencia del Cliente',
          type: 'text',
          required: false,
          placeholder: 'Número de orden o referencia del cliente'
        },
        {
          id: 'priority_level',
          name: 'Nivel de Prioridad',
          type: 'select',
          required: false,
          options: [
            { value: 'low', label: 'Baja' },
            { value: 'normal', label: 'Normal' },
            { value: 'high', label: 'Alta' },
            { value: 'urgent', label: 'Urgente' }
          ]
        },
        {
          id: 'payment_terms',
          name: 'Términos de Pago',
          type: 'select',
          required: false,
          options: [
            { value: 'immediate', label: 'Inmediato' },
            { value: '15_days', label: '15 días' },
            { value: '30_days', label: '30 días' },
            { value: '60_days', label: '60 días' }
          ]
        },
        {
          id: 'requires_approval',
          name: 'Requiere Aprobación',
          type: 'checkbox',
          required: false
        }
      ];

      setCustomFieldsConfig(defaultConfig);
      console.log('✅ Configuración de campos personalizados cargada:', defaultConfig.length, 'campos');

    } catch (error) {
      console.error('❌ Error al cargar configuración de campos personalizados:', error);
      setCustomFieldsConfig([]);
    } finally {
      setIsLoading(false);
    }
  }, [buildApiUrl, variables?.DOLAPIKEY]);

  // Función para validar un campo específico
  const validateField = useCallback((fieldConfig, value) => {
    const fieldErrors = [];

    // Validación requerido
    if (fieldConfig.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      fieldErrors.push(`${fieldConfig.name} es requerido`);
    }

    // Validación por tipo
    switch (fieldConfig.type) {
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          fieldErrors.push(`${fieldConfig.name} debe ser un email válido`);
        }
        break;
      
      case 'number':
        if (value && isNaN(Number(value))) {
          fieldErrors.push(`${fieldConfig.name} debe ser un número válido`);
        }
        break;
      
      case 'date':
        if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          fieldErrors.push(`${fieldConfig.name} debe ser una fecha válida`);
        }
        break;
      
      case 'url':
        if (value && !/^https?:\/\/.+/.test(value)) {
          fieldErrors.push(`${fieldConfig.name} debe ser una URL válida`);
        }
        break;
    }

    // Validación de longitud
    if (fieldConfig.maxLength && value && value.length > fieldConfig.maxLength) {
      fieldErrors.push(`${fieldConfig.name} no puede exceder ${fieldConfig.maxLength} caracteres`);
    }

    if (fieldConfig.minLength && value && value.length < fieldConfig.minLength) {
      fieldErrors.push(`${fieldConfig.name} debe tener al menos ${fieldConfig.minLength} caracteres`);
    }

    return fieldErrors;
  }, []);

  // Función para validar todos los campos
  const validateAllFields = useCallback(() => {
    const allErrors = {};
    let hasErrors = false;

    customFieldsConfig.forEach(fieldConfig => {
      const value = extraFields[fieldConfig.id];
      const fieldErrors = validateField(fieldConfig, value);
      
      if (fieldErrors.length > 0) {
        allErrors[fieldConfig.id] = fieldErrors;
        hasErrors = true;
      }
    });

    setErrors(allErrors);
    return !hasErrors;
  }, [customFieldsConfig, extraFields, validateField]);

  // Función para manejar cambios en los campos
  const handleCustomFieldChange = useCallback((fieldId, value) => {
    console.log('🔄 Cambio en campo personalizado:', fieldId, '→', value);
    
    setExtraFields(prevFields => ({
      ...prevFields,
      [fieldId]: value
    }));

    // Limpiar error del campo si existe
    if (errors[fieldId]) {
      setErrors(prevErrors => {
        const newErrors = { ...prevErrors };
        delete newErrors[fieldId];
        return newErrors;
      });
    }

    // Validar campo individual en tiempo real
    const fieldConfig = customFieldsConfig.find(config => config.id === fieldId);
    if (fieldConfig) {
      const fieldErrors = validateField(fieldConfig, value);
      if (fieldErrors.length > 0) {
        setErrors(prevErrors => ({
          ...prevErrors,
          [fieldId]: fieldErrors
        }));
      }
    }
  }, [errors, customFieldsConfig, validateField]);

  // Función para abrir el modal
  const openCustomFieldsModal = useCallback(() => {
    console.log('📝 Abriendo modal de campos personalizados');
    setIsCustomFieldsModalOpen(true);
  }, []);

  // Función para cerrar el modal
  const closeCustomFieldsModal = useCallback(() => {
    console.log('❌ Cerrando modal de campos personalizados');
    setIsCustomFieldsModalOpen(false);
    setErrors({}); // Limpiar errores al cerrar
  }, []);

  // Función para cerrar el modal con validación
  const closeCustomFieldsModalWithValidation = useCallback(() => {
    const isValid = validateAllFields();
    if (isValid) {
      closeCustomFieldsModal();
      return true;
    } else {
      console.warn('⚠️ Hay errores en los campos personalizados');
      return false;
    }
  }, [validateAllFields, closeCustomFieldsModal]);

  // Función para resetear campos
  const resetCustomFields = useCallback(() => {
    console.log('🔄 Reseteando campos personalizados');
    setExtraFields({});
    setErrors({});
  }, []);

  // Función para establecer valores desde datos externos (ej: al cargar un ticket)
  const setCustomFieldsFromData = useCallback((data) => {
    console.log('📥 Cargando campos personalizados desde datos:', data);
    setExtraFields(data || {});
    setErrors({});
  }, []);

  // Función para obtener valor por defecto de un campo
  const getDefaultValue = useCallback((fieldConfig) => {
    switch (fieldConfig.type) {
      case 'checkbox':
        return false;
      case 'number':
        return '';
      case 'select':
        return fieldConfig.options?.[0]?.value || '';
      default:
        return '';
    }
  }, []);

  // Función para obtener el valor de un campo con fallback
  const getFieldValue = useCallback((fieldId) => {
    const fieldConfig = customFieldsConfig.find(config => config.id === fieldId);
    const currentValue = extraFields[fieldId];
    
    if (currentValue !== undefined && currentValue !== null) {
      return currentValue;
    }
    
    return fieldConfig ? getDefaultValue(fieldConfig) : '';
  }, [extraFields, customFieldsConfig, getDefaultValue]);

  // Función para verificar si hay campos configurados
  const hasCustomFields = useCallback(() => {
    return variables?.SPOS_EXTRAFIELDS === "1" && customFieldsConfig.length > 0;
  }, [variables?.SPOS_EXTRAFIELDS, customFieldsConfig.length]);

  // Función para obtener resumen de campos con valores
  const getFieldsSummary = useCallback(() => {
    return customFieldsConfig
      .filter(config => {
        const value = extraFields[config.id];
        return value !== undefined && value !== null && value !== '' && value !== false;
      })
      .map(config => ({
        name: config.name,
        value: extraFields[config.id],
        type: config.type
      }));
  }, [customFieldsConfig, extraFields]);

  // Función para exportar datos para guardado
  const getCustomFieldsForSave = useCallback(() => {
    const fieldsToSave = {};
    
    customFieldsConfig.forEach(config => {
      const value = extraFields[config.id];
      if (value !== undefined && value !== null && value !== '') {
        fieldsToSave[config.id] = value;
      }
    });
    
    console.log('💾 Campos personalizados para guardar:', fieldsToSave);
    return fieldsToSave;
  }, [customFieldsConfig, extraFields]);

  // Effect para cargar configuración al inicializar
  useEffect(() => {
    if (variables?.SPOS_EXTRAFIELDS === "1") {
      loadCustomFieldsConfig();
    }
  }, [variables?.SPOS_EXTRAFIELDS, loadCustomFieldsConfig]);

  // Logging para debug
  useEffect(() => {
    console.log('🎯 CustomFields State:', {
      extraFields,
      configLoaded: customFieldsConfig.length,
      modalOpen: isCustomFieldsModalOpen,
      hasErrors: Object.keys(errors).length > 0
    });
  }, [extraFields, customFieldsConfig.length, isCustomFieldsModalOpen, errors]);

  return {
    // Estados
    extraFields,
    customFieldsConfig,
    isCustomFieldsModalOpen,
    isLoading,
    errors,
    
    // Funciones principales
    handleCustomFieldChange,
    openCustomFieldsModal,
    closeCustomFieldsModal,
    closeCustomFieldsModalWithValidation,
    
    // Funciones de utilidad
    resetCustomFields,
    setCustomFieldsFromData,
    validateAllFields,
    getFieldValue,
    hasCustomFields,
    getFieldsSummary,
    getCustomFieldsForSave,
    
    // Función para recargar configuración
    loadCustomFieldsConfig
  };
};

export default useCustomFields;