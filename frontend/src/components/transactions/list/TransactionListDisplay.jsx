import React, { useState, useEffect } from 'react';
import TransactionTable from './TransactionTable';

const TransactionListDisplay = ({ transactions, onViewTransaction, onBalanceTransaction, onEditTransaction }) => {
  // State for transaction filtering (managed internally)
  const [filter, setFilter] = useState('all'); // 'all', 'balanced', 'unbalanced'
  const [unbalancedCount, setUnbalancedCount] = useState(0);

  // Calculate unbalanced count whenever the input transactions change
  useEffect(() => {
    if (transactions && transactions.length > 0) {
      const count = transactions.filter(t => {
        if (!t || !Array.isArray(t.entries)) return false;
        const debitTotal = t.entries.filter(e => e.type === 'debit').reduce((sum, e) => sum + (e.amount || 0), 0);
        const creditTotal = t.entries.filter(e => e.type === 'credit').reduce((sum, e) => sum + (e.amount || 0), 0);
        return Math.abs(debitTotal - creditTotal) >= 0.01;
      }).length;
      setUnbalancedCount(count);
    } else {
      setUnbalancedCount(0);
    }
  }, [transactions]);

  const balancedCount = Math.max(0, (transactions?.length || 0) - unbalancedCount);

  // Apply filtering based on the internal filter state
  const filteredTransactions = transactions.filter(transaction => {
    if (!transaction) return false;
    if (filter === 'all') return true;

    // Calculate balance for filtering
    const debitTotal = transaction.entries?.filter(e => e.type === 'debit').reduce((sum, e) => sum + (e.amount || 0), 0) ?? 0;
    const creditTotal = transaction.entries?.filter(e => e.type === 'credit').reduce((sum, e) => sum + (e.amount || 0), 0) ?? 0;
    const isBalanced = Math.abs(debitTotal - creditTotal) < 0.01;

    if (filter === 'balanced') return isBalanced;
    if (filter === 'unbalanced') return !isBalanced;
    return true;
  });

  return (
    <div>
      {/* Filter Buttons */} 
      <div className="mb-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded flex items-center ${
              filter === 'all' 
                ? 'bg-gray-700 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <span>All</span>
            <span className={`ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none rounded-full ${
              filter === 'all' ? 'bg-white text-gray-700' : 'bg-gray-700 text-white'
            }`}>
              {transactions.length}
            </span>
          </button>
          <button
            onClick={() => setFilter('balanced')}
            className={`px-3 py-1 rounded flex items-center ${
              filter === 'balanced' 
                ? 'bg-green-600 text-white' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            <span>Balanced</span>
            <span className={`ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none rounded-full ${
              filter === 'balanced' ? 'bg-white text-green-700' : 'bg-green-600 text-white'
            }`}>
              {balancedCount}
            </span>
          </button>
          <button
            onClick={() => setFilter('unbalanced')}
            className={`px-3 py-1 rounded flex items-center ${
              filter === 'unbalanced' 
                ? 'bg-red-600 text-white' 
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
          >
            <span>Unbalanced</span>
            {unbalancedCount > 0 && (
              <span className={`ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none rounded-full ${
                filter === 'unbalanced' ? 'bg-white text-red-600' : 'bg-red-600 text-white'
              }`}>
                {unbalancedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Transaction Table - Pass filtered data and handlers */}
      <TransactionTable
        transactions={filteredTransactions} 
        onViewTransaction={onViewTransaction}
        onBalanceTransaction={onBalanceTransaction}
        onEditTransaction={onEditTransaction}
      />
    </div>
  );
};

export default TransactionListDisplay; 