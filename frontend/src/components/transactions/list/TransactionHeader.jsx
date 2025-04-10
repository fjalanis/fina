import React, { useState, useEffect } from 'react';
import { formatDate, inputDateFormat } from '../../../utils/formatters';
// Import icons
import { FaEdit, FaTrashAlt, FaSave, FaTimes } from 'react-icons/fa';

const TransactionHeader = ({
  transaction,
  onDeleteTransaction,
  isEditing,            // New prop
  onEditTransaction,    // New prop
  onSave,               // New prop
  onCancel              // New prop
}) => {
  const [formData, setFormData] = useState({});

  // Initialize form data when transaction loads or edit mode changes
  useEffect(() => {
    if (transaction) {
      setFormData({
        date: transaction.date ? inputDateFormat(transaction.date) : '',
        description: transaction.description || '',
        reference: transaction.reference || '',
        notes: transaction.notes || ''
      });
    }
  }, [transaction, isEditing]); // Re-init if transaction changes or edit starts/cancels

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    // Convert date back to standard format if necessary before saving
    // For now, assuming the hook handles the format
    onSave(formData);
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      {isEditing ? (
        // EDIT MODE
        <div className="space-y-3">
          <div>
            <label htmlFor="description" className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <input 
              type="text"
              name="description"
              id="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Transaction Description"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="date" className="block text-xs font-medium text-gray-700 mb-1">Date</label>
              <input 
                type="date"
                name="date"
                id="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="reference" className="block text-xs font-medium text-gray-700 mb-1">Reference</label>
              <input 
                type="text"
                name="reference"
                id="reference"
                value={formData.reference}
                onChange={handleChange}
                className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Optional Reference"
              />
            </div>
          </div>
          <div>
            <label htmlFor="notes" className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              name="notes"
              id="notes"
              rows="2"
              value={formData.notes}
              onChange={handleChange}
              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Optional Notes"
            ></textarea>
          </div>
          <div className="flex justify-end space-x-2 mt-3">
            <button 
              onClick={handleSave} 
              className="flex items-center px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition"
            >
              <FaSave className="inline mr-1"/> Save
            </button>
            <button 
              onClick={onCancel} 
              className="flex items-center px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition"
            >
              <FaTimes className="inline mr-1"/> Cancel
            </button>
          </div>
        </div>
      ) : (
        // DISPLAY MODE
        <div>
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-medium text-lg mr-4">{transaction?.description || 'No Description'}</h3>
            <span className="text-sm text-gray-500 flex-shrink-0">{transaction?.date ? formatDate(transaction.date) : 'No Date'}</span>
          </div>
          
          {(transaction?.reference || transaction?.notes) && (
            <div className="mb-3 space-y-1 text-sm text-gray-600">
              {transaction.reference && (
                <p><span className="font-medium">Reference:</span> {transaction.reference}</p>
              )}
              {transaction.notes && (
                <p><span className="font-medium">Notes:</span> {transaction.notes}</p>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-2">
             <button
              onClick={onEditTransaction} 
              className="flex items-center text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
              title="Edit transaction details"
            >
              <FaEdit className="inline mr-1"/> Edit
            </button>
             <button
              onClick={onDeleteTransaction}
              className="flex items-center text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
              title="Delete entire transaction"
            >
             <FaTrashAlt className="inline mr-1"/> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionHeader; 