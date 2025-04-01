# Transaction and Rule System Design

## Transaction Structure

- Transactions now use `entries` directly embedded in the transaction object instead of separate `entryLines`
- Each entry contains:
  - `account` - Reference to account ID
  - `amount` - Numeric value
  - `type` - Either 'debit' or 'credit'
  - `description` - Optional text description

## Entry Operations

### Move Entry
- **Purpose**: Move a single entry from one transaction to another
- **Endpoint**: `POST /api/transactions/move-entry`
- **Parameters**:
  - `sourceTransactionId` - ID of source transaction
  - `entryIndex` - Index of entry in source transaction's entries array
  - `destinationTransactionId` - ID of destination transaction
- **Behavior**:
  - Removes entry from source transaction
  - Adds entry to destination transaction
  - Deletes source transaction if it becomes empty
  - Validates both transactions after the operation

### Split Transaction
- **Purpose**: Create a new transaction with selected entries from an existing transaction
- **Endpoint**: `POST /api/transactions/split-transaction`
- **Parameters**:
  - `transactionId` - ID of source transaction
  - `entryIndices` - Array of indices to move to new transaction
- **Behavior**:
  - Creates new transaction with same date as source
  - Moves selected entries to new transaction
  - Validates both transactions after the operation

## Rule System

### Rule Types
- **Edit Rules**: Modify transaction properties
- **Merge Rules**: Combine entries from multiple transactions
- **Complementary Rules**: Find and link complementary entries

### Rule Application

#### Apply Edit Rule
- Updates transaction properties based on rule criteria
- Supports changing description, category, and other metadata

#### Apply Merge Rule
- Identifies transactions matching rule criteria
- Combines entries from source transaction into destination transaction
- Deletes source transaction after successful merge

#### Apply Complementary Rule
- Identifies potentially related transactions
- Links entries that complement each other (debits matching credits)
- Supports automatic balancing

## Validation

- All operations include validation to ensure:
  - Transactions remain valid after operations
  - Entries maintain proper structure
  - Rules are applied consistently

## Error Handling

- Comprehensive error handling for:
  - Invalid transactions
  - Missing entries
  - Failed rule applications
  - Validation errors

## API Consistency

- All APIs follow RESTful patterns
- Consistent parameter naming:
  - `entries` used throughout (not `entryLines`)
  - Operations on entries use array indices for consistency
- Clear separation between:
  - Core transaction operations
  - Entry manipulations
  - Rule applications

## Transaction Balancing

- Transactions track balance status with `isBalanced` property
- System provides suggestions for balancing unbalanced transactions
- Support for finding complementary entries to balance transactions 