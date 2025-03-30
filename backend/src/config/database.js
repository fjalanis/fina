const mongoose = require('mongoose');
const logger = require('./logger');
const path = require('path');
const dotenv = require('dotenv');

// Load the environment variables from the .env file in the project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

mongoose.set('strictQuery', false);

const connectDB = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI;
    
    if (!MONGO_URI) {
      logger.error('No MongoDB connection string found in environment variables');
      process.exit(1);
    }
    
    logger.info('Attempting to connect to MongoDB...');
    const connection = await mongoose.connect(MONGO_URI);
    
    logger.info(`MongoDB Connected: ${connection.connection.host}`);
    
    return connection;
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB; 