import { useState, useEffect } from 'react';
import { transactionApi, accountApi } from '../../../services/api';
import { analyzeTransactionBalance } from '../TransactionBalanceLogic';

/**
 * Custom hook for managing transaction balance data
 */
export const useTransactionBalance = (transactionId, isOpen) => {
  const [loading, setLoading] = useState(false);
  const [balanceData, setBalanceData] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSuccessMessage(null);
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
    if (!transactionId) return;
    
    try {
      setLoading(true);
      
      // Make sure we have the latest data
      const response = await transactionApi.getTransaction(transactionId);
      const freshTransaction = response.data;
      
      if (!freshTransaction || !freshTransaction.entryLines) {
        throw new Error('Could not retrieve transaction details');
      }

      // Analyze the transaction balance
      const analysis = analyzeTransactionBalance(freshTransaction);
      setBalanceData(analysis);
      
      setError(null);
      return analysis;
    } catch (err) {
      console.error('Error analyzing transaction:', err);
      setError('Failed to analyze transaction balance.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Delete the transaction
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
      return true;
    } catch (err) {
      setError('Failed to delete transaction: ' + (err.message || 'Please try again.'));
      console.error('Error deleting transaction:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const setTemporarySuccessMessage = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 1500);
  };

  return {
    loading,
    balanceData,
    accounts,
    error,
    successMessage,
    fetchAccounts,
    fetchTransactionData,
    handleDeleteTransaction,
    clearMessages,
    setError,
    setTemporarySuccessMessage
  };
}; 