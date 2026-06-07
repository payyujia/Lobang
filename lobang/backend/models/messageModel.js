const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chatId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:     { type: String, default: '' },
  media:    [{
    filename:     String,
    mimetype:     String,
    originalName: String,
  }],
}, { timestamps: true });

messageSchema.index({ chatId: 1, createdAt: -1 });
const Message = mongoose.model('Message', messageSchema, 'messages');
exports.create=function(data){
  return Message.create(data);
};
exports.getById = function(id){
  return Message.findById(id).lean();
};
exports.filter = function (query){
  return Message.find(query);
};