# Household Finance App Frontend PRD

## Overview

The Household Finance App frontend provides an intuitive interface for personal finance management using double-entry accounting principles. The application offers flexible transaction entry, interactive visualizations, and powerful tools for financial analysis through a modern, responsive web interface.

## Technical Architecture

### Frontend
- **Framework**: React
- **Styling**: Tailwind CSS
- **Visualization**: D3.js
- **Maps**: Leaflet
- **Data Fetching**: React Query
- **Routing**: React Router
- **Date Handling**: date-fns

## Frontend Feature Requirements

### 1. Account Management Interface

#### 1.1 Account Hierarchy Visualization
- Tree view of accounts with expandable/collapsible nodes
- Visual distinction between account types (Asset, Liability, Income, Expense)
- Color-coding for different account categories
- Balance display with ability to toggle between summary and detailed views

#### 1.2 Account Management UI
- Quick account creation modal with parent-child relationship selector
- Drag-and-drop interface for reorganizing account hierarchy
- Toggle for hiding inactive accounts
- Multi-currency support with currency selector per account
- Institution grouping and filtering options

### 2. Transaction Management Interface

#### 2.1 Single Entry Creation
- Quick entry form for single-sided transactions
- Support for location data with map integration
- Receipt/document attachment capability
- Option to create fully balanced transactions directly
- Entry fields must support the backend model:
  - Amount (positive numbers only)
  - EntryType (dropdown with 'debit' or 'credit' options)
  - Account selection
  - Memo (optional)

#### 2.2 Transaction Completion
- Interface to find and complete unbalanced transactions
- Smart suggestions for matching entries based on amount, entry type, and transaction date
- Drag-and-drop functionality for combining entries
- Filter and search capabilities
- Independent scrolling for transaction list and suggested matches to maintain context
- Visual feedback when dragging potential matches
- Clear indication of the selected entry while viewing suggested matches
- Matching algorithm should prioritize entries with:
  - The OPPOSITE entry type as the needed fix (if transaction needs a credit, find transactions with excess debits)
  - Exact matching amount (must match the imbalance amount) 
  - Recent transaction date (within +/- 15 days)
  - Unbalanced transaction status
- Date range matching: Potential matches must be within 15 days (default) of the selected entry's transaction date to reduce noise and focus on related transactions
- Auto-matching entries will be displayed when an unbalanced transaction is opened, showing entries that would help balance the transaction
- Manual entry search will default to:
  - Minimum amount: $0.01 (one cent)
  - Maximum amount: Equal to the transaction's imbalance amount
  - Type: The type needed to balance the transaction (credit or debit)
- **Important**: The UI must calculate transaction balance status from the virtual `isBalanced` property returned by the API, not rely on a stored field

#### 2.3 Transaction and Entry Line Behavior
- When all entries from a transaction are removed, the transaction itself should be automatically deleted
- When deleting the last entry in a transaction, the user should be warned that the transaction will also be deleted
- When a transaction is deleted, all its associated entries should be deleted
- The UI should allow for the deletion of the last entry in a transaction with proper confirmation
- The transaction list should update immediately to reflect balance changes without a full page refresh
- Moving entries between transactions:
  - An entry can be moved from one transaction to another using the "Move" action
  - The source transaction will be deleted if it becomes empty after the move
  - Both source and destination transactions will have their balance status recalculated
  - Full transaction merging is supported through "Merge" action, which moves all entries from one transaction to another and updates the destination transaction description to include both descriptions
  - When transactions are merged, source transaction notes are appended to destination transaction notes
- Balance status indicators should reflect the `isBalanced` virtual property, not a stored field

#### 2.4 Recurring Transactions
- System-suggested recurring transaction identification
- User confirmation workflow
- Template creation for common transactions
- Forecast of upcoming recurring transactions

### 3. Rules Interface

#### 3.1 Rule Creation
- Gmail-like filter creation interface with three distinct rule type sections:
  1. **Edit Rules**: For modifying transaction descriptions
     - Pattern field (regex) for matching descriptions
     - New description field
     - Source accounts selector (multiple allowed)
     - Entry type filter (debit, credit, or both)
  2. **Merge Rules**: For combining similar transactions
     - Pattern field (regex) for matching descriptions
     - Max date difference selector (1-15 days, default 3)
     - Source accounts selector (multiple allowed)
     - Entry type filter (debit, credit, or both)
  3. **Complementary Rules**: For creating balancing entries
     - Pattern field (regex) for matching descriptions
     - Source accounts selector (multiple allowed)
     - Entry type filter (debit, credit, or both)
     - Destination accounts section with:
       - Account selector
       - Ratio input (must sum to 1 across all accounts)
       - Optional absolute amount field
- Pattern matching for transaction descriptions with visual RegEx helper
- Support for split transactions across multiple accounts
- Testing interface to verify rule behavior
- Support for filtering by transaction type (debit vs. credit)
- Optional source account selection with support for multiple accounts
- Rule test interface should show sample of currently unbalanced transactions that would match
- Rules can be enabled/disabled to control automatic application on new transactions
- Rule preview functionality that calls the `/api/rules/preview` endpoint with entered criteria
- Preview interface showing:
  - Matching transaction count
  - Total unbalanced transaction count
  - List of matching transactions with descriptions

#### 3.2 Rule Management
- Priority ordering for rules (determined by UI drag-and-drop order)
- Enable/disable toggle for automatic rule application (toggles the `autoApply` field)
- Rule effectiveness metrics
- Bulk rule operations
- Rule test interface showing sample of currently unbalanced transactions
- "Apply All Rules" button that calls the `/api/rules/apply-all` endpoint
- Summary display after bulk application showing:
  - Total transactions processed
  - Number of successful updates
  - Number of failed updates
  - Detailed logs (expandable)

### 4. Visualization

#### 4.1 Sankey Diagram
- Interactive cash flow visualization
- Color-coding: green for income, red for expenses
- Time range selector with presets and custom options
- Special indicators for unbalanced entries
- Click-through navigation to transactions and accounts
- Resizable nodes and links
- Tooltips showing value and percentage
- Ability to drill down into account hierarchies

#### 4.2 Timeline View
- Calendar-based transaction visualization
- Spending patterns by day/week/month
- Filtering by account, category, or tag
- Ability to create transactions directly from timeline
- Heatmap overlay option showing transaction density

#### 4.3 Location Analysis
- Map visualization of spending locations
- Heat maps for expense concentration
- Location grouping and filtering
- Transaction proximity analysis
- Location-based spending reports

### 5. Multi-Currency and Asset Tracking

#### 5.1 Currency Support
- Multiple currency handling in UI
- Asset price display
- Conversion between currencies for reporting
- Historical asset price charts
- Base currency selection

#### 5.2 Asset Valuation
- Track assets in native units (shares, etc.)
- Historical valuation data visualization
- Gain/loss calculation with visual indicators
- Performance metrics dashboard
- Asset price display
- Historical asset price charts

### 6. Reporting

#### 6.1 Standard Reports
- Monthly spending by category
- Income vs. Expenses
- Net worth over time
- Account balances
- Export to PDF/CSV
- Scheduled report delivery

#### 6.2 Custom Reports
- User-defined report builder
- Flexible time period selection
- Export capabilities
- Report sharing functionality
- Saved report templates

#### 6.3 Tax Reporting
- Year-end summaries
- Category grouping for tax purposes
- Transaction tagging for tax relevance
- Tax liability estimation
- Tax document export

## User Interface

### Dashboard
- Overview of financial position
- Quick access to common tasks
- Unbalanced transaction alerts
- Recent activity feed
- Key metrics display
- Customizable widgets
- Saved view configurations

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
- Performance metrics
- Account-specific reports

### Transaction Interface
- List view with filtering and sorting
- Detail view with all entry lines
- Completion suggestions for unbalanced transactions
- Location display on map
- Transaction balancer with dual-pane layout:
  - Left pane: scrollable list of unbalanced transactions
  - Right pane: selected entry with drop zone and scrollable matching suggestions
  - Fixed position for the selected entry to maintain context while scrolling
- Transaction filtering: Only transactions with `isBalanced=false` (which is a virtual computed property, not stored) should appear in the unbalanced transactions list
- Transaction list should use the API's filtering mechanism, understanding that `isBalanced` is calculated server-side on demand
- Transaction Balance Modal:
  - Balance Analysis section showing total debits, credits, and net balance
  - Suggested fix displayed as a message (e.g., "Add a credit entry of $300.00 to balance this transaction")
  - Transaction Entry Lines section with ability to add/edit/delete entries
  - Complementary Transactions section showing transactions with opposite imbalance that could help balance the current transaction
  - Each complementary transaction displays transaction description, date, number of entries, imbalance amount, and a "Merge" button
  - Manual Entry Search section with smart defaults for finding individual entries to move:
    - Minimum amount defaulted to $0.01 (one cent)
    - Maximum amount defaulted to match the transaction's imbalance
    - Type defaulted to the type needed to balance the transaction
  - Success/error messages displayed within the modal after actions

### Visualization Hub
- Sankey diagram as primary visualization
- Toggle between different visualization types
- Time range controls
- Export/share options
- Interactive filtering
- Drill-down capabilities

## Responsive Design Requirements

- Mobile-first approach with responsive layouts
- Touch-optimized controls for mobile devices
- Simplified views for smaller screens
- Optimized data loading for mobile networks
- Offline capability for basic functions

## Accessibility Requirements

- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- Sufficient color contrast
- Focus management for modals and interactive elements

## Performance Targets

- Initial load time < 2 seconds
- Time to interactive < 3 seconds
- Smooth animations (60fps)
- Optimized bundle size with code splitting
- Efficient data fetching with caching

## Frontend Dependencies
```javascript
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
```

## Implementation Phases

### Phase 1: Core Interface
- Account management interface
- Basic transaction creation and listing
- Simple balance display
- Essential navigation

### Phase 2: Advanced Functionality
- Transaction balancing interface
- Rule creation and management
- Basic visualizations
- Responsive design implementation

### Phase 3: Visualization and Analysis
- Advanced Sankey diagrams
- Timeline and location features
- Custom reporting
- Performance optimizations

## Success Metrics

- User engagement (time spent in app)
- Transaction creation speed
- Time to balance transactions
- User satisfaction with visualizations
- Feature adoption rates 

## Backend API Integration

The frontend must integrate with these key backend endpoints:

### Transaction Endpoints
- `GET /api/transactions` - List transactions with appropriate filters
- `GET /api/transactions/:id` - Get transaction details with populated entries
- `POST /api/transactions` - Create transaction with entries
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction (cascades to entries)

### Rule Endpoints
- `GET /api/rules` - List all rules (optional type filter)
- `GET /api/rules/:id` - Get rule details
- `POST /api/rules` - Create a new rule (with appropriate type-specific fields)
- `PUT /api/rules/:id` - Update a rule
- `DELETE /api/rules/:id` - Delete a rule
- `POST /api/rules/:id/apply` - Apply a rule to a specific transaction
- `POST /api/rules/apply-all` - Apply all auto-apply rules to unbalanced transactions
- `GET /api/rules/preview` - Preview which transactions would match a rule pattern

### Data Handling Considerations
- The `isBalanced` property is a virtual property calculated in real-time
- Finding unbalanced transactions requires working with the backend, which:
  1. Fetches all transactions
  2. Populates necessary account references
  3. Filters transactions where isBalanced is false
- Rule application follows this sequence:
  1. Pattern matching against transaction descriptions
  2. Account filtering based on specified source accounts
  3. Entry type filtering (debit/credit/both)
  4. Application of the appropriate rule type logic 