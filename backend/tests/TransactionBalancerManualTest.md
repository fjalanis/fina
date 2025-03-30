# Transaction Balancer Manual Test Guide

This document provides step-by-step instructions for manually testing the Transaction Balancer interface.

## Prerequisites

1. A running instance of the application (both frontend and backend)
2. At least two unbalanced transactions with entry lines having the same amount but opposite entry types (debit/credit)

## Test Scenarios

### 1. Accessing the Transaction Balancer

1. Log in to the application
2. Click on "Balance Transactions" in the main navigation menu
   - **Expected Result**: Transaction Balancer interface loads, showing unbalanced transactions on the left side

### 2. Viewing Unbalanced Transactions

1. Observe the left panel of the Transaction Balancer interface
   - **Expected Result**: All unbalanced transactions are listed with their descriptions, dates, and entry lines

### 3. Selecting an Entry Line

1. Click on an entry line from one of the unbalanced transactions
   - **Expected Result**: 
     - The selected entry should be highlighted
     - The entry details should appear in the right panel's drop area
     - The system should search for and display potential matching entries below the drop area

### 4. Viewing Suggested Matches

1. After selecting an entry line, observe the "Suggested Matches" section
   - **Expected Result**: 
     - Matching entries (opposite type, same amount) from other unbalanced transactions should be displayed
     - Each match should show the account name, amount, transaction description, and date
     - If no matches are found, an appropriate message should be displayed

### 5. Balancing Transactions via Drag and Drop

1. Select an entry line from an unbalanced transaction
2. Wait for suggested matches to appear
3. Drag one of the matches and drop it onto the selected entry's drop area
   - **Expected Result**: 
     - A loading indicator should appear briefly
     - Both transactions should be combined into one balanced transaction
     - The balanced transaction should no longer appear in the unbalanced transactions list
     - A success message should be displayed
     - The right panel should reset to its initial state

### 6. Testing with No Matching Entries

1. Create an unbalanced transaction with a unique amount
2. Select the entry line from this transaction in the Transaction Balancer
   - **Expected Result**: The "Suggested Matches" section should display a message indicating no matches were found

### 7. Testing with Same-Type Entries

1. Create two unbalanced transactions, both with entry lines of the same type (e.g., both debit)
2. Try to manually drag and drop one entry onto another (this requires browser developer tools to modify the DOM)
   - **Expected Result**: The operation should fail with an error message about entries needing to have opposite types

### 8. Testing Balanced Transactions

1. Create a balanced transaction with equal debits and credits
2. Go to the Transaction Balancer interface
   - **Expected Result**: The balanced transaction should not appear in the list of unbalanced transactions

## Edge Cases

### 1. Network Interruption During Balance Operation

1. Select an entry line and identify a match
2. Disable network connection (via browser dev tools or OS network controls)
3. Drag and drop the match onto the selected entry
   - **Expected Result**: The operation should fail gracefully with an appropriate error message

### 2. Concurrent Modifications

1. Open the Transaction Balancer in two different browser windows
2. In window 1, select an entry line and start the balancing process
3. In window 2, delete the transaction that contains the entry being used in window 1
4. Complete the balancing process in window 1
   - **Expected Result**: The operation should fail with an appropriate error message

### 3. Very Large Number of Unbalanced Transactions

1. Create 20+ unbalanced transactions
2. Access the Transaction Balancer interface
   - **Expected Result**: The interface should load and display all transactions, with proper scrolling functionality if needed

## Reporting Issues

If any test fails or behaves unexpectedly, please report the following information:

1. Test scenario that failed
2. Expected vs. actual behavior
3. Steps to reproduce the issue
4. Browser and operating system details
5. Any error messages displayed in the UI or browser console 