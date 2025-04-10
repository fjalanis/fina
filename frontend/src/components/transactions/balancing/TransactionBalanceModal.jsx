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

const TransactionBalanceModal = ({ isOpen, onClose, transaction, onTransactionUpdated }) => {
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [activeTab, setActiveTab] = useState('editAdd');

  // Transaction balance data and base operations
  const {
    loading, 
    balanceData, 
    accounts,
    transactions,
    fetchAccounts,
    fetchTransactionData,
    handleDeleteTransaction,
    handleUpdateTransactionHeader
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
  } = useComplementaryTransactions(
    (message) => {
      toast.success(message);
      fetchTransactionData().then((updatedBalanceData) => { 
        if (onTransactionUpdated) {
          onTransactionUpdated(transaction?._id);
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
          onTransactionUpdated(transaction?._id);
        }
      });
    },
    (message) => toast.error(message)
  );

  // Manual search control
  const { showManualSearch, setShowManualSearch } = useManualSearchControl();

  // --- Debugging Logs --- 
  // Log when the transaction prop reference changes
  const prevTransactionRef = useRef();
  useEffect(() => {
      if (isOpen && prevTransactionRef.current && prevTransactionRef.current !== transaction) {
          console.warn('>>> Transaction prop reference changed <<< Modal is open.');
          // console.log('Prev Transaction ID:', prevTransactionRef.current?._id);
          // console.log('New Transaction ID:', transaction?._id);
      }
      prevTransactionRef.current = transaction;
  }, [transaction, isOpen]); // Also check isOpen to avoid logging when modal closes/reopens with same txn

  // Log when balanceData state reference changes
  const prevBalanceDataRef = useRef();
  useEffect(() => {
      if (isOpen && prevBalanceDataRef.current && prevBalanceDataRef.current !== balanceData) {
          console.warn('>>> balanceData state reference changed <<< Modal is open.');
          // console.log('Prev balanceData entries:', prevBalanceDataRef.current?.transaction?.entries?.length);
          // console.log('New balanceData entries:', balanceData?.transaction?.entries?.length);
          // console.log('Prev balanceData balanced?: ', prevBalanceDataRef.current?.isBalanced);
          // console.log('New balanceData balanced?: ', balanceData?.isBalanced);
      }
        prevBalanceDataRef.current = balanceData;
  }, [balanceData, isOpen]); // Also check isOpen

  // Load transaction balance data when opened or transaction ID changes
  useEffect(() => {
    const transactionId = transaction?._id;
    if (isOpen && transactionId) {
      console.log(`Effect: Fetching data for transaction ID: ${transactionId}`);
      fetchTransactionData();
      fetchAccounts();
      setIsEditingHeader(false);
      // setActiveTab('editAdd'); // Default tab set by later effect
    }
    // Change dependency from the transaction object to its ID
  }, [isOpen, transaction?._id]); // eslint-disable-line react-hooks/exhaustive-deps

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
        if (onTransactionUpdated) onTransactionUpdated(transaction?._id);
        onClose(); 
      } else {
        fetchTransactionData().then((updatedBalanceData) => {
          if (onTransactionUpdated) onTransactionUpdated(transaction?._id);
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
  const handleHeaderEditToggle = useCallback(() => setIsEditingHeader(prev => !prev), [setIsEditingHeader]);
  
  // Updated handleHeaderSave to call the hook function AND notify parent
  const handleHeaderSave = useCallback(async (headerData) => {
    const success = await handleUpdateTransactionHeader(headerData);
    if (success) {
      setIsEditingHeader(false); 
      // Notify parent after successful header save
      if (onTransactionUpdated) {
        onTransactionUpdated(transaction?._id);
      }
    }
  }, [handleUpdateTransactionHeader, setIsEditingHeader, onTransactionUpdated, transaction]);
  
  const handleHeaderCancel = useCallback(() => {
    setIsEditingHeader(false); 
    // No need to explicitly reset form state, useEffect in TransactionHeader handles it
  }, [setIsEditingHeader]);
  // --- End Header Edit Logic ---

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditingHeader ? "Edit Transaction Details" : "Transaction Details"}
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
                {isEditingHeader ? (
                   <div>
                     <p className="text-center text-gray-500">[Header Edit Form Placeholder]</p>
                     <div className="flex justify-end space-x-2 mt-2">
                       <button onClick={handleHeaderSave} className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600">Save</button>
                       <button onClick={handleHeaderCancel} className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600">Cancel</button>
                     </div>
                   </div>
                ) : (
                  <TransactionHeader 
                    transaction={balanceData.transaction} 
                    onDeleteTransaction={handleDeleteTransaction} 
                    isEditing={isEditingHeader}
                    onEditTransaction={handleHeaderEditToggle}
                    onSave={handleHeaderSave}
                    onCancel={handleHeaderCancel}
                  />
                )}
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