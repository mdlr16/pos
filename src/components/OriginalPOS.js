import React, { useState, useContext, useEffect, useRef } from 'react';
import Alert from './Alert'; 
import { AuthContext } from '../context/AuthContext';
import CustomFields from './CustomFields';
import PrintTicket from './PrintTicket';

const Pos = ({ terminal }) => {
  
  const { user, company, variables, logout, userId } = useContext(AuthContext);
  const [isEditable, setIsEditable] = useState(true); // Estado para controlar la edición
  const [extraFields, setExtraFields] = useState({});
  const [isCustomFieldsModalOpen, setIsCustomFieldsModalOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(''); 
  //const [selectedCustomer, setSelectedCustomer] = useState('Walk in Customer');
  const [shippingAddress, setShippingAddress] = useState('Nivel 1');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nitValue, setNitValue] = useState('');
  const [nombreValue, setNombreValue] = useState('');
  const [direccionValue, setDireccionValue] = useState('');
  const [telefonoValue, setTelefonoValue] = useState('');
  const [emailValue, setEmailValue] = useState('');
  const [tipoVenta, setTipoVenta] = useState("Cotizacion");
  const [generalNotes, setGeneralNotes] = useState('');
  const [vendors, setVendors] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [saldo, setSaldo] = useState(0);
  const [newPaymentAmount, setNewPaymentAmount] = useState(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const searchTimeoutRef = useRef(null);
  const [isFel, setIsFel] = useState(false);
  const [isLoading, setIsLoading] = useState(false); 
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [customerDiscount, setCustomerDiscount] = useState(0); 
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState(null);
  const [isSuspendedModalOpen, setIsSuspendedModalOpen] = useState(false); 
  const [suspendedTickets, setSuspendedTickets] = useState([]); 
  const [selectedTicket, setSelectedTicket] = useState(null); 
  const [isCustomerSearchFocused, setIsCustomerSearchFocused] = useState(false);
  const [activeTab, setActiveTab] = useState("Cotizaciones");
  const [salesData, setSalesData] = useState({ cotizaciones: [], pedidos: [], facturas: [] });
  const [isSalesHistoryModalOpen, setIsSalesHistoryModalOpen] = useState(false);
  
  const [isHistoryItem, setIsHistoryItem] = useState(false); 
  const [searchTerm, setSearchTerm] = useState('');
  const [showTicket, setShowTicket] = useState(false);
const [ticketData, setTicketData] = useState(null);
 const [isCashClosureModalOpen, setIsCashClosureModalOpen] = useState(false);
  const [cashBalance, setCashBalance] = useState(0);
  const [closureAmount, setClosureAmount] = useState('');

  useEffect(() => {
    if (terminal.fk_soc) {
      // Llama a la función fetchCustomer para cargar el cliente predeterminado
      loadDefaultCustomer();
    }
  }, [terminal.fk_soc]); // Ejecuta cada vez que se actualiza el terminal

  const loadDefaultCustomer = async () => {
    try {
      // Llama al fetchCustomers con el valor de terminal.fk_soc
      const response = await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=searchCustomer`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: 'Consumidor Final'}), // Busca el cliente usando terminal.fk_soc
      });
  
      const data = await response.json();
  
      if (data.error && data.error.value === 0 && data.data.length > 0) {
        const customer = data.data[0];
        setSelectedCustomer(customer.nom); // Establece el nombre del cliente
        setSelectedCustomerDetails(customer); // Establece los detalles completos del cliente
        setCustomerDiscount(parseFloat(customer.remise) || 0); // Asigna el descuento si existe
      } else {
        console.error('Error al buscar el cliente predeterminado:', data.error.desc);
      }
    } catch (error) {
      console.error('Error al cargar el cliente predeterminado:', error);
    }
  };

  const handleOpenCashClosureModal = async () => {
    try {
      const response = await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=getMoneyCashs&terminal=${terminal.rowid}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();

      // Asegurar que el saldo sea numérico
      const balance = parseFloat(data) || 0;
      setCashBalance(balance); 
      
      setIsCashClosureModalOpen(true);
    } catch (error) {
      console.error('Error al obtener el saldo de efectivo:', error);
    }
};



  // Función para enviar el monto de cierre de caja
  const handleCashClosureSubmit = async () => {
    try {
        // Log de datos iniciales
        console.log('Datos a enviar:', {
            userId,
            closureAmount,
            terminal: terminal,
            entity: terminal.entity,
            urls: {
                base: variables.SPOS_URL,
                cierre: variables.SPOS_URL_CIERRE
            }
        });

        const data = {
            employeeId: userId,
            moneyincash: parseFloat(closureAmount),
            type: 1,
            cashid: terminal.rowid,
            print: 1,
            entity: terminal.entity
        };

        console.log('Data formateada:', data);
       
        const response = await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=closeCashs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        console.log('Response status:', response.status);
        console.log('Response OK:', response.ok);

        // Obtener el texto primero para debugging
        const responseText = await response.text();
        console.log('Response text:', responseText);

        // Intentar parsear el JSON
        let result;
        try {
            result = JSON.parse(responseText);
            console.log('Parsed result:', result);
        } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
            throw new Error('Error parsing response');
        }

        // Verificar la estructura del resultado
        console.log('Result structure:', {
            hasError: !!result.error,
            errorValue: result.error?.value,
            errorDesc: result.error?.desc,
            data: result.data.id
        });

        // Verificación explícita de la condición
        const isSuccess = result.error && result.error.value === 0;
        console.log('Is success?', isSuccess);

        if (isSuccess) {
            console.log('Entering success block');
            
            setAlert({
                show: true,
                type: 'success',
                message: 'Cierre de caja realizado exitosamente.'
            });
            
            const cierre_url = `${variables.SPOS_URL_CIERRE}?terminal=${terminal.rowid}`;
            console.log('Opening URL:', cierre_url);
            
            window.open(cierre_url, '_blank');
            
            console.log('Calling handleLogout');
            await handleLogout();
            
            console.log('Closing modal and cleaning up');
            setIsCashClosureModalOpen(false);
            setClosureAmount('');
            
        } else {
            console.log('Entering error block');
            setAlert({
                show: true,
                type: 'error',
                message: result.error?.desc || 'Error al realizar el cierre de caja.'
            });
        }
    } catch (error) {
        console.error('Detailed error:', error);
        console.error('Error stack:', error.stack);
        setAlert({
            show: true,
            type: 'error',
            message: `Error específico: ${error.message}`
        });
    }
};



useEffect(() => {
  if (productSearch.trim() === '') {
    setShowProductSuggestions(false);
    setProducts([]); // Limpiar los productos cuando la búsqueda esté vacía
    return;
  }

  // Crear una búsqueda con debounce para productos
  const delayDebounceFn = setTimeout(() => {
    fetchProducts(productSearch);
  }, 300);

  // Limpiar el timeout en cada re-renderizado
  return () => clearTimeout(delayDebounceFn);
}, [productSearch]);


useEffect(() => {
  setIsEditable(true); // Asegura que los campos estén desbloqueados al cargar la página
}, []);


const handleOpenSalesHistoryModal = async () => {
  console.log("Opening sales history modal"); // <-- Verifica que se imprima este mensaje al hacer clic en el botón
  try {
    // Llamada con la entidad en la URL
    const cotizacionesResponse = await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=getCotizaciones&entity=${terminal.entity}`);
    
    // Procesar la respuesta de cotizaciones
    const cotizacionesData = await cotizacionesResponse.json();

    // Asegúrate de que "pedidos" y "facturas" funcionen de manera similar
    const pedidosResponse = await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=getPedidos&entity=${terminal.entity}`);
    const pedidosData = await pedidosResponse.json();

    const facturasResponse = await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=getFacturas&entity=${terminal.entity}`);
    const facturasData = await facturasResponse.json();

    // Establecer los datos en el estado
    setSalesData({
      cotizaciones: cotizacionesData.data || [],
      pedidos: pedidosData.data || [],
      facturas: facturasData.data || []
    });
    
    // Mostrar el modal de historial de ventas
    setIsSalesHistoryModalOpen(true);
  } catch (error) {
    console.error("Error fetching sales history:", error);
  }
};




const handleCloseSalesHistoryModal = () => {
  setIsSalesHistoryModalOpen(false);
};





// Función para verificar el stock de un producto en un almacén específico para una cantidad dada
const checkProductStock = async (productId, quantity) => {
  try {
    const response = await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=checkStock&productId=${productId}&entrepot=${terminal.fk_warehouse}`);
    const text = await response.text();
    const data = JSON.parse(text);

    if (data.status === 'error') {
      console.error(data.message);
      return false;
    }

    return data.stock >= quantity;
  } catch (error) {
    console.error("Error al verificar stock:", error);
    return false;
  }
};


// Función para agregar un producto al carrito, con validación de stock
const handleAddProduct = async (product) => {
  if (!isEditable) return; // Evitar agregar productos si el formulario está bloqueado

  const existingProductIndex = cart.findIndex(item => item.id === product.id);
  const newQuantity = existingProductIndex !== -1 ? cart[existingProductIndex].quantity + 1 : 1;

  // Verificar stock solo si tipoVenta es Factura y VALIDARSTOCK está activo
  if (tipoVenta === "Factura" && variables.SPOS_VALIDARSTOCK === "1") {
    const hasEnoughStock = await checkProductStock(product.id, newQuantity);
    
    if (!hasEnoughStock) {
      setAlert({ show: true, type: 'error', message: `Stock insuficiente para ${product.name}` });
      return;
    }
  }

  if (existingProductIndex !== -1) {
    const newCart = [...cart];
    newCart[existingProductIndex].quantity = newQuantity;
    newCart[existingProductIndex].hasStock = true; // Marcamos que tiene suficiente stock
    setCart(newCart);
  } else {
    setCart([...cart, { 
      ...product, 
      name: product.label || 'Unnamed Product',
      price: parseFloat(product.price_ttc) || 0,
      quantity: 1, 
      discount: customerDiscount,
      hasStock: true // Inicialmente marcamos que tiene stock suficiente
    }]);
  }
};




 
// Controladores de búsqueda de productos y clientes
useEffect(() => {
  // Crear una búsqueda con debounce para productos
  if (productSearch.trim() !== '') {
    const delayDebounceFn = setTimeout(() => {
      fetchProducts(productSearch);
    }, 300); // 300ms de espera después de que el usuario deje de escribir

    // Limpiar el timeout en cada re-renderizado
    return () => clearTimeout(delayDebounceFn);
  }
}, [productSearch]); // Se ejecuta cuando cambia el estado de productSearch

useEffect(() => {
  // Crear una búsqueda con debounce para clientes
  if (customerSearch.trim() !== '') {
    const delayDebounceFn = setTimeout(() => {
      fetchCustomers(customerSearch);
    }, 300); // 300ms de espera después de que el usuario deje de escribir

    // Limpiar el timeout en cada re-renderizado
    return () => clearTimeout(delayDebounceFn);
  }
}, [customerSearch]); // Se ejecuta cuando cambia el estado de customerSearch


const handleTipoVentaChange = async (e) => {
  const selectedTipo = e.target.value;

  setTipoVenta(selectedTipo);

  // Si el tipo es "Factura," habilitamos la edición y validamos el stock
  if (selectedTipo === "Factura") {
    setIsEditable(true);

    // Valida el stock y marca en rojo los productos sin stock
    if (variables.SPOS_VALIDARSTOCK === "1") {
      await validateStockForCart(); // Llama a la validación de stock
    }
  } else {
    // Si el tipo es "Cotización" o "Pedido," bloquea los campos
    setIsEditable(false);

    // Remueve la marca de "sin stock" en rojo para cotización/pedido
    const updatedCart = cart.map(item => ({
      ...item,
      hasStock: true // Restablece hasStock a verdadero
    }));
    setCart(updatedCart);
  }
};







const handleCustomFieldChange = (fieldId, value) => {
  setExtraFields((prevFields) => ({
    ...prevFields,
    [fieldId]: value,
  }));
};

const openCustomFieldsModal = () => {
  setIsCustomFieldsModalOpen(true);
};

const closeCustomFieldsModal = () => {
  setIsCustomFieldsModalOpen(false);
};

// Función para seleccionar un ticket del historial y convertirlo en una factura
const handleSelectHistoryItem = async (document) => {
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
    hasStock: true // Por defecto true, se validará si es necesario
  }));

  setCart(cartItems);

  // Determinar tipo de venta
  const saleType = document.type === "0" ? "Cotizacion" : document.type === "2" ? "Pedido" : "Factura";
  setTipoVenta(saleType);

  // Validar stock si es factura y VALIDARSTOCK está activado
  if (saleType === "Factura" && variables.SPOS_VALIDARSTOCK === "1") {
    await validateStockForCart();
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




const handleSavePedido = async () => {
  try {
    const customerId = selectedCustomerDetails?.id || '1';
    const ticketId = selectedTicket?.id || 0;

    if (cart.length === 0) {
      setAlert({ show: true, type: 'error', message: 'Debe agregar al menos un artículo al carrito antes de guardar el Pedido.' });
      return;
    }
    // Crear el objeto de datos para enviar al API (sin incluir pagos)
    const data = {
      id: ticketId,
      payment_type: 0,
      warehouse: terminal.fk_warehouse,
      clase: tipoVenta === "Cotizacion" ? 0 : tipoVenta === "Pedido" ? 2 : 3,
      type: 0, // Cotización
      old_type: selectedTicket ? selectedTicket.type : 0,
      discount_percent: customerDiscount.toString(),
      discount_qty: 0,
      lines: cart.map(item => ({
        id: item.idLine || 0,
        idProduct: item.id,
        ref: 0,
        label: item.name,
        description: item.note || "",
        discount: 0,
        qty: item.quantity,
        idTicket: ticketId,
        localtax1_tx: 0,
        localtax2_tx: 0,
        tva_tx: "0.000",
        price: parseFloat(item.price).toFixed(8),
        price_ttc: parseFloat(item.price).toFixed(8),
        total: (item.price * item.quantity * (1 - item.discount / 100)).toFixed(2),
        price_min_ttc: "0.00000000",
        price_base_type: "TTC",
        fk_product_type: "0",
        total_ttc: (item.price * item.quantity).toFixed(2),
        total_ttc_without_discount: (item.price * item.quantity).toFixed(2),
        diff_price: 0,
        orig_price: parseFloat(item.price).toFixed(8),
        remise_percent_global: customerDiscount.toString(),
        socid: customerId
      })),
      oldproducts: [],
      total: calculateTotal(),
      customerpay: 0,
      difpayment: 0,
      customerId: customerId,
      employeeId: userId,
      state: 0,
      id_place: 0,
      note: generalNotes,
      mode: 1, // Modo para Cotización
      points: 0,
      idCoupon: 0,
      ret_points: 0,
      id_vendor: selectedCategory,
      is_fel: tipoVenta === "Factura" && isFel ? 1 : 0,
      cashId: terminal.rowid,
      entity: terminal.entity,
      extraFields: extraFields // Añadir los campos extras
    };

    // Hacer la solicitud POST para guardar la cotización
    const response = await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=saveTickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }),
    });

    const result = await response.json();
    if (result.error && result.error.value === 0) {
      setAlert({ show: true, type: 'success', message: 'Pedido guardado correctamente.' });


        // Enviar los campos personalizados al servidor
         await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=saveExtrafields`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ticketId: result.data.id, // ID del ticket guardado
            extraFields: extraFields, // Campos personalizados
            clase: 2
          }),
        });


        const ticketData = {
          company: terminal.name,
          terminal: terminal.label,
          documentType: 'Pedido',
          ref: result.data.ref, // ID del documento guardado
          customerName: selectedCustomer,
          customerNit: selectedCustomerDetails?.idprof1 || 'CF',
          items: cart.map(item => ({
            ...item,
            total: (item.price * item.quantity * (1 - item.discount / 100)).toFixed(2)
          })),
          subtotal: calculateSubtotal(),
          discount: calculateDiscount(),
          total: calculateTotal(),
          vendorName: vendors.find(v => v.code === selectedCategory)?.label || '',
          note: generalNotes,
          extraFields: extraFields,
          // Información adicional de la empresa
          nit: terminal.nit || '',
          address: terminal.address || '',
          phone: terminal.phone || '',
          email: terminal.email || ''
        };
  
        // Mostrar el ticket
        setTicketData(ticketData);
        setShowTicket(true);
  

      // Restablecer los estados para una nueva venta
      setCart([]);
      setProductSearch('');
      setCustomerSearch('');
      loadDefaultCustomer();
      //setSelectedCustomer('Walk in Customer');
      setSelectedCustomerDetails(null);
      setCustomerDiscount(0);
      setTipoVenta("Cotizacion");
      setGeneralNotes('');
      setSelectedTicket(null);
      setSelectedCategory('');
      setExtraFields({});
    } else {
      setAlert({ show: true, type: 'error', message: 'Error al guardar el pedido.' });
      console.error('Error al guardar el Pedido:', result.error.desc);
    }
  } catch (error) {
    setAlert({ show: true, type: 'error', message: 'Error al guardar el pedido.' });
    console.error('Error al guardar el Pedido:', error);
  }
};


const handleSaveCotizacion = async () => {
  try {
    const customerId = selectedCustomerDetails?.id || '1';
    const ticketId = selectedTicket?.id || 0;

    if (cart.length === 0) {
      setAlert({ show: true, type: 'error', message: 'Debe agregar al menos un artículo al carrito antes de guardar la cotización.' });
      return;
    }

    // Crear el objeto de datos para enviar al API
    const data = {
      id: ticketId,
      payment_type: 0,
      warehouse: terminal.fk_warehouse,
      clase: tipoVenta === "Cotizacion" ? 0 : tipoVenta === "Pedido" ? 2 : 3,
      type: 0, // Cotización
      old_type: selectedTicket ? selectedTicket.type : 0,
      discount_percent: customerDiscount.toString(),
      discount_qty: 0,
      lines: cart.map(item => ({
        id: item.idLine || 0,
        idProduct: item.id,
        ref: 0,
        label: item.name,
        description: item.note || "",
        discount: 0,
        qty: item.quantity,
        idTicket: ticketId,
        localtax1_tx: 0,
        localtax2_tx: 0,
        tva_tx: "0.000",
        price: parseFloat(item.price).toFixed(8),
        price_ttc: parseFloat(item.price).toFixed(8),
        total: (item.price * item.quantity * (1 - item.discount / 100)).toFixed(2),
        price_min_ttc: "0.00000000",
        price_base_type: "TTC",
        fk_product_type: "0",
        total_ttc: (item.price * item.quantity).toFixed(2),
        total_ttc_without_discount: (item.price * item.quantity).toFixed(2),
        diff_price: 0,
        orig_price: parseFloat(item.price).toFixed(8),
        remise_percent_global: customerDiscount.toString(),
        socid: customerId
      })),
      oldproducts: [],
      total: calculateTotal(),
      customerpay: 0,
      difpayment: 0,
      customerId: customerId,
      employeeId: userId,
      state: 0,
      id_place: 0,
      note: generalNotes,
      mode: 1, // Modo para Cotización
      points: 0,
      idCoupon: 0,
      ret_points: 0,
      id_vendor: selectedCategory,
      is_fel: tipoVenta === "Factura" && isFel ? 1 : 0,
      cashId: terminal.rowid,
      entity: terminal.entity,
      extraFields: extraFields
    };

    // Hacer la solicitud POST para guardar la cotización
    const response = await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=saveTickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }),
    });

    const result = await response.json();
    if (result.error && result.error.value === 0) {
      // Primero guardar los campos personalizados
      await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=saveExtrafields`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId: result.data.id,
          extraFields: extraFields,
          clase: 0
        }),
      });

      // Preparar datos del ticket para la impresión
      const ticketData = {
        company: terminal.name,
        terminal: terminal.label,
        documentType: 'Cotización',
        ref: result.data.ref, // ID del documento guardado
        customerName: selectedCustomer,
        customerNit: selectedCustomerDetails?.idprof1 || 'CF',
        items: cart.map(item => ({
          ...item,
          total: (item.price * item.quantity * (1 - item.discount / 100)).toFixed(2)
        })),
        subtotal: calculateSubtotal(),
        discount: calculateDiscount(),
        total: calculateTotal(),
        vendorName: vendors.find(v => v.code === selectedCategory)?.label || '',
        note: generalNotes,
        extraFields: extraFields,
        // Información adicional de la empresa
        nit: terminal.nit || '',
        address: terminal.address || '',
        phone: terminal.phone || '',
        email: terminal.email || ''
      };

      // Mostrar el ticket
      setTicketData(ticketData);
      setShowTicket(true);

      // Mostrar mensaje de éxito
      setAlert({ show: true, type: 'success', message: 'Cotización guardada correctamente.' });

      // Restablecer los estados para una nueva venta
      setCart([]);
      setProductSearch('');
      setCustomerSearch('');
      loadDefaultCustomer();
     // setSelectedCustomer('Walk in Customer');
      setSelectedCustomerDetails(null);
      setCustomerDiscount(0);
      setTipoVenta("Cotizacion");
      setGeneralNotes('');
      setSelectedTicket(null);
      setSelectedCategory('');
      setExtraFields({});
    } else {
      setAlert({ show: true, type: 'error', message: 'Error al guardar la cotización.' });
      console.error('Error al guardar la cotización:', result.error.desc);
    }
  } catch (error) {
    setAlert({ show: true, type: 'error', message: 'Error al guardar la cotización.' });
    console.error('Error al guardar la cotización:', error);
  }
};



  const handleCambioUsuario = () => {
    console.log('Cambio de Usuario');
  };

  const handleProductSelect = (product) => {
    handleAddProduct(product); // Agrega el producto seleccionado al carrito
    setProductSearch('');      // Limpiar el cuadro de búsqueda después de seleccionar
    setShowProductSuggestions(false); // Ocultar las sugerencias
  };



  const handleQuantityChange = async (index, newQuantity) => {
    const product = cart[index];
    
    // Verificar stock solo si tipoVenta es Factura y VALIDARSTOCK está activo
    if (tipoVenta === "Factura" && variables.SPOS_VALIDARSTOCK === "1") {
      const hasEnoughStock = await checkProductStock(product.id, newQuantity);
    
      if (!hasEnoughStock) {
        setAlert({ show: true, type: 'error', message: `Stock insuficiente para ${product.name}. Máximo disponible: ${product.stock}` });
        return;
      }
    }
    
    const newCart = [...cart];
    newCart[index].quantity = newQuantity;
    newCart[index].hasStock = true; // Marcamos que tiene suficiente stock
    setCart(newCart);
  };

 // Validación de stock para todos los productos en el carrito (usada al cargar un ticket del historial)
 const validateStockForCart = async () => {
  if (variables.SPOS_VALIDARSTOCK !== "1") {
    return true;
  }

  const stockValidations = await Promise.all(cart.map(async (item) => {
    const hasEnoughStock = await checkProductStock(item.id, item.quantity);
    return {
      item,
      hasStock: hasEnoughStock
    };
  }));

  // Actualiza el carrito para marcar los productos sin stock
  const updatedCart = cart.map((item, index) => ({
    ...item,
    hasStock: stockValidations[index].hasStock
  }));
  setCart(updatedCart);

  // Filtra los productos sin stock para mostrar alerta pero no bloquear edición
  const outOfStockItems = stockValidations.filter(validation => !validation.hasStock);
  if (outOfStockItems.length > 0) {
    const itemNames = outOfStockItems.map(validation => validation.item.name).join(", ");
    setAlert({
      show: true,
      type: 'error',
      message: `Los siguientes productos no tienen stock suficiente: ${itemNames}`
    });
  }

  return true;
};



const handleDiscountChange = async (index, newDiscount) => {
  const updatedCart = [...cart];
  const item = updatedCart[index];

  if (newDiscount < 0 || newDiscount > 100) {
    setAlert({
      show: true,
      type: 'error',
      message: 'El descuento debe estar entre 0 y 100.',
    });
    return;
  }

  try {
    const response = await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=searchProductsN`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          search: item.ref,
          warehouse: terminal.fk_warehouse,
          ticketstate: '0',
          customer: selectedCustomerDetails?.id || '1',
          type: tipoVenta === "Cotizacion" ? 0 : tipoVenta === "Pedido" ? 2 : 3,
        },
      }),
    });

    const data = await response.json();

    if (data.error.value === 0 && data.data.length > 0) {
      const productInfo = data.data[0];
      const priceTtcMin = parseFloat(productInfo.price_ttc_min);
      
      // Calcular el subtotal con el descuento propuesto
      const discountedSubtotal = item.price * item.quantity * (1 - newDiscount / 100);

      // Validar que el subtotal con descuento no esté por debajo del mínimo permitido
      if (discountedSubtotal >= priceTtcMin * item.quantity) {
        item.discount = newDiscount;
        setCart(updatedCart);
      } else {
        setAlert({
          show: true,
          type: 'error',
          message: `El descuento es demasiado alto. El subtotal no puede estar por debajo de Q${(priceTtcMin * item.quantity).toFixed(2)}.`,
        });
      }
    } else {
      setAlert({
        show: true,
        type: 'error',
        message: 'Error al obtener el precio mínimo del producto.',
      });
    }
  } catch (error) {
    console.error('Error fetching product info:', error);
    setAlert({
      show: true,
      type: 'error',
      message: 'Error al validar el descuento.',
    });
  }
};



  const closeModal = () => {
    setIsModalOpen(false);
  };


  const handleCreateCustomer = async (e) => {
    e.preventDefault();  // Prevenir el comportamiento por defecto del formulario (recargar la página)
    
    console.log('Iniciando creación de cliente...');
  
    // Dividimos el nombre completo en 'nom' y 'prenom'
    const [nom, ...prenomArr] = nombreValue.split(' ');
    const prenom = prenomArr.join(' '); // Si hay más de una palabra en el nombre
  
    try {
      // Verificar si el cliente ya existe buscando por NIT
      console.log('Verificando si el cliente ya existe...');
      const response = await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=searchCustomer`, { // Reemplaza el dominio estático por SPOS_URL
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: nitValue }),  // Enviar el NIT para la búsqueda
      });
  
      const data = await response.json();
      console.log('Respuesta del API de búsqueda:', data);
  
      if (data.data && data.data.length > 0) {
        // Si el cliente ya existe, mostramos una alerta
        console.log('El cliente ya existe, no se puede crear.');
        setAlert({ show: true, type: 'error', message: 'El cliente ya existe en la base de datos.' });
        setTimeout(() => setAlert({ ...alert, show: false }), 3000);
        return;
      }
  
      // Si el cliente no existe, lo creamos
      console.log('El cliente no existe, procedemos a crearlo...');
      const addCustomerResponse = await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=addCustomer`, { // Reemplaza el dominio estático por SPOS_URL
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            data: {  // Ahora estamos anidando el cuerpo de la solicitud dentro de la clave `data`
                id: 0,                       // Este es el ID para un nuevo cliente
                nom: nom.trim(),             // Parte 1 del nombre
                prenom: prenom.trim(),       // Parte 2 del nombre
                idprof1: nitValue,           // NIT del cliente
                address: direccionValue,     // Dirección
                tel: telefonoValue,          // Teléfono
                email: emailValue,           // Correo electrónico
                cp: '',                      // Código postal (vacío)
                ville: '',                   // Ciudad (vacío)
                town: '',                    // Población (vacío)
                zip: '',   
                user: userId,                  // Código postal adicional (vacío)
              }               // Código postal adicional (vacío)
        }),
      });
  
      const addCustomerData = await addCustomerResponse.json();
      console.log('Respuesta del API de creación:', addCustomerData);
  
      if (addCustomerData.error.value === 0) {
        // Cliente creado correctamente
        console.log('Cliente creado correctamente, actualizando UI...');
        setSelectedCustomer(`${nom} ${prenom}`); // Actualizamos el cliente seleccionado
  
        setAlert({ show: true, type: 'success', message: 'Cliente creado correctamente.' });
        setTimeout(() => {
          setAlert({ ...alert, show: false });
          closeModal();  // Cerramos el modal después de crear el cliente
        }, 3000);
      } else {
        // Error en la creación del cliente
        console.log('Error al crear el cliente:', addCustomerData.error.desc);
        setAlert({ show: true, type: 'error', message: addCustomerData.error.desc });
        setTimeout(() => setAlert({ ...alert, show: false }), 3000);
      }
    } catch (error) {
      // Mostrar alerta en caso de error en la solicitud
      console.error('Error al verificar o crear cliente:', error);
      setAlert({ show: true, type: 'error', message: 'Error al procesar la solicitud.' });
      setTimeout(() => setAlert({ ...alert, show: false }), 3000);
    }
  };
  const handleRemoveProduct = (index) => {
    const newCart = cart.filter((_, i) => i !== index);
    setCart(newCart);
  };

  const profileImage = `${variables.SPOS_URL}/documents/mycompany/logos/thumbs/${variables.MAIN_INFO_SOCIETE_LOGO_SQUARRED_MINI}`;


  useEffect(() => {
    setTotal(calculateTotal());
    setSaldo(calculateTotal());
  }, [cart]);

  const handleSearch = (value, searchFunction, delay = 500) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (value.trim()) {
        searchFunction(value);
      }
    }, delay);
  };

  

  const fetchProducts = async (searchTerm) => {
    try {
      const customerId = selectedCustomerDetails?.id || '1'; // Usar el ID del cliente o '1' como valor predeterminado
  
      const response = await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=searchProductsN`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            search: searchTerm,
            warehouse: terminal.fk_warehouse,
            ticketstate: '0',
            customer: customerId, // Pasar el ID del cliente seleccionado
            type: tipoVenta === "Cotizacion" ? 0 : tipoVenta === "Pedido" ? 2 : 3,
          },
        }),
      });
  
      const data = await response.json();
      setProducts(data.data || []);  // Aseguramos que data sea un array
      setShowProductSuggestions(true); // Mostrar las sugerencias de productos
  
      // Si hay solo un producto y coincide el código, agregarlo automáticamente
      if (data.data.length === 1) {
        handleAddProduct(data.data[0]);
        setShowProductSuggestions(false); // Ocultar las sugerencias si el producto se agrega
        setProductSearch(''); // Limpiar el cuadro de búsqueda
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };
  

  const handleSubtotalChange = async (index, newSubtotal) => {
    const updatedCart = [...cart];
    const item = updatedCart[index];
  
    if (newSubtotal === '' || newSubtotal <= 0) {
      setAlert({
        show: true,
        type: 'error',
        message: 'El subtotal no puede estar vacío ni ser 0.',
      });
      return;
    }
  
    try {
      const response = await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=searchProductsN`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            search: item.ref,
            warehouse: terminal.fk_warehouse,
            ticketstate: '0',
            customer: selectedCustomerDetails?.id || '1',
            type: tipoVenta === "Cotizacion" ? 0 : tipoVenta === "Pedido" ? 2 : 3,
          },
        }),
      });
  
      const data = await response.json();
  
      if (data.error.value === 0 && data.data.length > 0) {
        const productInfo = data.data[0];
        const priceTtcMin = parseFloat(productInfo.price_ttc_min);
  
        if (newSubtotal >= priceTtcMin * item.quantity) {
          item.price = newSubtotal / item.quantity / ((100 - item.discount) / 100);
          setCart(updatedCart);
        } else {
          setAlert({
            show: true,
            type: 'error',
            message: `El subtotal debe ser mayor o igual a Q${(priceTtcMin * item.quantity).toFixed(2)} después del descuento.`,
          });
        }
      } else {
        setAlert({
          show: true,
          type: 'error',
          message: 'Error al obtener el precio mínimo del producto.',
        });
      }
    } catch (error) {
      console.error('Error fetching product info:', error);
      setAlert({
        show: true,
        type: 'error',
        message: 'Error al validar el subtotal.',
      });
    }
  };
  
  


 
  const fetchCustomers = async (searchTerm) => {
    try {
      const response = await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=searchCustomer`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: searchTerm }), // Enviar el término de búsqueda
      });
  
      const data = await response.json();
  
      if (data.error && data.error.value === 0) {
        setCustomers(data.data || []);
        setShowSuggestions(true);
  
        // Verificar si hay datos de cliente y guardar todos los detalles del cliente
        if (data.data.length > 0) {
          const customer = data.data[0];
          setCustomerDiscount(parseFloat(customer.remise) || 0); // Asignar el descuento del cliente
  
          // Guardar todos los detalles del cliente en el estado para un uso posterior
          setSelectedCustomerDetails(customer); // Debes crear un estado separado para guardar los detalles
        }
      } else {
        console.error('Error al buscar clientes:', data.error.desc);
        setCustomers([]);
        setShowSuggestions(false);
        setCustomerDiscount(0); // Reiniciar descuento en caso de error
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
      setShowSuggestions(false);
      setCustomerDiscount(0); // Reiniciar descuento en caso de error
    }
  };
  


  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleProductSearchChange = (e) => {
    setProductSearch(e.target.value); // Actualiza el estado con el valor del campo de entrada
  };

  const handleCustomerSearchChange = (e) => {
    setCustomerSearch(e.target.value);
    setIsCustomerSearchFocused(true); // Solo activar la lista de sugerencias cuando se escribe en el campo de búsqueda
    setSelectedCustomerDetails(null); // Limpiar los detalles del cliente cuando se cambia la búsqueda
  };
  

  const handleNoteChange = (index, value) => {
    const updatedCart = [...cart];
    updatedCart[index].note = value;
    setCart(updatedCart);
  };

  const calculateSubtotal = () => cart.reduce((sum, item) => sum + (item.price ? item.price * item.quantity : 0), 0);
  const calculateDiscount = () => cart.reduce((sum, item) => sum + (item.price * item.quantity * item.discount / 100), 0);
  const calculateTotal = () => calculateSubtotal() - calculateDiscount();
  const handleNitChange = (e) => {
    const value = e.target.value;
    setNitValue(value);
    handleSearch(value, async (nit) => {
      try {
        setIsLoading(true);
        const response = await fetch(`${variables.SPOS_SERVICIOS_URL}/desarrollo/validanitjson.php?&nit=${nit}&enti=1`);
        const data = await response.json();
        
        if (!data.nombre || !data.dir || !data.nit) {
          setAlert({ show: true, type: 'error', message: 'NIT no encontrado. Por favor verifique.' });
        } else {
          setNombreValue(data.nombre);
          setDireccionValue(data.dir);
          setAlert({ show: true, type: 'success', message: 'Cliente encontrado y cargado.' });
        }
      } catch (error) {
        setAlert({ show: true, type: 'error', message: 'Error al buscar NIT.' });
        console.error('Error al buscar NIT:', error);
      } finally {
        setIsLoading(false);
      }
    }, 1000);
  };

 


  const handleAddPayment = () => {
    if (newPaymentAmount > 0 && selectedPaymentMethod) {
      // Verificar el método de pago seleccionado y agregarlo al estado de payments
      const selectedMethod = terminal.payment_methods.find(method => method.label === selectedPaymentMethod);
  
      if (selectedMethod) {
        // Añadir al estado de pagos solo la información necesaria (label y rowid)
        const newPayments = [
          ...payments,
          { 
            method: selectedMethod.label,  // Usar el label del método de pago 
            amount: newPaymentAmount, 
            idBank: selectedMethod.fk_bank, // ID del método de pago
            idTipop: selectedMethod.fk_c_paiement

          }
        ];
        setPayments(newPayments);
        setSaldo(saldo - newPaymentAmount);
        setNewPaymentAmount(0);
        setSelectedPaymentMethod('');
      }
    }
  };
  
  
  

  const handleOpenPaymentModal = () => {

    if (cart.length === 0) {
      setAlert({ show: true, type: 'error', message: 'Debe agregar al menos un artículo al carrito antes de realizar el pago.' });
      return;
    }
    
    if (!selectedCategory) {
      setAlert({ show: true, type: 'error', message: 'Seleccione un vendedor antes de continuar.' });
      return; // No abre el modal si no hay un vendedor seleccionado
    }
    setIsPaymentModalOpen(true); // Abre el modal si se cumple la condición
  };
  

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
  };

  const handleFinishPayments = () => {
    if (saldo > 0) {
      console.log("El cliente queda debiendo:", saldo);
    } else {
      console.log("Pago completo");
    }
    handleClosePaymentModal();
  };



  const fetchVendors = async () => {
    try {
      const response = await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=selectUsers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
  
      const data = await response.json();
      // Transformar los datos en un array y asignarlo al estado vendors
      const vendorsList = Object.keys(data).map(key => ({
        code: data[key].code,
        label: data[key].label,
        login: data[key].login,
        photo: `${variables.SPOS_URL}${data[key].photo}`, // Concatenar la URL base con la foto
      }));
      setVendors(vendorsList);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };
  
  useEffect(() => {
    fetchVendors();
  }, []);

  

  const handleLogout = () => {
    logout();
    window.location.href = (`${variables.SPOS_URL}/custom/build`);
  };

  const handleCierreCaja = () => {
    console.log('Cierre de Caja');
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };




  const handleSuspend = async () => {
    try {
      // Extraer el ID del cliente desde el estado
      const customerId = selectedCustomerDetails?.id || '1'; // Usar el ID del cliente o '1' como valor predeterminado
  
      // Verificar si es un ticket nuevo o uno existente
      const ticketId = selectedTicket?.id || 0; // Obtener el ID del ticket seleccionado o usar 0 para un ticket nuevo
  
      // Crear el objeto de datos según los detalles proporcionados
      const data = {
        id: ticketId,
        payment_type: 0,
       // clase: tipoVenta === "Cotizacion" ? 0 : tipoVenta === "Pedido" ? 2 : 3,
        type: tipoVenta === "Cotizacion" ? 0 : tipoVenta === "Pedido" ? 2 : 3,
        discount_percent: customerDiscount.toString(),
        discount_qty: 0,
        lines: cart.map(item => ({
          id: item.idLine || 0,
          idProduct: item.id,
          ref: 0,
          label: item.name,
          description: item.note || "",
          discount: 0,
          cant: item.quantity,
          idTicket: ticketId,
          localtax1_tx: 0,
          localtax2_tx: 0,
          tva_tx: "0.000",
          price: parseFloat(item.price).toFixed(8),
          price_ttc: parseFloat(item.price).toFixed(8),
          total: (item.price * item.quantity * (1 - item.discount / 100)).toFixed(2),
          price_min_ttc: "0.00000000",
          price_base_type: "TTC",
          fk_product_type: "0",
          total_ttc: (item.price * item.quantity).toFixed(2),
          total_ttc_without_discount: (item.price * item.quantity).toFixed(2),
          diff_price: 0,
          orig_price: parseFloat(item.price).toFixed(8),
          remise_percent_global: customerDiscount.toString(),
          socid: customerId
        })),
        oldproducts: [],
        total: calculateTotal(),
        customerpay: 0,
        difpayment: 0,
        customerId: customerId,
        employeeId: userId,
        state: 0,
        id_place: 0,
        note: generalNotes,
        mode: 0,
        points: 0,
        idCoupon: 0,
        ret_points: 0,
        customerpay1: 0,
        customerpay2: 0,
        customerpay3: 0,
        id_vendor: selectedCategory,
        is_fel: tipoVenta === "Factura" && isFel ? 1 : 0,
        cashId: terminal.rowid,
        extraFields: extraFields // Añadir los campos extras
      };
  
      // Hacer la solicitud POST para guardar el ticket
      const response = await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=saveTickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data }),
      });
  
      const result = await response.json();
      if (result.error && result.error.value === 0) {
        setAlert({ show: true, type: 'success', message: 'Ticket suspendido correctamente.' });
  
        // Enviar los campos personalizados al servidor
        await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=saveExtrafields`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ticketId: result.data.id, // ID del ticket guardado
            extraFields: extraFields, // Campos personalizados
            clase: 4
          }),
        });
  
        // Restablecer los estados para una nueva venta
        setCart([]);
        setProductSearch('');
        setCustomerSearch('');
        setSelectedCustomer('Walk in Customer');
        setSelectedCustomerDetails(null);
        setCustomerDiscount(0);
        setTipoVenta("Cotizacion");
        setGeneralNotes('');
        setSelectedTicket(null);
        setSelectedCategory(''); // Limpiar el campo de vendedor
        setExtraFields({}); // Limpiar los campos personalizados
      } else {
        setAlert({ show: true, type: 'error', message: 'Error al suspender el ticket.' });
        console.error('Error al suspender el ticket:', result.error.desc);
      }
    } catch (error) {
      setAlert({ show: true, type: 'error', message: 'Error al suspender el ticket.' });
      console.error('Error al suspender el ticket:', error);
    }
  };
  
  

  const handleSaveFactura = async () => {

    if (!selectedCategory) {
        setAlert({ show: true, type: 'error', message: 'Seleccione un vendedor antes de guardar.' });
        return;
    }
    if (cart.length === 0) {
      setAlert({ show: true, type: 'error', message: 'Debe agregar al menos un artículo al carrito antes de guardar la factura.' });
      return;
    }

    try {
        const customerId = selectedCustomerDetails?.id || '1';
        const ticketId = selectedTicket?.id || 0;

        // Calcular la suma total de los pagos
        let totalPayments = 0;
        let paymentData = {};

        // Procesar cada pago ingresado por el usuario
        payments.forEach((payment, index) => {
            totalPayments += payment.amount;
            paymentData[`customerpay${index + 1}`] = payment.amount;
            paymentData[`idbank${index + 1}`] = payment.idBank;
            paymentData[`tipopago${index + 1}`] = payment.method;
            paymentData[`tipopagokey${index + 1}`] = payment.idTipop;
        });

        // Calcular la diferencia entre el total del ticket y la suma de los pagos
        const difference = calculateTotal() - totalPayments;

        // Determinar el tipo con el que nació el ticket
        const oldType = selectedTicket ? selectedTicket.type : (tipoVenta === "Pedido" ? 2 : tipoVenta === "Factura" ? 3 : 0);

        // Crear el objeto de datos para enviar al API
        const data = {
            id: ticketId,
            payment_type: 0,
            warehouse: terminal.fk_warehouse,
            clase: tipoVenta === "Cotizacion" ? 0 : tipoVenta === "Pedido" ? 2 : 3,
            type: 0,
            old_type: oldType,
            discount_percent: customerDiscount.toString(),
            discount_qty: 0,
            lines: cart.map(item => ({
                id: item.idLine || 0,
                idProduct: item.id,
                ref: 0,
                label: item.name,
                description: item.note || "",
                discount: 0,
                cant: item.quantity,
                idTicket: ticketId,
                localtax1_tx: 0,
                localtax2_tx: 0,
                tva_tx: "0.000",
                price: parseFloat(item.price).toFixed(8),
                price_ttc: parseFloat(item.price).toFixed(8),
                total: (item.price * item.quantity * (1 - item.discount / 100)).toFixed(2),
                price_min_ttc: "0.00000000",
                price_base_type: "TTC",
                fk_product_type: "0",
                total_ttc: (item.price * item.quantity).toFixed(2),
                total_ttc_without_discount: (item.price * item.quantity).toFixed(2),
                diff_price: 0,
                orig_price: parseFloat(item.price).toFixed(8),
                remise_percent_global: customerDiscount.toString(),
                socid: customerId
            })),
            oldproducts: [],
            total: calculateTotal(),
            customerpay: totalPayments,
            difpayment: difference,
            customerId: customerId,
            employeeId: userId,
            state: 0,
            id_place: 0,
            note: generalNotes,
            mode: 2,
            points: 0,
            idCoupon: 0,
            ret_points: 0,
            ...paymentData,
            id_vendor: selectedCategory,
            is_fel: tipoVenta === "Factura" && isFel ? 1 : 0,
            cashId: terminal.rowid,
            entity: terminal.entity,
            extraFields: extraFields
        };
        
        const response = await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=saveTickets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ data }),
        });

        const result = await response.json();
        if (result.error && result.error.value === 0) {
            setAlert({ show: true, type: 'success', message: 'Factura guardada correctamente.' });

            const isFelDocument = data.is_fel === 1;
            
            if (!isFelDocument) {
                const ticketData = {
                    company: terminal.name,
                    terminal: terminal.label,
                    documentType: 'Ticket',
                    ref: result.data.ref,
                    customerName: selectedCustomer,
                    customerNit: selectedCustomerDetails?.idprof1 || 'CF',
                    items: cart.map(item => ({
                        ...item,
                        total: (item.price * item.quantity * (1 - item.discount / 100)).toFixed(2)
                    })),
                    subtotal: calculateSubtotal(),
                    discount: calculateDiscount(),
                    total: calculateTotal(),
                    vendorName: vendors.find(v => v.code === selectedCategory)?.label || '',
                    note: generalNotes,
                    extraFields: extraFields,
                    nit: terminal.nit || '',
                    address: terminal.address || '',
                    phone: terminal.phone || '',
                    email: terminal.email || ''
                };

                setTicketData(ticketData);
                setShowTicket(true);
            } else {
                // Abrir la URL con los parámetros `documentId` y `entity`
                window.open(`${variables.SPOS_SERVICIOS_FEL}?id=${result.data.id}&entity=${terminal.entity}`, '_blank');
            }

            // Restablecer los estados para una nueva venta
            setCart([]);
            setProductSearch('');
            setCustomerSearch('');
            loadDefaultCustomer();
           //s setSelectedCustomer('Walk in Customer');
            setSelectedCustomerDetails(null);
            setCustomerDiscount(0);
            setTipoVenta("Cotizacion");
            setGeneralNotes('');
            setSelectedTicket(null);
            setSelectedCategory('');
            setExtraFields({});
            setPayments([]);
            setIsPaymentModalOpen(false);
        } else {
            setAlert({ show: true, type: 'error', message: 'Error al guardar el ticket.' });
            console.error('Error al guardar el ticket:', result.error.desc);
        }
    } catch (error) {
        setAlert({ show: true, type: 'error', message: 'Error al guardar el ticket.' });
        console.error('Error al guardar el ticket:', error);
    }
};

  
  // Agrega la función handlePrintTicket en el componente Pos
  const handlePrintTicket = (item, documentType) => {
    // Procesar extrafields para convertirlo en un formato renderizable
    let processedExtraFields = {};
    if (item.extrafields && Array.isArray(item.extrafields)) {
      item.extrafields.forEach(field => {
        // Excluir campos especiales y convertir el resto a string
        Object.entries(field).forEach(([key, value]) => {
          if (key !== 'fk_object' && key !== 'rowid') {
            processedExtraFields[key] = String(value); // Convertir el valor a string
          }
        });
      });
    }
  
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
      extraFields: processedExtraFields, // Usar los campos procesados
      nit: terminal.nit || '',
      address: terminal.address || '',
      phone: terminal.phone || '',
      email: terminal.email || ''
    };
  
    setTicketData(ticketData);
    setShowTicket(true);
  };
  
  
  /*
  const handlePrintHistoryItem = (item) => {
  const ticketData = {
    company: terminal.name,
    terminal: terminal.label,
    documentType: item.type === "0" ? 'Cotización' : 
                 item.type === "2" ? 'Pedido' : 
                 item.type === "3" ? 'Factura' : 'Documento',
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
    extraFields: item.extrafields || {},
    nit: terminal.nit || '',
    address: terminal.address || '',
    phone: terminal.phone || '',
    email: terminal.email || ''
  };

  setTicketData(ticketData);
  setShowTicket(true);
};
  
  */

const handleOpenSuspendedModal = async () => {
  try {
    // Hacer una solicitud GET para obtener los tickets suspendidos
    const response = await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=getTickets&terminal=${terminal.rowid}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();

    // Verificar si la respuesta es exitosa y contiene datos
    if (data.data) {
      setSuspendedTickets(data.data || []); // Establecer los tickets recibidos en el estado
    } else {
      console.error('Error al obtener los tickets suspendidos:', data.error.desc || 'Unknown error');
      setSuspendedTickets([]); // Limpiar los tickets suspendidos en caso de error
    }
  } catch (error) {
    console.error('Error al obtener los tickets suspendidos:', error);
    setSuspendedTickets([]); // Limpiar los tickets suspendidos en caso de error
  }

  // Abrir el modal de tickets suspendidos
  setIsSuspendedModalOpen(true);
};




// Función para cerrar el modal
const handleCloseSuspendedModal = () => {
  setIsSuspendedModalOpen(false);
};


const handleEditTicket = (ticket) => {
  // Establecer el ticket seleccionado en el estado
  setSelectedTicket(ticket);

  // Llenar los datos del cliente
  setSelectedCustomer(ticket.customerName);
  setCustomerSearch(ticket.customerName);
  setIsCustomerSearchFocused(false);

  // Asignar detalles del cliente
  setSelectedCustomerDetails({ 
    id: ticket.customerId,
    remise: ticket.discount_percent
  });

  // Llenar notas generales y líneas del carrito
  setGeneralNotes(ticket.note || '');
  setCart(ticket.lines.map(line => ({
    id: line.idProduct,
    idLine: line.id,
    name: line.label,
    price: parseFloat(line.price),
    quantity: parseInt(line.cant, 10),
    discount: parseFloat(line.discount),
    note: line.note
  })));

  // Actualizar el tipo de venta en función del ticket
  // Asegúrate de que los valores de `ticket.type` sean exactamente los que esperas (0, 2, 3, etc.)
  let tipoVentaActual = "Cotizacion";
  if (ticket.type === "2") {
    tipoVentaActual = "Pedido";
  } else if (ticket.type === "3") {
    tipoVentaActual = "Factura";
  }

  setTipoVenta(tipoVentaActual);

  // Establecer el estado de FEL basado en el tipo de venta
  setIsFel(tipoVentaActual === "Factura" && ticket.is_fel === 1);

  // Rellenar los campos personalizados desde la respuesta del ticket
  if (ticket.extrafields && Array.isArray(ticket.extrafields)) {
    const newExtraFields = {};
    ticket.extrafields.forEach(field => {
      // Agregar cada campo personalizado a 'newExtraFields'
      for (const [key, value] of Object.entries(field)) {
        if (key !== 'fk_object' && key !== 'rowid') {
          newExtraFields[key] = value;
        }
      }
    });
    setExtraFields(newExtraFields);
  }

  // Cerrar el modal de tickets suspendidos
  setIsSuspendedModalOpen(false);
};





// inicia render


  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {alert.show && <Alert type={alert.type} message={alert.message} onClose={() => setAlert({ ...alert, show: false })} />}

        {/* Modal de Cierre de Caja */}
      {isCashClosureModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-11/12 md:w-1/3">
            <h2 className="text-xl font-bold mb-4">Cierre de Caja</h2>
            <p>Efectivo: Q.{cashBalance.toFixed(2)}</p>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Monto de Cierre</span>
              </label>
              <input
                type="number"
                className="input input-bordered w-full"
                value={closureAmount}
                onChange={(e) => setClosureAmount(e.target.value)}
                placeholder="Ingresa el monto de cierre"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <button
                className="btn btn-secondary"
                onClick={() => setIsCashClosureModalOpen(false)}
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
      

 {/* Modal para Cotizaciones, Pedidos y Facturas */}
 {isSalesHistoryModalOpen && (
  <div className="modal modal-open modal-history z-50">
    <div className="modal-box w-11/12 md:w-3/4 max-w-4xl h-[80vh] p-0">
      {/* Header con título y botón de cierre */}
      <div className="sticky top-0 z-10 bg-base-100 border-b">
        <div className="p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Historial de Ventas</h2>
          <button 
            className="btn btn-sm btn-circle btn-ghost"
            onClick={handleCloseSalesHistoryModal}
          >
            ✕
          </button>
        </div>

        {/* Campo de búsqueda */}
        <div className="px-4 pb-2">
          <div className="form-control">
            <div className="input-group">
              <input
                type="text"
                placeholder="Buscar por número..."
                className="input input-bordered w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button className="btn btn-square">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="tabs tabs-boxed bg-base-200 p-2 flex justify-center gap-2">
          {[
            { id: 'Cotizaciones', label: 'Cotizaciones', data: salesData.cotizaciones },
        //    { id: 'Pedidos', label: 'Pedidos', data: salesData.pedidos },
            { id: 'Facturas', label: 'Facturas', data: salesData.facturas }
          ].map(tab => (
            <button
              key={tab.id}
              className={`tab tab-lg ${activeTab === tab.id ? 'tab-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="flex items-center gap-2">
                {tab.label}
                {tab.data.length > 0 && (
                  <span className="badge badge-sm">
                    {searchTerm 
                      ? tab.data.filter(item => item.ref.toString().includes(searchTerm)).length 
                      : tab.data.length}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Contenido con scroll */}
      <div className="overflow-y-auto p-4" style={{ height: 'calc(80vh - 180px)' }}>
        <div className="grid gap-4">
          {/* Cotizaciones */}
          {activeTab === "Cotizaciones" && (
            <div className="space-y-4">
              {salesData.cotizaciones.length > 0 ? (
                salesData.cotizaciones
                  .filter(item => item.ref.toString().includes(searchTerm))
                  .map((item, index) => (
                    <div key={index} className="card bg-base-100 shadow-sm hover:shadow-md transition-all duration-200">
                      <div className="card-body p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <h3 className="text-lg font-bold">Cotización #{item.ref}</h3>
                            <span className="badge badge-ghost text-xs">{item.date_creation || 'Sin fecha'}</span>
                            <p className="text-sm opacity-75">Cliente: {item.customerName}</p>
                            <p className="text-lg font-semibold text-primary">Q{parseFloat(item.total_ttc).toFixed(2)}</p>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              className="btn btn-primary btn-sm"
                              onClick={() => handleSelectHistoryItem(item)}
                            >
                              Seleccionar
                            </button>
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={() => handlePrintTicket(item, 'Cotización')}
                            >
                              Imprimir
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="flex flex-col items-center justify-center p-8">
                  <p className="text-center text-gray-500">No hay cotizaciones disponibles.</p>
                </div>
              )}
            </div>
          )}

          {/* Pedidos */}
        {/*  {activeTab === "Pedidos" && (
            <div className="space-y-4">
              {salesData.pedidos.length > 0 ? (
                salesData.pedidos
                  .filter(item => item.ref.toString().includes(searchTerm))
                  .map((item, index) => (
                    <div key={index} className="card bg-base-100 shadow-sm hover:shadow-md transition-all duration-200">
                      <div className="card-body p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <h3 className="text-lg font-bold">Pedido #{item.ref}</h3>
                            <span className="badge badge-ghost text-xs">{item.date_creation || 'Sin fecha'}</span>
                            <p className="text-sm opacity-75">Cliente: {item.customerName}</p>
                            <p className="text-lg font-semibold text-primary">Q{parseFloat(item.total_ttc).toFixed(2)}</p>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              className="btn btn-primary btn-sm"
                              onClick={() => handleSelectHistoryItem(item)}
                            >
                              Seleccionar
                            </button>
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={() => handlePrintTicket(item, 'Pedido')}
                            >
                              Imprimir
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="flex flex-col items-center justify-center p-8">
                  <p className="text-center text-gray-500">No hay pedidos disponibles.</p>
                </div>
              )}
            </div>
          )} */}

          {/* Facturas */}
          {activeTab === "Facturas" && (
            <div className="space-y-4">
              {salesData.facturas.length > 0 ? (
                salesData.facturas
                  .filter(item => item.ref.toString().includes(searchTerm))
                  .map((item, index) => (
                    <div key={index} className="card bg-base-100 shadow-sm hover:shadow-md transition-all duration-200">
                      <div className="card-body p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <h3 className="text-lg font-bold">Factura #{item.ref}</h3>
                            <span className="badge badge-ghost text-xs">{item.date_creation || 'Sin fecha'}</span>
                            <p className="text-sm opacity-75">Cliente: {item.customerName}</p>
                            <p className="text-lg font-semibold text-primary">Q{parseFloat(item.total_ttc).toFixed(2)}</p>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              className="btn btn-primary btn-sm"
                              onClick={() => handleSelectHistoryItem(item)}
                            >
                              Seleccionar
                            </button>
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={() => handlePrintTicket(item, 'Factura')}
                            >
                              Imprimir
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="flex flex-col items-center justify-center p-8">
                  <p className="text-center text-gray-500">No hay facturas disponibles.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mostrar mensaje cuando no hay resultados de búsqueda */}
        {searchTerm && (
          (activeTab === "Cotizaciones" && !salesData.cotizaciones.filter(item => item.ref.toString().includes(searchTerm)).length) ||
          (activeTab === "Pedidos" && !salesData.pedidos.filter(item => item.ref.toString().includes(searchTerm)).length) ||
          (activeTab === "Facturas" && !salesData.facturas.filter(item => item.ref.toString().includes(searchTerm)).length)
        ) && (
          <div className="text-center py-4 text-gray-500">
            No se encontraron resultados para la búsqueda "{searchTerm}"
          </div>
        )}
      </div>
    </div>
    <div className="modal-backdrop bg-black/50" onClick={handleCloseSalesHistoryModal} />
  </div>
)}

     {/* teriman modal */} 
      
{/* Modal para pagos */}
{isPaymentModalOpen && (
  <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
    <div className="bg-white p-6 rounded-lg shadow-lg w-11/12 md:w-1/3">
      <h2 className="text-xl font-bold mb-4">Registrar Pagos</h2>
      <p>Total: Q.{total.toFixed(2)}</p>
      <p>Saldo pendiente: Q.{saldo.toFixed(2)}</p>

      {/* Mostrar los pagos realizados */}
{payments.length > 0 && (
  <ul className="mb-4">
    {payments.map((payment, index) => (
      <li key={index} className="text-sm">
        {/* Renderiza las propiedades que sean primitivas */}
        {payment.method}: Q.{payment.amount.toFixed(2)}
      </li>
    ))}
  </ul>
)}


      {/* Seleccionar método de pago */}
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">Método de Pago</span>
        </label>
        <select
          className="select select-bordered w-full"
          value={selectedPaymentMethod}
          onChange={(e) => setSelectedPaymentMethod(e.target.value)}
        >
          <option disabled value="">Selecciona un método</option>
          {terminal.payment_methods.map((method) => (
            <option key={method.rowid} value={method.label}>
              {method.label}
            </option>
          ))}
        </select>
      </div>

      {/* Monto del pago con botón para rellenar automáticamente */}
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">Monto del Pago</span>
        </label>
        <div className="relative flex items-center">
          <input
            type="number"
            className="input input-bordered w-full"
            value={newPaymentAmount}
            onChange={(e) => setNewPaymentAmount(parseFloat(e.target.value))}
            placeholder="Ingresa el monto"
          />
          <button 
            className="btn btn-primary ml-2"
            onClick={() => setNewPaymentAmount(saldo)} // Botón para rellenar con el saldo pendiente
          >
            Usar Saldo
          </button>
        </div>
      </div>

      {/* Botón para agregar pago */}
<button 
  className="btn btn-primary w-full mb-4" 
  onClick={handleAddPayment} 
 // disabled={newPaymentAmount <= 0 || saldo <= 0}
>
  Agregar Pago
</button>


      {/* Botón para finalizar pagos */}
<button 
  className="btn btn-primary w-full mb-4" 
  onClick={handleSaveFactura} 
 // disabled={payments.length === 0}
>
  Finalizar Pagos
</button>

 {/* Botón para cerrar el modal de pagos */}
 <button 
        className="btn btn-secondary w-full mb-4" 
        onClick={handleClosePaymentModal} 
      >
        Cerrar
      </button>
    </div>
  </div>
)}




{/* Barra superior */}
<div className="bg-white p-2 flex flex-wrap justify-between items-center shadow-sm">
  <div className="flex flex-wrap items-center space-x-2 md:space-x-4">
    <span className="text-purple-600 font-bold text-sm md:text-base">BIENVENIDO</span>
    <span className="text-xs md:text-sm">{user}</span>
    <span className="text-xs md:text-sm text-gray-500">{currentTime}</span>
  </div> 
  

  {/* Dropdown para tipo de venta */}
  <div className="flex flex-wrap items-center space-x-2 md:space-x-4 mt-2 md:mt-0">
    <span className="text-xs md:text-sm text-purple-600">{terminal.time}</span>
    <span className="text-xs md:text-sm">{terminal.date}</span>

    {/* Mostrar el nombre de la terminal seleccionada */}
    <span className="text-xs md:text-sm font-bold text-blue-600">
      {terminal.name} {/* Mostrar el nombre de la terminal */}
    </span>

    <div className="relative">
    <select 
  className="select select-bordered text-xs md:text-sm" 
  value={tipoVenta} 
  onChange={handleTipoVentaChange} 
  //disabled={tipoVenta === "Factura"} // Sólo bloquea si es "Factura"
>
  <option value="Cotizacion" data-id="0">Cotización</option>
 {/* <option value="Pedido" data-id="2">Pedido</option>*/}
  <option value="Factura" data-id="3">Factura</option>
</select>

</div>





    {/* Menú de perfil con opciones */}
    <div className="relative inline-block text-left z-50 mt-2 md:mt-0">
      <div>
        <button className="flex items-center focus:outline-none" onClick={toggleMenu}>
          <img
            src={profileImage}
            alt="Profile"
            className="w-6 h-6 md:w-8 md:h-8 rounded-full"
          />
          <svg
            className={`w-4 h-4 md:w-5 md:h-5 ml-2 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-40 md:w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="py-1" role="none">
            <button
              className="block px-4 py-2 text-xs md:text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
              onClick={handleLogout}
            >
              Logout
            </button>
            <button
              className="block px-4 py-2 text-xs md:text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
              onClick={handleOpenCashClosureModal}
            >
              Cierre de Caja
            </button>
            <button
              className="block px-4 py-2 text-xs md:text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
              onClick={handleCambioUsuario}
            >
              Cambio de Usuario
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
</div>


  {/* Contenido principal */}
  <div className="flex flex-1 flex-col md:flex-row overflow-hidden p-4 space-y-4 md:space-y-0 md:space-x-4">
    {/* Columna izquierda */}
    <div className="w-full md:w-1/4 space-y-4">


    <div className="bg-white p-4 rounded-lg shadow">
        <div className="form-control mb-4 relative">
          <label className="label">
            <span className="label-text text-xs md:text-sm">Buscar Cliente</span>
            <button 
              className="btn btn-ghost text-yellow-500 hover:bg-yellow-500 hover:text-white z-10 text-xs md:text-sm"
              onClick={() => {
                setNitValue('');
                setNombreValue('');
                setDireccionValue('');
                setIsModalOpen(true);
              }}
              disabled={!isEditable}
            >
              +
            </button>
          </label>

          <div className="input-group">



                        <input 
                type="text" 
                placeholder="Buscar Cliente" 
                className="input input-bordered w-full text-xs md:text-sm" 
                value={customerSearch} 
                onChange={handleCustomerSearchChange}
                onFocus={() => setShowSuggestions(true)}
                disabled={!isEditable} // Mostrar sugerencias al hacer foco
                />


          </div>

                        {showSuggestions && isCustomerSearchFocused && customers.length > 0 && (
                <ul className="absolute top-full left-0 w-full bg-white border border-gray-200 z-50 max-h-48 overflow-y-auto text-xs md:text-sm">
                    {customers.map((customer) => (
                        <li 
                        key={customer.id} 
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                        setSelectedCustomer(customer.nom); // Establece el nombre del cliente
                        setSelectedCustomerDetails(customer); // Establece los detalles completos del cliente, incluyendo el ID
                        setShowSuggestions(false);
                        setIsCustomerSearchFocused(false); // Desactivar enfoque al seleccionar
                        }}
                        >
                        {customer.nom}
                    </li>
                    ))}
                </ul>
                )}

        </div>

        {/* Información del cliente */}
        <div className="bg-purple-600 text-white p-4 rounded-lg">
          <h1 className="text-lg md:text-2xl font-bold">{selectedCustomer}</h1>
          {variables.SPOS_USA_NIVEL_PRECIOS === "1" && (
            <div>
              <label className="label">
                <span className="label-text text-xs md:text-sm">Nivel de precios</span>
              </label>
              <select
                className="select select-bordered w-full text-xs md:text-sm"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
              >
                <option value="Nivel 1">Nivel 1</option>
                <option value="Nivel 2">Nivel 2</option>
                <option value="Nivel 3">Nivel 3</option>
              </select>
            </div>
          )}

            {tipoVenta === "Factura" && (
                <div className="flex items-center space-x-2">
                <span className="text-xs md:text-sm">FEL</span>
                <label className="switch">
                    <input 
                    type="checkbox" 
                    checked={isFel} 
                    onChange={() => setIsFel(!isFel)} 
                    />
                    <span className="slider"></span>
                </label>
                </div>
            )}

        </div>

        {/* Botón para abrir el modal de CustomFields */}
            { variables.SPOS_EXTRAFIELDS === "1" && (

            <button className="btn btn-xs sm:btn-sm md:btn-md lg:btn-lg  w-full text-xs md:text-sm"  
                onClick={openCustomFieldsModal}   disabled={!isEditable}
            >
                Agregar información a esta venta
            </button>

            )}

                {/* Modal de CustomFields */}
                {isCustomFieldsModalOpen && (
                    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 p-4">
                    <div className="bg-white p-4 md:p-6 rounded-lg shadow-lg w-full md:w-1/2 max-w-lg mx-auto">
                        <h2 className="text-lg md:text-xl font-bold mb-4">Campos Personalizados</h2>
                        <CustomFields 
                        variables={variables} 
                        onFieldsChange={handleCustomFieldChange} 
                        extraFields={extraFields} // Pasar el estado completo de los campos personalizados
                        />
                        <div className="flex justify-end mt-4">
                        <button 
                            className="btn btn-secondary text-sm md:text-base"
                            onClick={closeCustomFieldsModal}
                        >
                            Cerrar
                        </button>
                        </div>
                    </div>
                    </div>
                )}



        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text text-xs md:text-sm">Notas Generales</span>
          </label>
          <textarea 
            className="input input-bordered w-full text-xs md:text-sm" 
            placeholder="Agregar notas generales"
            value={generalNotes || ''}
            onChange={(e) => setGeneralNotes(e.target.value)}
            disabled={!isEditable}
          />
        </div>

        {/* Total */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between text-xs md:text-sm">
            <span>Total Items</span>
            <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
          </div>
          <div className="flex justify-between text-xs md:text-sm">
            <span>Subtotal</span>
            <span>Q.{calculateSubtotal().toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs md:text-sm">
            <span>Descuento</span>
            <span>Q.{calculateDiscount().toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-sm md:text-lg mt-4">
            <span>Total:</span>
            <span>Q.{calculateTotal().toFixed(2)}</span>
          </div>
        </div>



        {/* Botones condicionales basados en tipo de venta */}
        {tipoVenta === "Factura" && (
        <button className="btn btn-primary w-full text-xs md:text-sm"      onClick={handleOpenPaymentModal}   >
            OK (Factura)
        </button>
        )}

        {tipoVenta === "Pedido" && (
        <button className="btn btn-primary w-full text-xs md:text-sm" onClick={handleSavePedido}   disabled={!isEditable}>
            Guardar Pedido
        </button>
        )}

        {tipoVenta === "Cotizacion" && (
        <button className="btn btn-primary w-full text-xs md:text-sm" onClick={handleSaveCotizacion}   disabled={!isEditable} >
            Guardar Cotización
        </button>
        )}




<button className="btn btn-secondary w-full text-xs md:text-sm" onClick={handleOpenSalesHistoryModal}>
  Historial de ventas
</button>

      </div>

          
    </div>

    {/* Columna central para el carrito */}
    <div className="w-full md:w-2/4 space-y-4">
      <div className="overflow-y-auto bg-white rounded-lg shadow" style={{ maxHeight: '600px' }}>
        <table className="table w-full text-xs md:text-sm">
          <thead>
            <tr>
              <th>Descripción</th>
              <th>Cantidad</th>
              <th>Descuento</th>
              <th>Subtotal</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
          {cart.map((item, index) => (
    <tr key={index} className={item.hasStock ? "" : "bg-red-100"}>
      <td className={item.hasStock ? "" : "text-red-500"}>
        {item.name}
        <br /><span className="text-xs text-gray-500">{item.ref}</span>
        <textarea
          className="input input-bordered mt-1 w-full text-xs"
          placeholder="Nota del producto"
          value={item.note || ''}
          onChange={(e) => handleNoteChange(index, e.target.value)}
          disabled={!isEditable}
        />
      </td>
      <td>
      <input
 type="text"
 inputMode="numeric"
 className="input input-bordered w-12 md:w-20 text-center"
 value={item.tempQuantity !== undefined ? item.tempQuantity : item.quantity}
 onChange={(e) => {
   const value = e.target.value;
   const newCart = [...cart];
   newCart[index] = {
     ...item,
     tempQuantity: value
   };
   setCart(newCart);
 }}
 onBlur={async (e) => {
   const value = e.target.value;
   if (value === '' || /^\d+$/.test(value)) {
     await handleQuantityChange(index, value === '' ? 1 : parseInt(value));
   }
   const newCart = [...cart];
   delete newCart[index].tempQuantity;
   setCart(newCart);
 }}
 disabled={!isEditable}
/>
      </td>
      <td>
        <div className="relative">
          <input
            type="text"
            inputMode="decimal"
            className="input input-bordered w-16 md:w-24 text-center pr-6"
            value={item.tempDiscount !== undefined ? item.tempDiscount : item.discount}
            onChange={(e) => {
              const value = e.target.value.replace(/[^\d.]/g, '');
              const newCart = [...cart];
              newCart[index] = {
                ...item,
                tempDiscount: value
              };
              setCart(newCart);
            }}
            onBlur={async (e) => {
              const value = parseFloat(e.target.value);
              if (!isNaN(value)) {
                await handleDiscountChange(index, value);
              }
              const newCart = [...cart];
              delete newCart[index].tempDiscount;
              setCart(newCart);
            }}
            disabled={!isEditable}
          />
          <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">%</span>
        </div>
      </td>
      <td>
        <div className="relative">
          <input
            type="text"
            inputMode="decimal"
            className="input input-bordered w-24 md:w-32 text-right pl-6"
            value={
              item.tempSubtotal !== undefined 
                ? item.tempSubtotal 
                : (item.price * item.quantity * (1 - item.discount / 100)).toFixed(2)
            }
            onChange={(e) => {
              const value = e.target.value.replace(/[^\d.]/g, '');
              const newCart = [...cart];
              newCart[index] = {
                ...item,
                tempSubtotal: value
              };
              setCart(newCart);
            }}
            onBlur={async (e) => {
              const value = parseFloat(e.target.value);
              if (!isNaN(value)) {
                await handleSubtotalChange(index, value);
              }
              const newCart = [...cart];
              delete newCart[index].tempSubtotal;
              setCart(newCart);
            }}
            disabled={!isEditable}
          />
          <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500">Q</span>
        </div>
      </td>
      <td>
        <button 
          className="btn btn-ghost btn-sm"
          onClick={() => handleRemoveProduct(index)} 
          disabled={!isEditable}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </td>
    </tr>
))}
</tbody>

        </table>
      </div>

      <div className="flex space-x-2">
      <button className="btn btn-error flex-1 text-xs md:text-sm" onClick={handleSuspend}   disabled={!isEditable} >
         Suspender
      </button>

      <button className="btn btn-warning flex-1 text-xs md:text-sm" onClick={handleOpenSuspendedModal}   disabled={!isEditable} >
          Suspendidas
        </button>

           {/* Modal de tickets suspendidos */}
           {isSuspendedModalOpen && (
  <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
    <div className="bg-white p-6 rounded-lg shadow-lg w-11/12 md:w-2/3 max-h-full overflow-y-auto">
      <h2 className="text-xl font-bold mb-4">Documentos Guardados</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {suspendedTickets.map((ticket, index) => (
          <div key={index} className="border border-purple-500 p-4 rounded-md relative">
            <h3 className="font-bold mb-2">Order {ticket.ref}</h3>
            <p className="text-sm"><strong>Cliente:</strong> {ticket.customerName}</p>
            <p className="text-sm">
              <strong>Tipo Doc:</strong> {ticket.type === "0" ? 'Cotización' : ticket.type === "2" ? 'Pedido' : ticket.type === "3" ? 'Factura' : 'Desconocido'}
            </p>
            <p className="text-purple-600 font-bold">
              <strong>Total:</strong> Q{parseFloat(ticket.total_ttc).toFixed(2)}
            </p>
            <div className="flex justify-end mt-2 space-x-2">
            <button 
  className="btn btn-xs btn-primary" 
  onClick={() => handleEditTicket(ticket)} // Llama a la función de edición pasando el ticket
>
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20h9" /> {/* Parte inferior del lápiz */}
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.88 3.39a1.5 1.5 0 012.12 2.12L7.5 17.12l-4 1 1-4L16.88 3.39z" /> {/* Cuerpo y punta del lápiz */}
  </svg>
</button>

</div>

          </div>
        ))}
      </div>
      <div className="flex justify-end mt-4">
        <button className="btn btn-secondary" onClick={handleCloseSuspendedModal}>
          Close
        </button>
      </div>
    </div>
  </div>
)}

  
      </div>
    </div>

    {/* Columna derecha */}
    <div className="w-full md:w-1/4 space-y-4">





                  
    <div className="flex flex-col md:flex-row space-x-0 md:space-x-2 space-y-2 md:space-y-0">
              
    <select 
  className="select select-bordered flex-1 text-xs md:text-sm truncate w-full md:max-w-[200px]" 
  value={selectedCategory} 
  onChange={(e) => setSelectedCategory(e.target.value)} 
  disabled={!isEditable}
>
  <option disabled value="">Seleccione Vendedor</option>
  {vendors.map((vendor) => (
    <option key={vendor.code} value={vendor.code} className="flex items-center space-x-2">
      <img 
        src={vendor.photo} 
        alt={vendor.label} 
        className="inline w-6 h-6 rounded-full mr-2" 
      />
      {vendor.label} {/* Muestra el nombre del vendedor */}
    </option>
  ))}
</select>



{/*
        <select className="select select-bordered flex-1 text-xs md:text-sm" value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)}>
          <option disabled value="">Categorias</option>
        </select>*/}
      </div>

      {/* Cuadro de búsqueda de productos */}
      <div className="form-control relative">
  <label className="label">
    <span className="label-text text-xs md:text-sm">Buscar Productos</span>
  </label>
  <div className="relative">
    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor" 
        className="w-4 h-4 md:w-5 md:h-5 text-gray-500"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
        />
      </svg>
    </span>

    <input 
      type="text" 
      placeholder="Buscar por descripción o código" 
      className="input input-bordered w-full pl-10 text-xs md:text-sm"
      value={productSearch} 
      onChange={handleProductSearchChange}
      onFocus={() => setShowProductSuggestions(true)}
      disabled={!isEditable}
    />
  </div>

  {showProductSuggestions && products.length > 0 && (
  <>
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-[999]" 
      onClick={() => setShowProductSuggestions(false)}
    />
    <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-xl z-[1000] max-h-[80vh] overflow-y-auto md:absolute md:bottom-auto md:top-full md:rounded-t-none md:rounded-b-xl">
      <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
        <span className="font-medium">{products.length} productos encontrados</span>
        <button 
          onClick={() => setShowProductSuggestions(false)}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="divide-y divide-gray-100">
        {products.map((product) => (
          <button
            key={product.id}
            className="w-full p-4 text-left hover:bg-gray-50 flex flex-col gap-1 transition-colors"
            onClick={() => {
              handleProductSelect(product);
              setShowProductSuggestions(false);
            }}
          >
            <span className="font-medium text-sm md:text-base">{product.label}</span>
            <div className="flex justify-between items-center text-xs md:text-sm">
              <span className="text-gray-600">
                Código: {product.ref || 'N/A'}
              </span>
              <span className="text-green-600 font-semibold">
                Q.{parseFloat(product.price_ttc).toFixed(2)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  </>
)}
</div>





    </div>
  </div>

  {/* Modal para crear un nuevo cliente */}
  {isModalOpen && (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded-lg shadow-lg w-11/12 md:w-1/3">
        <h2 className="text-xl font-bold mb-4">Crear Nuevo Cliente</h2>

        <form onSubmit={handleCreateCustomer} >
          <div className="form-control mb-4">
            <label className="input input-bordered flex items-center gap-2">
             
             
            <input
      type="text"
      className="grow"
      placeholder="NIT"
      value={nitValue}
      onChange={handleNitChange}
      
      required
    />


              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-4 w-4 opacity-70">
                <path
                  fillRule="evenodd"
                  d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
                  clipRule="evenodd" />
              </svg>
            </label>
            {!nitValue && <p className="text-red-500 text-sm">El campo NIT es obligatorio.</p>}
          </div>

          {isLoading && (
            <div className="flex justify-center items-center mt-2">
              <span className="loading loading-dots loading-xs"></span>
            </div>
          )}

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Nombre Completo</span>
            </label>
            <input 
              type="text" 
              className="input input-bordered" 
              placeholder="Nombre Completo" 
              value={nombreValue}
              onChange={(e) => setNombreValue(e.target.value)}
              required
            />
            {!nombreValue && <p className="text-red-500 text-sm">El campo Nombre es obligatorio.</p>}
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Dirección</span>
            </label>
            <input 
              type="text" 
              className="input input-bordered" 
              placeholder="Dirección" 
              value={direccionValue}
              onChange={(e) => setDireccionValue(e.target.value)}
            />
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Teléfono</span>
            </label>
            <input type="tel" className="input input-bordered" placeholder="Teléfono" />
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Correo Electrónico</span>
            </label>
            <input type="email" className="input input-bordered" placeholder="Correo Electrónico" />
          </div>

          <div className="flex justify-end space-x-2">
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={!nitValue || !nombreValue}
            >
              Guardar Cliente
            </button>


            
          </div>
        </form>
      </div>
    </div>
  )}


  {/* Al final del componente, antes del último div de cierre */}
{showTicket && ticketData && (
    <div className="fixed inset-0 flex items-center justify-center z-[100]"> {/* z-index más alto */}
  <PrintTicket
    ticketData={ticketData}
    onClose={() => setShowTicket(false)}
  />
    </div>
)}



{/* Botón de Nueva Venta */}
<div className="fixed bottom-4 right-4 z-50">
  <button
    onClick={() => {
      // Resetear todos los estados necesarios para una nueva venta
      setCart([]);
      setProductSearch('');
      setCustomerSearch('');
      loadDefaultCustomer();
      setSelectedCustomerDetails(null);
      setCustomerDiscount(0);
      setTipoVenta("Cotizacion");
      setGeneralNotes('');
      setSelectedTicket(null);
      setSelectedCategory('');
      setExtraFields({});
      setPayments([]);
      setIsPaymentModalOpen(false);
      setShowTicket(false);
      setIsEditable(true);
    }}
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


      
    </div>
  );
};

export default Pos;
