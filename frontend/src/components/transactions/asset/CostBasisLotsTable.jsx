import React, { useState } from 'react';

const CostBasisLotsTable = ({ lots, onSelectLot, onCalculateGainLoss }) => {
  const [selectedLot, setSelectedLot] = useState(null);
  const [salePrice, setSalePrice] = useState('');

  const handleSelectLot = (lot) => {
    setSelectedLot(lot);
    onSelectLot(lot);
  };

  const handleCalculateGainLoss = () => {
    if (!selectedLot || !salePrice) return;
    
    const gainLoss = (parseFloat(salePrice) - selectedLot.costPerUnit) * selectedLot.quantity;
    onCalculateGainLoss({
      lot: selectedLot,
      salePrice: parseFloat(salePrice),
      gainLoss
    });
  };

  return (
    <div className="mt-4 space-y-4">
      <h4 className="text-sm font-medium text-gray-700">Available Lots</h4>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost/Unit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {lots.map((lot) => (
              <tr key={lot.id} className={selectedLot?.id === lot.id ? 'bg-blue-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(lot.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {lot.quantity.toFixed(6)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${lot.costPerUnit.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${(lot.quantity * lot.costPerUnit).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => handleSelectLot(lot)}
                    className={`text-sm font-medium ${
                      selectedLot?.id === lot.id
                        ? 'text-blue-600'
                        : 'text-blue-500 hover:text-blue-700'
                    }`}
                  >
                    {selectedLot?.id === lot.id ? 'Selected' : 'Select Lot'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedLot && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Calculate Gain/Loss</h5>
          <div className="flex items-end space-x-4">
            <div className="flex-1">
              <label htmlFor="salePrice" className="block text-sm font-medium text-gray-700 mb-1">
                Sale Price per Unit
              </label>
              <input
                type="number"
                id="salePrice"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleCalculateGainLoss}
              disabled={!salePrice}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Calculate & Add Entry
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostBasisLotsTable; 