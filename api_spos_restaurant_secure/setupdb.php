<?php
/**
 * Script de Configuración de Base de Datos - SPOS Restaurant
 * Versión mejorada con corrección de errores y mejor detección de tablas
 * Compatible con PHP 5.x
 */

// ========================
// CONFIGURACIÓN Y HEADERS
// ========================

/* Headers para web
if (php_sapi_name() !== 'cli') {
    header('Content-Type: text/html; charset=utf-8');
    
    // Solo permitir acceso desde localhost para seguridad
    $allowedIPs = array('127.0.0.1', '::1', 'localhost');
    $clientIP = $_SERVER['REMOTE_ADDR'];
    
    if (!in_array($clientIP, $allowedIPs)) {
        die('<h1>Acceso Denegado</h1><p>Este script solo puede ejecutarse desde localhost por seguridad.</p>');
    }
}
*/

// ========================
// CONFIGURACIÓN DE BD
// ========================

$config = array(
    'host' => 'localhost',
    'dbname' => 'nubesiel_siel',
    'user' => 'nubesiel_app',
    'password' => 'jEoKI8tPg5',
    'prefix' => 'llx_'
);

// ========================
// CLASE PARA SETUP DE BD
// ========================

class DatabaseSetup 
{
    private $db;
    private $config;
    private $log = array();
    private $errors = array();
    private $warnings = array();
    
    public function __construct($config) 
    {
        $this->config = $config;
        $this->connectDb();
    }
    
    private function connectDb() 
    {
        try {
            $dsn = "mysql:host={$this->config['host']};dbname={$this->config['dbname']};charset=utf8";
            $options = array(
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8"
            );
            $this->db = new PDO($dsn, $this->config['user'], $this->config['password'], $options);
            $this->addLog("✅ Conexión a base de datos exitosa");
        } catch (PDOException $e) {
            $this->addError("❌ Error conectando a BD: " . $e->getMessage());
            die("Error de conexión a la base de datos.");
        }
    }
    
    private function addLog($message) 
    {
        $this->log[] = $message;
        if (php_sapi_name() !== 'cli') {
            echo "<div style='color: #006600; margin: 5px 0;'>" . htmlspecialchars($message) . "</div>";
            flush();
        } else {
            echo $message . "\n";
        }
    }
    
    private function addWarning($message) 
    {
        $this->warnings[] = $message;
        if (php_sapi_name() !== 'cli') {
            echo "<div style='color: #ff8800; margin: 5px 0;'>" . htmlspecialchars($message) . "</div>";
            flush();
        } else {
            echo "WARNING: " . $message . "\n";
        }
    }
    
    private function addError($message) 
    {
        $this->errors[] = $message;
        if (php_sapi_name() !== 'cli') {
            echo "<div style='color: #cc0000; margin: 5px 0;'>" . htmlspecialchars($message) . "</div>";
            flush();
        } else {
            echo "ERROR: " . $message . "\n";
        }
    }
    
    /**
     * Verificar si una tabla existe (versión mejorada)
     */
/**
 * Verificar si una tabla existe (versión mejorada y corregida para MariaDB)
 */
private function tableExists($tableName) 
{
    try {
        // Método 1: Usando SHOW TABLES (formato directo para MariaDB)
        $stmt = $this->db->query("SHOW TABLES LIKE '".str_replace("'", "\\'", $tableName)."'");
        if ($stmt->rowCount() > 0) {
            return true;
        }
        
        // Método 2: Usando INFORMATION_SCHEMA (más preciso)
        $stmt = $this->db->prepare(
            "SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = :dbname 
            AND TABLE_NAME = :tablename"
        );
        $stmt->execute(array(
            ':dbname' => $this->config['dbname'],
            ':tablename' => $tableName
        ));
        return $stmt->rowCount() > 0;
    } catch (PDOException $e) {
        $this->addError("Error verificando tabla {$tableName}: " . $e->getMessage());
        return false;
    }
}

/**
 * Verificar si una columna existe en una tabla (versión corregida)
 */
private function columnExists($tableName, $columnName) 
{
    try {
        // Primero verificamos si la tabla existe
        if (!$this->tableExists($tableName)) {
            return false;
        }
        
        // Luego verificamos la columna (formato directo para MariaDB)
        $stmt = $this->db->query("SHOW COLUMNS FROM `".str_replace("`", "``", $tableName)."` LIKE '".str_replace("'", "\\'", $columnName)."'");
        return $stmt->rowCount() > 0;
    } catch (PDOException $e) {
        $this->addError("Error verificando columna {$columnName} en {$tableName}: " . $e->getMessage());
        return false;
    }
}
    
    /**
     * Ejecutar SQL con manejo de errores
     */
    private function executeSQL($sql, $description = '') 
    {
        try {
            $this->db->exec($sql);
            if ($description) {
                $this->addLog("✅ " . $description);
            }
            return true;
        } catch (PDOException $e) {
            $this->addError("❌ Error " . ($description ? "en {$description}" : "ejecutando SQL") . ": " . $e->getMessage());
            $this->addError("SQL: " . $sql);
            return false;
        }
    }
    
    /**
     * Crear tabla de layouts del restaurante
     */
    private function createLayoutTable() 
    {
        $tableName = $this->config['prefix'] . 'spos_restaurant_layout';
        
        if ($this->tableExists($tableName)) {
            $this->addWarning("⚠️ Tabla {$tableName} ya existe");
            return true;
        }
        
        $sql = "CREATE TABLE `{$tableName}` (
            `rowid` int(11) NOT NULL AUTO_INCREMENT,
            `entity` int(11) NOT NULL DEFAULT 1,
            `name` varchar(255) NOT NULL,
            `description` text,
            `background_width` int(11) DEFAULT 1000,
            `background_height` int(11) DEFAULT 600,
            `background_image` varchar(500) DEFAULT NULL,
            `date_creation` datetime NOT NULL,
            `date_modification` datetime DEFAULT NULL,
            `fk_user_creat` int(11) NOT NULL,
            `fk_user_modif` int(11) DEFAULT NULL,
            `is_active` tinyint(1) DEFAULT 1,
            PRIMARY KEY (`rowid`),
            KEY `idx_entity` (`entity`),
            KEY `idx_active` (`is_active`),
            KEY `idx_user_creat` (`fk_user_creat`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci";
        
        return $this->executeSQL($sql, "Tabla de layouts creada: {$tableName}");
    }
    
    /**
     * Crear tabla de mesas del restaurante
     */
    private function createMesasTable() 
    {
        $tableName = $this->config['prefix'] . 'spos_restaurant_mesas';
        
        if ($this->tableExists($tableName)) {
            $this->addWarning("⚠️ Tabla {$tableName} ya existe");
            return true;
        }
        
        $sql = "CREATE TABLE `{$tableName}` (
            `rowid` int(11) NOT NULL AUTO_INCREMENT,
            `fk_layout` int(11) NOT NULL,
            `entity` int(11) NOT NULL DEFAULT 1,
            `numero` int(11) NOT NULL,
            `nombre` varchar(100) NOT NULL,
            `pos_x` int(11) NOT NULL DEFAULT 0,
            `pos_y` int(11) NOT NULL DEFAULT 0,
            `ancho` int(11) DEFAULT 80,
            `alto` int(11) DEFAULT 80,
            `capacidad` int(11) DEFAULT 4,
            `color` varchar(20) DEFAULT '#4F46E5',
            `forma` varchar(20) DEFAULT 'rectangle',
            `date_creation` datetime NOT NULL,
            `date_modification` datetime DEFAULT NULL,
            `fk_user_creat` int(11) NOT NULL,
            `fk_user_modif` int(11) DEFAULT NULL,
            `is_active` tinyint(1) DEFAULT 1,
            PRIMARY KEY (`rowid`),
            UNIQUE KEY `uk_mesa_layout` (`fk_layout`, `numero`, `entity`),
            KEY `idx_layout` (`fk_layout`),
            KEY `idx_entity` (`entity`),
            KEY `idx_numero` (`numero`),
            KEY `idx_active` (`is_active`),
            KEY `idx_user_creat` (`fk_user_creat`),
            CONSTRAINT `fk_mesa_layout` FOREIGN KEY (`fk_layout`) REFERENCES `{$this->config['prefix']}spos_restaurant_layout` (`rowid`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci";
        
        return $this->executeSQL($sql, "Tabla de mesas creada: {$tableName}");
    }
    
    /**
     * Crear tabla de elementos decorativos (opcional)
     */
    private function createElementosTable() 
    {
        $tableName = $this->config['prefix'] . 'spos_restaurant_elementos';
        
        if ($this->tableExists($tableName)) {
            $this->addWarning("⚠️ Tabla {$tableName} ya existe");
            return true;
        }
        
        $sql = "CREATE TABLE `{$tableName}` (
            `rowid` int(11) NOT NULL AUTO_INCREMENT,
            `fk_layout` int(11) NOT NULL,
            `entity` int(11) NOT NULL DEFAULT 1,
            `tipo` varchar(50) NOT NULL,
            `nombre` varchar(100) NOT NULL,
            `pos_x` int(11) NOT NULL DEFAULT 0,
            `pos_y` int(11) NOT NULL DEFAULT 0,
            `ancho` int(11) DEFAULT 50,
            `alto` int(11) DEFAULT 50,
            `color` varchar(20) DEFAULT '#CCCCCC',
            `propiedades` text,
            `date_creation` datetime NOT NULL,
            `date_modification` datetime DEFAULT NULL,
            `fk_user_creat` int(11) NOT NULL,
            `fk_user_modif` int(11) DEFAULT NULL,
            `is_active` tinyint(1) DEFAULT 1,
            PRIMARY KEY (`rowid`),
            KEY `idx_layout` (`fk_layout`),
            KEY `idx_entity` (`entity`),
            KEY `idx_tipo` (`tipo`),
            KEY `idx_active` (`is_active`),
            KEY `idx_user_creat` (`fk_user_creat`),
            CONSTRAINT `fk_elemento_layout` FOREIGN KEY (`fk_layout`) REFERENCES `{$this->config['prefix']}spos_restaurant_layout` (`rowid`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci";
        
        return $this->executeSQL($sql, "Tabla de elementos decorativos creada: {$tableName}");
    }
    
    /**
     * Agregar campo fk_spos_mesa a tabla propal si no existe
     */
    private function addMesaFieldToPropal() 
    {
        $tableName = $this->config['prefix'] . 'propal';
        $fieldName = 'fk_spos_mesa';
        
        // Verificar con diferentes variaciones del nombre de la tabla
        $tableFound = false;
        $tableVariations = array(
            $tableName,
            strtolower($tableName),
            strtoupper($tableName),
            str_replace('llx_', '', $tableName),
            'llx_propal',
            'llx_PROPAL'
        );
        
        foreach ($tableVariations as $variation) {
            if ($this->tableExists($variation)) {
                $tableName = $variation;
                $tableFound = true;
                break;
            }
        }
        
        if (!$tableFound) {
            $this->addError("❌ Tabla propal no encontrada (probado con: " . implode(', ', $tableVariations) . ")");
            return false;
        }
        
        if ($this->columnExists($tableName, $fieldName)) {
            $this->addWarning("⚠️ Campo {$fieldName} ya existe en {$tableName}");
            return true;
        }
        
        $sql = "ALTER TABLE `{$tableName}` ADD COLUMN `{$fieldName}` int(11) DEFAULT NULL";
        $result = $this->executeSQL($sql, "Campo {$fieldName} agregado a tabla {$tableName}");
        
        if ($result) {
            // Agregar índice para el nuevo campo
            $indexSql = "ALTER TABLE `{$tableName}` ADD KEY `idx_spos_mesa` (`{$fieldName}`)";
            $this->executeSQL($indexSql, "Índice agregado para campo {$fieldName}");
        }
        
        return $result;
    }
    
    /**
     * Verificar tablas de API Keys de Dolibarr
     */
    private function checkApiKeysTable() 
    {
        $tableName = $this->config['prefix'] . 'api_keys';
        
        if (!$this->tableExists($tableName)) {
            $this->addWarning("⚠️ Tabla {$tableName} no existe. Es necesaria para autenticación.");
            $this->addWarning("   Ejecute desde Dolibarr: Admin > Módulos > API REST > Activar");
            return false;
        } else {
            $this->addLog("✅ Tabla de API Keys existe: {$tableName}");
        }
        
        // Verificar que existe al menos una API key activa
        try {
            $stmt = $this->db->prepare("SELECT COUNT(*) as count FROM `{$tableName}` WHERE is_active = 1");
            $stmt->execute();
            $result = $stmt->fetch();
            
            if ($result['count'] == 0) {
                $this->addWarning("⚠️ No hay API Keys activas en {$tableName}");
                $this->addWarning("   Cree una API Key desde: Dolibarr > Admin > Usuarios > [Usuario] > API Keys");
            } else {
                $this->addLog("✅ Encontradas {$result['count']} API Key(s) activa(s)");
            }
        } catch (PDOException $e) {
            $this->addError("Error verificando API Keys: " . $e->getMessage());
        }
        
        return true;
    }
    
    /**
     * Crear directorios necesarios
     */
    private function createDirectories() 
    {
        $directories = array(
            __DIR__ . '/logs',
            __DIR__ . '/../../../../documents/spos_restaurant',
            __DIR__ . '/../../../../documents/spos_restaurant/layouts'
        );
        
        foreach ($directories as $dir) {
            if (!is_dir($dir)) {
                if (mkdir($dir, 0755, true)) {
                    $this->addLog("✅ Directorio creado: " . basename($dir));
                } else {
                    $this->addWarning("⚠️ No se pudo crear directorio: " . basename($dir));
                }
            } else {
                $this->addLog("✅ Directorio ya existe: " . basename($dir));
            }
        }
    }
    
    /**
     * Generar datos de prueba (opcional)
     */
    private function createSampleData($createSamples = false) 
    {
        if (!$createSamples) {
            return;
        }
        
        $layoutTable = $this->config['prefix'] . 'spos_restaurant_layout';
        $mesasTable = $this->config['prefix'] . 'spos_restaurant_mesas';
        
        // Verificar si ya existe un layout
        try {
            $stmt = $this->db->prepare("SELECT COUNT(*) as count FROM `{$layoutTable}` WHERE entity = 1");
            $stmt->execute();
            $result = $stmt->fetch();
            
            if ($result['count'] > 0) {
                $this->addWarning("⚠️ Ya existen layouts, omitiendo datos de prueba");
                return;
            }
        } catch (PDOException $e) {
            $this->addError("Error verificando layouts existentes: " . $e->getMessage());
            return;
        }
        
        // Crear layout de muestra
        $layoutSql = "INSERT INTO `{$layoutTable}` 
            (entity, name, description, background_width, background_height, date_creation, fk_user_creat, is_active) 
            VALUES (1, 'Layout Principal', 'Configuración inicial del restaurante', 1000, 600, NOW(), 1, 1)";
            
        if ($this->executeSQL($layoutSql, "Layout de muestra creado")) {
            $layoutId = $this->db->lastInsertId();
            
            // Crear mesas de muestra
            $mesas = array(
                array('numero' => 1, 'nombre' => 'Mesa 1', 'pos_x' => 100, 'pos_y' => 100),
                array('numero' => 2, 'nombre' => 'Mesa 2', 'pos_x' => 250, 'pos_y' => 100),
                array('numero' => 3, 'nombre' => 'Mesa 3', 'pos_x' => 400, 'pos_y' => 100),
                array('numero' => 4, 'nombre' => 'Mesa 4', 'pos_x' => 100, 'pos_y' => 250),
                array('numero' => 5, 'nombre' => 'Mesa 5', 'pos_x' => 250, 'pos_y' => 250),
                array('numero' => 6, 'nombre' => 'Mesa 6', 'pos_x' => 400, 'pos_y' => 250)
            );
            
            $mesaStmt = $this->db->prepare("
                INSERT INTO `{$mesasTable}` 
                (fk_layout, entity, numero, nombre, pos_x, pos_y, ancho, alto, capacidad, color, date_creation, fk_user_creat, is_active)
                VALUES (?, 1, ?, ?, ?, ?, 80, 80, 4, '#4F46E5', NOW(), 1, 1)
            ");
            
            $mesasCreadas = 0;
            foreach ($mesas as $mesa) {
                try {
                    $mesaStmt->execute(array($layoutId, $mesa['numero'], $mesa['nombre'], $mesa['pos_x'], $mesa['pos_y']));
                    $mesasCreadas++;
                } catch (PDOException $e) {
                    $this->addWarning("⚠️ Error creando mesa {$mesa['numero']}: " . $e->getMessage());
                }
            }
            
            $this->addLog("✅ {$mesasCreadas} mesas de muestra creadas");
        }
    }
    
    /**
     * Ejecutar setup completo
     */
    public function runSetup($createSamples = false) 
    {
        $this->addLog("🚀 Iniciando configuración de base de datos SPOS Restaurant");
        $this->addLog("========================================================");
        
        // 1. Verificar tablas de Dolibarr
        $this->addLog("\n📋 Verificando tablas base de Dolibarr...");
        $this->checkApiKeysTable();
        
        // 2. Crear tablas del restaurante
        $this->addLog("\n🍽️ Creando tablas del restaurante...");
        $this->createLayoutTable();
        $this->createMesasTable();
        $this->createElementosTable();
        
        // 3. Modificar tablas existentes
        $this->addLog("\n🔧 Modificando tablas existentes...");
        $this->addMesaFieldToPropal();
        
        // 4. Crear directorios
        $this->addLog("\n📁 Creando directorios necesarios...");
        $this->createDirectories();
        
        // 5. Datos de muestra (opcional)
        if ($createSamples) {
            $this->addLog("\n🎯 Creando datos de muestra...");
            $this->createSampleData(true);
        }
        
        // 6. Resumen final
        $this->addLog("\n📊 Resumen de la configuración:");
        $this->addLog("========================================================");
        $this->addLog("✅ Operaciones exitosas: " . count($this->log));
        
        if (count($this->warnings) > 0) {
            $this->addLog("⚠️ Advertencias: " . count($this->warnings));
        }
        
        if (count($this->errors) > 0) {
            $this->addLog("❌ Errores: " . count($this->errors));
        }
        
        if (count($this->errors) == 0) {
            $this->addLog("\n🎉 Configuración completada exitosamente!");
            $this->addLog("   Puede ahora usar el sistema de restaurante SPOS.");
            $this->addLog("   No olvide configurar las variables SPOS_RESTAURANTE=1 y crear API Keys.");
        } else {
            $this->addLog("\n⚠️ Configuración completada con errores.");
            $this->addLog("   Revise los errores mostrados arriba.");
        }
        
        return array(
            'success' => count($this->errors) == 0,
            'log' => $this->log,
            'warnings' => $this->warnings,
            'errors' => $this->errors
        );
    }
    
    /**
     * Verificar estado actual de la BD
     */
    public function checkStatus() 
    {
        $this->addLog("🔍 Verificando estado actual de la base de datos");
        $this->addLog("==============================================");
        
        $tables = array(
            'spos_restaurant_layout' => 'Layouts del restaurante',
            'spos_restaurant_mesas' => 'Mesas del restaurante',
            'spos_restaurant_elementos' => 'Elementos decorativos',
            'api_keys' => 'API Keys de Dolibarr',
            'propal' => 'Proposals/Cotizaciones'
        );
        
        foreach ($tables as $table => $description) {
            $fullTableName = $this->config['prefix'] . $table;
            if ($this->tableExists($fullTableName)) {
                try {
                    $stmt = $this->db->prepare("SELECT COUNT(*) as count FROM `{$fullTableName}`");
                    $stmt->execute();
                    $result = $stmt->fetch();
                    $this->addLog("✅ {$description}: {$result['count']} registros");
                } catch (PDOException $e) {
                    $this->addLog("✅ {$description}: Existe (error contando registros)");
                }
            } else {
                $this->addWarning("❌ {$description}: No existe");
            }
        }
        
        // Verificar campo específico en propal
        $proposalTable = $this->config['prefix'] . 'propal';
        if ($this->tableExists($proposalTable)) {
            if ($this->columnExists($proposalTable, 'fk_spos_mesa')) {
                $this->addLog("✅ Campo fk_spos_mesa en proposals: Existe");
            } else {
                $this->addWarning("❌ Campo fk_spos_mesa en proposals: No existe");
            }
        }
        
        return array(
            'log' => $this->log,
            'warnings' => $this->warnings,
            'errors' => $this->errors
        );
    }
}

// ========================
// EJECUCIÓN PRINCIPAL
// ========================

// Detectar si se ejecuta desde web o CLI
$isWeb = php_sapi_name() !== 'cli';

if ($isWeb) {
    echo "<!DOCTYPE html>
    <html>
    <head>
        <meta charset='utf-8'>
        <title>Setup Base de Datos - SPOS Restaurant</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; margin: -20px -20px 20px -20px; border-radius: 10px 10px 0 0; }
            .button { display: inline-block; padding: 10px 20px; margin: 10px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; border: none; cursor: pointer; }
            .button:hover { background: #45a049; }
            .button.secondary { background: #2196F3; }
            .button.secondary:hover { background: #1976D2; }
            .output { background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 10px 0; max-height: 400px; overflow-y: auto; font-family: monospace; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h1>🔧 Setup Base de Datos - SPOS Restaurant</h1>
                <p>Configuración automática de tablas y campos para el sistema de restaurante</p>
            </div>";
}

try {
    $setup = new DatabaseSetup($config);
    
    // Determinar acción a ejecutar
    $action = isset($_GET['action']) ? $_GET['action'] : (isset($argv[1]) ? $argv[1] : 'status');
    $createSamples = isset($_GET['samples']) || (isset($argv[2]) && $argv[2] === 'samples');
    
    if ($isWeb && !isset($_GET['action'])) {
        // Mostrar interfaz web
        echo "
            <h2>🎯 Seleccione una acción:</h2>
            <a href='?action=status' class='button secondary'>📊 Verificar Estado</a>
            <a href='?action=setup' class='button'>🚀 Ejecutar Setup</a>
            <a href='?action=setup&samples=1' class='button'>🎯 Setup + Datos de Muestra</a>
            
            <h3>📋 Instrucciones:</h3>
            <ul>
                <li><strong>Verificar Estado:</strong> Revisa qué tablas y campos existen actualmente</li>
                <li><strong>Ejecutar Setup:</strong> Crea todas las tablas y campos necesarios</li>
                <li><strong>Setup + Datos de Muestra:</strong> Crea todo + un layout con 6 mesas de ejemplo</li>
            </ul>
            
            <h3>⚠️ Importante:</h3>
            <ul>
                <li>Este script es seguro - no elimina datos existentes</li>
                <li>Solo crea tablas y campos que no existen</li>
                <li>Después del setup, configure SPOS_RESTAURANTE=1 en Dolibarr</li>
                <li>Cree una API Key desde: Admin > Usuarios > [Usuario] > API Keys</li>
            </ul>";
    } else {
        // Ejecutar acción
        if ($isWeb) echo "<div class='output'>";
        
        switch ($action) {
            case 'setup':
                $result = $setup->runSetup($createSamples);
                break;
            case 'status':
            default:
                $result = $setup->checkStatus();
                break;
        }
        
        if ($isWeb) echo "</div>";
        
        // Mostrar botones adicionales en web
        if ($isWeb) {
            echo "<div style='margin-top: 20px;'>
                <a href='?' class='button secondary'>🏠 Volver al Inicio</a>
                <a href='?action=status' class='button secondary'>📊 Verificar Estado</a>
            </div>";
        }
    }
    
} catch (Exception $e) {
    $error = "❌ Error fatal: " . $e->getMessage();
    if ($isWeb) {
        echo "<div style='color: red; font-weight: bold;'>" . htmlspecialchars($error) . "</div>";
    } else {
        echo $error . "\n";
    }
}

if ($isWeb) {
    echo "
        </div>
        <div style='text-align: center; margin-top: 20px; color: #666;'>
            <small>SPOS Restaurant Database Setup v1.0 - Compatible con PHP 5.x</small>
        </div>
    </body>
    </html>";
}


/*
añadir tablas a esta revision


-- 1. División de pagos
CREATE TABLE llx_spos_split_payments (
    rowid INT PRIMARY KEY AUTO_INCREMENT,
    fk_propal INT NOT NULL,
    guest_name VARCHAR(100),
    guest_amount DECIMAL(10,2),
    payment_status ENUM('pending', 'paid'),
    payment_method VARCHAR(50),
    date_creation DATETIME,
    FOREIGN KEY (fk_propal) REFERENCES llx_propal(rowid)
);

-- 2. Transferencias de mesa
CREATE TABLE llx_spos_table_transfers (
    rowid INT PRIMARY KEY AUTO_INCREMENT,
    from_table INT NOT NULL,
    to_table INT NOT NULL,
    transfer_type ENUM('full', 'partial', 'merge', 'split'),
    reason VARCHAR(255),
    fk_user INT NOT NULL,
    date_creation DATETIME,
    FOREIGN KEY (fk_user) REFERENCES llx_user(rowid)
);

-- 3. Estados de productos en cocina
CREATE TABLE llx_spos_product_status (
    rowid INT PRIMARY KEY AUTO_INCREMENT,
    fk_propaldet INT NOT NULL,
    status ENUM('pending', 'sent', 'preparing', 'ready', 'served', 'cancelled'),
    station VARCHAR(50),
    estimated_time INT,
    actual_time INT,
    notes TEXT,
    date_creation DATETIME,
    date_update DATETIME,
    FOREIGN KEY (fk_propaldet) REFERENCES llx_propaldet(rowid)
);

-- 4. Asignación de meseros
ALTER TABLE llx_spos_restaurant_mesas 
ADD COLUMN fk_assigned_waiter INT,
ADD COLUMN date_assigned DATETIME,
ADD FOREIGN KEY (fk_assigned_waiter) REFERENCES llx_user(rowid);

-- 5. Reservas
CREATE TABLE llx_spos_reservations (
    rowid INT PRIMARY KEY AUTO_INCREMENT,
    fk_table INT NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20),
    guest_count INT,
    reservation_date DATE,
    reservation_time TIME,
    status ENUM('confirmed', 'seated', 'cancelled', 'no_show'),
    notes TEXT,
    date_creation DATETIME,
    FOREIGN KEY (fk_table) REFERENCES llx_spos_restaurant_mesas(rowid)
);

-- 6. Notificaciones
CREATE TABLE llx_spos_notifications (
    rowid INT PRIMARY KEY AUTO_INCREMENT,
    type VARCHAR(50),
    title VARCHAR(200),
    message TEXT,
    fk_user INT,
    is_read TINYINT DEFAULT 0,
    date_creation DATETIME,
    date_read DATETIME,
    FOREIGN KEY (fk_user) REFERENCES llx_user(rowid)
);

*/
?>
