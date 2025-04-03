// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

// Command to create an account
Cypress.Commands.add('createAccount', (nameOrData, type, unit) => {
  // Handle both object and positional parameters
  const accountData = typeof nameOrData === 'object' ? nameOrData : {
    name: nameOrData,
    type: type || 'asset',
    unit: unit || 'USD'
  };

  // Save current URL
  cy.location('pathname').then(currentPath => {
    // Navigate to accounts page if not already there
    if (currentPath !== '/accounts') {
      cy.visit('http://localhost:3000/accounts');
    }

    // Create the account
    cy.get('button').contains('Add Account').click();
    
    // Fill in the form fields
    cy.get('input[name="name"]').type(accountData.name);
    cy.get('select[name="type"]').select(accountData.type || 'asset');
    cy.get('input[name="unit"]').clear().type(accountData.unit || 'USD');
    if (accountData.description) {
      cy.get('textarea[name="description"]').type(accountData.description);
    }
    if (accountData.parent) {
      cy.get('select[name="parent"]').select(accountData.parent);
    }
    
    // Submit the form
    cy.get('button[type="submit"]').click();
    
    // Wait for the account to be created and verify it exists in the list
    cy.contains(accountData.name).should('exist');

    // Return to original page if different from accounts
    if (currentPath !== '/accounts') {
      cy.visit(`http://localhost:3000${currentPath}`);
    }
  });
});

Cypress.Commands.add('resetDatabase', () => {
  cy.log('Starting database reset...');
  cy.exec('cd ../.. && node scripts/clearTestDB.js', { failOnNonZeroExit: false })
    .then((result) => {
      cy.log('Database reset command output:', result.stdout);
      if (result.stderr) {
        cy.log('Database reset errors:', result.stderr);
      }
      if (result.code !== 0) {
        cy.log('Database reset failed with exit code:', result.code);
      }
    });
});

Cypress.Commands.add('checkDatabaseState', () => {
  cy.request('GET', 'http://localhost:5000/api/transactions')
    .then((response) => {
      cy.log('Current transactions in database:', response.body.data.length);
      if (response.body.data.length > 0) {
        cy.log('First transaction:', response.body.data[0]);
      }
    });
  
  cy.request('GET', 'http://localhost:5000/api/accounts')
    .then((response) => {
      cy.log('Current accounts in database:', response.body.data.length);
      if (response.body.data.length > 0) {
        cy.log('First account:', response.body.data[0]);
      }
    });
});