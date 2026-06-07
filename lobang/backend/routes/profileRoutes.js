const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/authMiddleware');

// Profile page
router.get('/:id', authMiddleware.isLoggedIn, profileController.showBlog);

// Review form
router.post('/:id/review', authMiddleware.isLoggedIn, profileController.reviewPost);

// Listing actions (own profile only)
router.post('/:id/listings/:listingId/remove', authMiddleware.isLoggedIn, profileController.removeListing);
router.post('/:id/listings/:listingId/relist', authMiddleware.isLoggedIn, profileController.relistListing);
module.exports = router;