import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Archive, Search, ArrowRight, Save, X, Package, MapPin, Calendar, FileText, AlertCircle } from 'lucide-react';

const TransferenciaModal = ({ isOpen, onClose, terminal }) => {
  const { variables, userId } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    almacenOrigen: '',
    almacenDestino: '',
    fecha: new Date().toISOString().split('T')[0],
    motivo: '',
    observaciones: '',
    estado: 'Pendiente'
  });
  
  const [almacenes, setAlmacenes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [productosTransferencia, setProductosTransferencia] = useState([]);
  const [searchProducto, setSearchProducto] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const motivosTransferencia = [
    'Reabastecimiento de sucursal',
    'Reorganización de inventario',
    'Demanda específica',
    'Balanceo de stock',
    'Traslado por promoción',
    'Optimización de espacios',
    'Consolidación de inventario',
    'Otros'
  ];

  // Mock de almacenes - en producción vendría de tu API
  const mockAlmacenes = [
    { id: 1, codigo: 'ALM001', nombre: 'Almacén Principal', direccion: 'Zona 10, Guatemala' },
    { id: 2, codigo: 'ALM002', nombre: 'Sucursal Centro', direccion: 'Zona 1, Guatemala' },
    { id: 3, codigo: 'ALM003', nombre: 'Sucursal Norte', direccion: 'Zona 17, Guatemala' },
    { id: 4, codigo: 'ALM004', nombre: 'Bodega Mayorista', direccion: 'Villa Nueva' }
  ];

  // Mock de productos con stock por almacén
  const mockProductos = [
    {
      id: 1,
      codigo: 'P001',
      nombre: 'Laptop Dell Inspiron 15',
      stockPorAlmacen: {
        1: 15, 2: 3, 3: 8, 4: 25
      },
      costo: 10000.00,
      peso: 2.5
    },
    {
      id: 2,
      codigo: 'P002',
      nombre: 'Mouse Inalámbrico',
      stockPorAlmacen: {
        1: 50, 2: 12, 3: 8, 4: 100
      },
      costo: 120.00,
      peso: 0.2
    },
    {
      id: 3,
      codigo: 'P003',
      nombre: 'Teclado Mecánico',
      stockPorAlmacen: {
        1: 20, 2: 5, 3: 2, 4: 30
      },
      costo: 650.00,
      peso: 1.2
    },
    {
      id: 4,
      codigo: 'P004',
      nombre: 'Monitor 24"',
      stockPorAlmacen: {
        1: 8, 2: 2, 3: 1, 4: 15
      },
      costo: 2000.00,
      peso: 5.8
    }
  ];

  useEffect(() => {
    setAlmacenes(mockAlmacenes);
    setProductos(mockProductos);
    
    // Establecer almacén origen por defecto basado en el terminal
    if (terminal.fk_warehouse) {
      setFormData(prev => ({ ...prev, almacenOrigen: terminal.fk_warehouse }));
    }
  }, [terminal]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error de validación si existe
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }

    // Si cambia el almacén origen, limpiar productos de transferencia
    if (field === 'almacenOrigen') {
      setProductosTransferencia([]);
    }
  };

  const getStockDisponible = (producto, almacenId) => {
    return producto.stockPorAlmacen[parseInt(almacenId)] || 0;
  };

  const agregarProductoTransferencia = (producto) => {
    if (!formData.almacenOrigen) {
      alert('Debe seleccionar un almacén de origen primero');
      return;
    }

    const stockDisponible = getStockDisponible(producto, formData.almacenOrigen);
    if (stockDisponible <= 0) {
      alert(`No hay stock disponible de ${producto.nombre} en el almacén seleccionado`);
      return;
    }

    const yaExiste = productosTransferencia.find(p => p.id === producto.id);
    
    if (!yaExiste) {
      const nuevaTransferencia = {
        ...producto,
        cantidadTransferir: 1,
        stockDisponible,
        valorTotal: producto.costo
      };
      setProductosTransferencia([...productosTransferencia, nuevaTransferencia]);
    }
    
    setSearchProducto('');
    setShowProductSearch(false);
  };

  const actualizarCantidad = (productoId, cantidad) => {
    setProductosTransferencia(productosTransferencia.map(item => {
      if (item.id === productoId) {
        const cantidadValidada = Math.min(Math.max(1, cantidad), item.stockDisponible);
        return {
          ...item,
          cantidadTransferir: cantidadValidada,
          valorTotal: cantidadValidada * item.costo
        };
      }
      return item;
    }));
  };

  const eliminarProductoTransferencia = (productoId) => {
    setProductosTransferencia(productosTransferencia.filter(item => item.id !== productoId));
  };

  const calcularTotales = () => {
    const totalProductos = productosTransferencia.reduce((sum, item) => sum + item.cantidadTransferir, 0);
    const valorTotal = productosTransferencia.reduce((sum, item) => sum + item.valorTotal, 0);
    const pesoTotal = productosTransferencia.reduce((sum, item) => sum + (item.peso * item.cantidadTransferir), 0);
    
    return { totalProductos, valorTotal, pesoTotal };
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.almacenOrigen) {
      errors.almacenOrigen = 'Debe seleccionar un almacén de origen';
    }
    
    if (!formData.almacenDestino) {
      errors.almacenDestino = 'Debe seleccionar un almacén de destino';
    }
    
    if (formData.almacenOrigen === formData.almacenDestino) {
      errors.almacenDestino = 'El almacén de destino debe ser diferente al de origen';
    }
    
    if (!formData.motivo) {
      errors.motivo = 'Debe seleccionar un motivo para la transferencia';
    }
    
    if (productosTransferencia.length === 0) {
      errors.productos = 'Debe agregar al menos un producto para transferir';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const guardarTransferencia = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const totales = calcularTotales();
      const transferenciaCompleta = {
        ...formData,
        productos: productosTransferencia,
        totales,
        terminal: terminal.rowid,
        usuario: userId,
        fechaCreacion: new Date().toISOString()
      };

      console.log('Guardando transferencia:', transferenciaCompleta);
      
      // Aquí iría la llamada a tu API
      // const response = await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=saveTransferencia`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(transferenciaCompleta)
      // });
      
      // Simular respuesta exitosa
      setTimeout(() => {
        alert('Transferencia creada exitosamente');
        onClose();
        resetForm();
        setIsLoading(false);
      }, 1500);
      
    } catch (error) {
      console.error('Error guardando transferencia:', error);
      alert('Error al guardar la transferencia');
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      almacenOrigen: terminal.fk_warehouse || '',
      almacenDestino: '',
      fecha: new Date().toISOString().split('T')[0],
      motivo: '',
      observaciones: '',
      estado: 'Pendiente'
    });
    setProductosTransferencia([]);
    setValidationErrors({});
  };

  const productosFiltrados = productos.filter(producto => {
    const matchesSearch = producto.nombre.toLowerCase().includes(searchProducto.toLowerCase()) ||
                         producto.codigo.toLowerCase().includes(searchProducto.toLowerCase());
    const tieneStock = formData.almacenOrigen ? getStockDisponible(producto, formData.almacenOrigen) > 0 : true;
    return matchesSearch && tieneStock;
  });

  const almacenOrigenData = almacenes.find(a => a.id == formData.almacenOrigen);
  const almacenDestinoData = almacenes.find(a => a.id == formData.almacenDestino);
  const totales = calcularTotales();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Archive className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-800">Nueva Transferencia de Inventario</h2>
              <p className="text-sm text-gray-600">Mover productos entre almacenes</p>
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
          {/* Información de Transferencia */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Almacén de Origen *
              </label>
              <select
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  validationErrors.almacenOrigen ? 'border-red-500' : 'border-gray-300'
                }`}
                value={formData.almacenOrigen}
                onChange={(e) => handleInputChange('almacenOrigen', e.target.value)}
              >
                <option value="">Seleccionar almacén</option>
                {almacenes.map(almacen => (
                  <option key={almacen.id} value={almacen.id}>
                    {almacen.nombre}
                  </option>
                ))}
              </select>
              {validationErrors.almacenOrigen && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.almacenOrigen}</p>
              )}
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="w-8 h-8 text-blue-600" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Almacén de Destino *
              </label>
              <select
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  validationErrors.almacenDestino ? 'border-red-500' : 'border-gray-300'
                }`}
                value={formData.almacenDestino}
                onChange={(e) => handleInputChange('almacenDestino', e.target.value)}
              >
                <option value="">Seleccionar almacén</option>
                {almacenes.filter(a => a.id != formData.almacenOrigen).map(almacen => (
                  <option key={almacen.id} value={almacen.id}>
                    {almacen.nombre}
                  </option>
                ))}
              </select>
              {validationErrors.almacenDestino && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.almacenDestino}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Fecha de Transferencia
              </label>
              <input
                type="date"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.fecha}
                onChange={(e) => handleInputChange('fecha', e.target.value)}
              />
            </div>
          </div>

          {/* Información de Almacenes */}
          {almacenOrigenData && almacenDestinoData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">Origen: {almacenOrigenData.nombre}</h4>
                <p className="text-sm text-blue-700">{almacenOrigenData.direccion}</p>
                <p className="text-xs text-blue-600 mt-1">Código: {almacenOrigenData.codigo}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-2">Destino: {almacenDestinoData.nombre}</h4>
                <p className="text-sm text-green-700">{almacenDestinoData.direccion}</p>
                <p className="text-xs text-green-600 mt-1">Código: {almacenDestinoData.codigo}</p>
              </div>
            </div>
          )}

          {/* Motivo */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo de la Transferencia *
            </label>
            <select
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                validationErrors.motivo ? 'border-red-500' : 'border-gray-300'
              }`}
              value={formData.motivo}
              onChange={(e) => handleInputChange('motivo', e.target.value)}
            >
              <option value="">Seleccionar motivo</option>
              {motivosTransferencia.map(motivo => (
                <option key={motivo} value={motivo}>
                  {motivo}
                </option>
              ))}
            </select>
            {validationErrors.motivo && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.motivo}</p>
            )}
          </div>

          {/* Búsqueda de Productos */}
          {formData.almacenOrigen && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agregar Productos a Transferir
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar productos por nombre o código..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={searchProducto}
                  onChange={(e) => {
                    setSearchProducto(e.target.value);
                    setShowProductSearch(e.target.value.length > 0);
                  }}
                  onFocus={() => setShowProductSearch(searchProducto.length > 0)}
                />

                {/* Dropdown de productos */}
                {showProductSearch && productosFiltrados.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {productosFiltrados.map(producto => {
                      const stockDisponible = getStockDisponible(producto, formData.almacenOrigen);
                      return (
                        <button
                          key={producto.id}
                          className="w-full p-3 text-left hover:bg-gray-50 flex justify-between items-center"
                          onClick={() => agregarProductoTransferencia(producto)}
                        >
                          <div>
                            <p className="font-medium">{producto.nombre}</p>
                            <p className="text-sm text-gray-600">
                              Código: {producto.codigo} | Stock disponible: {stockDisponible}
                            </p>
                          </div>
                          <span className="text-blue-600 font-semibold">+</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tabla de Productos a Transferir */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Productos a Transferir</h3>
            
            {productosTransferencia.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 font-semibold text-gray-700">Producto</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Stock Disponible</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Cantidad a Transferir</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Costo Unitario</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Valor Total</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosTransferencia.map(item => (
                      <tr key={item.id} className="border-t border-gray-200">
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{item.nombre}</p>
                            <p className="text-sm text-gray-600">{item.codigo}</p>
                          </div>
                        </td>
                        <td className="p-3 text-center font-semibold">
                          {item.stockDisponible}
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min="1"
                            max={item.stockDisponible}
                            className="w-24 p-2 border border-gray-300 rounded text-center"
                            value={item.cantidadTransferir}
                            onChange={(e) => actualizarCantidad(item.id, parseInt(e.target.value) || 1)}
                          />
                        </td>
                        <td className="p-3">
                          Q.{item.costo.toFixed(2)}
                        </td>
                        <td className="p-3 font-semibold">
                          Q.{item.valorTotal.toFixed(2)}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => eliminarProductoTransferencia(item.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No hay productos agregados para transferir</p>
                <p className="text-sm text-gray-500">
                  {!formData.almacenOrigen 
                    ? 'Seleccione un almacén de origen para comenzar'
                    : 'Busque y agregue productos usando el campo de búsqueda'
                  }
                </p>
              </div>
            )}

            {validationErrors.productos && (
              <p className="text-red-500 text-sm mt-2">{validationErrors.productos}</p>
            )}
          </div>

          {/* Resumen de Totales */}
          {productosTransferencia.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Resumen de la Transferencia</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-100 rounded-lg">
                  <p className="text-sm text-blue-700">Total de Productos</p>
                  <p className="text-2xl font-bold text-blue-800">{totales.totalProductos}</p>
                </div>
                <div className="text-center p-4 bg-green-100 rounded-lg">
                  <p className="text-sm text-green-700">Valor Total</p>
                  <p className="text-2xl font-bold text-green-800">Q.{totales.valorTotal.toFixed(2)}</p>
                </div>
                <div className="text-center p-4 bg-orange-100 rounded-lg">
                  <p className="text-sm text-orange-700">Peso Total</p>
                  <p className="text-2xl font-bold text-orange-800">{totales.pesoTotal.toFixed(2)} kg</p>
                </div>
              </div>
            </div>
          )}

          {/* Observaciones */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Observaciones
            </label>
            <textarea
              rows="3"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Observaciones adicionales sobre la transferencia..."
              value={formData.observaciones}
              onChange={(e) => handleInputChange('observaciones', e.target.value)}
            />
          </div>

          {/* Advertencia */}
          {productosTransferencia.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Información Importante</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Esta transferencia moverá los productos del almacén de origen al destino. 
                    Una vez procesada, los cambios en el inventario serán permanentes.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              onClick={guardarTransferencia}
              disabled={isLoading || Object.keys(validationErrors).length > 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isLoading ? 'Procesando...' : 'Crear Transferencia'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransferenciaModal;