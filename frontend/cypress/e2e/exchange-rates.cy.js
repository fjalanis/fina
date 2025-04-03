describe('Exchange Rate Management', () => {

  beforeEach(() => {
    cy.resetDatabase();
    cy.visit('http://localhost:3000/exchange-rates');
  });

  it('should create a new exchange rate', () => {
    cy.get('button').contains('Add Exchange Rate').click();
    
    cy.get('input[name="baseCurrency"]').type('USD');
    cy.get('input[name="targetCurrency"]').type('EUR');
    cy.get('input[name="rate"]').type('0.85');
    cy.get('input[name="date"]').type('2024-04-02');
    cy.get('button[type="submit"]').click();

    // Verify exchange rate was created
    cy.contains('USD → EUR').should('exist');
    cy.contains('0.850000').should('exist');
    cy.contains('4/2/2024').should('exist');
  });

  it('should edit an existing exchange rate', () => {
    // First create an exchange rate
    cy.get('button').contains('Add Exchange Rate').click();
    cy.get('input[name="baseCurrency"]').type('USD');
    cy.get('input[name="targetCurrency"]').type('GBP');
    cy.get('input[name="rate"]').type('0.79');
    cy.get('input[name="date"]').type('2024-04-02');
    cy.get('button[type="submit"]').click();

    // Find and click edit button
    cy.contains('USD → GBP')
      .parent()
      .find('button')
      .contains('Edit')
      .click();

    // Update rate
    cy.get('input[name="rate"]').clear().type('0.80');
    cy.get('button[type="submit"]').click();

    // Verify rate was updated
    cy.contains('USD → GBP').should('exist');
    cy.contains('0.800000').should('exist');
  });

  it('should delete an exchange rate', () => {
    // First create an exchange rate
    cy.get('button').contains('Add Exchange Rate').click();
    cy.get('input[name="baseCurrency"]').type('USD');
    cy.get('input[name="targetCurrency"]').type('JPY');
    cy.get('input[name="rate"]').type('151.50');
    cy.get('input[name="date"]').type('2024-04-02');
    cy.get('button[type="submit"]').click();

    // Find and click delete button
    cy.contains('USD → JPY')
      .parent()
      .find('button')
      .contains('Delete')
      .click();

    // Confirm deletion
    cy.on('window:confirm', () => true);

    // Verify exchange rate was deleted
    cy.contains('USD → JPY').should('not.exist');
  });

  it('should validate exchange rate inputs', () => {
    cy.get('button').contains('Add Exchange Rate').click();
    
    // Try to submit without required fields
    cy.get('button[type="submit"]').click();

    // Verify validation errors
    cy.get('input[name="baseCurrency"]').should('have.class', 'border-red-500');
    cy.get('input[name="targetCurrency"]').should('have.class', 'border-red-500');
    cy.get('input[name="rate"]').should('have.class', 'border-red-500');
    cy.get('input[name="date"]').should('have.class', 'border-red-500');

    // Try invalid rate
    cy.get('input[name="baseCurrency"]').type('USD');
    cy.get('input[name="targetCurrency"]').type('EUR');
    cy.get('input[name="rate"]').type('-1');
    cy.get('input[name="date"]').type('2024-04-02');
    cy.get('button[type="submit"]').click();

    // Verify rate validation
    cy.get('input[name="rate"]').should('have.class', 'border-red-500');
  });

  it('should display exchange rates in list view', () => {
    // Create multiple exchange rates
    cy.get('button').contains('Add Exchange Rate').click();
    cy.get('input[name="baseCurrency"]').type('USD');
    cy.get('input[name="targetCurrency"]').type('CAD');
    cy.get('input[name="rate"]').type('1.35');
    cy.get('input[name="date"]').type('2024-04-02');
    cy.get('button[type="submit"]').click();

    cy.get('button').contains('Add Exchange Rate').click();
    cy.get('input[name="baseCurrency"]').type('EUR');
    cy.get('input[name="targetCurrency"]').type('USD');
    cy.get('input[name="rate"]').type('1.08');
    cy.get('input[name="date"]').type('2024-04-02');
    cy.get('button[type="submit"]').click();

    // Verify both rates are displayed
    cy.contains('USD → CAD').should('exist');
    cy.contains('1.350000').should('exist');
    cy.contains('EUR → USD').should('exist');
    cy.contains('1.080000').should('exist');
  });
}); 