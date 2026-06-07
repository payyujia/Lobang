const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
	transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true },
	reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
	revieweeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
	rating: { type: Number, min: 1, max: 5, required: true },
	comment: { type: String },
	date: { type: Date, default: Date.now }
}, { timestamps: true });


const Review = mongoose.model('Review', reviewSchema, 'reviews');

exports.retrieveForUser = function (revieweeId) {
	return Review.find({ revieweeId });
};
exports.create = function (data) {
	return Review.create(data);
};
exports.alreadyReviewed = function (transactionId, reviewerId, revieweeId) {
	return Review.exists({ transactionId, reviewerId, revieweeId });
};

exports.searchReviews = function (revieweeId, rating, page = 1) {
	return Review.find({ revieweeId, rating })
		.populate('reviewerId', 'name avatar')
		.populate('transactionId')
		.sort({ createdAt: -1 })
		.skip((page - 1) * 15)
		.limit(15)
		.lean();
};
