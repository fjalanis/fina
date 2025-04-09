import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { fetchTransactions } from '../../../services/transactionService';
import Modal from '../../common/Modal';
import { TransactionForm, SingleEntryForm } from '../form';
import TransactionBalanceModal from '../balancing/TransactionBalanceModal';
import TransactionDetailModal from '../detail/TransactionDetailModal';
import { useSearchParams } from 'react-router-dom';
import TransactionListDisplay from './TransactionListDisplay';

const TransactionList = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isSingleEntryModalOpen, setIsSingleEntryModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [balancingTransaction, setBalancingTransaction] = useState(null);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingTransaction, setViewingTransaction] = useState(null);
  const [searchParams] = useSearchParams();
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  useEffect(() => {
    getTransactions();
  }, [startDate, endDate]);

  const getTransactions = async () => {
    try {
      setLoading(true);
      const response = await fetchTransactions({ startDate, endDate });
      setTransactions(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      toast.error('Failed to load transactions. Please try again.');
      console.error('Error fetching transactions:', err);
      setTransactions([]);
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
    setBalancingTransaction(transaction);
    setIsBalanceModalOpen(true);
  };
  
  const handleCloseBalanceModal = () => {
    setIsBalanceModalOpen(false);
    setBalancingTransaction(null);
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
    handleCloseBalanceModal();
    toast.success('Transaction balanced successfully! Refreshing list...');
    await getTransactions();
  };
  
  const handleTransactionUpdated = async () => {
    handleCloseViewModal();
    toast.success('Transaction updated successfully! Refreshing list...');
    await getTransactions();
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

      <TransactionListDisplay
          transactions={transactions}
          onViewTransaction={handleOpenViewModal}
          onBalanceTransaction={handleOpenBalanceModal}
      />
      
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
      
      {balancingTransaction && (
        <TransactionBalanceModal
          isOpen={isBalanceModalOpen}
          onClose={handleCloseBalanceModal}
          transaction={balancingTransaction}
          onTransactionBalanced={handleTransactionBalanced}
        />
      )}

      {viewingTransaction && (
        <TransactionDetailModal
          isOpen={isViewModalOpen}
          onClose={handleCloseViewModal}
          transaction={viewingTransaction}
          onUpdate={handleTransactionUpdated}
        />
      )}
    </div>
  );
};

export default TransactionList; 