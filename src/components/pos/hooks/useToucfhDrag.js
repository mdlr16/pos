import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Hook personalizado para drag & drop con soporte completo para mouse y touch
 * Optimizado para tablets y dispositivos móviles en aplicaciones POS
 */
export const useTouchDrag = ({
  onDragStart,
  onDragMove,
  onDragEnd,
  threshold = 10, // pixels para iniciar drag
  longPressDelay = 500, // ms para long press en touch
  containerRef = null
}) => {
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragData, setDragData] = useState(null);
  
  // Referencias para tracking
  const startPos = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });
  const longPressTimer = useRef(null);
  const hasMoved = useRef(false);
  const isTouch = useRef(false);
  const dragElement = useRef(null);

  // Detectar si el dispositivo soporta touch
  const supportsTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Limpiar timer de long press
  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Obtener coordenadas unificadas (mouse o touch)
  const getCoordinates = useCallback((event) => {
    if (event.touches && event.touches.length > 0) {
      return {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
    } else if (event.changedTouches && event.changedTouches.length > 0) {
      return {
        x: event.changedTouches[0].clientX,
        y: event.changedTouches[0].clientY
      };
    }
    return {
      x: event.clientX,
      y: event.clientY
    };
  }, []);

  // Calcular distancia desde posición inicial
  const getDistance = useCallback((currentX, currentY) => {
    const deltaX = currentX - startPos.current.x;
    const deltaY = currentY - startPos.current.y;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  }, []);

  // Obtener posición relativa al contenedor
  const getRelativePosition = useCallback((x, y) => {
    if (containerRef?.current) {
      const rect = containerRef.current.getBoundingClientRect();
      return {
        x: x - rect.left,
        y: y - rect.top
      };
    }
    return { x, y };
  }, [containerRef]);

  // Iniciar drag
  const startDrag = useCallback((event, element, data) => {
    console.log('🚀 Iniciando drag:', { isTouch: isTouch.current, element, data });
    
    setIsDragging(true);
    setDragData(data);
    dragElement.current = element;
    hasMoved.current = false;

    const coords = getCoordinates(event);
    startPos.current = coords;
    currentPos.current = coords;

    // Notificar inicio de drag
    if (onDragStart) {
      const relativePos = getRelativePosition(coords.x, coords.y);
      onDragStart(event, element, data, relativePos);
    }

    // Prevenir comportamientos por defecto
    event.preventDefault();
    
    // En touch, también prevenir scroll
    if (isTouch.current) {
      document.body.style.touchAction = 'none';
      document.body.style.userSelect = 'none';
    }
  }, [onDragStart, getCoordinates, getRelativePosition]);

  // Manejar inicio de mouse
  const handleMouseDown = useCallback((event, element, data) => {
    // Solo botón izquierdo
    if (event.button !== 0) return;
    
    isTouch.current = false;
    clearLongPressTimer();
    
    const coords = getCoordinates(event);
    startPos.current = coords;
    
    // En mouse, iniciamos drag inmediatamente
    startDrag(event, element, data);
  }, [startDrag, getCoordinates, clearLongPressTimer]);

  // Manejar inicio de touch
  const handleTouchStart = useCallback((event, element, data) => {
    // Solo un dedo
    if (event.touches.length !== 1) return;
    
    isTouch.current = true;
    clearLongPressTimer();
    
    const coords = getCoordinates(event);
    startPos.current = coords;
    hasMoved.current = false;

    // Timer para long press
    longPressTimer.current = setTimeout(() => {
      if (!hasMoved.current) {
        console.log('⏰ Long press detectado, iniciando drag');
        startDrag(event, element, data);
        
        // Vibración táctil si está disponible
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }
    }, longPressDelay);

    // Prevenir zoom accidental
    event.preventDefault();
  }, [startDrag, getCoordinates, clearLongPressTimer, longPressDelay]);

  // Manejar movimiento
  const handleMove = useCallback((event) => {
    const coords = getCoordinates(event);
    const distance = getDistance(coords.x, coords.y);
    
    // Detectar si se ha movido más allá del threshold
    if (distance > threshold) {
      hasMoved.current = true;
      clearLongPressTimer();
    }

    // Si estamos en modo drag
    if (isDragging) {
      currentPos.current = coords;
      
      const deltaX = coords.x - startPos.current.x;
      const deltaY = coords.y - startPos.current.y;
      const relativePos = getRelativePosition(coords.x, coords.y);

      if (onDragMove) {
        onDragMove(event, dragElement.current, dragData, {
          ...relativePos,
          deltaX,
          deltaY
        });
      }

      event.preventDefault();
    }
  }, [isDragging, getCoordinates, getDistance, threshold, clearLongPressTimer, 
      getRelativePosition, onDragMove, dragData]);

  // Finalizar drag
  const handleEnd = useCallback((event) => {
    clearLongPressTimer();
    
    if (isDragging) {
      console.log('🎯 Finalizando drag');
      
      const coords = getCoordinates(event);
      const relativePos = getRelativePosition(coords.x, coords.y);

      if (onDragEnd) {
        onDragEnd(event, dragElement.current, dragData, relativePos);
      }

      // Restaurar estilos
      if (isTouch.current) {
        document.body.style.touchAction = '';
        document.body.style.userSelect = '';
      }

      setIsDragging(false);
      setDragData(null);
      dragElement.current = null;
      hasMoved.current = false;
    }
  }, [isDragging, clearLongPressTimer, getCoordinates, getRelativePosition, onDragEnd, dragData]);

  // Cancelar drag (escape, etc.)
  const cancelDrag = useCallback(() => {
    console.log('❌ Cancelando drag');
    clearLongPressTimer();
    
    if (isDragging) {
      // Restaurar estilos
      if (isTouch.current) {
        document.body.style.touchAction = '';
        document.body.style.userSelect = '';
      }

      setIsDragging(false);
      setDragData(null);
      dragElement.current = null;
      hasMoved.current = false;
    }
  }, [isDragging, clearLongPressTimer]);

  // Event listeners globales
  useEffect(() => {
    if (isDragging) {
      // Mouse events
      const handleMouseMove = (e) => handleMove(e);
      const handleMouseUp = (e) => handleEnd(e);
      
      // Touch events
      const handleTouchMove = (e) => handleMove(e);
      const handleTouchEnd = (e) => handleEnd(e);
      
      // Keyboard events
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          cancelDrag();
        }
      };

      // Agregar listeners
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      if (supportsTouch) {
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
        document.addEventListener('touchcancel', handleEnd);
      }
      
      document.addEventListener('keydown', handleKeyDown);

      // Cleanup
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        if (supportsTouch) {
          document.removeEventListener('touchmove', handleTouchMove);
          document.removeEventListener('touchend', handleTouchEnd);
          document.removeEventListener('touchcancel', handleEnd);
        }
        
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isDragging, handleMove, handleEnd, cancelDrag, supportsTouch]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      clearLongPressTimer();
      if (isDragging) {
        cancelDrag();
      }
    };
  }, [clearLongPressTimer, isDragging, cancelDrag]);

  // API pública del hook
  return {
    isDragging,
    dragData,
    
    // Handlers para elementos draggables
    dragHandlers: {
      onMouseDown: handleMouseDown,
      onTouchStart: handleTouchStart,
    },
    
    // Métodos de control
    cancelDrag,
    
    // Información del estado
    isTouch: isTouch.current,
    supportsTouch,
    
    // Posiciones actuales
    currentPosition: currentPos.current,
    startPosition: startPos.current
  };
};

/**
 * Hook simplificado para casos básicos de drag & drop
 */
export const useSimpleDrag = (onPositionChange) => {
  return useTouchDrag({
    onDragStart: (event, element, data, position) => {
      console.log('Drag iniciado en:', position);
    },
    
    onDragMove: (event, element, data, position) => {
      if (onPositionChange) {
        onPositionChange(position.x, position.y, position.deltaX, position.deltaY);
      }
    },
    
    onDragEnd: (event, element, data, position) => {
      console.log('Drag finalizado en:', position);
      if (onPositionChange) {
        onPositionChange(position.x, position.y, 0, 0, true); // isEnd = true
      }
    }
  });
};

/**
 * Componente HOC para agregar funcionalidad de drag fácilmente
 */
export const withDrag = (WrappedComponent) => {
  return React.forwardRef((props, ref) => {
    const {
      onDragStart,
      onDragMove,
      onDragEnd,
      dragData,
      disabled = false,
      ...otherProps
    } = props;

    const { dragHandlers, isDragging } = useTouchDrag({
      onDragStart,
      onDragMove,
      onDragEnd
    });

    const handleMouseDown = useCallback((event) => {
      if (!disabled) {
        dragHandlers.onMouseDown(event, ref?.current || event.target, dragData);
      }
    }, [disabled, dragHandlers, dragData, ref]);

    const handleTouchStart = useCallback((event) => {
      if (!disabled) {
        dragHandlers.onTouchStart(event, ref?.current || event.target, dragData);
      }
    }, [disabled, dragHandlers, dragData, ref]);

    return (
      <WrappedComponent
        ref={ref}
        {...otherProps}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        data-dragging={isDragging}
        style={{
          ...props.style,
          touchAction: disabled ? 'auto' : 'none',
          userSelect: disabled ? 'auto' : 'none',
          cursor: disabled ? 'default' : (isDragging ? 'grabbing' : 'grab')
        }}
      />
    );
  });
};