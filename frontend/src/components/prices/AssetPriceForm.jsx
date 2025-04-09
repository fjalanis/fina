import React, { useState, useEffect } from 'react';
import { createAssetPrice, updateAssetPrice } from '../../services/assetPriceService';
import { toast } from 'react-toastify';

const AssetPriceForm = ({ assetPrice = null, onSave, onCancel }) => {
  const isEditing = Boolean(assetPrice);
  const [formData, setFormData] = useState({
    baseCurrency: '',
    targetCurrency: '',
    rate: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (isEditing && assetPrice) {
      setFormData({
        baseCurrency: assetPrice.baseCurrency,
        targetCurrency: assetPrice.targetCurrency,
        rate: assetPrice.rate,
        date: new Date(assetPrice.date).toISOString().split('T')[0]
      });
    }
  }, [assetPrice, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.rate <= 0) {
      toast.error('Asset price must be positive.');
      return;
    }

    try {
      if (isEditing) {
        await updateAssetPrice(assetPrice._id, formData);
        toast.success('Asset price updated successfully!');
      } else {
        await createAssetPrice(formData);
        toast.success('Asset price created successfully!');
      }
      onSave();
    } catch (err) {
      toast.error('Failed to save asset price. Please try again.');
      console.error('Error saving asset price:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="baseCurrency" className="block text-sm font-medium text-gray-700">
          Base Currency *
        </label>
        <input
          type="text"
          id="baseCurrency"
          name="baseCurrency"
          value={formData.baseCurrency}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="targetCurrency" className="block text-sm font-medium text-gray-700">
          Target Currency *
        </label>
        <input
          type="text"
          id="targetCurrency"
          name="targetCurrency"
          value={formData.targetCurrency}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="rate" className="block text-sm font-medium text-gray-700">
          Asset Price *
        </label>
        <input
          type="number"
          id="rate"
          name="rate"
          value={formData.rate}
          onChange={handleChange}
          required
          min="0"
          step="0.000001"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700">
          Date *
        </label>
        <input
          type="date"
          id="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          {isEditing ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
};

export default AssetPriceForm; 