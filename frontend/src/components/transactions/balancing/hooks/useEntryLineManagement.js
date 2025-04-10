import { useState } from 'react';
import { updateEntryInTransaction, addEntryToTransaction, deleteEntryFromTransaction } from '../../../../services/transactionService';

/**
 * Custom hook for managing entry lines
 * @param {function} onSuccess - Callback for success, receives success message.
 * @param {function} onError - Callback for error, receives error message.
 */
export const useEntryLineManagement = (onSuccess, onError) => {
  const [loading, setLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editForm, setEditForm] = useState({
    amount: '',
    type: 'debit',
    description: ''
  });
  const [showAddEntryForm, setShowAddEntryForm] = useState(false);
  const [newEntryForm, setNewEntryForm] = useState({
    account: '',
    amount: '',
    type: 'debit',
    description: ''
  });

  // Reset state
  const resetState = () => {
    setSelectedEntry(null);
    setEditingEntry(null);
    setShowAddEntryForm(false);
    setNewEntryForm({
      account: '',
      amount: '',
      type: 'debit',
      description: ''
    });
  };

  // Update newEntryForm when balance analysis changes
  const updateNewEntryFormWithSuggestedFix = (suggestedFix, transactionDescription) => {
    if (!suggestedFix) return;
    
    setNewEntryForm({
      account: '',
      amount: suggestedFix.amount.toFixed(2),
      type: suggestedFix.type,
      description: `Balancing entry for ${transactionDescription}`
    });
  };

  // Handle editing an entry
  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setShowAddEntryForm(false);
    setSelectedEntry(null);
    setEditForm({
      amount: entry.amount,
      type: entry.type || entry.entryType, // Support both field names
      description: entry.description || ''
    });
  };

  // Update edited entry
  const handleUpdateEntry = async (entryId) => {
    if (!editingEntry || !entryId) {
      onError('Cannot update: Missing entry data.');
      return false;
    }
    const transactionId = editingEntry.transactionId || (editingEntry.transaction && editingEntry.transaction._id);
    if (!transactionId) {
      onError('Cannot update: Missing transaction ID.');
      return false;
    }
    
    const payload = {
      amount: parseFloat(editForm.amount),
      type: editForm.type,
      description: editForm.description
    };

    console.log('[useEntryLineManagement] Updating Entry:', { transactionId, entryId, payload });

    try {
      setLoading(true);
      
      await updateEntryInTransaction(transactionId, entryId, payload);
      
      onSuccess('Entry updated successfully!');
      
      return true;
    } catch (err) {
      const errorMsg = 'Failed to update entry: ' + (err.response?.data?.message || err.message || 'Please try again.');
      onError(errorMsg);
      console.error('Error updating entry:', err);
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Handle adding new entry
  const handleAddEntry = () => {
    setShowAddEntryForm(true);
    setSelectedEntry(null);
    setEditingEntry(null);
  };

  // Handle input change for new entry form
  const handleNewEntryChange = (e) => {
    const { name, value } = e.target;
    setNewEntryForm({
      ...newEntryForm,
      [name]: value
    });
  };

  // Save new entry
  const handleSaveNewEntry = async (transactionId) => {
    if (!newEntryForm.account || !newEntryForm.amount) {
      onError('Account and amount are required.');
      return false;
    }
    
    const payload = {
      accountId: newEntryForm.account,
      amount: parseFloat(newEntryForm.amount),
      type: newEntryForm.type,
      description: newEntryForm.description
    };

    console.log('[useEntryLineManagement] Saving New Entry:', { transactionId, payload });

    try {
      setLoading(true);
      
      await addEntryToTransaction(transactionId, payload);
      
      onSuccess('Entry added successfully!');
      
      return true;
    } catch (err) {
      const errorMsg = 'Failed to add entry: ' + (err.response?.data?.message || err.message || 'Please try again.');
      onError(errorMsg);
      console.error('Error adding entry:', err);
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting an entry
  const handleDeleteEntry = async (transactionId, entry, entryCount) => {
    if (!entry || !entry._id) return false;
    
    // Use the passed transactionId directly
    // const transactionId = entry.transactionId || (entry.transaction && entry.transaction._id);
    
    // Check if transactionId was actually passed
    if (!transactionId) {
      onError('Cannot delete entry: Transaction ID was not provided to hook function.');
      return false;
    }
    
    // We no longer need to prevent deleting the last entry - the backend will handle it
    const isLastEntry = entryCount === 1;
    const message = isLastEntry 
      ? `This is the only entry in this transaction. Deleting it will also delete the entire transaction. Proceed?`
      : `Are you sure you want to delete this ${entry.type || entry.entryType} entry of ${entry.amount}?`;
    
    if (!window.confirm(message)) {
      return false;
    }
    
    try {
      setLoading(true);
      
      // Delete entry
      await deleteEntryFromTransaction(transactionId, entry._id);
      
      // Reset selection state to avoid stale data
      setSelectedEntry(null);
      
      // Notify success
      const successMessage = isLastEntry 
        ? 'Entry and its transaction were deleted successfully!' 
        : 'Entry deleted successfully!';
        
      onSuccess(successMessage);
      
      return isLastEntry ? 'transaction_deleted' : true;
    } catch (err) {
      const errorMsg = 'Failed to delete entry: ' + (err.response?.data?.message || err.message || 'Please try again.');
      onError(errorMsg);
      console.error('Error deleting entry:', err);
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    selectedEntry,
    editingEntry,
    editForm,
    showAddEntryForm,
    newEntryForm,
    setSelectedEntry,
    setEditingEntry,
    setEditForm,
    setShowAddEntryForm,
    setNewEntryForm,
    resetState,
    updateNewEntryFormWithSuggestedFix,
    handleEditEntry,
    handleUpdateEntry,
    handleAddEntry,
    handleNewEntryChange,
    handleSaveNewEntry,
    handleDeleteEntry
  };
}; 