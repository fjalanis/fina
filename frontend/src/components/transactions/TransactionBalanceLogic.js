// Business logic utilities for transaction balancing
import { formatCurrency } from './TransactionBalancerUtils';

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
  if (!transaction || !transaction.entryLines) {
    return null;
  }

  let totalDebits = 0;
  let totalCredits = 0;
  
  // Calculate totals
  transaction.entryLines.forEach(entry => {
    const amount = parseFloat(entry.amount);
    if (entry.type === 'debit') {
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