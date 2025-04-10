import { useState } from 'react';
import { fetchSuggestedMatches, mergeTransaction, moveEntry } from '../../../../services/transactionService';

/**
 * Custom hook for managing complementary transactions
 */
export const useComplementaryTransactions = (onSuccessCallback, toast) => {
  const [matchLoading, setMatchLoading] = useState(false);
  const [complementaryTransactions, setComplementaryTransactions] = useState([]);
  const [transactionPagination, setTransactionPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    pages: 0
  });

  // Fetch complementary transactions based on balance amount and type
  const fetchComplementaryTransactionsHook = async (amount, type, transactionId, page = 1, referenceDate) => {
    try {
      setMatchLoading(true);
      
      // Make sure amount is a number and type is a string
      const numericAmount = parseFloat(amount);
      const fixType = String(type);
      
      // Only proceed if we have valid values
      if (isNaN(numericAmount) || !fixType) {
        console.error('Invalid amount or type for matching:', { amount, type });
        setComplementaryTransactions([]);
        toast.error('Error finding complementary transactions');
        setMatchLoading(false);
        return;
      }
      
      console.log(`Looking for transactions with ${fixType} imbalance of ${numericAmount}`);
      
      // Use the updated matching API with parameters object
      const response = await fetchSuggestedMatches({
        amount: numericAmount,
        type: fixType,
        excludeTransactionId: transactionId,
        page,
        limit: transactionPagination.limit,
        maxMatches: 10,
        dateRange: 15,
        referenceDate
      });
      
      if (response.success && response.data) {
        const transactions = response.data.transactions || [];
        console.log(`Found ${transactions.length} complementary transactions`);
        setComplementaryTransactions(transactions);
        
        // Check if pagination data exists in response
        if (response.data.pagination) {
          setTransactionPagination(response.data.pagination);
        } else {
          // Set default pagination if not available
          setTransactionPagination({
            page: page,
            limit: transactionPagination.limit,
            total: transactions.length,
            pages: Math.ceil(transactions.length / transactionPagination.limit)
          });
        }
      } else {
        setComplementaryTransactions([]);
      }
    } catch (err) {
      console.error('Error finding complementary transactions:', err);
      setComplementaryTransactions([]);
      toast.error('Error finding complementary transactions');
    } finally {
      setMatchLoading(false);
    }
  };

  // Handle transaction page change for pagination
  const handleTransactionPageChangeHook = async (amount, type, transactionId, page, referenceDate) => {
    await fetchComplementaryTransactionsHook(amount, type, transactionId, page, referenceDate);
  };

  // Handle moving a complementary transaction
  const handleMoveTransactionHook = async (sourceTransaction, targetTransactionId) => {
    if (!sourceTransaction || !targetTransactionId) return false;
    
    try {
      setMatchLoading(true);
      
      console.log(`Merging transaction ${sourceTransaction._id} to transaction ${targetTransactionId}`);
      
      // Call the mergeTransaction API
      await mergeTransaction(
        sourceTransaction._id,
        targetTransactionId
      );
      
      // Reset selection state
      setComplementaryTransactions([]);
      
      // Call the success callback (which now uses toast)
      if (onSuccessCallback) {
        onSuccessCallback('Transaction merged successfully!');
      }
      
      return true;
    } catch (err) {
      const errorMsg = 'Error merging transaction: ' + (err.message || 'Please try again.');
      toast.error(errorMsg);
      console.error('Error merging transaction:', err);
      return false;
    } finally {
      setMatchLoading(false);
    }
  };

  // Handle moving an entry from manual search
  const handleMoveEntryHook = async (entry, targetTransactionId) => {
    if (!entry || !targetTransactionId || !entry.transaction || !entry.transaction._id) {
      console.error('Missing data for moving entry:', { entry, targetTransactionId });
      toast.error('Cannot move entry: Missing required data.');
      return false;
    }
    
    const sourceTransactionId = entry.transaction._id;
    const entryId = entry._id;

    try {
      setMatchLoading(true);
      
      console.log(`Moving entry ${entryId} from transaction ${sourceTransactionId} to transaction ${targetTransactionId}`);
      
      // Call the moveEntry API with sourceTransactionId, entryId, and destinationTransactionId
      await moveEntry(
        sourceTransactionId, 
        entryId, 
        targetTransactionId
      );
      
      // Call the success callback (which now uses toast)
      if (onSuccessCallback) {
        onSuccessCallback('Entry moved successfully!');
      }
      
      return true;
    } catch (err) {
      const errorMsg = 'Error moving entry: ' + (err.message || 'Please try again.');
      toast.error(errorMsg);
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
    fetchComplementaryTransactions: fetchComplementaryTransactionsHook,
    handleTransactionPageChange: handleTransactionPageChangeHook,
    handleMoveTransaction: handleMoveTransactionHook,
    handleMoveEntry: handleMoveEntryHook
  };
}; 