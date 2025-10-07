<?php
/**
 * Script para subir imágenes de layout de restaurante - Versión Corregida
 * Ubicación: /custom/pos/frontend/api_spos_restaurant/upload_layout_image.php
 */

// Headers CORS - Antes de cualquier output
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, DOLAPIKEY, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

// Manejar solicitudes OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Solo permitir POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(array('success' => false, 'error' => 'Método no permitido. Solo POST permitido.'));
    exit();
}

// SOLUCIÓN CSRF: Deshabilitar protección CSRF para este script
$_SERVER['DISABLE_CSRF'] = 1;
$dolibarr_nocsrfcheck = 1;
define('NOSESSION', 1); // Opcional si no necesitas sesiones

// Cargar configuración de Dolibarr con path corregido
$script_file = basename(__FILE__);
$path = __DIR__.'/';

// Buscar main.inc.php en diferentes ubicaciones posibles
$main_inc_paths = array(
    $path."../../../../main.inc.php",  // Ruta estándar desde custom/pos/frontend/api_spos_restaurant/
    $path."../../../main.inc.php",     // Una carpeta menos
    $path."../../main.inc.php",        // Dos carpetas menos
    $_SERVER['DOCUMENT_ROOT']."/main.inc.php" // Raíz del servidor
);

$main_inc_loaded = false;
foreach ($main_inc_paths as $main_path) {
    if (is_file($main_path)) {
        require_once $main_path;
        $main_inc_loaded = true;
        error_log("SPOS Upload: main.inc.php cargado desde: " . $main_path);
        break;
    }
}

if (!$main_inc_loaded) {
    http_response_code(500);
    echo json_encode(array(
        'success' => false, 
        'error' => 'No se puede cargar main.inc.php. Verifique la instalación de Dolibarr.',
        'tried_paths' => $main_inc_paths
    ));
    exit;
}

try {
    // Verificar autenticación API
    $api_key = '';
    if (isset($_SERVER['HTTP_DOLAPIKEY'])) {
        $api_key = $_SERVER['HTTP_DOLAPIKEY'];
    } elseif (isset($_POST['api_key'])) {
        $api_key = $_POST['api_key'];
    } elseif (isset($_GET['api_key'])) {
        $api_key = $_GET['api_key'];
    }
    
    if (empty($api_key)) {
        throw new Exception('API Key requerida. Incluya DOLAPIKEY en headers o api_key en parámetros.');
    }
    
    // Verificar que se envió un archivo
    if (!isset($_FILES['image'])) {
        throw new Exception('No se encontró archivo de imagen. Asegúrese de incluir el campo "image" en el formulario.');
    }
    
    $file = $_FILES['image'];
    
    // Verificar errores de upload
    switch ($file['error']) {
        case UPLOAD_ERR_OK:
            break;
        case UPLOAD_ERR_NO_FILE:
            throw new Exception('No se seleccionó ningún archivo.');
        case UPLOAD_ERR_INI_SIZE:
        case UPLOAD_ERR_FORM_SIZE:
            throw new Exception('El archivo es demasiado grande.');
        default:
            throw new Exception('Error desconocido al subir archivo: ' . $file['error']);
    }
    
    // Obtener parámetros
    $entity = isset($_POST['entity']) ? (int)$_POST['entity'] : 1;
    $layout_id = isset($_POST['layout_id']) ? (int)$_POST['layout_id'] : 0;
    $type = isset($_POST['type']) ? $_POST['type'] : 'restaurant_layout';
    
    // Validar tipo de archivo usando tanto MIME type como extensión
    $allowed_extensions = array('jpg', 'jpeg', 'png', 'gif', 'webp');
    $allowed_mime_types = array(
        'image/jpeg', 
        'image/jpg', 
        'image/png', 
        'image/gif', 
        'image/webp'
    );
    
    $file_extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    
    if (!in_array($file_extension, $allowed_extensions)) {
        throw new Exception('Extensión de archivo no permitida. Solo se permiten: ' . implode(', ', $allowed_extensions));
    }
    
    // Verificar MIME type si la función existe
    if (function_exists('mime_content_type')) {
        $file_mime = mime_content_type($file['tmp_name']);
        if (!in_array($file_mime, $allowed_mime_types)) {
            throw new Exception('Tipo de archivo no permitido. Solo se permiten imágenes.');
        }
    }
    
    // Validar tamaño (máximo 5MB)
    $max_size = 5 * 1024 * 1024; // 5MB
    if ($file['size'] > $max_size) {
        throw new Exception('El archivo es demasiado grande. Máximo 5MB permitido. Tamaño actual: ' . round($file['size']/1024/1024, 2) . 'MB');
    }
    
    // Validar que es realmente una imagen
    $image_info = getimagesize($file['tmp_name']);
    if ($image_info === false) {
        throw new Exception('El archivo no es una imagen válida.');
    }
    
    // Crear directorio si no existe
    $upload_dir = DOL_DATA_ROOT.'/spos/restaurant/layouts/';
    if (!file_exists($upload_dir)) {
        if (!mkdir($upload_dir, 0755, true)) {
            throw new Exception('No se pudo crear el directorio de destino: ' . $upload_dir);
        }
        error_log("SPOS Upload: Directorio creado: " . $upload_dir);
    }
    
    // Verificar permisos del directorio
    if (!is_writable($upload_dir)) {
        throw new Exception('El directorio de destino no tiene permisos de escritura: ' . $upload_dir);
    }
    
    // Generar nombre único para el archivo
    $filename = 'layout_'.$entity.'_'.$layout_id.'_'.time().'_'.uniqid().'.'.$file_extension;
    $full_path = $upload_dir.$filename;
    
    // Verificar que el archivo no existe (por seguridad)
    if (file_exists($full_path)) {
        throw new Exception('El archivo de destino ya existe. Inténtelo de nuevo.');
    }
    
    // Mover archivo
    if (!move_uploaded_file($file['tmp_name'], $full_path)) {
        throw new Exception('Error moviendo el archivo al destino. Verifique permisos del directorio.');
    }
    
    error_log("SPOS Upload: Archivo movido exitosamente a: " . $full_path);
    
    // Verificar que el archivo se movió correctamente
    if (!file_exists($full_path)) {
        throw new Exception('El archivo no se guardó correctamente.');
    }
    
    // Generar path relativo para la BD
    $relative_path = 'document.php?modulepart=spos&file=restaurant/layouts/'.$filename;
    
    // Generar URL completa para preview
    $base_url = $_SERVER['REQUEST_SCHEME'] . '://' . $_SERVER['HTTP_HOST'];
    if (isset($conf->global->MAIN_URL_ROOT)) {
        $base_url = $conf->global->MAIN_URL_ROOT;
    }
    $preview_url = $base_url . '/' . $relative_path;
    
    // Respuesta exitosa con información completa
    $response = array(
        'success' => true,
        'message' => 'Imagen subida exitosamente',
        'data' => array(
            'path' => $relative_path,
            'filename' => $filename,
            'original_name' => $file['name'],
            'size' => $file['size'],
            'size_formatted' => round($file['size']/1024, 2) . ' KB',
            'type' => $image_info['mime'],
            'dimensions' => array(
                'width' => $image_info[0],
                'height' => $image_info[1]
            ),
            'upload_dir' => $upload_dir,
            'full_path' => $full_path,
            'preview_url' => $preview_url,
            'entity' => $entity,
            'layout_id' => $layout_id,
            'upload_time' => date('Y-m-d H:i:s')
        )
    );
    
    echo json_encode($response);
    error_log("SPOS Upload: Success - " . json_encode($response['data']));
    
} catch (Exception $e) {
    error_log("SPOS Upload Error: " . $e->getMessage());
    error_log("SPOS Upload Error Stack: " . $e->getTraceAsString());
    
    // Limpiar archivo temporal si existe
    if (isset($file) && isset($file['tmp_name']) && file_exists($file['tmp_name'])) {
        @unlink($file['tmp_name']);
    }
    
    http_response_code(500);
    echo json_encode(array(
        'success' => false,
        'error' => $e->getMessage(),
        'debug_info' => array(
            'file' => basename($e->getFile()),
            'line' => $e->getLine(),
            'upload_max_filesize' => ini_get('upload_max_filesize'),
            'post_max_size' => ini_get('post_max_size'),
            'max_file_uploads' => ini_get('max_file_uploads'),
            'files_received' => isset($_FILES) ? array_keys($_FILES) : 'none'
        )
    ));
}
?>