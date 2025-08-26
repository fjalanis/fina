const Transaction = require('../../backend/src/models/Transaction');
const logger = require('../../backend/src/config/logger');
const utils = require('./dataUtils');

// Create a transaction with multiple entries
const createTransaction = async (date, description, entries) => {
  const transaction = await Transaction.create({
    date,
    description,
    isBalanced: true,
    entries: entries.map(entry => {
      const mapped = {
        accountId: entry.account._id,
        amount: entry.amount,
        type: entry.type,
        description: entry.description || description,
        unit: entry.unit || 'USD'
      };
      if (typeof entry.quantity === 'number') {
        mapped.quantity = entry.quantity;
      }
      return mapped;
    })
  });
  
  return transaction;
};

// Create initial balances
exports.createInitialBalances = async (accounts) => {
  logger.info('Creating initial account balances...');
  
  const now = new Date();
  const openingDate = new Date(now.getFullYear(), 0, 1); // Jan 1 of current year
  
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
  
  // Initial investment balances
  await createTransaction(
    openingDate,
    'Initial stock portfolio balance',
    [
      { account: accounts.stockAccount, amount: 15000, type: 'debit', unit: 'AAPL', quantity: 100 },
      { account: accounts.openingBalance, amount: 15000, type: 'credit', unit: 'USD' }
    ]
  );
  
  await createTransaction(
    openingDate,
    'Initial crypto portfolio balance',
    [
      { account: accounts.cryptoAccount, amount: 10000, type: 'debit', unit: 'BTC', quantity: 0.5 },
      { account: accounts.openingBalance, amount: 10000, type: 'credit', unit: 'USD' }
    ]
  );
  
  logger.info('Initial balances created');
};

// Generate transactions for each month
exports.generateMonthlyTransactions = async (accounts, year, month) => {
  logger.info(`Generating transactions for ${year}-${month}...`);
  const transactions = [];
  
  // Recurring monthly transactions
  
  // 1. Primary income (paycheck twice a month)
  const paycheck1Date = new Date(year, month - 1, 15);
  const paycheck2Date = new Date(year, month - 1, Math.min(28, new Date(year, month, 0).getDate()));
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
  electricityAmount = utils.varyAmount(electricityAmount);
  
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
    const waterAmount = utils.varyAmount(80);
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
    const groceryAmount = utils.varyAmount(240); // ~$240 per week for family of 4
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
  
  // Investment transactions (randomly throughout the month)
  if (Math.random() < 0.3) { // 30% chance of investment transaction
    const investmentDate = new Date(year, month - 1, Math.floor(Math.random() * 28) + 1);
    const isStock = Math.random() < 0.5;
    const account = isStock ? accounts.stockAccount : accounts.cryptoAccount;
    const unit = isStock ? 'AAPL' : 'BTC';
    const isBuy = Math.random() < 0.5;
    const amount = isStock ? utils.varyAmount(1000) : utils.varyAmount(500);
    const quantity = isStock ? Math.floor(Math.random() * 5) + 1 : parseFloat((Math.random() * 0.1).toFixed(4));

    transactions.push(await createTransaction(
      investmentDate,
      `${isBuy ? 'Buy' : 'Sell'} ${unit}`,
      [
        { 
          account: account, 
          amount: amount, 
          type: isBuy ? 'debit' : 'credit', 
          unit: unit,
          quantity: quantity
        },
        { 
          account: accounts.checkingAccount, 
          amount: amount, 
          type: isBuy ? 'credit' : 'debit', 
          unit: 'USD'
        }
      ]
    ));
  }
  
  logger.info(`Generated ${transactions.length} transactions for ${year}-${month}`);
  return transactions;
}; 