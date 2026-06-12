const Chat    = require('../models/chatModel');
const Message = require('../models/messageModel');
const Offer   = require('../models/offerModel');
const Listing = require('../models/listingModel');
const path    = require('path');
const fs      = require('fs');

/**
 * GET /api/chats
 * Returns all chat rooms the current user is a participant in,
 * with the last message and unread count pre-populated.
 */
exports.getChats = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const chats = await Chat.getAllForUser(userId)
      .populate('participants', 'name avatar')
      .populate('listingId', 'title images')
      .populate({
        path: 'lastMessage',
        populate: { path: 'senderId', select: 'name' },
      })
      .sort({ updatedAt: -1 })
      .lean();

    // Attach unread count per chat
    const enriched = chats.map(chat => ({
      ...chat,
      unreadCount: chat.unreadCounts?.[userId] ?? 0,
      other: chat.participants.find(p => String(p._id) !== String(userId)),
    }));

    res.json({ chats: enriched });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/chats/:id
 * Returns chat room metadata + paginated messages (newest-first, page via ?before=<msgId>).
 */
exports.getChatRoom = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const chat   = await Chat.joinChat(req.params.id, userId )
      .populate('participants', 'name avatar')
      .populate('listingId', 'title images category')
      .lean();
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    const limit  = 40;
    const before = req.query.before;
    const query  = { chatId: req.params.id };
    if (before) {
      const ref = await Message.getById(before);
      if (ref) query.createdAt = { $lt: ref.createdAt };
    }

    const messages = await Message.filter(query)
      .populate('senderId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Mark as read (reset unread counter for this user)
    await Chat.markRead(req.params.id, userId);

    res.json({
      chat: {
        ...chat,
        other: chat.participants.find(p => String(p._id) !== String(userId)),
      },
      messages: messages.reverse(),
      hasMore: messages.length === limit,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

//POST /api/chats/:id/messages
exports.sendMessage = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const chat   = await Chat.joinChat(req.params.id,userId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    const { text } = req.body;
    const mediaFiles = (req.files || []).map(f => ({
      filename: f.filename,
      mimetype: f.mimetype,
      originalName: f.originalname,
    }));

    if (!text?.trim() && mediaFiles.length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    const msg = await Message.create({
      chatId:   chat._id,
      senderId: userId,
      text:     text?.trim() || '',
      media:    mediaFiles,
    });

    // bump chat's updatedAt and lastMessage
    const otherParticipants = chat.participants
      .map(String)
      .filter(id => id !== String(userId));

    const unreadIncrements = {};
    otherParticipants.forEach(id => {
      unreadIncrements[`unreadCounts.${id}`] = 1;
    });

    await Chat.newUpdate(chat._id,msg._id,unreadIncrements)

    const populated = await msg.populate('senderId', 'name avatar');
    res.status(201).json({ message: populated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/chats/unread-count
 * Total unread messages across all chats for the current user.
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const chats  = await Chat.getAllForUser(req.session.user.id);
    const total  = chats.reduce((sum, c) => sum + (c.unreadCounts?.[req.session.user.id] ?? 0), 0);
    res.json({ count: total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// POST /api/chats/resolve
exports.resolveChat = async (req, res) => {
  try {
    const { listingId, participant1 } = req.body;
    const listing = await Listing.findById(listingId).select('ownerId').lean();
    const participant2 = listing.ownerId;    
    const chat = await Chat.getOrCreateChatForOffer(listingId,participant1, participant2);
    res.json({ chatId: chat._id });
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: err.message });
  }
};