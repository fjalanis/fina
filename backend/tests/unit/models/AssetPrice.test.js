const mongoose = require('mongoose');
const AssetPrice = require('../../../src/models/AssetPrice');

describe('AssetPrice Model Unit Tests', () => {
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
    const validPriceData = {
      unit: 'EUR',
      rate: 0.95,
      date: new Date('2023-10-26T10:30:00.000Z')
    };
    const assetPrice = new AssetPrice(validPriceData);
    const savedPrice = await assetPrice.save();

    expect(savedPrice._id).toBeDefined();
    expect(savedPrice.unit).toBe(validPriceData.unit);
    expect(savedPrice.rate).toBe(validPriceData.rate);
    expect(savedPrice.date).toEqual(validPriceData.date);
    expect(savedPrice.createdAt).toBeDefined();
    expect(savedPrice.updatedAt).toBeDefined();
  });

  it('should fail validation if required fields are missing', async () => {
    let priceData = { rate: 1.0, date: new Date() }; // Missing unit
    let assetPrice = new AssetPrice(priceData);
    await expect(assetPrice.save()).rejects.toThrow('Unit is required');

    priceData = { unit: 'CAD', date: new Date() }; // Missing rate
    assetPrice = new AssetPrice(priceData);
    await expect(assetPrice.save()).rejects.toThrow('Asset price is required');

    priceData = { unit: 'CAD', rate: 1.3 }; // Missing date (should default, but let's test requirement explicitly)
    assetPrice = new AssetPrice(priceData);
    // Modify to remove the default before saving to test the requirement
    assetPrice.date = undefined; 
    await expect(assetPrice.save()).rejects.toThrow('Date is required');
  });

  it('should fail validation if rate is negative', async () => {
    const priceData = {
      unit: 'JPY',
      rate: -150,
      date: new Date()
    };
    const assetPrice = new AssetPrice(priceData);
    await expect(assetPrice.save()).rejects.toThrow('Asset price must be positive');
  });

  it('should allow rate to be zero', async () => {
    const priceData = {
      unit: 'ZERO',
      rate: 0,
      date: new Date()
    };
    const assetPrice = new AssetPrice(priceData);
    await expect(assetPrice.save()).resolves.toBeInstanceOf(AssetPrice);
  });

  it('should fail validation if unit is too long', async () => {
    const longUnit = 'a'.repeat(51);
    const priceData = {
      unit: longUnit,
      rate: 10,
      date: new Date()
    };
    const assetPrice = new AssetPrice(priceData);
    await expect(assetPrice.save()).rejects.toThrow('Unit cannot be more than 50 characters');
  });

  it('should pass validation with max length unit', async () => {
    const maxLenUnit = 'a'.repeat(50);
    const priceData = {
      unit: maxLenUnit,
      rate: 10,
      date: new Date()
    };
    const assetPrice = new AssetPrice(priceData);
    await expect(assetPrice.save()).resolves.toBeInstanceOf(AssetPrice);
  });

  it('should allow multiple prices for the same unit if timestamps differ', async () => {
    const timestamp1 = new Date('2023-11-01T12:00:00.000Z');
    const timestamp2 = new Date('2023-11-01T12:00:01.000Z');
    const priceData1 = {
      unit: 'TIME_TEST',
      rate: 1,
      date: timestamp1
    };
    const priceData2 = {
      unit: 'TIME_TEST',
      rate: 1.01,
      date: timestamp2
    };

    await new AssetPrice(priceData1).save();
    
    await expect(new AssetPrice(priceData2).save()).resolves.toBeInstanceOf(AssetPrice);
    
    const prices = await AssetPrice.find({ unit: 'TIME_TEST' });
    expect(prices.length).toBe(2);
  });

  it('should use default date if not provided (including time)', async () => {
    const priceData = { unit: 'GBP', rate: 0.8 };
    const assetPrice = new AssetPrice(priceData);
    const savedPrice = await assetPrice.save();
    expect(savedPrice.date).toBeDefined();
    expect(savedPrice.date.getTime()).toBeGreaterThan(Date.now() - 5000);
    expect(savedPrice.date.getTime()).toBeLessThanOrEqual(Date.now());
  });
}); 