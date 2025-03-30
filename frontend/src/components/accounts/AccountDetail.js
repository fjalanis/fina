import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { accountApi } from '../../services/api';

const AccountDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        setLoading(true);
        const response = await accountApi.getAccount(id);
        setAccount(response.data);
        setError(null);
      } catch (err) {
        setError('Failed to load account details. Please try again later.');
        console.error('Error fetching account:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchAccount();
    }
  }, [id]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      try {
        await accountApi.deleteAccount(id);
        navigate('/accounts');
      } catch (err) {
        setError(err.message || 'Failed to delete account');
      }
    }
  };

  if (loading) return <div className="flex justify-center p-5"><div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>;

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
          <Link to={`/accounts/${id}/edit`} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition">
            Edit
          </Link>
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
    </div>
  );
};

export default AccountDetail; 