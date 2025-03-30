const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from the .env file in the project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const express = require('express');
const cors = require('cors');
const logger = require('./config/logger');
const connectDB = require('./config/database');

// Import routes
const accountRoutes = require('./routes/accountRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const entryLineRoutes = require('./routes/entryLineRoutes');
const reportRoutes = require('./routes/reportRoutes');

// Create Express app
const app = express();

// Configure middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Household Finance API' });
});

// Mount routes
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/entries', entryLineRoutes);
app.use('/api/reports', reportRoutes);

// Basic error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Set default port
const PORT = process.env.PORT || 5000;

// Connect to MongoDB and start server (only if not in a test environment)
if (process.env.NODE_ENV !== 'test') {
  const startServer = async () => {
    try {
      await connectDB();
      
      app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
      });
    } catch (error) {
      logger.error(`Failed to start server: ${error.message}`);
      process.exit(1);
    }
  };

  startServer();
}

module.exports = app; // Export for testing 