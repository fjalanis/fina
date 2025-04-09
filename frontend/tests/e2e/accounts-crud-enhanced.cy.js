describe('Account CRUD Operations (Enhanced)', () => {
  beforeEach(() => {
    cy.resetDatabase();
    cy.visit('http://localhost:3000/accounts');
  });

  describe('Account Parent-Child Relationships', () => {
    // Shared setup function to create the parent account
    const setupParentAccount = () => {
      cy.intercept('POST', '**/api/accounts').as('createAccount');
      
      cy.get('button').contains('Add Account').click();
      cy.get('input[name="name"]').type('Account 1');
      cy.get('select[name="type"]').select('asset');
      cy.get('input[name="unit"]').clear().type('USD');
      cy.get('button[type="submit"]').click();
      
      // Wait for API call
      cy.wait('@createAccount');
      
      // Verify account was created
      cy.contains('Account 1').should('exist');
      cy.contains('asset').should('exist');
      cy.contains('USD').should('exist');
      cy.checkAndDismissToast('success', 'Account created successfully');
    };

    beforeEach(() => {
      setupParentAccount();
    });

    it('should create a child account with proper indentation', () => {
      cy.intercept('POST', '**/api/accounts').as('createAccount');
      
      cy.get('button').contains('Add Account').click();
      cy.get('input[name="name"]').type('Account 2');
      cy.get('select[name="type"]').select('liability');
      cy.get('input[name="unit"]').clear().type('USD');
      cy.get('select[name="parent"]').select('Account 1 (asset)');
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
      
      // Verify parent-child relationship in the UI
      cy.contains('Account 2')
        .closest('tr')
        .find('td')
        .eq(1) // Assuming the second column contains the parent info
        .should('contain', 'Account 1');
    });

    it('should create a grandchild account with proper indentation', () => {
      // First create a child account
      cy.intercept('POST', '**/api/accounts').as('createAccount');
      
      cy.get('button').contains('Add Account').click();
      cy.get('input[name="name"]').type('Account 2');
      cy.get('select[name="type"]').select('liability');
      cy.get('input[name="unit"]').clear().type('USD');
      cy.get('select[name="parent"]').select('Account 1 (asset)');
      cy.get('button[type="submit"]').click();
      
      // Wait for API call
      cy.wait('@createAccount');
      
      // Now create the grandchild account
      cy.get('button').contains('Add Account').click();
      cy.get('input[name="name"]').type('Account 3');
      cy.get('select[name="type"]').select('equity');
      cy.get('input[name="unit"]').clear().type('USD');
      cy.get('select[name="parent"]').select('Account 2 (liability)');
      cy.get('button[type="submit"]').click();
      
      // Wait for API call
      cy.wait('@createAccount');
      
      // Verify Account 3 was created with proper indentation
      cy.contains('Account 3').should('exist');
      cy.contains('equity').should('exist');
      
      // Verify indentation in the UI
      cy.contains('Account 3')
        .closest('tr')
        .find('div')
        .should('have.attr', 'style', 'padding-left: 40px;'); // Second level indentation (40px)
      
      // Verify parent-child relationship in the UI
      cy.contains('Account 3')
        .closest('tr')
        .find('td')
        .eq(1)
        .should('contain', 'Account 2');
    });

    it('should prevent deletion of parent accounts with children', () => {
      // First create a child account
      cy.intercept('POST', '**/api/accounts').as('createAccount');
      
      cy.get('button').contains('Add Account').click();
      cy.get('input[name="name"]').type('Account 2');
      cy.get('select[name="type"]').select('liability');
      cy.get('input[name="unit"]').clear().type('USD');
      cy.get('select[name="parent"]').select('Account 1 (asset)');
      cy.get('button[type="submit"]').click();
      
      // Wait for API call
      cy.wait('@createAccount');
      
      // Verify that Account 1 (parent) doesn't have a delete button
      cy.contains('Account 1')
        .closest('tr')
        .find('button')
        .should('not.contain', 'Delete');
      
      // Verify that Account 2 (child) has a delete button
      cy.contains('Account 2')
        .closest('tr')
        .find('button')
        .contains('Delete')
        .should('exist');
      
      // Try to delete Account 1 (should not be possible)
      cy.contains('Account 1')
        .closest('tr')
        .find('button')
        .contains('Edit')
        .click();
      
      // Verify that the delete button is disabled or not present in the edit modal
      cy.get('button').contains('Delete').should('not.exist');
      
      // Cancel the edit
      cy.get('button[name="cancel"]').click();
    });

    it('should handle account deletion with confirmation', () => {
      // First create a child account
      cy.intercept('POST', '**/api/accounts').as('createAccount');
      
      cy.get('button').contains('Add Account').click();
      cy.get('input[name="name"]').type('Account 2');
      cy.get('select[name="type"]').select('liability');
      cy.get('input[name="unit"]').clear().type('USD');
      cy.get('select[name="parent"]').select('Account 1 (asset)');
      cy.get('button[type="submit"]').click();
      
      // Wait for API call
      cy.wait('@createAccount');
      
      // Try to delete Account 2 but cancel
      cy.contains('Account 2')
        .closest('tr')
        .find('button')
        .contains('Delete')
        .click();
      
      // Verify confirmation modal appears
      cy.contains('Delete Account').should('exist');
      cy.contains('Are you sure you want to delete "Account 2"?').should('exist');
      
      // Click cancel
      cy.get('button').contains('Cancel').click();
      
      // Verify Account 2 still exists
      cy.contains('Account 2').should('exist');
      
      // Now delete Account 2 for real
      // Intercept the delete API call BEFORE clicking delete
      cy.intercept('DELETE', '**/api/accounts/*').as('deleteAccount');
      
      cy.contains('Account 2')
        .closest('tr')
        .find('button')
        .contains('Delete')
        .click();
      
      // Verify confirmation modal appears again
      cy.contains('Delete Account').should('exist');
      cy.contains('Are you sure you want to delete "Account 2"?').should('exist');
      
      // Click confirm
      cy.get('button').contains('Confirm').click();
      
      // Wait for API call
      cy.wait('@deleteAccount');
      
      // Verify Account 2 is deleted and success toast appears
      cy.contains('Account 2').should('not.exist');
      cy.contains('Account deleted successfully').should('exist');
      
      // Verify Account 1 now has a delete button (since it has no children)
      cy.contains('Account 1')
        .closest('tr')
        .find('button')
        .contains('Delete')
        .should('exist');
    });

    it('should handle transactions between accounts', () => {
      // Create a complementary account
      cy.intercept('POST', '**/api/accounts').as('createAccount');
      
      cy.get('button').contains('Add Account').click();
      cy.get('input[name="name"]').type('Account 2');
      cy.get('select[name="type"]').select('liability');
      cy.get('input[name="unit"]').clear().type('USD');
      cy.get('select[name="parent"]').select('Account 1 (asset)');
      cy.get('button[type="submit"]').click();
      
      // Wait for API call
      cy.wait('@createAccount');
      
      // Create a third account for transactions
      cy.get('button').contains('Add Account').click();
      cy.get('input[name="name"]').type('Account 3');
      cy.get('select[name="type"]').select('asset');
      cy.get('input[name="unit"]').clear().type('USD');
      cy.get('button[type="submit"]').click();
      
      // Wait for API call
      cy.wait('@createAccount');
      
      // Add transaction between Account 2 and Account 3
      cy.intercept('POST', '**/api/transactions').as('createTransaction');
      
      const transactionTitle = 'Test Transaction';
      cy.createTransaction(transactionTitle, 'Account 2', 'Account 3', '100', '2023-01-01');
      
      // Wait for API call
      cy.wait('@createTransaction');
      
      // Check transaction counts
      cy.contains('Account 1').closest('tr').find('td').eq(3).should('contain', '1');
      cy.contains('Account 2').closest('tr').find('td').eq(3).should('contain', '1');
      cy.contains('Account 3').closest('tr').find('td').eq(3).should('contain', '1');
      
      // Verify transaction details in account view
      cy.contains('Account 2').click();
      
      // Verify transaction details - note that the command adds "(Debit)" to the description
      cy.contains(`${transactionTitle} (Debit)`).should('exist');
      cy.contains('100 USD').should('exist');
      cy.contains('Debit').should('exist');
      
      // Go back to accounts list
      cy.contains('a', 'Back to List').click();
      
      // View Account 3 details to verify transaction
      cy.contains('Account 3').click();
      
      // Verify transaction details - note that the command adds "(Credit)" to the description
      cy.contains(`${transactionTitle} (Credit)`).should('exist');
      cy.contains('100 USD').should('exist');
      cy.contains('Credit').should('exist');
      
      // Go back to accounts list
      cy.contains('a', 'Back to List').click();
    });

    it('should handle account editing with disabled unit field', () => {
      // Create a child account
      cy.intercept('POST', '**/api/accounts').as('createAccount');
      
      cy.get('button').contains('Add Account').click();
      cy.get('input[name="name"]').type('Account 2');
      cy.get('select[name="type"]').select('liability');
      cy.get('input[name="unit"]').clear().type('USD');
      cy.get('select[name="parent"]').select('Account 1 (asset)');
      cy.get('button[type="submit"]').click();
      
      // Wait for API call
      cy.wait('@createAccount');
      
      // Edit Account 2
      cy.contains('Account 2').closest('tr').find('button').contains('Edit').click();
      cy.contains('Edit Account: Account 2').should('exist');
      
      // Verify that the unit field is disabled
      cy.get('input[name="unit"]').should('be.disabled');
      
      // Verify that the parent field is disabled
      cy.get('select[name="parent"]').should('be.disabled');
      
      // Verify that the parent field contains the correct value
      cy.get('select[name="parent"]').should('have.value', 'Account 1 (asset)');
      
      // Try to submit the form without changing the unit
      cy.get('button[name="cancel"]').click();
      cy.contains('Edit Account: Account 2').should('not.exist');
    });
    
    it('should handle complex account hierarchy with multiple levels', () => {
      // Create a child account
      cy.intercept('POST', '**/api/accounts').as('createAccount');
      
      cy.get('button').contains('Add Account').click();
      cy.get('input[name="name"]').type('Account 2');
      cy.get('select[name="type"]').select('liability');
      cy.get('input[name="unit"]').clear().type('USD');
      cy.get('select[name="parent"]').select('Account 1 (asset)');
      cy.get('button[type="submit"]').click();
      
      // Wait for API call
      cy.wait('@createAccount');
      
      // Create a grandchild account
      cy.get('button').contains('Add Account').click();
      cy.get('input[name="name"]').type('Account 3');
      cy.get('select[name="type"]').select('equity');
      cy.get('input[name="unit"]').clear().type('USD');
      cy.get('select[name="parent"]').select('Account 2 (liability)');
      cy.get('button[type="submit"]').click();
      
      // Wait for API call
      cy.wait('@createAccount');
      
      // Create a great-grandchild account
      cy.get('button').contains('Add Account').click();
      cy.get('input[name="name"]').type('Account 4');
      cy.get('select[name="type"]').select('asset');
      cy.get('input[name="unit"]').clear().type('USD');
      cy.get('select[name="parent"]').select('Account 3 (equity)');
      cy.get('button[type="submit"]').click();
      
      // Wait for API call
      cy.wait('@createAccount');
      
      // Verify the hierarchy is displayed correctly
      cy.contains('Account 1').should('exist');
      cy.contains('Account 2').should('exist');
      cy.contains('Account 3').should('exist');
      cy.contains('Account 4').should('exist');
      
      // Verify indentation levels
      cy.contains('Account 2')
        .closest('tr')
        .find('div')
        .should('have.attr', 'style', 'padding-left: 20px;');
      
      cy.contains('Account 3')
        .closest('tr')
        .find('div')
        .should('have.attr', 'style', 'padding-left: 40px;');
      
      cy.contains('Account 4')
        .closest('tr')
        .find('div')
        .should('have.attr', 'style', 'padding-left: 60px;');
      
      // Verify parent-child relationships
      cy.contains('Account 2')
        .closest('tr')
        .find('td')
        .eq(1)
        .should('contain', 'Account 1');
      
      cy.contains('Account 3')
        .closest('tr')
        .find('td')
        .eq(1)
        .should('contain', 'Account 2');
      
      cy.contains('Account 4')
        .closest('tr')
        .find('td')
        .eq(1)
        .should('contain', 'Account 3');
      
      // Verify delete buttons
      cy.contains('Account 1')
        .closest('tr')
        .find('button')
        .should('not.contain', 'Delete');
      
      cy.contains('Account 2')
        .closest('tr')
        .find('button')
        .should('not.contain', 'Delete');
      
      cy.contains('Account 3')
        .closest('tr')
        .find('button')
        .should('not.contain', 'Delete');
      
      cy.contains('Account 4')
        .closest('tr')
        .find('button')
        .contains('Delete')
        .should('exist');
    });
    
    it('should handle account editing with proper validation', () => {
      // Create a child account
      cy.intercept('POST', '**/api/accounts').as('createAccount');
      
      cy.get('button').contains('Add Account').click();
      cy.get('input[name="name"]').type('Account 2');
      cy.get('select[name="type"]').select('liability');
      cy.get('input[name="unit"]').clear().type('USD');
      cy.get('select[name="parent"]').select('Account 1 (asset)');
      cy.get('button[type="submit"]').click();
      
      // Wait for API call
      cy.wait('@createAccount');
      
      // Edit Account 2
      cy.contains('Account 2').closest('tr').find('button').contains('Edit').click();
      cy.contains('Edit Account: Account 2').should('exist');
      
      // Verify that the edit modal contains the expected values
      cy.get('input[name="name"]').should('have.value', 'Account 2');
      cy.get('select[name="type"]').should('have.value', 'liability');
      cy.get('input[name="unit"]').should('have.value', 'USD');
      cy.get('select[name="parent"]').should('have.value', 'Account 1 (asset)');
      
      // Try to submit with empty name
      cy.get('input[name="name"]').clear();
      cy.get('button[type="submit"]').click();
      
      // Verify validation error
      cy.get('input[name="name"]').should('have.class', 'border-red-500');
      cy.contains('Name is required').should('exist');
      
      // Fix the name and submit
      cy.get('input[name="name"]').type('Account 2 Updated');
      
      // Intercept the update API call BEFORE clicking submit
      cy.intercept('PUT', '**/api/accounts/*').as('updateAccount');
      
      cy.get('button[type="submit"]').click();
      
      // Wait for API call
      cy.wait('@updateAccount');
      
      // Verify changes were applied
      cy.contains('Account 2 Updated').should('exist');
      cy.checkAndDismissToast('success', 'Account updated successfully');
    });
    
    it('should handle account deletion with cascading effects', () => {
      // Create a child account
      cy.intercept('POST', '**/api/accounts').as('createAccount');
      
      cy.get('button').contains('Add Account').click();
      cy.get('input[name="name"]').type('Account 2');
      cy.get('select[name="type"]').select('liability');
      cy.get('input[name="unit"]').clear().type('USD');
      cy.get('select[name="parent"]').select('Account 1 (asset)');
      cy.get('button[type="submit"]').click();
      
      // Wait for API call
      cy.wait('@createAccount');
      
      // Create a grandchild account
      cy.get('button').contains('Add Account').click();
      cy.get('input[name="name"]').type('Account 3');
      cy.get('select[name="type"]').select('equity');
      cy.get('input[name="unit"]').clear().type('USD');
      cy.get('select[name="parent"]').select('Account 2 (liability)');
      cy.get('button[type="submit"]').click();
      
      // Wait for API call
      cy.wait('@createAccount');
      
      // Add a transaction between Account 2 and Account 3
      cy.intercept('POST', '**/api/transactions').as('createTransaction');
      
      const transactionTitle = 'Test Transaction';
      cy.createTransaction(transactionTitle, 'Account 2', 'Account 3', '100', '2023-01-01');
      
      // Wait for API call
      cy.wait('@createTransaction');
      
      // Delete Account 2
      cy.intercept('DELETE', '**/api/accounts/*').as('deleteAccount');
      
      cy.contains('Account 2')
        .closest('tr')
        .find('button')
        .contains('Delete')
        .click();
      
      // Verify confirmation modal appears
      cy.contains('Delete Account').should('exist');
      cy.contains('Are you sure you want to delete "Account 2"?').should('exist');
      cy.contains('This account has children and transactions').should('exist');
      
      // Click confirm
      cy.get('button').contains('Confirm').click();
      
      // Wait for API call
      cy.wait('@deleteAccount');
      
      // Verify Account 2 and Account 3 are deleted
      cy.contains('Account 2').should('not.exist');
      cy.contains('Account 3').should('not.exist');
      cy.contains('Account deleted successfully').should('exist');
      
      // Verify Account 1 now has a delete button (since it has no children)
      cy.contains('Account 1')
        .closest('tr')
        .find('button')
        .contains('Delete')
        .should('exist');
    });
  });
});