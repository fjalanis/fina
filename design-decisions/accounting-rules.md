# Double-Entry Accounting Rules

This document outlines the double-entry accounting rules implemented in the Fina accounting system.

## Account Types and Their Behavior

In double-entry accounting, debits and credits affect account balances differently depending on the account type:

### Assets
- **Debit**: Increases the account balance
- **Credit**: Decreases the account balance

### Liabilities
- **Debit**: Decreases the account balance
- **Credit**: Increases the account balance

### Equity
- **Debit**: Decreases the account balance
- **Credit**: Increases the account balance

### Income/Revenue
- **Debit**: Decreases the account balance
- **Credit**: Increases the account balance

### Expenses
- **Debit**: Increases the account balance
- **Credit**: Decreases the account balance

## Implementation in the Codebase

### Balance Calculation

When calculating account balances, the system follows these rules:

```javascript
// For assets and expenses: debits increase balance, credits decrease
if (['asset', 'expense'].includes(accountType)) {
  balance += entry.type === 'debit' ? entry.amount : -entry.amount;
} else {
  // For liabilities, income, and equity: credits increase balance, debits decrease
  balance += entry.type === 'credit' ? entry.amount : -entry.amount;
}
```

### Cash Flow Reporting

For cash flow reports, the system considers:

- For asset accounts: debits are inflows, credits are outflows
- For liability, income, and equity accounts: credits are inflows, debits are outflows

### Transaction Balancing

All transactions must have equal debits and credits to maintain the accounting equation:

```
Assets = Liabilities + Equity + (Income - Expenses)
```

## Visual Representation

In the UI, the system uses consistent colors to represent debits and credits:

- **Debits**: Red
- **Credits**: Green

This color coding is consistent across the application, regardless of account type, to maintain a clear visual distinction between debits and credits.

## Testing

The system includes comprehensive tests to ensure that the double-entry accounting rules are correctly implemented. These tests verify:

1. Transaction balancing
2. Account balance calculations
3. Report generation
4. Cash flow calculations

## Common Pitfalls

When working with the accounting system, be aware of these common pitfalls:

1. **Incorrect Balance Calculation**: Always consider account type when calculating balances
2. **Inconsistent Cash Flow Reporting**: Remember that inflows/outflows depend on account type
3. **Transaction Imbalance**: Ensure all transactions have equal debits and credits 