import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { User, Building, Phone, Mail, MapPin, CreditCard, FileText, X, Save, Search } from 'lucide-react';

const ProveedorModal = ({ isOpen, onClose, proveedorData = null, onSave }) => {
  const { variables, userId } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    razonSocial: '',
    nit: '',
    direccion: '',
    telefono: '',
    email: '',
    contacto: '',
    telefonoContacto: '',
    condicionesPago: '30',
    descuentoComercial: 0,
    estado: 'Activo',
    observaciones: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [isSearchingNIT, setIsSearchingNIT] = useState(false);

  useEffect(() => {
    if (proveedorData) {
      setFormData({
        codigo: proveedorData.codigo || '',
        nombre: proveedorData.nombre || '',
        razonSocial: proveedorData.razonSocial || '',
        nit: proveedorData.nit || '',
        direccion: proveedorData.direccion || '',
        telefono: proveedorData.telefono || '',
        email: proveedorData.email || '',
        contacto: proveedorData.contacto || '',
        telefonoContacto: proveedorData.telefonoContacto || '',
        condicionesPago: proveedorData.condicionesPago || '30',
        descuentoComercial: proveedorData.descuentoComercial || 0,
        estado: proveedorData.estado || 'Activo',
        observaciones: proveedorData.observaciones || ''
      });
    } else {
      // Generar código automático para nuevo proveedor
      const codigo = `PROV${Date.now().toString().slice(-6)}`;
      setFormData(prev => ({ ...prev, codigo }));
    }
  }, [proveedorData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error de validación si existe
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const buscarNIT = async () => {
    if (!formData.nit || formData.nit.length < 7) {
      alert('Por favor ingrese un NIT válido');
      return;
    }

    setIsSearchingNIT(true);
    try {
      // Usar el mismo endpoint que tienes en el POS
      const response = await fetch(`${variables.SPOS_SERVICIOS_URL}/desarrollo/validanitjson.php?nit=${formData.nit}&enti=1`);
      const data = await response.json();

      if (data.nombre && data.dir) {
        setFormData(prev => ({
          ...prev,
          nombre: data.nombre,
          razonSocial: data.nombre,
          direccion: data.dir
        }));
        alert('Información del NIT encontrada y cargada');
      } else {
        alert('NIT no encontrado en el sistema');
      }
    } catch (error) {
      console.error('Error buscando NIT:', error);
      alert('Error al buscar información del NIT');
    } finally {
      setIsSearchingNIT(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.nombre.trim()) {
      errors.nombre = 'El nombre es requerido';
    }
    
    if (!formData.nit.trim()) {
      errors.nit = 'El NIT es requerido';
    }
    
    if (formData.email && !isValidEmail(formData.email)) {
      errors.email = 'Email no válido';
    }
    
    if (formData.descuentoComercial < 0 || formData.descuentoComercial > 100) {
      errors.descuentoComercial = 'El descuento debe estar entre 0 y 100%';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const proveedorCompleto = {
        ...formData,
        fechaCreacion: proveedorData ? proveedorData.fechaCreacion : new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        usuarioCreacion: proveedorData ? proveedorData.usuarioCreacion : userId,
        usuarioModificacion: userId
      };

      console.log('Guardando proveedor:', proveedorCompleto);
      
      // Aquí iría la llamada a tu API
      // const response = await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=saveProveedor`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(proveedorCompleto)
      // });
      
      // Simular respuesta exitosa
      setTimeout(() => {
        alert(proveedorData ? 'Proveedor actualizado exitosamente' : 'Proveedor creado exitosamente');
        if (onSave) {
          onSave(proveedorCompleto);
        }
        onClose();
        setIsLoading(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error guardando proveedor:', error);
      alert('Error al guardar el proveedor');
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Building className="w-6 h-6 text-green-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {proveedorData ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </h2>
              <p className="text-sm text-gray-600">
                {proveedorData ? `Código: ${proveedorData.codigo}` : 'Ingrese la información del proveedor'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Información Básica */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-green-600" />
              Información Básica
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código del Proveedor
                </label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  value={formData.codigo}
                  onChange={(e) => handleInputChange('codigo', e.target.value)}
                  placeholder="Código automático"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  value={formData.estado}
                  onChange={(e) => handleInputChange('estado', e.target.value)}
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                  <option value="Suspendido">Suspendido</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Proveedor *
                </label>
                <input
                  type="text"
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                    validationErrors.nombre ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={formData.nombre}
                  onChange={(e) => handleInputChange('nombre', e.target.value)}
                  placeholder="Nombre comercial del proveedor"
                />
                {validationErrors.nombre && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.nombre}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Razón Social
                </label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  value={formData.razonSocial}
                  onChange={(e) => handleInputChange('razonSocial', e.target.value)}
                  placeholder="Razón social oficial"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  NIT *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className={`flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                      validationErrors.nit ? 'border-red-500' : 'border-gray-300'
                    }`}
                    value={formData.nit}
                    onChange={(e) => handleInputChange('nit', e.target.value)}
                    placeholder="Número de NIT"
                  />
                  <button
                    type="button"
                    onClick={buscarNIT}
                    disabled={isSearchingNIT || !formData.nit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Search className="w-4 h-4" />
                    {isSearchingNIT ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>
                {validationErrors.nit && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.nit}</p>
                )}
              </div>
            </div>
          </div>

          {/* Información de Contacto */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-green-600" />
              Información de Contacto
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Dirección
                </label>
                <textarea
                  rows="3"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  value={formData.direccion}
                  onChange={(e) => handleInputChange('direccion', e.target.value)}
                  placeholder="Dirección completa del proveedor"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    value={formData.telefono}
                    onChange={(e) => handleInputChange('telefono', e.target.value)}
                    placeholder="Teléfono principal"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email
                  </label>
                  <input
                    type="email"
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                      validationErrors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="correo@ejemplo.com"
                  />
                  {validationErrors.email && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Persona de Contacto
                </label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  value={formData.contacto}
                  onChange={(e) => handleInputChange('contacto', e.target.value)}
                  placeholder="Nombre del contacto principal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono de Contacto
                </label>
                <input
                  type="tel"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  value={formData.telefonoContacto}
                  onChange={(e) => handleInputChange('telefonoContacto', e.target.value)}
                  placeholder="Teléfono del contacto"
                />
              </div>
            </div>
          </div>

          {/* Información Comercial */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-green-600" />
              Información Comercial
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Condiciones de Pago (días)
                </label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  value={formData.condicionesPago}
                  onChange={(e) => handleInputChange('condicionesPago', e.target.value)}
                >
                  <option value="0">Contado</option>
                  <option value="15">15 días</option>
                  <option value="30">30 días</option>
                  <option value="45">45 días</option>
                  <option value="60">60 días</option>
                  <option value="90">90 días</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descuento Comercial (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                    validationErrors.descuentoComercial ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={formData.descuentoComercial}
                  onChange={(e) => handleInputChange('descuentoComercial', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
                {validationErrors.descuentoComercial && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.descuentoComercial}</p>
                )}
              </div>
            </div>
          </div>

          {/* Observaciones */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              Observaciones
            </h3>
            <textarea
              rows="4"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              value={formData.observaciones}
              onChange={(e) => handleInputChange('observaciones', e.target.value)}
              placeholder="Observaciones adicionales sobre el proveedor..."
            />
          </div>

          {/* Botones de Acción */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isLoading ? 'Guardando...' : (proveedorData ? 'Actualizar' : 'Crear')} Proveedor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProveedorModal;