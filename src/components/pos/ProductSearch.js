import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

const ProductSearch = ({
  vendors = [
    { code: 'vendor1', label: 'Juan Pérez', photo: 'https://via.placeholder.com/40' },
    { code: 'vendor2', label: 'María González', photo: 'https://via.placeholder.com/40' },
    { code: 'vendor3', label: 'Carlos Rodríguez', photo: 'https://via.placeholder.com/40' }
  ],
  selectedCategory = '',
  setSelectedCategory = () => {},
  isEditable = true,
  productSearch = '',
  setProductSearch = () => {},
  showProductSuggestions = false,
  setShowProductSuggestions = () => {},
  products = [
    { id: 1, label: 'Producto Demo 1', ref: 'P001', price_ttc: 50.00, stock: 10 },
    { id: 2, label: 'Producto Demo 2', ref: 'P002', price_ttc: 75.50, stock: 5 },
    { id: 3, label: 'Producto Demo 3', ref: 'P003', price_ttc: 120.00, stock: 0 }
  ],
  handleProductSelect = () => {},
  isMobile = false
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showVendorSelector, setShowVendorSelector] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    setIsAnimating(true);
  }, []);

  // Resetear búsqueda cuando se selecciona un producto
  const handleProductSelection = (product) => {
    handleProductSelect(product);
    setShowProductSuggestions(false);
    setProductSearch(''); // Limpiar el campo de búsqueda
    setTimeout(() => {
      searchInputRef.current?.focus(); // Volver a enfocar el input
    }, 100);
  };

  const handleProductSearchChange = (e) => {
    setProductSearch(e.target.value);
    if (e.target.value.length > 0) {
      setShowProductSuggestions(true);
    }
  };

  const getSelectedVendor = () => {
    return vendors.find(vendor => vendor.code === selectedCategory);
  };

  const selectedVendor = getSelectedVendor();

  // Mobile Product Modal - Simplificado
  const MobileProductModal = () => {
    if (!showProductSuggestions) return null;

    return (
      <>
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 z-[999] backdrop-blur-sm" 
          onClick={() => {
            setShowProductSuggestions(false);
            setSearchFocused(false);
          }}
        />
        
        <div className="fixed inset-x-2 top-20 bottom-20 bg-white rounded-xl z-[1000] overflow-hidden shadow-2xl">
          {/* Compact Header */}
          <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white p-3 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg">Productos ({products.length})</h3>
            </div>
            <button 
              onClick={() => {
                setShowProductSuggestions(false);
                setSearchFocused(false);
              }}
              className="p-1 hover:bg-white hover:bg-opacity-20 rounded-full"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Mobile Product List */}
          <div className="overflow-y-auto flex-1 p-2">
            {products.length > 0 ? (
              <div className="space-y-2">
                {products.map((product) => (
                  <button
                    key={product.id}
                    className="w-full p-3 text-left bg-white border border-gray-200 rounded-lg hover:bg-blue-50 transition-colors"
                    onClick={() => handleProductSelection(product)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm truncate">
                          {product.label}
                        </h4>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-500">
                            {product.ref || 'N/A'}
                          </span>
                          {product.stock !== undefined && (
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              product.stock > 0 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              Stock: {product.stock}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right ml-3">
                        <div className="font-bold text-green-600 text-sm">
                          Q.{parseFloat(product.price_ttc).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <MobileEmptySearchState />
            )}
          </div>

          {/* Mobile Footer */}
          <div className="bg-gray-50 p-3 border-t flex justify-between items-center">
            <span className="text-xs text-gray-600">
              {products.length > 0 ? 'Toca para agregar' : 'Sin resultados'}
            </span>
            <button
              onClick={() => {
                setProductSearch('');
                setShowProductSuggestions(false);
                searchInputRef.current?.focus();
              }}
              className="text-xs text-blue-600 font-medium"
            >
              Limpiar
            </button>
          </div>
        </div>
      </>
    );
  };

  // Desktop Product Modal - Original
  const DesktopProductModal = () => {
    if (!showProductSuggestions) return null;

    return (
      <>
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 z-[999] backdrop-blur-sm transition-opacity duration-300" 
          onClick={() => {
            setShowProductSuggestions(false);
            setSearchFocused(false);
          }}
        />
        
        <div className="fixed inset-x-4 top-1/2 transform -translate-y-1/2 bg-white rounded-2xl z-[1000] max-h-[80vh] overflow-hidden shadow-2xl animate-fadeInUp md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl">
          <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6">
            <div className="flex justify-between items-center">
              <div className="animate-fadeIn">
                <h3 className="text-xl font-bold">Productos Encontrados</h3>
                <p className="text-green-100 mt-1 opacity-90">
                  {products.length} {products.length === 1 ? 'producto encontrado' : 'productos encontrados'}
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowProductSuggestions(false);
                  setSearchFocused(false);
                }}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-all duration-200"
                aria-label="Cerrar búsqueda"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[60vh]">
            {products.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {products.map((product) => (
                  <button
                    key={product.id}
                    className="w-full p-4 text-left hover:bg-blue-50 transition-all duration-200 group"
                    onClick={() => handleProductSelection(product)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors truncate">
                              {product.label}
                            </h4>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                              <span className="text-sm text-gray-500">
                                Código: {product.ref || 'N/A'}
                              </span>
                              {product.stock !== undefined && (
                                <span className={`text-sm ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  Stock: {product.stock}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right ml-4">
                        <div className="text-lg font-bold text-green-600">
                          Q.{parseFloat(product.price_ttc).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {product.stock > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-green-100 text-green-800">
                              Disponible
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-100 text-red-800">
                              Agotado
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptySearchState />
            )}
          </div>

          <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {products.length > 0 ? 'Haz clic para agregar al carrito' : 'Intenta con otro término de búsqueda'}
            </p>
            <button
              onClick={() => {
                setProductSearch('');
                setShowProductSuggestions(false);
                searchInputRef.current?.focus();
              }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Limpiar búsqueda
            </button>
          </div>
        </div>
      </>
    );
  };

  const MobileEmptySearchState = () => (
    <div className="text-center py-8 px-4">
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <h3 className="font-semibold text-gray-900 mb-2 text-sm">Sin resultados</h3>
      <p className="text-gray-500 text-xs max-w-xs mx-auto mb-3">
        No encontramos productos que coincidan con "{productSearch}"
      </p>
      <button
        onClick={() => {
          setProductSearch('');
          searchInputRef.current?.focus();
        }}
        className="px-3 py-1 bg-blue-50 text-blue-600 rounded text-xs font-medium hover:bg-blue-100"
      >
        Intentar de nuevo
      </button>
    </div>
  );

  const EmptySearchState = () => (
    <div className="text-center py-8 px-4 animate-fadeIn">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin resultados</h3>
      <p className="text-gray-500 text-sm max-w-xs mx-auto">
        No encontramos productos que coincidan con "{productSearch}"
      </p>
      <button
        onClick={() => {
          setProductSearch('');
          searchInputRef.current?.focus();
        }}
        className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
      >
        Intentar de nuevo
      </button>
    </div>
  );

  // MOBILE VERSION - CORREGIDO
  if (isMobile) {
    return (
      <div className="space-y-3">
        {/* Compact Vendor Section - ÁREA COMPLETA CLICKEABLE */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Botón que abarca toda el área */}
          <button 
            className="w-full p-3 text-left hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setShowVendorSelector(!showVendorSelector)}
            disabled={!isEditable}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                
                {selectedVendor ? (
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <img 
                      src={selectedVendor.photo} 
                      alt={selectedVendor.label}
                      className="w-6 h-6 rounded-full border border-gray-300 object-cover flex-shrink-0"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/24';
                        e.target.onerror = null;
                      }}
                    />
                    <span className="font-medium text-gray-900 text-sm truncate">{selectedVendor.label}</span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">Seleccionar vendedor</span>
                )}
              </div>
              
              <div className="flex items-center space-x-2 flex-shrink-0">
                {selectedVendor && (
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                )}
                <svg 
                  className={`w-4 h-4 text-gray-400 transition-transform ${showVendorSelector ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </button>

          {/* Vendor Selector Dropdown */}
          {showVendorSelector && (
            <div className="px-3 pb-3 border-t border-gray-200">
              <select 
                className="w-full mt-3 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white" 
                value={selectedCategory} 
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setShowVendorSelector(false);
                }} 
                disabled={!isEditable}
              >
                <option disabled value="">Seleccionar Vendedor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.code} value={vendor.code}>
                    {vendor.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Compact Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>

            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Buscar productos..." 
              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={productSearch} 
              onChange={handleProductSearchChange}
              onFocus={() => {
                setShowProductSuggestions(true);
                setSearchFocused(true);
              }}
              onBlur={() => setSearchFocused(false)}
              disabled={!isEditable}
              autoComplete="off"
            />

            {productSearch && (
              <button
                onClick={() => {
                  setProductSearch('');
                  setShowProductSuggestions(false);
                  searchInputRef.current?.focus();
                }}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Mobile Search Status */}
          {productSearch && !showProductSuggestions && (
            <div className="mt-2 text-xs">
              {products.length > 0 ? (
                <div className="flex items-center space-x-1 text-green-600">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{products.length} encontrados - Toca para ver</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-gray-500">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6" />
                  </svg>
                  <span>Sin resultados</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Product Modal */}
        <MobileProductModal />
      </div>
    );
  }

  // DESKTOP VERSION - Original completo
  return (
    <div className={`w-full md:w-1/4 space-y-4 transform transition-all duration-300 ${
      isAnimating ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'
    }`}>
      
      {/* Header con animación */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl shadow-lg overflow-hidden animate-fadeIn">
        <div className="p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold">Buscar Productos</h2>
              <p className="text-green-100 opacity-90">Encuentra y agrega productos al carrito</p>
            </div>
          </div>
        </div>
      </div>

      {/* Vendor Selection mejorado */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fadeInUp">
        <div className="bg-gray-50 p-4 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="font-medium text-gray-700">Vendedor Asignado</span>
          </div>
        </div>
        
        <div className="p-4">
          {selectedVendor ? (
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200 transition-all hover:bg-blue-100 duration-200">
              <img 
                src={selectedVendor.photo} 
                alt={selectedVendor.label}
                className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/40';
                  e.target.onerror = null;
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{selectedVendor.label}</p>
                <p className="text-sm text-blue-600">Vendedor activo</p>
              </div>
              {isEditable && (
                <button 
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setSelectedCategory('')}
                  title="Cambiar vendedor"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
            </div>
          ) : (
            <select 
              className="select select-bordered w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)} 
              disabled={!isEditable}
            >
              <option disabled value="">Seleccionar Vendedor</option>
              {vendors.map((vendor) => (
                <option key={vendor.code} value={vendor.code}>
                  {vendor.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Product Search mejorado */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fadeInUp">
        <div className="bg-gray-50 p-4 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span className="font-medium text-gray-700">Catálogo de Productos</span>
          </div>
        </div>
        
        <div className="p-4">
          <div className="relative">
            <div className={`relative transition-all duration-200 ${searchFocused ? 'transform scale-105' : ''}`}>
              <span className="absolute inset-y-0 left-0 flex items-center pl-4">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>

              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Buscar por nombre, descripción o código..." 
                className="input input-bordered w-full pl-12 pr-10 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                value={productSearch} 
                onChange={handleProductSearchChange}
                onFocus={() => {
                  setShowProductSuggestions(true);
                  setSearchFocused(true);
                }}
                onBlur={() => setSearchFocused(false)}
                disabled={!isEditable}
                autoComplete="off"
              />

              {productSearch && (
                <button
                  onClick={() => {
                    setProductSearch('');
                    setShowProductSuggestions(false);
                    searchInputRef.current?.focus();
                  }}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Search Status mejorado */}
            {productSearch && !showProductSuggestions && (
              <div className="mt-3 text-sm text-gray-600 animate-fadeIn">
                {products.length > 0 ? (
                  <div className="flex items-center space-x-2 text-green-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{products.length} productos encontrados - Presiona Enter para ver</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Sin resultados para "{productSearch}"</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Access mejorado */}
      {!productSearch && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fadeInUp">
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Búsqueda Rápida</h3>
            <p className="text-sm text-gray-500 mb-4">
              Escribe el nombre o código del producto para encontrarlo instantáneamente
            </p>
            <div className="flex justify-center space-x-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                Por nombre
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                Por código
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      <DesktopProductModal />
    </div>
  );
};

ProductSearch.propTypes = {
  vendors: PropTypes.array.isRequired,
  selectedCategory: PropTypes.string,
  setSelectedCategory: PropTypes.func.isRequired,
  isEditable: PropTypes.bool,
  productSearch: PropTypes.string.isRequired,
  setProductSearch: PropTypes.func.isRequired,
  showProductSuggestions: PropTypes.bool.isRequired,
  setShowProductSuggestions: PropTypes.func.isRequired,
  products: PropTypes.array.isRequired,
  handleProductSelect: PropTypes.func.isRequired,
  isMobile: PropTypes.bool,
};

export default ProductSearch;