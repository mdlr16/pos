import React from 'react';

const CustomerModal = ({
  isOpen,
  onClose,
  nitValue,
  setNitValue,
  nombreValue,
  setNombreValue,
  direccionValue,
  setDireccionValue,
  telefonoValue,
  setTelefonoValue,
  emailValue,
  setEmailValue,
  isLoading,
  handleNitChange,
  handleCreateCustomer
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded-lg shadow-lg w-11/12 md:w-1/3">
        <h2 className="text-xl font-bold mb-4">Crear Nuevo Cliente</h2>

        <form onSubmit={handleCreateCustomer}>
          <div className="form-control mb-4">
            <label className="input input-bordered flex items-center gap-2">
              <input
                type="text"
                className="grow"
                placeholder="NIT"
                value={nitValue}
                onChange={handleNitChange}
                required
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-4 w-4 opacity-70">
                <path
                  fillRule="evenodd"
                  d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
                  clipRule="evenodd" />
              </svg>
            </label>
            {!nitValue && <p className="text-red-500 text-sm">El campo NIT es obligatorio.</p>}
          </div>

          {isLoading && (
            <div className="flex justify-center items-center mt-2">
              <span className="loading loading-dots loading-xs"></span>
            </div>
          )}

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Nombre Completo</span>
            </label>
            <input 
              type="text" 
              className="input input-bordered" 
              placeholder="Nombre Completo" 
              value={nombreValue}
              onChange={(e) => setNombreValue(e.target.value)}
              required
            />
            {!nombreValue && <p className="text-red-500 text-sm">El campo Nombre es obligatorio.</p>}
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Dirección</span>
            </label>
            <input 
              type="text" 
              className="input input-bordered" 
              placeholder="Dirección" 
              value={direccionValue}
              onChange={(e) => setDireccionValue(e.target.value)}
            />
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Teléfono</span>
            </label>
            <input 
              type="tel" 
              className="input input-bordered" 
              placeholder="Teléfono" 
              value={telefonoValue}
              onChange={(e) => setTelefonoValue(e.target.value)}
            />
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Correo Electrónico</span>
            </label>
            <input 
              type="email" 
              className="input input-bordered" 
              placeholder="Correo Electrónico" 
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={!nitValue || !nombreValue}
            >
              Guardar Cliente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerModal;

