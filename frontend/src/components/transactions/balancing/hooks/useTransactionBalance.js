import { useState, useEffect } from 'react';
import { fetchTransactionById, deleteTransaction } from '../../../../services/transactionService';
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

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // setError(null);
      // setSuccessMessage(null);
    }
  }, [isOpen]);

  // Fetch accounts for dropdown
  const fetchAccountsHook = async () => {
    try {
      const response = await fetchAccounts();
      setAccounts(response.data);
    } catch (err) {
      console.error('Error fetching accounts:', err);
      toast.error('Failed to load accounts.');
    }
  };

  // Fetch latest transaction data and analyze it
  const fetchTransactionDataHook = async () => {
    if (!transactionId) return;
    
    try {
      setLoading(true);
      
      // Make sure we have the latest data
      const response = await fetchTransactionById(transactionId);
      const freshTransaction = response.data;
      
      if (!freshTransaction || !freshTransaction.entries) {
        throw new Error('Could not retrieve transaction details');
      }

      // Analyze the transaction balance
      const analysis = analyzeTransactionBalance(freshTransaction);
      setBalanceData(analysis);
      
      // setError(null);
      return analysis;
    } catch (err) {
      console.error('Error analyzing transaction:', err);
      toast.error('Failed to analyze transaction balance.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Delete the transaction
  const handleDeleteTransactionHook = async () => {
    if (!balanceData || !balanceData.transaction || !balanceData.transaction._id) {
      return false;
    }
    
    if (!window.confirm(`Are you sure you want to delete this transaction? This will delete all ${balanceData.transaction.entries.length} entry lines.`)) {
      return false;
    }
    
    try {
      setLoading(true);
      
      await deleteTransaction(balanceData.transaction._id);
      
      toast.success('Transaction deleted successfully!');
      return true;
    } catch (err) {
      const errorMsg = 'Failed to delete transaction: ' + (err.message || 'Please try again.');
      toast.error(errorMsg);
      console.error('Error deleting transaction:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    balanceData,
    accounts,
    fetchAccounts: fetchAccountsHook,
    fetchTransactionData: fetchTransactionDataHook,
    handleDeleteTransaction: handleDeleteTransactionHook,
  };
}; 