import { useState, useEffect, useRef } from 'react';

// ============================================================================
// HOOK useCustomers MIGRADO A API NATIVA DE DOLIBARR
// ============================================================================
// Versión migrada usando el mismo patrón exitoso del componente Inventario

export const useCustomers = (variables) => {
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isCustomerSearchFocused, setIsCustomerSearchFocused] = useState(false);
  const searchTimeoutRef = useRef(null);

  // URLs y headers de API - MISMO PATRÓN QUE INVENTARIO
  const API_BASE_URL = variables.SPOS_URL ? `${variables.SPOS_URL}/api/index.php` : null;
  const API_KEY = variables.DOLIBARR_API_KEY || variables.dolibarrToken;

  // Headers simples que funcionan (EXACTAMENTE igual que Inventario)
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

  // DEBUG: Verificar configuración inicial
  useEffect(() => {
    console.log('🔍 useCustomers - Configuración inicial:', {
      hasApiBaseUrl: !!API_BASE_URL,
      hasApiKey: !!API_KEY,
      SPOS_URL: variables.SPOS_URL,
      tokenLength: API_KEY?.length || 0
    });
  }, [variables]);

  // Buscar clientes - VERSIÓN SIMPLIFICADA CON MEJOR DEBUG
  const fetchCustomers = async (searchTerm) => {
    console.log('🔍 fetchCustomers iniciado con término:', searchTerm);
    
    try {
      // Verificaciones iniciales con logging detallado
      if (!API_BASE_URL) {
        console.error('❌ API_BASE_URL no está configurada:', API_BASE_URL);
        setCustomers([]);
        setShowSuggestions(false);
        return [];
      }

      if (!API_KEY) {
        console.error('❌ API_KEY no está configurada:', API_KEY);
        setCustomers([]);
        setShowSuggestions(false);
        return [];
      }

      console.log('✅ Configuración válida - procediendo con búsqueda');
      console.log('🔍 Buscando clientes con término:', searchTerm);
      console.log('🔑 Token disponible:', API_KEY.substring(0, 10) + '...');
      console.log('🌐 URL base:', API_BASE_URL);

      // Construir filtro SQL para buscar por nombre o NIT
      const searchFilter = `(t.nom LIKE '%${searchTerm}%' OR t.prenom LIKE '%${searchTerm}%' OR t.name LIKE '%${searchTerm}%' OR t.idprof1 LIKE '%${searchTerm}%')`;
      const encodedFilter = encodeURIComponent(searchFilter);
      
      let customersUrl = `${API_BASE_URL}/thirdparties?sqlfilters=${encodedFilter}&limit=20&sortfield=t.nom&sortorder=ASC`;

      console.log('📤 URL de búsqueda:', customersUrl);
      console.log('🎯 Filtro aplicado:', searchFilter);

      // USAR EXACTAMENTE LOS MISMOS HEADERS QUE EL INVENTARIO
      let headers;
      try {
        headers = getHeaders();
        console.log('📤 Headers obtenidos correctamente:', headers);
      } catch (headerError) {
        console.error('❌ Error obteniendo headers:', headerError);
        setCustomers([]);
        setShowSuggestions(false);
        return [];
      }

      console.log('🌐 Realizando fetch a:', customersUrl);
      
      const response = await fetch(customersUrl, {
        method: 'GET',
        headers: headers
      });

      console.log('📡 Respuesta del servidor:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error del servidor:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText.substring(0, 200)
        });

        // Si hay problemas con filtros SQL, intentar sin filtros y filtrar en cliente
        if (response.status === 400 || response.status === 503) {
          console.warn('⚠️ Problemas con filtros, intentando búsqueda simple...');
          
          const simpleUrl = `${API_BASE_URL}/thirdparties?limit=50&sortfield=t.nom&sortorder=ASC`;
          console.log('🔄 Intentando URL simple:', simpleUrl);
          
          const simpleResponse = await fetch(simpleUrl, {
            method: 'GET',
            headers: headers
          });

          console.log('📡 Respuesta simple:', {
            status: simpleResponse.status,
            statusText: simpleResponse.statusText,
            ok: simpleResponse.ok
          });

          if (simpleResponse.ok) {
            console.log('✅ Búsqueda simple funciona, filtrando en cliente');
            const allCustomers = await simpleResponse.json();
            console.log('📦 Total clientes recibidos para filtrar:', allCustomers.length);
            
            // Filtrar en el cliente
            const filteredCustomers = allCustomers.filter(customer => {
              const matchesNom = customer.nom?.toLowerCase().includes(searchTerm.toLowerCase());
              const matchesPrenom = customer.prenom?.toLowerCase().includes(searchTerm.toLowerCase());
              const matchesName = customer.name?.toLowerCase().includes(searchTerm.toLowerCase());
              const matchesNit = customer.idprof1?.toLowerCase().includes(searchTerm.toLowerCase());
              
              return matchesNom || matchesPrenom || matchesName || matchesNit;
            });

            console.log('🔍 Filtrado en cliente:', filteredCustomers.length, 'clientes encontrados');

            // Transformar formato para compatibilidad - CORREGIDO
            const transformedCustomers = filteredCustomers.map(customer => ({
              id: customer.id,
              name: customer.name || `${customer.nom || ''} ${customer.prenom || ''}`.trim(),
              nom: customer.nom || customer.name || '', // <- CORREGIDO: asegurar que nom tenga valor
              prenom: customer.prenom || '',
              nit: customer.idprof1 || '',
              idprof1: customer.idprof1 || '', // <- AÑADIDO: para compatibilidad total
              address: customer.address || '',
              town: customer.town || '',
              zip: customer.zip || '',
              phone: customer.phone || '',
              email: customer.email || '',
              // Campos adicionales de Dolibarr
              client: customer.client || 0,
              status: customer.status || 1,
              rawData: customer
            }));

            console.log('✅ Clientes transformados:', transformedCustomers);
            setCustomers(transformedCustomers);
            setShowSuggestions(true);
            return transformedCustomers;
          } else {
            const simpleErrorText = await simpleResponse.text();
            console.error('❌ Error en búsqueda simple:', simpleErrorText);
          }
        }

        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const customersData = await response.json();
      console.log('📦 Clientes recibidos directamente:', customersData.length);

      // Transformar datos para mantener compatibilidad con el formato original - CORREGIDO
      const transformedCustomers = customersData.map(customer => ({
        id: customer.id,
        name: customer.name || `${customer.nom || ''} ${customer.prenom || ''}`.trim(),
        nom: customer.nom || customer.name || '', // <- CORREGIDO: asegurar que nom tenga valor
        prenom: customer.prenom || '',
        nit: customer.idprof1 || '',
        idprof1: customer.idprof1 || '', // <- AÑADIDO: para compatibilidad total
        address: customer.address || '',
        town: customer.town || '',
        zip: customer.zip || '',
        phone: customer.phone || '',
        email: customer.email || '',
        // Campos adicionales de Dolibarr
        client: customer.client || 0,
        status: customer.status || 1,
        rawData: customer
      }));

      console.log('✅ Clientes transformados:', transformedCustomers);
      setCustomers(transformedCustomers);
      setShowSuggestions(true);
      return transformedCustomers;

    } catch (error) {
      console.error('❌ Error general en fetchCustomers:', error);
      console.error('📊 Stack trace:', error.stack);
      setCustomers([]);
      setShowSuggestions(false);
      return [];
    }
  };

  // Crear nuevo cliente - VERSIÓN SIMPLIFICADA CON HEADERS SIMPLES
  const createCustomer = async (customerData, userId) => {
    try {
      if (!API_BASE_URL || !API_KEY) {
        throw new Error('Configuración de API incompleta');
      }

      console.log('🆕 Creando nuevo cliente:', customerData);
      console.log('🔑 Token disponible:', API_KEY.substring(0, 10) + '...');

      // Verificar si el cliente ya existe por NIT
      if (customerData.nit) {
        const existingCustomers = await fetchCustomers(customerData.nit);
        const existingByNit = existingCustomers.find(c => c.nit === customerData.nit);
        
        if (existingByNit) {
          throw new Error('El cliente ya existe en la base de datos.');
        }
      }

      // Dividir el nombre completo si viene junto
      let nom = '';
      let prenom = '';
      
      if (customerData.nombre) {
        const nameParts = customerData.nombre.trim().split(' ');
        nom = nameParts[0] || '';
        prenom = nameParts.slice(1).join(' ') || '';
      }

      // Preparar datos para Dolibarr API
      const dolibarrCustomerData = {
        name: customerData.nombre || `${nom} ${prenom}`.trim(),
        nom: nom,
        prenom: prenom,
        client: 1, // Marcar como cliente
        status: 1, // Activo
        // NIT/CIF en idprof1
        idprof1: customerData.nit || '',
        // Dirección
        address: customerData.direccion || '',
        town: customerData.ciudad || '',
        zip: customerData.codigoPostal || '',
        // Contacto
        phone: customerData.telefono || '',
        email: customerData.email || '',
        // Usuario que crea (como nota)
        note_private: `Creado por usuario ID: ${userId} desde POS`,
        // Campos adicionales opcionales
        country_id: 76, // Guatemala (ajustar según tu configuración)
        // Tipo de cliente
        typent_id: 8 // Particular (ajustar según tu configuración)
      };

      console.log('📤 Datos a enviar a Dolibarr:', dolibarrCustomerData);

      // USAR EXACTAMENTE LOS MISMOS HEADERS QUE EL INVENTARIO
      const headers = getHeaders();
      console.log('📤 Headers para creación (patrón Inventario):', headers);

      const response = await fetch(`${API_BASE_URL}/thirdparties`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(dolibarrCustomerData)
      });

      console.log('📡 Respuesta de creación:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Error en creación:', errorData);
        
        let errorMessage = `Error ${response.status}: ${response.statusText}`;
        
        try {
          const errorJson = JSON.parse(errorData);
          if (errorJson.error && errorJson.error.message) {
            errorMessage = errorJson.error.message;
          }
        } catch (e) {
          // Si no es JSON, usar el texto tal como está
          if (errorData.includes('already exists')) {
            errorMessage = 'El cliente ya existe en la base de datos.';
          }
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Cliente creado exitosamente:', result);

      return { 
        success: true, 
        customer: customerData.nombre || `${nom} ${prenom}`.trim(),
        customerId: result
      };

    } catch (error) {
      console.error('❌ Error al crear cliente:', error);
      throw error;
    }
  };

  // Validar NIT - MANTENER COMO ESTÁ (NO MIGRAR)
  const validateNit = async (nit) => {
    try {
      const response = await fetch(`${variables.SPOS_SERVICIOS_URL}/desarrollo/validanitjson.php?&nit=${nit}&enti=1`);
      const data = await response.json();
      
      if (!data.nombre || !data.dir || !data.nit) {
        throw new Error('NIT no encontrado. Por favor verifique.');
      }
      
      return {
        nombre: data.nombre,
        direccion: data.dir
      };
    } catch (error) {
      throw new Error('Error al buscar NIT.');
    }
  };

  // Función auxiliar para obtener cliente por ID - HEADERS SIMPLES
  const getCustomerById = async (customerId) => {
    try {
      if (!API_BASE_URL || !API_KEY) {
        console.error('Configuración de API incompleta');
        return null;
      }

      const response = await fetch(`${API_BASE_URL}/thirdparties/${customerId}`, {
        method: 'GET',
        headers: getHeaders()
      });

      if (response.ok) {
        const customer = await response.json();
        
        return {
          id: customer.id,
          name: customer.name || `${customer.nom || ''} ${customer.prenom || ''}`.trim(),
          nom: customer.nom || customer.name || '', // <- CORREGIDO
          prenom: customer.prenom || '',
          nit: customer.idprof1 || '',
          idprof1: customer.idprof1 || '', // <- AÑADIDO
          address: customer.address || '',
          town: customer.town || '',
          zip: customer.zip || '',
          phone: customer.phone || '',
          email: customer.email || '',
          client: customer.client || 0,
          status: customer.status || 1,
          rawData: customer
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error obteniendo cliente por ID:', error);
      return null;
    }
  };

  // Función auxiliar para actualizar cliente - HEADERS SIMPLES
  const updateCustomer = async (customerId, customerData) => {
    try {
      if (!API_BASE_URL || !API_KEY) {
        throw new Error('Configuración de API incompleta');
      }

      console.log('📝 Actualizando cliente:', customerId, customerData);

      // Preparar datos para actualización
      const updateData = {
        name: customerData.nombre || customerData.name,
        nom: customerData.nom,
        prenom: customerData.prenom,
        idprof1: customerData.nit,
        address: customerData.direccion || customerData.address,
        town: customerData.ciudad || customerData.town,
        zip: customerData.codigoPostal || customerData.zip,
        phone: customerData.telefono || customerData.phone,
        email: customerData.email
      };

      const response = await fetch(`${API_BASE_URL}/thirdparties/${customerId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error en actualización:', errorData);
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Cliente actualizado:', result);

      return { success: true, result };

    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      throw error;
    }
  };

  // Función auxiliar para buscar cliente por NIT específicamente - HEADERS SIMPLES
  const findCustomerByNit = async (nit) => {
    try {
      if (!nit || !API_BASE_URL || !API_KEY) {
        return null;
      }

      // Buscar específicamente por NIT (idprof1)
      const searchFilter = `t.idprof1='${nit}'`;
      const encodedFilter = encodeURIComponent(searchFilter);
      
      const response = await fetch(`${API_BASE_URL}/thirdparties?sqlfilters=${encodedFilter}&limit=1`, {
        method: 'GET',
        headers: getHeaders()
      });

      if (response.ok) {
        const customers = await response.json();
        
        if (customers.length > 0) {
          const customer = customers[0];
          return {
            id: customer.id,
            name: customer.name || `${customer.nom || ''} ${customer.prenom || ''}`.trim(),
            nom: customer.nom || customer.name || '', // <- CORREGIDO
            prenom: customer.prenom || '',
            nit: customer.idprof1 || '',
            idprof1: customer.idprof1 || '', // <- AÑADIDO
            address: customer.address || '',
            town: customer.town || '',
            zip: customer.zip || '',
            phone: customer.phone || '',
            email: customer.email || '',
            client: customer.client || 0,
            status: customer.status || 1,
            rawData: customer
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error buscando cliente por NIT:', error);
      return null;
    }
  };

  // Función auxiliar para limpiar búsqueda
  const clearSearch = () => {
    console.log('🧹 clearSearch llamado');
    setCustomerSearch('');
    setCustomers([]);
    setShowSuggestions(false);
  };

  // Función de testing manual para debug
  const testFetchCustomers = async (testTerm = 'test') => {
    console.log('🧪 testFetchCustomers iniciado con término:', testTerm);
    console.log('🔧 Configuración actual:', {
      API_BASE_URL,
      hasApiKey: !!API_KEY,
      tokenPreview: API_KEY ? API_KEY.substring(0, 10) + '...' : 'NO TOKEN'
    });
    
    try {
      const result = await fetchCustomers(testTerm);
      console.log('🧪 Resultado del test:', result);
      return result;
    } catch (error) {
      console.error('🧪 Error en test:', error);
      return null;
    }
  };

  // Effect para búsqueda con debounce - MEJORADO CON DEBUG
  useEffect(() => {
    console.log('🔄 useCustomers useEffect ejecutado:', {
      customerSearch: customerSearch,
      customerSearchLength: customerSearch.length,
      customerSearchTrimmed: customerSearch.trim(),
      hasApiBaseUrl: !!API_BASE_URL,
      hasApiKey: !!API_KEY
    });

    // Si no hay término de búsqueda, limpiar resultados
    if (customerSearch.trim() === '') {
      console.log('🧹 Limpiando resultados - término de búsqueda vacío');
      setCustomers([]);
      setShowSuggestions(false);
      return;
    }

    // Verificar configuración antes de hacer búsqueda
    if (!API_BASE_URL || !API_KEY) {
      console.warn('⚠️ No se puede hacer búsqueda - configuración incompleta:', {
        hasApiBaseUrl: !!API_BASE_URL,
        hasApiKey: !!API_KEY
      });
      return;
    }

    console.log('⏰ Configurando timeout para búsqueda de clientes...');

    // Limpiar timeout anterior
    if (searchTimeoutRef.current) {
      console.log('🧹 Limpiando timeout anterior');
      clearTimeout(searchTimeoutRef.current);
    }

    // Crear nuevo timeout para debounce
    searchTimeoutRef.current = setTimeout(() => {
      console.log('🚀 Ejecutando búsqueda de clientes después del debounce');
      
      // Llamar a fetchCustomers con manejo de errores
      fetchCustomers(customerSearch).catch(error => {
        console.error('💥 Error en búsqueda automática:', error);
      });
    }, 300);

    // Cleanup function
    return () => {
      if (searchTimeoutRef.current) {
        console.log('🧹 Cleanup: limpiando timeout en useEffect');
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [customerSearch, API_BASE_URL, API_KEY]); // Dependencias explícitas

  // Cleanup
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Función para validar configuración de API
  const validateApiConfig = () => {
    const hasUrl = !!variables.SPOS_URL;
    const hasApiKey = !!API_KEY;
    const isConfigValid = hasUrl && hasApiKey;
    
    if (!isConfigValid) {
      console.warn('Configuración de API de clientes incompleta:', {
        hasUrl,
        hasApiKey,
        availableVars: Object.keys(variables)
      });
    }
    
    return isConfigValid;
  };

  return {
    // Estados básicos (mantener compatibilidad)
    customerSearch,
    setCustomerSearch,
    customers,
    showSuggestions,
    setShowSuggestions,
    isCustomerSearchFocused,
    setIsCustomerSearchFocused,
    
    // Funciones principales (migradas a Dolibarr)
    fetchCustomers,
    createCustomer,
    
    // Función que NO se migra (mantener como está)
    validateNit,
    
    // Funciones auxiliares nuevas
    getCustomerById,
    updateCustomer,
    findCustomerByNit,
    clearSearch,
    validateApiConfig,
    testFetchCustomers, // Nueva función de testing
    
    // Información de estado
    isApiConfigured: validateApiConfig(),
    hasApiKey: !!API_KEY,
    hasUrl: !!API_BASE_URL,
    
    // Debug info
    debug: {
      hasApiBaseUrl: !!API_BASE_URL,
      hasApiKey: !!API_KEY,
      tokenLength: API_KEY?.length || 0,
      url: variables.SPOS_URL,
      pattern: 'Inventario-headers-simples-customers-debug',
      corsFixed: true,
      note: 'Versión con logging extensivo para debugging - CORREGIDO CAMPOS NOM/IDPROF1'
    }
  };
};

// ============================================================================
// FUNCIONES UTILITARIAS PARA MIGRACIÓN DE CLIENTES
// ============================================================================

// Función para convertir formato de cliente del endpoint antiguo al nuevo - CORREGIDA
export const convertLegacyCustomerFormat = (legacyCustomer) => {
  return {
    id: legacyCustomer.rowid || legacyCustomer.id,
    name: legacyCustomer.name || `${legacyCustomer.nom || ''} ${legacyCustomer.prenom || ''}`.trim(),
    nom: legacyCustomer.nom || legacyCustomer.name || '', // <- CORREGIDO
    prenom: legacyCustomer.prenom || '',
    nit: legacyCustomer.idprof1 || legacyCustomer.nit || '',
    idprof1: legacyCustomer.idprof1 || legacyCustomer.nit || '', // <- AÑADIDO
    address: legacyCustomer.address || legacyCustomer.direccion || '',
    town: legacyCustomer.town || legacyCustomer.ciudad || '',
    zip: legacyCustomer.zip || legacyCustomer.codigoPostal || '',
    phone: legacyCustomer.phone || legacyCustomer.telefono || '',
    email: legacyCustomer.email || '',
    client: legacyCustomer.client || 1,
    status: legacyCustomer.status || 1,
    rawData: legacyCustomer
  };
};

// Función para testing específico de clientes
export const testCustomersApiMigration = async (variables) => {
  const tests = [];
  
  try {
    const API_BASE_URL = variables.SPOS_URL ? `${variables.SPOS_URL}/api/index.php` : null;
    const API_KEY = variables.DOLIBARR_API_KEY || variables.dolibarrToken;
    
    // Test 0: Verificar configuración básica
    tests.push({
      name: "Configuración API Clientes",
      passed: !!(API_BASE_URL && API_KEY),
      message: API_BASE_URL && API_KEY ? 
        `URL: ${variables.SPOS_URL}, Token: ${API_KEY.length} chars` : 
        "Configuración incompleta"
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
    
    // Test 1: Endpoint de terceros básico
    try {
      const response = await fetch(`${API_BASE_URL}/thirdparties?limit=1`, { 
        headers,
        method: 'GET'
      });
      
      tests.push({
        name: "Endpoint thirdparties",
        passed: response.ok,
        message: response.ok ? "OK" : `Error ${response.status}: ${response.statusText}`
      });
      
    } catch (error) {
      tests.push({
        name: "Endpoint thirdparties",
        passed: false,
        message: error.message
      });
    }
    
    // Test 2: Búsqueda con filtros
    try {
      const searchFilter = encodeURIComponent("t.nom LIKE '%test%'");
      const response = await fetch(`${API_BASE_URL}/thirdparties?sqlfilters=${searchFilter}&limit=1`, { 
        headers,
        method: 'GET'
      });
      
      tests.push({
        name: "Búsqueda con filtros",
        passed: response.ok,
        message: response.ok ? "OK" : `Error ${response.status}: Filtros no soportados`
      });
      
    } catch (error) {
      tests.push({
        name: "Búsqueda con filtros",
        passed: false,
        message: error.message
      });
    }
    
    // Test 3: Verificar campos de cliente
    try {
      const response = await fetch(`${API_BASE_URL}/thirdparties?limit=1`, { 
        headers,
        method: 'GET'
      });
      
      if (response.ok) {
        const customers = await response.json();
        if (customers.length > 0) {
          const customer = customers[0];
          const hasRequiredFields = customer.hasOwnProperty('nom') && 
                                  customer.hasOwnProperty('idprof1') && 
                                  customer.hasOwnProperty('address');
          
          tests.push({
            name: "Campos requeridos",
            passed: hasRequiredFields,
            message: hasRequiredFields ? 
              "Campos nom, idprof1, address disponibles" : 
              "Faltan campos requeridos"
          });
        } else {
          tests.push({
            name: "Campos requeridos",
            passed: true,
            message: "No hay clientes para verificar campos"
          });
        }
      } else {
        tests.push({
          name: "Campos requeridos",
          passed: false,
          message: "No se pudo verificar estructura"
        });
      }
      
    } catch (error) {
      tests.push({
        name: "Campos requeridos",
        passed: false,
        message: error.message
      });
    }
    
    // Test 4: Verificar endpoint de validación NIT (NO migrado)
    try {
      if (variables.SPOS_SERVICIOS_URL) {
        tests.push({
          name: "Endpoint validateNit (original)",
          passed: true,
          message: `Mantiene endpoint: ${variables.SPOS_SERVICIOS_URL}/desarrollo/validanitjson.php`
        });
      } else {
        tests.push({
          name: "Endpoint validateNit (original)",
          passed: false,
          message: "SPOS_SERVICIOS_URL no configurada"
        });
      }
      
    } catch (error) {
      tests.push({
        name: "Endpoint validateNit (original)",
        passed: false,
        message: error.message
      });
    }
    
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
      ...(!tests.find(t => t.name === "Endpoint thirdparties")?.passed ? 
        ["Verificar que el módulo de terceros esté habilitado en Dolibarr"] : []),
      ...(!tests.find(t => t.name === "Búsqueda con filtros")?.passed ? 
        ["La búsqueda usará filtrado en el cliente como fallback"] : []),
      ...(!tests.find(t => t.name === "Endpoint validateNit (original)")?.passed ? 
        ["Configurar SPOS_SERVICIOS_URL para validación de NIT"] : [])
    ]
  };
};