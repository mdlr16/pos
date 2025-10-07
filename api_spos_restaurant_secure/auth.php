<?php
/**
 * Módulo de Autenticación API Segura
 * Ubicación: custom/pos/frontend/api_spos_restaurant_secure/auth.php
 */

class ApiAuth 
{
    private $db;
    private $user;
    
    public function __construct($database) 
    {
        $this->db = $database;
    }
    
    /**
     * Autenticar request con Bearer Token
     */
    public function authenticate() 
    {
        $token = $this->getBearerToken();
        
        if (empty($token)) {
            writeLog("Authentication failed: No token provided", 'ERROR');
            $this->sendError(401, 'Bearer token required');
        }
        
        if (!isValidToken($token)) {
            writeLog("Authentication failed: Invalid token: " . substr($token, 0, 10) . "...", 'ERROR');
            $this->sendError(401, 'Invalid token');
        }
        
        // Buscar usuario asociado al token
        $this->user = $this->findUserByToken($token);
        
        if (!$this->user) {
            // Crear usuario virtual para la API
            $this->user = $this->createVirtualUser();
        }
        
        writeLog("User authenticated: " . $this->user['login']);
        return $this->user;
    }
    
    /**
     * Obtener Bearer Token de headers
     */
    private function getBearerToken() 
    {
        $headers = getallheaders();
        
        // Intentar Authorization header
        if (isset($headers['Authorization'])) {
            $auth = $headers['Authorization'];
            if (strpos($auth, 'Bearer ') === 0) {
                return substr($auth, 7);
            }
        }
        
        // Fallback a X-API-Key header
        if (isset($headers['X-API-Key'])) {
            return $headers['X-API-Key'];
        }
        
        // Fallback a query parameter (menos seguro)
        if (isset($_GET['api_key'])) {
            return $_GET['api_key'];
        }
        
        return null;
    }
    
    /**
     * Buscar usuario por token en BD
     */
    private function findUserByToken($token) 
    {
        try {
            // Buscar en tabla de usuarios con API key
            $stmt = $this->db->prepare("
                SELECT u.rowid, u.login, u.admin, u.firstname, u.lastname, u.email
                FROM " . DB_PREFIX . "user u 
                WHERE (u.api_key = ? OR u.token = ?) 
                AND u.statut = 1
                LIMIT 1
            ");
            
            $stmt->execute([$token, $token]);
            $user = $stmt->fetch();
            
            if ($user) {
                writeLog("User found in database: " . $user['login']);
                return $user;
            }
            
            // Si no hay usuario con ese token, buscar en tabla de API keys separada (si existe)
            $stmt = $this->db->prepare("
                SELECT u.rowid, u.login, u.admin, u.firstname, u.lastname, u.email
                FROM " . DB_PREFIX . "user u
                JOIN " . DB_PREFIX . "api_keys ak ON u.rowid = ak.fk_user
                WHERE ak.key_value = ? AND ak.is_active = 1
                LIMIT 1
            ");
            
            $stmt->execute([$token]);
            $user = $stmt->fetch();
            
            if ($user) {
                writeLog("User found via API keys table: " . $user['login']);
                return $user;
            }
            
        } catch (PDOException $e) {
            writeLog("User lookup error: " . $e->getMessage(), 'WARN');
        }
        
        return null;
    }
    
    /**
     * Crear usuario virtual para la API
     */
    private function createVirtualUser() 
    {
        return [
            'rowid' => 999,
            'login' => 'api_spos_user',
            'admin' => 1,
            'firstname' => 'SPOS',
            'lastname' => 'API User',
            'email' => 'api@spos.local'
        ];
    }
    
    /**
     * Verificar permisos del usuario
     */
    public function hasPermission($permission) 
    {
        // Para usuarios admin, todos los permisos
        if ($this->user && $this->user['admin'] == 1) {
            return true;
        }
        
        // Aquí puedes implementar lógica de permisos específica
        switch ($permission) {
            case 'read_layout':
            case 'read_tables':
            case 'read_proposals':
                return true; // Lectura permitida para todos
                
            case 'write_layout':
            case 'write_tables':
            case 'upload_images':
                return $this->user && $this->user['admin'] == 1; // Solo admin
                
            default:
                return false;
        }
    }
    
    /**
     * Obtener usuario actual
     */
    public function getCurrentUser() 
    {
        return $this->user;
    }
    
    /**
     * Verificar si el usuario está autenticado
     */
    public function isAuthenticated() 
    {
        return !empty($this->user);
    }
    
    /**
     * Logout (limpiar sesión)
     */
    public function logout() 
    {
        $this->user = null;
        writeLog("User logged out");
    }
    
    /**
     * Obtener información del usuario para logs
     */
    public function getUserInfo() 
    {
        if (!$this->user) {
            return 'Anonymous';
        }
        
        return $this->user['login'] . ' (' . $this->user['rowid'] . ')';
    }
    
    /**
     * Enviar error de autenticación
     */
    private function sendError($code, $message) 
    {
        http_response_code($code);
        echo json_encode([
            'error' => $message,
            'code' => $code,
            'timestamp' => date('Y-m-d H:i:s'),
            'auth_required' => true
        ]);
        exit;
    }
}
?>