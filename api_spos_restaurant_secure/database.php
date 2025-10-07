<?php
/**
 * Módulo de Base de Datos API Segura
 * Ubicación: custom/pos/frontend/api_spos_restaurant_secure/database.php
 */

class ApiDatabase 
{
    private $connection;
    private $host;
    private $database;
    private $username;
    private $password;
    private $prefix;
    
    public function __construct() 
    {
        $this->host = DB_HOST;
        $this->database = DB_NAME;
        $this->username = DB_USER;
        $this->password = DB_PASS;
        $this->prefix = DB_PREFIX;
        
        $this->connect();
    }
    
    /**
     * Establecer conexión a la base de datos
     */
    private function connect() 
    {
        try {
            $dsn = "mysql:host={$this->host};dbname={$this->database};charset=utf8mb4";
            
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
            ];
            
            $this->connection = new PDO($dsn, $this->username, $this->password, $options);
            
            writeLog("Database connection established to: {$this->database}");
            
        } catch (PDOException $e) {
            writeLog("Database connection failed: " . $e->getMessage(), 'ERROR');
            throw new Exception('Database connection failed: ' . $e->getMessage());
        }
    }
    
    /**
     * Obtener la conexión PDO
     */
    public function getConnection() 
    {
        return $this->connection;
    }
    
    /**
     * Obtener prefijo de tablas
     */
    public function getPrefix() 
    {
        return $this->prefix;
    }
    
    /**
     * Ejecutar query SELECT
     */
    public function select($query, $params = []) 
    {
        try {
            $stmt = $this->connection->prepare($query);
            $stmt->execute($params);
            
            writeLog("SELECT executed: " . $this->sanitizeQuery($query));
            
            return $stmt->fetchAll();
            
        } catch (PDOException $e) {
            writeLog("SELECT error: " . $e->getMessage(), 'ERROR');
            throw new Exception('Database select error: ' . $e->getMessage());
        }
    }
    
    /**
     * Ejecutar query SELECT y obtener un solo registro
     */
    public function selectOne($query, $params = []) 
    {
        try {
            $stmt = $this->connection->prepare($query);
            $stmt->execute($params);
            
            writeLog("SELECT ONE executed: " . $this->sanitizeQuery($query));
            
            return $stmt->fetch();
            
        } catch (PDOException $e) {
            writeLog("SELECT ONE error: " . $e->getMessage(), 'ERROR');
            throw new Exception('Database select error: ' . $e->getMessage());
        }
    }
    
    /**
     * Ejecutar query INSERT
     */
    public function insert($query, $params = []) 
    {
        try {
            $stmt = $this->connection->prepare($query);
            $result = $stmt->execute($params);
            
            $insertId = $this->connection->lastInsertId();
            
            writeLog("INSERT executed: " . $this->sanitizeQuery($query) . " | ID: {$insertId}");
            
            return [
                'success' => $result,
                'insert_id' => $insertId,
                'affected_rows' => $stmt->rowCount()
            ];
            
        } catch (PDOException $e) {
            writeLog("INSERT error: " . $e->getMessage(), 'ERROR');
            throw new Exception('Database insert error: ' . $e->getMessage());
        }
    }
    
    /**
     * Ejecutar query UPDATE
     */
    public function update($query, $params = []) 
    {
        try {
            $stmt = $this->connection->prepare($query);
            $result = $stmt->execute($params);
            
            $affectedRows = $stmt->rowCount();
            
            writeLog("UPDATE executed: " . $this->sanitizeQuery($query) . " | Affected: {$affectedRows}");
            
            return [
                'success' => $result,
                'affected_rows' => $affectedRows
            ];
            
        } catch (PDOException $e) {
            writeLog("UPDATE error: " . $e->getMessage(), 'ERROR');
            throw new Exception('Database update error: ' . $e->getMessage());
        }
    }
    
    /**
     * Ejecutar query DELETE
     */
    public function delete($query, $params = []) 
    {
        try {
            $stmt = $this->connection->prepare($query);
            $result = $stmt->execute($params);
            
            $affectedRows = $stmt->rowCount();
            
            writeLog("DELETE executed: " . $this->sanitizeQuery($query) . " | Affected: {$affectedRows}");
            
            return [
                'success' => $result,
                'affected_rows' => $affectedRows
            ];
            
        } catch (PDOException $e) {
            writeLog("DELETE error: " . $e->getMessage(), 'ERROR');
            throw new Exception('Database delete error: ' . $e->getMessage());
        }
    }
    
    /**
     * Ejecutar query personalizada
     */
    public function execute($query, $params = []) 
    {
        try {
            $stmt = $this->connection->prepare($query);
            $result = $stmt->execute($params);
            
            writeLog("CUSTOM query executed: " . $this->sanitizeQuery($query));
            
            return [
                'success' => $result,
                'affected_rows' => $stmt->rowCount(),
                'insert_id' => $this->connection->lastInsertId()
            ];
            
        } catch (PDOException $e) {
            writeLog("CUSTOM query error: " . $e->getMessage(), 'ERROR');
            throw new Exception('Database query error: ' . $e->getMessage());
        }
    }
    
    /**
     * Iniciar transacción
     */
    public function beginTransaction() 
    {
        try {
            $this->connection->beginTransaction();
            writeLog("Transaction started");
            return true;
        } catch (PDOException $e) {
            writeLog("Transaction start error: " . $e->getMessage(), 'ERROR');
            return false;
        }
    }
    
    /**
     * Confirmar transacción
     */
    public function commit() 
    {
        try {
            $this->connection->commit();
            writeLog("Transaction committed");
            return true;
        } catch (PDOException $e) {
            writeLog("Transaction commit error: " . $e->getMessage(), 'ERROR');
            return false;
        }
    }
    
    /**
     * Cancelar transacción
     */
    public function rollback() 
    {
        try {
            $this->connection->rollback();
            writeLog("Transaction rolled back");
            return true;
        } catch (PDOException $e) {
            writeLog("Transaction rollback error: " . $e->getMessage(), 'ERROR');
            return false;
        }
    }
    
    /**
     * Verificar si una tabla existe
     */
    public function tableExists($tableName) 
    {
        try {
            $query = "SHOW TABLES LIKE ?";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$this->prefix . $tableName]);
            
            return $stmt->rowCount() > 0;
            
        } catch (PDOException $e) {
            writeLog("Table check error: " . $e->getMessage(), 'ERROR');
            return false;
        }
    }
    
    /**
     * Obtener información de la base de datos
     */
    public function getDatabaseInfo() 
    {
        try {
            $info = [
                'database_name' => $this->database,
                'host' => $this->host,
                'prefix' => $this->prefix,
                'charset' => $this->connection->query("SELECT @@character_set_database")->fetchColumn(),
                'version' => $this->connection->query("SELECT VERSION()")->fetchColumn(),
                'connection_id' => $this->connection->query("SELECT CONNECTION_ID()")->fetchColumn()
            ];
            
            return $info;
            
        } catch (PDOException $e) {
            writeLog("Database info error: " . $e->getMessage(), 'ERROR');
            return [];
        }
    }
    
    /**
     * Sanitizar query para logs (remover datos sensibles)
     */
    private function sanitizeQuery($query) 
    {
        // Remover saltos de línea y espacios múltiples
        $sanitized = preg_replace('/\s+/', ' ', trim($query));
        
        // Truncar si es muy largo
        if (strlen($sanitized) > 200) {
            $sanitized = substr($sanitized, 0, 200) . '...';
        }
        
        return $sanitized;
    }
    
    /**
     * Verificar conexión
     */
    public function ping() 
    {
        try {
            $this->connection->query("SELECT 1");
            return true;
        } catch (PDOException $e) {
            writeLog("Database ping failed: " . $e->getMessage(), 'ERROR');
            return false;
        }
    }
    
    /**
     * Cerrar conexión
     */
    public function close() 
    {
        $this->connection = null;
        writeLog("Database connection closed");
    }
    
    /**
     * Destructor
     */
    public function __destruct() 
    {
        if ($this->connection) {
            $this->close();
        }
    }
}
?>