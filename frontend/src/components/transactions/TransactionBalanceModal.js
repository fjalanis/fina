import React, { useState, useEffect } from 'react';
import { transactionApi, entryLineApi, accountApi } from '../../services/api';
import Modal from '../common/Modal';
import TransactionHeader from './TransactionHeader';
import TransactionBalanceAnalysis from './TransactionBalanceAnalysis';
import EntryLineTable from './EntryLineTable';
import EntryLineEditForm from './EntryLineEditForm';
import EntryLineAddForm from './EntryLineAddForm';
import SuggestedMatchesTable from './SuggestedMatchesTable';
import { analyzeTransactionBalance } from './TransactionBalanceLogic';

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
      fetchTransactionData();
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

  // Fetch latest transaction data and analyze it
  const fetchTransactionData = async () => {
    try {
      setLoading(true);
      
      // Make sure we have the latest data
      const response = await transactionApi.getTransaction(transaction._id);
      const freshTransaction = response.data;
      
      if (!freshTransaction || !freshTransaction.entryLines) {
        throw new Error('Could not retrieve transaction details');
      }

      // Analyze the transaction balance
      const analysis = analyzeTransactionBalance(freshTransaction);
      setBalanceData(analysis);
      
      // If there's an imbalance, pre-populate the new entry form
      if (!analysis.isBalanced) {
        const fix = analysis.suggestedFix;
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
      await fetchTransactionData();
      
      // Notify parent to update its transaction list
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
      await fetchTransactionData();
      
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
      await fetchTransactionData();
      
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
    const isLastEntry = balanceData?.transaction?.entryLines?.length === 1;
    const message = isLastEntry 
      ? `This is the only entry in this transaction. Deleting it will also delete the entire transaction. Proceed?`
      : `Are you sure you want to delete this ${entry.type} entry of ${entry.amount}?`;
    
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
        await fetchTransactionData();
        
        // Still notify parent to update the transaction list
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
              {/* Transaction Header */}
              <TransactionHeader 
                transaction={balanceData.transaction} 
                onDeleteTransaction={handleDeleteTransaction} 
              />

              {/* Balance Analysis */}
              <TransactionBalanceAnalysis balanceData={balanceData} />

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
                  <EntryLineEditForm 
                    editingEntry={editingEntry}
                    editForm={editForm}
                    setEditForm={setEditForm}
                    onCancel={() => setEditingEntry(null)}
                    onSave={handleUpdateEntry}
                  />
                ) : showAddEntryForm ? (
                  <EntryLineAddForm 
                    accounts={accounts}
                    newEntryForm={newEntryForm}
                    handleNewEntryChange={handleNewEntryChange}
                    onCancel={() => setShowAddEntryForm(false)}
                    onSubmit={handleSaveNewEntry}
                  />
                ) : (
                  <EntryLineTable 
                    entries={balanceData.transaction.entryLines}
                    selectedEntryId={selectedEntry?._id}
                    onEntrySelect={handleEntrySelect}
                    onEditEntry={handleEditEntry}
                    onDeleteEntry={handleDeleteEntry}
                  />
                )}
              </div>
              
              {/* Suggested Matches Section */}
              {selectedEntry && (
                <div className="mt-6">
                  <h3 className="font-medium mb-3">Suggested Matches for Selected Entry</h3>
                  <SuggestedMatchesTable 
                    isLoading={matchLoading}
                    suggestedMatches={suggestedMatches}
                    onBalanceWithMatch={handleBalanceWithMatch}
                  />
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