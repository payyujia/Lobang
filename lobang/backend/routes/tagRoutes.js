const express = require('express');
const router = express.Router();
const listingController = require('../controllers/listingController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/search', listingController.searchTags);
router.post('/', listingController.createTag);


module.exports = router;