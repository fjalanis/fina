import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DragDropContext } from 'react-beautiful-dnd';
import TransactionBalancer from './TransactionBalancer';
import { transactionApi } from '../src/services/api';
import { addMatchPotentialFlags, debugTransactionBalance } from '../src/components/transactions/TransactionBalancerUtils';

// Mock API and utility functions
jest.mock('../../services/api', () => ({
  transactionApi: {
    getTransactions: jest.fn(),
    getSuggestedMatches: jest.fn(),
    balanceTransactions: jest.fn()
  }
}));

jest.mock('./TransactionBalancerUtils', () => ({
  addMatchPotentialFlags: jest.fn(data => data),
  formatDate: jest.fn(date => 'MockDate'),
  formatCurrency: jest.fn(amount => `$${amount}`),
  createTestData: jest.fn(),
  diagnoseMatching: jest.fn(),
  debugTransactionBalance: jest.fn()
}));

// Mock react-beautiful-dnd
jest.mock('react-beautiful-dnd', () => ({
  DragDropContext: ({ children, onDragEnd }) => (
    <div data-testid="drag-drop-context" onClick={() => onDragEnd({
      destination: { droppableId: 'transaction', index: 0 },
      source: { droppableId: 'matches', index: 0 }
    })}>
      {children}
    </div>
  ),
  Droppable: ({ children }) => children({
    droppableProps: {},
    innerRef: jest.fn(),
    placeholder: null,
  }),
  Draggable: ({ children }) => children({
    draggableProps: {},
    innerRef: jest.fn(),
    dragHandleProps: {},
  }),
}));

// Mock BalancerComponents to simplify testing
jest.mock('./BalancerComponents', () => ({
  SelectedEntryDropZone: ({ selectedEntry }) => (
    <div data-testid="selected-entry">
      Selected Entry: {selectedEntry?.account?.name}
    </div>
  ),
  SuggestedMatchesList: ({ suggestedMatches, matchLoading }) => (
    <div data-testid="suggested-matches">
      {matchLoading ? 'Loading...' : 
        suggestedMatches.length > 0 ? 
          `${suggestedMatches.length} matches` : 
          'No matches'}
    </div>
  ),
  UnbalancedTransactionsList: ({ unbalancedTransactions, handleEntrySelect }) => (
    <div data-testid="unbalanced-transactions">
      {unbalancedTransactions.map(tx => (
        <div key={tx._id} data-testid="transaction-item">
          <h4>{tx.description}</h4>
          {tx.entryLines.map(entry => (
            <div 
              key={entry._id} 
              data-testid="entry-line"
              onClick={() => handleEntrySelect(entry)}
            >
              {entry.account?.name} {entry.type === 'debit' ? '+' : '-'} ${entry.amount}
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
  NoSelectionPlaceholder: () => <div data-testid="no-selection">Select an entry</div>
}));

describe('TransactionBalancer', () => {
  // Sample data for our tests
  const mockTransactions = [
    {
      _id: 'tx1',
      description: 'Transaction 1',
      date: new Date(),
      isBalanced: false,
      entryLines: [
        {
          _id: 'entry1',
          account: { name: 'Account 1', _id: 'acc1' },
          amount: 100,
          type: 'debit',
          transaction: { _id: 'tx1' }
        },
        {
          _id: 'entry2',
          account: { name: 'Account 2', _id: 'acc2' },
          amount: 50,
          type: 'credit',
          transaction: { _id: 'tx1' }
        }
      ]
    },
    {
      _id: 'tx2',
      description: 'Transaction 2',
      date: new Date(),
      isBalanced: false,
      entryLines: [
        {
          _id: 'entry3',
          account: { name: 'Account 3', _id: 'acc3' },
          amount: 50,
          type: 'debit',
          transaction: { _id: 'tx2' }
        }
      ]
    }
  ];

  const mockMatches = [
    {
      _id: 'entry4',
      account: { name: 'Account 4', _id: 'acc4' },
      amount: 50,
      type: 'credit',
      transaction: { _id: 'tx3', description: 'Transaction 3' }
    }
  ];

  beforeEach(() => {
    // Reset mock functions
    jest.clearAllMocks();
    
    // Setup default API responses
    transactionApi.getTransactions.mockResolvedValue({ data: mockTransactions });
    transactionApi.getSuggestedMatches.mockResolvedValue({ 
      data: { matches: mockMatches } 
    });
    transactionApi.balanceTransactions.mockResolvedValue({ 
      data: { transaction: { ...mockTransactions[0], isBalanced: true } } 
    });
  });

  test('displays only unbalanced transactions', async () => {
    // Mock transactions with one balanced and one unbalanced
    const mixedTransactions = [
      { ...mockTransactions[0], isBalanced: true },
      { ...mockTransactions[1], isBalanced: false }
    ];
    
    transactionApi.getTransactions.mockResolvedValue({ data: mixedTransactions });
    
    render(<TransactionBalancer />);
    
    // Wait for API calls to resolve
    await waitFor(() => {
      expect(transactionApi.getTransactions).toHaveBeenCalled();
    });
    
    // Should only display unbalanced transactions (just Transaction 2)
    const transactionItems = screen.getAllByTestId('transaction-item');
    expect(transactionItems).toHaveLength(1);
    expect(screen.getByText('Transaction 2')).toBeInTheDocument();
    expect(screen.queryByText('Transaction 1')).not.toBeInTheDocument();
  });

  test('fetches and displays suggested matches when entry is selected', async () => {
    render(<TransactionBalancer />);
    
    // Wait for initial data load
    await waitFor(() => {
      expect(screen.getAllByTestId('entry-line')).toBeTruthy();
    });
    
    // Click on an entry line to select it
    fireEvent.click(screen.getAllByTestId('entry-line')[0]);
    
    // Verify API call was made
    expect(transactionApi.getSuggestedMatches).toHaveBeenCalledWith('entry1');
    
    // Wait for matches to load
    await waitFor(() => {
      expect(screen.getByTestId('selected-entry')).toHaveTextContent('Account 1');
    });
    expect(screen.getByTestId('suggested-matches')).toHaveTextContent('1 matches');
  });

  test('balances transactions when match is dropped on selected entry', async () => {
    render(<TransactionBalancer />);
    
    // Wait for initial data load
    await waitFor(() => {
      expect(screen.getAllByTestId('entry-line')).toBeTruthy();
    });
    
    // Select an entry
    fireEvent.click(screen.getAllByTestId('entry-line')[0]);
    
    // Wait for matches to load
    await waitFor(() => {
      expect(screen.getByTestId('suggested-matches')).toHaveTextContent('1 matches');
    });
    
    // Simulate drag and drop by clicking the drag context (which triggers our mock onDragEnd)
    fireEvent.click(screen.getByTestId('drag-drop-context'));
    
    // Verify API call was made
    expect(transactionApi.balanceTransactions).toHaveBeenCalledWith('entry1', 'entry4');
    
    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText(/successfully balanced/i)).toBeInTheDocument();
    });
    
    // Verify transaction list is refreshed
    expect(transactionApi.getTransactions).toHaveBeenCalledTimes(2);
  });

  test('properly filters to only show transactions where isBalanced === false', async () => {
    // This specifically tests the fix for the issue where balanced transactions were appearing
    const mixedTransactions = [
      { ...mockTransactions[0], isBalanced: null },
      { ...mockTransactions[1], isBalanced: undefined },
      { ...mockTransactions[0], _id: 'tx3', isBalanced: true },
      { ...mockTransactions[1], _id: 'tx4', isBalanced: false }
    ];
    
    transactionApi.getTransactions.mockResolvedValue({ data: mixedTransactions });
    
    render(<TransactionBalancer />);
    
    // Wait for API calls to resolve
    await waitFor(() => {
      expect(transactionApi.getTransactions).toHaveBeenCalled();
    });
    
    // Should only display explicitly unbalanced transactions (just tx4)
    const transactionItems = screen.getAllByTestId('transaction-item');
    expect(transactionItems).toHaveLength(1);
  });
}); 