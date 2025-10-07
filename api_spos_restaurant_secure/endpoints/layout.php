<?php
/**
 * Endpoints para gestión de Layouts
 * Ubicación: custom/pos/frontend/api_spos_restaurant_secure/endpoints/layout.php
 */

class LayoutEndpoint 
{
    private $db;
    private $auth;
    
    public function __construct($database, $auth) 
    {
        $this->db = $database;
        $this->auth = $auth;
    }
    
    /**
     * GET /layout/{entity} - Obtener layout por entidad
     */
    public function getLayout($entity) 
    {
        // Verificar permisos
        if (!$this->auth->hasPermission('read_layout')) {
            $this->sendError(403, 'Permission denied');
        }
        
        try {
            $query = "
                SELECT l.*, u.login as created_by_user
                FROM " . $this->db->getPrefix() . "spos_restaurant_layout l
                LEFT JOIN " . $this->db->getPrefix() . "user u ON l.fk_user_creat = u.rowid
                WHERE l.entity = ? AND l.is_active = 1 
                ORDER BY l.date_creation DESC 
                LIMIT 1
            ";
            
            $layout = $this->db->selectOne($query, [$entity]);
            
            if (!$layout) {
                writeLog("Layout not found for entity: {$entity}", 'WARN');
                $this->sendError(404, 'Layout not found for entity: ' . $entity);
            }
            
            // Agregar información adicional
            $layout['statistics'] = $this->getLayoutStatistics($layout['rowid']);
            $layout['permissions'] = $this->getLayoutPermissions();
            
            writeLog("Layout retrieved for entity {$entity} by user: " . $this->auth->getUserInfo());
            
            $this->sendSuccess($layout);
            
        } catch (Exception $e) {
            writeLog("Get layout error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Database error: ' . $e->getMessage());
        }
    }
    
    /**
     * GET /layout - Obtener todos los layouts (con filtros)
     */
    public function getAllLayouts() 
    {
        if (!$this->auth->hasPermission('read_layout')) {
            $this->sendError(403, 'Permission denied');
        }
        
        try {
            // Parámetros de filtro
            $entity = $_GET['entity'] ?? null;
            $active = $_GET['active'] ?? 1;
            $limit = min(100, max(1, (int)($_GET['limit'] ?? 10)));
            $offset = max(0, (int)($_GET['offset'] ?? 0));
            
            $whereConditions = [];
            $params = [];
            
            if ($entity) {
                $whereConditions[] = "l.entity = ?";
                $params[] = $entity;
            }
            
            if ($active !== null) {
                $whereConditions[] = "l.is_active = ?";
                $params[] = $active;
            }
            
            $whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";
            
            $query = "
                SELECT l.*, u.login as created_by_user,
                       COUNT(m.rowid) as total_tables
                FROM " . $this->db->getPrefix() . "spos_restaurant_layout l
                LEFT JOIN " . $this->db->getPrefix() . "user u ON l.fk_user_creat = u.rowid
                LEFT JOIN " . $this->db->getPrefix() . "spos_restaurant_mesas m ON l.rowid = m.fk_layout AND m.is_active = 1
                {$whereClause}
                GROUP BY l.rowid
                ORDER BY l.date_creation DESC 
                LIMIT {$limit} OFFSET {$offset}
            ";
            
            $layouts = $this->db->select($query, $params);
            
            // Contar total para paginación
            $countQuery = "
                SELECT COUNT(DISTINCT l.rowid) as total
                FROM " . $this->db->getPrefix() . "spos_restaurant_layout l
                {$whereClause}
            ";
            
            $totalResult = $this->db->selectOne($countQuery, $params);
            $total = $totalResult['total'] ?? 0;
            
            writeLog("Retrieved " . count($layouts) . " layouts by user: " . $this->auth->getUserInfo());
            
            $this->sendSuccess([
                'layouts' => $layouts,
                'pagination' => [
                    'total' => (int)$total,
                    'limit' => $limit,
                    'offset' => $offset,
                    'has_more' => ($offset + $limit) < $total
                ]
            ]);
            
        } catch (Exception $e) {
            writeLog("Get all layouts error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Database error: ' . $e->getMessage());
        }
    }
    
    /**
     * POST /layout - Crear nuevo layout
     */
    public function createLayout() 
    {
        if (!$this->auth->hasPermission('write_layout')) {
            $this->sendError(403, 'Permission denied');
        }
        
        $data = $this->getJsonInput();
        
        // Validaciones
        if (empty($data['entity'])) {
            $this->sendError(400, 'Entity is required');
        }
        
        $name = trim($data['name'] ?? 'Layout Principal');
        if (empty($name)) {
            $this->sendError(400, 'Name cannot be empty');
        }
        
        $width = (int)($data['background_width'] ?? 1000);
        $height = (int)($data['background_height'] ?? 600);
        
        if ($width < 300 || $width > 5000) {
            $this->sendError(400, 'Width must be between 300 and 5000 pixels');
        }
        
        if ($height < 200 || $height > 3000) {
            $this->sendError(400, 'Height must be between 200 and 3000 pixels');
        }
        
        try {
            // Verificar si ya existe un layout activo para esta entidad
            $existingQuery = "
                SELECT rowid FROM " . $this->db->getPrefix() . "spos_restaurant_layout 
                WHERE entity = ? AND is_active = 1
            ";
            
            $existing = $this->db->selectOne($existingQuery, [$data['entity']]);
            
            if ($existing && empty($data['force_create'])) {
                $this->sendError(409, 'An active layout already exists for this entity. Use force_create=true to create anyway.');
            }
            
            // Crear layout
            $insertQuery = "
                INSERT INTO " . $this->db->getPrefix() . "spos_restaurant_layout 
                (entity, name, description, background_width, background_height, date_creation, fk_user_creat, is_active)
                VALUES (?, ?, ?, ?, ?, NOW(), ?, 1)
            ";
            
            $result = $this->db->insert($insertQuery, [
                $data['entity'],
                $name,
                $data['description'] ?? 'Configuración principal del restaurante',
                $width,
                $height,
                $this->auth->getCurrentUser()['rowid']
            ]);
            
            if (!$result['success']) {
                throw new Exception('Failed to insert layout');
            }
            
            $layoutId = $result['insert_id'];
            
            writeLog("Layout created with ID: {$layoutId} by user: " . $this->auth->getUserInfo());
            
            // Crear mesas por defecto si se solicita
            if (!empty($data['create_default_tables'])) {
                $tablesCreated = $this->createDefaultTables($layoutId, $data['entity']);
                writeLog("Created {$tablesCreated} default tables for layout: {$layoutId}");
            }
            
            // Obtener el layout creado con toda la información
            $createdLayout = $this->db->selectOne(
                "SELECT * FROM " . $this->db->getPrefix() . "spos_restaurant_layout WHERE rowid = ?",
                [$layoutId]
            );
            
            $this->sendSuccess([
                'success' => true,
                'layout_id' => $layoutId,
                'layout' => $createdLayout,
                'message' => 'Layout creado exitosamente'
            ]);
            
        } catch (Exception $e) {
            writeLog("Create layout error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Error creating layout: ' . $e->getMessage());
        }
    }
    
    /**
     * PUT /layout/{layout_id} - Actualizar layout
     */
    public function updateLayout($layoutId) 
    {
        if (!$this->auth->hasPermission('write_layout')) {
            $this->sendError(403, 'Permission denied');
        }
        
        $data = $this->getJsonInput();
        
        try {
            // Verificar que el layout existe
            $existingLayout = $this->db->selectOne(
                "SELECT * FROM " . $this->db->getPrefix() . "spos_restaurant_layout WHERE rowid = ?",
                [$layoutId]
            );
            
            if (!$existingLayout) {
                $this->sendError(404, 'Layout not found');
            }
            
            // Preparar campos a actualizar
            $updateFields = [];
            $params = [];
            
            if (isset($data['name'])) {
                $name = trim($data['name']);
                if (empty($name)) {
                    $this->sendError(400, 'Name cannot be empty');
                }
                $updateFields[] = "name = ?";
                $params[] = $name;
            }
            
            if (isset($data['description'])) {
                $updateFields[] = "description = ?";
                $params[] = $data['description'];
            }
            
            if (isset($data['background_width'])) {
                $width = (int)$data['background_width'];
                if ($width < 300 || $width > 5000) {
                    $this->sendError(400, 'Width must be between 300 and 5000 pixels');
                }
                $updateFields[] = "background_width = ?";
                $params[] = $width;
            }
            
            if (isset($data['background_height'])) {
                $height = (int)$data['background_height'];
                if ($height < 200 || $height > 3000) {
                    $this->sendError(400, 'Height must be between 200 and 3000 pixels');
                }
                $updateFields[] = "background_height = ?";
                $params[] = $height;
            }
            
            if (isset($data['background_image'])) {
                $updateFields[] = "background_image = ?";
                $params[] = $data['background_image'];
            }
            
            if (isset($data['is_active'])) {
                $updateFields[] = "is_active = ?";
                $params[] = $data['is_active'] ? 1 : 0;
            }
            
            if (empty($updateFields)) {
                $this->sendError(400, 'No fields to update');
            }
            
            // Agregar fecha de modificación
            $updateFields[] = "date_modification = NOW()";
            $updateFields[] = "fk_user_modif = ?";
            $params[] = $this->auth->getCurrentUser()['rowid'];
            
            // Agregar WHERE
            $params[] = $layoutId;
            
            $updateQuery = "
                UPDATE " . $this->db->getPrefix() . "spos_restaurant_layout 
                SET " . implode(", ", $updateFields) . "
                WHERE rowid = ?
            ";
            
            $result = $this->db->update($updateQuery, $params);
            
            if ($result['affected_rows'] === 0) {
                $this->sendError(404, 'Layout not found or no changes made');
            }
            
            writeLog("Layout {$layoutId} updated by user: " . $this->auth->getUserInfo());
            
            // Obtener layout actualizado
            $updatedLayout = $this->db->selectOne(
                "SELECT * FROM " . $this->db->getPrefix() . "spos_restaurant_layout WHERE rowid = ?",
                [$layoutId]
            );
            
            $this->sendSuccess([
                'success' => true,
                'layout' => $updatedLayout,
                'message' => 'Layout actualizado exitosamente'
            ]);
            
        } catch (Exception $e) {
            writeLog("Update layout error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Error updating layout: ' . $e->getMessage());
        }
    }
    
    /**
     * DELETE /layout/{layout_id} - Eliminar layout (soft delete)
     */
    public function deleteLayout($layoutId) 
    {
        if (!$this->auth->hasPermission('write_layout')) {
            $this->sendError(403, 'Permission denied');
        }
        
        try {
            // Verificar que el layout existe
            $layout = $this->db->selectOne(
                "SELECT * FROM " . $this->db->getPrefix() . "spos_restaurant_layout WHERE rowid = ?",
                [$layoutId]
            );
            
            if (!$layout) {
                $this->sendError(404, 'Layout not found');
            }
            
            // Soft delete - marcar como inactivo
            $result = $this->db->update(
                "UPDATE " . $this->db->getPrefix() . "spos_restaurant_layout 
                 SET is_active = 0, date_modification = NOW(), fk_user_modif = ? 
                 WHERE rowid = ?",
                [$this->auth->getCurrentUser()['rowid'], $layoutId]
            );
            
            if ($result['affected_rows'] === 0) {
                $this->sendError(404, 'Layout not found');
            }
            
            // También desactivar mesas asociadas
            $this->db->update(
                "UPDATE " . $this->db->getPrefix() . "spos_restaurant_mesas 
                 SET is_active = 0 
                 WHERE fk_layout = ?",
                [$layoutId]
            );
            
            // Y elementos asociados
            $this->db->update(
                "UPDATE " . $this->db->getPrefix() . "spos_restaurant_elementos 
                 SET is_active = 0 
                 WHERE fk_layout = ?",
                [$layoutId]
            );
            
            writeLog("Layout {$layoutId} deleted (soft) by user: " . $this->auth->getUserInfo());
            
            $this->sendSuccess([
                'success' => true,
                'message' => 'Layout eliminado exitosamente'
            ]);
            
        } catch (Exception $e) {
            writeLog("Delete layout error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Error deleting layout: ' . $e->getMessage());
        }
    }
    
    /**
     * Crear mesas por defecto
     */
    private function createDefaultTables($layoutId, $entity) 
    {
        $defaultTables = [
            ['numero' => 1, 'nombre' => 'Mesa 1', 'pos_x' => 100, 'pos_y' => 100],
            ['numero' => 2, 'nombre' => 'Mesa 2', 'pos_x' => 250, 'pos_y' => 100],
            ['numero' => 3, 'nombre' => 'Mesa 3', 'pos_x' => 400, 'pos_y' => 100],
            ['numero' => 4, 'nombre' => 'Mesa 4', 'pos_x' => 100, 'pos_y' => 250],
            ['numero' => 5, 'nombre' => 'Mesa 5', 'pos_x' => 250, 'pos_y' => 250],
            ['numero' => 6, 'nombre' => 'Mesa 6', 'pos_x' => 400, 'pos_y' => 250]
        ];
        
        $insertQuery = "
            INSERT INTO " . $this->db->getPrefix() . "spos_restaurant_mesas 
            (fk_layout, entity, numero, nombre, pos_x, pos_y, ancho, alto, capacidad, color, date_creation, is_active)
            VALUES (?, ?, ?, ?, ?, ?, 80, 80, 4, '#4F46E5', NOW(), 1)
        ";
        
        $created = 0;
        foreach ($defaultTables as $table) {
            try {
                $this->db->insert($insertQuery, [
                    $layoutId, $entity, $table['numero'], $table['nombre'],
                    $table['pos_x'], $table['pos_y']
                ]);
                $created++;
            } catch (Exception $e) {
                writeLog("Error creating default table {$table['numero']}: " . $e->getMessage(), 'WARN');
            }
        }
        
        return $created;
    }
    
    /**
     * Obtener estadísticas del layout
     */
    private function getLayoutStatistics($layoutId) 
    {
        try {
            $stats = $this->db->selectOne("
                SELECT 
                    COUNT(m.rowid) as total_tables,
                    COUNT(e.rowid) as total_elements,
                    MAX(m.date_creation) as last_table_created
                FROM " . $this->db->getPrefix() . "spos_restaurant_layout l
                LEFT JOIN " . $this->db->getPrefix() . "spos_restaurant_mesas m ON l.rowid = m.fk_layout AND m.is_active = 1
                LEFT JOIN " . $this->db->getPrefix() . "spos_restaurant_elementos e ON l.rowid = e.fk_layout AND e.is_active = 1
                WHERE l.rowid = ?
            ", [$layoutId]);
            
            return [
                'total_tables' => (int)($stats['total_tables'] ?? 0),
                'total_elements' => (int)($stats['total_elements'] ?? 0),
                'last_table_created' => $stats['last_table_created']
            ];
            
        } catch (Exception $e) {
            writeLog("Error getting layout statistics: " . $e->getMessage(), 'WARN');
            return [
                'total_tables' => 0,
                'total_elements' => 0,
                'last_table_created' => null
            ];
        }
    }
    
    /**
     * Obtener permisos del layout para el usuario actual
     */
    private function getLayoutPermissions() 
    {
        return [
            'can_read' => $this->auth->hasPermission('read_layout'),
            'can_write' => $this->auth->hasPermission('write_layout'),
            'can_delete' => $this->auth->hasPermission('write_layout'),
            'can_upload_images' => $this->auth->hasPermission('upload_images')
        ];
    }
    
    /**
     * Obtener JSON del request
     */
    private function getJsonInput() 
    {
        $input = file_get_contents('php://input');
        if (empty($input)) {
            return [];
        }
        
        $data = json_decode($input, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->sendError(400, 'Invalid JSON: ' . json_last_error_msg());
        }
        
        return $data;
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
            'endpoint' => 'layout'
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