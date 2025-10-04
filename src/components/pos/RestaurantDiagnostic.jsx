import React, { useState, useEffect } from 'react';

const RestaurantDiagnostic = ({ 
  variables, 
  terminal, 
  mesasHook, 
  isOpen, 
  onClose 
}) => {
  
  const [diagnosticData, setDiagnosticData] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [expandedSection, setExpandedSection] = useState(null);

  // URLs para API Segura
  const SECURE_API_BASE = variables?.SPOS_URL ? 
    `${variables.SPOS_URL}/custom/pos/frontend/api_spos_restaurant_secure` : null;
  const API_KEY = variables?.DOLIBARR_API_KEY || variables?.dolibarrToken;

  // Ejecutar diagnóstico completo
  const runDiagnostic = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    const results = [];
    
    try {
      // 1. Verificar configuración básica
      results.push(await testBasicConfiguration());
      
      // 2. Verificar conectividad API segura
      results.push(await testSecureApiConnectivity());
      
      // 3. Verificar estructura de base de datos
      results.push(await testDatabaseStructure());
      
      // 4. Verificar funcionalidades específicas
      results.push(await testRestaurantFeatures());
      
      // 5. Verificar estado del sistema
      results.push(await testSystemStatus());
      
      // 6. Verificar permisos y archivos
      results.push(await testFilePermissions());
      
    } catch (error) {
      results.push({
        category: 'Error General',
        status: 'error',
        message: `Error ejecutando diagnóstico: ${error.message}`,
        details: error.stack
      });
    }
    
    setTestResults(results);
    setIsRunning(false);
  };

  // Test 1: Configuración básica - ACTUALIZADO
  const testBasicConfiguration = async () => {
    const issues = [];
    const warnings = [];
    
    // Verificar variables requeridas
    if (!variables?.SPOS_URL) issues.push('SPOS_URL no configurada');
    if (!API_KEY) issues.push('API Key no configurada (DOLIBARR_API_KEY o dolibarrToken)');
    if (!terminal?.entity) issues.push('Entity del terminal no configurada');
    if (variables?.SPOS_RESTAURANTE !== "1") issues.push('Modo restaurante no activado (SPOS_RESTAURANTE)');
    
    // Verificar URLs
    if (variables?.SPOS_URL) {
      try {
        new URL(variables.SPOS_URL);
        if (!variables.SPOS_URL.startsWith('https://')) {
          warnings.push('Se recomienda usar HTTPS en producción');
        }
      } catch {
        issues.push('URL base inválida');
      }
    }

    // Verificar configuración de API segura
    if (SECURE_API_BASE) {
      try {
        new URL(SECURE_API_BASE);
      } catch {
        issues.push('URL de API segura inválida');
      }
    }
    
    const status = issues.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'success';
    const allIssues = [...issues, ...warnings];
    
    return {
      category: 'Configuración Básica',
      status,
      message: issues.length === 0 && warnings.length === 0 ? 
        'Configuración correcta' : 
        `${allIssues.length} problema(s) encontrado(s)`,
      details: allIssues.length > 0 ? 
        allIssues.join('\n') : 
        'Todas las variables están configuradas correctamente',
      data: {
        hasUrl: !!variables?.SPOS_URL,
        hasApiKey: !!API_KEY,
        hasEntity: !!terminal?.entity,
        restaurantMode: variables?.SPOS_RESTAURANTE === "1",
        secureApiBase: SECURE_API_BASE,
        apiKeySource: variables?.DOLIBARR_API_KEY ? 'DOLIBARR_API_KEY' : 
                     variables?.dolibarrToken ? 'dolibarrToken' : 'NO_KEY',
        variables: {
          SPOS_URL: variables?.SPOS_URL,
          SPOS_RESTAURANTE: variables?.SPOS_RESTAURANTE,
          entity: terminal?.entity
        }
      }
    };
  };

  // Test 2: Conectividad API Segura - NUEVO
  const testSecureApiConnectivity = async () => {
    if (!SECURE_API_BASE || !API_KEY) {
      return {
        category: 'Conectividad API Segura',
        status: 'error',
        message: 'No se puede probar - configuración incompleta',
        details: 'Complete la configuración básica primero'
      };
    }
    
    try {
      // Test endpoint de conectividad
      const testUrl = `${SECURE_API_BASE}/test`;
      const headers = {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      console.log('🧪 Testing secure API:', testUrl);
      console.log('🔑 Using X-API-Key:', API_KEY.substring(0, 10) + '...');
      
      const response = await fetch(testUrl, { 
        method: 'GET', 
        headers,
        timeout: 10000 
      });
      
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API response:', data);
        
        return {
          category: 'Conectividad API Segura',
          status: 'success',
          message: 'API segura funcionando correctamente',
          details: `Versión: ${data.version}\nStatus: ${response.status}\nBase de datos: ${data.database_info?.status || 'N/A'}`,
          data: { 
            response: data, 
            status: response.status,
            endpoint: testUrl 
          }
        };
      } else {
        const errorText = await response.text();
        console.error('❌ API error:', response.status, errorText);
        
        return {
          category: 'Conectividad API Segura',
          status: 'error',
          message: `Error HTTP ${response.status}`,
          details: `${response.statusText}\nRespuesta: ${errorText}\nVerifique que la API esté instalada en: ${SECURE_API_BASE}`
        };
      }
    } catch (error) {
      console.error('❌ Connection error:', error);
      
      return {
        category: 'Conectividad API Segura',
        status: 'error',
        message: 'Error de conexión',
        details: `${error.message}\nURL: ${SECURE_API_BASE}\nVerifique conectividad de red y que el archivo index.php esté instalado`
      };
    }
  };

  // Test 3: Estructura de base de datos - ACTUALIZADO
  const testDatabaseStructure = async () => {
    if (!SECURE_API_BASE || !terminal?.entity || !API_KEY) {
      return {
        category: 'Base de Datos',
        status: 'warning',
        message: 'No se puede verificar - configuración incompleta',
        details: 'Configure URL, API Key y entity para verificar base de datos'
      };
    }
    
    try {
      // Test layout endpoint
      const layoutUrl = `${SECURE_API_BASE}/layout/${terminal.entity}`;
      const headers = {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      console.log('🗄️ Testing database structure:', layoutUrl);
      
      const response = await fetch(layoutUrl, { method: 'GET', headers });
      
      if (response.status === 200) {
        const layout = await response.json();
        console.log('✅ Layout found:', layout);
        
        // Test tables endpoint
        const tablesUrl = `${SECURE_API_BASE}/layout/${layout.rowid}/tables`;
        const tablesResponse = await fetch(tablesUrl, { method: 'GET', headers });
        
        let tablesInfo = '';
        if (tablesResponse.ok) {
          const tables = await tablesResponse.json();
          tablesInfo = `\nMesas configuradas: ${tables.length}`;
        }
        
        return {
          category: 'Base de Datos',
          status: 'success',
          message: 'BD configurada y layout encontrado',
          details: `Layout: ${layout.name}\nEntity: ${layout.entity}\nID: ${layout.rowid}${tablesInfo}\nCreado: ${layout.date_creation}`,
          data: { layout, layoutId: layout.rowid }
        };
      } else if (response.status === 404) {
        const errorData = await response.json();
        console.log('⚠️ Layout not found:', errorData);
        
        return {
          category: 'Base de Datos',
          status: 'warning',
          message: 'BD configurada pero sin layout',
          details: 'Tablas creadas pero requiere configuración inicial del restaurante.\nEjecute el setup inicial desde el botón "Configurar Restaurante".',
          requiresSetup: true
        };
      } else {
        const errorText = await response.text();
        console.error('❌ Database error:', response.status, errorText);
        
        return {
          category: 'Base de Datos',
          status: 'error',
          message: `Error accediendo BD (${response.status})`,
          details: `${errorText}\nPosiblemente las tablas no están creadas.\nVerifique que existan las tablas:\n- llx_spos_restaurant_layout\n- llx_spos_restaurant_mesas`
        };
      }
    } catch (error) {
      console.error('❌ Database test error:', error);
      
      return {
        category: 'Base de Datos',
        status: 'error',
        message: 'Error verificando BD',
        details: `${error.message}\nNo se pudo conectar con la base de datos`
      };
    }
  };

  // Test 4: Funcionalidades del Restaurante - NUEVO
  const testRestaurantFeatures = async () => {
    if (!SECURE_API_BASE || !terminal?.entity || !API_KEY) {
      return {
        category: 'Funcionalidades Restaurante',
        status: 'warning',
        message: 'No se puede verificar - configuración incompleta',
        details: 'Complete la configuración básica primero'
      };
    }
    
    const tests = [];
    let status = 'success';
    
    try {
      const headers = {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      // Test proposals endpoint
      try {
        const proposalsUrl = `${SECURE_API_BASE}/proposals/${terminal.entity}`;
        const proposalsResponse = await fetch(proposalsUrl, { method: 'GET', headers });
        
        if (proposalsResponse.ok) {
          const proposals = await proposalsResponse.json();
          tests.push(`✅ Proposals endpoint: ${proposals.length} proposals encontrados`);
        } else {
          tests.push(`❌ Proposals endpoint: HTTP ${proposalsResponse.status}`);
          status = 'error';
        }
      } catch (error) {
        tests.push(`❌ Proposals endpoint: ${error.message}`);
        status = 'error';
      }
      
      // Test upload endpoint
      try {
        const uploadUrl = `${SECURE_API_BASE}/upload-image`;
        const uploadResponse = await fetch(uploadUrl, { 
          method: 'OPTIONS', 
          headers 
        });
        
        if (uploadResponse.status === 200 || uploadResponse.status === 405) {
          tests.push('✅ Upload endpoint accesible');
        } else {
          tests.push(`⚠️ Upload endpoint: HTTP ${uploadResponse.status}`);
          if (status === 'success') status = 'warning';
        }
      } catch (error) {
        tests.push(`❌ Upload endpoint: ${error.message}`);
        status = 'error';
      }
      
      // Test mesasHook status
      if (mesasHook) {
        tests.push(`📊 Hook status: ${mesasHook.isConfigured ? 'Configurado' : 'No configurado'}`);
        tests.push(`📊 Necesita setup: ${mesasHook.needsSetup ? 'Sí' : 'No'}`);
        tests.push(`📊 Total mesas: ${mesasHook.totalMesas || 0}`);
        
        if (mesasHook.hasError) {
          tests.push(`❌ Error en hook: ${mesasHook.error?.message || 'Error desconocido'}`);
          status = 'error';
        }
      }
      
    } catch (error) {
      tests.push(`❌ Error general: ${error.message}`);
      status = 'error';
    }
    
    return {
      category: 'Funcionalidades Restaurante',
      status,
      message: `${tests.filter(t => t.includes('✅')).length}/${tests.length} funcionalidades operativas`,
      details: tests.join('\n'),
      data: {
        mesasHookStatus: mesasHook ? {
          isConfigured: mesasHook.isConfigured,
          hasError: mesasHook.hasError,
          needsSetup: mesasHook.needsSetup,
          totalMesas: mesasHook.totalMesas,
          error: mesasHook.error
        } : null
      }
    };
  };

  // Test 5: Estado del sistema - MEJORADO
  const testSystemStatus = async () => {
    const systemInfo = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      cookiesEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      timestamp: new Date().toISOString(),
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      windowSize: `${window.innerWidth}x${window.innerHeight}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      platform: navigator.platform
    };
    
    // Verificar funcionalidades del navegador
    const browserTests = [];
    
    // Test Fetch API
    if (typeof fetch !== 'undefined') {
      browserTests.push('✅ Fetch API disponible');
    } else {
      browserTests.push('❌ Fetch API no disponible');
    }
    
    // Test JSON
    if (typeof JSON !== 'undefined') {
      browserTests.push('✅ JSON disponible');
    } else {
      browserTests.push('❌ JSON no disponible');
    }
    
    // Test Promise
    if (typeof Promise !== 'undefined') {
      browserTests.push('✅ Promises disponibles');
    } else {
      browserTests.push('❌ Promises no disponibles');
    }
    
    // Test ES6 features
    try {
      eval('const test = () => {}');
      browserTests.push('✅ ES6 Arrow functions');
    } catch {
      browserTests.push('❌ ES6 Arrow functions no disponibles');
    }
    
    // Test localStorage (opcional para restaurante)
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      browserTests.push('✅ localStorage disponible');
    } catch {
      browserTests.push('⚠️ localStorage no disponible (no crítico)');
    }
    
    // Test Console
    if (typeof console !== 'undefined') {
      browserTests.push('✅ Console disponible');
    } else {
      browserTests.push('❌ Console no disponible');
    }
    
    // Test WebGL (para futuras funcionalidades visuales)
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        browserTests.push('✅ WebGL disponible');
      } else {
        browserTests.push('⚠️ WebGL no disponible');
      }
    } catch {
      browserTests.push('⚠️ WebGL no verificable');
    }
    
    return {
      category: 'Estado del Sistema',
      status: 'success',
      message: 'Información del sistema recopilada',
      details: browserTests.join('\n'),
      data: systemInfo
    };
  };

  // Test 6: Permisos y archivos - ACTUALIZADO
  const testFilePermissions = async () => {
    const tests = [];
    
    if (!SECURE_API_BASE || !API_KEY) {
      return {
        category: 'Permisos y Archivos',
        status: 'warning',
        message: 'No se puede verificar - configuración incompleta',
        details: 'Configure API segura primero'
      };
    }
    
    const headers = {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    // Test CORS con API segura
    try {
      const corsResponse = await fetch(`${SECURE_API_BASE}/test`, { 
        method: 'OPTIONS',
        headers: {
          'Origin': window.location.origin,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'X-API-Key'
        }
      });
      
      const corsHeaders = corsResponse.headers.get('Access-Control-Allow-Origin');
      if (corsHeaders) {
        tests.push('✅ CORS configurado correctamente');
      } else {
        tests.push('⚠️ CORS puede tener problemas');
      }
    } catch (error) {
      tests.push(`❌ Test CORS: ${error.message}`);
    }
    
    // Test upload endpoint específicamente
    try {
      const uploadResponse = await fetch(`${SECURE_API_BASE}/upload-image`, { 
        method: 'POST',
        headers: {
          'X-API-Key': API_KEY
        },
        body: new FormData() // FormData vacío para test
      });
      
      // Esperamos error 400 (Bad Request) porque no enviamos datos reales
      if (uploadResponse.status === 400) {
        tests.push('✅ Endpoint de upload funcional');
      } else if (uploadResponse.status === 401) {
        tests.push('❌ Endpoint de upload: Error de autenticación');
      } else {
        tests.push(`⚠️ Endpoint de upload: HTTP ${uploadResponse.status}`);
      }
    } catch (error) {
      tests.push(`❌ Endpoint de upload: ${error.message}`);
    }
    
    // Test permisos de directorio de documentos
    try {
      const testImageData = new FormData();
      testImageData.append('test', 'permissions');
      
      const permissionsResponse = await fetch(`${SECURE_API_BASE}/test`, {
        method: 'GET',
        headers
      });
      
      if (permissionsResponse.ok) {
        tests.push('✅ API accesible para tests de permisos');
      } else {
        tests.push('❌ API no accesible para tests');
      }
    } catch (error) {
      tests.push(`❌ Test permisos: ${error.message}`);
    }
    
    return {
      category: 'Permisos y Archivos',
      status: tests.some(t => t.includes('❌')) ? 'error' : 
              tests.some(t => t.includes('⚠️')) ? 'warning' : 'success',
      message: `${tests.filter(t => t.includes('✅')).length}/${tests.length} tests pasaron`,
      details: tests.join('\n')
    };
  };

  // Obtener recomendaciones basadas en los resultados - ACTUALIZADO
  const getRecommendations = () => {
    const recommendations = [];
    
    testResults.forEach(result => {
      if (result.status === 'error') {
        switch (result.category) {
          case 'Configuración Básica':
            recommendations.push({
              priority: 'high',
              action: 'Completar configuración',
              description: 'Configure SPOS_URL, API Key (DOLIBARR_API_KEY o dolibarrToken), entity y active SPOS_RESTAURANTE=1'
            });
            break;
          case 'Conectividad API Segura':
            recommendations.push({
              priority: 'high',
              action: 'Instalar API Segura',
              description: 'Suba el archivo index.php a custom/pos/frontend/api_spos_restaurant_secure/ y verifique permisos'
            });
            break;
          case 'Base de Datos':
            recommendations.push({
              priority: 'high',
              action: 'Configurar BD',
              description: 'Ejecute el script SQL para crear las tablas llx_spos_restaurant_layout y llx_spos_restaurant_mesas'
            });
            break;
          case 'Funcionalidades Restaurante':
            recommendations.push({
              priority: 'medium',
              action: 'Verificar endpoints',
              description: 'Algunos endpoints del restaurante no están funcionando. Verifique la instalación de la API'
            });
            break;
        }
      } else if (result.requiresSetup) {
        recommendations.push({
          priority: 'medium',
          action: 'Configuración inicial del restaurante',
          description: 'Complete la configuración inicial usando el botón "Configurar Restaurante"'
        });
      }
    });
    
    // Recomendaciones específicas según mesasHook
    if (mesasHook?.needsSetup) {
      recommendations.push({
        priority: 'medium',
        action: 'Setup de restaurante requerido',
        description: 'El sistema necesita configuración inicial. Use el modal de setup.'
      });
    }
    
    if (mesasHook?.hasError && mesasHook?.error) {
      recommendations.push({
        priority: 'high',
        action: 'Resolver error del hook',
        description: `Error: ${mesasHook.error.message}. Verifique la configuración y conectividad.`
      });
    }
    
    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'low',
        action: 'Sistema operativo',
        description: '🎉 El sistema está funcionando correctamente. Puede comenzar a usar el restaurante.'
      });
    }
    
    return recommendations;
  };

  // Generar reporte de diagnóstico - MEJORADO
  const generateReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      version: '2.0.1-secure-api',
      system: {
        url: variables?.SPOS_URL,
        secureApiBase: SECURE_API_BASE,
        entity: terminal?.entity,
        mode: variables?.SPOS_RESTAURANTE === "1" ? 'restaurant' : 'normal',
        apiKeySource: variables?.DOLIBARR_API_KEY ? 'DOLIBARR_API_KEY' : 
                     variables?.dolibarrToken ? 'dolibarrToken' : 'NO_KEY'
      },
      results: testResults,
      recommendations: getRecommendations(),
      mesasHookStatus: mesasHook ? {
        isConfigured: mesasHook.isConfigured,
        hasError: mesasHook.hasError,
        needsSetup: mesasHook.needsSetup,
        totalMesas: mesasHook.totalMesas,
        error: mesasHook.error?.message || null,
        apiInfo: mesasHook.apiInfo
      } : null,
      browserInfo: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookiesEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
      }
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spos-restaurant-diagnostic-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Ejecutar diagnóstico automáticamente al abrir
  useEffect(() => {
    if (isOpen) {
      runDiagnostic();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return '🔍';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-purple-500 to-blue-600 text-white">
          <div>
            <h2 className="text-xl font-bold flex items-center">
              🔬 Diagnóstico SPOS Restaurant (API Segura)
            </h2>
            <p className="text-purple-100 text-sm mt-1">
              Verificación completa de configuración y estado del sistema con API segura
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Status general */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">
                {testResults.filter(r => r.status === 'success').length}
              </div>
              <div className="text-sm text-blue-700">Tests Exitosos</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-600">
                {testResults.filter(r => r.status === 'error').length}
              </div>
              <div className="text-sm text-red-700">Errores</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">
                {testResults.filter(r => r.status === 'warning').length}
              </div>
              <div className="text-sm text-yellow-700">Advertencias</div>
            </div>
          </div>

          {/* Info de API */}
          {SECURE_API_BASE && (
            <div className="mb-6 bg-indigo-50 p-4 rounded-lg border border-indigo-200">
              <h3 className="font-medium text-indigo-800 mb-2">🔒 Configuración API Segura</h3>
              <div className="text-sm text-indigo-700 space-y-1">
                <div>Endpoint: <code className="bg-white px-2 py-1 rounded">{SECURE_API_BASE}</code></div>
                <div>Autenticación: X-API-Key ({API_KEY ? `${API_KEY.substring(0, 10)}...` : 'NO CONFIGURADA'})</div>
                <div>Entity: {terminal?.entity || 'NO CONFIGURADA'}</div>
              </div>
            </div>
          )}

          {/* Botón ejecutar diagnóstico */}
          <div className="mb-6 flex gap-3">
            <button
              onClick={runDiagnostic}
              disabled={isRunning}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors disabled:bg-blue-300"
            >
              {isRunning ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Ejecutando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Ejecutar Diagnóstico
                </>
              )}
            </button>
            
            {testResults.length > 0 && (
              <button
                onClick={generateReport}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Descargar Reporte
              </button>
            )}
          </div>

          {/* Resultados */}
          <div className="space-y-4">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`border rounded-lg ${getStatusColor(result.status)}`}
              >
                <div
                  className="p-4 cursor-pointer flex items-center justify-between"
                  onClick={() => setExpandedSection(expandedSection === index ? null : index)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getStatusIcon(result.status)}</span>
                    <div>
                      <h3 className="font-medium">{result.category}</h3>
                      <p className="text-sm opacity-75">{result.message}</p>
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 transition-transform ${
                      expandedSection === index ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                
                {expandedSection === index && (
                  <div className="px-4 pb-4 border-t border-current border-opacity-20">
                    <div className="mt-3">
                      <h4 className="font-medium mb-2">Detalles:</h4>
                      <pre className="text-sm bg-white bg-opacity-50 p-3 rounded whitespace-pre-wrap">
                        {result.details}
                      </pre>
                      
                      {result.data && (
                        <details className="mt-3">
                          <summary className="cursor-pointer font-medium">Ver datos técnicos</summary>
                          <pre className="text-xs mt-2 bg-white bg-opacity-50 p-3 rounded overflow-x-auto">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Recomendaciones */}
          {testResults.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">📋 Recomendaciones</h3>
              <div className="space-y-3">
                {getRecommendations().map((rec, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      rec.priority === 'high' ? 'bg-red-50 border-red-200' :
                      rec.priority === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                      'bg-green-50 border-green-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg">
                        {rec.priority === 'high' ? '🔥' : rec.priority === 'medium' ? '⚠️' : '✅'}
                      </span>
                      <div>
                        <h4 className="font-medium">{rec.action}</h4>
                        <p className="text-sm opacity-75">{rec.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Última ejecución: {testResults.length > 0 ? new Date().toLocaleString() : 'Nunca'}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestaurantDiagnostic;