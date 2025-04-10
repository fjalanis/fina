import React from 'react';

const EntryLineAddForm = ({ 
  accounts, 
  newEntryForm, 
  handleNewEntryChange,
  onCancel, 
  onSubmit,
}) => {

  // Intermediary submit handler to prevent default page refresh
  const handleSubmit = (event) => {
    event.preventDefault(); // Stop the browser from reloading the page
    onSubmit(); // Call the original onSubmit prop (handleSaveNewEntry)
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Description (Optional)
        </label>
        <input
          type="text"
          name="description"
          className="w-full px-2 py-1 border border-gray-300 rounded-md text-xs"
          value={newEntryForm.description}
          onChange={handleNewEntryChange}
          placeholder="Entry description"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div className="col-span-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Account *
          </label>
          <select
            name="account"
            value={newEntryForm.account}
            onChange={handleNewEntryChange}
            className="w-full px-2 py-1 border border-gray-300 rounded-md text-xs"
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
        <div className="col-span-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Amount *
          </label>
          <input
            type="number"
            name="amount"
            min="0.01"
            step="0.01"
            className="w-full px-2 py-1 border border-gray-300 rounded-md text-xs"
            value={newEntryForm.amount}
            onChange={handleNewEntryChange}
            required
          />
        </div>
        <div className="col-span-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Type *
          </label>
          <div className="flex space-x-4 items-center h-full pt-1">
            <label className="flex items-center">
              <input
                type="radio"
                name="type"
                className="mr-1 h-3 w-3"
                value="debit"
                checked={newEntryForm.type === 'debit'}
                onChange={handleNewEntryChange}
              />
              <span className="text-xs text-gray-700">Debit</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="type"
                className="mr-1 h-3 w-3"
                value="credit"
                checked={newEntryForm.type === 'credit'}
                onChange={handleNewEntryChange}
              />
              <span className="text-xs text-gray-700">Credit</span>
            </label>
          </div>
        </div>
      </div>
      <div className="flex justify-end space-x-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-xs"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-xs"
        >
          Add Entry
        </button>
      </div>
    </form>
  );
};

export default EntryLineAddForm; 