const mongoose = require('mongoose');
const request = require('supertest');
const app = require('./server');
const Transaction = require('./models/Transaction');
const Account = require('./models/Account');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/test_db_transaction')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const testTransactionAPI = async () => {
  try {
    // Clean up previous data
    await Transaction.deleteMany({});
    await Account.deleteMany({});
    
    // Create test accounts
    const assetAccount = await Account.create({
      name: 'Test Asset Account',
      type: 'asset'
    });
    
    const expenseAccount = await Account.create({
      name: 'Test Expense Account',
      type: 'expense'
    });
    
    console.log('Test accounts created');
    
    // Create a transaction with entries via API
    const transactionData = {
      date: new Date(),
      description: 'Test Transaction',
      entries: [
        {
          account: assetAccount._id,
          amount: 100,
          type: 'debit'
        },
        {
          account: expenseAccount._id,
          amount: 100,
          type: 'credit'
        }
      ]
    };
    
    console.log('Sending POST request with data:', JSON.stringify(transactionData));
    
    const response = await request(app)
      .post('/api/transactions')
      .send(transactionData);
    
    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(response.body));
    
    if (response.body.data && response.body.data.entries) {
      console.log('Response entries length:', response.body.data.entries.length);
      console.log('Response entries:', JSON.stringify(response.body.data.entries));
    } else {
      console.log('No entries in response data');
    }
    
    // Verify directly from database
    const transactionId = response.body.data._id;
    const dbTransaction = await Transaction.findById(transactionId).populate('entries.account');
    
    console.log('DB transaction entries length:', dbTransaction.entries.length);
    console.log('DB transaction entries:', JSON.stringify(dbTransaction.entries));

    // Clean up
    await Transaction.deleteMany({});
    await Account.deleteMany({});
    
    console.log('Test completed successfully');
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the test
testTransactionAPI(); 