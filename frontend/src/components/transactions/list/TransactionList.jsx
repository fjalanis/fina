import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchTransactions } from '../../../services/transactionService';
import Modal from '../../common/Modal';
import { TransactionForm, SingleEntryForm } from '../form';
import TransactionBalanceModal from '../balancing/TransactionBalanceModal';

const TransactionList = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'balanced', 'unbalanced'
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isSingleEntryModalOpen, setIsSingleEntryModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [unbalancedCount, setUnbalancedCount] = useState(0);

  useEffect(() => {
    getTransactions();
  }, []);

  // Update unbalanced count when transactions change
  useEffect(() => {
    const count = transactions.filter(t => !t.isBalanced).length;
    setUnbalancedCount(count);
  }, [transactions]);

  const getTransactions = async () => {
    try {
      setLoading(true);
      const response = await fetchTransactions();
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
    await fetchTransactions();
  };

  const handleSaveSingleEntry = async () => {
    setIsSingleEntryModalOpen(false);
    await fetchTransactions();
  };
  
  const handleOpenBalanceModal = (transaction) => {
    setSelectedTransaction(transaction);
    setIsBalanceModalOpen(true);
  };
  
  const handleCloseBalanceModal = () => {
    setIsBalanceModalOpen(false);
    setSelectedTransaction(null);
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
        const response = await fetchTransactions();
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"> Description </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"> Reference </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"> Status </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"> Actions </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.map(transaction => (
                <tr key={transaction._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(transaction.date)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-[250px] truncate">
                    {transaction.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.reference || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      transaction.isBalanced 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {transaction.isBalanced ? 'Balanced' : 'Unbalanced'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link 
                      to={`/transactions/${transaction._id}`} 
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      View
                    </Link>
                    {!transaction.isBalanced && (
                      <button
                        onClick={() => handleOpenBalanceModal(transaction)}
                        className="text-orange-600 hover:text-orange-900"
                      >
                        Balance
                      </button>
                    )}
                  </td>
                </tr>
              ))}
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
    </div>
  );
};

export default TransactionList; 