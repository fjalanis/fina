const Account = require('../../backend/src/models/Account');
const logger = require('../../backend/src/config/logger');

// Create account hierarchy
exports.createAccountHierarchy = async () => {
  logger.info('Creating account hierarchy...');
  
  // Asset accounts
  const assetParent = await Account.create({
    name: 'Assets',
    type: 'asset',
    description: 'All assets',
    unit: 'USD'
  });
  
  const bankAccountsParent = await Account.create({
    name: 'Bank Accounts',
    type: 'asset',
    description: 'All bank accounts',
    parent: assetParent._id,
    unit: 'USD'
  });
  
  const checkingAccount = await Account.create({
    name: 'Checking Account',
    type: 'asset',
    description: 'Primary checking account',
    parent: bankAccountsParent._id,
    unit: 'USD'
  });
  
  const savingsAccount = await Account.create({
    name: 'Savings Account',
    type: 'asset',
    description: 'Emergency fund',
    parent: bankAccountsParent._id,
    unit: 'USD'
  });

  const collegeAccount = await Account.create({
    name: 'College Fund',
    type: 'asset',
    description: 'Kids college savings',
    parent: bankAccountsParent._id,
    unit: 'USD'
  });
  
  const realEstateParent = await Account.create({
    name: 'Real Estate',
    type: 'asset',
    description: 'All real estate assets',
    parent: assetParent._id,
    unit: 'USD'
  });
  
  const mainHome = await Account.create({
    name: 'Primary Residence',
    type: 'asset',
    description: 'Family home',
    parent: realEstateParent._id,
    unit: 'USD'
  });

  // Investment accounts
  const investmentParent = await Account.create({
    name: 'Investments',
    type: 'asset',
    description: 'All investment accounts',
    parent: assetParent._id,
    unit: 'USD'
  });

  const stockAccount = await Account.create({
    name: 'Stock Portfolio',
    type: 'asset',
    description: 'Stock investments',
    parent: investmentParent._id,
    unit: 'AAPL' // Example stock
  });

  const cryptoAccount = await Account.create({
    name: 'Crypto Portfolio',
    type: 'asset',
    description: 'Cryptocurrency investments',
    parent: investmentParent._id,
    unit: 'BTC' // Example crypto
  });
  
  // Liability accounts
  const liabilityParent = await Account.create({
    name: 'Liabilities',
    type: 'liability',
    description: 'All liabilities',
    unit: 'USD'
  });
  
  const mortgageParent = await Account.create({
    name: 'Mortgages',
    type: 'liability',
    description: 'Home loans',
    parent: liabilityParent._id,
    unit: 'USD'
  });
  
  const primaryMortgage = await Account.create({
    name: 'Primary Home Mortgage',
    type: 'liability',
    description: 'Mortgage on primary residence',
    parent: mortgageParent._id,
    unit: 'USD'
  });
  
  const creditCardsParent = await Account.create({
    name: 'Credit Cards',
    type: 'liability',
    description: 'All credit cards',
    parent: liabilityParent._id,
    unit: 'USD'
  });
  
  const visaCard = await Account.create({
    name: 'Visa Credit Card',
    type: 'liability',
    description: 'Primary credit card',
    parent: creditCardsParent._id,
    unit: 'USD'
  });
  
  const amexCard = await Account.create({
    name: 'Amex Credit Card',
    type: 'liability',
    description: 'Secondary credit card',
    parent: creditCardsParent._id,
    unit: 'USD'
  });
  
  const autoloanParent = await Account.create({
    name: 'Auto Loans',
    type: 'liability',
    description: 'Car loans',
    parent: liabilityParent._id,
    unit: 'USD'
  });
  
  const carLoan = await Account.create({
    name: 'Car Loan',
    type: 'liability',
    description: 'Family SUV loan',
    parent: autoloanParent._id,
    unit: 'USD'
  });
  
  // Income accounts
  const incomeParent = await Account.create({
    name: 'Income',
    type: 'income',
    description: 'All income sources',
    unit: 'USD'
  });
  
  const salaryParent = await Account.create({
    name: 'Salary Income',
    type: 'income',
    description: 'Employment income',
    parent: incomeParent._id,
    unit: 'USD'
  });
  
  const primarySalary = await Account.create({
    name: 'Primary Job',
    type: 'income',
    description: 'Main employment income',
    parent: salaryParent._id,
    unit: 'USD'
  });
  
  const secondarySalary = await Account.create({
    name: 'Secondary Job',
    type: 'income',
    description: 'Part-time income',
    parent: salaryParent._id,
    unit: 'USD'
  });
  
  const investmentIncome = await Account.create({
    name: 'Investment Income',
    type: 'income',
    description: 'Dividends and interest',
    parent: incomeParent._id,
    unit: 'USD'
  });
  
  // Expense accounts
  const expenseParent = await Account.create({
    name: 'Expenses',
    type: 'expense',
    description: 'All expenses',
    unit: 'USD'
  });
  
  const housingExpense = await Account.create({
    name: 'Housing',
    type: 'expense',
    description: 'Housing-related expenses',
    parent: expenseParent._id,
    unit: 'USD'
  });
  
  const mortgageExpense = await Account.create({
    name: 'Mortgage Payment',
    type: 'expense',
    description: 'Monthly mortgage payment',
    parent: housingExpense._id,
    unit: 'USD'
  });
  
  const utilities = await Account.create({
    name: 'Utilities',
    type: 'expense',
    description: 'Utility bills',
    parent: housingExpense._id,
    unit: 'USD'
  });
  
  const electricity = await Account.create({
    name: 'Electricity',
    type: 'expense',
    description: 'Electric bill',
    parent: utilities._id,
    unit: 'USD'
  });
  
  const water = await Account.create({
    name: 'Water & Sewer',
    type: 'expense',
    description: 'Water and sewer services',
    parent: utilities._id,
    unit: 'USD'
  });
  
  const internet = await Account.create({
    name: 'Internet & Cable',
    type: 'expense',
    description: 'Internet and TV services',
    parent: utilities._id,
    unit: 'USD'
  });
  
  const cellPhone = await Account.create({
    name: 'Cell Phone',
    type: 'expense',
    description: 'Mobile phone services',
    parent: utilities._id,
    unit: 'USD'
  });
  
  const foodExpense = await Account.create({
    name: 'Food',
    type: 'expense',
    description: 'All food expenses',
    parent: expenseParent._id,
    unit: 'USD'
  });
  
  const groceries = await Account.create({
    name: 'Groceries',
    type: 'expense',
    description: 'Grocery shopping',
    parent: foodExpense._id,
    unit: 'USD'
  });
  
  const diningOut = await Account.create({
    name: 'Dining Out',
    type: 'expense',
    description: 'Restaurants and takeout',
    parent: foodExpense._id,
    unit: 'USD'
  });
  
  const transportationExpense = await Account.create({
    name: 'Transportation',
    type: 'expense',
    description: 'All transportation expenses',
    parent: expenseParent._id,
    unit: 'USD'
  });
  
  const carPayment = await Account.create({
    name: 'Car Payment',
    type: 'expense',
    description: 'Monthly car payment',
    parent: transportationExpense._id,
    unit: 'USD'
  });
  
  const gasoline = await Account.create({
    name: 'Gasoline',
    type: 'expense',
    description: 'Fuel for vehicles',
    parent: transportationExpense._id,
    unit: 'USD'
  });
  
  const carMaintenance = await Account.create({
    name: 'Car Maintenance',
    type: 'expense',
    description: 'Vehicle repairs and maintenance',
    parent: transportationExpense._id,
    unit: 'USD'
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
    assetParent,
    bankAccountsParent,
    checkingAccount,
    savingsAccount,
    collegeAccount,
    realEstateParent,
    mainHome,
    investmentParent,
    stockAccount,
    cryptoAccount,
    
    // Liability accounts
    liabilityParent,
    mortgageParent,
    primaryMortgage,
    creditCardsParent,
    visaCard,
    amexCard,
    autoloanParent,
    carLoan,
    
    // Income accounts
    incomeParent,
    salaryParent,
    primarySalary,
    secondarySalary,
    investmentIncome,
    
    // Expense accounts
    expenseParent,
    housingExpense,
    mortgageExpense,
    utilities,
    electricity,
    water,
    internet,
    cellPhone,
    foodExpense,
    groceries,
    diningOut,
    transportationExpense,
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