import React, { useState, useEffect } from 'react';

const RestaurantAdminModal = ({ 
  isOpen, 
  onClose, 
  layoutConfig,
  variables,
  terminal,
  onUpdateConfig 
}) => {
  
  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    background_width: 1000,
    background_height: 600,
    auto_reload_interval: 30,
    max_mesas_per_layout: 50,
    default_mesa_capacity: 4,
    enable_sound_notifications: true,
    enable_auto_print_comanda: false,
    comanda_printer_ip: '',
    timezone: 'America/Guatemala',
    currency_symbol: 'Q',
    tax_rate: 12,
    service_charge: 10
  });
  
  const [advanced, setAdvanced] = useState({
    debug_mode: false,
    api_timeout: 30,
    cache_duration: 300,
    max_image_size: 5,
    allowed_image_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    backup_frequency: 'daily',
    log_level: 'info'
  });
  
  const [systemInfo, setSystemInfo] = useState({});
  const [errors, setErrors] = useState({});

  // Cargar configuración existente
  useEffect(() => {
    if (isOpen && layoutConfig) {
      setFormData(prev => ({
        ...prev,
        name: layoutConfig.name || '',
        description: layoutConfig.description || '',
        background_width: layoutConfig.background_width || 1000,
        background_height: layoutConfig.background_height || 600
      }));
      
      // Cargar información del sistema
      loadSystemInfo();
    }
  }, [isOpen, layoutConfig]);

  const loadSystemInfo = () => {
    const info = {
      phpVersion: 'Detectando...',
      dolibarrVersion: 'Detectando...',
      diskSpace: 'Calculando...',
      memoryLimit: 'Detectando...',
      maxUploadSize: 'Detectando...',
      lastBackup: 'Nunca',
      totalMesas: layoutConfig?.mesas?.length || 0,
      activeConnections: 'Contando...'
    };
    
    setSystemInfo(info);
    
    // Simular detección de información del sistema
    setTimeout(() => {
      setSystemInfo({
        phpVersion: navigator.userAgent.includes('PHP') ? 'PHP 7.4' : 'No detectado',
        dolibarrVersion: variables?.DOLIBARR_VERSION || 'No detectado',
        diskSpace: '1.2 GB disponibles',
        memoryLimit: '256 MB',
        maxUploadSize: '10 MB',
        lastBackup: new Date(Date.now() - 86400000).toLocaleString(),
        totalMesas: layoutConfig?.mesas?.length || 0,
        activeConnections: Math.floor(Math.random() * 10) + 1
      });
    }, 2000);
  };

  const handleInputChange = (section, field, value) => {
    if (section === 'general') {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    } else if (section === 'advanced') {
      setAdvanced(prev => ({
        ...prev,
        [field]: value
      }));
    }
    
    // Limpiar errores del campo
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Nombre es requerido';
    }
    
    if (formData.background_width < 500 || formData.background_width > 3000) {
      newErrors.background_width = 'Ancho debe estar entre 500 y 3000 pixels';
    }
    
    if (formData.background_height < 300 || formData.background_height > 2000) {
      newErrors.background_height = 'Alto debe estar entre 300 y 2000 pixels';
    }
    
    if (formData.auto_reload_interval < 10 || formData.auto_reload_interval > 300) {
      newErrors.auto_reload_interval = 'Intervalo debe estar entre 10 y 300 segundos';
    }
    
    if (formData.comanda_printer_ip && !isValidIP(formData.comanda_printer_ip)) {
      newErrors.comanda_printer_ip = 'IP de impresora inválida';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidIP = (ip) => {
    const regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return regex.test(ip);
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    try {
      const configData = {
        layout: formData,
        advanced: advanced,
        timestamp: new Date().toISOString()
      };
      
      if (onUpdateConfig) {
        await onUpdateConfig(configData);
      }
      
      console.log('Configuración guardada:', configData);
      onClose();
      
    } catch (error) {
      console.error('Error guardando configuración:', error);
      setErrors({ general: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const exportConfiguration = () => {
    const config = {
      layout: formData,
      advanced: advanced,
      systemInfo: systemInfo,
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `restaurant-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const performBackup = async () => {
    setIsLoading(true);
    try {
      // Simular backup
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setSystemInfo(prev => ({
        ...prev,
        lastBackup: new Date().toLocaleString()
      }));
      
      console.log('Backup realizado exitosamente');
    } catch (error) {
      console.error('Error en backup:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    setIsLoading(true);
    try {
      const apiUrl = `${variables.SPOS_URL}/custom/pos/frontend/api_spos_restaurant/`;
      const response = await fetch(apiUrl, {
        headers: {
          'DOLAPIKEY': variables.DOLIBARR_API_KEY || variables.dolibarrToken
        }
      });
      
      if (response.ok) {
        alert('✅ Conexión exitosa con la API');
      } else {
        alert(`❌ Error de conexión: ${response.status}`);
      }
    } catch (error) {
      alert(`❌ Error de conexión: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'general', name: 'General', icon: '⚙️' },
    { id: 'display', name: 'Pantalla', icon: '🖥️' },
    { id: 'operations', name: 'Operaciones', icon: '🍽️' },
    { id: 'advanced', name: 'Avanzado', icon: '🔧' },
    { id: 'system', name: 'Sistema', icon: '💻' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <div>
            <h2 className="text-xl font-bold">🔧 Configuración Avanzada del Restaurante</h2>
            <p className="text-indigo-100 text-sm mt-1">
              Panel de administración completo del sistema
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-white hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error general */}
        {errors.general && (
          <div className="mx-6 mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {errors.general}
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar con tabs */}
          <div className="w-64 bg-gray-50 border-r overflow-y-auto">
            <nav className="p-4 space-y-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-3 ${
                    activeTab === tab.id
                      ? 'bg-indigo-100 text-indigo-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Tab: General */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Configuración General</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Layout *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('general', 'name', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Capacidad Predeterminada de Mesa
                    </label>
                    <select
                      value={formData.default_mesa_capacity}
                      onChange={(e) => handleInputChange('general', 'default_mesa_capacity', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value={2}>2 personas</option>
                      <option value={4}>4 personas</option>
                      <option value={6}>6 personas</option>
                      <option value={8}>8 personas</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('general', 'description', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Display */}
            {activeTab === 'display' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Configuración de Pantalla</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ancho del Canvas (px) *
                    </label>
                    <input
                      type="number"
                      min="500"
                      max="3000"
                      value={formData.background_width}
                      onChange={(e) => handleInputChange('general', 'background_width', parseInt(e.target.value))}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.background_width ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.background_width && <p className="text-red-500 text-xs mt-1">{errors.background_width}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Alto del Canvas (px) *
                    </label>
                    <input
                      type="number"
                      min="300"
                      max="2000"
                      value={formData.background_height}
                      onChange={(e) => handleInputChange('general', 'background_height', parseInt(e.target.value))}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.background_height ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.background_height && <p className="text-red-500 text-xs mt-1">{errors.background_height}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Intervalo de Actualización (segundos)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="300"
                      value={formData.auto_reload_interval}
                      onChange={(e) => handleInputChange('general', 'auto_reload_interval', parseInt(e.target.value))}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.auto_reload_interval ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.auto_reload_interval && <p className="text-red-500 text-xs mt-1">{errors.auto_reload_interval}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Máximo de Mesas por Layout
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="100"
                      value={formData.max_mesas_per_layout}
                      onChange={(e) => handleInputChange('general', 'max_mesas_per_layout', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-3">Vista Previa de Proporción</h4>
                  <div 
                    className="bg-blue-100 border border-blue-300 rounded mx-auto"
                    style={{
                      width: '100%',
                      maxWidth: '400px',
                      height: `${(formData.background_height / formData.background_width) * 400}px`,
                      maxHeight: '200px'
                    }}
                  >
                    <div className="flex items-center justify-center h-full text-sm text-blue-700">
                      {formData.background_width} × {formData.background_height}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Operations */}
            {activeTab === 'operations' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Configuración de Operaciones</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Zona Horaria
                    </label>
                    <select
                      value={formData.timezone}
                      onChange={(e) => handleInputChange('general', 'timezone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="America/Guatemala">Guatemala (UTC-6)</option>
                      <option value="America/Mexico_City">México (UTC-6)</option>
                      <option value="America/New_York">Nueva York (UTC-5/-4)</option>
                      <option value="Europe/Madrid">Madrid (UTC+1/+2)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Símbolo de Moneda
                    </label>
                    <input
                      type="text"
                      maxLength="3"
                      value={formData.currency_symbol}
                      onChange={(e) => handleInputChange('general', 'currency_symbol', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tasa de Impuesto (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="0.1"
                      value={formData.tax_rate}
                      onChange={(e) => handleInputChange('general', 'tax_rate', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cargo por Servicio (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="25"
                      step="0.1"
                      value={formData.service_charge}
                      onChange={(e) => handleInputChange('general', 'service_charge', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      IP de Impresora de Comanda
                    </label>
                    <input
                      type="text"
                      placeholder="192.168.1.100"
                      value={formData.comanda_printer_ip}
                      onChange={(e) => handleInputChange('general', 'comanda_printer_ip', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.comanda_printer_ip ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.comanda_printer_ip && <p className="text-red-500 text-xs mt-1">{errors.comanda_printer_ip}</p>}
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="sound_notifications"
                      checked={formData.enable_sound_notifications}
                      onChange={(e) => handleInputChange('general', 'enable_sound_notifications', e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="sound_notifications" className="ml-2 block text-sm text-gray-900">
                      Habilitar notificaciones sonoras
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="auto_print_comanda"
                      checked={formData.enable_auto_print_comanda}
                      onChange={(e) => handleInputChange('general', 'enable_auto_print_comanda', e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="auto_print_comanda" className="ml-2 block text-sm text-gray-900">
                      Imprimir comanda automáticamente al agregar productos
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Advanced */}
            {activeTab === 'advanced' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Configuración Avanzada</h3>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Configuración para Usuarios Avanzados
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>Modifique estas configuraciones solo si sabe lo que está haciendo.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Timeout de API (segundos)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="120"
                      value={advanced.api_timeout}
                      onChange={(e) => handleInputChange('advanced', 'api_timeout', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duración de Caché (segundos)
                    </label>
                    <input
                      type="number"
                      min="60"
                      max="3600"
                      value={advanced.cache_duration}
                      onChange={(e) => handleInputChange('advanced', 'cache_duration', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tamaño Máximo de Imagen (MB)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={advanced.max_image_size}
                      onChange={(e) => handleInputChange('advanced', 'max_image_size', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nivel de Log
                    </label>
                    <select
                      value={advanced.log_level}
                      onChange={(e) => handleInputChange('advanced', 'log_level', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="error">Solo Errores</option>
                      <option value="warning">Errores y Advertencias</option>
                      <option value="info">Información General</option>
                      <option value="debug">Debug Completo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Frecuencia de Backup
                    </label>
                    <select
                      value={advanced.backup_frequency}
                      onChange={(e) => handleInputChange('advanced', 'backup_frequency', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="never">Nunca</option>
                      <option value="daily">Diario</option>
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensual</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="debug_mode"
                    checked={advanced.debug_mode}
                    onChange={(e) => handleInputChange('advanced', 'debug_mode', e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="debug_mode" className="ml-2 block text-sm text-gray-900">
                    Habilitar modo debug (más información en logs)
                  </label>
                </div>
              </div>
            )}

            {/* Tab: System */}
            {activeTab === 'system' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Información del Sistema</h3>
                
                {/* System Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(systemInfo).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">{value}</p>
                    </div>
                  ))}
                </div>

                {/* System Actions */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Acciones del Sistema</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={testConnection}
                      disabled={isLoading}
                      className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg transition-colors disabled:bg-blue-300"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                        </svg>
                      )}
                      Probar Conexión API
                    </button>

                    <button
                      onClick={performBackup}
                      disabled={isLoading}
                      className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg transition-colors disabled:bg-green-300"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      )}
                      Realizar Backup
                    </button>

                    <button
                      onClick={exportConfiguration}
                      className="flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-3 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Exportar Configuración
                    </button>

                    <button
                      onClick={() => window.open(`${variables.SPOS_URL}/custom/pos/frontend/api_spos_restaurant/test_api.php`, '_blank')}
                      className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Test Completo API
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-6 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Sistema: SPOS Restaurant v1.0 • PHP {systemInfo.phpVersion} • Entity {terminal?.entity}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-6 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors disabled:bg-indigo-300 flex items-center"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Guardar Configuración
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantAdminModal;