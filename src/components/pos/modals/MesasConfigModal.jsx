import React, { useState, useEffect } from 'react';

const MesasConfigModal = ({ isOpen, onClose, mesasConfig, onSave }) => {
  const [config, setConfig] = useState({
    filas: 4,
    columnas: 5,
    mesas: []
  });

  const [isEditing, setIsEditing] = useState(false);

  // Cargar configuración inicial
  useEffect(() => {
    if (mesasConfig && isOpen) {
      setConfig({ ...mesasConfig });
    }
  }, [mesasConfig, isOpen]);

  // Generar nueva grilla cuando cambian filas/columnas
  const handleGridChange = (filas, columnas) => {
    const nuevasMesas = [];
    let numero = 1;
    
    for (let fila = 0; fila < filas; fila++) {
      for (let columna = 0; columna < columnas; columna++) {
        // Buscar si ya existe una mesa en esta posición
        const mesaExistente = config.mesas?.find(m => 
          m.posicion.fila === fila && m.posicion.columna === columna
        );

        if (mesaExistente) {
          nuevasMesas.push(mesaExistente);
        } else {
          nuevasMesas.push({
            id: numero,
            numero: numero,
            nombre: `Mesa ${numero}`,
            capacidad: 4,
            posicion: { fila, columna },
            activa: true
          });
        }
        numero++;
      }
    }

    setConfig({
      ...config,
      filas,
      columnas,
      mesas: nuevasMesas
    });
  };

  // Actualizar mesa específica
  const updateMesa = (index, campo, valor) => {
    const nuevasMesas = [...config.mesas];
    nuevasMesas[index] = {
      ...nuevasMesas[index],
      [campo]: valor
    };
    setConfig({
      ...config,
      mesas: nuevasMesas
    });
  };

  // Generar preset de configuraciones comunes
  const applyPreset = (preset) => {
    let newConfig;
    
    switch (preset) {
      case 'small':
        newConfig = {
          filas: 3,
          columnas: 4,
          mesas: []
        };
        break;
      case 'medium':
        newConfig = {
          filas: 4,
          columnas: 5,
          mesas: []
        };
        break;
      case 'large':
        newConfig = {
          filas: 5,
          columnas: 6,
          mesas: []
        };
        break;
      default:
        return;
    }
    
    handleGridChange(newConfig.filas, newConfig.columnas);
  };

  // Guardar configuración
  const handleSave = () => {
    onSave(config);
    onClose();
    setIsEditing(false);
  };

  // Renderizar grilla de configuración
  const renderConfigGrid = () => {
    const { filas, columnas, mesas } = config;
    const grid = [];

    for (let fila = 0; fila < filas; fila++) {
      const filaElements = [];
      
      for (let columna = 0; columna < columnas; columna++) {
        const mesaIndex = mesas.findIndex(m => 
          m.posicion.fila === fila && m.posicion.columna === columna
        );
        const mesa = mesas[mesaIndex];

        if (mesa) {
          filaElements.push(
            <div
              key={`${fila}-${columna}`}
              className={`
                border-2 rounded-lg p-2 transition-all duration-200
                ${mesa.activa 
                  ? 'bg-blue-50 border-blue-300 hover:bg-blue-100' 
                  : 'bg-gray-50 border-gray-300 opacity-50'
                }
              `}
            >
              {/* Toggle activar/desactivar */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium">#{mesa.numero}</span>
                <button
                  onClick={() => updateMesa(mesaIndex, 'activa', !mesa.activa)}
                  className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-xs
                    ${mesa.activa 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-300 text-gray-600'
                    }
                  `}
                >
                  {mesa.activa ? '✓' : '✕'}
                </button>
              </div>

              {mesa.activa && (
                <div className="space-y-2">
                  {/* Nombre */}
                  <input
                    type="text"
                    value={mesa.nombre}
                    onChange={(e) => updateMesa(mesaIndex, 'nombre', e.target.value)}
                    className="w-full px-1 py-1 text-xs border border-gray-300 rounded"
                    placeholder="Nombre mesa"
                  />
                  
                  {/* Capacidad */}
                  <div className="flex items-center space-x-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={mesa.capacidad}
                      onChange={(e) => updateMesa(mesaIndex, 'capacidad', parseInt(e.target.value))}
                      className="flex-1 px-1 py-1 text-xs border border-gray-300 rounded"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        }
      }

      grid.push(
        <div 
          key={fila} 
          className="grid gap-2" 
          style={{ gridTemplateColumns: `repeat(${columnas}, 1fr)` }}
        >
          {filaElements}
        </div>
      );
    }

    return grid;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Configuración de Mesas</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Controles principales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Dimensiones */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Dimensiones</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filas
                </label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={config.filas}
                  onChange={(e) => handleGridChange(parseInt(e.target.value), config.columnas)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Columnas
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={config.columnas}
                  onChange={(e) => handleGridChange(config.filas, parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Presets */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Configuraciones Rápidas</h3>
              
              <div className="space-y-2">
                <button
                  onClick={() => applyPreset('small')}
                  className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-md text-sm transition-colors"
                >
                  <div className="font-medium">Restaurante Pequeño</div>
                  <div className="text-gray-500">3x4 (12 mesas)</div>
                </button>
                
                <button
                  onClick={() => applyPreset('medium')}
                  className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-md text-sm transition-colors"
                >
                  <div className="font-medium">Restaurante Mediano</div>
                  <div className="text-gray-500">4x5 (20 mesas)</div>
                </button>
                
                <button
                  onClick={() => applyPreset('large')}
                  className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-md text-sm transition-colors"
                >
                  <div className="font-medium">Restaurante Grande</div>
                  <div className="text-gray-500">5x6 (30 mesas)</div>
                </button>
              </div>
            </div>

            {/* Estadísticas */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Resumen</h3>
              
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total posiciones:</span>
                  <span className="font-medium">{config.filas * config.columnas}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mesas activas:</span>
                  <span className="font-medium text-green-600">
                    {config.mesas?.filter(m => m.activa).length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Espacios libres:</span>
                  <span className="font-medium text-gray-500">
                    {(config.filas * config.columnas) - (config.mesas?.filter(m => m.activa).length || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Capacidad total:</span>
                  <span className="font-medium text-blue-600">
                    {config.mesas?.filter(m => m.activa).reduce((sum, m) => sum + m.capacidad, 0) || 0} personas
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Grilla de configuración */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-gray-900">Layout del Restaurante</h3>
              <div className="text-sm text-gray-500">
                Haga clic en ✓ para activar/desactivar mesas
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="space-y-2">
                {renderConfigGrid()}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
};

export default MesasConfigModal;