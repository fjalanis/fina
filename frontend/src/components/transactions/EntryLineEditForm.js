import React from 'react';

const EntryLineEditForm = ({ 
  editingEntry, 
  editForm, 
  setEditForm, 
  onCancel, 
  onSave 
}) => {
  return (
    <div className="bg-blue-50 p-4 rounded-lg mb-4">
      <h4 className="font-medium mb-3">Edit Entry</h4>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account
          </label>
          <input 
            type="text"
            className="w-full p-2 border border-gray-300 rounded bg-gray-100"
            value={editingEntry.account?.name || 'Unknown Account'}
            disabled
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            className="w-full p-2 border border-gray-300 rounded"
            value={editForm.amount}
            onChange={(e) => setEditForm({...editForm, amount: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                className="mr-1"
                checked={editForm.type === 'debit'}
                onChange={() => setEditForm({...editForm, type: 'debit'})}
              />
              <span>Debit</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                className="mr-1"
                checked={editForm.type === 'credit'}
                onChange={() => setEditForm({...editForm, type: 'credit'})}
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
            className="w-full p-2 border border-gray-300 rounded"
            value={editForm.description}
            onChange={(e) => setEditForm({...editForm, description: e.target.value})}
            placeholder="Entry description"
          />
        </div>
        <div className="flex justify-end space-x-2 pt-2">
          <button
            onClick={onCancel}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EntryLineEditForm; 