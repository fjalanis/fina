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
      cy.visit('/accounts');
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
      cy.visit(`/${currentPath}`);
    }
  });
});

Cypress.Commands.add('createRule', (name, pattern, accountName) => {
  const ruleData = {
    name: name,
    pattern: pattern,
    accountName: accountName
  };
  
  cy.location('pathname').then(currentPath => {
    if (currentPath !== '/rules') {
      cy.visit('/rules');
    }

    cy.get('button').contains('Add Rule').click();
    cy.get('input[name="name"]').type(ruleData.name);
    cy.get('input[placeholder="E.g., Grocery|Supermarket"]').type(ruleData.pattern);
    cy.get('select').select(ruleData.accountName);
    cy.get('button[type="submit"]').click();

    // Wait for the rule to be created and verify it exists in the list
    cy.contains(ruleData.name).should('exist');

    // Return to original page if different from rules
    if (currentPath !== '/rules') {
      cy.visit(`/${currentPath}`);
    }
  });
});

Cypress.Commands.add('resetDatabase', () => {
  cy.request('POST', '/api/reset-db').then((response) => {
    if (response.body.data.assetPrices && response.body.data.assetPrices.length > 0) {
      cy.log('Warning: Database still contains asset prices after reset');
    }
  });
});

Cypress.Commands.add('getAssetPrices', () => {
  cy.request('GET', '/api/asset-prices').then((response) => {
    cy.log('Current asset prices in database:', response.body.data.length);
    if (response.body.data.length > 0) {
      cy.log('First asset price:', response.body.data[0]);
    }
    return response.body.data;
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
    
  cy.request('GET', 'http://localhost:5000/api/rules')
    .then((response) => {
      cy.log('Current rules in database:', response.body.data.length);
      if (response.body.data.length > 0) {
        cy.log('First rule:', response.body.data[0]);
      }
    });
    
  cy.request('GET', 'http://localhost:5000/api/asset-prices')
    .then((response) => {
      cy.log('Current asset prices in database:', response.body.data.length);
      if (response.body.data.length > 0) {
        cy.log('First asset price:', response.body.data[0]);
      }
    });
});

// Command to create a transaction
Cypress.Commands.add('createTransaction', (nameOrData, fromAccount, toAccount, amount, date) => {
  // Handle both object and positional parameters
  const transactionData = typeof nameOrData === 'object' ? nameOrData : {
    description: nameOrData,
    fromAccount: fromAccount,
    toAccount: toAccount,
    amount: amount || '100',
    date: date || new Date().toISOString().split('T')[0]
  };

  // Save current URL
  cy.location('pathname').then(currentPath => {
    // Navigate to transactions page if not already there
    if (currentPath !== '/transactions') {
      cy.visit('/transactions');
    }

    // Intercept the accounts API call
    cy.intercept('GET', '**/api/accounts').as('getAccounts');

    // Create the transaction
    cy.get('button').contains('Add Transaction').click();
    
    // Wait for accounts to be loaded
    cy.wait('@getAccounts');
    
    // Fill in the transaction details
    cy.get('input[name="description"]').eq(0).type(transactionData.description);
    cy.get('input[name="date"]').type(transactionData.date);
    
    // Fill in the first entry (debit)
    cy.get('input[name="description"]').eq(1).type(`${transactionData.description} (Debit)`);
    cy.get('input[name="amount"]').eq(0).type(transactionData.amount);
    cy.get('select[name="type"]').eq(0).select('debit');
    cy.get('select[name="account"]').eq(0).select(transactionData.fromAccount);
    
    // Fill in the second entry (credit)
    cy.get('input[name="description"]').eq(2).type(`${transactionData.description} (Credit)`);
    cy.get('input[name="amount"]').eq(1).type(transactionData.amount);
    cy.get('select[name="type"]').eq(1).select('credit');
    cy.get('select[name="account"]').eq(1).select(transactionData.toAccount);
    
    // Submit the form
    cy.get('button').contains('Create Transaction').click();
    
    // Wait for the transaction to be created and verify it exists in the list
    cy.contains(transactionData.description).should('exist');
    
    // Check for success toast with a more flexible approach
    cy.checkAndDismissToast('success', 'Transaction created successfully');
    
    // Return to original page if different from transactions
    if (currentPath !== '/transactions') {
      cy.visit(`/${currentPath}`);
    }
  });
});

Cypress.Commands.add('checkAndDismissToast', (type, message) => {
  // Check for toast with specific type (success/error) and message
  if (message) {
    cy.contains(message).should('exist');
  }
  
  // Find and click the close button on the toast
  cy.get('.Toastify__toast')
    .should('exist')
    .then($toasts => {
      // If we're looking for a specific message, find that toast
      if (message) {
        $toasts = $toasts.filter(`:contains("${message}")`);
      }
      // If we're looking for a specific type, filter by the class
      if (type === 'success') {
        $toasts = $toasts.filter('.Toastify__toast--success');
      } else if (type === 'error') {
        $toasts = $toasts.filter('.Toastify__toast--error');
      }
      // Click close button on all matching toasts
      $toasts.find('.Toastify__close-button').click();
    });
}); 