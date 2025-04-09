import React, { useState, useEffect } from 'react';
import { createAssetPrice, updateAssetPrice, fetchAccountUnits } from '../../services/assetPriceService';
import { toast } from 'react-toastify';

const AssetPriceForm = ({ assetPrice = null, onSave, onCancel }) => {
  const isEditing = Boolean(assetPrice);

  // Helper function to format Date to datetime-local compatible string (YYYY-MM-DDTHH:mm:ss)
  const formatDateTimeLocal = (date) => {
    const d = new Date(date);
    // Adjust for timezone offset to get local time correctly
    const offset = d.getTimezoneOffset();
    const adjustedDate = new Date(d.getTime() - (offset * 60 * 1000));
    // Return ISO string sliced to seconds precision
    return adjustedDate.toISOString().slice(0, 19);
  };

  const [formData, setFormData] = useState({
    unit: '',
    rate: '',
    date: formatDateTimeLocal(new Date()) // Use helper for initial state
  });
  const [availableUnits, setAvailableUnits] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(true);

  useEffect(() => {
    const loadUnits = async () => {
      try {
        setLoadingUnits(true);
        const units = await fetchAccountUnits();
        setAvailableUnits(units);
      } catch (err) {
        toast.error('Failed to load available units for pricing.');
        console.error('Error loading units:', err);
        setAvailableUnits([]);
      } finally {
        setLoadingUnits(false);
      }
    };
    loadUnits();
  }, []);

  useEffect(() => {
    if (isEditing && assetPrice) {
      setFormData({
        unit: assetPrice.unit,
        rate: assetPrice.rate,
        date: formatDateTimeLocal(assetPrice.date) // Use helper when editing
      });
      if (availableUnits.length > 0 && !availableUnits.includes(assetPrice.unit)) {
        setAvailableUnits(prev => [assetPrice.unit, ...prev].sort());
      }
    }
  }, [assetPrice, isEditing, availableUnits]);

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
      // Convert the local datetime string to a full UTC ISO string before sending
      const submissionData = {
        ...formData,
        date: new Date(formData.date).toISOString()
      };

      if (isEditing) {
        const updatedPrice = await updateAssetPrice(assetPrice._id, submissionData);
        toast.success('Asset price updated successfully!');
        // Pass the saved data back to the parent
        onSave(updatedPrice.data);
      } else {
        const newPrice = await createAssetPrice(submissionData);
        toast.success('Asset price created successfully!');
        // Pass the saved data back to the parent
        onSave(newPrice.data);
      }
    } catch (err) {
      toast.error('Failed to save asset price. Please try again.');
      console.error('Error saving asset price:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
          Unit *
        </label>
        <select
          id="unit"
          name="unit"
          value={formData.unit}
          onChange={handleChange}
          required
          disabled={loadingUnits || isEditing}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed px-3 py-2"
        >
          <option value="" disabled>{loadingUnits ? 'Loading units...' : 'Select Unit'}</option>
          {availableUnits.map(unit => (
            <option key={unit} value={unit}>{unit}</option>
          ))}
        </select>
        {isEditing && <p className="mt-1 text-xs text-gray-500">Unit cannot be changed during edit.</p>}
      </div>

      <div>
        <label htmlFor="rate" className="block text-sm font-medium text-gray-700">
          Asset Price (USD) *
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
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700">
          Date & Time *
        </label>
        <input
          type="datetime-local"
          id="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
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