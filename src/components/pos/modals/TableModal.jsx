import React, { useState, useEffect, useRef } from 'react';
import SplitPaymentModal from './SplitPaymentModal';
import TableTransferModal from './TableTransferModal';
import AdvancedComandaModal from './AdvancedComandaModal';

const TableModal = ({ 
  isOpen, 
  onClose, 
  mesa, 
  mesaConfig, 
  estado,
  onAgregarProducto,
  onProcesarPago,
  onImprimirComanda,
  onCerrarMesa,
  products,
  mesasHook,
  onProductSearch,
  variables,
  allMesas = [] // ✅ NUEVA PROP: Lista de todas las mesas para transferencias
}) => {
  const [productSearch, setProductSearch] = useState('');
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [notas, setNotas] = useState('');
  const [cliente, setCliente] = useState('');

  const [serverProducts, setServerProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [clienteDetails, setClienteDetails] = useState(null);
  const [totalesServer, setTotalesServer] = useState({ subtotal: 0, total: 0 });


  // ✅ ESTADOS PARA MODALES AVANZADOS
  const [showSplitPaymentModal, setShowSplitPaymentModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAdvancedComandaModal, setShowAdvancedComandaModal] = useState(false);
  const [showComandaHelp, setShowComandaHelp] = useState(false);

  // Estados para el modal
  const [activeTab, setActiveTab] = useState('productos'); // productos, cuenta, pago
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // ✅ NUEVO: Estado para controlar la carga inicial
  const [hasLoadedInitially, setHasLoadedInitially] = useState(false);
  const mesaIdRef = useRef(null);

  // ✅ FUNCIONES HANDLER IMPLEMENTADAS
  const handleSplitPayment = (splitData) => {
    console.log('Procesando división de pago:', splitData);
    
    // TODO: Implementar lógica específica para dividir el pago
    // Ejemplo de lo que se podría hacer:
    // - Crear múltiples transacciones de pago
    // - Actualizar el estado de la mesa
    // - Generar facturas individuales
    
    // Por ahora, solo mostrar confirmación
    alert(`Procesando pago de ${splitData.guest.nombre} por Q.${splitData.amount.toFixed(2)}`);
    
    setShowSplitPaymentModal(false);
    
    // Si se necesita cerrar el modal principal después del pago
    // onClose();
  };

  const handleTransfer = async (transferData) => {
    console.log('Procesando transferencia de mesa:', transferData);
    
    try {
      // TODO: Implementar lógica específica según el tipo de operación
      switch (transferData.operation) {
        case 'transfer':
          console.log(`Transfiriendo mesa ${transferData.fromTable.nombre} a ${transferData.toTables[0]?.nombre}`);
          // await mesasHook.transferMesa(transferData);
          break;
          
        case 'merge':
          console.log(`Fusionando mesas: ${[transferData.fromTable, ...transferData.toTables].map(m => m.nombre).join(', ')}`);
          // await mesasHook.mergeMesas(transferData);
          break;
          
        case 'split':
          console.log(`Dividiendo mesa ${transferData.fromTable.nombre}`);
          // await mesasHook.splitMesa(transferData);
          break;
          
        case 'swap':
          console.log(`Intercambiando mesas ${transferData.fromTable.nombre} con ${transferData.toTables[0]?.nombre}`);
          // await mesasHook.swapMesas(transferData);
          break;
          
        default:
          throw new Error('Operación no válida');
      }
      
      // Mostrar confirmación
      alert(`${transferData.operation.toUpperCase()} realizada exitosamente`);
      
      // Actualizar datos si es necesario
      if (mesasHook && mesasHook.loadMesasEstado) {
        await mesasHook.loadMesasEstado();
      }
      
      // Cerrar modal principal si la mesa fue transferida completamente
      if (transferData.operation === 'transfer') {
        onClose();
      }
      
    } catch (error) {
      console.error('Error en operación de mesa:', error);
      throw error; // Re-throw para que el modal lo maneje
    }
  };

  // ✅ FUNCIÓN PARA COMANDA AVANZADA
  const handleSendAdvancedComanda = async (comandaData) => {
    console.log('🍳 Procesando comanda avanzada:', comandaData);
    
    try {
      // TODO: Implementar envío a cocina con API específica para comandas avanzadas
      // Ejemplo de lo que se podría hacer:
      // - Enviar a diferentes estaciones según el tipo
      // - Programar tiempos de preparación
      // - Notificar a cocina con detalles específicos
      
      // Por ahora, usar la función existente de imprimir comanda como base
      if (onImprimirComanda) {
        // Crear datos compatibles con el sistema existente
        const comandaSimple = {
          type: 'Comanda Avanzada',
          mesa: comandaData.mesa.numero,
          nombreMesa: comandaData.mesa.nombre,
          productos: comandaData.items,
          fecha: comandaData.timestamp,
          mesero: 'Sistema Avanzado',
          notas: comandaData.specialInstructions,
          // Información adicional del sistema avanzado
          timing: comandaData.timing,
          courses: comandaData.courses,
          stations: comandaData.stations,
          estimatedTime: comandaData.estimatedTime,
          priority: comandaData.priority
        };
        
        // Llamar a la función existente como fallback
        onImprimirComanda(comandaData.mesa, comandaData.items, comandaSimple);
      }
      
      // Mostrar confirmación
      alert(`Comanda avanzada enviada exitosamente!\n\nEstaciones: ${comandaData.stations.join(', ')}\nTiempo estimado: ${comandaData.estimatedTime} minutos`);
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error enviando comanda avanzada:', error);
      throw error;
    }
  };

  // Limpiar estado al abrir/cerrar
  useEffect(() => {
    if (isOpen && mesa) {
      setSelectedProducts(mesa.productos || []);
      setNotas(mesa.notas || '');
      setCliente(mesa.cliente || '');
      setActiveTab(estado === 'COBRANDO' ? 'pago' : 'productos');
      
      // ✅ Reset del estado de carga al abrir modal
      setHasLoadedInitially(false);
      mesaIdRef.current = null;
    } else {
      setProductSearch('');
      setShowProductSuggestions(false);
      setSelectedProducts([]);
      setNotas('');
      setCliente('');
      setServerProducts([]);
      setClienteDetails(null);
      setTotalesServer({ subtotal: 0, total: 0 });
      
      // ✅ Reset completo al cerrar
      setHasLoadedInitially(false);
      mesaIdRef.current = null;
      setShowComandaHelp(false); // Cerrar tooltip de ayuda
    }
  }, [isOpen, mesa, estado]);

  // ✅ Cerrar tooltip de ayuda al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showComandaHelp && !event.target.closest('.comanda-help-container')) {
        setShowComandaHelp(false);
      }
    };

    if (showComandaHelp) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showComandaHelp]);

  // ✅ MEJORADO: useEffect con mejor control de dependencias
  useEffect(() => {
    // Solo cargar si:
    // 1. El modal está abierto
    // 2. Hay una mesa con ID
    // 3. El hook está disponible
    // 4. No hemos cargado esta mesa antes O es una mesa diferente
    const shouldLoad = isOpen && 
                      mesa && 
                      mesa.id && 
                      mesasHook && 
                      mesasHook.getMesaDetails && 
                      (!hasLoadedInitially || mesa.id !== mesaIdRef.current);

    if (shouldLoad) {
      console.log('🔄 Cargando datos de mesa por primera vez o cambio de mesa:', mesa.id);
      loadMesaProducts();
    }
  }, [isOpen, mesa?.id, hasLoadedInitially]); // ✅ Removida dependencia de mesasHook

  // ✅ FUNCIÓN MEJORADA: loadMesaProducts con control de recarga
  const loadMesaProducts = async () => {
    if (!mesasHook || !mesasHook.getMesaDetails) {
      console.warn('mesasHook o getMesaDetails no disponible');
      return;
    }
    
    setIsLoadingProducts(true);
    try {
      console.log('🔄 Cargando productos de mesa:', mesa.id);
      
      const result = await mesasHook.getMesaDetails(mesa.id);
      
      if (result.success) {
        console.log('✅ Productos cargados:', result.products?.length || 0);
        
        // Actualizar estados con datos del servidor
        setServerProducts(result.products || []);
        setClienteDetails(result.cliente);
        setCliente(result.cliente?.name || '');
        setNotas(result.notas || '');
        setTotalesServer(result.totales || { subtotal: 0, total: 0 });
        
        // Si hay productos del servidor, usarlos como productos seleccionados
        if (result.products && result.products.length > 0) {
          setSelectedProducts(result.products);
          
          // ✅ CORREGIDO: Solo cambiar de tab automáticamente si es la primera carga
          // y no hay cambio manual del usuario
          if (!hasLoadedInitially && activeTab === 'productos') {
            console.log('📋 Cambiando al tab cuenta porque hay productos guardados');
            setActiveTab('cuenta');
          }
        }
        
        // ✅ Marcar como cargado y guardar referencia
        setHasLoadedInitially(true);
        mesaIdRef.current = mesa.id;
        
      } else {
        console.error('Error cargando detalles:', result.error);
        setServerProducts([]);
      }
    } catch (error) {
      console.error('Error cargando productos de mesa:', error);
      setServerProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // ✅ FUNCIÓN MEJORADA: handleSaveProducts con recarga controlada
  const handleSaveProducts = async () => {
    try {
      console.log('💾 Guardando productos en mesa:', mesa.id);
      
      for (const product of selectedProducts) {
        if (!product.saved) { // Solo enviar productos nuevos
          await onAgregarProducto(mesa.id, product);
        }
      }
      
      // ✅ IMPORTANTE: Recargar productos del servidor después de guardar
      console.log('🔄 Recargando productos después de guardar...');
      
      // Forzar recarga incluso si ya se había cargado antes
      setHasLoadedInitially(false);
      await loadMesaProducts();
      
      alert('Productos agregados a la mesa exitosamente');
    } catch (error) {
      console.error('Error guardando productos:', error);
      alert('Error agregando productos a la mesa');
    }
  };

  // ✅ NUEVA FUNCIÓN: Recarga manual para el botón de refresh
  const handleRefreshMesaData = async () => {
    console.log('🔄 Recarga manual de datos de mesa');
    setHasLoadedInitially(false);
    await loadMesaProducts();
  };

  // Manejar búsqueda de productos
  const handleProductSearch = (value) => {
    setProductSearch(value);
    if (value.trim().length > 0) {
      onProductSearch(value);
      setShowProductSuggestions(true);
    } else {
      setShowProductSuggestions(false);
    }
  };

  // Agregar producto a la selección local
  const handleAddProduct = (product) => {
    const existingIndex = selectedProducts.findIndex(p => p.id === product.id);
    
    if (existingIndex >= 0) {
      // Si ya existe, incrementar cantidad
      const updatedProducts = [...selectedProducts];
      updatedProducts[existingIndex].quantity += 1;
      setSelectedProducts(updatedProducts);
    } else {
      // Si no existe, agregar nuevo
      setSelectedProducts([...selectedProducts, {
        ...product,
        quantity: 1,
        discount: 0,
        note: ''
      }]);
    }
    
    setProductSearch('');
    setShowProductSuggestions(false);
  };

  // Actualizar cantidad de producto
  const handleQuantityChange = (index, newQuantity) => {
    if (newQuantity <= 0) {
      // Eliminar producto si cantidad es 0
      const updatedProducts = selectedProducts.filter((_, i) => i !== index);
      setSelectedProducts(updatedProducts);
    } else {
      const updatedProducts = [...selectedProducts];
      updatedProducts[index].quantity = parseInt(newQuantity);
      setSelectedProducts(updatedProducts);
    }
  };

  // Actualizar descuento de producto
  const handleDiscountChange = (index, newDiscount) => {
    const updatedProducts = [...selectedProducts];
    updatedProducts[index].discount = parseFloat(newDiscount) || 0;
    setSelectedProducts(updatedProducts);
  };

  // Actualizar nota de producto
  const handleNoteChange = (index, newNote) => {
    const updatedProducts = [...selectedProducts];
    updatedProducts[index].note = newNote;
    setSelectedProducts(updatedProducts);
  };

  // Calcular totales
  const calculateSubtotal = () => {
    return selectedProducts.reduce((sum, product) => {
      const subtotal = product.price * product.quantity;
      const discount = subtotal * (product.discount / 100);
      return sum + (subtotal - discount);
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal(); // Sin impuestos por ahora
  };

  // Procesar pago
  const handleProcessPayment = async () => {
    setIsProcessingPayment(true);
    try {
      await onProcesarPago(mesa, serverProducts.length > 0 ? serverProducts : selectedProducts, cliente);
      onClose();
    } catch (error) {
      console.error('Error procesando pago:', error);
      alert('Error procesando el pago');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const renderCuentaTab = () => (
    <div className="space-y-6">
      {isLoadingProducts && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="ml-2">Cargando productos...</span>
        </div>
      )}
      
      {/* ✅ NUEVO: Botón de refresh para recargar manualmente */}
      <div className="flex justify-between items-center">
        <h4 className="font-medium text-gray-900">Cuenta de la Mesa</h4>
        <button
          onClick={handleRefreshMesaData}
          disabled={isLoadingProducts}
          className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
        >
          <svg className={`w-4 h-4 ${isLoadingProducts ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Actualizar</span>
        </button>
      </div>
      
      {/* Información del cliente */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cliente (opcional)
        </label>
        <input
          type="text"
          value={cliente}
          onChange={(e) => setCliente(e.target.value)}
          placeholder="Nombre del cliente..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {clienteDetails && (
          <div className="mt-2 text-sm text-gray-600">
            <p><strong>NIT:</strong> {clienteDetails.nit}</p>
            <p><strong>Email:</strong> {clienteDetails.email || 'N/A'}</p>
            <p><strong>Teléfono:</strong> {clienteDetails.phone || 'N/A'}</p>
          </div>
        )}
      </div>

      {/* Notas generales */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notas de la mesa
        </label>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Notas especiales, observaciones..."
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* ✅ MOSTRAR PRODUCTOS DEL SERVIDOR */}
      <div>
        <h4 className="font-medium text-gray-900 mb-2 flex items-center">
          <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Productos en la Mesa ({serverProducts.length})
        </h4>
        
        {serverProducts.length > 0 ? (
          <div className="space-y-3">
            {serverProducts.map((product, index) => (
              <div key={product.line_id || index} className="border border-gray-200 rounded-lg p-3 bg-green-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">{product.name}</h5>
                    <p className="text-sm text-gray-500">{product.ref}</p>
                    {product.note && (
                      <p className="text-sm text-blue-600 italic">Nota: {product.note}</p>
                    )}
                  </div>
                  <span className="text-green-600 text-sm font-medium bg-green-100 px-2 py-1 rounded">
                    ✅ Guardado
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 mt-3 text-sm">
                  <div>
                    <span className="font-medium">Cant:</span> {product.quantity}
                  </div>
                  <div>
                    <span className="font-medium">Precio:</span> Q.{product.price.toFixed(2)}
                  </div>
                  <div>
                    <span className="font-medium">Desc:</span> {product.discount}%
                  </div>
                  <div>
                    <span className="font-medium">Total:</span> Q.{product.total.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm bg-gray-50 p-4 rounded-lg">
            No hay productos guardados en esta mesa. Use el tab "Productos" para agregar.
          </p>
        )}
      </div>

      {/* ✅ TOTALES DEL SERVIDOR */}
      {serverProducts.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Productos:</span>
              <span>{totalesServer.items_count || serverProducts.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>Q.{totalesServer.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total:</span>
              <span>Q.{totalesServer.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Renderizar lista de productos (para tab productos)
  const renderProductsList = () => (
    <div className="space-y-3">
      {selectedProducts.map((product, index) => (
        <div key={`${product.id}-${index}`} className="border border-gray-200 rounded-lg p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{product.name}</h4>
              <p className="text-sm text-gray-500">{product.ref}</p>
            </div>
            <button
              onClick={() => handleQuantityChange(index, 0)}
              className="text-red-500 hover:text-red-700 ml-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-3">
            {/* Cantidad */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cantidad</label>
              <input
                type="number"
                min="1"
                value={product.quantity}
                onChange={(e) => handleQuantityChange(index, e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Precio unitario */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Precio</label>
              <div className="px-2 py-1 text-sm bg-gray-50 border border-gray-300 rounded">
                Q.{product.price.toFixed(2)}
              </div>
            </div>

            {/* Descuento */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Desc. %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={product.discount}
                onChange={(e) => handleDiscountChange(index, e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Subtotal */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Subtotal</label>
              <div className="px-2 py-1 text-sm bg-gray-50 border border-gray-300 rounded font-medium">
                Q.{((product.price * product.quantity) * (1 - product.discount / 100)).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Nota del producto */}
          <div className="mt-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Nota</label>
            <input
              type="text"
              value={product.note}
              onChange={(e) => handleNoteChange(index, e.target.value)}
              placeholder="Instrucciones especiales..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      ))}

      {selectedProducts.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p>No hay productos en esta mesa</p>
          <p className="text-sm">Use el buscador arriba para agregar productos</p>
        </div>
      )}
    </div>
  );

  if (!isOpen || !mesaConfig) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b bg-gray-50">
          <div className="flex items-center space-x-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{mesaConfig.nombre}</h2>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>Capacidad: {mesaConfig.capacidad} personas</span>
                <span className={`
                  px-2 py-1 rounded-full text-xs font-medium
                  ${estado === 'LIBRE' ? 'bg-green-100 text-green-800' : ''}
                  ${estado === 'OCUPADA' ? 'bg-yellow-100 text-yellow-800' : ''}
                  ${estado === 'COBRANDO' ? 'bg-red-100 text-red-800' : ''}
                `}>
                  {estado === 'LIBRE' ? 'Libre' : estado === 'OCUPADA' ? 'Ocupada' : 'Cobrando'}
                </span>
              </div>
            </div>
          </div>
          
          {/* 💎 BOTONES ORGANIZADOS Y PROFESIONALES */}
          <div className="flex items-center space-x-2">
            {/* Comanda Avanzada - Acceso rápido */}
            {estado !== 'LIBRE' && (serverProducts.length > 0 || selectedProducts.length > 0) && (
              <button
                onClick={() => {
                  console.log('🍳 Comanda Avanzada - Mesa:', mesa?.id);
                  setShowAdvancedComandaModal(true);
                }}
                className="px-3 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all duration-200 shadow-md hover:shadow-lg flex items-center space-x-1"
                title="Comanda Avanzada"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden sm:inline">Avanzada</span>
              </button>
            )}

            {estado !== 'LIBRE' && (serverProducts.length > 0 || selectedProducts.length > 0) && (
              <button
                onClick={() => {
                  console.log('💰 Dividir Cuenta - Mesa:', mesa?.id);
                  setShowSplitPaymentModal(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="hidden sm:inline">Dividir Cuenta</span>
              </button>
            )}
            
            {estado !== 'LIBRE' && (
              <button
                onClick={() => {
                  console.log('🔄 Transferir Mesa - Mesa:', mesa?.id);
                  setShowTransferModal(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-md hover:shadow-lg flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span className="hidden sm:inline">Transferir</span>
              </button>
            )}
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ✅ MODALES DE FUNCIONALIDADES AVANZADAS */}
        <SplitPaymentModal 
          isOpen={showSplitPaymentModal}
          mesa={mesa}
          productos={serverProducts.length > 0 ? serverProducts : selectedProducts}
          onSplit={handleSplitPayment}
          onClose={() => setShowSplitPaymentModal(false)}
        />
        
        <TableTransferModal
          isOpen={showTransferModal}
          currentMesa={mesa}
          allMesas={allMesas}
          onTransfer={handleTransfer}
          onClose={() => setShowTransferModal(false)}
        />

        <AdvancedComandaModal
          isOpen={showAdvancedComandaModal}
          mesa={mesa}
          productos={serverProducts.length > 0 ? serverProducts : selectedProducts}
          onSendComanda={handleSendAdvancedComanda}
          onClose={() => setShowAdvancedComandaModal(false)}
        />

        {/* Tabs */}
        <div className="border-b bg-gray-50">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('productos')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'productos'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Productos
            </button>
            <button
              onClick={() => setActiveTab('cuenta')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'cuenta'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Cuenta ({serverProducts.length > 0 ? serverProducts.length : selectedProducts.length})
            </button>
            {estado !== 'LIBRE' && (
              <button
                onClick={() => setActiveTab('pago')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'pago'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Pago
              </button>
            )}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Tab: Productos */}
          {activeTab === 'productos' && (
            <div className="space-y-6">
              {/* Buscador de productos */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buscar productos
                </label>
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => handleProductSearch(e.target.value)}
                  placeholder="Buscar por nombre o código..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                {/* Sugerencias de productos */}
                {showProductSuggestions && products && products.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {products.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => handleAddProduct(product)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">
                          {product.ref} - Q.{product.price.toFixed(2)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Lista de productos agregados */}
              {renderProductsList()}
            </div>
          )}

          {/* Tab: Cuenta */}
          {activeTab === 'cuenta' && renderCuentaTab()}

          {/* Tab: Pago */}
          {activeTab === 'pago' && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Procesar Pago</h3>
                <p className="text-blue-700 text-sm">
                  Esta funcionalidad abrirá el sistema de pagos para procesar la cuenta de la mesa.
                </p>
              </div>

              {/* Resumen final */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-4">Resumen de la Cuenta</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Mesa:</span>
                    <span className="font-medium">{mesaConfig.nombre}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cliente:</span>
                    <span className="font-medium">{cliente || 'Cliente General'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Productos:</span>
                    <span className="font-medium">{serverProducts.length > 0 ? serverProducts.length : selectedProducts.length}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total a Pagar:</span>
                    <span>Q.{(serverProducts.length > 0 ? totalesServer.total : calculateTotal()).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer con acciones */}
        <div className="border-t bg-gray-50 p-6">
          <div className="flex justify-between items-center">
            <div className="flex space-x-3">
              {/* Botón Imprimir Comanda */}
              {(serverProducts.length > 0 || selectedProducts.length > 0) && activeTab !== 'pago' && (
                <button
                  onClick={() => onImprimirComanda(mesa, serverProducts.length > 0 ? serverProducts : selectedProducts)}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  🖨️ Comanda
                </button>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cerrar
              </button>

              {/* Botones según el tab activo */}
              {activeTab === 'productos' && selectedProducts.length > 0 && (
                <button
                  onClick={handleSaveProducts}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  💾 Guardar Productos
                </button>
              )}

              {activeTab === 'pago' && (
                <button
                  onClick={handleProcessPayment}
                  disabled={isProcessingPayment || (serverProducts.length === 0 && selectedProducts.length === 0)}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-400"
                >
                  {isProcessingPayment ? '⏳ Procesando...' : '💳 Procesar Pago'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableModal;