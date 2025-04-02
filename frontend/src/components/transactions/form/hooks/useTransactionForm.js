import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { createTransaction } from '../../../../services/transactionService';
import { fetchAccounts } from '../../../../services/accountService';

export const useTransactionForm = (onSaveSuccess) => {
  const [formData, setFormData] = useState({
    description: '',
    date: new Date().toISOString().split('T')[0],
    reference: '',
    notes: ''
  });

  const [entries, setEntries] = useState([
    { account: '', description: '', amount: '', type: 'debit' },
    { account: '', description: '', amount: '', type: 'credit' }
  ]);

  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [balance, setBalance] = useState(0);

  // Fetch accounts for the dropdown
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        setLoadingAccounts(true);
        const response = await fetchAccounts();
        setAccounts(response.data);
      } catch (err) {
        toast.error('Failed to load accounts. Please try again.');
        console.error('Error fetching accounts:', err);
      } finally {
        setLoadingAccounts(false);
      }
    };

    loadAccounts();
  }, []);

  // Calculate transaction balance whenever entry lines change
  useEffect(() => {
    let totalDebit = 0;
    let totalCredit = 0;

    entries.forEach(entry => {
      const amount = parseFloat(entry.amount) || 0;
      if (entry.type === 'debit') {
        totalDebit += amount;
      } else {
        totalCredit += amount;
      }
    });

    setBalance(totalDebit - totalCredit);
  }, [entries]);

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
    const updatedEntries = [...entries];
    updatedEntries[index] = {
      ...updatedEntries[index],
      [name]: value
    };
    setEntries(updatedEntries);
  };

  // Add new entry line
  const handleAddEntryLine = () => {
    setEntries([
      ...entries,
      { account: '', description: '', amount: '', type: 'debit' }
    ]);
  };

  // Remove entry line
  const handleRemoveEntryLine = (index) => {
    if (entries.length <= 2) {
      toast.warn('A transaction must have at least two entry lines.');
      return;
    }

    const updatedEntries = entries.filter((_, i) => i !== index);
    setEntries(updatedEntries);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    // Basic validation
    if (!formData.description || !formData.date) {
      toast.error('Please fill in all required transaction fields.');
      return;
    }

    // Validate entry lines
    const validEntries = entries.filter(entry =>
      entry.account && entry.amount && parseFloat(entry.amount) > 0
    );

    if (validEntries.length < 2) {
      toast.error('Please provide at least two valid entry lines.');
      return;
    }

    // Check if transaction is balanced
    if (Math.abs(balance) > 0.001) {
      toast.error('Transaction is not balanced. Total debits must equal total credits.');
      return;
    }

    try {
      setSubmitting(true);

      // Format data for API
      const transactionData = {
        ...formData,
        entries: entries.map(entry => ({
          account: entry.account,
          description: entry.description || formData.description,
          amount: parseFloat(entry.amount),
          type: entry.type
        }))
      };

      await createTransaction(transactionData);

      toast.success('Transaction created successfully!');
      if (onSaveSuccess) onSaveSuccess();
    } catch (err) {
      toast.error('Failed to create transaction. Please try again.');
      console.error('Error creating transaction:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    formData,
    entries,
    accounts,
    loadingAccounts,
    submitting,
    balance,
    handleTransactionChange,
    handleEntryLineChange,
    handleAddEntryLine,
    handleRemoveEntryLine,
    handleSubmit
  };
}; 