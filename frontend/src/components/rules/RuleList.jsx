import React, { useState, useEffect } from 'react';
import { fetchRules, deleteRule, applyRulesToAllTransactions, applyRuleBulk } from '../../services/ruleService';
import { io } from 'socket.io-client';
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
  const [progress, setProgress] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    loadRules();
  }, []);

  useEffect(() => {
    const s = io('/', { path: '/socket.io' });
    s.on('rule-apply-progress', (data) => {
      setProgress(data);
    });
    setSocket(s);
    return () => {
      s.disconnect();
    };
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

  const handleApplyAllRules = async (ruleId) => {
    try {
      setProcessingRules(true);
      setProgress(null);
      const response = await applyRuleBulk(ruleId);
      setProcessResult(response.data);
      toast.success('Rules processing completed');
    } catch (err) {
      toast.error('Failed to process rules');
    } finally {
      setProcessingRules(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center mt-8">Loading rules...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Balancing Rules</h2>
        <div className="space-x-2">
          <select
            disabled={processingRules || rules.length === 0}
            onChange={(e) => e.target.value && handleApplyAllRules(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded"
            defaultValue=""
          >
            <option value="">Apply Rule to Matching Transactions...</option>
            {rules.map(r => (
              <option key={r._id} value={r._id}>{r.name}</option>
            ))}
          </select>
          <button
            onClick={handleCreateRule}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            Add Rule
          </button>
        </div>
      </div>

      {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">{error}</div>}

      {processResult && (
        <div className="bg-gray-100 p-4 mb-6 rounded">
          <h3 className="font-bold mb-2">Rule Processing Results:</h3>
          <p>Processed: {processResult.processed ?? processResult.total}</p>
          <p>Matched: {processResult.matched ?? '-'}</p>
          <p>Modified: {processResult.modified ?? processResult.successful}</p>
          <p>Skipped (already applied): {processResult.skippedAlreadyAppliedCount ?? '-'}</p>
          <p>Errors: {processResult.errorsCount ?? processResult.failed}</p>
        </div>
      )}

      {progress && (
        <div className="bg-blue-50 p-3 mb-4 rounded text-sm text-blue-800">
          Progress - Processed: {progress.processed}, Matched: {progress.matched}, Modified: {progress.modified}
        </div>
      )}

      {rules.length === 0 ? (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
          No rules found. Create a new rule to get started.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="w-1/4 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="w-1/4 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="w-2/5 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Filter</th>
                <th scope="col" className="w-1/8 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="w-1/4 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rules.map((rule) => (
                <tr key={rule._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="truncate">{rule.name}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      rule.isInvalid ? 'bg-red-100 text-red-800' :
                      rule.type === 'edit' ? 'bg-blue-100 text-blue-800' : 
                      rule.type === 'merge' ? 'bg-purple-100 text-purple-800' : 
                      'bg-green-100 text-green-800'
                    }`}>
                      {rule.isInvalid ? 'Invalid' : (rule.type.charAt(0).toUpperCase() + rule.type.slice(1).substring(0, 3))}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                    <div className="truncate">{rule.pattern}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800`}>
                      {rule.autoApply ? 'Auto-Apply' : 'Manual'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleEditRule(rule)}
                        className="text-indigo-600 hover:text-indigo-900"
                        aria-label="Edit rule"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteRule(rule._id)}
                        className="text-red-600 hover:text-red-800"
                        aria-label="Delete rule"
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