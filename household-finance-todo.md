# Household Finance App Implementation Todo List

## Phase 1: Foundation and Core Functionality

### Step 1: Project Setup and Infrastructure
1. Create project repositories (frontend and backend)
2. Set up Node.js with Express for backend
3. Set up React with Tailwind CSS for frontend
4. Configure MongoDB connection
5. Set up basic project structure and folders
6. Implement basic API error handling and logging
7. **Test**: Verify API server runs and connects to MongoDB successfully

### Step 2: Account Management - Core
1. Implement account schema in MongoDB
2. Create basic CRUD API endpoints for accounts
3. Build simple account list and detail views in React
4. Implement account hierarchy structure in the database
5. **Test**: Create, read, update, and delete accounts via API
6. **Test**: Verify parent-child relationships are maintained

### Step 3: Simple Transaction Management
1. Implement transaction and entry line schemas
2. Create API endpoints for basic transaction operations
3. Build transaction list and detail UI components
4. Implement simple transaction entry form (balanced transactions only)
5. **Test**: Create and retrieve transactions with multiple entry lines
6. **Test**: Verify transaction balance calculations work correctly

### Step 4: Basic Reporting
1. Create API endpoints for simple account balance reports
2. Implement monthly income/expense summary report
3. Build basic reporting UI with date range selection
4. **Test**: Generate reports for different time periods
5. **Test**: Verify balance calculations match raw transaction data

## Phase 2: Core Feature Enhancements

### Step 5: Unbalanced Transaction Support
1. Extend transaction schema to support unbalanced status
2. Update transaction API to handle partial transactions
3. Create unbalanced transaction list view
4. Implement single entry creation form
5. **Test**: Create unbalanced transactions and verify status tracking
6. **Test**: Ensure unbalanced transaction alerts appear correctly

### Step 6: Transaction Balancing Interface
1. Build transaction completion UI with search/filter capabilities
2. Implement suggested matches based on amounts and dates
3. Create drag-and-drop functionality for combining entries
4. Update API to handle transaction completion
5. **Test**: Successfully balance previously unbalanced transactions
6. **Test**: Verify suggestions algorithm works as expected

### Step 7: Transaction Balancing Rules
1. Implement rule schema and API endpoints with:
   - Support for transaction type filtering (debit vs. credit)
   - Optional and multiple source accounts
   - Extensible rule behavior architecture
   - Automatic rule application on new transactions
2. Create rule creation and management interface with:
   - Drag-and-drop rule ordering
   - Multiple source account selection with dropdown and text input
   - Transaction type filter selection
   - Enable/disable toggle for automatic application
3. Build rule testing functionality:
   - Show sample of currently unbalanced transactions that would match
   - Preview of rule application results
4. Implement background job for applying rules to new unbalanced transactions
5. **Test**: Create rules and verify they correctly match transactions
6. **Test**: Ensure rules apply in the correct order and with correct behavior
7. **Test**: Verify automatic rule application works as expected

### Step 8: Multi-Unit Support
1. Extend account and transaction schemas for unit (e.g. currency, stock) information
2. Implement unit conversion utilities
3. Update transaction forms to handle multiple units
4. Create API for asset prices (manual entry initially)
5. **Test**: Create transactions in different currencies
6. **Test**: Verify conversion calculations work correctly

### Step 9: Basic Sankey Diagram
1. Implement API endpoint for cash flow data over a period of time (default last 90 days)
  - This can be a new report API that returns data in a format that the frontend can just pick up and use directly with D3.js for sankey
  - Generate reports for other types of charts as well: 
    - monthly expense/income bars over time
    - pie charts with expense type for a period of time
    - non USD unit transaction value over time (daily over a week, daily over a month, etc.)
2. Create D3.js Sankey visualization component
  - The height of each bar should represent the cashflow amount
  - Income accounts should be on the left as a single line, expense accounts to the right. 
    - Their respective heights should represent how much I earned and how much I spent in a month.
    - They should start at the same height to make their comparison easy
    - Intermediate accounts involved in the different transactions can go anywhere in between the income and expense columns
    - A consistent color schema should be used to make reading of cashflows more convenient.
      - You should use green and red as usual, but you should also get creative with other elements
      - For example color coding different account types, or codify special transaction properties, etc.
3. Implement time range selection for the diagram
  - We can start with a traditional date range picker for now
4. Build basic interactivity 
  - hover information of connection lines 
  - hover information of account bars
  - this information should be relevant to cash flows
    - money in, money out in terms of debits/credits color coded
    - also include names/types where relevant
5. **Test**: Verify diagram data matches transaction records
6. **Test**: Ensure time filtering works correctly


## Phase 3: Advanced Features

### Step 10: Enhanced Sankey Diagram
1. Implement click-through navigation from diagram to transactions and move diagram to be the main feature of the landing page
2. Add special visualization for unbalanced entries
3. Implement account drill-down functionality
4. Add color coding for different transaction types
5. **Test**: Navigation from diagram elements to correct transaction lists
6. **Test**: Verify unbalanced transactions are visually distinct

### Step 11: Location Features
1. Extend entry line schema to store location data
2. Update transaction entry forms to capture location
3. Implement map visualization using Leaflet
4. Create heat map for expense concentration
5. **Test**: Transactions with location data appear correctly on maps
6. **Test**: Verify heat map intensity correlates with spending amounts

### Step 12: Timeline View
1. Implement calendar-based visualization API
2. Build timeline UI component with day/week/month views
3. Create filtering by account and category
4. Implement pattern detection visualization
5. **Test**: Transactions appear correctly on timeline
6. **Test**: Ensure filtering works appropriately


### Step 14: External API for Import
1. Design and document comprehensive API for external integration
2. Implement authentication for API access
3. Create bulk import endpoints
4. Build API testing interface
5. **Test**: Successfully import transactions from external sources
6. **Test**: Verify authentication and rate limiting work correctly

### Step 15: Tax Reporting
1. Extend transaction schema with tax-related fields
2. Implement year-end summary report generation
3. Create category mapping for common tax deductions
4. Build tax report export functionality
5. **Test**: Generate accurate tax summary reports
6. **Test**: Verify exports contain all relevant tax information

## Phase 4: Refinement and polishing

### Step 16: Performance Optimizations
1. Implement caching strategy for report and visualization data
2. Create background jobs for heavy calculations
3. Optimize database queries with proper indexing
4. Implement data aggregation for historical transactions
5. **Test**: Measure load times for large datasets before and after
6. **Test**: Verify aggregated data remains accurate

### Step 17: Dashboard Enhancement
1. Design and implement comprehensive dashboard
2. Create widgets for key financial metrics
3. Add alerts for unbalanced transactions
4. Implement quick access to common tasks
5. **Test**: Dashboard correctly reflects financial status
6. **Test**: Ensure all interactive elements work as expected

### Step 18: User Experience Refinement
1. Implement keyboard shortcuts for common actions
2. Add bulk operations for transactions and accounts
3. Implement modal windows for all add/edit operations:
   - Create reusable Modal component
   - Convert account forms to use modals
   - Update transaction forms to use modals
   - Convert entry line forms to use modals
   - Implement rule editing in modals
   - Ensure consistent keyboard navigation in all modals
4. Implement modal confirmation dialogs for all deletion operations:
   - Replace all window.confirm() calls with modal dialogs
   - Include specific messaging about what will be deleted
   - Show any dependent items that might be affected
   - Provide options to cancel or confirm the deletion

### Step 19: Documentation and Deployment
1. Create comprehensive user documentation
2. Document API for potential future extensions
3. Prepare deployment scripts and configurations
4. Set up backup procedures for the database
5. **Test**: Successful deployment to target environment
6. **Test**: Verify backup and restore procedures

