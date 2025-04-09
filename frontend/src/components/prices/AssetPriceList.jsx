import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { fetchAssetPrices, deleteAssetPrice } from '../../services/assetPriceService';
import AssetPriceForm from './AssetPriceForm';

const AssetPriceList = () => {
  const [assetPrices, setAssetPrices] = useState([]);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPrice, setEditingPrice] = useState(null);

  const loadAssetPrices = async () => {
    try {
      const response = await fetchAssetPrices();
      setAssetPrices(response.data);
    } catch (err) {
      setError('Failed to load asset prices. Please try again.');
      console.error('Error loading asset prices:', err);
    }
  };

  useEffect(() => {
    loadAssetPrices();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this asset price?')) {
      return;
    }

    try {
      await deleteAssetPrice(id);
      toast.success('Asset price deleted successfully!');
      loadAssetPrices();
    } catch (err) {
      toast.error('Failed to delete asset price. Please try again.');
      console.error('Error deleting asset price:', err);
    }
  };

  const handleEdit = (price) => {
    setEditingPrice(price);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingPrice(null);
  };

  const handleFormSave = () => {
    loadAssetPrices();
    handleFormClose();
  };

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Asset Prices</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Add Asset Price
        </button>
      </div>

      {showForm && (
        <div className="mb-8 bg-white p-6 rounded-lg shadow">
          <AssetPriceForm
            assetPrice={editingPrice}
            onSave={handleFormSave}
            onCancel={handleFormClose}
          />
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {assetPrices.map((price) => (
            <li key={price._id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {price.baseCurrency} → {price.targetCurrency}
                  </p>
                  <p className="text-sm text-gray-500">
                    Price: {price.rate} (as of {new Date(price.date).toLocaleDateString()})
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleEdit(price)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(price._id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AssetPriceList; 