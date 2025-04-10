import React from 'react';

const EntryLineEditForm = ({ 
  editingEntry, 
  editForm, 
  setEditForm, 
  onCancel, 
  onSave 
}) => {
  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Description (Optional)
        </label>
        <input
          type="text"
          className="w-full px-2 py-1 border border-gray-300 rounded-md text-xs"
          value={editForm.description}
          onChange={(e) => setEditForm({...editForm, description: e.target.value})}
          placeholder="Entry description"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div className="col-span-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Account
          </label>
          <input 
            type="text"
            className="w-full px-2 py-1 border border-gray-300 rounded-md bg-gray-100 text-xs"
            value={editingEntry.account?.name || 'Unknown Account'}
            disabled
          />
        </div>
        <div className="col-span-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Amount
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            className="w-full px-2 py-1 border border-gray-300 rounded-md text-xs"
            value={editForm.amount}
            onChange={(e) => setEditForm({...editForm, amount: e.target.value})}
          />
        </div>
        <div className="col-span-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Type
          </label>
          <div className="flex space-x-4 items-center h-full pt-1">
            <label className="flex items-center">
              <input
                type="radio"
                className="mr-1 h-3 w-3"
                checked={editForm.type === 'debit'}
                onChange={() => setEditForm({...editForm, type: 'debit'})}
              />
              <span className="text-xs text-gray-700">Debit</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                className="mr-1 h-3 w-3"
                checked={editForm.type === 'credit'}
                onChange={() => setEditForm({...editForm, type: 'credit'})}
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
          type="button"
          onClick={onSave}
          className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-xs"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default EntryLineEditForm; 