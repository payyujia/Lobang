const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['accept', 'reject', 'message', 'offer','archive','review'], required: true },
  message: { type: String, required: true },
  linkUrl: { type: String, default: '/notifications'}, // Where to send the user
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
const Notification = mongoose.model('Notification', NotificationSchema, 'notifications');

exports.findById = function (id) {
  return Notification.findOne({_id:id});
}

exports.createNotification = async function (data) {
  const notif = await Notification.create(data);
  // return for the socket
  return {
    _id:notif._id,
    type: notif.type,
    message: notif.message,
    linkUrl: notif.linkUrl,
    createdAt: notif.createdAt,
  };
};


exports.getNotificationsByUser = function (recipientId) {
  return Notification.find({ recipientId}).sort({ createdAt: -1 })
}

//red circle how many unread
exports.getUnreadCount= function (recipientId) {
  return Notification.countDocuments({ recipientId, isRead: false });
}

//mark single notif as read
exports.markAsRead= function (notificationId) {
  return Notification.updateOne({ _id: notificationId },{ isRead: true }); 
}

//mark all unread as read for this user
exports.markAllAsRead= function (recipientId) {
  return Notification.updateMany(
    { recipientId, isRead : false },
    { isRead : true }
  );
}