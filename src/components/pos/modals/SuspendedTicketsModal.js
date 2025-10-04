import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Edit3, Trash2, Clock, User, Calendar, DollarSign, Package, FileText, ShoppingCart, Receipt } from 'lucide-react';

const SuspendedTicketsModal = ({
  isOpen,
  onClose,
  suspendedTickets = [],
  handleEditTicket,
  onReactivateTicket,
  onDeleteTicket,
  isLoading = false
}) => {
  const [expandedTicket, setExpandedTicket] = useState(null);
  const [selectedAction, setSelectedAction] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  if (!isOpen) return null;

  const getDocumentTypeInfo = (type) => {
    switch (String(type)) {
      case "0":
      case "4":
        return { 
          label: 'Cotización', 
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: <FileText className="w-4 h-4" />
        };
      case "2":
        return { 
          label: 'Pedido', 
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: <ShoppingCart className="w-4 h-4" />
        };
      case "3":
        return { 
          label: 'Factura', 
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: <Receipt className="w-4 h-4" />
        };
      default:
        return { 
          label: 'Suspendido', 
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: <Clock className="w-4 h-4" />
        };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Sin fecha';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysSuspended = (dateString) => {
    if (!dateString) return 0;
    const suspendedDate = new Date(dateString);
    const now = new Date();
    return Math.floor((now - suspendedDate) / (1000 * 60 * 60 * 24));
  };

  const handleReactivate = (ticket, newType) => {
    if (onReactivateTicket) {
      onReactivateTicket(ticket, newType);
    }
    setSelectedAction({});
  };

  const handleDelete = (ticket) => {
    if (onDeleteTicket) {
      onDeleteTicket(ticket);
    }
    setShowDeleteConfirm(null);
  };

  const toggleExpanded = (ticketId) => {
    setExpandedTicket(expandedTicket === ticketId ? null : ticketId);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-60 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Clock className="w-6 h-6" />
            <div>
              <h2 className="text-2xl font-bold">Tickets Suspendidos</h2>
              <p className="text-purple-100">
                {suspendedTickets.length} documento{suspendedTickets.length !== 1 ? 's' : ''} pendiente{suspendedTickets.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-gray-600">Cargando tickets...</span>
            </div>
          ) : suspendedTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Clock className="w-16 h-16 mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">No hay tickets suspendidos</h3>
              <p>Todos los tickets han sido procesados</p>
            </div>
          ) : (
            <div className="space-y-4">
              {suspendedTickets.map((ticket, index) => {
                const docType = getDocumentTypeInfo(ticket.type);
                const daysSuspended = getDaysSuspended(ticket.date);
                const isExpanded = expandedTicket === ticket.id;

                return (
                  <div key={ticket.id || index} className="border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    {/* Ticket Header */}
                    <div className="p-4 bg-gray-50 rounded-t-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`px-3 py-1 rounded-full border text-sm font-medium flex items-center space-x-1 ${docType.color}`}>
                            {docType.icon}
                            <span>{docType.label}</span>
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-gray-800">
                              {ticket.ref || `SUSP-${ticket.id}`}
                            </h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <div className="flex items-center space-x-1">
                                <User className="w-4 h-4" />
                                <span>{ticket.customer || ticket.customerName || 'Cliente'}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-4 h-4" />
                                <span>{formatDate(ticket.date)}</span>
                              </div>
                              {daysSuspended > 0 && (
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-4 h-4" />
                                  <span>{daysSuspended} día{daysSuspended !== 1 ? 's' : ''}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="flex items-center space-x-1 text-lg font-bold text-green-600">
                              <DollarSign className="w-5 h-5" />
                              <span>Q{parseFloat(ticket.total || ticket.total_ttc || 0).toFixed(2)}</span>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => toggleExpanded(ticket.id)}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="p-4 border-t bg-white">
                        {/* Ticket Details */}
                        {ticket.note && (
                          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                            <h4 className="font-semibold text-gray-700 mb-1">Notas:</h4>
                            <p className="text-gray-600">{ticket.note}</p>
                          </div>
                        )}

                        {/* Items (if available) */}
                        {ticket.lines && ticket.lines.length > 0 && (
                          <div className="mb-4">
                            <h4 className="font-semibold text-gray-700 mb-2 flex items-center">
                              <Package className="w-4 h-4 mr-1" />
                              Productos ({ticket.lines.length})
                            </h4>
                            <div className="space-y-2">
                              {ticket.lines.slice(0, 3).map((line, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                                  <span>{line.description || line.label}</span>
                                  <span className="font-medium">
                                    {line.qty || 1}x Q{parseFloat(line.price || 0).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                              {ticket.lines.length > 3 && (
                                <div className="text-center text-gray-500 text-sm">
                                  +{ticket.lines.length - 3} producto{ticket.lines.length - 3 !== 1 ? 's' : ''} más
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="p-4 bg-gray-50 rounded-b-lg border-t">
                      <div className="flex items-center justify-between">
                        <div className="flex space-x-2">
                          {/* Edit Button */}
                          <button 
                            onClick={() => handleEditTicket(ticket)}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                          >
                            <Edit3 className="w-4 h-4 mr-1" />
                            Editar
                          </button>

                          {/* Delete Button */}
                          <button 
                            onClick={() => setShowDeleteConfirm(ticket.id)}
                            className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Eliminar
                          </button>
                        </div>

                        {/* Reactivate Actions */}
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleReactivate(ticket, 'cotizacion')}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            Cotización
                          </button>
                          <button 
                            onClick={() => handleReactivate(ticket, 'pedido')}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                          >
                            <ShoppingCart className="w-4 h-4 mr-1" />
                            Pedido
                          </button>
                          <button 
                            onClick={() => handleReactivate(ticket, 'factura')}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                          >
                            <Receipt className="w-4 h-4 mr-1" />
                            Factura
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Delete Confirmation */}
                    {showDeleteConfirm === ticket.id && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10 rounded-lg">
                        <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm">
                          <h3 className="text-lg font-semibold mb-4">Confirmar Eliminación</h3>
                          <p className="text-gray-600 mb-4">
                            ¿Estás seguro de que quieres eliminar el ticket <strong>{ticket.ref}</strong>? 
                            Esta acción no se puede deshacer.
                          </p>
                          <div className="flex space-x-3">
                            <button 
                              onClick={() => handleDelete(ticket)}
                              className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                            >
                              Eliminar
                            </button>
                            <button 
                              onClick={() => setShowDeleteConfirm(null)}
                              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {suspendedTickets.length > 0 && (
              <span>
                Total: Q{suspendedTickets.reduce((sum, ticket) => sum + parseFloat(ticket.total || ticket.total_ttc || 0), 0).toFixed(2)}
              </span>
            )}
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuspendedTicketsModal;