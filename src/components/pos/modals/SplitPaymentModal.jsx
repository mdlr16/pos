import React, { useState, useEffect } from 'react';

const SplitPaymentModal = ({ isOpen, onClose, mesa, productos, onSplit }) => {
  const [splitType, setSplitType] = useState('equal');
  const [comensales, setComensales] = useState([]);
  const [assignments, setAssignments] = useState({});

  // Tipos de división
  const splitTypes = {
    EQUAL: 'equal',           // División equitativa
    BY_ITEM: 'by_item',       // Por productos específicos
    BY_PERSON: 'by_person',   // Por número de personas
    CUSTOM: 'custom'          // Montos personalizados
  };

  // Limpiar estado al abrir/cerrar
  useEffect(() => {
    if (isOpen) {
      // Inicializar con 2 comensales por defecto
      setComensales([
        {
          id: 1,
          nombre: 'Persona 1',
          productos: [],
          subtotal: 0,
          propina: 0,
          total: 0
        },
        {
          id: 2,
          nombre: 'Persona 2',
          productos: [],
          subtotal: 0,
          propina: 0,
          total: 0
        }
      ]);
      setAssignments({});
    }
  }, [isOpen]);

  // Agregar comensal
  const addComensal = () => {
    const newId = Date.now();
    setComensales([...comensales, {
      id: newId,
      nombre: `Persona ${comensales.length + 1}`,
      productos: [],
      subtotal: 0,
      propina: 0,
      total: 0
    }]);
  };

  // Eliminar comensal
  const removeComensal = (id) => {
    if (comensales.length <= 1) return;
    setComensales(comensales.filter(c => c.id !== id));
    // Limpiar asignaciones del comensal eliminado
    const newAssignments = {};
    Object.entries(assignments).forEach(([key, value]) => {
      if (value.guestId !== id) {
        newAssignments[key] = value;
      }
    });
    setAssignments(newAssignments);
  };

  // Asignar producto a comensal
  const assignProductToGuest = (productId, guestId, quantity = 1) => {
    const product = productos.find(p => p.id === productId || p.line_id === productId);
    if (!product) return;

    const assignment = {
      productId,
      guestId,
      quantity,
      unitPrice: product.price,
      discount: product.discount || 0,
      subtotal: (product.price * quantity) * (1 - (product.discount || 0) / 100)
    };
    
    setAssignments(prev => ({
      ...prev,
      [`${productId}-${guestId}`]: assignment
    }));

    // Recalcular totales del comensal
    updateGuestTotals(guestId);
  };

  // Actualizar totales de un comensal
  const updateGuestTotals = (guestId) => {
    const guestAssignments = Object.values(assignments).filter(a => a.guestId === guestId);
    const subtotal = guestAssignments.reduce((sum, a) => sum + a.subtotal, 0);
    
    setComensales(prev => prev.map(c => 
      c.id === guestId 
        ? { ...c, subtotal, total: subtotal + c.propina }
        : c
    ));
  };

  // División automática equitativa
  const splitEqually = () => {
    const totalAmount = productos.reduce((sum, p) => sum + (p.total || (p.price * p.quantity)), 0);
    const perPerson = totalAmount / comensales.length;
    
    const updatedComensales = comensales.map(c => ({
      ...c,
      subtotal: perPerson,
      total: perPerson + c.propina
    }));
    
    setComensales(updatedComensales);
    setAssignments({}); // Limpiar asignaciones individuales
  };

  // Actualizar propina de un comensal
  const updateTip = (guestId, tip) => {
    const propina = parseFloat(tip) || 0;
    setComensales(prev => prev.map(c => 
      c.id === guestId 
        ? { ...c, propina, total: c.subtotal + propina }
        : c
    ));
  };

  // Procesar pago de un comensal
  const handleGuestPayment = (guest) => {
    const paymentData = {
      type: 'split_payment',
      mesa: mesa,
      guest: guest,
      amount: guest.total,
      productos: Object.values(assignments).filter(a => a.guestId === guest.id),
      splitType: splitType
    };
    
    onSplit(paymentData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">División de Cuenta - {mesa?.nombre}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex space-x-2">
            {Object.entries(splitTypes).map(([key, value]) => (
              <button
                key={key}
                onClick={() => setSplitType(value)}
                className={`px-4 py-2 rounded text-sm ${
                  splitType === value 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {key.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Panel izquierdo: Productos */}
          <div className="w-1/2 p-6 border-r overflow-y-auto">
            <h3 className="font-bold mb-4">Productos de la Mesa</h3>
            {productos?.map(product => (
              <div key={product.id || product.line_id} className="mb-3 p-3 border rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{product.name}</h4>
                    <p className="text-sm text-gray-500">
                      Q.{product.price.toFixed(2)} x {product.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">Q.{(product.total || (product.price * product.quantity)).toFixed(2)}</p>
                  </div>
                </div>
                
                {/* Asignación rápida */}
                {splitType === 'by_item' && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {comensales.map(guest => (
                      <button
                        key={guest.id}
                        onClick={() => assignProductToGuest(product.id || product.line_id, guest.id)}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        → {guest.nombre}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {(!productos || productos.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <p>No hay productos en esta mesa</p>
              </div>
            )}
          </div>

          {/* Panel derecho: Comensales */}
          <div className="w-1/2 p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">Comensales ({comensales.length})</h3>
              <button
                onClick={addComensal}
                className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
              >
                + Agregar
              </button>
            </div>

            {comensales.map(guest => (
              <div key={guest.id} className="mb-4 p-4 border rounded bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <input
                    type="text"
                    value={guest.nombre}
                    onChange={(e) => {
                      setComensales(prev => prev.map(g => 
                        g.id === guest.id ? { ...g, nombre: e.target.value } : g
                      ));
                    }}
                    className="font-medium px-2 py-1 border rounded flex-1 mr-2"
                  />
                  {comensales.length > 1 && (
                    <button
                      onClick={() => removeComensal(guest.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
                
                {/* Productos asignados */}
                {splitType === 'by_item' && (
                  <div className="space-y-1 mb-3">
                    {Object.values(assignments)
                      .filter(a => a.guestId === guest.id)
                      .map(assignment => {
                        const product = productos?.find(p => (p.id || p.line_id) === assignment.productId);
                        return (
                          <div key={`${assignment.productId}-${assignment.guestId}`} 
                               className="text-sm flex justify-between">
                            <span>{product?.name} x{assignment.quantity}</span>
                            <span>Q.{assignment.subtotal.toFixed(2)}</span>
                          </div>
                        );
                      })
                    }
                  </div>
                )}

                {/* Totales */}
                <div className="border-t pt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>Q.{guest.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Propina:</span>
                    <input
                      type="number"
                      value={guest.propina}
                      onChange={(e) => updateTip(guest.id, e.target.value)}
                      className="w-16 px-1 py-0.5 border rounded text-right"
                      step="0.50"
                      min="0"
                    />
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Total:</span>
                    <span>Q.{guest.total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Botón de pago individual */}
                <button
                  onClick={() => handleGuestPayment(guest)}
                  disabled={guest.total <= 0}
                  className="w-full mt-2 px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:bg-gray-400"
                >
                  💳 Pagar Q.{guest.total.toFixed(2)}
                </button>
              </div>
            ))}

            {/* Acciones rápidas */}
            {splitType === 'equal' && productos && productos.length > 0 && (
              <button
                onClick={splitEqually}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                ⚖️ Dividir Equitativamente
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancelar
          </button>
          
          <div className="flex space-x-2">
            <button 
              onClick={() => console.log('Guardar división')}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              💾 Guardar División
            </button>
            <button 
              onClick={() => {
                // Procesar todos los pagos
                comensales.forEach(guest => {
                  if (guest.total > 0) {
                    handleGuestPayment(guest);
                  }
                });
              }}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              💳 Procesar Todos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplitPaymentModal;