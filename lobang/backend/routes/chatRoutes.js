const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

// List all chats for current user
router.get('/', authMiddleware.isLoggedIn, chatController.getChats);

// Unread count badge
router.get('/unread-count',authMiddleware.isLoggedIn, chatController.getUnreadCount);
router.post('/resolve',authMiddleware.isLoggedIn,chatController.resolveChat);
// Single chat room + paginated messages
router.get('/:id',authMiddleware.isLoggedIn, chatController.getChatRoom);

// Send a message (REST fallback; primary is Socket.io)
router.post('/:id/messages',authMiddleware.isLoggedIn, upload.array('media', 5), chatController.sendMessage);

module.exports = router;
