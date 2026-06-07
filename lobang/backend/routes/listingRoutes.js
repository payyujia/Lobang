const express = require('express');
const router = express.Router();
const listingController = require('../controllers/listingController');
const offerController = require('../controllers/offerController')
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/upload')

// GET / show landing page
router.get('/form', authMiddleware.isLoggedIn, listingController.getListingForEdit);
router.post('/create',authMiddleware.isLoggedIn,upload.array('images', 5),listingController.createListing)
router.post('/update',authMiddleware.isLoggedIn,upload.array('images', 5),listingController.updateListing)
router.get('/mine/search',authMiddleware.isLoggedIn, listingController.myListingsSearch);
//:id must be below the rest of the routes because its a catch all
router.get('/:id',authMiddleware.isLoggedIn,offerController.showListing);
router.post('/:id/offers',authMiddleware.isLoggedIn,offerController.createOffer);
router.post('/:id/offers/:offerId/accept', authMiddleware.isLoggedIn, offerController.acceptOffer);
router.post('/:id/offers/:offerId/decline', authMiddleware.isLoggedIn, offerController.declineOffer);
router.post('/:id/offers/:offerId/cancel', authMiddleware.isLoggedIn, offerController.cancelOffer);
router.post('/:id/offers/:offerId/reopen', authMiddleware.isLoggedIn, offerController.reopenOffer);
router.post('/:id/offers/:offerId/complete', authMiddleware.isLoggedIn, offerController.completeOffer);


module.exports = router;