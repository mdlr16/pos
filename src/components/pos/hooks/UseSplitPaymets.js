// Estructura para división de cuentas
const SplitBillSystem = {
  // 1. TIPOS DE DIVISIÓN
  splitTypes: {
    EQUAL: 'equal',           // División equitativa
    BY_ITEM: 'by_item',       // Por productos específicos
    BY_PERSON: 'by_person',   // Por número de personas
    CUSTOM: 'custom'          // Montos personalizados
  },

  // 2. COMPONENTE DE DIVISIÓN
  SplitBillModal: ({ mesa, productos, onSplit, onClose }) => {
    const [splitType, setSplitType] = useState('equal');
    const [comensales, setComensales] = useState([]);
    const [assignments, setAssignments] = useState({});

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

    // Asignar producto a comensal
    const assignProductToGuest = (productId, guestId, quantity = 1) => {
      const product = productos.find(p => p.id === productId);
      const assignment = {
        productId,
        guestId,
        quantity,
        unitPrice: product.price,
        discount: product.discount,
        subtotal: (product.price * quantity) * (1 - product.discount / 100)
      };
      
      setAssignments(prev => ({
        ...prev,
        [`${productId}-${guestId}`]: assignment
      }));
    };

    // División automática equitativa
    const splitEqually = () => {
      const totalAmount = productos.reduce((sum, p) => sum + p.total, 0);
      const perPerson = totalAmount / comensales.length;
      
      const updatedComensales = comensales.map(c => ({
        ...c,
        subtotal: perPerson,
        total: perPerson + c.propina
      }));
      
      setComensales(updatedComensales);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-6 border-b bg-gray-50">
            <h2 className="text-xl font-bold">División de Cuenta - {mesa.nombre}</h2>
            <div className="flex space-x-4 mt-4">
              {Object.entries(this.splitTypes).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => setSplitType(value)}
                  className={`px-4 py-2 rounded ${
                    splitType === value 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700'
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
              {productos.map(product => (
                <div key={product.id} className="mb-3 p-3 border rounded">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{product.name}</h4>
                      <p className="text-sm text-gray-500">
                        Q.{product.price.toFixed(2)} x {product.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Q.{product.total.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  {/* Asignación rápida */}
                  {splitType === 'by_item' && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {comensales.map(guest => (
                        <button
                          key={guest.id}
                          onClick={() => assignProductToGuest(product.id, guest.id)}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          → {guest.nombre}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
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
                  <input
                    type="text"
                    value={guest.nombre}
                    onChange={(e) => {
                      setComensales(prev => prev.map(g => 
                        g.id === guest.id ? { ...g, nombre: e.target.value } : g
                      ));
                    }}
                    className="font-medium mb-2 w-full px-2 py-1 border rounded"
                  />
                  
                  {/* Productos asignados */}
                  <div className="space-y-1 mb-3">
                    {Object.values(assignments)
                      .filter(a => a.guestId === guest.id)
                      .map(assignment => {
                        const product = productos.find(p => p.id === assignment.productId);
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
                        onChange={(e) => {
                          const propina = parseFloat(e.target.value) || 0;
                          setComensales(prev => prev.map(g => 
                            g.id === guest.id 
                              ? { ...g, propina, total: g.subtotal + propina } 
                              : g
                          ));
                        }}
                        className="w-16 px-1 py-0.5 border rounded text-right"
                        step="0.50"
                      />
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>Q.{guest.total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Botón de pago individual */}
                  <button
                    onClick={() => onSplit(guest)}
                    className="w-full mt-2 px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                  >
                    💳 Pagar Q.{guest.total.toFixed(2)}
                  </button>
                </div>
              ))}

              {/* Acciones rápidas */}
              {splitType === 'equal' && (
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
              <button className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">
                💾 Guardar División
              </button>
              <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
                💳 Procesar Todos los Pagos
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
};