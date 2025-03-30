const mongoose = require('mongoose');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const EntryLine = require('../models/EntryLine');
const connectDB = require('../config/database');
const logger = require('../config/logger');

// Clear all existing data
const clearAllData = async () => {
  logger.info('Clearing existing data...');
  await EntryLine.deleteMany({});
  await Transaction.deleteMany({});
  await Account.deleteMany({});
  logger.info('All data cleared');
};

// Create account hierarchy
const createAccountHierarchy = async () => {
  logger.info('Creating account hierarchy...');
  
  // Asset accounts
  const assetParent = await Account.create({
    name: 'Assets',
    type: 'asset',
    description: 'All assets'
  });
  
  const bankAccountsParent = await Account.create({
    name: 'Bank Accounts',
    type: 'asset',
    description: 'All bank accounts',
    parent: assetParent._id
  });
  
  const checkingAccount = await Account.create({
    name: 'Checking Account',
    type: 'asset',
    description: 'Primary checking account',
    parent: bankAccountsParent._id
  });
  
  const savingsAccount = await Account.create({
    name: 'Savings Account',
    type: 'asset',
    description: 'Emergency fund',
    parent: bankAccountsParent._id
  });

  const collegeAccount = await Account.create({
    name: 'College Fund',
    type: 'asset',
    description: 'Kids college savings',
    parent: bankAccountsParent._id
  });
  
  const realEstateParent = await Account.create({
    name: 'Real Estate',
    type: 'asset',
    description: 'All real estate assets',
    parent: assetParent._id
  });
  
  const mainHome = await Account.create({
    name: 'Primary Residence',
    type: 'asset',
    description: 'Family home',
    parent: realEstateParent._id
  });
  
  // Liability accounts
  const liabilityParent = await Account.create({
    name: 'Liabilities',
    type: 'liability',
    description: 'All liabilities'
  });
  
  const mortgageParent = await Account.create({
    name: 'Mortgages',
    type: 'liability',
    description: 'Home loans',
    parent: liabilityParent._id
  });
  
  const primaryMortgage = await Account.create({
    name: 'Primary Home Mortgage',
    type: 'liability',
    description: 'Mortgage on primary residence',
    parent: mortgageParent._id
  });
  
  const creditCardsParent = await Account.create({
    name: 'Credit Cards',
    type: 'liability',
    description: 'All credit cards',
    parent: liabilityParent._id
  });
  
  const visaCard = await Account.create({
    name: 'Visa Credit Card',
    type: 'liability',
    description: 'Primary credit card',
    parent: creditCardsParent._id
  });
  
  const amexCard = await Account.create({
    name: 'Amex Credit Card',
    type: 'liability',
    description: 'Secondary credit card',
    parent: creditCardsParent._id
  });
  
  const autoloanParent = await Account.create({
    name: 'Auto Loans',
    type: 'liability',
    description: 'Car loans',
    parent: liabilityParent._id
  });
  
  const carLoan = await Account.create({
    name: 'Car Loan',
    type: 'liability',
    description: 'Family SUV loan',
    parent: autoloanParent._id
  });
  
  // Income accounts
  const incomeParent = await Account.create({
    name: 'Income',
    type: 'income',
    description: 'All income sources'
  });
  
  const salaryParent = await Account.create({
    name: 'Salary Income',
    type: 'income',
    description: 'Employment income',
    parent: incomeParent._id
  });
  
  const primarySalary = await Account.create({
    name: 'Primary Job',
    type: 'income',
    description: 'Main employment income',
    parent: salaryParent._id
  });
  
  const secondarySalary = await Account.create({
    name: 'Secondary Job',
    type: 'income',
    description: 'Part-time income',
    parent: salaryParent._id
  });
  
  const investmentIncome = await Account.create({
    name: 'Investment Income',
    type: 'income',
    description: 'Dividends and interest',
    parent: incomeParent._id
  });
  
  // Expense accounts
  const expenseParent = await Account.create({
    name: 'Expenses',
    type: 'expense',
    description: 'All expenses'
  });
  
  const housingExpense = await Account.create({
    name: 'Housing',
    type: 'expense',
    description: 'Housing-related expenses',
    parent: expenseParent._id
  });
  
  const mortgageExpense = await Account.create({
    name: 'Mortgage Payment',
    type: 'expense',
    description: 'Monthly mortgage payment',
    parent: housingExpense._id
  });
  
  const utilities = await Account.create({
    name: 'Utilities',
    type: 'expense',
    description: 'Utility bills',
    parent: housingExpense._id
  });
  
  const electricity = await Account.create({
    name: 'Electricity',
    type: 'expense',
    description: 'Electric bill',
    parent: utilities._id
  });
  
  const water = await Account.create({
    name: 'Water & Sewer',
    type: 'expense',
    description: 'Water and sewer services',
    parent: utilities._id
  });
  
  const internet = await Account.create({
    name: 'Internet & Cable',
    type: 'expense',
    description: 'Internet and TV services',
    parent: utilities._id
  });
  
  const cellPhone = await Account.create({
    name: 'Cell Phone',
    type: 'expense',
    description: 'Mobile phone services',
    parent: utilities._id
  });
  
  const foodExpense = await Account.create({
    name: 'Food',
    type: 'expense',
    description: 'All food expenses',
    parent: expenseParent._id
  });
  
  const groceries = await Account.create({
    name: 'Groceries',
    type: 'expense',
    description: 'Grocery shopping',
    parent: foodExpense._id
  });
  
  const diningOut = await Account.create({
    name: 'Dining Out',
    type: 'expense',
    description: 'Restaurants and takeout',
    parent: foodExpense._id
  });
  
  const transportationExpense = await Account.create({
    name: 'Transportation',
    type: 'expense',
    description: 'All transportation expenses',
    parent: expenseParent._id
  });
  
  const carPayment = await Account.create({
    name: 'Car Payment',
    type: 'expense',
    description: 'Monthly car payment',
    parent: transportationExpense._id
  });
  
  const gasoline = await Account.create({
    name: 'Gasoline',
    type: 'expense',
    description: 'Fuel for vehicles',
    parent: transportationExpense._id
  });
  
  const carMaintenance = await Account.create({
    name: 'Car Maintenance',
    type: 'expense',
    description: 'Vehicle repairs and maintenance',
    parent: transportationExpense._id
  });
  
  const insuranceExpense = await Account.create({
    name: 'Insurance',
    type: 'expense',
    description: 'All insurance expenses',
    parent: expenseParent._id
  });
  
  const healthInsurance = await Account.create({
    name: 'Health Insurance',
    type: 'expense',
    description: 'Medical insurance',
    parent: insuranceExpense._id
  });
  
  const autoInsurance = await Account.create({
    name: 'Auto Insurance',
    type: 'expense',
    description: 'Car insurance',
    parent: insuranceExpense._id
  });
  
  const homeInsurance = await Account.create({
    name: 'Home Insurance',
    type: 'expense',
    description: 'Homeowner\'s insurance',
    parent: insuranceExpense._id
  });
  
  const healthcareExpense = await Account.create({
    name: 'Healthcare',
    type: 'expense',
    description: 'Medical expenses',
    parent: expenseParent._id
  });
  
  const doctorVisits = await Account.create({
    name: 'Doctor Visits',
    type: 'expense',
    description: 'Medical appointments',
    parent: healthcareExpense._id
  });
  
  const prescriptions = await Account.create({
    name: 'Prescriptions',
    type: 'expense',
    description: 'Medication costs',
    parent: healthcareExpense._id
  });
  
  const educationExpense = await Account.create({
    name: 'Education',
    type: 'expense',
    description: 'Education expenses',
    parent: expenseParent._id
  });
  
  const tuition = await Account.create({
    name: 'School Tuition',
    type: 'expense',
    description: 'School fees',
    parent: educationExpense._id
  });
  
  const schoolSupplies = await Account.create({
    name: 'School Supplies',
    type: 'expense',
    description: 'Books and supplies',
    parent: educationExpense._id
  });
  
  const entertainmentExpense = await Account.create({
    name: 'Entertainment',
    type: 'expense',
    description: 'Entertainment expenses',
    parent: expenseParent._id
  });
  
  const streaming = await Account.create({
    name: 'Streaming Services',
    type: 'expense',
    description: 'Netflix, Disney+, etc',
    parent: entertainmentExpense._id
  });
  
  const familyOutings = await Account.create({
    name: 'Family Outings',
    type: 'expense',
    description: 'Movies, attractions, etc',
    parent: entertainmentExpense._id
  });
  
  const subscriptions = await Account.create({
    name: 'Subscriptions',
    type: 'expense',
    description: 'Regular subscriptions',
    parent: entertainmentExpense._id
  });
  
  const clothingExpense = await Account.create({
    name: 'Clothing',
    type: 'expense',
    description: 'Clothes and shoes',
    parent: expenseParent._id
  });
  
  const kidsClothing = await Account.create({
    name: 'Kids Clothing',
    type: 'expense',
    description: 'Children\'s clothes',
    parent: clothingExpense._id
  });
  
  const adultClothing = await Account.create({
    name: 'Adult Clothing',
    type: 'expense',
    description: 'Adult clothes',
    parent: clothingExpense._id
  });
  
  const savingsExpense = await Account.create({
    name: 'Savings',
    type: 'expense',
    description: 'Money set aside for savings',
    parent: expenseParent._id
  });
  
  const emergencyFund = await Account.create({
    name: 'Emergency Fund',
    type: 'expense',
    description: 'Emergency savings',
    parent: savingsExpense._id
  });
  
  const collegeFund = await Account.create({
    name: 'College Savings',
    type: 'expense',
    description: 'Kids\' education savings',
    parent: savingsExpense._id
  });

  const equity = await Account.create({
    name: 'Equity',
    type: 'equity',
    description: 'Owner\'s equity'
  });

  const openingBalance = await Account.create({
    name: 'Opening Balance',
    type: 'equity',
    description: 'Opening balances for accounts',
    parent: equity._id
  });
  
  logger.info('Account hierarchy created');
  
  return {
    // Asset accounts
    checkingAccount,
    savingsAccount,
    collegeAccount,
    mainHome,
    
    // Liability accounts
    primaryMortgage,
    visaCard,
    amexCard,
    carLoan,
    
    // Income accounts
    primarySalary,
    secondarySalary,
    investmentIncome,
    
    // Expense accounts
    mortgageExpense,
    electricity,
    water,
    internet,
    cellPhone,
    groceries,
    diningOut,
    carPayment,
    gasoline,
    carMaintenance,
    healthInsurance,
    autoInsurance,
    homeInsurance,
    doctorVisits,
    prescriptions,
    tuition,
    schoolSupplies,
    streaming,
    familyOutings,
    subscriptions,
    kidsClothing,
    adultClothing,
    emergencyFund,
    collegeFund,
    
    // Equity account
    openingBalance
  };
};

// Create a transaction with multiple entry lines
const createTransaction = async (date, description, entries) => {
  const transaction = await Transaction.create({
    date,
    description,
    isBalanced: true
  });
  
  for (const entry of entries) {
    await EntryLine.create({
      transaction: transaction._id,
      account: entry.account._id,
      amount: entry.amount,
      type: entry.type,
      description: entry.description || description
    });
  }
  
  return transaction;
};

// Helper to create a random date within a month
const getRandomDate = (year, month) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  const day = Math.floor(Math.random() * daysInMonth) + 1;
  return new Date(year, month - 1, day);
};

// Helper to add slight variation to amounts (±10%)
const varyAmount = (baseAmount) => {
  const variation = (Math.random() * 0.2) - 0.1; // -10% to +10%
  return Math.round((baseAmount * (1 + variation)) * 100) / 100;
};

// Generate transactions for each month
const generateMonthlyTransactions = async (accounts, year, month) => {
  logger.info(`Generating transactions for ${year}-${month}...`);
  const transactions = [];
  
  // Recurring monthly transactions
  
  // 1. Primary income (paycheck twice a month)
  const paycheck1Date = new Date(year, month - 1, 15);
  const paycheck2Date = new Date(year, month - 1, 30);
  const paycheckAmount = 4800; // $4800 semi-monthly salary
  
  transactions.push(await createTransaction(
    paycheck1Date,
    'Paycheck - First half of month',
    [
      { account: accounts.primarySalary, amount: paycheckAmount, type: 'credit' },
      { account: accounts.checkingAccount, amount: paycheckAmount, type: 'debit' }
    ]
  ));
  
  transactions.push(await createTransaction(
    paycheck2Date,
    'Paycheck - Second half of month',
    [
      { account: accounts.primarySalary, amount: paycheckAmount, type: 'credit' },
      { account: accounts.checkingAccount, amount: paycheckAmount, type: 'debit' }
    ]
  ));
  
  // 2. Secondary income (once a month)
  const secondaryIncomeDate = new Date(year, month - 1, 20);
  const secondaryIncomeAmount = 1200; // $1200 monthly from secondary job
  
  transactions.push(await createTransaction(
    secondaryIncomeDate,
    'Secondary income',
    [
      { account: accounts.secondarySalary, amount: secondaryIncomeAmount, type: 'credit' },
      { account: accounts.checkingAccount, amount: secondaryIncomeAmount, type: 'debit' }
    ]
  ));
  
  // 3. Investment income (quarterly in Jan, Apr, Jul, Oct)
  if (month % 3 === 1) { // Jan, Apr, Jul, Oct
    const investmentIncomeDate = new Date(year, month - 1, 10);
    const investmentIncomeAmount = 350; // $350 quarterly dividends
    
    transactions.push(await createTransaction(
      investmentIncomeDate,
      'Quarterly dividend payment',
      [
        { account: accounts.investmentIncome, amount: investmentIncomeAmount, type: 'credit' },
        { account: accounts.checkingAccount, amount: investmentIncomeAmount, type: 'debit' }
      ]
    ));
  }
  
  // 4. Mortgage payment (1st of month)
  const mortgageDate = new Date(year, month - 1, 1);
  const mortgageAmount = 2100; // $2100 monthly mortgage
  
  transactions.push(await createTransaction(
    mortgageDate,
    'Mortgage payment',
    [
      { account: accounts.mortgageExpense, amount: mortgageAmount, type: 'debit' },
      { account: accounts.primaryMortgage, amount: mortgageAmount * 0.7, type: 'debit', description: 'Principal portion' },
      { account: accounts.checkingAccount, amount: mortgageAmount, type: 'credit' }
    ]
  ));
  
  // 5. Car payment (5th of month)
  const carPaymentDate = new Date(year, month - 1, 5);
  const carPaymentAmount = 450; // $450 monthly car payment
  
  transactions.push(await createTransaction(
    carPaymentDate,
    'Car payment',
    [
      { account: accounts.carPayment, amount: carPaymentAmount, type: 'debit' },
      { account: accounts.carLoan, amount: carPaymentAmount * 0.8, type: 'debit', description: 'Principal portion' },
      { account: accounts.checkingAccount, amount: carPaymentAmount, type: 'credit' }
    ]
  ));
  
  // 6. Utilities
  // Electricity (varies by season)
  let electricityAmount = 150; // Base amount
  if (month >= 6 && month <= 9) { // Summer months
    electricityAmount = 220; // Higher in summer
  } else if (month >= 12 || month <= 2) { // Winter months
    electricityAmount = 190; // Higher in winter
  }
  electricityAmount = varyAmount(electricityAmount);
  
  const electricityDate = new Date(year, month - 1, 18);
  transactions.push(await createTransaction(
    electricityDate,
    'Electricity bill',
    [
      { account: accounts.electricity, amount: electricityAmount, type: 'debit' },
      { account: accounts.checkingAccount, amount: electricityAmount, type: 'credit' }
    ]
  ));
  
  // Water bill (bi-monthly)
  if (month % 2 === 0) { // Even months
    const waterAmount = varyAmount(80);
    const waterDate = new Date(year, month - 1, 22);
    transactions.push(await createTransaction(
      waterDate,
      'Water and sewer bill',
      [
        { account: accounts.water, amount: waterAmount, type: 'debit' },
        { account: accounts.checkingAccount, amount: waterAmount, type: 'credit' }
      ]
    ));
  }
  
  // Internet and cable
  const internetAmount = 120;
  const internetDate = new Date(year, month - 1, 12);
  transactions.push(await createTransaction(
    internetDate,
    'Internet and cable bill',
    [
      { account: accounts.internet, amount: internetAmount, type: 'debit' },
      { account: accounts.checkingAccount, amount: internetAmount, type: 'credit' }
    ]
  ));
  
  // Cell phone
  const cellPhoneAmount = 180;
  const cellPhoneDate = new Date(year, month - 1, 15);
  transactions.push(await createTransaction(
    cellPhoneDate,
    'Cell phone bill',
    [
      { account: accounts.cellPhone, amount: cellPhoneAmount, type: 'debit' },
      { account: accounts.checkingAccount, amount: cellPhoneAmount, type: 'credit' }
    ]
  ));
  
  // 7. Groceries (weekly)
  for (let week = 0; week < 4; week++) {
    const groceryAmount = varyAmount(240); // ~$240 per week for family of 4
    const groceryDate = new Date(year, month - 1, 7 + (week * 7));
    const paymentMethod = Math.random() > 0.3 ? accounts.checkingAccount : accounts.visaCard;
    
    transactions.push(await createTransaction(
      groceryDate,
      `Grocery shopping - Week ${week + 1}`,
      [
        { account: accounts.groceries, amount: groceryAmount, type: 'debit' },
        { account: paymentMethod, amount: groceryAmount, type: paymentMethod === accounts.checkingAccount ? 'credit' : 'credit' }
      ]
    ));
  }
  
  // 8. Dining out (2-3 times a month)
  const diningOutFrequency = Math.floor(Math.random() * 2) + 2; // 2-3 times
  for (let i = 0; i < diningOutFrequency; i++) {
    const diningAmount = varyAmount(120); // ~$120 per family meal
    const diningDate = getRandomDate(year, month);
    const paymentMethod = Math.random() > 0.4 ? accounts.visaCard : accounts.amexCard;
    
    transactions.push(await createTransaction(
      diningDate,
      'Family dinner out',
      [
        { account: accounts.diningOut, amount: diningAmount, type: 'debit' },
        { account: paymentMethod, amount: diningAmount, type: 'credit' }
      ]
    ));
  }
  
  // 9. Gasoline (twice a month)
  for (let i = 0; i < 2; i++) {
    const gasAmount = varyAmount(65); // ~$65 per fill-up
    const gasDate = new Date(year, month - 1, 5 + (i * 15));
    const paymentMethod = Math.random() > 0.5 ? accounts.checkingAccount : accounts.visaCard;
    
    transactions.push(await createTransaction(
      gasDate,
      'Gasoline',
      [
        { account: accounts.gasoline, amount: gasAmount, type: 'debit' },
        { account: paymentMethod, amount: gasAmount, type: paymentMethod === accounts.checkingAccount ? 'credit' : 'credit' }
      ]
    ));
  }
  
  // 10. Car maintenance (occasional)
  if (Math.random() < 0.3) { // 30% chance each month
    const maintenanceAmount = varyAmount(120);
    const maintenanceDate = getRandomDate(year, month);
    
    transactions.push(await createTransaction(
      maintenanceDate,
      'Car maintenance',
      [
        { account: accounts.carMaintenance, amount: maintenanceAmount, type: 'debit' },
        { account: accounts.visaCard, amount: maintenanceAmount, type: 'credit' }
      ]
    ));
  }
  
  // 11. Insurance (paid quarterly)
  if (month % 3 === 1) { // Jan, Apr, Jul, Oct
    // Health insurance
    const healthInsuranceAmount = 850;
    const healthInsuranceDate = new Date(year, month - 1, 15);
    transactions.push(await createTransaction(
      healthInsuranceDate,
      'Health insurance premium',
      [
        { account: accounts.healthInsurance, amount: healthInsuranceAmount, type: 'debit' },
        { account: accounts.checkingAccount, amount: healthInsuranceAmount, type: 'credit' }
      ]
    ));
    
    // Auto insurance
    const autoInsuranceAmount = 480;
    const autoInsuranceDate = new Date(year, month - 1, 15);
    transactions.push(await createTransaction(
      autoInsuranceDate,
      'Auto insurance premium',
      [
        { account: accounts.autoInsurance, amount: autoInsuranceAmount, type: 'debit' },
        { account: accounts.checkingAccount, amount: autoInsuranceAmount, type: 'credit' }
      ]
    ));
    
    // Home insurance
    const homeInsuranceAmount = 420;
    const homeInsuranceDate = new Date(year, month - 1, 15);
    transactions.push(await createTransaction(
      homeInsuranceDate,
      'Home insurance premium',
      [
        { account: accounts.homeInsurance, amount: homeInsuranceAmount, type: 'debit' },
        { account: accounts.checkingAccount, amount: homeInsuranceAmount, type: 'credit' }
      ]
    ));
  }
  
  // 12. Healthcare visits (occasional)
  if (Math.random() < 0.4) { // 40% chance each month
    const doctorAmount = varyAmount(120);
    const doctorDate = getRandomDate(year, month);
    
    transactions.push(await createTransaction(
      doctorDate,
      'Doctor visit co-pay',
      [
        { account: accounts.doctorVisits, amount: doctorAmount, type: 'debit' },
        { account: accounts.checkingAccount, amount: doctorAmount, type: 'credit' }
      ]
    ));
  }
  
  if (Math.random() < 0.3) { // 30% chance each month
    const prescriptionAmount = varyAmount(45);
    const prescriptionDate = getRandomDate(year, month);
    
    transactions.push(await createTransaction(
      prescriptionDate,
      'Prescription medication',
      [
        { account: accounts.prescriptions, amount: prescriptionAmount, type: 'debit' },
        { account: accounts.visaCard, amount: prescriptionAmount, type: 'credit' }
      ]
    ));
  }
  
  // 13. School expenses (seasonal)
  // Higher in August/September for back to school
  if (month === 8 || month === 9) {
    const suppliesAmount = month === 8 ? varyAmount(350) : varyAmount(150);
    const suppliesDate = getRandomDate(year, month);
    
    transactions.push(await createTransaction(
      suppliesDate,
      'School supplies',
      [
        { account: accounts.schoolSupplies, amount: suppliesAmount, type: 'debit' },
        { account: accounts.visaCard, amount: suppliesAmount, type: 'credit' }
      ]
    ));
  }
  
  // Tuition payment (quarterly)
  if ([1, 4, 7, 10].includes(month)) {
    const tuitionAmount = 1250;
    const tuitionDate = new Date(year, month - 1, 5);
    
    transactions.push(await createTransaction(
      tuitionDate,
      'School tuition payment',
      [
        { account: accounts.tuition, amount: tuitionAmount, type: 'debit' },
        { account: accounts.checkingAccount, amount: tuitionAmount, type: 'credit' }
      ]
    ));
  }
  
  // 14. Entertainment
  // Streaming services (monthly)
  const streamingAmount = 45;
  const streamingDate = new Date(year, month - 1, 2);
  transactions.push(await createTransaction(
    streamingDate,
    'Streaming services',
    [
      { account: accounts.streaming, amount: streamingAmount, type: 'debit' },
      { account: accounts.visaCard, amount: streamingAmount, type: 'credit' }
    ]
  ));
  
  // Family outings (1-2 per month)
  const outingsFrequency = Math.floor(Math.random() * 2) + 1;
  for (let i = 0; i < outingsFrequency; i++) {
    const outingAmount = varyAmount(140);
    const outingDate = getRandomDate(year, month);
    
    transactions.push(await createTransaction(
      outingDate,
      'Family entertainment',
      [
        { account: accounts.familyOutings, amount: outingAmount, type: 'debit' },
        { account: accounts.amexCard, amount: outingAmount, type: 'credit' }
      ]
    ));
  }
  
  // 15. Clothing (seasonal)
  if ([3, 4, 8, 9, 11, 12].includes(month)) { // Spring, Fall, and Winter holidays
    // Kids clothing
    const kidsClothingAmount = varyAmount(200);
    const kidsClothingDate = getRandomDate(year, month);
    
    transactions.push(await createTransaction(
      kidsClothingDate,
      'Kids clothing',
      [
        { account: accounts.kidsClothing, amount: kidsClothingAmount, type: 'debit' },
        { account: accounts.visaCard, amount: kidsClothingAmount, type: 'credit' }
      ]
    ));
    
    // Adult clothing
    if (Math.random() < 0.6) { // 60% chance
      const adultClothingAmount = varyAmount(180);
      const adultClothingDate = getRandomDate(year, month);
      
      transactions.push(await createTransaction(
        adultClothingDate,
        'Adult clothing',
        [
          { account: accounts.adultClothing, amount: adultClothingAmount, type: 'debit' },
          { account: accounts.amexCard, amount: adultClothingAmount, type: 'credit' }
        ]
      ));
    }
  }
  
  // 16. Credit card payments
  // Visa payment
  const visaPaymentAmount = 1200; // Pay down credit card
  const visaPaymentDate = new Date(year, month - 1, 20);
  transactions.push(await createTransaction(
    visaPaymentDate,
    'Visa credit card payment',
    [
      { account: accounts.visaCard, amount: visaPaymentAmount, type: 'debit' },
      { account: accounts.checkingAccount, amount: visaPaymentAmount, type: 'credit' }
    ]
  ));
  
  // Amex payment
  const amexPaymentAmount = 900; // Pay down credit card
  const amexPaymentDate = new Date(year, month - 1, 22);
  transactions.push(await createTransaction(
    amexPaymentDate,
    'Amex credit card payment',
    [
      { account: accounts.amexCard, amount: amexPaymentAmount, type: 'debit' },
      { account: accounts.checkingAccount, amount: amexPaymentAmount, type: 'credit' }
    ]
  ));
  
  // 17. Savings transfers
  // Emergency fund
  const emergencyAmount = 300;
  const emergencyDate = new Date(year, month - 1, 30);
  transactions.push(await createTransaction(
    emergencyDate,
    'Transfer to emergency fund',
    [
      { account: accounts.emergencyFund, amount: emergencyAmount, type: 'debit' },
      { account: accounts.checkingAccount, amount: emergencyAmount, type: 'credit' },
      { account: accounts.savingsAccount, amount: emergencyAmount, type: 'debit' }
    ]
  ));
  
  // College fund
  const collegeAmount = 500;
  const collegeDate = new Date(year, month - 1, 30);
  transactions.push(await createTransaction(
    collegeDate,
    'Transfer to college fund',
    [
      { account: accounts.collegeFund, amount: collegeAmount, type: 'debit' },
      { account: accounts.checkingAccount, amount: collegeAmount, type: 'credit' },
      { account: accounts.collegeAccount, amount: collegeAmount, type: 'debit' }
    ]
  ));
  
  logger.info(`Generated ${transactions.length} transactions for ${year}-${month}`);
  return transactions;
};

// Create initial balances
const createInitialBalances = async (accounts) => {
  logger.info('Creating initial account balances...');
  
  const openingDate = new Date(2025, 0, 1); // Jan 1, 2025
  
  // Checking account starting balance
  await createTransaction(
    openingDate,
    'Initial checking account balance',
    [
      { account: accounts.checkingAccount, amount: 12000, type: 'debit' },
      { account: accounts.openingBalance, amount: 12000, type: 'credit' }
    ]
  );
  
  // Savings account starting balance
  await createTransaction(
    openingDate,
    'Initial savings account balance',
    [
      { account: accounts.savingsAccount, amount: 25000, type: 'debit' },
      { account: accounts.openingBalance, amount: 25000, type: 'credit' }
    ]
  );
  
  // College fund starting balance
  await createTransaction(
    openingDate,
    'Initial college fund balance',
    [
      { account: accounts.collegeAccount, amount: 40000, type: 'debit' },
      { account: accounts.openingBalance, amount: 40000, type: 'credit' }
    ]
  );
  
  // House value and mortgage balance
  await createTransaction(
    openingDate,
    'Initial house value',
    [
      { account: accounts.mainHome, amount: 450000, type: 'debit' },
      { account: accounts.openingBalance, amount: 450000, type: 'credit' }
    ]
  );
  
  await createTransaction(
    openingDate,
    'Initial mortgage balance',
    [
      { account: accounts.openingBalance, amount: 320000, type: 'debit' },
      { account: accounts.primaryMortgage, amount: 320000, type: 'credit' }
    ]
  );
  
  // Car loan balance
  await createTransaction(
    openingDate,
    'Initial car loan balance',
    [
      { account: accounts.openingBalance, amount: 18000, type: 'debit' },
      { account: accounts.carLoan, amount: 18000, type: 'credit' }
    ]
  );
  
  // Credit card starting balances
  await createTransaction(
    openingDate,
    'Initial Visa credit card balance',
    [
      { account: accounts.openingBalance, amount: 2500, type: 'debit' },
      { account: accounts.visaCard, amount: 2500, type: 'credit' }
    ]
  );
  
  await createTransaction(
    openingDate,
    'Initial Amex credit card balance',
    [
      { account: accounts.openingBalance, amount: 1800, type: 'debit' },
      { account: accounts.amexCard, amount: 1800, type: 'credit' }
    ]
  );
  
  logger.info('Initial balances created');
};

// Main function
const generateTestData = async () => {
  try {
    // Connect to the database
    await connectDB();
    
    // Clear existing data
    await clearAllData();
    
    // Create account hierarchy
    const accounts = await createAccountHierarchy();
    
    // Create initial balances
    await createInitialBalances(accounts);
    
    // Generate 4 months of data (Jan 2025 - Apr 2025)
    for (let month = 1; month <= 4; month++) {
      await generateMonthlyTransactions(accounts, 2025, month);
    }
    
    logger.info('Test data generation complete!');
    
    process.exit(0);
  } catch (error) {
    logger.error('Error generating test data:', error);
    process.exit(1);
  }
};

// Run the script
generateTestData(); 