import React, { useState, useEffect } from 'react';
import { createTransaction } from '../../services/transactionService';
import { fetchAccounts } from '../../services/accountService';

const SingleEntryForm = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    description: '',
    date: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
    account: '',
    amount: '',
    type: 'debit' // Default to 'debit'
  });
  
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Fetch accounts for the dropdown
  useEffect(() => {
    const getAccounts = async () => {
      try {
        setLoading(true);
        const response = await fetchAccounts();
        setAccounts(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load accounts. Please try again.');
        console.error('Error fetching accounts:', err);
        setLoading(false);
      }
    };
    
    getAccounts();
  }, []);
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.description || !formData.account || !formData.amount) {
      setError('Please fill in all required fields.');
      return;
    }
    
    // Validate amount is a positive number
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Create a transaction with the single entry
      const transactionData = {
        date: formData.date,
        description: formData.description,
        reference: formData.reference,
        notes: formData.notes,
        entries: [{
          account: formData.account,
          description: formData.description,
          amount: amount,
          type: formData.type
        }]
      };
      
      await createTransaction(transactionData);
      
      setSubmitting(false);
      onSave();
    } catch (err) {
      setError('Failed to create entry. Please try again.');
      console.error('Error creating single entry transaction:', err);
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return <div className="flex justify-center p-5"><div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>;
  }
  
  return (
    <div>
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded mb-6">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <input
              type="text"
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
              Date *
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div>
            <label htmlFor="reference" className="block text-sm font-medium text-gray-700 mb-1">
              Reference
            </label>
            <input
              type="text"
              id="reference"
              name="reference"
              value={formData.reference}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="account" className="block text-sm font-medium text-gray-700 mb-1">
              Account *
            </label>
            <select
              id="account"
              name="account"
              value={formData.account}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select an account</option>
              {accounts.map(account => (
                <option key={account._id} value={account._id}>
                  {account.name} ({account.type})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Amount *
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              step="0.01"
              min="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Entry Type *
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="debit">Debit</option>
              <option value="credit">Credit</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            ></textarea>
          </div>
        </div>
        
        <div className="mt-8 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={`px-4 py-2 rounded text-white ${
              submitting 
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            } transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
          >
            {submitting ? 'Creating...' : 'Create Entry'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SingleEntryForm; 