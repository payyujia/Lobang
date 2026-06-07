//include functions from client to server

const { Server }  = require('socket.io');
const Chat        = require('./models/chatModel');
const Message     = require('./models/messageModel');

let io;

exports.initSocket = (httpServer, sessionMiddleware) => {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true },
  });

  // Share express-session with Socket.io
  io.use((socket, next) => {
    sessionMiddleware(socket.request, socket.request.res || {}, next);
  });

  // Auth gate
  io.use((socket, next) => {
    const user = socket.request.session?.user;
    if (!user) return next(new Error('Unauthorized'));
    socket.userId   = String(user.id);
    socket.userName = user.name;
    socket.avatar   = user.avatar;
    next();
  });

  io.on('connection', socket => {
    console.log(`[socket] connected: ${socket.userId}`);

    //  Join a chat room
    socket.on('join_chat', async ({ chatId }) => {
      try {
        const chat = await Chat.joinChat(chatId,socket.userId);
        if (!chat) return socket.emit('error', 'Access denied');

        socket.join(chatId);

        // Mark messages as read when joining
        await Chat.markRead(chatId, socket.userId);

        socket.emit('joined', { chatId });
      } catch (err) {
        socket.emit('error', err.message);
      }
    });

    //  Send a text message 
    socket.on('send_message', async ({ chatId, text }) => {
      try {
        const chat = await Chat.joinChat(chatId,socket.userId);
        if (!chat) return socket.emit('error', 'Access denied');
        if (!text?.trim()) return;

        const msg = await Message.create({
          chatId,
          senderId: socket.userId,
          text:     text.trim(),
          media:    [],
        });

        const populated = await msg.populate('senderId', 'name avatar');

        // Update chat metadata
        const others = chat.participants
          .map(String)
          .filter(id => id !== socket.userId);
        const inc = {};
        others.forEach(id => (inc[`unreadCounts.${id}`] = 1));
        await Chat.newUpdate(chatId,msg._id,inc)
        // Broadcast to room (including sender so they get the saved doc)
        io.to(chatId).emit('new_message', populated);

        // Push real-time unread badge update to offline participants
        others.forEach(otherId => {
          io.to(`user:${otherId}`).emit('unread_bump', { chatId });
        });
      } catch (err) {
        socket.emit('error', err.message);
      }
    });

    //  Typing indicators 
    socket.on('typing', ({ chatId }) => {
      socket.to(chatId).emit('typing', { userId: socket.userId, name: socket.userName });
    });

    socket.on('stop_typing', ({ chatId }) => {
      socket.to(chatId).emit('stop_typing', { userId: socket.userId });
    });

    //  Personal room for push events 
    socket.join(`user:${socket.userId}`);

    socket.on('disconnect', () => {
      console.log(`[socket] disconnected: ${socket.userId}`);
    });
  });

  return io;
};
exports.pushNotification = (recipientId, payload) => {
  io.to(`user:${String(recipientId)}`).emit('new_notification', payload);
};
// Expose io so other modules (e.g. offerController) can emit events
exports.getIO = () => io;
