import React, { useState, useEffect } from 'react';
import { fetchTransactions } from '../../../services/transactionService';

const CostBasisLotsTable = ({ accountId, assetUnit, onSelectLot, onCalculateGainLoss }) => {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedLot, setSelectedLot] = useState(null);
  const [salePrice, setSalePrice] = useState('');

  useEffect(() => {
    const loadLots = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Fetch transactions for this account
        const response = await fetchTransactions({ accountId });
        const transactions = response.data;
        
        // Filter for purchase entries of this asset
        const purchaseLots = transactions.flatMap(tx => 
          tx.entries
            .filter(entry => 
              entry.account === accountId && 
              entry.type === 'debit' && // Purchases are debits
              entry.unit === assetUnit
            )
            .map(entry => ({
              transactionId: tx._id,
              date: tx.date,
              amount: entry.amount,
              costPerUnit: entry.amount / entry.quantity,
              quantity: entry.quantity,
              memo: entry.memo || ''
            }))
        );
        
        setLots(purchaseLots);
      } catch (err) {
        setError('Failed to load cost basis lots. Please try again.');
        console.error('Error loading lots:', err);
      } finally {
        setLoading(false);
      }
    };

    if (accountId && assetUnit) {
      loadLots();
    }
  }, [accountId, assetUnit]);

  const handleSelectLot = (lot) => {
    setSelectedLot(lot);
    onSelectLot(lot);
  };

  const handleCalculateGainLoss = () => {
    if (!selectedLot || !salePrice) return;
    
    const salePriceNum = parseFloat(salePrice);
    if (isNaN(salePriceNum)) return;
    
    const gainLoss = (salePriceNum - selectedLot.costPerUnit) * selectedLot.quantity;
    onCalculateGainLoss(gainLoss);
  };

  if (loading) {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded">
        <div className="flex justify-center">
          <div className="animate-spin h-6 w-6 border-3 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 p-4 bg-red-50 text-red-600 rounded">
        {error}
      </div>
    );
  }

  if (lots.length === 0) {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded text-gray-500">
        No purchase lots found for this asset.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="bg-gray-50 p-4 rounded">
        <h4 className="font-medium text-gray-700 mb-3">Cost Basis Lots</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost/Unit</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {lots.map((lot, index) => (
                <tr key={index} className={selectedLot === lot ? 'bg-blue-50' : ''}>
                  <td className="px-3 py-2 text-sm text-gray-900">
                    {new Date(lot.date).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900">{lot.quantity}</td>
                  <td className="px-3 py-2 text-sm text-gray-900">
                    ${lot.costPerUnit.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900">
                    ${lot.amount.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <button
                      onClick={() => handleSelectLot(lot)}
                      className={`text-blue-600 hover:text-blue-900 ${
                        selectedLot === lot ? 'font-medium' : ''
                      }`}
                    >
                      Select Lot
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLot && (
        <div className="bg-blue-50 p-4 rounded">
          <h4 className="font-medium text-gray-700 mb-3">Calculate Gain/Loss</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sale Price per Unit
              </label>
              <input
                type="number"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter sale price"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleCalculateGainLoss}
                disabled={!salePrice}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Calculate & Add Gain/Loss Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostBasisLotsTable; 