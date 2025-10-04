import { useState, useEffect, useCallback } from 'react';

// Hook para mesas usando API Independiente Segura - VERSIÓN CORREGIDA X-API-KEY
export const useMesas = (variables, terminal) => {
  // Estados principales
  const [mesas, setMesas] = useState([]);
  const [layoutConfig, setLayoutConfig] = useState(null);
  const [mesasConfig, setMesasConfig] = useState([]);
  const [elementosDecorativos, setElementosDecorativos] = useState([]);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Estados de UI
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [selectedMesa, setSelectedMesa] = useState(null);
  const [isMesaModalOpen, setIsMesaModalOpen] = useState(false);
  const [isEditorMode, setIsEditorMode] = useState(false);

  // Estados de configuración
  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupCompleted, setSetupCompleted] = useState(false);
  const [configReady, setConfigReady] = useState(false);

  // URLs para API Independiente Segura (SIN main.inc.php, SIN CSRF)
  const SECURE_API_BASE = variables?.SPOS_URL ? 
    `${variables.SPOS_URL}/custom/pos/frontend/api_spos_restaurant_secure` : null;
  const API_KEY = variables?.DOLIBARR_API_KEY || variables?.dolibarrToken;

  // Debug para verificar configuración
  useEffect(() => {
    console.log('🔧 useMesas - API Segura CORREGIDA (X-API-Key):', {
      SPOS_URL: variables?.SPOS_URL,
      SECURE_API_BASE,
      API_KEY_exists: !!API_KEY,
      API_KEY_preview: API_KEY ? `${API_KEY.substring(0, 10)}...` : 'FALTANTE',
      terminal_entity: terminal?.entity,
      auth_method: 'X-API-Key (CORREGIDO)',
      mode: 'SECURE_INDEPENDENT_API_FIXED'
    });
  }, [variables, terminal, API_KEY, SECURE_API_BASE]);

  // Estados de mesa
  const ESTADOS_MESA = {
    LIBRE: { name: 'Libre', color: 'bg-green-100 border-green-300 text-green-800' },
    OCUPADA: { name: 'Ocupada', color: 'bg-yellow-100 border-yellow-300 text-yellow-800' },
    COBRANDO: { name: 'Cobrando', color: 'bg-red-100 border-red-300 text-red-800' }
  };

  // Función para API Independiente Segura - CORREGIDA PARA X-API-KEY
  const secureApiCall = useCallback(async (endpoint, options = {}) => {
    try {
      console.log(`🔒 Secure API Call (X-API-Key): ${options.method || 'GET'} ${endpoint}`);
      
      if (!SECURE_API_BASE) {
        throw new Error('SECURE_API_BASE no configurada. SPOS_URL requerida.');
      }
      
      if (!API_KEY) {
        throw new Error('API_KEY no configurada. Token requerido para API segura.');
      }

      // URL para API independiente segura
      const url = `${SECURE_API_BASE}/${endpoint}`;
      
      console.log(`🎯 Secure URL: ${url}`);

      // ✅ CORREGIDO: Usar X-API-Key en lugar de Bearer Token
      const headers = {
        'X-API-Key': API_KEY,  // ← CAMBIO PRINCIPAL
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };

      const config = {
        method: options.method || 'GET',
        headers
      };

      // Para POST/PUT, agregar datos
      if (options.data && (options.method === 'POST' || options.method === 'PUT')) {
        config.body = JSON.stringify(options.data);
        console.log('📤 Secure API data:', options.data);
      }

      console.log('📋 Secure Headers (CORREGIDO):', {
        'X-API-Key': `${API_KEY.substring(0, 10)}...`,
        'Accept': headers.Accept,
        'Content-Type': headers['Content-Type']
      });

      const response = await fetch(url, config);
      
      console.log(`📡 Secure Response: ${response.status} ${response.statusText}`);

      // Leer respuesta
      const responseText = await response.text();
      console.log(`📄 Secure Response (500 chars):`, responseText.substring(0, 500));

      if (!response.ok) {
        // La API segura devuelve JSON incluso en errores
        try {
          const errorData = JSON.parse(responseText);
          throw new Error(`Secure API Error ${response.status}: ${errorData.error || responseText}`);
        } catch (parseError) {
          throw new Error(`Secure API Error ${response.status}: ${responseText}`);
        }
      }

      // Parsear JSON response
      let result;
      try {
        if (responseText.trim() === '') {
          result = { success: true, message: 'Operation completed' };
        } else {
          result = JSON.parse(responseText);
        }
      } catch (jsonError) {
        console.error('❌ Secure API JSON Error:', jsonError);
        throw new Error(`Invalid JSON from secure API: ${responseText.substring(0, 200)}...`);
      }

      console.log('✅ Secure API Success:', result);
      return result;

    } catch (error) {
      console.error('❌ Secure API Error:', error);
      throw error;
    }
  }, [SECURE_API_BASE, API_KEY]);

  // Función especial para upload de archivos (FormData) - CORREGIDA
  const secureUploadCall = useCallback(async (endpoint, formData) => {
    try {
      console.log(`📤 Secure Upload (X-API-Key): ${endpoint}`);
      
      if (!SECURE_API_BASE || !API_KEY) {
        throw new Error('API segura no configurada');
      }

      const url = `${SECURE_API_BASE}/${endpoint}`;

      // ✅ CORREGIDO: Usar X-API-Key para uploads también
      const headers = {
        'X-API-Key': API_KEY  // ← CAMBIO PRINCIPAL
        // NO incluir Content-Type para FormData
      };

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        const errorData = JSON.parse(responseText);
        throw new Error(`Upload Error ${response.status}: ${errorData.error}`);
      }

      return JSON.parse(responseText);

    } catch (error) {
      console.error('❌ Secure Upload Error:', error);
      throw error;
    }
  }, [SECURE_API_BASE, API_KEY]);

  // Manejar errores
  const handleError = useCallback((error, context = '') => {
    console.error(`Error en ${context}:`, error);
    
    let message = error.message || 'Error desconocido';
    
    if (message.includes('404')) {
      if (context.includes('layout')) {
        setNeedsSetup(true);
        message = 'No hay configuración de layout. Necesita configuración inicial.';
      } else {
        message = 'Recurso no encontrado.';
      }
    } else if (message.includes('401')) {
      message = 'Error de autenticación. Verifique el token de API.';
    } else if (message.includes('500')) {
      message = 'Error del servidor. Contacte al administrador.';
    }

    setError({
      message: message,
      context: context,
      timestamp: new Date().toISOString()
    });
  }, []);

  // Test de conectividad - CORREGIDO
  const testConnection = useCallback(async () => {
    try {
      console.log('🧪 Testing secure API connection (X-API-Key)...');
      const result = await secureApiCall('test');
      console.log('✅ Secure API connection successful (X-API-Key):', result);
      return true;
    } catch (error) {
      handleError(error, 'test de conexión segura con X-API-Key');
      return false;
    }
  }, [secureApiCall, handleError]);

  // Cargar layout
  const loadLayout = useCallback(async () => {
    try {
      console.log('🔄 Cargando layout desde API segura (X-API-Key)...');
      setIsLoading(true);
      setError(null);

      if (!terminal?.entity) {
        throw new Error('Entidad no configurada');
      }

      // GET layout/{entity}
      const layout = await secureApiCall(`layout/${terminal.entity}`);
      
      console.log('✅ Layout cargado desde API segura (X-API-Key):', layout);
      setLayoutConfig(layout);
      setNeedsSetup(false);

      // Cargar imagen de fondo si existe
      if (layout.background_image) {
        const imageUrl = `${variables.SPOS_URL}/${layout.background_image}`;
        setBackgroundImage(imageUrl);
      }

      // Cargar mesas y elementos
      await Promise.all([
        loadMesas(layout.rowid),
        loadElementos(layout.rowid)
      ]);

    } catch (error) {
      handleError(error, 'cargar layout');
      if (error.message.includes('404') || error.message.includes('not found')) {
        setNeedsSetup(true);
        setLayoutConfig(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [terminal?.entity, variables?.SPOS_URL, secureApiCall, handleError]);

  // Cargar mesas
  const loadMesas = useCallback(async (layoutId) => {
    try {
      console.log('🔄 Cargando mesas desde API segura (X-API-Key)...');
      const mesas = await secureApiCall(`layout/${layoutId}/tables`);
      setMesasConfig(mesas || []);
      console.log(`✅ ${mesas?.length || 0} mesas cargadas desde API segura (X-API-Key)`);
    } catch (error) {
      handleError(error, 'cargar mesas');
      setMesasConfig([]);
    }
  }, [secureApiCall, handleError]);

  // Cargar elementos decorativos
  const loadElementos = useCallback(async (layoutId) => {
    try {
      console.log('🔄 Cargando elementos desde API segura (X-API-Key)...');
      const elementos = await secureApiCall(`layout/${layoutId}/elements`);
      setElementosDecorativos(elementos || []);
      console.log(`✅ ${elementos?.length || 0} elementos cargados desde API segura (X-API-Key)`);
    } catch (error) {
      handleError(error, 'cargar elementos');
      setElementosDecorativos([]);
    }
  }, [secureApiCall, handleError]);

  // Cargar estado operativo de mesas
  const loadMesasEstado = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        console.log('🔄 Cargando estado operativo desde API segura (X-API-Key)...');
      }

      if (!terminal?.entity) {
        console.warn('⚠️ Sin entidad configurada');
        return;
      }

      // GET proposals/{entity}
      const proposals = await secureApiCall(`proposals/${terminal.entity}`);

      const mesasConEstado = (proposals || []).map(proposal => ({
        id: proposal.id,
        numero: parseInt(proposal.numero_mesa) || proposal.id,
        nombre: proposal.nombre_mesa || `Mesa ${proposal.numero_mesa || proposal.id}`,
        estado: determinarEstado(proposal.fk_statut),
        cliente: proposal.client_name || null,
        clienteId: proposal.fk_soc || null,
        total: parseFloat(proposal.total_ttc || 0),
        ref: proposal.ref,
        fechaApertura: proposal.date_creation,
        proposalId: proposal.id
      }));

      setMesas(mesasConEstado);
      
      if (!silent) {
        console.log(`✅ ${mesasConEstado.length} mesas operativas cargadas desde API segura (X-API-Key)`);
      }

    } catch (error) {
      if (!silent) {
        handleError(error, 'cargar estado operativo');
      }
      setMesas([]);
    }
  }, [terminal?.entity, secureApiCall, handleError]);


  // Obtener productos de una mesa específica
const getMesaProducts = useCallback(async (mesaId) => {
  try {
    console.log('📦 Cargando productos de mesa desde API segura:', mesaId);
    
    // GET table/{mesaId}/products
    const result = await secureApiCall(`table/${mesaId}/products`);
    
    console.log('✅ Productos de mesa cargados:', result);
    return { 
      success: true, 
      products: result.products || [],
      mesa_id: result.mesa_id,
      total_products: result.total_products || 0
    };

  } catch (error) {
    console.error('❌ Error cargando productos de mesa:', error);
    handleError(error, 'cargar productos de mesa');
    return { success: false, error: error.message, products: [] };
  }
}, [secureApiCall, handleError]);

// Obtener detalles completos de una mesa (incluyendo productos)
const getMesaDetails = useCallback(async (mesaId) => {
  try {
    console.log('🔍 Cargando detalles completos de mesa:', mesaId);
    
    // GET table/{mesaId}/details
    const result = await secureApiCall(`table/${mesaId}/details`);
    
    console.log('✅ Detalles completos de mesa:', result);
    return { 
      success: true, 
      mesa: result.mesa || {},
      products: result.products || [],
      cliente: result.cliente || null,
      notas: result.notas || '',
      totales: result.totales || { subtotal: 0, total: 0 },
      timestamp: result.timestamp
    };

  } catch (error) {
    console.error('❌ Error cargando detalles de mesa:', error);
    handleError(error, 'cargar detalles de mesa');
    return { success: false, error: error.message };
  }
}, [secureApiCall, handleError]);


 const createSplitPayment = useCallback(async (proposalId, guests) => {
    try {
      const result = await secureApiCall('split-payment', {
        method: 'POST',
        data: { proposal_id: proposalId, guests }
      });
      return result;
    } catch (error) {
      handleError(error, 'crear división de pago');
      return { success: false, error: error.message };
    }
  }, [secureApiCall, handleError]);

  const transferTable = useCallback(async (fromTable, toTable, type, reason) => {
    try {
      const result = await secureApiCall('transfer', {
        method: 'POST',
        data: { from_table: fromTable, to_table: toTable, type, reason }
      });
      return result;
    } catch (error) {
      handleError(error, 'transferir mesa');
      return { success: false, error: error.message };
    }
  }, [secureApiCall, handleError]);




  // Determinar estado de mesa
  const determinarEstado = useCallback((fkStatut) => {
    const status = parseInt(fkStatut) || 0;
    if (status === 0) return 'LIBRE';
    if (status === 1) return 'OCUPADA';
    if (status === 2) return 'COBRANDO';
    return 'LIBRE';
  }, []);

  // Crear layout inicial - CORREGIDO
  const createInitialLayout = useCallback(async (layoutData) => {
    try {
      console.log('🎬 Creando layout inicial en API segura (X-API-Key):', layoutData);
      setIsLoading(true);
      setError(null);

      // POST layout
      const result = await secureApiCall('layout', {
        method: 'POST',
        data: {
          ...layoutData,
          entity: terminal?.entity || 1
        }
      });

      console.log('✅ Layout creado exitosamente en API segura (X-API-Key):', result);
      setSetupCompleted(true);
      setNeedsSetup(false);

      // Recargar layout
      setTimeout(() => {
        loadLayout();
      }, 1000);

      return { success: true, data: result };

    } catch (error) {
      console.error('❌ Error creando layout en API segura (X-API-Key):', error);
      handleError(error, 'crear layout inicial');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [terminal?.entity, secureApiCall, handleError, loadLayout]);

  // Crear mesa
  const createMesa = useCallback(async (mesaData) => {
    try {
      console.log('🆕 Creando mesa en API segura (X-API-Key):', mesaData);
      
      // POST table
      const result = await secureApiCall('table', {
        method: 'POST',
        data: {
          ...mesaData,
          fk_layout: layoutConfig?.rowid,
          entity: terminal?.entity
        }
      });

      console.log('✅ Mesa creada en API segura (X-API-Key):', result);
      
      // Recargar mesas
      if (layoutConfig?.rowid) {
        await loadMesas(layoutConfig.rowid);
      }

      return { success: true, data: result };

    } catch (error) {
      handleError(error, 'crear mesa');
      return { success: false, error: error.message };
    }
  }, [layoutConfig?.rowid, terminal?.entity, secureApiCall, handleError, loadMesas]);

  // Subir imagen de fondo - CORREGIDO
  const uploadBackgroundImage = useCallback(async (file) => {
    try {
      console.log('📤 Subiendo imagen a API segura (X-API-Key):', file.name);
      setIsLoading(true);

      if (!layoutConfig?.rowid) {
        throw new Error('No hay layout configurado');
      }

      // Crear FormData
      const formData = new FormData();
      formData.append('image', file);
      formData.append('layout_id', layoutConfig.rowid);
      formData.append('entity', terminal?.entity || 1);

      // POST upload-image con X-API-Key
      const result = await secureUploadCall('upload-image', formData);

      if (result.success) {
        // Actualizar estado con nueva imagen
        const imageUrl = `${variables.SPOS_URL}/${result.image_path}`;
        setBackgroundImage(imageUrl);
        
        setLayoutConfig(prev => ({
          ...prev,
          background_image: result.image_path
        }));

        console.log('✅ Imagen subida exitosamente a API segura (X-API-Key):', imageUrl);
        return { success: true, imageUrl };
      } else {
        throw new Error(result.error || 'Error desconocido');
      }

    } catch (error) {
      console.error('❌ Error subiendo imagen a API segura (X-API-Key):', error);
      handleError(error, 'subir imagen de fondo');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [layoutConfig?.rowid, terminal?.entity, variables?.SPOS_URL, secureUploadCall, handleError]);

  // Actualizar posición de mesa
  const updateMesaPosition = useCallback(async (mesaId, newPosition) => {
    try {
      console.log('📍 Actualizando posición en API segura (X-API-Key):', mesaId, newPosition);

      // PUT table/{mesaId}/position
      const result = await secureApiCall(`table/${mesaId}/position`, {
        method: 'PUT',
        data: newPosition
      });

      console.log('✅ Posición actualizada en API segura (X-API-Key):', result);
      
      // Recargar mesas
      if (layoutConfig?.rowid) {
        await loadMesas(layoutConfig.rowid);
      }

      return { success: true, data: result };

    } catch (error) {
      handleError(error, 'actualizar posición de mesa');
      return { success: false, error: error.message };
    }
  }, [secureApiCall, handleError, layoutConfig?.rowid, loadMesas]);

  // Eliminar mesa
  const deleteMesa = useCallback(async (mesaId) => {
    try {
      console.log('🗑️ Eliminando mesa en API segura (X-API-Key):', mesaId);

      // DELETE table/{mesaId}
      const result = await secureApiCall(`table/${mesaId}`, {
        method: 'DELETE'
      });

      console.log('✅ Mesa eliminada en API segura (X-API-Key):', result);
      
      // Recargar mesas
      if (layoutConfig?.rowid) {
        await loadMesas(layoutConfig.rowid);
      }

      return { success: true, data: result };

    } catch (error) {
      handleError(error, 'eliminar mesa');
      return { success: false, error: error.message };
    }
  }, [secureApiCall, handleError, layoutConfig?.rowid, loadMesas]);

  // Abrir mesa (crear proposal)
  const abrirMesa = useCallback(async (numeroMesa) => {
    try {
      console.log('🔓 Abriendo mesa en API segura (X-API-Key):', numeroMesa);

      // POST table/{numeroMesa}/open
      const result = await secureApiCall(`table/${numeroMesa}/open`, {
        method: 'POST',
        data: { entity: terminal?.entity }
      });

      await loadMesasEstado();
      return { success: true, data: result };

    } catch (error) {
      handleError(error, 'abrir mesa');
      return { success: false, error: error.message };
    }
  }, [secureApiCall, terminal?.entity, loadMesasEstado, handleError]);

  // Cerrar mesa
  const cerrarMesa = useCallback(async (mesa) => {
    try {
      console.log('🔒 Cerrando mesa en API segura (X-API-Key):', mesa);

      // POST table/{mesa.id}/close
      const result = await secureApiCall(`table/${mesa.id || mesa.proposalId}/close`, {
        method: 'POST',
        data: { entity: terminal?.entity }
      });

      await loadMesasEstado();
      return { success: true, data: result };

    } catch (error) {
      handleError(error, 'cerrar mesa');
      return { success: false, error: error.message };
    }
  }, [secureApiCall, terminal?.entity, loadMesasEstado, handleError]);

  // Agregar producto a mesa
  const agregarProductoAMesa = useCallback(async (mesaId, producto) => {
    try {
      console.log('➕ Agregando producto a mesa en API segura (X-API-Key):', mesaId, producto);

      // POST table/{mesaId}/product
      const result = await secureApiCall(`table/${mesaId}/product`, {
        method: 'POST',
        data: {
          ...producto,
          entity: terminal?.entity
        }
      });

      await loadMesasEstado();
      return { success: true, data: result };

    } catch (error) {
      handleError(error, 'agregar producto a mesa');
      return { success: false, error: error.message };
    }
  }, [secureApiCall, terminal?.entity, loadMesasEstado, handleError]);

  // Obtener estadísticas
  const getEstadisticas = useCallback(() => {
    const libre = mesas.filter(m => m.estado === 'LIBRE').length;
    const ocupada = mesas.filter(m => m.estado === 'OCUPADA').length;
    const cobrando = mesas.filter(m => m.estado === 'COBRANDO').length;
    const total = mesasConfig.length;
    
    return { libre, ocupada, cobrando, total };
  }, [mesas, mesasConfig.length]);

  // Seleccionar mesa
  const selectMesa = useCallback((mesa) => {
    console.log('👆 Mesa seleccionada:', mesa);
    setSelectedMesa(mesa);
    setIsMesaModalOpen(true);
  }, []);

  // Obtener siguiente número de mesa disponible
  const getNextMesaNumber = useCallback(() => {
    if (mesasConfig.length === 0) return 1;
    
    const numbers = mesasConfig.map(m => parseInt(m.numero)).filter(n => !isNaN(n));
    const maxNumber = Math.max(...numbers);
    
    return maxNumber + 1;
  }, [mesasConfig]);

  // Limpiar error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Reintentar operación
  const retry = useCallback(() => {
    setError(null);
    loadLayout();
  }, [loadLayout]);

  // Estados de retry
  const [canRetry, setCanRetry] = useState(true);
  const [retryLastOperation, setRetryLastOperation] = useState(null);

  // Efectos
  useEffect(() => {
    if (terminal?.entity && SECURE_API_BASE && API_KEY) {
      console.log('🚀 Inicializando SPOS con API Segura (X-API-Key) para entidad:', terminal.entity);
      testConnection().then(connected => {
        if (connected) {
          loadLayout();
        }
      });
    } else {
      console.log('⏳ Esperando configuración completa para API segura (X-API-Key)...');
    }
  }, [terminal?.entity, SECURE_API_BASE, API_KEY, testConnection, loadLayout]);

  // Recargar estado cada 30 segundos
  useEffect(() => {
    if (layoutConfig && mesasConfig.length > 0) {
      loadMesasEstado();
      
      const interval = setInterval(() => {
        loadMesasEstado(true);
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [layoutConfig, mesasConfig.length, loadMesasEstado]);

  // Auto-limpiar errores
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [error]);

  // API pública del hook
  return {
    // Estados principales
    mesas,
    layoutConfig,
    mesasConfig,
    elementosDecorativos,
    backgroundImage,
    isLoading,
    error,
    ESTADOS_MESA,
    
    // Estados de configuración
    needsSetup,
    setupCompleted,
    configReady,

  
    
    // Estados de UI
    isConfigModalOpen,
    setIsConfigModalOpen,
    isMesaModalOpen,
    setIsMesaModalOpen,
    isEditorMode,
    setIsEditorMode,
    selectedMesa,
    setSelectedMesa,
    
    // Funciones principales
    loadLayout,
    createInitialLayout,
    loadMesasEstado,
    createMesa,
    updateMesaPosition,
    deleteMesa,
    uploadBackgroundImage,
    testConnection,
    
    // Funciones de mesas
    abrirMesa,
    cerrarMesa,
    agregarProductoAMesa,
    

     createSplitPayment,
    transferTable,

    
    // Utilidades
    getEstadisticas,
    selectMesa,
    getNextMesaNumber,
    clearError,
    retry,
    
//obtener cuenta y detalles de mesa
        getMesaProducts,
      getMesaDetails,


    // Estados de configuración
    isConfigured: !!layoutConfig && !needsSetup,
    hasBackground: !!backgroundImage,
    totalMesas: mesasConfig.length,
    hasError: !!error,
    canRetry,
    retryLastOperation,
    
    // Info de debug para API segura CORREGIDA
    apiInfo: {
      base: SECURE_API_BASE,
      hasKey: !!API_KEY,
      keySource: variables?.DOLIBARR_API_KEY ? 'DOLIBARR_API_KEY' : 
                variables?.dolibarrToken ? 'dolibarrToken' : 'NO_KEY',
      keyPreview: API_KEY ? `${API_KEY.substring(0, 10)}...` : 'undefined',
      entity: terminal?.entity,
      apiType: 'SECURE_INDEPENDENT_FIXED',
      authMethod: 'X-API-Key (CORREGIDO)',
      csrfProtected: false,
      serverCompatible: true
    }
  };
};