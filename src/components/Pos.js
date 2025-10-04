import React, { useState, useEffect } from 'react';
import Alert from './Alert';
import CustomFields from './CustomFields';
import PrintTicket from './PrintTicket';
import DocumentDetailsModal from './pos/modals/DocumentDetailsModal';
import PrintComanda from './PrintComanda';

// Componentes de Restaurante - Sistema Visual
import RestaurantVisualLayout from './pos/RestaurantVisualLayout';
import RestaurantStats from './pos/RestaurantStats';
import TableModal from './pos/modals/TableModal';


// Componentes nuevos del sistema
import RestaurantSetupModal from './pos/modals/RestaurantSetupModal';
import RestaurantDiagnostic from './pos/RestaurantDiagnostic';
import RestaurantErrorHandler, { RestaurantSystemStatus } from './pos/RestaurantErrorHandler';
import RestaurantAdminModal from './pos/modals/RestaurantAdminModal';


// Hooks personalizados
import { usePosData } from './pos/hooks/usePosData';
import { useProducts } from './pos/hooks/useProducts';
import { useCustomers } from './pos/hooks/useCustomers';
import { usePayments } from './pos/hooks/usePayments';
import { useMesas } from './pos/hooks/useMesas';

// Componentes POS Normal
import TopBar from './pos/TopBar';
import CustomerPanel from './pos/CustomerPanel';
import CartTable from './pos/CartTable';
import ProductSearch from './pos/ProductSearch';
import PaymentModal from './pos/modals/PaymentModal';
import CustomerModal from './pos/modals/CustomerModal';
import SalesHistoryModal from './pos/modals/SalesHistoryModal';
import SuspendedTicketsModal from './pos/modals/SuspendedTicketsModal';

// Servicios y utilidades
import { posAPI, createTicketData, createPrintTicketData } from './pos/posAPI';
import { 
  validateStockForCart, 
  handleTipoVentaChange as utilHandleTipoVentaChange,
  handleAddProduct as utilHandleAddProduct,
  handleQuantityChange as utilHandleQuantityChange,
  handleDiscountChange as utilHandleDiscountChange,
  handleSubtotalChange as utilHandleSubtotalChange,
  resetSale,
  processExtraFields
} from './pos/posUtils';

// Handlers de tickets
import { 
  handleSelectHistoryItem as utilHandleSelectHistoryItem,
  handleEditTicket as utilHandleEditTicket,
  handlePrintTicket as utilHandlePrintTicket,
  handleSuspendWithReplace,
  handleReactivateSuspendedTicket,
  validateSuspendedTicketChanges,
  debugSuspendedTicket
} from './pos/ticketHandlers';

const Pos = ({ terminal }) => {
  // Hook para detectar si es móvil
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Hooks personalizados
  const posData = usePosData(terminal);
  const products = useProducts(posData.variables, terminal, posData.selectedCustomerDetails, posData.tipoVenta);
  const customers = useCustomers(posData.variables);
  const payments = usePayments(posData.calculateTotal);
  const mesas = useMesas(posData.variables, terminal);

  // Detectar modo restaurante
  const isRestaurantMode = posData.variables?.SPOS_RESTAURANTE === "1";

  // Estados adicionales
  const [shippingAddress, setShippingAddress] = useState('Nivel 1');
  const [suspendedTickets, setSuspendedTickets] = useState([]);
  const [activeTab, setActiveTab] = useState("Cotizaciones");
  const [salesData, setSalesData] = useState({ cotizaciones: [], pedidos: [], facturas: [] });
  const [searchTerm, setSearchTerm] = useState('');

  const [isDocumentDetailsModalOpen, setIsDocumentDetailsModalOpen] = useState(false);
  const [selectedDocumentDetails, setSelectedDocumentDetails] = useState(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState(null);

  // Estados para comandas del restaurante
   const [showComanda, setShowComanda] = useState(false);
  const [comandaData, setComandaData] = useState(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  // Estados para vista de estadísticas del restaurante
  const [showRestaurantStats, setShowRestaurantStats] = useState(false);

  // ============================================================================
  // EFECTOS PARA MANEJO DEL SETUP INICIAL
  // ============================================================================

  // Verificar si se necesita mostrar el modal de setup
  useEffect(() => {
    if (isRestaurantMode && mesas.needsSetup && !mesas.isLoading && !showSetupModal) {
      console.log('🔧 Setup requerido - mostrando modal de configuración inicial');
      setShowSetupModal(true);
    }
  }, [isRestaurantMode, mesas.needsSetup, mesas.isLoading, showSetupModal]);

  

  // ============================================================================
  // FUNCIONES ESPECÍFICAS DEL RESTAURANTE VISUAL
  // ============================================================================

  // Manejar clic en mesa del croquis visual
  const handleMesaClick = async (mesaConfig, mesaData, estado) => {
    console.log('🍽️ Clic en mesa:', mesaConfig.numero, 'Estado:', estado);

    try {
      if (estado === 'LIBRE') {
        // Abrir mesa nueva
        const result = await mesas.abrirMesa(mesaConfig.numero);
        if (result.success) {
          console.log('✅ Mesa abierta exitosamente');
          posData.setAlert({
            show: true,
            type: 'success',
            message: `Mesa ${mesaConfig.numero} abierta exitosamente`
          });
          // Recargar estado de mesas
          await mesas.loadMesasEstado();
        } else {
          posData.setAlert({
            show: true,
            type: 'error',
            message: `Error abriendo mesa: ${result.error}`
          });
        }
      } else {
        // Abrir modal de mesa existente con datos operativos
        const mesaParaModal = {
          ...mesaConfig,
          ...mesaData,
          estado: estado
        };
        mesas.selectMesa(mesaParaModal);
      }
    } catch (error) {
      console.error('❌ Error en clic de mesa:', error);
      posData.setAlert({
        show: true,
        type: 'error',
        message: 'Error procesando operación de mesa: ' + error.message
      });
    }
  };


    const handleCreateInitialLayout = async (layoutData) => {
    try {
      console.log('🎬 Creando layout inicial desde componente Pos:', layoutData);
      
      const result = await mesas.createInitialLayout(layoutData);
      
      if (result.success) {
        posData.setAlert({
          show: true,
          type: 'success',
          message: 'Layout del restaurante creado exitosamente. ¡Bienvenido al sistema!'
        });
        setShowSetupModal(false);
      } else {
        posData.setAlert({
          show: true,
          type: 'error',
          message: `Error creando layout: ${result.error}`
        });
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error en handleCreateInitialLayout:', error);
      return { success: false, error: error.message };
    }
  };


  // Agregar producto a mesa
  const handleAgregarProductoAMesa = async (mesaId, producto) => {
    try {
      console.log('➕ Agregando producto a mesa:', mesaId, producto);
      
      const result = await mesas.agregarProductoAMesa(mesaId, producto);
      if (result.success) {
        posData.setAlert({
          show: true,
          type: 'success',
          message: 'Producto agregado a la mesa exitosamente'
        });
        
        // Recargar estado de mesas
        await mesas.loadMesasEstado();
        
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Error agregando producto a mesa:', error);
      posData.setAlert({
        show: true,
        type: 'error',
        message: 'Error agregando producto a la mesa: ' + error.message
      });
      return { success: false, error: error.message };
    }
  };

  // Procesar pago de mesa
  const handleProcesarPagoMesa = async (mesa, productos, cliente) => {
    try {
      console.log('💳 Procesando pago de mesa:', mesa.numero);
      
      // Preparar datos como si fuera un carrito normal
      const cartData = productos.map(product => ({
        id: product.id || product.fk_product,
        ref: product.ref || product.product_ref,
        name: product.name || product.label || product.desc,
        price: parseFloat(product.price || product.subprice || 0),
        quantity: parseInt(product.quantity || product.qty || 1),
        discount: parseFloat(product.discount || product.remise_percent || 0),
        note: product.note || product.description || '',
        total: parseFloat(product.total || 0)
      }));

      // Establecer datos temporalmente para usar el sistema de facturación existente
      posData.setCart(cartData);
      
      // Configurar cliente
      const clienteData = {
        id: cliente?.id || 1,
        name: cliente?.name || cliente || `Cliente Mesa ${mesa.numero}`,
        nit: cliente?.nit || 'CF',
        direccion: cliente?.direccion || '',
        telefono: cliente?.telefono || '',
        email: cliente?.email || ''
      };
      
      posData.setSelectedCustomerDetails(clienteData);
      posData.setSelectedCustomer(clienteData.name);
      posData.setTipoVenta('Factura');
      posData.setGeneralNotes(`Mesa ${mesa.numero} - ${mesa.nombre || mesa.numero}`);

      // Configurar mesa como ticket seleccionado para referencia
      posData.setSelectedTicket({
        id: mesa.proposalId || mesa.id,
        type: 99, // Tipo mesa
        mesa_numero: mesa.numero,
        mesa_nombre: mesa.nombre,
        isFromMesa: true
      });

      // Abrir modal de pagos
      posData.setIsPaymentModalOpen(true);

      // Cerrar modal de mesa
      mesas.setIsMesaModalOpen(false);
      
    } catch (error) {
      console.error('❌ Error procesando pago de mesa:', error);
      posData.setAlert({
        show: true,
        type: 'error',
        message: 'Error procesando pago de mesa: ' + error.message
      });
    }
  };

  // Imprimir comanda de mesa
  const handleImprimirComandaMesa = (mesa, productos) => {
    console.log('🖨️ Imprimiendo comanda de mesa:', mesa.numero);
    
    // Crear datos de comanda para cocina
    const comandaData = {
      type: 'Comanda',
      mesa: mesa.numero,
      nombreMesa: mesa.nombre,
      productos: productos,
      fecha: new Date().toISOString(),
      mesero: posData.user?.name || 'Mesero',
      notas: mesa.notas || ''
    };

    // Mostrar comanda para impresión
    setComandaData(comandaData);
    setShowComanda(true);
  };

  // Cerrar mesa
  const handleCerrarMesa = async (mesa) => {
    try {
      console.log('🔒 Cerrando mesa:', mesa.numero);
      
      const result = await mesas.cerrarMesa(mesa);
      if (result.success) {
        posData.setAlert({
          show: true,
          type: 'success',
          message: `Mesa ${mesa.numero} cerrada exitosamente`
        });
        
        // Cerrar modal y recargar estado
        mesas.setIsMesaModalOpen(false);
        await mesas.loadMesasEstado();
      } else {
        posData.setAlert({
          show: true,
          type: 'error',
          message: `Error cerrando mesa: ${result.error}`
        });
      }
    } catch (error) {
      console.error('❌ Error cerrando mesa:', error);
      posData.setAlert({
        show: true,
        type: 'error',
        message: 'Error cerrando mesa: ' + error.message
      });
    }
  };

  // ============================================================================
  // FUNCIONES ORIGINALES DEL POS (MANTENIDAS)
  // ============================================================================

  const handleViewDetails = (document, documentType) => {
    console.log('👁️ Viendo detalles de documento:', document.ref, 'tipo:', documentType);
    
    setSelectedDocumentDetails(document);
    setSelectedDocumentType(documentType);
    setIsDocumentDetailsModalOpen(true);
    
    // Cerrar modal de historial
    posData.setIsSalesHistoryModalOpen(false);
  };

  // Facturar cotización
  const handleInvoiceCotizacion = async (cotizacion) => {
    try {
      console.log('💰 Facturando cotización:', cotizacion.ref);
      
      // Cerrar modales
      posData.setIsSalesHistoryModalOpen(false);
      setIsDocumentDetailsModalOpen(false);
      
      // Mostrar mensaje informativo
      posData.setAlert({
        show: true,
        type: 'info',
        message: 'Cargando cotización para facturación...'
      });
      
      // Cargar documento completo con líneas
      console.log('📋 Obteniendo documento completo con líneas...');
      
      let completeDocument = cotizacion;
      
      // Si el documento no tiene líneas, obtenerlas de la API
      if (!cotizacion.lines || cotizacion.lines.length === 0) {
        try {
          const API_BASE_URL = `${posData.variables.SPOS_URL}/api/index.php`;
          const headers = {
            'DOLAPIKEY': posData.variables.DOLIBARR_API_KEY || posData.variables.dolibarrToken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          };
          
          console.log('🌐 Consultando propuesta completa:', `${API_BASE_URL}/proposals/${cotizacion.id}`);
          
          const response = await fetch(`${API_BASE_URL}/proposals/${cotizacion.id}`, {
            method: 'GET',
            headers: headers
          });
          
          if (response.ok) {
            const fullProposal = await response.json();
            console.log('✅ Propuesta completa obtenida:', fullProposal);
            
            // Usar la propuesta completa con líneas
            completeDocument = {
              ...cotizacion,
              ...fullProposal,
              lines: fullProposal.lines || []
            };
            
            console.log('📦 Líneas cargadas:', completeDocument.lines?.length || 0);
          } else {
            console.warn('⚠️ No se pudieron cargar las líneas, usando documento original');
          }
        } catch (error) {
          console.warn('⚠️ Error cargando líneas:', error.message);
        }
      }
      
      // Limpiar estado actual
      posData.setSelectedTicket(null);
      posData.setCart([]);
      posData.setGeneralNotes('');
      posData.setExtraFields({});
      
      // Cargar datos del cliente
      const customerId = completeDocument.socid || completeDocument.customerId || 1;
      console.log('👤 ID del cliente:', customerId);
      
      if (customerId && customerId !== 1) {
        try {
          // Obtener datos completos del cliente
          const customerResponse = await fetch(`${posData.variables.SPOS_URL}/api/index.php/thirdparties/${customerId}`, {
            method: 'GET',
            headers: {
              'DOLAPIKEY': posData.variables.DOLIBARR_API_KEY || posData.variables.dolibarrToken,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });
          
          if (customerResponse.ok) {
            const customerData = await customerResponse.json();
            console.log('✅ Datos del cliente obtenidos:', customerData);
            
            // Establecer datos del cliente en el estado
            const customerDetails = {
              id: customerData.id,
              name: customerData.name || customerData.nom,
              nit: customerData.idprof1 || customerData.siren || 'CF',
              direccion: customerData.address || customerData.adresse || '',
              telefono: customerData.phone || customerData.tel || '',
              email: customerData.email || '',
              remise: parseFloat(customerData.remise_percent) || 0
            };
            
            posData.setSelectedCustomerDetails(customerDetails);
            posData.setSelectedCustomer(customerDetails.name);
            
            // Solo establecer valores de campos si existen los setters
            if (posData.setNitValue) posData.setNitValue(customerDetails.nit);
            if (posData.setNombreValue) posData.setNombreValue(customerDetails.name);
            if (posData.setDireccionValue) posData.setDireccionValue(customerDetails.direccion);
            if (posData.setTelefonoValue) posData.setTelefonoValue(customerDetails.telefono);
            if (posData.setEmailValue) posData.setEmailValue(customerDetails.email);
            
            console.log('✅ Cliente establecido:', customerDetails.name);
          }
        } catch (error) {
          console.warn('⚠️ Error cargando cliente:', error.message);
          // Usar cliente genérico como fallback
          posData.setSelectedCustomerDetails({ id: 1, name: 'Cliente Final', nit: 'CF' });
          posData.setSelectedCustomer('Cliente Final');
        }
      } else {
        // Cliente genérico
        posData.setSelectedCustomerDetails({ id: 1, name: 'Cliente Final', nit: 'CF' });
        posData.setSelectedCustomer('Cliente Final');
      }
      
      // Cargar líneas al carrito
      let finalCart = [];
      if (completeDocument.lines && completeDocument.lines.length > 0) {
        console.log('📦 Cargando líneas al carrito...');
        
        const cartItems = completeDocument.lines.map((line, index) => ({
          id: line.fk_product || line.product_id || 0,
          idLine: line.id || line.rowid || 0,
          ref: line.product_ref || line.ref || '',
          name: line.label || line.desc || line.description || `Producto ${index + 1}`,
          price: parseFloat(line.subprice || line.price || 0),
          quantity: parseInt(line.qty || 1),
          discount: parseFloat(line.remise_percent || 0),
          note: line.description || line.note || '',
          total: parseFloat(line.total_ttc || line.total_ht || 0)
        }));
        
        finalCart = cartItems;
        posData.setCart(cartItems);
        console.log('✅ Carrito cargado con', cartItems.length, 'productos');
      } else {
        console.warn('⚠️ No se encontraron líneas en la cotización');
        posData.setCart([]);
      }
      
      // Establecer datos del documento
      posData.setSelectedTicket({
        ...completeDocument,
        isEditingMode: true,
        originalType: 0, // Era cotización
        type: 0
      });
      
      // Cargar notas
      const notes = completeDocument.note_private || completeDocument.note_public || '';
      posData.setGeneralNotes(notes);
      
      // Cambiar a modo factura y validar stock
      setTimeout(async () => {
        console.log('🔄 Cambiando automáticamente a tipo Factura');
        posData.setTipoVenta('Factura');
        posData.setIsEditable(true);
        
        // Validación de stock después de cambiar a factura
        if (posData.variables.SPOS_VALIDARSTOCK === "1" && finalCart.length > 0) {
          console.log('🔍 Validando stock del carrito después de conversión a factura...');
          
          try {
            await validateStockForCart(
              finalCart,           // cart
              posData.variables,   // variables
              terminal,            // terminal
              posData.setCart,     // setCart
              posData.setAlert     // setAlert
            );
            
            console.log('✅ Validación de stock completada exitosamente después de conversión');
            
            // Mensaje de éxito DESPUÉS de la validación
            posData.setAlert({
              show: true,
              type: 'success',
              message: `Cotización ${completeDocument.ref} cargada para facturación. Stock validado. Puede modificar productos y proceder al pago.`
            });
            
          } catch (stockError) {
            console.error('❌ Error validando stock después de conversión:', stockError);
            posData.setAlert({
              show: true,
              type: 'warning',
              message: `Cotización ${completeDocument.ref} cargada, pero hay problemas de stock: ${stockError.message}`
            });
          }
        } else {
          // Si no hay validación de stock, mostrar mensaje normal
          posData.setAlert({
            show: true,
            type: 'success',
            message: `Cotización ${completeDocument.ref} cargada para facturación. Puede modificar productos y proceder al pago.`
          });
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error facturando cotización:', error);
      posData.setAlert({
        show: true,
        type: 'error',
        message: 'Error cargando cotización para facturación: ' + error.message
      });
    }
  };

  // Función para cerrar modal de detalles
  const handleCloseDocumentDetails = () => {
    setIsDocumentDetailsModalOpen(false);
    setSelectedDocumentDetails(null);
    setSelectedDocumentType(null);
  };

  // Función para imprimir desde modal de detalles
  const handlePrintFromDetails = (document, documentType) => {
    console.log('🖨️ Imprimiendo desde detalles:', document.ref);
    
    // Cerrar modal de detalles
    handleCloseDocumentDetails();
    
    // Usar la función existente de impresión
    handlePrintTicket(document, documentType);
  };

  // Función para facturar desde modal de detalles
  const handleInvoiceFromDetails = (document) => {
    console.log('💰 Facturando desde detalles:', document.ref);
    
    // Cerrar modal de detalles
    handleCloseDocumentDetails();
    
    // Usar la función de facturar cotización
    handleInvoiceCotizacion(document);
  };

  // Handlers principales
  const handleTipoVentaChange = async (e) => {
    const selectedTipo = e.target.value;
    
    console.log('🔄 Cambiando tipo de venta a:', selectedTipo);
    
    await utilHandleTipoVentaChange(
      selectedTipo,
      posData.setTipoVenta,
      posData.setIsEditable,
      posData.cart,
      posData.setCart,
      posData.variables
    );

    // Validar stock al cambiar a factura
    if (selectedTipo === "Factura" && posData.variables.SPOS_VALIDARSTOCK === "1") {
      console.log('🔍 Validando stock del carrito al cambiar a Factura...');
      
      try {
        await validateStockForCart(
          posData.cart,          // cart
          posData.variables,     // variables 
          terminal,              // terminal
          posData.setCart,       // setCart
          posData.setAlert       // setAlert
        );
        
        console.log('✅ Validación de stock completada exitosamente');
      } catch (error) {
        console.error('❌ Error validando stock:', error);
        posData.setAlert({
          show: true,
          type: 'error',
          message: 'Error al validar el stock del carrito'
        });
      }
    }
  };

  const handleAddProduct = async (product) => {
    if (!posData.isEditable) return;

    await utilHandleAddProduct(
      product,
      posData.cart,
      posData.setCart,
      posData.setAlert,
      posData.tipoVenta,
      posData.variables,
      terminal,
      posData.customerDiscount
    );
  };

  const handleProductSelect = (product) => {
    handleAddProduct(product);
    products.setProductSearch('');
    products.setShowProductSuggestions(false);
  };

  const handleQuantityChange = async (index, newQuantity) => {
    await utilHandleQuantityChange(
      index,
      newQuantity,
      posData.cart,
      posData.setCart,
      posData.setAlert,
      posData.tipoVenta,
      posData.variables,
      terminal
    );
  };

  const handleDiscountChange = async (index, newDiscount) => {
    await utilHandleDiscountChange(
      index,
      newDiscount,
      posData.cart,
      posData.setCart,
      posData.setAlert,
      posData.variables,
      terminal,
      posData.selectedCustomerDetails,
      posData.tipoVenta
    );
  };

  const handleSubtotalChange = async (index, newSubtotal) => {
    await utilHandleSubtotalChange(
      index,
      newSubtotal,
      posData.cart,
      posData.setCart,
      posData.setAlert,
      posData.variables,
      terminal,
      posData.selectedCustomerDetails,
      posData.tipoVenta
    );
  };

  const handleRemoveProduct = (index) => {
    const newCart = posData.cart.filter((_, i) => i !== index);
    posData.setCart(newCart);
  };

  const handleNoteChange = (index, value) => {
    const updatedCart = [...posData.cart];
    updatedCart[index].note = value;
    posData.setCart(updatedCart);
  };

  // Handlers de cliente
  const handleCustomerSearchChange = (e) => {
    customers.setCustomerSearch(e.target.value);
    customers.setIsCustomerSearchFocused(true);
    posData.setSelectedCustomerDetails(null);
  };

  const handleNitChange = (e) => {
    const value = e.target.value;
    posData.setNitValue(value);
    
    if (value.length > 5) {
      customers.validateNit(value)
        .then(data => {
          posData.setNombreValue(data.nombre);
          posData.setDireccionValue(data.direccion);
          posData.setAlert({ show: true, type: 'success', message: 'Cliente encontrado y cargado.' });
        })
        .catch(error => {
          posData.setAlert({ show: true, type: 'error', message: error.message });
        });
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    
    try {
      posData.setIsLoading(true);
      
      const customerData = {
        nit: posData.nitValue,
        nombre: posData.nombreValue,
        direccion: posData.direccionValue,
        telefono: posData.telefonoValue,
        email: posData.emailValue
      };

      const result = await customers.createCustomer(customerData, posData.userId);
      
      posData.setSelectedCustomer(result.customer);
      posData.setAlert({ show: true, type: 'success', message: 'Cliente creado correctamente.' });
      
      setTimeout(() => {
        posData.setAlert({ show: false });
        posData.setIsModalOpen(false);
      }, 3000);
      
    } catch (error) {
      posData.setAlert({ show: true, type: 'error', message: error.message });
      setTimeout(() => posData.setAlert({ show: false }), 3000);
    } finally {
      posData.setIsLoading(false);
    }
  };

  // Handlers de guardado
  const handleSaveCotizacion = async () => {
    try {
      if (posData.cart.length === 0) {
        posData.setAlert({ show: true, type: 'error', message: 'Debe agregar al menos un artículo al carrito antes de guardar la cotización.' });
        return;
      }

      const customerId = posData.selectedCustomerDetails?.id || '1';
      const ticketId = posData.selectedTicket?.id || 0;

      const data = createTicketData({
        ticketId,
        cart: posData.cart,
        terminal,
        tipoVenta: posData.tipoVenta,
        selectedTicket: posData.selectedTicket,
        customerDiscount: posData.customerDiscount,
        customerId,
        userId: posData.userId,
        generalNotes: posData.generalNotes,
        selectedCategory: posData.selectedCategory,
        isFel: posData.isFel,
        extraFields: posData.extraFields,
        calculateTotal: posData.calculateTotal,
        mode: 1
      });

      const result = await posAPI.saveTicket(posData.variables, data);
      
      if (result.error && result.error.value === 0) {
        await posAPI.saveExtraFields(posData.variables, result.data.id, posData.extraFields, 0);

        const ticketData = createPrintTicketData({
          terminal,
          documentType: 'Cotización',
          ref: result.data.ref,
          selectedCustomer: posData.selectedCustomer,
          selectedCustomerDetails: posData.selectedCustomerDetails,
          cart: posData.cart,
          calculateSubtotal: posData.calculateSubtotal,
          calculateDiscount: posData.calculateDiscount,
          calculateTotal: posData.calculateTotal,
          vendors: posData.vendors,
          selectedCategory: posData.selectedCategory,
          generalNotes: posData.generalNotes,
          extraFields: posData.extraFields
        });

        posData.setTicketData(ticketData);
        posData.setShowTicket(true);
        posData.setAlert({ show: true, type: 'success', message: 'Cotización guardada correctamente.' });

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

      } else {
        posData.setAlert({ show: true, type: 'error', message: 'Error al guardar la cotización.' });
      }
    } catch (error) {
      posData.setAlert({ show: true, type: 'error', message: 'Error al guardar la cotización.' });
      console.error('Error al guardar la cotización:', error);
    }
  };


// ============================================================================
// FUNCIÓN handleSaveFactura MEJORADA - REEMPLAZAR EN Pos.js
// ============================================================================
// Esta función debe reemplazar la función handleSaveFactura existente en Pos.js

const handleSaveFactura = async () => {
  console.log('💾 Iniciando proceso de guardado de factura CON PAGOS REALES...');
  
  // Validaciones previas existentes
  if (!isRestaurantMode && !posData.selectedCategory) {
    console.log('❌ Validación falló: No hay vendedor seleccionado');
    posData.setAlert({ 
      show: true, 
      type: 'error', 
      message: 'Seleccione un vendedor antes de guardar.' 
    });
    return;
  }
  
  if (posData.cart.length === 0) {
    console.log('❌ Validación falló: Carrito vacío');
    posData.setAlert({ 
      show: true, 
      type: 'error', 
      message: 'Debe agregar al menos un artículo al carrito antes de guardar la factura.' 
    });
    return;
  }

  // Validación de stock - Solo en modo POS normal
  if (!isRestaurantMode && posData.variables.SPOS_VALIDARSTOCK === "1") {
    console.log('🔍 Validación final de stock antes de guardar factura...');
    
    const stockValid = await validateCartStock();
    if (!stockValid) {
      console.log('❌ Validación de stock falló, cancelando guardado');
      return;
    }
    
    console.log('✅ Stock validado, procediendo con guardado');
  } else {
    console.log('🔍 Validación de stock deshabilitada o modo restaurante, procediendo con guardado');
  }

  // Preparación de datos
  try {
    const customerId = posData.selectedCustomerDetails?.id || '1';
    
    // Detección de ticket suspendido convertido a factura
    const isConvertingFromSuspended = posData.selectedTicket && 
      (posData.selectedTicket.type === 4 || posData.selectedTicket.isEditingMode);
      
    // Detección de factura desde mesa de restaurante
    const isFromMesa = posData.selectedTicket?.isFromMesa;

    console.log('📋 Contexto de factura:', {
      isRestaurantMode,
      customerId,
      isConvertingFromSuspended,
      isFromMesa,
      cartItems: posData.cart.length,
      totalAmount: payments.total,
      paymentsCount: payments.payments.length,
      paymentsSummary: payments.getPaymentSummary()
    });

    // Lógica para ticketId
    let ticketId = 0; // Default para nuevas facturas
    
    if (posData.selectedTicket && !isConvertingFromSuspended && !isFromMesa) {
      // Solo usar ID existente si NO es un ticket suspendido NI desde mesa
      ticketId = posData.selectedTicket.id;
    }
    
    // Si estamos convirtiendo un suspendido o desde mesa, SIEMPRE usar 0 para crear nueva factura
    if (isConvertingFromSuspended || isFromMesa) {
      console.log('🔄 Detectado conversión de ticket suspendido/mesa a factura - forzando creación nueva');
      ticketId = 0;
    }

    // Preparar selectedTicket para nueva factura
    let selectedTicketForCreation = null;
    
    if (!isConvertingFromSuspended && !isFromMesa && posData.selectedTicket) {
      // Solo pasar selectedTicket si NO es suspendido NI desde mesa
      selectedTicketForCreation = posData.selectedTicket;
    }
    
    // Si es suspendido o desde mesa, no pasar selectedTicket para forzar creación nueva
    if (isConvertingFromSuspended || isFromMesa) {
      console.log('🔄 No pasando selectedTicket para forzar creación de nueva factura');
      selectedTicketForCreation = null;
    }

    // Preparar datos de factura usando createTicketData existente
    const data = createTicketData({
      ticketId,
      cart: posData.cart,
      terminal,
      tipoVenta: posData.tipoVenta,
      selectedTicket: selectedTicketForCreation,
      customerDiscount: posData.customerDiscount,
      customerId,
      selectedCustomerDetails: posData.selectedCustomerDetails,
      userId: posData.userId,
      generalNotes: posData.generalNotes,
      selectedCategory: isRestaurantMode ? (posData.selectedCategory || 1) : posData.selectedCategory,
      isFel: posData.isFel,
      extraFields: posData.extraFields,
      calculateTotal: posData.calculateTotal,
      payments: payments.payments,
      mode: 2 // Modo factura
    });

    console.log('📦 Datos de factura preparados:', {
      dataId: data.id,
      dataCustomerId: data.customerId,
      dataTotal: data.total,
      dataLines: data.lines?.length || 0,
      dataPayments: payments.payments?.length || 0,
      isNewFactura: data.id === 0,
      isRestaurantMode,
      isFromMesa
    });

    // 🔥 FLUJO MEJORADO PARA PAGOS MÚLTIPLES
    console.log('🚀 INICIANDO FLUJO COMPLETO CON PAGOS REALES...');
    
    let result;
    
    if (isRestaurantMode && payments.payments.length > 0) {
      // 🍽️ MODO RESTAURANTE CON PAGOS - Usar función especial
      console.log('🍽️ Procesando factura de restaurante con pagos...');
      result = await payments.processCompleteInvoiceWithPayments(data);
      
    } else if (payments.payments.length > 0) {
      // 💳 MODO POS NORMAL CON PAGOS - Nuevo flujo mejorado
      console.log('💳 Procesando factura POS con pagos múltiples...');
      
      // Paso 1: Crear factura
      const { saveTicket } = await import('./pos/posAPI');
      const invoiceResult = await saveTicket(posData.variables, data);
      
      if (invoiceResult.error && invoiceResult.error.value === 0) {
        const invoiceId = invoiceResult.data?.id;
        console.log('✅ Factura creada con ID:', invoiceId);
        
        // 🔥 Paso 2: Procesar pagos múltiples usando el nuevo endpoint
        const paymentResult = await payments.processRealPayments(invoiceId);
        
        result = {
          success: paymentResult.success,
          invoice: {
            id: invoiceId,
            ref: invoiceResult.data?.ref || `FACT-${invoiceId}`
          },
          payments: paymentResult,
          error: invoiceResult.error
        };
      } else {
        throw new Error(invoiceResult.error?.message || 'Error creando factura');
      }
      
    } else {
      // 📄 SIN PAGOS - Flujo original
      console.log('📄 Creando factura sin pagos...');
      const { saveTicket } = await import('./pos/posAPI');
      const invoiceResult = await saveTicket(posData.variables, data);
      
      result = {
        success: invoiceResult.error && invoiceResult.error.value === 0,
        invoice: {
          id: invoiceResult.data?.id,
          ref: invoiceResult.data?.ref
        },
        error: invoiceResult.error
      };
    }

    console.log('📡 Resultado del proceso completo:', result);
    
    // Verificar resultado exitoso
    if (result.success) {
      console.log('✅ PROCESO COMPLETO EXITOSO');
      
      // Manejo de tickets suspendidos convertidos
      if (isConvertingFromSuspended && posData.selectedTicket?.id) {
        console.log('🗑️ Eliminando proposal original después de conversión exitosa:', posData.selectedTicket.id);
        
        try {
          const { deleteSuspendedTicket } = await import('./pos/ticketHandlers');
          const deleteResult = await deleteSuspendedTicket(posData.variables, posData.selectedTicket.id);
          
          if (deleteResult.success) {
            console.log('✅ Proposal original eliminado exitosamente');
          } else {
            console.warn('⚠️ No se pudo eliminar proposal original:', deleteResult.error);
          }
        } catch (deleteError) {
          console.warn('⚠️ Error eliminando proposal original:', deleteError.message);
        }
      }
      
      // Manejo de mesas de restaurante
      if (isFromMesa && posData.selectedTicket?.id) {
        console.log('🗑️ Eliminando proposal de mesa después de facturación exitosa:', posData.selectedTicket.id);
        
        try {
          const { deleteSuspendedTicket } = await import('./pos/ticketHandlers');
          const deleteResult = await deleteSuspendedTicket(posData.variables, posData.selectedTicket.id);
          
          if (deleteResult.success) {
            console.log('✅ Proposal de mesa eliminado exitosamente');
            
            // Actualizar estado de mesa si es necesario
            if (mesas?.refreshMesas) {
              await mesas.refreshMesas();
            }
          }
        } catch (deleteError) {
          console.warn('⚠️ Error eliminando proposal de mesa:', deleteError.message);
        }
      }

      // 🔥 MENSAJE DE ÉXITO MEJORADO PARA PAGOS MÚLTIPLES
      let successMessage = 'Factura guardada exitosamente';
      
      if (result.payments?.success) {
        const summary = payments.getPaymentSummary();
        successMessage = `Factura creada y ${summary.paymentCount} pago(s) registrado(s) correctamente`;
        
        if (summary.isComplete) {
          successMessage += ' - PAGO COMPLETO';
        }
      } else if (result.payments && !result.payments.success) {
        successMessage = 'Factura creada - Revisar estado de pagos';
      }

      posData.setAlert({ 
        show: true, 
        type: 'success', 
        message: successMessage
      });

      // Mostrar ticket de impresión
      console.log('🖨️ Preparando ticket de impresión...');
      posData.setShowTicket(true);

      // Cerrar modal de pagos
      posData.setIsPaymentModalOpen(false);

      // Reiniciar venta después de un breve delay
      setTimeout(() => {
        console.log('🔄 Reiniciando venta...');

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

      }, 1000);

    } else {
      // ❌ MANEJO DE ERRORES MEJORADO
      console.error('❌ Error en el proceso:', result.error);
      
      let errorMessage = 'Error al guardar la factura.';
      
      if (result.error?.message) {
        errorMessage = result.error.message;
      } else if (result.payments && !result.payments.success) {
        // 🔥 ERRORES ESPECÍFICOS DE PAGOS
        const failedPayments = result.payments.processedPayments?.filter(p => !p.success) || [];
        
        if (failedPayments.length > 0) {
          errorMessage = `Error en ${failedPayments.length} pago(s): `;
          errorMessage += failedPayments.map(p => 
            `${p.method} Q${p.amount.toFixed(2)}: ${p.error || 'Error desconocido'}`
          ).join(', ');
        } else {
          errorMessage = 'Error procesando pagos: ' + (result.payments.error || 'Error desconocido');
        }
      }
      
      posData.setAlert({ 
        show: true, 
        type: 'error', 
        message: errorMessage 
      });
    }
      
  } catch (error) {
    // Manejo de errores generales
    console.error('❌ Error general al guardar factura:', error);
    console.error('📊 Stack trace:', error.stack);
    
    // Determinar tipo de error para mensaje más específico
    let errorMessage = 'Error al guardar la factura.';
    
    if (error.message) {
      if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Error de conexión. Verifique su internet e intente nuevamente.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'La operación tardó demasiado. Intente nuevamente.';
      } else if (error.message.includes('stock')) {
        errorMessage = 'Error de stock: ' + error.message;
      } else if (error.message.includes('payment')) {
        // 🔥 ERRORES DE PAGOS MÚLTIPLES
        errorMessage = 'Error procesando pagos: ' + error.message;
      } else {
        errorMessage = `Error: ${error.message}`;
      }
    }
    
    posData.setAlert({ 
      show: true, 
      type: 'error', 
      message: errorMessage
    });
  }
};


// ============================================================================
// FUNCIÓN HELPER PARA PREPARAR DATOS DE FACTURA
// ============================================================================
const prepareInvoiceData = (params) => {
  const {
    cart,
    selectedCustomerDetails,
    customerDiscount,
    generalNotes,
    selectedTicket,
    isFel,
    extraFields,
    selectedCategory,
    clase,
    customerId,
    lines,
    total,
    user_author,
    entity,
    vendorId,
    calculateTotal,
    payments,
    mode
  } = params;

  return {
    id: selectedTicket?.id || 0,
    customerId: customerId,
    vendorId: vendorId,
    lines: lines,
    customerDiscount: customerDiscount,
    total: total,
    generalNotes: generalNotes,
    clase: clase,
    user_author: user_author,
    entity: entity,
    isFel: isFel,
    extraFields: extraFields,
    calculateTotal: calculateTotal,
    payments: payments,
    mode: mode
  };
};

  const MobileActionButtons = () => {
    if (!isMobile || isRestaurantMode) return null;

    const hasItems = posData.cart.length > 0;
    const hasVendor = posData.selectedCategory;
    const isLoading = posData.isLoading;
    const isFactura = posData.tipoVenta === 'Factura';

    // Determinar qué botón mostrar
    const buttonConfig = isFactura ? {
      text: '💳 Procesar Pago',
      action: () => {
        if (!hasItems) {
          posData.setAlert({ 
            show: true, 
            type: 'error', 
            message: 'Debe agregar al menos un artículo al carrito antes de realizar el pago.' 
          });
          return;
        }
        if (!hasVendor) {
          posData.setAlert({ 
            show: true, 
            type: 'error', 
            message: 'Seleccione un vendedor antes de continuar.' 
          });
          return;
        }
        posData.setIsPaymentModalOpen(true);
      },
      disabled: !hasItems || !hasVendor || isLoading,
      bgColor: 'bg-green-500 hover:bg-green-600',
      icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
    } : {
      text: '💾 Guardar Cotización',
      action: handleSaveCotizacion,
      disabled: !hasItems || isLoading,
      bgColor: 'bg-blue-500 hover:bg-blue-600',
      icon: "M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12"
    };

    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-[9999] safe-area-inset-bottom">
        <div className="p-4">
          <button 
            onClick={buttonConfig.action}
            disabled={buttonConfig.disabled}
            className={`w-full font-medium py-4 px-6 rounded-lg transition-colors flex items-center justify-center ${
              buttonConfig.disabled
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : `${buttonConfig.bgColor} text-white`
            }`}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={buttonConfig.icon} />
              </svg>
            )}
            {buttonConfig.text}
          </button>
        </div>
        <div className="h-safe-bottom" />
      </div>
    );
  };

  // Handlers de modales y otros
  const toggleMenu = () => {
    posData.setMenuOpen(!posData.menuOpen);
  };

  const handleLogout = () => {
    posData.logout();
    window.location.href = (`${posData.variables.SPOS_URL}/custom/build`);
  };

  const handleOpenCashClosureModal = async () => {
    try {
      const balance = await payments.getCashBalance(posData.variables, terminal);
      posData.setIsCashClosureModalOpen(true);
    } catch (error) {
      console.error('Error al obtener el saldo de efectivo:', error);
    }
  };

  const handleCashClosureSubmit = async () => {
    try {
      await payments.performCashClosure(
        posData.variables, 
        terminal, 
        posData.userId, 
        payments.closureAmount
      );
      
      posData.setAlert({
        show: true,
        type: 'success',
        message: 'Cierre de caja realizado exitosamente.'
      });
      
      await handleLogout();
      posData.setIsCashClosureModalOpen(false);
      payments.setClosureAmount('');
      
    } catch (error) {
      posData.setAlert({
        show: true,
        type: 'error',
        message: error.message
      });
    }
  };

  const handleCambioUsuario = () => {
    console.log('Cambio de Usuario');
  };

  // Handlers de tickets del historial y suspendidos
  const handleSelectHistoryItem = async (document) => {
    await utilHandleSelectHistoryItem(
      document,
      {
        setSelectedTicket: posData.setSelectedTicket,
        setSelectedCustomer: posData.setSelectedCustomer,
        setCustomerSearch: customers.setCustomerSearch,
        setIsCustomerSearchFocused: customers.setIsCustomerSearchFocused,
        setSelectedCustomerDetails: posData.setSelectedCustomerDetails,
        setGeneralNotes: posData.setGeneralNotes,
        setCart: posData.setCart,
        setTipoVenta: posData.setTipoVenta,
        setIsEditable: posData.setIsEditable,
        setIsFel: posData.setIsFel,
        setExtraFields: posData.setExtraFields,
        setIsSalesHistoryModalOpen: posData.setIsSalesHistoryModalOpen,
        setAlert: posData.setAlert
      },
      posData.variables,
      terminal,
      posData.vendors
    );
  };

  const handleEditTicket = async (ticket) => {
    try {
      console.log('✏️ Editando ticket suspendido:', ticket.id);
      
      // Debug del ticket antes de editar
      debugSuspendedTicket(ticket);
      
      // Preparar setters para la función
      const setters = {
        setSelectedTicket: posData.setSelectedTicket,
        setSelectedCustomer: posData.setSelectedCustomer,
        setCustomerSearch: customers.setCustomerSearch,
        setIsCustomerSearchFocused: customers.setIsCustomerSearchFocused,
        setSelectedCustomerDetails: posData.setSelectedCustomerDetails,
        setGeneralNotes: posData.setGeneralNotes,
        setCart: posData.setCart,
        setTipoVenta: posData.setTipoVenta,
        setIsFel: posData.setIsFel,
        setExtraFields: posData.setExtraFields,
        setIsSuspendedModalOpen: posData.setIsSuspendedModalOpen,
        // Campos del cliente
        setNitValue: posData.setNitValue,
        setNombreValue: posData.setNombreValue,
        setDireccionValue: posData.setDireccionValue,
        setTelefonoValue: posData.setTelefonoValue,
        setEmailValue: posData.setEmailValue,
        // Alertas
        setAlert: posData.setAlert
      };
      
      // Usar la función mejorada de ticketHandlers.js
      const result = await utilHandleEditTicket(ticket, setters, posData.variables, terminal);
      
      if (result.success) {
        console.log('✅ Ticket cargado para edición exitosamente');
      } else {
        console.error('❌ Error cargando ticket para edición:', result.error);
      }
      
    } catch (error) {
      console.error('❌ Error en handleEditTicket:', error);
      posData.setAlert({
        show: true,
        type: 'error',
        message: 'Error cargando ticket para edición: ' + error.message
      });
    }
  };

  const validateCartStock = async () => {
    if (posData.variables.SPOS_VALIDARSTOCK !== "1") {
      console.log('🔍 Validación de stock deshabilitada');
      return true;
    }

    if (posData.tipoVenta !== "Factura") {
      console.log('🔍 Validación de stock solo para facturas');
      return true;
    }

    if (posData.cart.length === 0) {
      console.log('🔍 Carrito vacío, no hay nada que validar');
      return true;
    }

    console.log('🔍 Iniciando validación manual de stock...');
    
    try {
      await validateStockForCart(
        posData.cart,
        posData.variables,
        terminal,
        posData.setCart,
        posData.setAlert
      );
      
      console.log('✅ Validación manual completada exitosamente');
      return true;
    } catch (error) {
      console.error('❌ Error en validación manual:', error);
      posData.setAlert({
        show: true,
        type: 'error',
        message: 'Error validando stock: ' + error.message
      });
      return false;
    }
  };

  const handleReactivateTicket = async (ticket, newType) => {
    try {
      console.log('🔄 Reactivando ticket:', ticket.id, 'como:', newType);
      
      // Usar la función mejorada
      const result = await handleReactivateSuspendedTicket(
        ticket, 
        newType, 
        posData, 
        posData.variables, 
        terminal
      );
      
      if (result.success) {
        posData.setAlert({ 
          show: true, 
          type: 'success', 
          message: `Ticket reactivado como ${newType} exitosamente (${result.newRef})` 
        });
        
        // Recargar lista de tickets suspendidos
        await handleOpenSuspendedModal();
      } else {
        posData.setAlert({ 
          show: true, 
          type: 'error', 
          message: result.error || 'Error reactivando ticket' 
        });
      }
    } catch (error) {
      console.error('Error reactivando ticket:', error);
      posData.setAlert({ 
        show: true, 
        type: 'error', 
        message: 'Error reactivando ticket: ' + error.message 
      });
    }
  };

  // Función para eliminar ticket suspendido
  const handleDeleteSuspendedTicket = async (ticket) => {
    try {
      console.log('🗑️ Eliminando ticket suspendido:', ticket.id);
      
      // Importar la función de eliminación de posAPI
      const { deleteSuspendedTicket } = await import('./pos/posAPI');
      
      const result = await deleteSuspendedTicket(posData.variables, ticket.id);
      
      if (result.success) {
        posData.setAlert({ 
          show: true, 
          type: 'success', 
          message: 'Ticket eliminado exitosamente' 
        });
        
        // Recargar lista de tickets suspendidos
        await handleOpenSuspendedModal();
      } else {
        posData.setAlert({ 
          show: true, 
          type: 'error', 
          message: result.error || 'Error eliminando ticket' 
        });
      }
    } catch (error) {
      console.error('Error eliminando ticket:', error);
      posData.setAlert({ 
        show: true, 
        type: 'error', 
        message: 'Error eliminando ticket: ' + error.message 
      });
    }
  };

  const handlePrintTicket = (item, documentType) => {
    utilHandlePrintTicket(
      item,
      documentType,
      terminal,
      posData.vendors,
      posData.setTicketData,
      posData.setShowTicket
    );
  };

  const handleOpenSalesHistoryModal = async () => {
    try {
      const data = await posAPI.getSalesHistory(posData.variables, terminal);
      setSalesData(data);
      posData.setIsSalesHistoryModalOpen(true);
    } catch (error) {
      console.error("Error fetching sales history:", error);
      posData.setAlert({
        show: true,
        type: 'error',
        message: 'Error cargando historial de ventas'
      });
    }
  };

  const handleOpenSuspendedModal = async () => {
    try {
      console.log('Abriendo modal de tickets suspendidos...');
      const tickets = await posAPI.getSuspendedTickets(posData.variables, terminal);
      console.log('Tickets suspendidos obtenidos:', tickets);
      setSuspendedTickets(tickets);
      posData.setIsSuspendedModalOpen(true);
    } catch (error) {
      console.error('Error al obtener los tickets suspendidos:', error);
      posData.setAlert({ show: true, type: 'error', message: 'Error al cargar tickets suspendidos' });
      setSuspendedTickets([]);
      posData.setIsSuspendedModalOpen(true);
    }
  };

  const handleSuspend = async () => {
    try {
      console.log('🔄 Suspendiendo ticket...');
      
      if (posData.cart.length === 0) {
        posData.setAlert({ 
          show: true, 
          type: 'error', 
          message: 'Debe agregar al menos un artículo al carrito antes de suspender.' 
        });
        return;
      }

      // Si estamos editando un ticket suspendido, mostrar resumen de cambios
      if (posData.selectedTicket?.type === 4 || posData.selectedTicket?.isEditingMode) {
        console.log('📋 Detectado ticket suspendido en edición, validando cambios...');
        
        const changes = validateSuspendedTicketChanges(
          posData.selectedTicket,
          posData.cart,
          posData.selectedCustomerDetails,
          posData.generalNotes
        );
        
        if (changes.hasChanges) {
          console.log('📊 Cambios detectados:', changes.details);
          
          // Mostrar confirmación de cambios
          const confirmMessage = `Se detectaron los siguientes cambios:\n${changes.details.join('\n')}\n\n¿Desea guardar estos cambios?`;
          
          if (!window.confirm(confirmMessage)) {
            return; // Usuario canceló
          }
        } else {
          console.log('ℹ️ No se detectaron cambios en el ticket');
          posData.setAlert({
            show: true,
            type: 'info',
            message: 'No se han realizado cambios en el ticket suspendido.'
          });
          return;
        }
      }

      // Usar la función mejorada que maneja el reemplazo automáticamente
      const result = await handleSuspendWithReplace(posData, products, customers, payments, terminal);
      
      if (result?.success) {
        console.log('✅ Suspensión completada exitosamente');
      }

    } catch (error) {
      console.error('❌ Error en handleSuspend:', error);
      posData.setAlert({ 
        show: true, 
        type: 'error', 
        message: 'Error al suspender el ticket: ' + error.message 
      });
    }
  };

  // Handlers para campos personalizados
  const handleCustomFieldChange = (fieldId, value) => {
    posData.setExtraFields((prevFields) => ({
      ...prevFields,
      [fieldId]: value,
    }));
  };

  const openCustomFieldsModal = () => {
    posData.setIsCustomFieldsModalOpen(true);
  };

  const closeCustomFieldsModal = () => {
    posData.setIsCustomFieldsModalOpen(false);
  };

  // Función para nueva venta
  const handleNewSale = () => {
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
  };

  // ============================================================================
  // RENDERIZADO DEL MODO RESTAURANTE VISUAL
  // ============================================================================
  
  const renderRestaurantMode = () => {
    // Si está cargando, mostrar loader
    if (mesas.isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Configurando restaurante...</h3>
          <p className="text-gray-500">Cargando configuración desde base de datos</p>
          <RestaurantSystemStatus mesasHook={mesas} compact={true} />
        </div>
      );
    }
    
    // Si no está configurado y no se está mostrando el modal, mostrar botón de configuración
    if (!mesas.isConfigured && !showSetupModal) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m-4 0H5m-4 0h4" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Restaurante no configurado</h3>
          <p className="text-gray-500 mb-4 text-center">Configure el layout de su restaurante para comenzar a usar el sistema de mesas</p>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowSetupModal(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Configurar Restaurante
            </button>
            
            <button
              onClick={() => setShowDiagnostic(true)}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-3 rounded-lg transition-colors flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Diagnóstico
            </button>
          </div>
          
          <RestaurantSystemStatus mesasHook={mesas} />
        </div>
      );
    }
    
    // Renderizado normal del restaurante cuando está configurado
    return (
      <div className="flex flex-col space-y-4 p-4">
        {/* Estadísticas del restaurante */}
        {showRestaurantStats && (
          <div className="mb-4">
            <RestaurantStats
              mesas={mesas.mesas}
              mesasConfig={mesas.mesasConfig}
              estadisticas={mesas.getEstadisticas()}
              variables={posData.variables}
              isLoading={mesas.isLoading}
            />
          </div>
        )}

        {/* Layout visual de mesas */}
        <RestaurantVisualLayout
          layoutConfig={mesas.layoutConfig}
          mesasConfig={mesas.mesasConfig}
          mesas={mesas.mesas}
          elementosDecorativos={mesas.elementosDecorativos}
          backgroundImage={mesas.backgroundImage}
          ESTADOS_MESA={mesas.ESTADOS_MESA}
          onMesaClick={handleMesaClick}
          onConfigClick={() => mesas.setIsConfigModalOpen(true)}
          onUploadImage={mesas.uploadBackgroundImage}
          onUpdateMesaPosition={mesas.updateMesaPosition}
          onCreateMesa={mesas.createMesa}
          onDeleteMesa={mesas.deleteMesa}
          estadisticas={mesas.getEstadisticas()}
          isEditorMode={mesas.isEditorMode}
          setIsEditorMode={mesas.setIsEditorMode}
          getNextMesaNumber={mesas.getNextMesaNumber}
          isLoading={mesas.isLoading}
        />




        {/* Modal de mesa individual */}
         <TableModal
  isOpen={mesas.isMesaModalOpen}
  onClose={() => mesas.setIsMesaModalOpen(false)}
  mesa={mesas.selectedMesa}
  mesaConfig={mesas.mesasConfig?.find(m => m.numero === mesas.selectedMesa?.numero)}
  estado={mesas.selectedMesa?.estado || 'LIBRE'}
  onAgregarProducto={handleAgregarProductoAMesa}
  onProcesarPago={handleProcesarPagoMesa}
  onImprimirComanda={handleImprimirComandaMesa}
  onCerrarMesa={handleCerrarMesa}
  products={products.products}
  onProductSearch={products.setProductSearch}
  variables={posData.variables}
  mesasHook={mesas}
  allMesas={mesas.mesasConfig || []} // ← ESTA LÍNEA ES CRÍTICA
/>


      </div>
    );
  };

  // Renderizado condicional para móvil
  const renderMobileLayout = () => (
    <div className="flex flex-col space-y-4 p-4 pb-24">
      {/* 1. Panel de búsqueda de productos - PRIMERO */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <ProductSearch
          vendors={posData.vendors}
          selectedCategory={posData.selectedCategory}
          setSelectedCategory={posData.setSelectedCategory}
          isEditable={posData.isEditable}
          productSearch={products.productSearch}
          setProductSearch={products.setProductSearch}
          showProductSuggestions={products.showProductSuggestions}
          setShowProductSuggestions={products.setShowProductSuggestions}
          products={products.products}
          handleProductSelect={handleProductSelect}
          isMobile={true}
        />
      </div>

      {/* 2. Tabla del carrito - SEGUNDO */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <CartTable
          cart={posData.cart}
          setCart={posData.setCart}
          isEditable={posData.isEditable}
          handleQuantityChange={handleQuantityChange}
          handleDiscountChange={handleDiscountChange}
          handleSubtotalChange={handleSubtotalChange}
          handleNoteChange={handleNoteChange}
          handleRemoveProduct={handleRemoveProduct}
          handleSuspend={handleSuspend}
          handleOpenSuspendedModal={handleOpenSuspendedModal}
          isMobile={true}
        />
      </div>

      {/* 3. Panel de cliente y acciones - TERCERO */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <CustomerPanel
          customerSearch={customers.customerSearch}
          handleCustomerSearchChange={handleCustomerSearchChange}
          showSuggestions={customers.showSuggestions}
          isCustomerSearchFocused={customers.isCustomerSearchFocused}
          customers={customers.customers}
          setSelectedCustomer={posData.setSelectedCustomer}
          setSelectedCustomerDetails={posData.setSelectedCustomerDetails}
          setShowSuggestions={customers.setShowSuggestions}
          setIsCustomerSearchFocused={customers.setIsCustomerSearchFocused}
          selectedCustomer={posData.selectedCustomer}
          isEditable={posData.isEditable}
          setIsModalOpen={posData.setIsModalOpen}
          setNitValue={posData.setNitValue}
          setNombreValue={posData.setNombreValue}
          setDireccionValue={posData.setDireccionValue}
          variables={posData.variables}
          shippingAddress={shippingAddress}
          setShippingAddress={setShippingAddress}
          tipoVenta={posData.tipoVenta}
          isFel={posData.isFel}
          setIsFel={posData.setIsFel}
          isCustomFieldsModalOpen={posData.isCustomFieldsModalOpen}
          openCustomFieldsModal={openCustomFieldsModal}
          closeCustomFieldsModal={closeCustomFieldsModal}
          handleCustomFieldChange={handleCustomFieldChange}
          extraFields={posData.extraFields}
          generalNotes={posData.generalNotes}
          setGeneralNotes={posData.setGeneralNotes}
          cart={posData.cart}
          calculateSubtotal={posData.calculateSubtotal}
          calculateDiscount={posData.calculateDiscount}
          calculateTotal={posData.calculateTotal}
          handleOpenPaymentModal={() => {
            if (posData.cart.length === 0) {
              posData.setAlert({ show: true, type: 'error', message: 'Debe agregar al menos un artículo al carrito antes de realizar el pago.' });
              return;
            }
            if (!posData.selectedCategory) {
              posData.setAlert({ show: true, type: 'error', message: 'Seleccione un vendedor antes de continuar.' });
              return;
            }
            posData.setIsPaymentModalOpen(true);
          }}
          handleSavePedido={() => {}}
          handleSaveCotizacion={handleSaveCotizacion}
          handleOpenSalesHistoryModal={handleOpenSalesHistoryModal}
          isMobile={true}
        />
      </div>
    </div>
  );

  // Renderizado para desktop (layout original)
  const renderDesktopLayout = () => (
    <div className="flex flex-1 flex-col md:flex-row overflow-hidden p-4 space-y-4 md:space-y-0 md:space-x-4">
      {/* Panel de cliente */}
      <CustomerPanel
        customerSearch={customers.customerSearch}
        handleCustomerSearchChange={handleCustomerSearchChange}
        showSuggestions={customers.showSuggestions}
        isCustomerSearchFocused={customers.isCustomerSearchFocused}
        customers={customers.customers}
        setSelectedCustomer={posData.setSelectedCustomer}
        setSelectedCustomerDetails={posData.setSelectedCustomerDetails}
        setShowSuggestions={customers.setShowSuggestions}
        setIsCustomerSearchFocused={customers.setIsCustomerSearchFocused}
        selectedCustomer={posData.selectedCustomer}
        isEditable={posData.isEditable}
        setIsModalOpen={posData.setIsModalOpen}
        setNitValue={posData.setNitValue}
        setNombreValue={posData.setNombreValue}
        setDireccionValue={posData.setDireccionValue}
        variables={posData.variables}
        shippingAddress={shippingAddress}
        setShippingAddress={setShippingAddress}
        tipoVenta={posData.tipoVenta}
        isFel={posData.isFel}
        setIsFel={posData.setIsFel}
        isCustomFieldsModalOpen={posData.isCustomFieldsModalOpen}
        openCustomFieldsModal={openCustomFieldsModal}
        closeCustomFieldsModal={closeCustomFieldsModal}
        handleCustomFieldChange={handleCustomFieldChange}
        extraFields={posData.extraFields}
        generalNotes={posData.generalNotes}
        setGeneralNotes={posData.setGeneralNotes}
        cart={posData.cart}
        calculateSubtotal={posData.calculateSubtotal}
        calculateDiscount={posData.calculateDiscount}
        calculateTotal={posData.calculateTotal}
        handleOpenPaymentModal={() => {
          if (posData.cart.length === 0) {
            posData.setAlert({ show: true, type: 'error', message: 'Debe agregar al menos un artículo al carrito antes de realizar el pago.' });
            return;
          }
          if (!posData.selectedCategory) {
            posData.setAlert({ show: true, type: 'error', message: 'Seleccione un vendedor antes de continuar.' });
            return;
          }
          posData.setIsPaymentModalOpen(true);
        }}
        handleSavePedido={() => {}}
        handleSaveCotizacion={handleSaveCotizacion}
        handleOpenSalesHistoryModal={handleOpenSalesHistoryModal}
      />

      {/* Tabla del carrito */}
      <CartTable
        cart={posData.cart}
        setCart={posData.setCart}
        isEditable={posData.isEditable}
        handleQuantityChange={handleQuantityChange}
        handleDiscountChange={handleDiscountChange}
        handleSubtotalChange={handleSubtotalChange}
        handleNoteChange={handleNoteChange}
        handleRemoveProduct={handleRemoveProduct}
        handleSuspend={handleSuspend}
        handleOpenSuspendedModal={handleOpenSuspendedModal}
      />

      {/* Panel de búsqueda de productos */}
      <ProductSearch
        vendors={posData.vendors}
        selectedCategory={posData.selectedCategory}
        setSelectedCategory={posData.setSelectedCategory}
        isEditable={posData.isEditable}
        productSearch={products.productSearch}
        setProductSearch={products.setProductSearch}
        showProductSuggestions={products.showProductSuggestions}
        setShowProductSuggestions={products.setShowProductSuggestions}
        products={products.products}
        handleProductSelect={handleProductSelect}
      />
    </div>
  );

  const SuspendedTicketIndicator = () => {
    const isEditing = posData.selectedTicket?.type === 4 && posData.selectedTicket?.id;
    
    if (!isEditing) return null;
    
    return (
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 mx-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="font-medium">Editando Ticket Suspendido</h4>
              <p className="text-sm">
                Ticket: {posData.selectedTicket?.ref || posData.selectedTicket?.id} - 
                Puede modificar productos, cliente y tipo de documento
              </p>
            </div>
          </div>
          <button
            onClick={handleNewSale}
            className="text-yellow-600 hover:text-yellow-800 text-sm underline font-medium"
          >
            Cancelar Edición
          </button>
        </div>
      </div>
    );
  };


  // Componente de debug para desarrollo
const RestaurantDebugInfo = ({ mesas, terminal }) => (
  <div className="fixed bottom-4 left-4 bg-black bg-opacity-75 text-white p-3 rounded text-xs z-50 max-w-xs">
    <div className="font-bold mb-1">🍽️ Restaurant Debug:</div>
    <div>• Configurado: {mesas.isConfigured ? '✅' : '❌'}</div>
    <div>• Loading: {mesas.isLoading ? '⏳' : '✅'}</div>
    <div>• Error: {mesas.hasError ? '❌' : '✅'}</div>
    <div>• Setup requerido: {mesas.needsSetup ? '⚠️' : '✅'}</div>
    <div>• Layout: {mesas.layoutConfig ? '✅' : '❌'}</div>
    <div>• Config mesas: {mesas.mesasConfig?.length || 0}</div>
    <div>• Mesas operativas: {mesas.mesas?.length || 0}</div>
    <div>• Entity: {terminal?.entity}</div>
    {mesas.error && (
      <div className="mt-2 pt-2 border-t border-gray-600">
        <div className="text-red-300 font-bold">Error:</div>
        <div className="text-red-200 text-xs">{mesas.error.message}</div>
      </div>
    )}
  </div>
);



  // Effect para auto agregar productos cuando solo hay uno en la búsqueda
  useEffect(() => {
    if (products.products.length === 1 && products.productSearch.trim() !== '') {
      handleProductSelect(products.products[0]);
    }
  }, [products.products]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
    {/* Manejo de errores del restaurante */}
       <RestaurantErrorHandler
        error={mesas.error}
        onRetry={mesas.retryLastOperation}
        onDismiss={() => mesas.setError && mesas.setError(null)}
        canRetry={mesas.canRetry}
        showDiagnostic={() => setShowDiagnostic(true)}
        mesasHook={mesas}
      />

      {posData.alert.show && (
        <Alert 
          type={posData.alert.type} 
          message={posData.alert.message} 
          onClose={() => posData.setAlert({ ...posData.alert, show: false })} 
        />
      )}

      {/* Modal de Cierre de Caja */}
      {posData.isCashClosureModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-11/12 md:w-1/3">
            <h2 className="text-xl font-bold mb-4">Cierre de Caja</h2>
            <p>Efectivo: Q.{payments.cashBalance.toFixed(2)}</p>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Monto de Cierre</span>
              </label>
              <input
                type="number"
                className="input input-bordered w-full"
                value={payments.closureAmount}
                onChange={(e) => payments.setClosureAmount(e.target.value)}
                placeholder="Ingresa el monto de cierre"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <button
                className="btn btn-secondary"
                onClick={() => posData.setIsCashClosureModalOpen(false)}
              >
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleCashClosureSubmit}>
                Confirmar Cierre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TopBar */}
      <TopBar
        user={posData.user}
        currentTime={posData.currentTime}
        terminal={terminal}
        tipoVenta={isRestaurantMode ? 'Restaurante' : posData.tipoVenta}
        handleTipoVentaChange={isRestaurantMode ? () => {} : handleTipoVentaChange}
        menuOpen={posData.menuOpen}
        toggleMenu={toggleMenu}
        handleLogout={handleLogout}
        handleOpenCashClosureModal={handleOpenCashClosureModal}
        handleCambioUsuario={handleCambioUsuario}
        variables={posData.variables}
        isRestaurantMode={isRestaurantMode}
        // Nuevas props para restaurante
        onShowDiagnostic={() => setShowDiagnostic(true)}
        onShowAdmin={() => setShowAdminModal(true)}
        restaurantStatus={isRestaurantMode ? mesas : null}
      />

      {/* Indicador de ticket suspendido - Solo en modo POS normal */}
      {!isRestaurantMode && (
        <SuspendedTicketIndicator 
          selectedTicket={posData.selectedTicket}
          onNewSale={handleNewSale}
        />
      )}

      {/* Botón para toggle de estadísticas en modo restaurante */}
         {isRestaurantMode && mesas.isConfigured && (
        <div className="px-4 pt-2 flex justify-between items-center">
          <button
            onClick={() => setShowRestaurantStats(!showRestaurantStats)}
            className="flex items-center space-x-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-full transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>{showRestaurantStats ? 'Ocultar' : 'Ver'} Estadísticas</span>
          </button>
          
          <RestaurantSystemStatus mesasHook={mesas} compact={true} />
        </div>
      )}

      {/* Contenido principal - Condicional según modo */}
       {/* Contenido principal - Condicional según modo */}
{isRestaurantMode ? (
  // Modo Restaurante Visual
  renderRestaurantMode()
) : (
  // Modo POS Normal - Layout original
  isMobile ? renderMobileLayout() : renderDesktopLayout()
)}


  {/* MODALES DEL SISTEMA RESTAURANTE */}

      {/* Modal de configuración inicial del restaurante */}
      {isRestaurantMode && (
        <RestaurantSetupModal
          isOpen={showSetupModal}
          onClose={() => setShowSetupModal(false)}
          onCreateLayout={handleCreateInitialLayout}
          entity={terminal?.entity || 1}
        />
      )}
           {/* Modal de diagnóstico */}

 <RestaurantDiagnostic
        isOpen={showDiagnostic}
        onClose={() => setShowDiagnostic(false)}
        variables={posData.variables}
        terminal={terminal}
        mesasHook={mesas}
      />
 {/* Modal de administración avanzada */}
      {isRestaurantMode && (
        <RestaurantAdminModal
          isOpen={showAdminModal}
          onClose={() => setShowAdminModal(false)}
          layoutConfig={mesas.layoutConfig}
          variables={posData.variables}
          terminal={terminal}
          onUpdateConfig={async (config) => {
            console.log('Actualizando configuración:', config);
            // Implementar actualización de configuración
          }}
        />
      )}



      {/* Modal de pagos */}
     <PaymentModal
  isOpen={posData.isPaymentModalOpen}
  onClose={() => posData.setIsPaymentModalOpen(false)}
  terminal={terminal}
  total={payments.total}
  saldo={payments.saldo}
  payments={payments.payments}
  newPaymentAmount={payments.newPaymentAmount}
  setNewPaymentAmount={payments.setNewPaymentAmount}
  selectedPaymentMethod={payments.selectedPaymentMethod}
  setSelectedPaymentMethod={payments.setSelectedPaymentMethod}
  handleAddPayment={payments.handleAddPayment}
  handleSaveFactura={handleSaveFactura}
  // 🔥 NUEVOS PROPS
  isProcessingPayment={payments.isProcessingPayment}
  paymentResults={payments.paymentResults}
  isRestaurantMode={isRestaurantMode}
  getPaymentSummary={payments.getPaymentSummary}
/>


      {/* Modal de cliente */}
      <CustomerModal
        isOpen={posData.isModalOpen}
        onClose={() => posData.setIsModalOpen(false)}
        nitValue={posData.nitValue}
        setNitValue={posData.setNitValue}
        nombreValue={posData.nombreValue}
        setNombreValue={posData.setNombreValue}
        direccionValue={posData.direccionValue}
        setDireccionValue={posData.setDireccionValue}
        telefonoValue={posData.telefonoValue}
        setTelefonoValue={posData.setTelefonoValue}
        emailValue={posData.emailValue}
        setEmailValue={posData.setEmailValue}
        isLoading={posData.isLoading}
        handleNitChange={handleNitChange}
        handleCreateCustomer={handleCreateCustomer}
      />

      {/* Modal de historial de ventas */}
      <SalesHistoryModal
        isOpen={posData.isSalesHistoryModalOpen}
        onClose={() => posData.setIsSalesHistoryModalOpen(false)}
        salesData={salesData}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        handleViewDetails={handleViewDetails}
        handleInvoiceCotizacion={handleInvoiceCotizacion}
        handlePrintTicket={handlePrintTicket}
        vendors={posData.vendors}
      />

      {/* Modal de detalles de documento */}
      <DocumentDetailsModal
        isOpen={isDocumentDetailsModalOpen}
        onClose={handleCloseDocumentDetails}
        document={selectedDocumentDetails}
        documentType={selectedDocumentType}
        onInvoiceCotizacion={handleInvoiceFromDetails}
        onPrint={handlePrintFromDetails}
        vendors={posData.vendors}
        variables={posData.variables}
      />

      {/* Modal de tickets suspendidos */}
      <SuspendedTicketsModal
        isOpen={posData.isSuspendedModalOpen}
        onClose={() => posData.setIsSuspendedModalOpen(false)}
        suspendedTickets={suspendedTickets}
        handleEditTicket={handleEditTicket}
        onReactivateTicket={handleReactivateTicket}
        onDeleteTicket={handleDeleteSuspendedTicket}
      />

      {/* PrintTicket */}
      {posData.showTicket && posData.ticketData && (
        <div className="fixed inset-0 flex items-center justify-center z-[100]">
          <PrintTicket
            ticketData={posData.ticketData}
            onClose={() => posData.setShowTicket(false)}
          />
        </div>
      )}

      {/* PrintComanda - Para comandas de restaurante */}
      {showComanda && comandaData && (
        <div className="fixed inset-0 flex items-center justify-center z-[100]">
          <PrintComanda
            comandaData={comandaData}
            onClose={() => setShowComanda(false)}
          />
        </div>
      )}


      

      {/* Botón de Nueva Venta - Solo en modo POS normal */}
     {!isRestaurantMode && (
        <div className={`fixed ${isMobile ? 'bottom-4 left-4' : 'bottom-4 right-4'} z-50`}>
          <button
            onClick={handleNewSale}
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-full p-3 shadow-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth={2} 
              stroke="currentColor" 
              className="w-6 h-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="hidden md:inline">Nueva Venta</span>
          </button>
        </div>
      )}


       {isRestaurantMode && mesas.isConfigured && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => setShowAdminModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-3 shadow-lg transition-all hover:scale-105 active:scale-95"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth={2} 
              stroke="currentColor" 
              className="w-6 h-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      )}

      {/* Botones de acción móvil - Solo en modo POS normal */}
      <MobileActionButtons />
    </div>
  );
};

export default Pos;