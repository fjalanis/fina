import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import Tab from '../../common/Tab';
import Tabs from '../../common/Tabs';
import TabContentFrame from '../../common/TabContentFrame';
import {
  useTransactionBalance,
  useComplementaryTransactions,
  useEntryLineManagement,
  useManualSearchControl
} from './hooks';

const TransactionBalanceModal = ({ isOpen, onClose, transaction, mode = 'balance', onTransactionUpdated }) => {
  const [isEditingHeader, setIsEditingHeader] = useState(() => mode === 'edit' || mode === 'create');
  const [activeTab, setActiveTab] = useState('editAdd');

  // Adjust title based on mode
  const getModalTitle = () => {
    if (mode === 'create') return 'Create New Transaction';
    if (isEditingHeader) return 'Edit Transaction Details'; // Covers edit mode start and manual toggle
    if (mode === 'view') return 'Transaction Details';
    if (mode === 'balance') return 'Balance Transaction';
    return 'Transaction Details'; // Default fallback
  };

  // Transaction balance data and base operations
  const {
    loading, 
    balanceData, 
    accounts,
    transactions,
    fetchAccounts,
    fetchTransactionData,
    handleDeleteTransaction,
    handleUpdateTransactionHeader,
    handleCreateTransaction
  } = useTransactionBalance(transaction, isOpen, mode, toast); // Pass transaction prop as initialTransaction

  // Complementary transactions for imbalance resolution
  const {
    matchLoading,
    complementaryTransactions,
    transactionPagination,
    fetchComplementaryTransactions,
    handleTransactionPageChange: handlePageChange,
    handleMoveTransaction,
    handleMoveEntry
  } = useComplementaryTransactions(
    (message) => {
      toast.success(message);
      fetchTransactionData().then((updatedBalanceData) => { 
        if (onTransactionUpdated) {
          onTransactionUpdated({ id: transaction?._id, action: 'update' });
        }
      });
    },
    toast.error 
  );

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
    handleDeleteEntry: deleteEntryFromHook,
    handleAddEntry: originalHandleAddEntry,
    handleNewEntryChange,
    handleSaveNewEntry: saveNewEntryFromHook,
    handleUpdateEntry: updateEntryFromHook,
    updateNewEntryFormWithSuggestedFix
  } = useEntryLineManagement(
    (message) => {
      toast.success(message);
      fetchTransactionData().then((updatedBalanceData) => { 
        setEditingEntry(null);
        setShowAddEntryForm(false);
        if (onTransactionUpdated) {
          onTransactionUpdated({ id: transaction?._id, action: 'update' });
        }
      });
    },
    (message) => toast.error(message)
  );

  // Manual search control
  const { showManualSearch, setShowManualSearch } = useManualSearchControl();

  // Load necessary data when modal opens or relevant props change
  useEffect(() => {
    const transactionId = transaction?._id;
    // Fetch accounts if the modal is open (needed for dropdowns)
    if (isOpen) {
      fetchAccounts();
    }
    
    // We no longer fetch transaction data here - useTransactionBalance handles initialization from the transaction prop
    // The fetchTransactionData function returned by the hook can be used for explicit refetches later if needed (e.g., after an update)
    
  }, [isOpen, fetchAccounts, mode, transaction]); // Added mode and transaction to deps to re-evaluate if needed, though fetchAccounts is stable

  // Handle the transaction page change for pagination
  const handleTransactionPageChange = useCallback((page) => {
    if (!balanceData || !balanceData.suggestedFix) return;
    
    handlePageChange(
      balanceData.suggestedFix.amount,
      balanceData.suggestedFix.type,
      balanceData.transaction._id,
      page,
      balanceData.transaction.date
    );
  }, [balanceData, handlePageChange]);

  // When a new balance analysis is loaded, fetch complementary transactions
  useEffect(() => {
    if (balanceData && !balanceData.isBalanced) {
      const fix = balanceData.suggestedFix;
      
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
  const handleUpdateEntry = useCallback(() => {
    if (!editingEntry) return;
    console.log('[TransactionBalanceModal] Attempting to update entry:', editingEntry._id);
    updateEntryFromHook(editingEntry._id);
  }, [editingEntry, updateEntryFromHook]);

  // Handle save new entry - with transaction ID
  const handleSaveNewEntry = useCallback(() => {
    if (!balanceData || !balanceData.transaction) return;
    console.log('[TransactionBalanceModal] Attempting to save new entry for transaction:', balanceData.transaction._id);
    saveNewEntryFromHook(balanceData.transaction._id);
  }, [balanceData, saveNewEntryFromHook]);

  // Handle delete entry (using hook and then notifying parent)
  const handleDeleteEntry = useCallback(async (event, entry) => { 
    event.preventDefault(); // Keep prevent default
    console.log('[handleDeleteEntry] Click event prevented (Default only).'); // Update log message

    if (!balanceData || !balanceData.transaction || !balanceData.transaction._id) return;

    const transactionId = balanceData.transaction._id; // Get transactionId here
    const entries = balanceData.transaction.entries || [];
    
    // Pass transactionId as the first argument
    const result = await deleteEntryFromHook(transactionId, entry, entries.length); 

    if (result) { 
      if (result === 'transaction_deleted') {
        if (onTransactionUpdated) onTransactionUpdated({ id: transaction?._id, action: 'delete' });
        onClose(); 
      } else {
        // Entry deleted, transaction exists, refetch internal and notify parent
        fetchTransactionData().then((updatedBalanceData) => {
          if (onTransactionUpdated) onTransactionUpdated({ id: transaction?._id, action: 'update' });
        });
      }
    } // Error toast is handled within the hook
  }, [balanceData, deleteEntryFromHook, fetchTransactionData, onTransactionUpdated, onClose]);

  // Handle complementary transaction move
  const handleMoveComplementaryTransaction = useCallback((sourceTransaction) => {
    if (!balanceData || !balanceData.transaction) return;
    handleMoveTransaction(sourceTransaction, balanceData.transaction._id);
  }, [balanceData, handleMoveTransaction]);

  // Handle entry move from manual search
  const handleMoveEntryFromSearch = useCallback((entry) => {
    if (!balanceData || !balanceData.transaction) return;
    handleMoveEntry(entry, balanceData.transaction._id);
  }, [balanceData, handleMoveEntry]);

  // Override handleAddEntry to set default values and switch tab
  const handleAddEntryClick = useCallback(() => {
    originalHandleAddEntry();
    
    if (balanceData?.suggestedFix && balanceData?.transaction) {
      updateNewEntryFormWithSuggestedFix(
        balanceData.suggestedFix, 
        balanceData.transaction.description || 'transaction'
      );
    }
    setEditingEntry(null);
    setActiveTab('editAdd');
  }, [balanceData, originalHandleAddEntry, updateNewEntryFormWithSuggestedFix, setEditingEntry, setActiveTab]);

  // Handle edit entry click
  const handleEditEntryClick = useCallback((entry) => {
    handleEditEntry(entry);
    setShowAddEntryForm(false);
    setActiveTab('editAdd');
  }, [handleEditEntry, setShowAddEntryForm, setActiveTab]);

  // Cancel edit/add entry
  const cancelEntryEditAdd = useCallback(() => {
    setEditingEntry(null);
    setShowAddEntryForm(false);
  }, [setEditingEntry, setShowAddEntryForm]);

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

  // Determine if the Entry Edit/Add tab should be active/visible
  const showEditAddTab = editingEntry || showAddEntryForm;
  // Determine if Complementary/Search tabs should be visible
  const showComplementaryTabs = !balanceData?.isBalanced;

  // --- Header Edit Logic ---
  const handleHeaderEditToggle = useCallback(() => setIsEditingHeader(prev => !prev), []);
  
  const handleHeaderSave = useCallback(async (headerData) => {
    let success = false;
    let operationType = mode; // 'create' or 'edit'
    let resultingTransactionId = balanceData?.transaction?._id; // Existing ID for edit

    console.log('[handleHeaderSave] Attempting save, mode:', mode);

    try {
      if (mode === 'create') {
        const result = await handleCreateTransaction(headerData);
        if (result) {
          success = true;
          resultingTransactionId = result._id; // Get ID of the new transaction
          console.log('[handleHeaderSave] Create successful, result:', result);
        } else {
          console.error('[handleHeaderSave] Create operation failed.');
        }
      } else { // Assumed 'edit' or other modes where update applies
        if (!resultingTransactionId) {
          toast.error("Cannot update: Transaction ID is missing.");
          return; // Exit early
        }
        success = await handleUpdateTransactionHeader(headerData); // Hook returns boolean
        if (success) {
          console.log('[handleHeaderSave] Update successful.');
        } else {
          console.error('[handleHeaderSave] Update operation failed.');
        }
      }

      // If the create/update operation was successful, refetch and update UI
      if (success) {
        console.log('[handleHeaderSave] Operation successful, refetching data...');
        const updatedData = await fetchTransactionData(); // Refetch the data using the hook
        
        if (updatedData) {
          console.log('[handleHeaderSave] Refetch successful, updating UI.');
          setIsEditingHeader(false); // Switch to view mode ONLY after successful refetch
          
          // Notify parent list (crucial for keeping list view updated)
          if (onTransactionUpdated && resultingTransactionId) {
            const action = (operationType === 'create') ? 'create' : 'update';
            console.log(`[handleHeaderSave] Calling onTransactionUpdated with: {id: ${resultingTransactionId}, action: '${action}'}`);
            onTransactionUpdated({ id: resultingTransactionId, action: action });
          }
        } else {
           console.error('[handleHeaderSave] Refetch failed after successful save. UI might be stale.');
           toast.error("Saved successfully, but failed to refresh details. Close and reopen to see changes.");
           // Don't switch view mode if refetch fails
        }
      } else {
        // Error handled/toasted within the specific create/update hooks
        console.log('[handleHeaderSave] Underlying save operation reported failure.');
      }
    } catch (error) {
      // Catch unexpected errors during the save/refetch process
      console.error("[handleHeaderSave] Unexpected error:", error);
      toast.error("An unexpected error occurred during save.");
    }
  }, [mode, balanceData, handleCreateTransaction, handleUpdateTransactionHeader, fetchTransactionData, setIsEditingHeader, onTransactionUpdated]);
  
  const handleHeaderCancel = useCallback(() => {
    if (mode === 'create') {
      onClose();
    } else {
      setIsEditingHeader(false); 
    }
  }, [mode, onClose]);
  // --- End Header Edit Logic ---

  // --- Delete Action Handler ---
  const handleDeleteAction = useCallback(async () => {
    if (!balanceData?.transaction?._id) {
      toast.error("Cannot delete: Transaction data missing.");
      return; 
    }
    const transactionIdToDelete = balanceData.transaction._id; // Capture ID before potential state clear
    
    // Call the delete hook
    const success = await handleDeleteTransaction(); 
    
    if (success) {
      // If hook signals success, close modal and notify parent list
      onClose(); 
      if (onTransactionUpdated) {
        onTransactionUpdated({ id: transactionIdToDelete, action: 'delete' });
      }
    }
    // Error toast is handled within the hook if success is false
  }, [balanceData, handleDeleteTransaction, onClose, onTransactionUpdated]);
  // --- End Delete Action Handler ---

  // Determine default active tab based on state
  useEffect(() => {
    if (isOpen && balanceData) {
      if (editingEntry || showAddEntryForm) {
        setActiveTab('editAdd');
      } else if (!balanceData.isBalanced) {
        setActiveTab('complementary'); // Default to complementary if unbalanced and not editing/adding
      } else {
        setActiveTab('sankey'); // Default to flow/sankey if balanced
      }
    }
  }, [isOpen, balanceData, editingEntry, showAddEntryForm]);

  // --- Derived Data ---
  // Determine if add entry should be disabled
  const disableAddEntry = mode === 'create' && !balanceData?.transaction?._id;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getModalTitle()}
      size="lg"
    >
      {loading && !balanceData ? (
        <div className="flex justify-center p-5">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
      ) : (
        <div>
          {balanceData && (
            <div className="space-y-4">
              <div className="border-b pb-4 mb-4">
                <TransactionHeader 
                  transaction={balanceData.transaction}
                  onDeleteTransaction={handleDeleteAction}
                  isEditing={isEditingHeader}
                  onEditTransaction={handleHeaderEditToggle}
                  onSave={handleHeaderSave}
                  onCancel={handleHeaderCancel}
                />
              </div>

              {hasNonUSDEntries && currentAccount && (
                <div className="mt-4">
                  <h3 className="font-medium mb-3 text-sm">Asset Details</h3>
                  <AssetTable 
                    account={currentAccount}
                    transactions={accountTransactions}
                  />
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium text-sm">Transaction Entry Lines</h3>
                </div>
                
                <EntryLineTable 
                  entries={balanceData.transaction.entries || []}
                  selectedEntryId={editingEntry?._id}
                  highlightNewRow={showAddEntryForm}
                  onEditEntry={handleEditEntryClick}
                  onDeleteEntry={handleDeleteEntry}
                  onAddEntry={handleAddEntryClick}
                  disableAddEntry={disableAddEntry}
                />

                {!balanceData.isBalanced && (
                  <div className="mt-2 px-3 py-1 w-full bg-red-100 text-red-700 text-xs text-center rounded-md"> 
                    IMBALANCE: {balanceData.suggestedFix.type} {balanceData.suggestedFix.amount} {balanceData.suggestedFix.unit}
                  </div>
                )}
              </div>
              
              <div className="mt-4 border-t pt-4">
                <Tabs activeTab={activeTab} setActiveTab={setActiveTab}>
                  {showEditAddTab && (
                    <Tab label={editingEntry ? "Edit Entry" : "Add Entry"} id="editAdd">
                      <TabContentFrame title={editingEntry ? "Edit Entry Details" : "Add New Entry"}>
                        {editingEntry ? (
                          <EntryLineEditForm 
                            editingEntry={editingEntry}
                            editForm={editForm}
                            setEditForm={setEditForm}
                            onCancel={cancelEntryEditAdd}
                            onSave={handleUpdateEntry}
                          />
                        ) : (
                          <EntryLineAddForm 
                            accounts={accounts}
                            newEntryForm={newEntryForm}
                            handleNewEntryChange={handleNewEntryChange}
                            onCancel={cancelEntryEditAdd}
                            onSubmit={handleSaveNewEntry}
                            balanceData={balanceData}
                          />
                        )}
                      </TabContentFrame>
                    </Tab>
                  )}

                  {showComplementaryTabs && (
                    <Tab label="Complementary Txns" id="complementary">
                      <TabContentFrame title="Suggested Complementary Transactions">
                        <p className="text-xs text-gray-600 mb-3"> 
                          Found {transactionPagination.total} other unbalanced {balanceData.suggestedFix.type} {transactionPagination.total === 1 ? 'transaction' : 'transactions'} with a matching complementary imbalance ({balanceData.suggestedFix.amount} {balanceData.suggestedFix.unit}). You can move one of these transactions to balance the current one.
                        </p>
                        <ComplementaryTransactionsTable 
                          isLoading={matchLoading}
                          transactions={complementaryTransactions}
                          pagination={transactionPagination}
                          onPageChange={handleTransactionPageChange}
                          onMoveTransaction={handleMoveComplementaryTransaction}
                          sourceTransaction={balanceData.transaction}
                        />
                      </TabContentFrame>
                    </Tab>
                  )}

                   {showComplementaryTabs && (
                    <Tab label="Find Entry" id="search">
                      <ManualEntrySearch
                        isOpen={activeTab === 'search'}
                        setIsOpen={() => setActiveTab('complementary')}
                        targetTransaction={balanceData.transaction}
                        suggestedFix={balanceData.suggestedFix}
                        onEntrySelect={handleMoveEntryFromSearch}
                        accounts={accounts}
                      />
                    </Tab>
                  )}

                  <Tab label="Flow" id="sankey">
                    <TabContentFrame title="Transaction Flow (Sankey)">
                      <p className="text-center text-sm text-gray-500 py-4">[Sankey Diagram Placeholder]</p>
                    </TabContentFrame>
                  </Tab>

                  <Tab label="Map" id="map">
                    <TabContentFrame title="Transaction Location">
                      <p className="text-center text-sm text-gray-500 py-4">[Map Placeholder]</p>
                    </TabContentFrame>
                  </Tab>
                </Tabs>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default TransactionBalanceModal; 