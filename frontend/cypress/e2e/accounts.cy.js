describe('Account Unit Management', () => {

  beforeEach(() => {
    cy.resetDatabase();
    cy.visit('http://localhost:3000/accounts'); 
  });

  it('should create an account with USD unit', () => {
    cy.get('button').contains('Add Account').click();
    
    cy.get('input[name="name"]').type('Test USD Account');
    cy.get('select[name="type"]').select('asset');
    cy.get('input[name="unit"]').clear().type('USD');
    cy.get('button[type="submit"]').click();

    // Verify account was created
    cy.contains('Test USD Account').should('exist');
    cy.contains('USD').should('exist');
  });

  it('should create an account with stock unit', () => {
    cy.get('button').contains('Add Account').click();
    
    cy.get('input[name="name"]').type('Test Stock Account');
    cy.get('select[name="type"]').select('asset');
    cy.get('input[name="unit"]').clear().type('stock:AAPL');
    cy.get('button[type="submit"]').click();

    // Verify account was created
    cy.contains('Test Stock Account').should('exist');
    cy.contains('stock:AAPL').should('exist');
  });

  it('should create an account with crypto unit', () => {
    cy.get('button').contains('Add Account').click();
    
    cy.get('input[name="name"]').type('Test Crypto Account');
    cy.get('select[name="type"]').select('asset');
    cy.get('input[name="unit"]').clear().type('crypto:BTC');
    cy.get('button[type="submit"]').click();

    // Verify account was created
    cy.contains('Test Crypto Account').should('exist');
    cy.contains('crypto:BTC').should('exist');
  });

  it('should edit an account unit', () => {
    // First create an account
    cy.get('button').contains('Add Account').click();
    cy.get('input[name="name"]').type('Account to Edit');
    cy.get('select[name="type"]').select('asset');
    cy.get('input[name="unit"]').clear().type('USD');
    cy.get('button[type="submit"]').click();

    // Find and click edit button
    cy.contains('Account to Edit')
      .closest('tr')
      .find('button')
      .contains('Edit')
      .click();

    // Change unit
    cy.get('input[name="unit"]').clear().type('stock:MSFT');
    cy.get('button[type="submit"]').click();

    // Verify unit was updated
    cy.contains('Account to Edit').should('exist');
    cy.contains('stock:MSFT').should('exist');
  });

  it('should validate unit input', () => {
    cy.get('button').contains('Add Account').click();
    
    // Try to submit without unit
    cy.get('input[name="name"]').type('Invalid Account');
    cy.get('select[name="type"]').select('asset');
    cy.get('input[name="unit"]').clear();
    cy.get('button[type="submit"]').click();

    // Verify validation error
    cy.get('input[name="unit"]').should('have.class', 'border-red-500');
    cy.contains('Unit is required').should('exist');
  });

  it('should display unit in account list and detail view', () => {
    // Create a test account
    cy.get('button').contains('Add Account').click();
    cy.get('input[name="name"]').type('Test Display Account');
    cy.get('select[name="type"]').select('asset');
    cy.get('input[name="unit"]').clear().type('stock:GOOGL');
    cy.get('button[type="submit"]').click();

    // Verify unit in list view
    cy.contains('Test Display Account').should('exist');
    cy.contains('stock:GOOGL').should('exist');

    // Click to view details
    cy.contains('Test Display Account').click();

    // Verify unit in detail view
    cy.contains('Unit').should('exist');
    cy.get('.bg-gray-100.text-gray-800').contains('stock:GOOGL').should('exist');
  });
}); 