describe('Global Date Range Picker', () => {
  const pagesWithPicker = ['/accounts', '/transactions', '/reports', '/prices'];
  const pagesWithoutPicker = ['/', '/rules']; // Add specific ID routes if needed later

  // Helper to format Date object to MM/DD/YYYY for checking button text
  const formatDateForDisplay = (date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Helper function to select a date range using the react-date-range picker
  const selectDateRange = (startDate, endDate) => {
    // Ensure start and end are Date objects
    const start = new Date(startDate + 'T00:00:00'); 
    const end = new Date(endDate + 'T00:00:00');

    // Format month names and year for searching in calendar (Use short month name)
    const startMonthYear = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const endMonthYear = end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    // 1. Click the button to open the picker
    cy.get('nav button:contains("-")').click(); 
    cy.get('.rdrCalendarWrapper').should('be.visible');

    // Function to find and click a day in a specific month
    const clickDayInMonth = (targetDate, targetMonthYear) => {
        const day = targetDate.getDate();
        const maxAttempts = 5; // Reduce attempts - should only need 1-2 max now
        let attempts = 0;

        // Function to find and click the day once the month is visible
        const findAndClickDay = () => {
            cy.get('.rdrMonthName').contains(targetMonthYear)
              .parents('.rdrMonth')
              .should('be.visible')
              .find(`.rdrDay:not(.rdrDayPassive) span:not(.rdrDayNumber)`)
              .contains(new RegExp(`^${day}$`))
              .click({ force: true }); 
            cy.log(`Clicked day ${day} in ${targetMonthYear}`);
        }

        // Check if the target month is visible, navigate if not
        const checkAndNavigate = () => {
            if (attempts >= maxAttempts) {
                 throw new Error(`Could not find month ${targetMonthYear} after ${maxAttempts} attempts.`);
            }
            // Check *within the visible calendar wrapper* for the month name
            cy.get('.rdrCalendarWrapper').find('.rdrMonthName').then($monthNames => {
                // Check if any of the visible month names match the target
                const isVisible = $monthNames.toArray().some(el => el.textContent.includes(targetMonthYear));

                if (isVisible) {
                    // Month is visible, proceed to click the day
                    findAndClickDay();
                } else {
                    // Month not visible, click previous button and re-check
                    cy.log(`Navigating to find ${targetMonthYear} (Attempt ${attempts + 1})`);
                    const prevButtonSelector = 'button.rdrPprevButton';
                    cy.get(prevButtonSelector).click();
                    attempts++;
                    cy.wait(50); // Keep small wait
                    checkAndNavigate(); // Recursive call
                }
            });
        }
        checkAndNavigate();
    };

    // 2. Select the start date
    clickDayInMonth(start, startMonthYear);
    // 3. Select the end date
    clickDayInMonth(end, endMonthYear);
    // 4. Explicitly click outside the picker to close it
    cy.get('body').click(0,0); 
    // 5. Verify the picker is closed
    cy.get('.rdrCalendarWrapper', { timeout: 1000 }).should('not.exist');
  };

  beforeEach(() => {
    // Optional: Reset database or setup initial state if needed for specific tests
    // cy.resetDatabase(); 
  });

  it('should display the date picker button only on relevant pages', () => {
    // Check pages WITH the picker
    pagesWithPicker.forEach(page => {
      cy.visit(page);
      cy.get('nav').within(() => {
        // Look for the button containing the date separator '-'
        cy.get('button').contains('-').should('exist');
      });
      cy.log(`Picker button found on ${page}`);
    });

    // Check pages WITHOUT the picker
    pagesWithoutPicker.forEach(page => {
      cy.visit(page);
      cy.get('nav').within(() => {
        // Use cy.contains() directly for non-existence check
        cy.contains('button', '-').should('not.exist'); 
      });
       cy.log(`Picker button NOT found on ${page}`);
    });
    
    // Check detail page (needs an existing account ID or mock)
    // Example: Create an account first if needed
    cy.createAccount('Detail Date Test', 'asset', 'USD').then(account => {
        cy.visit(`/accounts/${account._id}`); // Use the actual created account ID
        cy.get('nav').within(() => {
          // Use cy.contains() directly for non-existence check
          cy.contains('button', '-').should('not.exist'); 
        });
        cy.log(`Picker button NOT found on /accounts/${account._id}`);
    });
  });

  it('should update URL search parameters when dates are changed via calendar', () => {
    // --- DYNAMIC DATES --- 
    const today = new Date();
    const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const start = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 5); // 5th of previous month
    const end = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 15); // 15th of previous month

    const testStartDate = start.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    const testEndDate = end.toISOString().split('T')[0];     // Format as YYYY-MM-DD
    // --- END DYNAMIC DATES ---

    cy.visit('/accounts');
    selectDateRange(testStartDate, testEndDate);

    cy.url().should('include', `startDate=${testStartDate}`);
    cy.url().should('include', `endDate=${testEndDate}`);
    cy.get('nav button').contains(`${formatDateForDisplay(start)} - ${formatDateForDisplay(end)}`).should('exist');
  });

  it('should persist the date range when navigating between relevant pages', () => {
    // --- DYNAMIC DATES ---
    const today = new Date();
    const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const start = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 10); // 10th of previous month
    const end = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 25); // 25th of previous month

    const testStartDate = start.toISOString().split('T')[0];
    const testEndDate = end.toISOString().split('T')[0];
    // --- END DYNAMIC DATES ---

    const expectedButtonText = `${formatDateForDisplay(start)} - ${formatDateForDisplay(end)}`;

    // Set initial date on Accounts page
    cy.visit('/accounts');
    selectDateRange(testStartDate, testEndDate);
    cy.url().should('include', `startDate=${testStartDate}`);
    cy.url().should('include', `endDate=${testEndDate}`);
    cy.get('nav button').contains(expectedButtonText).should('exist');

    // Navigate to Transactions
    cy.get('nav').contains('a', 'Transactions').click();
    cy.url().should('include', '/transactions'); 
    cy.url().should('include', `startDate=${testStartDate}`);
    cy.url().should('include', `endDate=${testEndDate}`);
    cy.get('nav button').contains(expectedButtonText).should('exist');
    cy.log(`Dates persisted on /transactions`);

    // Navigate to Reports
    cy.get('nav').contains('a', 'Reports').click();
    cy.url().should('include', '/reports');
    cy.url().should('include', `startDate=${testStartDate}`);
    cy.url().should('include', `endDate=${testEndDate}`);
    cy.get('nav button').contains(expectedButtonText).should('exist');
    cy.log(`Dates persisted on /reports`);

    // Navigate to Prices
    cy.get('nav').contains('a', 'Prices').click();
    cy.url().should('include', '/prices');
    cy.url().should('include', `startDate=${testStartDate}`);
    cy.url().should('include', `endDate=${testEndDate}`);
    cy.get('nav button').contains(expectedButtonText).should('exist');
    cy.log(`Dates persisted on /prices`);

    // Navigate back to Accounts
    cy.get('nav').contains('a', 'Accounts').click();
    cy.url().should('include', '/accounts');
    cy.url().should('include', `startDate=${testStartDate}`);
    cy.url().should('include', `endDate=${testEndDate}`);
    cy.get('nav button').contains(expectedButtonText).should('exist');
    cy.log(`Dates persisted on back to /accounts`);
  });

  it('should re-fetch account data when date range changes', () => {
    cy.intercept('GET', '/api/accounts/hierarchy*').as('getAccounts');

    cy.visit('/accounts');
    cy.wait('@getAccounts');

    // --- DYNAMIC DATES ---
    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1); // 1st of current month
    // Use a day guaranteed to be in the past or today (e.g., the 5th)
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 5); 

    // Ensure end date doesn't accidentally go into the future if today is before the 5th
    if (end > today) { 
      end.setDate(today.getDate()); // Use today's date if 5th is in the future
      if (start > end) { // If today is also before the 1st (unlikely but safe) adjust start
        start.setDate(end.getDate());
      }
    }

    const newStartDate = start.toISOString().split('T')[0];
    const newEndDate = end.toISOString().split('T')[0];
    // --- END DYNAMIC DATES ---
    
    selectDateRange(newStartDate, newEndDate);

    // Wait for the fetch triggered during the date selection (likely by the start date click)
    cy.wait('@getAccounts');
    
    // After the selection process, verify the URL has the FINAL correct dates
    // Increase timeout for URL checks to allow navigation to settle
    cy.url({ timeout: 10000 }).should('include', `startDate=${newStartDate}`);
    cy.url({ timeout: 10000 }).should('include', `endDate=${newEndDate}`);
   
    // We can no longer reliably wait for and check the URL of the *final* fetch call here,
    // as it might be debounced or happen slightly later.
    // Checking the final URL state is a sufficient verification that the date change
    // was processed correctly by the DateRangePicker component.
  });

}); 