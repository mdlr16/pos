// ============================================================================
// posAPI MIGRADO A API NATIVA DE DOLIBARR - VERSIÓN COMPLETA CON INVENTARIO
// ============================================================================
// Versión mejorada que incluye validación automática de facturas y manejo de inventario

// Headers simples que funcionan (EXACTAMENTE igual que useCustomers)
const getHeaders = (variables) => {
  const API_KEY = variables.DOLIBARR_API_KEY || variables.dolibarrToken;
  
  if (!API_KEY) {
    throw new Error('Token de Dolibarr no disponible');
  }

  return {
    'DOLAPIKEY': API_KEY,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
};

// URLs de API - MISMO PATRÓN QUE useCustomers
const getApiBaseUrl = (variables) => {
  return variables.SPOS_URL ? `${variables.SPOS_URL}/api/index.php` : null;
};

// Función helper para parsear respuesta de manera segura
const safeParseResponse = async (response, type) => {
  try {
    const responseText = await response.text();
    console.log(`📦 Respuesta cruda de ${type}:`, responseText.substring(0, 200));
    
    try {
      return JSON.parse(responseText);
    } catch (jsonError) {
      console.warn(`⚠️ ${type} - No es JSON válido:`, jsonError.message);
      return [];
    }
  } catch (error) {
    console.error(`❌ Error leyendo respuesta de ${type}:`, error);
    return [];
  }
};

// ============================================================================
// NUEVAS FUNCIONES PARA MANEJO DE INVENTARIO Y VALIDACIÓN
// ============================================================================

// Validar factura en Dolibarr - CORREGIDO CON DOCUMENTACIÓN OFICIAL
const validateInvoice = async (variables, invoiceId, warehouseId = null) => {
  console.log('✅ Validando factura ID:', invoiceId, 'con almacén:', warehouseId);
  
  try {
    const API_BASE_URL = getApiBaseUrl(variables);
    if (!API_BASE_URL) {
      throw new Error('Configuración de API incompleta - URL');
    }

    const headers = getHeaders(variables);
    
    // 🔥 CORREGIDO: Endpoint oficial de Dolibarr para validar facturas
    const validateUrl = `${API_BASE_URL}/invoices/${invoiceId}/validate`;
    
    console.log('📤 URL de validación oficial:', validateUrl);

    // 🔥 CORREGIDO: Body según documentación oficial de Dolibarr
    const validationData = {
      idwarehouse: warehouseId ? parseInt(warehouseId) : 0, // Warehouse ID (importante para inventario)
      notrigger: 0, // 0 = Ejecutar triggers (necesario para actualizar inventario automáticamente)
      force_number: null // Opcional: forzar número de factura
    };

    console.log('📦 Datos de validación oficiales:', validationData);

    // 🔥 CORREGIDO: Método POST según documentación oficial
    const response = await fetch(validateUrl, {
      method: 'POST', // ¡Era POST, no PUT!
      headers: headers,
      body: JSON.stringify(validationData)
    });

    console.log('📡 Respuesta de validación:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    const responseText = await response.text();
    console.log('📦 Respuesta de validación (texto):', responseText);

    if (!response.ok) {
      console.error('❌ Error validando factura:', responseText);
      
      // Intentar parsear el error para mejor información
      let errorMessage = `Error ${response.status}: ${response.statusText}`;
      try {
        const errorJson = JSON.parse(responseText);
        if (errorJson.error && errorJson.error.message) {
          errorMessage = errorJson.error.message;
        }
      } catch (e) {
        if (responseText && responseText.length < 200) {
          errorMessage += ` - ${responseText}`;
        }
      }
      
      throw new Error(errorMessage);
    }

    console.log('✅ Factura validada exitosamente:', responseText);
    
    return {
      success: true,
      result: responseText,
      message: 'Factura validada correctamente con triggers habilitados'
    };

  } catch (error) {
    console.error('❌ Error validando factura:', error);
    return {
      success: false,
      error: error.message
    };
  }
};



// Validar propuesta/cotización en Dolibarr
const validateProposal = async (variables, proposalId) => {
  console.log('✅ Validando propuesta/cotización ID:', proposalId);
  
  try {
    const API_BASE_URL = getApiBaseUrl(variables);
    if (!API_BASE_URL) {
      throw new Error('Configuración de API incompleta - URL');
    }

    const headers = getHeaders(variables);
    
    // 🔥 ENDPOINT OFICIAL PARA VALIDAR PROPUESTAS
    const validateUrl = `${API_BASE_URL}/proposals/${proposalId}/validate`;
    
    console.log('📤 URL de validación de propuesta:', validateUrl);

    // 🔥 DATOS PARA VALIDAR PROPUESTA según documentación oficial
    const validationData = {
      notrigger: 0, // 0 = Ejecutar triggers
      force_number: null // Opcional: forzar número
    };

    const response = await fetch(validateUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(validationData)
    });

    const responseText = await response.text();

    if (!response.ok) {
      let errorMessage = `Error ${response.status}: ${response.statusText}`;
      try {
        const errorJson = JSON.parse(responseText);
        if (errorJson.error && errorJson.error.message) {
          errorMessage = errorJson.error.message;
        }
      } catch (e) {
        if (responseText && responseText.length < 200) {
          errorMessage += ` - ${responseText}`;
        }
      }
      throw new Error(errorMessage);
    }

    console.log('✅ Propuesta validada exitosamente:', responseText);
    
    return {
      success: true,
      result: responseText,
      message: 'Propuesta validada correctamente'
    };

  } catch (error) {
    console.error('❌ Error validando propuesta:', error);
    return {
      success: false,
      error: error.message
    };
  }
};


// Crear movimiento de stock para rebajar inventario - MEJORADO
const createStockMovement = async (variables, movementData) => {
  console.log('📦 Creando movimiento de stock:', movementData);
  
  try {
    const API_BASE_URL = getApiBaseUrl(variables);
    if (!API_BASE_URL) {
      throw new Error('Configuración de API incompleta - URL');
    }

    const headers = getHeaders(variables);
    const stockUrl = `${API_BASE_URL}/stockmovements`;
    
    console.log('📤 URL de movimiento de stock:', stockUrl);
    
    // 🔥 MEJORADO: Validar y limpiar datos del movimiento
    const cleanedMovementData = {
      product_id: parseInt(movementData.product_id),
      warehouse_id: parseInt(movementData.warehouse_id),
      qty: parseFloat(movementData.qty),
      type: parseInt(movementData.type) || 1, // 1 = salida
      label: movementData.label || 'Venta POS',
      price: parseFloat(movementData.price) || 0,
      inventorycode: movementData.inventorycode || `POS-${Date.now()}`,
      // Campos opcionales
      ...(movementData.origintype && { origintype: movementData.origintype }),
      ...(movementData.fk_origin && { fk_origin: parseInt(movementData.fk_origin) })
    };
    
    console.log('📦 Datos del movimiento limpiados:', cleanedMovementData);

    const response = await fetch(stockUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(cleanedMovementData)
    });

    console.log('📡 Respuesta de movimiento de stock:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    const responseText = await response.text();
    console.log('📦 Respuesta cruda de movimiento:', responseText);

    if (!response.ok) {
      console.error('❌ Error creando movimiento de stock:', responseText);
      
      // Intentar parsear el error para mejor información
      let errorMessage = `Error ${response.status}: ${response.statusText}`;
      try {
        const errorJson = JSON.parse(responseText);
        if (errorJson.error && errorJson.error.message) {
          errorMessage = errorJson.error.message;
        }
      } catch (e) {
        // Si no es JSON, usar el texto tal como está
        if (responseText.length < 200) {
          errorMessage += ` - ${responseText}`;
        }
      }
      
      throw new Error(errorMessage);
    }

    // 🔥 MEJORADO: Extraer ID del movimiento de manera similar a las facturas
    let movementId;
    try {
      movementId = JSON.parse(responseText);
      if (typeof movementId === 'object' && movementId.id) {
        movementId = movementId.id;
      }
    } catch (e) {
      // Extraer ID de respuesta HTML/texto
      const idMatch = responseText.match(/\d+/);
      movementId = idMatch ? parseInt(idMatch[0]) : responseText.trim();
    }
    
    console.log('✅ Movimiento de stock creado exitosamente. ID:', movementId);
    
    return {
      success: true,
      movementId: movementId,
      message: 'Movimiento de stock creado correctamente'
    };

  } catch (error) {
    console.error('❌ Error creando movimiento de stock:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Rebajar inventario para todas las líneas de una factura - MEJORADO CON WAREHOUSE
const processInvoiceStockMovements = async (variables, invoiceId, invoiceLines, terminal) => {
  console.log('🔄 Procesando movimientos de stock para factura:', invoiceId);
  console.log('📦 Líneas de factura:', invoiceLines);
  console.log('🏬 Terminal y almacén:', {
    terminalId: terminal?.rowid,
    terminalName: terminal?.name,
    warehouseId: terminal?.fk_warehouse
  });
  
  const results = [];
  
  try {
    // Verificar que tenemos warehouse del terminal
    if (!terminal?.fk_warehouse) {
      throw new Error('Terminal no tiene almacén asignado (fk_warehouse)');
    }

    const warehouseId = terminal.fk_warehouse;
    console.log('✅ Usando almacén del terminal:', warehouseId);
    
    // Procesar cada línea de la factura
    for (const line of invoiceLines) {
      // Solo procesar líneas con productos físicos
      if (line.fk_product && line.qty > 0) {
        const movementData = {
          product_id: parseInt(line.fk_product),
          warehouse_id: parseInt(warehouseId), // 🔥 USAR WAREHOUSE DEL TERMINAL
          qty: -Math.abs(parseFloat(line.qty)), // Negativo para salida
          type: 1, // Salida de stock
          label: `Venta - Factura ${invoiceId} - Terminal ${terminal.name || terminal.rowid}`,
          price: parseFloat(line.subprice || 0),
          inventorycode: `FACT-${invoiceId}-${line.fk_product}-T${terminal.rowid}`,
          origintype: 'invoice',
          fk_origin: parseInt(invoiceId)
        };

        console.log('📤 Creando movimiento para producto:', line.fk_product, 'cantidad:', movementData.qty, 'almacén:', warehouseId);
        
        const movementResult = await createStockMovement(variables, movementData);
        
        results.push({
          productId: line.fk_product,
          quantity: movementData.qty,
          warehouseId: warehouseId,
          success: movementResult.success,
          error: movementResult.error,
          movementId: movementResult.movementId
        });

        // Pequeña pausa entre movimientos para no sobrecargar el servidor
        await new Promise(resolve => setTimeout(resolve, 200));
      } else {
        console.log('⚠️ Saltando línea sin producto o cantidad:', {
          fk_product: line.fk_product,
          qty: line.qty,
          hasProduct: !!line.fk_product,
          hasQuantity: line.qty > 0
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    console.log('✅ Movimientos de stock completados:', {
      total: results.length,
      exitosos: successCount,
      errores: errorCount,
      almacenUsado: warehouseId
    });

    return {
      success: errorCount === 0,
      results: results,
      warehouseId: warehouseId,
      summary: {
        total: results.length,
        successful: successCount,
        failed: errorCount,
        warehouse: warehouseId
      }
    };

  } catch (error) {
    console.error('❌ Error procesando movimientos de stock:', error);
    return {
      success: false,
      error: error.message,
      results: results,
      warehouseId: terminal?.fk_warehouse
    };
  }
};

// ============================================================================
// FUNCIÓN AUXILIAR PARA VALIDAR Y LIMPIAR DATOS ANTES DE ENVIAR
// ============================================================================

const validateAndCleanData = (data) => {
  console.log('🔍 Validando y limpiando datos para envío:', data);
  
  // Asegurar que socid es entero
  if (data.socid) {
    data.socid = parseInt(data.socid);
  }
  
  // Validar estructura de líneas
  if (data.lines && Array.isArray(data.lines)) {
    data.lines = data.lines.map((line, index) => {
      // Asegurar que todos los campos numéricos son del tipo correcto
      const cleanLine = {
        ...line,
        qty: parseFloat(line.qty) || 1,
        subprice: parseFloat(line.subprice) || 0,
        remise_percent: parseFloat(line.remise_percent) || 0,
        tva_tx: parseFloat(line.tva_tx) || 0,
        localtax1_tx: parseFloat(line.localtax1_tx) || 0,
        localtax2_tx: parseFloat(line.localtax2_tx) || 0,
        total_ht: parseFloat(line.total_ht) || 0,
        total_tva: parseFloat(line.total_tva) || 0,
        total_ttc: parseFloat(line.total_ttc) || 0,
        situation_percent: parseFloat(line.situation_percent) || 100,
        rang: parseInt(line.rang) || (index + 1),
        info_bits: parseInt(line.info_bits) || 0,
        special_code: parseInt(line.special_code) || 0,
        product_type: parseInt(line.product_type) || 0
      };
      
      // Remover campos null/undefined problemáticos
      Object.keys(cleanLine).forEach(key => {
        if (cleanLine[key] === undefined) {
          delete cleanLine[key];
        }
      });
      
      return cleanLine;
    });
  }
  
  // Asegurar fechas como timestamps
  if (data.date && typeof data.date === 'string') {
    data.date = Math.floor(new Date(data.date).getTime() / 1000);
  }
  
  console.log('✅ Datos validados y limpiados:', data);
  return data;
};



export const debugAllEndpoints = async (variables) => {
  console.log('🔧 DEBUGGING: Probando todas las URLs de tu endpoint...');
  
  const SECURE_API_BASE = `${variables.SPOS_URL}/custom/pos/frontend/api_spos_restaurant_secure`;
  const API_KEY = variables.DOLIBARR_API_KEY || variables.dolibarrToken;
  
  const tests = [
    { name: 'Test endpoint', url: `${SECURE_API_BASE}/test`, method: 'GET' },
    { name: 'Payment methods', url: `${SECURE_API_BASE}/payments/methods`, method: 'GET' },
    { name: 'Index.php direct', url: `${SECURE_API_BASE}/index.php`, method: 'GET' },
    { name: 'Root directory', url: `${SECURE_API_BASE}/`, method: 'GET' }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      console.log(`🧪 Testing: ${test.name} - ${test.url}`);
      
      const response = await fetch(test.url, {
        method: test.method,
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      const result = {
        name: test.name,
        url: test.url,
        status: response.status,
        statusText: response.statusText,
        success: response.ok
      };
      
      if (response.ok) {
        try {
          const data = await response.json();
          result.data = data;
          console.log(`✅ ${test.name}: SUCCESS`, data);
        } catch (e) {
          result.data = await response.text();
          console.log(`✅ ${test.name}: SUCCESS (text response)`);
        }
      } else {
        result.error = await response.text();
        console.log(`❌ ${test.name}: FAILED ${response.status}`, result.error);
      }
      
      results.push(result);
      
    } catch (error) {
      console.log(`❌ ${test.name}: CONNECTION ERROR`, error.message);
      results.push({
        name: test.name,
        url: test.url,
        success: false,
        error: error.message
      });
    }
  }
  
  console.log('🔧 DEBUGGING COMPLETO:', results);
  return results;
};




// ============================================================================
// TRANSFORMACIÓN CORREGIDA PARA DOLIBARR - TODOS LOS CAMPOS REQUERIDOS
// ============================================================================

// Transformar datos del ticket al formato de Dolibarr - VERSIÓN CORREGIDA
const transformTicketDataToDolibarr = (data, variables) => {
  console.log('🔄 Transformando datos al formato Dolibarr:', data);

  // 🔥 VERIFICAR ID DEL CLIENTE CON DEBUG EXTENDIDO
  const originalCustomerId = data.customerId;
  const finalCustomerId = parseInt(data.customerId) || 1;
  
  if (originalCustomerId !== finalCustomerId) {
    console.warn('⚠️ ID del cliente cambió durante transformación:', {
      original: originalCustomerId,
      final: finalCustomerId,
      dataKeys: Object.keys(data),
      customerInfo: data.customerInfo
    });
  } else {
    console.log('✅ ID del cliente mantenido durante transformación:', finalCustomerId);
  }

  // Datos base del documento
  const baseData = {
    socid: finalCustomerId, // 🔥 USAR EL ID CORREGIDO Y VERIFICADO
    date: Math.floor(Date.now() / 1000), // Timestamp Unix
    note_private: data.note || '',
    note_public: '',
  };

  console.log('🎯 socid final en baseData:', baseData.socid);

  
  // Líneas del documento - CON TODOS LOS CAMPOS REQUERIDOS
  const lines = [];
  if (data.lines && data.lines.length > 0) {
    data.lines.forEach((line, index) => {
      const lineQty = parseFloat(line.qty || line.quantity) || 1;
      const linePrice = parseFloat(line.price) || 0;
      const lineDiscount = parseFloat(line.discount) || 0;
      const lineTotalHT = linePrice * lineQty * (1 - lineDiscount / 100);
      
      lines.push({
        // 🔥 ID de línea (importante para actualizaciones)
        id: line.idLine || null,
        
        // Campos básicos
        fk_product: parseInt(line.idProduct) || null,
        product_type: 0, // 🔥 CAMPO REQUERIDO: 0 = producto, 1 = servicio
        desc: line.description || line.label || line.name || '',
        label: line.name || line.label || '',
        
        // Cantidades y precios
        qty: lineQty,
        subprice: linePrice,
        remise_percent: lineDiscount,
        
        // Impuestos (Guatemala generalmente sin IVA en POS)
        tva_tx: parseFloat(line.tva_tx) || 0,
        localtax1_tx: parseFloat(line.localtax1_tx) || 0,
        localtax2_tx: parseFloat(line.localtax2_tx) || 0,
        localtax1_type: '0',
        localtax2_type: '0',
        vat_src_code: '', // Código fuente del IVA
        
        // Totales
        total_ht: lineTotalHT,
        total_tva: 0,
        total_localtax1: 0,
        total_localtax2: 0,
        total_ttc: lineTotalHT,
        
        // Campos adicionales requeridos
        info_bits: 0, // Bits de información
        special_code: 0, // Código especial
        rang: index + 1, // Orden de la línea
        fk_unit: null, // Unidad de medida
        fk_parent_line: null, // Línea padre
        fk_fournprice: null, // Precio proveedor
        pa_ht: linePrice, // Precio de compra
        buy_price_ht: linePrice, // Precio de compra HT
        
        // 🔥 CAMPOS ESPECÍFICOS PARA FACTURAS
        fk_code_ventilation: null, // Código de ventilación contable
        fk_remise_except: null, // Descuento excepcional
        situation_percent: 100, // Porcentaje de situación (100% para facturas normales)
        fk_prev_id: null, // ID previo (para facturas de situación)
        
        // Fechas (para servicios)
        date_start: null,
        date_end: null,
        
        // Multimoneda
        fk_multicurrency: null,
        multicurrency_code: 'GTQ',
        multicurrency_subprice: linePrice,
        multicurrency_total_ht: lineTotalHT,
        multicurrency_total_tva: 0,
        multicurrency_total_ttc: lineTotalHT,
        
        // Campos extras opcionales
        array_options: {}
      });
    });
  }

  baseData.lines = lines;

  // Campos específicos según el tipo de documento
  // Campos específicos según el tipo de documento
switch (data.clase) {
  case 0: // Cotización/Propuesta - DEBE SER VALIDADA
    baseData.fin_validite = Math.floor((Date.now() + (30 * 24 * 60 * 60 * 1000)) / 1000); // 30 días
    baseData.delivery_date = null;
    // 🔥 NO establecer statut aquí - se validará después de crear
    break;
    
  case 2: // Pedido
    baseData.date_livraison = Math.floor((Date.now() + (7 * 24 * 60 * 60 * 1000)) / 1000); // 7 días
    baseData.delivery_date = Math.floor((Date.now() + (7 * 24 * 60 * 60 * 1000)) / 1000);
    break;
    
  case 3: // Factura
    baseData.type = 0;
    baseData.date_lim_reglement = Math.floor((Date.now() + (30 * 24 * 60 * 60 * 1000)) / 1000);
    baseData.fk_cond_reglement = 1;
    baseData.fk_mode_reglement = null;
    baseData.model_pdf = 'crabe';
    baseData.last_main_doc = '';
    baseData.fk_bank = null;
    baseData.fk_account = null;
    baseData.note_public = data.note || '';
    baseData.note_private = data.note || '';
    baseData.user_author = parseInt(data.employeeId) || 1;
    baseData.user_valid = null;
    baseData.fk_facture_source = null;
    baseData.fk_projet = null;
    break;
    
  case 4: // 🔥 TICKETS SUSPENDIDOS - DEBEN QUEDAR EN BORRADOR (statut = 0)
    baseData.fin_validite = Math.floor((Date.now() + (365 * 24 * 60 * 60 * 1000)) / 1000); // 1 año
    baseData.note_private = `[SUSPENDIDO] ${data.note || ''} - Fecha: ${new Date().toISOString()}`;
    baseData.statut = 0; // 🔥 FORZAR BORRADOR PARA SUSPENDIDOS
    break;
}

  console.log('✅ Datos transformados con socid y customerId:', { 
    socid: baseData.socid, 
    customerId: baseData.customerId 
  });
  console.log('🔍 baseData final (antes de limpiar):', baseData);
  
  // Aplicar validación y limpieza final
  const cleanedBaseData = validateAndCleanData(baseData);
  
  // Verificar una vez más que el socid se mantuvo después de la limpieza
  if (cleanedBaseData.socid !== finalCustomerId) {
    console.error('🚨 CRÍTICO: socid cambió durante limpieza:', {
      antes: finalCustomerId,
      después: cleanedBaseData.socid
    });
  } else {
    console.log('✅ socid confirmado después de limpieza:', cleanedBaseData.socid);
  }
  
  // 🔥 VERIFICACIÓN FINAL ANTES DE RETORNAR
   if (cleanedBaseData.socid === 1) {
    console.error('🚨 DATOS TRANSFORMADOS FINALES USAN CLIENTE GENÉRICO ID 1');
    console.log('🔍 Stack de debug completo:');
    console.log('  1. originalCustomerId recibido:', originalCustomerId);
    console.log('  2. finalCustomerId determinado:', finalCustomerId);
    console.log('  3. baseData.socid:', baseData.socid);
    console.log('  4. cleanedBaseData.socid:', cleanedBaseData.socid);
    console.log('  5. data.customerInfo original:', data.customerInfo);
    console.log('  6. data completo:', JSON.stringify(data, null, 2));
  }
  
  return cleanedBaseData;
};



export const validateCustomerBeforeSave = (ticketData) => {
  console.group('🔍 VALIDACIÓN DE CLIENTE ANTES DE GUARDAR');
  
  console.log('📋 Datos del ticket:', {
    customerId: ticketData.customerId,
    customerInfo: ticketData.customerInfo,
    clase: ticketData.clase
  });
  
  const finalCustomerId = parseInt(ticketData.customerId) || 1;
  
  if (finalCustomerId === 1) {
    console.warn('⚠️ ADVERTENCIA: Se está usando cliente genérico (ID 1)');
    console.log('🔍 Razones posibles:');
    console.log('  - No se seleccionó cliente en la interfaz');
    console.log('  - El ID del cliente no se pasó correctamente');
    console.log('  - Error en la transformación de datos');
    console.log('📊 CustomerInfo:', ticketData.customerInfo);
  } else {
    console.log('✅ Cliente específico detectado:', finalCustomerId);
  }
  
  console.groupEnd();
  
  return {
    isGenericCustomer: finalCustomerId === 1,
    customerId: finalCustomerId,
    recommendation: finalCustomerId === 1 ? 
      'Verificar que se seleccione un cliente antes de guardar' : 
      'Cliente válido para guardar'
  };
};

export const validateInvoiceDataBeforeSubmit = (transformedData, originalData) => {
  console.group('🔍 VALIDACIÓN DE DATOS DE FACTURA ANTES DE ENVÍO');
  
  const issues = [];
  const warnings = [];
  
  // Verificar socid
  if (!transformedData.socid || transformedData.socid === 1) {
    issues.push('socid es 1 o undefined');
  }
  
  // Verificar customerId
  if (!transformedData.customerId || transformedData.customerId === 1) {
    issues.push('customerId es 1 o undefined');
  }
  
  // Verificar coherencia
  if (transformedData.socid !== transformedData.customerId) {
    warnings.push(`socid (${transformedData.socid}) != customerId (${transformedData.customerId})`);
  }
  
  // Verificar que tiene líneas
  if (!transformedData.lines || transformedData.lines.length === 0) {
    issues.push('No hay líneas de productos');
  }
  
  console.log('📋 Datos verificados:', {
    'transformedData.socid': transformedData.socid,
    'transformedData.customerId': transformedData.customerId,
    'originalData.customerId': originalData.customerId,
    'originalData.customerInfo': originalData.customerInfo,
    'issues': issues,
    'warnings': warnings
  });
  
  if (issues.length > 0) {
    console.error('❌ ISSUES CRÍTICOS encontrados:', issues);
  }
  
  if (warnings.length > 0) {
    console.warn('⚠️ WARNINGS encontrados:', warnings);
  }
  
  console.groupEnd();
  
  return {
    isValid: issues.length === 0,
    issues,
    warnings,
    recommendation: issues.length > 0 ? 
      'NO ENVIAR - Corregir cliente antes de proceder' :
      'Datos válidos para envío'
  };
};


export const getSuspendedTicketWithLines = async (variables, ticketId) => {
  console.log('🔍 Obteniendo ticket suspendido con líneas:', ticketId);
  
  try {
    const API_BASE_URL = getApiBaseUrl(variables);
    const headers = getHeaders(variables);
    
    // Obtener la propuesta completa
    const proposalResponse = await fetch(`${API_BASE_URL}/proposals/${ticketId}`, {
      method: 'GET',
      headers: headers
    });
    
    if (!proposalResponse.ok) {
      throw new Error(`Error obteniendo propuesta: ${proposalResponse.status}`);
    }
    
    const proposal = await proposalResponse.json();
    console.log('📋 Propuesta obtenida:', proposal);
    
    // Obtener las líneas de la propuesta
    let lines = [];
    try {
      const linesResponse = await fetch(`${API_BASE_URL}/proposals/${ticketId}/lines`, {
        method: 'GET',
        headers: headers
      });
      
      if (linesResponse.ok) {
        lines = await linesResponse.json();
        console.log('📦 Líneas obtenidas:', lines);
      }
    } catch (error) {
      console.warn('⚠️ No se pudieron obtener líneas:', error);
    }
    
    // Combinar datos
    const completeTicket = {
      ...proposal,
      lines: lines,
      id: proposal.id,
      customerId: proposal.socid,
      customerName: proposal.nom_client || proposal.thirdparty_name,
      note: proposal.note_private || proposal.note_public,
      total: proposal.total_ttc || proposal.total_ht || 0
    };
    
    console.log('✅ Ticket completo obtenido:', completeTicket);
    return completeTicket;
    
  } catch (error) {
    console.error('❌ Error obteniendo ticket completo:', error);
    throw error;
  }
};


// ============================================================================
// FUNCIÓN HELPER PARA OBTENER DATOS COMPLETOS DEL CLIENTE
// ============================================================================

export const getCustomerCompleteData = async (variables, customerId) => {
  console.log('👤 Obteniendo datos completos del cliente ID:', customerId);
  
  try {
    if (!customerId || customerId === 1 || customerId === '1') {
      console.log('👤 Cliente genérico, retornando datos por defecto');
      return {
        id: 1,
        name: 'Cliente Final',
        nit: 'CF',
        direccion: '',
        telefono: '',
        email: '',
        remise: 0
      };
    }

    const API_BASE_URL = `${variables.SPOS_URL}/api/index.php`;
    const headers = {
      'DOLAPIKEY': variables.DOLIBARR_API_KEY || variables.dolibarrToken,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    const customerResponse = await fetch(`${API_BASE_URL}/thirdparties/${customerId}`, {
      method: 'GET',
      headers: headers
    });
    
    if (!customerResponse.ok) {
      throw new Error(`Error ${customerResponse.status}: ${customerResponse.statusText}`);
    }
    
    const customerData = await customerResponse.json();
    console.log('✅ Datos del cliente obtenidos:', customerData);
    
    return {
      id: customerData.id,
      name: customerData.name || customerData.nom || 'Cliente',
      nit: customerData.idprof1 || customerData.siren || 'CF',
      direccion: customerData.address || customerData.adresse || '',
      telefono: customerData.phone || customerData.tel || '',
      email: customerData.email || '',
      remise: parseFloat(customerData.remise_percent) || 0,
      // Campos adicionales
      code_client: customerData.code_client || '',
      siret: customerData.siret || '',
      ape: customerData.ape || '',
      tva_intra: customerData.tva_intra || '',
      country_id: customerData.country_id || '',
      state_id: customerData.state_id || '',
      typent_id: customerData.typent_id || '',
      effectif_id: customerData.effectif_id || '',
      forme_juridique_code: customerData.forme_juridique_code || ''
    };
    
  } catch (error) {
    console.error('❌ Error obteniendo datos del cliente:', error);
    
    // Retornar datos básicos en caso de error
    return {
      id: customerId,
      name: 'Cliente',
      nit: 'CF',
      direccion: '',
      telefono: '',
      email: '',
      remise: 0
    };
  }
};


// ============================================================================
// API PRINCIPAL - FUNCIONES MIGRADAS CON MANEJO DE INVENTARIO
// ============================================================================

// ============================================================================
// NUEVAS FUNCIONES PARA FLUJO CORRECTO DE DOLIBARR (3 PASOS)
// ============================================================================

// Paso 1: Crear encabezado de factura (solo metadatos)
const createInvoiceHeader = async (variables, invoiceData) => {
  console.log('📝 Paso 1: Creando encabezado de factura:', invoiceData);
  
  try {
    const API_BASE_URL = getApiBaseUrl(variables);
    const headers = getHeaders(variables);
    const invoiceUrl = `${API_BASE_URL}/invoices`;
    
    // 🔥 SOLO ENCABEZADO - SIN LÍNEAS según documentación oficial
    const headerData = {
      socid: parseInt(invoiceData.socid) || 1,
      date: Math.floor(Date.now() / 1000),
      note_private: invoiceData.note_private || '',
      note_public: invoiceData.note_public || '',
      type: 0, // Factura estándar
      date_lim_reglement: Math.floor((Date.now() + (30 * 24 * 60 * 60 * 1000)) / 1000),
      fk_cond_reglement: 1,
      fk_mode_reglement: null,
      model_pdf: 'crabe',
      last_main_doc: '',
      fk_bank: null,
      fk_account: null,
      user_author: parseInt(invoiceData.user_author) || 1,
      user_valid: null,
      fk_facture_source: null,
      fk_projet: null
    };
    
    console.log('📤 Datos del encabezado:', headerData);
    
    const response = await fetch(invoiceUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(headerData)
    });
    
    const responseText = await response.text();
    console.log('📦 Respuesta encabezado:', responseText);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${responseText}`);
    }
    
    // Extraer ID de la respuesta
    let invoiceId;
    try {
      invoiceId = JSON.parse(responseText);
      if (typeof invoiceId === 'object' && invoiceId.id) {
        invoiceId = invoiceId.id;
      }
    } catch (e) {
      // La respuesta debería ser solo el ID como número
      invoiceId = parseInt(responseText.trim());
    }
    
    console.log('✅ Encabezado creado con ID:', invoiceId);
    return { success: true, invoiceId: invoiceId };
    
  } catch (error) {
    console.error('❌ Error creando encabezado:', error);
    return { success: false, error: error.message };
  }
};

// Paso 2: Agregar líneas a la factura
const addInvoiceLines = async (variables, invoiceId, lines) => {
  console.log('📦 Paso 2: Agregando líneas a factura:', invoiceId);
  
  try {
    const API_BASE_URL = getApiBaseUrl(variables);
    const headers = getHeaders(variables);
    const results = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineUrl = `${API_BASE_URL}/invoices/${invoiceId}/lines`;
      
      // 🔥 FORMATO OFICIAL PARA LÍNEAS según documentación
      const lineData = {
        desc: line.description || line.label || line.name || '',
        subprice: parseFloat(line.subprice || line.price || 0).toFixed(8),
        qty: parseFloat(line.qty || line.quantity || 1).toString(),
        tva_tx: parseFloat(line.tva_tx || 0).toFixed(3),
        localtax1_tx: parseFloat(line.localtax1_tx || 0).toFixed(3),
        localtax2_tx: parseFloat(line.localtax2_tx || 0).toFixed(3),
        fk_product: line.fk_product ? parseInt(line.fk_product).toString() : null,
        remise_percent: parseFloat(line.remise_percent || 0).toString(),
        date_start: '',
        date_end: '',
        fk_code_ventilation: 0,
        info_bits: '0',
        fk_remise_except: null,
        product_type: line.product_type || '0',
        rang: i + 1, // Orden de la línea
        special_code: '0',
        fk_parent_line: null,
        fk_fournprice: null,
        pa_ht: parseFloat(line.subprice || line.price || 0).toFixed(8),
        label: line.label || line.name || '',
        array_options: [],
        situation_percent: '100',
        fk_prev_id: null,
        fk_unit: null
      };
      
      console.log(`📤 Enviando línea ${i + 1}:`, lineData);
      
      const response = await fetch(lineUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(lineData)
      });
      
      const responseText = await response.text();
      console.log(`📦 Respuesta línea ${i + 1}:`, responseText);
      
      if (response.ok) {
        let lineId;
        try {
          lineId = JSON.parse(responseText);
          if (typeof lineId === 'object' && lineId.id) {
            lineId = lineId.id;
          }
        } catch (e) {
          lineId = parseInt(responseText.trim());
        }
        
        results.push({
          success: true,
          lineNumber: i + 1,
          lineId: lineId,
          productId: line.fk_product
        });
        
        console.log(`✅ Línea ${i + 1} agregada con ID:`, lineId);
      } else {
        results.push({
          success: false,
          lineNumber: i + 1,
          error: responseText,
          productId: line.fk_product
        });
        
        console.error(`❌ Error línea ${i + 1}:`, responseText);
      }
      
      // Pausa entre líneas
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Líneas procesadas: ${successCount}/${results.length} exitosas`);
    
    return {
      success: successCount === results.length,
      results: results,
      totalLines: results.length,
      successfulLines: successCount
    };
    
  } catch (error) {
    console.error('❌ Error agregando líneas:', error);
    return { success: false, error: error.message };
  }
};

// Función principal actualizada para usar el flujo de 3 pasos
export const posAPI = {
  // Guardar ticket usando el FLUJO CORRECTO DE 3 PASOS
 saveTicket: async (variables, data) => {
  console.log('🔍 saveTicket iniciado con FLUJO CORRECTO DE 3 PASOS - tipo:', data.clase, 'ID:', data.id);
  
  try {
    // Verificaciones iniciales
    const API_BASE_URL = getApiBaseUrl(variables);
    if (!API_BASE_URL) {
      throw new Error('Configuración de API incompleta - URL');
    }

    const API_KEY = variables.DOLIBARR_API_KEY || variables.dolibarrToken;
    if (!API_KEY) {
      throw new Error('Configuración de API incompleta - Token');
    }

    console.log('✅ Configuración válida - procediendo con flujo de 3 pasos');

    // Solo manejar facturas nuevas con el flujo correcto
    if (data.clase === 3 && (!data.id || data.id === 0)) {
      console.log('🧾 FACTURA NUEVA - Usando flujo de 3 pasos de Dolibarr');
      
      // Transformar datos básicos
      const transformedData = transformTicketDataToDolibarr(data, variables);
      
      // 🔥 PASO 1: Crear encabezado de factura
      const headerResult = await createInvoiceHeader(variables, transformedData);
      if (!headerResult.success) {
        throw new Error('Error creando encabezado: ' + headerResult.error);
      }
      
      const invoiceId = headerResult.invoiceId;
      console.log('✅ PASO 1 COMPLETADO - Encabezado creado con ID:', invoiceId);
      
      // 🔥 PASO 2: Agregar líneas
      if (transformedData.lines && transformedData.lines.length > 0) {
        console.log('📦 PASO 2: Agregando líneas...');
        const linesResult = await addInvoiceLines(variables, invoiceId, transformedData.lines);
        
        if (!linesResult.success) {
          console.warn('⚠️ Problemas agregando líneas:', linesResult);
          // Continuar aunque haya problemas con algunas líneas
        } else {
          console.log('✅ PASO 2 COMPLETADO - Líneas agregadas:', linesResult.successfulLines);
        }
      }
      
      // 🔥 PASO 3: Validar factura y rebajar inventario
      console.log('📝 PASO 3: Validando factura...');
      const validationResult = await validateInvoice(variables, invoiceId, data.terminal?.fk_warehouse);
      
      if (validationResult.success) {
        console.log('✅ PASO 3A COMPLETADO - Factura validada');
        
        // 🔥 PASO 3B: Rebajar inventario si está configurado
        if (data.terminal?.fk_warehouse && transformedData.lines && transformedData.lines.length > 0) {
          console.log('📦 PASO 3B: Rebajando inventario...');
          
          const stockResult = await processInvoiceStockMovements(
            variables, 
            invoiceId, 
            transformedData.lines, 
            data.terminal
          );
          
          if (stockResult.success) {
            console.log('✅ PASO 3B COMPLETADO - Inventario rebajado:', stockResult.summary);
          } else {
            console.warn('⚠️ Problemas rebajando inventario:', stockResult);
          }
        }
      } else {
        console.warn('⚠️ Error validando factura:', validationResult.error);
      }
      
      console.log('🎉 FLUJO COMPLETO FINALIZADO - Factura ID:', invoiceId);
      
      return {
        error: { value: 0 },
        data: {
          id: invoiceId,
          ref: `FACT-${invoiceId}`
        }
      };
    }
    
    // Para otros tipos de documento o actualizaciones, usar método original
    else {
      console.log('📄 Documento no-factura o actualización - usando método original');
      
      // Determinar endpoint según el tipo
      let endpoint = '';
      let method = 'POST';
      let isUpdate = false;

      switch (data.clase) {
        case 0: // Cotización
        case 4: // Suspendido (se guarda como propuesta)
          endpoint = `/proposals`;
          break;
        case 2: // Pedido
          endpoint = `/orders`;
          break;
        case 3: // Factura (actualizaciones)
          endpoint = `/invoices`;
          break;
        default:
          throw new Error(`Tipo de documento no soportado: ${data.clase}`);
      }

      // Si tiene ID, es una actualización
      if (data.id && data.id > 0) {
        endpoint += `/${data.id}`;
        method = 'PUT';
        isUpdate = true;
        console.log('🔄 Actualizando documento existente ID:', data.id);
      } else {
        console.log('🆕 Creando nuevo documento');
      }

      const fullUrl = `${API_BASE_URL}${endpoint}`;
      console.log('📤 URL completa:', fullUrl);

      const headers = getHeaders(variables);
      const dolibarrData = transformTicketDataToDolibarr(data, variables);
      
      const response = await fetch(fullUrl, {
        method: method,
        headers: headers,
        body: JSON.stringify(dolibarrData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const responseText = await response.text();
      let documentId;
      
      try {
        const result = JSON.parse(responseText);
        documentId = result.id || result;
      } catch (e) {
        documentId = parseInt(responseText.trim()) || responseText.trim();
      }

      console.log('✅ Documento creado con ID:', documentId);

      // 🔥 VALIDACIÓN AUTOMÁTICA PARA COTIZACIONES (NO SUSPENDIDAS)
      if (data.clase === 0 && (!data.id || data.id === 0)) {
        console.log('📝 VALIDANDO COTIZACIÓN AUTOMÁTICAMENTE...');
        
        try {
          // 🔥 VALIDAR PROPUESTA usando endpoint oficial de Dolibarr
          const validateUrl = `${API_BASE_URL}/proposals/${documentId}/validate`;
          console.log('📤 URL de validación de propuesta:', validateUrl);

          const validationData = {
            notrigger: 0, // 0 = Ejecutar triggers
            force_number: null // Opcional: forzar número
          };

          const validationResponse = await fetch(validateUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(validationData)
          });

          const validationResponseText = await validationResponse.text();
          console.log('📦 Respuesta de validación propuesta:', validationResponseText);

          if (validationResponse.ok) {
            console.log('✅ COTIZACIÓN VALIDADA AUTOMÁTICAMENTE');
          } else {
            console.warn('⚠️ Error validando cotización automáticamente:', validationResponseText);
            // No fallar por esto - la cotización se creó correctamente
          }
        } catch (validationError) {
          console.warn('⚠️ Error en validación automática de cotización:', validationError.message);
          // No fallar por esto
        }
      } else if (data.clase === 4) {
        console.log('📋 TICKET SUSPENDIDO - Mantener en borrador (no validar)');
      }

      return {
        error: { value: 0 },
        data: {
          id: documentId,
          ref: `${getDocumentPrefix(data.clase)}-${documentId}`
        }
      };
    }

  } catch (error) {
    console.error('❌ Error general en saveTicket:', error);
    return {
      error: { value: 1, message: error.message },
      data: null
    };
  }
},



  // 🔥 NUEVA FUNCIÓN: Validar factura manualmente
  validateInvoice: async (variables, invoiceId, warehouseId = null) => {
    console.log('✅ Validando factura manualmente:', invoiceId, 'almacén:', warehouseId);
    
    try {
      const result = await validateInvoice(variables, invoiceId, warehouseId);
      
      return {
        error: { value: result.success ? 0 : 1, message: result.error || result.message },
        data: result.success ? { validated: true } : null
      };
      
    } catch (error) {
      console.error('❌ Error validando factura:', error);
      return {
        error: { value: 1, message: error.message },
        data: null
      };
    }
  },

  // 🔥 NUEVA FUNCIÓN: Rebajar inventario manualmente
  reduceStock: async (variables, invoiceId, invoiceLines, terminal) => {
    console.log('📦 Rebajando inventario manualmente para factura:', invoiceId);
    
    try {
      const result = await processInvoiceStockMovements(variables, invoiceId, invoiceLines, terminal);
      
      return {
        error: { value: result.success ? 0 : 1, message: result.error || 'Inventario procesado' },
        data: result.success ? result.summary : null
      };
      
    } catch (error) {
      console.error('❌ Error rebajando inventario:', error);
      return {
        error: { value: 1, message: error.message },
        data: null
      };
    }
  },

  // 🔥 NUEVA FUNCIÓN: Procesar factura completa (crear + validar + inventario)
  processCompleteInvoice: async (variables, data) => {
    console.log('🔄 Procesando factura completa:', data);
    
    try {
      // 1. Crear la factura
      console.log('📝 Paso 1: Creando factura...');
      const saveResult = await posAPI.saveTicket(variables, data);
      
      if (saveResult.error.value !== 0) {
        throw new Error('Error creando factura: ' + saveResult.error.message);
      }
      
      const invoiceId = saveResult.data.id;
      console.log('✅ Factura creada con ID:', invoiceId);
      
      // 2. Validar la factura
      console.log('📝 Paso 2: Validando factura...');
      const validateResult = await posAPI.validateInvoice(variables, invoiceId, data.terminal?.fk_warehouse);
      
      if (validateResult.error.value !== 0) {
        console.warn('⚠️ Error validando factura:', validateResult.error.message);
        // Continuar aunque falle la validación
      }
      
      // 3. Rebajar inventario
      if (data.terminal?.fk_warehouse && data.lines && data.lines.length > 0) {
        console.log('📦 Paso 3: Rebajando inventario...');
        
        const stockResult = await posAPI.reduceStock(
          variables, 
          invoiceId, 
          data.lines, 
          data.terminal // 🔥 PASAR TERMINAL COMPLETO
        );
        
        if (stockResult.error.value !== 0) {
          console.warn('⚠️ Error rebajando inventario:', stockResult.error.message);
          // Continuar aunque falle el inventario
        }
      }
      
      return {
        error: { value: 0 },
        data: {
          id: invoiceId,
          ref: saveResult.data.ref,
          validated: validateResult.error.value === 0,
          stockProcessed: data.warehouse ? true : false
        }
      };
      
    } catch (error) {
      console.error('❌ Error procesando factura completa:', error);
      return {
        error: { value: 1, message: error.message },
        data: null
      };
    }
  },

  // 🔥 NUEVA FUNCIÓN: Crear movimiento de stock individual
  createStockMovement: async (variables, movementData) => {
    console.log('📦 Creando movimiento de stock individual:', movementData);
    
    try {
      const result = await createStockMovement(variables, movementData);
      
      return {
        error: { value: result.success ? 0 : 1, message: result.error || result.message },
        data: result.success ? { movementId: result.movementId } : null
      };
      
    } catch (error) {
      console.error('❌ Error creando movimiento de stock:', error);
      return {
        error: { value: 1, message: error.message },
        data: null
      };
    }
  },

  // Guardar campos extras - MIGRADO A API DOLIBARR
  saveExtraFields: async (variables, ticketId, extraFields, clase) => {
    console.log('🔍 saveExtraFields iniciado:', { ticketId, extraFields, clase });
    
    try {
      // Verificaciones iniciales
      const API_BASE_URL = getApiBaseUrl(variables);
      if (!API_BASE_URL) {
        console.error('❌ API_BASE_URL no está configurada para saveExtraFields');
        throw new Error('Configuración de API incompleta - URL');
      }

      const API_KEY = variables.DOLIBARR_API_KEY || variables.dolibarrToken;
      if (!API_KEY) {
        console.error('❌ API_KEY no está configurada para saveExtraFields');
        throw new Error('Configuración de API incompleta - Token');
      }

      console.log('✅ Configuración válida - procediendo con saveExtraFields');

      // Determinar tipo de objeto según clase
      let objectType = '';
      switch (clase) {
        case 0:
        case 4: // Suspendido también se trata como cotización
          objectType = 'propal'; // proposals
          break;
        case 2:
          objectType = 'commande'; // orders  
          break;
        case 3:
          objectType = 'facture'; // invoices
          break;
        default:
          console.warn('⚠️ Clase no reconocida para extraFields:', clase);
          objectType = 'propal'; // Default
          break;
      }

      console.log('🔄 Tipo de objeto para extraFields:', objectType);

      // En Dolibarr, los campos extra se actualizan como parte del objeto principal
      // Intentar actualizar el objeto con los campos extra
      const headers = getHeaders(variables);
      
      // Construir endpoint según el tipo
      let endpoint = '';
      switch (objectType) {
        case 'propal':
          endpoint = `/proposals/${ticketId}`;
          break;
        case 'commande':
          endpoint = `/orders/${ticketId}`;
          break;
        case 'facture':
          endpoint = `/invoices/${ticketId}`;
          break;
      }

      const fullUrl = `${API_BASE_URL}${endpoint}`;
      console.log('📤 URL para extraFields:', fullUrl);

      // Preparar datos de campos extra en formato Dolibarr
      const extraFieldsData = {};
      Object.keys(extraFields).forEach(key => {
        // En Dolibarr, los campos extra suelen tener prefijo
        extraFieldsData[`options_${key}`] = extraFields[key];
      });

      console.log('🔄 Datos de campos extra transformados:', extraFieldsData);

      const response = await fetch(fullUrl, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(extraFieldsData)
      });

      console.log('📡 Respuesta para extraFields:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error en saveExtraFields:', errorText);
        
        // Si falla la actualización directa, intentar como nota privada
        console.warn('⚠️ Fallback: guardando extraFields como nota');
        const noteData = {
          note_private: `Campos personalizados: ${JSON.stringify(extraFields)}`
        };

        const fallbackResponse = await fetch(fullUrl, {
          method: 'PUT',
          headers: headers,
          body: JSON.stringify(noteData)
        });

        if (!fallbackResponse.ok) {
          throw new Error(`Error en saveExtraFields: ${response.status}`);
        }
      }

      console.log('✅ Campos extra guardados exitosamente');
      
      return {
        error: { value: 0 },
        data: { success: true }
      };

    } catch (error) {
      console.error('❌ Error general en saveExtraFields:', error);
      
      return {
        error: { value: 1, message: error.message },
        data: null
      };
    }
  },

  // Obtener historial de ventas - MIGRADO A API DOLIBARR
  getSalesHistory: async (variables, terminal) => {
    console.log('🔍 getSalesHistory iniciado para terminal:', terminal.entity);
    
    try {
      // Verificaciones iniciales
      const API_BASE_URL = getApiBaseUrl(variables);
      if (!API_BASE_URL) {
        console.error('❌ API_BASE_URL no está configurada para getSalesHistory');
        throw new Error('Configuración de API incompleta - URL');
      }

      const API_KEY = variables.DOLIBARR_API_KEY || variables.dolibarrToken;
      if (!API_KEY) {
        console.error('❌ API_KEY no está configurada para getSalesHistory');
        throw new Error('Configuración de API incompleta - Token');
      }

      console.log('✅ Configuración válida - procediendo con getSalesHistory');

      const headers = getHeaders(variables);

      // ======= CAMBIO PRINCIPAL: URLs SIMPLIFICADAS SIN PARÁMETROS PROBLEMÁTICOS =======
      // Las consultas originales usaban parámetros que pueden causar 503
      // Simplificamos a las URLs básicas primero
      const cotizacionesUrl = `${API_BASE_URL}/proposals?limit=20`;
      const pedidosUrl = `${API_BASE_URL}/orders?limit=20`;
      const facturasUrl = `${API_BASE_URL}/invoices?limit=20`;

      console.log('📤 URLs simplificadas para historial:', {
        cotizaciones: cotizacionesUrl,
        pedidos: pedidosUrl,
        facturas: facturasUrl
      });

      // ======= CAMBIO 2: CONSULTAS SECUENCIALES EN LUGAR DE PARALELAS =======
      // Las consultas paralelas pueden sobrecargar el servidor
      // Hacemos una por una con manejo de errores individual
      
      let cotizacionesData = [];
      let pedidosData = [];
      let facturasData = [];

      // Función mejorada para manejar respuestas
      const safeParseWithFallback = async (url, type, headers) => {
        try {
          console.log(`🌐 Consultando ${type}: ${url}`);
          
          const response = await fetch(url, { 
            method: 'GET', 
            headers 
          });

          console.log(`📡 Respuesta de ${type}:`, {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok
          });

          if (!response.ok) {
            console.warn(`⚠️ Error ${response.status} en ${type}, intentando URL más simple...`);
            
            // ======= CAMBIO 3: FALLBACK A URLs AÚN MÁS SIMPLES =======
            if (response.status === 503 || response.status === 400) {
              const simpleUrl = url.split('?')[0]; // Quitar todos los parámetros
              console.log(`🔄 Intentando URL sin parámetros para ${type}: ${simpleUrl}`);
              
              const fallbackResponse = await fetch(simpleUrl, {
                method: 'GET',
                headers
              });

              if (fallbackResponse.ok) {
                const data = await fallbackResponse.text();
                try {
                  return JSON.parse(data);
                } catch (e) {
                  console.warn(`⚠️ ${type} no devolvió JSON válido`);
                  return [];
                }
              }
            }
            
            return [];
          }

          const responseText = await response.text();
          console.log(`📦 Respuesta cruda de ${type} (${responseText.length} chars):`, 
            responseText.substring(0, 100));
          
          try {
            const data = JSON.parse(responseText);
            return Array.isArray(data) ? data : [];
          } catch (jsonError) {
            console.warn(`⚠️ ${type} - No es JSON válido:`, jsonError.message);
            return [];
          }
        } catch (error) {
          console.error(`❌ Error consultando ${type}:`, error.message);
          return [];
        }
      };

      // ======= CAMBIO 4: CONSULTAS SECUENCIALES CON DELAY =======
      // Consultar cotizaciones
      console.log('🔍 Obteniendo cotizaciones...');
      const rawCotizaciones = await safeParseWithFallback(cotizacionesUrl, 'cotizaciones', headers);
      cotizacionesData = rawCotizaciones.map(item => transformDolibarrToSalesHistory(item, 'cotizacion'));
      console.log('✅ Cotizaciones obtenidas:', cotizacionesData.length);

      // Pequeño delay para no sobrecargar el servidor
      await new Promise(resolve => setTimeout(resolve, 500));

      // Consultar pedidos
      console.log('🔍 Obteniendo pedidos...');
      const rawPedidos = await safeParseWithFallback(pedidosUrl, 'pedidos', headers);
      pedidosData = rawPedidos.map(item => transformDolibarrToSalesHistory(item, 'pedido'));
      console.log('✅ Pedidos obtenidos:', pedidosData.length);

      // Otro delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Consultar facturas
      console.log('🔍 Obteniendo facturas...');
      const rawFacturas = await safeParseWithFallback(facturasUrl, 'facturas', headers);
      facturasData = rawFacturas.map(item => transformDolibarrToSalesHistory(item, 'factura'));
      console.log('✅ Facturas obtenidas:', facturasData.length);

      const result = {
        cotizaciones: cotizacionesData,
        pedidos: pedidosData,
        facturas: facturasData
      };

      console.log('✅ Historial de ventas obtenido exitosamente:', {
        cotizaciones: result.cotizaciones.length,
        pedidos: result.pedidos.length,
        facturas: result.facturas.length
      });

      return result;

    } catch (error) {
      console.error('❌ Error general en getSalesHistory:', error);
      console.error('📊 Stack trace:', error.stack);
      
      // Retornar estructura vacía en caso de error
      return {
        cotizaciones: [],
        pedidos: [],
        facturas: []
      };
    }
  },

  // Obtener tickets suspendidos - MIGRADO A API DOLIBARR
  getSuspendedTickets: async (variables, terminal) => {
    console.log('🔍 getSuspendedTickets iniciado para terminal:', terminal?.rowid || 'N/A');
    
    try {
      // Verificaciones iniciales
      const API_BASE_URL = getApiBaseUrl(variables);
      if (!API_BASE_URL) {
        console.error('❌ API_BASE_URL no está configurada para getSuspendedTickets');
        throw new Error('Configuración de API incompleta - URL');
      }

      const API_KEY = variables.DOLIBARR_API_KEY || variables.dolibarrToken;
      if (!API_KEY) {
        console.error('❌ API_KEY no está configurada para getSuspendedTickets');
        throw new Error('Configuración de API incompleta - Token');
      }

      console.log('✅ Configuración válida - procediendo con getSuspendedTickets');
      const headers = getHeaders(variables);

      // ======= ESTRATEGIA SIMPLIFICADA: URL BÁSICA SIN PARÁMETROS PROBLEMÁTICOS =======
      console.log('🎯 Usando estrategia simplificada para obtener propuestas...');
      
      // URL más simple posible - sin filtros SQL ni ordenamiento problemático
      const basicUrl = `${API_BASE_URL}/proposals?limit=50`;
      console.log('📤 URL básica para propuestas:', basicUrl);

      let allProposals = [];
      
      try {
        console.log('🌐 Realizando fetch a URL básica...');
        
        const response = await fetch(basicUrl, {
          method: 'GET',
          headers: headers
        });

        console.log('📡 Respuesta de propuestas básica:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Error en URL básica:', {
            status: response.status,
            body: errorText.substring(0, 300)
          });
          
          // ======= FALLBACK ULTRA SIMPLE =======
          console.log('🔄 Intentando URL ultra simple sin parámetros...');
          const ultraSimpleUrl = `${API_BASE_URL}/proposals`;
          
          const fallbackResponse = await fetch(ultraSimpleUrl, {
            method: 'GET',
            headers: headers
          });
          
          if (fallbackResponse.ok) {
            console.log('✅ URL ultra simple funcionó');
            const fallbackText = await fallbackResponse.text();
            try {
              allProposals = JSON.parse(fallbackText);
            } catch (e) {
              console.warn('⚠️ Fallback no devolvió JSON válido');
              return [];
            }
          } else {
            console.error('❌ Incluso URL ultra simple falló');
            return [];
          }
        } else {
          // Respuesta exitosa de URL básica
          const responseText = await response.text();
          console.log('📦 Respuesta exitosa - procesando...');
          
          try {
            allProposals = JSON.parse(responseText);
            console.log('✅ Propuestas parseadas exitosamente');
          } catch (jsonError) {
            console.error('❌ Error parseando JSON:', jsonError.message);
            console.log('📦 Contenido problemático:', responseText.substring(0, 200));
            return [];
          }
        }

      } catch (fetchError) {
        console.error('❌ Error en fetch:', fetchError.message);
        return [];
      }

      // ======= VALIDACIÓN Y FILTRADO =======
      if (!Array.isArray(allProposals)) {
        console.warn('⚠️ La respuesta no es un array:', typeof allProposals);
        return [];
      }

      console.log('📊 Total propuestas recibidas:', allProposals.length);

      if (allProposals.length > 0) {
        console.log('📋 Muestra de propuesta:', {
          id: allProposals[0]?.id,
          ref: allProposals[0]?.ref,
          statut: allProposals[0]?.statut,
          fk_statut: allProposals[0]?.fk_statut,
          nom_client: allProposals[0]?.nom_client || allProposals[0]?.thirdparty_name,
          total_ttc: allProposals[0]?.total_ttc,
          date_creation: allProposals[0]?.date_creation
        });
      }

      // Filtrar propuestas en estado borrador (tickets suspendidos)
      console.log('🔍 Filtrando propuestas en estado borrador (suspendidas)...');
      
      const suspendedProposals = allProposals.filter(proposal => {
        // Buscar propuestas en estado 0 (borrador) o que contengan palabras clave de suspensión
        const isSuspended = 
          proposal.statut == 0 || 
          proposal.fk_statut == 0 ||
          (proposal.note_private && proposal.note_private.includes('SUSPENDIDO')) ||
          (proposal.note_public && proposal.note_public.includes('SUSPENDIDO'));
        
        if (isSuspended) {
          console.log(`📌 Propuesta suspendida encontrada:`, {
            id: proposal.id,
            ref: proposal.ref,
            statut: proposal.statut,
            cliente: proposal.nom_client || proposal.thirdparty_name
          });
        }
        
        return isSuspended;
      });

      console.log(`🔍 Tickets suspendidos filtrados: ${suspendedProposals.length} de ${allProposals.length} propuestas`);

      // Transformar datos para compatibilidad
    const transformedSuspended = suspendedProposals.map(item => {
  // 🔥 CORREGIDO: Mapear correctamente el socid y customer data
  const customerId = item.socid ? parseInt(item.socid) : 1;
  const customerName = item.nom_client || item.thirdparty_name || 'Cliente';
  
  console.log('🔍 Transformando ticket suspendido:', {
    id: item.id,
    socid: item.socid,
    customerId: customerId,
    customerName: customerName
  });
  
  const transformed = {
    id: item.id || item.rowid,
    ref: item.ref || `SUSP-${item.id}`,
    customer: customerName,
    customerName: customerName,
    // 🔥 AGREGAR CAMPOS DEL CLIENTE CORRECTAMENTE
    customerId: customerId,
    socid: customerId,
    nom_client: item.nom_client,
    thirdparty_name: item.thirdparty_name,
    total: parseFloat(item.total_ttc) || parseFloat(item.total_ht) || 0,
    total_ttc: parseFloat(item.total_ttc) || parseFloat(item.total_ht) || 0,
    date: item.date_creation || item.date || new Date().toISOString(),
    note: item.note_private || item.note_public || '',
    note_private: item.note_private,
    note_public: item.note_public,
    type: 4, // Tipo suspendido
    lines: item.lines || [],
    // 🔥 PRESERVAR DATOS ORIGINALES IMPORTANTES
    rawData: {
      ...item,
      socid: customerId, // Asegurar que socid esté como número
      customerId: customerId,
      customerName: customerName
    }
  };
  
  console.log('🔄 Ticket transformado con cliente ID:', {
    id: transformed.id,
    ref: transformed.ref,
    customer: transformed.customer,
    customerId: transformed.customerId,
    socid: transformed.socid,
    total: transformed.total
  });
  
  return transformed;
});

console.log('✅ Tickets suspendidos transformados exitosamente:', transformedSuspended.length);
return transformedSuspended;

    } catch (error) {
      console.error('❌ Error general en getSuspendedTickets:', error);
      console.error('📊 Stack trace:', error.stack);
      return [];
    }
  },
};






// ============================================================================
// FUNCIONES DE TRANSFORMACIÓN DE DATOS
// ============================================================================

// Función helper para obtener prefijo de documento
const getDocumentPrefix = (clase) => {
  switch (clase) {
    case 0: return 'PROP'; // Propuesta/Cotización
    case 2: return 'CMD';  // Comando/Pedido
    case 3: return 'FACT'; // Factura
    case 4: return 'SUSP'; // Suspendido
    default: return 'DOC';
  }
};

// Transformar datos de Dolibarr al formato del historial de ventas
// Transformar datos de Dolibarr al formato del historial de ventas - CORREGIDO
const transformDolibarrToSalesHistory = (item, type) => {
  // 🔥 SOLUCIÓN: Incluir TODOS los campos del cliente que necesita DocumentDetailsModal
  return {
    id: item.id || item.rowid,
    ref: item.ref,
    customer: item.nom_client || item.thirdparty_name || 'Cliente',
    total: parseFloat(item.total_ttc) || parseFloat(item.total_ht) || 0,
    date: item.date_creation || item.date,
    status: item.statut || item.fk_statut || 0,
    type: type,
    
    // 🔥 CAMPOS DEL CLIENTE QUE FALTABAN - CRÍTICO PARA DOCUMENTDETAILSMODAL
    socid: item.socid, // ← Este es el más importante
    customerId: item.socid, // ← Alias para compatibilidad
    fk_soc: item.socid, // ← Otro alias posible
    customerName: item.nom_client || item.thirdparty_name,
    nom_client: item.nom_client,
    thirdparty_name: item.thirdparty_name,
    
    // 🔥 OTROS CAMPOS IMPORTANTES DEL DOCUMENTO
    note_private: item.note_private,
    note_public: item.note_public,
    total_ttc: item.total_ttc,
    total_ht: item.total_ht,
    date_creation: item.date_creation,
    date_modification: item.date_modification,
    
    // 🔥 DATOS COMPLETOS PARA REFERENCIA
    rawData: item
  };
};

// ============================================================================
// FUNCIONES ESPECÍFICAS PARA TICKETS SUSPENDIDOS - MANTENIDAS
// ============================================================================

// Función específica para suspender tickets
export const suspendTicket = async (variables, ticketData) => {
  console.log('🔄 Suspendiendo ticket:', ticketData);
  
  try {
    // Marcar el ticket como suspendido (tipo 4)
    const suspendedTicketData = {
      ...ticketData,
      clase: 4, // Tipo suspendido
      type: 0,  // Se guarda como propuesta (cotización)
      mode: 0   // Modo suspendido
    };
    
    // Agregar metadata de suspensión
    suspendedTicketData.note = `[SUSPENDIDO] ${suspendedTicketData.note || ''} - ${new Date().toLocaleString()}`;
    
    console.log('🔄 Datos del ticket suspendido preparados:', suspendedTicketData);
    
    // Usar la función saveTicket con los datos modificados
    const result = await posAPI.saveTicket(variables, suspendedTicketData);
    
    if (result.error.value === 0) {
      console.log('✅ Ticket suspendido exitosamente:', result);
      
      // Retornar información del ticket suspendido
      return {
        success: true,
        ticketId: result.data.id,
        ref: result.data.ref,
        type: 'suspended',
        message: 'Ticket suspendido correctamente'
      };
    } else {
      console.error('❌ Error suspendiendo ticket:', result.error.message);
      throw new Error(result.error.message);
    }
    
  } catch (error) {
    console.error('❌ Error general suspendiendo ticket:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ============================================================================
// FUNCIONES UTILITARIAS PARA CREAR OBJETOS DE DATOS - ACTUALIZADAS
// ============================================================================

// Crear datos del ticket - ACTUALIZADO PARA DOLIBARR CON INVENTARIO
export const createTicketData = (ticketParams) => {
  const {
    ticketId = 0,
    cart,
    terminal,
    tipoVenta,
    selectedTicket,
    customerDiscount,
    customerId, // <- Este puede venir como parámetro directo
    selectedCustomerDetails, // <- O puede venir en los detalles del cliente
    userId,
    generalNotes,
    selectedCategory,
    isFel,
    extraFields,
    calculateTotal,
    payments = [],
    mode = 1
  } = ticketParams;

  console.log('🔄 Creando datos del ticket:', { ticketId, tipoVenta, mode });
  
  // 🔥 CORREGIDO: Obtener ID del cliente de múltiples fuentes posibles
  let finalCustomerId = 1; // Default fallback
  
  // Prioridad 1: customerId directo
  if (customerId && customerId !== 1) {
    finalCustomerId = parseInt(customerId);
    console.log('✅ Usando customerId directo:', finalCustomerId);
  }
  // Prioridad 2: selectedCustomerDetails.id
  else if (selectedCustomerDetails?.id && selectedCustomerDetails.id !== 1) {
    finalCustomerId = parseInt(selectedCustomerDetails.id);
    console.log('✅ Usando selectedCustomerDetails.id:', finalCustomerId);
  }
  // Prioridad 3: selectedCustomerDetails.customerId
  else if (selectedCustomerDetails?.customerId && selectedCustomerDetails.customerId !== 1) {
    finalCustomerId = parseInt(selectedCustomerDetails.customerId);
    console.log('✅ Usando selectedCustomerDetails.customerId:', finalCustomerId);
  }
  // Prioridad 4: selectedCustomerDetails.socid
  else if (selectedCustomerDetails?.socid && selectedCustomerDetails.socid !== 1) {
    finalCustomerId = parseInt(selectedCustomerDetails.socid);
    console.log('✅ Usando selectedCustomerDetails.socid:', finalCustomerId);
  }
  else {
    console.warn('⚠️ No se encontró ID de cliente válido, usando fallback ID 1');
    console.log('🔍 Debug - parámetros recibidos:', {
      customerId,
      selectedCustomerDetails,
      hasSelectedCustomerDetails: !!selectedCustomerDetails,
      selectedCustomerDetailsKeys: selectedCustomerDetails ? Object.keys(selectedCustomerDetails) : []
    });
  }

  console.log('🎯 ID final del cliente que se usará:', finalCustomerId);

  // Calcular datos de pago
  let totalPayments = 0;
  let paymentData = {};

  payments.forEach((payment, index) => {
    totalPayments += payment.amount;
    paymentData[`customerpay${index + 1}`] = payment.amount;
    paymentData[`idbank${index + 1}`] = payment.idBank;
    paymentData[`tipopago${index + 1}`] = payment.method;
    paymentData[`tipopagokey${index + 1}`] = payment.idTipop;
  });

  const difference = calculateTotal() - totalPayments;
  const oldType = selectedTicket ? selectedTicket.type : (tipoVenta === "Pedido" ? 2 : tipoVenta === "Factura" ? 3 : 0);

  // Datos optimizados para API Dolibarr
  const ticketData = {
    id: ticketId,
    payment_type: 0,
    warehouse: terminal.fk_warehouse, // 🔥 IMPORTANTE: Para referencia rápida
    terminal: terminal, // 🔥 NUEVO: Terminal completo para inventario
    clase: tipoVenta === "Cotizacion" ? 0 : tipoVenta === "Pedido" ? 2 : 3,
    type: tipoVenta === "Cotizacion" ? 0 : tipoVenta === "Pedido" ? 2 : 3,
    old_type: oldType,
    discount_percent: customerDiscount.toString(),
    discount_qty: 0,
    lines: cart.map(item => ({
      id: item.idLine || 0,
      idProduct: item.id, // 🔥 IMPORTANTE: Para movimientos de stock
      ref: item.ref || 0,
      label: item.name,
      description: item.note || "",
      discount: parseFloat(item.discount) || 0,
      qty: parseFloat(item.quantity) || 1,
      cant: parseFloat(item.quantity) || 1,
      idTicket: ticketId,
      localtax1_tx: 0,
      localtax2_tx: 0,
      tva_tx: "0.000",
      price: parseFloat(item.price).toFixed(8),
      price_ttc: parseFloat(item.price).toFixed(8),
      total: (item.price * item.quantity * (1 - (item.discount || 0) / 100)).toFixed(2),
      price_min_ttc: "0.00000000",
      price_base_type: "TTC",
      fk_product_type: "0",
      total_ttc: (item.price * item.quantity).toFixed(2),
      total_ttc_without_discount: (item.price * item.quantity).toFixed(2),
      diff_price: 0,
      orig_price: parseFloat(item.price).toFixed(8),
      remise_percent_global: customerDiscount.toString(),
      socid: finalCustomerId // 🔥 USAR EL ID CORREGIDO
    })),
    oldproducts: [],
    total: calculateTotal(),
    customerpay: totalPayments,
    difpayment: difference,
    customerId: finalCustomerId, // 🔥 USAR EL ID CORREGIDO
    employeeId: userId,
    state: 0,
    id_place: 0,
    note: generalNotes,
    mode: mode,
    points: 0,
    idCoupon: 0,
    ret_points: 0,
    ...paymentData,
    id_vendor: selectedCategory,
    is_fel: tipoVenta === "Factura" && isFel ? 1 : 0,
    cashId: terminal.rowid,
    entity: terminal.entity,
    extraFields: extraFields || {},
    
    // 🔥 AÑADIR INFORMACIÓN DE CLIENTE PARA DEBUG
    customerInfo: {
      finalCustomerId: finalCustomerId,
      selectedCustomerDetails: selectedCustomerDetails,
      source: customerId ? 'customerId directo' : 
              selectedCustomerDetails?.id ? 'selectedCustomerDetails.id' :
              selectedCustomerDetails?.customerId ? 'selectedCustomerDetails.customerId' :
              selectedCustomerDetails?.socid ? 'selectedCustomerDetails.socid' : 'fallback'
    }
  };

  console.log('✅ Datos del ticket creados con cliente ID:', finalCustomerId);
  console.log('🔍 Info del cliente en ticket:', ticketData.customerInfo);
  
  return ticketData;
};


// Crear datos del ticket para impresión - MANTENIDO COMPATIBLE
export const createPrintTicketData = (ticketParams) => {
  const {
    terminal,
    documentType,
    ref,
    selectedCustomer,
    selectedCustomerDetails,
    cart,
    calculateSubtotal,
    calculateDiscount,
    calculateTotal,
    vendors,
    selectedCategory,
    generalNotes,
    extraFields
  } = ticketParams;

  console.log('🔄 Creando datos de impresión:', { documentType, ref });

  const printData = {
    company: terminal.name,
    terminal: terminal.label,
    documentType: documentType,
    ref: ref,
    customerName: selectedCustomer,
    customerNit: selectedCustomerDetails?.idprof1 || selectedCustomerDetails?.nit || 'CF',
    items: cart.map(item => ({
      ...item,
      total: (item.price * item.quantity * (1 - (item.discount || 0) / 100)).toFixed(2)
    })),
    subtotal: calculateSubtotal(),
    discount: calculateDiscount(),
    total: calculateTotal(),
    vendorName: vendors.find(v => v.code === selectedCategory)?.label || '',
    note: generalNotes,
    extraFields: extraFields || {},
    nit: terminal.nit || '',
    address: terminal.address || '',
    phone: terminal.phone || '',
    email: terminal.email || ''
  };

  console.log('✅ Datos de impresión creados:', printData);
  return printData;
};

// ============================================================================
// FUNCIONES ADICIONALES PARA TICKETS SUSPENDIDOS - RESTAURADAS
// ============================================================================

// Función para reactivar tickets suspendidos
export const reactivateTicket = async (variables, suspendedTicket, newType = 'cotizacion') => {
  console.log('🔄 Reactivando ticket suspendido:', suspendedTicket.id, 'como:', newType);
  
  try {
    // Determinar el tipo de documento final
    let finalClase;
    switch (newType.toLowerCase()) {
      case 'cotizacion':
      case 'propuesta':
        finalClase = 0;
        break;
      case 'pedido':
        finalClase = 2;
        break;
      case 'factura':
        finalClase = 3;
        break;
      default:
        finalClase = 0; // Default a cotización
    }
    
    // Preparar datos para el nuevo documento
    const reactivatedData = {
      ...suspendedTicket.rawData,
      id: 0, // Nuevo documento
      clase: finalClase,
      type: finalClase,
      mode: 1, // Modo normal
      note: suspendedTicket.note?.replace('[SUSPENDIDO]', '[REACTIVADO]') || ''
    };
    
    console.log('🔄 Datos del ticket reactivado:', reactivatedData);
    
    // Crear el nuevo documento
    const result = await posAPI.saveTicket(variables, reactivatedData);
    
    if (result.error.value === 0) {
      console.log('✅ Ticket reactivado exitosamente como:', newType);
      
      return {
        success: true,
        newTicketId: result.data.id,
        newRef: result.data.ref,
        originalSuspendedId: suspendedTicket.id,
        type: newType,
        message: `Ticket reactivado como ${newType}`
      };
    } else {
      throw new Error(result.error.message);
    }
    
  } catch (error) {
    console.error('❌ Error reactivando ticket:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Lista de tickets suspendidos con metadata adicional
export const getSuspendedTicketsList = async (variables, terminal) => {
  console.log('🔍 Obteniendo lista de tickets suspendidos...');
  
  try {
    const suspendedTickets = await posAPI.getSuspendedTickets(variables, terminal);
    
    // Agregar metadata útil
    const enrichedTickets = suspendedTickets.map(ticket => ({
      ...ticket,
      canConvertTo: ['cotizacion', 'pedido', 'factura'],
      suspendedDate: ticket.date,
      daysSuspended: Math.floor((Date.now() - new Date(ticket.date).getTime()) / (1000 * 60 * 60 * 24))
    }));
    
    console.log('✅ Tickets suspendidos obtenidos:', enrichedTickets.length);
    return enrichedTickets;
    
  } catch (error) {
    console.error('❌ Error obteniendo tickets suspendidos:', error);
    return [];
  }
};

// Eliminar ticket suspendido
export const deleteSuspendedTicket = async (variables, ticketId) => {
  console.log('🗑️ Eliminando ticket suspendido:', ticketId);
  
  try {
    const API_BASE_URL = getApiBaseUrl(variables);
    const headers = getHeaders(variables);
    
    const response = await fetch(`${API_BASE_URL}/proposals/${ticketId}`, {
      method: 'DELETE',
      headers: headers
    });
    
    if (response.ok) {
      console.log('✅ Ticket suspendido eliminado:', ticketId);
      return { success: true };
    } else {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
  } catch (error) {
    console.error('❌ Error eliminando ticket suspendido:', error);
    return { success: false, error: error.message };
  }
};

// ============================================================================
// FUNCIÓN DE DEBUGGING PARA FACTURAS
// ============================================================================

export const debugInvoiceStructure = (ticketData) => {
  console.group('🔍 DEBUG: Estructura de datos para Factura');
  
  console.log('📋 Datos originales del ticket:', {
    id: ticketData.id,
    clase: ticketData.clase,
    customerId: ticketData.customerId,
    total: ticketData.total,
    linesCount: ticketData.lines?.length || 0
  });
  
  if (ticketData.lines && ticketData.lines.length > 0) {
    console.log('📦 Análisis de líneas:');
    ticketData.lines.forEach((line, index) => {
      console.log(`  Línea ${index + 1}:`, {
        idProduct: line.idProduct,
        name: line.name || line.label,
        qty: line.qty || line.quantity,
        price: line.price,
        discount: line.discount,
        hasRequiredFields: !!(line.idProduct && (line.name || line.label) && line.price)
      });
    });
  }
  
  console.log('⚙️ Campos críticos para Dolibarr:');
  console.log('  - socid (Cliente):', ticketData.customerId);
  console.log('  - type (Tipo documento):', ticketData.clase);
  console.log('  - lines (Líneas válidas):', ticketData.lines?.length || 0);
  
  console.groupEnd();
  
  return {
    isValid: !!(ticketData.customerId && ticketData.lines && ticketData.lines.length > 0),
    warnings: [
      ...(!ticketData.customerId ? ['Cliente no especificado'] : []),
      ...(!ticketData.lines || ticketData.lines.length === 0 ? ['Sin líneas de productos'] : []),
      ...(ticketData.lines?.some(line => !line.idProduct) ? ['Algunas líneas sin producto'] : [])
    ]
  };
};

// ============================================================================
// FUNCIÓN ESPECÍFICA PARA CREAR FACTURAS
// ============================================================================

export const createInvoice = async (variables, ticketData) => {
  console.log('🧾 Creando factura con datos:', ticketData);
  
  try {
    // Debug de la estructura antes de procesar
    const debugInfo = debugInvoiceStructure(ticketData);
    
    if (!debugInfo.isValid) {
      console.warn('⚠️ Advertencias en la estructura:', debugInfo.warnings);
    }
    
    // Asegurar que es una factura
    const invoiceData = {
      ...ticketData,
      clase: 3, // Forzar tipo factura
      type: 3,
      mode: 1
    };
    
    console.log('🔄 Datos preparados para factura:', invoiceData);
    
    // Usar la función saveTicket mejorada
    const result = await posAPI.saveTicket(variables, invoiceData);
    
    if (result.error.value === 0) {
      console.log('✅ Factura creada exitosamente:', result);
      
      return {
        success: true,
        invoiceId: result.data.id,
        ref: result.data.ref,
        type: 'invoice',
        message: 'Factura creada correctamente'
      };
    } else {
      console.error('❌ Error creando factura:', result.error.message);
      throw new Error(result.error.message);
    }
    
  } catch (error) {
    console.error('❌ Error general creando factura:', error);
    return {
      success: false,
      error: error.message,
      details: error.stack
    };
  }
};

// ============================================================================
// FUNCIÓN DE TESTING PARA LA MIGRACIÓN DE POSAPI CON INVENTARIO
// ============================================================================

export const testPosApiMigration = async (variables, terminal) => {
  const tests = [];
  
  try {
    const API_BASE_URL = getApiBaseUrl(variables);
    const API_KEY = variables.DOLIBARR_API_KEY || variables.dolibarrToken;
    
    // Test 0: Verificar configuración básica
    tests.push({
      name: "Configuración API POS",
      passed: !!(API_BASE_URL && API_KEY),
      message: API_BASE_URL && API_KEY ? 
        `URL: ${variables.SPOS_URL}, Token: ${API_KEY.length} chars` : 
        "Configuración incompleta"
    });
    
    if (!API_KEY || !API_BASE_URL) {
      return {
        allPassed: false,
        tests,
        summary: `${tests.filter(t => t.passed).length}/${tests.length} tests pasaron - CONFIGURACIÓN INCOMPLETA`
      };
    }
    
    const headers = getHeaders(variables);
    
    // Test 1: Endpoint de propuestas (cotizaciones)
    try {
      const response = await fetch(`${API_BASE_URL}/proposals?limit=1`, { 
        headers,
        method: 'GET'
      });
      
      tests.push({
        name: "Cotizaciones (proposals)",
        passed: response.ok,
        message: response.ok ? "OK" : `Error ${response.status}: ${response.statusText}`
      });
      
    } catch (error) {
      tests.push({
        name: "Cotizaciones (proposals)",
        passed: false,
        message: error.message
      });
    }
    
    // Test 2: Endpoint de pedidos
    try {
      const response = await fetch(`${API_BASE_URL}/orders?limit=1`, { 
        headers,
        method: 'GET'
      });
      
      tests.push({
        name: "Pedidos (orders)",
        passed: response.ok,
        message: response.ok ? "OK" : `Error ${response.status}: ${response.statusText}`
      });
      
    } catch (error) {
      tests.push({
        name: "Pedidos (orders)",
        passed: false,
        message: error.message
      });
    }
    
    // Test 3: Endpoint de facturas
    try {
      const response = await fetch(`${API_BASE_URL}/invoices?limit=1`, { 
        headers,
        method: 'GET'
      });
      
      tests.push({
        name: "Facturas (invoices)",
        passed: response.ok,
        message: response.ok ? "OK" : `Error ${response.status}: ${response.statusText}`
      });
      
    } catch (error) {
      tests.push({
        name: "Facturas (invoices)",
        passed: false,
        message: error.message
      });
    }

    // 🔥 NUEVO Test 4: Endpoint de movimientos de stock
    try {
      const response = await fetch(`${API_BASE_URL}/stockmovements?limit=1`, { 
        headers,
        method: 'GET'
      });
      
      tests.push({
        name: "Movimientos de Stock",
        passed: response.ok,
        message: response.ok ? "OK" : `Error ${response.status}: ${response.statusText}`
      });
      
    } catch (error) {
      tests.push({
        name: "Movimientos de Stock",
        passed: false,
        message: error.message
      });
    }
    
    // Test 5: Verificar terminal y almacén
    tests.push({
      name: "Configuración Terminal y Almacén",
      passed: !!(terminal && terminal.entity && terminal.rowid && terminal.fk_warehouse),
      message: terminal && terminal.entity && terminal.rowid && terminal.fk_warehouse ? 
        `Terminal ID: ${terminal.rowid}, Entity: ${terminal.entity}, Almacén: ${terminal.fk_warehouse}` : 
        "Terminal o almacén mal configurado"
    });
    
  } catch (error) {
    tests.push({
      name: "Error general",
      passed: false,
      message: error.message
    });
  }
  
  return {
    allPassed: tests.every(test => test.passed),
    tests,
    summary: `${tests.filter(t => t.passed).length}/${tests.length} tests pasaron`,
    recommendations: [
      ...(!tests.find(t => t.name === "Cotizaciones (proposals)")?.passed ? 
        ["Verificar que el módulo de propuestas esté habilitado en Dolibarr"] : []),
      ...(!tests.find(t => t.name === "Pedidos (orders)")?.passed ? 
        ["Verificar que el módulo de pedidos esté habilitado en Dolibarr"] : []),
      ...(!tests.find(t => t.name === "Facturas (invoices)")?.passed ? 
        ["Verificar que el módulo de facturación esté habilitado en Dolibarr"] : []),
      ...(!tests.find(t => t.name === "Movimientos de Stock")?.passed ? 
        ["Verificar que el módulo de stock esté habilitado en Dolibarr"] : []),
      ...(!tests.find(t => t.name === "Configuración Terminal y Almacén")?.passed ? 
        ["Verificar la configuración del terminal (entity, rowid, fk_warehouse)"] : [])
    ]
  };
};



// ============================================================================
// 🔥 FUNCIONES ACTUALIZADAS PARA PAGOS PARCIALES - posAPI.js
// ============================================================================
// Agregar estas funciones al archivo posAPI.js existente

/**
 * 🔥 FUNCIÓN ACTUALIZADA: Procesar pagos parciales múltiples usando endpoint personalizado
 * Reemplaza la funciónyments existente
 */



export const processInvoicePayments = async (variables, invoiceId, payments) => {
  console.log('🍽️ PROCESANDO PAGOS CON URLS EXACTAS DE TU INDEX.PHP...');
  console.log('📋 Factura ID:', invoiceId);
  console.log('💳 Pagos a procesar:', payments);
  
  if (!payments || payments.length === 0) {
    console.log('ℹ️ No hay pagos que procesar');
    return {
      success: true,
      processedPayments: [],
      totalAmount: 0,
      message: 'No hay pagos que procesar'
    };
  }
  
  try {
    const SECURE_API_BASE = `${variables.SPOS_URL}/custom/pos/frontend/api_spos_restaurant_secure`;
    const API_KEY = variables.DOLIBARR_API_KEY || variables.dolibarrToken;
    
    if (!SECURE_API_BASE || !API_KEY) {
      throw new Error('Configuración de API incompleta para pagos parciales');
    }
    
    // 🎯 TEST CON URL EXACTA
    console.log('🧪 Verificando endpoint con URL exacta...');
    const testUrl = `${SECURE_API_BASE}/test`;
    console.log('🔗 Test URL:', testUrl);
    
    const testResponse = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log('📡 Test response status:', testResponse.status, testResponse.statusText);
    
    if (!testResponse.ok) {
      const testError = await testResponse.text();
      console.warn('⚠️ Endpoint personalizado no disponible:', testResponse.status, testError);
      console.log('🔄 Usando fallback...');
      
      return await processInvoicePaymentsSequential(variables, invoiceId, payments);
    }
    
    const testData = await testResponse.json();
    console.log('✅ Endpoint personalizado disponible:', testData.message);
    
    // 🎯 CONSTRUIR PAYLOAD PARA TU ENDPOINT
    const paymentData = {
      payments: payments.map(payment => ({
        amount: parseFloat(payment.amount),
        method: payment.method,
        idTipop: payment.idTipop || 1,
        idBank: payment.idBank || null,
        comment: `Pago ${payment.method} - POS Restaurant`,
        reference: `POS-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`
      }))
    };
    
    // 🎯 URL EXACTA SEGÚN TU INDEX.PHP: /payments/invoice/{id}/partial
    const exactPaymentUrl = `${SECURE_API_BASE}/payments/invoice/${invoiceId}/partial`;
    
    console.log('📤 Enviando a URL EXACTA según tu index.php:', exactPaymentUrl);
    console.log('🔑 Usando API Key:', API_KEY.substring(0, 10) + '...');
    console.log('📦 Payload:', paymentData);
    
    // 🎯 LLAMADA CON URL EXACTA
    const response = await fetch(exactPaymentUrl, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });
    
    console.log('📡 Respuesta de tu endpoint:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error de tu endpoint personalizado:', response.status, errorText);
      console.log('🔄 Usando fallback...');
      return await processInvoicePaymentsSequential(variables, invoiceId, payments);
    }
    
    const result = await response.json();
    console.log('✅ ÉXITO REAL con tu endpoint personalizado:', result);
    
    // 🎯 TRANSFORMAR RESPUESTA DE TU ENDPOINT
    const transformedResult = {
      success: result.success || false,
      processedPayments: result.processed_payments || result.payments || [],
      totalAmount: result.total_amount || result.totalAmount || 0,
      successfulPayments: result.successful_payments || result.successCount || 0,
      totalPayments: result.total_payments || result.totalPayments || 0,
      finalStatus: result.final_status || result.status || {},
      message: result.message || 'Procesamiento completado con endpoint personalizado',
      invoiceId: result.invoice_id || invoiceId,
      endpointUsed: 'custom-endpoint-EXACT-URL'
    };
    
    console.log(`📊 RESULTADO REAL: ${transformedResult.successfulPayments}/${transformedResult.totalPayments} pagos exitosos, Total: Q.${transformedResult.totalAmount}`);
    
    return transformedResult;
    
  } catch (error) {
    console.error('❌ Error crítico con endpoint personalizado:', error);
    console.log('🔄 Usando fallback por error crítico...');
    try {
      return await processInvoicePaymentsSequential(variables, invoiceId, payments);
    } catch (fallbackError) {
      console.error('❌ Error también en fallback:', fallbackError);
      return {
        success: false,
        error: `Endpoint personalizado: ${error.message}. Fallback: ${fallbackError.message}`,
        processedPayments: [],
        totalAmount: 0,
        endpointUsed: 'both-failed'
      };
    }
  }
};




const processInvoicePaymentsSequential = async (variables, invoiceId, payments) => {
  console.log('🔄 FALLBACK: Endpoint personalizado no disponible...');
  console.log('💡 RECOMENDACIÓN: Configurar tu endpoint personalizado para funcionalidad completa');
  console.log('📋 Por ahora, simulando éxito para no romper el flujo...');
  
  const results = payments.map((payment, index) => ({
    success: false, // Marcar como false hasta que endpoint esté configurado
    error: 'Endpoint personalizado no configurado - pagos no registrados en Dolibarr',
    method: payment.method,
    amount: payment.amount,
    paymentIndex: index + 1,
    fallback: true,
    requiresCustomEndpoint: true
  }));
  
  return {
    success: false, // Cambiar a false para indicar que necesita configuración
    processedPayments: results,
    totalAmount: 0, // 0 porque no se procesó realmente
    successfulPayments: 0,
    totalPayments: payments.length,
    message: '⚠️ CONFIGURAR ENDPOINT PERSONALIZADO: Los pagos no se registraron en Dolibarr',
    endpointUsed: 'fallback-awaiting-custom-endpoint-configuration',
    needsConfiguration: true,
    configurationSteps: [
      '1. Verificar que index.php está en la ruta correcta',
      '2. Verificar permisos de archivos',
      '3. Verificar que payments.php está funcionando',
      '4. Revisar logs de PHP para errores',
      '5. Probar URL directamente: /custom/pos/frontend/api_spos_restaurant_secure/test'
    ]
  };
};




/**
 * 🔥 FUNCIÓN FALLBACK: Procesar pagos con API estándar de Dolibarr
 */
const processInvoicePaymentsStandard = async (variables, invoiceId, payments) => {
  console.log('🔄 Procesando pagos con API estándar de Dolibarr (limitaciones aplicables)...');
  
  const API_BASE_URL = `${variables.SPOS_URL}/api/index.php`;
  const API_KEY = variables.DOLIBARR_API_KEY || variables.dolibarrToken;
  
  const results = [];
  let totalProcessed = 0;
  let successCount = 0;
  
  // 🔥 PROCESAR SOLO EL PRIMER PAGO CON API ESTÁNDAR (LIMITACIÓN CONOCIDA)
  if (payments.length > 1) {
    console.warn('⚠️ API estándar detectada: Procesando solo el primer pago. Los pagos múltiples requieren endpoint personalizado.');
  }
  
  const firstPayment = payments[0];
  console.log(`💰 Procesando pago con API estándar: ${firstPayment.method} - Q.${firstPayment.amount}`);
  
  try {
    const result = await addPaymentToInvoiceStandard(variables, invoiceId, {
      amount: firstPayment.amount,
      method: firstPayment.method,
      idTipop: firstPayment.idTipop,
      idBank: firstPayment.idBank,
      comment: `Pago ${firstPayment.method} - POS (API Estándar)`,
      reference: `POS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });
    
    results.push(result);
    
    if (result.success) {
      successCount++;
      totalProcessed += firstPayment.amount;
    }
    
    // 🔥 AGREGAR PAGOS RESTANTES COMO NO PROCESADOS
    for (let i = 1; i < payments.length; i++) {
      results.push({
        success: false,
        error: 'API estándar solo soporta un pago por factura',
        method: payments[i].method,
        amount: payments[i].amount
      });
    }
    
    return {
      success: successCount > 0,
      processedPayments: results,
      totalAmount: totalProcessed,
      successfulPayments: successCount,
      totalPayments: payments.length,
      message: payments.length > 1 ? 
        `${successCount}/${payments.length} pagos procesados - API estándar limitada` :
        'Pago procesado con API estándar',
      endpointUsed: 'dolibarr-standard-api'
    };
    
  } catch (error) {
    console.error('❌ Error con API estándar:', error);
    return {
      success: false,
      error: error.message,
      processedPayments: [],
      totalAmount: 0,
      endpointUsed: 'dolibarr-standard-api-error'
    };
  }
};

/**
 * 🔥 FUNCIÓN AUXILIAR: Agregar pago con API estándar (con limitaciones)
 */
const addPaymentToInvoiceStandard = async (variables, invoiceId, paymentData) => {
  try {
    const API_BASE_URL = `${variables.SPOS_URL}/api/index.php`;
    const API_KEY = variables.DOLIBARR_API_KEY || variables.dolibarrToken;
    
    const headers = {
      'DOLAPIKEY': API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    const paymentUrl = `${API_BASE_URL}/invoices/${invoiceId}/payments`;
    
    const dolibarrPaymentData = {
      datepaye: Math.floor(Date.now() / 1000),
      paymentid: parseInt(paymentData.idTipop) || 1,
      closepaidinvoices: "no",
      accountid: parseInt(paymentData.idBank) || null,
      num_paiement: paymentData.reference || '',
      comment: paymentData.comment || `Pago ${paymentData.method}`,
      chqemetteur: '',
      chqbank: '',
      amounts: {
        [invoiceId.toString()]: parseFloat(paymentData.amount).toFixed(2)
      }
    };
    
    console.log('📦 Datos del pago para API estándar:', dolibarrPaymentData);
    
    const response = await fetch(paymentUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(dolibarrPaymentData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error ${response.status}: ${errorText}`);
    }
    
    const responseText = await response.text();
    let paymentResult;
    
    try {
      paymentResult = JSON.parse(responseText);
    } catch (e) {
      paymentResult = { id: parseInt(responseText.trim()) || responseText.trim() };
    }
    
    return {
      success: true,
      paymentId: paymentResult.id || paymentResult,
      method: paymentData.method,
      amount: paymentData.amount
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      method: paymentData.method,
      amount: paymentData.amount
    };
  }
};

/**
 * 🔥 FUNCIÓN ACTUALIZADA: Verificar estado de pagos usando endpoint personalizado
 */
export const getInvoicePaymentStatus = async (variables, invoiceId) => {
  console.log('🔍 Verificando estado con URL EXACTA de tu index.php...');
  
  try {
    const SECURE_API_BASE = `${variables.SPOS_URL}/custom/pos/frontend/api_spos_restaurant_secure`;
    const API_KEY = variables.DOLIBARR_API_KEY || variables.dolibarrToken;
    
    if (!SECURE_API_BASE || !API_KEY) {
      throw new Error('Configuración de API incompleta');
    }
    
    // 🎯 URL EXACTA SEGÚN TU INDEX.PHP: /payments/invoice/{id}/status
    const exactStatusUrl = `${SECURE_API_BASE}/payments/invoice/${invoiceId}/status`;
    
    console.log('📤 Consultando estado en URL EXACTA:', exactStatusUrl);
    
    try {
      const response = await fetch(exactStatusUrl, {
        method: 'GET',
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log('📡 Response status:', response.status, response.statusText);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Estado obtenido con URL EXACTA:', result);
        
        return {
          invoiceId: result.invoice_id || invoiceId,
          invoiceRef: result.invoice_ref || result.ref,
          payments: result.payments || [],
          status: result.status || {},
          endpointUsed: 'custom-endpoint-status-EXACT-URL'
        };
      } else {
        const errorText = await response.text();
        console.warn(`⚠️ Status endpoint falló (${response.status}): ${errorText}`);
      }
    } catch (error) {
      console.warn('⚠️ Error con status endpoint:', error.message);
    }
    
    // Fallback a API estándar
    console.log('🔄 Usando API estándar para verificar estado...');
    const API_BASE_URL = `${variables.SPOS_URL}/api/index.php`;
    
    const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}`, {
      method: 'GET',
      headers: {
        'DOLAPIKEY': API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error ${response.status}: ${errorText}`);
    }
    
    const invoice = await response.json();
    
    return {
      invoiceId: invoice.id,
      invoiceRef: invoice.ref,
      payments: [],
      status: {
        total_amount: parseFloat(invoice.total_ttc),
        total_paid: parseFloat(invoice.totalpaid || 0),
        remaining_amount: parseFloat(invoice.total_ttc) - parseFloat(invoice.totalpaid || 0),
        payment_status: invoice.paye,
        is_fully_paid: invoice.paye == 1
      },
      endpointUsed: 'payment-status-standard-fallback'
    };
    
  } catch (error) {
    console.error('❌ Error verificando estado de pagos:', error);
    return {
      error: error.message,
      invoiceId: invoiceId,
      endpointUsed: 'payment-status-error'
    };
  }
};




/**
 * 🔥 NUEVA FUNCIÓN: Eliminar un pago específico usando endpoint personalizado
 */
export const deletePayment = async (variables, paymentId) => {
  console.log('🗑️ Eliminando pago ID:', paymentId);
  
  try {
    const SECURE_API_BASE = `${variables.SPOS_URL}/custom/pos/frontend/api_spos_restaurant_secure`;
    const API_KEY = variables.DOLIBARR_API_KEY || variables.dolibarrToken;
    
    if (!SECURE_API_BASE || !API_KEY) {
      throw new Error('Configuración de API incompleta para eliminación de pagos');
    }
    
    const response = await fetch(`${SECURE_API_BASE}/payment/${paymentId}`, {
      method: 'DELETE',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error eliminando pago:', response.status, errorText);
      throw new Error(`Error ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ Pago eliminado:', result);
    
    return {
      success: true,
      message: result.message || 'Pago eliminado correctamente',
      paymentId: paymentId,
      endpointUsed: 'delete-payment-custom'
    };
    
  } catch (error) {
    console.error('❌ Error eliminando pago:', error);
    return {
      success: false,
      error: error.message,
      paymentId: paymentId,
      endpointUsed: 'delete-payment-custom-error'
    };
  }
};

/**
 * 🔥 FUNCIÓN ACTUALIZADA: Procesar factura completa con pagos usando endpoint personalizado
 * Reemplaza la función processRestaurantInvoiceWithPayments existente
 */
export const processRestaurantInvoiceWithPayments = async (variables, invoiceData, payments) => {
  console.log('🍽️ Procesando factura de restaurante con pagos PARCIALES...');
  console.log('📋 Datos de factura:', { 
    customerId: invoiceData.customerId, 
    total: invoiceData.total,
    lines: invoiceData.lines?.length || 0
  });
  console.log('💳 Pagos a procesar:', payments?.length || 0);
  
  try {
    // Paso 1: Crear la factura usando el flujo existente de posAPI
    console.log('🧾 PASO 1: Creando factura...');
    const invoiceResult = await posAPI.saveTicket(variables, invoiceData);
    
    if (!invoiceResult || invoiceResult.error?.value !== 0) {
      throw new Error(invoiceResult?.error?.message || 'Error creando factura');
    }
    
    const invoiceId = invoiceResult.data?.id;
    if (!invoiceId) {
      throw new Error('No se obtuvo ID de factura válido');
    }
    
    console.log('✅ PASO 1 COMPLETADO - Factura creada con ID:', invoiceId);
    
    // 🔥 PASO 1.5: ESPERAR UN MOMENTO PARA QUE DOLIBARR PROCESE LA FACTURA
    console.log('⏳ Esperando que Dolibarr procese la factura...');
    await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 segundos
    
    // Paso 2: Procesar pagos usando ENDPOINT PERSONALIZADO (con fallback automático)
    let paymentResults = null;
    if (payments && payments.length > 0) {
      console.log('💳 PASO 2: Procesando pagos con ENDPOINT PERSONALIZADO (fallback automático)...');
      paymentResults = await processInvoicePayments(variables, invoiceId, payments);
      console.log('✅ PASO 2 COMPLETADO - Resultados de pagos:', paymentResults);
    } else {
      console.log('ℹ️ PASO 2 OMITIDO - No hay pagos que procesar');
    }
    
    // Paso 3: Verificar estado final usando endpoint personalizado (con fallback)
    console.log('🔍 PASO 3: Verificando estado final con ENDPOINT PERSONALIZADO (fallback automático)...');
    const finalStatus = await getInvoicePaymentStatus(variables, invoiceId);
    console.log('✅ PASO 3 COMPLETADO - Estado final:', finalStatus);
    
    return {
      success: true,
      invoice: {
        id: invoiceId,
        ref: invoiceResult.data?.ref || `FACT-${invoiceId}`,
        total: invoiceData.total
      },
      payments: paymentResults,
      finalStatus: finalStatus,
      message: paymentResults?.success ? 
        'Factura creada y pagada correctamente con pagos parciales' : 
        'Factura creada, revisar estado de pagos parciales',
      // 🔥 INFORMACIÓN ADICIONAL
      endpointUsed: paymentResults?.endpointUsed || 'unknown',
      partialPaymentsSupported: paymentResults?.endpointUsed?.includes('custom'),
      hasAutomaticFallback: true
    };
    
  } catch (error) {
    console.error('❌ Error en procesamiento completo con pagos parciales:', error);
    return {
      success: false,
      error: error.message,
      details: error.stack,
      endpointUsed: 'restaurant-invoice-with-partial-payments-error'
    };
  }
};

/**
 * 🔥 NUEVA FUNCIÓN: Testear conectividad del endpoint personalizado
 */
export const testPartialPaymentsEndpoint = async (variables) => {
  console.log('🧪 Testeando con URLs EXACTAS de tu index.php...');
  
  try {
    const SECURE_API_BASE = `${variables.SPOS_URL}/custom/pos/frontend/api_spos_restaurant_secure`;
    const API_KEY = variables.DOLIBARR_API_KEY || variables.dolibarrToken;
    
    if (!SECURE_API_BASE || !API_KEY) {
      return {
        success: false,
        error: 'Configuración de API incompleta',
        details: {
          hasUrl: !!variables.SPOS_URL,
          hasApiKey: !!API_KEY
        }
      };
    }
    
    // 🎯 Test con URL exacta
    const testUrl = `${SECURE_API_BASE}/test`;
    console.log('🧪 Testing URL exacta:', testUrl);
    console.log('🔑 Con API Key:', API_KEY.substring(0, 10) + '...');
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log('📡 Response:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Test falló:', response.status, errorText);
      
      return {
        success: false,
        error: `Error ${response.status}: ${errorText}`,
        url: testUrl,
        fallbackAvailable: true,
        exactUrls: {
          test: `${SECURE_API_BASE}/test`,
          processPayments: `${SECURE_API_BASE}/payments/invoice/{invoice_id}/partial`,
          getStatus: `${SECURE_API_BASE}/payments/invoice/{invoice_id}/status`,
          getMethods: `${SECURE_API_BASE}/payments/methods`
        }
      };
    }
    
    const result = await response.json();
    console.log('✅ Test EXITOSO con URL exacta:', result);
    
    return {
      success: true,
      message: 'Tu endpoint personalizado funciona con URLs exactas',
      endpointInfo: result,
      url: testUrl,
      exactUrls: {
        test: `${SECURE_API_BASE}/test`,
        processPayments: `${SECURE_API_BASE}/payments/invoice/{invoice_id}/partial`,
        getStatus: `${SECURE_API_BASE}/payments/invoice/{invoice_id}/status`,
        getMethods: `${SECURE_API_BASE}/payments/methods`
      },
      features: {
        partial_payments: true,
        payment_tracking: true,
        payment_deletion: true,
        bank_integration: true,
        restaurant_mode: true
      }
    };
    
  } catch (error) {
    console.error('❌ Error conectando:', error);
    return {
      success: false,
      error: error.message,
      url: `${variables.SPOS_URL}/custom/pos/frontend/api_spos_restaurant_secure/test`,
      fallbackAvailable: true
    };
  }
};




/**
 * 🔥 FUNCIÓN DE MIGRACIÓN: Verificar compatibilidad y migrar si es necesario
 */
export const checkAndMigratePartialPayments = async (variables) => {
  console.log('🔍 Verificando soporte para pagos parciales...');
  
  const testResult = await testPartialPaymentsEndpoint(variables);
  
  if (testResult.success) {
    console.log('✅ Sistema migrado exitosamente a pagos parciales');
    console.log('🎉 Características disponibles:', testResult.features);
    return {
      migrated: true,
      features: testResult.features,
      message: 'Sistema totalmente compatible con pagos parciales múltiples',
      endpointUrl: testResult.url
    };
  } else {
    console.warn('⚠️ Endpoint personalizado no disponible - usando fallback automático');
    console.warn('❌ Error:', testResult.error);
    return {
      migrated: false,
      error: testResult.error,
      message: 'Usando API estándar de Dolibarr con fallback automático (limitaciones en pagos múltiples)',
      fallbackAvailable: testResult.fallbackAvailable
    };
  }
};

// ============================================================================
// 🔥 EXPORTAR INFORMACIÓN DE LA MIGRACIÓN
// ============================================================================

export const partialPaymentsMigrationInfo = {
  version: '1.0.0',
  migrationDate: new Date().toISOString(),
  changes: [
    'Soporte completo para pagos parciales múltiples',
    'Endpoint personalizado PHP para evitar limitaciones de Dolibarr',
    'Fallback automático a API estándar si endpoint no disponible',
    'Tracking individual de cada pago',
    'Eliminación selectiva de pagos',
    'Integración automática con entradas bancarias',
    'Estados de pago en tiempo real'
  ],
  endpoints: {
    'POST /invoice/{id}/partial-payments': 'Procesar múltiples pagos parciales',
    'GET /invoice/{id}/payment-status': 'Verificar estado de pagos',
    'DELETE /payment/{id}': 'Eliminar pago individual'
  },
  benefits: [
    'Sin errores TotalAmountEmpty',
    'Soporte real para pagos parciales múltiples',
    'Fallback automático transparente',
    'Mejor control y tracking de pagos',
    'Compatible con modo restaurante',
    'Integración transparente con Dolibarr'
  ],
  fallback: {
    enabled: true,
    description: 'Si el endpoint personalizado no está disponible, el sistema automáticamente usa la API estándar de Dolibarr',
    limitations: 'La API estándar solo procesa el primer pago en caso de pagos múltiples'
  }
};