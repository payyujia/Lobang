const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  listingId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],   // exactly 2
  lastMessage:  { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  unreadCounts: { type: Map, of: Number, default: {} },
}, { timestamps: true });

chatSchema.index({ participants: 1 });
chatSchema.index({ listingId: 1, participants: 1 });

const Chat = mongoose.model('Chat', chatSchema, 'chats');
exports.getAllForUser = function (id) {
  return Chat.find({ participants: id }).lean()
};
exports.joinChat = function (chatId,userId) {
  return Chat.findOne({_id:chatId,participants:userId})
};
exports.markRead = function(chatId,userId) {
  return Chat.findByIdAndUpdate(chatId,{$set: { [`unreadCounts.${userId}`]: 0 }})
};
exports.newUpdate = function (chatId,lastMessage,inc) {
  return Chat.findByIdAndUpdate(chatId, {
    lastMessage,
    $inc:        inc,
  });
};
exports.sharedChat = function (listingId,participant1Id,participant2Id){
  return Chat.findOne({
      listingId,
      participants: { $all: [participant1Id, participant2Id] },
    });
};
exports.create = function (data) {
  return Chat.create(data);
};
exports.getOrCreateChatForOffer = async function (listingId, participant1Id, participant2Id) {
  // Try to find an existing chat
  const existing = await Chat.findOne({
    listingId,
    participants: { $all: [participant1Id, participant2Id] },
  }).select('_id').lean();
  console.log("existing",existing)
  if (existing) return existing;

  // Otherwise create a new one
  return Chat.create({
    listingId,
    participants: [participant1Id, participant2Id],
    unreadCounts: {
      [String(participant1Id)]: 0,
      [String(participant2Id)]: 0,
    },
  });
};