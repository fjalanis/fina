describe('Asset Price Management', () => {

  beforeEach(() => {
    cy.resetDatabase();
    cy.visit('/asset-prices');
  });

  it('should create a new asset price', () => {
    cy.get('button').contains('Add Asset Price').click();
    
    cy.get('input[name="baseCurrency"]').type('USD');
    cy.get('input[name="targetCurrency"]').type('EUR');
    cy.get('input[name="rate"]').type('0.85');
    cy.get('input[name="date"]').type('2024-04-08');
    
    cy.get('button').contains('Create').click();
    
    // Verify asset price was created
    cy.contains('USD → EUR');
    cy.contains('0.85');
  });

  it('should edit an existing asset price', () => {
    // First create an asset price
    cy.get('button').contains('Add Asset Price').click();
    
    cy.get('input[name="baseCurrency"]').type('USD');
    cy.get('input[name="targetCurrency"]').type('EUR');
    cy.get('input[name="rate"]').type('0.85');
    cy.get('input[name="date"]').type('2024-04-08');
    
    cy.get('button').contains('Create').click();
    
    // Now edit it
    cy.contains('USD → EUR').parent().parent().within(() => {
      cy.get('button').contains('Edit').click();
    });
    
    cy.get('input[name="rate"]').clear().type('0.90');
    cy.get('button').contains('Update').click();
    
    // Verify the change
    cy.contains('0.90');
  });

  it('should delete an asset price', () => {
    // First create an asset price
    cy.get('button').contains('Add Asset Price').click();
    
    cy.get('input[name="baseCurrency"]').type('USD');
    cy.get('input[name="targetCurrency"]').type('EUR');
    cy.get('input[name="rate"]').type('0.85');
    cy.get('input[name="date"]').type('2024-04-08');
    
    cy.get('button').contains('Create').click();
    
    // Now delete it
    cy.contains('USD → EUR').parent().parent().within(() => {
      cy.get('button').contains('Delete').click();
    });
    
    // Confirm deletion
    cy.on('window:confirm', () => true);
    
    // Verify asset price was deleted
    cy.contains('USD → EUR').should('not.exist');
  });

  it('should validate asset price inputs', () => {
    cy.get('button').contains('Add Asset Price').click();
    
    // Try to submit without required fields
    cy.get('button').contains('Create').click();
    
    // Should show validation errors
    cy.get('input[name="baseCurrency"]').should('have.attr', 'required');
    cy.get('input[name="targetCurrency"]').should('have.attr', 'required');
    cy.get('input[name="rate"]').should('have.attr', 'required');
    cy.get('input[name="date"]').should('have.attr', 'required');
    
    // Try negative rate
    cy.get('input[name="rate"]').type('-1');
    cy.get('button').contains('Create').click();
    cy.contains('Asset price must be positive');
  });

  it('should display asset prices in list view', () => {
    // Create multiple asset prices
    cy.get('button').contains('Add Asset Price').click();
    cy.get('input[name="baseCurrency"]').type('USD');
    cy.get('input[name="targetCurrency"]').type('EUR');
    cy.get('input[name="rate"]').type('0.85');
    cy.get('input[name="date"]').type('2024-04-08');
    cy.get('button').contains('Create').click();
    
    cy.get('button').contains('Add Asset Price').click();
    cy.get('input[name="baseCurrency"]').type('ETH');
    cy.get('input[name="targetCurrency"]').type('USD');
    cy.get('input[name="rate"]').type('3000');
    cy.get('input[name="date"]').type('2024-04-08');
    cy.get('button').contains('Create').click();
    
    // Verify list view
    cy.contains('USD → EUR');
    cy.contains('0.85');
    cy.contains('ETH → USD');
    cy.contains('3000');
  });
}); 