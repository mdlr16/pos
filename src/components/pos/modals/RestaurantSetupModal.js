import React, { useState } from 'react';

const RestaurantSetupModal = ({ 
  isOpen, 
  onClose, 
  onCreateLayout,
  entity 
}) => {
  const [formData, setFormData] = useState({
    name: 'Layout Principal',
    description: 'Configuración principal del restaurante',
    background_width: 1000,
    background_height: 600,
    create_default_tables: true
  });
  
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpiar error específico
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

    if (formData.background_width < 500 || formData.background_width > 2000) {
      newErrors.background_width = 'Ancho debe estar entre 500 y 2000 pixels';
    }

    if (formData.background_height < 300 || formData.background_height > 1500) {
      newErrors.background_height = 'Alto debe estar entre 300 y 1500 pixels';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsCreating(true);
    try {
      const layoutData = {
        ...formData,
        entity: entity
      };
      
      const result = await onCreateLayout(layoutData);
      
      if (result.success) {
        onClose();
      } else {
        setErrors({ general: result.error || 'Error creando layout' });
      }
    } catch (error) {
      setErrors({ general: error.message });
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
          <div>
            <h2 className="text-2xl font-bold">🍽️ Configuración Inicial del Restaurante</h2>
            <p className="text-blue-100 mt-1">Configure el layout base para su sistema de mesas</p>
          </div>
          <button
            onClick={onClose}
            disabled={isCreating}
            className="text-white hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Content */}
          <div className="p-6">
            {/* Error general */}
            {errors.general && (
              <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.general}
                </div>
              </div>
            )}

            {/* Información del proyecto */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-medium text-blue-900 mb-2">¡Bienvenido al Sistema de Restaurante!</h3>
              <p className="text-blue-700 text-sm">
                Este asistente le ayudará a configurar el layout inicial de su restaurante. 
                Podrá crear mesas, arrastarlas, subir un croquis de fondo y gestionar todo desde una interfaz visual.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Información básica */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Información Básica
                </h3>
                
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Layout *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isCreating}
                    placeholder="ej: Restaurante Principal, Salón VIP..."
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isCreating}
                    placeholder="Descripción del layout del restaurante..."
                  />
                </div>

                {/* Crear mesas por defecto */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="create_default_tables"
                    checked={formData.create_default_tables}
                    onChange={(e) => handleChange('create_default_tables', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={isCreating}
                  />
                  <label htmlFor="create_default_tables" className="ml-2 block text-sm text-gray-900">
                    Crear 6 mesas de ejemplo
                  </label>
                </div>
              </div>

              {/* Configuración de canvas */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                  Dimensiones del Canvas
                </h3>
                
                {/* Ancho */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ancho (pixels) *
                  </label>
                  <select
                    value={formData.background_width}
                    onChange={(e) => handleChange('background_width', parseInt(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.background_width ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isCreating}
                  >
                    <option value={800}>800px (Pequeño)</option>
                    <option value={1000}>1000px (Mediano)</option>
                    <option value={1200}>1200px (Grande)</option>
                    <option value={1500}>1500px (Muy Grande)</option>
                  </select>
                  {errors.background_width && <p className="text-red-500 text-xs mt-1">{errors.background_width}</p>}
                </div>

                {/* Alto */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alto (pixels) *
                  </label>
                  <select
                    value={formData.background_height}
                    onChange={(e) => handleChange('background_height', parseInt(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.background_height ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isCreating}
                  >
                    <option value={400}>400px (Pequeño)</option>
                    <option value={600}>600px (Mediano)</option>
                    <option value={800}>800px (Grande)</option>
                    <option value={1000}>1000px (Muy Grande)</option>
                  </select>
                  {errors.background_height && <p className="text-red-500 text-xs mt-1">{errors.background_height}</p>}
                </div>

                {/* Vista previa de dimensiones */}
                <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                  <p className="text-xs text-gray-600 mb-2">Vista previa de proporción:</p>
                  <div 
                    className="bg-blue-100 border border-blue-300 rounded"
                    style={{
                      width: '100%',
                      height: `${(formData.background_height / formData.background_width) * 100}px`,
                      maxHeight: '80px'
                    }}
                  >
                    <div className="flex items-center justify-center h-full text-xs text-blue-700">
                      {formData.background_width} × {formData.background_height}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Información adicional */}
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">📝 Nota Importante:</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Después de crear el layout, podrá agregar mesas adicionales</li>
                <li>• Podrá subir una imagen de fondo (plano del restaurante)</li>
                <li>• Las mesas se pueden arrastrar y redimensionar</li>
                <li>• Toda la configuración se guarda automáticamente</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center p-6 border-t bg-gray-50 rounded-b-lg">
            <div className="text-sm text-gray-500">
              Entidad: <span className="font-medium">{entity}</span>
            </div>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isCreating}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-md hover:from-blue-600 hover:to-purple-700 transition-colors disabled:from-gray-400 disabled:to-gray-500 flex items-center"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Creando Layout...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Crear Layout del Restaurante
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RestaurantSetupModal;