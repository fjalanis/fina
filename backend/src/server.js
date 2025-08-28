const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Route files
const accountRoutes = require('./routes/accountRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const assetPriceRoutes = require('./routes/assetPriceRoutes');
const reportRoutes = require('./routes/reportRoutes');
const ruleRoutes = require('./routes/ruleRoutes');

// Mount routers
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/asset-prices', assetPriceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/rules', ruleRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// Export the app instance *before* the server start logic
module.exports = app;

// Only start the server if this file is run directly (not required as a module)
if (require.main === module) {
  // Connect to MongoDB
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('Connected to MongoDB');
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err);
      process.exit(1);
    });

  // Start server with Socket.io
  const http = require('http');
  const { initSocket } = require('./socket');
  const PORT = process.env.PORT || 5000;
  const server = http.createServer(app);
  initSocket(server);
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} 