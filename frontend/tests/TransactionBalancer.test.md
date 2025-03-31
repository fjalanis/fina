# Transaction Balancer Manual Tests

## Overview
This document outlines the manual tests for the Transaction Balancer component, which allows users to balance unbalanced transactions by matching and combining entry lines.

## Prerequisites
- The application should be running in development mode
- MongoDB should be running and accessible
- At least two unbalanced transactions with matching amounts but opposite types should exist in the database

## Test Cases

### 1. Loading the Transaction Balancer

**Steps:**
1. Navigate to the Balance Transactions page (/balance-transactions)

**Expected Result:**
- The Transaction Balancer component should load without errors
- The left panel should display unbalanced transactions, if any exist
- The right panel should show the initial "Select an entry" message

### 2. Viewing Unbalanced Transactions

**Steps:**
1. Create at least one unbalanced transaction via the Transaction List page
2. Navigate to the Balance Transactions page

**Expected Result:**
- The unbalanced transaction should appear in the left panel
- Each transaction should show its description, date, and entry lines
- The transaction should be clearly identifiable as unbalanced

### 3. Selecting an Entry Line

**Steps:**
1. Click on an entry line from an unbalanced transaction

**Expected Result:**
- The selected entry line should be highlighted
- The entry details should appear in the right panel's drop zone
- A loading indicator should briefly appear while fetching potential matches
- After loading, potential matches (if any) should appear below the drop zone

### 4. Testing with No Matching Entries

**Steps:**
1. Create an unbalanced transaction with a unique amount that doesn't match any other entry lines
2. Select this entry line in the Transaction Balancer

**Expected Result:**
- The right panel should indicate that no matches were found
- A message should suggest selecting a different entry

### 5. Drag and Drop Functionality

**Steps:**
1. Create two unbalanced transactions with matching amounts but opposite entry types
2. In the Transaction Balancer, select one of the entry lines
3. Wait for the matching entry to appear in the suggestions
4. Drag the suggested match and drop it onto the selected entry's drop zone

**Expected Result:**
- The dragging action should work smoothly with visual feedback
- After dropping, a loading indicator should briefly appear
- Both transactions should be combined into one balanced transaction
- A success message should appear
- The combined transaction should no longer appear in the unbalanced list
- The right panel should reset to its initial state

### 6. Error Handling

**Steps:**
1. Attempt to manually combine entries with the same type by manipulating the DOM
   (This requires developer tools and is primarily for developers to test error handling)

**Expected Result:**
- The operation should fail
- An appropriate error message should appear
- The UI should remain in a consistent state

### 7. Refreshing After Balance Operation

**Steps:**
1. Successfully balance two transactions
2. Refresh the browser

**Expected Result:**
- The Transaction Balancer should load correctly
- The previously balanced transactions should not appear in the list
- The UI should be in its initial state

## UI/UX Considerations

- Verify that loading states are properly indicated with spinners or other visual cues
- Check that error messages are clearly displayed and helpful
- Confirm that success messages appear after successful operations
- Ensure that the drag and drop interaction is intuitive with proper visual feedback
- Verify that the component is responsive and works on different screen sizes 