import { useState, useEffect, useCallback } from 'react';
import { fetchTransactionById, deleteTransaction, fetchTransactions, updateTransaction, createTransaction } from '../../../../services/transactionService';
import { fetchAccounts } from '../../../../services/accountService';
import { formatCurrency } from '../../../../utils/formatters';

// Determine suggested fix based on transaction imbalance
export const getSuggestedFix = (totalDebits, totalCredits) => {
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

// Calculate and analyze transaction balance
export const analyzeTransactionBalance = (transaction) => {
  if (!transaction) {
    return null;
  }
  
  // Get entries array from either entries (new schema) 
  const entries = transaction.entries || [];
  
  // Handle transactions with no entries as balanced
  if (entries.length === 0) {
    return {
      transaction,
      totalDebits: 0,
      totalCredits: 0,
      netBalance: 0,
      isBalanced: true, // Empty is considered balanced
      suggestedFix: { action: 'none', message: '' } // No fix needed
    };
  }

  let totalDebits = 0;
  let totalCredits = 0;
  
  // Calculate totals
  entries.forEach(entry => {
    const amount = parseFloat(entry.amount);
    // Support both entry.type and entry.entryType fields
    const entryType = entry.entryType || entry.type;
    if (entryType === 'debit') {
      totalDebits += amount;
    } else {
      totalCredits += amount;
    }
  });
  
  const netBalance = totalDebits - totalCredits;
  const isBalanced = Math.abs(netBalance) < 0.001;
  
  // Return analysis data
  return {
    transaction,
    totalDebits,
    totalCredits,
    netBalance,
    isBalanced,
    suggestedFix: getSuggestedFix(totalDebits, totalCredits)
  };
}; 

// --- Default empty transaction structure for create mode ---
const defaultTransactionStructure = {
  _id: null, // Indicate it's new
  date: new Date(), // Default to today
  description: '',
  reference: '',
  notes: '',
  entries: [],
};

const defaultBalanceData = {
  transaction: defaultTransactionStructure,
  totalDebits: 0,
  totalCredits: 0,
  netBalance: 0,
  isBalanced: true, // Empty is balanced
  suggestedFix: { action: 'none', message: '' }
};
// --- End Defaults ---

// Pass mode and initial data to hook
export const useTransactionBalance = (initialTransaction, isOpen, mode, toast) => {
  const [loading, setLoading] = useState(false);
  // Initialize with analyzed initial data if available, default if creating, otherwise null
  const [balanceData, setBalanceData] = useState(() => {
    if (mode === 'create') return defaultBalanceData;
    if (initialTransaction) {
        // Analyze only if entries exist, otherwise return basic structure
        if (initialTransaction.entries && initialTransaction.entries.length > 0) {
            return analyzeTransactionBalance(initialTransaction);
        } else {
            // Return structure matching analyzeTransactionBalance but with empty/default values
             return {
                transaction: initialTransaction,
                totalDebits: 0,
                totalCredits: 0,
                netBalance: 0,
                isBalanced: true, // Empty is balanced
                suggestedFix: { action: 'none', message: '' }
            };
        }
    }
    return null; // Default case if no initial data and not creating
  });
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]); // Still needed for AssetTable

  // Effect to synchronize balanceData with initialTransaction prop changes
  useEffect(() => {
    // Only run if modal is open, not in create mode, and initialTransaction is provided
    if (isOpen && mode !== 'create' && initialTransaction) {
      const analysis = (initialTransaction.entries && initialTransaction.entries.length > 0) 
                        ? analyzeTransactionBalance(initialTransaction) 
                        : {
                            transaction: initialTransaction,
                            totalDebits: 0, totalCredits: 0, netBalance: 0, isBalanced: true,
                            suggestedFix: { action: 'none', message: '' }
                           };
      setBalanceData(analysis);
    } else if (isOpen && mode === 'create') {
       // Ensure create mode always has default data if balanceData is somehow nullified
       if (!balanceData || balanceData.transaction?._id) { // Reset if balanceData is null or has an ID
           setBalanceData(defaultBalanceData);
       }
    }
    // Intentionally excluding balanceData from deps to avoid loop; we only react to prop/mode changes
  }, [initialTransaction, mode, isOpen]);

  // Reset state when modal closes - Wrapped in useCallback (though maybe less critical)
  // Note: dependencies might need adjustment based on what needs resetting
  const resetModalState = useCallback(() => {
      // setBalanceData(null); 
      // setAccounts([]);
      // setTransactions([]);
      // console.log('Resetting modal state');
  }, []); // Adjust dependencies if needed

  useEffect(() => {
    if (!isOpen) {
      resetModalState();
    }
  }, [isOpen, resetModalState]);

  // Fetch accounts - Wrapped in useCallback
  const fetchAccountsHook = useCallback(async () => {
    try {
      // setLoading(true); // Avoid double loading indicator if fetchTransactionDataHook also sets it
      const response = await fetchAccounts();
      setAccounts(response.data);
    } catch (err) {
      console.error('Error fetching accounts:', err);
      toast.error('Failed to load accounts.');
    } finally {
      // setLoading(false);
    }
  }, [toast]); // Dependency: toast

  // Fetch transaction data hook - Refactored to primarily use initialTransaction
  // This function is now less critical for initial load, more for explicit refetch after updates
  const fetchTransactionDataHook = useCallback(async () => {
    const transactionId = initialTransaction?._id; // Get ID from prop
    // Only fetch if we have an ID (not creating) AND balanceData wasn't initialized from prop
    // Note: This condition might be too restrictive if we WANT to force a refetch.
    // Let's simplify: only fetch if ID exists. The CALLER decides WHEN to fetch.
    if (!transactionId) {
        if (mode === 'create' && !balanceData) {
           setBalanceData(defaultBalanceData); // Ensure default for create if somehow lost
        }
        return balanceData; // Return current state
    }

    try {
      setLoading(true);
      const response = await fetchTransactionById(transactionId);
      const freshTransaction = response.data;
      
      if (!freshTransaction /* Removed || !freshTransaction.entries check, analyze handles null entries */) {
        throw new Error('Could not retrieve transaction details');
      }

      const analysis = analyzeTransactionBalance(freshTransaction);
      setBalanceData(analysis);

      if (freshTransaction.entries && freshTransaction.entries[0]?.accountId) {
        const accountId = freshTransaction.entries[0].accountId;
        const transactionsResponse = await fetchTransactions({ accountId }); 
        setTransactions(transactionsResponse.data);
      }
      
      return analysis;
    } catch (err) {
      console.error('Error analyzing transaction:', err);
      toast.error('Failed to analyze transaction balance.');
      setBalanceData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [initialTransaction, mode, toast, balanceData]); // Added balanceData to deps? Maybe not needed if we rely on caller. Let's keep it simple for now.

  // Add create transaction function
  const handleCreateTransactionHook = useCallback(async (headerData) => {
    const dataToCreate = {
      date: headerData.date,
      description: headerData.description,
      reference: headerData.reference,
      notes: headerData.notes,
      entries: [] // Start with empty entries, backend allows this
    };
    try {
      setLoading(true);
      const response = await createTransaction(dataToCreate);
      const newTransaction = response.data;
      toast.success("Transaction created successfully!");
      // Set the state to the newly created transaction's data
      const analysis = analyzeTransactionBalance(newTransaction); 
      setBalanceData(analysis);
      // TODO: Decide if we should fetch related transactions here
      return newTransaction; // Return the full new transaction object
    } catch (err) {
      const errorMsg = 'Failed to create transaction: ' + (err.response?.data?.message || err.message || 'Please try again.');
      toast.error(errorMsg);
      console.error('Error creating transaction:', err);
      return null; // Indicate failure
    } finally {
      setLoading(false);
    }
  }, [toast]); // Dependency: toast

  // Delete the transaction - Wrapped in useCallback
  const handleDeleteTransactionHook = useCallback(async () => {
    // Use balanceData directly from state, no need to pass it
    if (!balanceData?.transaction?._id) {
       toast.error('Cannot delete: Transaction data missing.');
      return false;
    }
    
    if (!window.confirm(`Are you sure you want to delete this transaction? This will delete all ${balanceData.transaction.entries.length} entry lines.`)) {
      return false;
    }
    
    try {
      setLoading(true);
      await deleteTransaction(balanceData.transaction._id);
      toast.success('Transaction deleted successfully!');
      setBalanceData(null); // Clear data after delete
      return true;
    } catch (err) {
      const errorMsg = 'Failed to delete transaction: ' + (err.response?.data?.message || err.message || 'Please try again.');
      toast.error(errorMsg);
      console.error('Error deleting transaction:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [balanceData, toast]); // Dependencies: balanceData, toast

  // Update transaction header details - Wrapped in useCallback
  const handleUpdateTransactionHeaderHook = useCallback(async (updatedData) => {
    if (!balanceData?.transaction?._id) {
      toast.error("Cannot update: Transaction data is missing.");
      return false;
    }
    // Only include fields relevant to the header
    const dataToUpdate = {
      date: updatedData.date,
      description: updatedData.description,
      reference: updatedData.reference,
      notes: updatedData.notes,
      // Add any other non-entry fields managed in the header here
    };

    try {
      setLoading(true);
      await updateTransaction(balanceData.transaction._id, dataToUpdate);
      toast.success("Transaction details updated successfully!");
      // No automatic refetch here, let the modal component decide if needed
      // await fetchTransactionDataHook(); 
      return true;
    } catch (err) {
      const errorMsg = 'Failed to update transaction: ' + (err.response?.data?.message || err.message || 'Please try again.');
      toast.error(errorMsg);
      console.error('Error updating transaction:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [balanceData, toast]); // Dependencies: balanceData, toast

  return {
    loading,
    balanceData,
    accounts,
    transactions,
    // Return the memoized functions
    fetchAccounts: fetchAccountsHook,
    fetchTransactionData: fetchTransactionDataHook,
    handleDeleteTransaction: handleDeleteTransactionHook,
    handleUpdateTransactionHeader: handleUpdateTransactionHeaderHook,
    handleCreateTransaction: handleCreateTransactionHook, // Expose create function
  };
}; 