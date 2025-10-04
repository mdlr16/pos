import React, { useState, useEffect } from 'react';

const AdvancedComandaModal = ({ isOpen, onClose, mesa, productos, onSendComanda }) => {
  const [comandaItems, setComandaItems] = useState([]);
  const [timing, setTiming] = useState('now'); // now, timed, course_by_course
  const [courses, setCourses] = useState([]);
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Estados de productos
  const productStatus = {
    PENDING: { name: 'Pendiente', color: 'bg-gray-100 text-gray-800', icon: '⏳' },
    SENT: { name: 'Enviado', color: 'bg-blue-100 text-blue-800', icon: '📤' },
    PREPARING: { name: 'Preparando', color: 'bg-yellow-100 text-yellow-800', icon: '🍳' },
    READY: { name: 'Listo', color: 'bg-green-100 text-green-800', icon: '✅' },
    SERVED: { name: 'Servido', color: 'bg-purple-100 text-purple-800', icon: '🍽️' },
    CANCELLED: { name: 'Cancelado', color: 'bg-red-100 text-red-800', icon: '❌' }
  };

  // Tipos de comanda
  const comandaTypes = {
    KITCHEN: { name: 'Cocina', station: 'kitchen', color: 'bg-orange-500' },
    BAR: { name: 'Bar', station: 'bar', color: 'bg-blue-500' },
    COLD: { name: 'Fríos', station: 'cold', color: 'bg-cyan-500' },
    GRILL: { name: 'Parrilla', station: 'grill', color: 'bg-red-500' }
  };

  useEffect(() => {
    if (isOpen && productos) {
      // Inicializar productos con su estación correspondiente
      const initItems = productos.map(product => ({
        ...product,
        station: getProductStation(product),
        status: 'PENDING',
        course: 1,
        timing: 'now',
        specialInstructions: product.note || '',
        modifications: []
      }));
      setComandaItems(initItems);
    }
  }, [isOpen, productos]);

  // Determinar estación según el producto
  const getProductStation = (product) => {
    const name = product.name.toLowerCase();
    if (name.includes('bebida') || name.includes('cerveza') || name.includes('coctel')) {
      return 'bar';
    } else if (name.includes('ensalada') || name.includes('entrada fría')) {
      return 'cold';
    } else if (name.includes('parrilla') || name.includes('carne')) {
      return 'grill';
    }
    return 'kitchen';
  };

  // Agrupar por estación
  const groupByStation = () => {
    const grouped = {};
    comandaItems.forEach(item => {
      if (!grouped[item.station]) {
        grouped[item.station] = [];
      }
      grouped[item.station].push(item);
    });
    return grouped;
  };

  // Agregar modificación a producto
  const addModification = (productId, modification) => {
    setComandaItems(prev => prev.map(item => 
      item.id === productId 
        ? { ...item, modifications: [...item.modifications, modification] }
        : item
    ));
  };

  // Calcular tiempo estimado
  const calculateEstimatedTime = () => {
    const stationTimes = {
      kitchen: 15,
      bar: 5,
      cold: 8,
      grill: 20
    };

    const grouped = groupByStation();
    const maxTime = Math.max(...Object.entries(grouped).map(
      ([station, items]) => stationTimes[station] * Math.ceil(items.length / 2)
    ));

    return maxTime + (courses.length > 1 ? Math.max(...courses.map(c => c.delay || 0)) : 0);
  };

  // Componente de curso por tiempo
  const CourseByCourseTiming = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-medium">Tiempos de Comanda</h4>
        <button
          onClick={() => {
            const newCourse = { 
              id: Date.now(), 
              name: `Tiempo ${courses.length + 1}`, 
              delay: 0,
              items: []
            };
            setCourses([...courses, newCourse]);
          }}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
        >
          + Agregar Tiempo
        </button>
      </div>

      {courses.map((course, courseIndex) => (
        <div key={course.id} className="border border-gray-200 rounded p-4">
          <div className="flex items-center space-x-4 mb-3">
            <input
              type="text"
              value={course.name}
              onChange={(e) => {
                setCourses(prev => prev.map((c, i) => 
                  i === courseIndex ? { ...c, name: e.target.value } : c
                ));
              }}
              className="font-medium border-b border-gray-300 bg-transparent px-2 py-1"
            />
            <div className="flex items-center space-x-2">
              <label className="text-sm">Retraso:</label>
              <input
                type="number"
                value={course.delay}
                onChange={(e) => {
                  setCourses(prev => prev.map((c, i) => 
                    i === courseIndex ? { ...c, delay: parseInt(e.target.value) || 0 } : c
                  ));
                }}
                className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"
                min="0"
                step="5"
              />
              <span className="text-sm text-gray-500">min</span>
            </div>
            <button
              onClick={() => setCourses(prev => prev.filter((_, i) => i !== courseIndex))}
              className="text-red-500 hover:text-red-700 p-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {comandaItems.map(item => (
              <div
                key={item.id}
                className={`p-2 border rounded cursor-pointer transition-colors ${
                  item.course === courseIndex + 1 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-400'
                }`}
                onClick={() => {
                  setComandaItems(prev => prev.map(i => 
                    i.id === item.id ? { ...i, course: courseIndex + 1 } : i
                  ));
                }}
              >
                <div className="text-sm font-medium">{item.name}</div>
                <div className="text-xs text-gray-500">Cant: {item.quantity}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  // Vista por estaciones
  const StationView = () => {
    const grouped = groupByStation();

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Object.entries(grouped).map(([station, items]) => {
          const stationType = comandaTypes[station.toUpperCase()] || comandaTypes.KITCHEN;
          
          return (
            <div key={station} className="border border-gray-200 rounded overflow-hidden">
              <div className={`${stationType.color} text-white p-3 font-medium`}>
                {stationType.name} ({items.length})
              </div>
              <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between items-start p-2 bg-gray-50 rounded">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{item.name}</div>
                      <div className="text-xs text-gray-500">
                        Cant: {item.quantity} | Tiempo: {item.course}
                      </div>
                      {item.modifications && item.modifications.length > 0 && (
                        <div className="text-xs text-blue-600 mt-1 truncate">
                          Mod: {item.modifications.join(', ')}
                        </div>
                      )}
                      {item.specialInstructions && (
                        <div className="text-xs text-purple-600 mt-1 truncate">
                          Nota: {item.specialInstructions}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col space-y-1 ml-2">
                      <select
                        value={item.status}
                        onChange={(e) => {
                          setComandaItems(prev => prev.map(i => 
                            i.id === item.id ? { ...i, status: e.target.value } : i
                          ));
                        }}
                        className="text-xs border rounded px-1 py-0.5"
                      >
                        {Object.entries(productStatus).map(([key, status]) => (
                          <option key={key} value={key}>
                            {status.icon} {status.name}
                          </option>
                        ))}
                      </select>
                      
                      <button
                        onClick={() => {
                          const mod = prompt('Agregar modificación:');
                          if (mod && mod.trim()) {
                            addModification(item.id, mod.trim());
                          }
                        }}
                        className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                      >
                        + Mod
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const handleSendComanda = async () => {
    const comandaData = {
      mesa: mesa,
      items: comandaItems,
      timing: timing,
      courses: courses,
      specialInstructions: specialInstructions,
      stations: Object.keys(groupByStation()),
      timestamp: new Date().toISOString(),
      estimatedTime: calculateEstimatedTime(),
      priority: mesa?.vip ? 'high' : 'normal',
      type: 'advanced_comanda'
    };

    console.log('🍳 Enviando comanda avanzada:', comandaData);

    try {
      if (onSendComanda) {
        await onSendComanda(comandaData);
      }
      onClose();
    } catch (error) {
      console.error('Error enviando comanda:', error);
      alert('Error enviando comanda avanzada: ' + error.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Comanda Avanzada - {mesa?.nombre}</h2>
              <div className="text-sm text-gray-600 mt-1">
                {comandaItems.length} productos | Tiempo estimado: {calculateEstimatedTime()} min
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setTiming('now')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  timing === 'now' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Ahora
              </button>
              <button
                onClick={() => setTiming('course_by_course')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  timing === 'course_by_course' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Por Tiempos
              </button>
              
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Panel izquierdo: Configuración */}
          <div className="w-1/3 p-6 border-r overflow-y-auto">
            {timing === 'course_by_course' && <CourseByCourseTiming />}
            
            <div className={timing === 'course_by_course' ? 'mt-6' : ''}>
              <h4 className="font-medium mb-3">Instrucciones Especiales</h4>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Alergias, preferencias, instrucciones especiales..."
                rows={4}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mt-6">
              <h4 className="font-medium mb-3">Resumen por Estación</h4>
              {Object.entries(groupByStation()).map(([station, items]) => {
                const stationType = comandaTypes[station.toUpperCase()] || comandaTypes.KITCHEN;
                return (
                  <div key={station} className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm font-medium">{stationType.name}</span>
                    <span className="text-sm text-gray-600">{items.length} items</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-6">
              <h4 className="font-medium mb-3">Estado General</h4>
              <div className="space-y-2">
                {Object.entries(productStatus).map(([key, status]) => {
                  const count = comandaItems.filter(item => item.status === key).length;
                  return (
                    <div key={key} className={`flex justify-between items-center py-1 px-2 rounded ${status.color}`}>
                      <span className="text-sm">{status.icon} {status.name}</span>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Panel derecho: Vista de estaciones */}
          <div className="flex-1 p-6 overflow-y-auto">
            <StationView />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
          <div className="flex space-x-4">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            
            <button 
              onClick={() => {
                console.log('💾 Guardando borrador de comanda avanzada');
                // TODO: Implementar guardado de borrador
              }}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
            >
              💾 Guardar Borrador
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600 bg-white px-3 py-1 rounded border">
              🕐 {calculateEstimatedTime()} min estimados
            </div>
            
            <button
              onClick={handleSendComanda}
              disabled={comandaItems.length === 0}
              className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 transition-colors flex items-center space-x-2"
            >
              <span>🍳</span>
              <span>Enviar a Cocina</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedComandaModal;