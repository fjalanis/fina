describe('Account CRUD Operations', () => {
  beforeEach(() => {
    cy.resetDatabase();
    cy.visit('http://localhost:3000/accounts');
  });

  describe('Account Unit Management', () => {
    it('should create an account with USD unit', () => {
      // Intercept API call
      cy.intercept('POST', '**/api/accounts').as('createAccount');
      
      cy.get('button').contains('Add Account').click();
      
      cy.get('input[name="name"]').type('Test USD Account');
      cy.get('select[name="type"]').select('asset');
      cy.get('input[name="unit"]').clear().type('USD');
      cy.get('button[type="submit"]').click();

      // Wait for API call
      cy.wait('@createAccount');
      
      // Verify account was created
      cy.contains('Test USD Account').should('exist');
      cy.contains('USD').should('exist');
      cy.contains('Account created successfully').should('exist');
    });

    it('should create an account with stock unit', () => {
      // Intercept API call
      cy.intercept('POST', '**/api/accounts').as('createAccount');
      
      cy.get('button').contains('Add Account').click();
      
      cy.get('input[name="name"]').type('Test Stock Account');
      cy.get('select[name="type"]').select('asset');
      cy.get('input[name="unit"]').clear().type('stock:AAPL');
      cy.get('button[type="submit"]').click();

      // Wait for API call
      cy.wait('@createAccount');
      
      // Verify account was created
      cy.contains('Test Stock Account').should('exist');
      cy.contains('stock:AAPL').should('exist');
      cy.contains('Account created successfully').should('exist');
    });

    it('should create an account with crypto unit', () => {
      // Intercept API call
      cy.intercept('POST', '**/api/accounts').as('createAccount');
      
      cy.get('button').contains('Add Account').click();
      
      cy.get('input[name="name"]').type('Test Crypto Account');
      cy.get('select[name="type"]').select('asset');
      cy.get('input[name="unit"]').clear().type('crypto:BTC');
      cy.get('button[type="submit"]').click();

      // Wait for API call
      cy.wait('@createAccount');
      
      // Verify account was created
      cy.contains('Test Crypto Account').should('exist');
      cy.contains('crypto:BTC').should('exist');
      cy.contains('Account created successfully').should('exist');
    });

    it('should edit an account unit', () => {
      // First create an account
      cy.intercept('POST', '**/api/accounts').as('createAccount');
      
      cy.get('button').contains('Add Account').click();
      cy.get('input[name="name"]').type('Account to Edit');
      cy.get('select[name="type"]').select('asset');
      cy.get('input[name="unit"]').clear().type('USD');
      cy.get('button[type="submit"]').click();

      // Wait for API call
      cy.wait('@createAccount');

      // Find and click edit button
      cy.contains('Account to Edit')
        .closest('tr')
        .find('button')
        .contains('Edit')
        .click();

      // Intercept update API call
      cy.intercept('PUT', '**/api/accounts/*').as('updateAccount');

      // Change unit
      cy.get('input[name="unit"]').clear().type('stock:MSFT');
      cy.get('button[type="submit"]').click();

      // Wait for API call
      cy.wait('@updateAccount');

      // Verify unit was updated
      cy.contains('Account to Edit').should('exist');
      cy.contains('stock:MSFT').should('exist');
      cy.contains('Account updated successfully').should('exist');
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
      cy.intercept('POST', '**/api/accounts').as('createAccount');
      
      cy.get('button').contains('Add Account').click();
      cy.get('input[name="name"]').type('Test Display Account');
      cy.get('select[name="type"]').select('asset');
      cy.get('input[name="unit"]').clear().type('stock:GOOGL');
      cy.get('button[type="submit"]').click();

      // Wait for API call
      cy.wait('@createAccount');

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

  it('should perform complete account lifecycle with parent-child relationships', () => {
    cy.intercept('POST', '**/api/accounts').as('createAccount');
    cy.intercept('DELETE', '**/api/accounts/*').as('deleteAccount');
    cy.intercept('PUT', '**/api/accounts/*').as('updateAccount');
    
    cy.get('button').contains('Add Account').click();

    cy.get('input[name="name"]').type('Account 1');
    cy.get('select[name="type"]').select('asset');
    cy.get('input[name="unit"]').clear().type('USD');
    cy.get('button[type="submit"]').click();
    
    // Wait for API call
    cy.wait('@createAccount');
    
    // Verify account was created and success toast appears
    cy.contains('Account 1').should('exist');
    cy.contains('asset').should('exist');
    cy.contains('USD').should('exist');

    cy.checkAndDismissToast('success', 'Account created successfully');
    
    // Edit Account 1 and see changes in list
    cy.contains('Account 1')
      .closest('tr')
      .find('button')
      .contains('Edit')
      .click();
    
    cy.get('input[name="name"]').clear().type('Account 1 Updated');
    cy.get('textarea[name="description"]').type('This is a test description');
    cy.get('button[type="submit"]').click();
    
    // Wait for API call
    cy.wait('@updateAccount');
    
    // Verify changes and success toast
    cy.contains('Account 1 Updated').should('exist');
    cy.checkAndDismissToast('success', 'Account updated successfully');
    
    // View Account 1 details and ensure all changes persist
    cy.contains('Account 1 Updated').click();
    
    cy.contains('Account 1 Updated').should('exist');
    cy.contains('This is a test description').should('exist');
    cy.contains('USD').should('exist');
    cy.contains('asset').should('exist');
    
    // Go back to accounts list
    cy.contains('a', 'Back to List').click();
    
    cy.get('button').contains('Add Account').click();
    cy.get('input[name="name"]').type('Account 2');
    cy.get('select[name="type"]').select('liability');
    cy.get('input[name="unit"]').clear().type('USD');
    cy.get('select[name="parent"]').select('Account 1 Updated (asset)');
    cy.get('button[type="submit"]').click();
    
    // Wait for API call
    cy.wait('@createAccount');
    
    // Verify child account was created with proper indentation
    cy.contains('Account 2').should('exist');
    cy.contains('liability').should('exist');
    cy.checkAndDismissToast('success', 'Account created successfully');
    
    // Verify indentation in the UI
    cy.contains('Account 2')
      .closest('tr')
      .find('div')
      .should('have.attr', 'style', 'padding-left: 20px;'); // First level indentation (20px)
    
    // Create a new account
    cy.get('button').contains('Add Account').click();
    cy.get('input[name="name"]').type('Account 3');
    cy.get('select[name="type"]').select('equity');
    cy.get('input[name="unit"]').clear().type('USD');
    cy.get('select[name="parent"]').select('Account 2 (liability)');
    cy.get('button[type="submit"]').click();
    
    // Wait for API call
    cy.wait('@createAccount');

    cy.checkAndDismissToast('success', 'Account created successfully');
    
    // Verify Account 3 was created with proper indentation
    cy.contains('Account 3').should('exist');
    cy.contains('equity').should('exist');
    
    // Verify indentation in the UI
    cy.contains('Account 3')
      .closest('tr')
      .find('div')
      .should('have.attr', 'style', 'padding-left: 40px;'); // Second level indentation (40px)
    
    // Verify that Account 1 (parent) doesn't have a delete button
    cy.contains('Account 1 Updated')
      .closest('tr')
      .find('button')
      .should('not.contain', 'Delete');
    
    // Verify that Account 2 (parent) doesn't have a delete button
    cy.contains('Account 2')
      .closest('tr')
      .find('button')
      .should('not.contain', 'Delete');
    
    // Verify that Account 3 (child) has a delete button
    cy.contains('Account 3')
      .closest('tr')
      .find('button')
      .contains('Delete')
      .should('exist');
    
    // Try to delete Account 3 but cancel
    cy.contains('Account 3')
      .closest('tr')
      .find('button')
      .contains('Delete')
      .click();
    
    // Verify confirmation modal appears
    cy.contains('Delete Account').should('exist');
    cy.contains('Are you sure you want to delete "Account 3"?').should('exist');
    
    // Click cancel
    cy.get('button').contains('Cancel').click();
    
    // Verify Account 3 still exists
    cy.contains('Account 3').should('exist');
    
    // Now delete Account 3 for real
    cy.contains('Account 3')
      .closest('tr')
      .find('button')
      .contains('Delete')
      .click();
    
    // Verify confirmation modal appears again
    cy.contains('Delete Account').should('exist');
    cy.contains('Are you sure you want to delete "Account 3"?').should('exist');
    
    // Click confirm
    cy.get('button').contains('Confirm').click();
    
    // Wait for API call
    cy.wait('@deleteAccount');
    
    // Verify Account 3 is deleted and success toast appears
    cy.contains('Account 3').should('not.exist');
    cy.contains('Account deleted successfully').should('exist');
    
    cy.get('button').contains('Add Account').click();
    cy.get('input[name="name"]').type('Account 4');
    cy.get('select[name="type"]').select('asset'); // Complementary to Account 2 (liability)
    cy.get('input[name="unit"]').clear().type('USD');
    cy.get('button[type="submit"]').click();
    
    // Wait for API call
    cy.wait('@createAccount');
    
    // Verify Account 4 was created
    cy.contains('Account 4').should('exist');
    cy.contains('asset').should('exist');
    cy.checkAndDismissToast('success', 'Account created successfully');
    
    // Add transaction between Account 2 and Account 4
    cy.intercept('POST', '**/api/transactions').as('createTransaction');
    
    cy.createTransaction('Test Transaction', 'Account 2', 'Account 4', '100', '2023-01-01');
    
    // Wait for API call
    cy.wait('@createTransaction');
    
    // Check Account 1 transaction count
    cy.contains('Account 1 Updated').closest('tr').find('td').eq(3).should('contain', '1');
    cy.contains('Account 2').closest('tr').find('td').eq(3).should('contain', '1');
    cy.contains('Account 4').closest('tr').find('td').eq(3).should('contain', '1');
    
    // TODO: Do this when we are displaying transactions under accounts
    // View Account 2 details to verify transaction
    // cy.contains('Account 2').click();
    
    // cy.contains('Test Transaction').should('exist');
    // cy.contains('100 USD').should('exist');
    // cy.contains('Debit').should('exist');
    
    // Go back to accounts list
    // cy.get('button').contains('Back to Accounts').click();
    
    // View Account 4 details to verify transaction
    // cy.contains('Account 4').click();
    
    // cy.contains('Test Transaction').should('exist');
    // cy.contains('100 USD').should('exist');
    // cy.contains('Credit').should('exist');
    
    // Go back to accounts list
    // cy.get('button').contains('Back to Accounts').click();
    
    // Check Account 4 transaction count is still 1
    cy.contains('Account 4').closest('tr').find('td').eq(3).should('contain', '1');
    cy.contains('Account 4').closest('tr').find('button').contains('Delete').click();
    cy.get('button').contains('Confirm').click();
    cy.wait('@deleteAccount');
    cy.checkAndDismissToast('success', 'Account deleted successfully');
    cy.contains('Account 4').should('not.exist');
    
    // Check transaction counts after Account 4 deletion
    cy.contains('Account 2').closest('tr').find('td').eq(3).should('contain', '1');
    
    // TODO: Do this when we are displaying transactions under accounts
    // View Account 2 details to verify transaction is now unbalanced
    // cy.contains('Account 2').click();
    
    // cy.contains('Test Transaction').should('exist');
    // cy.contains('100 USD').should('exist');
    // cy.contains('Debit').should('exist');
    // cy.contains('Unbalanced').should('exist');
    
    // Go back to accounts list
    // cy.get('button').contains('Back to Accounts').click();
    
    cy.contains('Account 2').closest('tr').find('button').contains('Edit').click();
    cy.contains('Edit Account: Account 2').should('exist');
    // Verify that the unit field is disabled
    cy.get('input[name="unit"]').should('be.disabled');
    // Try to submit the form without changing the unit
    cy.get('button[name="cancel"]').click();
    cy.contains('Edit Account: Account 2').should('not.exist');
    
    // Delete Account 2
    cy.contains('Account 2').closest('tr').find('button').contains('Delete').click();
    cy.get('button').contains('Confirm').click();
    cy.wait('@deleteAccount');
    cy.checkAndDismissToast('success', 'Account deleted successfully');
    cy.contains('Account 2').should('not.exist');
    
    // Check Account 1 transaction count (should be 0)
    cy.contains('Account 1 Updated').closest('tr').find('td').eq(3).should('contain', '0');
    
    // Delete Account 1
    cy.contains('Account 1 Updated').closest('tr').find('button').contains('Delete').click();
    cy.get('button').contains('Confirm').click();
    cy.wait('@deleteAccount');
    cy.checkAndDismissToast('success', 'Account deleted successfully');
    cy.contains('Account 1 Updated').should('not.exist');
    
    // Verify account list is empty
    cy.get('table tbody tr').should('have.length', 0);
    cy.contains('No accounts found').should('exist');
  });
});