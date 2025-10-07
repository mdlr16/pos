<?php
/**
 * Endpoints para gestión de Pagos Parciales Múltiples - VERSIÓN RESTAURANTE
 * Ubicación: custom/pos/frontend/api_spos_restaurant_secure/endpoints/payments.php
 * 
 * REESTRUCTURADO siguiendo el patrón de layout.php para mayor consistencia
 * Especializado para modo restaurante con variables?.SPOS_RESTAURANTE === "1"
 */

class PaymentsEndpoint 
{
    private $db;
    private $auth;
    
    public function __construct($database, $auth) 
    {
        $this->db = $database;
        $this->auth = $auth;
    }
    
    /**
     * POST /payments/invoice/{invoice_id}/partial - Procesar pagos parciales múltiples
     * MÉTODO PRINCIPAL para modo restaurante
     */
    public function processPartialPayments($invoiceId) 
    {
       
        $data = $this->getJsonInput();
        
        // Validaciones específicas para restaurante
        if (empty($data['payments']) || !is_array($data['payments'])) {
            $this->sendError(400, 'Payments array is required');
        }
        
        if (count($data['payments']) === 0) {
            $this->sendError(400, 'At least one payment is required');
        }
        
        writeLog("🍽️ Processing partial payments for invoice {$invoiceId} (Restaurant Mode): " . json_encode($data));
        
        try {
            // Validar que la factura existe y puede recibir pagos
            $invoice = $this->getInvoiceDetails($invoiceId);
            if (!$invoice) {
                $this->sendError(404, 'Invoice not found');
            }
            
            if (!$this->canInvoiceReceivePayments($invoice)) {
                $this->sendError(400, 'Invoice cannot receive payments. Status: ' . $invoice['fk_statut']);
            }
            
            // Validaciones adicionales para restaurante
            $this->validateRestaurantPayments($data['payments'], $invoice);
            
            // Procesar cada pago con transacción
            $results = [];
            $totalProcessed = 0;
            $successCount = 0;
            
            $this->db->beginTransaction();
            
            foreach ($data['payments'] as $index => $paymentData) {
                writeLog("🍽️ Processing restaurant payment " . ($index + 1) . ": " . json_encode($paymentData));
                
                $result = $this->createPartialPayment($invoiceId, $paymentData, $invoice);
                $results[] = $result;
                
                if ($result['success']) {
                    $successCount++;
                    $totalProcessed += $result['amount'];
                    writeLog("✅ Restaurant payment " . ($index + 1) . " created successfully: ID " . $result['payment_id']);
                } else {
                    writeLog("❌ Restaurant payment " . ($index + 1) . " failed: " . $result['error'], 'ERROR');
                }
            }
            
            // Verificar si la factura está completamente pagada
            $finalStatus = $this->updateInvoicePaymentStatus($invoiceId);
            
            // Agregar información específica de restaurante
            $restaurantInfo = $this->getRestaurantPaymentInfo($invoiceId, $invoice);
            
            $this->db->commit();
            
            $response = [
                'success' => $successCount > 0,
                'invoice_id' => $invoiceId,
                'processed_payments' => $results,
                'total_amount' => $totalProcessed,
                'successful_payments' => $successCount,
                'total_payments' => count($data['payments']),
                'final_status' => $finalStatus,
                'restaurant_info' => $restaurantInfo,
                'message' => $successCount === count($data['payments']) ? 
                    'Todos los pagos procesados exitosamente' : 
                    "{$successCount}/" . count($data['payments']) . " pagos procesados",
                'timestamp' => date('Y-m-d H:i:s')
            ];
            
            writeLog("🍽️ Restaurant partial payments completed: " . json_encode($response));
            $this->sendSuccess($response);
            
        } catch (Exception $e) {
            $this->db->rollback();
            writeLog("❌ Error processing restaurant payments: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Payment processing error: ' . $e->getMessage());
        }
    }
    
    /**
     * GET /payments/invoice/{invoice_id}/status - Verificar estado de pagos (Restaurante)
     */
    public function getPaymentStatus($invoiceId) 
    {
        
        
        writeLog("🍽️ Getting payment status for invoice: {$invoiceId}");
        
        try {
            $invoice = $this->getInvoiceDetails($invoiceId);
            if (!$invoice) {
                $this->sendError(404, 'Invoice not found');
            }
            
            // Obtener pagos de la factura con información detallada
            $paymentsQuery = "
                SELECT p.rowid, p.ref, p.datep, p.amount, p.fk_paiement, p.note_public,
                       pf.amount as payment_amount, ba.label as bank_name, ba.number as bank_number,
                       cpt.libelle as payment_type_name
                FROM llx_paiement_facture pf
                JOIN llx_paiement p ON pf.fk_paiement = p.rowid
                LEFT JOIN llx_bank_account ba ON p.fk_bank = ba.rowid
                LEFT JOIN llx_c_paiement cpt ON p.fk_paiement = cpt.id
                WHERE pf.fk_facture = ? AND p.statut = 1
                ORDER BY p.datep DESC
            ";
            
            $payments = $this->db->select($paymentsQuery, [$invoiceId]);
            
            // Actualizar y obtener estado actual
            $status = $this->updateInvoicePaymentStatus($invoiceId);
            
            // Información adicional para restaurante
            $restaurantInfo = $this->getRestaurantPaymentInfo($invoiceId, $invoice);
            $paymentSummary = $this->getPaymentSummary($payments);
            
            writeLog("✅ Payment status retrieved for restaurant invoice");
            
            $this->sendSuccess([
                'invoice_id' => $invoiceId,
                'invoice_ref' => $invoice['ref'],
                'payments' => $payments,
                'status' => $status,
                'restaurant_info' => $restaurantInfo,
                'payment_summary' => $paymentSummary,
                'timestamp' => date('Y-m-d H:i:s')
            ]);
            
        } catch (Exception $e) {
            writeLog("❌ Error getting payment status: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Database error: ' . $e->getMessage());
        }
    }
    
    /**
     * DELETE /payments/{payment_id} - Eliminar un pago (Restaurante)
     */
    public function deletePayment($paymentId) 
    {
        writeLog("🍽️ Deleting restaurant payment: {$paymentId}");
        
        try {
            // Verificar que el pago existe
            $paymentQuery = "
                SELECT p.*, pf.fk_facture 
                FROM llx_paiement p
                LEFT JOIN llx_paiement_facture pf ON p.rowid = pf.fk_paiement
                WHERE p.rowid = ?
            ";
            
            $payment = $this->db->selectOne($paymentQuery, [$paymentId]);
            
            if (!$payment) {
                $this->sendError(404, 'Payment not found');
            }
            
            $this->db->beginTransaction();
            
            // 1. Eliminar relaciones pago-factura
            $deleteRelationResult = $this->db->delete(
                "DELETE FROM llx_paiement_facture WHERE fk_paiement = ?",
                [$paymentId]
            );
            
            // 2. Eliminar entradas bancarias relacionadas
            $deleteBankUrlResult = $this->db->delete(
                "DELETE FROM llx_bank_url WHERE url_id = ? AND type = 'payment'",
                [$paymentId]
            );
            
            // 3. Eliminar entradas bancarias si existen
            if ($payment['fk_bank']) {
                $this->db->delete(
                    "DELETE FROM llx_bank WHERE fk_account = ? AND amount = ? AND label LIKE ?",
                    [$payment['fk_bank'], $payment['amount'], "%{$payment['ref']}%"]
                );
            }
            
            // 4. Eliminar el pago principal
            $deletePaymentResult = $this->db->delete(
                "DELETE FROM llx_paiement WHERE rowid = ?",
                [$paymentId]
            );
            
            if ($deletePaymentResult['affected_rows'] === 0) {
                throw new Exception('Failed to delete payment');
            }
            
            // 5. Actualizar estado de la factura si existe
            if ($payment['fk_facture']) {
                $this->updateInvoicePaymentStatus($payment['fk_facture']);
            }
            
            $this->db->commit();
            
            writeLog("✅ Restaurant payment {$paymentId} deleted successfully");
            
            $this->sendSuccess([
                'success' => true,
                'message' => 'Pago eliminado exitosamente',
                'payment_id' => $paymentId,
                'invoice_id' => $payment['fk_facture'],
                'timestamp' => date('Y-m-d H:i:s')
            ]);
            
        } catch (Exception $e) {
            $this->db->rollback();
            writeLog("❌ Error deleting restaurant payment: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Error deleting payment: ' . $e->getMessage());
        }
    }
    
    /**
     * GET /payments/methods - Obtener métodos de pago disponibles (Restaurante)
     */
    public function getPaymentMethods() 
    {
        
        writeLog("🍽️ Getting payment methods for restaurant");
        
        try {
            $methodsQuery = "
                SELECT cp.id, cp.code, cp.libelle, cp.type, cp.active,
                       ba.rowid as bank_id, ba.label as bank_label, ba.number as bank_number
                FROM llx_c_paiement cp
                LEFT JOIN llx_bank_account ba ON cp.id = ba.fk_paiement
                WHERE cp.active = 1 AND cp.entity IN (0, " . $this->auth->getCurrentUser()['entity'] . ")
                ORDER BY cp.libelle ASC
            ";
            
            $methods = $this->db->select($methodsQuery, []);
            
            // Agrupar métodos con sus cuentas bancarias
            $groupedMethods = [];
            foreach ($methods as $method) {
                $methodId = $method['id'];
                
                if (!isset($groupedMethods[$methodId])) {
                    $groupedMethods[$methodId] = [
                        'id' => $method['id'],
                        'code' => $method['code'],
                        'name' => $method['libelle'],
                        'type' => $method['type'],
                        'active' => $method['active'],
                        'bank_accounts' => []
                    ];
                }
                
                if ($method['bank_id']) {
                    $groupedMethods[$methodId]['bank_accounts'][] = [
                        'id' => $method['bank_id'],
                        'label' => $method['bank_label'],
                        'number' => $method['bank_number']
                    ];
                }
            }
            
            $finalMethods = array_values($groupedMethods);
            
            writeLog("✅ Found " . count($finalMethods) . " payment methods for restaurant");
            
            $this->sendSuccess([
                'payment_methods' => $finalMethods,
                'total_methods' => count($finalMethods),
                'timestamp' => date('Y-m-d H:i:s')
            ]);
            
        } catch (Exception $e) {
            writeLog("❌ Error getting payment methods: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Database error: ' . $e->getMessage());
        }
    }
    
    /**
     * GET /payments/statistics/{entity} - Estadísticas de pagos para restaurante
     */
    public function getPaymentStatistics($entity) 
    {
       
        writeLog("🍽️ Getting payment statistics for restaurant entity: {$entity}");
        
        try {
            // Estadísticas generales de pagos
            $generalStatsQuery = "
                SELECT 
                    COUNT(DISTINCT p.rowid) as total_payments,
                    COUNT(DISTINCT pf.fk_facture) as total_invoices_with_payments,
                    SUM(p.amount) as total_payment_amount,
                    AVG(p.amount) as average_payment_amount,
                    MIN(p.datep) as first_payment_date,
                    MAX(p.datep) as last_payment_date
                FROM llx_paiement p
                JOIN llx_paiement_facture pf ON p.rowid = pf.fk_paiement
                JOIN llx_facture f ON pf.fk_facture = f.rowid
                WHERE f.entity = ? AND p.statut = 1
            ";
            
            $generalStats = $this->db->selectOne($generalStatsQuery, [$entity]);
            
            // Estadísticas por método de pago
            $methodStatsQuery = "
                SELECT 
                    cp.libelle as payment_method,
                    COUNT(p.rowid) as payment_count,
                    SUM(p.amount) as total_amount,
                    AVG(p.amount) as average_amount
                FROM llx_paiement p
                JOIN llx_paiement_facture pf ON p.rowid = pf.fk_paiement
                JOIN llx_facture f ON pf.fk_facture = f.rowid
                LEFT JOIN llx_c_paiement cp ON p.fk_paiement = cp.id
                WHERE f.entity = ? AND p.statut = 1
                GROUP BY p.fk_paiement, cp.libelle
                ORDER BY total_amount DESC
            ";
            
            $methodStats = $this->db->select($methodStatsQuery, [$entity]);
            
            // Estadísticas de hoy
            $todayStatsQuery = "
                SELECT 
                    COUNT(p.rowid) as today_payments,
                    SUM(p.amount) as today_amount
                FROM llx_paiement p
                JOIN llx_paiement_facture pf ON p.rowid = pf.fk_paiement
                JOIN llx_facture f ON pf.fk_facture = f.rowid
                WHERE f.entity = ? AND p.statut = 1 AND DATE(p.datep) = CURDATE()
            ";
            
            $todayStats = $this->db->selectOne($todayStatsQuery, [$entity]);
            
            writeLog("✅ Payment statistics calculated for restaurant");
            
            $this->sendSuccess([
                'general_stats' => [
                    'total_payments' => (int)$generalStats['total_payments'],
                    'total_invoices_with_payments' => (int)$generalStats['total_invoices_with_payments'],
                    'total_payment_amount' => (float)$generalStats['total_payment_amount'],
                    'average_payment_amount' => (float)$generalStats['average_payment_amount'],
                    'first_payment_date' => $generalStats['first_payment_date'],
                    'last_payment_date' => $generalStats['last_payment_date']
                ],
                'method_stats' => array_map(function($stat) {
                    return [
                        'payment_method' => $stat['payment_method'] ?: 'Método desconocido',
                        'payment_count' => (int)$stat['payment_count'],
                        'total_amount' => (float)$stat['total_amount'],
                        'average_amount' => (float)$stat['average_amount']
                    ];
                }, $methodStats),
                'today_stats' => [
                    'today_payments' => (int)$todayStats['today_payments'],
                    'today_amount' => (float)$todayStats['today_amount']
                ],
                'entity' => $entity,
                'timestamp' => date('Y-m-d H:i:s')
            ]);
            
        } catch (Exception $e) {
            writeLog("❌ Error getting payment statistics: " . $e->getMessage(), 'ERROR');
            $this->sendError(500, 'Database error: ' . $e->getMessage());
        }
    }
    
    // ============================================================================
    // MÉTODOS PRIVADOS - LÓGICA INTERNA
    // ============================================================================
    
    /**
     * Validaciones específicas para pagos de restaurante
     */
    private function validateRestaurantPayments($payments, $invoice) 
    {
        $totalInvoice = (float)$invoice['total_ttc'];
        $totalPayments = 0;
        
        foreach ($payments as $payment) {
            if (!isset($payment['amount']) || !isset($payment['method'])) {
                $this->sendError(400, 'Each payment must have amount and method');
            }
            
            $amount = (float)$payment['amount'];
            if ($amount <= 0) {
                $this->sendError(400, 'Payment amount must be greater than 0');
            }
            
            $totalPayments += $amount;
        }
        
        // Permitir sobrepago (propinas, etc.) hasta 50% adicional
        $maxAllowed = $totalInvoice * 1.5;
        if ($totalPayments > $maxAllowed) {
            $this->sendError(400, "Total payments ({$totalPayments}) exceed maximum allowed ({$maxAllowed})");
        }
    }
    
    /**
     * Crear un pago parcial individual (mejorado para restaurante)
     */
    private function createPartialPayment($invoiceId, $paymentData, $invoice) 
    {
        try {
            // Validar datos del pago
            $amount = (float)$paymentData['amount'];
            if ($amount <= 0) {
                return [
                    'success' => false,
                    'error' => 'Invalid payment amount: ' . $amount,
                    'method' => $paymentData['method'],
                    'amount' => $amount
                ];
            }
            
            // Obtener fecha actual
            $currentDate = date('Y-m-d H:i:s');
            $currentTimestamp = time();
            
            // Generar referencia única del pago (mejorada para restaurante)
            $reference = isset($paymentData['reference']) ? 
                $paymentData['reference'] : 
                'REST-' . date('Ymd') . '-' . $currentTimestamp . '-' . substr(md5(uniqid()), 0, 6);
            
            // Preparar datos del pago
            $paymentParams = [
                'ref' => $reference,
                'entity' => $invoice['entity'],
                'datec' => $currentDate,
                'tms' => $currentDate,
                'date_creation' => $currentDate,
                'fk_user_creat' => $this->auth->getCurrentUser()['rowid'],
                'datep' => $currentDate,
                'amount' => $amount,
                'fk_paiement' => (int)($paymentData['idTipop'] ?? 1),
                'num_paiement' => $reference,
                'note_public' => $paymentData['comment'] ?? "Pago {$paymentData['method']} - Restaurante POS",
                'note_private' => '',
                'fk_bank' => isset($paymentData['idBank']) ? (int)$paymentData['idBank'] : null,
                'fk_user_author' => $this->auth->getCurrentUser()['rowid'],
                'statut' => 1
            ];
            
            // 1. Crear entrada en tabla de pagos
            $paymentResult = $this->db->insert(
                "INSERT INTO llx_paiement",
                $paymentParams
            );
            
            if (!$paymentResult['success']) {
                throw new Exception('Failed to create payment record');
            }
            
            $paymentId = $paymentResult['insert_id'];
            
            // 2. Crear relación pago-factura
            $relationResult = $this->db->insert(
                "INSERT INTO llx_paiement_facture",
                [
                    'fk_paiement' => $paymentId,
                    'fk_facture' => $invoiceId,
                    'amount' => $amount,
                    'multicurrency_amount' => $amount
                ]
            );
            
            if (!$relationResult['success']) {
                throw new Exception('Failed to create payment-invoice relation');
            }
            
            // 3. Crear entrada bancaria si se especifica cuenta
            if (isset($paymentData['idBank']) && (int)$paymentData['idBank'] > 0) {
                $this->createBankEntry($paymentId, $paymentData, $amount, $invoice, $reference);
            }
            
            return [
                'success' => true,
                'payment_id' => $paymentId,
                'method' => $paymentData['method'],
                'amount' => $amount,
                'reference' => $reference,
                'timestamp' => $currentDate
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'method' => $paymentData['method'] ?? 'unknown',
                'amount' => $amount ?? 0
            ];
        }
    }
    
    /**
     * Crear entrada bancaria para el pago (mejorada)
     */
    private function createBankEntry($paymentId, $paymentData, $amount, $invoice, $reference) 
    {
        try {
            $currentDate = date('Y-m-d H:i:s');
            $bankId = (int)$paymentData['idBank'];
            
            // Obtener información de la cuenta bancaria
            $bankAccount = $this->db->selectOne(
                "SELECT * FROM llx_bank_account WHERE rowid = ?",
                [$bankId]
            );
            
            if (!$bankAccount) {
                writeLog("Bank account {$bankId} not found, skipping bank entry", 'WARNING');
                return false;
            }
            
            // Crear entrada en llx_bank
            $label = "Pago {$paymentData['method']} - Restaurante - Factura {$invoice['ref']} - POS";
            
            $bankEntryParams = [
                'datec' => $currentDate,
                'tms' => $currentDate,
                'datev' => $currentDate,
                'dateo' => $currentDate,
                'amount' => $amount,
                'label' => $label,
                'fk_account' => $bankId,
                'fk_user_author' => $this->auth->getCurrentUser()['rowid'],
                'fk_type' => 'CB',
                'num_releve' => '',
                'num_chq' => '',
                'rappro' => 0,
                'fk_bordereau' => 0,
                'statut' => 1,
                'entity' => $invoice['entity']
            ];
            
            $bankResult = $this->db->insert(
                "INSERT INTO llx_bank",
                $bankEntryParams
            );
            
            if ($bankResult['success']) {
                $bankLineId = $bankResult['insert_id'];
                
                // Crear relación entre pago y entrada bancaria
                $this->db->insert(
                    "INSERT INTO llx_bank_url",
                    [
                        'fk_bank' => $bankLineId,
                        'url_id' => $paymentId,
                        'url' => "/compta/paiement/card.php?id={$paymentId}",
                        'label' => "Pago Restaurante {$paymentData['method']}",
                        'type' => 'payment'
                    ]
                );
                
                writeLog("✅ Bank entry created: ID {$bankLineId} for restaurant payment {$paymentId}");
                return true;
            }
            
            return false;
            
        } catch (Exception $e) {
            writeLog("❌ Error creating bank entry: " . $e->getMessage(), 'ERROR');
            return false;
        }
    }
    
    /**
     * Actualizar el estado de pago de la factura (mejorado)
     */
    private function updateInvoicePaymentStatus($invoiceId) 
    {
        try {
            // Calcular total pagado
            $paidResult = $this->db->selectOne("
                SELECT COALESCE(SUM(pf.amount), 0) as total_paid
                FROM llx_paiement_facture pf
                JOIN llx_paiement p ON pf.fk_paiement = p.rowid
                WHERE pf.fk_facture = ? AND p.statut = 1
            ", [$invoiceId]);
            
            $totalPaid = (float)$paidResult['total_paid'];
            
            // Obtener total de la factura
            $invoice = $this->db->selectOne(
                "SELECT total_ttc FROM llx_facture WHERE rowid = ?",
                [$invoiceId]
            );
            
            $totalAmount = (float)$invoice['total_ttc'];
            
            // Determinar estado de pago
            $paymentStatus = 0; // No pagada
            if ($totalPaid > 0) {
                if ($totalPaid >= ($totalAmount - 0.01)) { // Tolerancia de 1 centavo
                    $paymentStatus = 1; // Completamente pagada
                } else {
                    $paymentStatus = 2; // Parcialmente pagada (si existe este estado)
                }
            }
            
            // Actualizar factura
            $this->db->update(
                "UPDATE llx_facture SET paye = ?, totalpaid = ?, tms = NOW() WHERE rowid = ?",
                [$paymentStatus, $totalPaid, $invoiceId]
            );
            
            writeLog("✅ Restaurant invoice {$invoiceId} payment status updated: paid={$paymentStatus}, total_paid={$totalPaid}");
            
            return [
                'total_amount' => $totalAmount,
                'total_paid' => $totalPaid,
                'remaining_amount' => max(0, $totalAmount - $totalPaid),
                'overpayment' => max(0, $totalPaid - $totalAmount),
                'payment_status' => $paymentStatus,
                'is_fully_paid' => $paymentStatus == 1,
                'is_overpaid' => $totalPaid > $totalAmount
            ];
            
        } catch (Exception $e) {
            writeLog("❌ Error updating invoice payment status: " . $e->getMessage(), 'ERROR');
            return [
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Obtener detalles de la factura (mejorado)
     */
    private function getInvoiceDetails($invoiceId) 
    {
        try {
            return $this->db->selectOne("
                SELECT f.*, s.nom as client_name 
                FROM llx_facture f
                LEFT JOIN llx_societe s ON f.fk_soc = s.rowid
                WHERE f.rowid = ?
            ", [$invoiceId]);
            
        } catch (Exception $e) {
            writeLog("❌ Error getting invoice details: " . $e->getMessage(), 'ERROR');
            return null;
        }
    }
    
    /**
     * Verificar si la factura puede recibir pagos
     */
    private function canInvoiceReceivePayments($invoice) 
    {
        if (!$invoice) {
            return false;
        }
        
        // Estados de factura en Dolibarr:
        // 0 = Draft, 1 = Validated, 2 = Paid, 3 = Abandoned
        $status = (int)$invoice['fk_statut'];
        $isPaid = (int)$invoice['paye'];
        
        // Solo facturas validadas (status 1) y no completamente pagadas pueden recibir pagos
        return ($status === 1 && $isPaid !== 1);
    }
    
    /**
     * Obtener información específica de restaurante para pagos
     */
    private function getRestaurantPaymentInfo($invoiceId, $invoice) 
    {
        try {
            // Intentar obtener información de mesa si existe
            $mesaInfo = null;
            
            // Buscar en proposals si la factura viene de una mesa
            $proposalResult = $this->db->selectOne("
                SELECT p.rowid, p.ref, p.fk_spos_mesa, m.numero, m.nombre
                FROM llx_propal p
                LEFT JOIN llx_spos_restaurant_mesas m ON p.fk_spos_mesa = m.rowid
                WHERE p.fk_facture_source = ?
                LIMIT 1
            ", [$invoiceId]);
            
            if ($proposalResult && $proposalResult['fk_spos_mesa']) {
                $mesaInfo = [
                    'mesa_id' => $proposalResult['fk_spos_mesa'],
                    'mesa_numero' => $proposalResult['numero'],
                    'mesa_nombre' => $proposalResult['nombre'],
                    'proposal_ref' => $proposalResult['ref']
                ];
            }
            
            return [
                'mesa_info' => $mesaInfo,
                'invoice_type' => 'restaurant',
                'processing_date' => date('Y-m-d H:i:s'),
                'entity' => $invoice['entity']
            ];
            
        } catch (Exception $e) {
            writeLog("⚠️ Error getting restaurant payment info: " . $e->getMessage(), 'WARNING');
            return [
                'mesa_info' => null,
                'invoice_type' => 'restaurant',
                'processing_date' => date('Y-m-d H:i:s'),
                'entity' => $invoice['entity']
            ];
        }
    }
    
    /**
     * Obtener resumen de pagos
     */
    private function getPaymentSummary($payments) 
    {
        $summary = [
            'total_payments' => count($payments),
            'total_amount' => 0,
            'methods_used' => [],
            'first_payment' => null,
            'last_payment' => null
        ];
        
        foreach ($payments as $payment) {
            $summary['total_amount'] += (float)$payment['payment_amount'];
            
            // Agrupar por método
            $method = $payment['payment_type_name'] ?: 'Método desconocido';
            if (!isset($summary['methods_used'][$method])) {
                $summary['methods_used'][$method] = [
                    'count' => 0,
                    'amount' => 0
                ];
            }
            $summary['methods_used'][$method]['count']++;
            $summary['methods_used'][$method]['amount'] += (float)$payment['payment_amount'];
            
            // Fechas
            if (!$summary['first_payment'] || $payment['datep'] < $summary['first_payment']) {
                $summary['first_payment'] = $payment['datep'];
            }
            if (!$summary['last_payment'] || $payment['datep'] > $summary['last_payment']) {
                $summary['last_payment'] = $payment['datep'];
            }
        }
        
        return $summary;
    }
    
    // ============================================================================
    // MÉTODOS AUXILIARES - SIGUIENDO PATRÓN DE LAYOUT.PHP
    // ============================================================================
    
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
            'endpoint' => 'payments'
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