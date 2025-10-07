<?php
/**
 * API Independiente SPOS Restaurant - VERSIÓN PHP 5.x COMPATIBLE
 * Ubicación: custom/pos/frontend/api_spos_restaurant_secure/index.php
 */

// ========================
// CORS CORREGIDO - PERMITE MÚLTIPLES ORÍGENES
// ========================

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowedOrigins = array(
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'https://siel.nubesiel.top',
    'https://nubesiel.top'
);

// Configurar CORS dinámicamente
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    // Para desarrollo local
    if (preg_match('/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/', $origin)) {
        header("Access-Control-Allow-Origin: $origin");
    } else {
        header("Access-Control-Allow-Origin: https://siel.nubesiel.top");
    }
}

header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Max-Age: 86400');
header('Content-Type: application/json; charset=utf-8');

// Responder a OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(array('status' => 'OK', 'message' => 'CORS preflight successful'));
    exit();
}

// ========================
// LOGGING
// ========================
function writeLog($message, $level = 'INFO') {
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[{$timestamp}] [{$level}] {$message}\n";
    $logFile = __DIR__ . '/logs/api.log';
    @file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
}

writeLog("=== NEW REQUEST ===");
writeLog("Method: " . $_SERVER['REQUEST_METHOD']);
writeLog("URI: " . (isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : 'N/A'));
writeLog("PATH_INFO: " . (isset($_SERVER['PATH_INFO']) ? $_SERVER['PATH_INFO'] : 'N/A'));
writeLog("Origin: " . $origin);

/**
 * Configuración de BD directa (SIN Dolibarr) - PHP 5.x Compatible
 */
class SecureRestaurantApi 
{
    private $db;
    private $config;
    
    public function __construct() 
    {
        // Configuración de BD directa
        $this->config = array(
            'host' => 'localhost',
            'dbname' => 'nubesiel_siel',
            'user' => 'nubesiel_sieladmin',
            'password' => 'Siel9624@',
            'prefix' => 'llx_' // Prefijo de tablas Dolibarr
        );
        
        $this->connectDb();
    }
    

     public function processPartialPayments($invoiceId) 
    {
        require_once __DIR__ . '/endpoints/payments.php';
        $paymentsEndpoint = new PaymentsEndpoint($this->db, $this);
        $paymentsEndpoint->processPartialPayments($invoiceId);
    }
    
     
    public function getPaymentMethods() 
    {
        require_once __DIR__ . '/endpoints/payments.php';
        $paymentsEndpoint = new PaymentsEndpoint($this->db, $this);
        $paymentsEndpoint->getPaymentMethods();
    }

   
    public function getPaymentStatistics($entity) 
    {
        require_once __DIR__ . '/endpoints/payments.php';
        $paymentsEndpoint = new PaymentsEndpoint($this->db, $this);
        $paymentsEndpoint->getPaymentStatistics($entity);
    }

   
    public function getInvoicePaymentStatus($invoiceId) 
    {
        require_once __DIR__ . '/endpoints/payments.php';
        $paymentsEndpoint = new PaymentsEndpoint($this->db, $this);
        $paymentsEndpoint->getPaymentStatus($invoiceId);
    }

   
    public function deleteRestaurantPayment($paymentId) 
    {
        require_once __DIR__ . '/endpoints/payments.php';
        $paymentsEndpoint = new PaymentsEndpoint($this->db, $this);
        $paymentsEndpoint->deletePayment($paymentId);
    }


    private function connectDb() 
    {
        try {
            $dsn = "mysql:host={$this->config['host']};dbname={$this->config['dbname']};charset=utf8";
            $options = array(
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            );
            $this->db = new PDO($dsn, $this->config['user'], $this->config['password'], $options);
            writeLog("Database connected successfully");
        } catch (PDOException $e) {
            writeLog("Database connection failed: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Database connection failed');
        }
    }
    
    /**
     * ✅ NUEVO: Endpoint de test (SIN autenticación)
     */
    public function testEndpoint() 
    {
        writeLog("Test endpoint called");
        
        $info = array(
            'status' => 'OK',
            'message' => 'API SPOS Restaurant funcionando correctamente',
            'version' => '2.0.1-php5-compatible',
            'timestamp' => date('Y-m-d H:i:s'),
            'method' => $_SERVER['REQUEST_METHOD'],
            'cors_origin' => isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : 'N/A',
            'server_info' => array(
                'php_version' => PHP_VERSION,
                'server_software' => isset($_SERVER['SERVER_SOFTWARE']) ? $_SERVER['SERVER_SOFTWARE'] : 'Unknown'
            )
        );
        
        // Test de BD simple
        try {
            $result = $this->db->query("SELECT COUNT(*) as count FROM {$this->config['prefix']}user")->fetch();
            $info['database_info'] = array(
                'database_name' => $this->config['dbname'],
                'prefix' => $this->config['prefix'],
                'user_count' => $result['count'],
                'status' => 'connected'
            );
        } catch (Exception $e) {
            $info['database_info'] = array(
                'status' => 'error',
                'error' => $e->getMessage()
            );
        }
        
        writeLog("Test endpoint success");
        $this->sendSuccess($info);
    }
    
    /**
     * Autenticación JWT/Token segura
     */
    public function authenticate() 
    {
        $token = $this->getBearerToken();
        
        if (empty($token)) {
            writeLog("Authentication FAILED: No token provided", 'WARN');
            writeLog("Request method: " . $_SERVER['REQUEST_METHOD']);
            writeLog("Request URI: " . $_SERVER['REQUEST_URI']);
            writeLog("User agent: " . (isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : 'N/A'));
            $this->sendError(401, 'Bearer token required');
        }
        
        writeLog("Authenticating token: " . substr($token, 0, 10) . "...");
        
        try {
            // Validar token en BD
            $stmt = $this->db->prepare("
                SELECT u.rowid, u.login, u.admin, u.entity 
                FROM {$this->config['prefix']}user u 
                JOIN {$this->config['prefix']}api_keys ak ON u.rowid = ak.fk_user 
                WHERE ak.key_value = ? AND ak.is_active = 1 AND u.statut = 1
            ");
            
            $stmt->execute(array($token));
            $user = $stmt->fetch();
            
            if (!$user) {
                writeLog("Authentication FAILED: Invalid token - " . substr($token, 0, 10) . "...", 'WARN');
                writeLog("Token not found in database or user inactive");
                $this->sendError(401, 'Invalid or expired token');
            }
            
            writeLog("Authentication SUCCESS for user: " . $user['login'] . " (ID: " . $user['rowid'] . ")");
            return $user;
            
        } catch (PDOException $e) {
            writeLog("Authentication ERROR: Database error - " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Authentication system error');
        }
    }
    
    private function getBearerToken() 
    {
        writeLog("=== TOKEN DETECTION DEBUG ===");
        
        $token = null;
        $source = 'none';
        
        // Método 1: getallheaders() - más confiable en Apache
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            writeLog("getallheaders available: " . json_encode($headers));
            
            // Buscar Authorization header (case-insensitive)
            foreach ($headers as $key => $value) {
                if (strtolower($key) === 'authorization') {
                    writeLog("Found Authorization header: $value");
                    if (preg_match('/Bearer\s+(.*)$/i', $value, $matches)) {
                        $token = $matches[1];
                        $source = 'getallheaders_Authorization';
                        writeLog("Bearer token extracted: " . substr($token, 0, 10) . "...");
                        break;
                    }
                }
                
                if (strtolower($key) === 'x-api-key') {
                    writeLog("Found X-API-Key header: $value");
                    if (!$token) {
                        $token = $value;
                        $source = 'getallheaders_X-API-Key';
                        writeLog("X-API-Key token extracted: " . substr($token, 0, 10) . "...");
                    }
                }
            }
        } else {
            writeLog("getallheaders() not available");
        }
        
        // Método 2: $_SERVER variables HTTP_*
        if (!$token) {
            writeLog("Trying \$_SERVER method...");
            
            if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
                writeLog("Found \$_SERVER['HTTP_AUTHORIZATION']: " . $_SERVER['HTTP_AUTHORIZATION']);
                if (preg_match('/Bearer\s+(.*)$/i', $_SERVER['HTTP_AUTHORIZATION'], $matches)) {
                    $token = $matches[1];
                    $source = 'SERVER_HTTP_AUTHORIZATION';
                    writeLog("Bearer token from \$_SERVER: " . substr($token, 0, 10) . "...");
                }
            }
            
            if (!$token && isset($_SERVER['HTTP_X_API_KEY'])) {
                writeLog("Found \$_SERVER['HTTP_X_API_KEY']: " . $_SERVER['HTTP_X_API_KEY']);
                $token = $_SERVER['HTTP_X_API_KEY'];
                $source = 'SERVER_HTTP_X_API_KEY';
                writeLog("X-API-Key from \$_SERVER: " . substr($token, 0, 10) . "...");
            }
        }
        
        // Método 3: apache_request_headers() si está disponible
        if (!$token && function_exists('apache_request_headers')) {
            writeLog("Trying apache_request_headers...");
            $apacheHeaders = apache_request_headers();
            writeLog("Apache headers: " . json_encode($apacheHeaders));
            
            if (isset($apacheHeaders['Authorization'])) {
                writeLog("Found Apache Authorization: " . $apacheHeaders['Authorization']);
                if (preg_match('/Bearer\s+(.*)$/i', $apacheHeaders['Authorization'], $matches)) {
                    $token = $matches[1];
                    $source = 'apache_Authorization';
                    writeLog("Bearer token from Apache: " . substr($token, 0, 10) . "...");
                }
            }
        }
        
        // Log de todos los headers $_SERVER para debug
        $serverHeaders = array();
        foreach ($_SERVER as $key => $value) {
            if (strpos($key, 'HTTP_') === 0) {
                $serverHeaders[$key] = $value;
            }
        }
        writeLog("All HTTP headers in \$_SERVER: " . json_encode($serverHeaders));
        
        writeLog("=== TOKEN DETECTION RESULT ===");
        writeLog("Token found: " . ($token ? 'YES' : 'NO'));
        writeLog("Source: " . $source);
        writeLog("Token preview: " . ($token ? substr($token, 0, 10) . "..." : 'N/A'));
        
        return $token;
    }
    
    /**
     * Crear layout (SIN CSRF issues)
     */
    public function createLayout() 
    {
        $user = $this->authenticate();
        $data = $this->getJsonInput();
        
        writeLog("Creating layout: " . json_encode($data));
        
        if (empty($data['entity'])) {
            $this->sendError(400, 'Entity required');
        }
        
        try {
            // Verificar si ya existe layout activo
            $existingStmt = $this->db->prepare("
                SELECT rowid FROM {$this->config['prefix']}spos_restaurant_layout 
                WHERE entity = ? AND is_active = 1
            ");
            $existingStmt->execute(array($data['entity']));
            $existing = $existingStmt->fetch();
            
            if ($existing && empty($data['force_create'])) {
                writeLog("Layout already exists for entity: " . $data['entity']);
                $this->sendError(409, 'Layout already exists for this entity');
            }
            
            $stmt = $this->db->prepare("
                INSERT INTO {$this->config['prefix']}spos_restaurant_layout 
                (entity, name, description, background_width, background_height, date_creation, fk_user_creat, is_active)
                VALUES (?, ?, ?, ?, ?, NOW(), ?, 1)
            ");
            
            $stmt->execute(array(
                $data['entity'],
                isset($data['name']) ? $data['name'] : 'Layout Principal',
                isset($data['description']) ? $data['description'] : 'Configuración principal del restaurante',
                isset($data['background_width']) ? $data['background_width'] : 1000,
                isset($data['background_height']) ? $data['background_height'] : 600,
                $user['rowid']
            ));
            
            $layoutId = $this->db->lastInsertId();
            writeLog("Layout created with ID: " . $layoutId);
            
            // Crear mesas por defecto si se solicita
            $tablesCreated = 0;
            if (!empty($data['create_default_tables'])) {
                $tablesCreated = $this->createDefaultTables($layoutId, $data['entity']);
                writeLog("Created {$tablesCreated} default tables");
            }
            
            // Obtener layout creado
            $layoutStmt = $this->db->prepare("
                SELECT * FROM {$this->config['prefix']}spos_restaurant_layout WHERE rowid = ?
            ");
            $layoutStmt->execute(array($layoutId));
            $createdLayout = $layoutStmt->fetch();
            
            $this->sendSuccess(array(
                'success' => true,
                'layout_id' => $layoutId,
                'layout' => $createdLayout,
                'tables_created' => $tablesCreated,
                'message' => 'Layout creado exitosamente'
            ));
            
        } catch (PDOException $e) {
            writeLog("Create layout error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Database error: ' . $e->getMessage());
        }
    }
    
    /**
     * Obtener layout
     */
    public function getLayout($entity) 
    {
        $this->authenticate();
        
        writeLog("Getting layout for entity: " . $entity);
        
        try {
            $stmt = $this->db->prepare("
                SELECT l.*, u.login as created_by_user
                FROM {$this->config['prefix']}spos_restaurant_layout l
                LEFT JOIN {$this->config['prefix']}user u ON l.fk_user_creat = u.rowid
                WHERE l.entity = ? AND l.is_active = 1 
                ORDER BY l.date_creation DESC
                LIMIT 1
            ");
            
            $stmt->execute(array($entity));
            $layout = $stmt->fetch();
            
            if (!$layout) {
                writeLog("Layout not found for entity: " . $entity);
                $this->sendError(404, 'Layout not found for entity: ' . $entity);
            }
            
            writeLog("Layout found: " . $layout['rowid']);
            $this->sendSuccess($layout);
            
        } catch (PDOException $e) {
            writeLog("Get layout error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Database error');
        }
    }
    
    /**
     * ✅ NUEVO: Obtener mesas de un layout
     */
    public function getLayoutTables($layoutId) 
    {
        $this->authenticate();
        
        writeLog("Getting tables for layout: " . $layoutId);
        
        try {
            $stmt = $this->db->prepare("
                SELECT * FROM {$this->config['prefix']}spos_restaurant_mesas 
                WHERE fk_layout = ? AND is_active = 1 
                ORDER BY numero ASC
            ");
            
            $stmt->execute(array($layoutId));
            $tables = $stmt->fetchAll();
            
            writeLog("Found " . count($tables) . " tables");
            $this->sendSuccess($tables);
            
        } catch (PDOException $e) {
            writeLog("Get tables error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Database error');
        }
    }
    
    /**
     * ✅ NUEVO: Obtener elementos de un layout
     */
    public function getLayoutElements($layoutId) 
    {
        $this->authenticate();
        
        writeLog("Getting elements for layout: " . $layoutId);
        
        try {
            // Por ahora devolver array vacío ya que la tabla puede no existir
            $elements = array();
            
            // Intentar obtener elementos si la tabla existe
            try {
                $stmt = $this->db->prepare("
                    SELECT * FROM {$this->config['prefix']}spos_restaurant_elementos 
                    WHERE fk_layout = ? AND is_active = 1 
                    ORDER BY date_creation ASC
                ");
                
                $stmt->execute(array($layoutId));
                $elements = $stmt->fetchAll();
            } catch (PDOException $e) {
                // Tabla no existe, devolver array vacío
                writeLog("Elements table may not exist: " . $e->getMessage(), 'WARN');
            }
            
            writeLog("Found " . count($elements) . " elements");
            $this->sendSuccess($elements);
            
        } catch (Exception $e) {
            writeLog("Get elements error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Error getting elements');
        }
    }
    
    /**
     * ✅ NUEVO: Obtener proposals de una entidad - CORREGIDO
     */
    public function getProposals($entity) 
    {
        $this->authenticate();
        
        writeLog("Getting proposals for entity: " . $entity);
        
        try {
            // Query simplificada para evitar problemas con campos faltantes
            $stmt = $this->db->prepare("
                SELECT p.rowid as id, p.ref, p.fk_statut, p.total_ttc, p.datec as date_creation,
                       p.fk_soc, s.nom as client_name, p.fk_spos_mesa
                FROM {$this->config['prefix']}propal p
                LEFT JOIN {$this->config['prefix']}societe s ON p.fk_soc = s.rowid
                WHERE p.entity = ? AND p.fk_statut IN (0, 1, 2)
                ORDER BY p.datec DESC
                LIMIT 100
            ");
            
            $stmt->execute(array($entity));
            $proposals = $stmt->fetchAll();
            
            // Enriquecer con datos de mesa si existen
            foreach ($proposals as $key => $proposal) {
                $proposals[$key]['numero_mesa'] = $proposal['id']; // Fallback
                $proposals[$key]['nombre_mesa'] = "Mesa " . $proposal['id'];
                
                // Intentar obtener datos reales de mesa si existe
                if ($proposal['fk_spos_mesa']) {
                    try {
                        $mesaStmt = $this->db->prepare("
                            SELECT numero, nombre FROM {$this->config['prefix']}spos_restaurant_mesas 
                            WHERE rowid = ?
                        ");
                        $mesaStmt->execute(array($proposal['fk_spos_mesa']));
                        $mesa = $mesaStmt->fetch();
                        
                        if ($mesa) {
                            $proposals[$key]['numero_mesa'] = $mesa['numero'];
                            $proposals[$key]['nombre_mesa'] = $mesa['nombre'];
                        }
                    } catch (PDOException $e) {
                        // Mesa table might not exist, continue with fallback
                        writeLog("Mesa table access error (normal if not created yet): " . $e->getMessage(), 'WARN');
                    }
                }
            }
            
            writeLog("Found " . count($proposals) . " proposals");
            $this->sendSuccess($proposals);
            
        } catch (PDOException $e) {
            writeLog("Get proposals error: " . $e->getMessage(), 'ERROR');
            writeLog("SQL Error details: " . $e->getCode() . " - " . (isset($e->errorInfo[2]) ? $e->errorInfo[2] : 'N/A'), 'ERROR');
            $this->sendError(500, 'Database error: ' . $e->getMessage());
        }
    }
    




    public function getMesaProducts($mesaId) 
{
    $this->authenticate();
    
    writeLog("Getting products for mesa: " . $mesaId);
    
    try {
        // Verificar que la mesa/proposal existe
        $proposalStmt = $this->db->prepare("
            SELECT p.rowid, p.ref, p.fk_statut, p.total_ttc, p.note_private,
                   p.fk_soc, s.nom as client_name, p.fk_spos_mesa,
                   m.numero as mesa_numero, m.nombre as mesa_nombre
            FROM {$this->config['prefix']}propal p
            LEFT JOIN {$this->config['prefix']}societe s ON p.fk_soc = s.rowid
            LEFT JOIN {$this->config['prefix']}spos_restaurant_mesas m ON p.fk_spos_mesa = m.rowid
            WHERE p.rowid = ? AND p.fk_statut IN (0, 1, 2)
        ");
        
        $proposalStmt->execute(array($mesaId));
        $proposal = $proposalStmt->fetch();
        
        if (!$proposal) {
            writeLog("Proposal/Mesa not found: " . $mesaId);
            $this->sendError(404, 'Mesa no encontrada o cerrada');
        }
        
        // Obtener productos/líneas del proposal
        $productsStmt = $this->db->prepare("
            SELECT pd.rowid as line_id, pd.fk_product, pd.description, pd.qty, 
                   pd.subprice, pd.remise_percent, pd.total_ht, pd.total_ttc,
                   pd.rang, pd.product_type,
                   pr.ref as product_ref, pr.label as product_name, pr.price as product_price
            FROM {$this->config['prefix']}propaldet pd
            LEFT JOIN {$this->config['prefix']}product pr ON pd.fk_product = pr.rowid
            WHERE pd.fk_propal = ?
            ORDER BY pd.rang ASC
        ");
        
        $productsStmt->execute(array($mesaId));
        $products = $productsStmt->fetchAll();
        
        // Formatear productos para el frontend
        $formattedProducts = array();
        foreach ($products as $product) {
            $formattedProducts[] = array(
                'id' => (int)$product['fk_product'],
                'line_id' => (int)$product['line_id'],
                'ref' => $product['product_ref'] ?: 'N/A',
                'name' => $product['description'] ?: $product['product_name'] ?: 'Producto sin nombre',
                'price' => (float)$product['subprice'],
                'quantity' => (float)$product['qty'],
                'discount' => (float)$product['remise_percent'],
                'total' => (float)$product['total_ttc'],
                'note' => $this->extractNoteFromDescription($product['description']),
                'saved' => true, // Marca que viene del servidor
                'product_type' => (int)$product['product_type'],
                'rang' => (int)$product['rang']
            );
        }
        
        writeLog("Found " . count($formattedProducts) . " products for mesa " . $mesaId);
        
        $this->sendSuccess(array(
            'success' => true,
            'mesa_id' => (int)$mesaId,
            'products' => $formattedProducts,
            'total_products' => count($formattedProducts)
        ));
        
    } catch (PDOException $e) {
        writeLog("Get mesa products error: " . $e->getMessage(), 'ERROR');
        $this->sendError(500, 'Database error: ' . $e->getMessage());
    }
}

    /**
     * ✅ NUEVO: Obtener detalles completos de una mesa (mesa + productos + cliente + totales)
     * Endpoint: GET /table/{mesaId}/details
     */
    public function getMesaDetails($mesaId) 
    {
        $this->authenticate();
        
        writeLog("Getting complete details for mesa: " . $mesaId);
        
        try {
            // 1. Obtener información básica del proposal/mesa
            $proposalStmt = $this->db->prepare("
                SELECT p.rowid, p.ref, p.fk_statut, p.total_ht, p.total_ttc, 
                    p.note_private, p.note_public, p.datec, p.datep,
                    p.fk_soc, s.nom as client_name, s.address as client_address,
                    s.zip as client_zip, s.town as client_town, s.phone as client_phone,
                    s.email as client_email, s.siren as client_nit,
                    p.fk_spos_mesa, m.numero as mesa_numero, m.nombre as mesa_nombre,
                    m.capacidad as mesa_capacidad, m.pos_x, m.pos_y
                FROM {$this->config['prefix']}propal p
                LEFT JOIN {$this->config['prefix']}societe s ON p.fk_soc = s.rowid
                LEFT JOIN {$this->config['prefix']}spos_restaurant_mesas m ON p.fk_spos_mesa = m.rowid
                WHERE p.rowid = ? AND p.fk_statut IN (0, 1, 2)
            ");
            
            $proposalStmt->execute(array($mesaId));
            $proposal = $proposalStmt->fetch();
            
            if (!$proposal) {
                writeLog("Proposal/Mesa not found: " . $mesaId);
                $this->sendError(404, 'Mesa no encontrada o cerrada');
            }
            
            // 2. Obtener productos/líneas del proposal
            $productsStmt = $this->db->prepare("
                SELECT pd.rowid as line_id, pd.fk_product, pd.description, pd.qty, 
                    pd.subprice, pd.remise_percent, pd.total_ht, pd.total_ttc,
                    pd.rang, pd.product_type,
                    pr.ref as product_ref, pr.label as product_name, 
                    pr.price as product_price, pr.tosell
                FROM {$this->config['prefix']}propaldet pd
                LEFT JOIN {$this->config['prefix']}product pr ON pd.fk_product = pr.rowid
                WHERE pd.fk_propal = ?
                ORDER BY pd.rang ASC
            ");
            
            $productsStmt->execute(array($mesaId));
            $products = $productsStmt->fetchAll();
            
            // 3. Formatear productos para el frontend
            $formattedProducts = array();
            foreach ($products as $product) {
                $formattedProducts[] = array(
                    'id' => (int)$product['fk_product'],
                    'line_id' => (int)$product['line_id'],
                    'ref' => $product['product_ref'] ?: 'N/A',
                    'name' => $product['description'] ?: $product['product_name'] ?: 'Producto sin nombre',
                    'price' => (float)$product['subprice'],
                    'quantity' => (float)$product['qty'],
                    'discount' => (float)$product['remise_percent'],
                    'total' => (float)$product['total_ttc'],
                    'note' => $this->extractNoteFromDescription($product['description']),
                    'saved' => true, // Marca que viene del servidor
                    'product_type' => (int)$product['product_type'],
                    'rang' => (int)$product['rang'],
                    'available' => (int)($product['tosell'] ?: 1) === 1
                );
            }
            
            // 4. Formatear información del cliente
            $cliente = null;
            if ($proposal['fk_soc'] && $proposal['fk_soc'] != 1) {
                $cliente = array(
                    'id' => (int)$proposal['fk_soc'],
                    'name' => $proposal['client_name'],
                    'nit' => $proposal['client_nit'] ?: 'CF',
                    'address' => $proposal['client_address'],
                    'zip' => $proposal['client_zip'],
                    'town' => $proposal['client_town'],
                    'phone' => $proposal['client_phone'],
                    'email' => $proposal['client_email']
                );
            }
            
            // 5. Información de la mesa
            $mesaInfo = array(
                'id' => (int)$mesaId,
                'numero' => $proposal['mesa_numero'] ?: $mesaId,
                'nombre' => $proposal['mesa_nombre'] ?: "Mesa {$mesaId}",
                'capacidad' => (int)($proposal['mesa_capacidad'] ?: 4),
                'ref' => $proposal['ref'],
                'status' => $this->getStatusName($proposal['fk_statut']),
                'date_creation' => $proposal['datec'],
                'date_proposal' => $proposal['datep'],
                'pos_x' => (int)($proposal['pos_x'] ?: 0),
                'pos_y' => (int)($proposal['pos_y'] ?: 0)
            );
            
            // 6. Calcular totales
            $totales = array(
                'subtotal' => (float)$proposal['total_ht'],
                'total' => (float)$proposal['total_ttc'],
                'items_count' => count($formattedProducts),
                'total_quantity' => array_sum(array_column($formattedProducts, 'quantity'))
            );
            
            // 7. Extraer notas
            $notas = '';
            if (!empty($proposal['note_private'])) {
                $notas = $proposal['note_private'];
            } elseif (!empty($proposal['note_public'])) {
                $notas = $proposal['note_public'];
            }
            
            writeLog("Mesa details loaded: " . count($formattedProducts) . " products, client: " . ($cliente ? $cliente['name'] : 'none'));
            
            $response = array(
                'success' => true,
                'mesa' => $mesaInfo,
                'products' => $formattedProducts,
                'cliente' => $cliente,
                'notas' => $notas,
                'totales' => $totales,
                'timestamp' => date('Y-m-d H:i:s')
            );
            
            $this->sendSuccess($response);
            
        } catch (PDOException $e) {
            writeLog("Get mesa details error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Database error: ' . $e->getMessage());
        }
    }

    /**
     * Función auxiliar para extraer notas del campo description
     */
    private function extractNoteFromDescription($description) 
    {
        if (empty($description)) {
            return '';
        }
        
        // Buscar patrón "Nota: ..." en la descripción
        if (strpos($description, "\nNota: ") !== false) {
            $parts = explode("\nNota: ", $description);
            return isset($parts[1]) ? $parts[1] : '';
        }
        
        return '';
    }

    /**
     * Función auxiliar para obtener nombre del status
     */
    private function getStatusName($fkStatut) 
    {
        $status = (int)$fkStatut;
        switch ($status) {
            case 0: return 'LIBRE';
            case 1: return 'OCUPADA';
            case 2: return 'COBRANDO';
            default: return 'DESCONOCIDO';
        }
    }

      





    /**
     * ✅ NUEVO: Obtener estadísticas de proposals
     */
    public function getProposalStatistics($entity) 
    {
        $this->authenticate();
        
        writeLog("Getting proposal statistics for entity: " . $entity);
        
        try {
            $stmt = $this->db->prepare("
                SELECT 
                    COUNT(*) as total_proposals,
                    SUM(CASE WHEN fk_statut = 0 THEN 1 ELSE 0 END) as draft_count,
                    SUM(CASE WHEN fk_statut = 1 THEN 1 ELSE 0 END) as open_count,
                    SUM(CASE WHEN fk_statut = 2 THEN 1 ELSE 0 END) as closed_count,
                    SUM(total_ttc) as total_revenue
                FROM {$this->config['prefix']}propal 
                WHERE entity = ? AND fk_statut IN (0, 1, 2)
            ");
            
            $stmt->execute(array($entity));
            $stats = $stmt->fetch();
            
            $result = array(
                'general_stats' => array(
                    'total_proposals' => (int)$stats['total_proposals'],
                    'draft_count' => (int)$stats['draft_count'],
                    'open_count' => (int)$stats['open_count'],
                    'closed_count' => (int)$stats['closed_count'],
                    'total_revenue' => (float)$stats['total_revenue']
                ),
                'timestamp' => date('Y-m-d H:i:s')
            );
            
            writeLog("Statistics calculated successfully");
            $this->sendSuccess($result);
            
        } catch (PDOException $e) {
            writeLog("Get statistics error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Database error');
        }
    }
    
    /**
     * ✅ NUEVO: Abrir mesa (crear proposal)
     */
    public function openTable($tableNumber) 
    {
        $user = $this->authenticate();
        $data = $this->getJsonInput();
        
        writeLog("Opening table: " . $tableNumber . " for entity: " . (isset($data['entity']) ? $data['entity'] : 'N/A'));
        
        if (empty($data['entity'])) {
            $this->sendError(400, 'Entity required');
        }
        
        try {
            // Verificar si la mesa existe en configuración
            $tableStmt = $this->db->prepare("
                SELECT rowid, numero, nombre FROM {$this->config['prefix']}spos_restaurant_mesas 
                WHERE numero = ? AND entity = ? AND is_active = 1
            ");
            $tableStmt->execute(array($tableNumber, $data['entity']));
            $table = $tableStmt->fetch();
            
            if (!$table) {
                writeLog("Table not found in configuration: " . $tableNumber);
                $this->sendError(404, 'Table not found in configuration');
            }
            
            // Verificar si ya existe proposal activo para esta mesa
            $existingStmt = $this->db->prepare("
                SELECT rowid FROM {$this->config['prefix']}propal 
                WHERE fk_spos_mesa = ? AND entity = ? AND fk_statut IN (0, 1, 2)
            ");
            $existingStmt->execute(array($table['rowid'], $data['entity']));
            $existing = $existingStmt->fetch();
            
            if ($existing) {
                writeLog("Table already has active proposal: " . $existing['rowid']);
                $this->sendError(409, 'Mesa ya tiene una cuenta activa');
            }
            
            // Crear nuevo proposal para la mesa
            $ref = $this->generateProposalRef($data['entity']);
            
            $createStmt = $this->db->prepare("
                INSERT INTO {$this->config['prefix']}propal 
                (ref, entity, fk_soc, datep, datec, fk_user_author, fk_statut, fk_spos_mesa, note_private)
                VALUES (?, ?, 1, NOW(), NOW(), ?, 1, ?, ?)
            ");
            
            $note = "Mesa {$tableNumber} - {$table['nombre']} - Abierta: " . date('Y-m-d H:i:s');
            
            $createStmt->execute(array(
                $ref,
                $data['entity'],
                $user['rowid'],
                $table['rowid'],
                $note
            ));
            
            $proposalId = $this->db->lastInsertId();
            writeLog("Proposal created for table: " . $proposalId);
            
            $this->sendSuccess(array(
                'success' => true,
                'proposal_id' => $proposalId,
                'ref' => $ref,
                'table_number' => $tableNumber,
                'table_name' => $table['nombre'],
                'message' => "Mesa {$tableNumber} abierta exitosamente"
            ));
            
        } catch (PDOException $e) {
            writeLog("Open table error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Database error: ' . $e->getMessage());
        }
    }
    
    /**
     * ✅ NUEVO: Cerrar mesa (eliminar proposal)
     */
    public function closeTable($tableId) 
    {
        $user = $this->authenticate();
        $data = $this->getJsonInput();
        
        writeLog("Closing table: " . $tableId);
        
        try {
            // Obtener información del proposal
            $proposalStmt = $this->db->prepare("
                SELECT p.rowid, p.ref, m.numero, m.nombre 
                FROM {$this->config['prefix']}propal p
                LEFT JOIN {$this->config['prefix']}spos_restaurant_mesas m ON p.fk_spos_mesa = m.rowid
                WHERE p.rowid = ? AND p.fk_statut IN (0, 1, 2)
            ");
            $proposalStmt->execute(array($tableId));
            $proposal = $proposalStmt->fetch();
            
            if (!$proposal) {
                writeLog("Proposal not found: " . $tableId);
                $this->sendError(404, 'Cuenta de mesa no encontrada');
            }
            
            // Eliminar líneas del proposal
            $deleteLinesStmt = $this->db->prepare("
                DELETE FROM {$this->config['prefix']}propaldet WHERE fk_propal = ?
            ");
            $deleteLinesStmt->execute(array($tableId));
            
            // Eliminar proposal
            $deleteStmt = $this->db->prepare("
                DELETE FROM {$this->config['prefix']}propal WHERE rowid = ?
            ");
            $deleteStmt->execute(array($tableId));
            
            writeLog("Table closed successfully: " . $proposal['numero']);
            
            $this->sendSuccess(array(
                'success' => true,
                'message' => "Mesa {$proposal['numero']} cerrada exitosamente",
                'table_number' => $proposal['numero'],
                'ref' => $proposal['ref']
            ));
            
        } catch (PDOException $e) {
            writeLog("Close table error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Database error: ' . $e->getMessage());
        }
    }
    
    /**
     * ✅ NUEVO: Agregar producto a mesa
     */
    public function addProductToTable($tableId) 
    {
        $user = $this->authenticate();
        $data = $this->getJsonInput();
        
        writeLog("Adding product to table: " . $tableId . " - Product: " . json_encode($data));
        
        if (empty($data['id']) || empty($data['quantity'])) {
            $this->sendError(400, 'Product ID and quantity required');
        }
        
        try {
            // Verificar que el proposal existe
            $proposalStmt = $this->db->prepare("
                SELECT rowid FROM {$this->config['prefix']}propal 
                WHERE rowid = ? AND fk_statut IN (0, 1, 2)
            ");
            $proposalStmt->execute(array($tableId));
            $proposal = $proposalStmt->fetch();
            
            if (!$proposal) {
                $this->sendError(404, 'Mesa no encontrada o cerrada');
            }
            
            // Obtener información del producto
            $productStmt = $this->db->prepare("
                SELECT rowid, ref, label, price FROM {$this->config['prefix']}product 
                WHERE rowid = ? AND tosell = 1
            ");
            $productStmt->execute(array($data['id']));
            $product = $productStmt->fetch();
            
            if (!$product) {
                $this->sendError(404, 'Producto no encontrado');
            }
            
            // Calcular precios
            $quantity = floatval($data['quantity']);
            $unitPrice = floatval(isset($data['price']) ? $data['price'] : $product['price']);
            $discount = floatval(isset($data['discount']) ? $data['discount'] : 0);
            
            $subprice = $unitPrice;
            $remisePercent = $discount;
            $totalHt = $quantity * $unitPrice * (1 - $discount / 100);
            $totalTtc = $totalHt; // Sin IVA por simplicidad
            
            // Verificar si ya existe línea para este producto
            $existingStmt = $this->db->prepare("
                SELECT rowid, qty FROM {$this->config['prefix']}propaldet 
                WHERE fk_propal = ? AND fk_product = ?
            ");
            $existingStmt->execute(array($tableId, $data['id']));
            $existing = $existingStmt->fetch();
            
            if ($existing) {
                // Actualizar cantidad existente
                $newQty = $existing['qty'] + $quantity;
                $newTotal = $newQty * $unitPrice * (1 - $discount / 100);
                
                $updateStmt = $this->db->prepare("
                    UPDATE {$this->config['prefix']}propaldet 
                    SET qty = ?, total_ht = ?, total_ttc = ?
                    WHERE rowid = ?
                ");
                $updateStmt->execute(array($newQty, $newTotal, $newTotal, $existing['rowid']));
                
                writeLog("Product quantity updated: " . $newQty);
            } else {
                // Obtener próximo rang
                $rangStmt = $this->db->prepare("
                    SELECT COALESCE(MAX(rang), 0) + 1 as next_rang 
                    FROM {$this->config['prefix']}propaldet 
                    WHERE fk_propal = ?
                ");
                $rangStmt->execute(array($tableId));
                $rangResult = $rangStmt->fetch();
                $nextRang = $rangResult['next_rang'];
                
                // Crear nueva línea
                $insertStmt = $this->db->prepare("
                    INSERT INTO {$this->config['prefix']}propaldet 
                    (fk_propal, fk_product, description, product_type, qty, subprice, 
                     remise_percent, total_ht, total_ttc, rang)
                    VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
                ");
                
                $description = isset($data['name']) ? $data['name'] : $product['label'];
                if (!empty($data['note'])) {
                    $description .= "\nNota: " . $data['note'];
                }
                
                $insertStmt->execute(array(
                    $tableId, $data['id'], $description, $quantity, 
                    $subprice, $remisePercent, $totalHt, $totalTtc, $nextRang
                ));
                
                writeLog("New product line created");
            }
            
            // Actualizar totales del proposal
            $this->updateProposalTotals($tableId);
            
            $this->sendSuccess(array(
                'success' => true,
                'message' => 'Producto agregado a la mesa exitosamente',
                'product' => $product['label'],
                'quantity' => $quantity
            ));
            
        } catch (PDOException $e) {
            writeLog("Add product error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Database error: ' . $e->getMessage());
        }
    }
    
    /**
     * ✅ NUEVO: Crear mesa
     */
    public function createTable() 
    {
        $user = $this->authenticate();
        $data = $this->getJsonInput();
        
        writeLog("Creating table: " . json_encode($data));
        
        if (empty($data['numero']) || empty($data['fk_layout'])) {
            $this->sendError(400, 'Table number and layout ID required');
        }
        
        try {
            // Verificar que no existe mesa con el mismo número
            $existingStmt = $this->db->prepare("
                SELECT rowid FROM {$this->config['prefix']}spos_restaurant_mesas 
                WHERE numero = ? AND entity = ? AND is_active = 1
            ");
            $existingStmt->execute(array($data['numero'], $data['entity']));
            $existing = $existingStmt->fetch();
            
            if ($existing) {
                $this->sendError(409, 'Ya existe una mesa con ese número');
            }
            
            $stmt = $this->db->prepare("
                INSERT INTO {$this->config['prefix']}spos_restaurant_mesas 
                (fk_layout, entity, numero, nombre, pos_x, pos_y, ancho, alto, 
                 capacidad, color, date_creation, fk_user_creat, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, 1)
            ");
            
            $stmt->execute(array(
                $data['fk_layout'],
                $data['entity'],
                $data['numero'],
                isset($data['nombre']) ? $data['nombre'] : "Mesa {$data['numero']}",
                isset($data['pos_x']) ? $data['pos_x'] : 100,
                isset($data['pos_y']) ? $data['pos_y'] : 100,
                isset($data['ancho']) ? $data['ancho'] : 80,
                isset($data['alto']) ? $data['alto'] : 80,
                isset($data['capacidad']) ? $data['capacidad'] : 4,
                isset($data['color']) ? $data['color'] : '#4F46E5',
                $user['rowid']
            ));
            
            $tableId = $this->db->lastInsertId();
            writeLog("Table created with ID: " . $tableId);
            
            $this->sendSuccess(array(
                'success' => true,
                'table_id' => $tableId,
                'message' => "Mesa {$data['numero']} creada exitosamente"
            ));
            
        } catch (PDOException $e) {
            writeLog("Create table error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Database error: ' . $e->getMessage());
        }
    }
    
    /**
     * ✅ NUEVO: Actualizar posición de mesa
     */
    public function updateTablePosition($tableId) 
    {
        $user = $this->authenticate();
        $data = $this->getJsonInput();
        
        writeLog("Updating table position: " . $tableId . " - " . json_encode($data));
        
        if (!isset($data['pos_x']) || !isset($data['pos_y'])) {
            $this->sendError(400, 'Position coordinates required');
        }
        
        try {
            $stmt = $this->db->prepare("
                UPDATE {$this->config['prefix']}spos_restaurant_mesas 
                SET pos_x = ?, pos_y = ?, fk_user_modif = ?
                WHERE rowid = ? AND is_active = 1
            ");
            
            $stmt->execute(array(
                $data['pos_x'],
                $data['pos_y'],
                $user['rowid'],
                $tableId
            ));
            
            if ($stmt->rowCount() === 0) {
                $this->sendError(404, 'Mesa no encontrada');
            }
            
            writeLog("Table position updated");
            
            $this->sendSuccess(array(
                'success' => true,
                'message' => 'Posición de mesa actualizada'
            ));
            
        } catch (PDOException $e) {
            writeLog("Update position error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Database error: ' . $e->getMessage());
        }
    }
    
    /**
     * ✅ NUEVO: Eliminar mesa
     */
    public function deleteTable($tableId) 
    {
        $user = $this->authenticate();
        
        writeLog("Deleting table: " . $tableId);
        
        try {
            // Verificar que no hay proposals activos
            $activeStmt = $this->db->prepare("
                SELECT rowid FROM {$this->config['prefix']}propal 
                WHERE fk_spos_mesa = ? AND fk_statut IN (0, 1, 2)
            ");
            $activeStmt->execute(array($tableId));
            $active = $activeStmt->fetch();
            
            if ($active) {
                $this->sendError(409, 'No se puede eliminar mesa con cuenta activa');
            }
            
            // Marcar como inactiva en lugar de eliminar
            $stmt = $this->db->prepare("
                UPDATE {$this->config['prefix']}spos_restaurant_mesas 
                SET is_active = 0, fk_user_modif = ?
                WHERE rowid = ?
            ");
            
            $stmt->execute(array($user['rowid'], $tableId));
            
            if ($stmt->rowCount() === 0) {
                $this->sendError(404, 'Mesa no encontrada');
            }
            
            writeLog("Table deleted");
            
            $this->sendSuccess(array(
                'success' => true,
                'message' => 'Mesa eliminada exitosamente'
            ));
            
        } catch (PDOException $e) {
            writeLog("Delete table error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Database error: ' . $e->getMessage());
        }
    }
    
    /**
     * Subir imagen de fondo - CORREGIDO COMPLETAMENTE
     */
    public function uploadLayoutImage() 
    {
        writeLog("=== UPLOAD IMAGE REQUEST START ===");
        writeLog("Method: " . $_SERVER['REQUEST_METHOD']);
        writeLog("Content-Type: " . (isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : 'N/A'));
        writeLog("Files received: " . json_encode(array_keys($_FILES)));
        writeLog("POST data: " . json_encode($_POST));
        
        $user = $this->authenticate();
        writeLog("User authenticated: " . $user['login']);
        
        // Verificar que se recibió un archivo
        if (!isset($_FILES['image'])) {
            writeLog("No image file in \$_FILES", 'ERROR');
            writeLog("Available \$_FILES: " . json_encode($_FILES), 'ERROR');
            $this->sendError(400, 'No image file provided');
        }
        
        // Verificar layout_id
        $layoutId = isset($_POST['layout_id']) ? $_POST['layout_id'] : null;
        if (!$layoutId) {
            writeLog("No layout_id in \$_POST", 'ERROR');
            writeLog("Available \$_POST: " . json_encode($_POST), 'ERROR');
            $this->sendError(400, 'Layout ID required');
        }
        
        writeLog("Processing upload for layout ID: " . $layoutId);
        
        // Validar archivo
        $file = $_FILES['image'];
        writeLog("File info: " . json_encode(array(
            'name' => $file['name'],
            'type' => $file['type'],
            'size' => $file['size'],
            'tmp_name' => $file['tmp_name'],
            'error' => $file['error']
        )));
        
        // Verificar errores de upload
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $uploadErrors = array(
                UPLOAD_ERR_INI_SIZE => 'File too large (php.ini limit)',
                UPLOAD_ERR_FORM_SIZE => 'File too large (form limit)',
                UPLOAD_ERR_PARTIAL => 'File partially uploaded',
                UPLOAD_ERR_NO_FILE => 'No file uploaded',
                UPLOAD_ERR_NO_TMP_DIR => 'No temp directory',
                UPLOAD_ERR_CANT_WRITE => 'Cannot write to disk',
                UPLOAD_ERR_EXTENSION => 'Extension blocked upload'
            );
            
            $errorMsg = isset($uploadErrors[$file['error']]) ? $uploadErrors[$file['error']] : 'Unknown upload error';
            writeLog("Upload error: " . $errorMsg, 'ERROR');
            $this->sendError(400, 'Upload error: ' . $errorMsg);
        }
        
        // Validar tipo de archivo
        $allowedTypes = array('image/jpeg', 'image/jpg', 'image/png', 'image/gif');
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        
        writeLog("Detected MIME type: " . $mimeType);
        
        if (!in_array($mimeType, $allowedTypes) && !in_array($file['type'], $allowedTypes)) {
            writeLog("Invalid file type. MIME: {$mimeType}, Reported: {$file['type']}", 'ERROR');
            $this->sendError(400, 'Invalid image type. Allowed: JPEG, PNG, GIF');
        }
        
        // Validar tamaño
        $maxSize = 5 * 1024 * 1024; // 5MB
        if ($file['size'] > $maxSize) {
            writeLog("File too large: {$file['size']} bytes (max: {$maxSize})", 'ERROR');
            $this->sendError(400, 'Image too large. Maximum: 5MB');
        }
        
        try {
            // Verificar que el layout existe
            $layoutStmt = $this->db->prepare("
                SELECT rowid, name FROM {$this->config['prefix']}spos_restaurant_layout 
                WHERE rowid = ? AND is_active = 1
            ");
            $layoutStmt->execute(array($layoutId));
            $layout = $layoutStmt->fetch();
            
            if (!$layout) {
                writeLog("Layout not found: " . $layoutId, 'ERROR');
                $this->sendError(404, 'Layout not found');
            }
            
            writeLog("Layout found: " . $layout['name']);
            
            // Determinar directorio de upload
            $baseUploadDir = __DIR__ . '/../../../../documents/spos_restaurant/layouts/';
            $webUploadDir = __DIR__ . '/../../../documents/spos_restaurant/layouts/';
            
            // Probar diferentes rutas para encontrar el directorio correcto
            $uploadDir = null;
            $relativePath = null;
            
            $testDirs = array($baseUploadDir, $webUploadDir);
            foreach ($testDirs as $testDir) {
                $parentDir = dirname($testDir);
                writeLog("Testing upload directory: " . $testDir);
                writeLog("Parent directory exists: " . (is_dir($parentDir) ? 'YES' : 'NO'));
                writeLog("Directory writable: " . (is_writable($parentDir) ? 'YES' : 'NO'));
                
                if (is_dir($parentDir) && is_writable($parentDir)) {
                    if (!is_dir($testDir)) {
                        writeLog("Creating directory: " . $testDir);
                        if (mkdir($testDir, 0755, true)) {
                            writeLog("Directory created successfully");
                        } else {
                            writeLog("Failed to create directory", 'WARN');
                            continue;
                        }
                    }
                    
                    if (is_dir($testDir) && is_writable($testDir)) {
                        $uploadDir = $testDir;
                        // Calcular path relativo desde el root web
                        if (strpos($testDir, '/documents/') !== false) {
                            $relativePath = 'documents/spos_restaurant/layouts/';
                        }
                        writeLog("Using upload directory: " . $uploadDir);
                        break;
                    }
                }
            }
            
            if (!$uploadDir) {
                writeLog("No writable upload directory found", 'ERROR');
                $this->sendError(500, 'Upload directory not accessible');
            }
            
            // Generar nombre único y seguro
            $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
            $safeName = preg_replace('/[^a-zA-Z0-9]/', '_', pathinfo($file['name'], PATHINFO_FILENAME));
            $filename = 'layout_' . $layoutId . '_' . $safeName . '_' . time() . '.' . $extension;
            $uploadPath = $uploadDir . $filename;
            
            if (!$relativePath) {
                $relativePath = 'documents/spos_restaurant/layouts/';
            }
            $relativeFilePath = $relativePath . $filename;
            
            writeLog("Final upload path: " . $uploadPath);
            writeLog("Relative path: " . $relativeFilePath);
            
            // Mover archivo
            if (move_uploaded_file($file['tmp_name'], $uploadPath)) {
                writeLog("File moved successfully to: " . $uploadPath);
                
                // Verificar que el archivo se movió correctamente
                if (!file_exists($uploadPath)) {
                    writeLog("File does not exist after move", 'ERROR');
                    $this->sendError(500, 'File upload verification failed');
                }
                
                writeLog("File size after move: " . filesize($uploadPath) . " bytes");
                
                // Actualizar BD
                $updateStmt = $this->db->prepare("
                    UPDATE {$this->config['prefix']}spos_restaurant_layout 
                    SET background_image = ?,  fk_user_modif = ?
                    WHERE rowid = ?
                ");
                
                $updateResult = $updateStmt->execute(array($relativeFilePath, $user['rowid'], $layoutId));
                
                if (!$updateResult) {
                    writeLog("Database update failed", 'ERROR');
                    // Limpiar archivo subido
                    @unlink($uploadPath);
                    $this->sendError(500, 'Database update failed');
                }
                
                writeLog("Database updated successfully");
                writeLog("Image upload completed: " . $filename);
                
                $response = array(
                    'success' => true,
                    'image_path' => $relativeFilePath,
                    'filename' => $filename,
                    'full_url' => "https://siel.nubesiel.top/" . $relativeFilePath,
                    'file_size' => filesize($uploadPath),
                    'upload_directory' => $uploadDir
                );
                
                writeLog("Upload response: " . json_encode($response));
                $this->sendSuccess($response);
                
            } else {
                writeLog("move_uploaded_file failed", 'ERROR');
                writeLog("Source: " . $file['tmp_name']);
                writeLog("Destination: " . $uploadPath);
                writeLog("Source exists: " . (file_exists($file['tmp_name']) ? 'YES' : 'NO'));
                writeLog("Destination dir writable: " . (is_writable($uploadDir) ? 'YES' : 'NO'));
                $this->sendError(500, 'Failed to move uploaded file');
            }
            
        } catch (PDOException $e) {
            writeLog("Database error during upload: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Database error: ' . $e->getMessage());
        } catch (Exception $e) {
            writeLog("General error during upload: " . $e->getMessage(), 'ERROR');
            writeLog("Stack trace: " . $e->getTraceAsString(), 'ERROR');
            $this->sendError(500, 'Upload error: ' . $e->getMessage());
        }
    }
    
    /**
     * Generar referencia única para proposals
     */
    private function generateProposalRef($entity) 
    {
        $year = date('Y');
        $month = date('m');
        
        // Buscar último número
        $stmt = $this->db->prepare("
            SELECT ref FROM {$this->config['prefix']}propal 
            WHERE entity = ? AND ref LIKE ? 
            ORDER BY ref DESC LIMIT 1
        ");
        $stmt->execute(array($entity, "PR{$year}{$month}%"));
        $last = $stmt->fetch();
        
        $nextNumber = 1;
        if ($last) {
            $lastNumber = intval(substr($last['ref'], -4));
            $nextNumber = $lastNumber + 1;
        }
        
        return sprintf("PR%s%s%04d", $year, $month, $nextNumber);
    }
    
    /**
     * Actualizar totales del proposal
     */
    private function updateProposalTotals($proposalId) 
    {
        $totalsStmt = $this->db->prepare("
            SELECT SUM(total_ht) as total_ht, SUM(total_ttc) as total_ttc
            FROM {$this->config['prefix']}propaldet 
            WHERE fk_propal = ?
        ");
        $totalsStmt->execute(array($proposalId));
        $totals = $totalsStmt->fetch();
        
        $updateStmt = $this->db->prepare("
            UPDATE {$this->config['prefix']}propal 
            SET total_ht = ?, total_ttc = ?
            WHERE rowid = ?
        ");
        $updateStmt->execute(array(
            isset($totals['total_ht']) ? $totals['total_ht'] : 0,
            isset($totals['total_ttc']) ? $totals['total_ttc'] : 0,
            $proposalId
        ));
    }
    
    private function createDefaultTables($layoutId, $entity) 
    {
        $defaultTables = array(
            array('numero' => 1, 'nombre' => 'Mesa 1', 'pos_x' => 100, 'pos_y' => 100),
            array('numero' => 2, 'nombre' => 'Mesa 2', 'pos_x' => 250, 'pos_y' => 100),
            array('numero' => 3, 'nombre' => 'Mesa 3', 'pos_x' => 400, 'pos_y' => 100),
            array('numero' => 4, 'nombre' => 'Mesa 4', 'pos_x' => 100, 'pos_y' => 250),
            array('numero' => 5, 'nombre' => 'Mesa 5', 'pos_x' => 250, 'pos_y' => 250),
            array('numero' => 6, 'nombre' => 'Mesa 6', 'pos_x' => 400, 'pos_y' => 250)
        );
        
        $stmt = $this->db->prepare("
            INSERT INTO {$this->config['prefix']}spos_restaurant_mesas 
            (fk_layout, entity, numero, nombre, pos_x, pos_y, ancho, alto, capacidad, color, date_creation, is_active)
            VALUES (?, ?, ?, ?, ?, ?, 80, 80, 4, '#4F46E5', NOW(), 1)
        ");
        
        $created = 0;
        foreach ($defaultTables as $table) {
            try {
                $stmt->execute(array(
                    $layoutId, $entity, $table['numero'], $table['nombre'], 
                    $table['pos_x'], $table['pos_y']
                ));
                $created++;
            } catch (Exception $e) {
                writeLog("Error creating table: " . $e->getMessage(), 'WARN');
            }
        }
        
        return $created;
    }
    
    private function getJsonInput() 
    {
        $input = file_get_contents('php://input');
        writeLog("Raw input: " . substr($input, 0, 200));
        
        if (empty($input)) {
            return array();
        }
        
        $data = json_decode($input, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            writeLog("JSON error: " . json_last_error_msg(), 'ERROR');
            $this->sendError(400, 'Invalid JSON: ' . json_last_error_msg());
        }
        
        return $data;
    }
    
    private function sendError($code, $message) 
    {
        writeLog("Error {$code}: {$message}", 'ERROR');
        http_response_code($code);
        echo json_encode(array(
            'error' => $message,
            'code' => $code,
            'timestamp' => date('Y-m-d H:i:s')
        ));
        exit;
    }
    
    private function sendSuccess($data) 
    {
        writeLog("Success response sent");
        echo json_encode($data);
        exit;
    }
}

// ========================
// ROUTER COMPLETO
// ========================
try {
    $api = new SecureRestaurantApi();
    
    $method = $_SERVER['REQUEST_METHOD'];
    $uri = $_SERVER['REQUEST_URI'];
    $path = parse_url($uri, PHP_URL_PATH);
    
    writeLog("Processing: {$method} {$path}");
    writeLog("Original URI: {$uri}");
    
    // Intentar usar PATH_INFO si está disponible (desde .htaccess)
    if (isset($_SERVER['PATH_INFO']) && !empty($_SERVER['PATH_INFO'])) {
        $path = $_SERVER['PATH_INFO'];
        writeLog("Using PATH_INFO: {$path}");
    } else {
        // Limpiar path - remover base path y index.php
        $basePath = '/custom/pos/frontend/api_spos_restaurant_secure';
        if (strpos($path, $basePath) === 0) {
            $path = substr($path, strlen($basePath));
        }
        
        // Remover /index.php si está presente
        if (strpos($path, '/index.php') === 0) {
            $path = substr($path, strlen('/index.php'));
        }
    }
    
    $segments = array_filter(explode('/', trim($path, '/')));
    writeLog("Cleaned path: " . $path);
    writeLog("Route segments: " . json_encode($segments));
    
    // Routing completo
    switch (isset($segments[0]) ? $segments[0] : '') {
        case 'test':
            writeLog("Route: test endpoint");
            $api->testEndpoint();
            break;
            
        case 'layout':
            if ($method === 'POST') {
                writeLog("Route: create layout");
                $api->createLayout();
            } elseif ($method === 'GET' && isset($segments[1])) {
                if (isset($segments[2])) {
                    // /layout/{id}/tables o /layout/{id}/elements
                    if ($segments[2] === 'tables') {
                        writeLog("Route: get layout tables");
                        $api->getLayoutTables($segments[1]);
                    } elseif ($segments[2] === 'elements') {
                        writeLog("Route: get layout elements");
                        $api->getLayoutElements($segments[1]);
                    } else {
                        writeLog("Route: unknown layout subroute", 'WARN');
                        http_response_code(404);
                        echo json_encode(array('error' => 'Unknown layout endpoint'));
                    }
                } else {
                    writeLog("Route: get layout");
                    $api->getLayout($segments[1]);
                }
            } else {
                writeLog("Route: unsupported layout method", 'WARN');
                http_response_code(405);
                echo json_encode(array('error' => 'Method not allowed'));
            }
            break;
            
        case 'proposals':
            if ($method === 'GET' && isset($segments[1])) {
                if (isset($segments[2]) && $segments[2] === 'statistics') {
                    writeLog("Route: get proposal statistics");
                    $api->getProposalStatistics($segments[1]);
                } else {
                    writeLog("Route: get proposals");
                    $api->getProposals($segments[1]);
                }
            } else {
                writeLog("Route: unsupported proposals method", 'WARN');
                http_response_code(405);
                echo json_encode(array('error' => 'Method not allowed'));
            }
            break;
            
        case 'table':
            if ($method === 'POST') {
                if (isset($segments[1])) {
                    // POST /table/{id}/action
                    if (isset($segments[2])) {
                        if ($segments[2] === 'open') {
                            writeLog("Route: open table");
                            $api->openTable($segments[1]);
                        } elseif ($segments[2] === 'close') {
                            writeLog("Route: close table");
                            $api->closeTable($segments[1]);
                        } elseif ($segments[2] === 'product') {
                            writeLog("Route: add product to table");
                            $api->addProductToTable($segments[1]);
                        } else {
                            writeLog("Route: unknown table action", 'WARN');
                            http_response_code(404);
                            echo json_encode(array('error' => 'Unknown table action'));
                        }
                    } else {
                        writeLog("Route: create table");
                        $api->createTable();
                    }
                }
            } elseif ($method === 'GET' && isset($segments[1])) {
        // ✅ NUEVAS RUTAS AGREGADAS AQUÍ
        if (isset($segments[2])) {
            if ($segments[2] === 'products') {
                writeLog("Route: get mesa products");
                $api->getMesaProducts($segments[1]);
            } elseif ($segments[2] === 'details') {
                writeLog("Route: get mesa details");
                $api->getMesaDetails($segments[1]);
            } else {
                writeLog("Route: unknown table GET subroute", 'WARN');
                http_response_code(404);
                echo json_encode(array('error' => 'Unknown table endpoint'));
            }
        } else {
            writeLog("Route: unsupported table GET method", 'WARN');
            http_response_code(404);
            echo json_encode(array('error' => 'Table GET requires subroute'));
        }
    } elseif ($method === 'PUT' && isset($segments[1], $segments[2]) && $segments[2] === 'position') {
        writeLog("Route: update table position");
        $api->updateTablePosition($segments[1]);
    } elseif ($method === 'DELETE' && isset($segments[1])) {
        writeLog("Route: delete table");
        $api->deleteTable($segments[1]);
    } else {
        writeLog("Route: unsupported table method", 'WARN');
        http_response_code(405);
        echo json_encode(array('error' => 'Method not allowed'));
    }
    break;

            
        case 'upload-image':
            if ($method === 'POST') {
                writeLog("Route: upload image");
                $api->uploadLayoutImage();
            } else {
                writeLog("Route: unsupported upload method", 'WARN');
                http_response_code(405);
                echo json_encode(array('error' => 'Method not allowed'));
            }
            break;
            


            // 🔥 NUEVO: Rutas de pagos para restaurante - AGREGAR DESPUÉS DEL CASE 'upload-image'
        case 'payments':
            if ($method === 'POST') {
                if (isset($segments[1]) && $segments[1] === 'invoice' && isset($segments[2]) && isset($segments[3]) && $segments[3] === 'partial') {
                    // POST /payments/invoice/{invoice_id}/partial
                    writeLog("Route: process partial payments for restaurant");
                    $api->processPartialPayments($segments[2]);
                } else {
                    writeLog("Route: unsupported payments POST endpoint", 'WARN');
                    http_response_code(404);
                    echo json_encode(array('error' => 'Payment POST endpoint not found'));
                }
            } elseif ($method === 'GET') {
                if (isset($segments[1])) {
                    if ($segments[1] === 'methods') {
                        // GET /payments/methods
                        writeLog("Route: get payment methods for restaurant");
                        $api->getPaymentMethods();
                    } elseif ($segments[1] === 'statistics' && isset($segments[2])) {
                        // GET /payments/statistics/{entity}
                        writeLog("Route: get payment statistics for restaurant");
                        $api->getPaymentStatistics($segments[2]);
                    } elseif ($segments[1] === 'invoice' && isset($segments[2]) && isset($segments[3]) && $segments[3] === 'status') {
                        // GET /payments/invoice/{invoice_id}/status
                        writeLog("Route: get invoice payment status for restaurant");
                        $api->getInvoicePaymentStatus($segments[2]);
                    } else {
                        writeLog("Route: unknown payments GET endpoint", 'WARN');
                        http_response_code(404);
                        echo json_encode(array('error' => 'Payment GET endpoint not found'));
                    }
                } else {
                    writeLog("Route: payments GET requires subroute", 'WARN');
                    http_response_code(404);
                    echo json_encode(array('error' => 'Payment GET requires subroute'));
                }
            } elseif ($method === 'DELETE' && isset($segments[1])) {
                // DELETE /payments/{payment_id}
                writeLog("Route: delete payment for restaurant");
                $api->deleteRestaurantPayment($segments[1]);
            } else {
                writeLog("Route: unsupported payments method", 'WARN');
                http_response_code(405);
                echo json_encode(array('error' => 'Method not allowed for payments'));
            }
            break;

        default:
            writeLog("Route: not found - " . (isset($segments[0]) ? $segments[0] : 'empty'), 'WARN');
            http_response_code(404);
            echo json_encode(array(
                'error' => 'Endpoint not found: ' . (isset($segments[0]) ? $segments[0] : 'empty'),
                'available_endpoints' => array(
                'GET /test' => 'Test API connectivity',
                'GET /layout/{entity}' => 'Get layout for entity',
                'POST /layout' => 'Create new layout',
                'GET /layout/{id}/tables' => 'Get layout tables',
                'GET /layout/{id}/elements' => 'Get layout elements',
                'GET /proposals/{entity}' => 'Get proposals for entity',
                'GET /proposals/{entity}/statistics' => 'Get proposal statistics',
                'POST /table' => 'Create new table',
                'POST /table/{number}/open' => 'Open table (create proposal)',
                'POST /table/{id}/close' => 'Close table (delete proposal)',
                'POST /table/{id}/product' => 'Add product to table',
                'GET /table/{id}/products' => '✅ Get products from table', // NUEVO
                'GET /table/{id}/details' => '✅ Get complete table details', // NUEVO
                'PUT /table/{id}/position' => 'Update table position',
                'DELETE /table/{id}' => 'Delete table',
                'POST /upload-image' => 'Upload layout background image'
            )
            ));
    }
    
} catch (Exception $e) {
    writeLog("Fatal error: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine(), 'ERROR');
    
    http_response_code(500);
    echo json_encode(array(
        'error' => 'Internal server error',
        'message' => $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine(),
        'timestamp' => date('Y-m-d H:i:s')
    ));
}
?>