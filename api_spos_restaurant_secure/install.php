<?php
/**
 * Script de Instalación API Independiente SPOS Restaurant
 * Ubicación: custom/pos/frontend/api_spos_restaurant_secure/install.php
 * 
 * Ejecutar UNA SOLA VEZ después de subir los archivos
 */

// Solo permitir ejecución desde línea de comandos o con parámetro especial
if (php_sapi_name() !== 'cli' && !isset($_GET['force_install'])) {
    die('Este script solo puede ejecutarse desde línea de comandos o con ?force_install=1');
}

echo "=== SPOS Restaurant API - Script de Instalación ===\n\n";

// Cargar configuración (debe existir antes de ejecutar este script)
if (!file_exists(__DIR__ . '/config.php')) {
    die("ERROR: config.php no encontrado. Debe crear y configurar config.php antes de ejecutar la instalación.\n");
}

require_once __DIR__ . '/config.php';

/**
 * Clase de instalación
 */
class SPOSInstaller 
{
    private $db;
    private $errors = [];
    private $warnings = [];
    private $success = [];
    
    public function __construct() 
    {
        $this->connectDatabase();
    }
    
    /**
     * Conectar a la base de datos
     */
    private function connectDatabase() 
    {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ];
            
            $this->db = new PDO($dsn, DB_USER, DB_PASS, $options);
            $this->success[] = "✅ Conexión a base de datos exitosa";
            
        } catch (PDOException $e) {
            $this->errors[] = "❌ Error conectando a BD: " . $e->getMessage();
            die("No se puede continuar sin conexión a BD.\n");
        }
    }
    
    /**
     * Ejecutar instalación completa
     */
    public function install() 
    {
        echo "🚀 Iniciando instalación...\n\n";
        
        // 1. Verificar requisitos
        $this->checkRequirements();
        
        // 2. Crear directorios
        $this->createDirectories();
        
        // 3. Crear/verificar tablas
        $this->createTables();
        
        // 4. Configurar permisos
        $this->setPermissions();
        
        // 5. Crear datos de prueba (opcional)
        if ($this->askConfirmation("¿Crear datos de prueba?")) {
            $this->createTestData();
        }
        
        // 6. Verificar API
        $this->testAPI();
        
        // Mostrar resultados
        $this->showResults();
    }
    
    /**
     * Verificar requisitos del sistema
     */
    private function checkRequirements() 
    {
        echo "📋 Verificando requisitos del sistema...\n";
        
        // PHP version
        if (version_compare(PHP_VERSION, '5.6.0', '>=')) {
            $this->success[] = "✅ PHP " . PHP_VERSION . " (Compatible)";
        } else {
            $this->errors[] = "❌ PHP " . PHP_VERSION . " (Requerido >= 5.6.0)";
        }
        
        // Extensions
        $required_extensions = ['pdo', 'pdo_mysql', 'json', 'gd'];
        foreach ($required_extensions as $ext) {
            if (extension_loaded($ext)) {
                $this->success[] = "✅ Extensión {$ext} cargada";
            } else {
                $this->errors[] = "❌ Extensión {$ext} faltante";
            }
        }
        
        // Permissions
        if (is_writable(__DIR__)) {
            $this->success[] = "✅ Directorio API escribible";
        } else {
            $this->warnings[] = "⚠️ Directorio API no escribible";
        }
        
        echo "   Requisitos verificados.\n\n";
    }
    
    /**
     * Crear directorios necesarios
     */
    private function createDirectories() 
    {
        echo "📁 Creando directorios...\n";
        
        $directories = [
            __DIR__ . '/logs',
            __DIR__ . '/endpoints',
            UPLOAD_DIR,
            UPLOAD_DIR . 'layouts',
            UPLOAD_DIR . 'icons'
        ];
        
        foreach ($directories as $dir) {
            if (!is_dir($dir)) {
                if (mkdir($dir, 0755, true)) {
                    $this->success[] = "✅ Directorio creado: " . basename($dir);
                } else {
                    $this->errors[] = "❌ No se pudo crear: " . basename($dir);
                }
            } else {
                $this->success[] = "✅ Directorio existe: " . basename($dir);
            }
        }
        
        echo "   Directorios configurados.\n\n";
    }
    
    /**
     * Crear tablas de la base de datos
     */
    private function createTables() 
    {
        echo "🗄️ Creando/verificando tablas...\n";
        
        $tables = [
            'layout' => $this->getLayoutTableSQL(),
            'mesas' => $this->getMesasTableSQL(),
            'elementos' => $this->getElementosTableSQL()
        ];
        
        foreach ($tables as $tableName => $sql) {
            try {
                $this->db->exec($sql);
                $this->success[] = "✅ Tabla {$tableName} configurada";
            } catch (PDOException $e) {
                if (strpos($e->getMessage(), 'already exists') !== false) {
                    $this->success[] = "✅ Tabla {$tableName} ya existe";
                } else {
                    $this->errors[] = "❌ Error tabla {$tableName}: " . $e->getMessage();
                }
            }
        }
        
        echo "   Tablas configuradas.\n\n";
    }
    
    /**
     * SQL para tabla layout
     */
    private function getLayoutTableSQL() 
    {
        return "
            CREATE TABLE IF NOT EXISTS `" . DB_PREFIX . "spos_restaurant_layout` (
                `rowid` int(11) NOT NULL AUTO_INCREMENT,
                `entity` int(11) DEFAULT 1,
                `name` varchar(255) NOT NULL,
                `description` text,
                `background_width` int(11) DEFAULT 1000,
                `background_height` int(11) DEFAULT 600,
                `background_image` varchar(500) DEFAULT NULL,
                `date_creation` datetime DEFAULT NULL,
                `date_modification` datetime DEFAULT NULL,
                `fk_user_creat` int(11) DEFAULT NULL,
                `fk_user_modif` int(11) DEFAULT NULL,
                `is_active` tinyint(1) DEFAULT 1,
                PRIMARY KEY (`rowid`),
                KEY `idx_entity` (`entity`),
                KEY `idx_active` (`is_active`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
    }
    
    /**
     * SQL para tabla mesas
     */
    private function getMesasTableSQL() 
    {
        return "
            CREATE TABLE IF NOT EXISTS `" . DB_PREFIX . "spos_restaurant_mesas` (
                `rowid` int(11) NOT NULL AUTO_INCREMENT,
                `fk_layout` int(11) NOT NULL,
                `entity` int(11) DEFAULT 1,
                `numero` int(11) NOT NULL,
                `nombre` varchar(255) NOT NULL,
                `capacidad` int(11) DEFAULT 4,
                `tipo_mesa` varchar(50) DEFAULT 'rectangular',
                `pos_x` int(11) DEFAULT 100,
                `pos_y` int(11) DEFAULT 100,
                `ancho` int(11) DEFAULT 80,
                `alto` int(11) DEFAULT 80,
                `color` varchar(20) DEFAULT '#4F46E5',
                `forma` varchar(20) DEFAULT 'rectangle',
                `observaciones` text,
                `date_creation` datetime DEFAULT NULL,
                `date_modification` datetime DEFAULT NULL,
                `is_active` tinyint(1) DEFAULT 1,
                PRIMARY KEY (`rowid`),
                KEY `fk_layout` (`fk_layout`),
                KEY `idx_entity` (`entity`),
                KEY `idx_numero` (`numero`),
                KEY `idx_active` (`is_active`),
                UNIQUE KEY `unique_table_layout` (`fk_layout`, `numero`, `is_active`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
    }
    
    /**
     * SQL para tabla elementos
     */
    private function getElementosTableSQL() 
    {
        return "
            CREATE TABLE IF NOT EXISTS `" . DB_PREFIX . "spos_restaurant_elementos` (
                `rowid` int(11) NOT NULL AUTO_INCREMENT,
                `fk_layout` int(11) NOT NULL,
                `entity` int(11) DEFAULT 1,
                `tipo` varchar(50) NOT NULL,
                `nombre` varchar(255) DEFAULT NULL,
                `pos_x` int(11) DEFAULT 0,
                `pos_y` int(11) DEFAULT 0,
                `ancho` int(11) DEFAULT 50,
                `alto` int(11) DEFAULT 50,
                `color` varchar(20) DEFAULT '#666666',
                `forma` varchar(20) DEFAULT 'rectangle',
                `icon_path` varchar(500) DEFAULT NULL,
                `propiedades` text,
                `date_creation` datetime DEFAULT NULL,
                `date_modification` datetime DEFAULT NULL,
                `is_active` tinyint(1) DEFAULT 1,
                PRIMARY KEY (`rowid`),
                KEY `fk_layout` (`fk_layout`),
                KEY `idx_entity` (`entity`),
                KEY `idx_tipo` (`tipo`),
                KEY `idx_active` (`is_active`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
    }
    
    /**
     * Configurar permisos de archivos
     */
    private function setPermissions() 
    {
        echo "🔐 Configurando permisos...\n";
        
        $files = [
            __DIR__ . '/config.php' => 0644,
            __DIR__ . '/index.php' => 0644,
            __DIR__ . '/auth.php' => 0644,
            __DIR__ . '/database.php' => 0644,
            __DIR__ . '/logs' => 0755,
            UPLOAD_DIR => 0755
        ];
        
        foreach ($files as $file => $permission) {
            if (file_exists($file)) {
                if (chmod($file, $permission)) {
                    $this->success[] = "✅ Permisos configurados: " . basename($file);
                } else {
                    $this->warnings[] = "⚠️ No se pudieron configurar permisos: " . basename($file);
                }
            }
        }
        
        echo "   Permisos configurados.\n\n";
    }
    
    /**
     * Crear datos de prueba
     */
    private function createTestData() 
    {
        echo "🧪 Creando datos de prueba...\n";
        
        try {
            // Layout de prueba
            $stmt = $this->db->prepare("
                INSERT INTO " . DB_PREFIX . "spos_restaurant_layout 
                (entity, name, description, background_width, background_height, date_creation, fk_user_creat, is_active)
                VALUES (1, 'Layout Demo', 'Layout de demostración creado por instalador', 1200, 800, NOW(), 1, 1)
            ");
            
            if ($stmt->execute()) {
                $layoutId = $this->db->lastInsertId();
                $this->success[] = "✅ Layout demo creado (ID: {$layoutId})";
                
                // Mesas de prueba
                $testTables = [
                    [1, 'Mesa 1', 150, 150],
                    [2, 'Mesa 2', 300, 150],
                    [3, 'Mesa 3', 450, 150],
                    [4, 'Mesa VIP', 150, 300],
                    [5, 'Mesa Terraza', 300, 300]
                ];
                
                $tableStmt = $this->db->prepare("
                    INSERT INTO " . DB_PREFIX . "spos_restaurant_mesas 
                    (fk_layout, entity, numero, nombre, pos_x, pos_y, ancho, alto, capacidad, color, date_creation, is_active)
                    VALUES (?, 1, ?, ?, ?, ?, 100, 80, 4, '#4F46E5', NOW(), 1)
                ");
                
                foreach ($testTables as $table) {
                    $tableStmt->execute([$layoutId, $table[0], $table[1], $table[2], $table[3]]);
                }
                
                $this->success[] = "✅ " . count($testTables) . " mesas demo creadas";
            }
            
        } catch (PDOException $e) {
            $this->warnings[] = "⚠️ Error creando datos demo: " . $e->getMessage();
        }
        
        echo "   Datos de prueba configurados.\n\n";
    }
    
    /**
     * Probar la API
     */
    private function testAPI() 
    {
        echo "🧪 Probando API...\n";
        
        // Test simple sin autenticación (solo conectividad)
        $testUrl = $this->getBaseURL() . '/test';
        
        try {
            $context = stream_context_create([
                'http' => [
                    'method' => 'GET',
                    'header' => 'Content-Type: application/json',
                    'timeout' => 10
                ]
            ]);
            
            $response = file_get_contents($testUrl, false, $context);
            
            if ($response !== false) {
                $this->success[] = "✅ API responde correctamente";
                
                $data = json_decode($response, true);
                if ($data && isset($data['status']) && $data['status'] === 'OK') {
                    $this->success[] = "✅ API test endpoint funcional";
                } else {
                    $this->warnings[] = "⚠️ API responde pero formato inesperado";
                }
            } else {
                $this->warnings[] = "⚠️ No se pudo contactar la API";
            }
            
        } catch (Exception $e) {
            $this->warnings[] = "⚠️ Error probando API: " . $e->getMessage();
        }
        
        echo "   Pruebas de API completadas.\n\n";
    }
    
    /**
     * Obtener URL base de la API
     */
    private function getBaseURL() 
    {
        $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $script = $_SERVER['SCRIPT_NAME'] ?? '';
        $dir = dirname($script);
        
        return $protocol . '://' . $host . $dir;
    }
    
    /**
     * Pedir confirmación del usuario
     */
    private function askConfirmation($question) 
    {
        if (php_sapi_name() === 'cli') {
            echo $question . " [y/N]: ";
            $handle = fopen("php://stdin", "r");
            $line = fgets($handle);
            fclose($handle);
            return strtolower(trim($line)) === 'y';
        } else {
            // En web, usar parámetro GET
            return isset($_GET['create_test_data']) && $_GET['create_test_data'] === '1';
        }
    }
    
    /**
     * Mostrar resultados de la instalación
     */
    private function showResults() 
    {
        echo "\n" . str_repeat("=", 60) . "\n";
        echo "📊 RESULTADOS DE LA INSTALACIÓN\n";
        echo str_repeat("=", 60) . "\n\n";
        
        if (!empty($this->success)) {
            echo "✅ ÉXITOS (" . count($this->success) . "):\n";
            foreach ($this->success as $item) {
                echo "   {$item}\n";
            }
            echo "\n";
        }
        
        if (!empty($this->warnings)) {
            echo "⚠️ ADVERTENCIAS (" . count($this->warnings) . "):\n";
            foreach ($this->warnings as $item) {
                echo "   {$item}\n";
            }
            echo "\n";
        }
        
        if (!empty($this->errors)) {
            echo "❌ ERRORES (" . count($this->errors) . "):\n";
            foreach ($this->errors as $item) {
                echo "   {$item}\n";
            }
            echo "\n";
        }
        
        if (empty($this->errors)) {
            echo "🎉 INSTALACIÓN COMPLETADA EXITOSAMENTE!\n\n";
            echo "📋 PRÓXIMOS PASOS:\n";
            echo "   1. Configurar tokens de API en config.php\n";
            echo "   2. Actualizar orígenes CORS permitidos\n";
            echo "   3. Configurar el frontend para usar esta API\n";
            echo "   4. Probar endpoints con herramientas como Postman\n\n";
            echo "🔗 URL de la API: " . $this->getBaseURL() . "\n";
            echo "🧪 Test endpoint: " . $this->getBaseURL() . "/test\n\n";
        } else {
            echo "❌ INSTALACIÓN INCOMPLETA - Revisar errores arriba\n\n";
        }
        
        echo "📝 Logs disponibles en: " . __DIR__ . "/logs/api.log\n";
        echo str_repeat("=", 60) . "\n";
    }
}

// EJECUTAR INSTALACIÓN
$installer = new SPOSInstaller();
$installer->install();

echo "\n🏁 Script de instalación finalizado.\n";

if (php_sapi_name() !== 'cli') {
    echo "<script>console.log('Instalación completada. Revisa la consola para detalles.');</script>";
}
?><?php
/**
 * Instalador Simple SPOS Restaurant - PHP 5.x
 * Ubicación: custom/pos/frontend/api_spos_restaurant/install.php
 */

// Deshabilitar CSRF
$dolibarr_nocsrfcheck = 1;

// Headers
header('Content-Type: text/html; charset=utf-8');

// Cargar Dolibarr
$main_paths = array(
    __DIR__ . '/../../../../main.inc.php',
    __DIR__ . '/../../../main.inc.php',
    __DIR__ . '/../../main.inc.php'
);

$loaded = false;
foreach ($main_paths as $path) {
    if (file_exists($path)) {
        require_once $path;
        $loaded = true;
        break;
    }
}

if (!$loaded) {
    die('❌ No se puede cargar main.inc.php');
}

// Solo admin
if (!$user->admin) {
    accessforbidden();
}

$action = GETPOST('action', 'alpha');

?>
<!DOCTYPE html>
<html lang="es">
<head>
    <title>Instalador Simple SPOS</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; color: #333; }
        .status { padding: 15px; margin: 10px 0; border-radius: 5px; }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
        .info { background: #d1ecf1; color: #0c5460; border: 1px solid #b8daff; }
        .btn { padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; display: inline-block; margin: 5px; }
        .btn:hover { background: #0056b3; }
        .btn-success { background: #28a745; }
        .btn-success:hover { background: #218838; }
        .step { margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 5px; background: #fafafa; }
        .step h3 { margin-top: 0; color: #333; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; }
        .check { color: #28a745; margin-right: 10px; }
        .cross { color: #dc3545; margin-right: 10px; }
    </style>
</head>
<body>

<div class="container">
    <div class="header">
        <h1>🍽️ SPOS Restaurant - Instalador Simple</h1>
        <p>Compatible con PHP 5.x</p>
    </div>

    <?php
    
    // Funciones auxiliares
    function tableExists($db, $table) {
        $sql = "SHOW TABLES LIKE '" . $table . "'";
        $result = $db->query($sql);
        return ($result && $db->num_rows($result) > 0);
    }
    
    function columnExists($db, $table, $column) {
        $sql = "SHOW COLUMNS FROM " . $table . " LIKE '" . $column . "'";
        $result = $db->query($sql);
        return ($result && $db->num_rows($result) > 0);
    }
    
    // Ejecutar instalación
    if ($action === 'install') {
        echo '<div class="step">';
        echo '<h3>🔄 Ejecutando Instalación...</h3>';
        
        $errors = array();
        $success = array();
        
        // Crear tabla layouts
        $sql = "CREATE TABLE IF NOT EXISTS " . MAIN_DB_PREFIX . "spos_restaurant_layout (
            rowid int(11) NOT NULL AUTO_INCREMENT,
            entity int(11) NOT NULL DEFAULT 1,
            name varchar(255) NOT NULL,
            description text,
            background_width int(11) DEFAULT 1000,
            background_height int(11) DEFAULT 600,
            background_image varchar(500),
            is_active tinyint(1) DEFAULT 1,
            date_creation datetime,
            date_modification datetime,
            PRIMARY KEY (rowid),
            UNIQUE KEY uk_entity (entity)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8";
        
        if ($db->query($sql)) {
            $success[] = "✅ Tabla layout creada/verificada";
        } else {
            $errors[] = "❌ Error tabla layout: " . $db->lasterror();
        }
        
        // Crear tabla mesas
        $sql = "CREATE TABLE IF NOT EXISTS " . MAIN_DB_PREFIX . "spos_restaurant_mesas (
            rowid int(11) NOT NULL AUTO_INCREMENT,
            fk_layout int(11) NOT NULL,
            entity int(11) NOT NULL DEFAULT 1,
            numero int(11) NOT NULL,
            nombre varchar(255) NOT NULL,
            capacidad int(11) DEFAULT 4,
            tipo_mesa varchar(50) DEFAULT 'rectangular',
            pos_x int(11) DEFAULT 100,
            pos_y int(11) DEFAULT 100,
            ancho int(11) DEFAULT 80,
            alto int(11) DEFAULT 80,
            color varchar(20) DEFAULT '#4F46E5',
            is_active tinyint(1) DEFAULT 1,
            date_creation datetime,
            PRIMARY KEY (rowid),
            UNIQUE KEY uk_mesa (fk_layout, numero)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8";
        
        if ($db->query($sql)) {
            $success[] = "✅ Tabla mesas creada/verificada";
        } else {
            $errors[] = "❌ Error tabla mesas: " . $db->lasterror();
        }
        
        // Crear tabla elementos
        $sql = "CREATE TABLE IF NOT EXISTS " . MAIN_DB_PREFIX . "spos_restaurant_elementos (
            rowid int(11) NOT NULL AUTO_INCREMENT,
            fk_layout int(11) NOT NULL,
            entity int(11) NOT NULL DEFAULT 1,
            tipo varchar(50) NOT NULL,
            nombre varchar(255),
            contenido text,
            pos_x int(11) DEFAULT 0,
            pos_y int(11) DEFAULT 0,
            ancho int(11) DEFAULT 50,
            alto int(11) DEFAULT 50,
            color varchar(20) DEFAULT '#666666',
            propiedades text,
            is_active tinyint(1) DEFAULT 1,
            date_creation datetime,
            PRIMARY KEY (rowid)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8";
        
        if ($db->query($sql)) {
            $success[] = "✅ Tabla elementos creada/verificada";
        } else {
            $errors[] = "❌ Error tabla elementos: " . $db->lasterror();
        }
        
        // Añadir campos a propal
        if (!columnExists($db, MAIN_DB_PREFIX . "propal", "numero_mesa")) {
            $sql = "ALTER TABLE " . MAIN_DB_PREFIX . "propal ADD COLUMN numero_mesa int(11) NULL";
            if ($db->query($sql)) {
                $success[] = "✅ Campo numero_mesa añadido";
            } else {
                $errors[] = "❌ Error campo numero_mesa: " . $db->lasterror();
            }
        } else {
            $success[] = "✅ Campo numero_mesa ya existe";
        }
        
        if (!columnExists($db, MAIN_DB_PREFIX . "propal", "nombre_mesa")) {
            $sql = "ALTER TABLE " . MAIN_DB_PREFIX . "propal ADD COLUMN nombre_mesa varchar(255) NULL";
            if ($db->query($sql)) {
                $success[] = "✅ Campo nombre_mesa añadido";
            } else {
                $errors[] = "❌ Error campo nombre_mesa: " . $db->lasterror();
            }
        } else {
            $success[] = "✅ Campo nombre_mesa ya existe";
        }
        
        // Crear directorio
        $upload_dir = DOL_DATA_ROOT . '/spos/restaurant/layouts/';
        if (!file_exists($upload_dir)) {
            if (mkdir($upload_dir, 0755, true)) {
                $success[] = "✅ Directorio creado: " . $upload_dir;
            } else {
                $errors[] = "❌ Error creando directorio: " . $upload_dir;
            }
        } else {
            $success[] = "✅ Directorio existe: " . $upload_dir;
        }
        
        // Mostrar resultados
        foreach ($success as $msg) {
            echo '<div class="status success">' . $msg . '</div>';
        }
        
        foreach ($errors as $msg) {
            echo '<div class="status error">' . $msg . '</div>';
        }
        
        if (empty($errors)) {
            echo '<div class="status success">🎉 ¡Instalación completada exitosamente!</div>';
        }
        
        echo '</div>';
    }
    
    // Verificaciones del sistema
    echo '<div class="step">';
    echo '<h3>🔍 Verificación del Sistema</h3>';
    
    // PHP
    $php_ok = version_compare(PHP_VERSION, '5.6.0', '>=');
    echo '<p><span class="' . ($php_ok ? 'check' : 'cross') . '">' . ($php_ok ? '✅' : '❌') . '</span>';
    echo 'PHP: ' . PHP_VERSION . ' (' . ($php_ok ? 'Compatible' : 'Requiere 5.6+') . ')</p>';
    
    // Dolibarr
    $dol_ok = defined('DOL_VERSION');
    echo '<p><span class="' . ($dol_ok ? 'check' : 'cross') . '">' . ($dol_ok ? '✅' : '❌') . '</span>';
    echo 'Dolibarr: ' . ($dol_ok ? DOL_VERSION : 'No detectado') . '</p>';
    
    // Base de datos
    $db_ok = isset($db) && is_object($db);
    echo '<p><span class="' . ($db_ok ? 'check' : 'cross') . '">' . ($db_ok ? '✅' : '❌') . '</span>';
    echo 'Base de datos: ' . ($db_ok ? 'Conectada' : 'No conectada') . '</p>';
    
    // Extensiones
    $extensions = array('mysqli', 'json');
    foreach ($extensions as $ext) {
        $ext_ok = extension_loaded($ext);
        echo '<p><span class="' . ($ext_ok ? 'check' : 'cross') . '">' . ($ext_ok ? '✅' : '❌') . '</span>';
        echo 'Extensión ' . $ext . ': ' . ($ext_ok ? 'Disponible' : 'No disponible') . '</p>';
    }
    
    // Permisos
    $write_ok = is_writable(DOL_DATA_ROOT);
    echo '<p><span class="' . ($write_ok ? 'check' : 'cross') . '">' . ($write_ok ? '✅' : '❌') . '</span>';
    echo 'Directorio escribible: ' . DOL_DATA_ROOT . '</p>';
    
    echo '</div>';
    
    // Estado de tablas
    echo '<div class="step">';
    echo '<h3>📊 Estado de las Tablas</h3>';
    
    $tables = array(
        'spos_restaurant_layout' => 'Layouts',
        'spos_restaurant_mesas' => 'Mesas',
        'spos_restaurant_elementos' => 'Elementos'
    );
    
    $all_exist = true;
    foreach ($tables as $table => $desc) {
        $exists = tableExists($db, MAIN_DB_PREFIX . $table);
        $all_exist = $all_exist && $exists;
        echo '<p><span class="' . ($exists ? 'check' : 'cross') . '">' . ($exists ? '✅' : '❌') . '</span>';
        echo 'Tabla ' . $table . ': ' . ($exists ? 'Existe' : 'No existe') . ' (' . $desc . ')</p>';
    }
    
    // Campos en propal
    $campo1 = columnExists($db, MAIN_DB_PREFIX . "propal", "numero_mesa");
    $campo2 = columnExists($db, MAIN_DB_PREFIX . "propal", "nombre_mesa");
    $all_exist = $all_exist && $campo1 && $campo2;
    
    echo '<p><span class="' . ($campo1 ? 'check' : 'cross') . '">' . ($campo1 ? '✅' : '❌') . '</span>';
    echo 'Campo numero_mesa: ' . ($campo1 ? 'Existe' : 'No existe') . '</p>';
    
    echo '<p><span class="' . ($campo2 ? 'check' : 'cross') . '">' . ($campo2 ? '✅' : '❌') . '</span>';
    echo 'Campo nombre_mesa: ' . ($campo2 ? 'Existe' : 'No existe') . '</p>';
    
    echo '</div>';
    
    // Configuración API
    echo '<div class="step">';
    echo '<h3>🔑 Configuración API Simple</h3>';
    echo '<div class="info">';
    echo '<p><strong>✅ Ventajas de la API Simple:</strong></p>';
    echo '<ul>';
    echo '<li>✅ Compatible con PHP 5.x</li>';
    echo '<li>✅ Sin problemas de CSRF</li>';
    echo '<li>✅ Autenticación por API Key simple</li>';
    echo '<li>✅ Código limpio y mantenible</li>';
    echo '<li>✅ Menos dependencias</li>';
    echo '</ul>';
    echo '</div>';
    
    echo '<p><strong>URLs de la API:</strong></p>';
    $base_url = dol_buildpath('/custom/pos/frontend/api_spos_restaurant/', 2);
    echo '<pre>';
    echo 'Base: ' . $base_url . "\n";
    echo 'Test: GET ' . $base_url . 'test' . "\n";
    echo 'Layout: GET ' . $base_url . 'layout/{entity}' . "\n";
    echo 'Crear Layout: POST ' . $base_url . 'layout' . "\n";
    echo '</pre>';
    
    echo '<p><strong>Autenticación:</strong></p>';
    echo '<pre>Header: X-API-Key: TU_API_KEY_AQUI</pre>';
    
    echo '</div>';
    
    // Configuración CSRF (simplificada)
    echo '<div class="step">';
    echo '<h3>🔒 Configuración CSRF Resuelta</h3>';
    echo '<div class="success">';
    echo '<p>✅ La API simple ya incluye la solución CSRF integrada.</p>';
    echo '<p>✅ No requiere modificar conf.php manualmente.</p>';
    echo '<p>✅ Funciona con requests cross-origin.</p>';
    echo '</div>';
    echo '</div>';
    
    // Acciones
    echo '<div class="step">';
    echo '<h3>⚡ Acciones</h3>';
    
    if (!$all_exist) {
        echo '<div class="warning">⚠️ Se requiere instalación para crear tablas faltantes.</div>';
        echo '<a href="?action=install" class="btn btn-success" onclick="return confirm(\'¿Instalar/actualizar tablas?\')">🚀 Instalar Sistema</a>';
    } else {
        echo '<div class="success">✅ Sistema correctamente instalado.</div>';
        echo '<a href="?action=install" class="btn" onclick="return confirm(\'¿Reinstalar tablas?\')">🔄 Reinstalar</a>';
    }
    
    echo '<a href="../" class="btn">🧪 Probar API</a>';
    echo '<a href="' . dol_buildpath('/custom/pos/frontend/', 1) . '" class="btn">🏠 Ir al POS</a>';
    
    echo '</div>';
    
    // Testing
    echo '<div class="step">';
    echo '<h3>🧪 Pruebas Rápidas</h3>';
    echo '<p><strong>Probar API desde navegador:</strong></p>';
    echo '<p><a href="' . $base_url . 'test?api_key=TU_API_KEY" target="_blank">' . $base_url . 'test?api_key=TU_API_KEY</a></p>';
    
    echo '<p><strong>Probar desde línea de comandos:</strong></p>';
    echo '<pre>curl -X GET "' . $base_url . 'test" \
     -H "X-API-Key: TU_API_KEY"</pre>';
     
    echo '<p><strong>Respuesta esperada:</strong></p>';
    echo '<pre>{"status":"OK","message":"SPOS API funcionando correctamente"}</pre>';
    
    echo '</div>';
    
    ?>

</div>

</body>
</html>