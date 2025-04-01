const mongoose = require('mongoose');
const logger = require('./logger');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Try multiple possible locations for the .env file
const possiblePaths = [
  path.resolve(process.cwd(), '.env'),               // Current working directory
  path.resolve(process.cwd(), '../.env'),            // One level up
  path.resolve(__dirname, '../../../.env'),          // Project root from config dir
  path.resolve(__dirname, '../../.env'),             // Backend root
  path.resolve(__dirname, '../.env')                 // Src directory
];

let envLoaded = false;

for (const envPath of possiblePaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    logger.info(`Loaded environment variables from ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  logger.warn('Could not find .env file in any expected location');
}

mongoose.set('strictQuery', false);

const connectDB = async () => {
  try {
    const MONGO_URI = process.env.MONGODB_URI;
    
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