// ============================================================================
// FUNCIONES POS MIGRADAS A API NATIVA DE DOLIBARR
// ============================================================================
// Versión migrada que reemplaza ajax_pos_siel.php por endpoints nativos de Dolibarr
// Compatible con la interfaz original para drop-in replacement

// Función auxiliar para obtener headers de API
const getDolibarrHeaders = (apiKey) => ({
  'DOLAPIKEY': apiKey,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
});

// Función auxiliar para manejar errores de API
const handleApiError = (error, context) => {
  console.error(`Error en ${context}:`, error);
  
  if (error.status === 401) {
    return "Error de autenticación. Verificar API key.";
  } else if (error.status === 403) {
    return "Sin permisos. Verificar permisos de usuario API.";
  } else if (error.status === 404) {
    return "Recurso no encontrado.";
  } else {
    return `Error del servidor: ${error.message}`;
  }
};

// Función auxiliar para obtener stock en almacén específico
/*const getProductStockInWarehouse = async (productId, warehouseId, variables) => {
  try {
    const API_BASE_URL = `${variables.SPOS_URL}/api/index.php`;
    const API_KEY = variables.DOLIBARR_API_KEY;
    
    // Consultar movimientos de stock para el producto en el almacén específico
    const stockFilter = `(t.fk_product:=:${productId})and(t.fk_entrepot:=:${warehouseId})`;
    const response = await fetch(
      `${API_BASE_URL}/stockmovements?sqlfilters=${encodeURIComponent(stockFilter)}`,
      {
        headers: getDolibarrHeaders(API_KEY)
      }
    );
    
    if (response.ok) {
      const movements = await response.json();
      // Calcular stock actual: tipo 3 = entrada (+), otros = salida (-)
      return movements.reduce((total, movement) => {
        return total + (movement.type === 3 ? parseFloat(movement.qty) : -parseFloat(movement.qty));
      }, 0);
    }
    
    return 0;
  } catch (error) {
    console.error("Error obteniendo stock de almacén:", error);
    return 0;
  }
};
*/

const getProductStock = async (productId, warehouseId, variables) => {
  try {
    const API_BASE_URL = `${variables.SPOS_URL}/api/index.php`;
    const API_KEY = variables.DOLIBARR_API_KEY || variables.dolibarrToken;
    
    if (!API_BASE_URL || !API_KEY) {
      console.error('❌ API no configurada correctamente');
      return { success: false, stock: 0, error: 'API no configurada' };
    }

    // Construir URL con warehouse específico si está disponible
    let stockUrl = `${API_BASE_URL}/products/${productId}/stock`;
    if (warehouseId) {
      stockUrl += `?selected_warehouse_id=${warehouseId}`;
    }

    console.log('🔍 Consultando stock:', {
      productId,
      warehouseId,
      url: stockUrl
    });

    const response = await fetch(stockUrl, {
      method: 'GET',
      headers: getDolibarrHeaders(API_KEY)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error ${response.status} consultando stock:`, errorText);
      return { 
        success: false, 
        stock: 0, 
        error: `Error ${response.status}: ${response.statusText}` 
      };
    }

    const stockData = await response.json();
    console.log('📦 Respuesta de stock:', stockData);

    // Procesar respuesta según estructura de la API
    if (stockData.stock_warehouses) {
      if (warehouseId && stockData.stock_warehouses[warehouseId]) {
        // Stock específico del warehouse solicitado
        const warehouseStock = parseFloat(stockData.stock_warehouses[warehouseId].real || 0);
        console.log(`✅ Stock en warehouse ${warehouseId}:`, warehouseStock);
        return { success: true, stock: warehouseStock, warehouseId };
      } else {
        // Sumar stock de todos los warehouses disponibles
        let totalStock = 0;
        Object.values(stockData.stock_warehouses).forEach(warehouse => {
          totalStock += parseFloat(warehouse.real || 0);
        });
        console.log('✅ Stock total (todos los almacenes):', totalStock);
        return { success: true, stock: totalStock, warehouseId: 'all' };
      }
    } else {
      console.warn('⚠️ Respuesta sin stock_warehouses:', stockData);
      return { success: true, stock: 0, warehouseId };
    }

  } catch (error) {
    console.error('❌ Error obteniendo stock del producto:', error);
    return { 
      success: false, 
      stock: 0, 
      error: error.message 
    };
  }
};

export const checkProductStock = async (productId, quantity, variables, terminal) => {
  try {
    console.log('🔍 Verificando stock:', {
      productId,
      quantity,
      warehouseId: terminal?.fk_warehouse
    });

    const stockResult = await getProductStock(
      productId, 
      terminal?.fk_warehouse, 
      variables
    );

    if (!stockResult.success) {
      console.error('❌ Error obteniendo stock:', stockResult.error);
      // En caso de error de API, permitir la operación (modo permisivo)
      return true;
    }

    const availableStock = stockResult.stock;
    const hasEnoughStock = availableStock >= quantity;

    console.log('📊 Validación de stock:', {
      productId,
      cantidadSolicitada: quantity,
      stockDisponible: availableStock,
      suficiente: hasEnoughStock,
      warehouse: stockResult.warehouseId
    });

    return hasEnoughStock;

  } catch (error) {
    console.error('❌ Error verificando stock:', error);
    // En caso de error, modo permisivo
    return true;
  }
};




// Validar stock para todo el carrito
export const validateStockForCart = async (cart, variables, terminal, setCart, setAlert) => {
  if (variables.SPOS_VALIDARSTOCK !== "1") {
    console.log('🔍 Validación de stock deshabilitada');
    return true;
  }

  if (!cart || cart.length === 0) {
    console.log('🔍 Carrito vacío, no hay nada que validar');
    return true;
  }

  console.log('🔍 Iniciando validación de stock del carrito completo...');
  console.log('📋 Items a validar:', cart.length);

  try {
    const stockValidations = await Promise.all(
      cart.map(async (item, index) => {
        console.log(`🔍 Validando item ${index + 1}/${cart.length}:`, {
          id: item.id,
          name: item.name,
          quantity: item.quantity
        });

        const hasEnoughStock = await checkProductStock(
          item.id, 
          item.quantity, 
          variables, 
          terminal
        );

        return {
          item,
          index,
          hasStock: hasEnoughStock
        };
      })
    );

    console.log('📊 Resultados de validación:', stockValidations);

    // Actualizar el carrito con información de stock
    const updatedCart = cart.map((item, index) => ({
      ...item,
      hasStock: stockValidations[index].hasStock
    }));

    setCart(updatedCart);

    // Identificar productos sin stock suficiente
    const outOfStockItems = stockValidations.filter(validation => !validation.hasStock);
    
    if (outOfStockItems.length > 0) {
      const itemNames = outOfStockItems.map(validation => validation.item.name).join(", ");
      const message = `Los siguientes productos no tienen stock suficiente: ${itemNames}`;
      
      console.log('❌ Productos sin stock:', outOfStockItems);
      
      setAlert({
        show: true,
        type: 'error',
        message: message
      });

      return false; // Validación falló
    }

    console.log('✅ Validación de stock del carrito completada exitosamente');
    return true;

  } catch (error) {
    console.error('❌ Error validando stock del carrito:', error);
    
    setAlert({
      show: true,
      type: 'error',
      message: 'Error al validar el stock del carrito: ' + error.message
    });

    return false;
  }
};

export const getMultipleProductsStock = async (productIds, warehouseId, variables) => {
  console.log('🔍 Obteniendo stock de múltiples productos:', productIds);
  
  try {
    const stockPromises = productIds.map(productId => 
      getProductStock(productId, warehouseId, variables)
    );

    const stockResults = await Promise.all(stockPromises);
    
    const stockMap = {};
    stockResults.forEach((result, index) => {
      const productId = productIds[index];
      stockMap[productId] = {
        success: result.success,
        stock: result.stock,
        error: result.error,
        warehouseId: result.warehouseId
      };
    });

    console.log('📦 Stock de productos obtenido:', stockMap);
    return stockMap;

  } catch (error) {
    console.error('❌ Error obteniendo stock múltiple:', error);
    return {};
  }
};

// 🔥 NUEVA: Función de debug para verificar stock de un producto
export const debugProductStock = async (productId, warehouseId, variables) => {
  console.group('🔍 DEBUG: Stock del producto');
  
  console.log('📋 Parámetros:', {
    productId,
    warehouseId,
    apiUrl: `${variables.SPOS_URL}/api/index.php`,
    hasApiKey: !!(variables.DOLIBARR_API_KEY || variables.dolibarrToken)
  });

  const stockResult = await getProductStock(productId, warehouseId, variables);
  
  console.log('📦 Resultado completo:', stockResult);
  
  if (stockResult.success) {
    console.log('✅ Stock obtenido exitosamente:', {
      stock: stockResult.stock,
      warehouse: stockResult.warehouseId
    });
  } else {
    console.log('❌ Error obteniendo stock:', stockResult.error);
  }
  
  console.groupEnd();
  
  return stockResult;
};


// Buscar productos con información de precios
export const searchProductsWithPricing = async (searchTerm, variables, terminal, customerId, saleType) => {
  try {
    const API_BASE_URL = `${variables.SPOS_URL}/api/index.php`;
    const API_KEY = variables.DOLIBARR_API_KEY || variables.dolibarrToken;
    
    if (!API_BASE_URL || !API_KEY) {
      return {
        error: { value: 1, message: "API no configurada" },
        data: []
      };
    }
    
    // Crear filtro de búsqueda por referencia o nombre
    const searchFilter = `(t.ref:like:'%${searchTerm}%')or(t.label:like:'%${searchTerm}%')`;
    const response = await fetch(
      `${API_BASE_URL}/products?sqlfilters=${encodeURIComponent(searchFilter)}&limit=50`,
      {
        headers: getDolibarrHeaders(API_KEY)
      }
    );
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    const products = await response.json();
    
    // Enriquecer productos con información de precios y stock
    const enrichedProducts = await Promise.all(products.map(async (product) => {
      // 🔥 CORREGIDO: Usar los campos correctos de la API
      let customerPrice = parseFloat(product.price_ttc || 0);
      let minPrice = parseFloat(product.price_min_ttc || product.price_ttc || 0);
      
      console.log('🔍 Producto obtenido de API:', {
        id: product.id,
        ref: product.ref,
        label: product.label,
        price_ttc: product.price_ttc,
        price_min_ttc: product.price_min_ttc,
        multiprices_ttc: product.multiprices_ttc,
        multiprices_min_ttc: product.multiprices_min_ttc
      });
      
      // Si hay cliente específico, intentar obtener precios personalizados
      if (customerId && customerId !== '1') {
        try {
          const customerResponse = await fetch(
            `${API_BASE_URL}/thirdparties/${customerId}`,
            {
              headers: getDolibarrHeaders(API_KEY)
            }
          );
          
          if (customerResponse.ok) {
            const customerData = await customerResponse.json();
            const priceLevel = parseInt(customerData.price_level || 1);
            
            console.log('👤 Cliente con nivel de precio:', priceLevel);
            
            // 🔥 CORREGIDO: Los multiprecios son arrays, usar índice
            if (product.multiprices_ttc && Array.isArray(product.multiprices_ttc) && product.multiprices_ttc.length >= priceLevel) {
              const multiPrice = parseFloat(product.multiprices_ttc[priceLevel - 1]); // Array es 0-indexed
              if (multiPrice > 0) {
                customerPrice = multiPrice;
                console.log('✅ Usando precio multinivel:', customerPrice, 'para nivel:', priceLevel);
              }
            }
            
            // 🔥 CORREGIDO: Lo mismo para precio mínimo multinivel
            if (product.multiprices_min_ttc && Array.isArray(product.multiprices_min_ttc) && product.multiprices_min_ttc.length >= priceLevel) {
              const multiMinPrice = parseFloat(product.multiprices_min_ttc[priceLevel - 1]); // Array es 0-indexed
              if (multiMinPrice > 0) {
                minPrice = multiMinPrice;
                console.log('✅ Usando precio mínimo multinivel:', minPrice, 'para nivel:', priceLevel);
              }
            }
          }
        } catch (priceError) {
          console.warn("Error obteniendo precios del cliente:", priceError);
        }
      }
      
      // 🔥 CORREGIDO: Obtener stock usando la nueva función getProductStock
      let warehouseStock = parseFloat(product.stock_reel || 0);
      if (terminal?.fk_warehouse) {
        try {
          const stockResult = await getProductStock(product.id, terminal.fk_warehouse, variables);
          if (stockResult.success) {
            warehouseStock = stockResult.stock;
            console.log(`📦 Stock actualizado desde API para producto ${product.id}:`, warehouseStock);
          } else {
            console.warn(`⚠️ Error obteniendo stock para producto ${product.id}:`, stockResult.error);
            // Mantener stock_reel como fallback
          }
        } catch (stockError) {
          console.warn(`⚠️ Error consultando stock para producto ${product.id}:`, stockError);
          // Mantener stock_reel como fallback
        }
      }
      
      const enrichedProduct = {
        id: product.id,
        ref: product.ref,
        label: product.label,
        price_ttc: customerPrice,
        price_min_ttc: minPrice, // 🔥 CORREGIDO: usar price_min_ttc consistentemente
        stock: warehouseStock,
        tva_tx: parseFloat(product.tva_tx || 0),
        type: parseInt(product.type || 0),
        unity: product.unity || '',
        description: product.description || '',
        // Mantener datos originales por compatibilidad
        rawData: product
      };
      
      console.log('✅ Producto enriquecido:', {
        id: enrichedProduct.id,
        ref: enrichedProduct.ref,
        customerPrice: enrichedProduct.price_ttc,
        minPrice: enrichedProduct.price_min_ttc,
        stock: enrichedProduct.stock
      });
      
      return enrichedProduct;
    }));
    
    return {
      error: { value: 0 },
      data: enrichedProducts
    };
    
  } catch (error) {
    console.error("Error buscando productos:", error);
    return {
      error: { value: 1, message: error.message },
      data: []
    };
  }
};


// Manejar cambio de tipo de venta
export const handleTipoVentaChange = async (selectedTipo, setTipoVenta, setIsEditable, cart, setCart, variables) => {
  setTipoVenta(selectedTipo);

  if (selectedTipo === "Factura") {
    setIsEditable(true);
    
    // Validar stock si está habilitado
    if (variables.SPOS_VALIDARSTOCK === "1") {
      // Esta función se debe llamar desde el componente principal
      // await validateStockForCart();
    }
  } else {
    setIsEditable(false);
    
    // Remover marca de "sin stock" para cotización/pedido
    const updatedCart = cart.map(item => ({
      ...item,
      hasStock: true
    }));
    setCart(updatedCart);
  }
};

export const validateProductStockDetailed = async (productId, requestedQuantity, variables, terminal) => {
  console.log('🔍 Validación detallada de stock:', {
    productId,
    requestedQuantity,
    warehouseId: terminal?.fk_warehouse
  });

  const stockResult = await getProductStock(
    productId, 
    terminal?.fk_warehouse, 
    variables
  );

  const validation = {
    productId,
    requestedQuantity,
    warehouseId: terminal?.fk_warehouse,
    stockResult,
    isValid: false,
    availableStock: 0,
    shortfall: 0,
    message: ''
  };

  if (!stockResult.success) {
    validation.message = `Error consultando stock: ${stockResult.error}`;
    validation.isValid = true; // Modo permisivo en caso de error
  } else {
    validation.availableStock = stockResult.stock;
    validation.isValid = stockResult.stock >= requestedQuantity;
    validation.shortfall = Math.max(0, requestedQuantity - stockResult.stock);
    
    if (validation.isValid) {
      validation.message = `Stock suficiente: ${stockResult.stock} disponible`;
    } else {
      validation.message = `Stock insuficiente: ${stockResult.stock} disponible, faltan ${validation.shortfall}`;
    }
  }

  console.log('📊 Validación detallada completada:', validation);
  return validation;
};


// Manejar agregar producto al carrito
export const handleAddProduct = async (product, cart, setCart, setAlert, tipoVenta, variables, terminal, customerDiscount) => {
  const existingProductIndex = cart.findIndex(item => item.id === product.id);
  const currentQuantity = existingProductIndex !== -1 ? cart[existingProductIndex].quantity : 0;
  const newQuantity = currentQuantity + 1;

  // Verificar stock solo si es factura y validación está activa
  if (tipoVenta === "Factura" && variables.SPOS_VALIDARSTOCK === "1") {
    console.log('🔍 Validando stock antes de agregar producto...');
    
    const hasEnoughStock = await checkProductStock(
      product.id, 
      newQuantity, 
      variables, 
      terminal
    );
    
    if (!hasEnoughStock) {
      setAlert({ 
        show: true, 
        type: 'error', 
        message: `Stock insuficiente para ${product.label || product.name}` 
      });
      return;
    }
  }

  // Agregar o actualizar producto en el carrito
  if (existingProductIndex !== -1) {
    const newCart = [...cart];
    newCart[existingProductIndex].quantity = newQuantity;
    newCart[existingProductIndex].hasStock = true;
    setCart(newCart);
  } else {
    setCart([...cart, { 
      ...product, 
      name: product.label || product.name || 'Producto',
      price: parseFloat(product.price_ttc) || 0,
      quantity: 1, 
      discount: customerDiscount,
      hasStock: true
    }]);
  }

  console.log('✅ Producto agregado al carrito exitosamente');
};

// Manejar cambio de cantidad
export const handleQuantityChange = async (index, newQuantity, cart, setCart, setAlert, tipoVenta, variables, terminal) => {
  const product = cart[index];
  
  if (newQuantity <= 0) {
    console.log('⚠️ Cantidad inválida, removiendo producto');
    const newCart = cart.filter((_, i) => i !== index);
    setCart(newCart);
    return;
  }
  
  // Verificar stock solo si es factura y validación está activa
  if (tipoVenta === "Factura" && variables.SPOS_VALIDARSTOCK === "1") {
    console.log('🔍 Validando stock para nueva cantidad...');
    
    const hasEnoughStock = await checkProductStock(
      product.id, 
      newQuantity, 
      variables, 
      terminal
    );
  
    if (!hasEnoughStock) {
      setAlert({ 
        show: true, 
        type: 'error', 
        message: `Stock insuficiente para ${product.name}. Cantidad solicitada: ${newQuantity}` 
      });
      return;
    }
  }
  
  // Actualizar cantidad
  const newCart = [...cart];
  newCart[index].quantity = newQuantity;
  newCart[index].hasStock = true;
  setCart(newCart);
  
  console.log('✅ Cantidad actualizada exitosamente');
};


export const handleQuantityChangeWithStockValidation = async (
  index, 
  newQuantity, 
  cart, 
  setCart, 
  setAlert, 
  tipoVenta, 
  variables, 
  terminal
) => {
  const product = cart[index];
  
  if (newQuantity <= 0) {
    console.log('⚠️ Cantidad inválida, removiendo producto');
    const newCart = cart.filter((_, i) => i !== index);
    setCart(newCart);
    return true;
  }
  
  // Verificar stock solo si es factura y validación está activa
  if (tipoVenta === "Factura" && variables.SPOS_VALIDARSTOCK === "1") {
    console.log('🔍 Validando stock para nueva cantidad...');
    
    const hasEnoughStock = await checkProductStock(
      product.id, 
      newQuantity, 
      variables, 
      terminal
    );
  
    if (!hasEnoughStock) {
      setAlert({ 
        show: true, 
        type: 'error', 
        message: `Stock insuficiente para ${product.name}. Cantidad solicitada: ${newQuantity}` 
      });
      return false;
    }
  }
  
  // Actualizar cantidad
  const newCart = [...cart];
  newCart[index].quantity = newQuantity;
  newCart[index].hasStock = true;
  setCart(newCart);
  
  console.log('✅ Cantidad actualizada exitosamente');
  return true;
};


// Validar descuento
export const handleDiscountChange = async (index, newDiscount, cart, setCart, setAlert, variables, terminal, selectedCustomerDetails, tipoVenta) => {
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
    console.log('🔍 Validando descuento para producto:', item.ref || item.id);
    
    // 🔥 CORREGIDO: Usar referencia o ID directamente para buscar el producto
    const searchTerm = item.ref || item.id;
    const productInfo = await searchProductsWithPricing(
      searchTerm, 
      variables, 
      terminal, 
      selectedCustomerDetails?.id || '1', 
      tipoVenta === "Cotizacion" ? 0 : tipoVenta === "Pedido" ? 2 : 3
    );

    console.log('📦 Respuesta de búsqueda de producto:', productInfo);

    if (productInfo.error.value === 0 && productInfo.data.length > 0) {
      const productData = productInfo.data[0];
      const priceTtcMin = parseFloat(productData.price_min_ttc); // 🔥 CORREGIDO: usar price_min_ttc
      
      console.log('💰 Precios del producto:', {
        precio_actual: item.price,
        precio_minimo: priceTtcMin,
        cantidad: item.quantity,
        descuento_propuesto: newDiscount
      });
      
      const discountedSubtotal = item.price * item.quantity * (1 - newDiscount / 100);
      const minimumSubtotal = priceTtcMin * item.quantity;

      console.log('🧮 Cálculo de validación:', {
        subtotal_con_descuento: discountedSubtotal,
        subtotal_minimo_permitido: minimumSubtotal,
        es_valido: discountedSubtotal >= minimumSubtotal
      });

      if (discountedSubtotal >= minimumSubtotal) {
        item.discount = newDiscount;
        setCart(updatedCart);
        console.log('✅ Descuento aplicado exitosamente');
      } else {
        setAlert({
          show: true,
          type: 'error',
          message: `El descuento es demasiado alto. El subtotal no puede estar por debajo de Q${minimumSubtotal.toFixed(2)}.`,
        });
        console.log('❌ Descuento rechazado - por debajo del mínimo');
      }
    } else {
      console.error('❌ No se pudo obtener información del producto:', productInfo.error.message);
      setAlert({
        show: true,
        type: 'error',
        message: 'Error al obtener el precio mínimo del producto.',
      });
    }
  } catch (error) {
    console.error('❌ Error validando descuento:', error);
    setAlert({
      show: true,
      type: 'error',
      message: 'Error al validar el descuento.',
    });
  }
};

// Validar cambio de subtotal
export const handleSubtotalChange = async (index, newSubtotal, cart, setCart, setAlert, variables, terminal, selectedCustomerDetails, tipoVenta) => {
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
    console.log('🔍 Validando cambio de subtotal para producto:', item.ref || item.id);
    
    // 🔥 CORREGIDO: Usar referencia o ID directamente para buscar el producto
    const searchTerm = item.ref || item.id;
    const productInfo = await searchProductsWithPricing(
      searchTerm, 
      variables, 
      terminal, 
      selectedCustomerDetails?.id || '1', 
      tipoVenta === "Cotizacion" ? 0 : tipoVenta === "Pedido" ? 2 : 3
    );

    console.log('📦 Respuesta de búsqueda de producto:', productInfo);

    if (productInfo.error.value === 0 && productInfo.data.length > 0) {
      const productData = productInfo.data[0];
      const priceTtcMin = parseFloat(productData.price_min_ttc); // 🔥 CORREGIDO: usar price_min_ttc
      const minimumSubtotal = priceTtcMin * item.quantity;

      console.log('💰 Validación de subtotal:', {
        subtotal_propuesto: newSubtotal,
        subtotal_minimo: minimumSubtotal,
        precio_minimo: priceTtcMin,
        cantidad: item.quantity,
        es_valido: newSubtotal >= minimumSubtotal
      });

      if (newSubtotal >= minimumSubtotal) {
        // Calcular el nuevo precio unitario basado en el subtotal deseado
        item.price = newSubtotal / item.quantity / ((100 - item.discount) / 100);
        setCart(updatedCart);
        console.log('✅ Subtotal actualizado exitosamente. Nuevo precio unitario:', item.price);
      } else {
        setAlert({
          show: true,
          type: 'error',
          message: `El subtotal debe ser mayor o igual a Q${minimumSubtotal.toFixed(2)} después del descuento.`,
        });
        console.log('❌ Subtotal rechazado - por debajo del mínimo');
      }
    } else {
      console.error('❌ No se pudo obtener información del producto:', productInfo.error.message);
      setAlert({
        show: true,
        type: 'error',
        message: 'Error al obtener el precio mínimo del producto.',
      });
    }
  } catch (error) {
    console.error('❌ Error validando subtotal:', error);
    setAlert({
      show: true,
      type: 'error',
      message: 'Error al validar el subtotal.',
    });
  }
};

export const handleAddProductWithStockValidation = async (
  product, 
  cart, 
  setCart, 
  setAlert, 
  tipoVenta, 
  variables, 
  terminal, 
  customerDiscount
) => {
  const existingProductIndex = cart.findIndex(item => item.id === product.id);
  const currentQuantity = existingProductIndex !== -1 ? cart[existingProductIndex].quantity : 0;
  const newQuantity = currentQuantity + 1;

  // Verificar stock solo si es factura y validación está activa
  if (tipoVenta === "Factura" && variables.SPOS_VALIDARSTOCK === "1") {
    console.log('🔍 Validando stock antes de agregar producto...');
    
    const hasEnoughStock = await checkProductStock(
      product.id, 
      newQuantity, 
      variables, 
      terminal
    );
    
    if (!hasEnoughStock) {
      setAlert({ 
        show: true, 
        type: 'error', 
        message: `Stock insuficiente para ${product.label || product.name}` 
      });
      return false;
    }
  }

  // Agregar o actualizar producto en el carrito
  if (existingProductIndex !== -1) {
    const newCart = [...cart];
    newCart[existingProductIndex].quantity = newQuantity;
    newCart[existingProductIndex].hasStock = true;
    setCart(newCart);
  } else {
    setCart([...cart, { 
      ...product, 
      name: product.label || product.name || 'Producto',
      price: parseFloat(product.price_ttc) || 0,
      quantity: 1, 
      discount: customerDiscount,
      hasStock: true
    }]);
  }

  console.log('✅ Producto agregado al carrito exitosamente');
  return true;
};


export const getProductPricing = async (productId, customerId, variables) => {
  try {
    const API_BASE_URL = `${variables.SPOS_URL}/api/index.php`;
    const API_KEY = variables.DOLIBARR_API_KEY;
    
    console.log('🔍 Obteniendo precios para producto ID:', productId, 'cliente:', customerId);
    
    // Obtener información del producto
    const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
      headers: getDolibarrHeaders(API_KEY)
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    const product = await response.json();
    
    // Precios por defecto
    let customerPrice = parseFloat(product.price_ttc || 0);
    let minPrice = parseFloat(product.price_min_ttc || product.price_ttc || 0);
    
    console.log('💰 Precios base del producto:', {
      price_ttc: product.price_ttc,
      price_min_ttc: product.price_min_ttc
    });
    
    // Si hay cliente específico, obtener precios personalizados
    if (customerId && customerId !== '1') {
      try {
        const customerResponse = await fetch(
          `${API_BASE_URL}/thirdparties/${customerId}`,
          {
            headers: getDolibarrHeaders(API_KEY)
          }
        );
        
        if (customerResponse.ok) {
          const customerData = await customerResponse.json();
          const priceLevel = parseInt(customerData.price_level || 1);
          
          console.log('👤 Nivel de precio del cliente:', priceLevel);
          
          // Usar precios multinivel si están disponibles
          if (product.multiprices_ttc && Array.isArray(product.multiprices_ttc) && product.multiprices_ttc.length >= priceLevel) {
            const multiPrice = parseFloat(product.multiprices_ttc[priceLevel - 1]);
            if (multiPrice > 0) {
              customerPrice = multiPrice;
            }
          }
          
          if (product.multiprices_min_ttc && Array.isArray(product.multiprices_min_ttc) && product.multiprices_min_ttc.length >= priceLevel) {
            const multiMinPrice = parseFloat(product.multiprices_min_ttc[priceLevel - 1]);
            if (multiMinPrice > 0) {
              minPrice = multiMinPrice;
            }
          }
        }
      } catch (customerError) {
        console.warn('⚠️ Error obteniendo datos del cliente:', customerError);
      }
    }
    
    const result = {
      productId: product.id,
      ref: product.ref,
      label: product.label,
      price_ttc: customerPrice,
      price_min_ttc: minPrice,
      tva_tx: parseFloat(product.tva_tx || 0),
      stock_reel: parseFloat(product.stock_reel || 0)
    };
    
    console.log('✅ Precios calculados:', result);
    
    return {
      error: { value: 0 },
      data: result
    };
    
  } catch (error) {
    console.error('❌ Error obteniendo precios del producto:', error);
    return {
      error: { value: 1, message: error.message },
      data: null
    };
  }
};



// Resetear venta (sin cambios, función auxiliar)
export const resetSale = (setters, loadDefaultCustomer) => {
  const {
    setCart,
    setProductSearch,
    setCustomerSearch,
    setSelectedCustomerDetails,
    setCustomerDiscount,
    setTipoVenta,
    setGeneralNotes,
    setSelectedTicket,
    setSelectedCategory,
    setExtraFields,
    setPayments,
    setIsPaymentModalOpen,
    setShowTicket,
    setIsEditable
  } = setters;

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
};

// Formatear datos para procesamiento de extrafields (sin cambios)
export const processExtraFields = (extrafields) => {
  let processedExtraFields = {};
  if (extrafields && Array.isArray(extrafields)) {
    extrafields.forEach(field => {
      Object.entries(field).forEach(([key, value]) => {
        if (key !== 'fk_object' && key !== 'rowid') {
          processedExtraFields[key] = String(value);
        }
      });
    });
  }
  return processedExtraFields;
};

// ============================================================================
// FUNCIONES ADICIONALES PARA COMPATIBILIDAD CON API DOLIBARR
// ============================================================================

// Crear movimiento de stock (útil para ajustes manuales)
export const createStockMovement = async (productId, warehouseId, qty, price, movementLabel, variables, type = 3) => {
  try {
    const API_BASE_URL = `${variables.SPOS_URL}/api/index.php`;
    const API_KEY = variables.DOLIBARR_API_KEY;
    
    const stockMovementPayload = {
      product_id: parseInt(productId),
      warehouse_id: parseInt(warehouseId),
      qty: parseFloat(qty),
      type: type, // 3 = entrada, 1 = salida, etc.
      movementcode: `POS_${Date.now()}`,
      movementlabel: movementLabel,
      price: parseFloat(price || 0)
    };

    const response = await fetch(`${API_BASE_URL}/stockmovements`, {
      method: 'POST',
      headers: getDolibarrHeaders(API_KEY),
      body: JSON.stringify(stockMovementPayload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Error ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Error creando movimiento de stock:', error);
    throw error;
  }
};

// Obtener lista de almacenes disponibles
export const getWarehouses = async (variables) => {
  try {
    const API_BASE_URL = `${variables.SPOS_URL}/api/index.php`;
    const API_KEY = variables.DOLIBARR_API_KEY;
    
    const response = await fetch(`${API_BASE_URL}/warehouses`, {
      headers: getDolibarrHeaders(API_KEY)
    });
    
    if (response.ok) {
      return await response.json();
    }
    
    return [];
  } catch (error) {
    console.error("Error obteniendo almacenes:", error);
    return [];
  }
};

// Obtener información completa de un producto
export const getProductDetails = async (productId, variables) => {
  try {
    const API_BASE_URL = `${variables.SPOS_URL}/api/index.php`;
    const API_KEY = variables.DOLIBARR_API_KEY;
    
    const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
      headers: getDolibarrHeaders(API_KEY)
    });
    
    if (response.ok) {
      return await response.json();
    }
    
    return null;
  } catch (error) {
    console.error("Error obteniendo detalles del producto:", error);
    return null;
  }
};

// ============================================================================
// CONFIGURACIÓN Y VALIDACIÓN
// ============================================================================

// Validar configuración de API
export const validateApiConfiguration = async (variables) => {
  try {
    const API_BASE_URL = `${variables.SPOS_URL}/api/index.php`;
    const API_KEY = variables.DOLIBARR_API_KEY;
    
    if (!API_BASE_URL || !API_KEY) {
      return {
        valid: false,
        message: "URL de Dolibarr o API Key no configurados"
      };
    }
    
    // Probar conexión con endpoint básico
    const response = await fetch(`${API_BASE_URL}/status`, {
      headers: getDolibarrHeaders(API_KEY)
    });
    
    if (response.ok) {
      return {
        valid: true,
        message: "Configuración de API válida"
      };
    } else {
      return {
        valid: false,
        message: `Error de conexión: ${response.status}`
      };
    }
    
  } catch (error) {
    return {
      valid: false,
      message: `Error de configuración: ${error.message}`
    };
  }
};

// Información de estado de la migración
export const getMigrationInfo = () => {
  return {
    version: "1.0.0",
    migrationDate: new Date().toISOString(),
    changes: [
      "Eliminación de dependencia de ajax_pos_siel.php",
      "Uso de API nativa de Dolibarr",
      "Mejor manejo de errores",
      "Soporte para múltiples almacenes",
      "Compatibilidad con precios por cliente"
    ],
    requirements: [
      "Dolibarr v14 o superior",
      "Módulo API REST activado",
      "Módulo Productos activado",
      "Módulo Stock activado",
      "DOLIBARR_API_KEY configurado"
    ]
  };
};