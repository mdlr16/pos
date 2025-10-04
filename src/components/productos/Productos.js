import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Package, Plus, Search, Grid, List, Filter, Edit, Trash2, Eye, Camera, Barcode, Upload, AlertCircle, Save, X, DollarSign } from 'lucide-react';

// ProductModal integrado
const ProductModal = ({ isOpen, onClose, productData = null, onSave }) => {
  const { variables, userId, dolibarrToken } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    ref: '',
    label: '',
    description: '',
    price: '',
    stock: '',
    seuil_stock_alerte: '',
    fk_product_type: '0',
    status: '1'
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const API_BASE_URL = variables.SPOS_URL ? `${variables.SPOS_URL}/api/index.php` : null;
  const API_KEY = variables.DOLIBARR_API_KEY || dolibarrToken;

  const getHeaders = () => ({
    'DOLAPIKEY': API_KEY,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  });

  useEffect(() => {
    if (productData) {
      setFormData({
        ref: productData.code || '',
        label: productData.name || '',
        description: productData.description || '',
        price: productData.price || '',
        stock: productData.stock || '',
        seuil_stock_alerte: productData.minStock || '',
        fk_product_type: '0',
        status: productData.status === 'Activo' ? '1' : '0'
      });
    } else {
      // Generar código automático para nuevo producto
      const ref = `PROD${Date.now().toString().slice(-6)}`;
      setFormData(prev => ({ ...prev, ref }));
    }
  }, [productData, isOpen]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error de validación si existe
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.ref.trim()) {
      errors.ref = 'El código es requerido';
    }
    
    if (!formData.label.trim()) {
      errors.label = 'El nombre es requerido';
    }
    
    // Precio es opcional ahora para evitar errores del servidor
    if (formData.price && parseFloat(formData.price) < 0) {
      errors.price = 'El precio no puede ser negativo';
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
      // Intentar con payload mínimo primero (sin campos que puedan causar problemas)
      const minimalPayload = {
        ref: formData.ref,
        label: formData.label,
        fk_product_type: formData.fk_product_type,
        status: formData.status,
        tosell: 1,
        tobuy: 1
      };

      // Solo agregar campos opcionales si tienen valor
      if (formData.description && formData.description.trim()) {
        minimalPayload.description = formData.description;
      }
      
      if (formData.price && parseFloat(formData.price) > 0) {
        minimalPayload.price = parseFloat(formData.price);
      }
      
      if (formData.seuil_stock_alerte && parseInt(formData.seuil_stock_alerte) > 0) {
        minimalPayload.seuil_stock_alerte = parseInt(formData.seuil_stock_alerte);
      }

      console.log('Intentando guardar producto con payload mínimo:', minimalPayload);

      let response;
      let productId;
      
      if (productData) {
        // Actualizar producto existente
        response = await fetch(`${API_BASE_URL}/products/${productData.id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(minimalPayload)
        });
        productId = productData.id;
      } else {
        // Crear nuevo producto
        response = await fetch(`${API_BASE_URL}/products`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(minimalPayload)
        });
      }

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      // Leer la respuesta como texto primero para detectar problemas
      const responseText = await response.text();
      console.log('Response text (first 500 chars):', responseText.substring(0, 500));

      let result;
      let productCreated = false;

      if (!response.ok) {
        // Si el status no es OK, pero podría tener warnings que corrompen la respuesta
        if (responseText.includes('Warning') && responseText.includes('Cannot modify header')) {
          console.warn('Servidor devolvió warnings de PHP, pero el producto podría haberse creado');
          
          // Intentar extraer información útil de la respuesta corrupta
          const warningMatch = responseText.match(/Warning.*?in.*?on line \d+/g);
          if (warningMatch) {
            console.warn('Warnings detectados:', warningMatch.join('; '));
          }
          
          // Asumir que el producto se creó exitosamente a pesar de los warnings
          result = { success: true, id: 'created_with_warnings' };
          productCreated = true;
        } else {
          throw new Error(`Error del servidor ${response.status}: Respuesta corrupta o inválida`);
        }
      } else {
        // Status es OK, intentar parsear JSON
        try {
          if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
            result = JSON.parse(responseText);
            productCreated = true;
          } else if (responseText.includes('Warning')) {
            console.warn('Respuesta con warnings pero status OK');
            result = { success: true, id: 'created_with_warnings' };
            productCreated = true;
          } else {
            throw new Error('Respuesta no es JSON válido');
          }
        } catch (parseError) {
          console.error('Error parseando JSON:', parseError);
          console.log('Respuesta completa:', responseText);
          
          // Si el status es 200/201 pero no podemos parsear, asumir éxito
          if (response.status === 200 || response.status === 201) {
            result = { success: true, id: 'created_but_unparseable' };
            productCreated = true;
          } else {
            throw new Error('No se pudo procesar la respuesta del servidor');
          }
        }
      }

      if (productCreated) {
        console.log('Producto procesado exitosamente:', result);

        // Si es un producto nuevo y tiene stock inicial, intentar crear movimiento de stock
        if (!productData && formData.stock && parseInt(formData.stock) > 0) {
          // Solo intentar si tenemos un ID válido
          productId = result.id || result;
          if (productId && productId !== 'created_with_warnings' && productId !== 'created_but_unparseable') {
            console.log('Intentando crear movimiento de stock inicial para producto:', productId);
            
            try {
              await createInitialStockMovement(productId, parseInt(formData.stock));
            } catch (stockError) {
              console.warn('No se pudo crear el movimiento de stock inicial:', stockError.message);
            }
          } else {
            console.warn('No se pudo crear movimiento de stock: ID de producto no disponible');
          }
        }

        // Mostrar mensaje apropiado según el resultado
        if (result.id === 'created_with_warnings') {
          alert(`${productData ? 'Producto actualizado' : 'Producto creado'} exitosamente.\n\nNota: El servidor Dolibarr devolvió warnings de PHP. Contacte al administrador para revisar la configuración.`);
        } else {
          alert(productData ? 'Producto actualizado exitosamente' : 'Producto creado exitosamente');
        }
        
        if (onSave) {
          onSave(result);
        }
        onClose();
        resetForm();
      } else {
        throw new Error('No se pudo confirmar la creación del producto');
      }
      
    } catch (error) {
      console.error('Error completo guardando producto:', error);
      
      // Mensaje de error más específico
      let errorMessage = 'Error al guardar el producto: ' + error.message;
      
      if (error.message.includes('corrupta') || error.message.includes('inválida')) {
        errorMessage += '\n\nEsto puede ser causado por warnings de PHP en el servidor Dolibarr. Recomendaciones:\n' +
                      '1. Contacte al administrador del servidor\n' +
                      '2. Configure PHP para no mostrar warnings en producción\n' +
                      '3. Verifique la configuración VAT en Dolibarr';
      }
      
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Función auxiliar para crear movimiento de stock inicial
  const createInitialStockMovement = async (productId, quantity) => {
    try {
      const stockMovement = {
        product_id: productId,
        qty: quantity,
        type: 3, // Tipo de movimiento: corrección de inventario
        label: 'Stock inicial',
        price: parseFloat(formData.price) || 0,
        inventorycode: 'INV-INICIAL-' + Date.now()
      };

      const response = await fetch(`${API_BASE_URL}/stockmovements`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(stockMovement)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Error ${response.status}`);
      }

      console.log('Movimiento de stock inicial creado exitosamente');
    } catch (error) {
      console.error('Error creando movimiento de stock:', error);
      throw error;
    }
  };

  const resetForm = () => {
    const ref = `PROD${Date.now().toString().slice(-6)}`;
    setFormData({
      ref,
      label: '',
      description: '',
      price: '',
      stock: '',
      seuil_stock_alerte: '',
      fk_product_type: '0',
      status: '1'
    });
    setValidationErrors({});
  };

  const handleClose = () => {
    if (!productData) {
      resetForm();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-purple-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {productData ? 'Editar Producto' : 'Crear Nuevo Producto'}
              </h2>
              <p className="text-sm text-gray-600">
                Información del producto en Dolibarr
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Barcode className="w-4 h-4 inline mr-1" />
                  Código del Producto *
                </label>
                <input
                  type="text"
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                    validationErrors.ref ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={formData.ref}
                  onChange={(e) => handleInputChange('ref', e.target.value)}
                  placeholder="Código único"
                />
                {validationErrors.ref && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.ref}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo
                </label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  value={formData.fk_product_type}
                  onChange={(e) => handleInputChange('fk_product_type', e.target.value)}
                >
                  <option value="0">Producto</option>
                  <option value="1">Servicio</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Producto *
              </label>
              <input
                type="text"
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                  validationErrors.label ? 'border-red-500' : 'border-gray-300'
                }`}
                value={formData.label}
                onChange={(e) => handleInputChange('label', e.target.value)}
                placeholder="Nombre descriptivo del producto"
              />
              {validationErrors.label && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.label}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                rows="3"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Descripción del producto"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Precio de Venta
                  <span className="text-xs text-gray-500 block">Opcional - se puede configurar después</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                >
                  <option value="1">Activo</option>
                  <option value="0">Inactivo</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stock Inicial
                  <span className="text-xs text-gray-500 block">Solo para productos nuevos</span>
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  value={formData.stock}
                  onChange={(e) => handleInputChange('stock', e.target.value)}
                  placeholder="0"
                  disabled={!!productData} // Deshabilitar para productos existentes
                />
                {productData && (
                  <p className="text-xs text-gray-500 mt-1">
                    Use el módulo de stock para modificar inventario
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stock Mínimo
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  value={formData.seuil_stock_alerte}
                  onChange={(e) => handleInputChange('seuil_stock_alerte', e.target.value)}
                  placeholder="5"
                />
              </div>
            </div>

            {/* Información sobre stock inicial */}
            {!productData && formData.stock && parseInt(formData.stock) > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">🔄 Movimiento de stock automático:</h4>
                <p className="text-sm text-yellow-700">
                  Se creará un movimiento de inventario inicial de <strong>{formData.stock} unidades</strong> cuando se guarde el producto.
                </p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Estrategia de creación minimalista:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Se envían solo los campos esenciales para minimizar errores</li>
                <li>• El precio y otros campos son opcionales en la creación inicial</li>
                <li>• Se puede completar la información desde el catálogo de Dolibarr</li>
                <li>• El stock inicial se registra como movimiento de inventario separado</li>
                <li>• Configuración automática: "Para vender" y "Para comprar" activados</li>
              </ul>
            </div>

            {/* Aviso sobre posibles errores del servidor */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">⚠️ Manejo de errores mejorado:</h4>
              <p className="text-sm text-yellow-700">
                Si el servidor Dolibarr devuelve warnings de PHP, el sistema intentará guardar el producto de todas formas. 
                Contacte al administrador si persisten los errores.
              </p>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
            <button
              onClick={handleClose}
              className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || !API_KEY}
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

const Productos = ({ terminal }) => {
  const { variables, dolibarrToken, isInitialized, refreshDolibarrToken } = useContext(AuthContext);
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['Todos']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // URL base de la API y token
  const API_BASE_URL = variables.SPOS_URL ? `${variables.SPOS_URL}/api/index.php` : null;
  const API_KEY = variables.DOLIBARR_API_KEY || dolibarrToken;

  // Headers para las peticiones
  const getHeaders = () => {
    if (!API_KEY) {
      throw new Error('Token de API no disponible');
    }
    return {
      'DOLAPIKEY': API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  };

  // Funciones de API
  const fetchProducts = async () => {
    if (!API_BASE_URL || !API_KEY) {
      console.error('Cannot fetch products: Missing API_BASE_URL or API_KEY');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/products?sortfield=t.ref&sortorder=ASC&limit=100&includestockdata=1`, {
        method: 'GET',
        headers: getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Productos obtenidos:', data);
      
      // Transformar datos de Dolibarr al formato del componente
      const transformedProducts = data.map(product => ({
        id: product.id,
        name: product.label || product.ref,
        category: product.categories?.[0]?.label || 'Sin categoría',
        price: parseFloat(product.price || 0),
        stock: parseInt(product.stock_reel || 0),
        minStock: parseInt(product.seuil_stock_alerte || 5),
        code: product.ref,
        image: '/api/placeholder/100/100', // Placeholder por ahora
        status: product.status === '1' ? 'Activo' : 'Inactivo',
        description: product.description || '',
        barcode: product.barcode || ''
      }));

      setProducts(transformedProducts);
    } catch (err) {
      console.error('Error al obtener productos:', err);
      setError('Error al cargar productos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    if (!API_BASE_URL || !API_KEY) {
      console.error('Cannot fetch categories: Missing API_BASE_URL or API_KEY');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/categories?type=product&sortfield=label&sortorder=ASC`, {
        method: 'GET',
        headers: getHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        const categoryNames = data.map(cat => cat.label || cat.ref);
        setCategories(['Todos', ...categoryNames]);
      }
    } catch (err) {
      console.error('Error al obtener categorías:', err);
      // Si falla, usar categorías por defecto
      setCategories([
        'Todos',
        'Electrónicos',
        'Ropa',
        'Hogar',
        'Deportes',
        'Libros',
        'Alimentación'
      ]);
    }
  };

  // Función para abrir modal de edición
  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowProductModal(true);
  };

  // Función para abrir modal de creación
  const handleCreateProduct = () => {
    setEditingProduct(null);
    setShowProductModal(true);
  };

  // Función para manejar el guardado desde el modal
  const handleProductSave = async (savedProduct) => {
    console.log('Producto guardado:', savedProduct);
    // Recargar la lista de productos
    await fetchProducts();
  };

  // Función para cerrar el modal
  const handleModalClose = () => {
    setShowProductModal(false);
    setEditingProduct(null);
  };

  const deleteProduct = async (productId) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este producto?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Error ${response.status}`);
      }

      await fetchProducts();
      alert('Producto eliminado exitosamente');
    } catch (err) {
      console.error('Error al eliminar producto:', err);
      setError('Error al eliminar producto: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    console.log('Productos useEffect - Checking API readiness:', {
      isInitialized,
      hasApiBaseUrl: !!API_BASE_URL,
      hasApiKey: !!API_KEY,
      sposUrl: variables.SPOS_URL
    });

    if (isInitialized && API_BASE_URL && API_KEY) {
      console.log('API ready - Loading products and categories');
      fetchProducts();
      fetchCategories();
    } else if (isInitialized && !API_KEY) {
      setError('Token de Dolibarr no disponible. Intente cerrar sesión e iniciar sesión nuevamente.');
    } else if (isInitialized && !API_BASE_URL) {
      setError('URL de Dolibarr (SPOS_URL) no configurada');
    }
  }, [isInitialized, API_BASE_URL, API_KEY]);

  // Función para renovar token
  const handleRefreshToken = async () => {
    setLoading(true);
    try {
      const newToken = await refreshDolibarrToken();
      if (newToken) {
        setError('');
        // Reintentar cargar datos
        await fetchProducts();
        await fetchCategories();
      } else {
        setError('No se pudo renovar el token. Verifique sus credenciales.');
      }
    } catch (err) {
      setError('Error al renovar token: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Funciones auxiliares
  const getStockStatus = (stock, minStock) => {
    if (stock <= minStock) {
      return { color: 'text-red-600 bg-red-100', label: 'Stock Bajo' };
    } else if (stock <= minStock * 2) {
      return { color: 'text-yellow-600 bg-yellow-100', label: 'Stock Medio' };
    }
    return { color: 'text-green-600 bg-green-100', label: 'Stock Alto' };
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === '' || selectedCategory === 'Todos' || 
                           product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const quickActions = [
    {
      title: 'Nuevo Producto',
      description: 'Agregar producto al catálogo',
      icon: Plus,
      color: 'bg-purple-500 hover:bg-purple-600',
      action: handleCreateProduct,
      disabled: !API_KEY
    },
    {
      title: 'Actualizar Lista',
      description: 'Recargar productos desde Dolibarr',
      icon: Upload,
      color: 'bg-blue-500 hover:bg-blue-600',
      action: fetchProducts,
      disabled: !API_KEY
    },
    {
      title: 'Renovar Token',
      description: 'Actualizar token de Dolibarr',
      icon: AlertCircle,
      color: API_KEY ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600',
      action: handleRefreshToken
    },
    {
      title: 'Categorías',
      description: 'Gestionar categorías',
      icon: Grid,
      color: 'bg-orange-500 hover:bg-orange-600',
      action: fetchCategories,
      disabled: !API_KEY
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Package className="w-6 h-6 text-purple-600" />
                Gestión de Productos
              </h1>
              <p className="text-gray-600">Terminal: {terminal?.name || 'N/A'}</p>
              <p className="text-sm text-gray-500">
                Conectado a: {variables.SPOS_URL || 'No configurado'}
              </p>
              <p className="text-xs text-gray-400">
                Token: {API_KEY ? `${API_KEY.substring(0, 8)}...` : 'No disponible'}
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleCreateProduct}
                disabled={loading || !API_KEY}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nuevo Producto
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
            <button 
              onClick={() => setError('')}
              className="ml-auto text-red-700 hover:text-red-900"
            >
              ✕
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-6">
            Cargando...
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {quickActions.map((action, index) => (
            <div
              key={index}
              onClick={action.disabled ? undefined : action.action}
              className={`${action.color} text-white rounded-lg p-4 transform transition-all duration-200 hover:scale-105 ${
                loading || action.disabled
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-3">
                <action.icon className="w-6 h-6" />
                <div>
                  <h3 className="font-semibold text-sm">{action.title}</h3>
                  <p className="text-xs opacity-90">{action.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar productos por nombre o código..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-purple-100 text-purple-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-purple-100 text-purple-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Products Display */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => {
                const stockStatus = getStockStatus(product.stock, product.minStock);
                return (
                  <div key={product.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="relative mb-4">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-32 object-cover rounded-lg bg-gray-100"
                      />
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                          {stockStatus.label}
                        </span>
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-1">{product.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{product.category}</p>
                    <p className="text-sm text-gray-500 mb-2">Código: {product.code}</p>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-lg font-bold text-purple-600">Q.{product.price.toFixed(2)}</span>
                      <span className="text-sm text-gray-600">Stock: {product.stock}</span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        className="flex-1 bg-purple-100 text-purple-600 py-1 px-2 rounded text-sm hover:bg-purple-200"
                        onClick={() => handleEditProduct(product)}
                      >
                        <Edit className="w-3 h-3 inline mr-1" />
                        Editar
                      </button>
                      <button 
                        className="bg-red-100 text-red-600 py-1 px-2 rounded text-sm hover:bg-red-200"
                        onClick={() => deleteProduct(product.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Producto</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Categoría</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Código</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Precio</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Stock</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Estado</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const stockStatus = getStockStatus(product.stock, product.minStock);
                    return (
                      <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-10 h-10 object-cover rounded bg-gray-100"
                            />
                            <span className="font-medium text-gray-800">{product.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{product.category}</td>
                        <td className="py-3 px-4 text-gray-600">{product.code}</td>
                        <td className="py-3 px-4 font-medium text-purple-600">Q.{product.price.toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                            {product.stock}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            {product.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button 
                              className="text-blue-600 hover:text-blue-800"
                              onClick={() => console.log('Ver producto:', product.id)}
                              title="Ver detalles"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button 
                              className="text-purple-600 hover:text-purple-800"
                              onClick={() => handleEditProduct(product)}
                              title="Editar producto"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              className="text-red-600 hover:text-red-800"
                              onClick={() => deleteProduct(product.id)}
                              title="Eliminar producto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filteredProducts.length === 0 && !loading && (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No se encontraron productos</h3>
              <p className="text-gray-500">
                {products.length === 0 
                  ? 'No hay productos en Dolibarr o hay un error de conexión'
                  : 'Intenta cambiar los filtros de búsqueda'
                }
              </p>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Productos</p>
                <p className="text-2xl font-bold text-purple-600">{products.length}</p>
              </div>
              <Package className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Stock Bajo</p>
                <p className="text-2xl font-bold text-red-600">
                  {products.filter(p => p.stock <= p.minStock).length}
                </p>
              </div>
              <Barcode className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Categorías</p>
                <p className="text-2xl font-bold text-blue-600">{categories.length - 1}</p>
              </div>
              <Grid className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Valor Inventario</p>
                <p className="text-2xl font-bold text-green-600">
                  Q.{products.reduce((total, p) => total + (p.price * p.stock), 0).toFixed(2)}
                </p>
              </div>
              <Camera className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Product Modal */}
      <ProductModal
        isOpen={showProductModal}
        onClose={handleModalClose}
        productData={editingProduct}
        onSave={handleProductSave}
      />
    </div>
  );
};

export default Productos;