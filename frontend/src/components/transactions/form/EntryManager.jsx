import React, { useState } from 'react';
import CostBasisLotsTable from './CostBasisLotsTable';

const EntryManager = ({ entries, accounts, onEntriesChange }) => {
  const [showLotsTable, setShowLotsTable] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);

  const handleAddEntry = () => {
    onEntriesChange([
      ...entries,
      {
        account: '',
        description: '',
        amount: '',
        type: 'debit',
      }
    ]);
  };

  const handleRemoveEntry = (index) => {
    const newEntries = entries.filter((_, i) => i !== index);
    onEntriesChange(newEntries);
  };

  const handleEntryChange = (index, e) => {
    const { name, value } = e.target;
    const newEntries = entries.map((entry, i) => {
      if (i === index) {
        return { ...entry, [name]: value };
      }
      return entry;
    });
    onEntriesChange(newEntries);
  };

  const handleAccountChange = (index, accountId) => {
    const account = accounts.find(a => a._id === accountId);
    setSelectedAccount(account);
    setShowLotsTable(account?.unit !== 'USD');
    handleEntryChange(index, { target: { name: 'account', value: accountId } });
  };

  const handleLotSelection = (lot) => {
    // Update the entry with the selected lot's details
    const entryIndex = entries.findIndex(e => e.account === selectedAccount._id);
    if (entryIndex !== -1) {
      handleEntryChange(entryIndex, { target: { name: 'quantity', value: lot.quantity } });
      handleEntryChange(entryIndex, { target: { name: 'amount', value: lot.amount } });
    }
  };

  const handleGainLossCalculation = (gainLoss) => {
    // Add a new entry for the gain/loss
    const newEntry = {
      account: selectedAccount._id,
      description: 'Capital Gain/Loss',
      amount: gainLoss.toString(),
      type: gainLoss >= 0 ? 'credit' : 'debit',
      unit: 'USD',
      quantity: ''
    };
    onEntriesChange([...entries, newEntry]);
  };

  return (
    <div className="space-y-4">
      {entries.map((entry, index) => (
        <div key={index} className="bg-white p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-4 items-end">
            <div className="sm:col-span-1 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account
              </label>
              <select
                name="account"
                value={entry.account}
                onChange={(e) => handleAccountChange(index, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select an account</option>
                {accounts.map((account) => (
                  <option key={account._id} value={account._id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                name="description"
                value={entry.description}
                onChange={(e) => handleEntryChange(index, e)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter description"
              />
            </div>

            <div className="sm:col-span-1 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <input
                type="number"
                name="amount"
                value={entry.amount}
                onChange={(e) => handleEntryChange(index, e)}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter amount"
              />
            </div>

            <div className="sm:col-span-1 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                name="type"
                value={entry.type}
                onChange={(e) => handleEntryChange(index, e)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
              </select>
            </div>

            <div className="sm:col-span-1 md:col-span-1 flex justify-end items-end">
              <button
                onClick={() => handleRemoveEntry(index)}
                className="px-3 py-2 text-sm text-red-600 hover:text-red-900"
              >
                Remove
              </button>
            </div>
          </div>

          {showLotsTable && selectedAccount && (
            <CostBasisLotsTable
              accountId={selectedAccount._id}
              assetUnit={selectedAccount.unit}
              onSelectLot={handleLotSelection}
              onCalculateGainLoss={handleGainLossCalculation}
            />
          )}
        </div>
      ))}

      <button
        onClick={handleAddEntry}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Add Entry
      </button>
    </div>
  );
};

export default EntryManager; 