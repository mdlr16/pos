import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Package, Search, Plus, Minus, Save, X, User, Calendar, FileText, Trash2 } from 'lucide-react';

const OrdenCompra = ({ isOpen, onClose, ordenData = null, terminal }) => {
  const { variables, userId } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    proveedor: '',
    fecha: new Date().toISOString().split('T')[0],
    fechaEntrega: '',
    observaciones: '',
    estado: 'Borrador'
  });
  
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [lineasOrden, setLineasOrden] = useState([]);
  const [searchProducto, setSearchProducto] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [totales, setTotales] = useState({
    subtotal: 0,
    descuento: 0,
    impuestos: 0,
    total: 0
  });

  // Mockear datos de proveedores - aquí irían desde tu API
  const mockProveedores = [
    { id: 1, nombre: 'Distribuidora ABC S.A.', codigo: 'PROV001' },
    { id: 2, nombre: 'Suministros XYZ Ltda.', codigo: 'PROV002' },
    { id: 3, nombre: 'Comercial 123 S.A.', codigo: 'PROV003' }
  ];

  const mockProductos = [
    { id: 1, codigo: 'P001', nombre: 'Laptop Dell Inspiron 15', precio: 12500.00, unidad: 'PZA' },
    { id: 2, codigo: 'P002', nombre: 'Mouse Inalámbrico', precio: 150.00, unidad: 'PZA' },
    { id: 3, codigo: 'P003', nombre: 'Teclado Mecánico', precio: 800.00, unidad: 'PZA' },
    { id: 4, codigo: 'P004', nombre: 'Monitor 24"', precio: 2500.00, unidad: 'PZA' }
  ];

  useEffect(() => {
    setProveedores(mockProveedores);
    setProductos(mockProductos);
    
    // Si estamos editando una orden existente
    if (ordenData) {
      setFormData({
        proveedor: ordenData.proveedor || '',
        fecha: ordenData.fecha || '',
        fechaEntrega: ordenData.fechaEntrega || '',
        observaciones: ordenData.observaciones || '',
        estado: ordenData.estado || 'Borrador'
      });
      setLineasOrden(ordenData.lineas || []);
    }
  }, [ordenData]);

  useEffect(() => {
    calcularTotales();
  }, [lineasOrden]);

  const calcularTotales = () => {
    const subtotal = lineasOrden.reduce((sum, linea) => sum + (linea.cantidad * linea.precio), 0);
    const descuento = lineasOrden.reduce((sum, linea) => sum + (linea.descuento || 0), 0);
    const impuestos = subtotal * 0.12; // IVA 12%
    const total = subtotal - descuento + impuestos;

    setTotales({
      subtotal,
      descuento,
      impuestos,
      total
    });
  };

  const agregarProducto = (producto) => {
    const lineaExistente = lineasOrden.find(linea => linea.productoId === producto.id);
    
    if (lineaExistente) {
      setLineasOrden(lineasOrden.map(linea => 
        linea.productoId === producto.id 
          ? { ...linea, cantidad: linea.cantidad + 1 }
          : linea
      ));
    } else {
      const nuevaLinea = {
        id: Date.now(),
        productoId: producto.id,
        codigo: producto.codigo,
        nombre: producto.nombre,
        cantidad: 1,
        precio: producto.precio,
        descuento: 0,
        subtotal: producto.precio
      };
      setLineasOrden([...lineasOrden, nuevaLinea]);
    }
    
    setSearchProducto('');
    setShowProductSearch(false);
  };

  const actualizarLinea = (lineaId, campo, valor) => {
    setLineasOrden(lineasOrden.map(linea => {
      if (linea.id === lineaId) {
        const lineaActualizada = { ...linea, [campo]: valor };
        lineaActualizada.subtotal = (lineaActualizada.cantidad * lineaActualizada.precio) - lineaActualizada.descuento;
        return lineaActualizada;
      }
      return linea;
    }));
  };

  const eliminarLinea = (lineaId) => {
    setLineasOrden(lineasOrden.filter(linea => linea.id !== lineaId));
  };

  const guardarOrden = async () => {
    try {
      const ordenCompleta = {
        ...formData,
        lineas: lineasOrden,
        totales,
        terminal: terminal.rowid,
        usuario: userId,
        fechaCreacion: new Date().toISOString()
      };

      console.log('Guardando orden:', ordenCompleta);
      
      // Aquí iría la llamada a tu API
      // const response = await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=saveOrdenCompra`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(ordenCompleta)
      // });

      alert('Orden de compra guardada exitosamente');
      onClose();
    } catch (error) {
      console.error('Error guardando orden:', error);
      alert('Error al guardar la orden de compra');
    }
  };

  const productosFiltrados = productos.filter(producto =>
    producto.nombre.toLowerCase().includes(searchProducto.toLowerCase()) ||
    producto.codigo.toLowerCase().includes(searchProducto.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-green-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {ordenData ? 'Editar Orden de Compra' : 'Nueva Orden de Compra'}
              </h2>
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
          {/* Información General */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Proveedor
              </label>
              <select
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                value={formData.proveedor}
                onChange={(e) => setFormData({...formData, proveedor: e.target.value})}
              >
                <option value="">Seleccionar proveedor</option>
                {proveedores.map(proveedor => (
                  <option key={proveedor.id} value={proveedor.id}>
                    {proveedor.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Fecha de Orden
              </label>
              <input
                type="date"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                value={formData.fecha}
                onChange={(e) => setFormData({...formData, fecha: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Fecha de Entrega
              </label>
              <input
                type="date"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                value={formData.fechaEntrega}
                onChange={(e) => setFormData({...formData, fechaEntrega: e.target.value})}
              />
            </div>
          </div>

          {/* Búsqueda de Productos */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agregar Productos
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar productos por nombre o código..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                      onClick={() => agregarProducto(producto)}
                    >
                      <div>
                        <p className="font-medium">{producto.nombre}</p>
                        <p className="text-sm text-gray-600">Código: {producto.codigo}</p>
                      </div>
                      <span className="text-green-600 font-semibold">Q.{producto.precio.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tabla de Productos */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Productos en la Orden</h3>
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 font-semibold text-gray-700">Producto</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Cantidad</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Precio</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Descuento</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Subtotal</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {lineasOrden.map(linea => (
                    <tr key={linea.id} className="border-t border-gray-200">
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{linea.nombre}</p>
                          <p className="text-sm text-gray-600">{linea.codigo}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="1"
                          className="w-20 p-2 border border-gray-300 rounded text-center"
                          value={linea.cantidad}
                          onChange={(e) => actualizarLinea(linea.id, 'cantidad', parseInt(e.target.value) || 1)}
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          step="0.01"
                          className="w-24 p-2 border border-gray-300 rounded"
                          value={linea.precio}
                          onChange={(e) => actualizarLinea(linea.id, 'precio', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          step="0.01"
                          className="w-20 p-2 border border-gray-300 rounded"
                          value={linea.descuento}
                          onChange={(e) => actualizarLinea(linea.id, 'descuento', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="p-3 font-semibold">
                        Q.{linea.subtotal.toFixed(2)}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => eliminarLinea(linea.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Observaciones */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Observaciones
            </label>
            <textarea
              rows="3"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Observaciones adicionales..."
              value={formData.observaciones}
              onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
            />
          </div>

          {/* Totales */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Resumen de Totales</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Subtotal</p>
                <p className="text-lg font-bold text-gray-800">Q.{totales.subtotal.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Descuento</p>
                <p className="text-lg font-bold text-orange-600">-Q.{totales.descuento.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">IVA (12%)</p>
                <p className="text-lg font-bold text-blue-600">Q.{totales.impuestos.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-xl font-bold text-green-600">Q.{totales.total.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={guardarOrden}
              disabled={lineasOrden.length === 0 || !formData.proveedor}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Guardar Orden
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrdenCompra;