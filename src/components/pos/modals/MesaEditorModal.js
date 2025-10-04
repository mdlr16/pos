import React, { useState, useEffect } from 'react';

const MesaEditorModal = ({ 
  isOpen, 
  onClose, 
  mesa = null, // null para crear nueva, objeto para editar
  onSave,
  onDelete,
  getNextMesaNumber,
  layoutDimensions = { width: 1000, height: 600 }
}) => {
  
  const [formData, setFormData] = useState({
    numero: '',
    nombre: '',
    capacidad: 4,
    tipo_mesa: 'rectangular',
    pos_x: 100,
    pos_y: 100,
    ancho: 80,
    alto: 80,
    color: '#4F46E5'
  });
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const isEditing = !!mesa;

  // Tipos de mesa disponibles
  const tiposMesa = [
    { value: 'rectangular', label: 'Rectangular', icon: '⬜' },
    { value: 'circular', label: 'Circular', icon: '⭕' },
    { value: 'cuadrada', label: 'Cuadrada', icon: '🟦' }
  ];

  // Colores predefinidos
  const coloresPredefinidos = [
    '#4F46E5', // Índigo
    '#10B981', // Esmeralda
    '#F59E0B', // Ámbar
    '#EF4444', // Rojo
    '#8B5CF6', // Violeta
    '#06B6D4', // Cian
    '#84CC16', // Lima
    '#F97316'  // Naranja
  ];

  // Cargar datos cuando abre el modal
  useEffect(() => {
    if (isOpen) {
      if (mesa) {
        // Modo edición - cargar datos existentes
        setFormData({
          numero: mesa.numero,
          nombre: mesa.nombre,
          capacidad: mesa.capacidad,
          tipo_mesa: mesa.tipo_mesa || 'rectangular',
          pos_x: mesa.pos_x,
          pos_y: mesa.pos_y,
          ancho: mesa.ancho || 80,
          alto: mesa.alto || 80,
          color: mesa.color || '#4F46E5'
        });
      } else {
        // Modo creación - valores por defecto
        const nextNumber = getNextMesaNumber ? getNextMesaNumber() : 1;
        setFormData({
          numero: nextNumber,
          nombre: `Mesa ${nextNumber}`,
          capacidad: 4,
          tipo_mesa: 'rectangular',
          pos_x: 100,
          pos_y: 100,
          ancho: 80,
          alto: 80,
          color: '#4F46E5'
        });
      }
      setErrors({});
    }
  }, [isOpen, mesa, getNextMesaNumber]);

  // Manejar cambios en el formulario
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

  // Validar formulario
  const validateForm = () => {
    const newErrors = {};

    if (!formData.numero || formData.numero < 1) {
      newErrors.numero = 'Número de mesa es requerido y debe ser mayor a 0';
    }

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'Nombre de mesa es requerido';
    }

    if (!formData.capacidad || formData.capacidad < 1 || formData.capacidad > 20) {
      newErrors.capacidad = 'Capacidad debe estar entre 1 y 20 personas';
    }

    if (formData.pos_x < 0 || formData.pos_x > layoutDimensions.width - formData.ancho) {
      newErrors.pos_x = `Posición X debe estar entre 0 y ${layoutDimensions.width - formData.ancho}`;
    }

    if (formData.pos_y < 0 || formData.pos_y > layoutDimensions.height - formData.alto) {
      newErrors.pos_y = `Posición Y debe estar entre 0 y ${layoutDimensions.height - formData.alto}`;
    }

    if (formData.ancho < 40 || formData.ancho > 200) {
      newErrors.ancho = 'Ancho debe estar entre 40 y 200 pixels';
    }

    if (formData.alto < 40 || formData.alto > 200) {
      newErrors.alto = 'Alto debe estar entre 40 y 200 pixels';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Guardar mesa
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await onSave(formData);
      if (result.success) {
        onClose();
      } else {
        setErrors({ general: result.error || 'Error desconocido' });
      }
    } catch (error) {
      setErrors({ general: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Eliminar mesa
  const handleDelete = async () => {
    if (!mesa || !onDelete) return;

    const confirmDelete = window.confirm(
      `¿Está seguro de eliminar la mesa "${mesa.nombre}"?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmDelete) return;

    setIsLoading(true);
    try {
      const result = await onDelete(mesa.rowid);
      if (result.success) {
        onClose();
      } else {
        setErrors({ general: result.error || 'Error eliminando mesa' });
      }
    } catch (error) {
      setErrors({ general: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Centrar mesa en el layout
  const handleCenterMesa = () => {
    const centerX = Math.max(0, (layoutDimensions.width - formData.ancho) / 2);
    const centerY = Math.max(0, (layoutDimensions.height - formData.alto) / 2);
    
    setFormData(prev => ({
      ...prev,
      pos_x: Math.round(centerX),
      pos_y: Math.round(centerY)
    }));
  };

  // Ajustar tamaño según tipo de mesa
  const handleTipoMesaChange = (tipo) => {
    let newSize = { ancho: formData.ancho, alto: formData.alto };
    
    if (tipo === 'circular' || tipo === 'cuadrada') {
      // Para mesas circulares y cuadradas, hacer cuadrado
      const size = Math.max(formData.ancho, formData.alto);
      newSize = { ancho: size, alto: size };
    }
    
    setFormData(prev => ({
      ...prev,
      tipo_mesa: tipo,
      ...newSize
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? `Editar ${mesa.nombre}` : 'Crear Nueva Mesa'}
          </h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error general */}
          {errors.general && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {errors.general}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Información básica */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Información Básica</h3>
              
              {/* Número */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Mesa *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.numero}
                  onChange={(e) => handleChange('numero', parseInt(e.target.value) || '')}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.numero ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                />
                {errors.numero && <p className="text-red-500 text-xs mt-1">{errors.numero}</p>}
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de Mesa *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => handleChange('nombre', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.nombre ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                  placeholder="ej: Mesa VIP, Mesa Ventana..."
                />
                {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
              </div>

              {/* Capacidad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacidad (personas) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.capacidad}
                  onChange={(e) => handleChange('capacidad', parseInt(e.target.value) || '')}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.capacidad ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                />
                {errors.capacidad && <p className="text-red-500 text-xs mt-1">{errors.capacidad}</p>}
              </div>

              {/* Tipo de mesa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Mesa
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {tiposMesa.map(tipo => (
                    <button
                      key={tipo.value}
                      type="button"
                      onClick={() => handleTipoMesaChange(tipo.value)}
                      disabled={isLoading}
                      className={`p-2 border rounded-md transition-colors text-sm ${
                        formData.tipo_mesa === tipo.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-lg">{tipo.icon}</div>
                      <div className="text-xs">{tipo.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Posición y tamaño */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Posición y Tamaño</h3>
              
              {/* Posición */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Posición X *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={layoutDimensions.width}
                    value={formData.pos_x}
                    onChange={(e) => handleChange('pos_x', parseInt(e.target.value) || 0)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.pos_x ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isLoading}
                  />
                  {errors.pos_x && <p className="text-red-500 text-xs mt-1">{errors.pos_x}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Posición Y *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={layoutDimensions.height}
                    value={formData.pos_y}
                    onChange={(e) => handleChange('pos_y', parseInt(e.target.value) || 0)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.pos_y ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isLoading}
                  />
                  {errors.pos_y && <p className="text-red-500 text-xs mt-1">{errors.pos_y}</p>}
                </div>
              </div>

              {/* Botón centrar */}
              <button
                type="button"
                onClick={handleCenterMesa}
                disabled={isLoading}
                className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors text-sm"
              >
                🎯 Centrar en el Layout
              </button>

              {/* Tamaño */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ancho (px) *
                  </label>
                  <input
                    type="number"
                    min="40"
                    max="200"
                    value={formData.ancho}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 40;
                      handleChange('ancho', value);
                      // Si es circular o cuadrada, igualar alto
                      if (formData.tipo_mesa === 'circular' || formData.tipo_mesa === 'cuadrada') {
                        handleChange('alto', value);
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.ancho ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isLoading}
                  />
                  {errors.ancho && <p className="text-red-500 text-xs mt-1">{errors.ancho}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alto (px) *
                  </label>
                  <input
                    type="number"
                    min="40"
                    max="200"
                    value={formData.alto}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 40;
                      handleChange('alto', value);
                      // Si es circular o cuadrada, igualar ancho
                      if (formData.tipo_mesa === 'circular' || formData.tipo_mesa === 'cuadrada') {
                        handleChange('ancho', value);
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.alto ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isLoading || formData.tipo_mesa === 'circular' || formData.tipo_mesa === 'cuadrada'}
                  />
                  {errors.alto && <p className="text-red-500 text-xs mt-1">{errors.alto}</p>}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color de la Mesa
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {coloresPredefinidos.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleChange('color', color)}
                      disabled={isLoading}
                      className={`w-full h-10 rounded-md border-2 transition-all ${
                        formData.color === color
                          ? 'border-gray-900 scale-110'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
                
                {/* Color personalizado */}
                <div className="mt-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => handleChange('color', e.target.value)}
                    disabled={isLoading}
                    className="w-full h-8 border border-gray-300 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Vista previa */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Vista Previa</h3>
            <div className="flex items-center justify-center min-h-[100px] bg-white border border-gray-200 rounded relative">
              <div
                style={{
                  width: `${Math.min(formData.ancho, 80)}px`,
                  height: `${Math.min(formData.alto, 80)}px`,
                  backgroundColor: formData.color,
                  borderRadius: formData.tipo_mesa === 'circular' ? '50%' : '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
                  border: '2px solid rgba(0,0,0,0.2)'
                }}
              >
                <div className="text-center">
                  <div>{formData.numero}</div>
                  <div style={{ fontSize: '8px' }}>{formData.capacidad}p</div>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">
              {formData.nombre} - {formData.tipo_mesa} - {formData.capacidad} personas
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
          <div>
            {isEditing && onDelete && (
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors disabled:bg-red-300"
              >
                {isLoading ? '⏳ Eliminando...' : '🗑️ Eliminar Mesa'}
              </button>
            )}
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
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:bg-blue-300"
            >
              {isLoading ? '⏳ Guardando...' : isEditing ? '💾 Actualizar Mesa' : '➕ Crear Mesa'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MesaEditorModal;