const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  offererId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  offeredListingId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Listing' }],
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const Offer = mongoose.model('Offer', offerSchema, 'offers');

exports.retrieveForListing = function (listingId) {
    return Offer.find({listingId});
};
exports.offersMade = function (offererId) {
    return Offer.find({ offererId });
};
exports.offersReceived = function (myListingIds) {
    return Offer.find({listingId: {$in:myListingIds}});
};
exports.deleteForListing = function (listingId) {
    return Offer.deleteMany({listingId});
};
exports.findById = function (id) {
    return Offer.findOne({_id:id});
};
exports.create = function (listingId,offererId,offeredListingId,status){
    return Offer.create({listingId,offererId,offeredListingId,status});
};
exports.accept = function (id) {
    return Offer.updateOne({_id:id},{status:"accepted"});
};
exports.decline = function (id) {
    return Offer.updateOne({_id:id},{status:"rejected"});
};
exports.pend = function (id) {
    return Offer.updateOne({_id:id},{status:"pending"});
};
exports.cancel = function (id) {
    return Offer.deleteOne({_id:id});
};