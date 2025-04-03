import React from 'react';
import { useTransactionForm } from './hooks/useTransactionForm';
import TransactionMetadataInputs from './TransactionMetadataInputs';
import EntryManager from './EntryManager';

const TransactionForm = ({ onSave, onCancel }) => {
  const {
    formData,
    entries,
    accounts,
    loadingAccounts,
    submitting,
    balance,
    handleTransactionChange,
    handleEntryLineChange,
    handleAddEntryLine,
    handleRemoveEntryLine,
    handleSubmit
  } = useTransactionForm(onSave);

  if (loadingAccounts) {
    return <div className="flex justify-center p-5"><div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>;
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <TransactionMetadataInputs 
            formData={formData} 
            onChange={handleTransactionChange} 
          />
          
          <EntryManager
            entries={entries}
            accounts={accounts}
            onEntriesChange={handleEntryLineChange}
          />
          
          {/* Submit/Cancel Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-4 py-2 rounded text-white ${
                submitting 
                  ? 'bg-blue-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
            >
              {submitting ? 'Creating...' : 'Create Transaction'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default TransactionForm; 