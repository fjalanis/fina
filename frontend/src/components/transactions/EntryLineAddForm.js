import React from 'react';

const EntryLineAddForm = ({ 
  accounts, 
  newEntryForm, 
  handleNewEntryChange,
  onCancel, 
  onSubmit 
}) => {
  return (
    <div className="bg-blue-50 p-4 rounded-lg mb-4">
      <h4 className="font-medium mb-3">Add New Entry</h4>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account *
          </label>
          <select
            name="account"
            value={newEntryForm.account}
            onChange={handleNewEntryChange}
            className="w-full p-2 border border-gray-300 rounded"
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
            Amount *
          </label>
          <input
            type="number"
            name="amount"
            min="0.01"
            step="0.01"
            className="w-full p-2 border border-gray-300 rounded"
            value={newEntryForm.amount}
            onChange={handleNewEntryChange}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type *
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="type"
                className="mr-1"
                checked={newEntryForm.type === 'debit'}
                onChange={() => handleNewEntryChange({ 
                  target: { name: 'type', value: 'debit' } 
                })}
              />
              <span>Debit</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="type"
                className="mr-1"
                checked={newEntryForm.type === 'credit'}
                onChange={() => handleNewEntryChange({ 
                  target: { name: 'type', value: 'credit' } 
                })}
              />
              <span>Credit</span>
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (Optional)
          </label>
          <input
            type="text"
            name="description"
            className="w-full p-2 border border-gray-300 rounded"
            value={newEntryForm.description}
            onChange={handleNewEntryChange}
            placeholder="Entry description"
          />
        </div>
        <div className="flex justify-end space-x-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Add Entry
          </button>
        </div>
      </form>
    </div>
  );
};

export default EntryLineAddForm; 