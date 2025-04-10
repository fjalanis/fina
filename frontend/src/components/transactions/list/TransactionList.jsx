import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { fetchTransactions, fetchTransactionById } from '../../../services/transactionService';
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

  const getTransactions = useCallback(async () => {
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
  }, [startDate, endDate]);

  useEffect(() => {
    getTransactions();
  }, [getTransactions]);

  const handleCreateTransaction = useCallback(() => { setIsTransactionModalOpen(true); }, []);
  const handleCreateSingleEntry = useCallback(() => { setIsSingleEntryModalOpen(true); }, []);

  const handleSaveTransaction = useCallback(async () => {
    setIsTransactionModalOpen(false);
    await getTransactions();
  }, [getTransactions]);

  const handleSaveSingleEntry = useCallback(async () => {
    setIsSingleEntryModalOpen(false);
    await getTransactions();
  }, [getTransactions]);
  
  const handleOpenBalanceModal = useCallback((transaction) => {
    setBalancingTransaction(transaction);
    setIsBalanceModalOpen(true);
  }, []);
  
  const handleCloseBalanceModal = useCallback(() => {
    setIsBalanceModalOpen(false);
    setBalancingTransaction(null);
  }, []);
  
  const handleOpenViewModal = useCallback((transaction) => {
    setViewingTransaction(transaction);
    setIsViewModalOpen(true);
  }, []);

  const handleCloseViewModal = useCallback(() => {
    setIsViewModalOpen(false);
    setViewingTransaction(null);
  }, []);

  const handleBalanceModalUpdate = useCallback(async (transactionId) => {
    if (!transactionId) return;
    console.log(`Transaction ${transactionId} was updated. Fetching updated data...`);
    try {
      const response = await fetchTransactionById(transactionId);
      const updatedTransaction = response.data;

      if (updatedTransaction) {
        setTransactions(prevTransactions => 
          prevTransactions.map(t => 
            t._id === transactionId ? updatedTransaction : t
          )
        );
      } else {
        console.warn(`Could not fetch updated data for ${transactionId}, refreshing full list.`);
        await getTransactions();
      }
    } catch (error) {
      console.error(`Error fetching updated transaction ${transactionId}:`, error);
      toast.error('Failed to refresh transaction details.');
    }
  }, [getTransactions]);

  const handleDetailModalUpdate = handleBalanceModalUpdate;

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
          onTransactionUpdated={handleBalanceModalUpdate}
        />
      )}

      {viewingTransaction && (
        <TransactionDetailModal
          isOpen={isViewModalOpen}
          onClose={handleCloseViewModal}
          transaction={viewingTransaction}
          onUpdate={handleDetailModalUpdate}
        />
      )}
    </div>
  );
};

export default TransactionList; 