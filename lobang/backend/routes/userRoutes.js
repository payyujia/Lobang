const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const listingController = require('../controllers/listingController');
const upload = require('../middleware/upload');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/auth/me', accountController.getMe);
router.get('/auth/login', accountController.loginGet);
router.post('/auth/login', accountController.loginPost);
router.get('/auth/register', accountController.registerGet);
router.post('/auth/register', accountController.registerPost);
router.post('/auth/logout', accountController.logout);
router.get('/home',authMiddleware.isLoggedIn,listingController.homeGet);
router.get('/auth/update-account',authMiddleware.isLoggedIn,accountController.updateAccGet);
router.post('/auth/update-account',authMiddleware.isLoggedIn, upload.single('avatar'), accountController.updateAccPost);
module.exports = router;