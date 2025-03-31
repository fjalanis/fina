import React, { useState, useEffect } from 'react';
import { transactionApi, entryLineApi, accountApi } from '../../services/api';
import Modal from '../common/Modal';
import { formatCurrency, formatDate } from './TransactionBalancerUtils';

const TransactionBalanceModal = ({ isOpen, onClose, transaction, onTransactionBalanced }) => {
  const [loading, setLoading] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [balanceData, setBalanceData] = useState(null);
  const [suggestedMatches, setSuggestedMatches] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editForm, setEditForm] = useState({
    amount: '',
    type: 'debit',
    description: ''
  });
  const [accounts, setAccounts] = useState([]);
  const [showAddEntryForm, setShowAddEntryForm] = useState(false);
  const [newEntryForm, setNewEntryForm] = useState({
    account: '',
    amount: '',
    type: 'debit',
    description: ''
  });

  // Load transaction balance data when opened
  useEffect(() => {
    if (isOpen && transaction) {
      analyzeTransactionBalance();
      fetchAccounts();
    }
  }, [isOpen, transaction]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedEntry(null);
      setSuggestedMatches([]);
      setError(null);
      setSuccessMessage(null);
      setEditingEntry(null);
      setShowAddEntryForm(false);
    }
  }, [isOpen]);

  // Fetch accounts for dropdown
  const fetchAccounts = async () => {
    try {
      const response = await accountApi.getAccounts();
      setAccounts(response.data);
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError('Failed to load accounts.');
    }
  };

  // Calculate transaction balance and analyze issues
  const analyzeTransactionBalance = async () => {
    try {
      setLoading(true);
      
      // Make sure we have the latest data
      const response = await transactionApi.getTransaction(transaction._id);
      const freshTransaction = response.data;
      
      if (!freshTransaction || !freshTransaction.entryLines) {
        throw new Error('Could not retrieve transaction details');
      }

      let totalDebits = 0;
      let totalCredits = 0;
      
      // Calculate totals and identify potential issues
      freshTransaction.entryLines.forEach(entry => {
        const amount = parseFloat(entry.amount);
        if (entry.type === 'debit') {
          totalDebits += amount;
        } else {
          totalCredits += amount;
        }
      });
      
      const netBalance = totalDebits - totalCredits;
      const isBalanced = Math.abs(netBalance) < 0.001;
      
      // Set balance data
      setBalanceData({
        transaction: freshTransaction,
        totalDebits,
        totalCredits,
        netBalance,
        isBalanced,
        suggestedFix: getSuggestedFix(totalDebits, totalCredits)
      });
      
      // If there's an imbalance, pre-populate the new entry form
      if (!isBalanced) {
        const fix = getSuggestedFix(totalDebits, totalCredits);
        setNewEntryForm({
          account: '',
          amount: fix.amount.toFixed(2),
          type: fix.type,
          description: `Balancing entry for ${freshTransaction.description}`
        });
      }
      
      setError(null);
    } catch (err) {
      console.error('Error analyzing transaction:', err);
      setError('Failed to analyze transaction balance.');
    } finally {
      setLoading(false);
    }
  };

  // Determine suggested fix based on imbalance
  const getSuggestedFix = (totalDebits, totalCredits) => {
    const netBalance = totalDebits - totalCredits;
    
    if (Math.abs(netBalance) < 0.001) {
      return { action: 'none', message: 'Transaction is already balanced.' };
    }
    
    if (netBalance > 0) {
      // Missing credit entries
      return {
        action: 'add',
        type: 'credit',
        amount: netBalance,
        message: `Add a credit entry of ${formatCurrency(netBalance)} to balance this transaction.`
      };
    } else {
      // Missing debit entries
      return {
        action: 'add',
        type: 'debit',
        amount: Math.abs(netBalance),
        message: `Add a debit entry of ${formatCurrency(Math.abs(netBalance))} to balance this transaction.`
      };
    }
  };

  // Handle selecting an entry to work with
  const handleEntrySelect = async (entry) => {
    try {
      setSelectedEntry(entry);
      setMatchLoading(true);
      setSuggestedMatches([]);
      setShowAddEntryForm(false);
      
      // Get suggested matches for this entry
      const response = await transactionApi.getSuggestedMatches(entry._id);
      
      if (response.data && response.data.matches) {
        // Filter out matches from the same transaction
        const filteredMatches = response.data.matches.filter(match => {
          return match.transaction._id !== transaction._id;
        });
        
        setSuggestedMatches(filteredMatches);
      } else {
        setSuggestedMatches([]);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error finding matches:', err);
      setError('Failed to find matching entries.');
      setSuggestedMatches([]);
    } finally {
      setMatchLoading(false);
    }
  };

  // Handle matching entries to balance transaction
  const handleBalanceWithMatch = async (matchedEntry) => {
    if (!selectedEntry || !matchedEntry) return;
    
    try {
      setLoading(true);
      
      // Call the balanceTransactions API
      await transactionApi.balanceTransactions(selectedEntry._id, matchedEntry._id);
      
      setSuccessMessage('Transactions successfully balanced!');
      
      // Reset selection state
      setSelectedEntry(null);
      setSuggestedMatches([]);
      
      // Update transaction data in modal
      analyzeTransactionBalance();
      
      // This operation merges transactions, so we do need to notify the parent
      // to update its transaction list, but we do it after updating local state
      if (onTransactionBalanced) {
        onTransactionBalanced();
      }
      
      setTimeout(() => {
        setSuccessMessage(null);
      }, 1500);
      
    } catch (err) {
      setError('Failed to balance transactions. Please try again.');
      console.error('Error balancing transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle editing an entry
  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setShowAddEntryForm(false);
    setSelectedEntry(null);
    setSuggestedMatches([]);
    setEditForm({
      amount: entry.amount,
      type: entry.type,
      description: entry.description || ''
    });
  };

  // Handle updating an entry
  const handleUpdateEntry = async () => {
    if (!editingEntry) return;
    
    try {
      setLoading(true);
      
      // Validate amount
      const amount = parseFloat(editForm.amount);
      if (isNaN(amount) || amount <= 0) {
        setError('Please enter a valid positive amount.');
        setLoading(false);
        return;
      }
      
      // Update entry
      await entryLineApi.updateEntryLine(editingEntry._id, {
        amount,
        type: editForm.type,
        description: editForm.description
      });
      
      setSuccessMessage('Entry updated successfully!');
      
      // Update transaction data locally
      await analyzeTransactionBalance();
      
      // Also update the transaction list to reflect balance changes
      if (onTransactionBalanced) {
        onTransactionBalanced();
      }
      
      // Reset editing state
      setEditingEntry(null);
      
      setTimeout(() => {
        setSuccessMessage(null);
      }, 1500);
      
    } catch (err) {
      setError('Failed to update entry. Please try again.');
      console.error('Error updating entry:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle adding a new entry form display
  const handleAddEntry = () => {
    setShowAddEntryForm(true);
    setSelectedEntry(null);
    setSuggestedMatches([]);
    setEditingEntry(null);
  };
  
  // Handle new entry form changes
  const handleNewEntryChange = (e) => {
    const { name, value } = e.target;
    setNewEntryForm({
      ...newEntryForm,
      [name]: value
    });
  };
  
  // Handle saving new entry
  const handleSaveNewEntry = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Validate form
      if (!newEntryForm.account) {
        setError('Please select an account.');
        setLoading(false);
        return;
      }
      
      const amount = parseFloat(newEntryForm.amount);
      if (isNaN(amount) || amount <= 0) {
        setError('Please enter a valid positive amount.');
        setLoading(false);
        return;
      }
      
      // Create new entry
      await transactionApi.addEntryLine(transaction._id, {
        account: newEntryForm.account,
        amount: amount,
        type: newEntryForm.type,
        description: newEntryForm.description
      });
      
      setSuccessMessage('New entry added successfully!');
      
      // Reset form immediately
      setNewEntryForm({
        account: '',
        amount: '',
        type: 'debit',
        description: ''
      });
      
      // Update transaction data locally
      await analyzeTransactionBalance();
      
      // Also update the transaction list to reflect balance changes
      if (onTransactionBalanced) {
        onTransactionBalanced();
      }
      
      setTimeout(() => {
        setSuccessMessage(null);
        setShowAddEntryForm(false);
      }, 1500);
      
    } catch (err) {
      setError('Failed to add new entry. Please try again.');
      console.error('Error adding new entry:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting an entry
  const handleDeleteEntry = async (entry) => {
    if (!entry) return;
    
    // We no longer need to prevent deleting the last entry - the backend will handle it
    // by deleting the transaction automatically
    const isLastEntry = balanceData?.transaction?.entryLines?.length === 1;
    const message = isLastEntry 
      ? `This is the only entry in this transaction. Deleting it will also delete the entire transaction. Proceed?`
      : `Are you sure you want to delete this ${entry.type} entry of ${formatCurrency(entry.amount)}?`;
    
    if (!window.confirm(message)) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Delete entry
      await entryLineApi.deleteEntryLine(entry._id);
      
      // If it was the last entry, the transaction is now gone too
      if (isLastEntry) {
        setSuccessMessage('Entry and its transaction were deleted successfully!');
        setTimeout(() => {
          setSuccessMessage(null);
          // Close the modal since transaction is gone
          onClose();
          
          // Notify parent component when the transaction is gone
          if (onTransactionBalanced) {
            onTransactionBalanced();
          }
        }, 1500);
      } else {
        setSuccessMessage('Entry deleted successfully!');
        
        // Reset selection state to avoid stale data
        setSelectedEntry(null);
        setSuggestedMatches([]);
        
        // Just update the transaction data within the modal
        await analyzeTransactionBalance();
        
        // Still notify parent to update the transaction list
        // This is needed to update the balance status in the list
        if (onTransactionBalanced) {
          onTransactionBalanced();
        }
        
        setTimeout(() => {
          setSuccessMessage(null);
        }, 1500);
      }
      
    } catch (err) {
      console.error('Error deleting entry:', err);
      
      // More specific error message
      if (err.message === 'Server Error') {
        setError('The server refused to delete this entry. It may be needed to maintain transaction integrity.');
      } else {
        setError(`Failed to delete entry: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting the entire transaction
  const handleDeleteTransaction = async () => {
    if (!transaction) return;

    if (!window.confirm(`Are you sure you want to delete the entire transaction "${transaction.description}"? This cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      
      // Delete the transaction
      await transactionApi.deleteTransaction(transaction._id);
      
      setSuccessMessage('Transaction deleted successfully!');
      setTimeout(() => {
        // Close the modal
        onClose();
        
        // Notify parent component to refresh the list
        if (onTransactionBalanced) {
          onTransactionBalanced();
        }
      }, 1500);
      
    } catch (err) {
      console.error('Error deleting transaction:', err);
      setError(`Failed to delete transaction: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!transaction) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Balance Transaction"
      size="lg"
    >
      {loading && !balanceData ? (
        <div className="flex justify-center p-5">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
      ) : (
        <div>
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
              <p>{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
              <p>{successMessage}</p>
            </div>
          )}

          {balanceData && (
            <div className="space-y-6">
              {/* Transaction Header with delete option */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center">
                    <h3 className="font-medium text-lg">{balanceData.transaction.description}</h3>
                    <button
                      onClick={handleDeleteTransaction}
                      className="ml-4 text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                      title="Delete entire transaction"
                    >
                      Delete Transaction
                    </button>
                  </div>
                  <span className="text-sm text-gray-500">{formatDate(balanceData.transaction.date)}</span>
                </div>
                
                {balanceData.transaction.reference && (
                  <p className="text-sm text-gray-600 mb-2">Reference: {balanceData.transaction.reference}</p>
                )}
                
                {balanceData.transaction.notes && (
                  <p className="text-sm text-gray-600 mb-2">Notes: {balanceData.transaction.notes}</p>
                )}
              </div>

              {/* Balance Analysis */}
              <div className={`p-4 rounded-lg ${
                balanceData.isBalanced
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <h3 className="font-medium mb-2">Balance Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div>
                    <p className="text-sm text-gray-600">Total Debits</p>
                    <p className="font-medium text-red-600">{formatCurrency(balanceData.totalDebits)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Credits</p>
                    <p className="font-medium text-green-600">{formatCurrency(balanceData.totalCredits)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Net Balance</p>
                    <p className={`font-medium ${balanceData.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(balanceData.netBalance)}
                    </p>
                  </div>
                </div>
                
                <div>
                  <p className={`text-sm ${balanceData.isBalanced ? 'text-green-600' : 'text-yellow-600'}`}>
                    {balanceData.isBalanced
                      ? '✓ This transaction is perfectly balanced.'
                      : balanceData.suggestedFix.message
                    }
                  </p>
                </div>
              </div>

              {/* Entry Lines */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium">Transaction Entry Lines</h3>
                  {!balanceData.isBalanced && !editingEntry && !showAddEntryForm && (
                    <button
                      onClick={handleAddEntry}
                      className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Add Balancing Entry
                    </button>
                  )}
                </div>
                
                {editingEntry ? (
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
                          onClick={() => setEditingEntry(null)}
                          className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleUpdateEntry}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                ) : showAddEntryForm ? (
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <h4 className="font-medium mb-3">Add New Entry</h4>
                    <form onSubmit={handleSaveNewEntry} className="space-y-3">
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
                              onChange={() => setNewEntryForm({...newEntryForm, type: 'debit'})}
                            />
                            <span>Debit</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="type"
                              className="mr-1"
                              checked={newEntryForm.type === 'credit'}
                              onChange={() => setNewEntryForm({...newEntryForm, type: 'credit'})}
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
                          onClick={() => setShowAddEntryForm(false)}
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
                ) : (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {balanceData.transaction.entryLines.map(entry => (
                          <tr 
                            key={entry._id} 
                            className={`hover:bg-gray-50 ${
                              selectedEntry && selectedEntry._id === entry._id
                                ? 'bg-blue-50'
                                : ''
                            }`}
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {entry.account?.name || 'Unknown Account'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                entry.type === 'debit' 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {entry.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                              {formatCurrency(entry.amount)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                              <button
                                onClick={() => handleEditEntry(entry)}
                                className="text-blue-600 hover:text-blue-900 mr-3"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteEntry(entry)}
                                className="text-red-600 hover:text-red-900 mr-3"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => handleEntrySelect(entry)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Match
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              
              {/* Suggested Matches Section */}
              {selectedEntry && (
                <div className="mt-6">
                  <h3 className="font-medium mb-3">Suggested Matches for Selected Entry</h3>
                  
                  {matchLoading ? (
                    <div className="flex justify-center p-5">
                      <div className="animate-spin h-6 w-6 border-4 border-blue-500 rounded-full border-t-transparent"></div>
                    </div>
                  ) : suggestedMatches.length > 0 ? (
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {suggestedMatches.map(match => (
                            <tr key={match._id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {match.transaction.description}
                                <span className="text-xs text-gray-500 block">
                                  {formatDate(match.transaction.date)}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {match.account?.name || 'Unknown Account'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  match.type === 'debit' 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {match.type}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                                {formatCurrency(match.amount)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                                <button
                                  onClick={() => handleBalanceWithMatch(match)}
                                  className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                                >
                                  Balance
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                      <p className="text-gray-500">No matching entries found for this entry.</p>
                      <p className="text-sm text-gray-400 mt-1">Try selecting a different entry or creating a new matching entry.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default TransactionBalanceModal; 