# Manual Testing Guide for Rule Components

This document outlines manual testing procedures for the Transaction Balancing Rules feature.

## Rule List Component

### Test 1: Viewing Rules
1. Navigate to the Rules page by clicking "Rules" in the navigation menu
2. Expected: A list of rules should be displayed, or a message indicating no rules if the database is empty
3. The list should show rule name, priority, pattern, source account, destination accounts, and status

### Test 2: Creating a Rule
1. Click the "Create New Rule" button
2. Fill in the form with the following information:
   - Name: "Grocery Test Rule"
   - Description: "Testing rule for grocery expenses"
   - Pattern: "Grocery|Supermarket"
   - Source Account: Select any asset account (like "Checking Account")
   - Destination Account: Select any expense account (like "Groceries")
   - Set the ratio to 1 or an absolute amount
   - Priority: 10
   - Enabled: Checked
3. Click "Create Rule"
4. Expected: The modal should close and the new rule should appear in the list
5. A success toast notification should appear

### Test 3: Editing a Rule
1. Find an existing rule in the list and click "Edit"
2. Modify some fields:
   - Change the name to add "Updated"
   - Change the pattern
   - Adjust the priority
3. Click "Update Rule"
4. Expected: The modal should close and the rule in the list should be updated with the new information
5. A success toast notification should appear

### Test 4: Deleting a Rule
1. Find an existing rule in the list and click "Delete"
2. Confirm the deletion in the confirmation dialog
3. Expected: The rule should disappear from the list
4. A success toast notification should appear

### Test 5: Apply Rules to All Transactions
1. Ensure there is at least one unbalanced transaction in the system that matches an existing rule
2. Click "Apply Rules to All Transactions" button
3. Expected: Processing indicator should display
4. After processing completes, a results summary should appear showing:
   - Total transactions processed
   - Successfully processed count
   - Failed count
5. Navigate to Transactions list to verify that matching transactions have been balanced

## Rule Test Component

### Test 1: Testing a Rule with Matching Description
1. Find an existing rule in the list and click "Test"
2. Enter a description that matches the rule's pattern (e.g., "Grocery Shopping" for a rule with pattern "Grocery|Supermarket")
3. Enter an amount (e.g., 100)
4. Click "Test Rule"
5. Expected: Results should show that the pattern matches
6. Expected: The results should show the destination entries that would be created, including the account and amount

### Test 2: Testing a Rule with Non-matching Description
1. With a rule test page open, enter a description that doesn't match the rule's pattern (e.g., "Gas Station" for a rule with pattern "Grocery|Supermarket")
2. Enter an amount (e.g., 50)
3. Click "Test Rule"
4. Expected: Results should show that the pattern doesn't match
5. Expected: No destination entries should be shown

## Transaction Detail - Apply Rules Button

### Test 1: Applying Rule to Unbalanced Transaction
1. Create or find an unbalanced transaction with a description that matches an existing rule
2. Navigate to the transaction detail page
3. Verify that the "Apply Rules" button is visible for unbalanced transactions
4. Click the "Apply Rules" button
5. Expected: If a matching rule is found, new entry lines should be added to the transaction
6. Expected: If the transaction becomes balanced, its status should update to "Balanced"
7. Expected: Success toast notifications should appear

### Test 2: Apply Rules Button for Balanced Transactions
1. Navigate to a transaction detail page for a balanced transaction
2. Expected: The "Apply Rules" button should not be visible for balanced transactions

## Cross-functional Tests

### Test 1: Rule Priority Ordering
1. Create multiple rules with overlapping patterns but different priorities
2. Test applying rules to a transaction that matches multiple rules
3. Expected: The rule with the highest priority (highest number) should be applied

### Test 2: Rule with Fixed Amount vs. Ratio
1. Create a rule with fixed amounts for destination accounts
2. Create another rule with ratio-based distribution
3. Test both rules with different transaction amounts
4. Expected: 
   - Fixed amount rule should create entries with the exact amounts specified
   - Ratio rule should distribute the source amount proportionally

### Test 3: End-to-End Transaction Balancing
1. Create a new unbalanced transaction with only a debit entry
2. Create a rule that matches the transaction description
3. Navigate to the transaction detail page
4. Click "Apply Rules"
5. Expected: The transaction should become balanced with appropriate credit entries
6. The new entries should be visible in the entry lines table 