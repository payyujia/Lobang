const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/',authMiddleware.isLoggedIn,profileController.countUnread)
router.post('/all/read', profileController.readAllNotifications);
router.post('/:id/read', profileController.readNotification);


module.exports = router;