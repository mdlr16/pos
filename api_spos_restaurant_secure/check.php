<?php
/**
 * Validador de Configuración SPOS - Diagnóstico completo
 * Ubicación: custom/pos/frontend/api_spos_restaurant/config_check.php
 * 
 * Este archivo verifica que todo esté configurado correctamente
 */

// Deshabilitar CSRF
$dolibarr_nocsrfcheck = 1;

// Headers simples
header('Content-Type: text/html; charset=utf-8');

// Cargar Dolibarr
$main_paths = array(
    __DIR__ . '/../../../../main.inc.php',
    __DIR__ . '/../../../main.inc.php'
);

$loaded = false;
foreach ($main_paths as $path) {
    if (file_exists($path)) {
        require_once $path;
        $loaded = true;
        break;
    }
}

?>
<!DOCTYPE html>
<html lang="es">
<head>
    <title>Diagnóstico SPOS</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f0f2f5; }
        .container { max-width: 1000px; margin: 0 auto; }
        .card { background: white; margin: 20px 0; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; color: #333; margin-bottom: 30px; }
        .status-good { color: #28a745; font-weight: bold; }
        .status-bad { color: #dc3545; font-weight: bold; }
        .status-warning { color: #ffc107; font-weight: bold; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .test-item { padding: 10px; margin: 5px 0; border-left: 4px solid #ddd; background: #f8f9fa; }
        .test-item.good { border-left-color: #28a745; }
        .test-item.bad { border-left-color: #dc3545; }
        .test-item.warning { border-left-color: #ffc107; }
        .code { background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; margin: 10px 0; }
        .btn { padding: 8px 16px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; display: inline-block; margin: 5px; }
        .btn:hover { background: #0056b3; }
        .endpoint-test { margin: 10px 0; padding: 15px; background: #f8f9fa; border-radius: 4px; }
    </style>
</head>
<body>

<div class="container">
    <div class="header">
        <h1>🔍 Diagnóstico Completo SPOS</h1>
        <p>Verificación automática de configuración y funcionamiento</p>
    </div>

    <?php if (!$loaded): ?>
        <div class="card">
            <div class="status-bad">❌ Error Fatal: No se puede cargar Dolibarr</div>
            <p>No se pudo cargar main.inc.php. Verifique la ubicación del archivo.</p>
        </div>
        <?php exit; ?>
    <?php endif; ?>

    <div class="grid">
        <!-- Verificaciones del Sistema -->
        <div class="card">
            <h3>🖥️ Sistema Base</h3>
            
            <?php
            // PHP Version
            $php_ok = version_compare(PHP_VERSION, '5.6.0', '>=');
            echo '<div class="test-item ' . ($php_ok ? 'good' : 'bad') . '">';
            echo '<strong>' . ($php_ok ? '✅' : '❌') . ' PHP:</strong> ' . PHP_VERSION;
            echo $php_ok ? ' (Compatible)' : ' (Requiere 5.6+)';
            echo '</div>';
            
            // Dolibarr
            $dol_ok = defined('DOL_VERSION');
            echo '<div class="test-item ' . ($dol_ok ? 'good' : 'bad') . '">';
            echo '<strong>' . ($dol_ok ? '✅' : '❌') . ' Dolibarr:</strong> ';
            echo $dol_ok ? DOL_VERSION : 'No detectado';
            echo '</div>';
            
            // Base de datos
            $db_ok = isset($db) && is_object($db);
            echo '<div class="test-item ' . ($db_ok ? 'good' : 'bad') . '">';
            echo '<strong>' . ($db_ok ? '✅' : '❌') . ' Base de datos:</strong> ';
            echo $db_ok ? 'Conectada' : 'No conectada';
            echo '</div>';
            
            // Extensiones
            $extensions = array('mysqli', 'json', 'curl');
            foreach ($extensions as $ext) {
                $ext_ok = extension_loaded($ext);
                echo '<div class="test-item ' . ($ext_ok ? 'good' : 'bad') . '">';
                echo '<strong>' . ($ext_ok ? '✅' : '❌') . ' ' . $ext . ':</strong> ';
                echo $ext_ok ? 'Disponible' : 'No disponible';
                echo '</div>';
            }
            ?>
        </div>

        <!-- Verificaciones de Archivos -->
        <div class="card">
            <h3>📁 Archivos SPOS</h3>
            
            <?php
            $files = array(
                'index.php' => 'API Principal',
                'install.php' => 'Instalador',
                'config_check.php' => 'Este diagnóstico'
            );
            
            foreach ($files as $file => $desc) {
                $exists = file_exists(__DIR__ . '/' . $file);
                echo '<div class="test-item ' . ($exists ? 'good' : 'bad') . '">';
                echo '<strong>' . ($exists ? '✅' : '❌') . ' ' . $file . ':</strong> ';
                echo $exists ? 'Existe' : 'No encontrado';
                echo '<br><small>' . $desc . '</small>';
                echo '</div>';
            }
            
            // Permisos
            $writable = is_writable(__DIR__);
            echo '<div class="test-item ' . ($writable ? 'good' : 'warning') . '">';
            echo '<strong>' . ($writable ? '✅' : '⚠️') . ' Permisos:</strong> ';
            echo $writable ? 'Escritura OK' : 'Solo lectura';
            echo '</div>';
            ?>
        </div>
    </div>

    <!-- Verificaciones de Base de Datos -->
    <div class="card">
        <h3>🗄️ Base de Datos SPOS</h3>
        
        <div class="grid">
            <div>
                <h4>Tablas Principales</h4>
                <?php
                if ($db_ok) {
                    $tables = array(
                        'spos_restaurant_layout' => 'Layouts de restaurante',
                        'spos_restaurant_mesas' => 'Configuración de mesas',
                        'spos_restaurant_elementos' => 'Elementos decorativos'
                    );
                    
                    foreach ($tables as $table => $desc) {
                        $sql = "SHOW TABLES LIKE '" . MAIN_DB_PREFIX . $table . "'";
                        $result = $db->query($sql);
                        $exists = ($result && $db->num_rows($result) > 0);
                        
                        echo '<div class="test-item ' . ($exists ? 'good' : 'bad') . '">';
                        echo '<strong>' . ($exists ? '✅' : '❌') . ' ' . $table . ':</strong><br>';
                        echo '<small>' . $desc . '</small>';
                        echo '</div>';
                    }
                } else {
                    echo '<div class="test-item bad">❌ No se puede verificar - BD no conectada</div>';
                }
                ?>
            </div>
            
            <div>
                <h4>Campos Personalizados</h4>
                <?php
                if ($db_ok) {
                    $fields = array(
                        'numero_mesa' => 'Número de mesa en proposals',
                        'nombre_mesa' => 'Nombre de mesa en proposals'
                    );
                    
                    foreach ($fields as $field => $desc) {
                        $sql = "SHOW COLUMNS FROM " . MAIN_DB_PREFIX . "propal LIKE '" . $field . "'";
                        $result = $db->query($sql);
                        $exists = ($result && $db->num_rows($result) > 0);
                        
                        echo '<div class="test-item ' . ($exists ? 'good' : 'bad') . '">';
                        echo '<strong>' . ($exists ? '✅' : '❌') . ' ' . $field . ':</strong><br>';
                        echo '<small>' . $desc . '</small>';
                        echo '</div>';
                    }
                } else {
                    echo '<div class="test-item bad">❌ No se puede verificar - BD no conectada</div>';
                }
                ?>
            </div>
        </div>
    </div>

    <!-- Tests de API -->
    <div class="card">
        <h3>🔌 Tests de API</h3>
        
        <?php
        $base_url = (isset($_SERVER['HTTPS']) ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'];
        $api_path = '/custom/pos/frontend/api_spos_restaurant';
        $api_url = $base_url . $api_path;
        ?>
        
        <div class="endpoint-test">
            <h4>🧪 Test Manual de Endpoints</h4>
            <p><strong>URL Base:</strong> <code><?php echo $api_url; ?></code></p>
            
            <div class="code">
# Test básico (reemplazar TU_API_KEY)
curl -X GET "<?php echo $api_url; ?>/test" -H "X-API-Key: TU_API_KEY"

# Expected: {"status":"OK","message":"SPOS API funcionando correctamente"}
            </div>
            
            <p><strong>Tests en navegador (con API Key):</strong></p>
            <ul>
                <li><a href="<?php echo $api_url; ?>/test?api_key=TU_API_KEY" target="_blank">Test de conectividad</a></li>
                <li><a href="<?php echo $api_url; ?>?api_key=TU_API_KEY" target="_blank">Info de la API</a></li>
            </ul>
        </div>
        
        <div class="endpoint-test">
            <h4>📋 Endpoints Disponibles</h4>
            <div class="grid">
                <div>
                    <strong>GET Endpoints:</strong>
                    <ul>
                        <li><code>/test</code> - Test conectividad</li>
                        <li><code>/layout/{entity}</code> - Obtener layout</li>
                        <li><code>/layout/{id}/tables</code> - Mesas del layout</li>
                        <li><code>/layout/{id}/elements</code> - Elementos decorativos</li>
                        <li><code>/proposals/{entity}</code> - Mesas operativas</li>
                    </ul>
                </div>
                <div>
                    <strong>POST Endpoints:</strong>
                    <ul>
                        <li><code>/layout</code> - Crear layout</li>
                        <li><code>/table</code> - Crear mesa</li>
                        <li><code>/element</code> - Crear elemento</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>

    <!-- Configuración Frontend -->
    <div class="card">
        <h3>⚛️ Configuración Frontend React</h3>
        
        <p><strong>Variables de configuración para tu aplicación React:</strong></p>
        <div class="code">
const variables = {
  SPOS_URL: '<?php echo $base_url; ?>',
  DOLIBARR_API_KEY: 'TU_API_KEY_AQUI'  // Obtener de Dolibarr → Setup → API
};

// Hook usage:
const mesasHook = useMesas(variables, { entity: 1 });
        </div>
        
        <p><strong>Headers requeridos en requests:</strong></p>
        <div class="code">
headers: {
  'Content-Type': 'application/json',
  'X-API-Key': 'TU_API_KEY_AQUI',
  'Accept': 'application/json'
}
        </div>
    </div>

    <!-- Acciones Disponibles -->
    <div class="card">
        <h3>⚡ Acciones Disponibles</h3>
        
        <div class="grid">
            <div>
                <h4>🛠️ Instalación/Configuración</h4>
                <a href="install.php" class="btn">📦 Ejecutar Instalador</a>
                <a href="<?php echo $api_url; ?>/test" class="btn" target="_blank">🧪 Probar API</a>
            </div>
            <div>
                <h4>📚 Documentación</h4>
                <a href="#" class="btn" onclick="window.print()">🖨️ Imprimir Diagnóstico</a>
                <a href="<?php echo $_SERVER['PHP_SELF']; ?>" class="btn">🔄 Recargar Tests</a>
            </div>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #e7f3ff; border-radius: 4px;">
            <h4>💡 Siguiente Paso</h4>
            <p>Si todas las verificaciones son ✅, tu API SPOS está lista para usar.</p>
            <p><strong>Para configurar el frontend:</strong></p>
            <ol>
                <li>Obtén tu API Key de Dolibarr (Setup → Modules → API)</li>
                <li>Configura las variables en tu aplicación React</li>
                <li>Usa el hook <code>useMesas</code> simplificado</li>
                <li>¡Comienza a crear layouts de restaurante!</li>
            </ol>
        </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin: 40px 0; color: #6c757d;">
        <p><strong>SPOS Restaurant API Simple</strong> - Compatible PHP 5.x+ | Sin problemas CSRF | Fácil configuración</p>
        <p>Diagnóstico ejecutado el <?php echo date('Y-m-d H:i:s'); ?></p>
    </div>

</div>

</body>
</html>