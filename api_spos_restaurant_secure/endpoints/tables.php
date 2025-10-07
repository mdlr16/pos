<?php
/**
 * Endpoints para gestión de Mesas
 * Ubicación: custom/pos/frontend/api_spos_restaurant_secure/endpoints/tables.php
 */

class TablesEndpoint 
{
    private $db;
    private $auth;
    
    public function __construct($database, $auth) 
    {
        $this->db = $database;
        $this->auth = $auth;
    }
    
    /**
     * GET /layout/{layout_id}/tables - Obtener mesas del layout
     */
    public function getLayoutTables($layoutId) 
    {
        if (!$this->auth->hasPermission('read_tables')) {
            $this->sendError(403, 'Permission denied');
        }
        
        try {
            $query = "
                SELECT m.*, l.name as layout_name, l.entity
                FROM " . $this->db->getPrefix() . "spos_restaurant_mesas m
                JOIN " . $this->db->getPrefix() . "spos_restaurant_layout l ON m.fk_layout = l.rowid
                WHERE m.fk_layout = ? AND m.is_active = 1 
                ORDER BY m.numero
            ";
            
            $tables = $this->db->select($query, [$layoutId]);
            
            writeLog("Retrieved " . count($tables) . " tables for layout {$layoutId} by user: " . $this->auth->getUserInfo());
            
            $this->sendSuccess([
                'tables' => $tables,
                'layout_id' => $layoutId,
                'total' => count($tables)
            ]);
            
        } catch (Exception $e) {
            writeLog("Get layout tables error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Database error: ' . $e->getMessage());
        }
    }
    
    /**
     * GET /table/{table_id} - Obtener mesa específica
     */
    public function getTable($tableId) 
    {
        if (!$this->auth->hasPermission('read_tables')) {
            $this->sendError(403, 'Permission denied');
        }
        
        try {
            $query = "
                SELECT m.*, l.name as layout_name, l.entity,
                       COUNT(p.rowid) as active_orders
                FROM " . $this->db->getPrefix() . "spos_restaurant_mesas m
                JOIN " . $this->db->getPrefix() . "spos_restaurant_layout l ON m.fk_layout = l.rowid
                LEFT JOIN " . $this->db->getPrefix() . "propal p ON p.numero_mesa = m.numero AND p.entity = l.entity AND p.fk_statut IN (0,1,2)
                WHERE m.rowid = ? AND m.is_active = 1
                GROUP BY m.rowid
            ";
            
            $table = $this->db->selectOne($query, [$tableId]);
            
            if (!$table) {
                $this->sendError(404, 'Table not found');
            }
            
            writeLog("Table {$tableId} retrieved by user: " . $this->auth->getUserInfo());
            
            $this->sendSuccess($table);
            
        } catch (Exception $e) {
            writeLog("Get table error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Database error: ' . $e->getMessage());
        }
    }
    
    /**
     * POST /table - Crear nueva mesa
     */
    public function createTable() 
    {
        if (!$this->auth->hasPermission('write_tables')) {
            $this->sendError(403, 'Permission denied');
        }
        
        $data = $this->getJsonInput();
        
        // Validaciones requeridas
        $required = ['fk_layout', 'entity', 'numero', 'nombre'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                $this->sendError(400, "Field {$field} is required");
            }
        }
        
        // Validaciones adicionales
        $numero = (int)$data['numero'];
        if ($numero <= 0) {
            $this->sendError(400, 'Table number must be positive');
        }
        
        $nombre = trim($data['nombre']);
        if (empty($nombre)) {
            $this->sendError(400, 'Table name cannot be empty');
        }
        
        try {
            // Verificar que el layout existe
            $layout = $this->db->selectOne(
                "SELECT rowid, entity FROM " . $this->db->getPrefix() . "spos_restaurant_layout WHERE rowid = ? AND is_active = 1",
                [$data['fk_layout']]
            );
            
            if (!$layout) {
                $this->sendError(404, 'Layout not found');
            }
            
            // Verificar que no existe otra mesa con el mismo número en el layout
            $existing = $this->db->selectOne(
                "SELECT rowid FROM " . $this->db->getPrefix() . "spos_restaurant_mesas WHERE fk_layout = ? AND numero = ? AND is_active = 1",
                [$data['fk_layout'], $numero]
            );
            
            if ($existing) {
                $this->sendError(409, "Table number {$numero} already exists in this layout");
            }
            
            // Preparar datos con valores por defecto
            $insertData = [
                $data['fk_layout'],
                $data['entity'],
                $numero,
                $nombre,
                $data['capacidad'] ?? 4,
                $data['tipo_mesa'] ?? 'rectangular',
                $data['pos_x'] ?? 100,
                $data['pos_y'] ?? 100,
                $data['ancho'] ?? 80,
                $data['alto'] ?? 80,
                $data['color'] ?? '#4F46E5',
                $data['forma'] ?? 'rectangle',
                $data['observaciones'] ?? ''
            ];
            
            $insertQuery = "
                INSERT INTO " . $this->db->getPrefix() . "spos_restaurant_mesas 
                (fk_layout, entity, numero, nombre, capacidad, tipo_mesa, pos_x, pos_y, ancho, alto, color, forma, observaciones, date_creation, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1)
            ";
            
            $result = $this->db->insert($insertQuery, $insertData);
            
            if (!$result['success']) {
                throw new Exception('Failed to insert table');
            }
            
            $tableId = $result['insert_id'];
            
            writeLog("Table created with ID: {$tableId} (number: {$numero}) by user: " . $this->auth->getUserInfo());
            
            // Obtener la mesa creada con toda la información
            $createdTable = $this->db->selectOne(
                "SELECT m.*, l.name as layout_name FROM " . $this->db->getPrefix() . "spos_restaurant_mesas m
                 JOIN " . $this->db->getPrefix() . "spos_restaurant_layout l ON m.fk_layout = l.rowid
                 WHERE m.rowid = ?",
                [$tableId]
            );
            
            $this->sendSuccess([
                'success' => true,
                'table_id' => $tableId,
                'table' => $createdTable,
                'message' => 'Mesa creada exitosamente'
            ]);
            
        } catch (Exception $e) {
            writeLog("Create table error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Error creating table: ' . $e->getMessage());
        }
    }
    
    /**
     * PUT /table/{table_id} - Actualizar mesa
     */
    public function updateTable($tableId) 
    {
        if (!$this->auth->hasPermission('write_tables')) {
            $this->sendError(403, 'Permission denied');
        }
        
        $data = $this->getJsonInput();
        
        try {
            // Verificar que la mesa existe
            $existingTable = $this->db->selectOne(
                "SELECT * FROM " . $this->db->getPrefix() . "spos_restaurant_mesas WHERE rowid = ? AND is_active = 1",
                [$tableId]
            );
            
            if (!$existingTable) {
                $this->sendError(404, 'Table not found');
            }
            
            // Preparar campos a actualizar
            $updateFields = [];
            $params = [];
            
            if (isset($data['numero'])) {
                $numero = (int)$data['numero'];
                if ($numero <= 0) {
                    $this->sendError(400, 'Table number must be positive');
                }
                
                // Verificar que no existe otra mesa con ese número
                $existing = $this->db->selectOne(
                    "SELECT rowid FROM " . $this->db->getPrefix() . "spos_restaurant_mesas 
                     WHERE fk_layout = ? AND numero = ? AND rowid != ? AND is_active = 1",
                    [$existingTable['fk_layout'], $numero, $tableId]
                );
                
                if ($existing) {
                    $this->sendError(409, "Table number {$numero} already exists in this layout");
                }
                
                $updateFields[] = "numero = ?";
                $params[] = $numero;
            }
            
            if (isset($data['nombre'])) {
                $nombre = trim($data['nombre']);
                if (empty($nombre)) {
                    $this->sendError(400, 'Table name cannot be empty');
                }
                $updateFields[] = "nombre = ?";
                $params[] = $nombre;
            }
            
            if (isset($data['capacidad'])) {
                $capacidad = (int)$data['capacidad'];
                if ($capacidad < 1 || $capacidad > 50) {
                    $this->sendError(400, 'Capacity must be between 1 and 50');
                }
                $updateFields[] = "capacidad = ?";
                $params[] = $capacidad;
            }
            
            if (isset($data['tipo_mesa'])) {
                $updateFields[] = "tipo_mesa = ?";
                $params[] = $data['tipo_mesa'];
            }
            
            if (isset($data['pos_x'])) {
                $updateFields[] = "pos_x = ?";
                $params[] = (int)$data['pos_x'];
            }
            
            if (isset($data['pos_y'])) {
                $updateFields[] = "pos_y = ?";
                $params[] = (int)$data['pos_y'];
            }
            
            if (isset($data['ancho'])) {
                $ancho = (int)$data['ancho'];
                if ($ancho < 20 || $ancho > 500) {
                    $this->sendError(400, 'Width must be between 20 and 500 pixels');
                }
                $updateFields[] = "ancho = ?";
                $params[] = $ancho;
            }
            
            if (isset($data['alto'])) {
                $alto = (int)$data['alto'];
                if ($alto < 20 || $alto > 500) {
                    $this->sendError(400, 'Height must be between 20 and 500 pixels');
                }
                $updateFields[] = "alto = ?";
                $params[] = $alto;
            }
            
            if (isset($data['color'])) {
                $color = $data['color'];
                if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $color)) {
                    $this->sendError(400, 'Color must be a valid hex color (#RRGGBB)');
                }
                $updateFields[] = "color = ?";
                $params[] = $color;
            }
            
            if (isset($data['forma'])) {
                $updateFields[] = "forma = ?";
                $params[] = $data['forma'];
            }
            
            if (isset($data['observaciones'])) {
                $updateFields[] = "observaciones = ?";
                $params[] = $data['observaciones'];
            }
            
            if (empty($updateFields)) {
                $this->sendError(400, 'No fields to update');
            }
            
            // Agregar fecha de modificación
            $updateFields[] = "date_modification = NOW()";
            
            // Agregar WHERE
            $params[] = $tableId;
            
            $updateQuery = "
                UPDATE " . $this->db->getPrefix() . "spos_restaurant_mesas 
                SET " . implode(", ", $updateFields) . "
                WHERE rowid = ?
            ";
            
            $result = $this->db->update($updateQuery, $params);
            
            if ($result['affected_rows'] === 0) {
                $this->sendError(404, 'Table not found or no changes made');
            }
            
            writeLog("Table {$tableId} updated by user: " . $this->auth->getUserInfo());
            
            // Obtener mesa actualizada
            $updatedTable = $this->db->selectOne(
                "SELECT m.*, l.name as layout_name FROM " . $this->db->getPrefix() . "spos_restaurant_mesas m
                 JOIN " . $this->db->getPrefix() . "spos_restaurant_layout l ON m.fk_layout = l.rowid
                 WHERE m.rowid = ?",
                [$tableId]
            );
            
            $this->sendSuccess([
                'success' => true,
                'table' => $updatedTable,
                'message' => 'Mesa actualizada exitosamente'
            ]);
            
        } catch (Exception $e) {
            writeLog("Update table error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Error updating table: ' . $e->getMessage());
        }
    }
    
    /**
     * PUT /table/{table_id}/position - Actualizar solo posición de mesa
     */
    public function updateTablePosition($tableId) 
    {
        if (!$this->auth->hasPermission('write_tables')) {
            $this->sendError(403, 'Permission denied');
        }
        
        $data = $this->getJsonInput();
        
        if (!isset($data['pos_x']) || !isset($data['pos_y'])) {
            $this->sendError(400, 'pos_x and pos_y are required');
        }
        
        try {
            $result = $this->db->update(
                "UPDATE " . $this->db->getPrefix() . "spos_restaurant_mesas 
                 SET pos_x = ?, pos_y = ?, date_modification = NOW() 
                 WHERE rowid = ? AND is_active = 1",
                [(int)$data['pos_x'], (int)$data['pos_y'], $tableId]
            );
            
            if ($result['affected_rows'] === 0) {
                $this->sendError(404, 'Table not found');
            }
            
            writeLog("Table {$tableId} position updated to ({$data['pos_x']}, {$data['pos_y']}) by user: " . $this->auth->getUserInfo());
            
            $this->sendSuccess([
                'success' => true,
                'table_id' => $tableId,
                'new_position' => [
                    'pos_x' => (int)$data['pos_x'],
                    'pos_y' => (int)$data['pos_y']
                ],
                'message' => 'Posición actualizada exitosamente'
            ]);
            
        } catch (Exception $e) {
            writeLog("Update table position error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Error updating table position: ' . $e->getMessage());
        }
    }
    
    /**
     * DELETE /table/{table_id} - Eliminar mesa (soft delete)
     */
    public function deleteTable($tableId) 
    {
        if (!$this->auth->hasPermission('write_tables')) {
            $this->sendError(403, 'Permission denied');
        }
        
        try {
            // Verificar que la mesa existe
            $table = $this->db->selectOne(
                "SELECT m.*, COUNT(p.rowid) as active_orders 
                 FROM " . $this->db->getPrefix() . "spos_restaurant_mesas m
                 LEFT JOIN " . $this->db->getPrefix() . "propal p ON p.numero_mesa = m.numero AND p.fk_statut IN (0,1,2)
                 WHERE m.rowid = ? AND m.is_active = 1
                 GROUP BY m.rowid",
                [$tableId]
            );
            
            if (!$table) {
                $this->sendError(404, 'Table not found');
            }
            
            // Verificar que no tiene órdenes activas
            if ($table['active_orders'] > 0) {
                $this->sendError(409, 'Cannot delete table with active orders. Close or complete orders first.');
            }
            
            // Soft delete
            $result = $this->db->update(
                "UPDATE " . $this->db->getPrefix() . "spos_restaurant_mesas 
                 SET is_active = 0, date_modification = NOW() 
                 WHERE rowid = ?",
                [$tableId]
            );
            
            if ($result['affected_rows'] === 0) {
                $this->sendError(404, 'Table not found');
            }
            
            writeLog("Table {$tableId} (number: {$table['numero']}) deleted by user: " . $this->auth->getUserInfo());
            
            $this->sendSuccess([
                'success' => true,
                'table_id' => $tableId,
                'message' => 'Mesa eliminada exitosamente'
            ]);
            
        } catch (Exception $e) {
            writeLog("Delete table error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Error deleting table: ' . $e->getMessage());
        }
    }
    
    /**
     * POST /table/{table_id}/duplicate - Duplicar mesa
     */
    public function duplicateTable($tableId) 
    {
        if (!$this->auth->hasPermission('write_tables')) {
            $this->sendError(403, 'Permission denied');
        }
        
        try {
            // Obtener mesa original
            $originalTable = $this->db->selectOne(
                "SELECT * FROM " . $this->db->getPrefix() . "spos_restaurant_mesas WHERE rowid = ? AND is_active = 1",
                [$tableId]
            );
            
            if (!$originalTable) {
                $this->sendError(404, 'Table not found');
            }
            
            // Encontrar siguiente número disponible
            $nextNumber = $this->findNextAvailableNumber($originalTable['fk_layout']);
            
            // Crear nueva mesa con datos similares
            $insertData = [
                $originalTable['fk_layout'],
                $originalTable['entity'],
                $nextNumber,
                $originalTable['nombre'] . ' (Copia)',
                $originalTable['capacidad'],
                $originalTable['tipo_mesa'],
                $originalTable['pos_x'] + 100, // Offset position
                $originalTable['pos_y'] + 50,
                $originalTable['ancho'],
                $originalTable['alto'],
                $originalTable['color'],
                $originalTable['forma'] ?? 'rectangle',
                $originalTable['observaciones'] ?? ''
            ];
            
            $insertQuery = "
                INSERT INTO " . $this->db->getPrefix() . "spos_restaurant_mesas 
                (fk_layout, entity, numero, nombre, capacidad, tipo_mesa, pos_x, pos_y, ancho, alto, color, forma, observaciones, date_creation, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1)
            ";
            
            $result = $this->db->insert($insertQuery, $insertData);
            
            if (!$result['success']) {
                throw new Exception('Failed to duplicate table');
            }
            
            $newTableId = $result['insert_id'];
            
            writeLog("Table {$tableId} duplicated as {$newTableId} (number: {$nextNumber}) by user: " . $this->auth->getUserInfo());
            
            // Obtener mesa duplicada
            $duplicatedTable = $this->db->selectOne(
                "SELECT m.*, l.name as layout_name FROM " . $this->db->getPrefix() . "spos_restaurant_mesas m
                 JOIN " . $this->db->getPrefix() . "spos_restaurant_layout l ON m.fk_layout = l.rowid
                 WHERE m.rowid = ?",
                [$newTableId]
            );
            
            $this->sendSuccess([
                'success' => true,
                'original_table_id' => $tableId,
                'new_table_id' => $newTableId,
                'new_table' => $duplicatedTable,
                'message' => 'Mesa duplicada exitosamente'
            ]);
            
        } catch (Exception $e) {
            writeLog("Duplicate table error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Error duplicating table: ' . $e->getMessage());
        }
    }
    
    /**
     * Encontrar siguiente número disponible para mesa
     */
    private function findNextAvailableNumber($layoutId) 
    {
        $existingNumbers = $this->db->select(
            "SELECT numero FROM " . $this->db->getPrefix() . "spos_restaurant_mesas 
             WHERE fk_layout = ? AND is_active = 1 
             ORDER BY numero",
            [$layoutId]
        );
        
        $numbers = array_column($existingNumbers, 'numero');
        $numbers = array_map('intval', $numbers);
        
        $nextNumber = 1;
        while (in_array($nextNumber, $numbers)) {
            $nextNumber++;
        }
        
        return $nextNumber;
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
            'endpoint' => 'tables'
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