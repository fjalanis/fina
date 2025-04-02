import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { createExchangeRate, updateExchangeRate } from '../../services/exchangeRateService';

const ExchangeRateForm = ({ exchangeRate = null, onSave, onCancel }) => {
  const isEditing = Boolean(exchangeRate);
  
  const [formData, setFormData] = useState({
    baseCurrency: '',
    targetCurrency: '',
    rate: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  const [submitting, setSubmitting] = useState(false);
  
  // If editing, populate form with existing data
  useEffect(() => {
    if (isEditing && exchangeRate) {
      setFormData({
        baseCurrency: exchangeRate.baseCurrency,
        targetCurrency: exchangeRate.targetCurrency,
        rate: exchangeRate.rate,
        date: new Date(exchangeRate.date).toISOString().split('T')[0]
      });
    }
  }, [exchangeRate, isEditing]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.baseCurrency || !formData.targetCurrency || !formData.rate || !formData.date) {
      toast.error('Please fill in all required fields.');
      return;
    }
    
    // Validate rate is positive
    if (parseFloat(formData.rate) <= 0) {
      toast.error('Exchange rate must be positive.');
      return;
    }
    
    try {
      setSubmitting(true);
      
      if (isEditing) {
        await updateExchangeRate(exchangeRate._id, formData);
        toast.success('Exchange rate updated successfully!');
      } else {
        await createExchangeRate(formData);
        toast.success('Exchange rate created successfully!');
      }
      
      if (onSave) onSave();
    } catch (err) {
      toast.error('Failed to save exchange rate. Please try again.');
      console.error('Error saving exchange rate:', err);
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="baseCurrency" className="block text-sm font-medium text-gray-700 mb-1">
                Base Currency/Asset *
              </label>
              <input
                type="text"
                id="baseCurrency"
                name="baseCurrency"
                value={formData.baseCurrency}
                onChange={handleChange}
                required
                maxLength={20}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., AAPL, USD"
              />
            </div>
            
            <div>
              <label htmlFor="targetCurrency" className="block text-sm font-medium text-gray-700 mb-1">
                Target Currency/Asset *
              </label>
              <input
                type="text"
                id="targetCurrency"
                name="targetCurrency"
                value={formData.targetCurrency}
                onChange={handleChange}
                required
                maxLength={20}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., USD, EUR"
              />
            </div>
            
            <div>
              <label htmlFor="rate" className="block text-sm font-medium text-gray-700 mb-1">
                Exchange Rate *
              </label>
              <input
                type="number"
                id="rate"
                name="rate"
                value={formData.rate}
                onChange={handleChange}
                required
                min="0.000001"
                step="0.000001"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 1.5"
              />
            </div>
            
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExchangeRateForm; 