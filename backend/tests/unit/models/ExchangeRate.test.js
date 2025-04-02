const mongoose = require('mongoose');
const ExchangeRate = require('../../../src/models/ExchangeRate');

describe('ExchangeRate Model', () => {
  // Connect to a test database before all tests
  beforeAll(async () => {
    // Use a unique database name for each test file
    const url = `${process.env.MONGODB_URI}_exchangerate_model_test`; 
    await mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
  });

  // Clear the collection before each test
  beforeEach(async () => {
    await ExchangeRate.deleteMany({});
  });

  // Disconnect after all tests
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  it('should create and save an exchange rate successfully', async () => {
    const rateData = {
      baseCurrency: 'AAPL',
      targetCurrency: 'USD',
      rate: 150.75,
      date: new Date('2023-10-26')
    };
    const validRate = new ExchangeRate(rateData);
    const savedRate = await validRate.save();

    expect(savedRate._id).toBeDefined();
    expect(savedRate.baseCurrency).toBe(rateData.baseCurrency);
    expect(savedRate.targetCurrency).toBe(rateData.targetCurrency);
    expect(savedRate.rate).toBe(rateData.rate);
    expect(savedRate.date).toEqual(rateData.date);
    expect(savedRate.createdAt).toBeDefined();
    expect(savedRate.updatedAt).toBeDefined();
  });

  it('should fail if required fields are missing', async () => {
    let invalidRate = new ExchangeRate({ targetCurrency: 'USD', rate: 1, date: new Date() });
    await expect(invalidRate.save()).rejects.toThrow('Base currency/asset identifier is required');

    invalidRate = new ExchangeRate({ baseCurrency: 'USD', rate: 1, date: new Date() });
    await expect(invalidRate.save()).rejects.toThrow('Target currency/asset identifier is required');

    invalidRate = new ExchangeRate({ baseCurrency: 'USD', targetCurrency: 'EUR', date: new Date() });
    await expect(invalidRate.save()).rejects.toThrow('Exchange rate is required');
  });

  it('should fail if rate is negative', async () => {
    const rateData = {
      baseCurrency: 'AAPL',
      targetCurrency: 'USD',
      rate: -150.75,
      date: new Date('2023-10-26')
    };
    const invalidRate = new ExchangeRate(rateData);
    await expect(invalidRate.save()).rejects.toThrow('Exchange rate must be positive');
  });

  it('should enforce maxlength constraints (20 chars)', async () => {
    const longIdentifier = 'a'.repeat(21);
    let invalidRate = new ExchangeRate({ baseCurrency: longIdentifier, targetCurrency: 'USD', rate: 1, date: new Date() });
    await expect(invalidRate.save()).rejects.toThrow('Base currency/asset identifier must be 20 characters or less');

    invalidRate = new ExchangeRate({ baseCurrency: 'USD', targetCurrency: longIdentifier, rate: 1, date: new Date() });
    await expect(invalidRate.save()).rejects.toThrow('Target currency/asset identifier must be 20 characters or less');
    
    const validLengthIdentifier = 'a'.repeat(20);
    const validRate = new ExchangeRate({ baseCurrency: validLengthIdentifier, targetCurrency: 'USD', rate: 1, date: new Date() });
    await expect(validRate.save()).resolves.toBeDefined();
  });
}); 