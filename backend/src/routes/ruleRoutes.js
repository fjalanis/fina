const express = require('express');
const router = express.Router();
const ruleController = require('../controllers/ruleController');

// GET all rules
router.get('/', ruleController.getAllRules);

// GET a specific rule by ID
router.get('/:id', ruleController.getRuleById);

// POST create a new rule
router.post('/', ruleController.createRule);

// PUT update an existing rule
router.put('/:id', ruleController.updateRule);

// DELETE a rule
router.delete('/:id', ruleController.deleteRule);

// POST test a rule
router.post('/:id/test', ruleController.testRule);

// POST apply a rule to a transaction
router.post('/apply/:transactionId', ruleController.applyRuleToTransaction);

// POST apply rules to all unbalanced transactions
router.post('/apply-all', ruleController.applyRulesToAllTransactions);

module.exports = router; 