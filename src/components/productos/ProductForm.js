import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Package, Barcode, DollarSign, Archive, Tag, Image, Save, X, Camera, Upload } from 'lucide-react';

const ProductForm = ({ isOpen, onClose, productData = null, onSave }) => {
  const { variables, userId } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    codigo: '',
    codigoBarras: '',
    nombre: '',
    descripcion: '',
    categoria: '',
    marca: '',
    unidadMedida: 'PZA',
    precio: 0,
    precioMinimo: 0,
    costo: 0,
    stockMinimo: 0,
    stockMaximo: 0,
    stockActual: 0,
    ubicacion: '',
    proveedor: '',
    estado: 'Activo',
    aplicaIVA: true,
    esServicio: false,
    peso: 0,
    dimensiones: '',
    observaciones: ''
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const categorias = [
    'Electrónicos',
    'Ropa y Accesorios',
    'Hogar y Jardín',
    'Deportes y Recreación',
    'Salud y Belleza',
    'Automotriz',
    'Libros y Medios',
    'Alimentación',
    'Oficina y Papelería',
    'Juguetes',
    'Herramientas',
    'Otros'
  ];

  const unidadesMedida = [
    { value: 'PZA', label: 'Pieza' },
    { value: 'KG', label: 'Kilogramo' },
    { value: 'LT', label: 'Litro' },
    { value: 'MT', label: 'Metro' },
    { value: 'M2', label: 'Metro Cuadrado' },
    { value: 'M3', label: 'Metro Cúbico' },
    { value: 'PAR', label: 'Par' },
    { value: 'SET', label: 'Set' },
    { value: 'CAJA', label: 'Caja' },
    { value: 'PAQ', label: 'Paquete' }
  ];

  useEffect(() => {
    if (productData) {
      setFormData({
        codigo: productData.codigo || '',
        codigoBarras: productData.codigoBarras || '',
        nombre: productData.nombre || '',
        descripcion: productData.descripcion || '',
        categoria: productData.categoria || '',
        marca: productData.marca || '',
        unidadMedida: productData.unidadMedida || 'PZA',
        precio: productData.precio || 0,
        precioMinimo: productData.precioMinimo || 0,
        costo: productData.costo || 0,
        stockMinimo: productData.stockMinimo || 0,
        stockMaximo: productData.stockMaximo || 0,
        stockActual: productData.stockActual || 0,
        ubicacion: productData.ubicacion || '',
        proveedor: productData.proveedor || '',
        estado: productData.estado || 'Activo',
        aplicaIVA: productData.aplicaIVA !== false,
        esServicio: productData.esServicio || false,
        peso: productData.peso || 0,
        dimensiones: productData.dimensiones || '',
        observaciones: productData.observaciones || ''
      });
      
      if (productData.imagen) {
        setImagePreview(productData.imagen);
      }
    } else {
      // Generar código automático para nuevo producto
      const codigo = `PROD${Date.now().toString().slice(-6)}`;
      setFormData(prev => ({ ...prev, codigo }));
    }
  }, [productData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error de validación si existe
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }

    // Calcular margen de ganancia automáticamente
    if (field === 'precio' || field === 'costo') {
      const nuevoPrecio = field === 'precio' ? value : formData.precio;
      const nuevoCosto = field === 'costo' ? value : formData.costo;
      
      if (nuevoCosto > 0 && nuevoPrecio > nuevoCosto) {
        const margen = ((nuevoPrecio - nuevoCosto) / nuevoCosto * 100).toFixed(2);
        console.log(`Margen de ganancia: ${margen}%`);
      }
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('La imagen no debe superar los 5MB');
        return;
      }

      setImageFile(file);
      
      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateBarcode = () => {
    const barcode = Date.now().toString();
    handleInputChange('codigoBarras', barcode);
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.nombre.trim()) {
      errors.nombre = 'El nombre es requerido';
    }
    
    if (!formData.categoria) {
      errors.categoria = 'La categoría es requerida';
    }
    
    if (formData.precio <= 0) {
      errors.precio = 'El precio debe ser mayor a 0';
    }
    
    if (formData.precioMinimo < 0) {
      errors.precioMinimo = 'El precio mínimo no puede ser negativo';
    }
    
    if (formData.precioMinimo > formData.precio) {
      errors.precioMinimo = 'El precio mínimo no puede ser mayor al precio de venta';
    }
    
    if (formData.stockMinimo < 0) {
      errors.stockMinimo = 'El stock mínimo no puede ser negativo';
    }
    
    if (formData.stockMaximo > 0 && formData.stockMaximo < formData.stockMinimo) {
      errors.stockMaximo = 'El stock máximo debe ser mayor al stock mínimo';
    }

    if (formData.costo < 0) {
      errors.costo = 'El costo no puede ser negativo';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const productoCompleto = {
        ...formData,
        imagen: imageFile ? 'imagen_procesada.jpg' : imagePreview, // En producción procesar la imagen
        fechaCreacion: productData ? productData.fechaCreacion : new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        usuarioCreacion: productData ? productData.usuarioCreacion : userId,
        usuarioModificacion: userId
      };

      console.log('Guardando producto:', productoCompleto);
      
      // Aquí iría la llamada a tu API
      // const response = await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=saveProducto`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(productoCompleto)
      // });
      
      // Simular respuesta exitosa
      setTimeout(() => {
        alert(productData ? 'Producto actualizado exitosamente' : 'Producto creado exitosamente');
        if (onSave) {
          onSave(productoCompleto);
        }
        onClose();
        setIsLoading(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error guardando producto:', error);
      alert('Error al guardar el producto');
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-purple-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {productData ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <p className="text-sm text-gray-600">
                {productData ? `Código: ${productData.codigo}` : 'Complete la información del producto'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Columna Izquierda - Información Básica */}
            <div className="lg:col-span-2 space-y-6">
              {/* Información General */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-purple-600" />
                  Información General
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Código del Producto
                    </label>
                    <input
                      type="text"
                      className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      value={formData.codigo}
                      onChange={(e) => handleInputChange('codigo', e.target.value)}
                      placeholder="Código automático"
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Código de Barras
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        value={formData.codigoBarras}
                        onChange={(e) => handleInputChange('codigoBarras', e.target.value)}
                        placeholder="Código de barras"
                      />
                      <button
                        type="button"
                        onClick={generateBarcode}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                      >
                        <Barcode className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del Producto *
                    </label>
                    <input
                      type="text"
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                        validationErrors.nombre ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={formData.nombre}
                      onChange={(e) => handleInputChange('nombre', e.target.value)}
                      placeholder="Nombre descriptivo del producto"
                    />
                    {validationErrors.nombre && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.nombre}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción
                    </label>
                    <textarea
                      rows="3"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      value={formData.descripcion}
                      onChange={(e) => handleInputChange('descripcion', e.target.value)}
                      placeholder="Descripción detallada del producto"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categoría *
                    </label>
                    <select
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                        validationErrors.categoria ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={formData.categoria}
                      onChange={(e) => handleInputChange('categoria', e.target.value)}
                    >
                      <option value="">Seleccionar categoría</option>
                      {categorias.map(categoria => (
                        <option key={categoria} value={categoria}>
                          {categoria}
                        </option>
                      ))}
                    </select>
                    {validationErrors.categoria && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.categoria}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Marca
                    </label>
                    <input
                      type="text"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      value={formData.marca}
                      onChange={(e) => handleInputChange('marca', e.target.value)}
                      placeholder="Marca del producto"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unidad de Medida
                    </label>
                    <select
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      value={formData.unidadMedida}
                      onChange={(e) => handleInputChange('unidadMedida', e.target.value)}
                    >
                      {unidadesMedida.map(unidad => (
                        <option key={unidad.value} value={unidad.value}>
                          {unidad.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado
                    </label>
                    <select
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      value={formData.estado}
                      onChange={(e) => handleInputChange('estado', e.target.value)}
                    >
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                      <option value="Descontinuado">Descontinuado</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Precios y Costos */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                  Precios y Costos
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Costo
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                        validationErrors.costo ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={formData.costo}
                      onChange={(e) => handleInputChange('costo', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                    {validationErrors.costo && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.costo}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Precio de Venta *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                        validationErrors.precio ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={formData.precio}
                      onChange={(e) => handleInputChange('precio', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                    {validationErrors.precio && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.precio}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Precio Mínimo
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                        validationErrors.precioMinimo ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={formData.precioMinimo}
                      onChange={(e) => handleInputChange('precioMinimo', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                    {validationErrors.precioMinimo && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.precioMinimo}</p>
                    )}
                  </div>
                </div>

                {/* Margen de ganancia calculado */}
                {formData.costo > 0 && formData.precio > formData.costo && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700">
                      <strong>Margen de ganancia: </strong>
                      {((formData.precio - formData.costo) / formData.costo * 100).toFixed(2)}%
                    </p>
                  </div>
                )}
              </div>

              {/* Inventario */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Archive className="w-5 h-5 text-purple-600" />
                  Control de Inventario
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stock Mínimo
                    </label>
                    <input
                      type="number"
                      min="0"
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                        validationErrors.stockMinimo ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={formData.stockMinimo}
                      onChange={(e) => handleInputChange('stockMinimo', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                    {validationErrors.stockMinimo && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.stockMinimo}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stock Máximo
                    </label>
                    <input
                      type="number"
                      min="0"
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                        validationErrors.stockMaximo ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={formData.stockMaximo}
                      onChange={(e) => handleInputChange('stockMaximo', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                    {validationErrors.stockMaximo && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.stockMaximo}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stock Actual
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      value={formData.stockActual}
                      onChange={(e) => handleInputChange('stockActual', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ubicación en Almacén
                    </label>
                    <input
                      type="text"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      value={formData.ubicacion}
                      onChange={(e) => handleInputChange('ubicacion', e.target.value)}
                      placeholder="Ej: Estante A, Nivel 2, Posición 3"
                    />
                  </div>
                </div>
              </div>

              {/* Configuraciones Adicionales */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Configuraciones</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="aplicaIVA"
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      checked={formData.aplicaIVA}
                      onChange={(e) => handleInputChange('aplicaIVA', e.target.checked)}
                    />
                    <label htmlFor="aplicaIVA" className="text-sm font-medium text-gray-700">
                      Aplica IVA
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="esServicio"
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      checked={formData.esServicio}
                      onChange={(e) => handleInputChange('esServicio', e.target.checked)}
                    />
                    <label htmlFor="esServicio" className="text-sm font-medium text-gray-700">
                      Es un servicio (no requiere inventario)
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna Derecha - Imagen y Datos Adicionales */}
            <div className="space-y-6">
              {/* Imagen del Producto */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Image className="w-5 h-5 text-purple-600" />
                  Imagen del Producto
                </h3>
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg mb-4"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          setImageFile(null);
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="py-8">
                      <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 mb-4">Subir imagen del producto</p>
                    </div>
                  )}
                  
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors inline-flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {imagePreview ? 'Cambiar imagen' : 'Subir imagen'}
                  </label>
                </div>
              </div>

              {/* Información Física */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Información Física</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Peso (kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      value={formData.peso}
                      onChange={(e) => handleInputChange('peso', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dimensiones
                    </label>
                    <input
                      type="text"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      value={formData.dimensiones}
                      onChange={(e) => handleInputChange('dimensiones', e.target.value)}
                      placeholder="Largo x Ancho x Alto"
                    />
                  </div>
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones
                </label>
                <textarea
                  rows="4"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  value={formData.observaciones}
                  onChange={(e) => handleInputChange('observaciones', e.target.value)}
                  placeholder="Observaciones adicionales..."
                />
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex justify-end gap-3 pt-8 border-t border-gray-200 mt-8">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isLoading ? 'Guardando...' : (productData ? 'Actualizar' : 'Crear')} Producto
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductForm;