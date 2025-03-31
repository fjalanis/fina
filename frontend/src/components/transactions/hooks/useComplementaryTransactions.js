import { useState } from 'react';
import { transactionApi } from '../../../services/api';

/**
 * Custom hook for managing complementary transactions
 */
export const useComplementaryTransactions = (onSuccess) => {
  const [matchLoading, setMatchLoading] = useState(false);
  const [complementaryTransactions, setComplementaryTransactions] = useState([]);
  const [transactionPagination, setTransactionPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    pages: 0
  });

  // Fetch complementary transactions based on balance amount and type
  const fetchComplementaryTransactions = async (amount, type, transactionId, page = 1) => {
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
        transactionId, // Exclude current transaction
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

  // Handle transaction page change for pagination
  const handleTransactionPageChange = async (amount, type, transactionId, page) => {
    await fetchComplementaryTransactions(amount, type, transactionId, page);
  };

  // Handle moving a complementary transaction
  const handleMoveTransaction = async (sourceTransaction, targetTransactionId) => {
    if (!sourceTransaction || !targetTransactionId) return;
    
    try {
      setMatchLoading(true);
      
      console.log(`Merging transaction ${sourceTransaction._id} to transaction ${targetTransactionId}`);
      
      // Call the mergeTransaction API
      await transactionApi.mergeTransaction(
        sourceTransaction._id,
        targetTransactionId
      );
      
      // Reset selection state
      setComplementaryTransactions([]);
      
      // Notify that a transaction was merged successfully
      if (onSuccess) {
        onSuccess('Transaction merged successfully!');
      }
      
      return true;
    } catch (err) {
      console.error('Error merging transaction:', err);
      return false;
    } finally {
      setMatchLoading(false);
    }
  };

  // Handle moving an entry from manual search
  const handleMoveEntry = async (entry, targetTransactionId) => {
    if (!entry || !targetTransactionId) return;
    
    try {
      setMatchLoading(true);
      
      console.log(`Moving entry ${entry._id} to transaction ${targetTransactionId}`);
      
      // Call the extractEntry API to move this single entry
      await transactionApi.extractEntry(
        entry._id,
        targetTransactionId
      );
      
      // Notify that an entry was moved successfully
      if (onSuccess) {
        onSuccess('Entry moved successfully!');
      }
      
      return true;
    } catch (err) {
      console.error('Error moving entry:', err);
      return false;
    } finally {
      setMatchLoading(false);
    }
  };

  return {
    matchLoading,
    complementaryTransactions,
    transactionPagination,
    fetchComplementaryTransactions,
    handleTransactionPageChange,
    handleMoveTransaction,
    handleMoveEntry
  };
}; 