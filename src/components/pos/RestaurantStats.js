import React, { useState, useEffect } from 'react';

const RestaurantStats = ({ 
  mesas, 
  mesasConfig, 
  estadisticas, 
  variables,
  isLoading = false 
}) => {
  
  const [ventasHoy, setVentasHoy] = useState({
    total: 0,
    facturas: 0,
    mesasAtendidas: 0,
    promedioTiempo: 0
  });
  
  const [ventasPorHora, setVentasPorHora] = useState([]);

  // Cargar estadísticas de ventas del día
  useEffect(() => {
    loadVentasHoy();
    loadVentasPorHora();
  }, [variables]);

  const loadVentasHoy = async () => {
    try {
      if (!variables?.SPOS_URL || !variables?.DOLIBARR_API_KEY) return;

      const today = new Date().toISOString().split('T')[0];
      
      const headers = {
        'DOLAPIKEY': variables.DOLIBARR_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      // Consultar facturas del día
      const response = await fetch(`${variables.SPOS_URL}/api/index.php/sql`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          sql: `SELECT 
                  COUNT(*) as total_facturas,
                  SUM(total_ttc) as total_ventas,
                  COUNT(DISTINCT numero_mesa) as mesas_atendidas
                FROM llx_facture 
                WHERE DATE(datef) = '${today}' 
                AND entity = ${variables.entity || 1}
                AND numero_mesa IS NOT NULL`
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result && result.length > 0) {
          setVentasHoy({
            total: parseFloat(result[0].total_ventas || 0),
            facturas: parseInt(result[0].total_facturas || 0),
            mesasAtendidas: parseInt(result[0].mesas_atendidas || 0),
            promedioTiempo: 45 // Placeholder - calcular tiempo promedio real
          });
        }
      }
    } catch (error) {
      console.error('Error cargando ventas del día:', error);
    }
  };

  const loadVentasPorHora = async () => {
    try {
      if (!variables?.SPOS_URL || !variables?.DOLIBARR_API_KEY) return;

      const today = new Date().toISOString().split('T')[0];
      
      const headers = {
        'DOLAPIKEY': variables.DOLIBARR_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      // Consultar ventas por hora
      const response = await fetch(`${variables.SPOS_URL}/api/index.php/sql`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          sql: `SELECT 
                  HOUR(datef) as hora,
                  COUNT(*) as facturas,
                  SUM(total_ttc) as total
                FROM llx_facture 
                WHERE DATE(datef) = '${today}' 
                AND entity = ${variables.entity || 1}
                AND numero_mesa IS NOT NULL
                GROUP BY HOUR(datef)
                ORDER BY hora`
        })
      });

      if (response.ok) {
        const result = await response.json();
        setVentasPorHora(result || []);
      }
    } catch (error) {
      console.error('Error cargando ventas por hora:', error);
    }
  };

  // Calcular tiempo promedio de ocupación
  const getTiempoPromedioOcupacion = () => {
    const mesasOcupadas = mesas.filter(m => m.estado === 'OCUPADA');
    if (mesasOcupadas.length === 0) return 0;

    const ahora = new Date();
    const tiempos = mesasOcupadas.map(mesa => {
      if (!mesa.fechaApertura) return 0;
      const apertura = new Date(mesa.fechaApertura);
      return Math.floor((ahora - apertura) / 60000); // minutos
    });

    return Math.floor(tiempos.reduce((sum, t) => sum + t, 0) / tiempos.length);
  };

  // Obtener hora pico del día
  const getHoraPico = () => {
    if (ventasPorHora.length === 0) return 'N/A';
    
    const horaPico = ventasPorHora.reduce((max, current) => 
      parseFloat(current.total) > parseFloat(max.total) ? current : max
    );
    
    return `${horaPico.hora}:00`;
  };

  // Calcular ocupación promedio
  const getOcupacionPromedio = () => {
    if (mesasConfig.length === 0) return 0;
    return Math.floor((estadisticas.ocupada / mesasConfig.length) * 100);
  };

  // Renderizar gráfico simple de barras para ventas por hora
  const renderVentasPorHora = () => {
    const maxVenta = Math.max(...ventasPorHora.map(v => parseFloat(v.total)));
    
    return (
      <div className="space-y-2">
        {ventasPorHora.map(venta => (
          <div key={venta.hora} className="flex items-center space-x-2">
            <span className="text-xs w-8">{venta.hora}h</span>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${maxVenta > 0 ? (parseFloat(venta.total) / maxVenta) * 100 : 0}%` 
                }}
              />
            </div>
            <span className="text-xs w-12 text-right">Q{parseFloat(venta.total).toFixed(0)}</span>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Estadísticas de mesas en tiempo real */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m-4 0H5m-4 0h4" />
          </svg>
          Estado de Mesas
        </h3>
        
        <div className="space-y-4">
          {/* Resumen rápido */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{estadisticas.libre}</div>
              <div className="text-xs text-green-600">Libres</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{estadisticas.ocupada}</div>
              <div className="text-xs text-yellow-600">Ocupadas</div>
            </div>
          </div>
          
          {/* Métricas adicionales */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total mesas:</span>
              <span className="font-medium">{estadisticas.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Ocupación:</span>
              <span className="font-medium">{getOcupacionPromedio()}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Tiempo promedio:</span>
              <span className="font-medium">{getTiempoPromedioOcupacion()}min</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Cobrando:</span>
              <span className="font-medium text-red-600">{estadisticas.cobrando}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ventas del día */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
          Ventas Hoy
        </h3>
        
        <div className="space-y-4">
          {/* Total del día */}
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600">
              Q{ventasHoy.total.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-green-600">Total del día</div>
          </div>
          
          {/* Métricas del día */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Facturas:</span>
              <span className="font-medium">{ventasHoy.facturas}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Mesas atendidas:</span>
              <span className="font-medium">{ventasHoy.mesasAtendidas}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Promedio por factura:</span>
              <span className="font-medium">
                Q{ventasHoy.facturas > 0 ? (ventasHoy.total / ventasHoy.facturas).toFixed(2) : '0.00'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Hora pico:</span>
              <span className="font-medium">{getHoraPico()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ventas por hora */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Ventas por Hora
        </h3>
        
        <div className="space-y-2">
          {ventasPorHora.length > 0 ? (
            renderVentasPorHora()
          ) : (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-sm">No hay ventas registradas hoy</p>
            </div>
          )}
        </div>
        
        {/* Botón de actualizar */}
        <div className="mt-4 pt-4 border-t">
          <button
            onClick={() => {
              loadVentasHoy();
              loadVentasPorHora();
            }}
            className="w-full text-sm text-gray-600 hover:text-gray-800 transition-colors flex items-center justify-center space-x-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Actualizar datos</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestaurantStats;