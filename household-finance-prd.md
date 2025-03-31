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
  name: String,
  type: String, // Asset, Liability, Income, Expense
  parentAccount: ObjectId,
  description: String,
  currency: String,
  unit: String,
  icon: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Transactions
```javascript
{
  _id: ObjectId,
  date: Date,
  description: String,
  status: String, // Balanced, Unbalanced
  tags: [String],
  isRecurring: Boolean,
  recurringMetadata: {
    frequency: String,
    nextDate: Date,
    endDate: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Entry Lines
```javascript
{
  _id: ObjectId,
  transactionId: ObjectId,
  accountId: ObjectId,
  amount: Number, // Positive for debit, negative for credit
  description: String,
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  receiptReference: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Transaction Balancing Rules
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  pattern: String, // Regex for matching descriptions
  sourceAccount: ObjectId,
  destinationAccounts: [{
    accountId: ObjectId,
    ratio: Number, // For splits
    absoluteAmount: Number // For fixed amounts
  }],
  priority: Number,
  isEnabled: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## Feature Requirements

### 1. Account Management

#### 1.1 Account Hierarchy
- Support for hierarchical account structure
- Customizable account types (Asset, Liability, Income, Expense)
- Account balance calculation with rollup to parent accounts

#### 1.2 Account Interface
- Tree view of accounts with expandable/collapsible nodes
- Quick account creation with parent-child relationship
- Balance display with currency/unit options

### 2. Transaction Management

#### 2.1 Single Entry Creation
- Quick entry form for single-sided transactions
- Support for location data with map integration
- Receipt/document attachment capability
- Option to create fully balanced transactions directly

#### 2.2 Transaction Completion
- Interface to find and complete unbalanced transactions
- Smart suggestions for matching entries based on amount, entry type, and transaction date
- Drag-and-drop functionality for combining entries
- Filter and search capabilities
- Independent scrolling for transaction list and suggested matches to maintain context
- Visual feedback when dragging potential matches
- Clear indication of the selected entry while viewing suggested matches
- Matching algorithm should prioritize entries with:
  - Opposite entry type (debit/credit)
  - Exact matching amount
  - Recent transaction date (within +/- 15 days)
  - Unbalanced transaction status
- Date range matching: Potential matches must be within 15 days (default) of the selected entry's transaction date to reduce noise and focus on related transactions

#### 2.3 Transaction and Entry Line Behavior
- When all entries from a transaction are removed, the transaction itself should be automatically deleted
- When deleting the last entry in a transaction, the user should be warned that the transaction will also be deleted
- When a transaction is deleted, all its associated entries should be deleted
- The UI should allow for the deletion of the last entry in a transaction with proper confirmation
- The transaction list should update immediately to reflect balance changes without a full page refresh

#### 2.4 Recurring Transactions
- System-suggested recurring transaction identification
- User confirmation workflow
- Template creation for common transactions
- Forecast of upcoming recurring transactions

### 3. Transaction Balancing Rules

#### 3.1 Rule Creation
- Gmail-like filter creation interface
- Pattern matching for transaction descriptions
- Support for split transactions across multiple accounts
- Testing interface to verify rule behavior

#### 3.2 Rule Management
- Priority ordering for rules
- Enable/disable toggle
- Rule effectiveness metrics
- Bulk rule operations

### 4. Visualization

#### 4.1 Sankey Diagram
- Interactive cash flow visualization
- Color-coding: green for income, red for expenses
- Time range selector with presets and custom options
- Special indicators for unbalanced entries
- Click-through navigation to transactions and accounts

#### 4.2 Timeline View
- Calendar-based transaction visualization
- Spending patterns by day/week/month
- Filtering by account, category, or tag

#### 4.3 Location Analysis
- Map visualization of spending locations
- Heat maps for expense concentration
- Location grouping and filtering

### 5. Multi-Currency and Asset Tracking

#### 5.1 Currency Support
- Multiple currency handling
- Exchange rate tracking
- Conversion between currencies for reporting

#### 5.2 Asset Valuation
- Track assets in native units (shares, etc.)
- Historical valuation data
- Gain/loss calculation

### 6. Reporting

#### 6.1 Standard Reports
- Monthly spending by category
- Income vs. Expenses
- Net worth over time
- Account balances

#### 6.2 Custom Reports
- User-defined report builder
- Flexible time period selection
- Export capabilities

#### 6.3 Tax Reporting
- Year-end summaries
- Category grouping for tax purposes
- Transaction tagging for tax relevance

### 7. API

#### 7.1 External Integration
- Well-documented API for third-party integration
- Authentication and authorization
- Bulk transaction import capabilities

## User Interface

### Dashboard
- Overview of financial position
- Quick access to common tasks
- Unbalanced transaction alerts
- Recent activity feed
- Key metrics display

### Edit/Create Operations
- All add/edit operations (accounts, transactions, entries, rules) should use modal windows
- No page navigation for CRUD operations to maintain context
- Forms should be consistent across different entity types
- Modal windows should include validation and confirmation controls
- All deletion operations must use confirmation modal dialogs rather than browser alerts
- Deletion confirmation modals should clearly communicate what will be deleted and any cascade effects

### Modal Interface Behavior
- Modifying entries in modals should not trigger full page refreshes
- The transaction list should update in real-time when transaction balance status changes
- Filter views (All/Balanced/Unbalanced) should update immediately when transaction status changes
- Success and error messages should be displayed within the modal
- Loading indicators should be non-intrusive and not cause layout shifts

#### Implementation Pattern
- Entity form components should be standalone and reusable
- Forms should accept entity data, onSave, and onCancel callback props
- Parent components should manage modal state (open/closed) and entity data
- Entity lists should update immediately after successful save operations
- Consistent keyboard shortcuts (Escape to close, Enter to submit where appropriate)

### Account View
- Account hierarchy browser
- Balance display and history
- Transaction list filtered by account
- Quick entry form

### Transaction Interface
- List view with filtering and sorting
- Detail view with all entry lines
- Completion suggestions for unbalanced transactions
- Location display on map
- Transaction balancer with dual-pane layout:
  - Left pane: scrollable list of unbalanced transactions
  - Right pane: selected entry with drop zone and scrollable matching suggestions
  - Fixed position for the selected entry to maintain context while scrolling
- Transaction filtering: Only transactions explicitly marked with `isBalanced === false` should appear in the unbalanced transactions list

### Visualization Hub
- Sankey diagram as primary visualization
- Toggle between different visualization types
- Time range controls
- Export/share options

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

## Performance Considerations

- Background processing for analytics
- Scheduled report generation
- Data aggregation for historical transactions
- Caching strategy for visualizations

## Technical Requirements

### API Endpoints

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
- `DELETE /api/transactions/:id` - Delete transaction (should cascade delete all associated entries)
- `GET /api/entries` - List entry lines
- `POST /api/entries` - Create entry line
- `PUT /api/entries/:id` - Update entry line
- `DELETE /api/entries/:id` - Delete entry line (should delete transaction if it's the last entry)

#### Analytics Service
- `GET /api/analytics/cashflow` - Get Sankey diagram data
- `GET /api/analytics/timeline` - Get timeline data
- `GET /api/analytics/location` - Get location-based data
- `GET /api/analytics/reports/:type` - Get report data

#### Rules Service
- `GET /api/rules` - List balancing rules
- `POST /api/rules` - Create rule
- `PUT /api/rules/:id` - Update rule
- `DELETE /api/rules/:id` - Delete rule
- `POST /api/rules/:id/test` - Test rule against transactions

### Backend Implementation Considerations
- Simplified transaction flow: API endpoints should use simple, direct operations rather than complex MongoDB transactions
- Must work with MongoDB in standalone mode (not requiring replica sets)
- Database operations should be designed for reliability and maintainability
- Error handling should provide clear, actionable error messages for client-side recovery
- Balance calculations and state updates should be explicit operations with proper validation
- Data integrity should be maintained through application-level checks and sequential operations

## Implementation Phases

### Phase 1: Core Functionality
- Basic account structure and management
- Transaction and entry line creation
- Simple transaction balancing interface
- Basic reporting

### Phase 2: Enhanced Features
- Transaction balancing rules
- Sankey diagram implementation
- Timeline and location features
- Recurring transaction handling

### Phase 3: Advanced Features
- Advanced analytics
- Tax reporting
- Multi-currency enhancements
- Performance optimizations

## Success Metrics

- Number of transactions successfully balanced
- Reduction in manual entry time
- Completeness of financial picture
- User satisfaction with visualizations

## Appendix

### Technology Stack
```javascript
// Frontend Dependencies
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "tailwindcss": "^3.3.0",
  "d3": "^7.8.0",
  "leaflet": "^1.9.0",
  "react-query": "^3.39.0",
  "react-router-dom": "^6.10.0",
  "date-fns": "^2.29.0"
}

// Backend Dependencies
{
  "express": "^4.18.0",
  "mongoose": "^7.0.0",
  "cors": "^2.8.5",
  "joi": "^17.9.0",
  "swagger-ui-express": "^4.6.0",
  "winston": "^3.8.0"
}
```
