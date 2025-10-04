import React, { useMemo, useState } from 'react';

const SalesHistoryModal = ({
  isOpen,
  onClose,
  salesData,
  activeTab,
  setActiveTab,
  searchTerm,
  setSearchTerm,
  handleViewDetails, // 🔥 NUEVA: Ver detalles sin editar
  handleInvoiceCotizacion, // 🔥 NUEVA: Facturar cotización
  handlePrintTicket,
  vendors
}) => {
  const [selectedDate, setSelectedDate] = useState(null);

  // Función para formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'Sin fecha';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    }
    
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    }
    
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  // Obtener fecha del item
  const getItemDate = (item) => {
    return item.date_creation || item.date || item.datep || item.datef || item.date_commande;
  };

  // Obtener solo la fecha (sin hora) para agrupación
  const getDateKey = (dateString) => {
    if (!dateString) return 'sin-fecha';
    return new Date(dateString).toDateString();
  };

  // Agrupar datos por fecha
  const groupedByDate = useMemo(() => {
    if (!salesData || !activeTab) return {};
    
    const currentData = activeTab === 'Cotizaciones' ? salesData.cotizaciones : salesData.facturas;
    
    // Filtrar por término de búsqueda
    const filteredData = currentData.filter(item => 
      item.ref?.toString().includes(searchTerm) ||
      item.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customer?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Agrupar por fecha
    const grouped = filteredData.reduce((groups, item) => {
      const itemDate = getItemDate(item);
      const dateKey = getDateKey(itemDate);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(item);
      return groups;
    }, {});

    // Ordenar items dentro de cada grupo
    Object.keys(grouped).forEach(dateKey => {
      grouped[dateKey].sort((a, b) => {
        const dateA = getItemDate(a);
        const dateB = getItemDate(b);
        return new Date(dateB) - new Date(dateA);
      });
    });

    return grouped;
  }, [activeTab, salesData, searchTerm]);

  // Obtener fechas disponibles ordenadas
  const availableDates = useMemo(() => {
    const dates = Object.keys(groupedByDate).filter(date => date !== 'sin-fecha');
    return dates.sort((a, b) => new Date(b) - new Date(a));
  }, [groupedByDate]);

  // Auto-seleccionar la primera fecha disponible
  React.useEffect(() => {
    if (availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates, selectedDate]);

  // Obtener datos de la fecha seleccionada
  const currentDateData = selectedDate ? groupedByDate[selectedDate] || [] : [];
  
  // Navegación entre fechas
  const currentDateIndex = availableDates.indexOf(selectedDate);
  const canGoPrevious = currentDateIndex > 0;
  const canGoNext = currentDateIndex < availableDates.length - 1;

  const goToPreviousDate = () => {
    if (canGoPrevious) {
      setSelectedDate(availableDates[currentDateIndex - 1]);
    }
  };

  const goToNextDate = () => {
    if (canGoNext) {
      setSelectedDate(availableDates[currentDateIndex + 1]);
    }
  };

  // 🔥 FUNCIÓN MEJORADA PARA IMPRIMIR
  const handlePrintHistoryItem = (item, documentType) => {
    let processedExtraFields = {};
    if (item.extrafields && Array.isArray(item.extrafields)) {
      item.extrafields.forEach(field => {
        Object.entries(field).forEach(([key, value]) => {
          if (key !== 'fk_object' && key !== 'rowid') {
            processedExtraFields[key] = String(value);
          }
        });
      });
    }
    handlePrintTicket(item, documentType);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="h-full w-full flex flex-col max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              📊 Historial de Ventas
            </h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            {[
              { id: 'Cotizaciones', label: 'Cotizaciones', emoji: '📋', count: salesData.cotizaciones?.length || 0 },
              { id: 'Facturas', label: 'Facturas', emoji: '🧾', count: salesData.facturas?.length || 0 }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedDate(null);
                }}
                className={`flex-1 px-3 py-2 rounded-lg font-medium transition-all text-sm sm:text-base ${
                  activeTab === tab.id 
                    ? 'bg-white text-blue-600 shadow-lg' 
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                <span className="hidden sm:inline">{tab.emoji} </span>
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Búsqueda */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar documento o cliente..."
              className="w-full px-4 py-3 pl-10 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-white/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute left-3 top-3.5 text-gray-400">🔍</div>
          </div>
        </div>

        {/* Navegación de fechas */}
        {availableDates.length > 0 && (
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between gap-4">
              {/* Navegación */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={goToPreviousDate}
                  disabled={!canGoPrevious}
                  className="p-2 rounded-lg bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
                >
                  ◀️
                </button>
                
                <div className="text-center min-w-0 flex-1">
                  <div className="text-sm text-gray-500">Página {currentDateIndex + 1} de {availableDates.length}</div>
                  <div className="font-semibold text-gray-800 truncate">
                    {selectedDate ? formatDate(selectedDate) : 'Sin fecha'}
                  </div>
                </div>
                
                <button 
                  onClick={goToNextDate}
                  disabled={!canGoNext}
                  className="p-2 rounded-lg bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
                >
                  ▶️
                </button>
              </div>

              {/* Selector de fecha rápido - Solo en desktop */}
              <select
                value={selectedDate || ''}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="hidden sm:block px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              >
                {availableDates.map(dateKey => (
                  <option key={dateKey} value={dateKey}>
                    {formatDate(dateKey)} ({groupedByDate[dateKey]?.length || 0})
                  </option>
                ))}
              </select>
            </div>

            {/* Estadísticas de la fecha */}
            {selectedDate && (
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Documentos: <strong>{currentDateData.length}</strong></span>
                </div>
                <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Total: <strong>Q{currentDateData.reduce((sum, item) => sum + parseFloat(item.total_ttc || item.total || 0), 0).toFixed(2)}</strong></span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {selectedDate && currentDateData.length > 0 ? (
            <div className="p-4 space-y-4">
              {currentDateData.map((item, index) => {
                const itemDate = getItemDate(item);
                const isFactura = activeTab === 'Facturas';
                const isCotizacion = activeTab === 'Cotizaciones';
                
                return (
                  <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex flex-col lg:flex-row gap-4">
                      
                      {/* Info principal */}
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`w-10 h-10 bg-gradient-to-br ${isFactura ? 'from-green-500 to-emerald-600' : 'from-blue-500 to-purple-600'} rounded-lg flex items-center justify-center text-white text-lg flex-shrink-0`}>
                            {isFactura ? '🧾' : '📋'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-gray-800 text-lg sm:text-xl truncate">
                              {isFactura ? 'FACT' : 'COT'} #{item.ref}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {itemDate ? new Date(itemDate).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 'Sin hora'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-gray-600">
                            <span className="text-blue-500">👤</span>
                            <span className="font-medium truncate">
                              {item.customerName || item.customer || 'Cliente no especificado'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-green-500">💰</span>
                            <span className="text-xl font-bold text-green-600">
                              Q{parseFloat(item.total_ttc || item.total || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* 🔥 ACCIONES MEJORADAS SEGÚN TIPO DE DOCUMENTO */}
                      <div className="flex flex-row lg:flex-col gap-2 lg:w-40">
                        
                        {/* Ver Detalles - Siempre disponible */}
                        <button 
                          onClick={() => handleViewDetails(item, isFactura ? 'Factura' : 'Cotización')}
                          className="flex-1 lg:flex-none px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-medium text-sm flex items-center justify-center gap-1"
                        >
                          <span>👁️</span>
                          <span className="hidden sm:inline">Ver Detalles</span>
                          <span className="sm:hidden">Ver</span>
                        </button>
                        
                        {/* Facturar - Solo para cotizaciones */}
                        {isCotizacion && (
                          <button 
                            onClick={() => handleInvoiceCotizacion(item)}
                            className="flex-1 lg:flex-none px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all font-medium text-sm flex items-center justify-center gap-1"
                          >
                            <span>💰</span>
                            <span className="hidden sm:inline">Facturar</span>
                            <span className="sm:hidden">💰</span>
                          </button>
                        )}
                        
                        {/* Imprimir - Siempre disponible */}
                        <button 
                          onClick={() => handlePrintHistoryItem(item, isFactura ? 'Factura' : 'Cotización')}
                          className="flex-1 lg:flex-none px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all font-medium text-sm flex items-center justify-center gap-1"
                        >
                          <span>🖨️</span>
                          <span className="hidden sm:inline">Imprimir</span>
                          <span className="sm:hidden">🖨️</span>
                        </button>
                      </div>
                    </div>
                    
                    {/* 🔥 INDICADOR VISUAL DEL TIPO DE ACCIÓN */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      {isFactura ? (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <span>✅</span>
                          <span>Factura finalizada - Solo consulta</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                          <span>📋</span>
                          <span>Cotización - Puede facturarse</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="text-6xl mb-4 text-gray-300">
                {selectedDate ? '📄' : '📅'}
              </div>
              <h3 className="text-xl font-medium text-gray-600 mb-2">
                {selectedDate 
                  ? 'No hay documentos' 
                  : 'Selecciona una fecha'}
              </h3>
              <p className="text-gray-500 max-w-sm">
                {selectedDate 
                  ? `No se encontraron ${activeTab.toLowerCase()} para esta fecha`
                  : 'Usa las flechas para navegar entre fechas disponibles'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesHistoryModal;