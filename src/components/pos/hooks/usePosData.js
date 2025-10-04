import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext';

// ============================================================================
// HOOK usePosData MIGRADO A API NATIVA DE DOLIBARR
// ============================================================================
// Versión migrada usando el mismo patrón exitoso de useCustomers

export const usePosData = (terminal) => {
  const { user, company, variables, logout, userId } = useContext(AuthContext);
  
  // 🍽️ USAR VARIABLES DIRECTAMENTE DE LA BASE DE DATOS
  // Las variables vienen del AuthContext que las carga desde BD
  // No necesitamos modificarlas, solo usarlas tal como vienen
  
  // URLs y headers de API - MISMO PATRÓN QUE USECUSTOMERS
  const API_BASE_URL = variables.SPOS_URL ? `${variables.SPOS_URL}/api/index.php` : null;
  const API_KEY = variables.DOLIBARR_API_KEY || variables.dolibarrToken;

  // Headers simples que funcionan (EXACTAMENTE igual que useCustomers)
  const getHeaders = () => {
    if (!API_KEY) {
      throw new Error('Token de Dolibarr no disponible');
    }

    return {
      'DOLAPIKEY': API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  };

  // Estados principales
  const [isEditable, setIsEditable] = useState(true);
  const [extraFields, setExtraFields] = useState({});
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState(null);
  const [customerDiscount, setCustomerDiscount] = useState(0);
  const [generalNotes, setGeneralNotes] = useState('');
  const [tipoVenta, setTipoVenta] = useState("Cotizacion");
  const [isFel, setIsFel] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  // Modales
  const [isCustomFieldsModalOpen, setIsCustomFieldsModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSuspendedModalOpen, setIsSuspendedModalOpen] = useState(false);
  const [isSalesHistoryModalOpen, setIsSalesHistoryModalOpen] = useState(false);
  const [isCashClosureModalOpen, setIsCashClosureModalOpen] = useState(false);

  // Campos del formulario de cliente
  const [nitValue, setNitValue] = useState('');
  const [nombreValue, setNombreValue] = useState('');
  const [direccionValue, setDireccionValue] = useState('');
  const [telefonoValue, setTelefonoValue] = useState('');
  const [emailValue, setEmailValue] = useState('');

  // Ticket e impresión
  const [showTicket, setShowTicket] = useState(false);
  const [ticketData, setTicketData] = useState(null);

  // DEBUG: Verificar configuración inicial (incluyendo modo restaurante)
  useEffect(() => {
    console.log('🔍 usePosData - Configuración inicial:', {
      hasApiBaseUrl: !!API_BASE_URL,
      hasApiKey: !!API_KEY,
      SPOS_URL: variables.SPOS_URL,
      tokenLength: API_KEY?.length || 0,
      terminalFkSoc: terminal?.fk_soc,
      // 🍽️ LOGGING DEL MODO RESTAURANTE (DESDE BD - NOMBRE CORRECTO)
      isRestaurantMode: variables.SPOS_RESTAURANTE === "1",
      restaurantVariable: variables.SPOS_RESTAURANTE
    });
  }, [variables, terminal]);

  // Cálculos
  const calculateSubtotal = () => cart.reduce((sum, item) => sum + (item.price ? item.price * item.quantity : 0), 0);
  const calculateDiscount = () => cart.reduce((sum, item) => sum + (item.price * item.quantity * item.discount / 100), 0);
  const calculateTotal = () => calculateSubtotal() - calculateDiscount();

  // Cargar cliente por defecto - MIGRADO A API DOLIBARR
  const loadDefaultCustomer = async () => {
    console.log('🔍 loadDefaultCustomer iniciado');
    
    try {
      // Verificaciones iniciales con logging detallado
      if (!API_BASE_URL) {
        console.error('❌ API_BASE_URL no está configurada para loadDefaultCustomer:', API_BASE_URL);
        return;
      }

      if (!API_KEY) {
        console.error('❌ API_KEY no está configurada para loadDefaultCustomer:', API_KEY);
        return;
      }

      console.log('✅ Configuración válida - buscando cliente por defecto');
      console.log('🔍 Buscando "Consumidor Final"');
      console.log('🔑 Token disponible:', API_KEY.substring(0, 10) + '...');
      console.log('🌐 URL base:', API_BASE_URL);

      // Buscar "Consumidor Final" específicamente
      const searchFilter = `(t.nom LIKE '%Consumidor Final%' OR t.name LIKE '%Consumidor Final%')`;
      const encodedFilter = encodeURIComponent(searchFilter);
      
      let customersUrl = `${API_BASE_URL}/thirdparties?sqlfilters=${encodedFilter}&limit=1&sortfield=t.nom&sortorder=ASC`;

      console.log('📤 URL de búsqueda cliente default:', customersUrl);
      console.log('🎯 Filtro aplicado:', searchFilter);

      // USAR EXACTAMENTE LOS MISMOS HEADERS QUE USEUSTOMERS
      let headers;
      try {
        headers = getHeaders();
        console.log('📤 Headers obtenidos correctamente para cliente default:', headers);
      } catch (headerError) {
        console.error('❌ Error obteniendo headers para cliente default:', headerError);
        return;
      }

      console.log('🌐 Realizando fetch para cliente default a:', customersUrl);
      
      const response = await fetch(customersUrl, {
        method: 'GET',
        headers: headers
      });

      console.log('📡 Respuesta del servidor para cliente default:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error del servidor en cliente default:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText.substring(0, 200)
        });

        // Si hay problemas con filtros SQL, intentar sin filtros y filtrar en cliente
        if (response.status === 400 || response.status === 503) {
          console.warn('⚠️ Problemas con filtros para cliente default, intentando búsqueda simple...');
          
          const simpleUrl = `${API_BASE_URL}/thirdparties?limit=10&sortfield=t.nom&sortorder=ASC`;
          console.log('🔄 Intentando URL simple para cliente default:', simpleUrl);
          
          const simpleResponse = await fetch(simpleUrl, {
            method: 'GET',
            headers: headers
          });

          console.log('📡 Respuesta simple para cliente default:', {
            status: simpleResponse.status,
            statusText: simpleResponse.statusText,
            ok: simpleResponse.ok
          });

          if (simpleResponse.ok) {
            console.log('✅ Búsqueda simple funciona para cliente default, filtrando en cliente');
            const allCustomers = await simpleResponse.json();
            console.log('📦 Total clientes recibidos para filtrar cliente default:', allCustomers.length);
            
            // Filtrar "Consumidor Final" en el cliente
            const defaultCustomer = allCustomers.find(customer => {
              const matchesNom = customer.nom?.toLowerCase().includes('consumidor final');
              const matchesName = customer.name?.toLowerCase().includes('consumidor final');
              return matchesNom || matchesName;
            });

            if (defaultCustomer) {
              console.log('🎯 Cliente default encontrado por filtrado local:', defaultCustomer);

              // Transformar formato para compatibilidad
              const transformedCustomer = {
                id: defaultCustomer.id,
                nom: defaultCustomer.nom || defaultCustomer.name || 'Consumidor Final',
                idprof1: defaultCustomer.idprof1 || 'CF',
                remise: '0', // Descuento por defecto
                rawData: defaultCustomer
              };

              setSelectedCustomer(transformedCustomer.nom);
              setSelectedCustomerDetails(transformedCustomer);
              setCustomerDiscount(parseFloat(transformedCustomer.remise) || 0);

              console.log('✅ Cliente default configurado exitosamente:', transformedCustomer);
              return;
            } else {
              console.warn('⚠️ No se encontró "Consumidor Final" en filtrado local');
            }
          } else {
            const simpleErrorText = await simpleResponse.text();
            console.error('❌ Error en búsqueda simple para cliente default:', simpleErrorText);
          }
        }

        console.error('❌ No se pudo cargar cliente default');
        return;
      }

      const customersData = await response.json();
      console.log('📦 Clientes recibidos directamente para default:', customersData.length);

      if (customersData.length > 0) {
        const customer = customersData[0];
        console.log('🎯 Cliente default encontrado directamente:', customer);

        // Transformar datos para mantener compatibilidad con el formato original
        const transformedCustomer = {
          id: customer.id,
          nom: customer.nom || customer.name || 'Consumidor Final',
          idprof1: customer.idprof1 || 'CF',
          remise: '0', // Descuento por defecto
          rawData: customer
        };

        setSelectedCustomer(transformedCustomer.nom);
        setSelectedCustomerDetails(transformedCustomer);
        setCustomerDiscount(parseFloat(transformedCustomer.remise) || 0);

        console.log('✅ Cliente default configurado exitosamente:', transformedCustomer);
      } else {
        console.warn('⚠️ No se encontró cliente default "Consumidor Final"');
      }

    } catch (error) {
      console.error('❌ Error general en loadDefaultCustomer:', error);
      console.error('📊 Stack trace:', error.stack);
    }
  };

  // Fetchear vendedores - MIGRADO A API DOLIBARR
  const fetchVendors = async () => {
    console.log('🔍 fetchVendors iniciado');
    
    try {
      // Verificaciones iniciales con logging detallado
      if (!API_BASE_URL) {
        console.error('❌ API_BASE_URL no está configurada para fetchVendors:', API_BASE_URL);
        setVendors([]);
        return;
      }

      if (!API_KEY) {
        console.error('❌ API_KEY no está configurada para fetchVendors:', API_KEY);
        setVendors([]);
        return;
      }

      console.log('✅ Configuración válida - obteniendo vendedores');
      console.log('🔑 Token disponible para vendedores:', API_KEY.substring(0, 10) + '...');
      console.log('🌐 URL base para vendedores:', API_BASE_URL);

      // Obtener usuarios activos (potenciales vendedores)
      let usersUrl = `${API_BASE_URL}/users?statut=1&limit=50&sortfield=t.login&sortorder=ASC`;

      console.log('📤 URL de búsqueda vendedores:', usersUrl);

      // USAR EXACTAMENTE LOS MISMOS HEADERS QUE USEUSTOMERS
      let headers;
      try {
        headers = getHeaders();
        console.log('📤 Headers obtenidos correctamente para vendedores:', headers);
      } catch (headerError) {
        console.error('❌ Error obteniendo headers para vendedores:', headerError);
        setVendors([]);
        return;
      }

      console.log('🌐 Realizando fetch para vendedores a:', usersUrl);
      
      const response = await fetch(usersUrl, {
        method: 'GET',
        headers: headers
      });

      console.log('📡 Respuesta del servidor para vendedores:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error del servidor en vendedores:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText.substring(0, 200)
        });

        // Si hay problemas específicos con el endpoint de usuarios, intentar alternativa
        if (response.status === 400 || response.status === 403 || response.status === 503) {
          console.warn('⚠️ Problemas con endpoint de usuarios, intentando búsqueda simple...');
          
          const simpleUrl = `${API_BASE_URL}/users?limit=20`;
          console.log('🔄 Intentando URL simple para vendedores:', simpleUrl);
          
          const simpleResponse = await fetch(simpleUrl, {
            method: 'GET',
            headers: headers
          });

          console.log('📡 Respuesta simple para vendedores:', {
            status: simpleResponse.status,
            statusText: simpleResponse.statusText,
            ok: simpleResponse.ok
          });

          if (simpleResponse.ok) {
            console.log('✅ Búsqueda simple funciona para vendedores');
            const allUsers = await simpleResponse.json();
            console.log('📦 Total usuarios recibidos para vendedores:', allUsers.length);
            
            // Filtrar usuarios activos
            const activeUsers = allUsers.filter(user => {
              return user.statut == 1 || user.status == 1; // Usuarios activos
            });

            console.log('🔍 Usuarios activos filtrados:', activeUsers.length, 'vendedores encontrados');

            // Transformar formato para compatibilidad
            const transformedVendors = activeUsers.map(vendor => ({
              code: vendor.id || vendor.rowid,
              label: `${vendor.firstname || ''} ${vendor.lastname || ''}`.trim() || vendor.login,
              login: vendor.login,
              photo: vendor.photo ? `${variables.SPOS_URL}${vendor.photo}` : `${variables.SPOS_URL}/theme/common/user.png`,
              rawData: vendor
            }));

            console.log('✅ Vendedores transformados:', transformedVendors);
            setVendors(transformedVendors);
            return;
          } else {
            const simpleErrorText = await simpleResponse.text();
            console.error('❌ Error en búsqueda simple para vendedores:', simpleErrorText);
          }
        }

        console.error('❌ No se pudieron cargar vendedores');
        setVendors([]);
        return;
      }

      const usersData = await response.json();
      console.log('📦 Usuarios recibidos directamente para vendedores:', usersData.length);

      // Transformar datos para mantener compatibilidad con el formato original
      const transformedVendors = usersData.map(vendor => ({
        code: vendor.id || vendor.rowid,
        label: `${vendor.firstname || ''} ${vendor.lastname || ''}`.trim() || vendor.login,
        login: vendor.login,
        photo: vendor.photo ? `${variables.SPOS_URL}${vendor.photo}` : `${variables.SPOS_URL}/theme/common/user.png`,
        rawData: vendor
      }));

      console.log('✅ Vendedores transformados:', transformedVendors);
      setVendors(transformedVendors);

    } catch (error) {
      console.error('❌ Error general en fetchVendors:', error);
      console.error('📊 Stack trace:', error.stack);
      setVendors([]);
    }
  };

  // Función auxiliar para obtener usuario por ID - NUEVA FUNCIÓN DOLIBARR
  const getUserById = async (userId) => {
    try {
      if (!API_BASE_URL || !API_KEY) {
        console.error('Configuración de API incompleta para getUserById');
        return null;
      }

      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'GET',
        headers: getHeaders()
      });

      if (response.ok) {
        const user = await response.json();
        
        return {
          id: user.id || user.rowid,
          code: user.id || user.rowid,
          label: `${user.firstname || ''} ${user.lastname || ''}`.trim() || user.login,
          login: user.login,
          firstname: user.firstname || '',
          lastname: user.lastname || '',
          email: user.email || '',
          phone: user.office_phone || user.user_mobile || '',
          photo: user.photo ? `${variables.SPOS_URL}${user.photo}` : `${variables.SPOS_URL}/theme/common/user.png`,
          status: user.statut || user.status || 0,
          rawData: user
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error obteniendo usuario por ID:', error);
      return null;
    }
  };

  // Función auxiliar para obtener información del terminal - NUEVA FUNCIÓN DOLIBARR
  const getTerminalInfo = async (terminalId) => {
    try {
      if (!API_BASE_URL || !API_KEY) {
        console.error('Configuración de API incompleta para getTerminalInfo');
        return null;
      }

      // En Dolibarr, los terminales pueden estar en diferentes módulos
      // Intentar obtener información del terminal desde el punto de venta
      console.log('🏪 Obteniendo información del terminal:', terminalId);

      return {
        id: terminalId,
        name: `Terminal ${terminalId}`,
        status: 1,
        note: 'Terminal migrado a API Dolibarr'
      };
      
    } catch (error) {
      console.error('Error obteniendo información del terminal:', error);
      return null;
    }
  };

  // 🍽️ FUNCIÓN PARA ALTERNAR MODO RESTAURANTE (INFORMATIVA)
  const toggleRestaurantMode = () => {
    const currentMode = variables.SPOS_RESTAURANTE === "1" ? "RESTAURANTE" : "POS";
    console.log(`🍽️ Modo actual: ${currentMode} (Variable BD: ${variables.SPOS_RESTAURANTE})`);
    
    // Esta función es solo informativa ya que la variable viene de BD
    alert(`Modo actual: ${currentMode}\n\nPara cambiar el modo restaurante, debe modificar la variable SPOS_RESTAURANTE en la base de datos (tabla llx_const)\nValor actual en BD: ${variables.SPOS_RESTAURANTE}`);
  };

  // Función de testing manual para debug - NUEVA FUNCIÓN
  const testPosDataApi = async () => {
    console.log('🧪 testPosDataApi iniciado');
    console.log('🔧 Configuración actual:', {
      API_BASE_URL,
      hasApiKey: !!API_KEY,
      tokenPreview: API_KEY ? API_KEY.substring(0, 10) + '...' : 'NO TOKEN',
      terminalFkSoc: terminal?.fk_soc,
      // 🍽️ TESTING DEL MODO RESTAURANTE (DESDE BD - NOMBRE CORRECTO)
      isRestaurantMode: variables.SPOS_RESTAURANTE === "1",
      restaurantVariable: variables.SPOS_RESTAURANTE
    });
    
    try {
      console.log('🧪 Test 1: loadDefaultCustomer');
      await loadDefaultCustomer();
      
      console.log('🧪 Test 2: fetchVendors');
      await fetchVendors();
      
      console.log('🧪 Tests completados');
      return true;
    } catch (error) {
      console.error('🧪 Error en tests:', error);
      return false;
    }
  };

  // Función para validar configuración de API - NUEVA FUNCIÓN
  const validateApiConfig = () => {
    const hasUrl = !!variables.SPOS_URL;
    const hasApiKey = !!API_KEY;
    const isConfigValid = hasUrl && hasApiKey;
    
    if (!isConfigValid) {
      console.warn('Configuración de API de POS incompleta:', {
        hasUrl,
        hasApiKey,
        availableVars: Object.keys(variables)
      });
    }
    
    return isConfigValid;
  };

  // Efectos - ACTUALIZADOS PARA USAR NUEVAS FUNCIONES
  useEffect(() => {
    if (terminal.fk_soc && validateApiConfig()) {
      console.log('🔄 Cargando cliente default por terminal.fk_soc:', terminal.fk_soc);
      loadDefaultCustomer();
    } else {
      console.warn('⚠️ No se puede cargar cliente default:', {
        hasTerminalFkSoc: !!terminal.fk_soc,
        isApiConfigured: validateApiConfig()
      });
    }
  }, [terminal.fk_soc, API_BASE_URL, API_KEY]);

  useEffect(() => {
    if (validateApiConfig()) {
      console.log('🔄 Cargando vendedores...');
      fetchVendors();
    } else {
      console.warn('⚠️ No se pueden cargar vendedores - configuración incompleta');
    }
  }, [API_BASE_URL, API_KEY]);

  useEffect(() => {
    setIsEditable(true);
  }, []);

  // Actualizar reloj cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return {
    // Estados
    isEditable, setIsEditable,
    extraFields, setExtraFields,
    cart, setCart,
    selectedCustomer, setSelectedCustomer,
    selectedCustomerDetails, setSelectedCustomerDetails,
    customerDiscount, setCustomerDiscount,
    generalNotes, setGeneralNotes,
    tipoVenta, setTipoVenta,
    isFel, setIsFel,
    selectedCategory, setSelectedCategory,
    selectedTicket, setSelectedTicket,
    vendors,
    currentTime, setCurrentTime,
    menuOpen, setMenuOpen,
    isLoading, setIsLoading,
    alert, setAlert,
    
    // Modales
    isCustomFieldsModalOpen, setIsCustomFieldsModalOpen,
    isModalOpen, setIsModalOpen,
    isPaymentModalOpen, setIsPaymentModalOpen,
    isSuspendedModalOpen, setIsSuspendedModalOpen,
    isSalesHistoryModalOpen, setIsSalesHistoryModalOpen,
    isCashClosureModalOpen, setIsCashClosureModalOpen,
    
    // Campos de formulario
    nitValue, setNitValue,
    nombreValue, setNombreValue,
    direccionValue, setDireccionValue,
    telefonoValue, setTelefonoValue,
    emailValue, setEmailValue,
    
    // Ticket
    showTicket, setShowTicket,
    ticketData, setTicketData,
    
    // Funciones principales (migradas a Dolibarr)
    calculateSubtotal,
    calculateDiscount,
    calculateTotal,
    loadDefaultCustomer,
    fetchVendors,
    
    // Nuevas funciones de API Dolibarr
    getUserById,
    getTerminalInfo,
    testPosDataApi,
    validateApiConfig,
    
    // 🍽️ FUNCIONES DEL MODO RESTAURANTE
    toggleRestaurantMode,
    
    // Información de estado
    isApiConfigured: validateApiConfig(),
    hasApiKey: !!API_KEY,
    hasUrl: !!API_BASE_URL,
    
    // Contexto (🍽️ USANDO VARIABLES DIRECTAS DE BD)
    user, company, 
    variables, // 👈 VARIABLES DIRECTAS DE BD (incluye RESTAURANTE)
    logout, userId,
    
    // Debug info (🍽️ INCLUYENDO INFO DE RESTAURANTE)
    debug: {
      hasApiBaseUrl: !!API_BASE_URL,
      hasApiKey: !!API_KEY,
      tokenLength: API_KEY?.length || 0,
      url: variables.SPOS_URL,
      pattern: 'Inventario-headers-simples-pos-debug',
      corsFixed: true,
      // 🍽️ DEBUG INFO DEL RESTAURANTE (DESDE BD - NOMBRE CORRECTO)
      isRestaurantMode: variables.SPOS_RESTAURANTE === "1",
      restaurantVariable: variables.SPOS_RESTAURANTE,
      note: 'Versión migrada con soporte para modo restaurante desde BD y logging extensivo para debugging'
    }
  };
};

// ============================================================================
// FUNCIONES UTILITARIAS PARA MIGRACIÓN DE POS DATA
// ============================================================================

// Función para testing específico de POS Data (🍽️ INCLUYENDO TESTING DE RESTAURANTE)
export const testPosDataApiMigration = async (variables, terminal) => {
  const tests = [];
  
  try {
    // 🍽️ USAR VARIABLES DIRECTAS DE BD (YA INCLUYEN RESTAURANTE)
    const API_BASE_URL = variables.SPOS_URL ? `${variables.SPOS_URL}/api/index.php` : null;
    const API_KEY = variables.DOLIBARR_API_KEY || variables.dolibarrToken;
    
    // Test 0: Verificar configuración básica
    tests.push({
      name: "Configuración API POS Data",
      passed: !!(API_BASE_URL && API_KEY),
      message: API_BASE_URL && API_KEY ? 
        `URL: ${variables.SPOS_URL}, Token: ${API_KEY.length} chars` : 
        "Configuración incompleta"
    });
    
    // 🍽️ Test 0.1: Verificar configuración de restaurante (DESDE BD - NOMBRE CORRECTO)
    tests.push({
      name: "Configuración Modo Restaurante",
      passed: true,
      message: `Modo: ${variables.SPOS_RESTAURANTE === "1" ? "RESTAURANTE" : "POS"} (Variable BD: ${variables.SPOS_RESTAURANTE})`
    });
    
    if (!API_KEY || !API_BASE_URL) {
      return {
        allPassed: false,
        tests,
        summary: `${tests.filter(t => t.passed).length}/${tests.length} tests pasaron - CONFIGURACIÓN INCOMPLETA`
      };
    }
    
    const headers = {
      'DOLAPIKEY': API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    // Test 1: Endpoint de terceros para cliente default
    try {
      const response = await fetch(`${API_BASE_URL}/thirdparties?limit=1`, { 
        headers,
        method: 'GET'
      });
      
      tests.push({
        name: "Cliente default (thirdparties)",
        passed: response.ok,
        message: response.ok ? "OK" : `Error ${response.status}: ${response.statusText}`
      });
      
    } catch (error) {
      tests.push({
        name: "Cliente default (thirdparties)",
        passed: false,
        message: error.message
      });
    }
    
    // Test 2: Endpoint de usuarios para vendedores
    try {
      const response = await fetch(`${API_BASE_URL}/users?limit=1`, { 
        headers,
        method: 'GET'
      });
      
      tests.push({
        name: "Vendedores (users)",
        passed: response.ok,
        message: response.ok ? "OK" : `Error ${response.status}: ${response.statusText}`
      });
      
    } catch (error) {
      tests.push({
        name: "Vendedores (users)",
        passed: false,
        message: error.message
      });
    }
    
    // 🍽️ Test 2.1: Endpoint para proposals (mesas) si está en modo restaurante
    if (variables.SPOS_RESTAURANTE === "1") {
      try {
        const response = await fetch(`${API_BASE_URL}/proposals?limit=1`, { 
          headers,
          method: 'GET'
        });
        
        tests.push({
          name: "Mesas del restaurante (proposals)",
          passed: response.ok,
          message: response.ok ? "OK - Endpoint de mesas disponible" : `Error ${response.status}: ${response.statusText}`
        });
        
      } catch (error) {
        tests.push({
          name: "Mesas del restaurante (proposals)",
          passed: false,
          message: error.message
        });
      }
    }
    
    // Test 3: Verificar campo terminal
    tests.push({
      name: "Terminal configuration",
      passed: !!(terminal && terminal.fk_soc),
      message: terminal && terminal.fk_soc ? 
        `Terminal con fk_soc: ${terminal.fk_soc}` : 
        "Terminal sin configuración fk_soc"
    });
    
  } catch (error) {
    tests.push({
      name: "Error general",
      passed: false,
      message: error.message
    });
  }
  
  return {
    allPassed: tests.every(test => test.passed),
    tests,
    summary: `${tests.filter(t => t.passed).length}/${tests.length} tests pasaron`,
    recommendations: [
      ...(!tests.find(t => t.name === "Cliente default (thirdparties)")?.passed ? 
        ["Verificar que el módulo de terceros esté habilitado en Dolibarr"] : []),
      ...(!tests.find(t => t.name === "Vendedores (users)")?.passed ? 
        ["Verificar que el módulo de usuarios esté habilitado en Dolibarr"] : []),
      ...(!tests.find(t => t.name === "Terminal configuration")?.passed ? 
        ["Configurar correctamente el terminal con fk_soc"] : []),
      // 🍽️ RECOMENDACIONES PARA MODO RESTAURANTE
      ...(variables.SPOS_RESTAURANTE === "1" && !tests.find(t => t.name === "Mesas del restaurante (proposals)")?.passed ? 
        ["Verificar que el módulo de propuestas esté habilitado en Dolibarr para el sistema de mesas"] : []),
      // 🍽️ INFORMACIÓN SOBRE LA VARIABLE DE BD
      "La variable SPOS_RESTAURANTE se lee desde la tabla llx_const en la base de datos"
    ]
  };
};