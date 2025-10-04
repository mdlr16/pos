import React from 'react';

const EmptyState = ({ message }) => (
  <div className="flex flex-col items-center justify-center p-8">
    <div className="text-gray-400">
      <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <p className="text-center text-gray-500">{message}</p>
    </div>
  </div>
);

const SaleItem = ({ item, type, onSelect }) => (
  <div className="card bg-base-100 shadow-sm hover:shadow-md transition-all duration-200">
    <div className="card-body p-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold">{type} #{item.id}</h3>
            <span className="badge badge-ghost text-xs">
              {item.fecha || 'Sin fecha'}
            </span>
          </div>
          <p className="text-sm opacity-75">Cliente: {item.cliente}</p>
          <p className="text-lg font-semibold text-primary">
            Q{parseFloat(item.total).toFixed(2)}
          </p>
        </div>
        <button 
          className="btn btn-primary btn-sm"
          onClick={() => onSelect(item)}
        >
          Seleccionar
        </button>
      </div>
    </div>
  </div>
);

const SalesHistoryModal = ({
  isOpen,
  onClose,
  salesData,
  activeTab,
  setActiveTab,
  onSelectItem
}) => {
  if (!isOpen) return null;

  const tabs = [
    { id: 'Cotizaciones', label: 'Cotizaciones', data: salesData.cotizaciones },
    { id: 'Pedidos', label: 'Pedidos', data: salesData.pedidos },
    { id: 'Facturas', label: 'Facturas', data: salesData.facturas }
  ];

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 md:w-3/4 max-w-4xl h-[80vh] p-0">
        {/* Header con título y botón de cierre */}
        <div className="sticky top-0 z-10 bg-base-100 border-b">
          <div className="p-4 flex justify-between items-center">
            <h2 className="text-xl font-bold">Historial de Ventas</h2>
            <button 
              className="btn btn-sm btn-circle btn-ghost"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
          
          {/* Tabs mejorados */}
          <div className="tabs tabs-boxed bg-base-200 p-2 flex justify-center gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`tab ${activeTab === tab.id ? 'tab-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="flex items-center gap-2">
                  {tab.label}
                  {tab.data.length > 0 && (
                    <span className="badge badge-sm">{tab.data.length}</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Contenido con scroll */}
        <div className="overflow-y-auto p-4" style={{ height: 'calc(80vh - 130px)' }}>
          <div className="space-y-4">
            {tabs.map(tab => (
              activeTab === tab.id && (
                <div key={tab.id} className="space-y-4">
                  {tab.data.length > 0 ? (
                    tab.data.map((item, index) => (
                      <SaleItem
                        key={index}
                        item={item}
                        type={tab.id.slice(0, -1)}
                        onSelect={onSelectItem}
                      />
                    ))
                  ) : (
                    <EmptyState message={`No hay ${tab.id.toLowerCase()} disponibles.`} />
                  )}
                </div>
              )
            ))}
          </div>
        </div>
      </div>
      
      {/* Overlay con click para cerrar */}
      <div className="modal-backdrop bg-black/50" onClick={onClose} />
    </div>
  );
};

export default SalesHistoryModal;