const express = require('express');
const {
    getAccounts,
    getAccount,
    createAccount,
    updateAccount,
    deleteAccount,
    getAccountHierarchy,
    getAccountDescendants,
    getUniqueAccountUnits
} = require('../controllers/accountController');

// Include other resource routers if needed
// Example: const transactionRouter = require('./transactions');

const router = express.Router();

// Re-route into other resource routers
// Example: router.use('/:accountId/transactions', transactionRouter);

// Define specific routes BEFORE parameterized routes
router.route('/hierarchy')
    .get(getAccountHierarchy);

router.route('/units')
    .get(getUniqueAccountUnits);

// General routes
router.route('/')
    .get(getAccounts)
    .post(createAccount);

// Parameterized routes LAST
router.route('/:id')
    .get(getAccount)
    .put(updateAccount)
    .delete(deleteAccount);

router.route('/:id/descendants')
    .get(getAccountDescendants);

module.exports = router; 