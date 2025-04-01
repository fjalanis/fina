const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Base MongoDB connection string from .env
const BASE_MONGO_URI = process.env.MONGODB_URI;

// Function to setup database for testing
const setupDB = () => {
  if (!BASE_MONGO_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  // Create a unique database name for this test file
  const uniqueDbName = `test_${new Date().getTime()}_${Math.floor(Math.random() * 1000)}`;
  console.log(`Creating test database: ${uniqueDbName}`);
  
  // Use the base MongoDB URI but with a unique database name
  const MONGODB_URI = BASE_MONGO_URI.replace(/\/[^/]*$/, `/${uniqueDbName}`);
  
  // Connect to MongoDB before all tests
  beforeAll(async () => {
    try {
      // Close any existing connections
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      await mongoose.connect(MONGODB_URI);
      console.log(`Connected to MongoDB using database: ${uniqueDbName}`);
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  });

  // Clear all data between tests
  afterEach(async () => {
    if (mongoose.connection.readyState !== 0) {
      const collections = mongoose.connection.collections;
      
      for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
      }
    }
  });

  // Disconnect MongoDB after all tests
  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      try {
        // Drop the entire test database to clean up
        await mongoose.connection.dropDatabase();
        console.log(`Dropped test database: ${uniqueDbName}`);
        
        // Close the connection
        await mongoose.disconnect();
        console.log('Closed MongoDB connection');
      } catch (error) {
        console.error('Error cleaning up test database:', error);
        throw error;
      }
    }
  });
};

module.exports = { setupDB }; 