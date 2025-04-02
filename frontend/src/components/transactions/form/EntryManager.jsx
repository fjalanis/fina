import React from 'react';

const EntryManager = ({ 
  entries, 
  accounts, 
  balance, 
  description, // For placeholder
  onEntryChange, 
  onAddEntry, 
  onRemoveEntry 
}) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Entry Lines</h3>
        <button
          type="button"
          onClick={onAddEntry}
          className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Line
        </button>
      </div>
      
      <div className="bg-gray-50 p-4 rounded">
        {entries.map((entry, index) => (
          <div key={index} className="mb-4 pb-4 border-b border-gray-200 last:border-b-0 last:mb-0 last:pb-0">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-gray-700">Line {index + 1}</h4>
              {entries.length > 2 && (
                <button
                  type="button"
                  onClick={() => onRemoveEntry(index)}
                  className="text-red-600 hover:text-red-800"
                  aria-label={`Remove line ${index + 1}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account *
                </label>
                <select
                  name="account"
                  value={entry.account}
                  onChange={(e) => onEntryChange(index, e)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select an account</option>
                  {accounts.map(account => (
                    <option key={account._id} value={account._id}>
                      {account.name} ({account.type})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  name="description"
                  value={entry.description}
                  onChange={(e) => onEntryChange(index, e)}
                  placeholder={description} // Use main description as placeholder
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount *
                </label>
                <input
                  type="number"
                  name="amount"
                  value={entry.amount}
                  onChange={(e) => onEntryChange(index, e)}
                  step="0.01"
                  min="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type *
                </label>
                <select
                  name="type"
                  value={entry.type}
                  onChange={(e) => onEntryChange(index, e)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="debit">Debit</option>
                  <option value="credit">Credit</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Balance Indicator */}
      <div className="mt-4 flex justify-end">
        <div className={`text-sm font-medium p-2 rounded ${
          Math.abs(balance) < 0.001 ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
        }`}>
          Balance: ${balance.toFixed(2)}
        </div>
      </div>
    </div>
  );
};

export default EntryManager; 