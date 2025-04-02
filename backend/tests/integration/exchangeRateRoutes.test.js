const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/server'); // Correct: server is two levels up from tests/integration
const ExchangeRate = require('../../src/models/ExchangeRate'); // Correct: models are two levels up

describe('/api/exchange-rates API', () => {
  let server;

  // Connect to DB & start server before tests
  beforeAll(async () => {
    const url = `${process.env.MONGODB_URI}_exchangerate_api_test`;
    await mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
    // Start server on a random available port (or a fixed test port)
    // For simplicity, assuming the app object can be listened on directly
    // In a real app, you might need a dedicated start script or helper
    // server = app.listen(); // Let supertest handle server management
  });

  // Clear data before each test
  beforeEach(async () => {
    await ExchangeRate.deleteMany({});
  });

  // Close server & DB connection after tests
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    // if (server) {
    //   server.close(); // Close server if explicitly started
    // }
  });

  let sampleRateId;
  const sampleRateData = {
    baseCurrency: 'BTC',
    targetCurrency: 'USD',
    rate: 45000.50,
    date: new Date('2023-11-01T10:00:00Z')
  };

  // POST /api/exchange-rates
  it('should create a new exchange rate', async () => {
    const res = await request(app)
      .post('/api/exchange-rates')
      .send(sampleRateData)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('_id');
    expect(res.body.data.baseCurrency).toBe(sampleRateData.baseCurrency);
    expect(res.body.data.targetCurrency).toBe(sampleRateData.targetCurrency);
    expect(res.body.data.rate).toBe(sampleRateData.rate);
    sampleRateId = res.body.data._id; // Save ID for later tests
  });

  it('should fail to create with missing required fields', async () => {
    const incompleteData = { baseCurrency: 'BTC', rate: 45000 };
    await request(app)
      .post('/api/exchange-rates')
      .send(incompleteData)
      .expect(400); // Expect validation error (400)
  });

  // GET /api/exchange-rates
  it('should get all exchange rates', async () => {
    // Create a couple of rates first
    await ExchangeRate.create(sampleRateData);
    await ExchangeRate.create({ baseCurrency: 'ETH', targetCurrency: 'USD', rate: 3000, date: new Date() });

    const res = await request(app)
      .get('/api/exchange-rates')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(2);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0]).toHaveProperty('baseCurrency');
    expect(res.body.data[0]).toHaveProperty('targetCurrency');
  });

  // GET /api/exchange-rates/:id
  it('should get a single exchange rate by ID', async () => {
    const rate = await ExchangeRate.create(sampleRateData);
    const res = await request(app)
      .get(`/api/exchange-rates/${rate._id}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(rate._id.toString());
    expect(res.body.data.baseCurrency).toBe(sampleRateData.baseCurrency);
    expect(res.body.data.targetCurrency).toBe(sampleRateData.targetCurrency);
  });

  it('should return 404 for non-existent ID', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    await request(app)
      .get(`/api/exchange-rates/${nonExistentId}`)
      .expect(404);
  });

  // PATCH /api/exchange-rates/:id
  it('should update an exchange rate', async () => {
    const rate = await ExchangeRate.create(sampleRateData);
    const updateData = { rate: 46000.00 };

    const res = await request(app)
      .patch(`/api/exchange-rates/${rate._id}`)
      .send(updateData)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.rate).toBe(updateData.rate);
    expect(res.body.data.baseCurrency).toBe(sampleRateData.baseCurrency); // Ensure other fields remain
    expect(res.body.data.targetCurrency).toBe(sampleRateData.targetCurrency);
  });

  it('should return 404 when updating non-existent ID', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    await request(app)
      .patch(`/api/exchange-rates/${nonExistentId}`)
      .send({ rate: 1 })
      .expect(404);
  });

  // DELETE /api/exchange-rates/:id
  it('should delete an exchange rate', async () => {
    const rate = await ExchangeRate.create(sampleRateData);
    await request(app)
      .delete(`/api/exchange-rates/${rate._id}`)
      .expect(204);

    // Verify it's actually deleted
    const deletedRate = await ExchangeRate.findById(rate._id);
    expect(deletedRate).toBeNull();
  });

  it('should return 404 when deleting non-existent ID', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    await request(app)
      .delete(`/api/exchange-rates/${nonExistentId}`)
      .expect(404);
  });
}); 