import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// Hook personalizado para manejar estado local con sincronización diferida
const useLocalState = (initialValue, onSave, delay = 300) => {
  const [localValue, setLocalValue] = useState(initialValue);
  const timeoutRef = useRef(null);

  useEffect(() => {
    setLocalValue(initialValue);
  }, [initialValue]);

  const updateValue = useCallback((newValue) => {
    setLocalValue(newValue);
    
    // Cancelar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Programar nueva sincronización
    timeoutRef.current = setTimeout(() => {
      onSave(newValue);
    }, delay);
  }, [onSave, delay]);

  const saveImmediately = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    onSave(localValue);
  }, [onSave, localValue]);

  return [localValue, updateValue, saveImmediately];
};

// Componente para manejar inputs individuales
const CartItemInput = React.memo(({ 
  type, 
  value, 
  onSave, 
  disabled, 
  className, 
  placeholder,
  min,
  max,
  step,
  ...props 
}) => {
  const [localValue, updateValue, saveImmediately] = useLocalState(value, onSave);

  return (
    <input
      type={type}
      value={localValue}
      onChange={(e) => updateValue(e.target.value)}
      onBlur={saveImmediately}
      onKeyPress={(e) => {
        if (e.key === 'Enter') {
          saveImmediately();
          e.target.blur();
        }
      }}
      disabled={disabled}
      className={className}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      {...props}
    />
  );
});

// Componente para textarea de notas
const NotesTextarea = React.memo(({ 
  value, 
  onSave, 
  isExpanded, 
  isMobile, 
  isEditable 
}) => {
  const [localValue, updateValue, saveImmediately] = useLocalState(value || '', onSave, 500);

  const baseClassName = `w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all ${
    !isEditable ? 'bg-gray-100 cursor-not-allowed' : ''
  }`;

  const heightClass = isMobile 
    ? (isExpanded ? 'h-16' : 'h-8') 
    : (isExpanded ? 'h-24' : 'h-12');

  return (
    <textarea
      className={`${baseClassName} ${heightClass}`}
      placeholder={isEditable ? (isMobile ? "Notas del producto..." : "Agregar notas específicas para este producto...") : ""}
      value={localValue}
      onChange={(e) => updateValue(e.target.value)}
      onBlur={saveImmediately}
      disabled={!isEditable}
    />
  );
});

// Componente individual del carrito optimizado
const CartItem = React.memo(({ 
  item, 
  index, 
  isMobile,
  isEditable,
  expandedNotes,
  expandedItems,
  onToggleNote,
  onToggleItem,
  onQuantityChange,
  onDiscountChange,
  onSubtotalChange,
  onNoteChange,
  onRemove
}) => {
  const isNoteExpanded = expandedNotes.has(index);
  const isItemExpanded = expandedItems.has(index);
  const defaultSubtotal = (item.price * (item.quantity || 0) * (1 - (item.discount || 0) / 100)).toFixed(2);

  // Handlers estables para este item
  const handleQuantityChange = useCallback((value) => {
    onQuantityChange(index, value);
  }, [index, onQuantityChange]);

  const handleDiscountChange = useCallback((value) => {
    onDiscountChange(index, value);
  }, [index, onDiscountChange]);

  const handleSubtotalChange = useCallback((value) => {
    onSubtotalChange(index, value);
  }, [index, onSubtotalChange]);

  const handleNoteChange = useCallback((value) => {
    onNoteChange(index, value);
  }, [index, onNoteChange]);

  const handleRemove = useCallback(() => {
    onRemove(index);
  }, [index, onRemove]);

  const handleToggleNote = useCallback(() => {
    onToggleNote(index);
  }, [index, onToggleNote]);

  const handleToggleItem = useCallback(() => {
    onToggleItem(index);
  }, [index, onToggleItem]);

  if (isMobile) {
    return (
      <div className={`bg-white border rounded-lg shadow-sm mb-3 overflow-hidden ${
        !item.hasStock ? 'border-red-200 bg-red-50' : 'border-gray-200'
      }`}>
        
        {/* Mobile Header */}
        <div className={`p-3 ${!item.hasStock ? 'bg-red-100' : 'bg-gray-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                {!item.hasStock && (
                  <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                    </svg>
                  </div>
                )}
                <h3 className={`font-semibold text-sm truncate ${!item.hasStock ? 'text-red-700' : 'text-gray-900'}`}>
                  {item.name}
                </h3>
              </div>
              <p className={`text-xs ${!item.hasStock ? 'text-red-600' : 'text-gray-500'}`}>
                {item.ref || 'N/A'}
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <button 
                className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                onClick={handleToggleItem}
                type="button"
              >
                <svg className={`w-4 h-4 transition-transform ${isItemExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <button 
                className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                onClick={handleRemove}
                disabled={!isEditable}
                type="button"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Controls */}
        <div className="p-3 bg-white">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <label className="block text-gray-600 mb-1 font-medium">Cant.</label>
              <CartItemInput
                type="number"
                min="1"
                value={item.quantity || ''}
                onSave={handleQuantityChange}
                disabled={!isEditable}
                className={`w-full px-2 py-2 border border-gray-300 rounded text-center font-semibold focus:ring-1 focus:ring-blue-500 focus:border-transparent ${
                  !isEditable ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                placeholder="1"
              />
            </div>

            <div>
              <label className="block text-gray-600 mb-1 font-medium">Desc. %</label>
              <CartItemInput
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={item.discount || ''}
                onSave={handleDiscountChange}
                disabled={!isEditable}
                className={`w-full px-2 py-2 border border-gray-300 rounded text-center focus:ring-1 focus:ring-blue-500 focus:border-transparent ${
                  !isEditable ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-gray-600 mb-1 font-medium">Total</label>
              <CartItemInput
                type="number"
                min="0"
                step="0.01"
                value={item.subtotal !== undefined ? item.subtotal : defaultSubtotal}
                onSave={handleSubtotalChange}
                disabled={!isEditable}
                className={`w-full px-2 py-2 border border-gray-300 rounded text-center font-semibold text-green-600 focus:ring-1 focus:ring-blue-500 focus:border-transparent ${
                  !isEditable ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Mobile Expanded Controls */}
          {isItemExpanded && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-600 flex items-center space-x-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" />
                    </svg>
                    <span>Notas</span>
                  </label>
                  {(item.note || '').length > 0 && (
                    <button
                      onClick={handleToggleNote}
                      className="text-xs text-blue-600 hover:text-blue-800"
                      type="button"
                    >
                      {isNoteExpanded ? 'Contraer' : 'Expandir'}
                    </button>
                  )}
                </div>
                <NotesTextarea
                  value={item.note}
                  onSave={handleNoteChange}
                  isExpanded={isNoteExpanded}
                  isMobile={true}
                  isEditable={isEditable}
                />
              </div>
            </div>
          )}

          {!item.hasStock && (
            <div className="mt-2 text-xs text-red-600 font-medium">
              ⚠️ Sin stock
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className={`bg-white border rounded-xl shadow-sm mb-4 overflow-hidden transition-all duration-200 ${
      !item.hasStock ? 'border-red-200 bg-red-50' : 'border-gray-200 hover:shadow-md'
    }`}>
      {/* Desktop Header */}
      <div className={`p-4 border-b ${!item.hasStock ? 'bg-red-100 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              {!item.hasStock && (
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              )}
              <h3 className={`font-semibold ${!item.hasStock ? 'text-red-700' : 'text-gray-900'}`}>
                {item.name}
              </h3>
            </div>
            <p className={`text-sm ${!item.hasStock ? 'text-red-600' : 'text-gray-500'}`}>
              Código: {item.ref || 'N/A'}
            </p>
            {!item.hasStock && (
              <div className="mt-2 text-sm text-red-600 font-medium">
                ⚠️ Producto sin stock disponible
              </div>
            )}
          </div>
          
          <button 
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            onClick={handleRemove}
            disabled={!isEditable}
            title="Eliminar producto"
            type="button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Desktop Controls */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
                <span>Cantidad</span>
              </div>
            </label>
            <CartItemInput
              type="number"
              min="1"
              value={item.quantity || ''}
              onSave={handleQuantityChange}
              disabled={!isEditable}
              className={`input input-bordered w-full text-center text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                !isEditable ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
              placeholder="1"
            />
          </div>

          {/* Discount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span>Descuento</span>
              </div>
            </label>
            <div className="relative">
              <CartItemInput
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={item.discount || ''}
                onSave={handleDiscountChange}
                disabled={!isEditable}
                className={`input input-bordered w-full text-center pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  !isEditable ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">%</span>
            </div>
          </div>

          {/* Subtotal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <span>Subtotal</span>
              </div>
            </label>
            <div className="relative">
              <CartItemInput
                type="number"
                min="0"
                step="0.01"
                value={item.subtotal !== undefined ? item.subtotal : defaultSubtotal}
                onSave={handleSubtotalChange}
                disabled={!isEditable}
                className={`input input-bordered w-full text-right pl-8 font-semibold text-green-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  !isEditable ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                placeholder="0.00"
              />
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">Q</span>
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Notas del producto</span>
              </div>
            </label>
            {(item.note || '').length > 0 && (
              <button
                onClick={handleToggleNote}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                type="button"
              >
                {isNoteExpanded ? 'Contraer' : 'Expandir'}
              </button>
            )}
          </div>
          <NotesTextarea
            value={item.note}
            onSave={handleNoteChange}
            isExpanded={isNoteExpanded}
            isMobile={false}
            isEditable={isEditable}
          />
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Comparación profunda optimizada
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.quantity === nextProps.item.quantity &&
    prevProps.item.discount === nextProps.item.discount &&
    prevProps.item.subtotal === nextProps.item.subtotal &&
    prevProps.item.note === nextProps.item.note &&
    prevProps.item.hasStock === nextProps.item.hasStock &&
    prevProps.isEditable === nextProps.isEditable &&
    prevProps.isMobile === nextProps.isMobile &&
    prevProps.expandedNotes === nextProps.expandedNotes &&
    prevProps.expandedItems === nextProps.expandedItems
  );
});

const CartTable = ({
  cart,
  setCart,
  isEditable,
  handleQuantityChange,
  handleDiscountChange,
  handleSubtotalChange,
  handleNoteChange,
  handleRemoveProduct,
  handleSuspend,
  handleOpenSuspendedModal,
  isMobile = false
}) => {
  const [expandedNotes, setExpandedNotes] = useState(new Set());
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(true);
  }, []);

  // Handlers estables
  const toggleNoteExpansion = useCallback((index) => {
    setExpandedNotes(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(index)) {
        newExpanded.delete(index);
      } else {
        newExpanded.add(index);
      }
      return newExpanded;
    });
  }, []);

  const toggleItemExpansion = useCallback((index) => {
    setExpandedItems(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(index)) {
        newExpanded.delete(index);
      } else {
        newExpanded.add(index);
      }
      return newExpanded;
    });
  }, []);

  // Handlers que actualizan el carrito inmediatamente
  const handleQuantityChangeLocal = useCallback((index, value) => {
    const newCart = [...cart];
    newCart[index] = { ...newCart[index], quantity: value };
    setCart(newCart);
    
    // Llamar al handler del padre si existe
    if (handleQuantityChange) {
      handleQuantityChange(index, value);
    }
  }, [cart, setCart, handleQuantityChange]);

  const handleDiscountChangeLocal = useCallback((index, value) => {
    const newCart = [...cart];
    newCart[index] = { ...newCart[index], discount: value };
    setCart(newCart);
    
    if (handleDiscountChange) {
      handleDiscountChange(index, value);
    }
  }, [cart, setCart, handleDiscountChange]);

  const handleSubtotalChangeLocal = useCallback((index, value) => {
    const newCart = [...cart];
    newCart[index] = { ...newCart[index], subtotal: value };
    setCart(newCart);
    
    if (handleSubtotalChange) {
      handleSubtotalChange(index, value);
    }
  }, [cart, setCart, handleSubtotalChange]);

  const handleNoteChangeLocal = useCallback((index, value) => {
    const newCart = [...cart];
    newCart[index] = { ...newCart[index], note: value };
    setCart(newCart);
    
    if (handleNoteChange) {
      handleNoteChange(index, value);
    }
  }, [cart, setCart, handleNoteChange]);

  // Empty Cart State
  const EmptyCartState = useMemo(() => (
    <div className={`flex flex-col items-center justify-center ${isMobile ? 'py-8 px-4' : 'py-16 px-4'}`}>
      <div className={`${isMobile ? 'w-16 h-16' : 'w-24 h-24'} bg-gray-100 rounded-full flex items-center justify-center mb-4`}>
        <svg className={`${isMobile ? 'w-8 h-8' : 'w-12 h-12'} text-gray-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13v6a2 2 0 002 2h6a2 2 0 002-2v-6m-8 0h8" />
        </svg>
      </div>
      <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-gray-900 mb-2`}>Carrito vacío</h3>
      <p className={`text-gray-500 text-center max-w-sm ${isMobile ? 'text-sm' : ''}`}>
        {isMobile ? 'Busca productos para agregar' : 'Agrega productos desde el buscador para comenzar una nueva venta'}
      </p>
    </div>
  ), [isMobile]);

  // Renderizado principal
  if (isMobile) {
    return (
      <div className="space-y-3">
        {/* Mobile Header */}
        {cart.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13v6a2 2 0 002 2h6a2 2 0 002-2v-6m-8 0h8" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Carrito</h3>
                <p className="text-xs text-gray-500">
                  {cart.length} producto{cart.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Items</p>
              <p className="font-bold text-gray-900">
                {cart.reduce((sum, item) => sum + parseInt(item.quantity || 0), 0)}
              </p>
            </div>
          </div>
        )}

        {/* Mobile Cart Items */}
        <div className={`${cart.length > 0 ? 'max-h-96 overflow-y-auto' : ''}`}>
          {cart.length === 0 ? (
            EmptyCartState
          ) : (
            <div className="space-y-2">
              {cart.map((item, index) => (
                <CartItem
                  key={item.id ? `${item.id}-${index}` : `item-${index}`}
                  item={item}
                  index={index}
                  isMobile={true}
                  isEditable={isEditable}
                  expandedNotes={expandedNotes}
                  expandedItems={expandedItems}
                  onToggleNote={toggleNoteExpansion}
                  onToggleItem={toggleItemExpansion}
                  onQuantityChange={handleQuantityChangeLocal}
                  onDiscountChange={handleDiscountChangeLocal}
                  onSubtotalChange={handleSubtotalChangeLocal}
                  onNoteChange={handleNoteChangeLocal}
                  onRemove={handleRemoveProduct}
                />
              ))}
            </div>
          )}
        </div>

        {/* Mobile Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button 
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg p-2 transition-colors text-sm font-medium"
            onClick={handleSuspend}
            type="button"
          >
            <div className="flex items-center justify-center space-x-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Suspender</span>
            </div>
          </button>
          
          <button 
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-2 transition-colors text-sm font-medium"
            onClick={handleOpenSuspendedModal}
            type="button"
          >
            <div className="flex items-center justify-center space-x-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>Suspendidos</span>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className={`w-full md:w-2/4 space-y-4 transform transition-all duration-300 ${
      isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
    }`}>
      
      {/* Desktop Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13v6a2 2 0 002 2h6a2 2 0 002-2v-6m-8 0h8" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold">Carrito de Compras</h2>
                <p className="text-blue-100">
                  {cart.length} {cart.length === 1 ? 'producto' : 'productos'} agregados
                </p>
              </div>
            </div>
            
            {cart.length > 0 && (
              <div className="text-right">
                <p className="text-sm text-blue-100">Total de items</p>
                <p className="text-2xl font-bold">
                  {cart.reduce((sum, item) => sum + parseInt(item.quantity || 0), 0)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Cart Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto p-4">
          {cart.length === 0 ? (
            EmptyCartState
          ) : (
            <div className="space-y-4">
              {cart.map((item, index) => (
                <CartItem
                  key={item.id ? `${item.id}-${index}` : `item-${index}`}
                  item={item}
                  index={index}
                  isMobile={false}
                  isEditable={isEditable}
                  expandedNotes={expandedNotes}
                  expandedItems={expandedItems}
                  onToggleNote={toggleNoteExpansion}
                  onToggleItem={toggleItemExpansion}
                  onQuantityChange={handleQuantityChangeLocal}
                  onDiscountChange={handleDiscountChangeLocal}
                  onSubtotalChange={handleSubtotalChangeLocal}
                  onNoteChange={handleNoteChangeLocal}
                  onRemove={handleRemoveProduct}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button 
          className="btn btn-outline btn-warning flex items-center justify-center space-x-2 py-3 transition-all hover:scale-105"
          onClick={handleSuspend}
          type="button"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Suspender Venta</span>
        </button>
        
        <button 
          className="btn btn-outline btn-info flex items-center justify-center space-x-2 py-3 transition-all hover:scale-105"
          onClick={handleOpenSuspendedModal}
          type="button"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span>Ver Suspendidas</span>
        </button>
      </div>
    </div>
  );
};

export default CartTable;