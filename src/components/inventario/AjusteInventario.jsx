import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { RefreshCw, Search, Plus, Minus, Save, X, AlertTriangle, Package, FileText, Calculator } from 'lucide-react';

const AjusteInventario = ({ isOpen, onClose, terminal }) => {
  const { variables, userId } = useContext(AuthContext);
  const [tipoAjuste, setTipoAjuste] = useState('manual'); // 'manual' o 'conteo'
  const [motivo, setMotivo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [productos, setProductos] = useState([]);
  const [productosAjuste, setProductosAjuste] = useState([]);
  const [searchProducto, setSearchProducto] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [totales, setTotales] = useState({
    ajustesPositivos: 0,
    ajustesNegativos: 0,
    valorImpacto: 0
  });

  const motivosAjuste = [
    'Conteo físico',
    'Producto dañado',
    'Producto vencido',
    'Robo/Merma',
    'Error de registro',
    'Devolución de cliente',
    'Ajuste por inventario inicial',
    'Corrección de sistema',
    'Otros'
  ];

  // Mock de productos - en producción vendría de tu API
  const mockProductos = [
    {
      id: 1,
      codigo: 'P001',
      nombre: 'Laptop Dell Inspiron 15',
      stockActual: 15,
      costo: 10000.00,
      ubicacion: 'A1-B2'
    },
    {
      id: 2,
      codigo: 'P002',
      nombre: 'Mouse Inalámbrico',
      stockActual: 25,
      costo: 120.00,
      ubicacion: 'A2-B1'
    },
    {
      id: 3,
      codigo: 'P003',
      nombre: 'Teclado Mecánico',
      stockActual: 8,
      costo: 650.00,
      ubicacion: 'A1-B3'
    },
    {
      id: 4,
      codigo: 'P004',
      nombre: 'Monitor 24"',
      stockActual: 12,
      costo: 2000.00,
      ubicacion: 'B1-C1'
    }
  ];

  useEffect(() => {
    setProductos(mockProductos);
  }, []);

  useEffect(() => {
    calcularTotales();
  }, [productosAjuste]);

  const calcularTotales = () => {
    let ajustesPositivos = 0;
    let ajustesNegativos = 0;
    let valorImpacto = 0;

    productosAjuste.forEach(ajuste => {
      const diferencia = ajuste.stockNuevo - ajuste.stockActual;
      if (diferencia > 0) {
        ajustesPositivos += diferencia;
      } else if (diferencia < 0) {
        ajustesNegativos += Math.abs(diferencia);
      }
      valorImpacto += diferencia * ajuste.costo;
    });

    setTotales({
      ajustesPositivos,
      ajustesNegativos,
      valorImpacto
    });
  };

  const agregarProductoAjuste = (producto) => {
    const yaExiste = productosAjuste.find(p => p.id === producto.id);
    
    if (!yaExiste) {
      const nuevoAjuste = {
        ...producto,
        stockNuevo: producto.stockActual,
        diferencia: 0,
        valorImpacto: 0,
        observacionItem: ''
      };
      setProductosAjuste([...productosAjuste, nuevoAjuste]);
    }
    
    setSearchProducto('');
    setShowProductSearch(false);
  };

  const actualizarStockNuevo = (productoId, nuevoStock) => {
    setProductosAjuste(productosAjuste.map(ajuste => {
      if (ajuste.id === productoId) {
        const diferencia = nuevoStock - ajuste.stockActual;
        const valorImpacto = diferencia * ajuste.costo;
        
        return {
          ...ajuste,
          stockNuevo: nuevoStock,
          diferencia,
          valorImpacto
        };
      }
      return ajuste;
    }));
  };

  const actualizarObservacionItem = (productoId, observacion) => {
    setProductosAjuste(productosAjuste.map(ajuste => {
      if (ajuste.id === productoId) {
        return { ...ajuste, observacionItem: observacion };
      }
      return ajuste;
    }));
  };

  const eliminarProductoAjuste = (productoId) => {
    setProductosAjuste(productosAjuste.filter(ajuste => ajuste.id !== productoId));
  };

  const ajusteRapido = (productoId, cantidad) => {
    setProductosAjuste(productosAjuste.map(ajuste => {
      if (ajuste.id === productoId) {
        const nuevoStock = Math.max(0, ajuste.stockNuevo + cantidad);
        const diferencia = nuevoStock - ajuste.stockActual;
        const valorImpacto = diferencia * ajuste.costo;
        
        return {
          ...ajuste,
          stockNuevo: nuevoStock,
          diferencia,
          valorImpacto
        };
      }
      return ajuste;
    }));
  };

  const guardarAjuste = async () => {
    if (productosAjuste.length === 0) {
      alert('Debe agregar al menos un producto para ajustar');
      return;
    }

    if (!motivo) {
      alert('Debe seleccionar un motivo para el ajuste');
      return;
    }

    setIsLoading(true);
    try {
      const ajusteCompleto = {
        tipo: tipoAjuste,
        motivo,
        observaciones,
        productos: productosAjuste,
        totales,
        terminal: terminal.rowid,
        usuario: userId,
        fecha: new Date().toISOString()
      };

      console.log('Guardando ajuste de inventario:', ajusteCompleto);
      
      // Aquí iría la llamada a tu API
      // const response = await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=saveAjusteInventario`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(ajusteCompleto)
      // });
      
      // Simular respuesta exitosa
      setTimeout(() => {
        alert('Ajuste de inventario guardado exitosamente');
        onClose();
        setIsLoading(false);
      }, 1500);
      
    } catch (error) {
      console.error('Error guardando ajuste:', error);
      alert('Error al guardar el ajuste de inventario');
      setIsLoading(false);
    }
  };

  const productosFiltrados = productos.filter(producto =>
    producto.nombre.toLowerCase().includes(searchProducto.toLowerCase()) ||
    producto.codigo.toLowerCase().includes(searchProducto.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-800">Ajuste de Inventario</h2>
              <p className="text-sm text-gray-600">Terminal: {terminal.name}</p>
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
          {/* Configuración del Ajuste */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Ajuste
              </label>
              <select
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={tipoAjuste}
                onChange={(e) => setTipoAjuste(e.target.value)}
              >
                <option value="manual">Ajuste Manual</option>
                <option value="conteo">Conteo Físico</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo del Ajuste *
              </label>
              <select
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              >
                <option value="">Seleccionar motivo</option>
                {motivosAjuste.map(motivoItem => (
                  <option key={motivoItem} value={motivoItem}>
                    {motivoItem}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha y Hora
              </label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50"
                value={new Date().toLocaleString()}
                disabled
              />
            </div>
          </div>

          {/* Búsqueda de Productos */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agregar Productos al Ajuste
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
                  {productosFiltrados.map(producto => (
                    <button
                      key={producto.id}
                      className="w-full p-3 text-left hover:bg-gray-50 flex justify-between items-center"
                      onClick={() => agregarProductoAjuste(producto)}
                    >
                      <div>
                        <p className="font-medium">{producto.nombre}</p>
                        <p className="text-sm text-gray-600">
                          Código: {producto.codigo} | Stock: {producto.stockActual} | {producto.ubicacion}
                        </p>
                      </div>
                      <span className="text-blue-600 font-semibold">+</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tabla de Productos para Ajustar */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Productos a Ajustar</h3>
            
            {productosAjuste.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 font-semibold text-gray-700">Producto</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Stock Actual</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Stock Nuevo</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Diferencia</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Valor Impacto</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Observación</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosAjuste.map(ajuste => (
                      <tr key={ajuste.id} className="border-t border-gray-200">
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{ajuste.nombre}</p>
                            <p className="text-sm text-gray-600">{ajuste.codigo} | {ajuste.ubicacion}</p>
                          </div>
                        </td>
                        <td className="p-3 text-center font-semibold">
                          {ajuste.stockActual}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => ajusteRapido(ajuste.id, -1)}
                              className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              className="w-20 p-2 border border-gray-300 rounded text-center"
                              value={ajuste.stockNuevo}
                              onChange={(e) => actualizarStockNuevo(ajuste.id, parseInt(e.target.value) || 0)}
                            />
                            <button
                              onClick={() => ajusteRapido(ajuste.id, 1)}
                              className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`font-semibold ${
                            ajuste.diferencia > 0 ? 'text-green-600' : 
                            ajuste.diferencia < 0 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {ajuste.diferencia > 0 ? '+' : ''}{ajuste.diferencia}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`font-semibold ${
                            ajuste.valorImpacto > 0 ? 'text-green-600' : 
                            ajuste.valorImpacto < 0 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            Q.{ajuste.valorImpacto.toFixed(2)}
                          </span>
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            className="w-full p-2 border border-gray-300 rounded text-sm"
                            placeholder="Observación..."
                            value={ajuste.observacionItem}
                            onChange={(e) => actualizarObservacionItem(ajuste.id, e.target.value)}
                          />
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => eliminarProductoAjuste(ajuste.id)}
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
                <p className="text-gray-600">No hay productos agregados para ajustar</p>
                <p className="text-sm text-gray-500">Busque y agregue productos usando el campo de búsqueda</p>
              </div>
            )}
          </div>

          {/* Resumen de Totales */}
          {productosAjuste.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-600" />
                Resumen del Ajuste
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-100 rounded-lg">
                  <p className="text-sm text-green-700">Ajustes Positivos</p>
                  <p className="text-2xl font-bold text-green-800">+{totales.ajustesPositivos}</p>
                </div>
                <div className="text-center p-4 bg-red-100 rounded-lg">
                  <p className="text-sm text-red-700">Ajustes Negativos</p>
                  <p className="text-2xl font-bold text-red-800">-{totales.ajustesNegativos}</p>
                </div>
                <div className="text-center p-4 bg-blue-100 rounded-lg">
                  <p className="text-sm text-blue-700">Impacto en Valor</p>
                  <p className={`text-2xl font-bold ${
                    totales.valorImpacto >= 0 ? 'text-green-800' : 'text-red-800'
                  }`}>
                    Q.{totales.valorImpacto.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Observaciones Generales */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Observaciones Generales
            </label>
            <textarea
              rows="3"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Observaciones adicionales sobre el ajuste de inventario..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>

          {/* Advertencia */}
          {productosAjuste.some(p => p.diferencia < 0) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Advertencia - Reducción de Stock</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Algunos productos tendrán una reducción en su stock. Verifique que esta información sea correcta antes de proceder.
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
              onClick={guardarAjuste}
              disabled={isLoading || productosAjuste.length === 0 || !motivo}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isLoading ? 'Procesando...' : 'Guardar Ajuste'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AjusteInventario;