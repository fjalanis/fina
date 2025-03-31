/**
 * HOUSEHOLD FINANCE - MANUAL TEST DATA INSTRUCTIONS
 * ------------------------------------------------
 * 
 * Follow these steps to manually create test data for the Transaction Balancing Rules feature.
 */

/**
 * STEP 1: CREATE ACCOUNTS
 * -----------------------
 * First, create the following accounts through the UI:
 * 
 * 1. Checking Account (Asset)
 *    - Name: Checking Account
 *    - Type: Asset
 *    - Description: Main checking account
 * 
 * 2. Credit Card (Liability)
 *    - Name: Credit Card
 *    - Type: Liability
 *    - Description: Main credit card
 * 
 * 3. Groceries (Expense)
 *    - Name: Groceries
 *    - Type: Expense
 *    - Description: Grocery expenses
 * 
 * 4. Dining Out (Expense)
 *    - Name: Dining Out
 *    - Type: Expense
 *    - Description: Restaurant expenses
 * 
 * 5. Utilities (Expense)
 *    - Name: Utilities
 *    - Type: Expense
 *    - Description: Utility bills
 * 
 * 6. Salary (Income)
 *    - Name: Salary
 *    - Type: Income
 *    - Description: Monthly salary
 */

/**
 * STEP 2: CREATE UNBALANCED TRANSACTIONS
 * --------------------------------------
 * Next, create the following unbalanced transactions:
 * 
 * 1. Grocery Transaction
 *    - Description: "Grocery shopping at Whole Foods"
 *    - Date: Today
 *    - Entry Lines:
 *      * Account: Credit Card
 *      * Amount: 150.75 (positive number)
 *      * Description: "Weekly grocery shopping"
 * 
 * 2. Restaurant Transaction
 *    - Description: "Dinner at Italian Restaurant"
 *    - Date: Today
 *    - Entry Lines:
 *      * Account: Credit Card
 *      * Amount: 78.50 (positive number)
 *      * Description: "Dinner with family"
 * 
 * 3. Utility Bill Transaction
 *    - Description: "Electric bill payment"
 *    - Date: Today
 *    - Entry Lines:
 *      * Account: Checking Account
 *      * Amount: -120.30 (negative number)
 *      * Description: "Electric bill for March"
 * 
 * 4. Salary Transaction
 *    - Description: "Paycheck deposit"
 *    - Date: Today
 *    - Entry Lines:
 *      * Account: Checking Account
 *      * Amount: 3000.00 (positive number)
 *      * Description: "Monthly salary"
 */

/**
 * STEP 3: CREATE RULES
 * -------------------
 * Finally, create the following rules:
 * 
 * 1. Grocery Rule
 *    - Name: "Grocery Rule"
 *    - Description: "Match grocery expenses and categorize appropriately"
 *    - Pattern: "(grocery|groceries|whole foods|trader joes|safeway|market)"
 *    - Source Account: Credit Card
 *    - Destination Accounts:
 *      * Account: Groceries
 *      * Ratio: 1
 *    - Priority: 10
 *    - Enabled: Yes
 * 
 * 2. Restaurant Rule
 *    - Name: "Restaurant Rule"
 *    - Description: "Match restaurant expenses and categorize appropriately"
 *    - Pattern: "(restaurant|dinner|lunch|cafe|bistro)"
 *    - Source Account: Credit Card
 *    - Destination Accounts:
 *      * Account: Dining Out
 *      * Ratio: 1
 *    - Priority: 20
 *    - Enabled: Yes
 * 
 * 3. Utility Bill Rule
 *    - Name: "Utility Bill Rule"
 *    - Description: "Match utility payments and categorize appropriately"
 *    - Pattern: "(electric|utility|water|gas|bill)"
 *    - Source Account: Checking Account
 *    - Destination Accounts:
 *      * Account: Utilities
 *      * Ratio: 1
 *    - Priority: 30
 *    - Enabled: Yes
 * 
 * 4. Salary Rule
 *    - Name: "Salary Rule"
 *    - Description: "Match paycheck deposits and categorize appropriately"
 *    - Pattern: "(salary|paycheck|deposit)"
 *    - Source Account: Checking Account
 *    - Destination Accounts:
 *      * Account: Salary
 *      * Ratio: 1
 *    - Priority: 40
 *    - Enabled: Yes
 */

/**
 * STEP 4: TESTING THE RULES
 * ------------------------
 * Once you've created all the test data, you can test the rules:
 * 
 * 1. Go to the Transactions page and find an unbalanced transaction
 * 2. Open the transaction details
 * 3. Click the "Apply Rules" button
 * 4. Observe how the transaction becomes balanced with the appropriate categorization
 * 
 * You can also go to the Rules page and click "Apply Rules to All Transactions" to 
 * process all unbalanced transactions at once.
 * 
 * Additionally, you can test each rule individually by:
 * 1. Go to the Rules page
 * 2. Click "Test" next to a rule
 * 3. Enter a sample transaction description and amount
 * 4. See how the rule would categorize the transaction
 */
