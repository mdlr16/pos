<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test CORS API SPOS - FUNCIONANDO</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            border-bottom: 3px solid #4F46E5;
            padding-bottom: 10px;
        }
        .section {
            margin: 20px 0;
            padding: 20px;
            border: 1px solid #e1e5e9;
            border-radius: 6px;
            background: #fafafa;
        }
        button {
            background: #4F46E5;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            margin: 5px;
            font-size: 14px;
        }
        button:hover {
            background: #3B37D1;
        }
        button:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        .result {
            margin-top: 15px;
            padding: 15px;
            border-radius: 6px;
            white-space: pre-wrap;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 12px;
        }
        .success {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
        }
        .error {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
        }
        .info {
            background: #d1ecf1;
            border: 1px solid #bee5eb;
            color: #0c5460;
        }
        input {
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin: 5px;
            width: 300px;
        }
        .config {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
        }
        .logs {
            height: 200px;
            overflow-y: auto;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 10px;
            font-family: monospace;
            font-size: 11px;
        }
        .success-banner {
            background: #d4edda;
            border: 2px solid #c3e6cb;
            color: #155724;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="success-banner">
            🎉 VERSIÓN CORREGIDA - USANDO X-API-KEY QUE FUNCIONA EN TU SERVIDOR 🎉
        </div>
        
        <h1>🧪 Test CORS API SPOS Restaurant - FUNCIONANDO</h1>
        
        <div class="config">
            <h3>⚙️ Configuración</h3>
            <label>API Base URL:</label>
            <input type="text" id="apiBase" value="https://siel.nubesiel.top/custom/pos/frontend/api_spos_restaurant_secure">
            <br>
            <label>Token API:</label>
            <input type="text" id="apiToken" value="bf6366f9859b5d2c7522ae155e2d834157419421">
            <br>
            <label>Entity:</label>
            <input type="number" id="entity" value="1">
            <br>
            <p><strong>🔑 Método de Autenticación:</strong> X-API-Key (Bearer Token no funciona en tu servidor)</p>
        </div>

        <div class="section">
            <h3>🔗 Test 1: Conectividad Básica (Sin Auth)</h3>
            <p>Verifica que la API responda y que CORS esté configurado correctamente.</p>
            <button onclick="testConnectivity()">Test Conectividad</button>
            <div id="connectivity-result"></div>
        </div>

        <div class="section">
            <h3>🔐 Test 2: Autenticación Corregida</h3>
            <p>Verifica que el token funcione usando X-API-Key.</p>
            <button onclick="testRealAuth()">Test Auth Real</button>
            <div id="auth-result"></div>
        </div>

        <div class="section">
            <h3>📋 Test 3: Operaciones CRUD Completas</h3>
            <p>Prueba todas las operaciones principales.</p>
            <button onclick="testGetLayout()">GET Layout</button>
            <button onclick="testCreateLayout()">POST Layout</button>
            <button onclick="testGetProposals()">GET Proposals</button>
            <button onclick="testGetStatistics()">GET Estadísticas</button>
            <div id="crud-result"></div>
        </div>

        <div class="section">
            <h3>🔄 Test 4: Flujo Completo Funcional</h3>
            <p>Ejecuta todas las pruebas automáticamente.</p>
            <button onclick="testCompleteFlow()">Flujo Completo</button>
            <div id="flow-result"></div>
        </div>

        <div class="section">
            <h3>📊 Log de Actividad</h3>
            <button onclick="clearLogs()">Limpiar Logs</button>
            <div class="logs" id="activity-logs"></div>
        </div>
    </div>

    <script>
        let logContainer;
        
        function init() {
            logContainer = document.getElementById('activity-logs');
            log('✅ Test CORS CORREGIDO iniciado');
            log('📍 Origen actual: ' + window.location.origin);
            log('🔑 Usando X-API-Key para autenticación');
        }

        function log(message) {
            const timestamp = new Date().toLocaleTimeString();
            const logEntry = `[${timestamp}] ${message}\n`;
            logContainer.textContent += logEntry;
            logContainer.scrollTop = logContainer.scrollHeight;
        }

        function clearLogs() {
            logContainer.textContent = '';
            log('🗑️ Logs limpiados');
        }

        function getConfig() {
            return {
                apiBase: document.getElementById('apiBase').value.trim(),
                token: document.getElementById('apiToken').value.trim(),
                entity: document.getElementById('entity').value
            };
        }

        function showResult(containerId, type, content) {
            const container = document.getElementById(containerId);
            container.innerHTML = `<div class="result ${type}">${content}</div>`;
        }

        async function makeRequest(endpoint, options = {}) {
            const config = getConfig();
            const url = `${config.apiBase}/${endpoint}`;
            
            log(`🚀 Request: ${options.method || 'GET'} ${url}`);

            const headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };

            // ✅ CORREGIDO: Usar X-API-Key en lugar de Bearer Token
            if (options.useAuth && config.token) {
                headers['X-API-Key'] = config.token;
                log(`🔑 Usando X-API-Key: ${config.token.substring(0, 10)}...`);
            }

            const requestConfig = {
                method: options.method || 'GET',
                headers: headers,
                mode: 'cors',
                credentials: 'omit'
            };

            if (options.data) {
                requestConfig.body = JSON.stringify(options.data);
                log(`📤 Enviando datos: ${JSON.stringify(options.data, null, 2)}`);
            }

            try {
                const response = await fetch(url, requestConfig);
                
                log(`📡 Response: ${response.status} ${response.statusText}`);

                const responseText = await response.text();
                log(`📄 Response Body (500 chars): ${responseText.substring(0, 500)}...`);

                let result;
                try {
                    result = JSON.parse(responseText);
                } catch (e) {
                    result = { raw: responseText, parseError: e.message };
                }

                return {
                    ok: response.ok,
                    status: response.status,
                    statusText: response.statusText,
                    data: result
                };

            } catch (error) {
                log(`❌ Request Error: ${error.message}`);
                throw error;
            }
        }

        async function testConnectivity() {
            log('🔍 Iniciando test de conectividad...');
            
            try {
                const result = await makeRequest('test');
                
                if (result.ok && result.data.status === 'OK') {
                    showResult('connectivity-result', 'success', 
                        `✅ CONECTIVIDAD EXITOSA!\n\n` +
                        `Status: ${result.data.status}\n` +
                        `Version: ${result.data.version}\n` +
                        `Database: ${result.data.database_info?.database_name}\n` +
                        `User Count: ${result.data.database_info?.user_count}\n` +
                        `PHP Version: ${result.data.server_info?.php_version}\n\n` +
                        `🎯 La API está lista para usar!`
                    );
                    log('✅ Test de conectividad EXITOSO');
                } else {
                    showResult('connectivity-result', 'error',
                        `❌ RESPUESTA INESPERADA\n\n` +
                        `Status: ${result.status}\n` +
                        `Data: ${JSON.stringify(result.data, null, 2)}`
                    );
                    log('⚠️ Test de conectividad con respuesta inesperada');
                }

            } catch (error) {
                showResult('connectivity-result', 'error',
                    `❌ ERROR DE CONECTIVIDAD\n\n` +
                    `Error: ${error.message}`
                );
                log(`❌ Test de conectividad FALLÓ: ${error.message}`);
            }
        }

        async function testRealAuth() {
            log('🔐 Test de autenticación REAL con X-API-Key...');
            const config = getConfig();
            
            try {
                const result = await makeRequest(`layout/${config.entity}`, { useAuth: true });
                
                if (result.ok) {
                    showResult('auth-result', 'success',
                        `✅ AUTENTICACIÓN EXITOSA!\n\n` +
                        `Layout encontrado: ${result.data.name || 'N/A'}\n` +
                        `Entity: ${result.data.entity}\n` +
                        `ID: ${result.data.rowid}\n` +
                        `Creado: ${result.data.date_creation}\n` +
                        `Dimensiones: ${result.data.background_width}x${result.data.background_height}\n\n` +
                        `🎉 X-API-Key funciona perfectamente!`
                    );
                    log('✅ Autenticación REAL exitosa');
                } else if (result.status === 404) {
                    showResult('auth-result', 'info',
                        `✅ AUTENTICACIÓN FUNCIONA!\n\n` +
                        `X-API-Key válido pero no hay layout para entity ${config.entity}\n` +
                        `Esto es normal si es la primera vez.\n` +
                        `Prueba crear un layout con "POST Layout".`
                    );
                    log('✅ Auth OK - Layout no encontrado (esperado)');
                } else if (result.status === 401) {
                    showResult('auth-result', 'error',
                        `❌ AUTENTICACIÓN FALLÓ\n\n` +
                        `Status: ${result.status}\n` +
                        `Error: ${result.data.error}`
                    );
                    log('❌ Autenticación FALLÓ');
                } else {
                    showResult('auth-result', 'error',
                        `❌ ERROR INESPERADO\n\n` +
                        `Status: ${result.status}\n` +
                        `Data: ${JSON.stringify(result.data, null, 2)}`
                    );
                    log('❌ Error inesperado en autenticación');
                }

            } catch (error) {
                showResult('auth-result', 'error',
                    `❌ ERROR DE AUTENTICACIÓN\n\n` +
                    `Error: ${error.message}`
                );
                log(`❌ Test de autenticación ERROR: ${error.message}`);
            }
        }

        async function testCreateLayout() {
            log('🆕 Test crear layout...');
            const config = getConfig();
            
            const layoutData = {
                entity: parseInt(config.entity),
                name: `Test Layout ${new Date().toLocaleTimeString()}`,
                description: 'Layout creado con X-API-Key funcionando',
                background_width: 1000,
                background_height: 600,
                create_default_tables: true,
                force_create: true
            };

            try {
                const result = await makeRequest('layout', {
                    method: 'POST',
                    useAuth: true,
                    data: layoutData
                });
                
                if (result.ok && result.data.success) {
                    showResult('crud-result', 'success',
                        `✅ LAYOUT CREADO EXITOSAMENTE!\n\n` +
                        `Layout ID: ${result.data.layout_id}\n` +
                        `Mesas creadas: ${result.data.tables_created}\n` +
                        `Nombre: ${result.data.layout?.name}\n` +
                        `Message: ${result.data.message}\n\n` +
                        `🎯 CRUD operations funcionando!`
                    );
                    log('✅ Layout creado exitosamente');
                } else {
                    showResult('crud-result', 'error',
                        `❌ ERROR CREANDO LAYOUT\n\n` +
                        `Status: ${result.status}\n` +
                        `Error: ${JSON.stringify(result.data, null, 2)}`
                    );
                    log('❌ Error creando layout');
                }

            } catch (error) {
                showResult('crud-result', 'error',
                    `❌ FALLO AL CREAR LAYOUT\n\nError: ${error.message}`
                );
                log(`❌ Fallo creando layout: ${error.message}`);
            }
        }

        async function testGetLayout() {
            log('📋 Test obtener layout...');
            const config = getConfig();
            
            try {
                const result = await makeRequest(`layout/${config.entity}`, { useAuth: true });
                
                if (result.ok) {
                    showResult('crud-result', 'success',
                        `✅ LAYOUT OBTENIDO!\n\n` +
                        `ID: ${result.data.rowid}\n` +
                        `Nombre: ${result.data.name}\n` +
                        `Entidad: ${result.data.entity}\n` +
                        `Dimensiones: ${result.data.background_width}x${result.data.background_height}\n` +
                        `Creado: ${result.data.date_creation}`
                    );
                    log('✅ Layout obtenido exitosamente');
                } else if (result.status === 404) {
                    showResult('crud-result', 'info',
                        `ℹ️ NO HAY LAYOUT\n\n` +
                        `No existe layout para la entidad ${config.entity}\n` +
                        `Crear uno con el botón "POST Layout".`
                    );
                    log('ℹ️ Layout no encontrado (404)');
                } else {
                    showResult('crud-result', 'error',
                        `❌ ERROR OBTENIENDO LAYOUT\n\n` +
                        `Status: ${result.status}\n` +
                        `Error: ${JSON.stringify(result.data, null, 2)}`
                    );
                    log('❌ Error obteniendo layout');
                }

            } catch (error) {
                showResult('crud-result', 'error',
                    `❌ FALLO AL OBTENER LAYOUT\n\nError: ${error.message}`
                );
                log(`❌ Fallo obteniendo layout: ${error.message}`);
            }
        }

        async function testGetProposals() {
            log('📊 Test obtener proposals...');
            const config = getConfig();
            
            try {
                const result = await makeRequest(`proposals/${config.entity}`, { useAuth: true });
                
                if (result.ok && Array.isArray(result.data)) {
                    showResult('crud-result', 'success',
                        `✅ PROPOSALS OBTENIDOS!\n\n` +
                        `Total: ${result.data.length} proposals\n\n` +
                        `Sample data:\n${JSON.stringify(result.data.slice(0, 2), null, 2)}`
                    );
                    log(`✅ Proposals obtenidos: ${result.data.length} encontrados`);
                } else {
                    showResult('crud-result', 'error',
                        `❌ ERROR OBTENIENDO PROPOSALS\n\n` +
                        `Status: ${result.status}\n` +
                        `Error: ${JSON.stringify(result.data, null, 2)}`
                    );
                    log('❌ Error obteniendo proposals');
                }

            } catch (error) {
                showResult('crud-result', 'error',
                    `❌ FALLO AL OBTENER PROPOSALS\n\nError: ${error.message}`
                );
                log(`❌ Fallo obteniendo proposals: ${error.message}`);
            }
        }

        async function testGetStatistics() {
            log('📈 Test obtener estadísticas...');
            const config = getConfig();
            
            try {
                const result = await makeRequest(`proposals/${config.entity}/statistics`, { useAuth: true });
                
                if (result.ok) {
                    showResult('crud-result', 'success',
                        `✅ ESTADÍSTICAS OBTENIDAS!\n\n` +
                        `Entidad: ${result.data.entity}\n` +
                        `Fecha: ${result.data.date}\n` +
                        `Stats: ${JSON.stringify(result.data.general_stats, null, 2)}`
                    );
                    log('✅ Estadísticas obtenidas exitosamente');
                } else {
                    showResult('crud-result', 'error',
                        `❌ ERROR OBTENIENDO ESTADÍSTICAS\n\n` +
                        `Status: ${result.status}\n` +
                        `Error: ${JSON.stringify(result.data, null, 2)}`
                    );
                    log('❌ Error obteniendo estadísticas');
                }

            } catch (error) {
                showResult('crud-result', 'error',
                    `❌ FALLO AL OBTENER ESTADÍSTICAS\n\nError: ${error.message}`
                );
                log(`❌ Fallo obteniendo estadísticas: ${error.message}`);
            }
        }

        async function testCompleteFlow() {
            log('🔄 Iniciando flujo completo CORREGIDO...');
            
            showResult('flow-result', 'info', '🔄 EJECUTANDO FLUJO COMPLETO...\n\nVerificar logs para detalles.');
            
            let allSuccess = true;
            
            try {
                // 1. Test conectividad
                log('📡 Paso 1: Test conectividad');
                const connectResult = await makeRequest('test');
                if (!connectResult.ok) allSuccess = false;
                await sleep(1000);
                
                // 2. Test autenticación
                log('🔐 Paso 2: Test autenticación con X-API-Key');
                const authResult = await makeRequest(`layout/${getConfig().entity}`, { useAuth: true });
                if (!authResult.ok && authResult.status !== 404) allSuccess = false;
                await sleep(1000);
                
                // 3. Test crear layout
                log('🆕 Paso 3: Crear layout');
                const createResult = await makeRequest('layout', {
                    method: 'POST',
                    useAuth: true,
                    data: {
                        entity: parseInt(getConfig().entity),
                        name: `Flujo Test ${new Date().toLocaleTimeString()}`,
                        description: 'Layout creado en flujo completo',
                        background_width: 1000,
                        background_height: 600,
                        create_default_tables: true,
                        force_create: true
                    }
                });
                if (!createResult.ok) allSuccess = false;
                await sleep(1000);
                
                // 4. Test obtener proposals
                log('📊 Paso 4: Obtener proposals');
                const proposalsResult = await makeRequest(`proposals/${getConfig().entity}`, { useAuth: true });
                if (!proposalsResult.ok) allSuccess = false;
                await sleep(1000);
                
                // 5. Test estadísticas
                log('📈 Paso 5: Obtener estadísticas');
                const statsResult = await makeRequest(`proposals/${getConfig().entity}/statistics`, { useAuth: true });
                if (!statsResult.ok) allSuccess = false;
                
                if (allSuccess) {
                    showResult('flow-result', 'success',
                        `🎉 FLUJO COMPLETO EXITOSO!\n\n` +
                        `✅ Conectividad: OK\n` +
                        `✅ Autenticación: OK (X-API-Key)\n` +
                        `✅ Crear Layout: OK\n` +
                        `✅ Obtener Proposals: OK\n` +
                        `✅ Estadísticas: OK\n\n` +
                        `🚀 TU API ESTÁ COMPLETAMENTE FUNCIONAL!\n` +
                        `Ahora puedes usar X-API-Key desde React.`
                    );
                    log('🎉 FLUJO COMPLETO EXITOSO - API 100% funcional');
                } else {
                    showResult('flow-result', 'error',
                        `⚠️ FLUJO PARCIALMENTE EXITOSO\n\n` +
                        `Algunos pasos fallaron. Revisar logs para detalles.\n` +
                        `La base funciona pero hay algunos issues.`
                    );
                    log('⚠️ Flujo parcialmente exitoso');
                }
                
            } catch (error) {
                showResult('flow-result', 'error',
                    `❌ FLUJO INTERRUMPIDO\n\nError: ${error.message}`
                );
                log(`❌ Flujo completo falló: ${error.message}`);
            }
        }

        function sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        // Inicializar cuando la página carga
        window.addEventListener('load', init);
    </script>
</body>
</html>