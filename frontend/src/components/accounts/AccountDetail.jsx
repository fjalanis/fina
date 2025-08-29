import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { fetchAccountById, deleteAccount, fetchDescendantIds } from '../../services/accountService';
import { fetchTransactions, fetchTransactionById } from '../../services/transactionService';
import Modal from '../common/Modal';
import AccountForm from './AccountForm';
import TransactionListDisplay from '../transactions/list/TransactionListDisplay';
import AccountList from './AccountList';
import TransactionBalanceModal from '../transactions/balancing/TransactionBalanceModal';
import SearchReplaceBar from '../common/SearchReplaceBar';
import { fetchAccounts } from '../../services/accountService';
import { toast } from 'react-toastify';
import { formatNumber } from '../../utils/formatters';
import RuleModal from '../rules/RuleModal';

const AccountDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [accountTransactions, setAccountTransactions] = useState([]);
  const [allAccountIds, setAllAccountIds] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [descendantAccounts, setDescendantAccounts] = useState([]);
  const [accountsIndex, setAccountsIndex] = useState(new Map());
  const [eligibility, setEligibility] = useState(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [initialRuleSearch, setInitialRuleSearch] = useState(null);

  const fetchAccountDetails = useCallback(async () => {
    try {
      setError(null);
      setAccount(null);
      setAllAccountIds([]);
      setAccountTransactions([]);

      const response = await fetchAccountById(id, { startDate, endDate });
      setAccount(response.data);

    } catch (err) {
      setError(err.message || 'Failed to load account details.');
      console.error('Error fetching account:', err);
      setAccount(null);
    }
  }, [id, startDate, endDate]);

  // Ensure default date params if missing (match DateRangePicker default: last 30 days)
  useEffect(() => {
    if (!startDate || !endDate) {
      const now = new Date();
      const end = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
      const start = new Date(end);
      start.setUTCDate(start.getUTCDate() - 30);
      const params = new URLSearchParams(searchParams);
      params.set('startDate', start.toISOString());
      params.set('endDate', end.toISOString());
      navigate(`${location.pathname}?${params.toString()}`, { replace: true });
    }
  }, [startDate, endDate, navigate, location.pathname, searchParams]);

  const getDescendantIds = useCallback(async () => {
    try {
      const response = await fetchDescendantIds(id);
      const descendantIds = Array.isArray(response.data) ? response.data : [];
      setAllAccountIds([id, ...descendantIds]);
    } catch (err) {
      setError(err.message || 'Failed to load descendant accounts.');
      console.error('Error fetching descendant IDs:', err);
      setAllAccountIds([]);
    }
  }, [id]);

  const fetchAccountTransactions = useCallback(async () => {
    if (!allAccountIds || allAccountIds.length === 0) {
      console.log('Waiting for account IDs before fetching transactions.');
      setAccountTransactions([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching transactions for account IDs:', allAccountIds, 'Dates:', { startDate, endDate });
      const response = await fetchTransactions({ accountIds: allAccountIds, startDate, endDate });
      setAccountTransactions(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err.message || 'Failed to load transactions for this account hierarchy.');
      console.error('Error fetching account transactions:', err);
      setAccountTransactions([]);
    } finally {
        setLoading(false);
    }
  }, [allAccountIds, startDate, endDate]);

  useEffect(() => {
    if (id) {
      const loadData = async () => {
        setLoading(true);
        setError(null);
        setAccount(null);
        setAllAccountIds([]);
        setAccountTransactions([]);

        try {
          await Promise.all([fetchAccountDetails(), getDescendantIds()]);
        } catch (err) {
          console.error("Error during initial data load:", err)
          setLoading(false);
        } 
      };
      loadData();
    }
  }, [id, fetchAccountDetails, getDescendantIds, startDate, endDate]);

  useEffect(() => {
    // Fetch all accounts for breadcrumbs and descendant dropdown
    fetchAccounts().then(resp => {
      const list = resp.data || [];
      // Build index for ancestor lookup
      const index = new Map();
      list.forEach(a => index.set(a._id, a));
      setAccountsIndex(index);

      // Build descendant dropdown list with depth
      const setIds = new Set(allAccountIds); // includes self+descendants
      const filtered = list.filter(a => setIds.has(a._id));
      const idToNode = new Map();
      filtered.forEach(a => idToNode.set(a._id, { ...a, depth: 0 }));
      filtered.forEach(a => {
        let d = 0; let p = a.parent;
        while (p && idToNode.has(p)) { d++; p = idToNode.get(p).parent; }
        idToNode.get(a._id).depth = d;
      });
      setDescendantAccounts(Array.from(idToNode.values()));
    }).catch(()=>{});
  }, [allAccountIds]);

  useEffect(() => {
    if (allAccountIds.length > 0) {
      fetchAccountTransactions();
    } else {
        setAccountTransactions([]);
        if (!loading && !error) {
            if (!account) {
            } else {
                setLoading(false);
            }
        }
    }
  }, [allAccountIds, fetchAccountTransactions]);

  const handleDelete = async () => {
    toast(
      ({ closeToast }) => (
        <div>
          <p className="mb-2">Are you sure you want to delete "{account?.name}"?</p>
          <div className="flex justify-end space-x-2">
            <button
              onClick={async () => {
                closeToast();
                try {
                  await deleteAccount(id);
                  toast.success('Account deleted successfully!');
                  navigate('/accounts');
                } catch (err) {
                  setError(err.message || 'Failed to delete account');
                  toast.error(err.message || 'Failed to delete account');
                }
              }}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            >
              Confirm Delete
            </button>
            <button
              onClick={closeToast}
              className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      {
        position: "top-center",
        autoClose: false,
        closeOnClick: false,
        draggable: false,
        closeButton: false,
      }
    );
  };

  const handleEditAccount = () => {
    setIsEditModalOpen(true);
  };

  const handleSaveAccount = async (savedAccount) => {
    setAccount(savedAccount);
    setIsEditModalOpen(false);
    toast.success("Account updated successfully!");
    await fetchAccountDetails(); 
  };

  const handleOpenTransactionModal = useCallback((transaction, mode) => {
    setSelectedTransaction(transaction);
    setModalMode(mode);
    setIsModalOpen(true);
  }, []);

  const handleCloseTransactionModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedTransaction(null);
    setModalMode(null);
  }, []);

  const handleModalUpdate = useCallback(async (updateInfo) => {
    console.log('AccountDetail handleModalUpdate triggered with:', updateInfo);
    await fetchAccountTransactions(); 
  }, [fetchAccountTransactions]);

  const accountTypeColors = {
    asset: 'bg-blue-100 text-blue-800',
    liability: 'bg-red-100 text-red-800',
    income: 'bg-green-100 text-green-800',
    expense: 'bg-yellow-100 text-yellow-800',
    equity: 'bg-purple-100 text-purple-800'
  };
  
  const renderBreadcrumbs = (acc) => {
    const crumbs = [];
    const trail = [];
    let currentId = acc?.parent || null;
    const visited = new Set();
    while (currentId && !visited.has(currentId)) {
      const node = accountsIndex.get(currentId);
      if (!node) break;
      trail.unshift(node);
      visited.add(currentId);
      currentId = node.parent || null;
    }
    crumbs.push(
      <span key="accounts-root">
        <Link to={`/accounts?${searchParams.toString()}`} className="text-blue-600 hover:underline">Accounts</Link>
        <span className="mx-1 text-gray-400">/</span>
      </span>
    );
    trail.forEach(node => {
      crumbs.push(
        <span key={node._id}>
          <Link to={`/accounts/${node._id}?${searchParams.toString()}`} className="text-blue-600 hover:underline">{node.name}</Link>
          <span className="mx-1 text-gray-400">/</span>
        </span>
      );
    });
    return <div className="text-sm text-gray-500 mb-2">{crumbs}</div>;
  };

  const calculateBalance = (accountData) => {
      let balance = 0;
      const debits = accountData.totalDebits || 0;
      const credits = accountData.totalCredits || 0;
      if (['asset', 'expense'].includes(accountData.type)) {
          balance = debits - credits;
      } else {
          balance = credits - debits;
      }
      return balance;
  };

  const currentAccountBalance = account ? calculateBalance(account) : 0;
  const currentAccountUnit = account?.unit || 'USD';

  if (loading && !account) return <div className="flex justify-center p-5"><div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>;
  
  if (error && !account) return <div className="text-red-500 p-4 text-center">{error}</div>;

  if (!account) return <div className="text-center p-5">Account not found</div>;

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <div>
        {renderBreadcrumbs(account)}
        <div className="flex justify-between items-start mb-3">
           <h2 className={`text-2xl font-semibold text-gray-800 inline-block px-3 py-1 rounded ${accountTypeColors[account.type]}`}>
            {account.name}
           </h2>
            <div className="space-x-2 flex-shrink-0">
                <Link to={`/accounts?${searchParams.toString()}`} className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition text-sm">
                Back to List
                </Link>
                <button
                onClick={handleEditAccount}
                className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-sm"
                >
                Edit
                </button>
                <button
                onClick={handleDelete}
                className="px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition text-sm"
                >
                Delete
                </button>
            </div>
        </div>

        <div className="text-xs text-gray-500 mb-3 space-x-4">
          <span>
            Status: 
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${account.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {account.isActive ? 'Active' : 'Inactive'}
            </span>
          </span>
           <span>
            Unit:
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-800 text-xs">
                {account.unit || 'USD'}
            </span>
           </span>
          <span>Created: {new Date(account.createdAt).toLocaleDateString()}</span>
          <span>Updated: {new Date(account.updatedAt).toLocaleDateString()}</span>
          {(!account.children || account.children.length === 0) && (
            <>
              <span>
                <span className="font-medium">{Number(account.totalTransactionCount) || 0}</span> Txns
              </span>
              <span>
                Balance: <span className={`font-medium ${currentAccountBalance >= 0 ? 'text-gray-800' : 'text-red-600'}`}>{formatNumber(currentAccountBalance)} {currentAccountUnit}</span>
              </span>
              <span>
                D: <span className="text-red-500">{formatNumber(account.totalDebits || 0)}</span>
              </span>
              <span>
                C: <span className="text-green-500">{formatNumber(account.totalCredits || 0)}</span>
              </span>
            </>
          )}
        </div>

        <p className="bg-gray-50 p-3 rounded text-gray-700 text-sm">
          {account.description || <span className="text-gray-400 italic">No description provided</span>}
        </p>
      </div>
      {account.children && account.children.length > 0 && (
        <div className="border-t pt-4">
          <h3 className="text-md font-medium mb-3">Hierarchy Summary</h3>
          <AccountList rootAccountId={account._id} embedded title="" />
        </div>
      )}

      <div className="border-t pt-4">
        <h3 className="text-md font-medium mb-3">Related Transactions</h3>
        <SearchReplaceBar startDate={startDate} endDate={endDate} accounts={descendantAccounts} defaultSourceAccounts={[id]} onSearch={(params)=>{
          if (!params.accountIds) params.accountIds = [id].join(',');
          console.log('[SearchReplace][Account] onSearch params', params);
          fetchTransactions(params).then(resp=>{
            console.log('[SearchReplace][Account] response count', Array.isArray(resp.data) ? resp.data.length : 'n/a');
            setAccountTransactions(Array.isArray(resp.data) ? resp.data : []);
          }).catch(()=>{});
        }} onEligibilityChange={(pred)=> setEligibility(() => pred)} onCreateRule={(state)=>{ setInitialRuleSearch(state); setShowRuleModal(true); }} />
        {loading && accountTransactions.length === 0 && <div className="flex justify-center p-4"><div className="animate-spin h-6 w-6 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>}
        {error && !loading && <div className="text-red-500 p-3 text-center bg-red-50 rounded">{error}</div>}
         {!loading && !error && (
            <TransactionListDisplay
              query={{ accountIds: allAccountIds, startDate, endDate }}
              eligibility={eligibility}
              onViewTransaction={(transaction) => handleOpenTransactionModal(transaction, 'view')}
              onBalanceTransaction={(transaction) => handleOpenTransactionModal(transaction, 'balance')}
              onEditTransaction={(transaction) => handleOpenTransactionModal(transaction, 'edit')}
            />
         )}
        {!loading && !error && accountTransactions.length === 0 && (
             <div className="text-center py-4 text-gray-500">No transactions found for this account hierarchy in the selected date range.</div>
         )}
      </div>

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

      {isModalOpen && (
        <TransactionBalanceModal
          key={selectedTransaction?._id || `mode-${modalMode}` || 'create-modal'} 
          isOpen={isModalOpen}
          onClose={handleCloseTransactionModal}
          transaction={selectedTransaction}
          mode={modalMode}
          onTransactionUpdated={handleModalUpdate}
        />
      )}

      {showRuleModal && (
        <RuleModal
          isOpen={showRuleModal}
          onClose={() => setShowRuleModal(false)}
          onSave={() => setShowRuleModal(false)}
          initialSearch={initialRuleSearch}
        />
      )}
    </div>
  );
};

export default AccountDetail; 