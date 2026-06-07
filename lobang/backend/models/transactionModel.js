const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
	listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
	participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
	date: { type: Date, default: Date.now },
	snapshot: {
		listingTitle: { type: String },
		offeredTitle: { type: Array }
	}
});

const Transaction = mongoose.model('Transaction', transactionSchema, 'transactions');

exports.mutuals = function (a, b) {
  return Transaction.aggregate([
    { $match: { participants: { $all: [new mongoose.Types.ObjectId(a), new mongoose.Types.ObjectId(b)] } } },
    {
      $lookup: {
        from: 'reviews',
        localField: '_id',
        foreignField: 'transactionId',
        as: 'reviews'
      }
    },
    {$match: {reviews: {$not: {$elemMatch: { reviewerId: new mongoose.Types.ObjectId(a) }}}}},
    { $sort: { createdAt: 1 } },   // oldest first
    { $limit: 1 } 
  ]);
};
exports.verify = function (transactionId,a,b) {
	if (Transaction.findOne({_id:transactionId,participants: { $all: [a,b] }})) return true;
	return false;
};
exports.create = function (data){
	return Transaction.create(data);
};
exports.tradeCount = function (user) {
	return Transaction.countDocuments({ participants: user });
}