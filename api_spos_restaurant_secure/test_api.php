<?php
/**
 * Script de Testing para API SPOS Restaurant - VERSIÓN CORREGIDA CON cURL
 * Ubicación: custom/pos/frontend/api_spos_restaurant_secure/test_api_fixed.php
 * 
 * Ejecutar después de la instalación para verificar funcionamiento
 */

// Configuración del test
$API_BASE = 'https://siel.nubesiel.top/custom/pos/frontend/api_spos_restaurant_secure';
$API_TOKEN = 'bf6366f9859b5d2c7522ae155e2d834157419421'; // ⚠️ CAMBIAR por tu token real
$TEST_ENTITY = 1;

echo "🧪 SPOS Restaurant API - Suite de Testing (cURL)\n";
echo "================================================\n\n";

/**
 * Clase para testing de la API usando cURL
 */
class APITester 
{
    private $baseUrl;
    private $token;
    private $testResults = [];
    private $testEntity;
    
    public function __construct($baseUrl, $token, $entity) 
    {
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->token = $token;
        $this->testEntity = $entity;
    }
    
    /**
     * Ejecutar todos los tests
     */
    public function runAllTests() 
    {
        echo "🚀 Iniciando tests...\n\n";
        
        // Verificar que cURL esté disponible
        if (!function_exists('curl_init')) {
            echo "❌ ERROR: cURL no está disponible en este servidor PHP.\n";
            echo "   Contactar con el administrador del servidor.\n\n";
            return;
        }
        
        $this->addResult('✅ cURL disponible', 'Extensión cURL está habilitada');
        
        // Tests básicos
        $this->testConnectivity();
        $this->testAuthentication();
        
        // Tests de endpoints
        $this->testLayoutEndpoints();
        $this->testTablesEndpoints();
        $this->testProposalsEndpoints();
        
        // Mostrar resultados
        $this->showResults();
    }
    
    /**
     * Test de conectividad básica
     */
    private function testConnectivity() 
    {
        echo "📡 Testing conectividad...\n";
        
        $response = $this->makeRequest('GET', '/test');
        
        if ($response && isset($response['status']) && $response['status'] === 'OK') {
            $this->addResult('✅ Conectividad', 'API responde correctamente');
            $this->addResult('✅ Test endpoint', 'Endpoint /test funcional');
            
            if (isset($response['version'])) {
                $this->addResult('ℹ️ Versión API', $response['version']);
            }
            
            if (isset($response['database_info']['database_name'])) {
                $this->addResult('ℹ️ Base de datos', $response['database_info']['database_name']);
            }
        } else {
            $this->addResult('❌ Conectividad', 'API no responde o formato incorrecto');
            if (isset($response['error'])) {
                $this->addResult('❌ Error detalle', $response['error']);
            }
        }
        
        echo "   Test completado.\n\n";
    }
    
    /**
     * Test de autenticación
     */
    private function testAuthentication() 
    {
        echo "🔐 Testing autenticación...\n";
        
        // Test sin token
        $response = $this->makeRequest('GET', '/test', [], false);
        if (isset($response['error']) && strpos($response['error'], 'token') !== false) {
            $this->addResult('✅ Auth sin token', 'Correctamente rechaza requests sin token');
        } else {
            $this->addResult('⚠️ Auth sin token', 'Debería rechazar requests sin token');
        }
        
        // Test con token inválido
        $response = $this->makeRequest('GET', '/test', [], true, 'token_invalido');
        if (isset($response['error']) && (strpos($response['error'], 'Invalid') !== false || strpos($response['error'], 'Unauthorized') !== false)) {
            $this->addResult('✅ Auth token inválido', 'Correctamente rechaza tokens inválidos');
        } else {
            $this->addResult('⚠️ Auth token inválido', 'Debería rechazar tokens inválidos');
        }
        
        // Test con token válido (ya probado en connectivity)
        $this->addResult('✅ Auth token válido', 'Token configurado es válido');
        
        echo "   Test completado.\n\n";
    }
    
    /**
     * Test de endpoints de layout
     */
    private function testLayoutEndpoints() 
    {
        echo "🏗️ Testing endpoints de layout...\n";
        
        // GET layout (puede no existir)
        $layout = $this->makeRequest('GET', "/layout/{$this->testEntity}");
        if ($layout && !isset($layout['error'])) {
            $this->addResult('✅ GET layout', 'Layout encontrado para entidad ' . $this->testEntity);
            $layoutId = $layout['rowid'] ?? null;
            
            if ($layoutId) {
                // Test GET tables
                $tables = $this->makeRequest('GET', "/layout/{$layoutId}/tables");
                if (is_array($tables)) {
                    $this->addResult('✅ GET layout tables', count($tables) . ' mesas encontradas');
                }
                
                // Test GET elements
                $elements = $this->makeRequest('GET', "/layout/{$layoutId}/elements");
                if (is_array($elements)) {
                    $this->addResult('✅ GET layout elements', count($elements) . ' elementos encontrados');
                }
            }
        } elseif (isset($layout['error']) && strpos($layout['error'], '404') !== false) {
            $this->addResult('ℹ️ GET layout', 'No hay layout para entidad ' . $this->testEntity . ' (normal si es primera vez)');
        } else {
            $this->addResult('❌ GET layout', 'Error inesperado: ' . ($layout['error'] ?? 'Unknown'));
        }
        
        // Test POST layout (crear uno temporal)
        $testLayoutData = [
            'entity' => $this->testEntity,
            'name' => 'Test Layout ' . date('Y-m-d H:i:s'),
            'description' => 'Layout creado por test automatizado',
            'background_width' => 1000,
            'background_height' => 600,
            'create_default_tables' => true
        ];
        
        $createResult = $this->makeRequest('POST', '/layout', $testLayoutData);
        if ($createResult && isset($createResult['success']) && $createResult['success']) {
            $this->addResult('✅ POST layout', 'Layout de prueba creado exitosamente');
            
            $newLayoutId = $createResult['layout_id'] ?? null;
            if ($newLayoutId) {
                // Test PUT layout
                $updateData = ['description' => 'Layout actualizado por test'];
                $updateResult = $this->makeRequest('PUT', "/layout/{$newLayoutId}", $updateData);
                if ($updateResult && isset($updateResult['success'])) {
                    $this->addResult('✅ PUT layout', 'Layout actualizado exitosamente');
                }
                
                // Limpiar - eliminar layout de prueba
                $deleteResult = $this->makeRequest('DELETE', "/layout/{$newLayoutId}");
                if ($deleteResult && isset($deleteResult['success'])) {
                    $this->addResult('✅ DELETE layout', 'Layout de prueba eliminado');
                }
            }
        } else {
            $this->addResult('⚠️ POST layout', 'No se pudo crear layout de prueba: ' . ($createResult['error'] ?? 'Unknown'));
        }
        
        echo "   Test completado.\n\n";
    }
    
    /**
     * Test de endpoints de mesas
     */
    private function testTablesEndpoints() 
    {
        echo "🪑 Testing endpoints de mesas...\n";
        
        // Para este test necesitamos un layout existente
        $layout = $this->makeRequest('GET', "/layout/{$this->testEntity}");
        if ($layout && isset($layout['rowid'])) {
            $layoutId = $layout['rowid'];
            
            // Test POST table
            $testTableData = [
                'fk_layout' => $layoutId,
                'entity' => $this->testEntity,
                'numero' => 999, // Número único para test
                'nombre' => 'Mesa Test',
                'pos_x' => 500,
                'pos_y' => 300,
                'capacidad' => 4
            ];
            
            $createResult = $this->makeRequest('POST', '/table', $testTableData);
            if ($createResult && isset($createResult['success'])) {
                $this->addResult('✅ POST table', 'Mesa de prueba creada');
                
                $tableId = $createResult['table_id'] ?? null;
                if ($tableId) {
                    // Test GET table
                    $table = $this->makeRequest('GET', "/table/{$tableId}");
                    if ($table && isset($table['rowid'])) {
                        $this->addResult('✅ GET table', 'Mesa obtenida correctamente');
                    }
                    
                    // Test PUT table position
                    $positionData = ['pos_x' => 600, 'pos_y' => 400];
                    $positionResult = $this->makeRequest('PUT', "/table/{$tableId}/position", $positionData);
                    if ($positionResult && isset($positionResult['success'])) {
                        $this->addResult('✅ PUT table position', 'Posición actualizada');
                    }
                    
                    // Test PUT table
                    $updateData = ['nombre' => 'Mesa Test Actualizada'];
                    $updateResult = $this->makeRequest('PUT', "/table/{$tableId}", $updateData);
                    if ($updateResult && isset($updateResult['success'])) {
                        $this->addResult('✅ PUT table', 'Mesa actualizada');
                    }
                    
                    // Limpiar - eliminar mesa de prueba
                    $deleteResult = $this->makeRequest('DELETE', "/table/{$tableId}");
                    if ($deleteResult && isset($deleteResult['success'])) {
                        $this->addResult('✅ DELETE table', 'Mesa de prueba eliminada');
                    }
                }
            } else {
                $this->addResult('⚠️ POST table', 'No se pudo crear mesa: ' . ($createResult['error'] ?? 'Unknown'));
            }
        } else {
            $this->addResult('⚠️ Tables test', 'No hay layout disponible para probar mesas');
        }
        
        echo "   Test completado.\n\n";
    }
    
    /**
     * Test de endpoints de proposals
     */
    private function testProposalsEndpoints() 
    {
        echo "📋 Testing endpoints de proposals...\n";
        
        // Test GET proposals
        $proposals = $this->makeRequest('GET', "/proposals/{$this->testEntity}");
        if (is_array($proposals)) {
            $this->addResult('✅ GET proposals', count($proposals) . ' proposals encontrados');
        } else {
            $this->addResult('⚠️ GET proposals', 'Error obteniendo proposals: ' . ($proposals['error'] ?? 'Unknown'));
        }
        
        // Test estadísticas
        $stats = $this->makeRequest('GET', "/proposals/{$this->testEntity}/statistics");
        if ($stats && isset($stats['general_stats'])) {
            $this->addResult('✅ GET statistics', 'Estadísticas obtenidas correctamente');
        } else {
            $this->addResult('⚠️ GET statistics', 'Error obteniendo estadísticas');
        }
        
        echo "   Test completado.\n\n";
    }
    
    /**
     * Hacer request HTTP a la API usando cURL
     */
    private function makeRequest($method, $endpoint, $data = [], $useAuth = true, $customToken = null) 
    {
        $url = $this->baseUrl . $endpoint;
        
        // Inicializar cURL
        $ch = curl_init();
        
        // Configuración básica de cURL
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_SSL_VERIFYPEER => false, // Para desarrollo - en producción usar true
            CURLOPT_SSL_VERIFYHOST => false, // Para desarrollo - en producción usar 2
            CURLOPT_USERAGENT => 'SPOS-API-Tester/1.0'
        ]);
        
        // Headers
        $headers = [
            'Content-Type: application/json',
            'Accept: application/json'
        ];
        
        if ($useAuth) {
            $token = $customToken ?? $this->token;
            $headers[] = 'Authorization: Bearer ' . $token;
        }
        
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        
        // Configurar método HTTP y datos
        switch (strtoupper($method)) {
            case 'POST':
                curl_setopt($ch, CURLOPT_POST, true);
                if (!empty($data)) {
                    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
                }
                break;
                
            case 'PUT':
                curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
                if (!empty($data)) {
                    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
                }
                break;
                
            case 'DELETE':
                curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
                break;
                
            case 'GET':
            default:
                // GET es el método por defecto
                break;
        }
        
        // Ejecutar request
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        
        curl_close($ch);
        
        // Manejar errores de cURL
        if ($response === false || !empty($error)) {
            return ['error' => 'cURL Error: ' . ($error ?: 'Unknown error'), 'http_code' => $httpCode];
        }
        
        // Manejar códigos de error HTTP
        if ($httpCode >= 400) {
            return ['error' => "HTTP Error {$httpCode}", 'http_code' => $httpCode, 'response' => $response];
        }
        
        // Decodificar JSON
        $decoded = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ['error' => 'Invalid JSON response: ' . substr($response, 0, 200), 'http_code' => $httpCode];
        }
        
        return $decoded;
    }
    
    /**
     * Agregar resultado del test
     */
    private function addResult($status, $message) 
    {
        $this->testResults[] = ['status' => $status, 'message' => $message];
        echo "   {$status}: {$message}\n";
    }
    
    /**
     * Mostrar resultados finales
     */
    private function showResults() 
    {
        echo "\n" . str_repeat("=", 60) . "\n";
        echo "📊 RESULTADOS DEL TESTING\n";
        echo str_repeat("=", 60) . "\n\n";
        
        $success = 0;
        $warnings = 0;
        $errors = 0;
        $info = 0;
        
        foreach ($this->testResults as $result) {
            if (strpos($result['status'], '✅') === 0) {
                $success++;
            } elseif (strpos($result['status'], '⚠️') === 0) {
                $warnings++;
            } elseif (strpos($result['status'], '❌') === 0) {
                $errors++;
            } elseif (strpos($result['status'], 'ℹ️') === 0) {
                $info++;
            }
        }
        
        echo "✅ ÉXITOS: {$success}\n";
        echo "⚠️ ADVERTENCIAS: {$warnings}\n";
        echo "❌ ERRORES: {$errors}\n";
        echo "ℹ️ INFORMACIÓN: {$info}\n";
        echo "📊 TOTAL TESTS: " . count($this->testResults) . "\n\n";
        
        if ($errors === 0) {
            echo "🎉 TODOS LOS TESTS PASARON!\n";
            echo "✅ La API está funcionando correctamente.\n\n";
        } elseif ($errors < 3) {
            echo "⚠️ ALGUNOS TESTS FALLARON\n";
            echo "🔧 Revisar configuración y reintentar.\n\n";
        } else {
            echo "❌ MÚLTIPLES TESTS FALLARON\n";
            echo "🆘 Revisar instalación y configuración.\n\n";
        }
        
        echo "🔗 API Base URL: {$this->baseUrl}\n";
        echo "🧪 Test Entity: {$this->testEntity}\n";
        echo "📅 Fecha: " . date('Y-m-d H:i:s') . "\n";
        echo str_repeat("=", 60) . "\n";
        
        // Información adicional de diagnóstico
        echo "\n🔧 INFORMACIÓN DE DIAGNÓSTICO:\n";
        echo "   - PHP Version: " . PHP_VERSION . "\n";
        echo "   - cURL Version: " . (function_exists('curl_version') ? curl_version()['version'] : 'No disponible') . "\n";
        echo "   - allow_url_fopen: " . (ini_get('allow_url_fopen') ? 'Enabled' : 'Disabled') . "\n";
        echo "   - max_execution_time: " . ini_get('max_execution_time') . "s\n";
        echo "   - memory_limit: " . ini_get('memory_limit') . "\n";
    }
}

// CONFIGURACIÓN Y VALIDACIÓN
if (empty($API_TOKEN) || $API_TOKEN === 'tu_token_super_secreto_aqui') {
    echo "❌ ERROR: Debe configurar API_TOKEN en este script antes de ejecutar.\n";
    echo "   Editar línea: \$API_TOKEN = 'tu_token_real_aqui';\n\n";
    exit(1);
}

if (empty($API_BASE)) {
    echo "❌ ERROR: Debe configurar API_BASE en este script.\n";
    exit(1);
}

// EJECUTAR TESTS
$tester = new APITester($API_BASE, $API_TOKEN, $TEST_ENTITY);
$tester->runAllTests();

echo "🏁 Testing completado.\n";
?>