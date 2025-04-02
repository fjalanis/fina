import React, { useEffect } from 'react';
import { toast } from 'react-toastify';
import Modal from '../../common/Modal';
import TransactionHeader from '../list/TransactionHeader';
import TransactionBalanceAnalysis from './TransactionBalanceAnalysis';
import EntryLineTable from '../entry/EntryLineTable';
import EntryLineEditForm from '../entry/EntryLineEditForm';
import EntryLineAddForm from '../entry/EntryLineAddForm';
import ComplementaryTransactionsTable from '../matching/ComplementaryTransactionsTable';
import ManualEntrySearch from '../matching/ManualEntrySearch';
import AssetTable from '../asset/AssetTable';
import {
  useTransactionBalance,
  useComplementaryTransactions,
  useEntryLineManagement,
  useManualSearchControl
} from './hooks';

const TransactionBalanceModal = ({ isOpen, onClose, transaction, onTransactionBalanced }) => {
  // Transaction balance data and base operations
  const {
    loading, 
    balanceData, 
    accounts,
    transactions,
    fetchAccounts,
    fetchTransactionData,
    handleDeleteTransaction,
  } = useTransactionBalance(transaction?._id, isOpen, toast);

  // Complementary transactions for imbalance resolution
  const {
    matchLoading,
    complementaryTransactions,
    transactionPagination,
    fetchComplementaryTransactions,
    handleTransactionPageChange: handlePageChange,
    handleMoveTransaction,
    handleMoveEntry
  } = useComplementaryTransactions((message) => {
    toast.success(message);
    fetchTransactionData().then(() => {
      if (onTransactionBalanced) onTransactionBalanced();
    });
  }, toast);

  // Entry line management
  const {
    editingEntry,
    editForm,
    showAddEntryForm,
    newEntryForm,
    selectedEntry,
    setEditingEntry,
    setEditForm,
    setShowAddEntryForm,
    handleEditEntry,
    handleDeleteEntry: deleteEntry,
    handleAddEntry: originalHandleAddEntry,
    handleNewEntryChange,
    handleSaveNewEntry: saveNewEntry,
    handleUpdateEntry: updateEntry,
    updateNewEntryFormWithSuggestedFix
  } = useEntryLineManagement(
    // onSuccess
    (message) => {
      toast.success(message);
      fetchTransactionData().then(() => {
        if (onTransactionBalanced) onTransactionBalanced();
      });
    },
    // onError
    (message) => toast.error(message)
  );

  // Manual search control
  const { showManualSearch, setShowManualSearch } = useManualSearchControl();

  // Load transaction balance data when opened
  useEffect(() => {
    if (isOpen && transaction) {
      fetchTransactionData();
      fetchAccounts();
    }
  }, [isOpen, transaction]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle the transaction page change for pagination
  const handleTransactionPageChange = (page) => {
    if (!balanceData || !balanceData.suggestedFix) return;
    
    handlePageChange(
      balanceData.suggestedFix.amount,
      balanceData.suggestedFix.type,
      balanceData.transaction._id,
      page,
      balanceData.transaction.date
    );
  };

  // When a new balance analysis is loaded, fetch complementary transactions
  useEffect(() => {
    if (balanceData && !balanceData.isBalanced) {
      console.log('balanceData', balanceData);
      const fix = balanceData.suggestedFix;
      
      // Automatically fetch complementary transactions
      fetchComplementaryTransactions(
        fix.amount, 
        fix.type, 
        balanceData.transaction._id,
        1, // First page
        balanceData.transaction.date // Pass transaction date as reference
      );
    }
  }, [balanceData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle update entry - with specific ID
  const handleUpdateEntry = () => {
    if (!editingEntry) return;
    updateEntry(editingEntry._id);
  };

  // Handle save new entry - with transaction ID
  const handleSaveNewEntry = () => {
    if (!balanceData || !balanceData.transaction) return;
    saveNewEntry(balanceData.transaction._id);
  };

  // Handle delete entry
  const handleDeleteEntry = async (entry) => {
    if (!balanceData || !balanceData.transaction) return;
    
    // Get entries array from either entries (new schema)
    const entries = balanceData.transaction.entries || [];
    
    const result = await deleteEntry(entry, entries.length);
    
    if (result === 'transaction_deleted') {
      // Close the modal and notify parent
      setTimeout(() => {
        if (onTransactionBalanced) onTransactionBalanced();
        onClose();
      }, 1500);
    }
  };

  // Handle complementary transaction move
  const handleMoveComplementaryTransaction = (sourceTransaction) => {
    if (!balanceData || !balanceData.transaction) return;
    handleMoveTransaction(sourceTransaction, balanceData.transaction._id);
  };

  // Handle entry move from manual search
  const handleMoveEntryFromSearch = (entry) => {
    if (!balanceData || !balanceData.transaction) return;
    handleMoveEntry(entry, balanceData.transaction._id);
  };

  // Override handleAddEntry to set default values
  const handleAddEntry = () => {
    originalHandleAddEntry();
    
    // Set default values based on suggested fix
    if (balanceData?.suggestedFix && balanceData?.transaction) {
      updateNewEntryFormWithSuggestedFix(
        balanceData.suggestedFix, 
        balanceData.transaction.description || 'transaction'
      );
    }
  };

  // Check if any entries have non-USD units
  const hasNonUSDEntries = balanceData?.transaction?.entries?.some(
    entry => entry.unit && entry.unit !== 'USD'
  );

  // Get the account for the current transaction
  const currentAccount = accounts.find(acc => 
    acc._id === balanceData?.transaction?.entries[0]?.accountId
  );

  // Get all transactions for this account
  const accountTransactions = transactions.filter(t => 
    t.entries.some(e => e.accountId === currentAccount?._id)
  );

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
          {balanceData && (
            <div className="space-y-6">
              {/* Transaction Header */}
              <TransactionHeader 
                transaction={balanceData.transaction} 
                onDeleteTransaction={handleDeleteTransaction} 
              />

              {/* Balance Analysis */}
              <TransactionBalanceAnalysis balanceData={balanceData} />

              {/* Asset Table - Only show for non-USD transactions */}
              {hasNonUSDEntries && currentAccount && (
                <div className="mt-4">
                  <h3 className="font-medium mb-3">Asset Details</h3>
                  <AssetTable 
                    account={currentAccount}
                    transactions={accountTransactions}
                  />
                </div>
              )}

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
                    balanceData={balanceData}
                  />
                ) : (
                  <EntryLineTable 
                    entries={balanceData.transaction.entries || []}
                    selectedEntryId={selectedEntry?._id}
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
                      Found {transactionPagination.total} unbalanced {balanceData.suggestedFix.type} {transactionPagination.total === 1 ? 'transaction' : 'transactions'} with a matching complementary imbalance.
                    </p>
                    <ComplementaryTransactionsTable 
                      isLoading={matchLoading}
                      transactions={complementaryTransactions}
                      pagination={transactionPagination}
                      onPageChange={handleTransactionPageChange}
                      onMoveTransaction={handleMoveComplementaryTransaction}
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
                  onEntrySelect={handleMoveEntryFromSearch}
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