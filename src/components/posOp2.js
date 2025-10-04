import React, { useState, useContext, useEffect, useRef } from 'react';
import { Search, Plus, ShoppingCart, User, Settings, History, Pause, CreditCard, Printer, X, Edit, Trash2, CheckCircle, AlertCircle, Clock, Calculator } from 'lucide-react';
import Alert from './Alert'; 
import { AuthContext } from '../context/AuthContext';
import CustomFields from './CustomFields';
import PrintTicket from './PrintTicket';


// Componente Loading optimizado
const LoadingSpinner = ({ size = 'md' }) => (
  <div className={`loading loading-spinner ${size === 'sm' ? 'loading-sm' : size === 'lg' ? 'loading-lg' : ''}`}></div>
);

// Componente ProductCard para mejor visualización
const ProductCard = ({ product, onSelect, disabled }) => (
  <button
    onClick={() => onSelect(product)}
    disabled={disabled}
    className="w-full p-4 text-left hover:bg-primary/10 transition-all duration-200 border-b border-base-200 active:scale-[0.98]"
  >
    <div className="flex justify-between items-start gap-3">
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm md:text-base truncate">{product.label}</h3>
        <p className="text-xs text-base-content/60 mt-1">Código: {product.ref || 'N/A'}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-success font-bold text-sm md:text-base">Q{parseFloat(product.price_ttc).toFixed(2)}</p>
      </div>
    </div>
  </button>
);

// Componente CartItem optimizado
const CartItem = ({ item, index, onQuantityChange, onDiscountChange, onSubtotalChange, onNoteChange, onRemove, isEditable }) => {
  const [tempValues, setTempValues] = useState({});

  const handleTempChange = (field, value) => {
    setTempValues(prev => ({ ...prev, [`${field}_${index}`]: value }));
  };

  const handleBlur = async (field, value) => {
    switch (field) {
      case 'quantity':
        if (value === '' || /^\d+$/.test(value)) {
          await onQuantityChange(index, value === '' ? 1 : parseInt(value));
        }
        break;
      case 'discount':
        const discountValue = parseFloat(value);
        if (!isNaN(discountValue)) {
          await onDiscountChange(index, discountValue);
        }
        break;
      case 'subtotal':
        const subtotalValue = parseFloat(value);
        if (!isNaN(subtotalValue)) {
          await onSubtotalChange(index, subtotalValue);
        }
        break;
    }
    setTempValues(prev => {
      const newValues = { ...prev };
      delete newValues[`${field}_${index}`];
      return newValues;
    });
  };


  

  return (
    <div className={`bg-base-100 rounded-lg p-4 border ${!item.hasStock ? 'border-error bg-error/5' : 'border-base-300'} transition-all duration-200`}>
      {/* Header con nombre del producto */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <h3 className={`font-medium text-sm md:text-base truncate ${!item.hasStock ? 'text-error' : ''}`}>
            {item.name}
          </h3>
          <p className="text-xs text-base-content/60 mt-1">Ref: {item.ref || 'N/A'}</p>
          {!item.hasStock && (
            <div className="flex items-center gap-1 mt-1">
              <AlertCircle size={12} className="text-error" />
              <span className="text-xs text-error">Stock insuficiente</span>
            </div>
          )}
        </div>
        <button 
          onClick={() => onRemove(index)} 
          disabled={!isEditable}
          className="btn btn-ghost btn-xs text-error hover:bg-error/20"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Grid para cantidad, descuento y subtotal */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        {/* Cantidad */}
        <div>
          <label className="label py-1">
            <span className="label-text text-xs">Cantidad</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            className="input input-bordered input-sm w-full text-center"
            value={tempValues[`quantity_${index}`] !== undefined ? tempValues[`quantity_${index}`] : item.quantity}
            onChange={(e) => handleTempChange('quantity', e.target.value)}
            onBlur={(e) => handleBlur('quantity', e.target.value)}
            disabled={!isEditable}
          />
        </div>

        {/* Descuento */}
        <div>
          <label className="label py-1">
            <span className="label-text text-xs">Desc %</span>
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              className="input input-bordered input-sm w-full text-center pr-6"
              value={tempValues[`discount_${index}`] !== undefined ? tempValues[`discount_${index}`] : item.discount}
              onChange={(e) => handleTempChange('discount', e.target.value.replace(/[^\d.]/g, ''))}
              onBlur={(e) => handleBlur('discount', e.target.value)}
              disabled={!isEditable}
            />
            <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-base-content/60">%</span>
          </div>
        </div>

        {/* Subtotal */}
        <div>
          <label className="label py-1">
            <span className="label-text text-xs">Subtotal</span>
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              className="input input-bordered input-sm w-full text-right pl-6"
              value={
                tempValues[`subtotal_${index}`] !== undefined 
                  ? tempValues[`subtotal_${index}`] 
                  : (item.price * item.quantity * (1 - item.discount / 100)).toFixed(2)
              }
              onChange={(e) => handleTempChange('subtotal', e.target.value.replace(/[^\d.]/g, ''))}
              onBlur={(e) => handleBlur('subtotal', e.target.value)}
              disabled={!isEditable}
            />
            <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-base-content/60">Q</span>
          </div>
        </div>
      </div>

      {/* Nota del producto */}
      <div>
        <label className="label py-1">
          <span className="label-text text-xs">Nota</span>
        </label>
        <textarea
          className="textarea textarea-bordered textarea-sm w-full resize-none"
          placeholder="Nota del producto..."
          rows="2"
          value={item.note || ''}
          onChange={(e) => onNoteChange(index, e.target.value)}
          disabled={!isEditable}
        />
      </div>
    </div>
  );
};

// Componente Modal responsivo
const ResponsiveModal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={`relative bg-base-100 w-full ${sizeClasses[size]} max-h-[95vh] rounded-t-2xl sm:rounded-2xl shadow-2xl animate-slide-in-bottom sm:animate-fade-in overflow-hidden`}>
        {/* Header */}
        <div className="sticky top-0 bg-base-100 border-b border-base-300 p-4 flex justify-between items-center">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X size={18} />
          </button>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(95vh - 80px)' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

const Pos = ({ terminal }) => {

  const styles = `
  @keyframes slide-in-right {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slide-in-bottom {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
  
  @keyframes fade-in {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  
  .animate-slide-in-right { animation: slide-in-right 0.3s ease-out; }
  .animate-slide-in-bottom { animation: slide-in-bottom 0.3s ease-out; }
  .animate-fade-in { animation: fade-in 0.2s ease-out; }
`;

  // Estados existentes (mantenidos igual)
  const { user, company, variables, logout, userId } = useContext(AuthContext);
  const [isEditable, setIsEditable] = useState(true);
  const [extraFields, setExtraFields] = useState({});
  const [isCustomFieldsModalOpen, setIsCustomFieldsModalOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
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

  // Estados adicionales para mejor UX
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ========================================
// USEEFFECTS Y INICIALIZACION
// ========================================

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

useEffect(() => {
  setTotal(calculateTotal());
  setSaldo(calculateTotal());
}, [cart]);

useEffect(() => {
  return () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  };
}, []);

useEffect(() => {
  fetchVendors();
}, []);

// ========================================
// FUNCIONES DE CIERRE DE CAJA
// ========================================

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

// ========================================
// FUNCIONES DE HISTORIAL DE VENTAS
// ========================================

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

// ========================================
// FUNCIONES DE VALIDACION DE STOCK
// ========================================

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

// ========================================
// FUNCIONES DE MANEJO DE CARRITO
// ========================================

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

const handleRemoveProduct = (index) => {
  const newCart = cart.filter((_, i) => i !== index);
  setCart(newCart);
};

const handleNoteChange = (index, value) => {
  const updatedCart = [...cart];
  updatedCart[index].note = value;
  setCart(updatedCart);
};

// ========================================
// FUNCIONES DE TIPO DE VENTA
// ========================================

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

// ========================================
// FUNCIONES DE CAMPOS PERSONALIZADOS
// ========================================

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

// ========================================
// FUNCIONES DE BUSQUEDA
// ========================================

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
  setIsLoadingProducts(true);
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
  } finally {
    setIsLoadingProducts(false); // AGREGADO: Siempre limpia el estado de loading
  }
};

const fetchCustomers = async (searchTerm) => {
  setIsLoadingCustomers(true);
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
  } finally {
    setIsLoadingCustomers(false); // AGREGADO: Siempre limpia el estado de loading
  }
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

const handleProductSearchChange = (e) => {
  setProductSearch(e.target.value); // Actualiza el estado con el valor del campo de entrada
};

const handleCustomerSearchChange = (e) => {
  setCustomerSearch(e.target.value);
  setIsCustomerSearchFocused(true); // Solo activar la lista de sugerencias cuando se escribe en el campo de búsqueda
  setSelectedCustomerDetails(null); // Limpiar los detalles del cliente cuando se cambia la búsqueda
};

const handleProductSelect = (product) => {
  handleAddProduct(product); // Agrega el producto seleccionado al carrito
  setProductSearch('');      // Limpiar el cuadro de búsqueda después de seleccionar
  setShowProductSuggestions(false); // Ocultar las sugerencias
};

// ========================================
// FUNCIONES DE CREACION DE CLIENTE
// ========================================

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

// ========================================
// FUNCIONES DE PAGOS
// ========================================

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

// ========================================
// FUNCIONES DE GUARDADO DE DOCUMENTOS
// ========================================

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

// ========================================
// FUNCIONES DE SUSPENCION Y RESTAURACION
// ========================================

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

// ========================================
// FUNCIONES DE IMPRESION
// ========================================

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

// ========================================
// FUNCIONES DE NAVEGACION Y UI
// ========================================

const handleCambioUsuario = () => {
  console.log('Cambio de Usuario');
};

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

// ========================================
// FUNCIONES DE CALCULO
// ========================================

const calculateSubtotal = () => cart.reduce((sum, item) => sum + (item.price ? item.price * item.quantity : 0), 0);
const calculateDiscount = () => cart.reduce((sum, item) => sum + (item.price * item.quantity * item.discount / 100), 0);
const calculateTotal = () => calculateSubtotal() - calculateDiscount();

// ========================================
// VARIABLES Y CONSTANTES
// ========================================

const profileImage = `${variables.SPOS_URL}/documents/mycompany/logos/thumbs/${variables.MAIN_INFO_SOCIETE_LOGO_SQUARRED_MINI}`;

  // Función helper para mostrar alertas
  const showAlert = (type, message, duration = 3000) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), duration);
  };

 

  return (
    <div className="min-h-screen bg-base-200">
      {/* Sistema de alertas */}
      {alert.show && (
        <Alert 
          type={alert.type} 
          message={alert.message} 
          onClose={() => setAlert({ show: false, type: '', message: '' })} 
        />
      )}

      {/* Header mejorado */}
      <div className="navbar bg-base-100 shadow-sm px-4">
        <div className="navbar-start">
          <div className="flex items-center gap-3">
            <div className="avatar placeholder">
              <div className="bg-primary text-primary-content rounded-full w-10">
                <span className="text-sm font-bold">{user?.charAt(0) || 'U'}</span>
              </div>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium">Bienvenido, {user}</p>
              <p className="text-xs text-base-content/60 flex items-center gap-1">
                <Clock size={12} />
                {currentTime}
              </p>
            </div>
          </div>
        </div>

        <div className="navbar-center">
          <div className="badge badge-primary badge-lg">
            {terminal.name}
          </div>
        </div>

        <div className="navbar-end">
          {/* Selector de tipo de venta mejorado */}
          <div className="tabs tabs-boxed tabs-sm bg-base-200">
            {[
              { value: "Cotizacion", label: "Cotización", color: "tab-info" },
              { value: "Factura", label: "Factura", color: "tab-success" }
            ].map(tipo => (
              <button
  key={tipo.value}
  className={`tab ${tipoVenta === tipo.value ? `tab-active ${tipo.color}` : ''}`}
  onClick={() => handleTipoVentaChange({ target: { value: tipo.value } })}
>
  {tipo.label}
</button>
            ))}
          </div>

          {/* Menu dropdown */}
          <div className="dropdown dropdown-end ml-3">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
              <Settings size={20} />
            </div>
            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
  <li><a onClick={handleCambioUsuario}>Cambio de Usuario</a></li>
  <li><a onClick={handleOpenCashClosureModal}>Cierre de Caja</a></li>
  <li><a onClick={() => {}}>Configuración</a></li>
  <li className="border-t border-base-300 mt-2 pt-2">
    <a onClick={handleLogout} className="text-error">Logout</a>
  </li>
</ul>
          </div>
        </div>
      </div>

      {/* Layout principal mejorado */}
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-120px)]">
          
          {/* Panel izquierdo - Cliente y controles */}
          <div className="lg:col-span-1 space-y-4">
            {/* Búsqueda de cliente */}
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="card-title text-sm">Cliente</h3>
                  <button 
                    className="btn btn-primary btn-xs"
                    onClick={() => setIsModalOpen(true)}
                    disabled={!isEditable}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="relative">
                  <div className="form-control">
                    <div className="input-group input-group-sm">
                      <span className="bg-base-200">
                        <Search size={16} />
                      </span>
                      <input
  type="text"
  placeholder="Buscar cliente..."
  className="input input-bordered input-sm flex-1"
  value={customerSearch}
  onChange={handleCustomerSearchChange}
  onFocus={() => setIsCustomerSearchFocused(true)}
  disabled={!isEditable}
/>
                    </div>
                  </div>

                  {/* Sugerencias de clientes */}
                  {showSuggestions && customers.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-base-100 border border-base-300 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto mt-1">
                      {customers.map((customer) => (
                        <button
                          key={customer.id}
                          className="w-full p-3 text-left hover:bg-base-200 transition-colors border-b border-base-200 last:border-b-0"
                          onClick={() => {
                            setSelectedCustomer(customer.nom);
                            setSelectedCustomerDetails(customer);
                            setShowSuggestions(false);
                          }}
                        >
                          <div className="font-medium text-sm">{customer.nom}</div>
                          <div className="text-xs text-base-content/60">{customer.idprof1}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Info del cliente seleccionado */}
                {selectedCustomer && (
                  <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <User size={16} className="text-primary" />
                      <span className="font-medium text-sm">{selectedCustomer}</span>
                    </div>
                    {selectedCustomerDetails?.idprof1 && (
                      <p className="text-xs text-base-content/60">NIT: {selectedCustomerDetails.idprof1}</p>
                    )}
                    {customerDiscount > 0 && (
                      <div className="badge badge-success badge-xs mt-2">
                        Descuento: {customerDiscount}%
                      </div>
                    )}
                  </div>
                )}

                {/* Toggle FEL para facturas */}
                {tipoVenta === "Factura" && (
                  <div className="form-control mt-3">
                    <label className="label cursor-pointer justify-start gap-2">
                      <input
                        type="checkbox"
                        className="toggle toggle-primary toggle-sm"
                        checked={isFel}
                        onChange={(e) => setIsFel(e.target.checked)}
                      />
                      <span className="label-text text-sm">Documento FEL</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Vendedor */}
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body p-4">
                <h3 className="card-title text-sm mb-3">Vendedor</h3>
                <select
                  className="select select-bordered select-sm w-full"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  disabled={!isEditable}
                >
                  <option value="">Seleccionar vendedor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.code} value={vendor.code}>
                      {vendor.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Campos extras */}
            {variables.SPOS_EXTRAFIELDS === "1" && (
              <div className="card bg-base-100 shadow-sm">
                <div className="card-body p-4">
                  <button
                    className="btn btn-outline btn-sm w-full"
                    onClick={() => setIsCustomFieldsModalOpen(true)}
                    disabled={!isEditable}
                  >
                    <Plus size={16} />
                    Información adicional
                  </button>
                </div>
              </div>
            )}

            {/* Notas */}
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body p-4">
                <h3 className="card-title text-sm mb-3">Notas</h3>
                <textarea
                  className="textarea textarea-bordered textarea-sm w-full"
                  placeholder="Notas de la venta..."
                  rows="3"
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  disabled={!isEditable}
                />
              </div>
            </div>

            {/* Total */}
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body p-4">
                <h3 className="card-title text-sm mb-3">Resumen</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Items:</span>
                    <span className="font-medium">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>Q{calculateSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Descuento:</span>
                    <span className="text-error">-Q{calculateDiscount().toFixed(2)}</span>
                  </div>
                  <div className="divider my-2"></div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-primary">Q{calculateTotal().toFixed(2)}</span>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="space-y-2 mt-4">
                  {tipoVenta === "Cotizacion" && (
                    <button
  className="btn btn-primary btn-sm w-full"
  onClick={handleSaveCotizacion}
  disabled={!isEditable || cart.length === 0 || isSaving}
>
                      {isSaving ? <LoadingSpinner size="sm" /> : 'Guardar Cotización'}
                    </button>
                  )}
                  
                  {tipoVenta === "Factura" && (
                    <button
  className="btn btn-success btn-sm w-full"
  onClick={handleOpenPaymentModal}
  disabled={!isEditable || cart.length === 0 || !selectedCategory}
>
                      <CreditCard size={16} />
                      Procesar Pago
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
  className="btn btn-warning btn-sm"
  onClick={handleSuspend}
  disabled={!isEditable || cart.length === 0}
>
                      <Pause size={16} />
                      Suspender
                    </button>
                    <button
  className="btn btn-info btn-sm"
  onClick={handleOpenSuspendedModal}
>
                      <History size={16} />
                      Guardadas
                    </button>
                  </div>

                  <button
  className="btn btn-ghost btn-sm w-full"
  onClick={handleOpenSalesHistoryModal}
>
                    <History size={16} />
                    Historial de ventas
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Panel central - Carrito */}
          <div className="lg:col-span-2 flex flex-col">
            <div className="card bg-base-100 shadow-sm flex-1 flex flex-col">
              <div className="card-body p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="card-title text-base">
                    <ShoppingCart size={20} />
                    Carrito ({cart.length})
                  </h3>
                  {cart.length > 0 && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setCart([])}
                      disabled={!isEditable}
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                {/* Lista del carrito */}
                <div className="flex-1 overflow-y-auto space-y-3">
                  {cart.length === 0 ? (
                    <div className="text-center py-12 text-base-content/60">
                      <ShoppingCart size={48} className="mx-auto mb-4 opacity-30" />
                      <p>El carrito está vacío</p>
                      <p className="text-sm">Busca productos para agregar</p>
                    </div>
                  ) : (
                    cart.map((item, index) => (
                  <CartItem
  key={`${item.id}_${index}`}
  item={item}
  index={index}
  onQuantityChange={handleQuantityChange}
  onDiscountChange={handleDiscountChange}
  onSubtotalChange={handleSubtotalChange}
  onNoteChange={handleNoteChange}
  onRemove={handleRemoveProduct}
  isEditable={isEditable}
/>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Panel derecho - Búsqueda de productos */}
          <div className="lg:col-span-1">
            <div className="card bg-base-100 shadow-sm h-full">
              <div className="card-body p-4">
                <h3 className="card-title text-sm mb-4">Productos</h3>

                {/* Búsqueda */}
                <div className="form-control">
                  <div className="input-group input-group-sm">
                    <span className="bg-base-200">
                      <Search size={16} />
                    </span>
                    <input
  type="text"
  placeholder="Buscar productos..."
  className="input input-bordered input-sm flex-1"
  value={productSearch}
  onChange={handleProductSearchChange}
  disabled={!isEditable}
/>
                  </div>
                </div>

                {/* Lista de productos */}
                <div className="mt-4 flex-1 overflow-y-auto">
                  {isLoadingProducts ? (
                    <div className="text-center py-8">
                      <LoadingSpinner />
                      <p className="text-sm mt-2">Buscando productos...</p>
                    </div>
                  ) : products.length === 0 ? (
                    <div className="text-center py-8 text-base-content/60">
                      <Search size={48} className="mx-auto mb-4 opacity-30" />
                      <p className="text-sm">Escribe para buscar productos</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {products.map((product) => (
                      <ProductCard
  key={product.id}
  product={product}
  onSelect={handleProductSelect}
  disabled={!isEditable}
/>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botón flotante para nueva venta */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          className="btn btn-primary btn-circle btn-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          onClick={() => {
            // Resetear para nueva venta
            setCart([]);
            setProductSearch('');
            setCustomerSearch('');
            setSelectedCustomer('');
            setSelectedCustomerDetails(null);
            setCustomerDiscount(0);
            setTipoVenta("Cotizacion");
            setGeneralNotes('');
            setSelectedTicket(null);
            setSelectedCategory('');
            setExtraFields({});
            setPayments([]);
            setIsEditable(true);
          }}
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Modales */}
      
      {/* Modal de Pagos */}
      <ResponsiveModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Procesar Pagos"
        size="md"
      >
        <div className="p-6 space-y-6">
          {/* Resumen */}
          <div className="bg-base-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span>Total:</span>
                <span className="font-bold">Q{calculateTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Saldo:</span>
                <span className={`font-bold ${saldo > 0 ? 'text-warning' : 'text-success'}`}>
                  Q{saldo.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Pagos registrados */}
          {payments.length > 0 && (
            <div>
              <h4 className="font-medium mb-3">Pagos registrados</h4>
              <div className="space-y-2">
                {payments.map((payment, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-success/10 rounded-lg">
                    <span className="text-sm">{payment.method}</span>
                    <span className="font-medium">Q{payment.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agregar nuevo pago */}
          <div className="space-y-4">
            <h4 className="font-medium">Agregar pago</h4>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">Método de pago</span>
              </label>
              <select
                className="select select-bordered"
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              >
                <option value="">Seleccionar método</option>
                {terminal.payment_methods?.map((method) => (
                  <option key={method.rowid} value={method.label}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Monto</span>
              </label>
              <div className="input-group">
                <input
                  type="number"
                  className="input input-bordered flex-1"
                  value={newPaymentAmount}
                  onChange={(e) => setNewPaymentAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
                <button
                  className="btn btn-primary"
                  onClick={() => setNewPaymentAmount(saldo)}
                >
                  Exacto
                </button>
              </div>
            </div>

            <button
  className="btn btn-primary w-full"
  onClick={handleAddPayment}
  disabled={!selectedPaymentMethod || newPaymentAmount <= 0}
>
              Agregar Pago
            </button>
          </div>

          {/* Finalizar */}
          <div className="border-t pt-4">
            <button
  className="btn btn-success w-full btn-lg"
  onClick={handleSaveFactura}
  disabled={payments.length === 0}
>
              <CheckCircle size={20} />
              Finalizar Venta
            </button>
          </div>
        </div>
      </ResponsiveModal>

      {/* Modal de Historial */}
      <ResponsiveModal
        isOpen={isSalesHistoryModalOpen}
        onClose={() => setIsSalesHistoryModalOpen(false)}
        title="Historial de Ventas"
        size="xl"
      >
        <div className="p-6">
          {/* Búsqueda y tabs */}
          <div className="space-y-4 mb-6">
            <div className="form-control">
              <input
                type="text"
                placeholder="Buscar por número de documento..."
                className="input input-bordered"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="tabs tabs-boxed">
              {[
                { id: 'Cotizaciones', label: 'Cotizaciones', data: salesData.cotizaciones },
                { id: 'Facturas', label: 'Facturas', data: salesData.facturas }
              ].map(tab => (
                <button
                  key={tab.id}
                  className={`tab ${activeTab === tab.id ? 'tab-active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label} ({tab.data.length})
                </button>
              ))}
            </div>
          </div>

          {/* Lista de documentos */}
          <div className="grid gap-4">
            {activeTab === "Cotizaciones" && salesData.cotizaciones
              .filter(item => item.ref.toString().includes(searchTerm))
              .map((item, index) => (
                <div key={index} className="card bg-base-100 border border-base-300 hover:shadow-md transition-all duration-200">
                  <div className="card-body p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold">Cotización #{item.ref}</h3>
                        <p className="text-sm text-base-content/60 mt-1">{item.date_creation}</p>
                        <p className="text-sm mt-1">Cliente: {item.customerName}</p>
                        <p className="text-lg font-bold text-primary mt-2">Q{parseFloat(item.total_ttc).toFixed(2)}</p>
                      </div>
                      <div className="flex gap-2">
                       <button 
  className="btn btn-primary btn-sm"
  onClick={() => handleSelectHistoryItem(item)}
>
                          <Edit size={14} />
                          Editar
                        </button>
                        <button 
  className="btn btn-ghost btn-sm"
  onClick={() => handlePrintTicket(item, 'Cotización')}
>
                          <Printer size={14} />
                          Imprimir
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </ResponsiveModal>




 {/* Modal de Crear Cliente */}
    <ResponsiveModal
      isOpen={isModalOpen}
      onClose={closeModal}
      title="Crear Nuevo Cliente"
      size="md"
    >
      <div className="p-6">
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
              <Search size={16} />
            </label>
          </div>

          {isLoading && (
            <div className="flex justify-center items-center mt-2">
              <LoadingSpinner size="sm" />
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
            <input 
              type="tel" 
              className="input input-bordered" 
              placeholder="Teléfono"
              value={telefonoValue}
              onChange={(e) => setTelefonoValue(e.target.value)}
            />
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Correo Electrónico</span>
            </label>
            <input 
              type="email" 
              className="input input-bordered" 
              placeholder="Correo Electrónico"
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
            />
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
    </ResponsiveModal>

    {/* Modal de Campos Personalizados */}
    <ResponsiveModal
      isOpen={isCustomFieldsModalOpen}
      onClose={closeCustomFieldsModal}
      title="Campos Personalizados"
      size="md"
    >
      <div className="p-6">
        <CustomFields 
          variables={variables} 
          onFieldsChange={handleCustomFieldChange} 
          extraFields={extraFields}
        />
      </div>
    </ResponsiveModal>

    {/* Modal de Cierre de Caja */}
    <ResponsiveModal
      isOpen={isCashClosureModalOpen}
      onClose={() => setIsCashClosureModalOpen(false)}
      title="Cierre de Caja"
      size="sm"
    >
      <div className="p-6">
        <p className="mb-4">Efectivo: Q{cashBalance.toFixed(2)}</p>
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
    </ResponsiveModal>

    {/* Modal de Tickets Suspendidos */}
    <ResponsiveModal
      isOpen={isSuspendedModalOpen}
      onClose={handleCloseSuspendedModal}
      title="Documentos Guardados"
      size="lg"
    >
      <div className="p-6">
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
                  onClick={() => handleEditTicket(ticket)}
                >
                  <Edit size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ResponsiveModal>

    {/* Modal de Ticket */}
    {showTicket && ticketData && (
      <div className="fixed inset-0 flex items-center justify-center z-[100]">
        <PrintTicket
          ticketData={ticketData}
          onClose={() => setShowTicket(false)}
        />
      </div>
    )}
  </div>


      
    






  );

  

  
};

export default Pos;

