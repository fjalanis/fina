import React, { useState, useEffect } from 'react';
import { transactionApi, accountApi } from '../../services/api';

const TransactionForm = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    description: '',
    date: new Date().toISOString().split('T')[0],
    reference: '',
    notes: ''
  });
  
  const [entryLines, setEntryLines] = useState([
    { account: '', description: '', amount: '', type: 'debit' },
    { account: '', description: '', amount: '', type: 'credit' }
  ]);
  
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [balance, setBalance] = useState(0);
  
  // Fetch accounts for the dropdown
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true);
        const response = await accountApi.getAccounts();
        setAccounts(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load accounts. Please try again.');
        console.error('Error fetching accounts:', err);
        setLoading(false);
      }
    };
    
    fetchAccounts();
  }, []);
  
  // Calculate transaction balance whenever entry lines change
  useEffect(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    
    entryLines.forEach(line => {
      const amount = parseFloat(line.amount) || 0;
      if (line.type === 'debit') {
        totalDebit += amount;
      } else {
        totalCredit += amount;
      }
    });
    
    setBalance(totalDebit - totalCredit);
  }, [entryLines]);
  
  // Handle transaction form input changes
  const handleTransactionChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };
  
  // Handle entry line input changes
  const handleEntryLineChange = (index, e) => {
    const { name, value } = e.target;
    const updatedEntryLines = [...entryLines];
    updatedEntryLines[index] = {
      ...updatedEntryLines[index],
      [name]: value
    };
    setEntryLines(updatedEntryLines);
  };
  
  // Add new entry line
  const handleAddEntryLine = () => {
    setEntryLines([
      ...entryLines,
      { account: '', description: '', amount: '', type: 'debit' }
    ]);
  };
  
  // Remove entry line
  const handleRemoveEntryLine = (index) => {
    if (entryLines.length <= 2) {
      setError('A transaction must have at least two entry lines.');
      return;
    }
    
    const updatedEntryLines = entryLines.filter((_, i) => i !== index);
    setEntryLines(updatedEntryLines);
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.description || !formData.date) {
      setError('Please fill in all required transaction fields.');
      return;
    }
    
    // Validate entry lines
    const validEntryLines = entryLines.filter(line => 
      line.account && line.amount && parseFloat(line.amount) > 0
    );
    
    if (validEntryLines.length < 2) {
      setError('Please provide at least two valid entry lines.');
      return;
    }
    
    // Check if transaction is balanced
    if (Math.abs(balance) > 0.001) {
      setError('Transaction is not balanced. Total debits must equal total credits.');
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Format data for API
      const transactionData = {
        ...formData,
        entryLines: entryLines.map(line => ({
          account: line.account,
          description: line.description || formData.description,
          amount: parseFloat(line.amount),
          type: line.type
        }))
      };
      
      await transactionApi.createTransaction(transactionData);
      
      setSubmitting(false);
      onSave();
    } catch (err) {
      setError('Failed to create transaction. Please try again.');
      console.error('Error creating transaction:', err);
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
        <div className="space-y-6">
          {/* Transaction Details Section */}
          <div className="bg-gray-50 p-4 rounded">
            <h3 className="text-lg font-medium mb-4">Transaction Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleTransactionChange}
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
                  onChange={handleTransactionChange}
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
                  onChange={handleTransactionChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleTransactionChange}
                  rows="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                ></textarea>
              </div>
            </div>
          </div>
          
          {/* Entry Lines Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Entry Lines</h3>
              <button
                type="button"
                onClick={handleAddEntryLine}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Line
              </button>
            </div>
            
            <div className="bg-gray-50 p-4 rounded">
              {entryLines.map((line, index) => (
                <div key={index} className="mb-4 pb-4 border-b border-gray-200 last:border-b-0 last:mb-0 last:pb-0">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-700">Line {index + 1}</h4>
                    {entryLines.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEntryLine(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account *
                      </label>
                      <select
                        name="account"
                        value={line.account}
                        onChange={(e) => handleEntryLineChange(index, e)}
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        name="description"
                        value={line.description}
                        onChange={(e) => handleEntryLineChange(index, e)}
                        placeholder={formData.description}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount *
                      </label>
                      <input
                        type="number"
                        name="amount"
                        value={line.amount}
                        onChange={(e) => handleEntryLineChange(index, e)}
                        step="0.01"
                        min="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type *
                      </label>
                      <select
                        name="type"
                        value={line.type}
                        onChange={(e) => handleEntryLineChange(index, e)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="debit">Debit</option>
                        <option value="credit">Credit</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Balance Indicator */}
            <div className={`mt-4 p-3 rounded flex justify-between items-center ${
              Math.abs(balance) < 0.001
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}>
              <span>
                Transaction Balance: {balance.toFixed(2)}
              </span>
              <span className="font-medium">
                {Math.abs(balance) < 0.001 ? 'Balanced ✓' : 'Not Balanced ✗'}
              </span>
            </div>
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
            disabled={submitting || Math.abs(balance) >= 0.001}
            className={`px-4 py-2 rounded text-white ${
              submitting || Math.abs(balance) >= 0.001
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            } transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
          >
            {submitting ? 'Creating...' : 'Create Transaction'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TransactionForm; 