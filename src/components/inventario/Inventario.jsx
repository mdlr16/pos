import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { BarChart3, Package, AlertTriangle, TrendingUp, Search, Filter, Download, RefreshCw, Archive, Clock, Plus, Minus, ArrowRightLeft } from 'lucide-react';

const Inventario = ({ terminal }) => {
  const { variables, dolibarrToken, isInitialized } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('resumen');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAlmacen, setSelectedAlmacen] = useState('todos');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Estados para datos reales
  const [inventoryData, setInventoryData] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [inventoryStats, setInventoryStats] = useState({
    totalProductos: 0,
    valorInventario: 0,
    alertasStock: 0,
    movimientosHoy: 0,
    stockBajo: 0,
    sinStock: 0
  });
  
  // Modales
  const [showAjusteModal, setShowAjusteModal] = useState(false);
  const [showTransferenciaModal, setShowTransferenciaModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // URLs y headers de API
  const API_BASE_URL = variables.SPOS_URL ? `${variables.SPOS_URL}/api/index.php` : null;
  const API_KEY = variables.DOLIBARR_API_KEY || dolibarrToken;

  const getHeaders = () => ({
    'DOLAPIKEY': API_KEY,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  });

  const tabs = [
    { id: 'resumen', label: 'Resumen', icon: BarChart3 },
    { id: 'stock', label: 'Consulta de Stock', icon: Package },
    { id: 'movimientos', label: 'Movimientos', icon: RefreshCw },
    { id: 'alertas', label: 'Alertas', icon: AlertTriangle }
  ];

  const almacenes = [
    { id: 'todos', name: 'Todos los Almacenes' },
    { id: terminal?.fk_warehouse?.toString() || '1', name: terminal?.name || 'Almacén Principal' }
  ];

  // Cargar datos de inventario desde Dolibarr
  const fetchInventoryData = async () => {
    if (!API_BASE_URL || !API_KEY) return;

    setLoading(true);
    setError('');
    
    try {
      console.log('Cargando datos de inventario para warehouse:', terminal?.fk_warehouse);
      
      // Obtener productos con información de stock
      let productsUrl = `${API_BASE_URL}/products?sortfield=t.ref&sortorder=ASC&limit=100&includestockdata=1`;
      
      // Si tenemos warehouse específico, agregarlo al filtro
      if (terminal?.fk_warehouse) {
        productsUrl += `&warehouse=${terminal.fk_warehouse}`;
      }

      const productsResponse = await fetch(productsUrl, {
        method: 'GET',
        headers: getHeaders()
      });

      if (!productsResponse.ok) {
        throw new Error(`Error ${productsResponse.status}: ${productsResponse.statusText}`);
      }

      const productsData = await productsResponse.json();
      console.log('Productos obtenidos:', productsData);

      // Transformar datos para el inventario
      const transformedInventory = productsData.map(product => ({
        id: product.id,
        codigo: product.ref,
        producto: product.label || product.ref,
        categoria: product.categories?.[0]?.label || 'Sin categoría',
        almacen: terminal?.name || 'Principal',
        almacenId: terminal?.fk_warehouse || 1,
        stock: parseInt(product.stock_reel || 0),
        minimo: parseInt(product.seuil_stock_alerte || 5),
        maximo: parseInt(product.seuil_stock_alerte || 5) * 10, // Estimado
        precio: parseFloat(product.price || 0),
        valorTotal: (parseInt(product.stock_reel || 0) * parseFloat(product.price || 0)),
        ultimoMovimiento: product.date_modification || new Date().toISOString().split('T')[0],
        status: product.status
      }));

      setInventoryData(transformedInventory);

      // Calcular estadísticas
      const stats = {
        totalProductos: transformedInventory.length,
        valorInventario: transformedInventory.reduce((total, item) => total + item.valorTotal, 0),
        alertasStock: transformedInventory.filter(item => item.stock <= item.minimo).length,
        movimientosHoy: 0, // Se calculará con los movimientos
        stockBajo: transformedInventory.filter(item => item.stock > 0 && item.stock <= item.minimo).length,
        sinStock: transformedInventory.filter(item => item.stock === 0).length
      };

      setInventoryStats(stats);
      console.log('Estadísticas calculadas:', stats);

    } catch (err) {
      console.error('Error cargando inventario:', err);
      setError('Error al cargar datos de inventario: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cargar movimientos de stock
  const fetchStockMovements = async () => {
    if (!API_BASE_URL || !API_KEY) return;

    try {
      console.log('Cargando movimientos de stock para warehouse:', terminal?.fk_warehouse);
      
      let movementsUrl = `${API_BASE_URL}/stockmovements?sortfield=dm&sortorder=DESC&limit=50`;
      
      // Si tenemos warehouse específico, agregarlo al filtro
      if (terminal?.fk_warehouse) {
        movementsUrl += `&warehouse=${terminal.fk_warehouse}`;
      }

      const movementsResponse = await fetch(movementsUrl, {
        method: 'GET',
        headers: getHeaders()
      });

      if (movementsResponse.ok) {
        const movementsData = await movementsResponse.json();
        console.log('Movimientos obtenidos:', movementsData);

        const transformedMovements = movementsData.map(movement => ({
          id: movement.id,
          fecha: new Date(movement.datem * 1000).toLocaleString(), // Convertir timestamp
          tipo: getTipoMovimiento(movement.type),
          producto: movement.product_ref || 'Producto desconocido',
          cantidad: parseFloat(movement.qty || 0),
          almacen: terminal?.name || 'Principal',
          referencia: movement.inventorycode || movement.id,
          usuario: movement.fk_user || 'Sistema'
        }));

        setStockMovements(transformedMovements);

        // Actualizar estadística de movimientos de hoy
        const today = new Date().toDateString();
        const movimientosHoy = transformedMovements.filter(mov => 
          new Date(mov.fecha).toDateString() === today
        ).length;

        setInventoryStats(prev => ({
          ...prev,
          movimientosHoy
        }));
      }
    } catch (err) {
      console.error('Error cargando movimientos:', err);
    }
  };

  // Función auxiliar para obtener tipo de movimiento
  const getTipoMovimiento = (type) => {
    switch (type) {
      case '0': return 'Entrada';
      case '1': return 'Salida';
      case '2': return 'Transferencia';
      case '3': return 'Ajuste';
      default: return 'Movimiento';
    }
  };

  // Crear ajuste de inventario
  const createStockAdjustment = async (productId, newQuantity, reason) => {
    if (!API_BASE_URL || !API_KEY) return;

    // Verificar que tenemos warehouse_id de la terminal
    if (!terminal?.fk_warehouse) {
      alert('Error: No se encontró el almacén de la terminal seleccionada');
      return;
    }

    setLoading(true);
    try {
      const product = inventoryData.find(p => p.id === productId);
      if (!product) throw new Error('Producto no encontrado');

      const adjustment = newQuantity - product.stock;
      
      console.log('Creando ajuste de inventario:', {
        product_id: productId,
        warehouse_id: terminal.fk_warehouse,
        qty: adjustment,
        currentStock: product.stock,
        newQuantity: newQuantity,
        reason: reason
      });
      
      const stockMovement = {
        product_id: productId,
        warehouse_id: terminal.fk_warehouse, // ¡Importante! Este es el campo requerido
        qty: adjustment,
        type: 3, // Ajuste de inventario
        label: reason || 'Ajuste de inventario',
        price: product.precio,
        inventorycode: 'ADJ-' + Date.now()
      };

      const response = await fetch(`${API_BASE_URL}/stockmovements`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(stockMovement)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error en respuesta:', errorData);
        throw new Error(errorData.error?.message || `Error ${response.status}`);
      }

      const result = await response.json();
      console.log('Ajuste de inventario creado exitosamente:', result);
      
      // Recargar datos
      await Promise.all([fetchInventoryData(), fetchStockMovements()]);
      
      alert('Ajuste de inventario realizado exitosamente');
      setShowAjusteModal(false);
      
    } catch (error) {
      console.error('Error creando ajuste:', error);
      alert('Error al realizar ajuste: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos al inicializar
  useEffect(() => {
    console.log('Inventario - Verificando condiciones de carga:', {
      isInitialized,
      hasApiBaseUrl: !!API_BASE_URL,
      hasApiKey: !!API_KEY,
      hasWarehouse: !!terminal?.fk_warehouse,
      warehouseId: terminal?.fk_warehouse
    });

    if (isInitialized && API_BASE_URL && API_KEY && terminal?.fk_warehouse) {
      console.log('Cargando inventario para almacén:', terminal.fk_warehouse);
      fetchInventoryData();
      fetchStockMovements();
    } else if (isInitialized && !terminal?.fk_warehouse) {
      setError('La terminal seleccionada no tiene un almacén asignado. Contacte al administrador.');
    }
  }, [isInitialized, API_BASE_URL, API_KEY, terminal?.fk_warehouse]);

  const quickActions = [
    {
      title: 'Ajuste de Inventario',
      description: 'Corregir cantidades de stock',
      icon: RefreshCw,
      color: 'bg-blue-500 hover:bg-blue-600',
      action: () => setShowAjusteModal(true),
      disabled: !API_KEY || !terminal?.fk_warehouse
    },
    {
      title: 'Actualizar Datos',
      description: 'Refrescar información de stock',
      icon: RefreshCw,
      color: 'bg-green-500 hover:bg-green-600',
      action: () => {
        fetchInventoryData();
        fetchStockMovements();
      },
      disabled: !API_KEY || !terminal?.fk_warehouse
    },
    {
      title: 'Reporte de Stock',
      description: 'Exportar inventario actual',
      icon: Download,
      color: 'bg-purple-500 hover:bg-purple-600',
      action: () => {
        const csvContent = "data:text/csv;charset=utf-8," + 
          "Código,Producto,Stock,Mínimo,Precio,Valor Total,Almacén\n" +
          inventoryData.map(item => 
            `${item.codigo},${item.producto},${item.stock},${item.minimo},${item.precio},${item.valorTotal},${item.almacen}`
          ).join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `inventario_${terminal?.name || 'almacen'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    },
    {
      title: 'Movimientos Recientes',
      description: 'Ver últimas transacciones',
      icon: Clock,
      color: 'bg-orange-500 hover:bg-orange-600',
      action: () => setActiveTab('movimientos')
    }
  ];

  const getStockStatus = (stock, minimo) => {
    if (stock === 0) {
      return { color: 'bg-red-500 text-white', label: 'Agotado' };
    } else if (stock <= minimo) {
      return { color: 'bg-red-100 text-red-800', label: 'Crítico' };
    } else if (stock <= minimo * 1.5) {
      return { color: 'bg-yellow-100 text-yellow-800', label: 'Bajo' };
    }
    return { color: 'bg-green-100 text-green-800', label: 'Normal' };
  };

  const getMovementIcon = (tipo) => {
    switch (tipo) {
      case 'Entrada':
      case 'Compra':
        return <Plus className="w-4 h-4 text-green-600" />;
      case 'Salida':
      case 'Venta':
        return <Minus className="w-4 h-4 text-red-600" />;
      case 'Transferencia':
        return <ArrowRightLeft className="w-4 h-4 text-blue-600" />;
      case 'Ajuste':
        return <RefreshCw className="w-4 h-4 text-purple-600" />;
      default:
        return <Package className="w-4 h-4 text-gray-600" />;
    }
  };

  const filteredStockData = inventoryData.filter(item => {
    const matchesSearch = item.producto.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAlmacen = selectedAlmacen === 'todos' || item.almacen === selectedAlmacen;
    return matchesSearch && matchesAlmacen;
  });

  const alertasStock = inventoryData.filter(item => item.stock <= item.minimo).map(item => ({
    codigo: item.codigo,
    producto: item.producto,
    stockActual: item.stock,
    stockMinimo: item.minimo,
    diferencia: item.stock - item.minimo,
    almacen: item.almacen,
    nivel: item.stock === 0 ? 'agotado' : item.stock <= item.minimo ? 'crítico' : 'bajo'
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-orange-600" />
                Control de Inventario
              </h1>
              <p className="text-gray-600">Terminal: {terminal?.name || 'N/A'}</p>
              <p className="text-sm text-gray-500">
                Conectado a: {variables.SPOS_URL || 'No configurado'}
              </p>
              <p className="text-sm text-gray-500">
                Almacén: {terminal?.name || 'No especificado'} (ID: {terminal?.fk_warehouse || 'N/A'})
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  fetchInventoryData();
                  fetchStockMovements();
                }}
                disabled={loading || !API_KEY}
                className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Cargando...' : 'Actualizar'}
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {error}
            <button 
              onClick={() => setError('')}
              className="ml-auto text-red-700 hover:text-red-900"
            >
              ✕
            </button>
          </div>
        )}

        {/* Warning si no hay warehouse */}
        {!terminal?.fk_warehouse && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <div>
              <p className="font-semibold">Terminal sin almacén asignado</p>
              <p className="text-sm">
                La terminal seleccionada no tiene un almacén configurado. 
                Las operaciones de inventario estarán deshabilitadas. 
                Contacte al administrador para configurar el almacén.
              </p>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Productos</p>
                <p className="text-xl font-bold text-blue-600">{inventoryStats.totalProductos}</p>
              </div>
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Valor Inventario</p>
                <p className="text-xl font-bold text-green-600">Q.{inventoryStats.valorInventario.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Alertas Stock</p>
                <p className="text-xl font-bold text-red-600">{inventoryStats.alertasStock}</p>
              </div>
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Movimientos Hoy</p>
                <p className="text-xl font-bold text-purple-600">{inventoryStats.movimientosHoy}</p>
              </div>
              <RefreshCw className="w-6 h-6 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Stock Bajo</p>
                <p className="text-xl font-bold text-yellow-600">{inventoryStats.stockBajo}</p>
              </div>
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Sin Stock</p>
                <p className="text-xl font-bold text-red-600">{inventoryStats.sinStock}</p>
              </div>
              <Package className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

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

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'resumen' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Resumen de Inventario</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top Products */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-700 mb-3">Productos con Mayor Valor</h4>
                    <div className="space-y-3">
                      {inventoryData
                        .sort((a, b) => b.valorTotal - a.valorTotal)
                        .slice(0, 5)
                        .map((item, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-gray-800">{item.producto}</p>
                            <p className="text-sm text-gray-600">Stock: {item.stock}</p>
                          </div>
                          <p className="font-bold text-green-600">Q.{item.valorTotal.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Low Stock Alert */}
                  <div className="bg-red-50 rounded-lg p-4">
                    <h4 className="font-semibold text-red-700 mb-3">Alertas de Stock Crítico</h4>
                    <div className="space-y-3">
                      {alertasStock.slice(0, 5).map((alerta, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-gray-800">{alerta.producto}</p>
                            <p className="text-sm text-red-600">
                              Stock: {alerta.stockActual} (Mín: {alerta.stockMinimo})
                            </p>
                          </div>
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                            {alerta.nivel.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'stock' && (
              <div>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Buscar por producto o código..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <select
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    value={selectedAlmacen}
                    onChange={(e) => setSelectedAlmacen(e.target.value)}
                  >
                    {almacenes.map((almacen) => (
                      <option key={almacen.id} value={almacen.id}>
                        {almacen.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Producto</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Stock Actual</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Stock Mínimo</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Precio</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Valor Total</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Estado</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStockData.map((item) => {
                        const status = getStockStatus(item.stock, item.minimo);
                        return (
                          <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div>
                                <p className="font-medium text-gray-800">{item.producto}</p>
                                <p className="text-sm text-gray-600">{item.codigo}</p>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-medium">{item.stock}</td>
                            <td className="py-3 px-4 text-gray-600">{item.minimo}</td>
                            <td className="py-3 px-4 text-gray-600">Q.{item.precio.toFixed(2)}</td>
                            <td className="py-3 px-4 font-medium text-green-600">Q.{item.valorTotal.toFixed(2)}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                {status.label}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => {
                                  setSelectedProduct(item);
                                  setShowAjusteModal(true);
                                }}
                                className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400"
                                disabled={!API_KEY || !terminal?.fk_warehouse}
                                title={!terminal?.fk_warehouse ? 'Terminal sin almacén asignado' : 'Ajustar stock'}
                              >
                                Ajustar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'movimientos' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Movimientos de Inventario</h3>
                <div className="space-y-4">
                  {stockMovements.slice(0, 20).map((movimiento) => (
                    <div key={movimiento.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-3">
                          {getMovementIcon(movimiento.tipo)}
                          <div>
                            <h4 className="font-semibold text-gray-800">{movimiento.producto}</h4>
                            <p className="text-sm text-gray-600">
                              {movimiento.tipo} • {movimiento.almacen} • {movimiento.fecha}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${movimiento.cantidad > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {movimiento.cantidad > 0 ? '+' : ''}{movimiento.cantidad}
                          </p>
                          <p className="text-sm text-gray-600">{movimiento.referencia}</p>
                          <p className="text-xs text-gray-500">Usuario: {movimiento.usuario}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'alertas' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Alertas de Stock</h3>
                <div className="space-y-4">
                  {alertasStock.map((alerta, index) => (
                    <div key={index} className={`border rounded-lg p-4 ${
                      alerta.nivel === 'agotado' ? 'border-red-300 bg-red-50' :
                      alerta.nivel === 'crítico' ? 'border-red-200 bg-red-25' :
                      'border-yellow-200 bg-yellow-50'
                    }`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold text-gray-800">{alerta.producto}</h4>
                          <p className="text-sm text-gray-600">Código: {alerta.codigo} • {alerta.almacen}</p>
                          <p className="text-sm">
                            Stock actual: <span className="font-medium">{alerta.stockActual}</span> • 
                            Mínimo requerido: <span className="font-medium">{alerta.stockMinimo}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            alerta.nivel === 'agotado' ? 'bg-red-500 text-white' :
                            alerta.nivel === 'crítico' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {alerta.nivel.toUpperCase()}
                          </span>
                          <p className="text-sm text-gray-600 mt-1">
                            Faltante: {Math.abs(alerta.diferencia)}
                          </p>
                          <button
                            onClick={() => {
                              const product = inventoryData.find(p => p.codigo === alerta.codigo);
                              setSelectedProduct(product);
                              setShowAjusteModal(true);
                            }}
                            className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs hover:bg-blue-200 mt-2 disabled:bg-gray-100 disabled:text-gray-400"
                            disabled={!API_KEY || !terminal?.fk_warehouse}
                            title={!terminal?.fk_warehouse ? 'Terminal sin almacén asignado' : 'Ajustar stock'}
                          >
                            Ajustar Stock
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Ajuste de Inventario */}
      {showAjusteModal && (
        <AjusteInventarioModal
          isOpen={showAjusteModal}
          onClose={() => setShowAjusteModal(false)}
          product={selectedProduct}
          onSave={createStockAdjustment}
        />
      )}
    </div>
  );
};

// Modal de Ajuste de Inventario
const AjusteInventarioModal = ({ isOpen, onClose, product, onSave }) => {
  const [newQuantity, setNewQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setNewQuantity(product.stock.toString());
    }
  }, [product]);

  const handleSave = async () => {
    if (!product || !newQuantity) return;

    setLoading(true);
    try {
      await onSave(product.id, parseInt(newQuantity), reason);
      onClose();
    } catch (error) {
      console.error('Error en ajuste:', error);
    }
    setLoading(false);
  };

  if (!isOpen || !product) return null;

  const difference = parseInt(newQuantity || 0) - product.stock;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Ajuste de Inventario</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <p className="font-medium text-gray-800">{product.producto}</p>
              <p className="text-sm text-gray-600">Código: {product.codigo}</p>
              <p className="text-sm text-gray-600">Stock actual: {product.stock}</p>
              <p className="text-sm text-gray-600">Almacén: {product.almacen} (ID: {product.almacenId})</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nueva cantidad
              </label>
              <input
                type="number"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                placeholder="0"
              />
            </div>

            {difference !== 0 && (
              <div className={`p-3 rounded-lg ${
                difference > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <p className={`text-sm ${difference > 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {difference > 0 ? 'Aumentar' : 'Disminuir'} en {Math.abs(difference)} unidades
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Movimiento: {difference > 0 ? '+' : ''}{difference} en Almacén {product.almacenId}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo del ajuste *
              </label>
              <textarea
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe el motivo del ajuste..."
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !newQuantity || difference === 0 || !reason.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {loading ? 'Guardando...' : 'Realizar Ajuste'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inventario;