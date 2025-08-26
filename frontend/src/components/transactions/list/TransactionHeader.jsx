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
  const [formData, setFormData] = useState(() => {
    const isCreating = transaction?._id === null;
    const defaultDate = inputDateFormat(new Date());
    return {
      date: transaction?.date ? inputDateFormat(transaction.date) : (isCreating ? defaultDate : ''),
      description: transaction?.description ?? '',
      reference: transaction?.reference ?? '',
      notes: transaction?.notes ?? '',
      contactPhone: transaction?.contact?.phone ?? '',
      contactUrl: transaction?.contact?.url ?? '',
      locationAddress: transaction?.location?.address ?? '',
      locationCity: transaction?.location?.city ?? '',
      locationState: transaction?.location?.state ?? '',
      locationCountry: transaction?.location?.country ?? '',
      owner: transaction?.owner ?? '',
      category: transaction?.category ?? '',
      zipCode: transaction?.zipCode ?? '',
      memo: transaction?.memo ?? ''
    };
  });

  // Need effect to update formData IF isEditing becomes false (e.g., cancel)
  // or if the transaction ID changes (modal switched to different transaction)
  useEffect(() => {
    // If not editing, reset form to reflect the potentially updated transaction prop
    if (!isEditing && transaction) { 
      const isCreating = transaction?._id === null;
      const defaultDate = inputDateFormat(new Date());
      setFormData({
        date: transaction?.date ? inputDateFormat(transaction.date) : (isCreating ? defaultDate : ''),
        description: transaction?.description ?? '', 
        reference: transaction?.reference ?? '',
        notes: transaction?.notes ?? '',
        contactPhone: transaction?.contact?.phone ?? '',
        contactUrl: transaction?.contact?.url ?? '',
        locationAddress: transaction?.location?.address ?? '',
        locationCity: transaction?.location?.city ?? '',
        locationState: transaction?.location?.state ?? '',
        locationCountry: transaction?.location?.country ?? '',
        owner: transaction?.owner ?? '',
        category: transaction?.category ?? '',
        zipCode: transaction?.zipCode ?? '',
        memo: transaction?.memo ?? ''
      });
    }
    // Run when isEditing changes or the transaction we are viewing changes ID
  }, [isEditing, transaction?._id]); // Include transaction?._id to reset if modal switches txn

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
        <>
        {/* EDIT MODE */}
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
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="owner" className="block text-xs font-medium text-gray-700 mb-1">Owner</label>
              <input 
                type="text"
                name="owner"
                id="owner"
                value={formData.owner}
                onChange={handleChange}
                className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Card Member"
              />
            </div>
            <div>
              <label htmlFor="category" className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <input 
                type="text"
                name="category"
                id="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Category"
              />
            </div>
            <div>
              <label htmlFor="zipCode" className="block text-xs font-medium text-gray-700 mb-1">Zip Code</label>
              <input 
                type="text"
                name="zipCode"
                id="zipCode"
                value={formData.zipCode}
                onChange={handleChange}
                className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Zip Code"
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
          <div>
            <label htmlFor="memo" className="block text-xs font-medium text-gray-700 mb-1">Memo</label>
            <textarea
              name="memo"
              id="memo"
              rows="3"
              value={formData.memo}
              onChange={handleChange}
              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Extended Details / Memo"
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="contactPhone" className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
            <input 
              type="text"
              name="contactPhone"
              id="contactPhone"
              value={formData.contactPhone}
              onChange={handleChange}
              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="(800)123-4567"
            />
          </div>
          <div>
            <label htmlFor="contactUrl" className="block text-xs font-medium text-gray-700 mb-1">URL</label>
            <input 
              type="url"
              name="contactUrl"
              id="contactUrl"
              value={formData.contactUrl}
              onChange={handleChange}
              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="https://example.com"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
          <div className="grid grid-cols-4 gap-3">
            <input
              type="text"
              name="locationAddress"
              value={formData.locationAddress}
              onChange={handleChange}
              className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Address"
            />
            <input
              type="text"
              name="locationCity"
              value={formData.locationCity}
              onChange={handleChange}
              className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="City"
            />
            <input
              type="text"
              name="locationState"
              value={formData.locationState}
              onChange={handleChange}
              className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="State"
            />
            <input
              type="text"
              name="locationCountry"
              value={formData.locationCountry}
              onChange={handleChange}
              className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Country"
            />
          </div>
        </div>
        </>
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