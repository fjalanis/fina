describe('Account View Functionality', () => {
  beforeEach(() => {
    cy.resetDatabase();
    cy.visit('http://localhost:3000/accounts');
  });

  it('should display account details and transactions correctly', () => {
    // Create a test account
    cy.get('button').contains('Add Account').click();
    cy.get('input[name="name"]').type('Test Account View');
    cy.get('select[name="type"]').select('asset');
    cy.get('input[name="unit"]').clear().type('USD');
    cy.get('textarea[name="description"]').type('This is a test account for view testing');
    cy.get('button[type="submit"]').click();
    
    // Verify account was created
    cy.contains('Test Account View').should('exist');
    cy.contains('Account created successfully').should('exist');
    
    // Create a child account
    cy.get('button').contains('Add Account').click();
    cy.get('input[name="name"]').type('Child Account');
    cy.get('select[name="type"]').select('liability');
    cy.get('input[name="unit"]').clear().type('USD');
    cy.get('select[name="parent"]').select('Test Account View');
    cy.get('button[type="submit"]').click();
    
    // Verify child account was created
    cy.contains('Child Account').should('exist');
    cy.contains('Account created successfully').should('exist');
    
    // Add a transaction between the accounts
    cy.visit('http://localhost:3000/transactions');
    cy.get('button').contains('Add Transaction').click();
    
    // Fill transaction details
    cy.get('input[name="date"]').type('2023-01-01');
    cy.get('input[name="description"]').type('Test Transaction for View');
    cy.get('input[name="amount"]').type('50');
    cy.get('select[name="fromAccount"]').select('Test Account View');
    cy.get('select[name="toAccount"]').select('Child Account');
    cy.get('button[type="submit"]').click();
    
    // Verify transaction was created
    cy.contains('Test Transaction for View').should('exist');
    cy.contains('Transaction created successfully').should('exist');
    
    // Go back to accounts page
    cy.visit('http://localhost:3000/accounts');
    
    // Click on account name in account table to go to account page
    cy.contains('Test Account View').click();
    
    // Verify we're on the account page
    cy.url().should('include', '/accounts/');
    
    // Verify account details are displayed and editable
    cy.contains('Test Account View').should('exist');
    cy.contains('This is a test account for view testing').should('exist');
    cy.contains('USD').should('exist');
    cy.contains('Asset').should('exist');
    
    // Verify edit button exists
    cy.get('button').contains('Edit').should('exist');
    
    // Verify transaction table exists and is filtered to only show transactions involving this account
    cy.contains('Transactions').should('exist');
    cy.get('table').should('exist');
    cy.contains('Test Transaction for View').should('exist');
    cy.contains('50 USD').should('exist');
    cy.contains('Debit').should('exist');
    
    // Verify only one transaction is shown (the one we created)
    cy.get('table tbody tr').should('have.length', 1);
    
    // Go back to accounts list
    cy.get('button').contains('Back to Accounts').click();
    
    // Click on child account
    cy.contains('Child Account').click();
    
    // Verify child account details
    cy.contains('Child Account').should('exist');
    cy.contains('USD').should('exist');
    cy.contains('Liability').should('exist');
    
    // Verify transaction table shows the same transaction
    cy.contains('Test Transaction for View').should('exist');
    cy.contains('50 USD').should('exist');
    cy.contains('Credit').should('exist');
    
    // Verify only one transaction is shown
    cy.get('table tbody tr').should('have.length', 1);
  });
}); 