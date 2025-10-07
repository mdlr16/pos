<?php
/**
 * Crear tablas faltantes para SPOS Restaurant
 * Ubicación: custom/pos/frontend/api_spos_restaurant_secure/create_missing_tables.php
 * 
 * EJECUTAR UNA SOLA VEZ para crear las tablas de layout y mesas
 */

echo "🗄️ Creando tablas faltantes para SPOS Restaurant\n";
echo "===============================================\n\n";

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
    
    echo "✅ Conectado a BD: {$config['dbname']}\n\n";
    
    // 1. Verificar qué tablas existen
    echo "🔍 Verificando tablas existentes...\n";
    $tables = [
        'spos_restaurant_layout' => false,
        'spos_restaurant_mesas' => false,
        'api_keys' => false
    ];
    
    foreach ($tables as $tableName => $exists) {
        $stmt = $pdo->prepare("SHOW TABLES LIKE ?");
        $stmt->execute([$config['prefix'] . $tableName]);
        if ($stmt->fetch()) {
            echo "   ✅ {$config['prefix']}{$tableName} existe\n";
            $tables[$tableName] = true;
        } else {
            echo "   ❌ {$config['prefix']}{$tableName} NO existe\n";
        }
    }
    echo "\n";
    
    // 2. Crear tabla de layouts si no existe
    if (!$tables['spos_restaurant_layout']) {
        echo "🔧 Creando tabla spos_restaurant_layout...\n";
        $layoutSql = "
            CREATE TABLE {$config['prefix']}spos_restaurant_layout (
                rowid INT AUTO_INCREMENT PRIMARY KEY,
                entity INT NOT NULL DEFAULT 1,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                background_width INT DEFAULT 1000,
                background_height INT DEFAULT 600,
                background_image VARCHAR(500),
                background_color VARCHAR(7) DEFAULT '#ffffff',
                date_creation DATETIME NOT NULL,
                date_modification DATETIME,
                fk_user_creat INT,
                fk_user_modif INT,
                is_active TINYINT(1) DEFAULT 1,
                
                INDEX idx_entity (entity),
                INDEX idx_active (is_active),
                INDEX idx_creation (date_creation)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Layouts del restaurante'
        ";
        
        $pdo->exec($layoutSql);
        echo "   ✅ Tabla {$config['prefix']}spos_restaurant_layout creada\n";
    } else {
        echo "⏭️ Tabla spos_restaurant_layout ya existe\n";
    }
    
    // 3. Crear tabla de mesas si no existe
    if (!$tables['spos_restaurant_mesas']) {
        echo "🔧 Creando tabla spos_restaurant_mesas...\n";
        $mesasSql = "
            CREATE TABLE {$config['prefix']}spos_restaurant_mesas (
                rowid INT AUTO_INCREMENT PRIMARY KEY,
                fk_layout INT NOT NULL,
                entity INT NOT NULL DEFAULT 1,
                numero INT NOT NULL,
                nombre VARCHAR(100) NOT NULL,
                pos_x INT NOT NULL DEFAULT 0,
                pos_y INT NOT NULL DEFAULT 0,
                ancho INT DEFAULT 80,
                alto INT DEFAULT 80,
                capacidad INT DEFAULT 4,
                color VARCHAR(7) DEFAULT '#4F46E5',
                forma ENUM('circle', 'square', 'rectangle') DEFAULT 'circle',
                rotacion INT DEFAULT 0,
                date_creation DATETIME NOT NULL,
                date_modification DATETIME,
                fk_user_creat INT,
                fk_user_modif INT,
                is_active TINYINT(1) DEFAULT 1,
                
                INDEX idx_layout (fk_layout),
                INDEX idx_entity (entity),
                INDEX idx_numero (numero),
                INDEX idx_active (is_active),
                UNIQUE KEY uk_layout_numero (fk_layout, numero),
                
                CONSTRAINT fk_mesa_layout 
                    FOREIGN KEY (fk_layout) 
                    REFERENCES {$config['prefix']}spos_restaurant_layout(rowid)
                    ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Mesas del layout'
        ";
        
        $pdo->exec($mesasSql);
        echo "   ✅ Tabla {$config['prefix']}spos_restaurant_mesas creada\n";
    } else {
        echo "⏭️ Tabla spos_restaurant_mesas ya existe\n";
    }
    
    // 4. Crear/verificar tabla de API keys
    if (!$tables['api_keys']) {
        echo "🔧 Creando tabla api_keys...\n";
        $apiKeysSql = "
            CREATE TABLE {$config['prefix']}api_keys (
                rowid INT AUTO_INCREMENT PRIMARY KEY,
                fk_user INT NOT NULL,
                key_value VARCHAR(64) NOT NULL UNIQUE,
                key_name VARCHAR(100),
                date_creation DATETIME NOT NULL,
                date_expiration DATETIME,
                last_used DATETIME,
                is_active TINYINT(1) DEFAULT 1,
                permissions JSON,
                
                INDEX idx_user (fk_user),
                INDEX idx_key (key_value),
                INDEX idx_active (is_active),
                
                CONSTRAINT fk_apikey_user 
                    FOREIGN KEY (fk_user) 
                    REFERENCES {$config['prefix']}user(rowid)
                    ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Claves API para autenticación'
        ";
        
        $pdo->exec($apiKeysSql);
        echo "   ✅ Tabla {$config['prefix']}api_keys creada\n";
    } else {
        echo "⏭️ Tabla api_keys ya existe\n";
    }
    
    echo "\n";
    
    // 5. Verificar si el API key de prueba existe
    echo "🔑 Configurando API key de prueba...\n";
    $testToken = 'bf6366f9859b5d2c7522ae155e2d834157419421';
    
    $tokenCheck = $pdo->prepare("SELECT rowid FROM {$config['prefix']}api_keys WHERE key_value = ?");
    $tokenCheck->execute([$testToken]);
    
    if (!$tokenCheck->fetch()) {
        // Buscar usuario admin activo
        $adminStmt = $pdo->prepare("SELECT rowid, login FROM {$config['prefix']}user WHERE admin = 1 AND statut = 1 ORDER BY rowid LIMIT 1");
        $adminStmt->execute();
        $admin = $adminStmt->fetch();
        
        if ($admin) {
            $insertKey = $pdo->prepare("
                INSERT INTO {$config['prefix']}api_keys 
                (fk_user, key_value, key_name, date_creation, is_active, permissions)
                VALUES (?, ?, ?, NOW(), 1, ?)
            ");
            
            $permissions = json_encode([
                'read_layout' => true,
                'write_layout' => true,
                'upload_images' => true,
                'manage_tables' => true,
                'read_proposals' => true,
                'write_proposals' => true
            ]);
            
            $insertKey->execute([
                $admin['rowid'],
                $testToken,
                'SPOS Restaurant API Key',
                $permissions
            ]);
            
            echo "   ✅ API key creada para usuario: {$admin['login']}\n";
        } else {
            echo "   ⚠️ No se encontró usuario admin activo\n";
            echo "   📝 Crear manualmente: INSERT INTO {$config['prefix']}api_keys (fk_user, key_value, key_name, date_creation, is_active) VALUES (1, '{$testToken}', 'SPOS Test', NOW(), 1);\n";
        }
    } else {
        echo "   ✅ API key ya existe\n";
    }
    
    echo "\n";
    
    // 6. Verificar campos necesarios en tabla propal
    echo "🔍 Verificando campos en tabla propal...\n";
    
    $proposalFields = ['numero_mesa', 'nombre_mesa'];
    $proposalTable = $config['prefix'] . 'propal';
    
    foreach ($proposalFields as $field) {
        $columnCheck = $pdo->prepare("
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
        ");
        $columnCheck->execute([$config['dbname'], $proposalTable, $field]);
        
        if (!$columnCheck->fetch()) {
            echo "   🔧 Agregando campo {$field} a tabla propal...\n";
            
            if ($field === 'numero_mesa') {
                $pdo->exec("ALTER TABLE {$proposalTable} ADD COLUMN numero_mesa INT NULL COMMENT 'Número de mesa'");
            } elseif ($field === 'nombre_mesa') {
                $pdo->exec("ALTER TABLE {$proposalTable} ADD COLUMN nombre_mesa VARCHAR(100) NULL COMMENT 'Nombre de la mesa'");
            }
            
            echo "     ✅ Campo {$field} agregado\n";
        } else {
            echo "   ✅ Campo {$field} ya existe\n";
        }
    }
    
    echo "\n";
    
    // 7. Test final de las tablas
    echo "🧪 Test final de tablas...\n";
    
    $testTables = [
        'spos_restaurant_layout' => 'Layouts',
        'spos_restaurant_mesas' => 'Mesas',
        'api_keys' => 'API Keys',
        'user' => 'Usuarios',
        'propal' => 'Proposals'
    ];
    
    foreach ($testTables as $table => $name) {
        try {
            $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM {$config['prefix']}{$table}");
            $stmt->execute();
            $result = $stmt->fetch();
            echo "   ✅ {$name}: {$result['count']} registros\n";
        } catch (Exception $e) {
            echo "   ❌ {$name}: Error - {$e->getMessage()}\n";
        }
    }
    
    echo "\n" . str_repeat("=", 60) . "\n";
    echo "🎉 CONFIGURACIÓN DE TABLAS COMPLETADA!\n";
    echo str_repeat("=", 60) . "\n\n";
    
    echo "📋 RESUMEN:\n";
    echo "✅ Tablas de layouts y mesas verificadas/creadas\n";
    echo "✅ API key configurada\n";
    echo "✅ Campos de mesa agregados a proposals\n";
    echo "✅ Base de datos lista para la API\n\n";
    
    echo "🔑 TOKEN DE PRUEBA:\n";
    echo "{$testToken}\n\n";
    
    echo "🧪 PRÓXIMOS PASOS:\n";
    echo "1. Probar con CORS test: /test (ya funciona)\n";
    echo "2. Probar autenticación con token\n";
    echo "3. Crear primer layout desde React\n";
    echo "4. Verificar endpoints de proposals\n\n";
    
    echo "🔗 ENDPOINTS DISPONIBLES:\n";
    echo "• GET  /test                          - Test API\n";
    echo "• GET  /layout/{entity}               - Obtener layout\n";
    echo "• POST /layout                        - Crear layout\n";
    echo "• GET  /layout/{id}/tables            - Obtener mesas\n";
    echo "• GET  /layout/{id}/elements          - Obtener elementos\n";
    echo "• GET  /proposals/{entity}            - Obtener proposals\n";
    echo "• GET  /proposals/{entity}/statistics - Estadísticas\n";
    echo "• POST /upload-image                  - Subir imagen\n";
    
} catch (PDOException $e) {
    echo "❌ ERROR DE BASE DE DATOS:\n";
    echo "Error: " . $e->getMessage() . "\n";
    echo "Código: " . $e->getCode() . "\n\n";
    
    echo "🔧 VERIFICAR:\n";
    echo "• Credenciales de BD correctas\n";
    echo "• Usuario tiene permisos CREATE/ALTER TABLE\n";
    echo "• Base de datos existe y es accesible\n";
    exit(1);
    
} catch (Exception $e) {
    echo "❌ ERROR GENERAL:\n";
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>