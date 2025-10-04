# Documentación Técnica - Sistema POS Refactorizado

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Estructura de Archivos](#estructura-de-archivos)
4. [Flujo de Datos](#flujo-de-datos)
5. [APIs y Servicios](#apis-y-servicios)
6. [Guía para Modificar Diseño](#guía-para-modificar-diseño)
7. [Guía para Desarrolladores](#guía-para-desarrolladores)
8. [Patrones de Código](#patrones-de-código)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Visión General

El sistema POS ha sido refactorizado desde un componente monolítico de **2,500+ líneas** a una arquitectura modular de **16 archivos** organizados por responsabilidades específicas.

### Beneficios de la Refactorización
- ✅ **Mantenibilidad**: Cada funcionalidad está en un archivo específico
- ✅ **Escalabilidad**: Fácil agregar nuevas características
- ✅ **Testeo**: Cada hook y función es testeable independientemente
- ✅ **Reutilización**: Hooks pueden usarse en otros componentes
- ✅ **Performance**: Componentes más pequeños y optimizados

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                        Pos.js                               │
│                 (Componente Principal)                      │
│                    400 líneas                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────┼───────────┐
          │           │           │
    ┌─────▼─────┐ ┌───▼───┐ ┌─────▼─────┐
    │   Hooks   │ │  UI   │ │ Services  │
    │           │ │       │ │           │
    └───────────┘ └───────┘ └───────────┘
```

### Capas de la Arquitectura

#### 1. **Capa de Presentación (UI Components)**
- Componentes React puros
- Manejo de eventos de usuario
- Renderizado de interfaces

#### 2. **Capa de Lógica de Negocio (Hooks)**
- Estado del aplicación
- Lógica de negocio
- Efectos secundarios

#### 3. **Capa de Servicios (Services)**
- Llamadas a APIs
- Transformación de datos
- Utilidades compartidas

---

## 📁 Estructura de Archivos

```
src/components/
├── pos/                           # 📁 Carpeta principal del POS
│   ├── hooks/                     # 🎣 Estado y lógica de negocio
│   │   ├── usePosData.js         # 🏪 Estado principal del POS
│   │   ├── useProducts.js        # 📦 Gestión de productos
│   │   ├── useCustomers.js       # 👥 Gestión de clientes
│   │   └── usePayments.js        # 💳 Gestión de pagos
│   │
│   ├── modals/                   # 🪟 Componentes de modales
│   │   ├── PaymentModal.js       # 💰 Modal de pagos
│   │   ├── CustomerModal.js      # 👤 Modal crear cliente
│   │   ├── SalesHistoryModal.js  # 📊 Modal historial ventas
│   │   └── SuspendedTicketsModal.js # ⏸️ Modal tickets suspendidos
│   │
│   ├── TopBar.js                 # 🔝 Barra superior
│   ├── CustomerPanel.js          # 👤 Panel de cliente (izquierda)
│   ├── CartTable.js              # 🛒 Tabla del carrito (centro)
│   ├── ProductSearch.js          # 🔍 Panel productos (derecha)
│   │
│   ├── posAPI.js                 # 🌐 Servicios de API
│   ├── posUtils.js               # 🛠️ Funciones utilitarias
│   └── ticketHandlers.js         # 🎫 Manejadores de tickets
│
├── Pos.js                        # 🎯 Componente principal
├── Alert.js                      # ⚠️ Componente de alertas
├── CustomFields.js               # ⚙️ Campos personalizados
└── PrintTicket.js                # 🖨️ Componente de impresión
```

### Descripción de Archivos

| Archivo | Responsabilidad | Líneas | Descripción |
|---------|----------------|--------|-------------|
| `Pos.js` | Orquestador principal | ~400 | Coordina todos los hooks y componentes |
| `usePosData.js` | Estado central | ~150 | Maneja estados principales del POS |
| `useProducts.js` | Productos | ~100 | Búsqueda, stock y gestión de productos |
| `useCustomers.js` | Clientes | ~120 | Búsqueda, creación y validación de clientes |
| `usePayments.js` | Pagos | ~110 | Gestión de pagos y cierre de caja |
| `posAPI.js` | APIs | ~200 | Todas las llamadas al servidor |
| `posUtils.js` | Utilidades | ~300 | Funciones auxiliares y validaciones |
| `ticketHandlers.js` | Tickets | ~100 | Lógica específica de tickets |

---

## 🔄 Flujo de Datos

### Flujo Principal de Datos

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    User     │───▶│     UI      │───▶│   Hooks     │───▶│  Services   │
│  Interaction│    │ Components  │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                           ▲                   ▲                   │
                           │                   │                   │
                           └───────────────────┼───────────────────┘
                                               │
                                      ┌─────────────┐
                                      │   Server    │
                                      │     API     │
                                      └─────────────┘
```

### Ejemplo de Flujo: Agregar Producto al Carrito

1. **Usuario** busca producto en `ProductSearch.js`
2. **ProductSearch** llama `handleProductSelect()`
3. **Pos.js** ejecuta `handleAddProduct()` 
4. **posUtils.js** valida stock si es necesario
5. **usePosData.js** actualiza el estado del carrito
6. **CartTable.js** re-renderiza con el nuevo producto

```javascript
// Flujo de datos simplificado
User Input → ProductSearch → Pos.js → posUtils → usePosData → CartTable
```

---

## 🌐 APIs y Servicios

### 📍 Ubicación de APIs

**Archivo principal**: `components/pos/posAPI.js`

### APIs Disponibles

#### 1. **Gestión de Tickets**
```javascript
// Guardar ticket (cotización/pedido/factura)
posAPI.saveTicket(variables, data)

// Guardar campos personalizados
posAPI.saveExtraFields(variables, ticketId, extraFields, clase)
```

#### 2. **Historial y Consultas**
```javascript
// Obtener historial de ventas
posAPI.getSalesHistory(variables, terminal)

// Obtener tickets suspendidos
posAPI.getSuspendedTickets(variables, terminal)
```

### 🔧 Cómo Agregar Nueva API

1. **Agregar función en `posAPI.js`**:
```javascript
export const posAPI = {
  // APIs existentes...
  
  // Nueva API
  getNuevaFuncionalidad: async (variables, params) => {
    try {
      const response = await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=nuevaAccion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      return await response.json();
    } catch (error) {
      throw new Error('Error en nueva funcionalidad: ' + error.message);
    }
  }
};
```

2. **Usar en componente**:
```javascript
// En Pos.js o cualquier componente
const handleNuevaFuncionalidad = async () => {
  try {
    const result = await posAPI.getNuevaFuncionalidad(variables, params);
    // Manejar resultado
  } catch (error) {
    console.error(error);
  }
};
```

### 📡 Endpoints del Servidor

| Acción | Endpoint | Método | Descripción |
|--------|----------|--------|-------------|
| `saveTickets` | `ajax_pos_siel.php?action=saveTickets` | POST | Guardar ticket |
| `searchCustomer` | `ajax_pos_siel.php?action=searchCustomer` | POST | Buscar cliente |
| `searchProductsN` | `ajax_pos_siel.php?action=searchProductsN` | POST | Buscar productos |
| `selectUsers` | `ajax_pos_siel.php?action=selectUsers` | POST | Obtener vendedores |
| `checkStock` | `ajax_pos_siel.php?action=checkStock` | GET | Verificar stock |
| `getCotizaciones` | `ajax_pos_siel.php?action=getCotizaciones` | GET | Historial cotizaciones |
| `getFacturas` | `ajax_pos_siel.php?action=getFacturas` | GET | Historial facturas |

---

## 🎨 Guía para Modificar Diseño

### 📍 Archivos de UI por Sección

#### 1. **Barra Superior**
**Archivo**: `components/pos/TopBar.js`
```javascript
// Modificar elementos de la barra superior
const TopBar = ({ user, terminal, variables, ... }) => {
  return (
    <div className="bg-white p-2 flex justify-between items-center shadow-sm">
      {/* Modificar aquí para cambiar la barra superior */}
      <div className="flex items-center space-x-4">
        <span className="text-purple-600 font-bold">BIENVENIDO</span>
        {/* Agregar más elementos aquí */}
      </div>
    </div>
  );
};
```

#### 2. **Panel de Cliente (Izquierda)**
**Archivo**: `components/pos/CustomerPanel.js`
```javascript
// Modificar diseño del panel de cliente
return (
  <div className="w-full md:w-1/4 space-y-4">
    <div className="bg-white p-4 rounded-lg shadow">
      {/* Modificar formulario de búsqueda de cliente */}
    </div>
    
    <div className="bg-purple-600 text-white p-4 rounded-lg">
      {/* Modificar información del cliente */}
    </div>
    
    {/* Modificar sección de totales */}
  </div>
);
```

#### 3. **Tabla del Carrito (Centro)**
**Archivo**: `components/pos/CartTable.js`
```javascript
// Modificar diseño de la tabla del carrito
return (
  <div className="w-full md:w-2/4 space-y-4">
    <div className="overflow-y-auto bg-white rounded-lg shadow">
      <table className="table w-full text-xs md:text-sm">
        {/* Modificar columnas de la tabla */}
        <thead>
          <tr>
            <th>Descripción</th>
            {/* Agregar/modificar columnas */}
          </tr>
        </thead>
      </table>
    </div>
  </div>
);
```

#### 4. **Panel de Productos (Derecha)**
**Archivo**: `components/pos/ProductSearch.js`
```javascript
// Modificar búsqueda de productos y vendedores
return (
  <div className="w-full md:w-1/4 space-y-4">
    {/* Modificar selector de vendedor */}
    <select className="select select-bordered">
      {/* Modificar opciones */}
    </select>
    
    {/* Modificar campo de búsqueda */}
    <input 
      type="text" 
      className="input input-bordered"
      placeholder="Buscar productos..."
    />
  </div>
);
```

### 🎨 Personalización de Estilos

#### 1. **Cambiar Colores del Tema**
```javascript
// En cualquier componente, buscar estas clases:
className="bg-purple-600"     // Color principal
className="text-purple-600"   // Texto principal
className="btn btn-primary"   // Botones principales
className="btn btn-secondary" // Botones secundarios
```

#### 2. **Modificar Layout Responsivo**
```javascript
// Cambiar distribución de columnas:
<div className="flex flex-1 flex-col md:flex-row">
  <div className="w-full md:w-1/4">  {/* Panel izquierdo */}
  <div className="w-full md:w-2/4">  {/* Panel central */}
  <div className="w-full md:w-1/4">  {/* Panel derecho */}
</div>
```

#### 3. **Personalizar Modales**
**Archivos**: `components/pos/modals/*.js`
```javascript
// Cada modal tiene esta estructura básica:
<div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
  <div className="bg-white p-6 rounded-lg shadow-lg w-11/12 md:w-1/3">
    {/* Contenido del modal - modificar aquí */}
  </div>
</div>
```

---

## 👩‍💻 Guía para Desarrolladores

### 🆕 Agregar Nueva Funcionalidad

#### 1. **Agregar Nuevo Campo al Estado**
```javascript
// En usePosData.js
const [nuevoEstado, setNuevoEstado] = useState(valorInicial);

// En el return del hook
return {
  // Estados existentes...
  nuevoEstado, setNuevoEstado,
};
```

#### 2. **Crear Nuevo Hook**
```javascript
// Crear archivo: components/pos/hooks/useNuevaFuncionalidad.js
import { useState, useEffect } from 'react';

export const useNuevaFuncionalidad = (dependencies) => {
  const [estado, setEstado] = useState(null);
  
  const manejarAccion = async () => {
    // Lógica de la nueva funcionalidad
  };
  
  return {
    estado,
    manejarAccion
  };
};
```

#### 3. **Agregar Nuevo Componente**
```javascript
// Crear archivo: components/pos/NuevoComponente.js
import React from 'react';

const NuevoComponente = ({ prop1, prop2, onAction }) => {
  return (
    <div className="nuevo-componente">
      {/* JSX del componente */}
    </div>
  );
};

export default NuevoComponente;
```

#### 4. **Integrar en Pos.js**
```javascript
// En Pos.js
import { useNuevaFuncionalidad } from './pos/hooks/useNuevaFuncionalidad';
import NuevoComponente from './pos/NuevoComponente';

const Pos = ({ terminal }) => {
  // Usar el nuevo hook
  const nuevaFunc = useNuevaFuncionalidad(dependencies);
  
  return (
    <div>
      {/* Componentes existentes */}
      <NuevoComponente 
        prop1={value1}
        prop2={value2}
        onAction={nuevaFunc.manejarAccion}
      />
    </div>
  );
};
```

### 🔄 Modificar Funcionalidad Existente

#### 1. **Cambiar Lógica de Negocio**
**Ubicación**: `components/pos/posUtils.js`
```javascript
// Ejemplo: Modificar validación de stock
export const handleAddProduct = async (product, cart, setCart, ...) => {
  // Modificar lógica aquí
  
  // Nueva validación personalizada
  if (customValidation(product)) {
    // Nueva lógica
  }
  
  // Resto del código existente...
};
```

#### 2. **Cambiar Comportamiento de API**
**Ubicación**: `components/pos/posAPI.js`
```javascript
// Ejemplo: Modificar saveTicket
saveTicket: async (variables, data) => {
  // Preprocessar datos si es necesario
  const processedData = preprocessData(data);
  
  try {
    const response = await fetch(/* ... */);
    const result = await response.json();
    
    // Postprocesar respuesta si es necesario
    return postprocessResult(result);
  } catch (error) {
    // Manejo de errores personalizado
  }
}
```

### 🧪 Testing

#### 1. **Testing de Hooks**
```javascript
// Ejemplo de test para usePosData
import { renderHook } from '@testing-library/react-hooks';
import { usePosData } from '../pos/hooks/usePosData';

test('should initialize with correct default values', () => {
  const { result } = renderHook(() => usePosData(mockTerminal));
  
  expect(result.current.cart).toEqual([]);
  expect(result.current.tipoVenta).toBe("Cotizacion");
});
```

#### 2. **Testing de Componentes**
```javascript
// Ejemplo de test para TopBar
import { render, screen } from '@testing-library/react';
import TopBar from '../pos/TopBar';

test('should display user name', () => {
  render(<TopBar user="Test User" />);
  expect(screen.getByText('Test User')).toBeInTheDocument();
});
```

#### 3. **Testing de APIs**
```javascript
// Ejemplo de test para posAPI
import { posAPI } from '../pos/posAPI';

test('should save ticket successfully', async () => {
  const mockData = { /* mock data */ };
  const result = await posAPI.saveTicket(mockVariables, mockData);
  
  expect(result.error.value).toBe(0);
});
```

### 📊 Patrones de Código

#### 1. **Patrón de Hook Personalizado**
```javascript
// Estructura estándar de un hook
export const useCustomHook = (dependencies) => {
  // Estados
  const [state, setState] = useState(initialValue);
  
  // Funciones
  const handleAction = useCallback(() => {
    // Lógica
  }, [dependencies]);
  
  // Efectos
  useEffect(() => {
    // Efectos secundarios
  }, [dependencies]);
  
  // Return
  return {
    state,
    handleAction
  };
};
```

#### 2. **Patrón de Componente**
```javascript
// Estructura estándar de un componente
const ComponenteName = ({ 
  prop1, 
  prop2, 
  onAction 
}) => {
  // Estados locales si son necesarios
  const [localState, setLocalState] = useState();
  
  // Handlers locales
  const handleLocalAction = () => {
    // Lógica local
    onAction?.(data);
  };
  
  return (
    <div className="component-container">
      {/* JSX */}
    </div>
  );
};

export default ComponenteName;
```

#### 3. **Patrón de Servicio API**
```javascript
// Estructura estándar de un servicio
export const apiService = {
  actionName: async (params) => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      throw new Error(`Error en ${actionName}: ${error.message}`);
    }
  }
};
```

---

## 🚨 Troubleshooting

### Errores Comunes

#### 1. **Error: "Cannot resolve module"**
```bash
# Verificar que la estructura de archivos sea correcta
src/components/pos/hooks/usePosData.js  ✅
src/components/pos/TopBar.js            ✅
```

**Solución**: Verificar rutas de importación en `Pos.js`

#### 2. **Error: "AuthContext is undefined"**
```javascript
// Verificar que el componente esté envuelto
<AuthProvider>
  <Pos terminal={terminal} />
</AuthProvider>
```

#### 3. **Error: "Cannot read property of undefined"**
```javascript
// Agregar verificaciones defensivas
const customerId = selectedCustomerDetails?.id || '1';
const total = calculateTotal?.() || 0;
```

#### 4. **Estilos no se aplican**
```bash
# Verificar que DaisyUI esté instalado
npm list daisyui

# Verificar configuración de Tailwind
# tailwind.config.js debe incluir DaisyUI
```

### Debugging

#### 1. **Debug de Estado**
```javascript
// Agregar en cualquier hook
console.log('Hook State:', { 
  cart, 
  selectedCustomer, 
  tipoVenta 
});
```

#### 2. **Debug de APIs**
```javascript
// En posAPI.js
console.log('API Request:', { url, method, body });
console.log('API Response:', response);
```

#### 3. **Debug de Componentes**
```javascript
// En cualquier componente
useEffect(() => {
  console.log('Component props:', { prop1, prop2 });
}, [prop1, prop2]);
```

---

## 🚀 Próximos Pasos

### Mejoras Sugeridas

1. **TypeScript**: Convertir a TypeScript para mejor tipado
2. **React Query**: Para manejo de estado del servidor
3. **Storybook**: Para documentar componentes
4. **Error Boundaries**: Para mejor manejo de errores
5. **Performance**: Implementar `React.memo` y `useMemo`

### Roadmap de Desarrollo

- [ ] Tests unitarios completos
- [ ] Documentación de componentes con Storybook
- [ ] Migración gradual a TypeScript
- [ ] Implementación de Error Boundaries
- [ ] Optimización de performance
- [ ] Internacionalización (i18n)

---

## 📞 Soporte

Para consultas o problemas:

1. **Verificar esta documentación**
2. **Revisar el código de ejemplo**
3. **Consultar logs del navegador**
4. **Verificar configuración del proyecto**

---

*Documentación actualizada: Junio 2025*
*Versión: 1.0.0*