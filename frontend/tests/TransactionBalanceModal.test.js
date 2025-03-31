import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TransactionBalanceModal from '../src/components/transactions/TransactionBalanceModal';
import { transactionApi, entryLineApi, accountApi } from '../src/services/api';

// Mock the API
jest.mock('../src/services/api', () => ({
  transactionApi: {
    getTransaction: jest.fn(),
    getSuggestedMatches: jest.fn(),
    addEntryLine: jest.fn(),
    deleteTransaction: jest.fn()
  },
  entryLineApi: {
    updateEntryLine: jest.fn(),
    deleteEntryLine: jest.fn()
  },
  accountApi: {
    getAccounts: jest.fn()
  }
}));

describe('TransactionBalanceModal', () => {
  // Mock data
  const mockTransaction = {
    _id: 'transaction1',
    description: 'Test Transaction',
    date: new Date().toISOString(),
    isBalanced: false,
    entryLines: [
      {
        _id: 'entry1',
        account: { _id: 'account1', name: 'Bank Account', type: 'asset' },
        amount: 100,
        type: 'debit',
        description: 'Entry description'
      }
      // Purposely unbalanced - only has a debit
    ]
  };

  const mockAutoMatches = [
    {
      _id: 'match1',
      account: { _id: 'account2', name: 'Credit Card', type: 'liability' },
      amount: 100, // Same amount as the unbalanced entry
      type: 'credit', // Opposite type to balance
      description: 'Match description',
      transaction: { 
        _id: 'transaction2', 
        description: 'Match Transaction',
        date: new Date().toISOString()
      }
    }
  ];

  const mockAccounts = [
    { _id: 'account1', name: 'Bank Account', type: 'asset' },
    { _id: 'account2', name: 'Credit Card', type: 'liability' },
    { _id: 'account3', name: 'Expense', type: 'expense' }
  ];

  // Setup and teardown
  beforeEach(() => {
    // Reset mock implementations
    jest.clearAllMocks();

    // Setup default mock responses
    transactionApi.getTransaction.mockResolvedValue({ 
      data: mockTransaction 
    });
    
    accountApi.getAccounts.mockResolvedValue({
      data: mockAccounts
    });
    
    // Mock the suggested matches API to return complementary entries
    transactionApi.getSuggestedMatches.mockResolvedValue({
      data: {
        targetEntry: mockTransaction.entryLines[0],
        matches: mockAutoMatches
      }
    });
    
  });

  test('displays automatically suggested complementary entries for unbalanced transactions', async () => {
    const onClose = jest.fn();
    const onTransactionBalanced = jest.fn();

    render(
      <TransactionBalanceModal
        isOpen={true}
        transaction={mockTransaction}
        onClose={onClose}
        onTransactionBalanced={onTransactionBalanced}
      />
    );

    // Wait for the Complementary Entries section to appear
    await waitFor(() => {
      expect(screen.getByText('Complementary Entries Found')).toBeInTheDocument();
    });

    // Check how many matches were found
    await waitFor(() => {
      expect(screen.getByText(/We found 1 entries/)).toBeInTheDocument();
    });

    // Verify match details
    await waitFor(() => {
      expect(screen.getByText('Match Transaction')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Credit Card')).toBeInTheDocument();
    });

    // Verify Balance button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Balance' })).toBeInTheDocument();
    });
  });

  test('merges transactions when a complementary entry is selected', async () => {
    const onClose = jest.fn();
    const onTransactionBalanced = jest.fn();

    render(
      <TransactionBalanceModal
        isOpen={true}
        transaction={mockTransaction}
        onClose={onClose}
        onTransactionBalanced={onTransactionBalanced}
      />
    );

    // Wait for the component to render the matches
    await waitFor(() => {
      expect(screen.getByText('Complementary Entries Found')).toBeInTheDocument();
    });

    // Click the Balance button on the match
    const balanceButton = await screen.findByRole('button', { name: 'Balance' });
    fireEvent.click(balanceButton);

    // Check success message appears
    await waitFor(() => {
      expect(screen.getByText('Transactions successfully balanced!')).toBeInTheDocument();
    });

    // Verify parent component was notified
    await waitFor(() => {
      expect(onTransactionBalanced).toHaveBeenCalled();
    });
  });

  test('does not display complementary entries section when transaction is balanced', async () => {
    // Set up a balanced transaction
    const balancedTransaction = {
      ...mockTransaction,
      isBalanced: true,
      entryLines: [
        ...mockTransaction.entryLines,
        {
          _id: 'entry2',
          account: { _id: 'account2', name: 'Credit Card', type: 'liability' },
          amount: 100,
          type: 'credit',
          description: 'Balancing entry'
        }
      ]
    };
    
    // Mock the API to return the balanced transaction
    transactionApi.getTransaction.mockResolvedValue({ 
      data: balancedTransaction 
    });
    
    const onClose = jest.fn();
    const onTransactionBalanced = jest.fn();

    render(
      <TransactionBalanceModal
        isOpen={true}
        transaction={balancedTransaction}
        onClose={onClose}
        onTransactionBalanced={onTransactionBalanced}
      />
    );

    // Wait for the component to render, then check for absence of section
    await waitFor(() => {
      expect(screen.queryByText('Complementary Entries Found')).not.toBeInTheDocument();
    });
  });

  test('displays no complementary entries found message when there are no matches', async () => {
    // Mock the suggested matches API to return empty matches
    transactionApi.getSuggestedMatches.mockResolvedValue({
      data: {
        targetEntry: mockTransaction.entryLines[0],
        matches: []
      }
    });
    
    const onClose = jest.fn();
    const onTransactionBalanced = jest.fn();

    render(
      <TransactionBalanceModal
        isOpen={true}
        transaction={mockTransaction}
        onClose={onClose}
        onTransactionBalanced={onTransactionBalanced}
      />
    );

    // Wait for the component to render, then check for absence of section
    await waitFor(() => {
      expect(screen.queryByText('Complementary Entries Found')).not.toBeInTheDocument();
    });
  });
}); 