import React, { useState, useContext, useEffect, useRef } from 'react';
import Alert from './Alert'; 
import { AuthContext } from '../context/AuthContext';
import CustomFields from './CustomFields';

const Pos = ({ terminal }) => {
  const { user, company, variables, logout , userId} = useContext(AuthContext);
  const [extraFields, setExtraFields] = useState({});
  const [isCustomFieldsModalOpen, setIsCustomFieldsModalOpen] = useState(false); // Estado para controlar la visibilidad del modal
  const [productSearch, setProductSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('Walk in Customer');
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
  const [alert, setAlert] = useState({ show: false, type: '', message: '' }); // Estado para manejar la alerta
  const [customerDiscount, setCustomerDiscount] = useState(0); // Estado para almacenar el descuento del cliente
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState(null);
  const [isSuspendedModalOpen, setIsSuspendedModalOpen] = useState(false); // Estado para manejar el modal de suspendidas
  const [suspendedTickets, setSuspendedTickets] = useState([]); // Estado para almacenar los tickets suspendidos
  const [selectedTicket, setSelectedTicket] = useState(null); // Añade esto en la sección de estado
  const [isCustomerSearchFocused, setIsCustomerSearchFocused] = useState(false); // Control de enfoque para búsqueda de cliente





 
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

const handleTipoVentaChange = (e) => {
  const selectedTipo = e.target.value;
  setTipoVenta(selectedTipo);
  
  // Activa o desactiva el switch FEL según el tipo seleccionado
  setIsFel(selectedTipo === "Factura");
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




const handleSavePedido = () => {
  console.log("Guardando Cotización o Pedido...");
  // Aquí puedes implementar la lógica para guardar en el futuro
};

const handleSaveCotizacion = () => {
  console.log("Guardando Cotización o Pedido...");
  // Aquí puedes implementar la lógica para guardar en el futuro
};



  const handleCambioUsuario = () => {
    console.log('Cambio de Usuario');
  };

  const handleProductSelect = (product) => {
    handleAddProduct(product); // Agrega el producto seleccionado al carrito
    setProductSearch('');      // Limpiar el cuadro de búsqueda después de seleccionar
    setShowProductSuggestions(false); // Ocultar las sugerencias
  };


  const handleQuantityChange = (index, newQuantity) => {
    const newCart = [...cart];
    newCart[index].quantity = newQuantity;
    setCart(newCart);
  };

  const handleDiscountChange = (index, newDiscount) => {
    const newCart = [...cart];
    newCart[index].discount = newDiscount;
    setCart(newCart);
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
                zip: '',                     // Código postal adicional (vacío)
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

  const profileImage = 'https://via.placeholder.com/40'; 

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
  
      const response = await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=searchProducts`, { 
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
  

  

  const handleAddProduct = (product) => {
    const existingProductIndex = cart.findIndex(item => item.id === product.id);
    if (existingProductIndex !== -1) {
      const newCart = [...cart];
      newCart[existingProductIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, { 
        ...product, 
        name: product.label || 'Unnamed Product', // Verificar el nombre o un valor por defecto
        price: parseFloat(product.price_ttc) || 0,  // Asegurar que el precio sea un número
        quantity: 1, 
        discount: customerDiscount // Asignar el descuento del cliente al producto
      }]);
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
        const response = await fetch(`https://servicios.sielerp.com/desarrollo/validanitjson.php?&nit=${nit}&enti=1`);
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
      const newPayments = [...payments, { method: selectedPaymentMethod, amount: newPaymentAmount }];
      setPayments(newPayments);
      setSaldo(saldo - newPaymentAmount);
      setNewPaymentAmount(0);
      setSelectedPaymentMethod('');
    }
  };

  const handleOpenPaymentModal = () => {
    setIsPaymentModalOpen(true);
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
      setVendors(data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
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
            ticketId: result.data, // ID del ticket guardado
            extraFields: extraFields // Campos personalizados
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
/* ACA ME CAGUE EN TODO!!

const handleEditTicket = (ticket) => {
  // Establecer el ticket seleccionado en el estado
  setSelectedTicket(ticket);

  // Aquí se deberían llenar los estados relevantes con la información del ticket seleccionado
  setSelectedCustomer(ticket.customerName); // Asignar el nombre del cliente
  setCustomerSearch(ticket.customerName); // Actualizar la búsqueda de cliente con el nombre seleccionado
  setSelectedCustomerDetails({ 
    id: ticket.customerId,
    remise: ticket.discount_percent
  }); // Asignar detalles del cliente

  setGeneralNotes(ticket.note || ''); // Asignar las notas generales del ticket

  // Asignar las líneas de productos al carrito
  setCart(ticket.lines.map(line => ({
    id: line.idProduct,
    idLine: line.id, // Guardar el ID de la línea del ticket
    name: line.label,
    price: parseFloat(line.price),
    quantity: parseInt(line.cant, 10),
    discount: parseFloat(line.discount),
    note: line.description
  })));

  // Actualizar cualquier otro campo relevante
  setTipoVenta(ticket.type === 0 ? "Cotizacion" : ticket.type === 2 ? "Pedido" : "Factura");

  // Cerrar el modal de tickets suspendidos
  setIsSuspendedModalOpen(false);
};
*/


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
      <button className="btn btn-primary w-full mb-4" onClick={handleAddPayment} disabled={saldo <= 0}>
        Agregar Pago
      </button>

      {/* Botón para finalizar pagos */}
      <button className="btn btn-secondary w-full" onClick={handleFinishPayments}>
        Finalizar Pagos
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
  value={tipoVenta} // Asegúrate de que el valor se vincule a `tipoVenta`
  onChange={handleTipoVentaChange} // Controlador de cambio de tipo de venta
>
  <option value="Cotizacion" data-id="0">Cotización</option>
  <option value="Pedido" data-id="2">Pedido</option>
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
              onClick={handleCierreCaja}
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
                onFocus={() => setShowSuggestions(true)} // Mostrar sugerencias al hacer foco
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
                onClick={openCustomFieldsModal}
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
        <button className="btn btn-primary w-full text-xs md:text-sm" onClick={handleOpenPaymentModal}>
            OK (Factura)
        </button>
        )}

        {tipoVenta === "Pedido" && (
        <button className="btn btn-primary w-full text-xs md:text-sm" onClick={handleSavePedido}>
            Guardar Pedido
        </button>
        )}

        {tipoVenta === "Cotizacion" && (
        <button className="btn btn-primary w-full text-xs md:text-sm" onClick={handleSaveCotizacion}>
            Guardar Cotización
        </button>
        )}






        <button className="btn btn-secondary w-full text-xs md:text-sm">Historial de ventas</button>
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
              <tr key={index}>
                <td>{item.name}<br/><span className="text-xs text-gray-500">{item.ref}</span>
                  <textarea 
                    className="input input-bordered mt-1 w-full text-xs" 
                    placeholder="Nota del producto"
                    value={item.note || ''} 
                    onChange={(e) => handleNoteChange(index, e.target.value)}
                  />
                </td>
                <td>
                  <input 
                    type="number" 
                    className="input input-bordered w-12 md:w-20" 
                    value={item.quantity} 
                    onChange={(e) => handleQuantityChange(index, parseInt(e.target.value))} 
                  />
                </td>
                <td>
                  <input 
                    type="number" 
                    className="input input-bordered w-12 md:w-20" 
                    value={item.discount} 
                    onChange={(e) => handleDiscountChange(index, parseInt(e.target.value))} 
                  />
                </td>
                <td>Q.{(item.price * item.quantity * (1 - item.discount / 100)).toFixed(2)}</td>
                <td>
                  <button className="btn btn-ghost btn-xs" onClick={() => handleRemoveProduct(index)}>
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
      <button className="btn btn-error flex-1 text-xs md:text-sm" onClick={handleSuspend}>
         Suspender
      </button>

      <button className="btn btn-warning flex-1 text-xs md:text-sm" onClick={handleOpenSuspendedModal}>
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
            className="select select-bordered flex-1 text-xs md:text-sm truncate w-full md:max-w-[200px]" // Full width on mobile, max 200px on larger screens
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option disabled value="">Seleccione Vendedor</option>
            {vendors.map((vendor) => (
              <option key={vendor.code} value={vendor.code}>
                {vendor.label} {/* Display the vendor's label */}
              </option>
            ))}
          </select>




        <select className="select select-bordered flex-1 text-xs md:text-sm" value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)}>
          <option disabled value="">Categorias</option>
        </select>
      </div>

      {/* Cuadro de búsqueda de productos */}
      <div className="form-control relative">
        <label className="label">
          <span className="label-text text-xs md:text-sm">Buscar Productos</span>
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4 md:w-5 md:h-5 text-gray-500">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>


                <input 
            type="text" 
            placeholder="Buscar por descripción o código" 
            className="input input-bordered w-full pl-10 text-xs md:text-sm"
            value={productSearch} 
            onChange={handleProductSearchChange}
            onFocus={() => setShowProductSuggestions(true)} // Mostrar sugerencias al hacer foco
          />

        </div>

        {showProductSuggestions && products.length > 0 && (
          <ul className="absolute top-full left-0 w-full bg-white border border-gray-200 z-10 max-h-48 overflow-y-auto">
            {products.map((product) => (
              <li 
                key={product.id}
                className="p-2 hover:bg-gray-100 cursor-pointer text-xs md:text-sm"
                onClick={() => handleProductSelect(product)}
              >
                {product.label} - Q.{parseFloat(product.price_ttc).toFixed(2)}
              </li>
            ))}
          </ul>
        )}
      </div>  





    </div>
  </div>

  {/* Modal para crear un nuevo cliente */}
  {isModalOpen && (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded-lg shadow-lg w-11/12 md:w-1/3">
        <h2 className="text-xl font-bold mb-4">Crear Nuevo Cliente</h2>

        <form onSubmit={handleCreateCustomer}>
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

      
    </div>
  );
};

export default Pos;
