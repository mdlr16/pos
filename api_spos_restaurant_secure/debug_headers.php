<?php
/**
 * Debug Headers - Verificar qué headers llegan al servidor
 * Ubicación: custom/pos/frontend/api_spos_restaurant_secure/debug_headers.php
 */

header('Access-Control-Allow-Origin: https://siel.nubesiel.top');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(['status' => 'OK', 'message' => 'CORS preflight successful']);
    exit();
}

// Obtener todos los headers de diferentes maneras
$headers_info = [
    'method' => $_SERVER['REQUEST_METHOD'],
    'uri' => $_SERVER['REQUEST_URI'],
    'timestamp' => date('Y-m-d H:i:s'),
    'headers_methods' => []
];

// Método 1: getallheaders() si existe
if (function_exists('getallheaders')) {
    $headers_info['headers_methods']['getallheaders'] = getallheaders();
} else {
    $headers_info['headers_methods']['getallheaders'] = 'Function not available';
}

// Método 2: $_SERVER variables que empiecen con HTTP_
$serverHeaders = [];
foreach ($_SERVER as $key => $value) {
    if (strpos($key, 'HTTP_') === 0) {
        $serverHeaders[$key] = $value;
    }
}
$headers_info['headers_methods']['server_http'] = $serverHeaders;

// Método 3: Apache headers si está disponible
if (function_exists('apache_request_headers')) {
    $headers_info['headers_methods']['apache_request_headers'] = apache_request_headers();
} else {
    $headers_info['headers_methods']['apache_request_headers'] = 'Function not available';
}

// Búsqueda específica del token de autorización
$authToken = null;
$authSource = 'none';

// Intentar diferentes métodos para obtener el token
$attempts = [];

// Intento 1: getallheaders()
if (function_exists('getallheaders')) {
    $headers = getallheaders();
    if (isset($headers['Authorization'])) {
        $attempts['getallheaders_Authorization'] = $headers['Authorization'];
        if (preg_match('/Bearer\s+(.*)$/i', $headers['Authorization'], $matches)) {
            $authToken = $matches[1];
            $authSource = 'getallheaders_Authorization';
        }
    }
    
    if (isset($headers['X-API-Key'])) {
        $attempts['getallheaders_X-API-Key'] = $headers['X-API-Key'];
        if (!$authToken) {
            $authToken = $headers['X-API-Key'];
            $authSource = 'getallheaders_X-API-Key';
        }
    }
}

// Intento 2: $_SERVER variables
if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $attempts['SERVER_HTTP_AUTHORIZATION'] = $_SERVER['HTTP_AUTHORIZATION'];
    if (!$authToken && preg_match('/Bearer\s+(.*)$/i', $_SERVER['HTTP_AUTHORIZATION'], $matches)) {
        $authToken = $matches[1];
        $authSource = 'SERVER_HTTP_AUTHORIZATION';
    }
}

if (isset($_SERVER['HTTP_X_API_KEY'])) {
    $attempts['SERVER_HTTP_X_API_KEY'] = $_SERVER['HTTP_X_API_KEY'];
    if (!$authToken) {
        $authToken = $_SERVER['HTTP_X_API_KEY'];
        $authSource = 'SERVER_HTTP_X_API_KEY';
    }
}

// Intento 3: Apache headers
if (function_exists('apache_request_headers')) {
    $apacheHeaders = apache_request_headers();
    if (isset($apacheHeaders['Authorization'])) {
        $attempts['apache_Authorization'] = $apacheHeaders['Authorization'];
        if (!$authToken && preg_match('/Bearer\s+(.*)$/i', $apacheHeaders['Authorization'], $matches)) {
            $authToken = $matches[1];
            $authSource = 'apache_Authorization';
        }
    }
}

$headers_info['auth_token_search'] = [
    'found_token' => $authToken ? substr($authToken, 0, 10) . '...' : null,
    'source' => $authSource,
    'attempts' => $attempts
];

// Test de validación del token si se encontró
if ($authToken) {
    // Configuración de BD
    $config = [
        'host' => 'localhost',
        'dbname' => 'nubesiel_siel',
        'user' => 'nubesiel_sieladmin',
        'password' => 'Siel9624@',
        'prefix' => 'llx_'
    ];
    
    try {
        $dsn = "mysql:host={$config['host']};dbname={$config['dbname']};charset=utf8mb4";
        $pdo = new PDO($dsn, $config['user'], $config['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);
        
        $stmt = $pdo->prepare("
            SELECT u.rowid, u.login, u.admin, u.entity, ak.key_name
            FROM {$config['prefix']}user u 
            JOIN {$config['prefix']}api_keys ak ON u.rowid = ak.fk_user 
            WHERE ak.key_value = ? AND ak.is_active = 1 AND u.statut = 1
        ");
        
        $stmt->execute([$authToken]);
        $user = $stmt->fetch();
        
        if ($user) {
            $headers_info['token_validation'] = [
                'status' => 'VALID',
                'user_id' => $user['rowid'],
                'user_login' => $user['login'],
                'user_entity' => $user['entity'],
                'is_admin' => (bool)$user['admin'],
                'key_name' => $user['key_name']
            ];
        } else {
            $headers_info['token_validation'] = [
                'status' => 'INVALID',
                'message' => 'Token not found in database'
            ];
        }
        
    } catch (Exception $e) {
        $headers_info['token_validation'] = [
            'status' => 'ERROR',
            'message' => $e->getMessage()
        ];
    }
} else {
    $headers_info['token_validation'] = [
        'status' => 'NOT_FOUND',
        'message' => 'No authorization token found in any header method'
    ];
}

// Información adicional del servidor
$headers_info['server_info'] = [
    'php_version' => PHP_VERSION,
    'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
    'request_method' => $_SERVER['REQUEST_METHOD'],
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'N/A',
    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'N/A'
];

echo json_encode($headers_info, JSON_PRETTY_PRINT);
?>