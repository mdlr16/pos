<?php
/**
 * Verificar imagen en base de datos
 * Ubicación: custom/pos/frontend/api_spos_restaurant_secure/check_database.php
 */

header('Access-Control-Allow-Origin: https://siel.nubesiel.top');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(['status' => 'OK']);
    exit();
}

try {
    // Configuración de BD
    $config = [
        'host' => 'localhost',
        'dbname' => 'nubesiel_siel',
        'user' => 'nubesiel_sieladmin',
        'password' => 'Siel9624@',
        'prefix' => 'llx_'
    ];
    
    $dsn = "mysql:host={$config['host']};dbname={$config['dbname']};charset=utf8mb4";
    $pdo = new PDO($dsn, $config['user'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Obtener todos los layouts con imágenes
    $stmt = $pdo->query("
        SELECT rowid, name, background_image, date_creation, date_modification 
        FROM {$config['prefix']}spos_restaurant_layout 
        WHERE is_active = 1 
        ORDER BY date_modification DESC, date_creation DESC
    ");
    
    $layouts = $stmt->fetchAll();
    
    $result = [
        'status' => 'success',
        'timestamp' => date('Y-m-d H:i:s'),
        'total_layouts' => count($layouts),
        'layouts' => [],
        'image_analysis' => []
    ];
    
    foreach ($layouts as $layout) {
        $layoutInfo = [
            'id' => $layout['rowid'],
            'name' => $layout['name'],
            'background_image' => $layout['background_image'],
            'has_image' => !empty($layout['background_image']),
            'created' => $layout['date_creation'],
            'modified' => $layout['date_modification']
        ];
        
        // Si tiene imagen, verificar que el archivo existe
        if (!empty($layout['background_image'])) {
            $imagePath = __DIR__ . '/../../../../' . $layout['background_image'];
            $layoutInfo['image_file_exists'] = file_exists($imagePath);
            $layoutInfo['image_file_size'] = file_exists($imagePath) ? filesize($imagePath) : 0;
            $layoutInfo['image_full_path'] = $imagePath;
            $layoutInfo['image_url'] = 'https://siel.nubesiel.top/' . $layout['background_image'];
            
            $result['image_analysis'][] = [
                'layout_id' => $layout['rowid'],
                'image_path' => $layout['background_image'],
                'file_exists' => file_exists($imagePath),
                'file_size' => file_exists($imagePath) ? filesize($imagePath) : 0,
                'full_path' => $imagePath,
                'url' => 'https://siel.nubesiel.top/' . $layout['background_image']
            ];
        }
        
        $result['layouts'][] = $layoutInfo;
    }
    
    // Verificar archivos en el directorio de uploads
    $uploadDir = __DIR__ . '/../../../../documents/spos_restaurant/layouts/';
    $result['upload_directory'] = [
        'path' => $uploadDir,
        'exists' => is_dir($uploadDir),
        'writable' => is_dir($uploadDir) ? is_writable($uploadDir) : false,
        'files' => []
    ];
    
    if (is_dir($uploadDir)) {
        $files = glob($uploadDir . '*');
        foreach ($files as $file) {
            if (is_file($file)) {
                $result['upload_directory']['files'][] = [
                    'filename' => basename($file),
                    'size' => filesize($file),
                    'modified' => date('Y-m-d H:i:s', filemtime($file)),
                    'url' => 'https://siel.nubesiel.top/documents/spos_restaurant/layouts/' . basename($file)
                ];
            }
        }
    }
    
    // Buscar la imagen más reciente
    $recentImage = null;
    foreach ($result['upload_directory']['files'] as $file) {
        if (strpos($file['filename'], 'layout_1_Untitled') !== false) {
            if (!$recentImage || $file['modified'] > $recentImage['modified']) {
                $recentImage = $file;
            }
        }
    }
    
    if ($recentImage) {
        $result['recent_upload'] = $recentImage;
        
        // Verificar si esta imagen está en la BD
        $stmt = $pdo->prepare("
            SELECT rowid, name FROM {$config['prefix']}spos_restaurant_layout 
            WHERE background_image LIKE ? AND is_active = 1
        ");
        $stmt->execute(['%' . $recentImage['filename']]);
        $linkedLayout = $stmt->fetch();
        
        $result['recent_upload']['linked_to_layout'] = $linkedLayout ? $linkedLayout : null;
    }
    
    echo json_encode($result, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>