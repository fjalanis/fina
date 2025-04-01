import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { createRule, updateRule } from '../../services/ruleService';
import { fetchAccounts } from '../../services/accountService';
import { toast } from 'react-toastify';

const RuleModal = ({ isOpen, onClose, onSave, rule }) => {
  const initialFormState = {
    name: '',
    description: '',
    pattern: '',
    sourceAccounts: [],
    entryType: 'both',
    autoApply: false,
    type: 'complementary', // Default type
    
    // Edit rule specific fields
    newDescription: '',
    
    // Merge rule specific fields
    maxDateDifference: 3,
    
    // Complementary rule specific fields
    destinationAccounts: [{ accountId: '', ratio: 0.5, absoluteAmount: 0 }]
  };

  const [formData, setFormData] = useState(initialFormState);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
      
      if (rule) {
        // Format the rule data for the form
        setFormData({
          name: rule.name || '',
          description: rule.description || '',
          pattern: rule.pattern || '',
          sourceAccounts: rule.sourceAccounts?.map(acc => acc._id || acc) || [],
          entryType: rule.entryType || 'both',
          autoApply: rule.autoApply || false,
          type: rule.type || 'complementary',
          
          // Edit rule specific fields
          newDescription: rule.newDescription || '',
          
          // Merge rule specific fields
          maxDateDifference: rule.maxDateDifference || 3,
          
          // Complementary rule specific fields
          destinationAccounts: rule.destinationAccounts?.map(dest => ({
            accountId: dest.accountId?._id || dest.accountId || '',
            ratio: dest.ratio || 0,
            absoluteAmount: dest.absoluteAmount || 0
          })) || [{ accountId: '', ratio: 0.5, absoluteAmount: 0 }]
        });
      } else {
        // Reset form for new rule
        setFormData(initialFormState);
      }
    }
  }, [isOpen, rule]);

  const loadAccounts = async () => {
    try {
      const response = await fetchAccounts();
      setAccounts(response.data);
    } catch (err) {
      toast.error('Failed to load accounts');
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Common validations
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.pattern.trim()) {
      newErrors.pattern = 'Pattern is required';
    }
    
    // Type-specific validations
    if (formData.type === 'edit' && !formData.newDescription.trim()) {
      newErrors.newDescription = 'New description is required for edit rules';
    }
    
    if (formData.type === 'merge' && (!formData.maxDateDifference || formData.maxDateDifference < 1 || formData.maxDateDifference > 15)) {
      newErrors.maxDateDifference = 'Maximum date difference must be between 1 and 15 days';
    }
    
    if (formData.type === 'complementary') {
      // Check if at least one destination account is selected
      const hasValidDestination = formData.destinationAccounts.some(
        dest => dest.accountId && (dest.ratio > 0 || dest.absoluteAmount > 0)
      );
      
      if (!hasValidDestination) {
        newErrors.destinationAccounts = 'At least one destination account with a ratio or amount is required';
      }
      
      // Validate total ratio is 1 if using ratios
      const usingRatios = formData.destinationAccounts.some(dest => dest.ratio > 0);
      if (usingRatios) {
        const totalRatio = formData.destinationAccounts.reduce((sum, dest) => sum + parseFloat(dest.ratio || 0), 0);
        if (Math.abs(totalRatio - 1) > 0.001) { // Allow small rounding errors
          newErrors.ratioSum = `Ratio sum must be 1.0. Current sum: ${totalRatio.toFixed(2)}`;
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleDestinationChange = (index, field, value) => {
    const updatedDestinations = [...formData.destinationAccounts];
    updatedDestinations[index] = {
      ...updatedDestinations[index],
      [field]: field === 'ratio' || field === 'absoluteAmount' ? parseFloat(value) || 0 : value
    };
    
    setFormData(prev => ({
      ...prev,
      destinationAccounts: updatedDestinations
    }));
  };

  const addDestination = () => {
    setFormData(prev => ({
      ...prev,
      destinationAccounts: [
        ...prev.destinationAccounts,
        { accountId: '', ratio: 0, absoluteAmount: 0 }
      ]
    }));
  };

  const removeDestination = (index) => {
    if (formData.destinationAccounts.length > 1) {
      const updatedDestinations = [...formData.destinationAccounts];
      updatedDestinations.splice(index, 1);
      
      setFormData(prev => ({
        ...prev,
        destinationAccounts: updatedDestinations
      }));
    }
  };

  const handleTypeChange = (e) => {
    const type = e.target.value;
    setFormData(prev => ({
      ...prev,
      type
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Create a copy of the form data
      const ruleData = { ...formData };
      
      // Filter out fields not relevant to the selected rule type
      if (ruleData.type !== 'edit') {
        delete ruleData.newDescription;
      }
      
      if (ruleData.type !== 'merge') {
        delete ruleData.maxDateDifference;
      }
      
      if (ruleData.type !== 'complementary') {
        delete ruleData.destinationAccounts;
      }
      
      let response;
      if (rule) {
        // Update existing rule
        response = await updateRule(rule._id, ruleData);
        toast.success('Rule updated successfully');
      } else {
        // Create new rule
        response = await createRule(ruleData);
        toast.success('Rule created successfully');
      }
      
      if (response.success && onSave) {
        onSave(response.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save rule');
    } finally {
      setLoading(false);
    }
  };

  const handleSourceAccountsChange = (e) => {
    const options = Array.from(e.target.selectedOptions).map(option => option.value);
    setFormData(prev => ({
      ...prev,
      sourceAccounts: options
    }));
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title={rule ? 'Edit Rule' : 'Create New Rule'}
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Rule Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Rule Type *
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleTypeChange}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="edit">Edit Rule</option>
              <option value="merge">Merge Rule</option>
              <option value="complementary">Complementary Rule</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {formData.type === 'edit' && 'Edit rules modify transaction descriptions based on pattern matching.'}
              {formData.type === 'merge' && 'Merge rules combine similar transactions within a date range.'}
              {formData.type === 'complementary' && 'Complementary rules add balancing entries to transactions.'}
            </p>
          </div>
          
          {/* Rule Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Rule Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`mt-1 block w-full p-2 border rounded-md ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="E.g., Grocery expense rule"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="2"
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              placeholder="Optional description"
            />
          </div>
          
          {/* Pattern */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Pattern (Regex) *
            </label>
            <input
              type="text"
              name="pattern"
              value={formData.pattern}
              onChange={handleChange}
              className={`mt-1 block w-full p-2 border rounded-md ${errors.pattern ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="E.g., Grocery|Supermarket"
            />
            <p className="mt-1 text-xs text-gray-500">
              Regular expression to match transaction descriptions
            </p>
            {errors.pattern && <p className="mt-1 text-sm text-red-600">{errors.pattern}</p>}
          </div>
          
          {/* Entry Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Entry Type
            </label>
            <select
              name="entryType"
              value={formData.entryType}
              onChange={handleChange}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="both">Both (Debit & Credit)</option>
              <option value="debit">Debit Only</option>
              <option value="credit">Credit Only</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Which entry types this rule applies to
            </p>
          </div>
          
          {/* Source Accounts */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Source Accounts
            </label>
            <select
              multiple
              name="sourceAccounts"
              value={formData.sourceAccounts}
              onChange={handleSourceAccountsChange}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md h-32"
            >
              {accounts.map(account => (
                <option key={account._id} value={account._id}>
                  {account.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Select accounts this rule applies to (hold Ctrl/Cmd to select multiple). Leave empty to apply to all accounts.
            </p>
          </div>
          
          {/* Auto Apply */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="autoApply"
              id="autoApply"
              checked={formData.autoApply}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="autoApply" className="ml-2 block text-sm text-gray-700">
              Automatically apply this rule to new transactions
            </label>
          </div>
          
          {/* Edit Rule specific fields */}
          {formData.type === 'edit' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                New Description *
              </label>
              <input
                type="text"
                name="newDescription"
                value={formData.newDescription}
                onChange={handleChange}
                className={`mt-1 block w-full p-2 border rounded-md ${errors.newDescription ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="E.g., GROCERIES"
              />
              <p className="mt-1 text-xs text-gray-500">
                The description that will replace matches
              </p>
              {errors.newDescription && <p className="mt-1 text-sm text-red-600">{errors.newDescription}</p>}
            </div>
          )}
          
          {/* Merge Rule specific fields */}
          {formData.type === 'merge' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Maximum Date Difference (days) *
              </label>
              <input
                type="number"
                name="maxDateDifference"
                value={formData.maxDateDifference}
                onChange={handleChange}
                min="1"
                max="15"
                className={`mt-1 block w-full p-2 border rounded-md ${errors.maxDateDifference ? 'border-red-500' : 'border-gray-300'}`}
              />
              <p className="mt-1 text-xs text-gray-500">
                Maximum days between transactions to consider for merging (1-15)
              </p>
              {errors.maxDateDifference && <p className="mt-1 text-sm text-red-600">{errors.maxDateDifference}</p>}
            </div>
          )}
          
          {/* Complementary Rule specific fields */}
          {formData.type === 'complementary' && (
            <div>
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700">
                  Destination Accounts *
                </label>
                <button
                  type="button"
                  onClick={addDestination}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + Add Another
                </button>
              </div>
              
              {errors.destinationAccounts && (
                <p className="mt-1 text-sm text-red-600">{errors.destinationAccounts}</p>
              )}
              
              {errors.ratioSum && (
                <p className="mt-1 text-sm text-red-600">{errors.ratioSum}</p>
              )}
              
              <div className="mt-2 space-y-3">
                {formData.destinationAccounts.map((dest, index) => (
                  <div key={index} className="flex space-x-2 items-center">
                    <div className="flex-1">
                      <select
                        value={dest.accountId}
                        onChange={(e) => handleDestinationChange(index, 'accountId', e.target.value)}
                        className="block w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Select Account</option>
                        {accounts.map(account => (
                          <option key={account._id} value={account._id}>
                            {account.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        value={dest.ratio}
                        onChange={(e) => handleDestinationChange(index, 'ratio', e.target.value)}
                        min="0"
                        max="1"
                        step="0.01"
                        className="block w-full p-2 border border-gray-300 rounded-md"
                        placeholder="Ratio"
                      />
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        value={dest.absoluteAmount}
                        onChange={(e) => handleDestinationChange(index, 'absoluteAmount', e.target.value)}
                        min="0"
                        step="0.01"
                        className="block w-full p-2 border border-gray-300 rounded-md"
                        placeholder="Amount"
                      />
                    </div>
                    {formData.destinationAccounts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDestination(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Configure how to distribute amounts to destination accounts. Ratios must sum to 1.
              </p>
            </div>
          )}
          
          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Rule'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default RuleModal; 