import React, { useState, useEffect } from 'react';
import { accountApi } from '../../services/api';
import { Link } from 'react-router-dom';
import Modal from '../common/Modal';
import AccountForm from './AccountForm';

const AccountList = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editAccount, setEditAccount] = useState(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await accountApi.getAccounts();
      setAccounts(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load accounts. Please try again later.');
      console.error('Error fetching accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (id) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      try {
        await accountApi.deleteAccount(id);
        setAccounts(accounts.filter(account => account._id !== id));
      } catch (err) {
        setError(err.message || 'Failed to delete account');
      }
    }
  };

  const handleCreateAccount = () => {
    setIsCreateModalOpen(true);
  };

  const handleEditAccount = (account) => {
    setEditAccount(account);
  };

  const handleSaveAccount = (savedAccount) => {
    // If we're editing an existing account
    if (editAccount) {
      setAccounts(accounts.map(account => 
        account._id === savedAccount._id ? savedAccount : account
      ));
      setEditAccount(null);
    } 
    // If we're creating a new account
    else {
      setAccounts([...accounts, savedAccount]);
      setIsCreateModalOpen(false);
    }
  };

  const accountTypeColors = {
    asset: 'bg-blue-100 text-blue-800',
    liability: 'bg-red-100 text-red-800',
    income: 'bg-green-100 text-green-800',
    expense: 'bg-yellow-100 text-yellow-800',
    equity: 'bg-purple-100 text-purple-800'
  };

  if (loading) return <div className="flex justify-center p-5"><div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>;

  if (error) return <div className="text-red-500 p-4 text-center">{error}</div>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Accounts</h2>
        <button 
          onClick={handleCreateAccount}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          Add Account
        </button>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No accounts found. Create your first account to get started.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {accounts.map(account => (
                <tr key={account._id} className="hover:bg-gray-50">
                  <td className="py-4 px-4 whitespace-nowrap">
                    <Link to={`/accounts/${account._id}`} className="text-blue-600 hover:text-blue-900 font-medium">
                      {account.name}
                    </Link>
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${accountTypeColors[account.type]}`}>
                      {account.type}
                    </span>
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    {account.parent ? account.parent.name : '-'}
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${account.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {account.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEditAccount(account)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteAccount(account._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Account Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Account"
        size="lg"
      >
        <AccountForm
          onSave={handleSaveAccount}
          onCancel={() => setIsCreateModalOpen(false)}
        />
      </Modal>

      {/* Edit Account Modal */}
      <Modal
        isOpen={Boolean(editAccount)}
        onClose={() => setEditAccount(null)}
        title={`Edit Account: ${editAccount?.name || ''}`}
        size="lg"
      >
        <AccountForm
          account={editAccount}
          onSave={handleSaveAccount}
          onCancel={() => setEditAccount(null)}
        />
      </Modal>
    </div>
  );
};

export default AccountList; 