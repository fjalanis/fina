const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/server');
const AssetPrice = require('../../src/models/AssetPrice');

describe('Asset Price Routes', () => {
  beforeAll(async () => {
    const url = `${process.env.MONGODB_URI}_assetprice_routes_test`;
    await mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await AssetPrice.deleteMany({});
  });

  const samplePriceData = {
    baseCurrency: 'USD',
    targetCurrency: 'EUR',
    rate: 0.85,
    date: new Date()
  };

  describe('POST /api/asset-prices', () => {
    it('should create a new asset price', async () => {
      const res = await request(app)
        .post('/api/asset-prices')
        .send(samplePriceData);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.baseCurrency).toBe(samplePriceData.baseCurrency);
      expect(res.body.data.targetCurrency).toBe(samplePriceData.targetCurrency);
      expect(res.body.data.rate).toBe(samplePriceData.rate);
    });
  });

  describe('GET /api/asset-prices', () => {
    it('should get all asset prices', async () => {
      await AssetPrice.create(samplePriceData);
      await AssetPrice.create({
        baseCurrency: 'ETH',
        targetCurrency: 'USD',
        rate: 3000,
        date: new Date()
      });

      const res = await request(app).get('/api/asset-prices');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
    });
  });

  describe('GET /api/asset-prices/:id', () => {
    it('should get a single asset price by ID', async () => {
      const price = await AssetPrice.create(samplePriceData);

      const res = await request(app).get(`/api/asset-prices/${price._id}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(price._id.toString());
    });
  });

  describe('PUT /api/asset-prices/:id', () => {
    it('should update an asset price', async () => {
      const price = await AssetPrice.create(samplePriceData);
      const updateData = { rate: 0.90 };

      const res = await request(app)
        .put(`/api/asset-prices/${price._id}`)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rate).toBe(updateData.rate);
    });
  });

  describe('DELETE /api/asset-prices/:id', () => {
    it('should delete an asset price', async () => {
      const price = await AssetPrice.create(samplePriceData);

      const res = await request(app).delete(`/api/asset-prices/${price._id}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const deletedPrice = await AssetPrice.findById(price._id);
      expect(deletedPrice).toBeNull();
    });
  });
}); 