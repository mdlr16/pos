import React, { useState, useRef, useCallback } from 'react';

const RestaurantVisualLayout = ({ 
  layoutConfig,
  mesasConfig, 
  mesas, 
  elementosDecorativos,
  backgroundImage,
  ESTADOS_MESA, 
  onMesaClick, 
  onConfigClick,
  onUploadImage,
  onUpdateMesaPosition,
  onCreateMesa,
  onDeleteMesa,
  estadisticas,
  isEditorMode,
  setIsEditorMode
}) => {
  
  const [draggedMesa, setDraggedMesa] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  // Obtener estado operativo de una mesa
  const getMesaEstado = (numeroMesa) => {
    const mesa = mesas.find(m => m.numero === numeroMesa);
    return mesa ? mesa.estado : 'LIBRE';
  };

  // Obtener datos operativos de una mesa
  const getMesaData = (numeroMesa) => {
    return mesas.find(m => m.numero === numeroMesa);
  };

  // ============================================================================
  // MANEJO DE IMAGEN DE FONDO
  // ============================================================================

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setShowImageUpload(true);
    }
  };

  const confirmImageUpload = async () => {
    if (selectedFile && onUploadImage) {
      const result = await onUploadImage(selectedFile);
      if (result.success) {
        setShowImageUpload(false);
        setSelectedFile(null);
      }
    }
  };

  // ============================================================================
  // MANEJO DE DRAG & DROP
  // ============================================================================

  const handleMouseDown = useCallback((e, mesa) => {
    if (!isEditorMode) return;

    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const offsetX = e.clientX - rect.left - mesa.pos_x;
    const offsetY = e.clientY - rect.top - mesa.pos_y;

    setDraggedMesa(mesa);
    setDragOffset({ x: offsetX, y: offsetY });
  }, [isEditorMode]);

  const handleMouseMove = useCallback((e) => {
    if (!draggedMesa || !isEditorMode) return;

    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const newX = Math.max(0, Math.min(
      (layoutConfig?.background_width || 1000) - draggedMesa.ancho,
      e.clientX - rect.left - dragOffset.x
    ));
    const newY = Math.max(0, Math.min(
      (layoutConfig?.background_height || 600) - draggedMesa.alto,
      e.clientY - rect.top - dragOffset.y
    ));

    // Actualizar posición temporalmente en UI
    setDraggedMesa({ ...draggedMesa, pos_x: newX, pos_y: newY });
  }, [draggedMesa, dragOffset, isEditorMode, layoutConfig]);

  const handleMouseUp = useCallback(async () => {
    if (!draggedMesa || !isEditorMode) return;

    // Guardar nueva posición en BD
    if (onUpdateMesaPosition) {
      await onUpdateMesaPosition(draggedMesa.rowid, draggedMesa.pos_x, draggedMesa.pos_y);
    }

    setDraggedMesa(null);
    setDragOffset({ x: 0, y: 0 });
  }, [draggedMesa, isEditorMode, onUpdateMesaPosition]);

  // Eventos globales de mouse
  React.useEffect(() => {
    if (isEditorMode) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isEditorMode, handleMouseMove, handleMouseUp]);

  // ============================================================================
  // RENDERIZADO DE ELEMENTOS
  // ============================================================================

  // Renderizar mesa individual
  const renderMesa = (mesaConfig) => {
    const estado = getMesaEstado(mesaConfig.numero);
    const mesaData = getMesaData(mesaConfig.numero);
    const estadoInfo = ESTADOS_MESA[estado];
    
    // Si es la mesa que estamos arrastrando, usar posición temporal
    const mesa = draggedMesa?.rowid === mesaConfig.rowid ? draggedMesa : mesaConfig;

    const mesaStyle = {
      position: 'absolute',
      left: `${mesa.pos_x}px`,
      top: `${mesa.pos_y}px`,
      width: `${mesa.ancho}px`,
      height: `${mesa.alto}px`,
      backgroundColor: estado === 'LIBRE' ? '#10B981' : estado === 'OCUPADA' ? '#F59E0B' : '#EF4444',
      border: `3px solid ${estado === 'LIBRE' ? '#059669' : estado === 'OCUPADA' ? '#D97706' : '#DC2626'}`,
      borderRadius: mesaConfig.tipo_mesa === 'circular' ? '50%' : '8px',
      cursor: isEditorMode ? 'move' : 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      fontWeight: 'bold',
      color: 'white',
      textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
      userSelect: 'none',
      transition: draggedMesa?.rowid === mesaConfig.rowid ? 'none' : 'all 0.2s ease',
      boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
      zIndex: draggedMesa?.rowid === mesaConfig.rowid ? 1000 : 10
    };

    return (
      <div
        key={mesaConfig.rowid}
        style={mesaStyle}
        onMouseDown={isEditorMode ? (e) => handleMouseDown(e, mesaConfig) : undefined}
        onClick={!isEditorMode ? () => onMesaClick(mesaConfig, mesaData, estado) : undefined}
        title={`${mesaConfig.nombre} - ${estadoInfo.name} - Capacidad: ${mesaConfig.capacidad}`}
      >
        {/* Número de mesa */}
        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
          {mesaConfig.numero}
        </div>
        
        {/* Nombre de mesa */}
        <div style={{ fontSize: '10px', marginTop: '2px' }}>
          {mesaConfig.nombre}
        </div>
        
        {/* Información operativa */}
        {estado !== 'LIBRE' && mesaData && (
          <div style={{ fontSize: '9px', marginTop: '2px', textAlign: 'center' }}>
            {mesaData.total > 0 && <div>Q.{mesaData.total.toFixed(0)}</div>}
            {mesaData.productos?.length > 0 && <div>{mesaData.productos.length} items</div>}
          </div>
        )}

        {/* Botón eliminar en modo editor */}
        {isEditorMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteMesa && onDeleteMesa(mesaConfig.rowid);
            }}
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: '#EF4444',
              border: 'none',
              color: 'white',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        )}
      </div>
    );
  };

  // Renderizar elementos decorativos
  const renderElementoDecorativo = (elemento) => {
    const elementStyle = {
      position: 'absolute',
      left: `${elemento.pos_x}px`,
      top: `${elemento.pos_y}px`,
      width: `${elemento.ancho}px`,
      height: `${elemento.alto}px`,
      color: elemento.color,
      backgroundColor: elemento.background_color,
      fontSize: `${elemento.font_size}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      pointerEvents: 'none',
      zIndex: 5
    };

    if (elemento.tipo === 'rectangulo') {
      elementStyle.backgroundColor = elemento.color;
      elementStyle.borderRadius = '4px';
    } else if (elemento.tipo === 'circulo') {
      elementStyle.backgroundColor = elemento.color;
      elementStyle.borderRadius = '50%';
    }

    return (
      <div key={elemento.rowid} style={elementStyle}>
        {elemento.contenido}
      </div>
    );
  };

  // ============================================================================
  // RENDERIZADO PRINCIPAL
  // ============================================================================

  if (!layoutConfig) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m-4 0H5m-4 0h4" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Configurando restaurante...</h3>
        <p className="text-gray-500 mb-4">Cargando configuración desde base de datos</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      {/* Header con controles */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 space-y-4 lg:space-y-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-6">
          <h2 className="text-xl font-bold text-gray-900">🍽️ {layoutConfig.name}</h2>
          
          {/* Estadísticas */}
          <div className="grid grid-cols-2 lg:flex lg:items-center lg:space-x-4 gap-2 lg:gap-0 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-200 rounded-full mr-2"></div>
              <span>Libres: <strong>{estadisticas.libre}</strong></span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-200 rounded-full mr-2"></div>
              <span>Ocupadas: <strong>{estadisticas.ocupada}</strong></span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-200 rounded-full mr-2"></div>
              <span>Cobrando: <strong>{estadisticas.cobrando}</strong></span>
            </div>
          </div>
        </div>

        {/* Controles */}
        <div className="flex items-center space-x-3">
          {/* Toggle modo editor */}
          <button
            onClick={() => setIsEditorMode(!isEditorMode)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isEditorMode 
                ? 'bg-orange-500 text-white hover:bg-orange-600' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isEditorMode ? '✏️ Editando' : '👀 Ver'}
          </button>

          {/* Subir imagen */}
          <button
            onClick={handleImageUpload}
            className="flex items-center space-x-2 bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="hidden md:inline">Croquis</span>
          </button>

          {/* Configuración */}
          <button
            onClick={onConfigClick}
            className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
            <span className="hidden md:inline">Config</span>
          </button>
        </div>
      </div>

      {/* Área del restaurante */}
      <div className="relative border border-gray-300 rounded-lg overflow-hidden bg-gray-100">
        <div
          ref={containerRef}
          className="relative bg-gray-50"
          style={{
            width: `${layoutConfig.background_width}px`,
            height: `${layoutConfig.background_height}px`,
            maxWidth: '100%',
            backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          {/* Elementos decorativos */}
          {elementosDecorativos.map(elemento => renderElementoDecorativo(elemento))}
          
          {/* Mesas */}
          {mesasConfig.map(mesa => renderMesa(mesa))}
          
          {/* Overlay para modo editor */}
          {isEditorMode && (
            <div className="absolute inset-0 bg-blue-500 bg-opacity-10 pointer-events-none">
              <div className="absolute top-4 left-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                Modo Edición - Arrastra las mesas para reposicionar
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input oculto para archivos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Modal para confirmar subida de imagen */}
      {showImageUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Subir Croquis del Restaurante</h3>
            <p className="text-gray-600 mb-4">
              ¿Desea reemplazar el fondo actual con esta imagen?
            </p>
            {selectedFile && (
              <div className="mb-4 p-3 bg-gray-50 rounded border">
                <p className="text-sm"><strong>Archivo:</strong> {selectedFile.name}</p>
                <p className="text-sm"><strong>Tamaño:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            )}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowImageUpload(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={confirmImageUpload}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Subir Imagen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leyenda */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Instrucciones:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p><strong>Modo Normal:</strong> Haga clic en las mesas para operarlas</p>
            <p><strong>Modo Edición:</strong> Arrastre las mesas para reposicionarlas</p>
          </div>
          <div>
            <p><strong>🟢 Verde:</strong> Mesa libre</p>
            <p><strong>🟡 Amarillo:</strong> Mesa ocupada</p>
            <p><strong>🔴 Rojo:</strong> Mesa cobrando</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantVisualLayout;