const mongoose = require('mongoose');
const AssetPrice = require('../../../src/models/AssetPrice');

describe('AssetPrice Model', () => {
  // Connect to a test database before all tests
  beforeAll(async () => {
    // Use a unique database name for each test file
    const url = `${process.env.MONGODB_URI}_assetprice_model_test`; 
    await mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
  });

  // Clear the collection before each test
  beforeEach(async () => {
    await AssetPrice.deleteMany({});
  });

  // Disconnect after all tests
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  it('should create and save an asset price successfully', async () => {
    const validPrice = {
      baseCurrency: 'USD',
      targetCurrency: 'EUR',
      rate: 0.85,
      date: new Date()
    };

    const savedPrice = await AssetPrice.create(validPrice);
    expect(savedPrice._id).toBeDefined();
    expect(savedPrice.baseCurrency).toBe(validPrice.baseCurrency);
    expect(savedPrice.targetCurrency).toBe(validPrice.targetCurrency);
    expect(savedPrice.rate).toBe(validPrice.rate);
    expect(savedPrice.date).toBeDefined();
  });

  it('should fail to save asset price without required fields', async () => {
    const invalidPrice = new AssetPrice({ targetCurrency: 'USD', rate: 1, date: new Date() });
    await expect(invalidPrice.save()).rejects.toThrow('Base currency is required');

    invalidPrice.baseCurrency = 'USD';
    invalidPrice.targetCurrency = undefined;
    await expect(invalidPrice.save()).rejects.toThrow('Target currency is required');

    invalidPrice.targetCurrency = 'EUR';
    invalidPrice.rate = undefined;
    await expect(invalidPrice.save()).rejects.toThrow('Asset price is required');
  });

  it('should fail to save asset price with negative rate', async () => {
    const invalidPrice = new AssetPrice({
      baseCurrency: 'USD',
      targetCurrency: 'EUR',
      rate: -1,
      date: new Date()
    });

    await expect(invalidPrice.save()).rejects.toThrow('Asset price must be positive');
  });

  it('should fail to save asset price with too long identifiers', async () => {
    const longIdentifier = 'a'.repeat(51);
    const invalidPrice = new AssetPrice({
      baseCurrency: longIdentifier,
      targetCurrency: 'USD',
      rate: 1,
      date: new Date()
    });

    await expect(invalidPrice.save()).rejects.toThrow('Base currency cannot be more than 50 characters');

    invalidPrice.baseCurrency = 'USD';
    invalidPrice.targetCurrency = longIdentifier;
    await expect(invalidPrice.save()).rejects.toThrow('Target currency cannot be more than 50 characters');
  });

  it('should save asset price with valid length identifiers', async () => {
    const validLengthIdentifier = 'a'.repeat(50);
    const validPrice = new AssetPrice({
      baseCurrency: validLengthIdentifier,
      targetCurrency: 'USD',
      rate: 1,
      date: new Date()
    });

    const savedPrice = await validPrice.save();
    expect(savedPrice._id).toBeDefined();
    expect(savedPrice.baseCurrency).toBe(validLengthIdentifier);
  });
}); 