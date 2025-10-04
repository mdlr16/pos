import React from 'react';

const PrintComanda = ({ comandaData, onClose }) => {
  
  const handlePrint = () => {
    window.print();
  };

  const formatDateTime = (date) => {
    return new Date(date).toLocaleString('es-GT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b print:hidden">
          <h2 className="text-lg font-bold">Vista Previa - Comanda</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido del ticket - Optimizado para impresora térmica */}
        <div className="p-4 font-mono text-sm">
          <div className="text-center mb-4">
            <h1 className="text-lg font-bold">🍽️ COMANDA DE COCINA</h1>
            <div className="border-b border-dashed border-gray-400 my-2"></div>
          </div>

          {/* Información de la mesa */}
          <div className="mb-4">
            <div className="flex justify-between items-center">
              <span className="font-bold text-lg">MESA: {comandaData.mesa}</span>
              <span className="text-sm">{formatDateTime(comandaData.fecha)}</span>
            </div>
            <div className="text-sm text-gray-600">
              {comandaData.nombreMesa}
            </div>
            {comandaData.mesero && (
              <div className="text-sm">
                Mesero: {comandaData.mesero}
              </div>
            )}
          </div>

          <div className="border-b border-dashed border-gray-400 my-2"></div>

          {/* Lista de productos */}
          <div className="mb-4">
            <h3 className="font-bold mb-2">PRODUCTOS:</h3>
            {comandaData.productos && comandaData.productos.map((producto, index) => (
              <div key={index} className="mb-3 border-b border-dotted border-gray-300 pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium">{producto.name}</div>
                    <div className="text-xs text-gray-600">{producto.ref}</div>
                  </div>
                  <div className="text-right ml-2">
                    <div className="font-bold">x{producto.quantity}</div>
                    <div className="text-xs">Q.{producto.price.toFixed(2)}</div>
                  </div>
                </div>
                
                {/* Notas del producto */}
                {producto.note && (
                  <div className="mt-1 text-xs bg-yellow-50 p-1 rounded border-l-2 border-yellow-400">
                    <strong>Nota:</strong> {producto.note}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Resumen */}
          <div className="border-b border-dashed border-gray-400 my-2"></div>
          <div className="mb-4">
            <div className="flex justify-between">
              <span>Total productos:</span>
              <span className="font-bold">
                {comandaData.productos?.reduce((sum, p) => sum + p.quantity, 0) || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Total cuenta:</span>
              <span className="font-bold">
                Q.{comandaData.productos?.reduce((sum, p) => 
                  sum + (p.price * p.quantity * (1 - (p.discount || 0) / 100)), 0
                ).toFixed(2) || '0.00'}
              </span>
            </div>
          </div>

          {/* Notas generales */}
          {comandaData.notas && (
            <div className="mb-4">
              <div className="border-b border-dashed border-gray-400 my-2"></div>
              <h3 className="font-bold mb-2">NOTAS ESPECIALES:</h3>
              <div className="text-sm bg-red-50 p-2 rounded border-l-4 border-red-400">
                {comandaData.notas}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-b border-dashed border-gray-400 my-2"></div>
          <div className="text-center text-xs text-gray-600">
            <div>Comanda generada: {formatDateTime(new Date())}</div>
            <div className="mt-2">
              ⚡ PREPARAR CON URGENCIA ⚡
            </div>
          </div>

          {/* Espacio para corte de papel */}
          <div className="h-8"></div>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end space-x-3 p-4 border-t print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Imprimir Comanda</span>
          </button>
        </div>
      </div>

      {/* Estilos para impresión */}
      <style jsx>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content,
          .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
          
          /* Estilos específicos para impresora térmica (80mm) */
          @page {
            size: 80mm auto;
            margin: 0;
          }
          
          body {
            font-size: 12px;
            font-family: 'Courier New', monospace;
            line-height: 1.2;
          }
        }
      `}</style>
    </div>
  );
};

export default PrintComanda;