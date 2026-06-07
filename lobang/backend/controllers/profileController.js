const User        = require('../models/userModel');
const Listing     = require('../models/listingModel');
const Offer       = require('../models/offerModel');
const Review      = require('../models/reviewModel');
const Transaction = require('../models/transactionModel');
const Notification = require('../models/notificationModel');
const {pushNotification} = require('../socketSetup')
const fs = require('fs');
const path = require('path');

//  GET /profile/:id
exports.showBlog = async (req, res) => {
  try {
    const profileUser = await User.findById(req.params.id)
    const isOwner = String(req.session.user.id) === String(profileUser._id);

    const listings = await Listing.findByUser(profileUser._id).populate('ownerId','name').lean();
    const wishlistUser = await User.findById(profileUser._id)
      .populate({
        path:     'wishlist',
        populate: { path: 'ownerId', select: 'name' }
      })
      .lean();
    const wishlist = wishlistUser.wishlist
    let offersMade     = [];
    let offersReceived = [];

    if (isOwner) {
      // Offers this user sent
      offersMade = await Offer.offersMade( profileUser._id )
        .populate('offeredListingId', 'title images status')
        .populate('listingId',  'title images ownerId')
        .sort({ createdAt: -1 })
        .lean();
      // Offers received on any of this user's listings
      const myListingIds = listings.map(l => l._id);
      offersReceived = await Offer.offersReceived(myListingIds)
        .populate('offeredListingId', 'title images status')
        .populate('listingId', 'title images')
        .populate('offererId','name')
        .sort({ createdAt: -1 })
        .lean();    }

    // Reviews
    let reviews = await Review.retrieveForUser(profileUser._id)
      .populate('reviewerId', 'name avatar')
      .populate('transactionId')
      .sort({ createdAt: -1 })
      .lean();

    const reviewCount = reviews.length;
    const avgRating   = reviewCount
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(1)
      : null;

    // Star distribution for sidebar filter buttons
    const starCounts = [5, 4, 3, 2, 1].reduce((acc, star) => {
      acc[star] = reviews.filter(r => r.rating === star).length;
      return acc;
    }, {});

    // Must have a completed transaction together
    let sharedTransaction = await Transaction.mutuals(req.session.user.id,String(profileUser._id));
    sharedTransaction = sharedTransaction[0] || null
    // Already reviewed this person for this transaction?
    const alreadyReviewed = sharedTransaction
      ? await Review.alreadyReviewed(sharedTransaction._id,req.session.user.id,profileUser._id)
      : false;
    const canReview = !isOwner && sharedTransaction && !alreadyReviewed;
    // after fetching allReviews and transactions
    const tradeCount = await Transaction.tradeCount(profileUser._id );
    const karma = (() => {
      const ratingScore = avgRating ? (avgRating / 5) * 50 : 0;          // max 50pts
      const tradeScore  = Math.min(tradeCount * 0.5, 30);               // max 30pts, 5 per trade
      const reviewScore = Math.min(reviewCount * 0.2, 20);              // max 20pts, 2 per review
      const total       = Math.round(ratingScore + tradeScore + reviewScore);
      const tier =
        total >= 90 ? { label: 'Lobang King',  emoji: '👑', color: '#f0b429' } :
        total >= 70 ? { label: 'Trusted',    emoji: '💎', color: '#49f4ed' } :
        total >= 45 ? { label: 'Reliable',   emoji: '⭐', color: '#80f7b7' } :
        total >= 20 ? { label: 'Rising',     emoji: '🌱', color: '#f1f00e' } :
                      { label: 'Newcomer',   emoji: '👋', color: '#e8e8d8' };

      return { total, tier, tradeCount };
    })();   
    const ratingFilter = isNaN(req.query.rating)? null : req.query.rating
    if (ratingFilter) reviews= await Review.searchReviews(profileUser._id,req.query.rating)
    res.json( {
      profileUser,
      isOwner,
      listings,
      wishlist,
      offersMade,
      offersReceived,
      reviews,
      reviewCount,
      avgRating,
      starCounts,
      canReview,
      sharedTransaction,
      karma
    });

  } catch (err) {
    console.error(err);
    res.redirect(`/profile/${req.session.user.id}`);
  }
};

//  POST /profile/:id/review
exports.reviewPost = async (req, res) => {
  try {
    const { rating, comment, transactionId } = req.body;
    const revieweeId = req.params.id;
    const reviewerId = req.session.user.id;
    // Guard: can't review yourself
    if (String(reviewerId) === String(revieweeId)) {
      return res.redirect(`/profile/${revieweeId}`);
    }
    // Guard: transaction must involve both parties
    const transaction = await Transaction.verify(transactionId,reviewerId, revieweeId);

    if (!transaction) {
      return res.redirect(`/profile/${revieweeId}`);
    }

    // Guard: no double reviewing
    const exists = await Review.alreadyReviewed( transactionId, reviewerId, revieweeId );
    if (exists) {
      return res.redirect(`/profile/${revieweeId}`);
    }

    await Review.create({
      transactionId,
      reviewerId,
      revieweeId,
      rating: Number(rating),
      comment,
    });

    const newNotif = await Notification.createNotification({
      recipientId: revieweeId,
      type:        'review',
      message:     `${req.session.user.name} left you a ${rating} star review.`,
      linkUrl:     `/profile/${revieweeId}?tab=reviews`,
    });
    pushNotification(revieweeId, newNotif);

    res.redirect(`/profile/${revieweeId}?tab=reviews`);
  } catch (err) {
    console.error(err);
    res.redirect(`/profile/${req.session.user.id}`);
  }
};

//  POST /profile/:id/listings/:listingId/remove
//  Deletes listing + its offers.
exports.removeListing = async (req, res) => {
  try {
    const listing = await Listing.findByIdandUser(req.session.user.id,req.params.listingId)
    listing.images.forEach(filename => {
      fs.unlink(path.resolve(__dirname, '../public/uploads', filename), err => {
        if (err) console.warn('Could not delete file:', filename, err);
      });
    });
    
    await User.removeListingFromAllWishlists(req.params.listingId)
    // Delete offers first, then the listing
    await Offer.deleteForListing(listing._id);
    await Listing.delete(listing._id);

    res.redirect(`/profile/${req.session.user.id}`);
  } catch (err) {
    console.error(err);
    res.redirect(`/profile/${req.session.user.id}`);
  }
};

//  POST /profile/:id/listings/:listingId/relist
exports.relistListing = async (req, res) => {
  try {
    await Listing.relist(req.params.listingId,req.session.user.id)
    res.redirect(`/profile/${req.session.user.id}`);
  } catch (err) {
    console.error(err);
    res.redirect(`/profile/${req.session.user.id}`);
  }
};

//notification handlers
exports.countUnread = async (req, res) => {
  const unreadCount = await Notification.getUnreadCount(req.session.user.id);
  const notifications = await Notification.getNotificationsByUser(req.session.user.id)
  res.json({ notifications, unreadCount });
};
exports.readNotification = async (req,res) => {
  try{
    await Notification.markAsRead(req.params.id);
    res.status(200).json({success:true})
  }catch(err){
    console.log(err)
  }
}
exports.readAllNotifications = async (req,res) => {
  await Notification.markAllAsRead(req.session.user.id);
  res.sendStatus(200);
};
