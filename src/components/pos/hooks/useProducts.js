import { useState, useEffect, useRef } from 'react';

// ============================================================================
// HOOK useProducts CORREGIDO SIGUIENDO EL PATRÓN DEL COMPONENTE INVENTARIO
// ============================================================================

export const useProducts = (variables, terminal, selectedCustomerDetails, tipoVenta) => {
  const [productSearch, setProductSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const searchTimeoutRef = useRef(null);

  // URLs y headers de API - EXACTAMENTE IGUAL QUE INVENTARIO
  const API_BASE_URL = variables.SPOS_URL ? `${variables.SPOS_URL}/api/index.php` : null;
  const API_KEY = variables.DOLIBARR_API_KEY || variables.dolibarrToken;

  const getHeaders = () => ({
    'DOLAPIKEY': API_KEY,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  });

  // DEBUG: Verificar el estado inicial - IGUAL QUE INVENTARIO
  useEffect(() => {
    console.log('🔍 useProducts - Verificando condiciones:', {
      hasApiBaseUrl: !!API_BASE_URL,
      hasApiKey: !!API_KEY,
      hasWarehouse: !!terminal?.fk_warehouse,
      warehouseId: terminal?.fk_warehouse,
      terminalName: terminal?.name,
      variables,
      terminal
    });
  }, [variables, terminal]);

  // Función auxiliar para obtener stock en almacén específico - USANDO ENDPOINT CORRECTO
  const getProductStockInWarehouse = async (productId, warehouseId) => {
    try {
      if (!API_BASE_URL || !API_KEY) {
        console.error("Configuración API incompleta");
        return 0;
      }
      
      // USAR EL ENDPOINT CORRECTO: /products/{id}/stock?selected_warehouse_id={warehouse_id}
      const stockUrl = `${API_BASE_URL}/products/${productId}/stock?selected_warehouse_id=${warehouseId}`;
      
      console.log('🏪 Consultando stock de almacén con endpoint correcto:', {
        productId,
        warehouseId,
        url: stockUrl
      });
      
      const response = await fetch(stockUrl, { 
        headers: getHeaders() 
      });
      
      if (response.ok) {
        const stockData = await response.json();
        console.log('📦 Respuesta de stock:', stockData);
        
        // Extraer stock real del warehouse específico
        const warehouseStock = stockData.stock_warehouses?.[warehouseId]?.real;
        
        if (warehouseStock !== undefined) {
          const stock = parseFloat(warehouseStock);
          console.log('📦 Stock para warehouse', warehouseId, ':', stock);
          return stock;
        } else {
          console.warn('⚠️ No se encontró stock para warehouse', warehouseId);
          return 0;
        }
      } else {
        const errorText = await response.text();
        console.warn('⚠️ Error obteniendo stock de almacén:', response.status, errorText);
        return 0;
      }
      
    } catch (error) {
      console.error("❌ Error obteniendo stock de almacén:", error);
      return 0;
    }
  };

  // Verificar stock de un producto - USANDO ENDPOINT CORRECTO
  const checkProductStock = async (productId, quantity) => {
    try {
      if (!API_BASE_URL || !API_KEY) {
        console.error("Configuración API incompleta");
        return false;
      }
      
      console.log('Verificando stock para producto:', productId, 'cantidad:', quantity);
      console.log('Warehouse de terminal:', terminal?.fk_warehouse);
      
      // Si hay almacén específico configurado en la terminal, usar endpoint de stock
      if (terminal?.fk_warehouse) {
        console.log('🏪 Verificando stock en almacén específico:', terminal.fk_warehouse);
        const warehouseStock = await getProductStockInWarehouse(productId, terminal.fk_warehouse);
        console.log('📦 Stock en almacén:', warehouseStock, 'requerido:', quantity);
        return warehouseStock >= quantity;
      }
      
      // Si no hay almacén específico, obtener producto completo para stock global
      const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
        headers: getHeaders()
      });
      
      if (!response.ok) {
        console.error(`Error al obtener producto ${productId}:`, response.status);
        return false;
      }
      
      const productData = await response.json();
      const globalStock = parseFloat(productData.stock_reel || 0);
      console.log('📦 Usando stock global:', globalStock, 'requerido:', quantity);
      return globalStock >= quantity;
      
    } catch (error) {
      console.error("Error al verificar stock:", error);
      return false;
    }
  };

  // Buscar productos - VERSIÓN CORREGIDA SIGUIENDO PATRÓN INVENTARIO
  const fetchProducts = async (searchTerm) => {
    try {
      if (!API_BASE_URL || !API_KEY) {
        console.error("❌ Configuración API incompleta");
        setProducts([]);
        setShowProductSuggestions(false);
        return null;
      }
      
      console.log('🔍 Buscando productos con término:', searchTerm);
      console.log('🏪 Warehouse activo:', terminal?.fk_warehouse);
      console.log('🔑 Token disponible:', API_KEY.substring(0, 10) + '...');
      
      // CORREGIDA: Sintaxis de filtros SQL para Dolibarr - IGUAL QUE INVENTARIO
      const searchFilter = `(t.ref LIKE '%${searchTerm}%' OR t.label LIKE '%${searchTerm}%')`;
      const encodedFilter = encodeURIComponent(searchFilter);
      let fullUrl = `${API_BASE_URL}/products?sqlfilters=${encodedFilter}&limit=50&sortfield=t.ref&sortorder=ASC`;
      
      // IGUAL QUE INVENTARIO: Si tenemos warehouse específico, incluirlo
      if (terminal?.fk_warehouse) {
        fullUrl += `&warehouse=${terminal.fk_warehouse}`;
        console.log('🏪 Añadiendo filtro de warehouse:', terminal.fk_warehouse);
      }
      
      console.log('📤 URL completa:', fullUrl);
      console.log('🎯 Filtro aplicado:', searchFilter);
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: getHeaders()
      });
      
      console.log('📡 Respuesta del servidor:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error del servidor:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText.substring(0, 200)
        });
        
        // IGUAL QUE INVENTARIO: Si hay problemas con filtros, intentar sin filtros
        if (response.status === 503 || response.status === 400) {
          console.warn('⚠️ Problemas con filtros, intentando sin filtros...');
          
          let simpleUrl = `${API_BASE_URL}/products?limit=50&sortfield=t.ref&sortorder=ASC`;
          if (terminal?.fk_warehouse) {
            simpleUrl += `&warehouse=${terminal.fk_warehouse}`;
          }
          
          const simpleResponse = await fetch(simpleUrl, {
            method: 'GET',
            headers: getHeaders()
          });
          
          if (simpleResponse.ok) {
            console.log('✅ Conexión básica funciona, filtrando en cliente');
            const allProducts = await simpleResponse.json();
            
            // Filtrar en el cliente
            const filteredProducts = allProducts.filter(product => 
              product.ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              product.label?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            
            console.log('🔍 Filtrado en cliente:', filteredProducts.length, 'productos encontrados');
            
            // Procesar productos filtrados
            const enrichedProducts = await enrichProductsWithWarehouseStock(filteredProducts);
            
            setProducts(enrichedProducts);
            setShowProductSuggestions(true);
            
            if (enrichedProducts.length === 1) {
              return enrichedProducts[0];
            }
            return null;
          }
        }
        
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const productsData = await response.json();
      console.log('📦 Productos recibidos:', productsData.length);
      
      // Enriquecer productos con información de stock del warehouse
      const enrichedProducts = await enrichProductsWithWarehouseStock(productsData);
      
      setProducts(enrichedProducts);
      setShowProductSuggestions(true);

      if (enrichedProducts.length === 1) {
        return enrichedProducts[0];
      }
      return null;
      
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      setProducts([]);
      setShowProductSuggestions(false);
      return null;
    }
  };

  // Función auxiliar para enriquecer productos con stock de warehouse - NUEVA
  const enrichProductsWithWarehouseStock = async (productsData) => {
    return await Promise.all(productsData.map(async (product) => {
      let customerPrice = parseFloat(product.price_ttc || 0);
      let minPrice = parseFloat(product.price_ttc_min || product.price_ttc || 0);
      
      // Si hay cliente específico, intentar obtener precios personalizados
      const customerId = selectedCustomerDetails?.id || '1';
      if (customerId && customerId !== '1') {
        try {
          const customerResponse = await fetch(
            `${API_BASE_URL}/thirdparties/${customerId}`,
            {
              method: 'GET',
              headers: getHeaders()
            }
          );
          
          if (customerResponse.ok) {
            const customerData = await customerResponse.json();
            const priceLevel = customerData.price_level || 1;
            
            // Usar precio según nivel del cliente si existe
            const multiPriceField = `multiprices_ttc_${priceLevel}`;
            if (product[multiPriceField]) {
              customerPrice = parseFloat(product[multiPriceField]);
            }
            
            const multiMinPriceField = `multiprices_min_ttc_${priceLevel}`;
            if (product[multiMinPriceField]) {
              minPrice = parseFloat(product[multiMinPriceField]);
            }
          }
        } catch (priceError) {
          console.warn("Error obteniendo precios del cliente:", priceError);
        }
      }
      
      // CRÍTICO: Obtener stock específico del almacén IGUAL QUE INVENTARIO
      let warehouseStock = parseFloat(product.stock_reel || 0);
      if (terminal?.fk_warehouse) {
        console.log(`🏪 Obteniendo stock de warehouse ${terminal.fk_warehouse} para producto ${product.id}`);
        warehouseStock = await getProductStockInWarehouse(product.id, terminal.fk_warehouse);
        console.log(`📦 Stock warehouse para ${product.ref}: ${warehouseStock}`);
      } else {
        console.log(`📦 Stock global para ${product.ref}: ${warehouseStock}`);
      }
      
      return {
        id: product.id,
        ref: product.ref,
        label: product.label,
        price_ttc: customerPrice,
        price_ttc_min: minPrice,
        stock: warehouseStock, // <- AQUÍ ESTÁ EL STOCK CORRECTO DEL WAREHOUSE
        tva_tx: parseFloat(product.tva_tx || 0),
        type: parseInt(product.type || 0),
        unity: product.unity || '',
        description: product.description || '',
        name: product.label,
        price: customerPrice,
        warehouseId: terminal?.fk_warehouse || null, // <- AÑADIR PARA DEBUG
        rawData: product
      };
    }));
  };

  // Test de conectividad de la API - SIMPLIFICADO IGUAL QUE INVENTARIO
  const testApiConnection = async () => {
    try {
      if (!API_BASE_URL) {
        console.error("❌ SPOS_URL no configurada");
        return false;
      }

      if (!API_KEY) {
        console.error("❌ Token no disponible");
        return false;
      }

      console.log('🧪 Probando conexión API...');
      console.log('🏪 Warehouse configurado:', terminal?.fk_warehouse);
      
      // Probar endpoint de productos básico - IGUAL QUE INVENTARIO
      let testUrl = `${API_BASE_URL}/products?limit=1`;
      if (terminal?.fk_warehouse) {
        testUrl += `&warehouse=${terminal.fk_warehouse}`;
      }
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: getHeaders()
      });
      
      console.log('📡 Test products:', response.status, response.statusText);

      if (response.ok) {
        console.log('✅ API respondiendo correctamente');
        return true;
      } else {
        const errorText = await response.text();
        console.error('❌ API no responde:', response.status, errorText);
        return false;
      }
      
    } catch (error) {
      console.error('❌ Error de conexión API:', error);
      return false;
    }
  };

  // Función auxiliar para limpiar búsqueda
  const clearSearch = () => {
    setProductSearch('');
    setProducts([]);
    setShowProductSuggestions(false);
  };

  // Función auxiliar para seleccionar un producto de las sugerencias
  const selectProduct = (product) => {
    setShowProductSuggestions(false);
    setProductSearch('');
    setProducts([]);
    return product;
  };

  // Effect para búsqueda con debounce - AÑADIR VERIFICACIÓN DE WAREHOUSE
  useEffect(() => {
    console.log('🔄 useProducts useEffect ejecutado:', {
      productSearch: productSearch,
      productSearchLength: productSearch.length,
      hasApiBaseUrl: !!API_BASE_URL,
      hasApiKey: !!API_KEY,
      hasWarehouse: !!terminal?.fk_warehouse,
      warehouseId: terminal?.fk_warehouse
    });

    if (productSearch.trim() === '') {
      setShowProductSuggestions(false);
      setProducts([]);
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

    // NOTA: No requiere warehouse para funcionar (puede usar stock global)
    if (!terminal?.fk_warehouse) {
      console.warn('⚠️ No hay warehouse configurado, se usará stock global');
    }

    // Limpiar timeout anterior
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Crear nuevo timeout para debounce
    searchTimeoutRef.current = setTimeout(() => {
      console.log('🚀 Ejecutando búsqueda de productos después del debounce');
      fetchProducts(productSearch).catch(error => {
        console.error('💥 Error en búsqueda automática:', error);
      });
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [productSearch, selectedCustomerDetails, tipoVenta, terminal?.fk_warehouse, variables]);

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
    const hasApiKey = !!(variables.DOLIBARR_API_KEY || variables.dolibarrToken);
    const isConfigValid = hasUrl && hasApiKey;
    
    if (!isConfigValid) {
      console.warn("Configuración de API incompleta:", {
        hasUrl,
        hasApiKey,
        availableVars: Object.keys(variables)
      });
    }
    
    return isConfigValid;
  };

  // Función para obtener información de producto por ID - USANDO ENDPOINT CORRECTO
  const getProductById = async (productId) => {
    try {
      if (!API_BASE_URL || !API_KEY) {
        console.error("Configuración API incompleta");
        return null;
      }
      
      const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
        headers: getHeaders()
      });
      
      if (response.ok) {
        const product = await response.json();
        
        // CRÍTICO: Obtener stock correcto usando endpoint específico
        let warehouseStock = parseFloat(product.stock_reel || 0);
        if (terminal?.fk_warehouse) {
          console.log('🏪 Obteniendo stock específico para producto:', productId, 'warehouse:', terminal.fk_warehouse);
          warehouseStock = await getProductStockInWarehouse(productId, terminal.fk_warehouse);
        }
        
        return {
          ...product,
          stock: warehouseStock, // <- STOCK CORRECTO DEL WAREHOUSE
          name: product.label,
          price: parseFloat(product.price_ttc || 0),
          warehouseId: terminal?.fk_warehouse || null
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error obteniendo producto por ID:", error);
      return null;
    }
  };

  // Función para refrescar la búsqueda actual
  const refreshSearch = () => {
    if (productSearch.trim()) {
      fetchProducts(productSearch);
    }
  };

  return {
    // Estados básicos
    productSearch,
    setProductSearch,
    products,
    showProductSuggestions,
    setShowProductSuggestions,
    
    // Funciones principales
    checkProductStock,
    fetchProducts,
    testApiConnection,
    
    // Funciones auxiliares
    clearSearch,
    selectProduct,
    validateApiConfig,
    getProductById,
    refreshSearch,
    
    // Información de estado - IGUAL QUE INVENTARIO
    isApiConfigured: validateApiConfig(),
    hasWarehouse: !!terminal?.fk_warehouse,
    warehouseId: terminal?.fk_warehouse,
    warehouseName: terminal?.name,
    customerId: selectedCustomerDetails?.id || '1',
    
    // Debug info
    debug: {
      hasTokenFromVariables: !!variables.DOLIBARR_API_KEY,
      hasTokenFromDolibarr: !!variables.dolibarrToken,
      finalToken: !!(variables.DOLIBARR_API_KEY || variables.dolibarrToken),
      hasUrl: !!variables.SPOS_URL,
      tokenLength: (variables.DOLIBARR_API_KEY || variables.dolibarrToken)?.length || 0,
      variablesKeys: Object.keys(variables),
      url: variables.SPOS_URL,
      constructedUrl: API_BASE_URL,
      hasWarehouse: !!terminal?.fk_warehouse,
      warehouseId: terminal?.fk_warehouse,
      warehouseName: terminal?.name,
      stockEndpoint: terminal?.fk_warehouse ? `/products/{id}/stock?selected_warehouse_id=${terminal.fk_warehouse}` : '/products/{id} (stock global)',
      pattern: 'Endpoint-stock-correcto-FIXED',
      note: 'Usando endpoint /products/{id}/stock?selected_warehouse_id={warehouse_id} para stock específico'
    }
  };
};

// ============================================================================
// FUNCIÓN DE TESTING CORREGIDA CON WAREHOUSE
// ============================================================================

export const testApiMigration = async (variables, terminal) => {
  const tests = [];
  
  try {
    // Construir URL base - IGUAL QUE INVENTARIO
    const API_BASE_URL = variables.SPOS_URL ? `${variables.SPOS_URL}/api/index.php` : null;
    const API_KEY = variables.DOLIBARR_API_KEY || variables.dolibarrToken;
    
    // Test 0: Verificar configuración básica
    tests.push({
      name: "Configuración SPOS_URL",
      passed: !!variables.SPOS_URL,
      message: variables.SPOS_URL ? `URL: ${variables.SPOS_URL} -> Construida: ${API_BASE_URL}` : "No configurada"
    });
    
    tests.push({
      name: "Token Dolibarr",
      passed: !!API_KEY,
      message: API_KEY ? `Token disponible (${API_KEY.length} chars)` : "Token no disponible"
    });

    // Test específico de warehouse - NUEVO
    tests.push({
      name: "Configuración Warehouse",
      passed: !!terminal?.fk_warehouse,
      message: terminal?.fk_warehouse ? 
        `Warehouse ID: ${terminal.fk_warehouse} (${terminal.name || 'Sin nombre'})` : 
        "No configurado - se usará stock global"
    });
    
    if (!API_KEY || !API_BASE_URL) {
      tests.push({
        name: "Error crítico",
        passed: false,
        message: "No se puede continuar sin token o URL"
      });
      
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
    
    // Test 1: Endpoint de productos básico - IGUAL QUE INVENTARIO
    try {
      let testUrl = `${API_BASE_URL}/products?limit=1&sortfield=t.ref&sortorder=ASC`;
      if (terminal?.fk_warehouse) {
        testUrl += `&warehouse=${terminal.fk_warehouse}`;
      }
      
      const response = await fetch(testUrl, { 
        headers,
        method: 'GET'
      });
      const responseText = await response.text();
      
      tests.push({
        name: "Endpoint productos con warehouse",
        passed: response.ok,
        message: response.ok ? 
          `OK ${terminal?.fk_warehouse ? '(con warehouse '+terminal.fk_warehouse+')' : '(sin warehouse)'}` : 
          `Error ${response.status}: ${response.statusText}`
      });
      
      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          tests.push({
            name: "Formato JSON válido",
            passed: Array.isArray(data),
            message: Array.isArray(data) ? `${data.length} productos en respuesta` : "Respuesta no es array"
          });
        } catch (parseError) {
          tests.push({
            name: "Formato JSON válido",
            passed: false,
            message: "Error parseando JSON"
          });
        }
      }
      
    } catch (error) {
      tests.push({
        name: "Endpoint productos con warehouse",
        passed: false,
        message: error.message
      });
    }
    
    // Test 2: Filtros SQL con warehouse
    if (terminal?.fk_warehouse) {
      try {
        const simpleFilter = encodeURIComponent("t.ref LIKE '%test%'");
        const response = await fetch(`${API_BASE_URL}/products?sqlfilters=${simpleFilter}&warehouse=${terminal.fk_warehouse}&limit=1`, { 
          headers,
          method: 'GET'
        });
        
        tests.push({
          name: "Filtros SQL con warehouse",
          passed: response.ok,
          message: response.ok ? `OK (warehouse ${terminal.fk_warehouse})` : `Error ${response.status}: Filtros SQL con warehouse no soportados`
        });
      } catch (error) {
        tests.push({
          name: "Filtros SQL con warehouse",
          passed: false,
          message: error.message
        });
      }
    }

    // Test 3: Verificar endpoint de stock específico del warehouse - NUEVO
    if (terminal?.fk_warehouse) {
      try {
        // Primero obtener un producto para probar el stock
        const productsResponse = await fetch(`${API_BASE_URL}/products?limit=1`, { 
          headers,
          method: 'GET'
        });
        
        if (productsResponse.ok) {
          const products = await productsResponse.json();
          if (products.length > 0) {
            const testProductId = products[0].id;
            const stockResponse = await fetch(`${API_BASE_URL}/products/${testProductId}/stock?selected_warehouse_id=${terminal.fk_warehouse}`, { 
              headers,
              method: 'GET'
            });
            
            tests.push({
              name: "Endpoint stock específico",
              passed: stockResponse.ok,
              message: stockResponse.ok ? 
                `OK - /products/${testProductId}/stock?selected_warehouse_id=${terminal.fk_warehouse}` : 
                `Error ${stockResponse.status}: Endpoint de stock no disponible`
            });
            
            if (stockResponse.ok) {
              try {
                const stockData = await stockResponse.json();
                const hasCorrectFormat = stockData.stock_warehouses && 
                                       stockData.stock_warehouses[terminal.fk_warehouse.toString()];
                
                tests.push({
                  name: "Formato respuesta stock",
                  passed: hasCorrectFormat,
                  message: hasCorrectFormat ? 
                    `Formato correcto: ${JSON.stringify(stockData).substring(0, 100)}...` : 
                    "Formato de respuesta inesperado"
                });
              } catch (parseError) {
                tests.push({
                  name: "Formato respuesta stock",
                  passed: false,
                  message: "Error parseando respuesta de stock"
                });
              }
            }
          } else {
            tests.push({
              name: "Endpoint stock específico",
              passed: false,
              message: "No hay productos para probar endpoint de stock"
            });
          }
        } else {
          tests.push({
            name: "Endpoint stock específico",
            passed: false,
            message: "No se pudieron obtener productos para test de stock"
          });
        }
      } catch (error) {
        tests.push({
          name: "Endpoint stock específico",
          passed: false,
          message: error.message
        });
      }
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
      ...(!tests.find(t => t.name === "Endpoint productos con warehouse")?.passed ? 
        ["Verificar que la URL de Dolibarr sea correcta y el servicio esté funcionando"] : []),
      ...(!tests.find(t => t.name === "Token Dolibarr")?.passed ? 
        ["Verificar que el token DOLAPIKEY sea válido"] : []),
      ...(!tests.find(t => t.name === "Configuración Warehouse")?.passed ? 
        ["Configurar warehouse en la terminal para control de stock específico"] : []),
      ...(!tests.find(t => t.name === "Endpoint stock específico")?.passed ? 
        ["Verificar permisos para acceder al endpoint /products/{id}/stock"] : []),
      ...(!tests.find(t => t.name === "Formato respuesta stock")?.passed ? 
        ["Verificar que la respuesta de stock tenga el formato esperado con stock_warehouses"] : [])
    ]
  };
};