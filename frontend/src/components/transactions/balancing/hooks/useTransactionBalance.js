import { useState, useEffect, useCallback } from 'react';
import { fetchTransactionById, deleteTransaction, fetchTransactions, updateTransaction } from '../../../../services/transactionService';
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
  
  if (entries.length === 0) {
    return null;
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

/**
 * Custom hook for managing transaction balance data
 */
export const useTransactionBalance = (transactionId, isOpen, toast) => {
  const [loading, setLoading] = useState(false);
  const [balanceData, setBalanceData] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);

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

  // Fetch latest transaction data - Wrapped in useCallback
  const fetchTransactionDataHook = useCallback(async () => {
    if (!transactionId) return null; // Return null if no ID
    
    console.log(`[useTransactionBalance] Fetching data for ID: ${transactionId}`); // Log fetch attempt
    try {
      setLoading(true);
      const response = await fetchTransactionById(transactionId);
      const freshTransaction = response.data;
      
      if (!freshTransaction || !freshTransaction.entries) {
        throw new Error('Could not retrieve transaction details');
      }

      const analysis = analyzeTransactionBalance(freshTransaction);
      setBalanceData(analysis); // Set new balance data reference

      if (freshTransaction.entries[0]?.accountId) {
        const accountId = freshTransaction.entries[0].accountId;
        // Consider if fetching *all* transactions for the account is always needed here
        const transactionsResponse = await fetchTransactions({ accountId }); 
        setTransactions(transactionsResponse.data);
      }
      
      return analysis;
    } catch (err) {
      console.error('Error analyzing transaction:', err);
      toast.error('Failed to analyze transaction balance.');
      setBalanceData(null); // Clear data on error
      return null;
    } finally {
      setLoading(false);
    }
  }, [transactionId, toast]); // Dependencies: transactionId, toast

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
  };
}; 