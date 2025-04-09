import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { fetchTransactions } from '../../../services/transactionService';
import Modal from '../../common/Modal';
import { TransactionForm, SingleEntryForm } from '../form';
import TransactionBalanceModal from '../balancing/TransactionBalanceModal';
import TransactionDetailModal from '../detail/TransactionDetailModal';
import { useSearchParams } from 'react-router-dom';
import { formatNumber } from '../../../utils/formatters';

// Define account type colors (copied from AccountList)
const accountTypeColors = {
  asset: 'bg-blue-100 text-blue-800',
  liability: 'bg-red-100 text-red-800',
  income: 'bg-green-100 text-green-800',
  expense: 'bg-yellow-100 text-yellow-800',
  equity: 'bg-purple-100 text-purple-800',
  default: 'bg-gray-100 text-gray-800' // Fallback
};

const TransactionList = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'balanced', 'unbalanced'
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isSingleEntryModalOpen, setIsSingleEntryModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [unbalancedCount, setUnbalancedCount] = useState(0);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingTransaction, setViewingTransaction] = useState(null);
  // Use URLSearchParams to get date range
  const [searchParams] = useSearchParams();
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  // Fetch transactions when component mounts or date range changes
  useEffect(() => {
    getTransactions();
  }, [startDate, endDate]);

  // Update unbalanced count when transactions change
  useEffect(() => {
    const count = transactions.filter(t => !t.isBalanced).length;
    setUnbalancedCount(count);
  }, [transactions]);

  const getTransactions = async () => {
    try {
      setLoading(true);
      // Pass startDate and endDate from URL params to the API call
      const response = await fetchTransactions({ startDate, endDate });
      // --- DEBUG LOG: Log first transaction from API ---
      if (response.data && response.data.length > 0) {
        console.log('[DEBUG] First transaction from API:', response.data[0]);
      }
      // --- End DEBUG LOG ---
      setTransactions(response.data);
    } catch (err) {
      toast.error('Failed to load transactions. Please try again.');
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransaction = () => { setIsTransactionModalOpen(true); };
  const handleCreateSingleEntry = () => { setIsSingleEntryModalOpen(true); };

  const handleSaveTransaction = async () => {
    setIsTransactionModalOpen(false);
    await getTransactions();
  };

  const handleSaveSingleEntry = async () => {
    setIsSingleEntryModalOpen(false);
    await getTransactions();
  };
  
  const handleOpenBalanceModal = (transaction) => {
    setSelectedTransaction(transaction);
    setIsBalanceModalOpen(true);
  };
  
  const handleCloseBalanceModal = () => {
    setIsBalanceModalOpen(false);
    setSelectedTransaction(null);
  };
  
  const handleOpenViewModal = (transaction) => {
    setViewingTransaction(transaction);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setViewingTransaction(null);
  };

  const handleTransactionBalanced = async () => {
    // Refresh the transaction list to reflect changes
    // This doesn't cause a full page refresh, it just updates the data
    try {
      // Don't show loading indicator for quick refreshes
      // to avoid layout shifts
      const wasLoading = loading;
      if (!wasLoading) {
        // We're not setting loading to true here to avoid flicker
        const response = await fetchTransactions({ startDate, endDate });
        setTransactions(response.data);
      } else {
        // We're already loading, just do the normal fetch
        await getTransactions();
      }
      toast.success('Transaction balanced successfully!');
    } catch (err) {
      console.error('Error refreshing transactions:', err);
      toast.error('Failed to refresh transaction list after balancing.');
      // Don't show error for background refreshes
    }
    handleCloseBalanceModal();
    await getTransactions();
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'all') return true;
    if (filter === 'balanced') return transaction.isBalanced;
    if (filter === 'unbalanced') return !transaction.isBalanced;
    return true;
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // --- Helper Functions for Debit/Credit Columns ---
  const truncateAccountName = (name, maxLength = 20) => {
    if (!name) return 'N/A';
    return name.length > maxLength ? name.substring(0, maxLength - 1) + '…' : name;
  };

  // Calculate the difference between debits and credits
  const calculateDifference = (debitAmount, creditAmount) => {
    return debitAmount - creditAmount;
  };

  // Format amount with deficit/surplus indicator
  const formatAmountWithBalance = (amount, difference, isDebit) => {
    if (amount === 0) {
      return isDebit ? '0.00 (needs +' + formatNumber(Math.abs(difference)) + ')' : '0.00 (needs +' + formatNumber(Math.abs(difference)) + ')';
    }
    
    if (difference === 0) {
      return formatNumber(amount);
    }
    
    // For debit column
    if (isDebit) {
      if (difference > 0) {
        // Debit is higher, show the amount
        return formatNumber(amount);
      } else {
        // Credit is higher, show deficit
        return `${formatNumber(amount)} (needs +${formatNumber(Math.abs(difference))})`;
      }
    } 
    // For credit column
    else {
      if (difference < 0) {
        // Credit is higher, show the amount
        return formatNumber(amount);
      } else {
        // Debit is higher, show deficit
        return `${formatNumber(amount)} (needs +${formatNumber(Math.abs(difference))})`;
      }
    }
  };

  // Refactored to show the 'other side' account for simple transactions
  const processEntries = (entries, columnType) => {
    const columnEntries = entries.filter(entry => entry.type === columnType);
    const oppositeType = columnType === 'debit' ? 'credit' : 'debit';
    const oppositeEntries = entries.filter(entry => entry.type === oppositeType);

    const totalAmount = columnEntries.reduce((sum, entry) => sum + entry.amount, 0);
    let detail = null;
    const prefix = columnType === 'debit' ? 'From: ' : 'To: ';

    // Case 1: Simple 2-entry transaction - show the OPPOSITE account
    if (columnEntries.length === 1 && oppositeEntries.length === 1) {
      const account = oppositeEntries[0].account; // Get account from the *other* side
      const accountName = account?.name || 'N/A';
      const accountType = account?.type || 'default';
      const colorClass = accountTypeColors[accountType] || accountTypeColors.default;
      
      detail = {
        prefix: prefix,
        name: truncateAccountName(accountName),
        colorClass: colorClass
      };
    // Case 2: Multiple entries on this side - show count
    } else if (columnEntries.length > 1) {
      const countPrefix = columnType === 'debit' ? 'From ' : 'To ';
      detail = {
        prefix: countPrefix,
        name: `${columnEntries.length} accounts`,
        colorClass: '' // No color class needed for count
      };
    // Case 3: Single entry on this side, but multiple on the other (or unbalanced) - show this side's account
    } else if (columnEntries.length === 1) {
       const account = columnEntries[0].account;
       const accountName = account?.name || 'N/A';
       const accountType = account?.type || 'default';
       const colorClass = accountTypeColors[accountType] || accountTypeColors.default;
       detail = {
         prefix: prefix,
         name: truncateAccountName(accountName),
         colorClass: colorClass
       };
    // Case 4: No entries on this side
    } else {
        detail = null; 
    }

    // --- DEBUG LOG: Log processed entry info ---
    console.log(`[DEBUG] processEntries (Col: ${columnType}) - Amount: ${totalAmount}, Detail:`, detail, `, ColEntries:`, columnEntries, `, OppEntries:`, oppositeEntries);
    // --- End DEBUG LOG ---

    return {
      amount: totalAmount,
      detail: detail 
    };
  };
  // --- End Helper Functions ---

  if (loading) return <div className="flex justify-center p-5"><div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Transactions</h2>
        <div className="space-x-2">
          <button 
            onClick={handleCreateSingleEntry}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition"
          >
            Add Entry
          </button>
          <button 
            onClick={handleCreateTransaction}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            Add Transaction
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded ${
              filter === 'all' 
                ? 'bg-gray-700 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('balanced')}
            className={`px-3 py-1 rounded ${
              filter === 'balanced' 
                ? 'bg-green-600 text-white' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            Balanced
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

      {filteredTransactions.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded">
          <p className="text-gray-500">No transactions found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"> Date </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"> Debits </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"> Credits </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"> Description </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"> Actions </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.map(transaction => {
                // --- DEBUG LOG: Log transaction entries before processing ---
                console.log(`[DEBUG] Rendering transaction ${transaction._id}, Entries:`, transaction.entries);
                // --- End DEBUG LOG ---

                // Process entries for debit and credit info
                const debitInfo = processEntries(transaction.entries || [], 'debit');
                const creditInfo = processEntries(transaction.entries || [], 'credit');
                
                // Calculate if there's an imbalance
                const difference = calculateDifference(debitInfo.amount, creditInfo.amount);
                const isBalanced = Math.abs(difference) < 0.01; // Using small epsilon for float comparison
                
                // Determine background color based on balance status
                const debitBgClass = isBalanced ? '' : 'bg-red-50';
                const creditBgClass = isBalanced ? '' : 'bg-red-50';
                
                return (
                  <tr key={transaction._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(transaction.date)}
                    </td>
                    {/* Debit Column */}
                    <td className={`px-6 py-4 whitespace-nowrap text-right ${debitBgClass}`}>
                      <div className="text-sm text-red-600">
                        {formatAmountWithBalance(debitInfo.amount, difference, true)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {debitInfo.detail ? (
                          <>
                            {debitInfo.detail.prefix}
                            <span className={`ml-1 px-2 py-0.5 rounded-full ${debitInfo.detail.colorClass}`}>
                              {debitInfo.detail.name}
                            </span>
                          </>
                        ) : (
                          '' // Leave blank if detail is null
                        )}
                      </div>
                    </td>
                    {/* Credit Column */}
                    <td className={`px-6 py-4 whitespace-nowrap text-right ${creditBgClass}`}>
                      <div className="text-sm text-green-600">
                        {formatAmountWithBalance(creditInfo.amount, difference, false)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {creditInfo.detail ? (
                          <>
                            {creditInfo.detail.prefix}
                            <span className={`ml-1 px-2 py-0.5 rounded-full ${creditInfo.detail.colorClass}`}>
                              {creditInfo.detail.name}
                            </span>
                          </>
                        ) : (
                          '' // Leave blank if detail is null
                        )}
                      </div>
                    </td>
                    {/* Description Column (kept for context) */}
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px] truncate" title={transaction.description}>
                      {transaction.description || '-'} 
                    </td>
                    {/* Actions Column */}
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <button 
                        onClick={() => handleOpenViewModal(transaction)} 
                        className="text-blue-600 hover:text-blue-900 mr-4"
                        title="View Details"
                      >
                        View
                      </button>
                      {!isBalanced && (
                        <button
                          onClick={() => handleOpenBalanceModal(transaction)}
                          className="text-orange-600 hover:text-orange-900"
                          title="Balance Transaction"
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
      )}

      {/* Add Transaction Modal */}
      <Modal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        title="Create Balanced Transaction"
        size="lg"
      >
        <TransactionForm
          onSave={handleSaveTransaction}
          onCancel={() => setIsTransactionModalOpen(false)}
        />
      </Modal>

      {/* Add Single Entry Modal */}
      <Modal
        isOpen={isSingleEntryModalOpen}
        onClose={() => setIsSingleEntryModalOpen(false)}
        title="Create Single Entry"
        size="md"
      >
        <SingleEntryForm
          onSave={handleSaveSingleEntry}
          onCancel={() => setIsSingleEntryModalOpen(false)}
        />
      </Modal>
      
      {/* Transaction Balance Modal */}
      {selectedTransaction && (
        <TransactionBalanceModal
          isOpen={isBalanceModalOpen}
          onClose={handleCloseBalanceModal}
          transaction={selectedTransaction}
          onTransactionBalanced={handleTransactionBalanced}
        />
      )}

      {viewingTransaction && (
        <TransactionDetailModal
          isOpen={isViewModalOpen}
          onClose={handleCloseViewModal}
          transaction={viewingTransaction}
          onUpdate={handleTransactionBalanced}
        />
      )}
    </div>
  );
};

export default TransactionList; 