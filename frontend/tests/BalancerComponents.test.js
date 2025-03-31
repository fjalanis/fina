import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import { 
  SelectedEntryDropZone,
  SuggestedMatchesList,
  UnbalancedTransactionsList
} from '../src/components/transactions/BalancerComponents';

// Mock the react-beautiful-dnd functionality
// This is required because jsdom doesn't support drag and drop
jest.mock('react-beautiful-dnd', () => ({
  DragDropContext: ({ children }) => children,
  Droppable: ({ children }) => children({
    droppableProps: {
      'data-rbd-droppable-id': 'mock-id',
      'data-rbd-droppable-context-id': '123',
    },
    innerRef: jest.fn(),
    placeholder: null,
  }),
  Draggable: ({ children }) => children({
    draggableProps: {
      'data-rbd-draggable-context-id': '123',
      'data-rbd-draggable-id': 'mock-id',
    },
    innerRef: jest.fn(),
    dragHandleProps: {
      'data-rbd-drag-handle-draggable-id': 'mock-id',
      'data-rbd-drag-handle-context-id': '123',
      role: 'button',
      'aria-describedby': 'DragHandle',
    },
  }),
}));

// Mock formatDate and formatCurrency functions
jest.mock('./TransactionBalancerUtils', () => ({
  formatDate: jest.fn(date => 'MockDate'),
  formatCurrency: jest.fn(amount => `$${amount}`)
}));

describe('BalancerComponents', () => {
  const mockTransaction = {
    _id: 'transaction1',
    description: 'Test Transaction',
    date: new Date(),
    entryLines: [
      {
        _id: 'entry1',
        account: { name: 'Bank Account' },
        amount: 100,
        type: 'debit',
        description: 'Entry description'
      },
      {
        _id: 'entry2',
        account: { name: 'Expense Account' },
        amount: 100,
        type: 'credit',
        description: 'Entry description'
      }
    ]
  };

  const mockEntryLine = {
    _id: 'entry1',
    account: { name: 'Bank Account' },
    amount: 100,
    type: 'debit',
    description: 'Entry description',
    transaction: { _id: 'transaction1', description: 'Test Transaction' }
  };

  const mockMatches = [
    {
      _id: 'match1',
      account: { name: 'Expense Account' },
      amount: 100,
      type: 'credit',
      description: 'Match description',
      transaction: { 
        _id: 'transaction2', 
        description: 'Match Transaction',
        date: new Date()
      }
    }
  ];

  describe('SuggestedMatchesList', () => {
    test('displays loading spinner when matchLoading is true', () => {
      render(<SuggestedMatchesList matchLoading={true} suggestedMatches={[]} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    test('displays no matches message when matches array is empty', () => {
      render(<SuggestedMatchesList matchLoading={false} suggestedMatches={[]} />);
      expect(screen.getByText(/No matching entries found/i)).toBeInTheDocument();
    });

    test('renders draggable items with select-none CSS class to prevent text selection', () => {
      // This test specifically checks for the CSS class that prevents text selection during drag
      // which was the cause of the original bug
      render(
        <DragDropContext onDragEnd={jest.fn()}>
          <SuggestedMatchesList matchLoading={false} suggestedMatches={mockMatches} />
        </DragDropContext>
      );
      
      // Check for the presence of the select-none class using Testing Library's methods
      const draggableElements = screen.getAllByRole('button', { hidden: true });
      expect(draggableElements[0]).toHaveClass('select-none');
    });
  });

  describe('UnbalancedTransactionsList', () => {
    test('groups entry lines by their parent transaction', () => {
      const transactions = [mockTransaction];
      const handleEntrySelect = jest.fn();
      
      render(
        <UnbalancedTransactionsList 
          unbalancedTransactions={transactions} 
          handleEntrySelect={handleEntrySelect}
          selectedEntry={null}
        />
      );
      
      // Verify transaction heading is displayed
      expect(screen.getByText('Test Transaction')).toBeInTheDocument();
      
      // Verify both entry lines are displayed under the same transaction
      expect(screen.getByText('Bank Account')).toBeInTheDocument();
      expect(screen.getByText('Expense Account')).toBeInTheDocument();
      
      // Verify entry line labels indicate they belong to the transaction
      expect(screen.getByText(/Entry Lines/i)).toBeInTheDocument();
    });

    test('calls handleEntrySelect when an entry is clicked', () => {
      const transactions = [mockTransaction];
      const handleEntrySelect = jest.fn();
      
      render(
        <UnbalancedTransactionsList 
          unbalancedTransactions={transactions} 
          handleEntrySelect={handleEntrySelect}
          selectedEntry={null}
        />
      );
      
      // Click on the first entry
      fireEvent.click(screen.getByText('Bank Account'));
      
      // Verify the handler was called with the correct entry
      expect(handleEntrySelect).toHaveBeenCalledWith(mockTransaction.entryLines[0]);
    });
  });

  describe('SelectedEntryDropZone', () => {
    test('displays the selected entry in the drop zone', () => {
      render(<SelectedEntryDropZone selectedEntry={mockEntryLine} />);
      
      expect(screen.getByText(/Selected Entry/i)).toBeInTheDocument();
      expect(screen.getByText('Bank Account')).toBeInTheDocument();
      expect(screen.getByText(/\$100/)).toBeInTheDocument();
    });
    
    test('creates a proper droppable area for drag and drop', () => {
      render(
        <DragDropContext onDragEnd={jest.fn()}>
          <SelectedEntryDropZone selectedEntry={mockEntryLine} />
        </DragDropContext>
      );
      
      // Look for the droppable area with a data attribute selector
      const droppableArea = screen.getByTestId('droppable-area');
      expect(droppableArea).toHaveAttribute('data-rbd-droppable-id');
    });
  });
}); 