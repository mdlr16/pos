import React, { useState } from 'react';

const TableTransferModal = ({ isOpen, onClose, currentMesa, allMesas = [], onTransfer }) => {
  const [operation, setOperation] = useState('transfer');
  const [selectedTables, setSelectedTables] = useState([]);
  const [transferItems, setTransferItems] = useState([]);
  const [reason, setReason] = useState('');

  // Tipos de operaciones
  const operations = {
    TRANSFER: 'transfer',     // Transferir cuenta completa
    MERGE: 'merge',          // Fusionar dos mesas
    SPLIT: 'split',          // Dividir una mesa en varias
    SWAP: 'swap'             // Intercambiar mesas
  };

  // Filtrar mesas disponibles según operación
  const getAvailableTables = () => {
    if (!currentMesa) return [];
    
    switch (operation) {
      case 'transfer':
      case 'swap':
        return allMesas.filter(m => 
          m.numero !== currentMesa.numero && 
          (m.estado === 'LIBRE' || operation === 'swap')
        );
      case 'merge':
        return allMesas.filter(m => 
          m.numero !== currentMesa.numero && 
          m.estado === 'OCUPADA'
        );
      default:
        return allMesas.filter(m => m.numero !== currentMesa.numero);
    }
  };

  // Transferencia simple
  const SimpleTransfer = () => (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium mb-3">Transferir de {currentMesa?.nombre} a:</h3>
        <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto">
          {getAvailableTables().map(mesa => (
            <button
              key={mesa.numero}
              onClick={() => setSelectedTables([mesa])}
              className={`p-3 border-2 rounded-lg text-center transition-all ${
                selectedTables.some(t => t.numero === mesa.numero)
                  ? 'border-blue-500 bg-blue-50' 
                  : mesa.estado === 'LIBRE' 
                    ? 'border-green-300 bg-green-50 hover:border-green-500'
                    : 'border-yellow-300 bg-yellow-50 hover:border-yellow-500'
              }`}
            >
              <div className="font-medium">{mesa.nombre}</div>
              <div className="text-sm text-gray-600">Cap: {mesa.capacidad}</div>
              <div className={`text-xs px-2 py-1 rounded mt-1 ${
                mesa.estado === 'LIBRE' ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'
              }`}>
                {mesa.estado}
              </div>
            </button>
          ))}
        </div>

        {getAvailableTables().length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No hay mesas disponibles para transferencia</p>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Motivo del cambio</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="">Seleccionar motivo...</option>
          <option value="customer_request">Solicitud del cliente</option>
          <option value="noise">Ruido excesivo</option>
          <option value="size">Mesa inadecuada</option>
          <option value="view">Mejor vista</option>
          <option value="accessibility">Accesibilidad</option>
          <option value="maintenance">Mantenimiento</option>
          <option value="other">Otro</option>
        </select>
      </div>
    </div>
  );

  // Fusión de mesas
  const MergeOperation = () => (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium mb-3">
          Fusionar {currentMesa?.nombre} con:
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {getAvailableTables().map(mesa => (
            <div key={mesa.numero} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">{mesa.nombre}</div>
                <input
                  type="checkbox"
                  checked={selectedTables.some(t => t.numero === mesa.numero)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedTables([...selectedTables, mesa]);
                    } else {
                      setSelectedTables(selectedTables.filter(t => t.numero !== mesa.numero));
                    }
                  }}
                  className="w-4 h-4"
                />
              </div>
              <div className="text-sm text-gray-600">
                <div>Productos: {mesa.productos?.length || 0}</div>
                <div>Total: Q.{mesa.total?.toFixed(2) || '0.00'}</div>
                <div>Cliente: {mesa.cliente || 'Sin asignar'}</div>
              </div>
            </div>
          ))}
        </div>

        {getAvailableTables().length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No hay mesas ocupadas disponibles para fusionar</p>
          </div>
        )}
      </div>

      {selectedTables.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900">Vista previa de fusión:</h4>
          <div className="mt-2 text-sm text-blue-800">
            <div>Mesas: {[currentMesa, ...selectedTables].map(m => m?.nombre).join(' + ')}</div>
            <div>Total productos: {[currentMesa, ...selectedTables].reduce((sum, m) => sum + (m?.productos?.length || 0), 0)}</div>
            <div>Total: Q.{[currentMesa, ...selectedTables].reduce((sum, m) => sum + (m?.total || 0), 0).toFixed(2)}</div>
          </div>
        </div>
      )}
    </div>
  );

  // División de mesa
  const SplitOperation = () => (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium mb-3">
          Dividir productos de {currentMesa?.nombre} en mesas separadas:
        </h3>
        
        <div className="flex space-x-4 mb-4">
          <div className="flex-1">
            <h4 className="font-medium mb-2">Productos a transferir:</h4>
            <div className="border border-gray-200 rounded p-3 max-h-48 overflow-y-auto">
              {currentMesa?.productos?.map(product => (
                <div key={product.id || product.line_id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div className="flex-1">
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-gray-500">
                      Q.{product.price.toFixed(2)} x {product.quantity}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={transferItems.includes(product.id || product.line_id)}
                      onChange={(e) => {
                        const itemId = product.id || product.line_id;
                        if (e.target.checked) {
                          setTransferItems([...transferItems, itemId]);
                        } else {
                          setTransferItems(transferItems.filter(id => id !== itemId));
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <select className="text-sm border rounded px-2 py-1 w-24">
                      <option value="">Mesa...</option>
                      {getAvailableTables().slice(0, 5).map(mesa => (
                        <option key={mesa.numero} value={mesa.numero}>
                          {mesa.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )) || (
                <div className="text-center py-4 text-gray-500">
                  No hay productos para dividir
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const handleConfirmTransfer = async () => {
    if (!currentMesa || selectedTables.length === 0) {
      alert('Seleccione al menos una mesa destino');
      return;
    }

    const transferData = {
      operation,
      fromTable: currentMesa,
      toTables: selectedTables,
      items: transferItems,
      reason,
      timestamp: new Date().toISOString(),
      user: 'current_user' // TODO: Obtener del contexto de usuario
    };

    try {
      await onTransfer(transferData);
      // Resetear estado
      setSelectedTables([]);
      setTransferItems([]);
      setReason('');
      onClose();
    } catch (error) {
      console.error('Error en transferencia:', error);
      alert('Error realizando la transferencia: ' + (error.message || 'Error desconocido'));
    }
  };

  if (!isOpen || !currentMesa) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Transferencia de Mesa</h2>
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
            {Object.entries(operations).map(([key, value]) => (
              <button
                key={key}
                onClick={() => {
                  setOperation(value);
                  setSelectedTables([]);
                  setTransferItems([]);
                }}
                className={`px-4 py-2 rounded text-sm ${
                  operation === value 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {operation === 'transfer' && <SimpleTransfer />}
          {operation === 'merge' && <MergeOperation />}
          {operation === 'split' && <SplitOperation />}
          {operation === 'swap' && <SimpleTransfer />}
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
              onClick={handleConfirmTransfer}
              disabled={selectedTables.length === 0}
              className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {operation === 'transfer' && '🔄 Transferir Mesa'}
              {operation === 'merge' && '🤝 Fusionar Mesas'}
              {operation === 'split' && '✂️ Dividir Mesa'}
              {operation === 'swap' && '🔀 Intercambiar Mesas'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableTransferModal;