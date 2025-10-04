import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Terminal, User, Building2, ShoppingCart, Package, Users, BarChart3, Plus, Search, Clock, TrendingUp } from 'lucide-react';
import Pos from './Pos';
import Compras from './compras/Compras';
import Productos from './productos/Productos';
import Inventario from './inventario/Inventario';
import Navigation from './Navigation';
// import TerminalDebugHelper from './TerminalDebugHelper'; // Descomenta si tienes el componente

const Dashboard = () => {
  const { user, company, variables, userId, pwd, isInitialized, API_URL } = useContext(AuthContext);
  const [terminals, setTerminals] = useState([]);
  const [selectedTerminal, setSelectedTerminal] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialBalance, setInitialBalance] = useState(0);
  const [cashAccount, setCashAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeModule, setActiveModule] = useState('hub');
  const [quickStats, setQuickStats] = useState({
    ventasHoy: 0,
    productosStock: 0,
    proveedores: 0,
    alertasStock: 0
  });

  // Referencias para evitar llamadas duplicadas
  const terminalsLoaded = useRef(false);
  const abortControllerRef = useRef(null);

  const profileImage = `${variables.SPOS_URL}/documents/mycompany/logos/thumbs/${variables.MAIN_INFO_SOCIETE_LOGO_SQUARRED_MINI}`;

  // Función optimizada para cargar terminales
  const fetchTerminals = useCallback(async () => {
    // Verificar que el AuthContext esté completamente inicializado
    if (!isInitialized) {
      console.log('AuthContext not initialized yet, waiting...');
      setIsLoading(false);
      return;
    }

    // Verificar que tenemos las credenciales necesarias
    if (!user || !pwd || !API_URL) {
      console.log('Missing credentials or API URL, skipping fetch');
      setIsLoading(false);
      return;
    }

    // Evitar llamadas duplicadas
    if (terminalsLoaded.current) {
      console.log('Terminals already loaded, skipping duplicate call');
      return;
    }

    // Cancelar petición anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Crear nuevo controlador de abort
    abortControllerRef.current = new AbortController();
    
    setIsLoading(true);
    console.log('Fetching terminals for user:', user, 'URL:', `${API_URL}/login.php`);

    try {
      // Construir URL con parámetros
      const url = new URL(`${API_URL}/login.php`);
      url.searchParams.append('login', user);
      url.searchParams.append('password', pwd);

      console.log('Final URL:', url.toString());

      const response = await fetch(url.toString(), {
        method: 'GET',
        signal: abortControllerRef.current.signal,
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'success') {
        setTerminals(data.terminals);
        terminalsLoaded.current = true; // Marcar como cargado
        console.log('Terminals loaded successfully:', data.terminals.length);
        
        // Cargar estadísticas solo después de obtener terminales exitosamente
        await loadQuickStats();
      } else {
        console.error("Error fetching terminals:", data.message);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Fetch was aborted');
      } else {
        console.error("Error during fetch:", error);
        console.error("URL being called:", `${API_URL}/login.php`);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [user, pwd, API_URL, isInitialized]); // Incluir isInitialized en dependencias

  const loadQuickStats = useCallback(async () => {
    try {
      console.log('Loading quick stats...');
      // Simular carga de estadísticas - aquí irían las llamadas reales a tu API
      const stats = {
        ventasHoy: 15,
        productosStock: 342,
        proveedores: 28,
        alertasStock: 5
      };
      setQuickStats(stats);
    } catch (error) {
      console.error('Error loading quick stats:', error);
    }
  }, []);

  // Effect optimizado con cleanup
  useEffect(() => {
    console.log('Dashboard useEffect triggered', { 
      user: !!user, 
      pwd: !!pwd, 
      API_URL: !!API_URL,
      isInitialized,
      terminalsLoaded: terminalsLoaded.current 
    });
    
    // Solo ejecutar si AuthContext está inicializado y tenemos credenciales
    if (isInitialized && user && pwd && API_URL && !terminalsLoaded.current) {
      // Pequeño delay para evitar calls múltiples en StrictMode
      const timeoutId = setTimeout(() => {
        if (!terminalsLoaded.current) { // Verificar de nuevo después del timeout
          fetchTerminals();
        }
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
    }

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isInitialized, user, pwd, API_URL, fetchTerminals]); // Incluir isInitialized

  // Resetear terminales cuando cambie el usuario
  useEffect(() => {
    if (user !== null) { // Solo cuando user tenga un valor (no undefined)
      console.log('User changed, resetting terminals');
      terminalsLoaded.current = false;
      setTerminals([]);
      setSelectedTerminal(null);
    }
  }, [user, pwd]); // También resetear si cambia la contraseña

  const handleTerminalChange = (e) => {
    const terminalId = e.target.value;
    
    console.log('=== Terminal Selection Debug ===');
    console.log('Selected terminal ID:', terminalId, 'Type:', typeof terminalId);
    console.log('Available terminals:', terminals.map(t => ({ rowid: t.rowid, type: typeof t.rowid, name: t.name })));
    
    // Buscar terminal con comparación más robusta
    const terminal = terminals.find(t => {
      const tRowid = String(t.rowid).trim();
      const selectedId = String(terminalId).trim();
      console.log('Comparing:', tRowid, '===', selectedId, '→', tRowid === selectedId);
      return tRowid === selectedId;
    });
    
    console.log('Found terminal:', terminal);
    
    if (terminal) {
      console.log('Terminal details:', {
        name: terminal.name,
        rowid: terminal.rowid,
        is_closed: terminal.is_closed,
        payment_methods: terminal.payment_methods
      });
      
      setSelectedTerminal(terminal);

      // Verificar si la terminal está cerrada (más permisivo)
      const isClosed = terminal.is_closed === "1" || 
                       terminal.is_closed === 1 || 
                       terminal.is_closed === true ||
                       String(terminal.is_closed).toLowerCase() === 'true';
      
      console.log('Is terminal closed?', isClosed, '(raw value:', terminal.is_closed, ')');
      
      if (isClosed) {
        console.log('Terminal is closed, opening modal for initial balance');
        setIsModalOpen(true);
        
        // Buscar método de pago de efectivo
        if (terminal.payment_methods && terminal.payment_methods.length > 0) {
          console.log('Available payment methods:', terminal.payment_methods);
          
          const efectivoAccount = terminal.payment_methods.find(
            method => method.label?.toUpperCase().includes("EFECTIVO") || 
                     method.label?.toUpperCase().includes("CASH") ||
                     method.type?.toUpperCase().includes("CASH") ||
                     method.name?.toUpperCase().includes("EFECTIVO")
          );
          
          console.log('Found cash account:', efectivoAccount);
          setCashAccount(efectivoAccount || null);
        } else {
          console.log('No payment methods found for terminal');
          setCashAccount(null);
        }
      } else {
        console.log('Terminal is open, ready to use');
        setIsModalOpen(false);
        // La terminal está abierta, listo para usar
      }
    } else {
      console.log('Terminal not found in terminals array');
      console.log('Searched for ID:', terminalId, 'in:', terminals.map(t => t.rowid));
      setSelectedTerminal(null);
    }
    
    console.log('=== End Terminal Selection Debug ===');
  };

  const handleInitialBalanceSubmit = async () => {
    try {
      console.log('Submitting initial balance:', {
        terminalId: selectedTerminal.rowid,
        cashAccountId: cashAccount?.fk_bank || cashAccount?.id || '',
        initialBalance,
        user: userId
      });

      const response = await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=postSaldo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          terminalId: selectedTerminal.rowid,
          cashAccountId: cashAccount?.fk_bank || cashAccount?.id || '',
          initialBalance,
          user: userId
        }),
      });
      
      const data = await response.json();
      console.log('Initial balance response:', data);
      
      if (data.success) {
        console.log("Initial balance updated successfully");
        setIsModalOpen(false);
        // Actualizar el estado de la terminal para marcarla como abierta
        setSelectedTerminal(prev => ({
          ...prev,
          is_closed: "0"
        }));
      } else {
        console.error("Error updating balance:", data.message);
        alert(`Error al actualizar el saldo: ${data.message}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert(`Error de conexión: ${error.message}`);
    }
  };

  const handleModalCancel = () => {
    console.log('Modal cancelled, resetting terminal selection');
    setIsModalOpen(false);
    setSelectedTerminal(null);
    setInitialBalance(0);
    setCashAccount(null);
  };

  const handleModuleClick = (module) => {
    setActiveModule(module);
  };

  // Resto del código permanece igual...
  const modules = [
    {
      id: 'ventas',
      title: 'Punto de Venta',
      icon: ShoppingCart,
      description: 'Ventas, cotizaciones y facturación',
      color: 'bg-blue-500 hover:bg-blue-600',
      stats: `${quickStats.ventasHoy} ventas hoy`
    },
    {
      id: 'compras',
      title: 'Compras',
      icon: Package,
      description: 'Órdenes de compra y recepción',
      color: 'bg-green-500 hover:bg-green-600',
      stats: 'Gestión de proveedores'
    },
    {
      id: 'productos',
      title: 'Productos',
      icon: Users,
      description: 'Catálogo y gestión de productos',
      color: 'bg-purple-500 hover:bg-purple-600',
      stats: `${quickStats.productosStock} productos`
    },
    {
      id: 'inventario',
      title: 'Inventario',
      icon: BarChart3,
      description: 'Stock, movimientos y reportes',
      color: 'bg-orange-500 hover:bg-orange-600',
      stats: `${quickStats.alertasStock} alertas de stock`
    }
  ];

  const quickActions = [
    {
      title: 'Ir a Ventas',
      icon: ShoppingCart,
      action: () => handleModuleClick('ventas'),
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      title: 'Consultar Stock',
      icon: Search,
      action: () => handleModuleClick('inventario'),
      color: 'bg-orange-500 hover:bg-orange-600'
    },
    {
      title: 'Gestionar Productos',
      icon: Package,
      action: () => handleModuleClick('productos'),
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      title: 'Ver Compras',
      icon: Clock,
      action: () => handleModuleClick('compras'),
      color: 'bg-green-500 hover:bg-green-600'
    }
  ];

  // Renderizar módulos específicos
  if (activeModule === 'ventas' && selectedTerminal && !isModalOpen) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation 
          activeModule="ventas" 
          onModuleChange={handleModuleClick}
          terminal={selectedTerminal}
          user={user}
        />
        <Pos terminal={selectedTerminal} />
      </div>
    );
  }

  if (activeModule === 'compras' && selectedTerminal) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation 
          activeModule="compras" 
          onModuleChange={handleModuleClick}
          terminal={selectedTerminal}
          user={user}
        />
        <Compras terminal={selectedTerminal} />
      </div>
    );
  }

  if (activeModule === 'productos' && selectedTerminal) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation 
          activeModule="productos" 
          onModuleChange={handleModuleClick}
          terminal={selectedTerminal}
          user={user}
        />
        <Productos terminal={selectedTerminal} />
      </div>
    );
  }

  if (activeModule === 'inventario' && selectedTerminal) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation 
          activeModule="inventario" 
          onModuleChange={handleModuleClick}
          terminal={selectedTerminal}
          user={user}
        />
        <Inventario terminal={selectedTerminal} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <img
                  src={profileImage}
                  alt="Company Logo"
                  className="w-16 h-16 object-contain rounded-lg"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/placeholder-logo.png';
                  }}
                />
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">SIEL POS</h1>
                  <p className="text-gray-600">Hub de Gestión Empresarial</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-gray-600">Bienvenido</p>
                  <p className="font-semibold text-gray-800">{user}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* User Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-blue-50 rounded-lg p-4 flex items-center space-x-3">
                <User className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Usuario</p>
                  <p className="font-semibold text-gray-800">{user}</p>
                </div>
              </div>
              
              <div className="bg-indigo-50 rounded-lg p-4 flex items-center space-x-3">
                <Building2 className="w-6 h-6 text-indigo-600" />
                <div>
                  <p className="text-sm text-gray-600">Empresa</p>
                  <p className="font-semibold text-gray-800">{variables.MAIN_INFO_SOCIETE_NOM}</p>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4 flex items-center space-x-3">
                <Terminal className="w-6 h-6 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Terminal</p>
                  <p className="font-semibold text-gray-800">
                    {selectedTerminal ? selectedTerminal.name : 'Sin seleccionar'}
                  </p>
                </div>
              </div>
            </div>

            {/* Terminal Selection */}
            <div className="bg-gray-50 rounded-lg p-6">
              <label className="block text-gray-700 font-semibold mb-3">
                Seleccione una terminal:
              </label>
              <select
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                onChange={handleTerminalChange}
                value={selectedTerminal?.rowid || ""}
                disabled={isLoading}
              >
                <option disabled value="">
                  {isLoading ? "Cargando terminales..." : "Seleccione una terminal"}
                </option>
                {terminals.map((terminal) => (
                  <option key={terminal.rowid} value={terminal.rowid}>
                    {terminal.name} - {terminal.is_closed === "1" || terminal.is_closed === 1 ? "🔒 Cerrada" : "🟢 Abierta"}
                  </option>
                ))}
              </select>
              
              {/* Estado de la terminal seleccionada */}
              {selectedTerminal && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2">Estado de la Terminal</h4>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="font-medium">Nombre:</span> {selectedTerminal.name}
                    </p>
                    <p>
                      <span className="font-medium">Estado:</span> 
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${
                        selectedTerminal.is_closed === "1" || selectedTerminal.is_closed === 1
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {selectedTerminal.is_closed === "1" || selectedTerminal.is_closed === 1 ? 'Cerrada' : 'Abierta'}
                      </span>
                    </p>
                    <p>
                      <span className="font-medium">Métodos de pago:</span> {selectedTerminal.payment_methods?.length || 0}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Debug Info - Remover en producción 
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
              <strong>Debug Info:</strong> 
              User: {user ? '✓' : '✗'} | 
              Password: {pwd ? '✓' : '✗'} | 
              API_URL: {API_URL || 'undefined'} | 
              AuthContext Initialized: {isInitialized ? '✓' : '✗'} | 
              Terminals Loaded: {terminalsLoaded.current ? '✓' : '✗'} | 
              Terminals Count: {terminals.length}
              <br />
              <small>Full API URL: {API_URL ? `${API_URL}/login.php` : 'Not set'}</small>
              {selectedTerminal && (
                <>
                  <br />
                  <strong>Selected Terminal:</strong> {selectedTerminal.name} | 
                  ID: {selectedTerminal.rowid} | 
                  Is Closed: {selectedTerminal.is_closed} | 
                  Modal Open: {isModalOpen ? '✓' : '✗'} | 
                  Payment Methods: {selectedTerminal.payment_methods?.length || 0}
                </>
              )}
            </div>
          )}   */}

          {/* Terminal Debug Helper - Solo en desarrollo */}
          {process.env.NODE_ENV === 'development' && terminals.length === 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
              <details>
                <summary className="cursor-pointer font-semibold text-purple-800 flex items-center">
                  <Terminal className="w-5 h-5 mr-2" />
                  Terminal Debug Helper ({terminals.length} terminales)
                </summary>
                
                <div className="mt-4 space-y-4">
                  {/* Estado general */}
                  <div className="bg-white p-3 rounded border">
                    <h4 className="font-semibold text-gray-800 mb-2">Estado General</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="font-medium">Terminales cargadas:</span> {terminals.length}</div>
                      <div><span className="font-medium">Terminal seleccionada:</span> {selectedTerminal ? '✓' : '✗'}</div>
                      <div><span className="font-medium">Modal abierto:</span> {isModalOpen ? '✓' : '✗'}</div>
                      <div><span className="font-medium">Terminales cerradas:</span> {
                        terminals.filter(t => t.is_closed === "1" || t.is_closed === 1).length
                      }</div>
                    </div>
                  </div>

                  {/* Lista de terminales */}
                  <div className="bg-white p-3 rounded border">
                    <h4 className="font-semibold text-gray-800 mb-2">Análisis de Terminales</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {terminals.map((terminal, index) => (
                        <div 
                          key={terminal.rowid || index}
                          className={`p-2 rounded border text-sm ${
                            selectedTerminal?.rowid === terminal.rowid ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-500' : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{terminal.name || `Terminal ${index + 1}`}</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              terminal.is_closed === "1" || terminal.is_closed === 1
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {terminal.is_closed === "1" || terminal.is_closed === 1 ? 'Cerrada' : 'Abierta'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            ID: {terminal.rowid} | is_closed: {String(terminal.is_closed)} | 
                            Métodos: {terminal.payment_methods?.length || 0}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Terminal seleccionada en detalle */}
                  {selectedTerminal && (
                    <div className="bg-white p-3 rounded border">
                      <h4 className="font-semibold text-gray-800 mb-2">Terminal Seleccionada - JSON</h4>
                      <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto max-h-32">
                        {JSON.stringify(selectedTerminal, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            </div>
          )}

          {/* Solo mostrar módulos y opciones después de seleccionar terminal */}
          {selectedTerminal && !isModalOpen && (
            <>
              {/* Confirmación de terminal seleccionada */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <div>
                    <h3 className="font-semibold text-green-800">
                      Terminal Activa: {selectedTerminal.name}
                    </h3>
                    <p className="text-sm text-green-600">
                      Estado: {selectedTerminal.is_closed === "1" || selectedTerminal.is_closed === 1 ? 'Cerrada' : 'Abierta'} | 
                      ID: {selectedTerminal.rowid} | 
                      Métodos de pago: {selectedTerminal.payment_methods?.length || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Main Modules Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {modules.map((module) => (
                  <div
                    key={module.id}
                    onClick={() => handleModuleClick(module.id)}
                    className={`${module.color} text-white rounded-xl p-6 cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-xl`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <module.icon className="w-8 h-8" />
                      <div className="bg-white bg-opacity-20 rounded-full p-2">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold mb-2">{module.title}</h3>
                    <p className="text-sm opacity-90 mb-3">{module.description}</p>
                    <p className="text-xs font-medium bg-white bg-opacity-20 rounded-full px-3 py-1 inline-block">
                      {module.stats}
                    </p>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Accesos Rápidos</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={action.action}
                      className={`${action.color} text-white rounded-lg p-4 flex flex-col items-center space-y-2 transition-all duration-200 hover:scale-105`}
                    >
                      <action.icon className="w-6 h-6" />
                      <span className="text-sm font-medium text-center">{action.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4 shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Ventas Hoy</p>
                      <p className="text-2xl font-bold text-blue-600">{quickStats.ventasHoy}</p>
                    </div>
                    <ShoppingCart className="w-8 h-8 text-blue-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Productos</p>
                      <p className="text-2xl font-bold text-purple-600">{quickStats.productosStock}</p>
                    </div>
                    <Package className="w-8 h-8 text-purple-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Proveedores</p>
                      <p className="text-2xl font-bold text-green-600">{quickStats.proveedores}</p>
                    </div>
                    <Users className="w-8 h-8 text-green-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Alertas Stock</p>
                      <p className="text-2xl font-bold text-orange-600">{quickStats.alertasStock}</p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-orange-600" />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Mensaje cuando no hay terminal seleccionada */}
          {!selectedTerminal && !isLoading && (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <Terminal className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">Selecciona una Terminal</h3>
              <p className="text-gray-500">
                Para acceder a los módulos del sistema, primero debes seleccionar una terminal de trabajo.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal for Initial Balance */}
      {isModalOpen && selectedTerminal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Saldo inicial para {selectedTerminal?.name}
            </h2>
            
            {/* Información de la terminal */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Terminal:</strong> {selectedTerminal.name}
              </p>
              <p className="text-sm text-gray-600">
                <strong>ID:</strong> {selectedTerminal.rowid}
              </p>
              {cashAccount && (
                <p className="text-sm text-gray-600">
                  <strong>Cuenta:</strong> {cashAccount.label || 'Efectivo'}
                </p>
              )}
              {!cashAccount && (
                <p className="text-sm text-orange-600">
                  ⚠️ No se encontró cuenta de efectivo configurada
                </p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ingrese el saldo inicial
              </label>
              <input
                type="number"
                value={initialBalance}
                onChange={(e) => setInitialBalance(Number(e.target.value))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleInitialBalanceSubmit}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Guardar y Abrir Caja
              </button>
              <button
                onClick={handleModalCancel}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>

            {/* Opción para saltar el saldo inicial */}
            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  console.log('Skipping initial balance');
                  setIsModalOpen(false);
                  setSelectedTerminal(prev => ({ ...prev, is_closed: "0" }));
                }}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Saltar saldo inicial (solo para testing)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;