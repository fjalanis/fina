import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { formatNumber } from '../../../utils/formatters';
import { toast } from 'react-toastify'; // Keep toast for potential future actions

// Define account type colors (can be passed as prop or defined here)
const accountTypeColors = {
    asset: 'bg-blue-100 text-blue-800',
    liability: 'bg-red-100 text-red-800',
    income: 'bg-green-100 text-green-800',
    expense: 'bg-yellow-100 text-yellow-800',
    equity: 'bg-purple-100 text-purple-800',
    default: 'bg-gray-100 text-gray-800' // Fallback
};

// Wrap the component definition with memo
const TransactionTable = memo(({ 
    transactions, 
    onViewTransaction,     // Handler to open view modal
    onBalanceTransaction,   // Handler to open balance modal
    onEditTransaction      // Add prop for edit handler
}) => {

    // Helper Functions (Mostly moved from TransactionList)
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            // Basic check for invalid date
            if (isNaN(date.getTime())) return 'Invalid Date';
            return date.toLocaleDateString();
        } catch (e) {
            console.error("Error formatting date:", dateString, e);
            return 'Invalid Date';
        }
    };

    const truncateAccountName = (name, maxLength = 20) => {
        if (!name) return 'N/A';
        return name.length > maxLength ? name.substring(0, maxLength - 1) + '…' : name;
    };

    const calculateDifference = (debitAmount, creditAmount) => {
        return debitAmount - creditAmount;
    };

    const formatAmountWithBalance = (amount, difference, isDebit) => {
        const formattedAmount = formatNumber(amount);
        if (Math.abs(difference) < 0.01) { // Considered balanced
            return formattedAmount;
        }

        const needsAmount = formatNumber(Math.abs(difference));

        if (amount === 0) {
            return isDebit 
                ? `0.00 (needs +${needsAmount})` 
                : `0.00 (needs +${needsAmount})`;
        }

        if (isDebit) {
            return difference > 0 
                ? formattedAmount // Debit is higher or equal (already covered balanced case)
                : `${formattedAmount} (needs +${needsAmount})`; // Credit is higher
        } else { // isCredit
            return difference < 0
                ? formattedAmount // Credit is higher or equal
                : `${formattedAmount} (needs +${needsAmount})`; // Debit is higher
        }
    };

    const processEntriesForDefaultView = (entries, columnType) => {
        if (!Array.isArray(entries)) {
             return { amount: 0, detail: null };
        }
        const columnEntries = entries.filter(entry => entry.type === columnType);
        const oppositeType = columnType === 'debit' ? 'credit' : 'debit';
        const oppositeEntries = entries.filter(entry => entry.type === oppositeType);

        const totalAmount = columnEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
        let detail = null;
        const prefix = columnType === 'debit' ? 'From: ' : 'To: ';

        if (columnEntries.length === 1 && oppositeEntries.length === 1) {
            const account = oppositeEntries[0]?.account;
            const accountName = account?.name || 'N/A';
            const accountType = account?.type || 'default';
            const colorClass = accountTypeColors[accountType] || accountTypeColors.default;
            detail = { prefix: prefix, name: truncateAccountName(accountName), colorClass: colorClass };
        } else if (columnEntries.length > 1) {
            const countPrefix = columnType === 'debit' ? 'From ' : 'To ';
            detail = { prefix: countPrefix, name: `${columnEntries.length} accounts`, colorClass: '' };
        } else if (columnEntries.length === 1) {
            const account = columnEntries[0]?.account;
            const accountName = account?.name || 'N/A';
            const accountType = account?.type || 'default';
            const colorClass = accountTypeColors[accountType] || accountTypeColors.default;
            detail = { prefix: prefix, name: truncateAccountName(accountName), colorClass: colorClass };
        }

        return { amount: totalAmount, detail: detail };
    };
    
    // Prepare data based on display mode
    const preparedTransactions = transactions
        .map(transaction => {
            if (!transaction || !transaction._id) {
                return null; // Skip invalid transaction objects
            }

            // --- Centralized Balance Calculation --- START
            let debitTotal = 0;
            let creditTotal = 0;
            if (Array.isArray(transaction.entries)) {
                transaction.entries.forEach(entry => {
                    if (entry.type === 'debit') {
                        debitTotal += (entry.amount || 0);
                    } else if (entry.type === 'credit') {
                        creditTotal += (entry.amount || 0);
                    }
                });
            }
            const overallDifference = calculateDifference(debitTotal, creditTotal);
            const overallIsBalanced = Math.abs(overallDifference) < 0.01;
            // --- Centralized Balance Calculation --- END

            // Default display mode - THIS IS NOW THE ONLY PATH
            if (!Array.isArray(transaction.entries)) {
                // Provide default values to prevent crashes downstream
                return {
                    ...transaction,
                    debitInfo: { amount: 0, detail: null },
                    creditInfo: { amount: 0, detail: null },
                    difference: 0,
                    isBalanced: true,
                };
            }
            const debitInfo = processEntriesForDefaultView(transaction.entries, 'debit');
            const creditInfo = processEntriesForDefaultView(transaction.entries, 'credit');
            const difference = calculateDifference(debitInfo.amount, creditInfo.amount);
            const isBalanced = Math.abs(difference) < 0.01;
            return {
                ...transaction,
                debitInfo,
                creditInfo,
                difference: overallDifference,
                isBalanced: overallIsBalanced
            };
        })
        .filter(t => t !== null); // Remove nulls (filtered or invalid)

     if (!preparedTransactions || preparedTransactions.length === 0) {
        return (
            <div className="text-center p-8 bg-gray-50 rounded mt-6">
                <p className="text-gray-500">No relevant transactions found.</p>
            </div>
        );
     }

    return (
        <div className="overflow-x-auto mt-6">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"> Date </th>
                {/* Always show Debit/Credit columns */}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"> Debits </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"> Credits </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"> Description </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"> Actions </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {preparedTransactions.map(transaction => {
                // Apply background highlight if unbalanced, regardless of mode
                const unbalancedBgClass = !transaction.isBalanced ? 'bg-red-50' : '';
                
                return (
                  <tr key={transaction._id} className="hover:bg-gray-50">
                    {/* Date Column */}
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${unbalancedBgClass}`}>
                      {formatDate(transaction.date)}
                    </td>

                    {/* Columns based on displayMode */}
                    {/* Always render Debit/Credit columns */}
                    {/* Debit Column (Default View) */}
                    <td className={`px-6 py-4 whitespace-nowrap text-right ${unbalancedBgClass}`}>
                      <div className="text-sm text-red-600 font-medium">
                        {formatAmountWithBalance(transaction.debitInfo?.amount ?? 0, transaction.difference, true)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {transaction.debitInfo?.detail ? (
                          <>
                            {transaction.debitInfo.detail.prefix}
                            <span className={`ml-1 px-2 py-0.5 rounded-full ${transaction.debitInfo.detail.colorClass}`}>
                              {transaction.debitInfo.detail.name}
                            </span>
                          </>
                        ) : ''}
                      </div>
                    </td>
                    {/* Credit Column (Default View) */}
                    <td className={`px-6 py-4 whitespace-nowrap text-right ${unbalancedBgClass}`}>
                      <div className="text-sm text-green-600 font-medium">
                        {formatAmountWithBalance(transaction.creditInfo?.amount ?? 0, transaction.difference, false)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {transaction.creditInfo?.detail ? (
                          <>
                            {transaction.creditInfo.detail.prefix}
                            <span className={`ml-1 px-2 py-0.5 rounded-full ${transaction.creditInfo.detail.colorClass}`}>
                              {transaction.creditInfo.detail.name}
                            </span>
                          </>
                        ) : ''}
                      </div>
                    </td>
                    
                    {/* Description Column */}
                    <td className={`px-6 py-4 text-sm text-gray-500 max-w-[200px] truncate ${unbalancedBgClass}`} title={transaction.description}>
                      {transaction.description || '-'} 
                    </td>

                    {/* Actions Column */}
                    <td className={`px-6 py-4 whitespace-nowrap text-center text-sm font-medium ${unbalancedBgClass}`}>
                      {/* View Button */}
                      <button 
                        onClick={() => onViewTransaction && onViewTransaction(transaction)} 
                        className="text-blue-600 hover:text-blue-900 mr-3" // Adjusted margin
                        title="View Details"
                        disabled={!onViewTransaction}
                      >
                        View
                      </button>
                      {/* Edit Button - NEW */}
                      <button 
                        onClick={() => onEditTransaction && onEditTransaction(transaction)} 
                        className="text-indigo-600 hover:text-indigo-900 mr-3" // Adjusted margin
                        title="Edit Transaction"
                        disabled={!onEditTransaction}
                      >
                        Edit
                      </button>
                      {/* Balance Button */} 
                      {!transaction.isBalanced && (
                        <button
                          onClick={() => onBalanceTransaction && onBalanceTransaction(transaction)}
                          className="text-orange-600 hover:text-orange-900"
                          title="Balance Transaction"
                          disabled={!onBalanceTransaction}
                        >
                          Balance
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
    );
}); // Close the memo wrapper

// Set display name for DevTools
TransactionTable.displayName = 'TransactionTable';

export default TransactionTable; 