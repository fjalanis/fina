import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchRuleById, testRule } from '../../services/ruleService';
import { toast } from 'react-toastify';

const RuleTest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [rule, setRule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testData, setTestData] = useState({
    description: '',
    amount: ''
  });
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadRule();
  }, [id]);

  const loadRule = async () => {
    try {
      setLoading(true);
      const response = await fetchRuleById(id);
      setRule(response.data);
    } catch (err) {
      toast.error('Failed to load rule');
      navigate('/rules');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTestData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate test data
    if (!testData.description.trim()) {
      toast.error('Description is required');
      return;
    }
    
    if (!testData.amount || isNaN(parseFloat(testData.amount)) || parseFloat(testData.amount) <= 0) {
      toast.error('Amount must be a positive number');
      return;
    }
    
    try {
      setTesting(true);
      const response = await testRule(id, testData);
      setTestResult(response.data);
    } catch (err) {
      toast.error('Failed to test rule');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center mt-8">Loading rule...</div>;
  }

  if (!rule) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          Rule not found
        </div>
        <Link to="/rules" className="text-blue-600 hover:text-blue-800">
          &larr; Back to Rules
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center mb-6">
        <Link to="/rules" className="text-blue-600 hover:text-blue-800 mr-4">
          &larr; Back to Rules
        </Link>
        <h1 className="text-2xl font-bold">Test Rule: {rule.name}</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="bg-white shadow-md rounded p-4">
            <h2 className="text-lg font-semibold mb-4">Rule Details</h2>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-500">Name</p>
                <p>{rule.name}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Pattern</p>
                <p className="font-mono">{rule.pattern}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Description</p>
                <p>{rule.description || 'No description'}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Source Account</p>
                <p>{rule.sourceAccount?.name || 'Unknown'}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Destination Accounts</p>
                <ul className="list-disc pl-5">
                  {rule.destinationAccounts.map((dest, index) => (
                    <li key={index}>
                      {dest.accountId?.name || 'Unknown'}
                      {dest.ratio > 0 && ` (Ratio: ${dest.ratio})`}
                      {dest.absoluteAmount > 0 && ` (Fixed Amount: $${dest.absoluteAmount.toFixed(2)})`}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Priority</p>
                <p>{rule.priority}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <span className={`px-2 py-1 rounded text-xs ${rule.isEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {rule.isEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="md:col-span-2">
          <div className="bg-white shadow-md rounded p-4 mb-6">
            <h2 className="text-lg font-semibold mb-4">Test Transaction</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Transaction Description
                  </label>
                  <input
                    type="text"
                    name="description"
                    value={testData.description}
                    onChange={handleChange}
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Enter a description to test against the rule pattern"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Amount
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      name="amount"
                      step="0.01"
                      min="0.01"
                      value={testData.amount}
                      onChange={handleChange}
                      className="block w-full pl-7 p-2 border border-gray-300 rounded-md"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <div>
                  <button
                    type="submit"
                    disabled={testing}
                    className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {testing ? 'Testing...' : 'Test Rule'}
                  </button>
                </div>
              </div>
            </form>
          </div>
          
          {testResult && (
            <div className={`bg-white shadow-md rounded p-4 border-l-4 ${testResult.isMatch ? 'border-green-500' : 'border-yellow-500'}`}>
              <h2 className="text-lg font-semibold mb-4">Test Results</h2>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Pattern Match</p>
                  <p className={testResult.isMatch ? 'text-green-600 font-semibold' : 'text-yellow-600 font-semibold'}>
                    {testResult.isMatch ? 'Matches' : 'Does not match'}
                  </p>
                </div>
                
                {testResult.isMatch && testResult.destinationEntries.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Generated Entry Lines</p>
                    <div className="mt-2 overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Account
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {testResult.destinationEntries.map((entry, index) => {
                            const account = rule.destinationAccounts.find(
                              dest => dest.accountId._id === entry.accountId
                            )?.accountId;
                            
                            return (
                              <tr key={index}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {account?.name || 'Unknown Account'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  ${Math.abs(entry.amount).toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
                {testResult.isMatch && testResult.destinationEntries.length === 0 && (
                  <div className="bg-yellow-100 p-4 rounded">
                    <p className="text-yellow-700">
                      The rule matches but did not generate any entries. Check the rule configuration.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RuleTest; 