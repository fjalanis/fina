import { transactionApi, accountApi } from '../../services/api';

// Format date to local date string
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

// Format currency to USD
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

// Add match potential flags to transactions
export const addMatchPotentialFlags = async (transactions) => {
  if (!transactions.length) return transactions;
  
  try {
    // Get all entry lines first
    const allEntryLines = [];
    transactions.forEach(transaction => {
      if (transaction.entryLines) {
        allEntryLines.push(...transaction.entryLines);
      }
    });
    
    // Create a lookup of entry amounts and types
    const entrySummaries = {};
    allEntryLines.forEach(entry => {
      const key = `${entry.amount}-${entry.type === 'debit' ? 'credit' : 'debit'}`;
      if (!entrySummaries[key]) {
        entrySummaries[key] = 0;
      }
      entrySummaries[key]++;
    });
    
    // Add the hasMatchPotential flag to each entry line
    return transactions.map(transaction => {
      if (transaction.entryLines) {
        const updatedEntryLines = transaction.entryLines.map(entry => {
          const oppositeType = entry.type === 'debit' ? 'credit' : 'debit';
          const key = `${entry.amount}-${oppositeType}`;
          const hasMatchPotential = entrySummaries[key] > 0;
          return { ...entry, hasMatchPotential };
        });
        
        return { ...transaction, entryLines: updatedEntryLines };
      }
      return transaction;
    });
  } catch (err) {
    console.error('Error checking for potential matches:', err);
    return transactions;
  }
};

// Create test data for balancing
export const createTestData = async (setError, setSuccessMessage, fetchUnbalancedTransactions) => {
  try {
    // First, get available accounts
    const accountsResponse = await accountApi.getAccounts();
    const accountsData = accountsResponse.data;
    
    if (!accountsData || accountsData.length < 2) {
      setError('Need at least two accounts to create test data. Please create accounts first.');
      return;
    }
    
    // Find one asset account and one expense account if possible
    let assetAccount = accountsData.find(acc => acc.type === 'asset');
    let expenseAccount = accountsData.find(acc => acc.type === 'expense');
    
    // Fallback to using any two accounts if specific types aren't found
    if (!assetAccount) assetAccount = accountsData[0];
    if (!expenseAccount || expenseAccount._id === assetAccount._id) {
      expenseAccount = accountsData.find(acc => acc._id !== assetAccount._id) || accountsData[1];
    }
    
    console.log('Using accounts:', { 
      asset: assetAccount._id,
      expense: expenseAccount._id
    });

    // Create a debit transaction
    const debitTransaction = {
      date: new Date(),
      description: 'Test Debit Transaction',
      entryLines: [
        {
          account: expenseAccount._id,
          amount: 100,
          type: 'debit'
        }
      ]
    };
    
    const debitResponse = await transactionApi.createTransaction(debitTransaction);
    console.log('Created debit transaction:', debitResponse);
    
    // Create a matching credit transaction
    const creditTransaction = {
      date: new Date(),
      description: 'Test Credit Transaction',
      entryLines: [
        {
          account: assetAccount._id,
          amount: 100,
          type: 'credit'
        }
      ]
    };
    
    const creditResponse = await transactionApi.createTransaction(creditTransaction);
    console.log('Created credit transaction:', creditResponse);
    
    // Refresh the transaction list
    await fetchUnbalancedTransactions();
    
    setSuccessMessage('Test transactions created successfully!');
    setTimeout(() => setSuccessMessage(null), 3000);
  } catch (err) {
    console.error('Error creating test transactions:', err);
    setError('Failed to create test transactions. Please try again.');
  }
};

// Diagnose matching issues
export const diagnoseMatching = async (selectedEntry, setError, setMatchLoading) => {
  try {
    if (!selectedEntry) {
      setError('No entry selected to diagnose');
      return;
    }
    
    setError(null);
    setMatchLoading(true);
    
    // Get all transactions
    const allTransactions = await transactionApi.getTransactions();
    console.log('All transactions:', allTransactions.data);
    
    // Find potential matches manually
    const targetType = selectedEntry.type;
    const oppositeType = targetType === 'debit' ? 'credit' : 'debit';
    const targetAmount = selectedEntry.amount;
    
    const potentialMatches = [];
    
    allTransactions.data.forEach(transaction => {
      if (transaction._id === selectedEntry.transaction._id) return;
      if (transaction.isBalanced) return;
      
      transaction.entryLines.forEach(entry => {
        if (entry.type === oppositeType && entry.amount === targetAmount) {
          potentialMatches.push({
            entry,
            transaction
          });
        }
      });
    });
    
    console.log('Manual match search found:', potentialMatches);
    setMatchLoading(false);
    
    if (potentialMatches.length === 0) {
      setError('No matching entries found in the entire database. Try creating test transactions.');
    } else {
      setError(`Found ${potentialMatches.length} potential matches in the database, but they're not showing up in the UI. Check browser console.`);
    }
  } catch (err) {
    console.error('Error diagnosing matches:', err);
    setError('Error diagnosing matches. Check console.');
    setMatchLoading(false);
  }
};

// Debug helper to show transaction balance details
export const debugTransactionBalance = async (transaction) => {
  if (!transaction || !transaction._id) {
    console.error('No valid transaction provided to debug');
    return;
  }

  // Fetch the transaction with all entry lines to ensure we have the latest data
  try {
    const response = await transactionApi.getTransaction(transaction._id);
    const freshTransaction = response.data;
    
    if (!freshTransaction || !freshTransaction.entryLines) {
      console.error('Could not fetch transaction details for', transaction._id);
      return;
    }
    
    console.group(`Transaction Balance Debug: ${freshTransaction.description} (${freshTransaction._id})`);
    console.log('Transaction is marked as:', freshTransaction.isBalanced ? 'BALANCED' : 'UNBALANCED');
    
    let totalDebits = 0;
    let totalCredits = 0;
    
    console.log('\nEntry Lines:');
    freshTransaction.entryLines.forEach(entry => {
      const amount = parseFloat(entry.amount);
      if (entry.type === 'debit') {
        totalDebits += amount;
        console.log(`- DEBIT: ${entry.account?.name || 'Unknown'}: $${amount} (${entry._id})`);
      } else {
        totalCredits += amount;
        console.log(`- CREDIT: ${entry.account?.name || 'Unknown'}: $${amount} (${entry._id})`);
      }
    });
    
    const netBalance = totalDebits - totalCredits;
    console.log('\nBalance Summary:');
    console.log(`- Total Debits:  $${totalDebits.toFixed(2)}`);
    console.log(`- Total Credits: $${totalCredits.toFixed(2)}`);
    console.log(`- Net Balance:   $${netBalance.toFixed(2)} (should be 0.00 for balanced transaction)`);
    console.log(`- Status check:  ${Math.abs(netBalance) < 0.001 ? 'BALANCED ✓' : 'UNBALANCED ✗'}`);
    
    console.groupEnd();
    
    return {
      isBalanced: Math.abs(netBalance) < 0.001,
      netBalance,
      totalDebits,
      totalCredits
    };
  } catch (err) {
    console.error('Error debugging transaction balance:', err);
  }
}; 