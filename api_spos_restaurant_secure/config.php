<?php
/**
 * Configuración API Independiente Segura
 * Ubicación: custom/pos/frontend/api_spos_restaurant_secure/config.php
 */

// Configuración de Base de Datos (ACTUALIZAR CON TUS DATOS)
define('DB_HOST', 'localhost');
define('DB_NAME', 'nubesiel_siel');  // Cambiar por tu BD
define('DB_USER', 'nubesiel_sieladmin');           // Cambiar por tu usuario
define('DB_PASS', 'Siel9624@');          // Cambiar por tu password
define('DB_PREFIX', 'llx_');                  // Prefijo tablas Dolibarr

// Configuración de Seguridad
define('API_VERSION', '1.0');
define('MAX_FILE_SIZE', 5 * 1024 * 1024);    // 5MB
define('ALLOWED_ORIGINS', serialize([
    'http://localhost:3000',                   // Desarrollo
    'https://tu-frontend.com'                  // Producción - CAMBIAR
]));

// Tipos de archivo permitidos para upload
define('ALLOWED_IMAGE_TYPES', serialize([
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp'
]));

// Directorio de uploads
define('UPLOAD_DIR', __DIR__ . '/../../../../documents/spos_restaurant/');

// Configuración de CORS
define('CORS_ORIGINS', serialize([
    'http://localhost:3000',
    'https://siel.nubesiel.top/'                  // CAMBIAR
]));

// Token de API válidos (en producción, usar BD)
define('VALID_API_TOKENS', serialize([
    'bf6366f9859b5d2c7522ae155e2d834157419421',             // CAMBIAR - Token principal
    'bf6366f9859b5d2c7522ae155e2d834157419421'                  // CAMBIAR - Token backup
]));

// Configuración de logs
define('ENABLE_LOGGING', true);
define('LOG_FILE', __DIR__ . '/logs/api.log');

// Timezone
date_default_timezone_set('America/Guatemala');

// Función para log
function writeLog($message, $level = 'INFO') {
    if (!ENABLE_LOGGING) return;
    
    $logDir = dirname(LOG_FILE);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[{$timestamp}] [{$level}] {$message}" . PHP_EOL;
    
    file_put_contents(LOG_FILE, $logMessage, FILE_APPEND | LOCK_EX);
}

// Función para obtener configuración de origen permitido
function isOriginAllowed($origin) {
    $allowedOrigins = unserialize(CORS_ORIGINS);
    return in_array($origin, $allowedOrigins);
}

// Función para validar token
function isValidToken($token) {
    $validTokens = unserialize(VALID_API_TOKENS);
    return in_array($token, $validTokens);
}
?>