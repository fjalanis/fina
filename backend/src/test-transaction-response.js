// Simple script to test response serialization
const mongoose = require('mongoose');
const Transaction = require('./models/Transaction');

// A mock transaction
const mockTransaction = {
  date: new Date(),
  description: 'Test Transaction',
  entries: [
    {
      account: new mongoose.Types.ObjectId(),
      amount: 100,
      type: 'debit'
    },
    {
      account: new mongoose.Types.ObjectId(),
      amount: 100,
      type: 'credit'
    }
  ],
  appliedRules: [],
  _id: new mongoose.Types.ObjectId(),
  createdAt: new Date(),
  updatedAt: new Date(),
  __v: 0,
  isBalanced: true,
  id: '123'
};

// Create response object similar to what our controller returns
const response = {
  success: true,
  data: mockTransaction
};

// Log response structure
console.log('Response structure:');
console.log('Type of data:', typeof response.data);
console.log('Has entries property:', 'entries' in response.data);
console.log('Type of entries:', Array.isArray(response.data.entries) ? 'array' : typeof response.data.entries);
console.log('Entries length:', response.data.entries?.length);

// Test serialization (similar to what Express/supertest does)
const serialized = JSON.stringify(response);
const deserialized = JSON.parse(serialized);

// Check what happened after serialization
console.log('\nAfter JSON serialization:');
console.log('Type of data:', typeof deserialized.data);
console.log('Has entries property:', 'entries' in deserialized.data);
console.log('Type of entries:', Array.isArray(deserialized.data.entries) ? 'array' : typeof deserialized.data.entries);
console.log('Entries length:', deserialized.data.entries?.length);

// Simulate how jest would test this
console.log('\nTest assertions:');
console.log('entries is array:', Array.isArray(deserialized.data.entries));
console.log('entries.length === 2:', deserialized.data.entries?.length === 2); 