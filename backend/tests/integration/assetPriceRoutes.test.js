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

  // Use full ISO strings for dates
  const sampleDate1 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Yesterday
  const sampleDate2 = new Date().toISOString(); // Now

  const samplePriceData = {
    unit: 'EUR',
    rate: 0.85,
    date: sampleDate1
  };

  describe('POST /api/asset-prices', () => {
    it('should create a new asset price', async () => {
      const res = await request(app)
        .post('/api/asset-prices')
        .send(samplePriceData);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.unit).toBe(samplePriceData.unit);
      expect(res.body.data.rate).toBe(samplePriceData.rate);
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/asset-prices')
        .send({ rate: 100, date: sampleDate2 }); // Missing unit

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Unit is required');
    });
  });

  describe('GET /api/asset-prices', () => {
    it('should get all asset prices', async () => {
      await AssetPrice.create(samplePriceData); // date: sampleDate1
      await AssetPrice.create({
        unit: 'CAD',
        rate: 1.25,
        date: sampleDate2 // Different timestamp
      });

      const res = await request(app).get('/api/asset-prices');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('should filter prices by date range', async () => {
      // Use full ISO strings for filtering
      const date1 = '2023-10-25T10:00:00.000Z';
      const date2 = '2023-10-26T12:30:00.000Z';
      const date3 = '2023-10-27T15:45:00.000Z';
      const date4 = '2023-10-27T18:00:00.000Z'; // Another one on the same day
      await AssetPrice.create({ unit: 'EUR', rate: 0.85, date: date1 });
      await AssetPrice.create({ unit: 'CAD', rate: 1.25, date: date2 });
      await AssetPrice.create({ unit: 'JPY', rate: 150, date: date3 });
      await AssetPrice.create({ unit: 'GBP', rate: 0.8, date: date4 });

      // Filter includes date3 and date4
      const res = await request(app).get('/api/asset-prices').query({ startDate: date3, endDate: date4 });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].unit).toBe('GBP'); // Sorted by date descending
      expect(res.body.data[1].unit).toBe('JPY');

      // Filter for just one day (should include both times)
      const resDay = await request(app).get('/api/asset-prices').query({ startDate: '2023-10-27T00:00:00.000Z', endDate: '2023-10-27T23:59:59.999Z' });
      expect(resDay.statusCode).toBe(200);
      expect(resDay.body.success).toBe(true);
      expect(resDay.body.data.length).toBe(2);
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

    it('should return 404 for non-existent ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/asset-prices/${nonExistentId}`);
      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid ID format', async () => {
      const invalidId = 'invalid-id-format';
      const res = await request(app).get(`/api/asset-prices/${invalidId}`);
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
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

    it('should not allow updating the unit', async () => {
      const price = await AssetPrice.create(samplePriceData);
      const updateData = { unit: 'GBP', rate: 0.88 };

      const res = await request(app)
        .put(`/api/asset-prices/${price._id}`)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.unit).toBe(samplePriceData.unit);
      expect(res.body.data.rate).toBe(updateData.rate);
    });

    it('should return 404 for updating non-existent ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app).put(`/api/asset-prices/${nonExistentId}`).send({ rate: 10 });
      expect(res.statusCode).toBe(404);
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

    it('should return 404 for deleting non-existent ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app).delete(`/api/asset-prices/${nonExistentId}`);
      expect(res.statusCode).toBe(404);
    });
  });
}); 