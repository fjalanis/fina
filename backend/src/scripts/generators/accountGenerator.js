const Account = require('../../models/Account');
const logger = require('../../config/logger');

// Create account hierarchy
exports.createAccountHierarchy = async () => {
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