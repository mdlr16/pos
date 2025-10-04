import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Home, ShoppingCart, Package, Users, BarChart3, Terminal, User, ChevronDown } from 'lucide-react';

const Navigation = ({ activeModule, onModuleChange, terminal, user }) => {
  const { logout, variables } = useContext(AuthContext);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const modules = [
    {
      id: 'hub',
      title: 'Hub',
      icon: Home,
      color: 'text-gray-600 hover:text-blue-600'
    },
    {
      id: 'ventas',
      title: 'Ventas',
      icon: ShoppingCart,
      color: 'text-gray-600 hover:text-blue-600'
    },
    {
      id: 'compras',
      title: 'Compras',
      icon: Package,
      color: 'text-gray-600 hover:text-green-600'
    },
    {
      id: 'productos',
      title: 'Productos',
      icon: Users,
      color: 'text-gray-600 hover:text-purple-600'
    },
    {
      id: 'inventario',
      title: 'Inventario',
      icon: BarChart3,
      color: 'text-gray-600 hover:text-orange-600'
    }
  ];

  const getActiveStyle = (moduleId) => {
    if (activeModule === moduleId) {
      switch (moduleId) {
        case 'ventas':
          return 'text-blue-600 bg-blue-50 border-blue-200';
        case 'compras':
          return 'text-green-600 bg-green-50 border-green-200';
        case 'productos':
          return 'text-purple-600 bg-purple-50 border-purple-200';
        case 'inventario':
          return 'text-orange-600 bg-orange-50 border-orange-200';
        default:
          return 'text-gray-600 bg-gray-50 border-gray-200';
      }
    }
    return 'text-gray-600 bg-white border-gray-200 hover:bg-gray-50';
  };

  const handleLogout = () => {
    logout();
    window.location.href = (`${variables.SPOS_URL}/custom/build`);
  };

  const profileImage = `${variables.SPOS_URL}/documents/mycompany/logos/thumbs/${variables.MAIN_INFO_SOCIETE_LOGO_SQUARRED_MINI}`;

  return (
    <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo y título */}
          <div className="flex items-center space-x-4">
            <img
              src={profileImage}
              alt="Company Logo"
              className="w-8 h-8 object-contain rounded"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/placeholder-logo.png';
              }}
            />
            <h1 className="text-xl font-bold text-gray-800">SIEL POS</h1>
          </div>

          {/* Navegación principal */}
          <div className="hidden md:flex items-center space-x-1">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <button
                  key={module.id}
                  onClick={() => onModuleChange(module.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all duration-200 ${getActiveStyle(module.id)}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{module.title}</span>
                </button>
              );
            })}
          </div>

          {/* Información de terminal y usuario */}
          <div className="flex items-center space-x-4">
            {/* Terminal info */}
            <div className="hidden lg:flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2">
              <Terminal className="w-4 h-4 text-gray-600" />
              <div className="text-sm">
                <p className="font-medium text-gray-800">{terminal?.name}</p>
                <p className="text-gray-600">{terminal?.label}</p>
              </div>
            </div>

            {/* User dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors"
              >
                <User className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-800">{user}</span>
                <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      // Aquí puedes agregar lógica para cambio de usuario
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Cambio de Usuario
                  </button>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      // Aquí puedes agregar lógica para cierre de caja
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Cierre de Caja
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      handleLogout();
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navegación móvil */}
        <div className="md:hidden border-t border-gray-200">
          <div className="flex justify-around py-2">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <button
                  key={module.id}
                  onClick={() => onModuleChange(module.id)}
                  className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 ${
                    activeModule === module.id 
                      ? 'text-blue-600' 
                      : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{module.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Overlay para cerrar dropdown */}
      {dropdownOpen && (
        <div 
          className="fixed inset-0 z-30" 
          onClick={() => setDropdownOpen(false)}
        />
      )}
    </div>
  );
};

export default Navigation;