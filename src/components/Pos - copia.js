import React, { useState, useContext, useEffect, useRef } from 'react';
import Alert from './Alert'; //
import { AuthContext } from '../context/AuthContext';

const Pos = ({ terminal }) => {
  const { user, company, variables, logout } = useContext(AuthContext); // Extraemos las variables del contexto
  const [productSearch, setProductSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('Walk in Customer');
  const [shippingAddress, setShippingAddress] = useState('Nivel 1');
  const [customerSearch, setCustomerSearch] = useState(''); // Estado para el cuadro de búsqueda de clientes
  const [customers, setCustomers] = useState([]); // Resultados de clientes
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString()); // Estado para el reloj
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false); // Estado separado para productos
 // const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false); //  // Controla si mostrar las sugerencias
  const [menuOpen, setMenuOpen] = useState(false); // Estado del menú desplegable
  const [isModalOpen, setIsModalOpen] = useState(false); // Estado para abrir/cerrar el modal
  const [nitValue, setNitValue] = useState('');
  const [nombreValue, setNombreValue] = useState('');
  const [direccionValue, setDireccionValue] = useState('');
  const [telefonoValue, setTelefonoValue] = useState('');
  const [emailValue, setEmailValue] = useState('');
  const [tipoVenta, setTipoVenta] = useState("Cotizacion"); // Estado para el tipo de venta
  const [generalNotes, setGeneralNotes] = useState(''); 
  const [vendors, setVendors] = useState([]); // Estado para los vendedores
  const [paymentMethods, setPaymentMethods] = useState([]); // Métodos de pago disponibles
  const [payments, setPayments] = useState([]); // Pagos realizados
  const [total, setTotal] = useState(0); // Total calculado de la compra
  const [saldo, setSaldo] = useState(0); // Saldo restante para pagar
  const [newPaymentAmount, setNewPaymentAmount] = useState(0); // Monto del nuevo pago
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(''); // Método de pago seleccionado
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false); // Estado para abrir/cerrar el modal de pagos
  const searchTimeoutRef = useRef(null);
  // Ref para la lista de sugerencias de productos y clientes
const productSuggestionsRef = useRef(null);
const customerSuggestionsRef = useRef(null);

// Función de manejo de eventos táctiles
const handleTouchOutside = (e) => {
  if (
    productSuggestionsRef.current &&
    !productSuggestionsRef.current.contains(e.target) &&
    !e.target.closest('input')
  ) {
    setShowProductSuggestions(false);
  }

  if (
    customerSuggestionsRef.current &&
    !customerSuggestionsRef.current.contains(e.target) &&
    !e.target.closest('input')
  ) {
    setShowSuggestions(false);
  }
};

useEffect(() => {
  document.addEventListener('touchstart', handleTouchOutside);
  return () => {
    document.removeEventListener('touchstart', handleTouchOutside);
  };
}, []);



  useEffect(() => {
    setTotal(calculateTotal()); // Calcular el total desde el carrito
    setSaldo(calculateTotal()); // El saldo comienza igual al total
  }, [cart]);

  const handleSearch = (value, searchFunction, delay = 500) => {
    // Limpiar el timeout anterior si existe
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Crear nuevo timeout
    searchTimeoutRef.current = setTimeout(() => {
      if (value.trim()) {
        searchFunction(value);
      }
    }, delay);
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);
    

  const handleProductSearchChange = (e) => {
    const value = e.target.value;
    setProductSearch(value);
    handleSearch(value, fetchProducts);
  };

  const handleCustomerSearchChange = (e) => {
    const value = e.target.value;
    setCustomerSearch(value);
    handleSearch(value, fetchCustomers);
  };

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

  // Función para agregar un pago
  const handleAddPayment = () => {
    if (newPaymentAmount > 0 && selectedPaymentMethod) {
      const newPayments = [...payments, { method: selectedPaymentMethod, amount: newPaymentAmount }];
      setPayments(newPayments); // Actualizamos los pagos realizados
      setSaldo(saldo - newPaymentAmount); // Reducimos el saldo restante
      setNewPaymentAmount(0); // Limpiamos el campo de monto de pago
      setSelectedPaymentMethod(''); // Limpiamos el campo de método de pago
    }
  };

  const handleOpenPaymentModal = () => {
    setIsPaymentModalOpen(true); // Abrimos el modal de pagos
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false); // Cerramos el modal de pagos
  };

  const handleFinishPayments = () => {
    // Aquí puedes guardar la información de los pagos
    if (saldo > 0) {
      // Si queda saldo pendiente, guardar la deuda
      console.log("El cliente queda debiendo:", saldo);
    } else {
      console.log("Pago completo");
    }
    handleClosePaymentModal(); // Cerramos el modal de pagos
  };




  const [isLoading, setIsLoading] = useState(false); 
  const [alert, setAlert] = useState({ show: false, type: '', message: '' }); // Estado para manejar la alerta

  // Actualizar el reloj cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);

    return () => clearInterval(interval); // Limpiar el intervalo al desmontar el componente
  }, []);

  // Simulación de la URL de la imagen del perfil (puede venir del estado o del backend)
  const profileImage = 'https://via.placeholder.com/40'; // Reemplaza con la URL de la imagen real

  // Función para logout (puedes reemplazarlo por la lógica real de logout)
  const handleLogout = () => {
    logout(); // Llamar a la función logout del contexto
    // Redirigir al login si es necesario, por ejemplo:
    window.location.href = '/login'; // Asegúrate de tener configurada la ruta para el login
  //  console.log('Logout');
  };

  const handleNoteChange = (index, value) => {
    const updatedCart = [...cart]; // Copia el carrito actual
    updatedCart[index].note = value; // Asigna la nota al ítem en la posición especificada
    setCart(updatedCart); // Actualiza el carrito en el estado
  };

  const fetchVendors = async () => {
    try {
      const response = await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=selectUsers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
  
      const data = await response.json();
      setVendors(data || []); // Asegura que `data` sea un array de vendedores
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };
  
  useEffect(() => {
    fetchVendors(); // Llama a la función para obtener los vendedores
  }, []);
  

  const handleNitSearch = async (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      setIsLoading(true); // Inicia la carga
  
      try {
        const response = await fetch(`https://servicios.sielerp.com/desarrollo/validanitjson.php?&nit=${nitValue}&enti=1`);
        const data = await response.json();
  
        // Si la respuesta es válida pero los campos están vacíos o null, consideramos que no se encontró el NIT
        if (!data.nombre || !data.dir || !data.nit) {
          setAlert({ show: true, type: 'error', message: 'NIT no encontrado. Por favor verifique.' });
  
          // Cerrar automáticamente la alerta después de 3 segundos
          setTimeout(() => {
            setAlert({ ...alert, show: false });
          }, 3000);
        } else {
          // Si el NIT es válido y tiene datos, actualizar los campos
          setNombreValue(data.nombre);
          setDireccionValue(data.dir);
  
          // Mostrar alerta de éxito
          setAlert({ show: true, type: 'success', message: 'Cliente encontrado y cargado.' });
  
          // Cerrar automáticamente la alerta después de 3 segundos
          setTimeout(() => {
            setAlert({ ...alert, show: false });
          }, 3000);
        }
      } catch (error) {
        // Mostrar alerta de error si hay un fallo en la petición
        setAlert({ show: true, type: 'error', message: 'Error al buscar NIT.' });
  
        // Cerrar automáticamente la alerta después de 3 segundos
        setTimeout(() => {
          setAlert({ ...alert, show: false });
        }, 3000);
  
        console.error('Error al buscar NIT:', error);
      } finally {
        setIsLoading(false); // Finaliza la carga
      }
    }
  };
  

  // Función para el cierre de caja
  const handleCierreCaja = () => {
    console.log('Cierre de Caja');
  };


  const openModal = () => {
    setIsModalOpen(true);
  };

  // Función para cerrar el modal
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
  

  // Función para cambio de usuario
  const handleCambioUsuario = () => {
    console.log('Cambio de Usuario');
  };

  // Función para alternar el estado del menú de perfil
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  // Función para buscar productos
  const fetchProducts = async (searchTerm) => {
    try {
      const response = await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=searchProducts`, { // Reemplaza el dominio estático por SPOS_URL
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            search: searchTerm,
            warehouse: '3',
            ticketstate: '0',
            customer: '1',
          },
        }),
      });

      const data = await response.json();
      setProducts(data.data || []);  // Aseguramos que data sea un array
      setShowProductSuggestions(true);      // Mostrar las sugerencias de productos

      // Si hay solo un producto y coincide el código, agregarlo automáticamente
      if (data.data.length === 1) {
        handleAddProduct(data.data[0]);
        setShowProductSuggestions(false);  // Ocultar las sugerencias si el producto se agrega
        setProductSearch('');       // Limpiar el cuadro de búsqueda
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };
  // Función para buscar clientes
  const fetchCustomers = async (searchTerm) => {
    try {
      const response = await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=searchCustomer`, { // Reemplaza el dominio estático por SPOS_URL
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: searchTerm }), // Enviar el término de búsqueda
      });
  
      const data = await response.json();
  
      if (data.error && data.error.value === 0) {
        setCustomers(data.data || []);  // Aseguramos que 'data' sea un array de clientes
        setShowSuggestions(true);       // Aseguramos mostrar las sugerencias
      } else {
        console.error('Error al buscar clientes:', data.error.desc);
        setCustomers([]);               // Limpiamos la lista en caso de error
        setShowSuggestions(false);      // Ocultar sugerencias si hay error
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
      setShowSuggestions(false);        // Ocultar sugerencias si falla la petición
    }
  };
  

  const handleProductSearch = (e) => {
    if (e.key === 'Enter') {
      fetchProducts(productSearch); // Llamamos a fetchProducts cuando se presiona Enter
    }
  };

  const handleCustomerSearch = (e) => {
    if (e.key === 'Enter') {
      fetchCustomers(customerSearch); // Llamamos a fetchCustomers cuando se presiona Enter
    }
  };

  const handleProductSelect = (product) => {
    handleAddProduct(product); // Agrega el producto seleccionado al carrito
    setProductSearch('');      // Limpiar el cuadro de búsqueda después de seleccionar
    setShowProductSuggestions(false); // Ocultar las sugerencias
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
        discount: 0 
      }]);
    }
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

    // Función para cerrar la alerta
    const closeAlert = () => {
        setAlert({ ...alert, show: false });
      };
    
  const handleRemoveProduct = (index) => {
    const newCart = cart.filter((_, i) => i !== index);
    setCart(newCart);
  };

  const calculateSubtotal = () => cart.reduce((sum, item) => sum + (item.price ? item.price * item.quantity : 0), 0);
  const calculateDiscount = () => cart.reduce((sum, item) => sum + (item.price * item.quantity * item.discount / 100), 0);
  const calculateTotal = () => calculateSubtotal() - calculateDiscount();
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
  {alert.show && <Alert type={alert.type} message={alert.message} onClose={closeAlert} />}

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
      <select className="select select-bordered text-xs md:text-sm" onChange={(e) => setTipoVenta(e.target.value)}>
        <option value="Cotizacion">Cotización</option>
        <option value="Pedido">Pedido</option>
        <option value="Factura">Factura</option>
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
      onBlur={() => setTimeout(() => setShowProductSuggestions(false), 200)}
    />


    {/* Aquí se colocaría el código para las sugerencias de productos */}
  {showProductSuggestions && products.length > 0 && (
    <ul ref={productSuggestionsRef} className="absolute top-full left-0 w-full bg-white border border-gray-200 z-10 max-h-48 overflow-y-auto">
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

    {/* Columna central para el carrito */}
    <div className="w-full md:w-2/4 space-y-4">
      <div className="overflow-y-auto bg-white rounded-lg shadow" style={{ maxHeight: '400px' }}>
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
        <button className="btn btn-error flex-1 text-xs md:text-sm">Cancelar</button>
        <button className="btn btn-warning flex-1 text-xs md:text-sm">Guardar Borrador</button>
      </div>
    </div>

    {/* Columna derecha */}
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
      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
    />


          </div>

          {showSuggestions && customers.length > 0 && (
            <ul className="absolute top-full left-0 w-full bg-white border border-gray-200 z-50 max-h-48 overflow-y-auto text-xs md:text-sm">
              {customers.map((customer) => (
                <li 
                  key={customer.id} 
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    setSelectedCustomer(customer.nom);
                    setShowSuggestions(false);
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
          <h2 className="text-lg md:text-2xl font-bold">{selectedCustomer}</h2>
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
        </div>

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

        <button className="btn btn-primary w-full text-xs md:text-sm" onClick={handleOpenPaymentModal}>
        OK
      </button>
        <button className="btn btn-secondary w-full text-xs md:text-sm">Historial de ventas</button>
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
