describe('Multi-Unit Transaction Management', () => {

  beforeEach(() => {
    cy.resetDatabase();
    cy.visit('http://localhost:3000/transactions');
  });

  it('should create a transaction with single unit (USD)', () => {
    // Create test accounts first
    cy.createAccount('Test USD Account', 'asset', 'USD');
    cy.createAccount('Test Expense Account', 'expense', 'USD');

    cy.get('button').contains('Add Transaction').click();

    // Add first entry (debit)
    cy.get('select').first().select('Test USD Account');
    cy.get('input[type="number"]').first().type('100');
    cy.get('input[type="text"]').first().type('Test USD Transaction');
    cy.get('select').eq(1).select('debit');

    // Add second entry (credit)
    cy.get('button').contains('Add Entry').click();
    cy.get('select').eq(2).select('Test Expense Account');
    cy.get('input[type="number"]').eq(1).type('100');
    cy.get('input[type="text"]').eq(1).type('Test USD Transaction');
    cy.get('select').last().select('credit');

    cy.get('button[type="submit"]').click();

    // Verify transaction was created
    cy.contains('Test USD Transaction').should('exist');
    cy.contains('$100.00').should('exist');
  });

  it('should create a transaction with multiple units (stock purchase)', () => {
    // Create test accounts first
    cy.createAccount('Test USD Account', 'asset', 'USD');
    cy.createAccount('Test Stock Account', 'asset', 'stock:AAPL');

    cy.get('button').contains('Add Transaction').click();

    // Add USD debit entry
    cy.get('select[name="account"]').first().select('Test USD Account');
    cy.get('input[name="amount"]').first().type('1000');
    cy.get('input[name="description"]').first().type('Buy AAPL Stock');
    cy.get('select[name="type"]').first().select('debit');

    // Add stock credit entry
    cy.get('button').contains('Add Entry').click();
    cy.get('select[name="account"]').last().select('Test Stock Account');
    cy.get('input[name="amount"]').last().type('1000');
    cy.get('input[name="quantity"]').last().type('5');
    cy.get('input[name="unit"]').last().type('stock:AAPL');
    cy.get('input[name="description"]').last().type('Buy AAPL Stock');
    cy.get('select[name="type"]').last().select('credit');

    cy.get('button[type="submit"]').click();

    // Verify transaction was created
    cy.contains('Buy AAPL Stock').should('exist');
    cy.contains('$1,000.00').should('exist');
    cy.contains('5 stock:AAPL').should('exist');
  });

  it('should show cost basis lots table when selling stock', () => {
    // First create a stock purchase transaction
    cy.createAccount('Test USD Account', 'asset', 'USD');
    cy.createAccount('Test Stock Account', 'asset', 'stock:AAPL');
    
    // Create purchase transaction
    cy.get('button').contains('Add Transaction').click();
    cy.get('select[name="account"]').first().select('Test USD Account');
    cy.get('input[name="amount"]').first().type('1000');
    cy.get('input[name="description"]').first().type('Buy AAPL Stock');
    cy.get('select[name="type"]').first().select('debit');

    cy.get('button').contains('Add Entry').click();
    cy.get('select[name="account"]').last().select('Test Stock Account');
    cy.get('input[name="amount"]').last().type('1000');
    cy.get('input[name="quantity"]').last().type('5');
    cy.get('input[name="unit"]').last().type('stock:AAPL');
    cy.get('input[name="description"]').last().type('Buy AAPL Stock');
    cy.get('select[name="type"]').last().select('credit');

    cy.get('button[type="submit"]').click();

    // Now create a sale transaction
    cy.get('button').contains('Add Transaction').click();

    // Add stock debit entry
    cy.get('select[name="account"]').first().select('Test Stock Account');
    cy.get('input[name="amount"]').first().type('1200');
    cy.get('input[name="quantity"]').first().type('3');
    cy.get('input[name="unit"]').first().type('stock:AAPL');
    cy.get('input[name="description"]').first().type('Sell AAPL Stock');
    cy.get('select[name="type"]').first().select('debit');

    // Verify cost basis lots table appears
    cy.contains('Available Lots').should('exist');
    cy.contains('5 stock:AAPL').should('exist');
    cy.contains('$200.00').should('exist'); // Cost per unit

    // Select a lot
    cy.get('button').contains('Select Lot').click();

    // Enter sale price and calculate gain/loss
    cy.get('input[id="salePrice"]').type('240');
    cy.get('button').contains('Calculate & Add Entry').click();

    // Verify gain/loss entry was added
    cy.contains('Capital Gain/Loss').should('exist');
    cy.contains('$120.00').should('exist'); // (240 - 200) * 3

    // Add USD credit entry
    cy.get('button').contains('Add Entry').click();
    cy.get('select[name="account"]').last().select('Test USD Account');
    cy.get('input[name="amount"]').last().type('1200');
    cy.get('input[name="description"]').last().type('Sell AAPL Stock');
    cy.get('select[name="type"]').last().select('credit');

    cy.get('button[type="submit"]').click();

    // Verify transaction was created
    cy.contains('Sell AAPL Stock').should('exist');
    cy.contains('3 stock:AAPL').should('exist');
    cy.contains('$1,200.00').should('exist');
    cy.contains('Capital Gain/Loss').should('exist');
  });

  it('should validate multi-unit transaction balancing', () => {
    cy.createAccount('Test USD Account', 'asset', 'USD');
    cy.createAccount('Test Stock Account', 'asset', 'stock:AAPL');

    cy.get('button').contains('Add Transaction').click();

    // Add USD debit entry
    cy.get('select[name="account"]').first().select('Test USD Account');
    cy.get('input[name="amount"]').first().type('1000');
    cy.get('input[name="description"]').first().type('Buy AAPL Stock');
    cy.get('select[name="type"]').first().select('debit');

    // Add stock credit entry with different amount
    cy.get('button').contains('Add Entry').click();
    cy.get('select[name="account"]').last().select('Test Stock Account');
    cy.get('input[name="amount"]').last().type('900'); // Different amount
    cy.get('input[name="quantity"]').last().type('5');
    cy.get('input[name="unit"]').last().type('stock:AAPL');
    cy.get('input[name="description"]').last().type('Buy AAPL Stock');
    cy.get('select[name="type"]').last().select('credit');

    // Try to submit
    cy.get('button[type="submit"]').click();

    // Verify validation error
    cy.contains('Transaction must be balanced').should('exist');
  });

  it('should create a transaction with single unit (USD) using new form structure', () => {
    cy.createAccount('Checking', 'USD', 'asset');
    cy.visit('/transactions');
    cy.get('button').contains('Add Transaction').click();
    
    // Fill in the first entry
    cy.get('select[name="account"]').first().select('Checking');
    cy.get('input[name="description"]').first().type('Test transaction');
    cy.get('input[name="amount"]').first().type('100');
    cy.get('select[name="type"]').first().select('debit');
    cy.get('input[name="unit"]').first().type('USD');

    // Add second entry
    cy.get('button').contains('Add Entry').click();
    cy.get('select[name="account"]').eq(1).select('Checking');
    cy.get('input[name="description"]').eq(1).type('Test transaction');
    cy.get('input[name="amount"]').eq(1).type('100');
    cy.get('select[name="type"]').eq(1).select('credit');
    cy.get('input[name="unit"]').eq(1).type('USD');

    cy.get('button').contains('Submit').click();
  });
}); 