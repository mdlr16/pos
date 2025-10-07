<?php
/**
 * Endpoints para subida de archivos
 * Ubicación: custom/pos/frontend/api_spos_restaurant_secure/endpoints/upload.php
 */

class UploadEndpoint 
{
    private $db;
    private $auth;
    
    public function __construct($database, $auth) 
    {
        $this->db = $database;
        $this->auth = $auth;
    }
    
    /**
     * POST /upload-image - Subir imagen de fondo para layout
     */
    public function uploadLayoutImage() 
    {
        if (!$this->auth->hasPermission('upload_images')) {
            $this->sendError(403, 'Permission denied');
        }
        
        // Validar que se envió un archivo
        if (!isset($_FILES['image'])) {
            $this->sendError(400, 'No image file provided');
        }
        
        $layoutId = $_POST['layout_id'] ?? null;
        $entity = $_POST['entity'] ?? null;
        
        if (!$layoutId) {
            $this->sendError(400, 'Layout ID is required');
        }
        
        try {
            // Verificar que el layout existe
            $layout = $this->db->selectOne(
                "SELECT * FROM " . $this->db->getPrefix() . "spos_restaurant_layout WHERE rowid = ? AND is_active = 1",
                [$layoutId]
            );
            
            if (!$layout) {
                $this->sendError(404, 'Layout not found');
            }
            
            $file = $_FILES['image'];
            
            // Validaciones del archivo
            $this->validateImageFile($file);
            
            // Procesar y guardar archivo
            $result = $this->processImageUpload($file, $layoutId, $entity);
            
            if ($result['success']) {
                // Actualizar BD con la nueva imagen
                $this->updateLayoutImage($layoutId, $result['relative_path']);
                
                writeLog("Image uploaded successfully for layout {$layoutId}: {$result['filename']} by user: " . $this->auth->getUserInfo());
                
                $this->sendSuccess([
                    'success' => true,
                    'image_path' => $result['relative_path'],
                    'filename' => $result['filename'],
                    'file_size' => $result['file_size'],
                    'dimensions' => $result['dimensions'],
                    'upload_info' => [
                        'original_name' => $file['name'],
                        'type' => $file['type'],
                        'uploaded_by' => $this->auth->getUserInfo(),
                        'upload_time' => date('Y-m-d H:i:s')
                    ],
                    'message' => 'Imagen subida exitosamente'
                ]);
            } else {
                throw new Exception($result['error']);
            }
            
        } catch (Exception $e) {
            writeLog("Upload image error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Error uploading image: ' . $e->getMessage());
        }
    }
    
    /**
     * POST /upload-element-icon - Subir icono para elemento decorativo
     */
    public function uploadElementIcon() 
    {
        if (!$this->auth->hasPermission('upload_images')) {
            $this->sendError(403, 'Permission denied');
        }
        
        if (!isset($_FILES['icon'])) {
            $this->sendError(400, 'No icon file provided');
        }
        
        $elementId = $_POST['element_id'] ?? null;
        
        if (!$elementId) {
            $this->sendError(400, 'Element ID is required');
        }
        
        try {
            // Verificar que el elemento existe
            $element = $this->db->selectOne(
                "SELECT * FROM " . $this->db->getPrefix() . "spos_restaurant_elementos WHERE rowid = ? AND is_active = 1",
                [$elementId]
            );
            
            if (!$element) {
                $this->sendError(404, 'Element not found');
            }
            
            $file = $_FILES['icon'];
            
            // Validaciones específicas para iconos (más estrictas)
            $this->validateIconFile($file);
            
            // Procesar archivo
            $result = $this->processIconUpload($file, $elementId);
            
            if ($result['success']) {
                // Actualizar elemento con el nuevo icono
                $this->updateElementIcon($elementId, $result['relative_path']);
                
                writeLog("Icon uploaded for element {$elementId}: {$result['filename']} by user: " . $this->auth->getUserInfo());
                
                $this->sendSuccess([
                    'success' => true,
                    'icon_path' => $result['relative_path'],
                    'filename' => $result['filename'],
                    'file_size' => $result['file_size'],
                    'dimensions' => $result['dimensions'],
                    'message' => 'Icono subido exitosamente'
                ]);
            } else {
                throw new Exception($result['error']);
            }
            
        } catch (Exception $e) {
            writeLog("Upload icon error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Error uploading icon: ' . $e->getMessage());
        }
    }
    
    /**
     * DELETE /image/{type}/{id} - Eliminar imagen
     */
    public function deleteImage($type, $id) 
    {
        if (!$this->auth->hasPermission('upload_images')) {
            $this->sendError(403, 'Permission denied');
        }
        
        try {
            $imagePath = null;
            
            switch ($type) {
                case 'layout':
                    $layout = $this->db->selectOne(
                        "SELECT background_image FROM " . $this->db->getPrefix() . "spos_restaurant_layout WHERE rowid = ?",
                        [$id]
                    );
                    
                    if ($layout && $layout['background_image']) {
                        $imagePath = $layout['background_image'];
                        
                        // Actualizar BD
                        $this->db->update(
                            "UPDATE " . $this->db->getPrefix() . "spos_restaurant_layout SET background_image = NULL WHERE rowid = ?",
                            [$id]
                        );
                    }
                    break;
                    
                case 'element':
                    $element = $this->db->selectOne(
                        "SELECT icon_path FROM " . $this->db->getPrefix() . "spos_restaurant_elementos WHERE rowid = ?",
                        [$id]
                    );
                    
                    if ($element && $element['icon_path']) {
                        $imagePath = $element['icon_path'];
                        
                        // Actualizar BD
                        $this->db->update(
                            "UPDATE " . $this->db->getPrefix() . "spos_restaurant_elementos SET icon_path = NULL WHERE rowid = ?",
                            [$id]
                        );
                    }
                    break;
                    
                default:
                    $this->sendError(400, 'Invalid image type');
            }
            
            if (!$imagePath) {
                $this->sendError(404, 'Image not found');
            }
            
            // Eliminar archivo físico
            $fullPath = UPLOAD_DIR . '../' . $imagePath;
            if (file_exists($fullPath)) {
                unlink($fullPath);
                writeLog("Physical file deleted: {$fullPath}");
            }
            
            writeLog("Image deleted: {$imagePath} for {$type} {$id} by user: " . $this->auth->getUserInfo());
            
            $this->sendSuccess([
                'success' => true,
                'deleted_path' => $imagePath,
                'message' => 'Imagen eliminada exitosamente'
            ]);
            
        } catch (Exception $e) {
            writeLog("Delete image error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Error deleting image: ' . $e->getMessage());
        }
    }
    
    /**
     * GET /images/{type}/{id} - Obtener información de imágenes
     */
    public function getImageInfo($type, $id) 
    {
        if (!$this->auth->hasPermission('read_layout')) {
            $this->sendError(403, 'Permission denied');
        }
        
        try {
            $info = [];
            
            switch ($type) {
                case 'layout':
                    $layout = $this->db->selectOne(
                        "SELECT background_image FROM " . $this->db->getPrefix() . "spos_restaurant_layout WHERE rowid = ?",
                        [$id]
                    );
                    
                    if ($layout && $layout['background_image']) {
                        $info = $this->getFileInfo($layout['background_image']);
                    }
                    break;
                    
                case 'element':
                    $element = $this->db->selectOne(
                        "SELECT icon_path FROM " . $this->db->getPrefix() . "spos_restaurant_elementos WHERE rowid = ?",
                        [$id]
                    );
                    
                    if ($element && $element['icon_path']) {
                        $info = $this->getFileInfo($element['icon_path']);
                    }
                    break;
                    
                default:
                    $this->sendError(400, 'Invalid image type');
            }
            
            $this->sendSuccess([
                'type' => $type,
                'id' => $id,
                'image_info' => $info
            ]);
            
        } catch (Exception $e) {
            writeLog("Get image info error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Error getting image info: ' . $e->getMessage());
        }
    }
    
    /**
     * Validar archivo de imagen
     */
    private function validateImageFile($file) 
    {
        // Verificar errores de upload
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $this->sendError(400, 'Upload error: ' . $this->getUploadErrorMessage($file['error']));
        }
        
        // Verificar tamaño
        if ($file['size'] > MAX_FILE_SIZE) {
            $maxMB = MAX_FILE_SIZE / 1024 / 1024;
            $this->sendError(400, "File too large. Maximum size: {$maxMB}MB");
        }
        
        if ($file['size'] <= 0) {
            $this->sendError(400, 'Empty file');
        }
        
        // Verificar tipo MIME
        $allowedTypes = unserialize(ALLOWED_IMAGE_TYPES);
        if (!in_array($file['type'], $allowedTypes)) {
            $this->sendError(400, 'Invalid image type. Allowed: ' . implode(', ', $allowedTypes));
        }
        
        // Verificar que realmente es una imagen
        $imageInfo = getimagesize($file['tmp_name']);
        if ($imageInfo === false) {
            $this->sendError(400, 'File is not a valid image');
        }
        
        // Verificar dimensiones razonables
        $width = $imageInfo[0];
        $height = $imageInfo[1];
        
        if ($width < 100 || $height < 100) {
            $this->sendError(400, 'Image too small. Minimum size: 100x100 pixels');
        }
        
        if ($width > 10000 || $height > 10000) {
            $this->sendError(400, 'Image too large. Maximum size: 10000x10000 pixels');
        }
        
        return true;
    }
    
    /**
     * Validar archivo de icono (más estricto)
     */
    private function validateIconFile($file) 
    {
        $this->validateImageFile($file);
        
        // Validaciones adicionales para iconos
        $imageInfo = getimagesize($file['tmp_name']);
        $width = $imageInfo[0];
        $height = $imageInfo[1];
        
        // Los iconos deben ser cuadrados o casi cuadrados
        $ratio = $width / $height;
        if ($ratio < 0.5 || $ratio > 2.0) {
            $this->sendError(400, 'Icon must be square or nearly square (ratio between 0.5 and 2.0)');
        }
        
        // Tamaño máximo para iconos más pequeño
        if ($file['size'] > 1024 * 1024) { // 1MB
            $this->sendError(400, 'Icon file too large. Maximum size: 1MB');
        }
        
        return true;
    }
    
    /**
     * Procesar upload de imagen de layout
     */
    private function processImageUpload($file, $layoutId, $entity) 
    {
        try {
            // Crear directorio si no existe
            $uploadDir = UPLOAD_DIR . 'layouts/';
            if (!is_dir($uploadDir)) {
                if (!mkdir($uploadDir, 0755, true)) {
                    throw new Exception('Failed to create upload directory');
                }
            }
            
            // Generar nombre único
            $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $filename = 'layout_' . $layoutId . '_' . time() . '_' . uniqid() . '.' . $extension;
            $uploadPath = $uploadDir . $filename;
            $relativePath = 'documents/spos_restaurant/layouts/' . $filename;
            
            // Mover archivo
            if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
                throw new Exception('Failed to move uploaded file');
            }
            
            // Obtener información de la imagen
            $imageInfo = getimagesize($uploadPath);
            $fileSize = filesize($uploadPath);
            
            return [
                'success' => true,
                'filename' => $filename,
                'upload_path' => $uploadPath,
                'relative_path' => $relativePath,
                'file_size' => $fileSize,
                'dimensions' => [
                    'width' => $imageInfo[0],
                    'height' => $imageInfo[1],
                    'type' => $imageInfo[2],
                    'mime' => $imageInfo['mime']
                ]
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Procesar upload de icono
     */
    private function processIconUpload($file, $elementId) 
    {
        try {
            // Crear directorio si no existe
            $uploadDir = UPLOAD_DIR . 'icons/';
            if (!is_dir($uploadDir)) {
                if (!mkdir($uploadDir, 0755, true)) {
                    throw new Exception('Failed to create icon directory');
                }
            }
            
            // Generar nombre único
            $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $filename = 'icon_' . $elementId . '_' . time() . '_' . uniqid() . '.' . $extension;
            $uploadPath = $uploadDir . $filename;
            $relativePath = 'documents/spos_restaurant/icons/' . $filename;
            
            // Mover archivo
            if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
                throw new Exception('Failed to move uploaded file');
            }
            
            // Obtener información
            $imageInfo = getimagesize($uploadPath);
            $fileSize = filesize($uploadPath);
            
            return [
                'success' => true,
                'filename' => $filename,
                'upload_path' => $uploadPath,
                'relative_path' => $relativePath,
                'file_size' => $fileSize,
                'dimensions' => [
                    'width' => $imageInfo[0],
                    'height' => $imageInfo[1],
                    'type' => $imageInfo[2],
                    'mime' => $imageInfo['mime']
                ]
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Actualizar imagen en layout
     */
    private function updateLayoutImage($layoutId, $imagePath) 
    {
        $this->db->update(
            "UPDATE " . $this->db->getPrefix() . "spos_restaurant_layout SET background_image = ?, date_modification = NOW() WHERE rowid = ?",
            [$imagePath, $layoutId]
        );
    }
    
    /**
     * Actualizar icono en elemento
     */
    private function updateElementIcon($elementId, $iconPath) 
    {
        $this->db->update(
            "UPDATE " . $this->db->getPrefix() . "spos_restaurant_elementos SET icon_path = ?, date_modification = NOW() WHERE rowid = ?",
            [$iconPath, $elementId]
        );
    }
    
    /**
     * Obtener información de archivo
     */
    private function getFileInfo($relativePath) 
    {
        $fullPath = UPLOAD_DIR . '../' . $relativePath;
        
        if (!file_exists($fullPath)) {
            return [
                'exists' => false,
                'path' => $relativePath
            ];
        }
        
        $fileSize = filesize($fullPath);
        $imageInfo = getimagesize($fullPath);
        
        return [
            'exists' => true,
            'path' => $relativePath,
            'file_size' => $fileSize,
            'file_size_formatted' => $this->formatFileSize($fileSize),
            'dimensions' => $imageInfo ? [
                'width' => $imageInfo[0],
                'height' => $imageInfo[1],
                'type' => $imageInfo[2],
                'mime' => $imageInfo['mime']
            ] : null,
            'last_modified' => date('Y-m-d H:i:s', filemtime($fullPath))
        ];
    }
    
    /**
     * Formatear tamaño de archivo
     */
    private function formatFileSize($bytes) 
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $unitIndex = 0;
        
        while ($bytes >= 1024 && $unitIndex < count($units) - 1) {
            $bytes /= 1024;
            $unitIndex++;
        }
        
        return round($bytes, 2) . ' ' . $units[$unitIndex];
    }
    
    /**
     * Obtener mensaje de error de upload
     */
    private function getUploadErrorMessage($errorCode) 
    {
        switch ($errorCode) {
            case UPLOAD_ERR_INI_SIZE:
                return 'File exceeds upload_max_filesize directive';
            case UPLOAD_ERR_FORM_SIZE:
                return 'File exceeds MAX_FILE_SIZE directive';
            case UPLOAD_ERR_PARTIAL:
                return 'File was only partially uploaded';
            case UPLOAD_ERR_NO_FILE:
                return 'No file was uploaded';
            case UPLOAD_ERR_NO_TMP_DIR:
                return 'Missing temporary folder';
            case UPLOAD_ERR_CANT_WRITE:
                return 'Failed to write file to disk';
            case UPLOAD_ERR_EXTENSION:
                return 'Upload stopped by extension';
            default:
                return 'Unknown upload error';
        }
    }
    
    /**
     * Enviar error JSON
     */
    private function sendError($code, $message) 
    {
        http_response_code($code);
        echo json_encode([
            'error' => $message,
            'code' => $code,
            'timestamp' => date('Y-m-d H:i:s'),
            'endpoint' => 'upload'
        ]);
        exit;
    }
    
    /**
     * Enviar éxito JSON
     */
    private function sendSuccess($data) 
    {
        echo json_encode($data);
        exit;
    }
}
?>