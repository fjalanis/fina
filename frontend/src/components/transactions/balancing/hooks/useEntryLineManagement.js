import { useState } from 'react';
import { updateEntryInTransaction, addEntryToTransaction, deleteEntryFromTransaction } from '../../../../services/transactionService';

/**
 * Custom hook for managing entry lines
 */
export const useEntryLineManagement = (toast) => {
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
  const handleUpdateEntry = async (transactionId, entryId) => {
    if (!entryId || !transactionId) return;
    
    try {
      setLoading(true);
      
      await updateEntryInTransaction(transactionId, entryId, {
        amount: parseFloat(editForm.amount),
        type: editForm.type,
        description: editForm.description
      });
      
      setEditingEntry(null);
      
      // Notify success
      toast.success('Entry updated successfully!');
      
      return true;
    } catch (err) {
      const errorMsg = 'Failed to update entry: ' + (err.message || 'Please try again.');
      toast.error(errorMsg);
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
      toast.error('Account and amount are required.');
      return false;
    }
    
    try {
      setLoading(true);
      
      await addEntryToTransaction(transactionId, {
        account: newEntryForm.account,
        amount: parseFloat(newEntryForm.amount),
        type: newEntryForm.type,
        description: newEntryForm.description
      });
      
      setShowAddEntryForm(false);
      
      // Notify success
      toast.success('Entry added successfully!');
      
      return true;
    } catch (err) {
      const errorMsg = 'Failed to add entry: ' + (err.message || 'Please try again.');
      toast.error(errorMsg);
      console.error('Error adding entry:', err);
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting an entry
  const handleDeleteEntry = async (entry, entryCount) => {
    if (!entry || !entry._id) return false;
    
    // We need the transaction ID to delete an entry
    const transactionId = entry.transactionId || (entry.transaction && entry.transaction._id);
    
    if (!transactionId) {
      toast.error('Cannot delete entry: Missing transaction ID');
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
        
      toast.success(successMessage);
      
      return isLastEntry ? 'transaction_deleted' : true;
    } catch (err) {
      const errorMsg = 'Failed to delete entry: ' + (err.message || 'Please try again.');
      toast.error(errorMsg);
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