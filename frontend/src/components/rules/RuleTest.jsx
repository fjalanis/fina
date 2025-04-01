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

  // Render rule type specific details
  const renderRuleTypeDetails = () => {
    if (!rule) return null;
    
    switch (rule.type) {
      case 'edit':
        return (
          <div>
            <p className="text-sm font-medium text-gray-500">New Description</p>
            <p className="font-mono">{rule.newDescription || 'None'}</p>
          </div>
        );
      case 'merge':
        return (
          <div>
            <p className="text-sm font-medium text-gray-500">Maximum Date Difference</p>
            <p>{rule.maxDateDifference || 3} days</p>
          </div>
        );
      case 'complementary':
        return (
          <div>
            <p className="text-sm font-medium text-gray-500">Destination Accounts</p>
            <ul className="list-disc pl-5">
              {rule.destinationAccounts.map((dest, index) => (
                <li key={index}>
                  {dest.accountId?.name || 'Unknown'}
                  {dest.ratio > 0 && ` (Ratio: ${dest.ratio.toFixed(2)})`}
                  {dest.absoluteAmount > 0 && ` (Fixed Amount: $${dest.absoluteAmount.toFixed(2)})`}
                </li>
              ))}
            </ul>
          </div>
        );
      default:
        return null;
    }
  };

  // Format source accounts display
  const formatSourceAccounts = (sourceAccounts) => {
    if (!sourceAccounts || sourceAccounts.length === 0) {
      return 'All accounts';
    }
    
    return (
      <ul className="list-disc pl-5">
        {sourceAccounts.map((acc, index) => (
          <li key={index}>{acc.name || 'Unknown'}</li>
        ))}
      </ul>
    );
  };

  // Render test result based on rule type
  const renderTestResult = () => {
    if (!testResult) return null;
    
    const { isMatch, rule: testedRule } = testResult;
    
    return (
      <div className={`mt-6 p-4 rounded ${isMatch ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <h3 className="font-semibold mb-2">Test Result</h3>
        
        <p className="mb-2">
          <span className="font-medium">Description Match: </span>
          {isMatch ? (
            <span className="text-green-600">Yes, the pattern matches!</span>
          ) : (
            <span className="text-red-600">No, the pattern does not match.</span>
          )}
        </p>
        
        {isMatch && testedRule && (
          <div className="mt-4">
            <h4 className="font-medium mb-2">Rule Application Preview:</h4>
            
            {rule.type === 'edit' && (
              <div className="p-3 bg-white rounded border border-gray-300">
                <p><span className="font-medium">Original Description:</span> {testData.description}</p>
                <p><span className="font-medium">New Description:</span> {rule.newDescription}</p>
              </div>
            )}
            
            {rule.type === 'merge' && (
              <div className="p-3 bg-white rounded border border-gray-300">
                <p>Transactions with similar descriptions within {rule.maxDateDifference} days would be merged.</p>
              </div>
            )}
            
            {rule.type === 'complementary' && testResult.destinationEntries && (
              <div className="p-3 bg-white rounded border border-gray-300">
                <p className="font-medium mb-2">Complementary Entries:</p>
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="py-2 px-3 text-left">Account</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testResult.destinationEntries.map((entry, index) => (
                      <tr key={index} className="border-t">
                        <td className="py-2 px-3">{entry.accountId?.name || 'Unknown'}</td>
                        <td className="py-2 px-3 text-right">${entry.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    );
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
                <p className="text-sm font-medium text-gray-500">Type</p>
                <p className="capitalize">{rule.type}</p>
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
                <p className="text-sm font-medium text-gray-500">Entry Type</p>
                <p className="capitalize">{rule.entryType}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Source Accounts</p>
                {formatSourceAccounts(rule.sourceAccounts)}
              </div>
              
              {renderRuleTypeDetails()}
              
              <div>
                <p className="text-sm font-medium text-gray-500">Auto Apply</p>
                <span className={`px-2 py-1 rounded text-xs ${rule.autoApply ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {rule.autoApply ? 'Yes' : 'No'}
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
                    className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {testing ? 'Testing...' : 'Test Rule'}
                  </button>
                </div>
              </div>
            </form>
            
            {renderTestResult()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RuleTest; 