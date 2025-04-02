describe('Smoke Test', () => {
  it('should load the application and show main navigation', () => {
    // Visit the base URL (ensure your dev server is running)
    cy.visit('http://localhost:3000'); // Adjust port if needed

    // Check if the main navigation tabs are visible
    cy.contains('Accounts').should('be.visible');
    cy.contains('Transactions').should('be.visible');
    cy.contains('Reports').should('be.visible');
    cy.contains('Rules').should('be.visible');

    // Optional: Check for a title or specific element on the default page
    // cy.get('h1').should('contain', 'Dashboard'); // Example
  });


}); 