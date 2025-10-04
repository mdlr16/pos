import { validateStockForCart, processExtraFields, resetSale } from './posUtils';
import { getCustomerCompleteData, posAPI, createTicketData, getSuspendedTicketWithLines, deleteSuspendedTicket } from './posAPI';

// ============================================================================
// FUNCIÓN EXISTENTE MEJORADA - handleSelectHistoryItem
// ============================================================================

export const handleSelectHistoryItem = async (
  document,
  setters,
  variables,
  terminal,
  vendors
) => {
  const {
    setSelectedTicket,
    setSelectedCustomer,
    setCustomerSearch,
    setIsCustomerSearchFocused,
    setSelectedCustomerDetails,
    setGeneralNotes,
    setCart,
    setTipoVenta,
    setIsEditable,
    setIsFel,
    setExtraFields,
    setIsSalesHistoryModalOpen,
    setAlert
  } = setters;

  setSelectedTicket(document);
  setSelectedCustomer(document.customerName);
  setCustomerSearch(document.customerName);
  setIsCustomerSearchFocused(false);

  setSelectedCustomerDetails({ 
    id: document.customerId,
    remise: document.discount_percent
  });
  
  setGeneralNotes(document.note_private || '');

  // Configurar carrito con las líneas del documento
  const cartItems = document.lines.map(line => ({
    id: line.idLine,
    idLine: line.idLine,
    name: line.label || line.product_label,
    price: parseFloat(line.price),
    quantity: parseInt(line.qty, 10),
    discount: parseFloat(line.discount || 0),
    note: line.description,
    hasStock: true
  }));

  setCart(cartItems);

  // Determinar tipo de venta
  const saleType = document.type === "0" ? "Cotizacion" : 
                  document.type === "2" ? "Pedido" : "Factura";
  setTipoVenta(saleType);

  // Validar stock si es factura y VALIDARSTOCK está activado
  if (saleType === "Factura" && variables.SPOS_VALIDARSTOCK === "1") {
    await validateStockForCart(cartItems, variables, terminal, setCart, setAlert);
  }

  setIsEditable(saleType === "Factura");
  setIsFel(saleType === "Factura" && document.is_fel === 1);

  // Configurar campos extras si están presentes
  if (document.extrafields && Array.isArray(document.extrafields)) {
    const newExtraFields = {};
    document.extrafields.forEach(field => {
      for (const [key, value] of Object.entries(field)) {
        if (key !== 'fk_object' && key !== 'rowid') {
          newExtraFields[key] = value;
        }
      }
    });
    setExtraFields(newExtraFields);
  }

  setIsSalesHistoryModalOpen(false);
};

// ============================================================================
// FUNCIÓN EXISTENTE MEJORADA - handleEditTicket
// ============================================================================

export const handleEditTicket = async (
  ticket,
  setters,
  variables,
  terminal
) => {
  const {
    setSelectedTicket,
    setSelectedCustomer,
    setCustomerSearch,
    setIsCustomerSearchFocused,
    setSelectedCustomerDetails,
    setGeneralNotes,
    setCart,
    setTipoVenta,
    setIsFel,
    setExtraFields,
    setIsSuspendedModalOpen,
    // Campos del cliente
    setNitValue,
    setNombreValue, 
    setDireccionValue,
    setTelefonoValue,
    setEmailValue,
    setAlert
  } = setters;

  console.log('🔄 Editando ticket suspendido:', ticket);

  try {
    // 🔥 OBTENER DATOS COMPLETOS DEL TICKET SI ES NECESARIO
    let completeTicket = ticket;
    
    // Si el ticket no tiene líneas, intentar obtenerlas
    if (!ticket.lines || ticket.lines.length === 0) {
      console.log('📦 Obteniendo líneas del ticket...');
      
      try {
        const API_BASE_URL = `${variables.SPOS_URL}/api/index.php`;
        const headers = {
          'DOLAPIKEY': variables.DOLIBARR_API_KEY || variables.dolibarrToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
        
        // Obtener propuesta completa con líneas
        const response = await fetch(`${API_BASE_URL}/proposals/${ticket.id}`, {
          method: 'GET',
          headers: headers
        });
        
        if (response.ok) {
          const completeData = await response.json();
          console.log('✅ Datos completos obtenidos:', completeData);
          
          // 🔥 CORREGIDO: Usar los datos completos que incluyen socid correcto
          completeTicket = {
            ...ticket,
            ...completeData, // Sobrescribir con datos frescos de la API
            lines: completeData.lines || [],
            customerId: completeData.socid,
            socid: completeData.socid, // 🔥 ASEGURAR QUE SOCID ESTÉ PRESENTE
            customerName: completeData.nom_client || completeData.thirdparty_name,
            note: completeData.note_private || completeData.note_public || ticket.note
          };
        }
      } catch (error) {
        console.warn('⚠️ No se pudieron obtener líneas del ticket:', error);
      }
    }

    // 🔥 MARCAR COMO TICKET SUSPENDIDO EN EDICIÓN
    const ticketInEdit = {
      ...completeTicket,
      type: 4, // Marcar como suspendido para lógica posterior
      isEditingMode: true // Flag adicional para identificar modo edición
    };

    setSelectedTicket(ticketInEdit);

    // 🔥 DATOS DEL CLIENTE - CORREGIDOS PARA MAPEAR SOCID CORRECTAMENTE
    const customerName = completeTicket.customerName || 
                        completeTicket.nom_client || 
                        completeTicket.thirdparty_name || 
                        completeTicket.customer || 
                        'Cliente';

    // 🔥 CORREGIDO: Mapear socid correctamente desde la respuesta de la API
    let customerId = 1; // Default fallback

    console.log('🔍 Debug - datos disponibles para cliente:', {
      socid: completeTicket.socid,
      customerId: completeTicket.customerId,
      fk_soc: completeTicket.fk_soc,
      customerName: customerName
    });

    // Prioridad 1: socid desde la respuesta de la API (viene como string)
    if (completeTicket.socid && completeTicket.socid !== "1" && completeTicket.socid !== 1) {
      customerId = parseInt(completeTicket.socid);
      console.log('✅ Usando socid desde API:', customerId);
    }
    // Prioridad 2: customerId si existe
    else if (completeTicket.customerId && completeTicket.customerId !== 1) {
      customerId = parseInt(completeTicket.customerId);
      console.log('✅ Usando customerId:', customerId);
    }
    // Prioridad 3: fk_soc si existe
    else if (completeTicket.fk_soc && completeTicket.fk_soc !== 1) {
      customerId = parseInt(completeTicket.fk_soc);
      console.log('✅ Usando fk_soc:', customerId);
    }
    else {
      console.warn('⚠️ No se encontró ID de cliente válido, usando fallback ID 1');
      console.log('🔍 Debug - datos del ticket completo:', completeTicket);
    }

    console.log('🎯 ID final del cliente que se usará:', customerId);

    // 🔥 OBTENER DATOS COMPLETOS DEL CLIENTE USANDO LA FUNCIÓN HELPER
    console.log('👤 Obteniendo datos completos del cliente...');
    const customerData = await getCustomerCompleteData(variables, customerId);
    
    // Setear todos los campos del cliente
    setSelectedCustomer(customerData.name);
    setCustomerSearch(customerData.name);
    setIsCustomerSearchFocused(false);

    // Asignar detalles del cliente completos
    setSelectedCustomerDetails({
      id: customerData.id,
      name: customerData.name,
      remise: customerData.remise,
      nit: customerData.nit,
      direccion: customerData.direccion,
      telefono: customerData.telefono,
      email: customerData.email,
      // Campos adicionales
      code_client: customerData.code_client,
      siret: customerData.siret,
      ape: customerData.ape,
      tva_intra: customerData.tva_intra,
      country_id: customerData.country_id,
      state_id: customerData.state_id
    });
    
    // 🔥 SETEAR CAMPOS INDIVIDUALES DEL CLIENTE (si existen los setters)
    if (setNitValue) setNitValue(customerData.nit || '');
    if (setNombreValue) setNombreValue(customerData.name || '');
    if (setDireccionValue) setDireccionValue(customerData.direccion || '');
    if (setTelefonoValue) setTelefonoValue(customerData.telefono || '');
    if (setEmailValue) setEmailValue(customerData.email || '');
    
    console.log('✅ Cliente cargado:', customerData.name, 'NIT:', customerData.nit);

    // Llenar notas generales (limpiar marca de suspendido)
    const cleanNotes = (completeTicket.note || completeTicket.note_private || '')
      .replace('[SUSPENDIDO]', '')
      .replace(/- \d{1,2}\/\d{1,2}\/\d{4}.*$/, '')
      .trim();
    setGeneralNotes(cleanNotes);

    // 🔥 PROCESAR LÍNEAS DEL CARRITO - MEJORADO
    let cartItems = [];
    
    if (completeTicket.lines && Array.isArray(completeTicket.lines) && completeTicket.lines.length > 0) {
      cartItems = completeTicket.lines.map((line, index) => {
        console.log(`🔍 Procesando línea ${index + 1}:`, line);
        
        return {
          id: line.fk_product || line.idProduct || line.id || `temp_${index}`,
          idLine: line.id || line.idLine || 0,
          name: line.desc || line.label || line.product_label || line.description || `Producto ${index + 1}`,
          price: parseFloat(line.subprice || line.price || line.prix || 0),
          quantity: parseInt(line.qty || line.quantity || line.cant || 1, 10),
          discount: parseFloat(line.remise_percent || line.discount || 0),
          note: line.note || line.description || '',
          hasStock: true, // Asumir que tiene stock por defecto
          // Campos adicionales por si son necesarios
          ref: line.ref || '',
          total_ht: line.total_ht || 0,
          total_ttc: line.total_ttc || 0
        };
      });
    } else {
      console.warn('⚠️ Ticket sin líneas o líneas vacías');
      // Crear una línea de ejemplo si no hay líneas
      cartItems = [{
        id: 'placeholder',
        idLine: 0,
        name: 'Producto sin especificar',
        price: completeTicket.total || 0,
        quantity: 1,
        discount: 0,
        note: 'Línea recuperada de ticket suspendido',
        hasStock: true
      }];
    }

    console.log('🛒 Carrito procesado:', cartItems);
    setCart(cartItems);

    // 🔥 DETERMINAR TIPO DE VENTA - MEJORADO
    let tipoVentaActual = "Cotizacion"; // Default
    
    if (completeTicket.type === "2" || completeTicket.type === 2) {
      tipoVentaActual = "Pedido";
    } else if (completeTicket.type === "3" || completeTicket.type === 3) {
      tipoVentaActual = "Factura";
    } else if (completeTicket.type === "0" || completeTicket.type === 0 || completeTicket.type === "4" || completeTicket.type === 4) {
      tipoVentaActual = "Cotizacion";
    }

    console.log('📋 Tipo de venta determinado:', tipoVentaActual);
    setTipoVenta(tipoVentaActual);

    // Establecer el estado de FEL basado en el tipo de venta
    setIsFel(tipoVentaActual === "Factura" && (completeTicket.is_fel === 1 || completeTicket.is_fel === "1"));

    // 🔥 CAMPOS PERSONALIZADOS - MEJORADOS
    const extraFields = {};
    
    // Procesar extrafields desde diferentes fuentes posibles
    if (completeTicket.extrafields && Array.isArray(completeTicket.extrafields)) {
      completeTicket.extrafields.forEach(field => {
        for (const [key, value] of Object.entries(field)) {
          if (key !== 'fk_object' && key !== 'rowid' && key !== 'id') {
            extraFields[key] = value;
          }
        }
      });
    } else if (completeTicket.extraFields && typeof completeTicket.extraFields === 'object') {
      Object.assign(extraFields, completeTicket.extraFields);
    }
    
    // También buscar campos con prefijo options_
    Object.keys(completeTicket).forEach(key => {
      if (key.startsWith('options_')) {
        extraFields[key.replace('options_', '')] = completeTicket[key];
      }
    });

    console.log('🔧 Campos extra procesados:', extraFields);
    setExtraFields(extraFields);

    // Cerrar el modal de tickets suspendidos
    setIsSuspendedModalOpen(false);
    
    // 🔥 MOSTRAR MENSAJE DE ÉXITO CON INFORMACIÓN
    if (setAlert) {
      setAlert({
        show: true,
        type: 'success',
        message: `Ticket suspendido ${completeTicket.ref || completeTicket.id} cargado para edición. Puede modificar productos, cliente y tipo de documento.`
      });
    }
    
    console.log('✅ Ticket cargado exitosamente para edición');

    return {
      success: true,
      ticketId: completeTicket.id,
      cartItems: cartItems.length,
      customerName: customerData.name,
      tipoVenta: tipoVentaActual
    };

  } catch (error) {
    console.error('❌ Error cargando ticket para edición:', error);
    
    // En caso de error, al menos cargar datos básicos
    setSelectedTicket(ticket);
    setSelectedCustomer(ticket.customer || 'Cliente');
    setCustomerSearch(ticket.customer || 'Cliente');
    setSelectedCustomerDetails({ id: ticket.customerId || 1 });
    setGeneralNotes(ticket.note || '');
    setCart([]);
    setTipoVenta("Cotizacion");
    setIsFel(false);
    setExtraFields({});
    setIsSuspendedModalOpen(false);
    
    // Setear campos básicos del cliente en caso de error
    if (setNitValue) setNitValue('CF');
    if (setNombreValue) setNombreValue(ticket.customer || 'Cliente');
    if (setDireccionValue) setDireccionValue('');
    if (setTelefonoValue) setTelefonoValue('');
    if (setEmailValue) setEmailValue('');
    
    // Mostrar error al usuario si hay setAlert disponible
    if (setAlert) {
      setAlert({
        show: true,
        type: 'warning',
        message: 'Ticket cargado parcialmente. Algunos datos pueden estar incompletos.'
      });
    }

    return {
      success: false,
      error: error.message
    };
  }
};

// ============================================================================
// NUEVA FUNCIÓN: handleSuspendWithReplace
// ============================================================================

// ============================================================================
// FUNCIÓN CORREGIDA: handleSuspendWithReplace - SIN VERIFICACIÓN PROBLEMÁTICA
// ============================================================================

export const handleSuspendWithReplace = async (posData, products, customers, payments, terminal) => {
  try {
    console.log('🔄 Iniciando proceso de suspensión con reemplazo...');
    
    // Validación básica
    if (posData.cart.length === 0) {
      posData.setAlert({ 
        show: true, 
        type: 'error', 
        message: 'Debe agregar al menos un artículo al carrito antes de suspender.' 
      });
      return { success: false, error: 'Carrito vacío' };
    }

    // Obtener ID del ticket anterior si existe (estamos editando un suspendido)
    const previousTicketId = posData.selectedTicket?.id || null;
    const isEditingExistingSuspended = previousTicketId && 
      (posData.selectedTicket?.type === 4 || posData.selectedTicket?.isEditingMode);
    
    console.log('📋 Estado del ticket:', {
      isEditingExisting: isEditingExistingSuspended,
      previousId: previousTicketId,
      selectedTicketType: posData.selectedTicket?.type,
      cartItems: posData.cart.length,
      tipoVenta: posData.tipoVenta
    });

    // 🔥 VALIDACIÓN ESPECIAL PARA FACTURAS SUSPENDIDAS
    if (posData.tipoVenta === "Factura") {
      console.log('⚠️ Detectado intento de suspender factura - validaciones adicionales');
      
      // Verificar que no falten datos críticos para facturas
      if (!posData.selectedCategory) {
        posData.setAlert({ 
          show: true, 
          type: 'error', 
          message: 'Debe seleccionar un vendedor antes de suspender una factura.' 
        });
        return { success: false, error: 'Vendedor requerido para factura' };
      }
    }

    // Preparar datos del nuevo ticket suspendido
    const customerId = posData.selectedCustomerDetails?.id || '1';
    
    // 🔥 MANEJO ESPECIAL PARA FACTURAS SUSPENDIDAS
    let tipoVentaParaSuspender = posData.tipoVenta;
    
    // Si es factura, forzar a cotización para suspensión (más seguro)
    if (posData.tipoVenta === "Factura") {
      console.log('🔄 Convirtiendo factura a cotización para suspensión segura');
      tipoVentaParaSuspender = "Cotizacion";
    }
    
    const suspendedTicketData = {
      id: 0, // 🔥 IMPORTANTE: Siempre 0 para crear nuevo
      cart: posData.cart,
      terminal,
      tipoVenta: tipoVentaParaSuspender, // 🔥 USAR TIPO SEGURO PARA SUSPENSIÓN
      selectedTicket: null, // 🔥 IMPORTANTE: No pasar el ticket anterior
      customerDiscount: posData.customerDiscount,
      customerId,
      selectedCustomerDetails: posData.selectedCustomerDetails,
      userId: posData.userId,
      generalNotes: `[SUSPENDIDO] ${posData.generalNotes || ''} - Tipo original: ${posData.tipoVenta} - ${new Date().toLocaleString()}`,
      selectedCategory: posData.selectedCategory,
      isFel: false, // 🔥 FACTURAS SUSPENDIDAS NO PUEDEN SER FEL
      extraFields: {
        ...posData.extraFields,
        // 🔥 GUARDAR TIPO ORIGINAL EN CAMPOS EXTRAS
        original_tipo_venta: posData.tipoVenta,
        suspended_as_factura: posData.tipoVenta === "Factura" ? "1" : "0"
      },
      calculateTotal: posData.calculateTotal,
      mode: 0 // Modo suspendido
    };

    console.log('📦 Datos del ticket suspendido preparados:', {
      customerId: suspendedTicketData.customerId,
      tipoVentaOriginal: posData.tipoVenta,
      tipoVentaParaSuspender: tipoVentaParaSuspender,
      cartItems: suspendedTicketData.cart.length,
      notes: suspendedTicketData.generalNotes
    });

    // Crear datos en formato correcto
    const ticketData = createTicketData(suspendedTicketData);
    
    // 🔥 VALIDACIÓN ADICIONAL: Verificar que ticketData se creó correctamente
    if (!ticketData || !ticketData.lines || ticketData.lines.length === 0) {
      console.error('❌ Error: ticketData mal formado:', ticketData);
      posData.setAlert({ 
        show: true, 
        type: 'error', 
        message: 'Error preparando datos del ticket. Verifique los productos y cliente.' 
      });
      return { success: false, error: 'Datos del ticket mal formados' };
    }

    // 🔥 CREAR NUEVO TICKET SUSPENDIDO
    console.log('💾 Creando nuevo ticket suspendido...');
    
    let result;
    try {
      result = await posAPI.saveTicket(posData.variables, ticketData);
      console.log('📡 Respuesta del servidor:', result);
    } catch (saveError) {
      console.error('❌ Error en saveTicket:', saveError);
      posData.setAlert({ 
        show: true, 
        type: 'error', 
        message: 'Error comunicándose con el servidor: ' + saveError.message 
      });
      return { success: false, error: saveError.message };
    }
    
    // 🔥 VALIDACIÓN SIMPLE DE LA RESPUESTA (SIN VERIFICACIÓN ADICIONAL)
    console.log('🔍 Analizando respuesta del servidor:', {
      hasError: !!result.error,
      errorValue: result.error?.value,
      hasData: !!result.data,
      dataId: result.data?.id,
      dataRef: result.data?.ref
    });
    
    if (result.error && result.error.value === 0 && result.data && result.data.id) {
      console.log('✅ Nuevo ticket suspendido creado exitosamente:', result.data);
      
      const newTicketId = result.data.id;
      
      // 🔥 ELIMINAR TICKET ANTERIOR (sin verificación adicional)
      if (isEditingExistingSuspended) {
        console.log('🗑️ Eliminando ticket suspendido anterior:', previousTicketId);
        
        try {
          const deleteResult = await deleteSuspendedTicket(posData.variables, previousTicketId);
          
          if (deleteResult.success) {
            console.log('✅ Ticket anterior eliminado exitosamente');
          } else {
            console.warn('⚠️ No se pudo eliminar ticket anterior:', deleteResult.error);
            // No es crítico, el nuevo ya está creado
          }
        } catch (deleteError) {
          console.warn('⚠️ Error eliminando ticket anterior:', deleteError.message);
          // No es crítico, el nuevo ya está creado
        }
      }

      // 🔥 GUARDAR CAMPOS EXTRAS
      if (Object.keys(suspendedTicketData.extraFields).length > 0) {
        try {
          await posAPI.saveExtraFields(posData.variables, newTicketId, suspendedTicketData.extraFields, 4);
          console.log('✅ Campos extras guardados');
        } catch (extraError) {
          console.warn('⚠️ Error guardando campos extras:', extraError);
          // No es crítico
        }
      }

      // 🔥 MOSTRAR MENSAJE DE ÉXITO
      let actionMessage;
      if (isEditingExistingSuspended) {
        if (posData.tipoVenta === "Factura") {
          actionMessage = 'Factura suspendida y actualizada correctamente (guardada como cotización).';
        } else {
          actionMessage = 'Ticket suspendido actualizado correctamente.';
        }
      } else {
        if (posData.tipoVenta === "Factura") {
          actionMessage = 'Factura suspendida correctamente (guardada como cotización).';
        } else {
          actionMessage = 'Ticket suspendido correctamente.';
        }
      }
        
      posData.setAlert({ 
        show: true, 
        type: 'success', 
        message: actionMessage 
      });

      // 🔥 LIMPIAR INTERFAZ (IMPORTANTE: Esta parte se ejecutará ahora)
      console.log('🧹 Limpiando interfaz...');
      
      resetSale({
        setCart: posData.setCart,
        setProductSearch: products.setProductSearch,
        setCustomerSearch: customers.setCustomerSearch,
        setSelectedCustomerDetails: posData.setSelectedCustomerDetails,
        setCustomerDiscount: posData.setCustomerDiscount,
        setTipoVenta: posData.setTipoVenta,
        setGeneralNotes: posData.setGeneralNotes,
        setSelectedTicket: posData.setSelectedTicket,
        setSelectedCategory: posData.setSelectedCategory,
        setExtraFields: posData.setExtraFields,
        setPayments: payments.setPayments,
        setIsPaymentModalOpen: posData.setIsPaymentModalOpen,
        setShowTicket: posData.setShowTicket,
        setIsEditable: posData.setIsEditable
      }, posData.loadDefaultCustomer);

      console.log('✅ Proceso de suspensión con reemplazo completado exitosamente');
      
      return {
        success: true,
        newTicketId: newTicketId,
        newRef: result.data.ref,
        previousTicketId: previousTicketId,
        action: isEditingExistingSuspended ? 'updated' : 'created',
        originalType: posData.tipoVenta,
        suspendedAsType: tipoVentaParaSuspender
      };

    } else {
      // 🔥 ERROR EN LA CREACIÓN
      console.error('❌ Error creando nuevo ticket suspendido:', {
        fullResult: result,
        errorDetails: result.error,
        dataDetails: result.data
      });
      
      let errorMessage = 'Error al suspender el ticket.';
      
      if (result.error?.message) {
        errorMessage = result.error.message;
      } else if (result.error?.value !== 0) {
        errorMessage = `Error del servidor (código ${result.error?.value})`;
      } else if (!result.data) {
        errorMessage = 'El servidor no devolvió datos del ticket creado';
      } else if (!result.data.id) {
        errorMessage = 'El servidor no devolvió ID del ticket creado';
      }
      
      posData.setAlert({ 
        show: true, 
        type: 'error', 
        message: errorMessage 
      });
      
      return {
        success: false,
        error: errorMessage,
        serverResponse: result
      };
    }

  } catch (error) {
    console.error('❌ Error general en suspensión con reemplazo:', error);
    console.error('📊 Stack trace completo:', error.stack);
    
    posData.setAlert({ 
      show: true, 
      type: 'error', 
      message: 'Error al suspender el ticket: ' + error.message 
    });
    
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
};




// ============================================================================
// NUEVA FUNCIÓN: handleReactivateSuspendedTicket
// ============================================================================

export const handleReactivateSuspendedTicket = async (ticket, newType, posData, variables, terminal) => {
  try {
    console.log('🔄 Reactivando ticket suspendido:', ticket.id, 'como:', newType);

    // Determinar tipo final
    let finalTipoVenta;
    switch (newType.toLowerCase()) {
      case 'cotizacion':
      case 'propuesta':
        finalTipoVenta = 'Cotizacion';
        break;
      case 'pedido':
        finalTipoVenta = 'Pedido';
        break;
      case 'factura':
        finalTipoVenta = 'Factura';
        break;
      default:
        finalTipoVenta = 'Cotizacion';
    }

    // Obtener datos completos del ticket
    let completeTicket;
    try {
      completeTicket = await getSuspendedTicketWithLines(variables, ticket.id);
    } catch (error) {
      console.warn('⚠️ Error obteniendo ticket completo, usando datos básicos:', error);
      completeTicket = ticket;
    }

    // Transformar líneas al formato correcto
    const cartItems = completeTicket.lines?.map(line => ({
      id: line.fk_product || 0,
      name: line.desc || line.description || '',
      price: parseFloat(line.subprice || 0),
      quantity: parseFloat(line.qty || 1),
      discount: parseFloat(line.remise_percent || 0),
      note: line.note || ''
    })) || [];

    // Preparar datos para documento final
    const reactivationData = {
      id: 0, // Nuevo documento
      cart: cartItems,
      terminal,
      tipoVenta: finalTipoVenta,
      selectedTicket: null,
      customerDiscount: 0,
      customerId: completeTicket.customerId || 1,
      selectedCustomerDetails: null, // Se cargará automáticamente
      userId: posData.userId,
      generalNotes: (completeTicket.note || '').replace('[SUSPENDIDO]', '[REACTIVADO]'),
      selectedCategory: posData.selectedCategory,
      isFel: finalTipoVenta === 'Factura' ? posData.isFel : false,
      extraFields: completeTicket.extraFields || {},
      calculateTotal: () => completeTicket.total || 0,
      mode: 1 // Modo normal
    };

    // Crear documento final
    const ticketData = createTicketData(reactivationData);
    const result = await posAPI.saveTicket(variables, ticketData);

    if (result.error && result.error.value === 0) {
      console.log('✅ Ticket reactivado exitosamente como:', finalTipoVenta);

      // Eliminar ticket suspendido original
      await deleteSuspendedTicket(variables, ticket.id);

      return {
        success: true,
        newTicketId: result.data.id,
        newRef: result.data.ref,
        originalSuspendedId: ticket.id,
        type: finalTipoVenta,
        message: `Ticket reactivado como ${finalTipoVenta}`
      };
    } else {
      throw new Error(result.error?.message || 'Error reactivando ticket');
    }

  } catch (error) {
    console.error('❌ Error reactivando ticket:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ============================================================================
// NUEVA FUNCIÓN: validateSuspendedTicketChanges
// ============================================================================

export const validateSuspendedTicketChanges = (originalTicket, currentCart, currentCustomer, currentNotes) => {
  console.log('🔍 Validando cambios en ticket suspendido...');

  const changes = {
    hasChanges: false,
    cartChanged: false,
    customerChanged: false,
    notesChanged: false,
    details: []
  };

  // Validar cambios en el carrito
  const originalLines = originalTicket.lines || [];
  if (originalLines.length !== currentCart.length) {
    changes.cartChanged = true;
    changes.details.push(`Líneas: ${originalLines.length} → ${currentCart.length}`);
  } else {
    // Verificar cambios en cantidades o precios
    for (let i = 0; i < currentCart.length; i++) {
      const original = originalLines[i];
      const current = currentCart[i];
      
      if (original && (
        parseFloat(original.qty || 0) !== parseFloat(current.quantity || 0) ||
        parseFloat(original.subprice || 0) !== parseFloat(current.price || 0)
      )) {
        changes.cartChanged = true;
        changes.details.push(`Producto modificado en línea ${i + 1}`);
        break;
      }
    }
  }

  // Validar cambios en el cliente
  const originalCustomerId = originalTicket.customerId || originalTicket.socid || 1;
  const currentCustomerId = currentCustomer?.id || 1;
  
  if (originalCustomerId !== currentCustomerId) {
    changes.customerChanged = true;
    changes.details.push(`Cliente: ${originalCustomerId} → ${currentCustomerId}`);
  }

  // Validar cambios en notas
  const originalNotes = (originalTicket.note || '')
    .replace('[SUSPENDIDO]', '')
    .replace(/- \d{1,2}\/\d{1,2}\/\d{4}.*$/, '')
    .trim();
  const currentNotesClean = (currentNotes || '').trim();
  
  if (originalNotes !== currentNotesClean) {
    changes.notesChanged = true;
    changes.details.push('Notas modificadas');
  }

  changes.hasChanges = changes.cartChanged || changes.customerChanged || changes.notesChanged;

  console.log('📊 Resultado de validación:', changes);
  return changes;
};

// ============================================================================
// FUNCIÓN EXISTENTE MANTENIDA - debugSuspendedTicket
// ============================================================================

export const debugSuspendedTicket = (ticket) => {
  console.group('🔍 DEBUG: Estructura del Ticket Suspendido');
  
  console.log('📋 Datos básicos:', {
    id: ticket.id,
    ref: ticket.ref,
    type: ticket.type,
    customer: ticket.customer || ticket.customerName,
    total: ticket.total
  });
  
  console.log('👤 Información del cliente:', {
    customerId: ticket.customerId,
    socid: ticket.socid,
    customerName: ticket.customerName,
    nom_client: ticket.nom_client,
    thirdparty_name: ticket.thirdparty_name
  });
  
  console.log('📦 Líneas del ticket:', {
    hasLines: !!(ticket.lines),
    linesCount: ticket.lines?.length || 0,
    linesStructure: ticket.lines?.length > 0 ? Object.keys(ticket.lines[0]) : 'N/A'
  });
  
  if (ticket.lines && ticket.lines.length > 0) {
    console.log('🔍 Primera línea:', ticket.lines[0]);
  }
  
  console.log('🔧 Campos extra:', {
    extrafields: ticket.extrafields,
    extraFields: ticket.extraFields,
    optionsKeys: Object.keys(ticket).filter(key => key.startsWith('options_'))
  });
  
  console.groupEnd();
  
  return {
    hasValidStructure: !!(ticket.id && ticket.ref),
    hasCustomer: !!(ticket.customerId || ticket.socid || ticket.customerName),
    hasLines: !!(ticket.lines && ticket.lines.length > 0),
    recommendations: [
      ...(!ticket.id ? ['Falta ID del ticket'] : []),
      ...(!ticket.customerId && !ticket.socid ? ['Falta ID del cliente'] : []),
      ...(!ticket.lines || ticket.lines.length === 0 ? ['Falta información de líneas'] : [])
    ]
  };
};


export const getOriginalTicketType = (ticket) => {
  // Buscar en campos extras el tipo original
  if (ticket.extraFields && ticket.extraFields.original_tipo_venta) {
    return ticket.extraFields.original_tipo_venta;
  }
  
  // Buscar en notas
  if (ticket.note) {
    const typeMatch = ticket.note.match(/Tipo original: (Cotizacion|Pedido|Factura)/);
    if (typeMatch) {
      return typeMatch[1];
    }
  }
  
  // Si no encuentra, asumir cotización
  return "Cotizacion";
};

export const handleEditTicketWithOriginalType = async (
  ticket,
  setters,
  variables,
  terminal
) => {
  // Usar la función existente
  const result = await handleEditTicket(ticket, setters, variables, terminal);
  
  if (result.success) {
    // Recuperar y establecer el tipo original si está disponible
    const originalType = getOriginalTicketType(ticket);
    
    if (originalType && originalType !== "Cotizacion") {
      console.log('🔄 Restaurando tipo original del ticket:', originalType);
      setters.setTipoVenta(originalType);
      
      // Mostrar mensaje informativo
      if (setters.setAlert) {
        setters.setAlert({
          show: true,
          type: 'info',
          message: `Ticket cargado. Tipo original restaurado: ${originalType}`
        });
      }
    }
  }
  
  return result;
};


// ============================================================================
// FUNCIÓN EXISTENTE MANTENIDA - handlePrintTicket
// ============================================================================

export const handlePrintTicket = (
  item,
  documentType,
  terminal,
  vendors,
  setTicketData,
  setShowTicket
) => {
  // Procesar extrafields para convertirlo en un formato renderizable
  const processedExtraFields = processExtraFields(item.extrafields);

  const ticketData = {
    company: terminal.name,
    terminal: terminal.label,
    documentType: documentType,
    ref: item.ref,
    customerName: item.customerName,
    customerNit: item.customerNit || 'CF',
    items: item.lines.map(line => ({
      name: line.label || line.product_label,
      quantity: parseInt(line.qty || line.cant, 10),
      price: parseFloat(line.price),
      discount: parseFloat(line.discount || 0),
      total: (parseFloat(line.price) * parseInt(line.qty || line.cant, 10) * (1 - parseFloat(line.discount || 0) / 100)).toFixed(2)
    })),
    subtotal: parseFloat(item.total_ht || item.total).toFixed(2),
    discount: parseFloat(item.discount || 0).toFixed(2),
    total: parseFloat(item.total_ttc || item.total).toFixed(2),
    vendorName: vendors.find(v => v.code === item.id_vendor)?.label || '',
    note: item.note_private || item.note || '',
    extraFields: processedExtraFields,
    nit: terminal.nit || '',
    address: terminal.address || '',
    phone: terminal.phone || '',
    email: terminal.email || ''
  };

  setTicketData(ticketData);
  setShowTicket(true);
};