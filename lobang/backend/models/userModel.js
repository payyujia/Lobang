const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique:true },
    name: {type: String },
    passwordHash: {type:String},
    bio: { type: String },
    location: {
      type:        { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [103.8198, 1.3521] }, // [lng, lat] — Singapore default
      label:       { type: String }, // human readable e.g. "Tampines, SG"
    },
    avatar: { type: String },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Listing'}],
    createdAt: { type: Date, default: Date.now }
});
userSchema.index({ location: '2dsphere' });
const User = mongoose.model('User', userSchema, 'users');

exports.getByEmail = function (email) {
    return User.findOne({email});
};
exports.create = function (acc) {
    return User.create(acc);
};
exports.updateByEmail = function (email,updates){
    return User.updateOne({email},updates);
};
exports.findById = function (id) {
    return User.findOne({_id:id});
};
exports.addToWishlist = function (userId, listingId) {
  return User.updateOne(
    { _id: userId },
    { $addToSet: { wishlist: listingId } }
  );
};
exports.removeFromWishlist = function (userId, listingId) {
  return User.updateOne(
    { _id: userId },
    { $pull: { wishlist: listingId } }
  );
};
exports.removeListingFromAllWishlists = function (listingId) {
  return User.updateMany(
    { wishlist: listingId },  // only target users who actually have it
    { $pull: { wishlist: listingId } }
  );
};