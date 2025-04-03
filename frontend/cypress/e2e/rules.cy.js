describe('Rules Test', () => {

  beforeEach(() => {
    cy.resetDatabase();
  });

  it('should navigate to the Rules tab and show key elements', () => {
    // Intercept the API call for rules
    cy.intercept('GET', '/api/rules').as('getRules');

    // Start fresh for this test
    cy.visit('http://localhost:3000'); 

    // Use a more specific selector for the navigation link
    cy.get('nav a[href="/rules"]').click();

    // Wait for the API call to complete
    cy.wait('@getRules');

    // Now verify the heading is visible
    cy.contains('h2', 'Rules').should('be.visible');

    // Verify the main action buttons are visible
    cy.contains('button', 'Apply Rules to All Transactions').should('be.visible');
    cy.contains('button', 'Add Rule').should('be.visible');

    // Optional: Verify the table exists (more robust selectors might be needed)
    // cy.get('table').should('be.visible'); 
  });

  it('should open the Create New Rule modal', () => {
    // Intercept the API call for rules
    cy.intercept('GET', '/api/rules').as('getRules');

    // Start fresh
    cy.visit('http://localhost:3000'); 

    // Navigate to Rules page
    cy.get('nav a[href="/rules"]').click();
    cy.wait('@getRules');

    // Click the Create button
    cy.contains('button', 'Add Rule').click();

    // Verify the modal title is visible (now correctly using h3)
    cy.contains('h3', 'Create New Rule').should('be.visible');

    // Verify that NO error toast appears
    // Looks for the default react-toastify error class
    cy.get('.Toastify__toast--error').should('not.exist');

    // Verify default form field values
    cy.get('select[name="type"]').should('have.value', 'complementary');
    cy.contains('Complementary rules add balancing entries to transactions').should('be.visible');
    
    // Check that Rule Name field exists and is empty
    cy.get('input[name="name"]').should('exist').and('have.value', '');
    
    // Check Pattern field exists
    cy.get('input[placeholder="E.g., Grocery|Supermarket"]').should('exist');
    
    // Check Entry Type dropdown default
    cy.get('select[name="entryType"]').should('have.value', 'both');
    
    // Verify Source Accounts multi-select has options
    cy.get('.source-accounts-select, [name="sourceAccounts"]')
      .should('exist')
      .find('option')
      .should('have.length.at.least', 1);
    
    // Check "Automatically apply" checkbox exists and is unchecked by default
    cy.get('input[type="checkbox"]').should('exist').and('not.be.checked');
    
    // Verify destination accounts section exists with default ratio of 1
    cy.contains('Destination Accounts').scrollIntoView().should('be.visible');
    cy.get('input[placeholder="Ratio"]').should('exist').and('have.value', '1');
    
    // Check that the Save button exists
    cy.contains('button', 'Save Rule').should('be.visible');
    cy.contains('button', 'Cancel').should('be.visible');
  });

  it('should close the modal when Cancel is clicked', () => {
    // Intercept the API call for rules
    cy.intercept('GET', '/api/rules').as('getRules');
    cy.intercept('GET', '/api/accounts').as('getAccounts');

    // Start fresh
    cy.visit('http://localhost:3000'); 
    cy.get('nav a[href="/rules"]').click();
    cy.wait('@getRules');

    // Open modal
    cy.contains('button', 'Add Rule').click();
    cy.wait('@getAccounts');
    
    // Verify modal is open
    cy.contains('h3', 'Create New Rule').should('be.visible');
    
    // Click Cancel and verify the modal closes
    cy.contains('button', 'Cancel').click();
    cy.contains('h3', 'Create New Rule').should('not.exist');
  });

  it('should save a new rule with valid data', () => {
    // Intercept API calls
    cy.intercept('GET', '/api/rules').as('getRules');
    cy.intercept('GET', '/api/accounts').as('getAccounts');
    cy.intercept('POST', '/api/rules').as('createRule');

    // Start fresh
    cy.visit('http://localhost:3000'); 
    cy.get('nav a[href="/rules"]').click();
    cy.wait('@getRules');

    // Open modal
    cy.contains('button', 'Add Rule').click();
    cy.wait('@getAccounts');
    
    // Fill in the required fields
    cy.get('input[name="name"]').type('Test Rule');
    cy.get('input[placeholder="E.g., Grocery|Supermarket"]').type('TestPattern');
    
    // Select first account in the dropdown (assuming there's at least one)
    cy.get('select').eq(3).select(1); // This might need adjustment based on your DOM structure
    
    // Submit the form
    cy.contains('button', 'Save Rule').click();
    
    // Wait for the API call to complete
    cy.wait('@createRule');

    // Check that no error toast appears
    cy.get('.Toastify__toast--error').should('not.exist');
    
    // Verify the modal is closed
    cy.contains('h3', 'Create New Rule').should('not.exist');
    
    // Verify the new rule appears in the table by checking for it in a table row
    cy.get('table tbody tr')                        // Get table rows
      .contains('tr', 'Test Rule')                  // Find the one with our rule name
      .should('be.visible')                         // It should be visible
      .within(() => {
        // Verify it's the correct rule type (complementary)
        cy.contains('Comp').should('be.visible');
        
        // Verify the pattern we entered is shown
        cy.contains('TestPattern').should('be.visible');
      });
  });

  it('should show error toast when rule creation fails', () => {
    // Intercept API calls
    cy.intercept('GET', '/api/rules').as('getRules');
    cy.intercept('GET', '/api/accounts').as('getAccounts');
    
    // Mock the POST with a server error
    cy.intercept('POST', '/api/rules', {
      statusCode: 400,
      body: {
        success: false,
        message: 'Invalid rule data'
      }
    }).as('createRuleFail');

    // Start fresh
    cy.visit('http://localhost:3000'); 
    cy.get('nav a[href="/rules"]').click();
    cy.wait('@getRules');

    // Open modal
    cy.contains('button', 'Add Rule').click();
    cy.wait('@getAccounts');
    
    // Fill in minimal data but with something that would cause a server error
    cy.get('input[name="name"]').type('Invalid Rule');
    cy.get('input[placeholder="E.g., Grocery|Supermarket"]').type('(invalid[regex'); // Intentionally broken regex
    
    // Select first account in the dropdown
    cy.get('select').eq(3).select(1);
    
    // Submit the form
    cy.contains('button', 'Save Rule').click();
    
    // Wait for the failed API call
    cy.wait('@createRuleFail');
    
    // Verify error toast appears
    cy.get('.Toastify__toast--error').should('be.visible');
    
    // Modal should remain open when there's an error
    cy.contains('h3', 'Create New Rule').scrollIntoView().should('be.visible');
  });

  it('should edit an existing rule', () => {
    // Intercept API calls
    cy.intercept('GET', '/api/rules').as('getRules');
    cy.intercept('GET', '/api/accounts').as('getAccounts');
    cy.intercept('PUT', '/api/rules/*').as('updateRule');

    // Create a rule first to ensure we have something to edit
    cy.visit('http://localhost:3000'); 
    cy.get('nav a[href="/rules"]').click();
    cy.wait('@getRules');

    // Find the edit button for the first rule
    cy.get('table tbody tr')
      .first()
      .find('button[aria-label="Edit rule"]')
      .click();

    cy.wait('@getAccounts');
    
    // Verify the modal opens with title "Edit Rule"
    cy.contains('h3', 'Edit Rule').should('be.visible');
    
    // Verify form is pre-filled with rule values
    cy.get('input[name="name"]').should('not.have.value', '');
    cy.get('input[placeholder="E.g., Grocery|Supermarket"]').should('not.have.value', '');
    
    // Make changes to the rule
    const newRuleName = 'Updated Rule Name';
    const newPattern = 'NewPattern|Updated';
    
    cy.get('input[name="name"]').clear().type(newRuleName);
    cy.get('input[placeholder="E.g., Grocery|Supermarket"]').clear().type(newPattern);
    
    // Submit the form
    cy.contains('button', 'Save Rule').click();
    
    // Wait for the update API call to complete
    cy.wait('@updateRule');
    
    // Verify the modal is closed
    cy.contains('h3', 'Edit Rule').should('not.exist');
    
    // Verify the changes are reflected in the table
    cy.get('table tbody tr')
      .contains('tr', newRuleName)
      .should('be.visible')
      .within(() => {
        cy.contains(newPattern).should('be.visible');
      });
  });

}); 