# Household Finance App PRD

## Overview

The Household Finance App is a personal finance management system that brings the power of double-entry accounting to household finances with an intuitive interface. The app's distinguishing features include a flexible transaction entry system that accommodates unbalanced entries, automatic transaction completion, and powerful visualization tools including Sankey diagrams for cash flow analysis.

## Goals and Objectives

- Provide a simple yet powerful system for tracking household finances
- Support double-entry accounting with flexible transaction creation
- Offer intuitive tools for balancing transactions
- Visualize financial flows with interactive Sankey diagrams
- Support location-based expense tracking
- Handle multiple currencies and asset types

## User Personas

**Primary User**: Individual who manages household finances and does their own taxes, but is not an accounting professional. Wants detailed financial tracking without the complexity of traditional accounting software.

## Technical Architecture

### Frontend
- **Framework**: React
- **Styling**: Tailwind CSS
- **Visualization**: D3.js
- **Maps**: Leaflet
- **Data Fetching**: React Query

### Backend
- **Runtime**: Node.js
- **Framework**: Express
- **Database**: MongoDB (standalone mode)
- **ODM**: Mongoose

### Microservices
1. **Account Service**
2. **Transaction Service**
3. **Analytics Service**
4. **Rules Service**

## Database Requirements

- Must work with MongoDB in standalone mode (not requiring replica sets)
- No MongoDB transactions should be used for data consistency
- Sequential operations with proper validation and error handling
- Cascade deletions for linked entities (transaction-entries relationship)
- Proper data integrity checks at the application level

## Data Model

### Accounts
```javascript
{
  _id: ObjectId,
  name: String, // required
  type: String, // required, enum: ['asset', 'liability', 'income', 'expense']
  subtype: String, // optional, e.g., 'checking', 'savings', 'credit_card', etc.
  institution: String, // optional, e.g., 'Bank of America'
  isHidden: Boolean, // default: false
  parent: { type: ObjectId, ref: 'Account' }, // optional, creates hierarchical structure
  description: String, // optional
  createdAt: Date,
  updatedAt: Date
}
```

#### Account Virtual Properties
- `children`: Array of accounts that reference this account as their parent

### Transactions
```javascript
{
  _id: ObjectId,
  date: Date, // required
  description: String, // required
  entries: [{ // at least one entry required
    account: { type: ObjectId, ref: 'Account' }, // required
    amount: Number, // required, positive number
    entryType: String, // required, enum: ['debit', 'credit']
    memo: String // optional
  }],
  appliedRules: [{ // optional, stores which rules have been applied
    ruleId: { type: ObjectId, ref: 'Rule' },
    appliedAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

#### Transaction Virtual Properties
- `isBalanced`: Boolean computed property that checks if sum of debits equals sum of credits
  - A transaction is considered balanced when the sum of all debit entries equals the sum of all credit entries
  - Uses a small tolerance (0.001) to account for floating-point precision issues

### Rules
```javascript
{
  _id: ObjectId,
  name: String, // required
  description: String, // optional
  pattern: String, // required, regex for matching transaction descriptions
  sourceAccounts: [{ type: ObjectId, ref: 'Account' }], // optional, empty array means any account
  entryType: String, // required, enum: ['debit', 'credit', 'both'], default: 'both'
  autoApply: Boolean, // default: false
  type: String, // required, enum: ['edit', 'merge', 'complementary']
  
  // Fields specific to edit rules
  newDescription: String, // required for edit rules
  
  // Fields specific to merge rules
  maxDateDifference: Number, // required for merge rules, min: 1, max: 15, default: 3
  
  // Fields specific to complementary rules
  destinationAccounts: [{ // required for complementary rules
    accountId: { type: ObjectId, ref: 'Account' },
    ratio: Number, // required, between 0 and 1, sum of all ratios must equal 1
    absoluteAmount: Number // optional
  }],
  
  createdAt: Date,
  updatedAt: Date
}
```

## Feature Requirements

### 1. Account Management

#### 1.1 Account Hierarchy
- Support for hierarchical account structure
- Customizable account types (Asset, Liability, Income, Expense)
- Optional subtypes for more specific categorization
- Account balance calculation with rollup to parent accounts

#### 1.2 Account Interface
- Tree view of accounts with expandable/collapsible nodes
- Quick account creation with parent-child relationship
- Balance display with currency/unit options
- Ability to hide inactive accounts

### 2. Transaction Management

#### 2.1 Transaction Creation
- Support for multiple entries per transaction
- User interface for creating balanced or unbalanced transactions
- Automatic balance checking with the isBalanced virtual property
- Floating-point precision handling for balance calculations
- Support for metadata like date, description, and memo

#### 2.2 Transaction Balancing
- Interface to find and complete unbalanced transactions
- Smart suggestions for matching entries based on amount and transaction date
- Transaction entry manipulation (add, edit, delete)
- Support for auto-balancing with rules

#### 2.3 Transaction and Entry Line Behavior
- Safeguards to prevent zero-entry transactions
- "isBalanced" virtual property for transaction status determination
- Cascading deletions when transactions are removed
- Ability to rebalance transactions with additional entries

### 3. Transaction Balancing Rules

#### 3.1 Rule Types
1. **Edit Rules**: Modify transaction descriptions based on pattern matching
   - Pattern matching for transaction descriptions
   - New description specification
   - Source account filtering
   - Entry type filtering (debit, credit, or both)

2. **Merge Rules**: Combine similar transactions within a date range
   - Pattern matching for transaction descriptions
   - Date range specification (maxDateDifference)
   - Source account filtering

3. **Complementary Rules**: Add complementary entries to transactions
   - Pattern matching for transaction descriptions
   - Source account specification
   - Destination accounts with ratio or fixed amount distribution
   - Ratio validation (sum must equal 1)

#### 3.2 Rule Application Logic
- Rules can be applied manually or automatically (autoApply flag)
- Rules can filter by:
  - Transaction description pattern
  - Source accounts involved
  - Entry types (debit/credit/both)
- Rule preview functionality to see which transactions would match
- Bulk application to all unbalanced transactions
- Tracking of applied rules on transactions

#### 3.3 Rule Management
- CRUD operations for all rule types
- Rule effectiveness monitoring
- Rule testing before application
- Priority ordering

### 4. API Endpoints

#### Account Service
- `GET /api/accounts` - List all accounts
- `GET /api/accounts/:id` - Get account details
- `POST /api/accounts` - Create new account
- `PUT /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete account
- `GET /api/accounts/:id/balance` - Get account balance

#### Transaction Service
- `GET /api/transactions` - List transactions
- `GET /api/transactions/:id` - Get transaction details
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction (cascades to entries)

#### Rules Service
- `GET /api/rules` - List all rules (optional type filter)
- `GET /api/rules/:id` - Get rule details
- `POST /api/rules` - Create a new rule
- `PUT /api/rules/:id` - Update a rule
- `DELETE /api/rules/:id` - Delete a rule
- `POST /api/rules/:id/apply` - Apply a rule to a specific transaction
- `POST /api/rules/apply-all` - Apply all auto-apply rules to unbalanced transactions
- `GET /api/rules/preview` - Preview which transactions would match a rule pattern

### 5. Rule Endpoint Details

#### GET /api/rules/preview
Preview transactions that would match a rule pattern

**Query Parameters:**
- `pattern` (required): Regex pattern for matching transaction descriptions
- `sourceAccounts` (optional): Array of account IDs to filter by source account
- `entryType` (optional): Filter by entry type ('debit', 'credit', or 'both')

**Response:**
```javascript
{
  "success": true,
  "data": {
    "matchingTransactions": [...], // Array of transactions matching criteria
    "totalUnbalanced": 10, // Total number of unbalanced transactions
    "totalMatching": 5 // Number of matching transactions
  }
}
```

#### POST /api/rules/apply-all
Apply all enabled rules to unbalanced transactions

**Request Body:**
- Empty object (`{}`)

**Response:**
```javascript
{
  "success": true,
  "message": "Rules processing completed",
  "data": {
    "total": 10, // Total number of unbalanced transactions processed
    "successful": 8, // Number of transactions successfully updated
    "failed": 2, // Number of transactions that failed to update
    "details": [
      {
        "transactionId": "123abc", // ID of processed transaction
        "status": "success", // success or error
        "appliedRules": ["456def", "789ghi"], // IDs of rules applied
        "skippedRules": ["101jkl"] // IDs of rules that were skipped
      }
      // Additional transaction results...
    ]
  }
}
```

## Error Handling

- Global error handling should provide detailed information in server logs
- User-facing errors should be clear and actionable
- Different error types should be properly identified and handled:
  - Validation errors (400)
  - Resource not found errors (404)
  - Server errors (500)
- Error responses should have consistent structure:
  - Success flag
  - Error message
  - Additional details (in non-production environments)
- Specific error scenarios:
  - When attempting database operations that would violate data integrity rules
  - When attempting to delete resources with dependent entities
  - When MongoDB operations fail

## Implementation Considerations

### Transaction Balance Handling
- The `isBalanced` property is a virtual property that calculates in real-time whether debits equal credits
- Since it's a virtual property, it cannot be directly queried in MongoDB
- To find unbalanced transactions, application code must:
  1. Fetch all transactions
  2. Populate necessary account references
  3. Filter transactions where the isBalanced property is false
  4. Process only the unbalanced transactions

### Rule Application Logic
1. **Pattern Matching**: Check if transaction description matches the rule's pattern (case-insensitive)
2. **Account Filtering**: Verify that transaction has entries with accounts matching the rule's sourceAccounts (if specified)
3. **Entry Type Filtering**: Verify that transaction has entries matching the rule's entryType (if not 'both')
4. **Rule Type-Specific Application**:
   - Edit Rules: Update transaction description
   - Merge Rules: Combine matching transactions
   - Complementary Rules: Add balancing entries based on destination accounts

### Performance Considerations
- Rule preview and bulk application operations may be resource-intensive with large datasets
- Consider pagination and limiting result sets for production use
- Implement proper indexes on frequently queried fields
- Consider caching for repetitive operations

## Technical Requirements

### Backend Dependencies
```javascript
{
  "express": "^4.18.0",
  "mongoose": "^7.0.0",
  "cors": "^2.8.5",
  "joi": "^17.9.0", // For validation
  "swagger-ui-express": "^4.6.0", // For API documentation
  "winston": "^3.8.0" // For logging
}
```
