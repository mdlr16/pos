import React, { useState, useEffect } from 'react';

const DocumentDetailsModal = ({ 
  isOpen, 
  onClose, 
  document, 
  documentType,
  onInvoiceCotizacion, // Para facturar cotizaciones
  onPrint,
  vendors = [],
  variables // 🔥 AGREGAR VARIABLES PARA OBTENER LÍNEAS Y CLIENTE
}) => {
  const [documentWithLines, setDocumentWithLines] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [isLoadingLines, setIsLoadingLines] = useState(false);
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);

  // 🔥 EFECTO PARA CARGAR DATOS COMPLETOS DEL CLIENTE
  useEffect(() => {
    const loadCustomerData = async () => {
      if (!document || !isOpen || !variables) return;

      // 🔥 OBTENER ID DEL CLIENTE - USANDO LÓGICA ORIGINAL QUE FUNCIONABA
      let customerId = 1; // Default fallback

      console.log('🔍 Debug - datos disponibles para cliente:', {
        customerId: document.customerId,
        socid: document.socid,
        fk_soc: document.fk_soc,
        customerName: document.customerName,
        customer: document.customer,
        nom_client: document.nom_client,
        thirdparty_name: document.thirdparty_name
      });

      // Prioridad 1: socid desde la respuesta de la API (viene como string o número)
      if (document.socid && document.socid !== "1" && document.socid !== 1) {
        customerId = parseInt(document.socid);
        console.log('✅ Usando socid:', customerId);
      }
      // Prioridad 2: customerId si existe
      else if (document.customerId && document.customerId !== 1 && document.customerId !== "1") {
        customerId = parseInt(document.customerId);
        console.log('✅ Usando customerId:', customerId);
      }
      // Prioridad 3: fk_soc si existe
      else if (document.fk_soc && document.fk_soc !== 1 && document.fk_soc !== "1") {
        customerId = parseInt(document.fk_soc);
        console.log('✅ Usando fk_soc:', customerId);
      }
      else {
        console.warn('⚠️ No se encontró ID de cliente válido, usando fallback ID 1');
      }

      console.log('🎯 ID final del cliente determinado:', customerId);
      
      // Si es cliente genérico, usar datos por defecto
      if (customerId === 1) {
        console.log('🔍 Cliente genérico, usando datos por defecto');
        setCustomerData({
          id: 1,
          name: 'Cliente Final',
          nit: 'CF',
          direccion: '',
          telefono: '',
          email: ''
        });
        return;
      }

      // 🔥 PARA CLIENTES ESPECÍFICOS, SIEMPRE HACER CONSULTA ADICIONAL
      // El historial de facturas NO incluye nombre/NIT completos, solo socid
      console.log('👤 Cliente específico detectado. Cargando datos completos del cliente ID:', customerId);
      setIsLoadingCustomer(true);

      try {
        const API_BASE_URL = `${variables.SPOS_URL}/api/index.php`;
        const headers = {
          'DOLAPIKEY': variables.DOLIBARR_API_KEY || variables.dolibarrToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };

        console.log('🌐 Consultando cliente:', `${API_BASE_URL}/thirdparties/${customerId}`);

        const response = await fetch(`${API_BASE_URL}/thirdparties/${customerId}`, {
          method: 'GET',
          headers: headers
        });

        if (response.ok) {
          const customerDetails = await response.json();
          console.log('✅ Datos completos del cliente obtenidos:', {
            id: customerDetails.id,
            name: customerDetails.name || customerDetails.nom,
            nit: customerDetails.idprof1 || customerDetails.siren
          });
          
          setCustomerData({
            id: customerDetails.id || customerId,
            name: customerDetails.name || customerDetails.nom || 'Cliente',
            nit: customerDetails.idprof1 || customerDetails.siren || 'CF',
            direccion: customerDetails.address || customerDetails.adresse || '',
            telefono: customerDetails.phone || customerDetails.tel || '',
            email: customerDetails.email || '',
            remise: parseFloat(customerDetails.remise_percent) || 0
          });
        } else {
          console.warn('⚠️ Error obteniendo datos del cliente:', response.status, response.statusText);
          
          // Usar datos básicos como fallback
          setCustomerData({
            id: customerId,
            name: `Cliente ${customerId}`,
            nit: 'CF',
            direccion: '',
            telefono: '',
            email: ''
          });
        }
      } catch (error) {
        console.error('❌ Error cargando datos del cliente:', error);
        
        // Usar datos básicos como fallback
        setCustomerData({
          id: customerId,
          name: `Cliente ${customerId}`,
          nit: 'CF',
          direccion: '',
          telefono: '',
          email: ''
        });
      } finally {
        setIsLoadingCustomer(false);
      }
    };

    loadCustomerData();
  }, [document, isOpen, variables]);

  // 🔥 EFECTO PARA CARGAR LÍNEAS SI NO EXISTEN
  useEffect(() => {
    const loadDocumentLines = async () => {
      if (!document || !isOpen) return;

      // Si ya tiene líneas, usar el documento tal como está
      if (document.lines && document.lines.length > 0) {
        console.log('✅ Documento ya tiene líneas:', document.lines.length);
        setDocumentWithLines(document);
        return;
      }

      // Si no tiene líneas, intentar cargarlas
      console.log('📦 Cargando líneas del documento:', document.ref);
      setIsLoadingLines(true);

      try {
        if (!variables?.SPOS_URL || !variables?.DOLIBARR_API_KEY) {
          console.warn('⚠️ Variables de API no disponibles, usando documento sin líneas');
          setDocumentWithLines(document);
          return;
        }

        const API_BASE_URL = `${variables.SPOS_URL}/api/index.php`;
        const headers = {
          'DOLAPIKEY': variables.DOLIBARR_API_KEY || variables.dolibarrToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };

        // Determinar endpoint según tipo de documento
        let endpoint = '';
        if (documentType === 'Cotización' || document.type === '0' || document.type === 0) {
          endpoint = `/proposals/${document.id}`;
        } else if (documentType === 'Factura' || document.type === '3' || document.type === 3) {
          endpoint = `/invoices/${document.id}`;
        } else if (document.type === '2' || document.type === 2) {
          endpoint = `/orders/${document.id}`;
        } else {
          endpoint = `/proposals/${document.id}`; // Default
        }

        console.log('🌐 Consultando:', `${API_BASE_URL}${endpoint}`);

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'GET',
          headers: headers
        });

        if (response.ok) {
          const completeDocument = await response.json();
          console.log('✅ Documento completo obtenido:', {
            id: completeDocument.id,
            ref: completeDocument.ref,
            linesCount: completeDocument.lines?.length || 0,
            socid: completeDocument.socid,
            nom_client: completeDocument.nom_client
          });

          setDocumentWithLines({
            ...document,
            ...completeDocument,
            lines: completeDocument.lines || []
          });
        } else {
          console.warn('⚠️ Error obteniendo documento completo:', response.status);
          setDocumentWithLines(document);
        }
      } catch (error) {
        console.error('❌ Error cargando líneas:', error);
        setDocumentWithLines(document);
      } finally {
        setIsLoadingLines(false);
      }
    };

    loadDocumentLines();
  }, [document, isOpen, documentType, variables]);

  // 🔥 LIMPIAR ESTADOS AL CERRAR EL MODAL
  useEffect(() => {
    if (!isOpen) {
      setDocumentWithLines(null);
      setCustomerData(null);
      setIsLoadingLines(false);
      setIsLoadingCustomer(false);
    }
  }, [isOpen]);

  if (!isOpen || !document) return null;

  // Usar documento con líneas si está disponible
  const currentDocument = documentWithLines || document;

  // 🔥 DEBUG: Ver qué datos están llegando
  console.log('🔍 DocumentDetailsModal - Estado actual:', {
    document: document?.ref,
    customerData: customerData,
    isLoadingCustomer,
    isLoadingLines,
    hasLines: !!(currentDocument?.lines?.length)
  });

  const isFactura = documentType === 'Factura';
  const isCotizacion = documentType === 'Cotización';

  // Obtener fecha del documento - CORREGIDO
  const getDocumentDate = () => {
    const dateField = currentDocument.date_creation || currentDocument.date || currentDocument.datep || currentDocument.datef || currentDocument.date_commande;
    if (!dateField) return 'Sin fecha';
    
    let parsedDate;
    
    // Si es un timestamp Unix (número)
    if (typeof dateField === 'number' || (typeof dateField === 'string' && /^\d+$/.test(dateField))) {
      const timestamp = parseInt(dateField);
      // Si es timestamp Unix (segundos), convertir a milisegundos
      parsedDate = timestamp < 10000000000 ? new Date(timestamp * 1000) : new Date(timestamp);
    } else {
      // Si es string de fecha
      parsedDate = new Date(dateField);
    }
    
    // Verificar si la fecha es válida
    if (isNaN(parsedDate.getTime())) {
      return 'Fecha inválida';
    }
    
    return parsedDate.toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Obtener nombre del vendedor
  const getVendorName = () => {
    if (!currentDocument.id_vendor) return 'No especificado';
    const vendor = vendors.find(v => v.code === currentDocument.id_vendor);
    return vendor?.label || `Vendedor ${currentDocument.id_vendor}`;
  };

  // Formatear estado
  const getStatus = () => {
    if (isFactura) {
      return { label: 'Facturada', color: 'bg-green-100 text-green-800', icon: '✅' };
    } else {
      return { label: 'Cotización', color: 'bg-blue-100 text-blue-800', icon: '📋' };
    }
  };

  const status = getStatus();

  return (
    <div className="fixed inset-0 z-60 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className={`${isFactura ? 'bg-gradient-to-r from-green-600 to-emerald-600' : 'bg-gradient-to-r from-blue-600 to-purple-600'} text-white p-6`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center text-2xl">
                {status.icon}
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  {documentType} #{currentDocument.ref}
                </h2>
                <p className="text-white text-opacity-80">
                  {getDocumentDate()}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color} bg-white`}>
              {status.label}
            </span>
            <span className="text-white text-opacity-80">
              Total: <span className="font-bold text-xl">Q{parseFloat(currentDocument.total_ttc || currentDocument.total || 0).toFixed(2)}</span>
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* 🔥 LOADING STATES */}
          {(isLoadingLines || isLoadingCustomer) && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-gray-600">
                {isLoadingLines && isLoadingCustomer ? 'Cargando documento y cliente...' :
                 isLoadingLines ? 'Cargando detalles del documento...' :
                 'Cargando datos del cliente...'}
              </span>
            </div>
          )}
          
          {!isLoadingLines && !isLoadingCustomer && (
            <>
              {/* Información del Cliente - CON DATOS COMPLETOS */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="text-blue-500">👤</span>
                  Información del Cliente
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Cliente</label>
                    <p className="font-medium text-gray-800">
                      {customerData?.name || 'Cargando...'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">NIT</label>
                    <p className="font-medium text-gray-800">
                      {customerData?.nit || 'Cargando...'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">ID Cliente</label>
                    <p className="font-medium text-gray-800">
                      {customerData?.id || currentDocument.customerId || currentDocument.socid || currentDocument.fk_soc || 'No especificado'}
                    </p>
                  </div>
                  {/* Información adicional si está disponible */}
                  {customerData?.telefono && (
                    <div>
                      <label className="text-sm text-gray-600">Teléfono</label>
                      <p className="font-medium text-gray-800">{customerData.telefono}</p>
                    </div>
                  )}
                  {customerData?.email && (
                    <div>
                      <label className="text-sm text-gray-600">Email</label>
                      <p className="font-medium text-gray-800">{customerData.email}</p>
                    </div>
                  )}
                  {customerData?.direccion && (
                    <div>
                      <label className="text-sm text-gray-600">Dirección</label>
                      <p className="font-medium text-gray-800">{customerData.direccion}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Información del Documento */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="text-purple-500">📄</span>
                  Información del Documento
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Referencia</label>
                    <p className="font-medium text-gray-800">{currentDocument.ref}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Vendedor</label>
                    <p className="font-medium text-gray-800">{getVendorName()}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Fecha</label>
                    <p className="font-medium text-gray-800">{getDocumentDate()}</p>
                  </div>
                </div>
                
                {/* Notas si existen */}
                {(currentDocument.note_private || currentDocument.note) && (
                  <div className="mt-4">
                    <label className="text-sm text-gray-600">Notas</label>
                    <p className="font-medium text-gray-800 bg-white p-3 rounded border">
                      {currentDocument.note_private || currentDocument.note}
                    </p>
                  </div>
                )}
              </div>

              {/* Líneas de Productos */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="text-green-500">📦</span>
                  Productos ({currentDocument.lines?.length || 0})
                </h3>
                
                {currentDocument.lines && currentDocument.lines.length > 0 ? (
                  <div className="space-y-3">
                    {currentDocument.lines.map((line, index) => (
                      <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-800">
                              {line.label || line.product_label || line.desc || line.description || `Producto ${index + 1}`}
                            </h4>
                            {(line.description || line.note) && (
                              <p className="text-sm text-gray-600 mt-1">
                                {line.description || line.note}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>Cant: <strong>{parseInt(line.qty || line.cant || 1)}</strong></span>
                              <span>Precio: <strong>Q{parseFloat(line.price || line.subprice || 0).toFixed(2)}</strong></span>
                              {parseFloat(line.discount || line.remise_percent || 0) > 0 && (
                                <span>Desc: <strong>{parseFloat(line.discount || line.remise_percent || 0).toFixed(1)}%</strong></span>
                              )}
                            </div>
                            <div className="text-lg font-bold text-green-600 mt-1">
                              Q{(parseFloat(line.price || line.subprice || 0) * parseInt(line.qty || line.cant || 1) * (1 - parseFloat(line.discount || line.remise_percent || 0) / 100)).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Totales */}
                    <div className="border-t border-gray-300 pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-medium text-gray-700">Total del Documento</span>
                        <span className="text-2xl font-bold text-green-600">
                          Q{parseFloat(currentDocument.total_ttc || currentDocument.total || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📄</div>
                    <p>No hay líneas de productos disponibles</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer con Acciones */}
        <div className="border-t bg-gray-50 px-6 py-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="flex gap-3">
              <button 
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Cerrar
              </button>
              
              <button 
                onClick={() => onPrint(currentDocument, documentType)}
                className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <span>🖨️</span>
                Imprimir
              </button>
            </div>
            
            {/* Botón especial para facturar cotizaciones */}
            {isCotizacion && (
              <button 
                onClick={() => onInvoiceCotizacion(currentDocument)}
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-md hover:from-green-700 hover:to-emerald-700 transition-all flex items-center gap-2 font-medium"
              >
                <span>💰</span>
                Facturar Cotización
              </button>
            )}
          </div>
          
          {isCotizacion && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>💡 Tip:</strong> Puede facturar esta cotización para convertirla en una factura editable donde podrá modificar productos, cantidades y procesar el pago.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentDetailsModal;