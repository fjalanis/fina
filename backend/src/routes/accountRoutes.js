const express = require('express');
const {
    getAccounts,
    getAccount,
    createAccount,
    updateAccount,
    deleteAccount,
    getAccountHierarchy,
    getAccountDescendants
} = require('../controllers/accountController');

// Include other resource routers if needed
// Example: const transactionRouter = require('./transactions');

const router = express.Router();

// Re-route into other resource routers
// Example: router.use('/:accountId/transactions', transactionRouter);

router.route('/hierarchy')
    .get(getAccountHierarchy);

router.route('/')
    .get(getAccounts)
    .post(createAccount);

router.route('/:id')
    .get(getAccount)
    .put(updateAccount)
    .delete(deleteAccount);

// New route for getting descendant IDs
router.route('/:id/descendants')
    .get(getAccountDescendants);

module.exports = router; 