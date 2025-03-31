import React, { useState, useEffect } from 'react';
import { transactionApi, entryLineApi, accountApi } from '../../services/api';
import Modal from '../common/Modal';
import TransactionHeader from './TransactionHeader';
import TransactionBalanceAnalysis from './TransactionBalanceAnalysis';
import EntryLineTable from './EntryLineTable';
import EntryLineEditForm from './EntryLineEditForm';
import EntryLineAddForm from './EntryLineAddForm';
import SuggestedMatchesTable from './SuggestedMatchesTable';
import ComplementaryTransactionsTable from './ComplementaryTransactionsTable';
import ManualEntrySearch from './ManualEntrySearch';
import { analyzeTransactionBalance } from './TransactionBalanceLogic';

const TransactionBalanceModal = ({ isOpen, onClose, transaction, onTransactionBalanced }) => {
  const [loading, setLoading] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [balanceData, setBalanceData] = useState(null);
  const [suggestedMatches, setSuggestedMatches] = useState([]);
  const [complementaryTransactions, setComplementaryTransactions] = useState([]);
  const [transactionPagination, setTransactionPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    pages: 0
  });
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
  const [showManualSearch, setShowManualSearch] = useState(false);

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
      setComplementaryTransactions([]);
      setError(null);
      setSuccessMessage(null);
      setEditingEntry(null);
      setShowAddEntryForm(false);
      setShowManualSearch(false);
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
        
        // Automatically fetch complementary transactions
        await fetchComplementaryTransactions(analysis.suggestedFix.amount, analysis.suggestedFix.type);
      } else {
        setComplementaryTransactions([]);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error analyzing transaction:', err);
      setError('Failed to analyze transaction balance.');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch complementary transactions based on balance amount and type
  const fetchComplementaryTransactions = async (amount, type, page = 1) => {
    try {
      setMatchLoading(true);
      
      // Make sure amount is a number and type is a string
      const numericAmount = parseFloat(amount);
      const fixType = String(type);
      
      // Only proceed if we have valid values
      if (isNaN(numericAmount) || !fixType) {
        console.error('Invalid amount or type for matching:', { amount, type });
        setComplementaryTransactions([]);
        setMatchLoading(false);
        return;
      }
      
      // Get the opposite type to find truly complementary transactions
      const complementaryType = fixType === 'credit' ? 'debit' : 'credit';
      
      console.log(`Looking for transactions with ${complementaryType} imbalance of ${numericAmount}`);
      
      // Use the updated matching API with complementary type
      const response = await transactionApi.getSuggestedMatches(
        null, // No entry ID
        10, // maxMatches
        15, // dateRange
        numericAmount, 
        complementaryType, // Use the complementary type
        balanceData?.transaction?._id, // Exclude current transaction
        page, // Page number for pagination
        transactionPagination.limit // Items per page
      );
      
      if (response.success && response.data) {
        console.log(`Found ${response.data.transactions.length} complementary transactions`);
        setComplementaryTransactions(response.data.transactions);
        setTransactionPagination(response.data.pagination);
      } else {
        setComplementaryTransactions([]);
      }
    } catch (err) {
      console.error('Error finding complementary transactions:', err);
      setComplementaryTransactions([]);
    } finally {
      setMatchLoading(false);
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

  // Handle transaction page change for pagination
  const handleTransactionPageChange = async (page) => {
    if (!balanceData || !balanceData.suggestedFix) return;
    
    await fetchComplementaryTransactions(
      balanceData.suggestedFix.amount,
      balanceData.suggestedFix.type,
      page
    );
  };

  // Handle moving a complementary transaction
  const handleMoveTransaction = async (sourceTransaction) => {
    if (!sourceTransaction || !balanceData?.transaction?._id) return;
    
    try {
      setLoading(true);
      
      console.log(`Merging transaction ${sourceTransaction._id} to transaction ${balanceData.transaction._id}`);
      
      // Call the mergeTransaction API
      await transactionApi.mergeTransaction(
        sourceTransaction._id,
        balanceData.transaction._id
      );
      
      setSuccessMessage('Transaction merged successfully!');
      
      // Reset selection state
      setSelectedEntry(null);
      setSuggestedMatches([]);
      setComplementaryTransactions([]);
      
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
      setError(`Failed to merge transaction: ${err.message || 'Please try again.'}`);
      console.error('Error merging transaction:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle moving an entry from manual search
  const handleMoveEntry = async (entry) => {
    if (!entry || !balanceData?.transaction?._id) return;
    
    try {
      setLoading(true);
      
      console.log(`Moving entry ${entry._id} to transaction ${balanceData.transaction._id}`);
      
      // Call the extractEntry API to move this single entry
      await transactionApi.extractEntry(
        entry._id,
        balanceData.transaction._id
      );
      
      setSuccessMessage('Entry moved successfully!');
      
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
      setError(`Failed to move entry: ${err.message || 'Please try again.'}`);
      console.error('Error moving entry:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle balancing with automatically suggested match
  const handleAutoBalanceWithMatch = async (matchedEntry) => {
    if (!matchedEntry || !balanceData?.transaction?._id) return;
    
    try {
      setLoading(true);
      
      console.log(`Moving entry ${matchedEntry._id} to transaction ${balanceData.transaction._id}`);
      
      // Call the extractEntry API to move this single entry
      await transactionApi.extractEntry(
        matchedEntry._id,
        balanceData.transaction._id
      );
      
      setSuccessMessage('Entry moved successfully!');
      
      // Reset selection state
      setSelectedEntry(null);
      setSuggestedMatches([]);
      setComplementaryTransactions([]);
      
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
      setError(`Failed to move entry: ${err.message || 'Please try again.'}`);
      console.error('Error moving entry:', err);
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

  // Update edited entry
  const handleUpdateEntry = async () => {
    if (!editingEntry) return;
    
    try {
      setLoading(true);
      
      await entryLineApi.updateEntryLine(editingEntry._id, {
        amount: parseFloat(editForm.amount),
        type: editForm.type,
        description: editForm.description
      });
      
      setSuccessMessage('Entry updated successfully!');
      setEditingEntry(null);
      
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
      setError('Failed to update entry: ' + (err.message || 'Please try again.'));
      console.error('Error updating entry:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle adding new entry
  const handleAddEntry = () => {
    setShowAddEntryForm(true);
    setSelectedEntry(null);
    setSuggestedMatches([]);
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
  const handleSaveNewEntry = async () => {
    if (!newEntryForm.account || !newEntryForm.amount) {
      setError('Account and amount are required.');
      return;
    }
    
    try {
      setLoading(true);
      
      await transactionApi.addEntryLine(balanceData.transaction._id, {
        account: newEntryForm.account,
        amount: parseFloat(newEntryForm.amount),
        type: newEntryForm.type,
        description: newEntryForm.description
      });
      
      setSuccessMessage('Entry added successfully!');
      setShowAddEntryForm(false);
      
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
      setError('Failed to add entry: ' + (err.message || 'Please try again.'));
      console.error('Error adding entry:', err);
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
      setError('Failed to delete entry: ' + (err.message || 'Please try again.'));
      console.error('Error deleting entry:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting the transaction
  const handleDeleteTransaction = async () => {
    if (!balanceData || !balanceData.transaction || !balanceData.transaction._id) {
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete this transaction? This will delete all ${balanceData.transaction.entryLines.length} entry lines.`)) {
      return;
    }
    
    try {
      setLoading(true);
      
      await transactionApi.deleteTransaction(balanceData.transaction._id);
      
      setSuccessMessage('Transaction deleted successfully!');
      
      setTimeout(() => {
        setSuccessMessage(null);
        // Close the modal
        onClose();
        
        // Notify parent component when transaction is gone
        if (onTransactionBalanced) {
          onTransactionBalanced();
        }
      }, 1500);
      
    } catch (err) {
      setError('Failed to delete transaction: ' + (err.message || 'Please try again.'));
      console.error('Error deleting transaction:', err);
      setLoading(false);
    }
  };

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
              
              {/* Complementary Transactions Section */}
              {!balanceData.isBalanced && complementaryTransactions.length > 0 && (
                <div className="mt-3">
                  <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                    <h3 className="font-medium mb-2 text-blue-800">Complementary Transactions</h3>
                    <p className="text-sm text-blue-600 mb-4">
                      We found {transactionPagination.total} unbalanced {balanceData.suggestedFix.type} {transactionPagination.total === 1 ? 'transaction' : 'transactions'} with a matching imbalance.
                      Click "Move All" to add all entries from a transaction to help balance this one.
                    </p>
                    <ComplementaryTransactionsTable 
                      isLoading={matchLoading}
                      transactions={complementaryTransactions}
                      pagination={transactionPagination}
                      onPageChange={handleTransactionPageChange}
                      onMoveTransaction={handleMoveTransaction}
                    />
                  </div>
                </div>
              )}
              
              {/* Manual Entry Search */}
              {!balanceData.isBalanced && (
                <ManualEntrySearch
                  isOpen={showManualSearch}
                  setIsOpen={setShowManualSearch}
                  targetTransaction={balanceData.transaction}
                  suggestedFix={balanceData.suggestedFix}
                  onEntrySelect={handleMoveEntry}
                  accounts={accounts}
                />
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default TransactionBalanceModal; 