const express = require('express');
const router = express.Router();
const controller = require('../controllers/massEditController');

router.post('/preview-eligible', controller.previewEligible);
router.post('/apply', controller.applyMass);

module.exports = router;


