import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { fetchExchangeRates, deleteExchangeRate } from '../../services/exchangeRateService';
import ExchangeRateForm from './ExchangeRateForm';

const ExchangeRateList = () => {
  const [exchangeRates, setExchangeRates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  
  const loadExchangeRates = async () => {
    try {
      setLoading(true);
      const response = await fetchExchangeRates();
      setExchangeRates(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load exchange rates. Please try again.');
      console.error('Error loading exchange rates:', err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadExchangeRates();
  }, []);
  
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this exchange rate?')) {
      return;
    }
    
    try {
      await deleteExchangeRate(id);
      toast.success('Exchange rate deleted successfully!');
      loadExchangeRates();
    } catch (err) {
      toast.error('Failed to delete exchange rate. Please try again.');
      console.error('Error deleting exchange rate:', err);
    }
  };
  
  const handleEdit = (rate) => {
    setEditingRate(rate);
    setShowForm(true);
  };
  
  const handleFormClose = () => {
    setShowForm(false);
    setEditingRate(null);
  };
  
  const handleFormSave = () => {
    setShowForm(false);
    setEditingRate(null);
    loadExchangeRates();
  };
  
  if (loading) {
    return (
      <div className="flex justify-center p-5">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Exchange Rates</h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Add Exchange Rate
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded">
          {error}
        </div>
      )}
      
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">
            {editingRate ? 'Edit Exchange Rate' : 'Add Exchange Rate'}
          </h3>
          <ExchangeRateForm
            exchangeRate={editingRate}
            onSave={handleFormSave}
            onCancel={handleFormClose}
          />
        </div>
      )}
      
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {exchangeRates.map((rate) => (
            <li key={rate._id}>
              <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="text-sm font-medium text-blue-600 truncate">
                      {rate.baseCurrency} → {rate.targetCurrency}
                    </div>
                    <div className="ml-2 flex-shrink-0 flex">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {rate.rate.toFixed(6)}
                      </span>
                    </div>
                  </div>
                  <div className="ml-2 flex-shrink-0 flex">
                    <div className="text-sm text-gray-500">
                      {new Date(rate.date).toLocaleDateString()}
                    </div>
                    <div className="ml-4 flex space-x-2">
                      <button
                        onClick={() => handleEdit(rate)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(rate._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ExchangeRateList; 