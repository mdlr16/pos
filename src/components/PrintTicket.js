import React from 'react';

const PrintTicket = ({ 
  ticketData, 
  onClose, 
  onPrint 
}) => {
  // Convertimos subtotal, discount y total a números
  const subtotal = parseFloat(ticketData.subtotal) || 0;
  const discount = parseFloat(ticketData.discount) || 0;
  const total = parseFloat(ticketData.total) || 0;

  const renderExtraFields = (extraFields) => {
    if (!extraFields || Object.keys(extraFields).length === 0) return null;

    return Object.entries(extraFields).map(([key, value]) => {
      const label = key
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

      const displayValue = typeof value === 'boolean' ? (value ? 'Sí' : 'No') : value;

      return `
        <div class="extra-field">
          <span class="extra-field-label">${label}:</span>
          <span class="extra-field-value">${displayValue}</span>
        </div>
      `;
    }).join('');
  };
  
  

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Ticket de Venta</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              width: 80mm;
              margin: 0 auto;
              padding: 8px;
            }
            .header {
              text-align: center;
              margin-bottom: 10px;
            }
            .company-name {
              font-size: 16px;
              font-weight: bold;
            }
            .divider {
              border-top: 1px dashed #000;
              margin: 5px 0;
            }
            .products-header {
              display: grid;
              grid-template-columns: 45% 20% 15% 20%;
              font-weight: bold;
              font-size: 12px;
              border-bottom: 1px dashed #000;
              margin-bottom: 5px;
              padding-bottom: 3px;
            }
            .product-row {
              display: grid;
              grid-template-columns: 45% 20% 15% 20%;
              margin: 3px 0;
              font-size: 12px;
            }
            .text-right {
              text-align: right;
            }
            .product-note {
              grid-column: 1 / -1;
              font-size: 10px;
              font-style: italic;
              color: #666;
              padding-left: 10px;
              margin-bottom: 3px;
            }
            .totals {
              margin-top: 10px;
              font-weight: bold;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin: 3px 0;
            }
            .footer {
              text-align: center;
              margin-top: 10px;
              font-size: 12px;
            }
            .extra-fields-section {
              margin: 10px 0;
              font-size: 12px;
            }
            .extra-field {
              margin: 3px 0;
            }
            .extra-field-label {
              font-weight: bold;
            }
            .extra-field-value {
              margin-left: 5px;
            }
            @media print {
              body {
                width: 80mm;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">${ticketData.company || 'Empresa'}</div>
            <div>${ticketData.terminal || ''}</div>
            <div>NIT: ${ticketData.nit || ''}</div>
            <div>${new Date().toLocaleString()}</div>
            <div>${ticketData.documentType} No. ${ticketData.ref || ''}</div>
          </div>
          
          <div class="divider"></div>
          <div>Cliente: ${ticketData.customerName || 'Cliente General'}</div>
          <div>NIT Cliente: ${ticketData.customerNit || 'CF'}</div>
          <div class="divider"></div>

          <div class="products-header">
            <div>Descripción</div>
            <div class="text-right">Precio</div>
            <div class="text-right">Cant.</div>
            <div class="text-right">Total</div>
          </div>

          ${ticketData.items.map(item => `
            <div class="product-row">
              <div>${item.name}</div>
              <div class="text-right">Q${parseFloat(item.price).toFixed(2)}</div>
              <div class="text-right">${item.quantity}</div>
              <div class="text-right">Q${(item.price * item.quantity * (1 - item.discount / 100)).toFixed(2)}</div>
            </div>
            ${item.note ? `<div class="product-note">Nota: ${item.note}</div>` : ''}
          `).join('')}

          <div class="divider"></div>
          
          <div class="totals">
            <div class="total-row">
              <div>Subtotal:</div>
              <div>Q${subtotal.toFixed(2)}</div>
            </div>
            <div class="total-row">
              <div>Descuento:</div>
              <div>Q${discount.toFixed(2)}</div>
            </div>
            <div class="total-row">
              <div>Total:</div>
              <div>Q${total.toFixed(2)}</div>
            </div>
          </div>

          ${ticketData.extraFields && Object.keys(ticketData.extraFields).length > 0 ? `
            <div class="divider"></div>
            <div class="extra-fields-section">
              <div style="text-align: center; font-weight: bold; margin-bottom: 5px;">
                Información Adicional
              </div>
              ${renderExtraFields(ticketData.extraFields)}
            </div>
          ` : ''}

          <div class="divider"></div>
          <div class="footer">
            <div>¡Gracias por su compra!</div>
            <div>Vendedor: ${ticketData.vendorName || ''}</div>
            ${ticketData.note ? `<div>Nota: ${ticketData.note}</div>` : ''}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-96 max-h-[90vh] overflow-y-auto">
        <div className="p-4">
          <div className="font-mono text-sm">
            <div className="text-center mb-4">
              <div className="font-bold text-lg">{ticketData.company}</div>
              <div>{ticketData.terminal}</div>
              <div>{ticketData.documentType} No. {ticketData.ref}</div>
              <div>{new Date().toLocaleString()}</div>
            </div>
            
            <div className="border-t border-b border-dashed py-2 my-2">
              <div>Cliente: {ticketData.customerName}</div>
              <div>NIT: {ticketData.customerNit}</div>
            </div>

            <div className="space-y-1">
              <div className="grid grid-cols-12 gap-2 font-bold text-xs pb-2 border-b border-dashed">
                <div className="col-span-5">Descripción</div>
                <div className="col-span-2 text-right">Precio</div>
                <div className="col-span-2 text-right">Cant.</div>
                <div className="col-span-3 text-right">Total</div>
              </div>

              {ticketData.items.map((item, index) => (
                <div key={index}>
                  <div className="grid grid-cols-12 gap-2 text-xs">
                    <div className="col-span-5">{item.name}</div>
                    <div className="col-span-2 text-right">Q{parseFloat(item.price).toFixed(2)}</div>
                    <div className="col-span-2 text-right">{item.quantity}</div>
                    <div className="col-span-3 text-right">
                      Q{(parseFloat(item.price) * item.quantity * (1 - item.discount / 100)).toFixed(2)}
                    </div>
                  </div>
                  {item.note && (
                    <div className="text-xs italic text-gray-500 pl-4 mt-1">
                      Nota: {item.note}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-dashed mt-4 pt-2">
              <div className="flex justify-between text-sm">
                <div>Subtotal:</div>
                <div>Q{subtotal.toFixed(2)}</div>
              </div>
              <div className="flex justify-between text-sm">
                <div>Descuento:</div>
                <div>Q{discount.toFixed(2)}</div>
              </div>
              <div className="flex justify-between font-bold text-sm mt-1">
                <div>Total:</div>
                <div>Q{total.toFixed(2)}</div>
              </div>
            </div>

            {ticketData.extraFields && Object.keys(ticketData.extraFields).length > 0 && (
              <div className="border-t border-dashed mt-4 pt-2">
                <div className="text-center font-bold text-sm mb-2">
                  Información Adicional
                </div>
                {Object.entries(ticketData.extraFields).map(([key, value], index) => {
                  const label = key
                    .replace(/_/g, ' ')
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' ');
                  const displayValue = typeof value === 'boolean' ? (value ? 'Sí' : 'No') : value;
                  
                  return (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="font-semibold">{label}:</span>
                      <span>{displayValue}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="text-center mt-4 text-xs">
              <div>¡Gracias por su compra!</div>
              <div>Vendedor: {ticketData.vendorName}</div>
              {ticketData.note && <div className="mt-2">Nota: {ticketData.note}</div>}
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-4">
            <button 
              className="btn btn-primary btn-sm"
              onClick={handlePrint}
            >
              Imprimir
            </button>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintTicket;
