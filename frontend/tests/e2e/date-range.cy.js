describe('Global Date Range Picker', () => {
  const pagesWithPicker = ['/accounts', '/transactions', '/reports', '/prices'];
  const pagesWithoutPicker = ['/', '/rules']; // Add specific ID routes if needed later

  beforeEach(() => {
    // Optional: Reset database or setup initial state if needed for specific tests
    // cy.resetDatabase(); 
  });

  it('should display the date picker only on relevant pages', () => {
    // Check pages WITH the picker
    pagesWithPicker.forEach(page => {
      cy.visit(page);
      cy.get('nav').within(() => { // Assuming picker is within the nav element
        cy.get('input#startDate').should('exist');
        cy.get('input#endDate').should('exist');
      });
      cy.log(`Picker found on ${page}`);
    });

    // Check pages WITHOUT the picker
    pagesWithoutPicker.forEach(page => {
      cy.visit(page);
      cy.get('nav').within(() => {
        cy.get('input#startDate').should('not.exist');
        cy.get('input#endDate').should('not.exist');
      });
       cy.log(`Picker NOT found on ${page}`);
    });
    
    // Also check a detail page (needs an existing account ID or mock)
    // Example: Create an account first if needed
    cy.createAccount('Detail Date Test', 'asset', 'USD').then(account => {
        cy.visit(`/accounts/${account._id}`); // Use the actual created account ID
        cy.get('nav').within(() => {
          cy.get('input#startDate').should('not.exist');
          cy.get('input#endDate').should('not.exist');
        });
        cy.log(`Picker NOT found on /accounts/${account._id}`);
    });
  });

  it('should update URL search parameters when dates are changed', () => {
    const testStartDate = '2023-04-01';
    const testEndDate = '2023-04-30';

    cy.visit('/accounts'); // Start on a page with the picker

    // Change start date
    cy.get('nav input#startDate').clear().type(testStartDate);
    cy.url().should('include', `startDate=${testStartDate}`);
    
    // Change end date (ensure start date persists)
    cy.get('nav input#endDate').clear().type(testEndDate);
    cy.url().should('include', `startDate=${testStartDate}`);
    cy.url().should('include', `endDate=${testEndDate}`);
  });

  it('should persist the date range when navigating between relevant pages', () => {
    const testStartDate = '2023-05-10';
    const testEndDate = '2023-05-25';

    // Set initial date on Accounts page
    cy.visit('/accounts');
    cy.get('nav input#startDate').clear().type(testStartDate);
    cy.get('nav input#endDate').clear().type(testEndDate).blur(); // blur to ensure update if needed
    cy.url().should('include', `startDate=${testStartDate}`);
    cy.url().should('include', `endDate=${testEndDate}`);

    // Navigate to Transactions
    cy.get('nav').contains('a', 'Transactions').click();
    cy.url().should('include', '/transactions'); // Wait for navigation
    cy.url().should('include', `startDate=${testStartDate}`);
    cy.url().should('include', `endDate=${testEndDate}`);
    // Check picker inputs still have the value
    cy.get('nav input#startDate').should('have.value', testStartDate);
    cy.get('nav input#endDate').should('have.value', testEndDate);
     cy.log(`Dates persisted on /transactions`);

    // Navigate to Reports
    cy.get('nav').contains('a', 'Reports').click();
    cy.url().should('include', '/reports');
    cy.url().should('include', `startDate=${testStartDate}`);
    cy.url().should('include', `endDate=${testEndDate}`);
    cy.get('nav input#startDate').should('have.value', testStartDate);
    cy.get('nav input#endDate').should('have.value', testEndDate);
    cy.log(`Dates persisted on /reports`);

    // Navigate to Prices
    cy.get('nav').contains('a', 'Prices').click();
    cy.url().should('include', '/prices');
    cy.url().should('include', `startDate=${testStartDate}`);
    cy.url().should('include', `endDate=${testEndDate}`);
    cy.get('nav input#startDate').should('have.value', testStartDate);
    cy.get('nav input#endDate').should('have.value', testEndDate);
    cy.log(`Dates persisted on /prices`);

    // Navigate back to Accounts (ensure it's still there)
    cy.get('nav').contains('a', 'Accounts').click();
    cy.url().should('include', '/accounts');
    cy.url().should('include', `startDate=${testStartDate}`);
    cy.url().should('include', `endDate=${testEndDate}`);
    cy.get('nav input#startDate').should('have.value', testStartDate);
    cy.get('nav input#endDate').should('have.value', testEndDate);
    cy.log(`Dates persisted on back to /accounts`);
  });

  // Optional: Test data re-fetch on date change
  it('should re-fetch account data when date range changes', () => {
    cy.intercept('GET', '/api/accounts/hierarchy*').as('getAccounts');

    cy.visit('/accounts');
    cy.wait('@getAccounts'); // Wait for initial load

    // Change date and trigger re-fetch
    const newStartDate = '2024-01-01';
    cy.get('nav input#startDate').clear().type(newStartDate).blur(); 

    // Check that the API was called again with the new start date
    cy.wait('@getAccounts').its('request.url').should('include', `startDate=${newStartDate}`);
  });

}); 