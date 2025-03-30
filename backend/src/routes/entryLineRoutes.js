const express = require('express');
const router = express.Router();
const { 
  getEntryLine, 
  updateEntryLine, 
  deleteEntryLine
} = require('../controllers/entryLineController');

// Entry line routes
router
  .route('/:id')
  .get(getEntryLine)
  .put(updateEntryLine)
  .delete(deleteEntryLine);

module.exports = router; 