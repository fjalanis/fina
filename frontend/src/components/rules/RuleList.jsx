import React, { useState, useEffect } from 'react';
import { fetchRules, deleteRule, applyRulesToAllTransactions } from '../../services/ruleService';
import { Link } from 'react-router-dom';
import RuleModal from './RuleModal';
import { toast } from 'react-toastify';

const RuleList = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState(null);
  const [processingRules, setProcessingRules] = useState(false);
  const [processResult, setProcessResult] = useState(null);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const response = await fetchRules();
      // Check if response has the expected format with data property
      if (response && response.data) {
        setRules(response.data);
      } else if (Array.isArray(response)) {
        // Handle case where API might return array directly
        setRules(response);
      } else {
        console.error('Unexpected API response format:', response);
        setError('Failed to load rules. Invalid response format.');
        toast.error('Failed to load rules: Invalid response format');
      }
      setError(null);
    } catch (err) {
      console.error('Error loading rules:', err);
      setError('Failed to load rules. Please try again.');
      toast.error('Failed to load rules');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = () => {
    setCurrentRule(null);
    setIsModalOpen(true);
  };

  const handleEditRule = (rule) => {
    setCurrentRule(rule);
    setIsModalOpen(true);
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) {
      return;
    }

    try {
      await deleteRule(ruleId);
      setRules(rules.filter(rule => rule._id !== ruleId));
      toast.success('Rule deleted successfully');
    } catch (err) {
      toast.error('Failed to delete rule');
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentRule(null);
  };

  const handleModalSave = (savedRule) => {
    if (currentRule) {
      // Update existing rule in the list
      setRules(rules.map(rule => 
        rule._id === savedRule._id ? savedRule : rule
      ));
    } else {
      // Add new rule to the list
      setRules([...rules, savedRule]);
    }
    closeModal();
  };

  const handleApplyAllRules = async () => {
    try {
      setProcessingRules(true);
      const response = await applyRulesToAllTransactions();
      setProcessResult(response.data);
      toast.success('Rules processing completed');
    } catch (err) {
      toast.error('Failed to process rules');
    } finally {
      setProcessingRules(false);
    }
  };

  // Render rule-specific details based on the rule type
  const renderRuleTypeSpecificDetails = (rule) => {
    switch (rule.type) {
      case 'edit':
        return <span>New Description: <span className="font-mono">{rule.newDescription}</span></span>;
      case 'merge':
        return <span>Max Date Difference: {rule.maxDateDifference} days</span>;
      case 'complementary':
        return (
          <div>
            {rule.destinationAccounts?.map((dest, index) => (
              <div key={index} className="text-xs">
                {dest.accountId?.name || 'Unknown'}: {dest.ratio ? `${(dest.ratio * 100).toFixed(0)}%` : ''} 
                {dest.absoluteAmount ? ` $${dest.absoluteAmount.toFixed(2)}` : ''}
              </div>
            ))}
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
    
    return sourceAccounts.map(acc => acc.name || 'Unknown').join(', ');
  };

  if (loading) {
    return <div className="flex justify-center mt-8">Loading rules...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Transaction Balancing Rules</h1>
        <div className="space-x-2">
          <button 
            onClick={handleApplyAllRules}
            disabled={processingRules || rules.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {processingRules ? 'Processing...' : 'Apply Rules to All Transactions'}
          </button>
          <button 
            onClick={handleCreateRule}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Create New Rule
          </button>
        </div>
      </div>

      {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">{error}</div>}

      {processResult && (
        <div className="bg-gray-100 p-4 mb-6 rounded">
          <h3 className="font-bold mb-2">Rule Processing Results:</h3>
          <p>Total transactions processed: {processResult.total}</p>
          <p>Successfully processed: {processResult.successful}</p>
          <p>Failed: {processResult.failed}</p>
        </div>
      )}

      {rules.length === 0 ? (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
          No rules found. Create a new rule to get started.
        </div>
      ) : (
        <div className="overflow-x-auto bg-white shadow-md rounded">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-200 text-gray-700">
                <th className="py-3 px-4 text-left">Name</th>
                <th className="py-3 px-4 text-left">Type</th>
                <th className="py-3 px-4 text-left">Pattern</th>
                <th className="py-3 px-4 text-left">Entry Type</th>
                <th className="py-3 px-4 text-left">Source Accounts</th>
                <th className="py-3 px-4 text-left">Details</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule._id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">{rule.name}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      rule.type === 'edit' ? 'bg-blue-100 text-blue-800' : 
                      rule.type === 'merge' ? 'bg-purple-100 text-purple-800' : 
                      'bg-green-100 text-green-800'
                    }`}>
                      {rule.type.charAt(0).toUpperCase() + rule.type.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono">{rule.pattern}</td>
                  <td className="py-3 px-4">{rule.entryType.charAt(0).toUpperCase() + rule.entryType.slice(1)}</td>
                  <td className="py-3 px-4">{formatSourceAccounts(rule.sourceAccounts)}</td>
                  <td className="py-3 px-4">
                    {renderRuleTypeSpecificDetails(rule)}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs ${rule.autoApply ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {rule.autoApply ? 'Auto-Apply' : 'Manual'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex justify-center space-x-2">
                      <button 
                        onClick={() => handleEditRule(rule)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <Link 
                        to={`/rules/test/${rule._id}`}
                        className="text-green-600 hover:text-green-800"
                      >
                        Test
                      </Link>
                      <button 
                        onClick={() => handleDeleteRule(rule._id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <RuleModal 
          isOpen={isModalOpen} 
          onClose={closeModal} 
          onSave={handleModalSave}
          rule={currentRule}
        />
      )}
    </div>
  );
};

export default RuleList; 