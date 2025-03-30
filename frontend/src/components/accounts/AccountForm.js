import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { accountApi } from '../../services/api';

const AccountForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'asset',
    description: '',
    parent: '',
    isActive: true
  });
  
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Fetch account if editing and get all accounts for parent selection
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get all accounts for parent dropdown
        const accountsResponse = await accountApi.getAccounts();
        setAccounts(accountsResponse.data);
        
        // If editing, get current account data
        if (isEditing) {
          const accountResponse = await accountApi.getAccount(id);
          const account = accountResponse.data;
          
          setFormData({
            name: account.name,
            type: account.type,
            description: account.description || '',
            parent: account.parent ? account.parent._id : '',
            isActive: account.isActive
          });
        }
        
        setError(null);
      } catch (err) {
        setError('Failed to load data. Please try again later.');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, isEditing]);
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      setError(null);
      
      // Format data for API
      const accountData = {
        ...formData,
        // Convert empty string to null for parent field
        parent: formData.parent || null
      };
      
      if (isEditing) {
        await accountApi.updateAccount(id, accountData);
      } else {
        await accountApi.createAccount(accountData);
      }
      
      // Navigate back to accounts list on success
      navigate('/accounts');
    } catch (err) {
      setError(err.message || 'Failed to save account. Please check your inputs and try again.');
      console.error('Error saving account:', err);
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) return <div className="flex justify-center p-5"><div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>;
  
  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">
          {isEditing ? `Edit Account: ${formData.name}` : 'Create New Account'}
        </h2>
        <Link to="/accounts" className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition">
          Cancel
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded mb-6">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Account Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Account Type *
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="asset">Asset</option>
                <option value="liability">Liability</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="equity">Equity</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="parent" className="block text-sm font-medium text-gray-700 mb-1">
                Parent Account
              </label>
              <select
                id="parent"
                name="parent"
                value={formData.parent}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">None</option>
                {accounts
                  .filter(account => account._id !== id) // Filter out current account to prevent circular reference
                  .map(account => (
                    <option key={account._id} value={account._id}>
                      {account.name} ({account.type})
                    </option>
                  ))}
              </select>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                Active Account
              </label>
            </div>
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="8"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            ></textarea>
          </div>
        </div>
        
        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className={`px-4 py-2 rounded text-white ${
              submitting 
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            } transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
          >
            {submitting ? 'Saving...' : isEditing ? 'Update Account' : 'Create Account'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AccountForm; 