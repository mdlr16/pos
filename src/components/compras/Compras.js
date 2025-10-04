import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Package, Plus, Search, ShoppingCart, Truck, FileText, Filter, AlertTriangle, RefreshCw, Edit, Eye, Trash2, User, Calendar, Save, X } from 'lucide-react';

const Compras = ({ terminal }) => {
  const { variables, dolibarrToken, isInitialized } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('facturas');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Estados para datos de Dolibarr
  const [facturas, setFacturas] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [recepciones, setRecepciones] = useState([]);
  const [comprasStats, setComprasStats] = useState({
    facturasPendientes: 0,
    totalMes: 0,
    proveedoresActivos: 0,
    recepcionesHoy: 0
  });

  // Modales
  const [showFacturaCompra, setShowFacturaCompra] = useState(false);
  const [showProveedorModal, setShowProveedorModal] = useState(false);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState(null);
  const [selectedProveedor, setSelectedProveedor] = useState(null);

  // URLs y headers de API 
  const API_BASE_URL = variables.SPOS_URL ? `${variables.SPOS_URL}/api/index.php` : null;
  const API_KEY = variables.DOLIBARR_API_KEY || dolibarrToken;

  const getHeaders = () => ({
    'DOLAPIKEY': API_KEY,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  });

  const tabs = [
    { id: 'facturas', label: 'Facturas de Compra', icon: FileText },
    { id: 'recepciones', label: 'Recepciones', icon: Truck },
    { id: 'proveedores', label: 'Proveedores', icon: Package }
  ];

  // Función para validar y limpiar el código del proveedor
  const validateSupplierCode = (code) => {
    if (!code || code.trim() === '') {
      return null;
    }
    
    const cleanCode = code.trim().replace(/[^a-zA-Z0-9\-_]/g, '').toUpperCase();
    
    if (cleanCode.length > 18) {
      return cleanCode.substring(0, 18);
    }
    
    return cleanCode;
  };

  // Función para generar un código automático si no se proporciona
  const generateSupplierCode = (nombre) => {
    if (!nombre) return null;
    
    const prefix = nombre.trim().substring(0, 6).toUpperCase().replace(/[^A-Z]/g, '');
    const timestamp = Date.now().toString().slice(-6);
    
    return `${prefix}${timestamp}`;
  };

  // Crear movimiento de stock
  const createStockMovement = async (productId, warehouseId, qty, price, movementLabel, invoiceId) => {
    if (!API_BASE_URL || !API_KEY) {
      throw new Error('API no configurada');
    }

    try {
      console.log('Creando movimiento de stock:', {
        product_id: productId,
        warehouse_id: warehouseId,
        qty: qty,
        price: price,
        movementlabel: movementLabel,
        origin_type: 'supplier_invoice',
        origin_id: invoiceId
      });

      const stockMovementPayload = {
        product_id: parseInt(productId),
        warehouse_id: parseInt(warehouseId),
        qty: parseFloat(qty),
        type: 3, // 3 = input (incremento de stock)
        movementcode: `SUPP_INV_${invoiceId}`,
        movementlabel: movementLabel,
        price: parseFloat(price || 0),
        origin_type: 'supplier_invoice',
        origin_id: parseInt(invoiceId)
      };

      const response = await fetch(`${API_BASE_URL}/stockmovements`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(stockMovementPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Movimiento de stock creado:', result);
      return result;

    } catch (error) {
      console.error('Error creando movimiento de stock:', error);
      throw error;
    }
  };

  // Obtener líneas de la factura desde Dolibarr
  const getInvoiceLines = async (invoiceId) => {
    if (!API_BASE_URL || !API_KEY) return [];

    try {
      console.log('Obteniendo líneas de factura:', invoiceId);
      
      const response = await fetch(`${API_BASE_URL}/supplierinvoices/${invoiceId}/lines`, {
        method: 'GET',
        headers: getHeaders()
      });

      if (response.ok) {
        const lines = await response.json();
        console.log('Líneas de factura obtenidas:', lines);
        return lines;
      } else {
        console.error('Error obteniendo líneas de factura:', response.status);
        return [];
      }
    } catch (error) {
      console.error('Error obteniendo líneas de factura:', error);
      return [];
    }
  };

  // Cargar facturas de compra desde Dolibarr
  const fetchFacturasCompra = async () => {
    if (!API_BASE_URL || !API_KEY) return;

    setLoading(true);
    setError('');
    
    try {
      console.log('Cargando facturas de compra...');
      
      const response = await fetch(`${API_BASE_URL}/supplierinvoices?sortfield=datec&sortorder=DESC&limit=50`, {
        method: 'GET',
        headers: getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Facturas de compra obtenidas:', data);

      const transformedInvoices = data.map(invoice => ({
        id: invoice.id,
        ref: invoice.ref,
        proveedor: invoice.socname || 'Proveedor desconocido',
        proveedorId: invoice.socid,
        fecha: invoice.date ? new Date(invoice.date * 1000).toLocaleDateString() : 'N/A',
        fechaCreacion: invoice.datec ? new Date(invoice.datec * 1000).toLocaleDateString() : 'N/A',
        fechaVencimiento: invoice.date_lim_reglement ? new Date(invoice.date_lim_reglement * 1000).toLocaleDateString() : null,
        total: parseFloat(invoice.total_ttc || 0),
        estado: getEstadoFactura(invoice.statut),
        estatutId: invoice.statut,
        pagado: parseFloat(invoice.sumpayed || 0),
        pendiente: parseFloat(invoice.total_ttc || 0) - parseFloat(invoice.sumpayed || 0),
        observaciones: invoice.note_private || invoice.note_public || '',
        rawData: invoice
      }));

      setFacturas(transformedInvoices);

      const stats = {
        facturasPendientes: transformedInvoices.filter(f => f.estatutId == 1).length,
        totalMes: transformedInvoices.reduce((sum, f) => sum + f.total, 0),
        proveedoresActivos: new Set(transformedInvoices.map(f => f.proveedorId)).size,
        recepcionesHoy: 0
      };
      
      setComprasStats(stats);

    } catch (err) {
      console.error('Error cargando facturas de compra:', err);
      setError('Error al cargar facturas de compra: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cargar proveedores desde Dolibarr
  const fetchProveedores = async () => {
    if (!API_BASE_URL || !API_KEY) return;

    try {
      console.log('Cargando proveedores...');
      
      const response = await fetch(`${API_BASE_URL}/thirdparties?sortfield=nom&sortorder=ASC&limit=100&sqlfilters=(t.fournisseur:=:1)`, {
        method: 'GET',
        headers: getHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Proveedores obtenidos:', data);

        const transformedSuppliers = data.map(supplier => ({
          id: supplier.id,
          nombre: supplier.name,
          codigo: supplier.code_client || supplier.code_fournisseur,
          email: supplier.email,
          telefono: supplier.phone,
          direccion: supplier.address,
          ciudad: supplier.town,
          pais: supplier.country,
          activo: supplier.status == 1,
          rawData: supplier
        }));

        setProveedores(transformedSuppliers);

        setComprasStats(prev => ({
          ...prev,
          proveedoresActivos: transformedSuppliers.filter(p => p.activo).length
        }));
      }
    } catch (err) {
      console.error('Error cargando proveedores:', err);
    }
  };

  // Función auxiliar para obtener estado de factura
  const getEstadoFactura = (statut) => {
    switch (statut) {
      case '0': return 'Borrador';
      case '1': return 'Validada';
      case '2': return 'Pagada';
      case '3': return 'Abandonada';
      default: return 'Desconocido';
    }
  };

  // Crear nueva factura de compra con líneas de productos
  const createFacturaCompra = async (facturaData) => {
    if (!API_BASE_URL || !API_KEY) return;

    setLoading(true);
    try {
      console.log('Enviando factura de compra a Dolibarr:', facturaData);

      const response = await fetch(`${API_BASE_URL}/supplierinvoices`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(facturaData)
      });

      const responseText = await response.text();
      console.log('Respuesta cruda de Dolibarr:', responseText);

      if (!response.ok) {
        let errorMessage = `Error ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error?.message || errorMessage;
        } catch (parseError) {
          if (responseText.includes('Warning:') || responseText.includes('Notice:')) {
            errorMessage = 'Error en Dolibarr: Verifique la configuración de PHP (warnings detectados)';
          } else {
            errorMessage = `Error del servidor: ${responseText.substring(0, 200)}`;
          }
        }
        
        throw new Error(errorMessage);
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.warn('No se pudo parsear la respuesta como JSON:', responseText);
        result = { success: true, message: 'Factura creada (respuesta no JSON)' };
      }

      console.log('Factura de compra creada exitosamente:', result);

      await fetchFacturasCompra();
      
      alert(`Factura de compra creada exitosamente\nID: ${result.id || result || 'N/A'}`);
      setShowFacturaCompra(false);
      setSelectedFactura(null);

    } catch (err) {
      console.error('Error creando factura de compra:', err);
      setError('Error al crear factura de compra: ' + err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Validar factura de compra y actualizar stock automáticamente
  const validarFactura = async (facturaId) => {
    if (!API_BASE_URL || !API_KEY) return;

    // Verificar si la terminal tiene almacén configurado
    if (!terminal?.fk_warehouse) {
      const confirmContinue = window.confirm(
        'La terminal seleccionada no tiene un almacén configurado. La factura se validará pero NO se actualizará el stock automáticamente.\n\n¿Desea continuar con la validación?'
      );
      if (!confirmContinue) return;
    }

    setLoading(true);
    try {
      console.log('Validando factura:', facturaId);

      // Paso 1: Validar la factura
      const response = await fetch(`${API_BASE_URL}/supplierinvoices/${facturaId}/validate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({})
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Factura validada:', result);

      // Paso 2: Actualizar stock automáticamente si la terminal tiene almacén
      if (terminal.fk_warehouse) {
        try {
          console.log('Iniciando actualización automática de stock...');
          console.log(`Usando almacén de la terminal: ID ${terminal.fk_warehouse} (Terminal: ${terminal.name})`);
          
          // Obtener las líneas de la factura
          const invoiceLines = await getInvoiceLines(facturaId);
          
          if (invoiceLines && invoiceLines.length > 0) {
            let movementsCreated = 0;
            let movementErrors = [];

            // Crear movimiento de stock para cada línea de producto
            for (const line of invoiceLines) {
              // Solo procesar líneas que son productos (no servicios)
              if (line.fk_product && parseInt(line.product_type || 0) === 0) {
                try {
                  const movementLabel = `Entrada por Factura ${result.ref || facturaId} - ${line.desc || 'Producto'}`;
                  
                  await createStockMovement(
                    line.fk_product,
                    terminal.fk_warehouse, // Usar el almacén de la terminal
                    line.qty,
                    line.subprice,
                    movementLabel,
                    facturaId
                  );
                  
                  movementsCreated++;
                  console.log(`Movimiento creado para producto ${line.fk_product}: +${line.qty} unidades en almacén ${terminal.fk_warehouse}`);
                  
                } catch (stockError) {
                  console.error(`Error creando movimiento para producto ${line.fk_product}:`, stockError);
                  movementErrors.push(`Producto ${line.desc || line.fk_product}: ${stockError.message}`);
                }
              }
            }

            // Mostrar resumen de la actualización de stock
            let stockMessage = '';
            if (movementsCreated > 0) {
              stockMessage += `\n✓ Stock actualizado: ${movementsCreated} productos agregados al almacén de la terminal "${terminal.name}"`;
            }
            if (movementErrors.length > 0) {
              stockMessage += `\n⚠ Errores en stock: ${movementErrors.length} productos no se pudieron actualizar`;
              console.warn('Errores en movimientos de stock:', movementErrors);
            }
            if (movementsCreated === 0 && movementErrors.length === 0) {
              stockMessage += '\nℹ No se encontraron productos para actualizar el stock (solo servicios o líneas sin producto)';
            }

            alert(`Factura validada exitosamente.${stockMessage}`);

            // Mostrar detalles de errores si los hay
            if (movementErrors.length > 0) {
              const showErrors = window.confirm('¿Desea ver los detalles de los errores en la actualización de stock?');
              if (showErrors) {
                alert('Detalles de errores:\n\n' + movementErrors.join('\n'));
              }
            }

          } else {
            alert('Factura validada exitosamente.\nNo se encontraron líneas de productos para actualizar el stock.');
          }

        } catch (stockError) {
          console.error('Error en actualización automática de stock:', stockError);
          alert(`Factura validada exitosamente.\n\n⚠ Error en actualización automática de stock: ${stockError.message}\n\nPuede actualizar el stock manualmente desde el módulo de almacenes.`);
        }
      } else {
        alert('Factura validada exitosamente.\n\nNOTA: No se actualizó el stock automáticamente porque la terminal no tiene un almacén configurado.');
      }

      // Recargar facturas para mostrar el nuevo estado
      await fetchFacturasCompra();

    } catch (err) {
      console.error('Error validando factura:', err);
      setError('Error al validar factura: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Registrar pago de factura
  const registrarPago = async (facturaId, datoPago) => {
    if (!API_BASE_URL || !API_KEY) return;

    setLoading(true);
    try {
      console.log('Registrando pago para factura:', facturaId, datoPago);

      const paymentPayload = {
        datepaye: Math.floor(new Date(datoPago.fecha).getTime() / 1000),
        amounts: {
          [facturaId]: parseFloat(datoPago.monto)
        },
        accountid: datoPago.cuentaBanco || 1,
        paymenttype: datoPago.tipoPago || 2,
        ref: datoPago.referencia || `Pago-${facturaId}-${Date.now()}`,
        note: datoPago.observaciones || ''
      };

      const response = await fetch(`${API_BASE_URL}/supplierinvoices/${facturaId}/payments`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(paymentPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Pago registrado:', result);

      await fetchFacturasCompra();
      
      alert(`Pago registrado exitosamente\nMonto: Q.${datoPago.monto}\nReferencia: ${paymentPayload.ref}`);

    } catch (err) {
      console.error('Error registrando pago:', err);
      setError('Error al registrar pago: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const createProveedor = async (proveedorData) => {
    if (!API_BASE_URL || !API_KEY) return;

    setLoading(true);
    try {
      let supplierCode = validateSupplierCode(proveedorData.codigo);
      
      if (!supplierCode && proveedorData.nombre) {
        const autoGenerate = window.confirm(
          'No se proporcionó un código válido para el proveedor. ¿Desea generar uno automáticamente?'
        );
        
        if (autoGenerate) {
          supplierCode = generateSupplierCode(proveedorData.nombre);
        }
      }

      const supplierPayload = {
        name: proveedorData.nombre,
        fournisseur: 1,
        status: 1
      };

      if (supplierCode) {
        supplierPayload.code_fournisseur = supplierCode;
      }

      if (proveedorData.email && proveedorData.email.trim()) {
        supplierPayload.email = proveedorData.email.trim();
      }
      
      if (proveedorData.telefono && proveedorData.telefono.trim()) {
        supplierPayload.phone = proveedorData.telefono.trim();
      }
      
      if (proveedorData.direccion && proveedorData.direccion.trim()) {
        supplierPayload.address = proveedorData.direccion.trim();
      }
      
      if (proveedorData.ciudad && proveedorData.ciudad.trim()) {
        supplierPayload.town = proveedorData.ciudad.trim();
      }
      
      if (proveedorData.pais && proveedorData.pais.trim()) {
        supplierPayload.country = proveedorData.pais.trim();
      }

      console.log('Creando proveedor con payload:', supplierPayload);

      const response = await fetch(`${API_BASE_URL}/thirdparties`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(supplierPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        
        if (errorData.error?.message?.includes('already exists')) {
          throw new Error('Ya existe un proveedor con ese código. Intente con otro código.');
        } else if (errorData.error?.message?.includes('BadSupplierCodeSyntax')) {
          throw new Error('Formato de código inválido. Use solo letras, números, guiones y guiones bajos.');
        } else {
          throw new Error(errorData.error?.message || `Error ${response.status}: ${response.statusText}`);
        }
      }

      const result = await response.json();
      console.log('Proveedor creado exitosamente:', result);

      await fetchProveedores();
      
      alert(`Proveedor creado exitosamente${supplierCode ? ` con código: ${supplierCode}` : ''}`);
      setShowProveedorModal(false);
      setSelectedProveedor(null);

    } catch (err) {
      console.error('Error creando proveedor:', err);
      setError('Error al crear proveedor: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos al inicializar
  useEffect(() => {
    if (isInitialized && API_BASE_URL && API_KEY) {
      fetchFacturasCompra();
      fetchProveedores();
    }
  }, [isInitialized, API_BASE_URL, API_KEY]);

  const quickActions = [
    {
      title: 'Nueva Factura de Compra',
      description: 'Crear una nueva factura de compra',
      icon: Plus,
      color: 'bg-green-500 hover:bg-green-600',
      action: () => {
        setSelectedFactura(null);
        setShowFacturaCompra(true);
      },
      disabled: !API_KEY
    },
    {
      title: 'Nuevo Proveedor',
      description: 'Agregar nuevo proveedor',
      icon: Plus,
      color: 'bg-blue-500 hover:bg-blue-600',
      action: () => {
        setSelectedProveedor(null);
        setShowProveedorModal(true);
      },
      disabled: !API_KEY
    },
    {
      title: 'Actualizar Datos',
      description: 'Refrescar información de compras',
      icon: RefreshCw,
      color: 'bg-orange-500 hover:bg-orange-600',
      action: () => {
        fetchFacturasCompra();
        fetchProveedores();
      },
      disabled: !API_KEY
    },
    {
      title: 'Buscar Proveedor',
      description: 'Ver lista de proveedores',
      icon: Search,
      color: 'bg-purple-500 hover:bg-purple-600',
      action: () => setActiveTab('proveedores')
    }
  ];

  const getStatusColor = (estado) => {
    switch (estado) {
      case 'Borrador':
        return 'bg-gray-100 text-gray-800';
      case 'Validada':
        return 'bg-yellow-100 text-yellow-800';
      case 'Pagada':
        return 'bg-green-100 text-green-800';
      case 'Abandonada':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredFacturas = facturas.filter(factura => 
    factura.ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    factura.proveedor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProveedores = proveedores.filter(proveedor =>
    proveedor.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proveedor.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Package className="w-6 h-6 text-green-600" />
                Gestión de Compras
              </h1>
              <p className="text-gray-600">Terminal: {terminal?.name || 'N/A'}</p>
              <p className="text-sm text-gray-500">
                Conectado a: {variables.SPOS_URL || 'No configurado'}
              </p>
              <div className="flex gap-4 text-xs text-green-600 mt-1">
                <span>✓ Crear Facturas</span>
                <span>✓ Validar Facturas</span>
                <span>✓ Actualizar Stock</span>
                <span>✓ Registrar Pagos</span>
                <span>✓ Gestión Proveedores</span>
              </div>
              {terminal?.fk_warehouse && (
                <p className="text-xs text-blue-600 mt-1">
                  📦 Almacén configurado: ID {terminal.fk_warehouse} (Terminal: {terminal.name})
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setSelectedFactura(null);
                  setShowFacturaCompra(true);
                }}
                disabled={loading || !API_KEY}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nueva Factura
              </button>
              <button 
                onClick={() => {
                  fetchFacturasCompra();
                  fetchProveedores();
                }}
                disabled={loading || !API_KEY}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Cargando...' : 'Actualizar'}
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <div className="flex-1">
              {error}
              {error.includes('warnings detectados') && (
                <p className="text-sm mt-1">
                  Sugerencia: Configure PHP para suprimir warnings en producción (display_errors = Off)
                </p>
              )}
            </div>
            <button 
              onClick={() => setError('')}
              className="ml-auto text-red-700 hover:text-red-900"
            >
              ✕
            </button>
          </div>
        )}

        {/* Stock Update Notice */}
        {!terminal?.fk_warehouse && API_KEY && (
          <div className="bg-amber-100 border border-amber-400 text-amber-700 px-4 py-3 rounded mb-6 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <div className="flex-1">
              <strong>Aviso importante:</strong> La terminal seleccionada no tiene un almacén configurado. 
              Las facturas se pueden validar normalmente, pero el stock NO se actualizará automáticamente.
              <p className="text-sm mt-1">
                Configure un almacén para la terminal en Dolibarr para habilitar la actualización automática de stock.
              </p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {quickActions.map((action, index) => (
            <div
              key={index}
              onClick={action.disabled ? undefined : action.action}
              className={`${action.color} text-white rounded-lg p-4 transform transition-all duration-200 hover:scale-105 ${
                loading || action.disabled
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-3">
                <action.icon className="w-6 h-6" />
                <div>
                  <h3 className="font-semibold text-sm">{action.title}</h3>
                  <p className="text-xs opacity-90">{action.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Search and Filters */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={
                    activeTab === 'facturas' ? "Buscar por número de factura, proveedor..." :
                    activeTab === 'proveedores' ? "Buscar proveedores..." :
                    "Buscar..."
                  }
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Filter className="w-4 h-4" />
                Filtros
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'facturas' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Facturas de Compra</h3>
                <div className="space-y-4">
                  {filteredFacturas.map((factura) => (
                    <div key={factura.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-gray-800">Factura {factura.ref}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(factura.estado)}`}>
                              {factura.estado}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm">{factura.proveedor}</p>
                          <div className="flex gap-4 text-sm text-gray-500 mt-1">
                            <span>Fecha: {factura.fecha}</span>
                            {factura.fechaVencimiento && <span>Vencimiento: {factura.fechaVencimiento}</span>}
                            {factura.pagado > 0 && <span>Pagado: Q.{factura.pagado.toFixed(2)}</span>}
                          </div>
                          {factura.pendiente > 0 && (
                            <p className="text-xs text-orange-600 mt-1">Pendiente: Q.{factura.pendiente.toFixed(2)}</p>
                          )}
                          {factura.observaciones && (
                            <p className="text-xs text-gray-500 mt-1 italic">{factura.observaciones}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-800">Q.{factura.total.toFixed(2)}</p>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            <button 
                              onClick={() => console.log('Ver factura', factura.ref)}
                              className="text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              Ver
                            </button>
                            
                            {factura.estatutId == 0 && (
                              <>
                                <button 
                                  onClick={() => {
                                    setSelectedFactura(factura);
                                    setShowFacturaCompra(true);
                                  }}
                                  className="text-sm text-green-600 hover:text-green-800 transition-colors flex items-center gap-1"
                                >
                                  <Edit className="w-3 h-3" />
                                  Editar
                                </button>
                                <button 
                                  onClick={() => validarFactura(factura.id)}
                                  disabled={loading}
                                  className="text-sm text-purple-600 hover:text-purple-800 transition-colors flex items-center gap-1 disabled:opacity-50"
                                  title="Validar factura y actualizar stock automáticamente"
                                >
                                  <FileText className="w-3 h-3" />
                                  Validar + Stock
                                </button>
                              </>
                            )}
                            
                            {factura.estatutId == 1 && factura.pendiente > 0 && (
                              <button 
                                onClick={() => {
                                  setSelectedFactura(factura);
                                  setShowPagoModal(true);
                                }}
                                disabled={loading}
                                className="text-sm text-orange-600 hover:text-orange-800 transition-colors flex items-center gap-1 disabled:opacity-50"
                              >
                                <ShoppingCart className="w-3 h-3" />
                                Pagar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {filteredFacturas.length === 0 && !loading && (
                    <div className="text-center py-12">
                      <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">No hay facturas de compra</h3>
                      <p className="text-gray-500">
                        {facturas.length === 0 
                          ? 'No hay facturas registradas en Dolibarr'
                          : 'No se encontraron facturas que coincidan con la búsqueda'
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'proveedores' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Proveedores</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProveedores.map((proveedor) => (
                    <div key={proveedor.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-semibold text-gray-800">{proveedor.nombre}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          proveedor.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {proveedor.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      
                      {proveedor.codigo && (
                        <p className="text-sm text-gray-600 mb-1">Código: {proveedor.codigo}</p>
                      )}
                      {proveedor.email && (
                        <p className="text-sm text-gray-600 mb-1">Email: {proveedor.email}</p>
                      )}
                      {proveedor.telefono && (
                        <p className="text-sm text-gray-600 mb-1">Teléfono: {proveedor.telefono}</p>
                      )}
                      {proveedor.ciudad && (
                        <p className="text-sm text-gray-600 mb-3">Ciudad: {proveedor.ciudad}</p>
                      )}
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => console.log('Ver proveedor', proveedor.id)}
                          className="text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          Ver
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedProveedor(proveedor);
                            setShowProveedorModal(true);
                          }}
                          className="text-sm text-green-600 hover:text-green-800 transition-colors flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3" />
                          Editar
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {filteredProveedores.length === 0 && !loading && (
                    <div className="col-span-full text-center py-12">
                      <Truck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">No hay proveedores</h3>
                      <p className="text-gray-500">
                        {proveedores.length === 0 
                          ? 'No hay proveedores registrados en Dolibarr'
                          : 'No se encontraron proveedores que coincidan con la búsqueda'
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'recepciones' && (
              <div className="space-y-6">
                <div className="text-center py-12">
                  <Truck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">Actualización Automática de Stock</h3>
                  <p className="text-gray-500 mb-4">
                    ✅ <strong>Implementado:</strong> El stock ahora se actualiza automáticamente al validar facturas de proveedor
                  </p>
                </div>

                {/* Información sobre la funcionalidad implementada */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Actualización Automática de Stock Implementada
                  </h4>
                  <div className="text-green-700 space-y-2 text-sm">
                    <p>
                      <strong>Al validar una factura de proveedor</strong>, el sistema ahora:
                    </p>
                    <div className="mt-4">
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li><strong>Incrementa automáticamente el stock</strong> de todos los productos incluidos en la factura</li>
                        <li><strong>Registra el origen</strong> del movimiento como "supplier_invoice" con el ID de la factura</li>
                        <li><strong>Actualiza el precio promedio ponderado</strong> (AWP) basado en el precio de compra</li>
                        <li><strong>Crea movimientos de stock rastreables</strong> para auditoría completa</li>
                        <li><strong>Usa el almacén predeterminado</strong> o permite configurar el almacén destino</li>
                      </ul>
                    </div>
                    <div className="mt-4 p-3 bg-green-100 rounded">
                      <p className="font-medium">🎯 Flujo optimizado:</p>
                      <p>1. Crear factura → 2. Validar factura → 3. <strong>Stock actualizado automáticamente</strong> → 4. Registrar pago</p>
                    </div>
                    {terminal?.fk_warehouse && (
                      <div className="mt-4 p-3 bg-blue-100 rounded">
                        <p className="font-medium text-blue-800">📦 Almacén de la terminal:</p>
                        <p className="text-blue-700 text-xs mt-1">
                          • Terminal: {terminal.name}<br/>
                          • ID del almacén: {terminal.fk_warehouse}<br/>
                          • Los movimientos de stock se registrarán en este almacén automáticamente
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Información adicional */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Detalles Técnicos de la Implementación
                  </h4>
                  <div className="text-blue-700 space-y-2 text-sm">
                    <p><strong>Campos utilizados en los movimientos de stock:</strong></p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li><code>origin_type</code>: "supplier_invoice" (identifica que proviene de una factura de proveedor)</li>
                      <li><code>origin_id</code>: ID de la factura que generó el movimiento</li>
                      <li><code>movementcode</code>: "SUPP_INV_[ID_FACTURA]" (código único del movimiento)</li>
                      <li><code>qty</code>: Cantidad positiva para incrementar el stock</li>
                      <li><code>price</code>: Precio de compra para actualizar AWP</li>
                    </ul>
                    <div className="mt-4 p-3 bg-blue-100 rounded">
                      <p className="font-medium">🔍 Ventajas de esta implementación:</p>
                      <ul className="list-disc list-inside space-y-1 mt-2">
                        <li>Trazabilidad completa: cada movimiento está vinculado a su factura origen</li>
                        <li>Consistencia contable: el stock refleja exactamente lo facturado</li>
                        <li>Automatización: elimina errores manuales en la gestión de inventario</li>
                        <li>Auditoría: permite rastrear todos los movimientos de stock a sus documentos fuente</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Facturas Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">{comprasStats.facturasPendientes}</p>
              </div>
              <FileText className="w-8 h-8 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Facturas</p>
                <p className="text-2xl font-bold text-green-600">Q.{comprasStats.totalMes.toLocaleString()}</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Proveedores Activos</p>
                <p className="text-2xl font-bold text-blue-600">{comprasStats.proveedoresActivos}</p>
              </div>
              <Truck className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Almacén Terminal</p>
                <p className="text-2xl font-bold text-purple-600">
                  {terminal?.fk_warehouse ? '✓' : '✗'}
                </p>
                <p className="text-xs text-gray-500">
                  {terminal?.fk_warehouse ? `ID: ${terminal.fk_warehouse}` : 'No configurado'}
                </p>
              </div>
              <Package className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Modales */}
      {showFacturaCompra && (
        <FacturaCompra
          isOpen={showFacturaCompra}
          onClose={() => {
            setShowFacturaCompra(false);
            setSelectedFactura(null);
          }}
          facturaData={selectedFactura}
          proveedores={proveedores}
          onSave={createFacturaCompra}
          terminal={terminal}
          variables={variables}
          API_BASE_URL={API_BASE_URL}
          API_KEY={API_KEY}
          getHeaders={getHeaders}
        />
      )}

      {showPagoModal && (
        <PagoModal
          isOpen={showPagoModal}
          onClose={() => {
            setShowPagoModal(false);
            setSelectedFactura(null);
          }}
          factura={selectedFactura}
          onSave={registrarPago}
        />
      )}

      {showProveedorModal && (
        <ProveedorModal
          isOpen={showProveedorModal}
          onClose={() => {
            setShowProveedorModal(false);
            setSelectedProveedor(null);
          }}
          proveedorData={selectedProveedor}
          onSave={createProveedor}
        />
      )}
    </div>
  );
};

// Componente completo de Factura de Compra integrado con Dolibarr
const FacturaCompra = ({ isOpen, onClose, facturaData = null, proveedores, onSave, terminal, variables, API_BASE_URL, API_KEY, getHeaders }) => {
  const [formData, setFormData] = useState({
    proveedor: '',
    fecha: new Date().toISOString().split('T')[0],
    fechaVencimiento: '',
    observaciones: '',
    estado: 'Borrador'
  });
  
  const [productos, setProductos] = useState([]);
  const [lineasFactura, setLineasFactura] = useState([]);
  const [searchProducto, setSearchProducto] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [totales, setTotales] = useState({
    subtotal: 0,
    descuento: 0,
    impuestos: 0,
    total: 0
  });

  // Cargar productos desde Dolibarr
  const fetchProductos = async () => {
    if (!API_BASE_URL || !API_KEY) {
      console.log('API no configurada, no se pueden cargar productos');
      return;
    }

    setLoadingProducts(true);
    try {
      console.log('Cargando productos...');
      
      const response = await fetch(`${API_BASE_URL}/products?sortfield=ref&sortorder=ASC&limit=100`, {
        method: 'GET',
        headers: getHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Productos obtenidos:', data);

        const transformedProducts = data.map(product => ({
          id: product.id,
          codigo: product.ref,
          nombre: product.label,
          precio: parseFloat(product.price || product.price_base || 0),
          unidad: product.unity || 'PZA',
          descripcion: product.description,
          tipo: parseInt(product.type || 0),
          tva_tx: parseFloat(product.tva_tx || 12),
          rawData: product
        }));

        setProductos(transformedProducts);
      } else {
        console.error('Error cargando productos:', response.status, response.statusText);
      }
    } catch (err) {
      console.error('Error cargando productos:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProductos();
    }
    
    if (facturaData) {
      setFormData({
        proveedor: facturaData.proveedorId || '',
        fecha: facturaData.fecha || new Date().toISOString().split('T')[0],
        fechaVencimiento: facturaData.fechaVencimiento || '',
        observaciones: facturaData.observaciones || '',
        estado: facturaData.estado || 'Borrador'
      });
      setLineasFactura(facturaData.lineas || []);
    } else {
      setFormData({
        proveedor: '',
        fecha: new Date().toISOString().split('T')[0],
        fechaVencimiento: '',
        observaciones: '',
        estado: 'Borrador'
      });
      setLineasFactura([]);
    }
  }, [facturaData, isOpen]);

  useEffect(() => {
    calcularTotales();
  }, [lineasFactura]);

  const calcularTotales = () => {
    const subtotal = lineasFactura.reduce((sum, linea) => sum + (linea.cantidad * linea.precio), 0);
    const descuento = lineasFactura.reduce((sum, linea) => sum + (linea.descuento || 0), 0);
    
    const impuestos = lineasFactura.reduce((sum, linea) => {
      const subtotalLinea = (linea.cantidad * linea.precio) - (linea.descuento || 0);
      const tasaIVA = (linea.tva_tx || 12) / 100;
      return sum + (subtotalLinea * tasaIVA);
    }, 0);
    
    const total = subtotal - descuento + impuestos;

    setTotales({
      subtotal,
      descuento,
      impuestos,
      total
    });
  };

  const agregarProducto = (producto) => {
    const lineaExistente = lineasFactura.find(linea => linea.productoId === producto.id);
    
    if (lineaExistente) {
      setLineasFactura(lineasFactura.map(linea => 
        linea.productoId === producto.id 
          ? { ...linea, cantidad: linea.cantidad + 1 }
          : linea
      ));
    } else {
      const nuevaLinea = {
        id: Date.now(),
        productoId: producto.id,
        codigo: producto.codigo,
        nombre: producto.nombre,
        cantidad: 1,
        precio: producto.precio,
        descuento: 0,
        subtotal: producto.precio,
        unidad: producto.unidad,
        tipo: producto.tipo || 0,
        tva_tx: producto.tva_tx || 12
      };
      setLineasFactura([...lineasFactura, nuevaLinea]);
    }
    
    setSearchProducto('');
    setShowProductSearch(false);
  };

  const actualizarLinea = (lineaId, campo, valor) => {
    setLineasFactura(lineasFactura.map(linea => {
      if (linea.id === lineaId) {
        const lineaActualizada = { ...linea, [campo]: valor };
        lineaActualizada.subtotal = (lineaActualizada.cantidad * lineaActualizada.precio) - (lineaActualizada.descuento || 0);
        return lineaActualizada;
      }
      return linea;
    }));
  };

  const eliminarLinea = (lineaId) => {
    setLineasFactura(lineasFactura.filter(linea => linea.id !== lineaId));
  };

  const guardarFactura = async () => {
    if (!formData.proveedor || lineasFactura.length === 0) {
      alert('Debe seleccionar un proveedor y agregar al menos un producto');
      return;
    }

    const lineasInvalidas = lineasFactura.filter(linea => 
      !linea.cantidad || linea.cantidad <= 0 || !linea.precio || linea.precio <= 0
    );

    if (lineasInvalidas.length > 0) {
      alert('Todas las líneas deben tener cantidad y precio válidos (mayor a 0)');
      return;
    }

    setLoading(true);
    try {
      const lineasDolibarr = lineasFactura.map((linea, index) => {
        const lineaDolibarr = {
          fk_product: parseInt(linea.productoId),
          desc: linea.nombre,
          qty: parseFloat(linea.cantidad),
          subprice: parseFloat(linea.precio),
          total_ht: parseFloat(linea.subtotal.toFixed(2)),
          tva_tx: parseFloat(linea.tva_tx || 12),
          total_tva: parseFloat((linea.subtotal * (linea.tva_tx || 12) / 100).toFixed(2)),
          total_ttc: parseFloat((linea.subtotal * (1 + (linea.tva_tx || 12) / 100)).toFixed(2)),
          product_type: parseInt(linea.tipo || 0),
          rang: index + 1
        };

        if (linea.descuento > 0) {
          lineaDolibarr.remise_percent = parseFloat(((linea.descuento / (linea.cantidad * linea.precio)) * 100).toFixed(2));
        }

        return lineaDolibarr;
      });

      const facturaCompleta = {
        socid: parseInt(formData.proveedor),
        type: 1,
        date: Math.floor(new Date(formData.fecha).getTime() / 1000),
        duedate: formData.fechaVencimiento ? Math.floor(new Date(formData.fechaVencimiento).getTime() / 1000) : null,
        note_private: formData.observaciones || '',
        lines: lineasDolibarr
      };

      console.log('Guardando factura en Dolibarr:', facturaCompleta);
      
      await onSave(facturaCompleta);
      
      onClose();
      
    } catch (error) {
      console.error('Error guardando factura:', error);
    } finally {
      setLoading(false);
    }
  };

  const productosFiltrados = productos.filter(producto =>
    producto.nombre.toLowerCase().includes(searchProducto.toLowerCase()) ||
    producto.codigo.toLowerCase().includes(searchProducto.toLowerCase())
  );

  const proveedorSeleccionado = proveedores.find(p => p.id == formData.proveedor);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-green-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {facturaData ? 'Editar Factura de Compra' : 'Nueva Factura de Compra'}
              </h2>
              <p className="text-sm text-gray-600">Terminal: {terminal?.name || 'N/A'}</p>
              {proveedorSeleccionado && (
                <p className="text-sm text-green-600">Proveedor: {proveedorSeleccionado.nombre}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Estado de conexión */}
          {!API_BASE_URL || !API_KEY ? (
            <div className="mb-6 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg">
              <AlertTriangle className="w-5 h-5 inline mr-2" />
              API de Dolibarr no configurada. Verifique la configuración en variables de entorno.
            </div>
          ) : null}

          {/* Información General */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Proveedor *
              </label>
              <select
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                value={formData.proveedor}
                onChange={(e) => setFormData({...formData, proveedor: e.target.value})}
                disabled={loading}
              >
                <option value="">Seleccionar proveedor</option>
                {proveedores.map(proveedor => (
                  <option key={proveedor.id} value={proveedor.id}>
                    {proveedor.nombre} {proveedor.codigo && `(${proveedor.codigo})`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Fecha de Factura
              </label>
              <input
                type="date"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                value={formData.fecha}
                onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Fecha de Vencimiento
              </label>
              <input
                type="date"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                value={formData.fechaVencimiento}
                onChange={(e) => setFormData({...formData, fechaVencimiento: e.target.value})}
                disabled={loading}
              />
            </div>
          </div>

          {/* Búsqueda de Productos */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agregar Productos
              {loadingProducts && <span className="text-blue-500 ml-2">(Cargando productos...)</span>}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar productos por nombre o código..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                value={searchProducto}
                onChange={(e) => {
                  setSearchProducto(e.target.value);
                  setShowProductSearch(e.target.value.length > 0);
                }}
                onFocus={() => setShowProductSearch(searchProducto.length > 0)}
                disabled={loading || loadingProducts}
              />

              {/* Dropdown de productos */}
              {showProductSearch && productosFiltrados.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {productosFiltrados.map(producto => (
                    <button
                      key={producto.id}
                      className="w-full p-3 text-left hover:bg-gray-50 flex justify-between items-center"
                      onClick={() => agregarProducto(producto)}
                    >
                      <div>
                        <p className="font-medium">{producto.nombre}</p>
                        <p className="text-sm text-gray-600">Código: {producto.codigo} | Unidad: {producto.unidad}</p>
                        <p className="text-xs text-blue-600">IVA: {producto.tva_tx || 12}% | {producto.tipo === 1 ? 'Servicio' : 'Producto'}</p>
                      </div>
                      <span className="text-green-600 font-semibold">Q.{producto.precio.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Mensaje cuando no hay productos */}
              {showProductSearch && searchProducto.length > 0 && productosFiltrados.length === 0 && !loadingProducts && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-10 p-4 text-center text-gray-500">
                  No se encontraron productos
                </div>
              )}
            </div>
          </div>

          {/* Tabla de Productos */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Productos en la Factura ({lineasFactura.length})
            </h3>
            {lineasFactura.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 font-semibold text-gray-700">Producto</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Cantidad</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Precio Unitario</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Descuento</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Subtotal</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineasFactura.map(linea => (
                      <tr key={linea.id} className="border-t border-gray-200">
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{linea.nombre}</p>
                            <p className="text-sm text-gray-600">{linea.codigo} | {linea.unidad}</p>
                            <p className="text-xs text-blue-600">IVA: {linea.tva_tx || 12}%</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min="1"
                            className="w-20 p-2 border border-gray-300 rounded text-center"
                            value={linea.cantidad}
                            onChange={(e) => actualizarLinea(linea.id, 'cantidad', parseInt(e.target.value) || 1)}
                            disabled={loading}
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            step="0.01"
                            className="w-24 p-2 border border-gray-300 rounded"
                            value={linea.precio}
                            onChange={(e) => actualizarLinea(linea.id, 'precio', parseFloat(e.target.value) || 0)}
                            disabled={loading}
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            step="0.01"
                            className="w-20 p-2 border border-gray-300 rounded"
                            value={linea.descuento}
                            onChange={(e) => actualizarLinea(linea.id, 'descuento', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            disabled={loading}
                          />
                        </td>
                        <td className="p-3 font-semibold">
                          Q.{linea.subtotal.toFixed(2)}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => eliminarLinea(linea.id)}
                            className="text-red-600 hover:text-red-800 disabled:opacity-50"
                            disabled={loading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No hay productos en la factura</p>
                <p className="text-sm text-gray-500">Busque y agregue productos usando el campo de búsqueda</p>
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Observaciones
            </label>
            <textarea
              rows="3"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Observaciones adicionales, condiciones de pago, referencias de la factura..."
              value={formData.observaciones}
              onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
              disabled={loading}
            />
          </div>

          {/* Totales */}
          {lineasFactura.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Resumen de Totales</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Subtotal</p>
                  <p className="text-lg font-bold text-gray-800">Q.{totales.subtotal.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Descuento</p>
                  <p className="text-lg font-bold text-orange-600">-Q.{totales.descuento.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">IVA (Variable)</p>
                  <p className="text-lg font-bold text-blue-600">Q.{totales.impuestos.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-xl font-bold text-green-600">Q.{totales.total.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              onClick={guardarFactura}
              disabled={loading || lineasFactura.length === 0 || !formData.proveedor}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {facturaData ? 'Actualizar' : 'Guardar'} Factura
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Modal para registrar pagos de facturas
const PagoModal = ({ isOpen, onClose, factura, onSave }) => {
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    monto: 0,
    tipoPago: 2,
    cuentaBanco: 1,
    referencia: '',
    observaciones: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (factura) {
      setFormData({
        fecha: new Date().toISOString().split('T')[0],
        monto: factura.pendiente || factura.total,
        tipoPago: 2,
        cuentaBanco: 1,
        referencia: `PAGO-${factura.ref}-${Date.now()}`,
        observaciones: `Pago de factura ${factura.ref} - ${factura.proveedor}`
      });
    }
  }, [factura]);

  const handleSave = async () => {
    if (!formData.monto || formData.monto <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }

    if (formData.monto > (factura.pendiente || factura.total)) {
      alert('El monto no puede ser mayor al pendiente de pago');
      return;
    }

    setLoading(true);
    try {
      await onSave(factura.id, formData);
      onClose();
    } catch (error) {
      console.error('Error guardando pago:', error);
    }
    setLoading(false);
  };

  const tiposPago = [
    { id: 1, nombre: 'Efectivo' },
    { id: 2, nombre: 'Transferencia Bancaria' },
    { id: 3, nombre: 'Cheque' },
    { id: 4, nombre: 'Tarjeta de Crédito' },
    { id: 5, nombre: 'Tarjeta de Débito' }
  ];

  if (!isOpen || !factura) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">
              Registrar Pago
            </h2>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600 text-2xl"
              disabled={loading}
            >
              ✕
            </button>
          </div>

          {/* Información de la factura */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">Información de la Factura</h3>
            <div className="text-sm space-y-1">
              <p><span className="font-medium">Factura:</span> {factura.ref}</p>
              <p><span className="font-medium">Proveedor:</span> {factura.proveedor}</p>
              <p><span className="font-medium">Total:</span> Q.{factura.total.toFixed(2)}</p>
              <p><span className="font-medium">Pagado:</span> Q.{factura.pagado.toFixed(2)}</p>
              <p><span className="font-medium">Pendiente:</span> Q.{factura.pendiente.toFixed(2)}</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Fecha del pago */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha del Pago *
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.fecha}
                onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                disabled={loading}
              />
            </div>

            {/* Monto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto del Pago * (Q.)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={factura.pendiente || factura.total}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.monto}
                onChange={(e) => setFormData({...formData, monto: parseFloat(e.target.value) || 0})}
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Máximo: Q.{(factura.pendiente || factura.total).toFixed(2)}
              </p>
            </div>

            {/* Tipo de pago */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Método de Pago
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.tipoPago}
                onChange={(e) => setFormData({...formData, tipoPago: parseInt(e.target.value)})}
                disabled={loading}
              >
                {tiposPago.map(tipo => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Referencia */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Referencia de Pago
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.referencia}
                onChange={(e) => setFormData({...formData, referencia: e.target.value})}
                placeholder="Número de cheque, transferencia, etc."
                disabled={loading}
              />
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones
              </label>
              <textarea
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.observaciones}
                onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                placeholder="Notas adicionales sobre el pago..."
                disabled={loading}
              />
            </div>
          </div>

          {/* Información adicional */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> Este pago se registrará contra la factura. 
              Si el monto cubre el total pendiente, la factura se marcará como pagada.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !formData.monto || formData.monto <= 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {loading ? 'Procesando...' : 'Registrar Pago'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Modal mejorado para Proveedor con validación completa
const ProveedorModal = ({ isOpen, onClose, proveedorData, onSave }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    email: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    pais: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [codeValidation, setCodeValidation] = useState({ isValid: true, message: '' });

  useEffect(() => {
    if (proveedorData) {
      setFormData({
        nombre: proveedorData.nombre || '',
        codigo: proveedorData.codigo || '',
        email: proveedorData.email || '',
        telefono: proveedorData.telefono || '',
        direccion: proveedorData.direccion || '',
        ciudad: proveedorData.ciudad || '',
        pais: proveedorData.pais || ''
      });
    } else {
      setFormData({
        nombre: '',
        codigo: '',
        email: '',
        telefono: '',
        direccion: '',
        ciudad: '',
        pais: ''
      });
    }
    setErrors({});
    setCodeValidation({ isValid: true, message: '' });
  }, [proveedorData, isOpen]);

  // Validar código en tiempo real
  const validateCode = (code) => {
    if (!code || code.trim() === '') {
      setCodeValidation({ 
        isValid: true, 
        message: 'El código es opcional. Se puede generar automáticamente.' 
      });
      return;
    }

    const cleanCode = code.trim();
    
    if (!/^[a-zA-Z0-9\-_]+$/.test(cleanCode)) {
      setCodeValidation({ 
        isValid: false, 
        message: 'Solo se permiten letras, números, guiones y guiones bajos.' 
      });
      return;
    }

    if (cleanCode.length > 18) {
      setCodeValidation({ 
        isValid: false, 
        message: 'El código no puede tener más de 18 caracteres.' 
      });
      return;
    }

    setCodeValidation({ 
      isValid: true, 
      message: '✓ Código válido' 
    });
  };

  // Generar código automático basado en el nombre
  const generateAutoCode = () => {
    if (!formData.nombre.trim()) {
      alert('Ingrese primero el nombre del proveedor');
      return;
    }

    const prefix = formData.nombre.trim().substring(0, 6).toUpperCase().replace(/[^A-Z]/g, '');
    const timestamp = Date.now().toString().slice(-6);
    const autoCode = `${prefix}${timestamp}`;
    
    setFormData({ ...formData, codigo: autoCode });
    validateCode(autoCode);
  };

  // Validar email
  const validateEmail = (email) => {
    if (!email) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validar formulario
  const validateForm = () => {
    const newErrors = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio';
    }

    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = 'Ingrese un email válido';
    }

    if (formData.codigo && !codeValidation.isValid) {
      newErrors.codigo = 'El código tiene un formato inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error guardando proveedor:', error);
    }
    setLoading(false);
  };

  const handleCodeChange = (e) => {
    const newCode = e.target.value;
    setFormData({ ...formData, codigo: newCode });
    validateCode(newCode);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">
              {proveedorData ? 'Editar Proveedor' : 'Nuevo Proveedor'}
            </h2>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600 text-2xl"
              disabled={loading}
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.nombre ? 'border-red-500' : 'border-gray-300'
                }`}
                value={formData.nombre}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                placeholder="Nombre del proveedor"
                disabled={loading}
              />
              {errors.nombre && (
                <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>
              )}
            </div>

            {/* Código */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código de Proveedor
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.codigo ? 'border-red-500' : 
                    !codeValidation.isValid ? 'border-yellow-500' :
                    'border-gray-300'
                  }`}
                  value={formData.codigo}
                  onChange={handleCodeChange}
                  placeholder="Opcional - Se puede generar automáticamente"
                  disabled={loading}
                  maxLength={18}
                />
                <button
                  type="button"
                  onClick={generateAutoCode}
                  className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm whitespace-nowrap"
                  disabled={loading || !formData.nombre.trim()}
                >
                  Auto
                </button>
              </div>
              {codeValidation.message && (
                <p className={`text-xs mt-1 ${
                  codeValidation.isValid ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {codeValidation.message}
                </p>
              )}
              {errors.codigo && (
                <p className="text-red-500 text-xs mt-1">{errors.codigo}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="email@ejemplo.com"
                disabled={loading}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono
              </label>
              <input
                type="tel"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.telefono}
                onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                placeholder="Número de teléfono"
                disabled={loading}
              />
            </div>

            {/* Dirección */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dirección
              </label>
              <textarea
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.direccion}
                onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                placeholder="Dirección completa"
                disabled={loading}
              />
            </div>

            {/* Ciudad y País */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ciudad
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.ciudad}
                  onChange={(e) => setFormData({...formData, ciudad: e.target.value})}
                  placeholder="Ciudad"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  País
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.pais}
                  onChange={(e) => setFormData({...formData, pais: e.target.value})}
                  placeholder="País"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Información adicional */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> El código del proveedor es opcional. Si no se proporciona, 
              se puede generar automáticamente o dejarlo para que Dolibarr lo asigne.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !formData.nombre.trim() || !codeValidation.isValid}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {loading ? 'Guardando...' : (proveedorData ? 'Actualizar' : 'Crear') + ' Proveedor'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Compras;