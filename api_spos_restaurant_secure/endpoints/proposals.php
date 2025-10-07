<?php
/**
 * Endpoints para gestión de Mesas Operativas (Proposals)
 * Ubicación: custom/pos/frontend/api_spos_restaurant_secure/endpoints/proposals.php
 */

class ProposalsEndpoint 
{
    private $db;
    private $auth;
    
    public function __construct($database, $auth) 
    {
        $this->db = $database;
        $this->auth = $auth;
    }
    
    /**
     * GET /proposals/{entity} - Obtener proposals activos por entidad
     */
    public function getTableProposals($entity) 
    {
        if (!$this->auth->hasPermission('read_proposals')) {
            $this->sendError(403, 'Permission denied');
        }
        
        try {
            $query = "
                SELECT p.*, s.nom as client_name, s.phone, s.email,
                       u.firstname, u.lastname,
                       COUNT(pd.rowid) as total_lines,
                       SUM(pd.qty) as total_items
                FROM " . $this->db->getPrefix() . "propal p
                LEFT JOIN " . $this->db->getPrefix() . "societe s ON p.fk_soc = s.rowid
                LEFT JOIN " . $this->db->getPrefix() . "user u ON p.fk_user_author = u.rowid
                LEFT JOIN " . $this->db->getPrefix() . "propaldet pd ON p.rowid = pd.fk_propal
                WHERE p.entity = ? 
                AND p.numero_mesa IS NOT NULL 
                AND p.fk_statut IN (0, 1, 2)
                GROUP BY p.rowid
                ORDER BY p.numero_mesa, p.date_creation DESC
            ";
            
            $proposals = $this->db->select($query, [$entity]);
            
            // Procesar datos adicionales
            foreach ($proposals as &$proposal) {
                $proposal['estado_nombre'] = $this->getStatusName($proposal['fk_statut']);
                $proposal['tiempo_transcurrido'] = $this->getTimeElapsed($proposal['date_creation']);
                $proposal['items_info'] = $this->getProposalItems($proposal['rowid']);
            }
            
            writeLog("Retrieved " . count($proposals) . " proposals for entity {$entity} by user: " . $this->auth->getUserInfo());
            
            $this->sendSuccess([
                'proposals' => $proposals,
                'entity' => $entity,
                'total' => count($proposals),
                'summary' => $this->getProposalsSummary($proposals)
            ]);
            
        } catch (Exception $e) {
            writeLog("Get proposals error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Database error: ' . $e->getMessage());
        }
    }
    
    /**
     * GET /proposal/{proposal_id} - Obtener proposal específico con detalles
     */
    public function getProposal($proposalId) 
    {
        if (!$this->auth->hasPermission('read_proposals')) {
            $this->sendError(403, 'Permission denied');
        }
        
        try {
            // Obtener proposal principal
            $query = "
                SELECT p.*, s.nom as client_name, s.phone, s.email, s.address,
                       u.firstname, u.lastname, u.login as created_by
                FROM " . $this->db->getPrefix() . "propal p
                LEFT JOIN " . $this->db->getPrefix() . "societe s ON p.fk_soc = s.rowid
                LEFT JOIN " . $this->db->getPrefix() . "user u ON p.fk_user_author = u.rowid
                WHERE p.rowid = ?
            ";
            
            $proposal = $this->db->selectOne($query, [$proposalId]);
            
            if (!$proposal) {
                $this->sendError(404, 'Proposal not found');
            }
            
            // Obtener líneas del proposal
            $proposal['lines'] = $this->getProposalLines($proposalId);
            $proposal['estado_nombre'] = $this->getStatusName($proposal['fk_statut']);
            $proposal['tiempo_transcurrido'] = $this->getTimeElapsed($proposal['date_creation']);
            $proposal['payments'] = $this->getProposalPayments($proposalId);
            
            writeLog("Proposal {$proposalId} retrieved by user: " . $this->auth->getUserInfo());
            
            $this->sendSuccess($proposal);
            
        } catch (Exception $e) {
            writeLog("Get proposal error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Database error: ' . $e->getMessage());
        }
    }
    
    /**
     * POST /proposal - Crear nuevo proposal para mesa
     */
    public function createProposal() 
    {
        if (!$this->auth->hasPermission('write_proposals')) {
            $this->sendError(403, 'Permission denied');
        }
        
        $data = $this->getJsonInput();
        
        // Validaciones
        $required = ['entity', 'numero_mesa', 'fk_soc'];
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                $this->sendError(400, "Field {$field} is required");
            }
        }
        
        try {
            // Verificar que no hay otro proposal activo para esa mesa
            $existing = $this->db->selectOne(
                "SELECT rowid FROM " . $this->db->getPrefix() . "propal 
                 WHERE entity = ? AND numero_mesa = ? AND fk_statut IN (0,1,2)",
                [$data['entity'], $data['numero_mesa']]
            );
            
            if ($existing) {
                $this->sendError(409, "Table {$data['numero_mesa']} already has an active order");
            }
            
            // Generar referencia
            $ref = $this->generateProposalRef($data['entity'], $data['numero_mesa']);
            
            // Crear proposal
            $insertQuery = "
                INSERT INTO " . $this->db->getPrefix() . "propal 
                (ref, entity, fk_soc, date_creation, datep, fk_user_author, fk_statut, numero_mesa, nombre_mesa, note_private, note_public)
                VALUES (?, ?, ?, NOW(), CURDATE(), ?, 0, ?, ?, ?, ?)
            ";
            
            $result = $this->db->insert($insertQuery, [
                $ref,
                $data['entity'],
                $data['fk_soc'],
                $this->auth->getCurrentUser()['rowid'],
                $data['numero_mesa'],
                $data['nombre_mesa'] ?? "Mesa {$data['numero_mesa']}",
                $data['note_private'] ?? '',
                $data['note_public'] ?? ''
            ]);
            
            if (!$result['success']) {
                throw new Exception('Failed to create proposal');
            }
            
            $proposalId = $result['insert_id'];
            
            // Agregar líneas si se proporcionan
            if (!empty($data['lines'])) {
                $this->addProposalLines($proposalId, $data['lines']);
            }
            
            writeLog("Proposal created with ID: {$proposalId} for table {$data['numero_mesa']} by user: " . $this->auth->getUserInfo());
            
            // Obtener proposal creado con todos los detalles
            $createdProposal = $this->getProposalDetails($proposalId);
            
            $this->sendSuccess([
                'success' => true,
                'proposal_id' => $proposalId,
                'proposal' => $createdProposal,
                'message' => 'Proposal creado exitosamente'
            ]);
            
        } catch (Exception $e) {
            writeLog("Create proposal error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Error creating proposal: ' . $e->getMessage());
        }
    }
    
    /**
     * PUT /proposal/{proposal_id}/status - Actualizar estado del proposal
     */
    public function updateProposalStatus($proposalId) 
    {
        if (!$this->auth->hasPermission('write_proposals')) {
            $this->sendError(403, 'Permission denied');
        }
        
        $data = $this->getJsonInput();
        
        if (!isset($data['status'])) {
            $this->sendError(400, 'Status is required');
        }
        
        $newStatus = (int)$data['status'];
        $validStatuses = [0, 1, 2, 3, 4]; // Draft, Validated, Signed, Billed, Refused
        
        if (!in_array($newStatus, $validStatuses)) {
            $this->sendError(400, 'Invalid status. Valid statuses: ' . implode(', ', $validStatuses));
        }
        
        try {
            // Verificar que el proposal existe
            $proposal = $this->db->selectOne(
                "SELECT * FROM " . $this->db->getPrefix() . "propal WHERE rowid = ?",
                [$proposalId]
            );
            
            if (!$proposal) {
                $this->sendError(404, 'Proposal not found');
            }
            
            // Actualizar estado
            $result = $this->db->update(
                "UPDATE " . $this->db->getPrefix() . "propal 
                 SET fk_statut = ?, date_modification = NOW(), fk_user_modif = ? 
                 WHERE rowid = ?",
                [$newStatus, $this->auth->getCurrentUser()['rowid'], $proposalId]
            );
            
            if ($result['affected_rows'] === 0) {
                $this->sendError(404, 'Proposal not found');
            }
            
            writeLog("Proposal {$proposalId} status updated to {$newStatus} by user: " . $this->auth->getUserInfo());
            
            $this->sendSuccess([
                'success' => true,
                'proposal_id' => $proposalId,
                'old_status' => (int)$proposal['fk_statut'],
                'new_status' => $newStatus,
                'status_name' => $this->getStatusName($newStatus),
                'message' => 'Estado actualizado exitosamente'
            ]);
            
        } catch (Exception $e) {
            writeLog("Update proposal status error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Error updating proposal status: ' . $e->getMessage());
        }
    }
    
    /**
     * POST /proposal/{proposal_id}/lines - Agregar línea al proposal
     */
    public function addProposalLine($proposalId) 
    {
        if (!$this->auth->hasPermission('write_proposals')) {
            $this->sendError(403, 'Permission denied');
        }
        
        $data = $this->getJsonInput();
        
        // Validaciones
        $required = ['fk_product', 'qty', 'subprice'];
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                $this->sendError(400, "Field {$field} is required");
            }
        }
        
        try {
            // Verificar que el proposal existe y está en estado editable
            $proposal = $this->db->selectOne(
                "SELECT fk_statut FROM " . $this->db->getPrefix() . "propal WHERE rowid = ?",
                [$proposalId]
            );
            
            if (!$proposal) {
                $this->sendError(404, 'Proposal not found');
            }
            
            if ($proposal['fk_statut'] > 1) {
                $this->sendError(409, 'Cannot modify proposal in current status');
            }
            
            // Calcular valores
            $qty = (float)$data['qty'];
            $subprice = (float)$data['subprice'];
            $remise_percent = (float)($data['remise_percent'] ?? 0);
            
            $total_ht = $qty * $subprice * (1 - $remise_percent / 100);
            $total_ttc = $total_ht; // Asumiendo sin impuestos por simplicidad
            
            // Agregar línea
            $insertQuery = "
                INSERT INTO " . $this->db->getPrefix() . "propaldet 
                (fk_propal, fk_product, description, qty, subprice, remise_percent, total_ht, total_ttc, product_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
            ";
            
            $result = $this->db->insert($insertQuery, [
                $proposalId,
                $data['fk_product'],
                $data['description'] ?? '',
                $qty,
                $subprice,
                $remise_percent,
                $total_ht,
                $total_ttc
            ]);
            
            if (!$result['success']) {
                throw new Exception('Failed to add proposal line');
            }
            
            $lineId = $result['insert_id'];
            
            // Actualizar totales del proposal
            $this->updateProposalTotals($proposalId);
            
            writeLog("Line added to proposal {$proposalId}: product {$data['fk_product']}, qty {$qty} by user: " . $this->auth->getUserInfo());
            
            $this->sendSuccess([
                'success' => true,
                'line_id' => $lineId,
                'proposal_id' => $proposalId,
                'message' => 'Línea agregada exitosamente'
            ]);
            
        } catch (Exception $e) {
            writeLog("Add proposal line error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Error adding proposal line: ' . $e->getMessage());
        }
    }
    
    /**
     * DELETE /proposal/{proposal_id} - Eliminar proposal (cancelar orden)
     */
    public function deleteProposal($proposalId) 
    {
        if (!$this->auth->hasPermission('write_proposals')) {
            $this->sendError(403, 'Permission denied');
        }
        
        try {
            // Verificar que el proposal existe
            $proposal = $this->db->selectOne(
                "SELECT * FROM " . $this->db->getPrefix() . "propal WHERE rowid = ?",
                [$proposalId]
            );
            
            if (!$proposal) {
                $this->sendError(404, 'Proposal not found');
            }
            
            // Verificar que se puede eliminar (solo en estados 0 o 4)
            if (!in_array($proposal['fk_statut'], [0, 4])) {
                $this->sendError(409, 'Cannot delete proposal in current status');
            }
            
            // Iniciar transacción
            $this->db->beginTransaction();
            
            try {
                // Eliminar líneas del proposal
                $this->db->delete(
                    "DELETE FROM " . $this->db->getPrefix() . "propaldet WHERE fk_propal = ?",
                    [$proposalId]
                );
                
                // Eliminar proposal
                $this->db->delete(
                    "DELETE FROM " . $this->db->getPrefix() . "propal WHERE rowid = ?",
                    [$proposalId]
                );
                
                $this->db->commit();
                
                writeLog("Proposal {$proposalId} (table {$proposal['numero_mesa']}) deleted by user: " . $this->auth->getUserInfo());
                
                $this->sendSuccess([
                    'success' => true,
                    'proposal_id' => $proposalId,
                    'table_number' => $proposal['numero_mesa'],
                    'message' => 'Proposal eliminado exitosamente'
                ]);
                
            } catch (Exception $e) {
                $this->db->rollback();
                throw $e;
            }
            
        } catch (Exception $e) {
            writeLog("Delete proposal error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Error deleting proposal: ' . $e->getMessage());
        }
    }
    
    /**
     * GET /proposals/{entity}/statistics - Obtener estadísticas de proposals
     */
    public function getProposalsStatistics($entity) 
    {
        if (!$this->auth->hasPermission('read_proposals')) {
            $this->sendError(403, 'Permission denied');
        }
        
        try {
            // Estadísticas generales
            $stats = $this->db->selectOne("
                SELECT 
                    COUNT(*) as total_proposals,
                    COUNT(CASE WHEN fk_statut = 0 THEN 1 END) as draft_count,
                    COUNT(CASE WHEN fk_statut = 1 THEN 1 END) as validated_count,
                    COUNT(CASE WHEN fk_statut = 2 THEN 1 END) as signed_count,
                    COUNT(CASE WHEN numero_mesa IS NOT NULL THEN 1 END) as table_orders,
                    SUM(total_ttc) as total_amount,
                    AVG(total_ttc) as average_amount,
                    COUNT(DISTINCT numero_mesa) as tables_in_use
                FROM " . $this->db->getPrefix() . "propal 
                WHERE entity = ? AND DATE(date_creation) = CURDATE()
            ", [$entity]);
            
            // Estadísticas por hora del día
            $hourlyStats = $this->db->select("
                SELECT 
                    HOUR(date_creation) as hour,
                    COUNT(*) as orders_count,
                    SUM(total_ttc) as hour_total
                FROM " . $this->db->getPrefix() . "propal 
                WHERE entity = ? AND DATE(date_creation) = CURDATE()
                GROUP BY HOUR(date_creation)
                ORDER BY hour
            ", [$entity]);
            
            // Top mesas por actividad
            $topTables = $this->db->select("
                SELECT 
                    numero_mesa,
                    COUNT(*) as order_count,
                    SUM(total_ttc) as table_total,
                    AVG(total_ttc) as average_order
                FROM " . $this->db->getPrefix() . "propal 
                WHERE entity = ? AND numero_mesa IS NOT NULL AND DATE(date_creation) = CURDATE()
                GROUP BY numero_mesa
                ORDER BY order_count DESC, table_total DESC
                LIMIT 10
            ", [$entity]);
            
            writeLog("Statistics retrieved for entity {$entity} by user: " . $this->auth->getUserInfo());
            
            $this->sendSuccess([
                'entity' => $entity,
                'date' => date('Y-m-d'),
                'general_stats' => $stats,
                'hourly_stats' => $hourlyStats,
                'top_tables' => $topTables,
                'generated_at' => date('Y-m-d H:i:s')
            ]);
            
        } catch (Exception $e) {
            writeLog("Get statistics error: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Error getting statistics: ' . $e->getMessage());
        }
    }
    
    /**
     * Obtener líneas del proposal
     */
    private function getProposalLines($proposalId) 
    {
        return $this->db->select("
            SELECT pd.*, p.label as product_name, p.ref as product_ref
            FROM " . $this->db->getPrefix() . "propaldet pd
            LEFT JOIN " . $this->db->getPrefix() . "product p ON pd.fk_product = p.rowid
            WHERE pd.fk_propal = ?
            ORDER BY pd.rang, pd.rowid
        ", [$proposalId]);
    }
    
    /**
     * Obtener pagos del proposal
     */
    private function getProposalPayments($proposalId) 
    {
        // Esto dependería de tu sistema de pagos
        // Por ahora retornamos array vacío
        return [];
    }
    
    /**
     * Obtener detalles completos del proposal
     */
    private function getProposalDetails($proposalId) 
    {
        $proposal = $this->db->selectOne("
            SELECT p.*, s.nom as client_name
            FROM " . $this->db->getPrefix() . "propal p
            LEFT JOIN " . $this->db->getPrefix() . "societe s ON p.fk_soc = s.rowid
            WHERE p.rowid = ?
        ", [$proposalId]);
        
        if ($proposal) {
            $proposal['lines'] = $this->getProposalLines($proposalId);
            $proposal['estado_nombre'] = $this->getStatusName($proposal['fk_statut']);
        }
        
        return $proposal;
    }
    
    /**
     * Agregar múltiples líneas al proposal
     */
    private function addProposalLines($proposalId, $lines) 
    {
        foreach ($lines as $line) {
            $qty = (float)$line['qty'];
            $subprice = (float)$line['subprice'];
            $remise_percent = (float)($line['remise_percent'] ?? 0);
            
            $total_ht = $qty * $subprice * (1 - $remise_percent / 100);
            $total_ttc = $total_ht;
            
            $this->db->insert("
                INSERT INTO " . $this->db->getPrefix() . "propaldet 
                (fk_propal, fk_product, description, qty, subprice, remise_percent, total_ht, total_ttc, product_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
            ", [
                $proposalId,
                $line['fk_product'],
                $line['description'] ?? '',
                $qty,
                $subprice,
                $remise_percent,
                $total_ht,
                $total_ttc
            ]);
        }
        
        $this->updateProposalTotals($proposalId);
    }
    
    /**
     * Actualizar totales del proposal
     */
    private function updateProposalTotals($proposalId) 
    {
        $totals = $this->db->selectOne("
            SELECT SUM(total_ht) as total_ht, SUM(total_ttc) as total_ttc
            FROM " . $this->db->getPrefix() . "propaldet 
            WHERE fk_propal = ?
        ", [$proposalId]);
        
        if ($totals) {
            $this->db->update("
                UPDATE " . $this->db->getPrefix() . "propal 
                SET total_ht = ?, total_ttc = ?
                WHERE rowid = ?
            ", [$totals['total_ht'] ?? 0, $totals['total_ttc'] ?? 0, $proposalId]);
        }
    }
    
    /**
     * Generar referencia para proposal
     */
    private function generateProposalRef($entity, $tableNumber) 
    {
        $year = date('Y');
        $month = date('m');
        
        // Buscar último número para esta entidad
        $lastRef = $this->db->selectOne("
            SELECT ref FROM " . $this->db->getPrefix() . "propal 
            WHERE entity = ? AND ref LIKE 'PR{$year}{$month}%'
            ORDER BY ref DESC LIMIT 1
        ", [$entity]);
        
        if ($lastRef) {
            $lastNumber = (int)substr($lastRef['ref'], -4);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }
        
        return sprintf('PR%s%s-T%02d-%04d', $year, $month, $tableNumber, $newNumber);
    }
    
    /**
     * Obtener nombre del estado
     */
    private function getStatusName($status) 
    {
        $statuses = [
            0 => 'Borrador',
            1 => 'Validada',
            2 => 'Firmada',
            3 => 'Facturada',
            4 => 'Rechazada'
        ];
        
        return $statuses[$status] ?? 'Desconocido';
    }
    
    /**
     * Calcular tiempo transcurrido
     */
    private function getTimeElapsed($dateCreation) 
    {
        $created = new DateTime($dateCreation);
        $now = new DateTime();
        $diff = $now->diff($created);
        
        if ($diff->days > 0) {
            return $diff->days . ' días';
        } elseif ($diff->h > 0) {
            return $diff->h . ' horas';
        } else {
            return $diff->i . ' minutos';
        }
    }
    
    /**
     * Obtener items del proposal
     */
    private function getProposalItems($proposalId) 
    {
        $items = $this->db->select("
            SELECT COUNT(*) as total_lines, SUM(qty) as total_qty
            FROM " . $this->db->getPrefix() . "propaldet 
            WHERE fk_propal = ?
        ", [$proposalId]);
        
        return $items[0] ?? ['total_lines' => 0, 'total_qty' => 0];
    }
    
    /**
     * Obtener resumen de proposals
     */
    private function getProposalsSummary($proposals) 
    {
        $summary = [
            'total_proposals' => count($proposals),
            'total_amount' => 0,
            'by_status' => [],
            'tables_in_use' => []
        ];
        
        foreach ($proposals as $proposal) {
            $summary['total_amount'] += (float)($proposal['total_ttc'] ?? 0);
            
            $status = $proposal['fk_statut'];
            if (!isset($summary['by_status'][$status])) {
                $summary['by_status'][$status] = 0;
            }
            $summary['by_status'][$status]++;
            
            if (!in_array($proposal['numero_mesa'], $summary['tables_in_use'])) {
                $summary['tables_in_use'][] = $proposal['numero_mesa'];
            }
        }
        
        $summary['unique_tables'] = count($summary['tables_in_use']);
        
        return $summary;
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
            'endpoint' => 'proposals'
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