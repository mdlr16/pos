// CustomFields.js
import React, { useState, useEffect } from 'react';

const CustomFields = ({ variables, onFieldsChange, extraFields }) => {
  const [customFields, setCustomFields] = useState([]);

  // Obtener los campos personalizados desde la base de datos
  useEffect(() => {
    const fetchCustomFields = async () => {
      try {
        const response = await fetch(`${variables.SPOS_URL}/custom/pos/frontend/ajax_pos_siel.php?action=getExtrafields`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setCustomFields(Array.isArray(data.customFields) ? data.customFields : []);
      } catch (error) {
        console.error('Error fetching custom fields:', error);
      }
    };

    fetchCustomFields();
  }, [variables]);

  const handleFieldChange = (fieldId, value) => {
    onFieldsChange(fieldId, value);
  };

  return (
    <div className="space-y-4">
      {customFields.map((field) => (
        <div key={field.id} className="form-control mb-4">
          <label className="label">
            <span className="label-text">{field.label}</span>
          </label>

          {/* Tipos de campo: text, number, date, select, checkbox, textarea */}
          {field.type === 'text' && (
            <input
              type="text"
              className="input input-bordered w-full"
              value={extraFields[field.name] || ''} // Se utiliza `field.name` como clave
              placeholder={`Ingrese ${field.label}`}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
            />
          )}
          {field.type === 'number' && (
            <input
              type="number"
              className="input input-bordered w-full"
              value={extraFields[field.name] || ''}
              placeholder={`Ingrese ${field.label}`}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
            />
          )}
          {field.type === 'date' && (
            <input
              type="date"
              className="input input-bordered w-full"
              value={extraFields[field.name] || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
            />
          )}
          {field.type === 'select' && (
            <select
              className="select select-bordered w-full"
              value={extraFields[field.name] || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
            >
              {field.options && field.options.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}
          {field.type === 'checkbox' && (
            <input
              type="checkbox"
              className="checkbox"
              checked={extraFields[field.name] || false}
              onChange={(e) => handleFieldChange(field.name, e.target.checked)}
            />
          )}
          {field.type === 'textarea' && (
            <textarea
              className="textarea textarea-bordered w-full"
              value={extraFields[field.name] || ''}
              placeholder={`Ingrese ${field.label}`}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default CustomFields;
