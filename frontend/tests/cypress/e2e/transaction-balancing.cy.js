describe('Transaction Balancing', () => {
  beforeEach(() => {
    // Visit the transactions page
    cy.visit('/transactions');
  });

  it('shows asset table when balancing a transaction with non-USD units', () => {
    // Find and click the "Balance" button for the Cypress Stock Account transaction
    cy.contains('Stock purchase for Cypress testing').parent('tr').find('button').contains('Balance').click();

    // Verify the balance modal opens
    cy.contains('Balance Transaction').should('be.visible');

    // Verify the asset table is shown
    cy.contains('Asset Details').should('be.visible');

    // Verify the stock details are shown
    cy.contains('AAPL').should('be.visible');
    cy.contains('5').should('be.visible'); // Quantity
    cy.contains('$1000').should('be.visible'); // Amount

    // Verify the cost basis information is shown
    cy.contains('Cost Basis').should('be.visible');
    cy.contains('$200').should('be.visible'); // Cost basis per unit
  });

  it('shows asset table when balancing a transaction with crypto units', () => {
    // Find and click the "Balance" button for the Cypress Crypto Account transaction
    cy.contains('Crypto purchase for Cypress testing').parent('tr').find('button').contains('Balance').click();

    // Verify the balance modal opens
    cy.contains('Balance Transaction').should('be.visible');

    // Verify the asset table is shown
    cy.contains('Asset Details').should('be.visible');

    // Verify the crypto details are shown
    cy.contains('BTC').should('be.visible');
    cy.contains('0.1').should('be.visible'); // Quantity
    cy.contains('$500').should('be.visible'); // Amount

    // Verify the cost basis information is shown
    cy.contains('Cost Basis').should('be.visible');
    cy.contains('$5000').should('be.visible'); // Cost basis per unit
  });

  it('does not show asset table for USD transactions', () => {
    // Find and click the "Balance" button for a USD transaction
    cy.contains('Initial balance for Cypress test account').parent('tr').find('button').contains('Balance').click();

    // Verify the balance modal opens
    cy.contains('Balance Transaction').should('be.visible');

    // Verify the asset table is NOT shown
    cy.contains('Asset Details').should('not.exist');
  });
}); 