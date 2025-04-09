import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchAccountById, deleteAccount, fetchDescendantIds } from '../../services/accountService';
import { fetchTransactions } from '../../services/transactionService';
import Modal from '../common/Modal';
import AccountForm from './AccountForm';
import TransactionListDisplay from '../transactions/list/TransactionListDisplay';
import TransactionDetailModal from '../transactions/detail/TransactionDetailModal';
import TransactionBalanceModal from '../transactions/balancing/TransactionBalanceModal';
import { toast } from 'react-toastify';

const AccountDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [accountTransactions, setAccountTransactions] = useState([]);
  const [allAccountIds, setAllAccountIds] = useState([]);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingTransaction, setViewingTransaction] = useState(null);

  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [balancingTransaction, setBalancingTransaction] = useState(null);

  const fetchAccountDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      setAccount(null);
      setAllAccountIds([]);
      setAccountTransactions([]);

      const response = await Promise.all([fetchAccountById(id), fetchDescendantIds(id)]);
      setAccount(response[0].data);
      setAllAccountIds(Array.isArray(response[1].data) ? response[1].data : []);
    } catch (err) {
      setError(err.message || 'Failed to load account details.');
      console.error('Error fetching account:', err);
      setAccount(null);
    }
  };

  const getDescendantIds = async () => {
    try {
      const response = await fetchDescendantIds(id);
      setAllAccountIds(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err.message || 'Failed to load descendant accounts.');
      console.error('Error fetching descendant IDs:', err);
      setAllAccountIds([]);
    }
  };

  const fetchAccountTransactions = async () => {
    try {
      if (allAccountIds.length === 0) {
        console.warn('Attempted to fetch transactions before descendant IDs were loaded.');
        setAccountTransactions([]);
        return;
      }

      const response = await fetchTransactions({ accountIds: allAccountIds });

      setAccountTransactions(Array.isArray(response.data) ? response.data : []);
      if (error) setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load transactions for this account hierarchy.');
      console.error('Error fetching account transactions:', err);
      setAccountTransactions([]);
    }
  };

  useEffect(() => {
    if (id) {
      const loadData = async () => {
        setLoading(true);
        setError(null);
        setAccount(null);
        setAllAccountIds([]);
        setAccountTransactions([]);

        await Promise.all([fetchAccountDetails(), getDescendantIds()]);

        setLoading(false);
      };
      loadData();
    }
  }, [id]);

  useEffect(() => {
    if (!loading && allAccountIds.length > 0) {
      fetchAccountTransactions();
    }
  }, [allAccountIds, loading]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      try {
        await deleteAccount(id);
        navigate('/accounts');
      } catch (err) {
        setError(err.message || 'Failed to delete account');
      }
    }
  };

  const handleEditAccount = () => {
    setIsEditModalOpen(true);
  };

  const handleSaveAccount = (savedAccount) => {
    setAccount(savedAccount);
    setIsEditModalOpen(false);
  };

  const handleOpenViewModal = (transaction) => {
    setViewingTransaction(transaction);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setViewingTransaction(null);
  };

  const handleOpenBalanceModal = (transaction) => {
    setBalancingTransaction(transaction);
    setIsBalanceModalOpen(true);
  };

  const handleCloseBalanceModal = () => {
    setIsBalanceModalOpen(false);
    setBalancingTransaction(null);
  };

  const handleTransactionUpdated = async () => {
    handleCloseViewModal();
    toast.success('Transaction updated successfully!');
    await fetchAccountTransactions();
  };

  const handleTransactionBalanced = async () => {
    handleCloseBalanceModal();
    toast.success('Transaction balanced successfully! Refreshing list...');
    await fetchAccountTransactions();
  };

  const initialLoading = loading;

  if (initialLoading) return <div className="flex justify-center p-5"><div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>;

  if (error) return <div className="text-red-500 p-4 text-center">{error}</div>;

  if (!account) return <div className="text-center p-5">Account not found</div>;

  const accountTypeColors = {
    asset: 'bg-blue-100 text-blue-800',
    liability: 'bg-red-100 text-red-800',
    income: 'bg-green-100 text-green-800',
    expense: 'bg-yellow-100 text-yellow-800',
    equity: 'bg-purple-100 text-purple-800'
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">{account.name}</h2>
        <div className="space-x-2">
          <Link to="/accounts" className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition">
            Back to List
          </Link>
          <button 
            onClick={handleEditAccount}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium mb-4">Account Details</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Account Type</p>
              <p className="mt-1">
                <span className={`px-2 py-1 text-xs rounded-full ${accountTypeColors[account.type]}`}>
                  {account.type}
                </span>
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="mt-1">
                <span className={`px-2 py-1 text-xs rounded-full ${account.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {account.isActive ? 'Active' : 'Inactive'}
                </span>
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Unit</p>
              <p className="mt-1">
                <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                  {account.unit || 'USD'}
                </span>
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Parent Account</p>
              <p className="mt-1">
                {account.parent ? (
                  <Link to={`/accounts/${account.parent._id}`} className="text-blue-600 hover:underline">
                    {account.parent.name}
                  </Link>
                ) : (
                  <span className="text-gray-500">None</span>
                )}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Created At</p>
              <p className="mt-1">{new Date(account.createdAt).toLocaleString()}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Last Updated</p>
              <p className="mt-1">{new Date(account.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-4">Description</h3>
          <p className="bg-gray-50 p-4 rounded text-gray-700 min-h-[100px]">
            {account.description || <span className="text-gray-400 italic">No description provided</span>}
          </p>
          
          {account.children && account.children.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">Child Accounts</h3>
              <ul className="bg-gray-50 p-4 rounded divide-y divide-gray-200">
                {account.children.map(child => (
                  <li key={child._id} className="py-2">
                    <Link to={`/accounts/${child._id}`} className="text-blue-600 hover:underline">
                      {child.name}
                    </Link>
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${accountTypeColors[child.type]}`}>
                      {child.type}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Transaction List Section */}
      <div className="mt-8">
        <h3 className="text-lg font-medium mb-4">Related Transactions</h3>

        <TransactionListDisplay
          transactions={accountTransactions}
          onViewTransaction={handleOpenViewModal}
          onBalanceTransaction={handleOpenBalanceModal}
        />
      </div>

      {/* Edit Account Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Account: ${account.name}`}
        size="lg"
      >
        <AccountForm
          account={account}
          onSave={handleSaveAccount}
          onCancel={() => setIsEditModalOpen(false)}
        />
      </Modal>

      {/* Transaction View/Detail Modal */}
      {viewingTransaction && (
        <TransactionDetailModal
          isOpen={isViewModalOpen}
          onClose={handleCloseViewModal}
          transaction={viewingTransaction}
          onUpdate={handleTransactionUpdated}
        />
      )}

      {/* Transaction Balance Modal */}
      {balancingTransaction && (
        <TransactionBalanceModal
          isOpen={isBalanceModalOpen}
          onClose={handleCloseBalanceModal}
          transaction={balancingTransaction}
          onTransactionBalanced={handleTransactionBalanced}
        />
      )}
    </div>
  );
};

export default AccountDetail; 