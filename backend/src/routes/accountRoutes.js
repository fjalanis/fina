const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');

// Routes for /api/accounts
router.route('/')
  .get(accountController.getAccounts)
  .post(accountController.createAccount);

// Route for account hierarchy
router.route('/hierarchy')
  .get(accountController.getAccountHierarchy);

// Routes for /api/accounts/:id
router.route('/:id')
  .get(accountController.getAccount)
  .put(accountController.updateAccount)
  .delete(accountController.deleteAccount);

module.exports = router; 