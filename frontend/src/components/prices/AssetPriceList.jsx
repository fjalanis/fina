import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { fetchAssetPrices, deleteAssetPrice } from '../../services/assetPriceService';
import AssetPriceForm from './AssetPriceForm';
import { useSearchParams } from 'react-router-dom';
import Modal from '../common/Modal';

const AssetPriceList = () => {
  const [assetPrices, setAssetPrices] = useState([]);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPrice, setEditingPrice] = useState(null);
  const [searchParams] = useSearchParams();

  const loadAssetPrices = async () => {
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    try {
      const response = await fetchAssetPrices({ startDate, endDate });
      setAssetPrices(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load asset prices. Please try again.');
      console.error('Error loading asset prices:', err);
    }
  };

  useEffect(() => {
    loadAssetPrices();
  }, [searchParams]);

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

  const handleFormSave = (savedPrice) => {
    if (editingPrice) {
      setAssetPrices(prevPrices => 
        prevPrices.map(p => p._id === savedPrice._id ? savedPrice : p)
      );
    } else {
      setAssetPrices(prevPrices => 
        [savedPrice, ...prevPrices].sort((a, b) => new Date(b.date) - new Date(a.date))
      );
    }
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

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {assetPrices.map((price) => (
            <li key={price._id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Unit: {price.unit}
                  </p>
                  <p className="text-sm text-gray-500">
                    Price (USD): {price.rate} (as of {new Date(price.date).toLocaleString()})
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

      <Modal
        isOpen={showForm}
        onClose={handleFormClose}
        title={editingPrice ? 'Edit Asset Price' : 'Add Asset Price'}
        size="md"
      >
        <AssetPriceForm
          assetPrice={editingPrice}
          onSave={handleFormSave}
          onCancel={handleFormClose}
        />
      </Modal>
    </div>
  );
};

export default AssetPriceList; 