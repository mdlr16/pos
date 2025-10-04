import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext';

export const usePayments = (calculateTotal) => {
  const { variables } = useContext(AuthContext);
  
  // Estados existentes
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [saldo, setSaldo] = useState(0);
  const [newPaymentAmount, setNewPaymentAmount] = useState(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [cashBalance, setCashBalance] = useState(0);
  const [closureAmount, setClosureAmount] = useState('');
  
  // Estados para pagos reales
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentResults, setPaymentResults] = useState([]);
  const [lastInvoiceId, setLastInvoiceId] = useState(null);
  
  // 🔥 NUEVOS ESTADOS PARA PAGOS PARCIALES
  const [partialPaymentsSupported, setPartialPaymentsSupported] = useState(null);
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [endpointTestResult, setEndpointTestResult] = useState(null);

  // Detectar modo restaurante
  const isRestaurantMode = variables?.SPOS_RESTAURANTE === "1";

  // 🔥 EFECTO PARA VERIFICAR SOPORTE DE PAGOS PARCIALES AL INICIALIZAR
  useEffect(() => {
    const checkPartialPaymentsSupport = async () => {
      try {
        console.log('🔍 Verificando soporte de pagos parciales...');
        
        // Importar función de verificación dinámicamente
        const { checkAndMigratePartialPayments } = await import('../posAPI');
        
        const migrationResult = await checkAndMigratePartialPayments(variables);
        setMigrationStatus(migrationResult);
        setPartialPaymentsSupported(migrationResult.migrated);
        
        if (migrationResult.migrated) {
          console.log('✅ Sistema migrado a pagos parciales:', migrationResult.features);
          setEndpointTestResult({
            success: true,
            features: migrationResult.features,
            url: migrationResult.endpointUrl
          });
        } else {
          console.warn('⚠️ Endpoint personalizado no disponible:', migrationResult.message);
          setEndpointTestResult({
            success: false,
            error: migrationResult.error,
            fallbackAvailable: migrationResult.fallbackAvailable
          });
        }
        
      } catch (error) {
        console.error('❌ Error verificando soporte de pagos parciales:', error);
        setPartialPaymentsSupported(false);
        setMigrationStatus({
          migrated: false,
          error: error.message,
          message: 'Error verificando compatibilidad'
        });
        setEndpointTestResult({
          success: false,
          error: error.message,
          fallbackAvailable: true
        });
      }
    };
    
    if (variables?.SPOS_URL && (variables?.DOLIBARR_API_KEY || variables?.dolibarrToken)) {
      checkPartialPaymentsSupport();
    }
  }, [variables?.SPOS_URL, variables?.DOLIBARR_API_KEY, variables?.dolibarrToken]);

  // Actualizar total y saldo cuando cambie el carrito
  useEffect(() => {
    const newTotal = calculateTotal();
    setTotal(newTotal);
    setSaldo(newTotal);
  }, [calculateTotal]);

  // 🔥 FUNCIÓN MEJORADA: Agregar pago con soporte para parciales
  const handleAddPayment = (terminal) => {
    if (newPaymentAmount > 0 && selectedPaymentMethod) {
      const selectedMethod = terminal.payment_methods.find(method => method.label === selectedPaymentMethod);

      if (selectedMethod) {
        const newPayment = { 
          method: selectedMethod.label,
          amount: newPaymentAmount, 
          idBank: selectedMethod.fk_bank,
          idTipop: selectedMethod.fk_c_paiement,
          // 🔥 CAMPOS ADICIONALES PARA PAGOS PARCIALES
          timestamp: new Date().toISOString(),
          terminalId: terminal.rowid,
          processed: false,
          id: Date.now() + Math.random(), // ID único temporal
          // 🔥 MARCAR COMO PAGO PARCIAL SI ESTÁ SOPORTADO
          isPartialPayment: partialPaymentsSupported === true,
          endpointSupported: partialPaymentsSupported
        };
        
        const newPayments = [...payments, newPayment];
        setPayments(newPayments);
        setSaldo(saldo - newPaymentAmount);
        setNewPaymentAmount(0);
        setSelectedPaymentMethod('');
        
        // 🔥 LOG MEJORADO
        console.log('💰 Pago agregado:', {
          method: newPayment.method,
          amount: newPayment.amount,
          saldoRestante: saldo - newPaymentAmount,
          partialPaymentsSupported: partialPaymentsSupported,
          restaurantMode: isRestaurantMode,
          endpointUsed: partialPaymentsSupported ? 'custom-endpoint' : 'standard-api-fallback'
        });

        if (isRestaurantMode) {
          console.log('🍽️ Pago agregado en modo restaurante con soporte:', {
            partialPayments: partialPaymentsSupported,
            automaticFallback: endpointTestResult?.fallbackAvailable
          });
        }
      }
    }
  };

  // 🔥 FUNCIÓN MEJORADA: Procesar pagos reales con soporte para parciales y fallback
  const processRealPayments = async (invoiceId) => {
    if (!invoiceId || payments.length === 0) {
      console.log('ℹ️ No hay pagos que procesar en Dolibarr');
      return { success: true, message: 'No hay pagos que procesar' };
    }

    console.log('🔥 PROCESANDO PAGOS REALES EN DOLIBARR...');
    console.log('📋 Invoice ID:', invoiceId);
    console.log('💳 Pagos a procesar:', payments);
    console.log('🎯 Soporte pagos parciales:', partialPaymentsSupported);
    console.log('🔄 Fallback automático disponible:', endpointTestResult?.fallbackAvailable);

    setIsProcessingPayment(true);
    
    try {
      // 🔥 USAR FUNCIÓN UNIFICADA QUE MANEJA ENDPOINT PERSONALIZADO + FALLBACK
      console.log('✨ Usando función unificada con fallback automático...');
      const { processInvoicePayments } = await import('../posAPI');
      const result = await processInvoicePayments(variables, invoiceId, payments);
      
      setPaymentResults(result.processedPayments || []);
      setLastInvoiceId(invoiceId);
      
      // Marcar pagos como procesados (solo los exitosos)
      const updatedPayments = payments.map((payment, index) => {
        const paymentResult = result.processedPayments[index];
        return {
          ...payment,
          processed: paymentResult?.success || false,
          paymentId: paymentResult?.paymentId || null,
          processingResult: paymentResult
        };
      });
      setPayments(updatedPayments);
      
      console.log('✅ Pagos procesados exitosamente:', result);
      console.log('🔧 Endpoint usado:', result.endpointUsed);
      
      return result;
      
    } catch (error) {
      console.error('❌ Error procesando pagos reales:', error);
      return {
        success: false,
        error: error.message,
        endpointUsed: 'error-occurred'
      };
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // 🔥 FUNCIÓN MEJORADA: Procesar factura completa con pagos parciales y fallback
  const processCompleteInvoiceWithPayments = async (invoiceData) => {
    console.log('🍽️ Procesando factura completa con pagos...');
    console.log('🎯 Soporte pagos parciales:', partialPaymentsSupported);
    console.log('🔄 Fallback automático:', endpointTestResult?.fallbackAvailable);
    
    setIsProcessingPayment(true);
    
    try {
      // 🔥 USAR FUNCIÓN UNIFICADA PARA RESTAURANTE CON FALLBACK AUTOMÁTICO
      console.log('✨ Usando función unificada para restaurante con fallback automático...');
      const { processRestaurantInvoiceWithPayments } = await import('../posAPI');
      const result = await processRestaurantInvoiceWithPayments(variables, invoiceData, payments);
      
      if (result.success) {
        setLastInvoiceId(result.invoice.id);
        setPaymentResults(result.payments?.processedPayments || []);
        
        // Marcar todos los pagos como procesados según el resultado
        const updatedPayments = payments.map((payment, index) => {
          const paymentResult = result.payments?.processedPayments[index];
          return {
            ...payment,
            processed: paymentResult?.success || false,
            paymentId: paymentResult?.paymentId || null,
            processingResult: paymentResult
          };
        });
        setPayments(updatedPayments);
        
        console.log('🔧 Endpoint usado para restaurante:', result.endpointUsed);
        console.log('🎉 Soporte parciales activo:', result.partialPaymentsSupported);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Error en proceso completo:', error);
      return {
        success: false,
        error: error.message,
        endpointUsed: 'restaurant-error'
      };
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // 🔥 FUNCIÓN MEJORADA: Eliminar pago específico con soporte para parciales
  const removePayment = (index) => {
    if (index >= 0 && index < payments.length) {
      const removedPayment = payments[index];
      const newPayments = payments.filter((_, i) => i !== index);
      
      setPayments(newPayments);
      setSaldo(saldo + removedPayment.amount); // Devolver el monto al saldo
      
      console.log(`🗑️ Pago eliminado: ${removedPayment.method} Q.${removedPayment.amount}`);
      
      // 🔥 SI EL PAGO YA ESTABA PROCESADO Y TENEMOS SOPORTE PARA PARCIALES, ELIMINAR TAMBIÉN DEL SERVIDOR
      if (removedPayment.processed && removedPayment.paymentId && partialPaymentsSupported) {
        console.log('🔄 Eliminando pago procesado del servidor...');
        deleteProcessedPayment(removedPayment.paymentId);
      } else if (removedPayment.processed && !partialPaymentsSupported) {
        console.warn('⚠️ Pago procesado con API estándar - eliminación del servidor no disponible');
      }
      
      if (isRestaurantMode) {
        console.log('🍽️ Pago eliminado en modo restaurante, saldo actualizado');
      }
    }
  };

  // 🔥 FUNCIÓN MEJORADA: Eliminar pago ya procesado del servidor
  const deleteProcessedPayment = async (paymentId) => {
    try {
      if (!partialPaymentsSupported) {
        console.warn('⚠️ Eliminación de pagos procesados no soportada con API estándar');
        return {
          success: false,
          error: 'Eliminación no soportada con API estándar',
          fallbackUsed: true
        };
      }
      
      const { deletePayment } = await import('../posAPI');
      const result = await deletePayment(variables, paymentId);
      
      if (result.success) {
        console.log('✅ Pago eliminado del servidor:', paymentId);
        return result;
      } else {
        console.error('❌ Error eliminando pago del servidor:', result.error);
        return result;
      }
      
    } catch (error) {
      console.error('❌ Error eliminando pago del servidor:', error);
      return {
        success: false,
        error: error.message,
        endpointUsed: 'delete-error'
      };
    }
  };

  // Función existente: Editar monto de pago
  const editPayment = (index, newAmount) => {
    if (index >= 0 && index < payments.length && newAmount > 0) {
      const oldPayment = payments[index];
      const updatedPayments = [...payments];
      
      // Actualizar el pago
      updatedPayments[index] = {
        ...oldPayment,
        amount: parseFloat(newAmount),
        // 🔥 MARCAR COMO MODIFICADO SI YA ESTABA PROCESADO
        modified: oldPayment.processed,
        originalAmount: oldPayment.processed ? oldPayment.amount : undefined
      };
      
      setPayments(updatedPayments);
      
      // Recalcular saldo
      const newTotalPaid = updatedPayments.reduce((sum, payment) => sum + payment.amount, 0);
      setSaldo(total - newTotalPaid);
      
      console.log(`✏️ Pago editado: ${oldPayment.method} Q.${oldPayment.amount} → Q.${newAmount}`);
      
      if (oldPayment.processed) {
        console.warn('⚠️ Pago ya procesado editado - requerirá re-procesamiento');
      }
      
      if (isRestaurantMode) {
        console.log('🍽️ Pago editado en modo restaurante, saldo recalculado');
      }
    }
  };

  // 🔥 FUNCIÓN MEJORADA: Verificar estado de pagos con soporte para parciales
  const checkPaymentStatus = async (invoiceId) => {
    try {
      console.log('🔍 Verificando estado de pagos...', {
        invoiceId: invoiceId || lastInvoiceId,
        partialPaymentsSupported,
        fallbackAvailable: endpointTestResult?.fallbackAvailable
      });
      
      // 🔥 USAR FUNCIÓN UNIFICADA CON FALLBACK AUTOMÁTICO
      const { getInvoicePaymentStatus } = await import('../posAPI');
      const result = await getInvoicePaymentStatus(variables, invoiceId || lastInvoiceId);
      
      console.log('✅ Estado obtenido con endpoint:', result.endpointUsed);
      return result;
      
    } catch (error) {
      console.error('❌ Error verificando estado de pagos:', error);
      return { 
        error: error.message,
        endpointUsed: 'status-check-error'
      };
    }
  };

  // Función existente: Limpiar todos los pagos
  const clearAllPayments = () => {
    console.log('🧹 Limpiando todos los pagos...', {
      paymentsCount: payments.length,
      processedCount: payments.filter(p => p.processed).length,
      partialPaymentsSupported
    });
    
    setPayments([]);
    setSaldo(total);
    setNewPaymentAmount(0);
    setSelectedPaymentMethod('');
    setPaymentResults([]);
    setLastInvoiceId(null);
    setIsProcessingPayment(false);
    
    console.log('✅ Todos los pagos eliminados');
    
    if (isRestaurantMode) {
      console.log('🍽️ Pagos eliminados en modo restaurante');
    }
  };

  // Funciones existentes (sin cambios)
  const getCashBalance = async (variables, terminal) => {
    try {
      const response = await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=getMoneyCashs&terminal=${terminal.rowid}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      const balance = parseFloat(data) || 0;
      setCashBalance(balance);
      return balance;
    } catch (error) {
      console.error('Error al obtener el saldo de efectivo:', error);
      return 0;
    }
  };

  const performCashClosure = async (variables, terminal, userId, closureAmount) => {
    try {
      const data = {
        employeeId: userId,
        moneyincash: parseFloat(closureAmount),
        type: 1,
        cashid: terminal.rowid,
        print: 1,
        entity: terminal.entity
      };

      const response = await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=closeCashs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const responseText = await response.text();
      const result = JSON.parse(responseText);

      if (result.error && result.error.value === 0) {
        const cierre_url = `${variables.SPOS_URL_CIERRE}?terminal=${terminal.rowid}`;
        window.open(cierre_url, '_blank');
        return { success: true };
      } else {
        throw new Error(result.error?.desc || 'Error al realizar el cierre de caja.');
      }
    } catch (error) {
      throw error;
    }
  };

  const resetPayments = () => {
    clearAllPayments();
    
    if (isRestaurantMode) {
      console.log('🍽️ Reset completo en modo restaurante');
    }
  };

  // 🔥 FUNCIÓN MEJORADA: Obtener resumen de pagos con información completa
  const getPaymentSummary = () => {
    // Calcular solo pagos exitosos para el total pagado
    let totalPaidSuccessfully = 0;
    let totalPaidAttempted = 0;
    
    payments.forEach((payment, index) => {
      const paymentResult = paymentResults[index];
      totalPaidAttempted += payment.amount;
      
      // Solo contar como pagado si fue exitoso o si no se ha procesado aún
      if (!paymentResult || paymentResult.success) {
        totalPaidSuccessfully += payment.amount;
      }
    });
    
    const remainingAmount = total - totalPaidSuccessfully;
    const isComplete = remainingAmount <= 0;
    const processedCount = payments.filter((p, i) => {
      const result = paymentResults[i];
      return result && result.success;
    }).length;
    
    return {
      totalAmount: total,
      totalPaid: totalPaidSuccessfully,
      totalAttempted: totalPaidAttempted,
      remainingAmount: remainingAmount,
      isComplete: isComplete,
      paymentCount: payments.length,
      processedCount: processedCount,
      allProcessed: processedCount === payments.length,
      hasFailures: paymentResults.some(r => r && !r.success),
      // 🍽️ INFO ESPECÍFICA PARA RESTAURANTE
      restaurantMode: isRestaurantMode,
      readyForDolibarr: payments.length > 0 && !isProcessingPayment,
      // 🔥 NUEVA INFO PARA PAGOS PARCIALES
      partialPaymentsSupported: partialPaymentsSupported,
      migrationStatus: migrationStatus,
      endpointTestResult: endpointTestResult,
      endpointType: partialPaymentsSupported ? 'custom-partial-payments' : 'dolibarr-standard-fallback',
      // 🔥 INFO ADICIONAL DEL SISTEMA
      systemCapabilities: {
        multiplePayments: partialPaymentsSupported || false,
        paymentDeletion: partialPaymentsSupported || false,
        automaticFallback: endpointTestResult?.fallbackAvailable || false,
        realTimeStatus: partialPaymentsSupported || false
      }
    };
  };

  // 🔥 NUEVA FUNCIÓN: Obtener información de diagnóstico del sistema de pagos
  const getPaymentSystemDiagnostics = () => {
    return {
      // Estado del endpoint personalizado
      customEndpoint: {
        available: partialPaymentsSupported,
        tested: endpointTestResult !== null,
        testResult: endpointTestResult,
        url: migrationStatus?.endpointUrl
      },
      
      // Configuración
      configuration: {
        apiUrl: variables?.SPOS_URL,
        hasApiKey: !!(variables?.DOLIBARR_API_KEY || variables?.dolibarrToken),
        restaurantMode: isRestaurantMode
      },
      
      // Estado actual de pagos
      currentSession: {
        paymentsCount: payments.length,
        processedCount: payments.filter(p => p.processed).length,
        totalAmount: total,
        remainingAmount: total - payments.reduce((sum, p) => sum + p.amount, 0)
      },
      
      // Capacidades del sistema
      capabilities: {
        multiplePartialPayments: partialPaymentsSupported || false,
        individualPaymentDeletion: partialPaymentsSupported || false,
        realTimePaymentStatus: partialPaymentsSupported || false,
        automaticFallback: endpointTestResult?.fallbackAvailable || false,
        bankIntegration: partialPaymentsSupported || false
      },
      
      // Información de migración
      migration: migrationStatus,
      
      // Timestamp
      timestamp: new Date().toISOString()
    };
  };

  return {
    // Estados existentes
    payments,
    setPayments,
    total,
    saldo,
    setSaldo,
    newPaymentAmount,
    setNewPaymentAmount,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    cashBalance,
    setCashBalance,
    closureAmount,
    setClosureAmount,
    
    // Estados para pagos reales
    isProcessingPayment,
    paymentResults,
    lastInvoiceId,
    isRestaurantMode,
    
    // 🔥 NUEVOS ESTADOS PARA PAGOS PARCIALES
    partialPaymentsSupported,
    migrationStatus,
    endpointTestResult,
    
    // Funciones existentes
    handleAddPayment,
    getCashBalance,
    performCashClosure,
    resetPayments,
    
    // Funciones para pagos reales (mejoradas)
    processRealPayments,
    processCompleteInvoiceWithPayments,
    checkPaymentStatus,
    getPaymentSummary,
    
    // Funciones para manejo de pagos (mejoradas)
    removePayment,
    editPayment,
    clearAllPayments,
    
    // 🔥 NUEVAS FUNCIONES PARA PAGOS PARCIALES
    deleteProcessedPayment,
    getPaymentSystemDiagnostics
  };
};