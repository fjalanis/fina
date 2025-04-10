import React, { useState, useEffect } from 'react';
import { fetchAccountHierarchy, deleteAccount } from '../../services/accountService';
import { Link, useSearchParams } from 'react-router-dom';
import Modal from '../common/Modal';
import ConfirmationModal from '../common/ConfirmationModal';
import AccountForm from './AccountForm';
import { toast } from 'react-toastify';
import { formatNumber } from '../../utils/formatters';

const AccountList = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editAccount, setEditAccount] = useState(null);
  const [deleteAccountData, setDeleteAccountData] = useState(null);
  const [searchParams] = useSearchParams();
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  useEffect(() => {
    fetchAccounts();
  }, [startDate, endDate]);

  const fetchAccounts = async () => {
    // Ensure dates are present before fetching
    if (!startDate || !endDate) {
      // Keep loading state until dates are available
      setLoading(true);
      setError(null);
      setAccounts([]); // Clear previous data
      return; 
    }
    
    try {
      setLoading(true);
      const response = await fetchAccountHierarchy(startDate, endDate);
      setAccounts(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load accounts. Please try again later.');
      console.error('Error fetching accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (account) => {
    setDeleteAccountData(account);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteAccount(deleteAccountData._id);
      const removeAccount = (accounts) => {
        return accounts.filter(account => {
          if (account._id === deleteAccountData._id) return false;
          if (account.children) {
            account.children = removeAccount(account.children);
          }
          return true;
        });
      };
      setAccounts(removeAccount(accounts));
      toast.success('Account deleted successfully');
    } catch (err) {
      setError(err.message || 'Failed to delete account');
      toast.error(err.message || 'Failed to delete account');
    } finally {
      setDeleteAccountData(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteAccountData(null);
  };

  const handleCreateAccount = () => {
    setIsCreateModalOpen(true);
  };

  const handleEditAccount = (account) => {
    setEditAccount(account);
  };

  const handleSaveAccount = (savedAccount) => {
    
    if (editAccount) {
      const updateAccount = (accounts) => {
        return accounts.map(account => {
          if (account._id === savedAccount._id) return savedAccount;
          if (account.children) {
            account.children = updateAccount(account.children);
          }
          return account;
        });
      };
      setAccounts(updateAccount(accounts));
      setEditAccount(null);
      toast.success('Account updated successfully');
    } else {
      const formattedAccount = {
        ...savedAccount,
        parent: savedAccount.parent || null,
        children: []
      };

      const updateAccountsHierarchy = (accounts) => {
        return accounts.map(account => {
          if (formattedAccount.parent && account._id === formattedAccount.parent) {
            return {
              ...account,
              children: [...(account.children || []), formattedAccount]
            };
          }
          if (account.children) {
            return {
              ...account,
              children: updateAccountsHierarchy(account.children)
            };
          }
          return account;
        });
      };

      if (formattedAccount.parent) {
        setAccounts(updateAccountsHierarchy(accounts));
      } else {
        setAccounts([...accounts, formattedAccount]);
      }
      setIsCreateModalOpen(false);
      toast.success('Account created successfully');
    }
  };

  const accountTypeBackgroundColors = {
    asset: 'bg-blue-50 hover:bg-blue-100',
    liability: 'bg-red-50 hover:bg-red-100',
    income: 'bg-green-50 hover:bg-green-100',
    expense: 'bg-yellow-50 hover:bg-yellow-100',
    equity: 'bg-purple-50 hover:bg-purple-100'
  };

  const renderAccountRow = (account, level = 0) => {
    const hasChildren = account.children && account.children.length > 0;
    
    // Calculate balance based on account type
    let balance = 0;
    const debits = account.totalDebits || 0;
    const credits = account.totalCredits || 0;
    const unit = account.unit || 'USD'; // Get unit

    // Standard accounting: Assets/Expenses increase with debits, others with credits
    if (['asset', 'expense'].includes(account.type)) {
      balance = debits - credits;
    } else { // liability, income, equity
      balance = credits - debits;
    }
    
    return (
      <React.Fragment key={account._id}>
        <tr>
          <td className={`py-0 px-0 whitespace-nowrap ${accountTypeBackgroundColors[account.type]}`}>
            <Link to={`/accounts/${account._id}`} className="block py-4 px-4 text-gray-900 hover:text-blue-700">
              <div style={{ paddingLeft: `${level * 20}px` }}>
                {account.name}
              </div>
            </Link>
          </td>
          <td className="py-4 px-4 whitespace-nowrap text-center">
            <span className="text-sm text-gray-600" title="Includes transactions from all child accounts within the selected date range">
              {Number(account.totalTransactionCount) || 0}
            </span>
          </td>
          <td className="py-4 px-4 whitespace-nowrap text-right text-xs">
             <div className={`font-bold text-sm mb-1 ${balance >= 0 ? 'text-gray-900' : 'text-red-600'}`} title="Calculated balance based on account type (Assets/Expenses: Debits-Credits; Others: Credits-Debits)">
              {formatNumber(balance)} {unit}
            </div>
            <div className="text-gray-600">
              <span className="text-red-500 mr-2" title="Total debits including children within the selected date range">
                D: {formatNumber(debits)}
              </span>
              <span className="text-green-500" title="Total credits including children within the selected date range">
                C: {formatNumber(credits)}
              </span>
            </div>
          </td>
        </tr>
        {hasChildren && account.children.map(child => renderAccountRow(child, level + 1))}
      </React.Fragment>
    );
  };

  if (loading) return <div className="flex justify-center p-5"><div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>;

  if (error) return <div className="text-red-500 p-4 text-center">{error}</div>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Accounts</h2>
        <div className="flex items-center space-x-4">
          <button 
            onClick={handleCreateAccount}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            Add Account
          </button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No accounts found. Create your first account to get started.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white table-fixed">
            <colgroup>
              <col className="w-full" />
              <col className="w-auto" />
              <col className="w-auto" />
            </colgroup>
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="py-3 px-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span title="Total transactions including all child accounts within the selected date range">Txns</span>
                </th>
                <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Financial Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {[...accounts].sort((a, b) => {
                // Define type order: assets, income, liability, expenses, equity
                const typeOrder = {
                  asset: 1,
                  income: 2,
                  liability: 3,
                  expense: 4,
                  equity: 5
                };
                // Sort by type order
                return (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
              }).map(account => renderAccountRow(account))}
            </tbody>
          </table>
        </div>
      )}

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

      <ConfirmationModal
        isOpen={Boolean(deleteAccountData)}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Account"
        message={`Are you sure you want to delete "${deleteAccountData?.name}"? This account has ${Number(deleteAccountData?.totalTransactionCount) || 0} transactions in the selected period.`}
      />
    </div>
  );
};

export default AccountList; 